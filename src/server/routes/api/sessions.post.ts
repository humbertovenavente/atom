import { defineEventHandler } from 'h3';
import { v4 as uuidv4 } from 'uuid';
import { connectDB } from '../../db/connect';
import { Conversation } from '../../models/conversation';

export default defineEventHandler(async (_event) => {
  await connectDB();
  const sessionId = uuidv4();
  // Reuse existing Conversation model — no separate Session model (LOCKED DECISION)
  await Conversation.create({
    sessionId,
    messages: [],
    validationData: {},
    currentIntent: null,
  });
  return { sessionId };
});
