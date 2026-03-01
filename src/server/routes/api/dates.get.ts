import { defineEventHandler } from 'h3';
import { connectDB } from '../../db/connect';
import { DateSlot } from '../../models/date-slot';

export default defineEventHandler(async (_event) => {
  await connectDB();
  // Filter to future dates only for demo relevance
  const today = new Date().toISOString().split('T')[0];
  const dates = await DateSlot.find({ fecha: { $gte: today } }, { _id: 0 }).lean();
  return dates;
});
