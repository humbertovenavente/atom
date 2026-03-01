---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-01T18:20:47.093Z"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 4
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** El editor visual muestra nodos iluminandose en tiempo real mientras el usuario chatea — eso es lo que gana la demo.
**Current focus:** Phase 2 - Flow Editor

## Current Position

Phase: 3 of 4 (Data & Backend — gap closure complete)
Plan: 4 of 4 in current phase (03-04 complete — PHASE COMPLETE)
Status: Complete
Last activity: 2026-03-01 — Plan 03-04 complete (seed.ts English field names, faq_vector_index, GET /api/faq)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 4 min
- Total execution time: 0.20 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-setup | 3 | 11 min | 4 min |

**Recent Trend:**
- Last 5 plans: 10 min, 1 min
- Trend: decreasing (simple tasks)

*Updated after each plan completion*
| Phase 02-flow-editor P01 | 5min | 2 tasks | 10 files |
| Phase 02-flow-editor P02 | 2 | 2 tasks | 6 files |
| Phase 02-flow-editor P03 | 15min | 2 tasks | 6 files |
| Phase 03-data-backend P01 | 2min | 2 tasks | 5 files |
| Phase 03-data-backend P02 | 1min | 2 tasks | 5 files |
| Phase 04-chat-sse-integration P01 | 2 | 2 tasks | 4 files |
| Phase 04 P02 | 5min | 2 tasks | 2 files |
| Phase 03-data-backend P03 | 2 | 2 tasks | 10 files |
| Phase 03-data-backend P04 | 10min | 3 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-Phase 1]: Use @foblex/flow (not @xyflow/angular which does not exist as an npm package). Install via `ng add @foblex/flow`.
- [Pre-Phase 1]: Disable SSR in vite.config.ts on day one to avoid `window is not defined` errors on the canvas.
- [Pre-Phase 1]: SSE event contract with Persona B (backend) must be `{"type":"node_active","nodeId":"..."}` — implement mock in Phase 1 against this shape so Phase 3 is unblocked.
- [01-01]: @foblex/flow 18.1.2 installed via ng add — Angular 21 compatible, no fallback to ngx-vflow needed.
- [01-01]: Scaffold uses @tailwindcss/vite plugin (Vite-native); .postcssrc.json also added for PostCSS compatibility.
- [01-01]: Removed provideClientHydration from app.config.ts — incompatible with SSR disabled.
- [01-01]: NODE_TYPE_CONFIGS uses text icon names instead of emoji to avoid encoding issues.
- [01-02]: fNodePosition uses signal input binding ([fNodePosition]="nodeAPosition") — component properties, not template literals.
- [01-02]: Sidebar uses emoji lookup map (icon name -> emoji) since NODE_TYPE_CONFIGS stores text icon names.
- [01-02]: Demo node styles placed in global styles.css (not ViewEncapsulation.None) for reliable foblex integration.
- [01-03]: specialist-1 nodeId kept in SSE mock (not specialist-vehicles) — simpler demo ID; Phase 2/3 will align node IDs when FlowService manages the mapping.
- [01-03]: setTimeout chain (not setInterval) used for SSE timing — allows per-event delay variation.
- [Phase 02-flow-editor]: @foblex/flow installed via npm install — importable via FFlowModule
- [Phase 02-flow-editor]: FlowService uses Angular Signals as single source of truth — nodes, edges, activeNodeId, selectedNodeId signals
- [Phase 02-flow-editor]: GET /api/flow returns 8-node pipeline covering all 6 node types — ready for canvas rendering
- [Phase 02-flow-editor]: fNodeOutput/fNodeInput are child div elements (not attributes on fNode) — ports positioned absolute at -7px edges
- [Phase 02-flow-editor]: fMoveNodes event on fDraggable syncs dragged node positions back to FlowService.updateNodePosition() — single source of truth maintained
- [02-03]: fZoom directive (on f-canvas) is the correct @foblex/flow zoom API — not FFlowComponent methods
- [02-03]: f-minimap is a built-in @foblex/flow component confirmed via d.ts — no fallback needed
- [02-03]: @angular/cdk required as explicit dep — @foblex/flow peer dep not auto-installed by npm
- [02-03]: Sidebar drag uses DataTransfer MIME key 'application/node-type'; canvas drop reads it and calls FlowService.addNode()
- [03-01]: text-embedding-3-small chosen (1536 dims, cosine similarity) — lower cost, sufficient quality for 150-doc hackathon dataset
- [03-01]: Drop-and-reseed strategy (deleteMany + insertMany) chosen over upsert for hackathon simplicity
- [03-01]: DateSlot has NO embedding field — date range queries only (LOCKED DECISION)
- [03-01]: jsons/ is the authoritative data source (NOT src/server/data/)
- [03-02]: No separate Session model — Conversation model reused for session management (locked decision confirmed)
- [03-02]: No /api/search HTTP endpoint — vector search is internal-only for Phase 4 chat specialists
- [03-02]: Lazy OpenAI client using LLM_API_KEY (not OPENAI_API_KEY) for VectorSearchService
- [03-02]: GET /api/dates filters to future dates only (gte today) for demo relevance
- [Phase 04-chat-sse-integration]: Use raw fetch() not Angular HttpClient — HttpClient does not expose ReadableStream body needed for SSE
- [Phase 04-chat-sse-integration]: eventsource-parser v3 requires createParser({onEvent}) object syntax — function syntax throws TypeError
- [Phase 04-chat-sse-integration]: style.color on node div drives currentColor in node--active box-shadow for per-node identity glow
- [04-02]: NgClass for conditional bubble styling; afterNextRender for SSR-safe session restore; AGENT_BADGE_MAP at module level; typing indicator via content condition not extra signal
- [Phase 03-data-backend]: English field names in Mongoose models match Atlas documents (brand, model, year, price; category, question, answer, originalId)
- [Phase 03-data-backend]: VectorSearchService uses LLM_API_KEY, faq_vector_index, default limit 3, and .find() fallback for empty aggregate results
- [Phase 03-data-backend]: Session GET returns empty object for unknown sessionId — not 404
- [Phase 03-data-backend]: Static data directory deleted; jsons/ at project root remains as authoritative seed source
- [03-04]: seed.ts uses LLM_API_KEY (not GEMINI_API_KEY) — single canonical env var for all LLM/embedding operations
- [03-04]: faq_vector_index is the canonical Atlas index name — seed and VectorSearchService now consistent
- [03-04]: GET /api/faq follows vehicles.get.ts pattern — no filtering, embedding: 0 projection, lean()

### Pending Todos

None.

### Blockers/Concerns

- SSE contract with Persona B not yet confirmed. Mock backend implements assumed shape `{"type":"node_active","nodeId":"..."}`. Verify with Persona B before Phase 3 starts.
- @foblex/flow Angular 21 compatibility RESOLVED — ng add worked without issues.

## Session Continuity

Last session: 2026-03-01
Stopped at: Completed 03-04-PLAN.md (seed.ts gap closure + GET /api/faq — Phase 3 fully complete)
Resume file: None
