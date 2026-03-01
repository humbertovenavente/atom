import { defineEventHandler, readBody, setHeader } from 'h3';
import { createEmitter } from '../../sse/emitter';
import type { ChatRequest } from '../../../shared/types';

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
    // Mock pipeline — hardcoded events proving SSE transport works (Phase 1)
    emit('agent_active', { node: 'memory', status: 'processing' });
    emit('agent_active', { node: 'memory', status: 'complete' });

    emit('agent_active', { node: 'orchestrator', status: 'processing' });
    // Simulate 100ms processing delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    emit('agent_active', { node: 'orchestrator', status: 'complete' });

    emit('message_chunk', {
      content: `Hola! Recibí tu mensaje: "${message}". (Respuesta simulada — Fase 1)`,
    });

    emit('agent_active', { node: 'memory', status: 'processing' });
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
