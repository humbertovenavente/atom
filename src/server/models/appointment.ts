import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  date: { type: String, required: true, index: true },
  slots: { type: [String] },
});

// NO embedding field — Appointment documents are queried by date range only (LOCKED DECISION)

export const Appointment =
  mongoose.models['Appointment'] ||
  mongoose.model('Appointment', appointmentSchema, 'appointments');
