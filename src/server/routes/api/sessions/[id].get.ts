import { defineEventHandler, getRouterParam } from 'h3';
import { connectDB } from '../../../db/connect';
import { Conversation } from '../../../models/conversation';

export default defineEventHandler(async (event) => {
  await connectDB();
  const id = getRouterParam(event, 'id');
  const conversation = await Conversation.findOne({ sessionId: id }).lean();
  if (!conversation) {
    // Return empty session object — not 404 (session may exist but have no messages yet)
    return {
      sessionId: id,
      messages: [],
      validationData: {},
      currentIntent: null,
    };
  }
  return conversation;
});
