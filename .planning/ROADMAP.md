# Roadmap: Atom — Multi-Agent AI Chatbot Backend

## Overview

Build a multi-agent AI chatbot backend for a car dealership hackathon demo in 18 hours. The pipeline classifies user intent, collects required data conversationally via validators, and delivers personalized responses from static JSON data — all streamed in real-time via SSE with node-activation events for a companion visual editor frontend. Four phases: prove the plumbing on Vercel first (hard gate), then add the orchestrator and generic agent, then build all validators and specialists, then layer in the differentiators that earn bonus points.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Infrastructure** - SSE streaming + MongoDB proven on a live Vercel Preview URL (hard gate)
- [ ] **Phase 2: Orchestrator + Generic** - Intent classification routing to all 4 paths with end-to-end generic agent streaming
- [ ] **Phase 3: Validators + Specialists + Flow** - All 3 use cases end-to-end with full validator/specialist pipeline and editor config persistence
- [ ] **Phase 4: Differentiators** - Bonus features: cross-session memory persistence, RAG for FAQs, pipeline consumes saved node configs

## Phase Details

### Phase 1: Infrastructure
**Goal**: SSE streaming, MongoDB connection, and static data loading are proven on a deployed Vercel Preview URL before any LLM logic is written
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, MEM-01, MEM-02, MEM-04
**Success Criteria** (what must be TRUE):
  1. A browser EventSource pointed at the Vercel Preview URL receives a hardcoded sequence of agent_active, message_chunk, and done events in real time (not buffered)
  2. POST /api/chat with any sessionId + message writes a conversation record to MongoDB Atlas and reads it back correctly
  3. Validation state (collected fields, intent) survives across multiple turns for the same sessionId without data loss
  4. Static JSON files (faqs.json, catalog.json, schedule.json) load at startup and are accessible without per-request disk I/O
  5. All shared TypeScript types (ChatRequest, ChatMessage, AgentType, SSEEvent, etc.) exist and compile without errors
**Plans**: TBD

Plans:
- [ ] 01-01: TBD

### Phase 2: Orchestrator + Generic
**Goal**: User intent is correctly classified and routed; greetings and off-topic messages return a streaming conversational response end-to-end
**Depends on**: Phase 1
**Requirements**: ORCH-01, ORCH-02, ORCH-03, ORCH-04, GEN-01, GEN-02, GEN-03, CROSS-01, CROSS-02, CROSS-03, CROSS-04
**Success Criteria** (what must be TRUE):
  1. POST /api/chat with a greeting returns a streaming welcome message listing available services via SSE
  2. POST /api/chat with a farewell returns a polite closing message
  3. POST /api/chat with an out-of-scope question returns a redirect to dealership services
  4. The orchestrator correctly classifies messages into faqs, catalog, schedule, or generic on a 20-message test matrix
  5. When a user is mid-validation (validationState.status === 'pending'), the orchestrator skips reclassification and holds the current intent
  6. When a user changes topic mid-validation, the orchestrator detects the intent switch and routes to the new intent
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Validators + Specialists + Flow
**Goal**: All three dealership use cases (FAQs, Catalog, Scheduling) work end-to-end — validators collect required fields conversationally, specialists deliver personalized responses from static JSON data, and the editor can save/load flow configurations
**Depends on**: Phase 2
**Requirements**: VAL-01, VAL-02, VAL-03, VAL-04, VAL-05, VAL-06, VAL-07, SPEC-01, SPEC-02, SPEC-03, SPEC-04, SPEC-05, SPEC-06, FLOW-01, FLOW-02
**Success Criteria** (what must be TRUE):
  1. A multi-turn FAQ conversation (3 turns) collects clientType, employmentType, and age one question at a time and returns a personalized FAQ response
  2. A multi-turn catalog conversation (4 turns) collects budget, condition, hasEmployeeDiscount, and vehicleType then returns 3-5 filtered vehicle options with employee discount applied when applicable
  3. A multi-turn scheduling conversation (3 turns) collects fullName, date, time, appointmentType, and vehicleOfInterest then confirms availability or proposes 2-3 alternative slots when the requested time is taken
  4. Each agent transition emits a validation_update SSE event with collectedData and missingFields so the frontend form progress display updates in real time
  5. POST /api/flow saves node positions and configs; GET /api/flow returns the saved configuration
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Differentiators
**Goal**: Earn all bonus points — cross-session memory (+5 pts), RAG with vector search for FAQs (bonus), and pipeline consumes saved editor node configs for maximum architecture score
**Depends on**: Phase 3
**Requirements**: MEM-03, FLOW-03, RAG-01, RAG-02, RAG-03
**Success Criteria** (what must be TRUE):
  1. A returning user with the same sessionId picks up their prior conversation history from a previous browser session
  2. After saving a custom system prompt for the orchestrator node via POST /api/flow, the next pipeline execution uses that prompt instead of the default
  3. FAQ entries are embedded with Gemini text-embedding-004 and stored in MongoDB Atlas with a vector search index
  4. FAQ specialist retrieves semantically relevant entries via vector search instead of loading the full JSON file
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure | 0/TBD | Not started | - |
| 2. Orchestrator + Generic | 0/TBD | Not started | - |
| 3. Validators + Specialists + Flow | 0/TBD | Not started | - |
| 4. Differentiators | 0/TBD | Not started | - |
