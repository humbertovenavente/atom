import { defineEventHandler, getRouterParam, createError } from 'h3';
import { connectDB } from '../../../db/connect';
import { Conversation } from '../../../models/conversation';

export default defineEventHandler(async (event) => {
  await connectDB();
  const id = getRouterParam(event, 'id');
  const result = await Conversation.deleteOne({ sessionId: id });
  if (result.deletedCount === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Session not found' });
  }
  return { ok: true };
});
