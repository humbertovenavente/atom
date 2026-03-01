import { defineEventHandler } from 'h3';
import { connectDB } from '../../db/connect';
import { Conversation } from '../../models/conversation';

export default defineEventHandler(async () => {
  await connectDB();
  const conversations = await Conversation.find({}, {
    sessionId: 1,
    messages: { $slice: 1 },
    createdAt: 1,
    updatedAt: 1,
  })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  return conversations.map((c: any) => ({
    sessionId: c.sessionId,
    preview: c.messages?.[0]?.content?.slice(0, 60) ?? 'Empty conversation',
    updatedAt: c.updatedAt,
  }));
});
