import { GoogleGenAI } from '@google/genai';
import { connectDB } from '../db/connect';
import { Vehicle } from '../models/vehicle';
import { FAQ } from '../models/faq';

// Lazy Gemini client initialization — not created at import time
let genaiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genaiClient) {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
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
