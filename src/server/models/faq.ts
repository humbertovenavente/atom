import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
  category: { type: String, required: true, index: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  originalId: { type: Number, required: true },
  embedding: { type: [Number], required: true },
});

export const FAQ =
  mongoose.models['FAQ'] ||
  mongoose.model('FAQ', faqSchema);
