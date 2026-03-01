import { defineEventHandler, readBody } from 'h3';
import { connectDB } from '../../db/connect';
import { Flow } from '../../models/flow';

export default defineEventHandler(async (event) => {
  await connectDB();
  const body = await readBody(event);
  await Flow.findOneAndUpdate(
    { flowId: 'default' },
    { ...body, flowId: 'default' },
    { upsert: true, new: true }
  );
  return { ok: true };
});
