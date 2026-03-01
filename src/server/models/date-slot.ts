import mongoose from 'mongoose';

const dateSlotSchema = new mongoose.Schema({
  fecha: { type: String, required: true, index: true },
  slots: { type: [String] },
});

// NO embedding field — DateSlot documents are queried by date range only (LOCKED DECISION)

export const DateSlot =
  mongoose.models['DateSlot'] ||
  mongoose.model('DateSlot', dateSlotSchema);
