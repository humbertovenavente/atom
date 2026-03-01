import { defineEventHandler } from 'h3';
import { connectDB } from '../../db/connect';
import { Appointment } from '../../models/appointment';

export default defineEventHandler(async (_event) => {
  await connectDB();
  // Filter to future dates only for demo relevance
  const today = new Date().toISOString().split('T')[0];
  const dates = await Appointment.find({ date: { $gte: today } }, { _id: 0 }).lean();
  return dates;
});
