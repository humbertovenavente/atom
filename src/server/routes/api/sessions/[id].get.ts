import { defineEventHandler, getRouterParam, createError } from 'h3';
import { connectDB } from '../../../db/connect';
import { Conversation } from '../../../models/conversation';

export default defineEventHandler(async (event) => {
  await connectDB();
  const id = getRouterParam(event, 'id');
  const conversation = await Conversation.findOne({ sessionId: id }).lean();
  if (!conversation) {
    // STRICT 404 — no auto-create for unknown IDs
    throw createError({ statusCode: 404, message: 'Session not found' });
  }
  return conversation;
});
