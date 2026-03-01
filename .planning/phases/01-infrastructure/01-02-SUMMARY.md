---
phase: 01-infrastructure
plan: 02
subsystem: database
tags: [mongodb, mongoose, mongodb-atlas, memory-service, json, sse, typescript, singleton]

# Dependency graph
requires:
  - phase: 01-infrastructure plan 01
    provides: Analog.js scaffolded with SSE endpoint, shared TypeScript types, project skeleton
provides:
  - MongoDB singleton connection with global cache (survives serverless warm invocations)
  - Conversation Mongoose model with sessionId unique index, messages array, validationData, currentIntent, timestamps, 7-day TTL
  - memoryService with load(sessionId) and save(sessionId, userMsg, assistantMsg, update?) abstraction
  - Static JSON data files loaded at module init: 10 FAQs (Spanish), 25 vehicles, 4 advisors with 5 days availability
  - chat.post.ts wired to real MongoDB pipeline with turn count proving multi-turn persistence
affects:
  - 01-infrastructure (Task 3 checkpoint — human must verify MongoDB end-to-end before Phase 2)
  - All subsequent phases use memoryService as the only interface to MongoDB conversation state
  - Phase 2 agents receive ConversationContext plain objects, never touch Mongoose directly

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MongoDB Singleton: global._mongooseConn pattern with readyState === 1 check — survives Vercel warm invocations"
    - "Mongoose Model Guard: mongoose.models['Conversation'] || mongoose.model() — prevents Cannot overwrite model on Nitro hot reload"
    - "Memory Service: single-responsibility abstraction (load/save only) — agents receive plain ConversationContext objects"
    - "Static Data Loader: module-level ES imports of JSON — loaded once at startup, zero per-request disk I/O"
    - "Turn Count: (messages.length / 2) + 1 — verifiable multi-turn persistence from curl alone"

key-files:
  created:
    - src/server/db/connect.ts
    - src/server/models/conversation.ts
    - src/server/memory/memory.service.ts
    - src/server/data/faqs.json
    - src/server/data/catalog.json
    - src/server/data/schedule.json
    - src/server/data/loader.ts
  modified:
    - src/server/routes/api/chat.post.ts

key-decisions:
  - "maxPoolSize: 3 required for Atlas M0 free tier — higher values exhaust the 5-connection limit immediately"
  - "bufferCommands: false on Mongoose connection — fail fast rather than queue commands during connection loss"
  - "memoryService is the ONLY code that touches MongoDB — agents/specialists receive plain ConversationContext objects"
  - "ES import of JSON at module level (not readFileSync per request) — zero per-request disk I/O per plan spec"
  - "Turn count = messages.length / 2 + 1 — each save() pushes 2 messages (user + assistant)"

patterns-established:
  - "Memory Abstraction Pattern: load(sessionId) returns ConversationContext, save(sessionId, ...) upserts — all MongoDB detail hidden from agents"
  - "JSON Data Pattern: import at module level in loader.ts, re-export with type inference — import once, use everywhere"
  - "Singleton Connection Pattern: global._mongooseConn + readyState check ensures single connection across serverless invocations"

requirements-completed: [INFRA-03, INFRA-04, MEM-01, MEM-02, MEM-04]

# Metrics
duration: 4min
completed: 2026-03-01
---

# Phase 1 Plan 02: Infrastructure Persistence Summary

**MongoDB singleton connection + Conversation model + memoryService (load/save) + 25-vehicle catalog + 10 Spanish FAQs loaded at startup, wired into chat.post.ts with turn-count multi-turn persistence proving end-to-end read/write**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-01T04:37:12Z
- **Completed:** 2026-03-01T04:40:50Z
- **Tasks:** 2 of 3 complete (Task 3 is checkpoint:human-verify)
- **Files modified:** 7 created, 1 modified

## Accomplishments
- MongoDB connection singleton using global._mongooseConn pattern — maxPoolSize:3 (Atlas M0 limit), bufferCommands:false, 5s serverSelectionTimeout
- Conversation schema: sessionId unique index, messages array (role/content/timestamp/agentType), validationData Mixed, currentIntent, automatic timestamps, 7-day TTL index on updatedAt, hot-reload guard
- memoryService abstraction: load() returns empty ConversationContext for new sessions, save() upserts with $push messages + $set intent/validationData
- 10 FAQ entries in Spanish, 25 vehicles (19 new + 6 used, Q88K-Q320K range, 5 brands), 4 advisors with 5 days availability loaded at module init
- chat.post.ts pipeline: load memory → simulate orchestrator → build response with turn# → save to MongoDB → emit done

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MongoDB connection, Conversation model, and Memory service** - `df24527` (feat)
2. **Task 2: Create static JSON data files, typed loader, and wire everything into chat.post.ts** - `ef71417` (feat)

**Plan metadata:** TBD (docs: complete plan — pending after checkpoint)

## Files Created/Modified
- `src/server/db/connect.ts` - MongoDB singleton with global._mongooseConn cache, maxPoolSize:3, bufferCommands:false, MONGODB_URI env check
- `src/server/models/conversation.ts` - Mongoose schema: sessionId unique, messages[], validationData Mixed, currentIntent, timestamps, 7-day TTL index, hot-reload guard
- `src/server/memory/memory.service.ts` - memoryService.load(sessionId) + save(sessionId, userMsg, assistantMsg, update?) with upsert pattern
- `src/server/data/faqs.json` - 10 FAQ entries in Spanish (horarios, ubicación, proceso compra, financiamiento, garantías, servicio, promociones, documentos, parte de pago, usados)
- `src/server/data/catalog.json` - 25 vehicles: Toyota, Honda, Hyundai, Kia, Mazda, Nissan, Ford; precio Q88K-Q320K; 6 usados certificados
- `src/server/data/schedule.json` - 4 asesores (Carlos Méndez, Ana García, Roberto López, María Hernández) con 5 días de disponibilidad, slots intencionalmente escasos
- `src/server/data/loader.ts` - Module-level ES imports of JSON files; fallback readFileSync pattern commented inline
- `src/server/routes/api/chat.post.ts` - Updated: memoryService.load() before orchestrator sim, turn# in mock response, memoryService.save() after, data loader imported for startup log

## Decisions Made
- Used `maxPoolSize: 3` (not the default 100) — Atlas M0 free tier allows only 5 total connections; 3 leaves headroom for Atlas internal use
- Used `bufferCommands: false` — fast failures are preferable to silent request queuing when MongoDB is unavailable
- `memoryService` is the ONLY gateway to MongoDB conversation state — agents will always receive plain `ConversationContext` objects, never Mongoose documents
- Module-level JSON imports in `loader.ts` — ES import at module init ensures data is loaded once when the server starts, not on each request
- Turn count formula: `Math.floor(memory.messages.length / 2) + 1` — each save() pushes exactly 2 messages (user + assistant), so turn number = half the array length + 1

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

**External service requires manual configuration before Task 3 checkpoint.**

MongoDB Atlas setup (if not already done):
1. Create free M0 cluster at MongoDB Atlas -> Build a Database -> M0 Free Tier
2. Create database user: MongoDB Atlas -> Database Access -> Add New Database User (readWrite permissions)
3. Allow network access: MongoDB Atlas -> Network Access -> Add IP Address -> Allow Access from Anywhere (0.0.0.0/0)
4. Get connection string: MongoDB Atlas -> Database -> Connect -> Drivers -> Connection string
5. Copy `.env.example` to `.env` and replace `MONGODB_URI` with your actual connection string

## Next Phase Readiness
- All Phase 1 code complete — pending human verification of MongoDB end-to-end at Task 3 checkpoint
- After checkpoint approval: all INFRA-01 through INFRA-05, MEM-01, MEM-02, MEM-04 requirements satisfied
- SSE on Vercel still unverified — remains a blocker for Phase 2 start (per STATE.md decision)

## Self-Check

All created files verified on disk:
- src/server/db/connect.ts - FOUND
- src/server/models/conversation.ts - FOUND
- src/server/memory/memory.service.ts - FOUND
- src/server/data/faqs.json - FOUND
- src/server/data/catalog.json - FOUND
- src/server/data/schedule.json - FOUND
- src/server/data/loader.ts - FOUND
- src/server/routes/api/chat.post.ts - FOUND (modified)

All task commits verified in git history:
- df24527 - Task 1
- ef71417 - Task 2

---
*Phase: 01-infrastructure*
*Completed: 2026-03-01*
