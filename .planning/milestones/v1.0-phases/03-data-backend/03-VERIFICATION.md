---
phase: 03-data-backend
verified: 2026-03-01T16:00:00Z
status: human_needed
score: 9/9 automated must-haves verified
re_verification: false
human_verification:
  - test: "Run npm run seed with valid LLM_API_KEY and MONGODB_URI in .env"
    expected: "Console prints 'Seeded: 100 vehicles, 50 FAQs, 31 date slots' and both indexes reach READY status within 3 minutes"
    why_human: "Cannot execute against live MongoDB Atlas and OpenAI API in static verification; script structure is fully verified but live execution requires external services"
  - test: "Start dev server with npm run dev, then curl http://localhost:5173/api/vehicles"
    expected: "Returns JSON array of ~100 vehicle objects, none having an 'embedding' field"
    why_human: "API route code is correct but live DB connection + seeded data cannot be verified statically"
  - test: "curl http://localhost:5173/api/dates"
    expected: "Returns only date slots with fecha >= today (2026-03-01), not all 31"
    why_human: "Future-date filter logic is correct in code; actual MongoDB data presence requires live verification"
  - test: "curl -X POST http://localhost:5173/api/sessions (then curl the returned sessionId)"
    expected: "POST returns { sessionId: '<uuid>' }; subsequent GET /api/sessions/<id> returns that session with empty messages array; GET /api/sessions/nonexistent-id returns 404"
    why_human: "Session CRUD flow requires live MongoDB and a running server"
  - test: "Verify a semantic search query via vectorSearchService works after seeding"
    expected: "Calling searchVehicles('auto economico automatico') returns relevant vehicle documents with a score field and no embedding field"
    why_human: "VectorSearchService.$vectorSearch requires Atlas Vector Search indexes in READY status — only verifiable after seeding"
---

# Phase 3: Data & Backend — Verification Report

**Phase Goal:** Los datos de jsons/ están cargados en MongoDB Atlas con vector embeddings para búsqueda semántica, las API routes sirven datos reales desde la DB, y hay un sistema básico de users/sessions
**Verified:** 2026-03-01T16:00:00Z
**Status:** HUMAN_NEEDED — all automated code checks pass; live MongoDB Atlas and OpenAI execution cannot be verified statically
**Re-verification:** No — initial verification

---

## Requirements Coverage Note

**CRITICAL FINDING: DATA-01 through DATA-05 are NOT defined in REQUIREMENTS.md.**

The PLAN frontmatter declares `requirements: [DATA-01, DATA-02]` (03-01-PLAN.md) and `requirements: [DATA-03, DATA-04, DATA-05]` (03-02-PLAN.md), but `.planning/REQUIREMENTS.md` contains zero DATA-* identifiers. The last line of REQUIREMENTS.md reads:

> `*Last updated: 2026-03-01 — reverted DATA reqs (Persona B scope), MongoDB stays as shared infra*`

This confirms DATA-01..DATA-05 were **intentionally removed from REQUIREMENTS.md** because this subsystem belongs to Persona B scope. The ROADMAP.md still lists them under Phase 3 success criteria but they are not tracked in the canonical REQUIREMENTS.md. This is not a code gap — it is a planning artifact mismatch that has no remediation required in code. The phase goal is still verifiable through the ROADMAP.md success criteria.

**Cross-reference result:** DATA-01 through DATA-05 are ORPHANED from REQUIREMENTS.md (Persona B scope, intentionally excluded). No requirements coverage table can be produced for this phase.

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Los 3 JSONs (autos, dates, FAQ) están cargados como documentos en MongoDB Atlas con embeddings vectoriales | ? HUMAN NEEDED | seed.ts reads jsons/autos.json, jsons/faq.json, jsons/dates.json; generates embeddings via embedBatch(); does Vehicle.insertMany + FAQ.insertMany + DateSlot.insertMany. Structure verified; live execution requires external services. |
| 2 | Atlas Vector Search index está creado y funcional (una query semántica devuelve resultados relevantes) | ? HUMAN NEEDED | seed.ts calls createSearchIndexes for vehicles_vector_index and faqs_vector_index; polls listSearchIndexes until status === 'READY'. vectorSearchService.$vectorSearch aggregation is correctly wired. Live verification requires Atlas. |
| 3 | GET /api/vehicles devuelve autos desde MongoDB (no desde archivo estático) | ✓ VERIFIED | vehicles.get.ts uses Vehicle.find({}, { embedding: 0 }).lean() — real MongoDB query, not loader.ts static data |
| 4 | GET /api/dates devuelve slots disponibles desde MongoDB | ✓ VERIFIED | dates.get.ts uses DateSlot.find({ fecha: { $gte: today } }, { _id: 0 }).lean() — real MongoDB query with future-date filter |
| 5 | POST /api/sessions crea una sesión nueva y GET /api/sessions/:id la recupera con su historial | ✓ VERIFIED | sessions.post.ts creates via Conversation.create with uuidv4; [id].get.ts uses Conversation.findOne with strict 404 via createError |

**Automated Score:** 3/5 truths fully verified in code; 2/5 require live external service execution (Atlas + OpenAI)

---

## Required Artifacts

### Plan 03-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/server/models/vehicle.ts` | Mongoose Vehicle model with embedding field | ✓ VERIFIED | 16 camelCase fields + embedding: [Number] required; safe hot-reload registration pattern; exports Vehicle |
| `src/server/models/faq.ts` | Mongoose FAQ model with embedding field | ✓ VERIFIED | categoria, pregunta, respuesta, faqId + embedding: [Number] required; exports FAQ |
| `src/server/models/date-slot.ts` | Mongoose DateSlot model WITHOUT embedding | ✓ VERIFIED | fecha, slots fields only; no embedding field (locked decision honored); exports DateSlot |
| `scripts/seed.ts` | Seed script: embedBatch + drop-reseed + vector index creation + polling | ✓ VERIFIED | All 12 required patterns present: embedBatch, gemini-embedding-001, Vehicle.insertMany, FAQ.insertMany, DateSlot.insertMany, createSearchIndexes, listSearchIndexes, READY, LLM_API_KEY, jsons/autos.json, jsons/faq.json, jsons/dates.json |

### Plan 03-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/server/routes/api/vehicles.get.ts` | GET /api/vehicles endpoint | ✓ VERIFIED | defineEventHandler + connectDB + Vehicle.find with embedding:0 projection |
| `src/server/routes/api/dates.get.ts` | GET /api/dates endpoint | ✓ VERIFIED | defineEventHandler + connectDB + DateSlot.find with future-date filter |
| `src/server/routes/api/sessions.post.ts` | POST /api/sessions endpoint | ✓ VERIFIED | defineEventHandler + connectDB + uuidv4 + Conversation.create, returns { sessionId } |
| `src/server/routes/api/sessions/[id].get.ts` | GET /api/sessions/:id endpoint | ✓ VERIFIED | defineEventHandler + connectDB + Conversation.findOne + createError 404 |
| `src/server/services/vector-search.service.ts` | VectorSearchService with semantic search | ✓ VERIFIED | vectorSearchService exported; searchVehicles and searchFAQs use $vectorSearch; lazy OpenAI client via getOpenAI(); embedding:0 projected out; vectorSearchScore included |

---

## Key Link Verification

### Plan 03-01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| scripts/seed.ts | jsons/autos.json, jsons/faq.json, jsons/dates.json | fs.readFileSync | ✓ WIRED | readFileSync('jsons/autos.json'), readFileSync('jsons/faq.json'), readFileSync('jsons/dates.json') — all three present; NOT reading from src/server/data/ |
| scripts/seed.ts | src/server/models/vehicle.ts | Vehicle.insertMany | ✓ WIRED | `await Vehicle.insertMany(vehicleDocsWithEmbeddings)` on line 288 |
| scripts/seed.ts | @google/genai | GoogleGenAI.models.embedContent | ✓ WIRED | `genai.models.embedContent({ model: 'gemini-embedding-001', contents: batch })` in embedBatch() |
| scripts/seed.ts | MongoDB Atlas | createSearchIndexes | ✓ WIRED | `db.command({ createSearchIndexes: collectionName, indexes: [...] })` in ensureVectorIndex(); polls listSearchIndexes until READY |

### Plan 03-02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| vehicles.get.ts | src/server/models/vehicle.ts | Vehicle.find | ✓ WIRED | `Vehicle.find({}, { embedding: 0 }).lean()` — real DB query |
| dates.get.ts | src/server/models/date-slot.ts | DateSlot.find | ✓ WIRED | `DateSlot.find({ fecha: { $gte: today } }, { _id: 0 }).lean()` |
| sessions.post.ts | src/server/models/conversation.ts | Conversation.create | ✓ WIRED | `Conversation.create({ sessionId, messages: [], validationData: {}, currentIntent: null })` |
| sessions/[id].get.ts | src/server/models/conversation.ts | Conversation.findOne | ✓ WIRED | `Conversation.findOne({ sessionId: id }).lean()` with 404 via createError |
| vector-search.service.ts | vehicle.ts, faq.ts | $vectorSearch aggregation | ✓ WIRED | `Vehicle.aggregate([{ $vectorSearch: { index: 'vehicles_vector_index', ... } }])` and `FAQ.aggregate([{ $vectorSearch: { index: 'faqs_vector_index', ... } }])` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status |
|-------------|-------------|-------------|--------|
| DATA-01 | 03-01-PLAN.md | (Not in REQUIREMENTS.md) | ORPHANED — Persona B scope, intentionally excluded from REQUIREMENTS.md |
| DATA-02 | 03-01-PLAN.md | (Not in REQUIREMENTS.md) | ORPHANED — Persona B scope, intentionally excluded from REQUIREMENTS.md |
| DATA-03 | 03-02-PLAN.md | (Not in REQUIREMENTS.md) | ORPHANED — Persona B scope, intentionally excluded from REQUIREMENTS.md |
| DATA-04 | 03-02-PLAN.md | (Not in REQUIREMENTS.md) | ORPHANED — Persona B scope, intentionally excluded from REQUIREMENTS.md |
| DATA-05 | 03-02-PLAN.md | (Not in REQUIREMENTS.md) | ORPHANED — Persona B scope, intentionally excluded from REQUIREMENTS.md |

**Note:** REQUIREMENTS.md explicitly states these were reverted from Persona B scope. The ROADMAP.md still references them under Phase 3, but this is a documentation inconsistency — not a code gap. No code remediation is needed.

---

## Anti-Patterns Found

No anti-patterns detected across all 9 phase files.

| File | Pattern | Severity | Result |
|------|---------|----------|--------|
| All 9 files | TODO/FIXME/HACK/placeholder | Checked | None found |
| Route files (4) | return null / empty stubs | Checked | None found |
| seed.ts | console.log-only implementations | Checked | Logs are legitimate progress output, not stub behavior |
| date-slot.ts | embedding field present | Checked | Correctly absent — locked decision honored |

---

## Additional Verified Constraints

- **Embedding exclusion:** `{ embedding: 0 }` projection in vehicles.get.ts confirmed. Both VectorSearchService methods project `embedding: 0` as well.
- **No static data fallback:** vehicles.get.ts, dates.get.ts, sessions routes do NOT import from loader.ts or src/server/data/.
- **loader.ts is unchanged:** src/server/data/loader.ts still imports from static JSON files — backward compat with chat.post.ts maintained.
- **LLM_API_KEY (not OPENAI_API_KEY):** Both seed.ts and vector-search.service.ts use `process.env['LLM_API_KEY']` — correct per project convention.
- **LLM_BASE_URL proxy support:** Both files honor optional LLM_BASE_URL in OpenAI client constructor.
- **Model registration pattern:** All three models use `mongoose.models['Name'] || mongoose.model('Name', schema)` — hot-reload safe per existing convention.
- **npm run seed script:** package.json contains `"seed": "npx tsx scripts/seed.ts"` — confirmed.
- **openai@6.25.0 and tsx@4.21.0:** Both installed in package.json — confirmed.
- **Commit hashes verified:** 5705990, 6b73dd2, 2f08e3a, 0344da4 all exist in git history.

---

## Human Verification Required

### 1. Seed execution against live Atlas + OpenAI

**Test:** With LLM_API_KEY and MONGODB_URI set in .env, run `npm run seed` from the project root.
**Expected:** Console outputs:
- "Seeded: 100 vehicles, 50 FAQs, 31 date slots"
- "Index vehicles_vector_index is READY"
- "Index faqs_vector_index is READY"
- "=== Seed complete ==="
**Why human:** Requires live MongoDB Atlas cluster and valid OpenAI API key. Static analysis cannot execute the script.

### 2. GET /api/vehicles returns real MongoDB data without embeddings

**Test:** After seeding, `curl http://localhost:5173/api/vehicles`
**Expected:** JSON array of ~100 vehicle objects; no object contains an `embedding` field; fields match Vehicle schema (marca, modelo, año, etc.).
**Why human:** Requires live database with seeded data and a running Nitro dev server.

### 3. GET /api/dates returns future-only slots

**Test:** `curl http://localhost:5173/api/dates`
**Expected:** Only date slots where fecha >= 2026-03-01 are returned (not all 31 from the JSON if some are past).
**Why human:** Requires seeded DateSlot collection and running server.

### 4. POST /api/sessions + GET /api/sessions/:id round-trip

**Test:** `curl -X POST http://localhost:5173/api/sessions` (note the sessionId), then `curl http://localhost:5173/api/sessions/<that-id>`, then `curl http://localhost:5173/api/sessions/nonexistent-id`.
**Expected:** POST returns `{ "sessionId": "<uuid>" }`; GET with valid ID returns `{ sessionId, messages: [], ... }`; GET with invalid ID returns HTTP 404.
**Why human:** Requires live MongoDB Atlas connection and running server.

### 5. VectorSearchService semantic search returns relevant results

**Test:** After seeding and confirming indexes are READY, import vectorSearchService in a test script and call `searchVehicles('SUV automatico gasolina')`.
**Expected:** Returns an array of Vehicle documents (no embedding field) each with a `score` field, ranked by semantic relevance.
**Why human:** Requires Atlas Vector Search indexes in READY status and live OpenAI API for query embedding.

---

## Gaps Summary

No code gaps found. All 9 artifacts exist, are substantive (not stubs), and are correctly wired to their dependencies. The two unverified success criteria (seed execution, vector search functionality) are HUMAN_NEEDED items requiring live external service execution — they cannot be classified as gaps because the code correctly implements the full logic.

The DATA-01..DATA-05 orphaned requirements are a planning documentation issue (ROADMAP.md still references them; REQUIREMENTS.md explicitly removed them). This does not represent a code gap and requires no remediation.

---

_Verified: 2026-03-01T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
