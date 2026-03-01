import OpenAI from 'openai';
import { connectDB } from '../db/connect';
import { Vehicle } from '../models/vehicle';
import { FAQ } from '../models/faq';

// Lazy OpenAI client initialization — not created at import time
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env['LLM_API_KEY'];
    if (!apiKey) {
      throw new Error('LLM_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey,
      ...(process.env['LLM_BASE_URL'] ? { baseURL: process.env['LLM_BASE_URL'] } : {}),
    });
  }
  return openaiClient;
}

async function embedQuery(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

export const vectorSearchService = {
  async searchVehicles(query: string, limit = 5): Promise<unknown[]> {
    await connectDB();
    const queryVector = await embedQuery(query);
    return Vehicle.aggregate([
      {
        $vectorSearch: {
          index: 'vehicles_vector_index',
          path: 'embedding',
          queryVector,
          numCandidates: limit * 10,
          limit,
        },
      },
      {
        $project: {
          embedding: 0,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);
  },

  async searchFAQs(query: string, limit = 5): Promise<unknown[]> {
    await connectDB();
    const queryVector = await embedQuery(query);
    return FAQ.aggregate([
      {
        $vectorSearch: {
          index: 'faqs_vector_index',
          path: 'embedding',
          queryVector,
          numCandidates: limit * 10,
          limit,
        },
      },
      {
        $project: {
          embedding: 0,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);
  },
};
