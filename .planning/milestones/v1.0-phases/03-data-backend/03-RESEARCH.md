# Phase 3: Data & Backend - Research

**Researched:** 2026-03-01
**Domain:** MongoDB Atlas Vector Search, OpenAI Embeddings, Nitro/h3 API Routes, Mongoose
**Confidence:** HIGH (core stack verified via official docs and community sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Embedding strategy:** Use OpenAI embeddings via existing LLM_API_KEY in .env; pre-computed at seed time, stored with documents
- **Embedding metric:** Atlas Vector Search index with cosine similarity
- **Dates collection:** Does NOT get embeddings — queried by date range only
- **Session model:** Anonymous sessions only — no User model needed
- **Seed command:** Single `npm run seed` handles everything (data + embeddings + index)
- **Index creation:** Seed script creates the Atlas Vector Search index programmatically (via createSearchIndex())
- **Data source:** jsons/ is the authority — jsons/autos.json (100 vehicles), jsons/faq.json (50 Q&As in 6 categories), jsons/dates.json (31 days of slots)
- **Existing code to extend:** Conversation model (src/server/models/conversation.ts) with 7-day TTL — extend rather than replace; memoryService pattern to follow
- **Mongoose:** Not native MongoDB driver — all DB operations via Mongoose
- **h3/Nitro:** defineEventHandler for all API routes; file-based routing in src/server/routes/api/

### Claude's Discretion

- **Embedding model:** Pick text-embedding-3-small vs large based on cost and dataset size
- **Fields to embed for autos:** Determine optimal field combination based on data structure and likely chat specialist queries
- **Fields to embed for FAQ:** Determine optimal field combination
- **Seed approach:** Drop & reseed vs upsert (considering hackathon constraints)
- **GET /api/vehicles:** Decide response shape based on dataset size (~100 vehicles) and downstream usage
- **GET /api/dates:** Decide raw vs formatted response based on what chat specialists need
- **VectorSearchService boundary:** Build now for Phase 4 to consume, or defer
- **Standalone /api/search endpoint:** Does it add demo value or stay internal-only?
- **loader.ts migration:** Update to query MongoDB directly, or keep static fallback and add new DB-backed routes alongside
- **Session lifecycle:** TTL-only vs explicit status field, considering Phase 5 "Nueva Conversacion" button
- **POST /api/sessions:** Response shape at discretion
- **GET /api/sessions/:id 404 behavior:** Auto-create empty vs strict 404

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Los 3 JSONs (autos, dates, FAQ) están cargados como documentos en MongoDB Atlas con embeddings vectoriales | Seed script pattern using OpenAI SDK + Mongoose insertMany; jsons/ are the source |
| DATA-02 | Atlas Vector Search index está creado y funcional (una query semántica devuelve resultados relevantes) | createSearchIndex() via Mongoose connection client; $vectorSearch aggregation pipeline |
| DATA-03 | GET /api/vehicles devuelve autos desde MongoDB (no desde archivo estático) | Mongoose Vehicle model + defineEventHandler route; replaces static loader |
| DATA-04 | GET /api/dates devuelve slots disponibles desde MongoDB | Mongoose DateSlot model + defineEventHandler route |
| DATA-05 | POST /api/sessions crea una sesión nueva y GET /api/sessions/:id la recupera con su historial | Extend existing Conversation model; uuid for sessionId; h3 routes |
</phase_requirements>

---

## Summary

Phase 3 is the backend data layer that turns static JSON files into a queryable MongoDB Atlas knowledge base with vector semantic search. The project already has Mongoose, MongoDB driver, and uuid installed — the only missing dependency is the `openai` npm package for embedding generation. The existing codebase already establishes all the patterns needed: `connectDB()` for pooled Mongoose connections, the Conversation schema for TTL-indexed document models, and `memoryService` for the service object pattern.

The core work is three-part: (1) a seed script that reads the authoritative jsons/ files, calls OpenAI's embeddings API to generate vectors for vehicle and FAQ documents, and loads everything into MongoDB Atlas; (2) three new Mongoose models (Vehicle, FAQ, DateSlot) plus three API routes replacing the static loader; (3) session endpoints reusing the existing Conversation model since it already satisfies the session requirements (sessionId, messages, TTL). The Vector Search index creation is done programmatically via `mongoose.connection.getClient().db().command({ createSearchIndexes: ... })`.

The biggest technical risk is Atlas Vector Search index creation timing — indexes are asynchronous on Atlas Free/Shared tiers and can take 30–120 seconds to reach READY status. The seed script must poll `listSearchIndexes()` before exiting. A secondary risk: the jsons/ data and src/server/data/ are completely different datasets (jsons/ has 100 real vehicles with Spanish field names; catalog.json has 25 fictional vehicles with English field names). The correct source is jsons/.

**Primary recommendation:** Install `openai` package, write a single seed script, create three Mongoose models following the Conversation schema pattern, add three API routes via defineEventHandler, and reuse the Conversation model for sessions — no new Session model needed.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mongoose | ^9.x (already installed) | MongoDB ODM for all models and queries | Established project pattern; Conversation model already uses it |
| openai | ^4.x (needs install) | Call embeddings API for vector generation at seed time | Official OpenAI Node.js SDK; only option for text-embedding-3-small |
| uuid | ^9.x (already installed) | Generate sessionId for new sessions | Already in package.json |
| mongodb | ^6.x (already installed) | Used via Mongoose; also needed for createSearchIndexes command | Required for Atlas admin commands |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| h3 (defineEventHandler) | bundled with Analog/Nitro | Define API route handlers | Every API route file |
| dotenv / process.env | Node built-in via Nitro | Access MONGODB_URI, LLM_API_KEY in seed script | Seed script runs outside Nitro, needs explicit env loading |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| openai SDK | Direct fetch() to OpenAI REST API | SDK handles retries, rate limits, TypeScript types — no reason to use raw fetch |
| Mongoose | Native MongoDB driver | Project already uses Mongoose; inconsistency not worth it |
| Atlas Vector Search | pgvector, Pinecone, Qdrant | MONGODB_URI already configured; Atlas is the locked choice |
| text-embedding-3-small | text-embedding-3-large | Large is 3072 dims (higher storage/query cost) vs small at 1536 dims; for 100 vehicles + 50 FAQs, small is the correct choice |

**Installation:**
```bash
npm install openai
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/server/
├── models/
│   ├── conversation.ts     # EXISTING — reuse as session model
│   ├── vehicle.ts          # NEW — Vehicle with embedding field
│   ├── faq.ts              # NEW — FAQ with embedding field
│   └── date-slot.ts        # NEW — DateSlot, no embedding
├── services/
│   ├── vector-search.service.ts   # NEW — semantic search helper for Phase 4
│   └── memory.service.ts          # EXISTING — unchanged
├── routes/api/
│   ├── vehicles.get.ts     # NEW — GET /api/vehicles
│   ├── dates.get.ts        # NEW — GET /api/dates
│   ├── sessions.post.ts    # NEW — POST /api/sessions
│   └── sessions/
│       └── [id].get.ts     # NEW — GET /api/sessions/:id
├── db/
│   └── connect.ts          # EXISTING — unchanged
└── data/
    └── loader.ts           # EXISTING — keep as static fallback

scripts/
└── seed.ts                 # NEW — standalone seed script
```

### Pattern 1: Mongoose Model with Embedding Field

**What:** Extend the established Conversation schema pattern to include a `number[]` embedding field.
**When to use:** Vehicle and FAQ models that need vector search.

```typescript
// src/server/models/vehicle.ts
// Source: Mongoose docs + Conversation model pattern in project
import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  marca: { type: String, required: true, index: true },
  modelo: { type: String, required: true },
  año: { type: Number, required: true },
  kilometraje: { type: Number },
  color: { type: String },
  descripcion: { type: String },
  segmento: { type: String, index: true },
  precio: { type: Number, index: true },
  estado: { type: String },
  ciudad: { type: String },
  combustible: { type: String },
  motor: { type: Number },
  transmision: { type: String },
  url: { type: String },
  cantidad: { type: Number, default: 1 },
  embedding: { type: [Number], required: true },  // 1536-dim vector
});

export const Vehicle =
  mongoose.models['Vehicle'] || mongoose.model('Vehicle', vehicleSchema);
```

```typescript
// src/server/models/faq.ts
import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
  categoria: { type: String, required: true, index: true },
  pregunta: { type: String, required: true },
  respuesta: { type: String, required: true },
  faqId: { type: Number, required: true },
  embedding: { type: [Number], required: true },  // 1536-dim vector
});

export const FAQ =
  mongoose.models['FAQ'] || mongoose.model('FAQ', faqSchema);
```

```typescript
// src/server/models/date-slot.ts
// No embedding — queried by date range only (LOCKED DECISION)
import mongoose from 'mongoose';

const dateSlotSchema = new mongoose.Schema({
  fecha: { type: String, required: true, index: true },  // "2026-03-01"
  slots: [{ type: String }],   // ISO datetime strings
});

export const DateSlot =
  mongoose.models['DateSlot'] || mongoose.model('DateSlot', dateSlotSchema);
```

### Pattern 2: Seed Script (Drop & Reseed)

**What:** Standalone TypeScript/Node.js script that clears collections, generates embeddings in batches, and inserts documents. Creates Atlas Vector Search index.
**When to use:** `npm run seed` one-time or to refresh data.

**Recommendation: Use drop & reseed** (not upsert). Rationale: hackathon context, small dataset (~100 + 50 docs), embeddings are deterministic for the same input. Upsert adds complexity with no benefit at this scale.

```typescript
// scripts/seed.ts
// Source: OpenAI Node.js SDK docs + MongoDB createSearchIndexes community forum
import 'dotenv/config';
import OpenAI from 'openai';
import mongoose from 'mongoose';
import { connectDB } from '../src/server/db/connect';

const openai = new OpenAI({ apiKey: process.env.LLM_API_KEY });

// Embed a single text string — returns 1536-dim number[]
async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return res.data[0].embedding;
}

// Embed in batches to respect rate limits (20 req/min on free tier)
async function embedBatch(texts: string[], batchSize = 20): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    });
    results.push(...res.data.map(d => d.embedding));
    if (i + batchSize < texts.length) await new Promise(r => setTimeout(r, 1000));
  }
  return results;
}
```

### Pattern 3: Atlas Vector Search Index Creation (Programmatic)

**What:** Use the MongoDB admin command `createSearchIndexes` via Mongoose's underlying client. This is the only way to create Atlas Vector Search indexes programmatically from Node.js.
**When to use:** At the end of the seed script, after inserting documents.

```typescript
// Source: MongoDB Community Forums (verified) — Mongoose createSearchIndexes command
async function createVectorIndex(collectionName: string, indexName: string): Promise<void> {
  const client = mongoose.connection.getClient();
  const dbName = process.env.MONGODB_DB_NAME!;

  // Check if index already exists
  const existing = await client.db(dbName)
    .collection(collectionName)
    .listSearchIndexes()
    .toArray();

  if (existing.some(idx => idx.name === indexName)) {
    console.log(`Index ${indexName} already exists — skipping`);
    return;
  }

  await client.db(dbName).command({
    createSearchIndexes: collectionName,
    indexes: [{
      name: indexName,
      type: 'vectorSearch',
      definition: {
        fields: [{
          type: 'vector',
          path: 'embedding',
          numDimensions: 1536,
          similarity: 'cosine',
        }],
      },
    }],
  });

  // Poll until READY (Atlas index creation is async, can take 30–120 seconds)
  const deadline = Date.now() + 180_000;  // 3 min timeout
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000));
    const indexes = await client.db(dbName)
      .collection(collectionName)
      .listSearchIndexes()
      .toArray();
    const target = indexes.find(idx => idx.name === indexName);
    if (target?.status === 'READY') {
      console.log(`Index ${indexName} is READY`);
      return;
    }
    console.log(`Waiting for index ${indexName}... status: ${target?.status}`);
  }
  throw new Error(`Index ${indexName} did not become READY within 3 minutes`);
}
```

### Pattern 4: $vectorSearch Aggregation Query

**What:** ANN (approximate nearest neighbor) search using the Atlas Vector Search index.
**When to use:** In VectorSearchService for Phase 4 specialists to call, or inside /api/search if exposed.

```typescript
// Source: MongoDB official docs — $vectorSearch aggregation stage
// https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/
async function semanticSearch(
  model: mongoose.Model<any>,
  indexName: string,
  queryVector: number[],
  limit = 5
) {
  return model.aggregate([
    {
      $vectorSearch: {
        index: indexName,
        path: 'embedding',
        queryVector,
        numCandidates: limit * 10,  // 10x limit for accuracy
        limit,
      },
    },
    {
      $project: {
        embedding: 0,               // Never return embedding in API responses
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]);
}
```

### Pattern 5: Nitro API Route Handler (project pattern)

**What:** File-based routing via defineEventHandler from h3.
**When to use:** All new API route files.

```typescript
// src/server/routes/api/vehicles.get.ts
import { defineEventHandler } from 'h3';
import { connectDB } from '../../db/connect';
import { Vehicle } from '../../models/vehicle';

export default defineEventHandler(async () => {
  await connectDB();
  const vehicles = await Vehicle.find({}, { embedding: 0 }).lean();
  return vehicles;
});
```

```typescript
// src/server/routes/api/sessions.post.ts
import { defineEventHandler, readBody } from 'h3';
import { v4 as uuidv4 } from 'uuid';
import { connectDB } from '../../db/connect';
import { Conversation } from '../../models/conversation';

export default defineEventHandler(async () => {
  await connectDB();
  const sessionId = uuidv4();
  await Conversation.create({
    sessionId,
    messages: [],
    validationData: {},
    currentIntent: null,
  });
  return { sessionId };
});
```

```typescript
// src/server/routes/api/sessions/[id].get.ts
import { defineEventHandler, getRouterParam, createError } from 'h3';
import { connectDB } from '../../../db/connect';
import { Conversation } from '../../../models/conversation';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  await connectDB();
  const session = await Conversation.findOne({ sessionId: id }, { embedding: 0 }).lean();
  if (!session) {
    throw createError({ statusCode: 404, message: 'Session not found' });
  }
  return session;
});
```

### Anti-Patterns to Avoid

- **Returning embedding vectors in API responses:** Always project `{ embedding: 0 }` in all queries. Embedding arrays are 1536 floats (~12KB per doc) — returning them bloats responses massively.
- **Using MongoDB native driver directly alongside Mongoose:** The project uses Mongoose exclusively. Use `mongoose.connection.getClient()` only for the `createSearchIndexes` admin command which Mongoose doesn't expose natively.
- **Creating Atlas Vector Search index via Atlas UI only:** Must be programmatic for reproducibility. But note: Atlas Vector Search indexes are only available on Atlas clusters (M0 Free tier included) — they are NOT available on local MongoDB.
- **Not waiting for index READY status:** Querying before READY returns 0 results with no error. Always poll.
- **Embedding dates data:** LOCKED DECISION — dates use date-range queries only, no vector search.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Embedding API calls | Custom fetch wrapper | `openai` npm SDK | Rate limit retries, TypeScript types, API key injection |
| Session ID generation | Custom UUID logic | `uuid` package (already installed) | Already in project, correct implementation |
| Vector similarity math | cosine similarity function | Atlas Vector Search `$vectorSearch` | Atlas handles ANN index, GPU-accelerated at scale |
| Index polling | Custom polling loop from scratch | `listSearchIndexes()` with setTimeout loop | Pattern documented above; straightforward |
| HTTP error responses | Custom error objects | `createError` from h3 | Already the Nitro/Analog pattern |

**Key insight:** The hard parts (vector indexing, similarity math, connection pooling) are fully handled by Atlas and the SDKs. The work is wiring, not algorithms.

---

## Common Pitfalls

### Pitfall 1: Atlas Vector Search Index Async Creation

**What goes wrong:** Seed script creates the index and immediately exits. Queries return 0 results for 30–120 seconds with no error.
**Why it happens:** Atlas Vector Search index builds asynchronously on Atlas infrastructure. `createSearchIndexes` returns immediately but the index is in PENDING → BUILDING → READY states.
**How to avoid:** Always poll `listSearchIndexes()` until `status === 'READY'` before the seed script exits. Use a 3-minute timeout. See Pattern 3 above.
**Warning signs:** `$vectorSearch` returns empty arrays even after seeding. Check index status in Atlas UI → Search Indexes tab.

### Pitfall 2: jsons/ vs src/server/data/ — Two Incompatible Datasets

**What goes wrong:** Using src/server/data/catalog.json (25 English-field fictional vehicles) instead of jsons/autos.json (100 Spanish-field real vehicles).
**Why it happens:** Both exist and catalog.json is what loader.ts currently imports. The jsons/ directory is the authoritative source per CONTEXT.md.
**How to avoid:** Seed script reads from `jsons/autos.json`, `jsons/faq.json`, `jsons/dates.json`. Keep src/server/data/ files unchanged (backward compat with chat.post.ts during transition).
**Warning signs:** Seed reports 25 vehicles instead of 100; Mongoose model field names won't match (brand vs Marca).

### Pitfall 3: LLM_API_KEY Not in .env

**What goes wrong:** Seed script crashes with "API key not provided" from OpenAI SDK.
**Why it happens:** The current .env file only has MONGODB_URI and MONGODB_DB_NAME. LLM_API_KEY is referenced in CONTEXT.md and types but not yet present in .env.
**How to avoid:** Add `LLM_API_KEY=<key>` and `LLM_BASE_URL=<url>` to .env before running the seed. The seed script should fail fast with a clear error if LLM_API_KEY is missing.
**Warning signs:** `Error: The OPENAI_API_KEY environment variable is missing or empty`.

### Pitfall 4: OpenAI Rate Limits During Seeding

**What goes wrong:** Seeding 100 vehicles + 50 FAQs in a single API call (150 texts) hits token or request rate limits.
**Why it happens:** Free-tier OpenAI has limits (e.g., 20 RPM, 150K TPM). 150 vehicle descriptions averaging ~100 tokens = ~15K tokens — safely within limits, but single-batch requests may timeout.
**How to avoid:** Use batch embedding (pass array of texts in one `embeddings.create` call, max 2048 inputs). Separate vehicles and FAQs into two calls. Add 1-second delay between batches as insurance.
**Warning signs:** `429 Too Many Requests` from OpenAI API.

### Pitfall 5: Mongoose Model Re-registration in Nitro Hot Reload

**What goes wrong:** `Cannot overwrite 'Vehicle' model once compiled` error in development.
**Why it happens:** Nitro hot-reloads server files; Mongoose model registry persists between reloads.
**How to avoid:** Use the pattern from the existing Conversation model: `mongoose.models['Vehicle'] || mongoose.model('Vehicle', vehicleSchema)`. This is already established in the codebase.
**Warning signs:** Error only in dev, not in production build.

### Pitfall 6: Nitro Dynamic Route File Naming

**What goes wrong:** `GET /api/sessions/:id` returns 404 because the file is named incorrectly.
**Why it happens:** Nitro file-based routing uses `[param]` syntax, not `:param`.
**How to avoid:** Use `src/server/routes/api/sessions/[id].get.ts` — the `[id]` bracket syntax maps to `:id` in the URL. Consistent with Nitro conventions.
**Warning signs:** Route works in tests but 404 in browser; confirm filename uses square brackets.

---

## Code Examples

Verified patterns from official sources:

### OpenAI Embeddings Create (batch)

```typescript
// Source: https://platform.openai.com/docs/api-reference/embeddings
// text-embedding-3-small: 1536 dims, $0.02/1M tokens
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.LLM_API_KEY });

const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: ['text one', 'text two', 'text three'],  // batch: array of strings
});
// response.data[i].embedding is number[] of length 1536
const vectors: number[][] = response.data.map(d => d.embedding);
```

### Fields to Embed — Recommendations (Claude's Discretion)

**Vehicles:** Concatenate the fields most relevant to chat specialist queries:
```
`${Marca} ${Modelo} ${Año} ${Segmento} ${Descripción} Precio: ${Precio} Transmisión: ${Transmisión} Combustible: ${Tipo_de_combustible}`
```
Rationale: Users ask "¿tienen SUVs automáticos baratos?" or "busco un Toyota usado" — all these fields drive semantic matching. Price and transmission are often filter criteria (use Atlas pre-filter or post-filter instead of relying on vector match alone).

**FAQ:** Concatenate question + answer:
```
`${pregunta} ${respuesta}`
```
Rationale: The question alone may not capture all semantic content (e.g., a question about "garantía" has more context in its answer). Combined embedding surfaces both intent and response content.

### $vectorSearch with Score

```typescript
// Source: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/
const results = await Vehicle.aggregate([
  {
    $vectorSearch: {
      index: 'vehicles_vector_index',
      path: 'embedding',
      queryVector: queryEmbedding,   // number[1536]
      numCandidates: 50,             // 10x of limit=5
      limit: 5,
    },
  },
  {
    $project: {
      embedding: 0,
      score: { $meta: 'vectorSearchScore' },
    },
  },
]);
```

### npm run seed Script Command

```json
// package.json scripts addition
{
  "scripts": {
    "seed": "npx tsx scripts/seed.ts"
  }
}
```

Note: `tsx` (TypeScript executor) runs .ts files directly without a build step. Check if it's already available or add as devDependency: `npm install -D tsx`.

### GET /api/dates Response Design

```typescript
// Recommended: return raw slots array from DB — let chat specialist format as needed
// jsons/dates.json is already { fecha: "2026-03-01", slots: ["2026-03-01T15:00:00Z", ...] }
// DateSlot model mirrors this structure exactly

export default defineEventHandler(async () => {
  await connectDB();
  // Filter to future dates only for demo relevance
  const today = new Date().toISOString().split('T')[0];
  const dates = await DateSlot.find({ fecha: { $gte: today } }, { _id: 0 }).lean();
  return dates;
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| knnBeta field type (legacy Atlas Search) | vectorSearch index type with `type: "vectorSearch"` in createSearchIndex | 2023-2024 | Old knnBeta docs are obsolete; must use `type: "vectorSearch"` |
| text-embedding-ada-002 | text-embedding-3-small / text-embedding-3-large | Jan 2024 | ada-002 is legacy; 3-small is 5x cheaper and better quality |
| $search with knnBeta | $vectorSearch aggregation stage | 2023 | Separate stage, not nested under $search |
| Atlas Data API (HTTP) for seeding | MongoDB Node.js driver / Mongoose | Ongoing | Driver is faster, has direct access; Atlas Data API has latency overhead |

**Deprecated/outdated:**
- `knnBeta` field type: replaced by `type: "vector"` in vectorSearch index definitions
- `text-embedding-ada-002`: still works but deprecated in favor of 3-series models
- `$search: { knnBeta: ... }`: replaced by standalone `$vectorSearch` stage

---

## Open Questions

1. **LLM_API_KEY availability**
   - What we know: .env has MONGODB_URI and MONGODB_DB_NAME but NO LLM_API_KEY yet
   - What's unclear: Whether the key routes to OpenAI directly or via a proxy (LLM_BASE_URL suggests possible proxy)
   - Recommendation: Add LLM_API_KEY and LLM_BASE_URL to .env before running seed. If using a proxy, set `baseURL: process.env.LLM_BASE_URL` in OpenAI client constructor.

2. **MONGODB_DB_NAME vs MONGODB_SESSIONS_DB_NAME — use one or two databases?**
   - What we know: .env defines both. CONTEXT.md says sessions use Conversation model which connects to MONGODB_URI (currently maps to atom_knowledge DB).
   - What's unclear: Whether sessions should go in atom_sessions DB (separate) or atom_knowledge DB (shared).
   - Recommendation: Keep sessions in the same DB (atom_knowledge / MONGODB_URI) for hackathon simplicity — connectDB() already handles this and the Conversation model is pre-configured. The separate MONGODB_SESSIONS_DB_NAME env var is unused in this phase.

3. **VectorSearchService — build now or defer?**
   - What we know: Phase 4 specialists will query vehicles and FAQs semantically. CONTEXT.md lists this as Claude's discretion.
   - What's unclear: How soon Phase 4 starts and whether having the service now accelerates it.
   - Recommendation: Build a thin `VectorSearchService` with two methods (`searchVehicles(query)`, `searchFAQs(query)`) as part of this phase. It's ~50 lines and Phase 4 imports it directly. No need for a standalone /api/search endpoint for the demo.

4. **tsx availability for seed script**
   - What we know: `tsx` is not in package.json devDependencies
   - What's unclear: Whether it's globally available on the system
   - Recommendation: Check `npx tsx --version`; if not cached, add `tsx` to devDependencies to guarantee it works.

---

## Sources

### Primary (HIGH confidence)
- MongoDB Community Forums — createSearchIndexes command with Mongoose: https://www.mongodb.com/community/forums/t/can-i-create-a-vectorsearch-index-with-createsearchindex-command/265546
- MongoDB Atlas Vector Search Stage docs: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/
- MongoDB Node.js Driver Vector Search: https://www.mongodb.com/docs/drivers/node/current/atlas-vector-search/
- OpenAI Embeddings API Reference: https://platform.openai.com/docs/api-reference/embeddings
- OpenAI Pricing (text-embedding-3-small = $0.02/1M tokens): https://platform.openai.com/docs/pricing

### Secondary (MEDIUM confidence)
- text-embedding-3-small vs large MTEB comparison (MTEB 62.3 vs 64.6): https://openai.com/index/new-embedding-models-and-api-updates/
- Atlas Vector Search index polling pattern (listSearchIndexes + status READY): https://www.mongodb.com/docs/atlas/atlas-vector-search/tutorials/vector-search-quick-start/
- Nitro file-based routing [param] syntax: https://nitro.build/guide/routing

### Tertiary (LOW confidence)
- General batch embedding strategy and rate limit handling — derived from OpenAI docs + standard practice, not a specific verified source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in project except `openai`; versions verified from package.json
- Architecture patterns: HIGH — createSearchIndex syntax verified from MongoDB Community source; $vectorSearch from official docs
- Pitfalls: HIGH for index timing (well-documented), MEDIUM for rate limits (standard knowledge)
- Data sources: HIGH — directly inspected jsons/ and src/server/data/ files, counted records

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (MongoDB Atlas and OpenAI APIs are stable; 30-day validity)
