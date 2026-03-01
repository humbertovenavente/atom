import { GoogleGenAI } from '@google/genai';
import { connectDB } from '../db/connect';
import { Vehicle } from '../models/vehicle';
import { FAQ } from '../models/faq';

// Lazy Gemini client initialization — not created at import time
let genaiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genaiClient) {
    const apiKey = process.env['LLM_API_KEY'];
    if (!apiKey) {
      throw new Error('LLM_API_KEY environment variable is not set');
    }
    genaiClient = new GoogleGenAI({ apiKey });
  }
  return genaiClient;
}

async function embedQuery(text: string): Promise<number[]> {
  const genai = getGenAI();
  const response = await genai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
  });
  return response.embeddings![0].values!;
}

export const vectorSearchService = {
  async searchVehicles(query: string, limit = 3): Promise<unknown[]> {
    await connectDB();
    const queryVector = await embedQuery(query);
    const results = await Vehicle.aggregate([
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
    if (results.length === 0) {
      return Vehicle.find({}, { embedding: 0 }).sort({ price: 1 }).limit(limit).lean();
    }
    return results;
  },

  async searchFAQs(query: string, limit = 3): Promise<unknown[]> {
    await connectDB();
    const queryVector = await embedQuery(query);
    const results = await FAQ.aggregate([
      {
        $vectorSearch: {
          index: 'faq_vector_index',
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
    if (results.length === 0) {
      return FAQ.find({}, { embedding: 0 }).sort({ category: 1, originalId: 1 }).limit(limit).lean();
    }
    return results;
  },
};
