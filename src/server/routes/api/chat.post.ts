import { defineEventHandler, readBody, setHeader } from 'h3';
import { createEmitter } from '../../sse/emitter';
import type { ChatRequest } from '../../../shared/types';
import { memoryService } from '../../memory/memory.service';
import { faqsData, catalogData, scheduleData } from '../../data/loader';

export const config = {
  maxDuration: 60,
};

// Verify static data loaded at module init time (logged once on first request)
console.log(
  `Data loaded: ${(faqsData as unknown[]).length} FAQs, ${(catalogData as unknown[]).length} vehicles, ${(scheduleData as { advisors: unknown[] }).advisors.length} advisors`
);

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

    // b) Simulate orchestrator processing
    emit('agent_active', { node: 'orchestrator', status: 'processing' });
    await new Promise((resolve) => setTimeout(resolve, 100));
    emit('agent_active', { node: 'orchestrator', status: 'complete' });

    // c) Build mock response with turn count from memory history
    // Each turn adds 2 messages (user + assistant), so turn number = (messages.length / 2) + 1
    const turnNumber = Math.floor(memory.messages.length / 2) + 1;
    const mockResponse = `Hola! Recibí tu mensaje: "${message}". Este es el turno #${turnNumber} de tu conversación. (Respuesta simulada — Fase 1)`;

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
