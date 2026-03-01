---
phase: 03-data-backend
plan: 01
subsystem: database
tags: [mongoose, mongodb, openai, embeddings, vector-search, seed]

# Dependency graph
requires:
  - phase: 02-flow-editor
    provides: Angular flow editor with FlowService — data layer now provides the backend these nodes will consume
provides:
  - Mongoose Vehicle model with 1536-dim embedding field (text-embedding-3-small)
  - Mongoose FAQ model with embedding field
  - Mongoose DateSlot model without embedding (date range queries only)
  - npm run seed command that populates all three collections and creates Atlas Vector Search indexes
affects: [04-chat-sse, 05-integration]

# Tech tracking
tech-stack:
  added: [openai@6.25.0, tsx@4.21.0]
  patterns:
    - mongoose.models['Name'] || mongoose.model('Name', schema) registration pattern for hot-reload safety
    - embedBatch() with 20-text chunks and 1-second inter-batch delay for OpenAI rate limiting
    - drop-and-reseed strategy (deleteMany + insertMany) for hackathon simplicity
    - createSearchIndexes + listSearchIndexes polling until READY for Atlas Vector Search

key-files:
  created:
    - src/server/models/vehicle.ts
    - src/server/models/faq.ts
    - src/server/models/date-slot.ts
    - scripts/seed.ts
  modified:
    - package.json

key-decisions:
  - "text-embedding-3-small chosen (1536 dims, cosine similarity) — lower cost, sufficient quality for demo dataset of 150 docs"
  - "Drop-and-reseed (deleteMany then insertMany) chosen over upsert for hackathon simplicity"
  - "DateSlot has NO embedding field — date range queries only (LOCKED)"
  - "LLM_BASE_URL honored in OpenAI client constructor for proxy support"
  - "jsons/ is the authoritative data source (NOT src/server/data/)"

patterns-established:
  - "Seed scripts live in scripts/ directory and use npx tsx for ESM TypeScript execution"
  - "OpenAI embeddings use LLM_API_KEY env var (not OPENAI_API_KEY) and honor LLM_BASE_URL"
  - "Atlas Vector Search index creation via db.command(createSearchIndexes) followed by listSearchIndexes polling"

requirements-completed: [DATA-01, DATA-02]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 3 Plan 01: Data Models and Seed Script Summary

**Three Mongoose models (Vehicle/FAQ/DateSlot) with OpenAI text-embedding-3-small embeddings, npm run seed command that loads 100 vehicles + 50 FAQs + 31 date slots and creates Atlas Vector Search indexes**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T15:17:22Z
- **Completed:** 2026-03-01T15:19:36Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Vehicle Mongoose model with 16 camelCase fields mapped from Spanish JSON names plus 1536-dim embedding array
- FAQ Mongoose model with categoria/pregunta/respuesta/faqId fields plus embedding array
- DateSlot Mongoose model with fecha/slots fields and NO embedding (locked decision)
- Comprehensive seed script that generates embeddings via OpenAI, does drop-and-reseed, and creates+polls Atlas Vector Search indexes until READY

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create Mongoose models** - `5705990` (feat)
2. **Task 2: Create seed script with embeddings and vector index creation** - `6b73dd2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/server/models/vehicle.ts` - Mongoose Vehicle model with all 16 fields + embedding array, safe hot-reload registration pattern
- `src/server/models/faq.ts` - Mongoose FAQ model with categoria/pregunta/respuesta/faqId + embedding, safe hot-reload registration pattern
- `src/server/models/date-slot.ts` - Mongoose DateSlot model with fecha/slots only, NO embedding field
- `scripts/seed.ts` - Full seed script: env setup, embedBatch(), data transform, drop+reseed, vector index create+poll
- `package.json` - Added openai dependency, tsx devDependency, and npm run seed script

## Decisions Made

- **Embedding model:** text-embedding-3-small (1536 dims) — lower cost than large, sufficient for 150-document hackathon dataset. Cosine similarity metric.
- **Seeding strategy:** Drop-and-reseed (deleteMany then insertMany) — no upsert complexity needed for hackathon.
- **Date range only:** DateSlot intentionally has no embedding field. Date queries are date-range based, not semantic.
- **Proxy support:** LLM_BASE_URL honored in OpenAI constructor so the seed script works with any OpenAI-compatible proxy.
- **Data source:** jsons/ exclusively (autos.json, faq.json, dates.json). src/server/data/ is a different dataset and was not touched.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The inline `npx tsx -e` verification from the plan spec had a `!` character that caused shell escaping issues, so the verification was run via `node --input-type=module` heredoc instead — same check, equivalent result.

## User Setup Required

**External services require manual configuration before running `npm run seed`:**

- **LLM_API_KEY** must be set in `.env` — this is your OpenAI API key (or proxy key if using LLM_BASE_URL)
- **MONGODB_URI** must be set in `.env` — your MongoDB Atlas connection string
- **MONGODB_DB_NAME** must be set in `.env` — default is `atom_knowledge`
- Optionally **LLM_BASE_URL** if using an OpenAI-compatible proxy

Run `npm run seed` after setting these — it will print progress and take 2-5 minutes to generate embeddings and wait for vector search indexes to reach READY status.

## Next Phase Readiness

- All three models ready for import by Phase 3 API routes (03-02 and 03-03)
- `npm run seed` is the single command to populate all data — run it once before starting the dev server
- Atlas Vector Search indexes will be created automatically by the seed script
- Phase 4 (Chat & SSE) can use Vehicle and FAQ collections with vector similarity queries via `$vectorSearch` aggregation pipeline

---
*Phase: 03-data-backend*
*Completed: 2026-03-01*
