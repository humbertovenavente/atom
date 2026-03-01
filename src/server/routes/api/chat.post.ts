import { GoogleGenAI } from '@google/genai';
import { defineEventHandler, readBody, setHeader } from 'h3';
import { createEmitter } from '../../sse/emitter';
import type { ChatRequest, OrchestratorResult, ValidatorResult } from '../../../shared/types';
import { memoryService } from '../../memory/memory.service';
import { vectorSearchService } from '../../services/vector-search.service';

export const config = {
  maxDuration: 60,
};

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
  const response = await getGenAI().models.generateContent({
    model: MODEL(),
    contents: [{ role: 'user', parts: [{ text: message }] }],
    config: { systemInstruction: ORCHESTRATOR_SYSTEM },
  });
  try {
    const text = response.text ?? '';
    // Strip markdown code fences if present
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

// Validator field check — pure logic, no LLM
const REQUIRED_FIELDS: Record<string, string[]> = {
  schedule: ['fullName', 'preferredDate', 'preferredTime'],
  catalog: ['budget', 'vehicleType'],
  faqs: [],
  generic: [],
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
  };
}

// Human-readable labels for missing fields
const FIELD_LABELS: Record<string, string> = {
  fullName: 'nombre del cliente',
  preferredDate: 'fecha preferida',
  preferredTime: 'hora preferida',
  budget: 'presupuesto aproximado',
  vehicleType: 'tipo de vehículo',
};

// Specialist prompt builder — conversational, never form-like
function buildSpecialistPrompt(
  vehicles: unknown[],
  faqs: unknown[],
  validationData: Record<string, unknown>,
  intent: string,
  missingFields: string[],
  isComplete: boolean
): string {
  // Inject current date so the LLM can resolve "mañana", "el viernes", etc.
  const now = new Date();
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const todayStr = `${dayNames[now.getDay()]} ${now.getDate()} de ${monthNames[now.getMonth()]} de ${now.getFullYear()}`;

  const lines = [
    'Eres un asesor de autos conversacional, amigable y profesional. Responde siempre en español.',
    '',
    `FECHA ACTUAL: Hoy es ${todayStr}. Usa esta fecha para resolver referencias relativas como "mañana", "el viernes", "la próxima semana", etc.`,
    '',
    'REGLAS DE CONVERSACIÓN:',
    '- NUNCA hagas preguntas directas tipo formulario ("¿Cuál es su presupuesto?", "¿Cuál es su nombre?")',
    '- En su lugar, conversa naturalmente: muestra opciones, haz recomendaciones, y descubre preferencias a través del diálogo',
    '- Si necesitas saber presupuesto, muestra rangos: "Tenemos desde compactos accesibles hasta SUVs premium..."',
    '- Si necesitas un nombre, introdúcelo naturalmente: "Por cierto, ¿con quién tengo el gusto?"',
    '- Recopila información orgánicamente durante la conversación, no como interrogatorio',
    '- Sé conciso pero cálido. No repitas información que ya diste.',
  ];

  // Context: what we already know
  const collectedEntries = Object.entries(validationData).filter(([, v]) => v != null && v !== '');
  if (collectedEntries.length > 0) {
    lines.push('', 'CONTEXTO RECOPILADO DEL CLIENTE:');
    for (const [k, v] of collectedEntries) {
      lines.push(`- ${FIELD_LABELS[k] ?? k}: ${v}`);
    }
  }

  // What we still need (but must discover conversationally)
  if (missingFields.length > 0) {
    const labels = missingFields.map((f) => FIELD_LABELS[f] ?? f);
    lines.push(
      '',
      `INFORMACIÓN PENDIENTE (integra su descubrimiento naturalmente en la conversación, NO preguntes directamente):`,
      labels.map((l) => `- ${l}`).join('\n')
    );
  }

  // Intent-specific guidance
  if (intent === 'catalog') {
    lines.push(
      '',
      'INSTRUCCIONES PARA CATÁLOGO:',
      '- Muestra vehículos relevantes del contexto aunque no conozcas el presupuesto exacto',
      '- Presenta opciones en diferentes rangos para que el cliente reaccione',
      '- Destaca características, no solo precios',
      '- Ve refinando recomendaciones según las reacciones del cliente'
    );
  } else if (intent === 'schedule') {
    lines.push(
      '',
      'INSTRUCCIONES PARA AGENDAR CITA:',
      '- Ayuda al cliente a planear su visita de forma natural',
      '- Sugiere horarios disponibles, menciona qué puede esperar en la visita',
      '- Ve recopilando nombre, fecha y hora a lo largo de la conversación'
    );
  } else if (intent === 'faqs') {
    lines.push(
      '',
      'INSTRUCCIONES PARA PREGUNTAS FRECUENTES:',
      '- Responde directamente usando la información de FAQs disponible',
      '- No necesitas recopilar datos adicionales'
    );
  }

  // When all data is complete, instruct to confirm/proceed
  if (isComplete && intent === 'schedule') {
    lines.push(
      '',
      'TODOS LOS DATOS ESTÁN COMPLETOS. Confirma la cita de forma cálida resumiendo: nombre, fecha y hora. Pregunta si todo está correcto.'
    );
  } else if (isComplete && intent === 'catalog') {
    lines.push(
      '',
      'Ya tienes las preferencias del cliente. Haz recomendaciones personalizadas y específicas basándote en su presupuesto y tipo de vehículo preferido.'
    );
  }

  // Vector search context
  if (vehicles.length > 0) {
    lines.push('', 'VEHÍCULOS RELEVANTES:', JSON.stringify(vehicles, null, 2));
  }
  if (faqs.length > 0) {
    lines.push('', 'PREGUNTAS FRECUENTES RELEVANTES:', JSON.stringify(faqs, null, 2));
  }

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

    // Step 4: Specialist — always proceed with vector context + streaming LLM response
    const specialistNode = intent === 'generic' ? 'generic' : `specialist-${intent}`;
    emit('agent_active', { node: specialistNode, status: 'processing' });
    const [vehicles, faqs] = await Promise.all([
      vectorSearchService.searchVehicles(message, 3),
      vectorSearchService.searchFAQs(message, 3),
    ]);
    const systemPrompt = buildSpecialistPrompt(
      vehicles,
      faqs,
      mergedValidationData,
      intent,
      validationResult.missingFields,
      validationResult.isComplete
    );
    // Map history to Gemini format (assistant → model, skip system messages)
    const history = memory.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const stream = await getGenAI().models.generateContentStream({
      model: MODEL(),
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: { systemInstruction: systemPrompt },
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.text ?? '';
      if (content) {
        emit('message_chunk', { content });
        fullResponse += content;
      }
    }
    emit('agent_active', { node: specialistNode, status: 'complete' });

    // Save turn to MongoDB with intent, merged validationData, and agentType
    emit('agent_active', { node: 'memory', status: 'processing' });
    await memoryService.save(sessionId, message, fullResponse, {
      intent,
      validationData: mergedValidationData,
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
