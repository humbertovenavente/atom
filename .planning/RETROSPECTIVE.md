# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — AI Agent Builder Frontend (Hackathon MVP)

**Shipped:** 2026-03-01
**Phases:** 5 | **Plans:** 14 | **Commits:** 79

### What Was Built
- Full Analog.js scaffold with @foblex/flow editor, Tailwind v4, 3-panel responsive layout
- Flow editor with 6 custom node types, drag-drop from sidebar, animated edges, mini-map, zoom
- MongoDB Atlas backend with Mongoose models, Gemini embedding seed, VectorSearchService
- Real-time chat with SSE streaming, typing indicator, markdown rendering, node highlighting
- Node configuration panel, flow persistence to MongoDB, reset flow, new conversation

### What Worked
- Parallel phase execution (Phases 2 and 3 ran independently) saved time
- Mock backend in Phase 1 unblocked all downstream work without Persona B
- Angular Signals in FlowService provided clean reactive state without RxJS complexity
- Raw fetch() for SSE was the right call — HttpClient doesn't expose ReadableStream
- Gap closure plans (03-03, 03-04) caught schema/naming mismatches before integration

### What Was Inefficient
- Phase 3 required 4 plans (2 gap closures) due to field name mismatches between Mongoose models and Atlas documents
- Phase 5 was executed before Phase 4 (out of order), causing ROADMAP.md confusion
- Phase 6 directory was created but never added to ROADMAP.md — orphaned artifact
- Per-node config was built (CONF-01) but never wired to the chat backend — integration gap discovered only at audit
- REQUIREMENTS.md DATA-01..05 were added then reverted — planning churn

### Patterns Established
- `LLM_API_KEY` as single canonical env var for all LLM/embedding operations
- English field names in Mongoose models, Spanish content in data
- `node.data.config` for per-node configuration (embedded, not separate map)
- `GET /api/route?default=true` pattern for bypassing MongoDB to return hardcoded defaults
- Raw fetch() + eventsource-parser for SSE consumption in Angular services

### Key Lessons
1. Schema alignment between frontend types and database documents should be validated in Phase 1, not discovered as gaps in Phase 3
2. Per-node configuration needs an end-to-end plan from UI → service → backend — building the panel without wiring to the chat pipeline creates dead config
3. Session REST endpoints should return 404 for missing resources, not 200+empty — defensive clients depend on HTTP status codes
4. Phase execution order matters — executing Phase 5 before Phase 4 created confusion even though they were technically independent
5. Vector search index names should be defined once in DECISIONS.md and referenced everywhere — naming drift between docs and code is hard to catch

### Cost Observations
- Model mix: ~70% sonnet (research, verification, planning), ~30% opus (execution, integration check)
- Sessions: ~8 across 2 days
- Notable: 2,394 LOC in 79 commits over 2 days — high velocity for a greenfield hackathon project

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 79 | 5 | First milestone — established all patterns |

### Cumulative Quality

| Milestone | Tests | Coverage | Gap Closures |
|-----------|-------|----------|-------------|
| v1.0 | 0 | 0% | 2 (Phase 3) |

### Top Lessons (Verified Across Milestones)

1. (First milestone — lessons will be cross-validated in v1.1+)
