import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  agentType: { type: String, default: null },
});

const conversationSchema = new mongoose.Schema(
  {
    sessionId: { type: String, unique: true, index: true, required: true },
    messages: [messageSchema],
    validationData: { type: mongoose.Schema.Types.Mixed, default: {} },
    currentIntent: { type: String, default: null },
  },
  { timestamps: true }
);

// TTL index: auto-delete conversations after 7 days of inactivity (604800 seconds)
conversationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 604800 });

export const Conversation =
  mongoose.models['Conversation'] ||
  mongoose.model('Conversation', conversationSchema);
