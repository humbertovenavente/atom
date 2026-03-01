import { defineEventHandler, readBody, setHeader } from 'h3';
import { createEmitter } from '../../sse/emitter';
import type { ChatRequest } from '../../../shared/types';
import { memoryService } from '../../memory/memory.service';
import { vectorSearchService } from '../../services/vector-search.service';

export const config = {
  maxDuration: 60,
};

export default defineEventHandler(async (event) => {
  const body = await readBody<ChatRequest>(event);
  const { sessionId, message } = body;

  // Set SSE headers SYNCHRONOUSLY before any await (Critical — prevents Vercel buffering)
  setHeader(event, 'Content-Type', 'text/event-stream');
  setHeader(event, 'Cache-Control', 'no-cache');
  setHeader(event, 'Connection', 'keep-alive');

  // Flush headers immediately — prevents Vercel from buffering the entire response
  event.node.res.flushHeaders();

  const emit = createEmitter(event.node.res);

  try {
    // a) Load conversation history from MongoDB
    emit('agent_active', { node: 'memory', status: 'processing' });
    const memory = await memoryService.load(sessionId);
    emit('agent_active', { node: 'memory', status: 'complete' });

    // b) Orchestrator: fetch live context from MongoDB via VectorSearchService
    emit('agent_active', { node: 'orchestrator', status: 'processing' });

    const [vehicles, faqs] = await Promise.all([
      vectorSearchService.searchVehicles(message, 3),
      vectorSearchService.searchFAQs(message, 3),
    ]);

    const systemPrompt = [
      'Eres un asistente experto de agencia de autos.',
      '',
      'CONTEXTO - Vehículos relevantes:',
      JSON.stringify(vehicles, null, 2),
      '',
      'CONTEXTO - Preguntas frecuentes relevantes:',
      JSON.stringify(faqs, null, 2),
      '',
      'Responde basándote en esta información. Si no tienes información suficiente, dilo honestamente.',
    ].join('\n');

    emit('agent_active', { node: 'orchestrator', status: 'complete' });

    // c) Build mock response with turn count from memory history
    // Each turn adds 2 messages (user + assistant), so turn number = (messages.length / 2) + 1
    const turnNumber = Math.floor(memory.messages.length / 2) + 1;
    const mockResponse = `[Contexto: ${(vehicles as unknown[]).length} vehículos, ${(faqs as unknown[]).length} FAQs] Turno #${turnNumber}: "${message}" (Fase 3 — LLM real en Fase 4)`;

    // systemPrompt will be used by Phase 4 LLM call — referenced here to avoid unused var warning
    void systemPrompt;

    emit('message_chunk', { content: mockResponse });

    // d) Save conversation turn to MongoDB
    emit('agent_active', { node: 'memory', status: 'processing' });
    await memoryService.save(sessionId, message, mockResponse);
    emit('agent_active', { node: 'memory', status: 'complete' });

    emit('done', { sessionId });
  } catch (error) {
    emit('error', {
      message:
        'Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo.',
    });
  } finally {
    event.node.res.end();
  }
});
