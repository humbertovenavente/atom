import OpenAI from 'openai';
import { defineEventHandler, readBody, setHeader } from 'h3';
import { createEmitter } from '../../sse/emitter';
import type { ChatRequest, OrchestratorResult, ValidatorResult } from '../../../shared/types';
import { memoryService } from '../../memory/memory.service';
import { vectorSearchService } from '../../services/vector-search.service';

export const config = {
  maxDuration: 60,
};

// Lazy OpenAI client singleton
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env['LLM_API_KEY'];
    const baseURL = process.env['LLM_BASE_URL'];
    if (!apiKey) throw new Error('LLM_API_KEY is not set');
    openaiClient = new OpenAI({ apiKey, ...(baseURL && { baseURL }) });
  }
  return openaiClient;
}
const MODEL = () => process.env['LLM_MODEL'] ?? 'gpt-4o';

// Orchestrator system prompt and intent classification helper
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
  const completion = await getOpenAI().chat.completions.create({
    model: MODEL(),
    messages: [
      { role: 'system', content: ORCHESTRATOR_SYSTEM },
      { role: 'user', content: message },
    ],
    stream: false,
  });
  try {
    const raw = JSON.parse(completion.choices[0].message.content ?? '{}');
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

// Validator field check — pure logic, no LLM
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

// Specialist prompt builder
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
  const body = await readBody<ChatRequest>(event);
  const { sessionId, message } = body;

  // MUST remain synchronous before any await (Critical — prevents Vercel buffering)
  setHeader(event, 'Content-Type', 'text/event-stream');
  setHeader(event, 'Cache-Control', 'no-cache');
  setHeader(event, 'Connection', 'keep-alive');
  event.node.res.flushHeaders();

  const emit = createEmitter(event.node.res);

  try {
    // Step 1: Memory — load conversation history
    emit('agent_active', { node: 'memory', status: 'processing' });
    const memory = await memoryService.load(sessionId);
    emit('agent_active', { node: 'memory', status: 'complete' });

    // Step 2: Orchestrator — classify intent + extract field values
    emit('agent_active', { node: 'orchestrator', status: 'processing' });
    const { intent, extracted } = await classifyIntent(message);
    // Merge newly extracted fields with accumulated validationData
    const mergedValidationData: Record<string, unknown> = {
      ...memory.validationData,
      ...extracted,
    };
    emit('agent_active', { node: 'orchestrator', status: 'complete' });

    // Step 3: Validator — check if required fields are complete
    emit('agent_active', { node: 'validator', status: 'processing' });
    const validationResult = checkFields(intent, mergedValidationData);
    emit('agent_active', { node: 'validator', status: 'complete' });

    if (!validationResult.isComplete) {
      // Validator short-circuits: ask for next missing field, save partial data
      const question = validationResult.nextQuestion ?? '¿Podría proporcionar más información?';
      emit('message_chunk', { content: question });
      await memoryService.save(sessionId, message, question, {
        intent,
        validationData: mergedValidationData,
        agentType: 'validator',
      });
      emit('done', { sessionId });
      return;
    }

    // Step 4: Specialist — vector context + streaming LLM response
    emit('agent_active', { node: 'specialist', status: 'processing' });
    const [vehicles, faqs] = await Promise.all([
      vectorSearchService.searchVehicles(message, 3),
      vectorSearchService.searchFAQs(message, 3),
    ]);
    const systemPrompt = buildSpecialistPrompt(vehicles, faqs, validationResult.collectedData, intent);
    const history = memory.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    const stream = await getOpenAI().chat.completions.create({
      model: MODEL(),
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
      ],
      stream: true,
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content ?? '';
      if (content) {
        emit('message_chunk', { content });
        fullResponse += content;
      }
    }
    emit('agent_active', { node: 'specialist', status: 'complete' });

    // Save turn to MongoDB with intent, merged validationData, and agentType
    emit('agent_active', { node: 'memory', status: 'processing' });
    await memoryService.save(sessionId, message, fullResponse, {
      intent,
      validationData: validationResult.collectedData,
      agentType: 'specialist',
    });
    emit('agent_active', { node: 'memory', status: 'complete' });

    emit('done', { sessionId });
  } catch (error) {
    console.error('chat.post error:', error);
    emit('error', {
      message: 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo.',
    });
  } finally {
    event.node.res.end();
  }
});
