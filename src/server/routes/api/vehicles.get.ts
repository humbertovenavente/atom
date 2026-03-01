import { defineEventHandler } from 'h3';
import { connectDB } from '../../db/connect';
import { Vehicle } from '../../models/vehicle';

export default defineEventHandler(async (_event) => {
  await connectDB();
  // CRITICAL: Always project embedding: 0 — embedding arrays are 12KB per doc
  const vehicles = await Vehicle.find({}, { embedding: 0 }).lean();
  return vehicles;
});
