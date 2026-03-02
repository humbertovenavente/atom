import { GoogleGenAI } from '@google/genai';
import { defineEventHandler, readBody, setHeader } from 'h3';
import { createEmitter } from '../../sse/emitter';
import type { ChatRequest, OrchestratorResult, ValidatorResult, BookingResult } from '../../../shared/types';
import { memoryService } from '../../memory/memory.service';
import { vectorSearchService } from '../../services/vector-search.service';
import { appointmentService, getAvailableSlots } from '../../services/appointment.service';

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

// Orchestrator system prompt — built dynamically to inject current date
function buildOrchestratorPrompt(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dayName = dayNames[now.getDay()];

  return `Eres un clasificador de intenciones para un asistente de agencia de autos.
Clasifica el mensaje del usuario en exactamente una de estas categorías:
- "catalog": el usuario quiere ver vehículos, precios, o comparar modelos
- "schedule": el usuario quiere agendar una cita, prueba de manejo, o visita
- "faqs": el usuario tiene preguntas sobre financiamiento, garantías, políticas, o información general
- "generic": cualquier otra consulta

FECHA ACTUAL: Hoy es ${dayName} ${dateStr}. Usa esta fecha para resolver "mañana", "el viernes", "la próxima semana", etc.

Analiza también si el usuario está proporcionando datos de campo (nombre, fecha, hora, presupuesto, tipo de vehículo).
IMPORTANTE para "preferredTime": siempre usa formato 24 horas HH:mm (ejemplo: "15:00", "09:00"). Convierte "3pm" → "15:00", "10am" → "10:00".
IMPORTANTE para "preferredDate": siempre usa formato YYYY-MM-DD (ejemplo: "2026-03-05"). Resuelve fechas relativas ("mañana", "el lunes") a la fecha real.

Responde SOLO con JSON: {"intent": "<categoría>", "confidence": <0.0-1.0>, "extracted": {"fullName": "...", "preferredDate": "...", "preferredTime": "...", "budget": <número o null>, "vehicleType": "..."}}
Omite campos extracted que no estén presentes en el mensaje. Usa null para campos numéricos ausentes.`;
}

async function classifyIntent(
  message: string
): Promise<{ intent: OrchestratorResult['intent']; extracted: Record<string, unknown> }> {
  const response = await getGenAI().models.generateContent({
    model: MODEL(),
    contents: [{ role: 'user', parts: [{ text: message }] }],
    config: { systemInstruction: buildOrchestratorPrompt() },
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
  isComplete: boolean,
  bookingResult?: BookingResult,
  availableSlots?: string[]
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
      '- Ve recopilando nombre completo, fecha y hora a lo largo de la conversación',
      '- PROHIBIDO decir "agendamos", "tu cita está confirmada", "listo, te esperamos" o cualquier frase que implique que la cita ya fue reservada.',
      '- SOLO el sistema puede confirmar una cita. Tú NO puedes confirmar citas.',
      '- Mientras falten datos, di cosas como "para agendar necesito..." o "¿a qué hora te gustaría venir?"'
    );
    // Inject real available slots when scheduling context is active
    if (availableSlots && availableSlots.length > 0) {
      lines.push(
        '',
        `HORARIOS DISPONIBLES (ÚNICAMENTE estos — NUNCA inventes otros): ${availableSlots.join(', ')}`,
        'SOLO muestra los horarios de la lista HORARIOS DISPONIBLES. NUNCA inventes horarios.',
        'Si el usuario no ha elegido hora, muéstrale SOLO estos horarios disponibles.'
      );
    } else if (!validationData['preferredDate']) {
      lines.push(
        '',
        'No muestres horarios específicos todavía. Primero pide la fecha al cliente.'
      );
    } else {
      lines.push(
        '',
        'No hay horarios disponibles para esa fecha. Sugiere que elija otra fecha.'
      );
    }
  } else if (intent === 'faqs') {
    lines.push(
      '',
      'INSTRUCCIONES PARA PREGUNTAS FRECUENTES:',
      '- Responde directamente usando la información de FAQs disponible',
      '- No necesitas recopilar datos adicionales'
    );
  }

  // When all data is complete, instruct to confirm/proceed
  if (isComplete && intent === 'schedule' && bookingResult) {
    if (bookingResult.success) {
      lines.push(
        '',
        'LA CITA FUE AGENDADA EXITOSAMENTE EN EL SISTEMA.',
        'Confirma cálidamente al cliente resumiendo: nombre, fecha y hora reservada.',
        'NO preguntes si quiere confirmar — la cita YA está confirmada.'
      );
    } else {
      const reasonMessages: Record<string, string> = {
        date_not_found: 'La fecha solicitada no tiene horarios disponibles.',
        slot_not_available: 'La hora solicitada no está disponible para esa fecha.',
        slot_already_booked: 'Esa hora ya fue reservada por otro cliente.',
        day_fully_booked: 'El día ya tiene todas las citas ocupadas (máximo 4 por día).',
      };
      const reason = reasonMessages[bookingResult.reason ?? ''] ?? 'Hubo un problema al reservar.';
      lines.push(
        '',
        `NO SE PUDO AGENDAR LA CITA: ${reason}`
      );
      if (bookingResult.availableSlots && bookingResult.availableSlots.length > 0) {
        lines.push(
          `HORARIOS DISPONIBLES para esa fecha: ${bookingResult.availableSlots.join(', ')}`,
          'Muéstrale al cliente estos horarios disponibles y ayúdale a elegir uno.'
        );
      } else {
        lines.push('No hay horarios disponibles para esa fecha. Sugiere otro día.');
      }
    }
  } else if (isComplete && intent === 'schedule') {
    // Booking already confirmed in a previous turn — just continue naturally
    lines.push(
      '',
      'La cita del cliente ya fue agendada previamente. No la vuelvas a confirmar. Solo responde a lo que pregunte.'
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

    // Step 3.5: Booking — fields-first approach (intent-independent)
    let bookingResult: BookingResult | undefined;
    const hasAllBookingFields =
      !!mergedValidationData['fullName'] &&
      !!mergedValidationData['preferredDate'] &&
      !!mergedValidationData['preferredTime'];
    const isBookingContext = hasAllBookingFields && !mergedValidationData['_bookingConfirmed'];

    // Override intent to 'schedule' when fields-first booking kicks in
    const effectiveIntent: OrchestratorResult['intent'] = isBookingContext ? 'schedule' : intent;

    console.log('[booking] intent=%s effectiveIntent=%s isBookingContext=%s _bookingConfirmed=%s data=%j',
      intent, effectiveIntent, isBookingContext, mergedValidationData['_bookingConfirmed'],
      { fullName: mergedValidationData['fullName'], preferredDate: mergedValidationData['preferredDate'], preferredTime: mergedValidationData['preferredTime'] });

    if (isBookingContext) {
      emit('agent_active', { node: 'booking', status: 'processing' });
      const { fullName, preferredDate, preferredTime } = mergedValidationData as Record<string, string>;
      bookingResult = await appointmentService.bookAppointment(preferredDate, preferredTime, fullName, sessionId);
      emit('agent_active', { node: 'booking', status: 'complete' });
      console.log('[booking] result=%j', bookingResult);

      if (bookingResult.success) {
        mergedValidationData['_bookingConfirmed'] = true;
        emit('booking_confirmed', {
          date: bookingResult.booking!.date,
          time: bookingResult.booking!.time,
          fullName: bookingResult.booking!.fullName,
        });
      } else {
        // Clear conflicting field to enable retry on next turn
        if (bookingResult.reason === 'slot_already_booked') {
          delete mergedValidationData['preferredTime'];
        } else if (bookingResult.reason === 'day_fully_booked') {
          delete mergedValidationData['preferredDate'];
        }
        emit('booking_failed', {
          reason: bookingResult.reason,
          availableSlots: bookingResult.availableSlots ?? [],
        });
      }
    }

    // Re-evaluate validation with effective intent to get correct isComplete/missingFields
    const effectiveValidationResult = checkFields(effectiveIntent, mergedValidationData);

    // Proactively fetch real available slots when scheduling context is active
    let availableSlotsForPrompt: string[] = [];
    const schedulingActive = effectiveIntent === 'schedule';
    const dateKnown = !!mergedValidationData['preferredDate'];
    if (schedulingActive && dateKnown && !mergedValidationData['_bookingConfirmed']) {
      availableSlotsForPrompt = await getAvailableSlots(mergedValidationData['preferredDate'] as string);
    }

    // Step 4: Specialist — always proceed with vector context + streaming LLM response
    const specialistNode = effectiveIntent === 'generic' ? 'generic' : `specialist-${effectiveIntent}`;
    emit('agent_active', { node: specialistNode, status: 'processing' });
    const [vehicles, faqs] = await Promise.all([
      vectorSearchService.searchVehicles(message, 3),
      vectorSearchService.searchFAQs(message, 3),
    ]);
    const systemPrompt = buildSpecialistPrompt(
      vehicles,
      faqs,
      mergedValidationData,
      effectiveIntent,
      effectiveValidationResult.missingFields,
      effectiveValidationResult.isComplete,
      bookingResult,
      availableSlotsForPrompt
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
      intent: effectiveIntent,
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
