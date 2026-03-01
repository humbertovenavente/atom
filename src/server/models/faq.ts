import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
  categoria: { type: String, required: true, index: true },
  pregunta: { type: String, required: true },
  respuesta: { type: String, required: true },
  faqId: { type: Number, required: true },
  embedding: { type: [Number], required: true },
});

export const FAQ =
  mongoose.models['FAQ'] ||
  mongoose.model('FAQ', faqSchema);
