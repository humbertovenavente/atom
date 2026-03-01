# Requirements: AI Agent Builder Backend

**Defined:** 2026-02-28
**Core Value:** Multi-agent pipeline correctly classifies intent, collects data conversationally, and delivers personalized responses via SSE streaming with node-activation events.

## v1 Requirements

Requirements for hackathon demo. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: POST /api/chat endpoint accepts sessionId + message and returns SSE event stream
- [x] **INFRA-02**: SSE emits typed events: agent_active, message_chunk, validation_update, done, error
- [ ] **INFRA-03**: MongoDB Atlas connection with cached singleton pattern for serverless
- [ ] **INFRA-04**: Static JSON data files loaded and accessible to specialist agents (faqs.json, catalog.json, schedule.json)
- [x] **INFRA-05**: TypeScript interfaces for all shared types (ChatRequest, ChatMessage, AgentType, FlowConfig, SSEEvent, etc.)

### Memory

- [ ] **MEM-01**: Memory service reads conversation history + validation state from MongoDB by sessionId
- [ ] **MEM-02**: Memory service writes user message, assistant response, intent, and validation data after each turn
- [ ] **MEM-03**: Conversations persist across browser sessions (bonus: +5 pts) — same sessionId retrieves full history
- [ ] **MEM-04**: Validation state (collected fields, current intent) persists across turns without loss

### Orchestrator

- [ ] **ORCH-01**: Orchestrator classifies user message into one of 4 intents: faqs, catalog, schedule, generic
- [ ] **ORCH-02**: Orchestrator returns confidence score with classification
- [ ] **ORCH-03**: Intent continuity — when user is mid-validation, orchestrator maintains current intent instead of reclassifying
- [ ] **ORCH-04**: Low confidence handling — when confidence < 0.6, orchestrator asks for clarification

### Validators

- [ ] **VAL-01**: FAQs validator collects clientType (nuevo/existente), employmentType (asalariado/independiente), age
- [ ] **VAL-02**: Catalog validator collects budget, condition (nuevo/usado), hasEmployeeDiscount, vehicleType
- [ ] **VAL-03**: Schedule validator collects fullName, preferredDate, preferredTime, appointmentType, vehicleOfInterest
- [ ] **VAL-04**: Validators ask one question at a time conversationally (not as a form)
- [ ] **VAL-05**: Validators extract multiple data points from a single message when user provides them
- [ ] **VAL-06**: Validators emit validation_update SSE event with collectedData and missingFields
- [ ] **VAL-07**: Validators return isComplete=true and hand off to specialist when all required fields collected

### Specialists

- [ ] **SPEC-01**: FAQs specialist queries faqs.json and personalizes response based on client profile (age, employment, client type)
- [ ] **SPEC-02**: Catalog specialist filters catalog.json by budget, condition, vehicle type and returns 3-5 options
- [ ] **SPEC-03**: Catalog specialist applies employee discount percentage to prices when hasEmployeeDiscount=true
- [ ] **SPEC-04**: Schedule specialist checks schedule.json for availability at requested date/time
- [ ] **SPEC-05**: Schedule specialist proposes 2-3 alternative slots when requested time is unavailable
- [ ] **SPEC-06**: All specialists format responses conversationally (not as raw data tables)

### Generic Agent

- [ ] **GEN-01**: Generic agent handles greetings with welcome message mentioning available services
- [ ] **GEN-02**: Generic agent handles farewells with polite closing
- [ ] **GEN-03**: Generic agent redirects out-of-scope questions back to dealership services

### Flow Config

- [ ] **FLOW-01**: POST /api/flow saves node positions, edges, and node configs to MongoDB
- [ ] **FLOW-02**: GET /api/flow loads saved flow configuration
- [ ] **FLOW-03**: Pipeline uses node configs (edited system prompts, temperature) from saved flow when available

### RAG

- [ ] **RAG-01**: FAQ entries embedded using Gemini text-embedding-004 and stored in MongoDB Atlas with vector search index
- [ ] **RAG-02**: FAQ specialist uses vector search to retrieve semantically relevant FAQ entries instead of loading full JSON
- [ ] **RAG-03**: API route or startup script to seed FAQ embeddings into MongoDB Atlas

### Cross-Cutting

- [ ] **CROSS-01**: Agent activation SSE events emitted before and after each agent processes (for frontend node highlighting)
- [ ] **CROSS-02**: LLM output parsing handles markdown code fences around JSON (strip before parse)
- [ ] **CROSS-03**: Cross-intent handling — when user changes topic mid-validation, orchestrator detects and routes to new intent
- [ ] **CROSS-04**: Error handling returns graceful error SSE event instead of crashing the stream

## v2 Requirements

Deferred to post-hackathon. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Token streaming — stream LLM response token-by-token instead of full message
- ~~**ADV-02**: RAG with vector database for FAQ retrieval~~ → Promoted to v1 (RAG-01, RAG-02, RAG-03)
- **ADV-03**: Real external API integrations (actual scheduling system, inventory API)
- **ADV-04**: Channel integrations (WhatsApp, Messenger)
- **ADV-05**: Conversation analytics dashboard
- **ADV-06**: Multi-language support

## Out of Scope

| Feature | Reason |
|---------|--------|
| Frontend/editor UI | Persona A's responsibility |
| User authentication | Not required for hackathon demo |
| WebSocket implementation | SSE is simpler and Vercel-compatible |
| Real external APIs | Static JSON sufficient for demo, time constraint |
| Production monitoring | Basic error handling only for hackathon |
| Rate limiting | Single-demo context, not needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| INFRA-05 | Phase 1 | Complete |
| MEM-01 | Phase 1 | Pending |
| MEM-02 | Phase 1 | Pending |
| MEM-04 | Phase 1 | Pending |
| ORCH-01 | Phase 2 | Pending |
| ORCH-02 | Phase 2 | Pending |
| ORCH-03 | Phase 2 | Pending |
| ORCH-04 | Phase 2 | Pending |
| GEN-01 | Phase 2 | Pending |
| GEN-02 | Phase 2 | Pending |
| GEN-03 | Phase 2 | Pending |
| CROSS-01 | Phase 2 | Pending |
| CROSS-02 | Phase 2 | Pending |
| CROSS-03 | Phase 2 | Pending |
| CROSS-04 | Phase 2 | Pending |
| VAL-01 | Phase 3 | Pending |
| VAL-02 | Phase 3 | Pending |
| VAL-03 | Phase 3 | Pending |
| VAL-04 | Phase 3 | Pending |
| VAL-05 | Phase 3 | Pending |
| VAL-06 | Phase 3 | Pending |
| VAL-07 | Phase 3 | Pending |
| SPEC-01 | Phase 3 | Pending |
| SPEC-02 | Phase 3 | Pending |
| SPEC-03 | Phase 3 | Pending |
| SPEC-04 | Phase 3 | Pending |
| SPEC-05 | Phase 3 | Pending |
| SPEC-06 | Phase 3 | Pending |
| FLOW-01 | Phase 3 | Pending |
| FLOW-02 | Phase 3 | Pending |
| MEM-03 | Phase 4 | Pending |
| FLOW-03 | Phase 4 | Pending |
| RAG-01 | Phase 4 | Pending |
| RAG-02 | Phase 4 | Pending |
| RAG-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 39
- Unmapped: 0

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 — traceability complete after roadmap creation*
