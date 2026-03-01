# Phase 3: Data & Backend - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Seed MongoDB Atlas with the 3 JSON datasets (autos, FAQs, dates) with vector embeddings for semantic search, create API routes serving real data from the DB, and build a basic anonymous sessions system. This phase provides the data layer that Phase 4 (Chat & SSE) will consume.

</domain>

<decisions>
## Implementation Decisions

### Embedding strategy
- Use OpenAI embeddings via the existing LLM_API_KEY in .env
- Embeddings generated at seed time (pre-computed and stored with documents)
- Dates collection does NOT get embeddings — queried by date range only
- Atlas Vector Search index with cosine similarity metric

### Claude's Discretion: Embedding model & fields
- Claude picks the best embedding model (text-embedding-3-small vs large) based on cost and dataset size
- Claude determines optimal field combinations to embed for autos and FAQ collections based on data structure and likely search queries from the chat specialists

### Data seeding
- Source of truth: Claude to compare jsons/ and src/server/data/ copies and pick the most complete/appropriate source
- Seed script approach: Claude's discretion — drop & reseed vs upsert, based on hackathon constraints
- Seed script should also create the Atlas Vector Search index programmatically (via createSearchIndex() or Atlas Admin API)
- Single command: `npm run seed` handles everything (data + embeddings + index)

### API response design
- GET /api/vehicles: Claude decides based on dataset size (~30 vehicles) and downstream usage
- GET /api/dates: Claude decides on raw vs formatted response based on what chat specialists need
- Vector search exposure: Claude determines if a standalone /api/search endpoint adds demo value or should be internal-only
- Vector search service: Claude determines the right boundary — build a VectorSearchService now for Phase 4 to consume, or defer

### Loader migration
- Claude decides whether to update loader.ts to query MongoDB directly, or keep static fallback and add new DB-backed routes alongside

### Session model
- Anonymous sessions — no User model needed for hackathon demo
- POST /api/sessions creates new session, response shape at Claude's discretion
- GET /api/sessions/:id returns conversation history; 404 handling at Claude's discretion (auto-create empty vs strict 404)
- Session lifecycle: Claude decides on TTL-only vs adding explicit status field, considering Phase 5 "Nueva Conversacion" button

</decisions>

<specifics>
## Specific Ideas

- The existing Conversation model (src/server/models/conversation.ts) already has sessionId, messages, validationData, currentIntent, and a 7-day TTL — extend rather than replace
- The memoryService (src/server/memory/memory.service.ts) has load/save patterns that should be reused or extended
- The chat.post.ts endpoint already imports faqsData, catalogData, scheduleData from the static loader — this needs to switch to DB queries at some point
- The 3 JSON data files map to 3 specialist agents in the flow: Especialista FAQs, Especialista Catalogo, Especialista Agenda

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/server/db/connect.ts`: Mongoose connection with pooling (maxPoolSize: 3) — reuse for all new models
- `src/server/models/conversation.ts`: Mongoose schema pattern with TTL index — follow same pattern for Vehicle, FAQ, Date models
- `src/server/memory/memory.service.ts`: Service pattern (load/save) — follow for new data services
- `src/server/data/loader.ts`: Currently loads static JSON via ES imports — migration target
- `src/shared/types.ts`: Full TypeScript type system — CatalogValidationData, ScheduleValidationData, FAQsValidationData already defined

### Established Patterns
- Mongoose (not native MongoDB driver) for all DB operations
- defineEventHandler from h3/Nitro for API routes
- Service objects with async methods (memoryService pattern)
- Environment variables: MONGODB_URI, MONGODB_DB_NAME, MONGODB_SESSIONS_DB_NAME already in .env
- File-based routing: src/server/routes/api/*.ts maps to /api/* endpoints

### Integration Points
- `src/server/routes/api/chat.post.ts` line 5: imports { faqsData, catalogData, scheduleData } — will need to switch to DB queries
- `src/server/routes/api/flow.get.ts`: returns hardcoded flow data — separate concern (Phase 5)
- `src/server/sse/emitter.ts`: SSE emitter for streaming — Phase 4 will use this with real agent data
- `.env`: LLM_API_KEY + LLM_BASE_URL already configured for OpenAI — reuse for embedding API calls

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-data-backend*
*Context gathered: 2026-03-01*
