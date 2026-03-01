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
    title: { type: String, default: null },
    messages: [messageSchema],
    validationData: { type: mongoose.Schema.Types.Mixed, default: {} },
    currentIntent: { type: String, default: null },
  },
  { timestamps: true }
);

// TTL index: auto-delete conversations after 24 hours of inactivity (86400 seconds)
conversationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

export const Conversation =
  mongoose.models['Conversation'] ||
  mongoose.model('Conversation', conversationSchema);
