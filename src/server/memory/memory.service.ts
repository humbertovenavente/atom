import { connectDB } from '../db/connect';
import { Conversation } from '../models/conversation';

export interface ConversationContext {
  sessionId: string;
  messages: Array<{ role: string; content: string; timestamp: Date; agentType?: string }>;
  validationData: Record<string, unknown>;
  currentIntent: string | null;
}

export const memoryService = {
  async load(sessionId: string): Promise<ConversationContext> {
    await connectDB();
    const doc = await Conversation.findOne({ sessionId });
    if (!doc) {
      return { sessionId, messages: [], validationData: {}, currentIntent: null };
    }
    return {
      sessionId: doc.sessionId,
      messages: doc.messages,
      validationData: doc.validationData ?? {},
      currentIntent: doc.currentIntent ?? null,
    };
  },

  async save(
    sessionId: string,
    userMessage: string,
    assistantResponse: string,
    update?: {
      intent?: string;
      validationData?: Record<string, unknown>;
      agentType?: string;
      source?: 'web' | 'telegram';
    }
  ): Promise<void> {
    await connectDB();
    await Conversation.findOneAndUpdate(
      { sessionId },
      {
        $push: {
          messages: {
            $each: [
              { role: 'user', content: userMessage, timestamp: new Date() },
              { role: 'assistant', content: assistantResponse, timestamp: new Date(), ...(update?.agentType && { agentType: update.agentType }) },
            ],
          },
        },
        $set: {
          ...(update?.intent !== undefined && { currentIntent: update.intent }),
          ...(update?.validationData !== undefined && { validationData: update.validationData }),
        },
        $setOnInsert: {
          ...(update?.source !== undefined && { source: update.source }),
        },
      },
      { upsert: true, new: true }
    );
  },
};
