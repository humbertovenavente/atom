import { defineEventHandler } from 'h3';
import { connectDB } from '../../db/connect';
import { FAQ } from '../../models/faq';

export default defineEventHandler(async (_event) => {
  await connectDB();
  // CRITICAL: Always project embedding: 0 — embedding arrays are 12KB per doc
  const faqs = await FAQ.find({}, { embedding: 0 }).lean();
  return faqs;
});
