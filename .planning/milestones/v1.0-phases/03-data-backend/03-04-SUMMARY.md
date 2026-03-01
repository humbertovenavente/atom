---
phase: 03-data-backend
plan: "04"
subsystem: database
tags: [mongodb, mongoose, atlas-vector-search, gemini, seed, api]

# Dependency graph
requires:
  - phase: 03-data-backend
    provides: Mongoose models with English field names (vehicle.ts, faq.ts) that seed.ts must match
  - phase: 03-data-backend
    provides: VectorSearchService querying faq_vector_index — index name seed must create
provides:
  - scripts/seed.ts corrected to insert English-field documents into vehicles and faqs collections
  - GET /api/faq route returning FAQ documents from MongoDB (embedding projected out)
  - faq_vector_index created in Atlas and READY (replaces misnamed faqs_vector_index)
  - Atlas vehicles and faqs collections repopulated with correctly-shaped English-field documents
affects: [04-chat-sse-integration, VectorSearchService]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Seed script maps raw Spanish JSON keys to English Mongoose schema field names at insertion time"
    - "API routes project out embedding field (embedding: 0) to avoid 12KB-per-doc payload overhead"
    - "LLM_API_KEY as the single canonical env var for all LLM/embedding operations (not GEMINI_API_KEY)"

key-files:
  created:
    - src/server/routes/api/faq.get.ts
  modified:
    - scripts/seed.ts

key-decisions:
  - "seed.ts uses LLM_API_KEY (not GEMINI_API_KEY) — consistent with VectorSearchService and all other LLM consumers"
  - "faq_vector_index is the canonical Atlas index name — matches VectorSearchService.searchFAQs() aggregate pipeline"
  - "GET /api/faq follows established vehicles.get.ts pattern exactly — no filtering, embedding projected out"

patterns-established:
  - "Route pattern: defineEventHandler + connectDB() + Model.find({}, { embedding: 0 }).lean()"

requirements-completed: [DATA-02, DATA-03, DATA-04]

# Metrics
duration: 10min
completed: 2026-03-01
---

# Phase 3 Plan 04: Gap Closure Summary

**Corrected seed.ts to insert English-field Atlas documents and fixed faq_vector_index name; added GET /api/faq route; re-seeded Atlas with 100 vehicles and 50 FAQs at correct field names**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-01T18:35:36Z
- **Completed:** 2026-03-01T18:46:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- Corrected four targeted bugs in scripts/seed.ts: `GEMINI_API_KEY` -> `LLM_API_KEY`, Spanish vehicle fields -> English (brand/model/year/price/...), Spanish FAQ fields -> English (category/question/answer/originalId), `faqs_vector_index` -> `faq_vector_index`
- Created `src/server/routes/api/faq.get.ts` satisfying DATA-04 — GET /api/faq returning all FAQs from MongoDB without embedding arrays
- Re-ran seed script: Atlas repopulated with 100 vehicles + 50 FAQs in English-field shape; `faq_vector_index` created and reached READY status (replaces misnamed `faqs_vector_index`)
- Human verified Atlas documents and index — approved with no issues

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix seed.ts — English field names, faq_vector_index, LLM_API_KEY** - `1320579` (fix)
2. **Task 2: Create GET /api/faq route** - `54f870d` (feat)
3. **Task 3: Verify Atlas data and API endpoints** - human-verify checkpoint, approved

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `scripts/seed.ts` - Four targeted corrections: env var, vehicle field mapping, FAQ field mapping, index name
- `src/server/routes/api/faq.get.ts` - New GET /api/faq route following established vehicles.get.ts pattern

## Decisions Made

- `LLM_API_KEY` confirmed as the single env var for all LLM/embedding operations — seed now consistent with VectorSearchService
- `faq_vector_index` is the canonical Atlas index name — seed now matches what VectorSearchService queries
- GET /api/faq follows vehicles.get.ts pattern exactly: no filtering, embedding projected out, lean() for performance

## Deviations from Plan

None - plan executed exactly as written. All four targeted changes in seed.ts were surgical edits with no restructuring. The faq.get.ts route was created verbatim from the plan-provided snippet.

## Issues Encountered

None. Seed re-run completed successfully on first attempt. The FAQ embedding batch 1 hit a rate limit (60s wait), which was handled by the existing retry logic. `faq_vector_index` reached READY status within the 3-minute poll window.

## User Setup Required

None - no new external service configuration required. Atlas credentials and LLM_API_KEY were already present in `.env`.

## Next Phase Readiness

- All Phase 3 verification gaps are closed: DATA-02, DATA-03, DATA-04 satisfied
- Atlas vehicles and faqs collections have English-field documents matching Mongoose schemas
- `faq_vector_index` is READY — VectorSearchService.searchFAQs() will use real vector search (no .find() fallback)
- GET /api/faq and GET /api/vehicles both return English-field documents
- Phase 3 is now fully complete — Phase 4 (Chat & SSE Integration) prerequisites are all met

---
*Phase: 03-data-backend*
*Completed: 2026-03-01*
