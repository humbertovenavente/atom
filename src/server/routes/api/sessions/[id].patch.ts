import { defineEventHandler, getRouterParam, readBody, createError } from 'h3';
import { connectDB } from '../../../db/connect';
import { Conversation } from '../../../models/conversation';

export default defineEventHandler(async (event) => {
  await connectDB();
  const id = getRouterParam(event, 'id');
  const body = await readBody<{ title?: string }>(event);

  if (!body.title || typeof body.title !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'title is required' });
  }

  const result = await Conversation.updateOne(
    { sessionId: id },
    { $set: { title: body.title.trim().slice(0, 100) } }
  );

  if (result.matchedCount === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Session not found' });
  }

  return { ok: true };
});
