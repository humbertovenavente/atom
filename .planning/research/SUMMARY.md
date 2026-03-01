# Project Research Summary

**Project:** Atom — Multi-agent AI chatbot backend (car dealership)
**Domain:** Multi-agent LLM backend with SSE streaming, Analog.js/Nitro, MongoDB, Gemini
**Researched:** 2026-02-28
**Confidence:** MEDIUM-HIGH

## Executive Summary

This project is a multi-agent AI chatbot backend for a car dealership hackathon. The backend must expose a POST /api/chat SSE endpoint that routes user messages through a sequential agent pipeline: an orchestrator classifies intent, a validator collects required fields conversationally, and a specialist generates a domain-specific answer by querying static JSON data. The entire pipeline emits typed SSE events (`agent_active`, `message_chunk`, `validation_update`, `done`, `error`) that a companion visual editor frontend consumes to highlight active nodes in real time. The stack is Analog.js/Nitro for the server runtime, LangChain.js with Gemini as the LLM, and MongoDB Atlas for conversation memory persistence.

The recommended build approach is a strict sequential pipeline with a shared `ConversationContext` object. Each agent is a pure TypeScript function — no cross-agent imports, no DB access inside agents — and all routing logic lives in a single `pipeline/run-pipeline.ts` module. This separation makes agents independently testable and maps directly to the frontend visual editor's node graph, which is an explicit scoring criterion. Intent continuity (preserving the active intent while a validator is collecting fields) is the single most critical correctness concern and must be baked into the orchestrator from the start, not retrofitted.

The most dangerous risks cluster around integration edges that behave differently in production than locally: SSE streaming silently buffering on Vercel, MongoDB connection exhaustion under concurrent serverless invocations, and Gemini's structured output returning degraded results when the wrong method is used. All three must be validated during Phase 1 — before any agent logic is written — because retrofitting them after a working pipeline is in place is expensive. A mandatory "prove the plumbing works on Vercel" gate at the end of Phase 1 de-risks the entire rest of the build.

---

## Key Findings

### Recommended Stack

The core stack is LangChain.js v1.2.x + @langchain/core v1.1.x + @langchain/google-genai v2.1.x + Gemini 2.5 Flash, backed by Mongoose v9 + MongoDB Atlas. Zod v3 (NOT v4) is required for structured output — a confirmed open GitHub bug (#8769) makes Zod v4 + Gemini + withStructuredOutput throw runtime schema errors. Gemini 2.0 Flash is deprecated and retires March 3, 2026; the model string must be `"gemini-2.5-flash"`. The SSE streaming layer uses h3's `createEventStream` (already bundled in Nitro via Analog.js) — no WebSocket, which is incompatible with Vercel serverless.

**Core technologies:**
- `langchain@^1.2.28` + `@langchain/core@^1.1.29`: LCEL chain orchestration, RunnableSequence, structured output — current stable, resolves Zod v4 type inference bug
- `@langchain/google-genai@^2.1.22`: ChatGoogleGenerativeAI wrapper for Gemini via AI Studio — use `method: "json_schema"` with withStructuredOutput to avoid tool-calling fallback degradation
- `@langchain/mongodb` (latest): MongoDBChatMessageHistory — the canonical package (not @langchain/community which is deprecated for MongoDB)
- `mongoose@^9.x` + `mongodb@^6.x`: ODM with schema validation; Mongoose 9 has 40% fewer manual TS type declarations; connection caching is mandatory for Vercel serverless
- `zod@^3.23.8`: Structured output schemas — hard pin to v3; do NOT upgrade
- `h3` (via Nitro): `createEventStream` for SSE — already available, no install needed
- `gemini-2.5-flash`: Model string to use — 2.0 deprecated, retires March 3, 2026

**What NOT to use:** `zod@^4.x`, `gemini-2.0-flash`, `@langchain/google` (JS migration incomplete), `@langchain/community` for MongoDB, `RunnableBranch` (legacy), `AgentExecutor` (deprecated), WebSocket, RAG/vector DB.

### Expected Features

The feature set is fully defined. Every feature in the P1 list is a hard dependency for the hackathon demo — the frontend and the scoring rubric (Architecture 35pts, Use Cases 25pts) require all of them.

**Must have (table stakes — P1):**
- POST /api/chat with SSE stream: `message_chunk`, `agent_active`, `done`, `error` events — the entire demo collapses without this
- `agent_active` SSE events before each agent runs — required by frontend node highlighting (scoring-visible)
- `validation_update` SSE events during slot collection — required by frontend form progress display
- Intent classification (orchestrator) routing to: faqs / catalog / schedule / generic
- Validator agents (faqs, catalog, schedule) — structured field collection before specialist fires
- Specialist agents (faqs, catalog, schedule) — streamed domain-specific answers
- Generic agent — greetings/farewells/off-topic fallback
- MongoDB conversation memory (read + write per turn) — required for intent continuity
- Intent continuity in session state — prevents mid-validation reclassification
- Static JSON data loading at startup (faqs.json, catalog.json, schedule.json)
- POST /api/flow + GET /api/flow — visual editor node config persistence

**Should have (differentiators — P2):**
- Alternative slot suggestion in Scheduling agent — proactive availability when requested slot is taken
- Employee discount conditional logic in Catalog agent — domain-specific pricing
- Client profile personalization in FAQs agent — `clientType`/`employmentType`-aware responses
- Cross-session memory persistence — bonus 5 pts on rubric; add if time permits after P1 is stable

**Defer (v2+ / out of scope):**
- RAG / vector search — Atlas Vector Search setup is multi-hour; static JSON is sufficient and deterministic
- Parallel agent execution — race conditions on shared session state; sequential is correct for this flow
- Full observability stack (OpenTelemetry/LangSmith) — post-hackathon
- NLP date/time parsing — structured ISO format is sufficient for demo validation

### Architecture Approach

The architecture is a sequential pipeline with a shared `ConversationContext` object (intent + validationState + messages[]) that flows through: Memory Load → Orchestrator → Validator → Specialist/Generic → Memory Save → SSE done. Each agent is a pure async function in its own module; routing lives exclusively in `pipeline/run-pipeline.ts`. The pipeline function owns the SSE emitter and passes it as a callback to agents that stream output. This clean separation satisfies both the testability requirement and the frontend's expectation of named SSE events that map to visual nodes.

**Major components:**
1. H3 Route Handler (`src/server/routes/api/chat.post.ts`) — accepts POST, creates SSE event stream, calls pipeline, manages stream lifecycle
2. Memory Service (`src/server/memory/`) — Mongoose-backed load/save of ConversationContext; called only at pipeline start and end, never inside agents
3. Orchestrator Agent (`src/server/agents/orchestrator.ts`) — LLM call with withStructuredOutput; classifies intent; skips reclassification when validationState.status === 'pending'
4. Validator Agents (3x: faqs, catalog, schedule) — slot collection via LLM; emits `validation_update` events; returns early if fields still missing
5. Specialist Agents (3x: faqs, catalog, schedule) — LLM streaming with static JSON data injected; emits `message_chunk` per token
6. Generic Agent — simple LLM call for greetings/off-topic; streams response
7. SSE Emitter (`src/server/sse/emitter.ts`) — typed helper ensuring consistent event shapes across all agents
8. Static Data Loader (`src/server/data/loader.ts`) — module-level JSON load at startup; zero per-request disk I/O
9. Flow Store (`src/server/routes/api/flow.*`) — Mongoose model for editor node config persistence

**Build order dictated by dependencies:** MongoDB connection → TypeScript types → Memory service → SSE emitter → H3 route skeleton (deploy to Vercel Preview, prove SSE works) → Orchestrator → Generic → Validators → Specialists → Flow store.

### Critical Pitfalls

1. **SSE silently buffers on Vercel** — call `event.node.res.flushHeaders()` synchronously before any `await`; test on a real Vercel Preview deployment, not just locally. If h3's createEventStream proves unreliable, fall back to raw `res.write()` + `\n\n` terminators.

2. **MongoDB connection exhaustion under concurrent invocations** — use the global cached connection pattern with `maxPoolSize: 3` and `bufferCommands: false`. Test with 5 concurrent curl requests before demo day. Atlas M0 allows 500 connections; with 30 concurrent Vercel instances at default pool size of 5, that's 150 connections consumed.

3. **@langchain/google-genai + withStructuredOutput returns degraded output** — pass `method: "json_schema"` explicitly to `.withStructuredOutput()` so Gemini uses native JSON schema mode instead of tool-calling. Verify on 10 test calls that all required fields are populated (not null). If the package is still broken, fall back to direct `@google/genai` SDK.

4. **LLM output wrapped in markdown code fences breaks JSON.parse()** — never use raw `JSON.parse()` on LLM output. Use LangChain's `JsonOutputParser` or a sanitizer that strips code fences. Happens intermittently, guaranteeing a live demo failure eventually if unhandled.

5. **Validator state lost when user sends off-topic message mid-validation** — orchestrator must check `session.validationState.status === 'pending'` FIRST and skip reclassification when true. This must be implemented from the start in the orchestrator; retrofitting it after validators are built is a 3-4 hour rework.

6. **Intent misclassification on ambiguous messages** — add a fifth `ambiguous` output to the classifier schema; route to generic agent with a clarifying question. Use `temperature: 0` for the orchestrator. Validate against a 20-message test matrix before connecting specialist agents.

---

## Implications for Roadmap

Based on the dependency chain in ARCHITECTURE.md and the pitfall phase mapping in PITFALLS.md, a 4-phase structure is strongly recommended. The hackathon is 18 hours. Phase 1 is a hard gate — do not proceed to Phase 2 until SSE streaming is confirmed working on a deployed Vercel Preview URL.

### Phase 1: Foundation and Infrastructure Validation

**Rationale:** Every other feature depends on MongoDB connectivity, TypeScript types, and SSE streaming working correctly on Vercel. These have the highest failure risk if deferred. The pitfalls research explicitly maps SSE buffering, MongoDB connection exhaustion, and structured output bugs to "Phase 1 — validate before building anything on top." This is not optional prep work; it is the riskiest phase.

**Delivers:** A deployed Vercel function that accepts POST /api/chat, streams SSE events, connects to MongoDB Atlas, and returns a hardcoded `agent_active` + `message_chunk` + `done` event sequence. No LLM logic yet — just the plumbing.

**Addresses:** Table stakes: POST /api/chat endpoint, SSE event schema, MongoDB connection, Static JSON loading

**Avoids:** SSE buffering on Vercel (Pitfall 2), MongoDB connection exhaustion (Pitfall 3), cold start failures

**Go/no-go gate:** Browser EventSource on a Vercel Preview URL receives streaming events in real time. MongoDB Atlas dashboard shows stable connection count under concurrent requests.

### Phase 2: Orchestrator and Intent Pipeline

**Rationale:** The orchestrator is the simplest LLM integration (one structured output call) and proves Gemini + withStructuredOutput works correctly before validators and specialists depend on it. Intent continuity logic (Pitfall 4) must be implemented here, not later. The generic agent is the second deliverable — it proves end-to-end streaming works without domain complexity.

**Delivers:** Working intent classification routing to all 4 paths (faqs/catalog/schedule/generic). Generic agent streaming end-to-end. Intent continuity: orchestrator skips reclassification when validationState.status === 'pending'. JSON parsing safety layer in place.

**Uses:** ChatGoogleGenerativeAI with `method: "json_schema"`, Zod v3 schema for intent enum, JsonOutputParser

**Implements:** Orchestrator agent, Generic agent, pipeline/run-pipeline.ts skeleton, ConversationContext TypeScript types

**Avoids:** Structured output degradation (Pitfall 1), LLM markdown-wrapped JSON (Pitfall 5), intent misclassification (Pitfall 6)

**Go/no-go gate:** 20-message classification matrix passes with expected intent output. End-to-end: POST /api/chat with a greeting returns streaming generic response via SSE.

### Phase 3: Validator and Specialist Agents

**Rationale:** Validators depend on the orchestrator and session state working correctly (Phase 2 gate). Specialists depend on validators completing (validationState === 'complete'). This phase delivers the full 3 use cases required by the demo. Build order within the phase: FAQ (simplest domain logic) → Catalog (filter logic + discount) → Schedule (availability check + alternatives).

**Delivers:** All 3 validator agents (slot collection with `validation_update` SSE events), all 3 specialist agents (streamed answers with static JSON data injection). Full end-to-end demo across all use cases. POST/GET /api/flow for editor config persistence.

**Uses:** MongoDBChatMessageHistory or session-embedded messages[], catalog.json/faqs.json/schedule.json loaded at startup, chain.stream() for token-level streaming

**Implements:** validator-faqs.ts, validator-catalog.ts, validator-schedule.ts, specialist-faqs.ts, specialist-catalog.ts, specialist-schedule.ts, flow.post.ts, flow.get.ts

**Avoids:** Specialist firing before validator is complete (strict gate in pipeline), missing `done` event causing frontend hang, missing `error` SSE event on failure

**Go/no-go gate:** Full multi-turn conversation test for each use case (FAQ: 3-turn, Catalog: 4-turn, Schedule: 3-turn) completes correctly on Vercel Preview with no validation state loss.

### Phase 4: Differentiators and Polish

**Rationale:** P2 features (employee discount, alternative slots, profile personalization, cross-session memory) are additive. They require the P1-P3 pipeline to be stable. Cross-session memory is a bonus 5 pts on the rubric and is already architecturally supported — it requires verifying that MongoDBChatMessageHistory persists across session IDs correctly, not a structural change.

**Delivers:** Employee discount logic in Catalog specialist, alternative slot suggestion in Schedule specialist, clientType/employmentType personalization in FAQ specialist, cross-session memory persistence (bonus points).

**Uses:** Conditional logic in specialist prompts, schedule.json adjacent-slot scan

**Implements:** Enhancements to existing specialist agents only — no new modules

**Avoids:** Scope creep into anti-features (RAG, WebSockets, parallel agents, auth)

**Go/no-go gate:** Demo script exercises employee vs. non-employee catalog query, unavailable scheduling slot triggers alternatives, returning user session picks up prior conversation context.

### Phase Ordering Rationale

- Phase 1 before everything: SSE + MongoDB + Vercel are the three highest-risk integrations. Validating them on the actual deployment target before any business logic is written eliminates the scenario where a polished agent pipeline can't be demoed because the transport layer doesn't work on Vercel.
- Phase 2 before Phase 3: The orchestrator is the gateway. Validators and specialists cannot be correctly integrated without verified routing and intent continuity. Building validators before the orchestrator's skip-reclassification logic is in place guarantees the Pitfall 4 rework.
- Phase 3 ordered FAQ→Catalog→Schedule: FAQs have the simplest data query (keyword match on faqs.json). Catalog adds filter logic. Schedule adds availability logic with alternatives. Incremental complexity within the phase.
- Phase 4 last: All P2 enhancements are isolated additions to existing agents. They cannot fail the demo if deprioritized under time pressure.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1:** SSE behavior on Vercel with Analog.js/Nitro is LOW confidence. The community Nitro SSE POC exists but official Vercel+Nitro SSE docs are incomplete. Plan for a fallback to raw `res.write()` if `createEventStream` fails. Recommend a 30-minute spike at the very start of Phase 1 to verify.
- **Phase 2:** Gemini `withStructuredOutput` with `method: "json_schema"` behavior should be validated against the actual installed package version on hackathon day. The @langchain/google-genai deprecation situation is evolving; check npm for @langchain/google stability before installing.

Phases with standard patterns (skip research-phase):

- **Phase 3 (Validator/Specialist logic):** The slot-filling pattern and LLM-injected static data approach are well-documented. Standard LangChain LCEL chain patterns apply.
- **Phase 4 (Differentiators):** All enhancements are prompt-level or simple conditional logic within existing agents. No new integration surfaces.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core packages verified against GitHub releases (Feb 26, 2026). Zod v4 bug confirmed open in GitHub issue #8769. Gemini 2.0 deprecation confirmed in Google docs. Only gap: @langchain/google JS migration status (MEDIUM — forum post, not release). |
| Features | MEDIUM-HIGH | SSE event patterns HIGH (Vercel AI SDK official docs). Multi-agent orchestration patterns MEDIUM (LangChain official blog + community). Car dealership domain specifics LOW-MEDIUM — inferred from PROJECT.md description; no external domain research available. |
| Architecture | MEDIUM | Patterns verified against Google ADK docs, LangChain.js docs, H3/Nitro official sources. SSE-on-Vercel specifics LOW (Nitro deploy docs incomplete; community example exists but not officially confirmed). MongoDB document schema pattern MEDIUM (community + MongoDB forum). |
| Pitfalls | MEDIUM | All 6 critical pitfalls backed by GitHub issues or official docs. Vercel SSE buffering confirmed in h3 GitHub issues. MongoDB connection exhaustion confirmed in Vercel community discussions. LLM markdown wrapping in LangChain troubleshooting docs. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **SSE on Vercel with Analog.js/Nitro (LOW confidence):** No official confirmation that `createEventStream` works correctly in Vercel serverless via Analog. Must validate in a deployed Preview environment in the first 30 minutes of Phase 1. Fallback: raw `event.node.res.write()` with explicit `\n\n` terminators.
- **@langchain/google JS package status:** Research indicates it was in-progress as of January 2026 (forum post). Check npm on hackathon day — if it's released and stable, it may be preferable to the deprecated @langchain/google-genai.
- **Gemini 2.5 Flash rate limits:** Free tier was cut 50-80% in December 2025, now 15 RPM. For concurrent judge testing, this may become a bottleneck. Consider adding a simple in-memory rate limiter (5 req/min per sessionId) and having a plan for exhausting the free tier during the demo.
- **Car dealership JSON data format:** faqs.json, catalog.json, and schedule.json schema are unknown until kickoff. Validator field definitions and specialist query logic depend on the exact field names. Build validators with configurable field lists, not hardcoded field names, so they can be updated quickly at kickoff.

---

## Sources

### Primary (HIGH confidence)
- GitHub releases langchain-ai/langchainjs — langchain@1.2.28, @langchain/core@1.1.29, @langchain/google-genai@2.1.22 versions confirmed
- GitHub issue #8769 langchain-ai/langchainjs — Zod v4 + Gemini + withStructuredOutput bug confirmed open
- ai.google.dev/gemini-api/docs/models — gemini-2.5-flash confirmed GA; 2.0 deprecation schedule confirmed
- Vercel docs /docs/functions/limitations — 300s timeout with Fluid Compute confirmed
- Vercel AI SDK docs (ai-sdk.dev) — SSE event type schema (message_chunk, done, error patterns)
- Google ADK multi-agent patterns (google.github.io/adk-docs) — multi-agent architecture patterns

### Secondary (MEDIUM confidence)
- LangChain blog — multi-agent architecture selection (LCEL vs. LangGraph)
- h3 GitHub issues #903, #1045 — SSE streaming behavior on Vercel
- Vercel community discussion #424 — Mongoose connection caching pattern
- LangChain.js troubleshooting docs — OUTPUT_PARSING_FAILURE and JsonOutputParser usage
- MongoDB community forum — chatbot document schema patterns
- mongoosejs.com — Mongoose 9.x confirmed current; schemaLevelProjections feature
- Nitro SSE community POC (github.com/peerreynders/nitro-sse-counter)

### Tertiary (LOW confidence)
- LangChain forum — @langchain/google JS migration status (not official release)
- Medium post (afirstenberg) — What's Coming with LangChainJS and Gemini (Google developer author)
- Community gist (mkbctrl) — intent recognition auto-routing pattern
- DEV.to article — serverless MongoDB scaling patterns

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
