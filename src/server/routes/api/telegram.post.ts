import { GoogleGenAI } from '@google/genai';
import { defineEventHandler, readBody } from 'h3';
import { connectDB } from '../../db/connect';
import { Flow } from '../../models/flow';
import { memoryService } from '../../memory/memory.service';
import { vectorSearchService } from '../../services/vector-search.service';
import type { OrchestratorResult, ValidatorResult } from '../../../shared/types';

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
  };
}

// Lazy Gemini client singleton
let genaiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genaiClient) {
    const apiKey = process.env['LLM_API_KEY'];
    if (!apiKey) throw new Error('LLM_API_KEY is not set');
    genaiClient = new GoogleGenAI({ apiKey });
  }
  return genaiClient;
}
const MODEL = () => process.env['LLM_MODEL'] ?? 'gemini-2.5-flash';

const ORCHESTRATOR_SYSTEM = `Eres un clasificador de intenciones para un asistente de agencia de autos.
Clasifica el mensaje del usuario en exactamente una de estas categorías:
- "catalog": el usuario quiere ver vehículos, precios, o comparar modelos
- "schedule": el usuario quiere agendar una cita, prueba de manejo, o visita
- "faqs": el usuario tiene preguntas sobre financiamiento, garantías, políticas, o información general
- "generic": cualquier otra consulta

Analiza también si el usuario está proporcionando datos de campo (nombre, fecha, hora, presupuesto, tipo de vehículo).
Responde SOLO con JSON: {"intent": "<categoría>", "confidence": <0.0-1.0>, "extracted": {"fullName": "...", "preferredDate": "...", "preferredTime": "...", "budget": <número o null>, "vehicleType": "..."}}
Omite campos extracted que no estén presentes en el mensaje. Usa null para campos numéricos ausentes.`;

async function classifyIntent(
  message: string
): Promise<{ intent: OrchestratorResult['intent']; extracted: Record<string, unknown> }> {
  const response = await getGenAI().models.generateContent({
    model: MODEL(),
    contents: [{ role: 'user', parts: [{ text: message }] }],
    config: { systemInstruction: ORCHESTRATOR_SYSTEM },
  });
  try {
    const text = response.text ?? '';
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const raw = JSON.parse(cleaned);
    const validIntents = ['faqs', 'catalog', 'schedule', 'generic'] as const;
    const intent = validIntents.includes(raw.intent) ? raw.intent : 'generic';
    const extracted: Record<string, unknown> = {};
    if (raw.extracted) {
      for (const [k, v] of Object.entries(raw.extracted)) {
        if (v !== null && v !== undefined && v !== '') extracted[k] = v;
      }
    }
    return { intent, extracted };
  } catch {
    return { intent: 'generic', extracted: {} };
  }
}

const REQUIRED_FIELDS: Record<string, string[]> = {
  schedule: ['fullName', 'preferredDate', 'preferredTime'],
  catalog: ['budget', 'vehicleType'],
  faqs: [],
  generic: [],
};

const NEXT_QUESTIONS: Record<string, Record<string, string>> = {
  schedule: {
    fullName: '¿Cuál es su nombre completo para la cita?',
    preferredDate: '¿Qué fecha prefiere para su cita? (ej: 15 de marzo)',
    preferredTime: '¿A qué hora prefiere su cita? (ej: 10:00 AM)',
  },
  catalog: {
    budget: '¿Cuál es su presupuesto aproximado para el vehículo?',
    vehicleType: '¿Qué tipo de vehículo le interesa? (sedán, SUV, pickup, hatchback, deportivo)',
  },
};

function checkFields(
  intent: OrchestratorResult['intent'],
  existingData: Record<string, unknown>
): ValidatorResult {
  const needed = REQUIRED_FIELDS[intent] ?? [];
  const missing = needed.filter((f) => !existingData[f]);
  return {
    isComplete: missing.length === 0,
    collectedData: existingData as Record<string, any>,
    missingFields: missing,
    nextQuestion: missing[0] ? NEXT_QUESTIONS[intent]?.[missing[0]] : undefined,
  };
}

function buildSpecialistPrompt(
  vehicles: unknown[],
  faqs: unknown[],
  validationData: Record<string, unknown>,
  intent: string
): string {
  const lines = [
    'Eres un asesor experto de agencia de autos. Responde de forma concisa, amigable y profesional en español.',
    '',
    'CATÁLOGO DE VEHÍCULOS RELEVANTES:',
    JSON.stringify(vehicles, null, 2),
    '',
    'PREGUNTAS FRECUENTES RELEVANTES:',
    JSON.stringify(faqs, null, 2),
  ];
  if (intent === 'schedule' && Object.keys(validationData).length > 0) {
    lines.push('', 'DATOS DE CITA RECOPILADOS:', JSON.stringify(validationData, null, 2));
    lines.push('El cliente ha proporcionado todos los datos. Confirma la cita de forma cálida y profesional.');
  } else if (intent === 'catalog' && Object.keys(validationData).length > 0) {
    lines.push('', 'PREFERENCIAS DEL CLIENTE:', JSON.stringify(validationData, null, 2));
    lines.push('Usa estas preferencias para personalizar tus recomendaciones de vehículos.');
  }
  lines.push('', 'Responde basándote en el contexto anterior. Si no tienes información suficiente, dilo honestamente.');
  return lines.join('\n');
}

export default defineEventHandler(async (event) => {
  // Always return 200 to Telegram — any non-200 causes Telegram to retry the update for up to 1 hour
  try {
    const body = await readBody<TelegramUpdate>(event);

    // Silently ignore non-text messages (stickers, photos, voice, etc.)
    const chatId = body.message?.chat?.id;
    const text = body.message?.text;
    if (!chatId || !text) return { ok: true };

    // Load bot token from persisted flow in MongoDB
    await connectDB();
    const flow = await Flow.findOne({ flowId: 'default' }).lean() as any;
    const telegramNode = flow?.nodes?.find((n: any) => n.type === 'telegram');
    const botToken = telegramNode?.data?.config?.botToken as string | undefined;
    if (!botToken) {
      console.warn('[telegram.post] No bot token found in flow — Telegram node not configured');
      return { ok: true };
    }

    const sessionId = `telegram-${chatId}`;

    // Step 1: Memory — load conversation history
    const memory = await memoryService.load(sessionId);

    // Step 2: Orchestrator — classify intent + extract field values
    const { intent, extracted } = await classifyIntent(text);
    const mergedValidationData: Record<string, unknown> = {
      ...memory.validationData,
      ...extracted,
    };

    // Step 3: Validator — check if required fields are complete
    const validationResult = checkFields(intent, mergedValidationData);

    let replyText: string;

    if (!validationResult.isComplete) {
      // Validator short-circuits: ask for next missing field
      replyText = validationResult.nextQuestion ?? '¿Podría proporcionar más información?';
      await memoryService.save(sessionId, text, replyText, {
        intent,
        validationData: mergedValidationData,
        agentType: 'validator',
        source: 'telegram',
      });
    } else {
      // Step 4: Specialist — vector context + non-streaming LLM response
      // IMPORTANT: Use generateContent() NOT generateContentStream() — Telegram requires a complete reply
      const [vehicles, faqs] = await Promise.all([
        vectorSearchService.searchVehicles(text, 3),
        vectorSearchService.searchFAQs(text, 3),
      ]);
      const systemPrompt = buildSpecialistPrompt(vehicles, faqs, validationResult.collectedData, intent);
      const history = memory.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const response = await getGenAI().models.generateContent({
        model: MODEL(),
        contents: [...history, { role: 'user', parts: [{ text }] }],
        config: { systemInstruction: systemPrompt },
      });
      replyText = response.text ?? 'Lo siento, no pude generar una respuesta.';

      await memoryService.save(sessionId, text, replyText, {
        intent,
        validationData: validationResult.collectedData,
        agentType: 'specialist',
        source: 'telegram',
      });
    }

    // Reply to Telegram user via Bot API (plain text, no Markdown parse_mode)
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: replyText }),
    });

    return { ok: true };
  } catch (error) {
    // Log internally but always return 200 to prevent Telegram retry storm
    console.error('[telegram.post] Unhandled error:', error);
    return { ok: true };
  }
});
