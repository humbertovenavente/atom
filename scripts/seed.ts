/**
 * Seed script: Populates MongoDB Atlas with vehicles, FAQs, and date slots.
 * Generates Gemini embeddings for vehicles and FAQs.
 * Creates Atlas Vector Search indexes and polls until READY.
 *
 * Usage: npm run seed
 * Requires: GEMINI_API_KEY in .env
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import { connectDB } from '../src/server/db/connect.js';
import { Vehicle } from '../src/server/models/vehicle.js';
import { FAQ } from '../src/server/models/faq.js';
import { DateSlot } from '../src/server/models/date-slot.js';

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------

// Node 20+ built-in env file loader
try {
  (process as any).loadEnvFile('.env');
} catch {
  // .env may not exist in CI; proceed with existing env vars
  console.warn('Warning: could not load .env file — using existing environment variables');
}

if (!process.env['GEMINI_API_KEY']) {
  throw new Error('GEMINI_API_KEY not set in .env');
}

const genai = new GoogleGenAI({ apiKey: process.env['GEMINI_API_KEY'] });

// ---------------------------------------------------------------------------
// Embedding helper
// ---------------------------------------------------------------------------

async function embedWithRetry(batch: string[], maxRetries = 3): Promise<number[][]> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await genai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: batch,
      });
      return response.embeddings!.map(emb => emb.values!);
    } catch (err: any) {
      if (err.status === 429 && attempt < maxRetries) {
        const waitSec = 60;
        console.log(`  Rate limited — waiting ${waitSec}s before retry (${attempt + 1}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
      } else {
        throw err;
      }
    }
  }
  return []; // unreachable
}

async function embedBatch(texts: string[], batchSize = 20): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(texts.length / batchSize);

    console.log(`  Embedding batch ${batchNum}/${totalBatches} (${batch.length} texts)...`);

    const embeddings = await embedWithRetry(batch);
    results.push(...embeddings);

    // Rate limit courtesy delay between batches
    if (i + batchSize < texts.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Data loading and transformation
// ---------------------------------------------------------------------------

interface RawVehicle {
  Marca: string;
  Modelo: string;
  Año: number;
  Kilometraje: number;
  Color: string;
  Descripción: string;
  Puertas: number;
  Segmento: string;
  Precio: number;
  Estado: string;
  Ciudad: string;
  'Tipo de combustible': string;
  Motor: number;
  Transmisión: string;
  URL: string;
  Cantidad: number;
}

interface RawFAQPregunta {
  id: number;
  pregunta: string;
  respuesta: string;
}

interface RawFAQCategory {
  categoria: string;
  preguntas: RawFAQPregunta[];
}

interface RawDateSlot {
  fecha: string;
  slots: string[];
}

function loadVehicles(): { raw: RawVehicle[]; docs: Record<string, unknown>[] } {
  const filePath = resolve(process.cwd(), 'jsons/autos.json');
  const json = JSON.parse(readFileSync(filePath, 'utf-8'));
  const raw: RawVehicle[] = json.available_vehicles;

  const docs = raw.map(v => ({
    marca: v.Marca,
    modelo: v.Modelo,
    año: v.Año,
    kilometraje: v.Kilometraje,
    color: v.Color,
    descripcion: v.Descripción,
    puertas: v.Puertas,
    segmento: v.Segmento,
    precio: v.Precio,
    estado: v.Estado,
    ciudad: v.Ciudad,
    tipoCombustible: v['Tipo de combustible'],
    motor: v.Motor,
    transmision: v.Transmisión,
    url: v.URL,
    cantidad: v.Cantidad ?? 1,
  }));

  return { raw, docs };
}

function vehicleEmbedText(v: RawVehicle): string {
  return `${v.Marca} ${v.Modelo} ${v.Año} ${v.Segmento} ${v.Descripción} Precio: ${v.Precio} Transmisión: ${v.Transmisión} Combustible: ${v['Tipo de combustible']}`;
}

function loadFAQs(): { texts: string[]; docs: Record<string, unknown>[] } {
  const filePath = resolve(process.cwd(), 'jsons/faq.json');
  const json = JSON.parse(readFileSync(filePath, 'utf-8'));
  const categories: RawFAQCategory[] = json.faq_agencia_autos;

  const texts: string[] = [];
  const docs: Record<string, unknown>[] = [];

  for (const category of categories) {
    for (const item of category.preguntas) {
      texts.push(`${item.pregunta} ${item.respuesta}`);
      docs.push({
        categoria: category.categoria,
        pregunta: item.pregunta,
        respuesta: item.respuesta,
        faqId: item.id,
      });
    }
  }

  return { texts, docs };
}

function loadDateSlots(): RawDateSlot[] {
  const filePath = resolve(process.cwd(), 'jsons/dates.json');
  return JSON.parse(readFileSync(filePath, 'utf-8')) as RawDateSlot[];
}

// ---------------------------------------------------------------------------
// Atlas Vector Search index helpers
// ---------------------------------------------------------------------------

const VECTOR_INDEX_DEFINITION = {
  fields: [
    {
      type: 'vector',
      path: 'embedding',
      numDimensions: 768,
      similarity: 'cosine',
    },
  ],
};

async function ensureVectorIndex(
  db: ReturnType<ReturnType<typeof mongoose.connection.getClient>['db']>,
  collectionName: string,
  indexName: string
): Promise<void> {
  const collection = db.collection(collectionName);

  // Check if index already exists
  const existing = await collection.listSearchIndexes().toArray();
  const alreadyExists = existing.some((idx: any) => idx.name === indexName);

  if (alreadyExists) {
    console.log(`  Index ${indexName} already exists — skipping creation`);
    return;
  }

  console.log(`  Creating vector search index: ${indexName} on ${collectionName}...`);
  await db.command({
    createSearchIndexes: collectionName,
    indexes: [
      {
        name: indexName,
        type: 'vectorSearch',
        definition: VECTOR_INDEX_DEFINITION,
      },
    ],
  });
  console.log(`  Index ${indexName} creation initiated`);
}

async function pollUntilReady(
  db: ReturnType<ReturnType<typeof mongoose.connection.getClient>['db']>,
  collectionName: string,
  indexName: string,
  timeoutMs = 180_000
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const indexes = await db.collection(collectionName).listSearchIndexes().toArray();
    const idx = indexes.find((i: any) => i.name === indexName);

    const status = idx?.status ?? 'UNKNOWN';
    console.log(`  Waiting for index ${indexName}... status: ${status}`);

    if (status === 'READY') {
      console.log(`  Index ${indexName} is READY`);
      return;
    }

    await new Promise(r => setTimeout(r, 5000));
  }

  throw new Error(`Timeout: index ${indexName} did not reach READY within ${timeoutMs / 1000}s`);
}

// ---------------------------------------------------------------------------
// Main seeding flow
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== Atom Seed Script ===\n');

  // 1. Connect to MongoDB
  console.log('Connecting to MongoDB...');
  await connectDB();
  console.log('Connected.\n');

  // 2. Load raw data
  console.log('Loading source JSON files...');
  const { raw: rawVehicles, docs: vehicleDocs } = loadVehicles();
  const { texts: faqTexts, docs: faqDocs } = loadFAQs();
  const dateDocs = loadDateSlots();
  console.log(`  Loaded: ${rawVehicles.length} vehicles, ${faqDocs.length} FAQs, ${dateDocs.length} date slots\n`);

  // 3. Generate embeddings (parallel)
  console.log('Generating embeddings for vehicles...');
  const vehicleTexts = rawVehicles.map(vehicleEmbedText);
  const vehicleEmbeddings = await embedBatch(vehicleTexts);

  console.log('\nGenerating embeddings for FAQs...');
  const faqEmbeddings = await embedBatch(faqTexts);
  console.log();

  // 4. Attach embeddings
  const vehicleDocsWithEmbeddings = vehicleDocs.map((doc, i) => ({
    ...doc,
    embedding: vehicleEmbeddings[i],
  }));

  const faqDocsWithEmbeddings = faqDocs.map((doc, i) => ({
    ...doc,
    embedding: faqEmbeddings[i],
  }));

  // 5. Drop & reseed
  console.log('Clearing existing data...');
  await Vehicle.deleteMany({});
  await FAQ.deleteMany({});
  await DateSlot.deleteMany({});
  console.log('  Collections cleared.\n');

  console.log('Inserting data...');
  await Vehicle.insertMany(vehicleDocsWithEmbeddings);
  await FAQ.insertMany(faqDocsWithEmbeddings);
  await DateSlot.insertMany(dateDocs);
  console.log(`Seeded: ${rawVehicles.length} vehicles, ${faqDocs.length} FAQs, ${dateDocs.length} date slots\n`);

  // 6. Atlas Vector Search indexes
  const vehicleColl = Vehicle.collection.name;
  const faqColl = FAQ.collection.name;
  console.log(`  Collection names: vehicles=${vehicleColl}, faqs=${faqColl}`);

  const dbName = process.env['MONGODB_DB_NAME'] ?? 'atom_knowledge';
  const db = mongoose.connection.getClient().db(dbName);

  console.log('Setting up Atlas Vector Search indexes...');
  await ensureVectorIndex(db, vehicleColl, 'vehicles_vector_index');
  await ensureVectorIndex(db, faqColl, 'faqs_vector_index');
  console.log();

  console.log('Polling until indexes are READY (timeout: 3 min)...');
  await Promise.all([
    pollUntilReady(db, vehicleColl, 'vehicles_vector_index'),
    pollUntilReady(db, faqColl, 'faqs_vector_index'),
  ]);
  console.log('\nAll vector search indexes are READY.\n');

  // 7. Cleanup
  await mongoose.disconnect();
  console.log('=== Seed complete ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
