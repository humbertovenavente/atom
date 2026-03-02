import { GoogleGenAI } from '@google/genai';
import { defineEventHandler, readBody } from 'h3';
import { connectDB } from '../../db/connect';
import { Flow } from '../../models/flow';
import { memoryService } from '../../memory/memory.service';
import { vectorSearchService } from '../../services/vector-search.service';
import { appointmentService, getAvailableSlots } from '../../services/appointment.service';
import type { OrchestratorResult, ValidatorResult, BookingResult } from '../../../shared/types';

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

function getNodeConfig(flow: any, nodeType: string): { systemPrompt?: string; temperature?: number } {
  const node = flow?.nodes?.find((n: any) => n.type === nodeType);
  return node?.data?.config ?? {};
}

// Orchestrator system prompt — built dynamically to inject current date
function buildOrchestratorPrompt(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
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
  message: string,
  orchestratorConfig: { systemPrompt?: string; temperature?: number } = {}
): Promise<{ intent: OrchestratorResult['intent']; extracted: Record<string, unknown> }> {
  let prompt = buildOrchestratorPrompt();
  if (orchestratorConfig.systemPrompt) {
    prompt += '\n\nINSTRUCCIONES ADICIONALES:\n' + orchestratorConfig.systemPrompt;
  }
  const response = await getGenAI().models.generateContent({
    model: MODEL(),
    contents: [{ role: 'user', parts: [{ text: message }] }],
    config: { systemInstruction: prompt, temperature: orchestratorConfig.temperature ?? 0.3 },
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

const FIELD_LABELS: Record<string, string> = {
  fullName: 'nombre del cliente',
  preferredDate: 'fecha preferida',
  preferredTime: 'hora preferida',
  budget: 'presupuesto aproximado',
  vehicleType: 'tipo de vehículo',
};

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

  const collectedEntries = Object.entries(validationData).filter(([, v]) => v != null && v !== '');
  if (collectedEntries.length > 0) {
    lines.push('', 'CONTEXTO RECOPILADO DEL CLIENTE:');
    for (const [k, v] of collectedEntries) {
      lines.push(`- ${FIELD_LABELS[k] ?? k}: ${v}`);
    }
  }

  if (missingFields.length > 0) {
    const labels = missingFields.map((f) => FIELD_LABELS[f] ?? f);
    lines.push(
      '',
      `INFORMACIÓN PENDIENTE (integra su descubrimiento naturalmente en la conversación, NO preguntes directamente):`,
      labels.map((l) => `- ${l}`).join('\n')
    );
  }

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

  if (vehicles.length > 0) {
    lines.push('', 'VEHÍCULOS RELEVANTES:', JSON.stringify(vehicles, null, 2));
  }
  if (faqs.length > 0) {
    lines.push('', 'PREGUNTAS FRECUENTES RELEVANTES:', JSON.stringify(faqs, null, 2));
  }

  return lines.join('\n');
}

export default defineEventHandler(async (event) => {
  // Always return 200 to Telegram — any non-200 causes Telegram to retry for up to 1 hour
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

    const orchestratorConfig = getNodeConfig(flow, 'orchestrator');
    const specialistConfig = getNodeConfig(flow, 'specialist');

    const sessionId = `telegram-${chatId}`;

    // Step 1: Memory — load conversation history
    const memory = await memoryService.load(sessionId);

    // Step 2: Orchestrator — classify intent + extract field values
    const { intent, extracted } = await classifyIntent(text, orchestratorConfig);
    const mergedValidationData: Record<string, unknown> = {
      ...memory.validationData,
      ...extracted,
    };

    // Step 3: Validator — check if required fields are complete
    const validationResult = checkFields(intent, mergedValidationData);

    // Step 3.5: Booking — fields-first approach (same as chat endpoint)
    let bookingResult: BookingResult | undefined;
    const hasAllBookingFields =
      !!mergedValidationData['fullName'] &&
      !!mergedValidationData['preferredDate'] &&
      !!mergedValidationData['preferredTime'];
    const isBookingContext = hasAllBookingFields && !mergedValidationData['_bookingConfirmed'];

    const effectiveIntent: OrchestratorResult['intent'] = isBookingContext ? 'schedule' : intent;

    if (isBookingContext) {
      const { fullName, preferredDate, preferredTime } = mergedValidationData as Record<string, string>;
      bookingResult = await appointmentService.bookAppointment(preferredDate, preferredTime, fullName, sessionId);

      if (bookingResult.success) {
        mergedValidationData['_bookingConfirmed'] = true;
      } else {
        if (bookingResult.reason === 'slot_already_booked') {
          delete mergedValidationData['preferredTime'];
        } else if (bookingResult.reason === 'day_fully_booked') {
          delete mergedValidationData['preferredDate'];
        }
      }
    }

    // Re-evaluate validation with effective intent
    const effectiveValidationResult = checkFields(effectiveIntent, mergedValidationData);

    // Proactively fetch available slots when scheduling
    let availableSlotsForPrompt: string[] = [];
    const schedulingActive = effectiveIntent === 'schedule';
    const dateKnown = !!mergedValidationData['preferredDate'];
    if (schedulingActive && dateKnown && !mergedValidationData['_bookingConfirmed']) {
      availableSlotsForPrompt = await getAvailableSlots(mergedValidationData['preferredDate'] as string);
    }

    // Step 4: Specialist — vector context + non-streaming LLM response
    const [vehicles, faqs] = await Promise.all([
      vectorSearchService.searchVehicles(text, 3),
      vectorSearchService.searchFAQs(text, 3),
    ]);
    let specialistPrompt = buildSpecialistPrompt(
      vehicles,
      faqs,
      mergedValidationData,
      effectiveIntent,
      effectiveValidationResult.missingFields,
      effectiveValidationResult.isComplete,
      bookingResult,
      availableSlotsForPrompt
    );
    if (specialistConfig.systemPrompt) {
      specialistPrompt = specialistConfig.systemPrompt + '\n\n' + specialistPrompt;
    }

    const history = memory.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // IMPORTANT: Use generateContent() NOT generateContentStream() — Telegram needs a complete reply
    const response = await getGenAI().models.generateContent({
      model: MODEL(),
      contents: [...history, { role: 'user', parts: [{ text }] }],
      config: { systemInstruction: specialistPrompt, temperature: specialistConfig.temperature ?? 0.3 },
    });
    const replyText = response.text ?? 'Lo siento, no pude generar una respuesta.';

    // Save turn to MongoDB
    await memoryService.save(sessionId, text, replyText, {
      intent: effectiveIntent,
      validationData: mergedValidationData,
      agentType: 'specialist',
      source: 'telegram',
    });

    // Reply to Telegram user via Bot API
    const TELEGRAM_API_BASE = process.env['TELEGRAM_API_BASE'] ?? `https://api.telegram.org/bot${botToken}`;
    await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
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
