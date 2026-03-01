import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  date:      { type: String, required: true },
  time:      { type: String, required: true },
  fullName:  { type: String, required: true },
  sessionId: { type: String, required: true },
  bookedAt:  { type: Date, default: () => new Date() },
});

// Prevents duplicate bookings for the same slot
bookSchema.index({ date: 1, time: 1 }, { unique: true });

export const Book =
  mongoose.models['Book'] ||
  mongoose.model('Book', bookSchema, 'books');
