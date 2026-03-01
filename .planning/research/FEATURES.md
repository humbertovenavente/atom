# Feature Research

**Domain:** Multi-agent AI chatbot backend — car dealership (hackathon, 18 hrs)
**Researched:** 2026-02-28
**Confidence:** MEDIUM-HIGH (SSE patterns HIGH; multi-agent orchestration patterns MEDIUM; car dealership domain specifics LOW-MEDIUM)

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must exist. Missing these = the backend is not functional for the frontend or evaluators.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| POST /api/chat — sessionId + message in, SSE stream out | Core contract with frontend; without this, nothing works | LOW | H3 `defineEventHandler` + SSE headers. Vercel SSE compatible. |
| SSE event: `message_chunk` | Frontend renders streaming text; without it the chat is silent | LOW | `data: {"type":"message_chunk","content":"..."}` per token |
| SSE event: `done` | Frontend needs to know when to stop listening and unlock input | LOW | `data: [DONE]` or custom `{"type":"done"}` — pick one, stay consistent |
| SSE event: `error` | Any agent failure must surface to UI, not silently hang | LOW | `{"type":"error","message":"..."}` appended before stream closes |
| Intent classification / routing | Multi-agent system cannot function without knowing which agent handles which message | MEDIUM | LLM-based classifier with 4 intents: faqs, catalog, schedule, generic |
| Specialist agent: FAQs | Core use case — users ask financing/policy questions | MEDIUM | Queries faqs.json, returns personalized answer based on client profile |
| Specialist agent: Catalog | Core use case — users browse vehicle inventory | MEDIUM | Filters catalog.json by budget/condition/type, applies employee discount |
| Specialist agent: Scheduling | Core use case — users book appointments | HIGH | Checks schedule.json availability, suggests alternatives if slot taken |
| Generic agent | Fallback for greetings, farewells, off-topic messages | LOW | Simple LLM call with a short system prompt; no tool use needed |
| Conversation memory read per request | Without loading prior context, the agent cannot maintain continuity | MEDIUM | MongoDBChatMessageHistory or equivalent; read last N messages on each turn |
| Conversation memory write after response | History must persist or each request starts cold | LOW | Append user + assistant turns to MongoDB after generation |
| Static JSON data files: faqs.json, catalog.json, schedule.json | Agents have no data to query without these | LOW | Provided at hackathon kickoff; load at startup, keep in memory |
| POST /api/flow — save editor configuration | Frontend visual editor must persist agent graph state to backend | LOW | Accept JSON body, upsert to MongoDB |
| GET /api/flow — load editor configuration | Frontend must be able to reload configuration across sessions | LOW | Read from MongoDB, return as JSON |
| Intent continuity across turns | When validator asks "What is your budget?" the next user reply must not re-classify as a new intent | MEDIUM | Store `currentIntent` in session state alongside messages; only re-classify when intent is null or explicitly changed |

### Differentiators (Competitive Advantage)

Features that distinguish this backend for hackathon scoring (Architecture 35pts, Use Cases 25pts).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| SSE event: `agent_active` | Frontend visual editor highlights which node/agent is currently processing — makes the architecture visible and judging-friendly | LOW | Emit `{"type":"agent_active","agent":"orchestrator"}` before each agent runs; no extra logic required |
| SSE event: `validation_update` | Frontend can render a progress indicator showing which fields have been collected vs. still needed | MEDIUM | Emit `{"type":"validation_update","collected":["budget"],"missing":["condition","vehicleType"]}` after each validation step |
| Validator agent (per specialist) | Conversational data collection — the agent asks one question at a time until all required fields are collected, then hands off to the specialist | HIGH | Track partial state in session; re-ask only missing fields; resist repeating already-answered questions |
| Employee discount logic in Catalog agent | Domain-specific differentiator — applying `employeeDiscount` field from catalog.json changes pricing output | LOW | Conditional logic inside specialist prompt; no extra complexity |
| Alternative slot suggestion in Scheduling agent | When requested slot is taken, proactively surface nearby available times instead of just saying "unavailable" | MEDIUM | Scan schedule.json for adjacent slots; return top 2-3 options |
| Client profile personalization in FAQs agent | FAQ responses differ based on `clientType` (employee vs. external) and `employmentType` — makes responses feel relevant | MEDIUM | Include profile fields in specialist system prompt; LLM handles the personalization |
| Cross-session memory persistence | Returning users resume where they left off without re-answering baseline questions | MEDIUM | MongoDBChatMessageHistory with sessionId as key; load last N messages on each new request; +5 bonus pts per rubric |
| Structured SSE event schema | All events follow a typed schema (`type`, `agent`, `content`, `data`) — frontend can handle events predictably without defensive parsing | LOW | Design the schema once at project start; stick to it everywhere |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem useful but create scope risk, complexity, or fragility within 18-hour hackathon timeline.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| WebSocket (WS) protocol | Bidirectional — "more powerful" | Requires stateful server; not Vercel-compatible; more complex client reconnect; SSE does the job for one-way streaming | Use SSE (already decided in PROJECT.md) |
| RAG / vector database | "More accurate" retrieval | Atlas Vector Search setup takes hours; static JSON with exact filter logic is faster, deterministic, and sufficient for demo | Exact filter on static JSON (catalog), keyword match (FAQs) |
| Real-time external API integrations | "Live data" | Requires API keys, rate limit handling, error surfaces multiply; demo data is indistinguishable to judges | Static JSON data files loaded at startup |
| User authentication / JWT | Security | Out of scope per PROJECT.md; adds middleware, token validation, session complexity; judges won't test auth bypass | sessionId as trust token is sufficient for demo |
| Multi-turn planning / ReAct loop | "More autonomous" | ReAct adds unpredictable LLM loops, hard to debug in 18 hours, high token cost; validator pattern (structured state machine) is more reliable | Explicit state machine: orchestrator → validator → specialist |
| Parallel agent execution | "Faster" | Introduces race conditions on shared session state; SSE ordering becomes non-deterministic; sequential is sufficient for conversational flow | Sequential: classify → validate → specialize |
| Long-context full history in every prompt | "More aware" | Context window limits, token cost, latency; full history in every Gemini call risks hitting limits mid-demo | Load last 10 messages (configurable window); summarize older if needed |
| Full observability / tracing (OpenTelemetry) | "Production-ready" | LangSmith / OTLP setup is time-consuming; hackathon evaluators won't check traces | Add console.log structured logging; review after demo |
| Streaming mid-validator (token-by-token during questions) | "Real-time feel during questions" | Validator questions are short; streaming them adds complexity for minimal UX gain | Emit `validation_update` SSE event (structured), then stream the question as a single `message_chunk` burst |
| Fuzzy date/time parsing (NLP) | "Natural scheduling" | Chrono-node or similar adds dependency; edge cases abound; `date: "2026-03-05"`, `time: "10:00"` is sufficient for demo validation | Validate against ISO date format; prompt LLM to extract structured date |

## Feature Dependencies

```
[MongoDB Connection]
    └──required by──> [Conversation Memory Read/Write]
                          └──required by──> [Intent Continuity]
                          └──required by──> [Validator State Persistence]
                          └──required by──> [Cross-session Memory Persistence]
    └──required by──> [POST /api/flow Save]
    └──required by──> [GET /api/flow Load]

[Intent Classification / Routing]
    └──required by──> [Validator Agent (FAQs)]
                          └──required by──> [Specialist Agent: FAQs]
    └──required by──> [Validator Agent (Catalog)]
                          └──required by──> [Specialist Agent: Catalog]
    └──required by──> [Validator Agent (Scheduling)]
                          └──required by──> [Specialist Agent: Scheduling]
    └──required by──> [Generic Agent]

[Static JSON files loaded]
    └──required by──> [Specialist Agent: FAQs]
    └──required by──> [Specialist Agent: Catalog]
    └──required by──> [Specialist Agent: Scheduling]

[SSE stream setup]
    └──required by──> [message_chunk events]
    └──required by──> [agent_active events]
    └──required by──> [validation_update events]
    └──required by──> [done event]
    └──required by──> [error event]

[Validator Agent (per intent)]
    └──enhances──> [validation_update SSE events]

[agent_active SSE events] ──enhances──> [Frontend node highlighting]

[intent_continuity] ──conflicts──> [always re-classify intent]
```

### Dependency Notes

- **MongoDB connection required before any memory feature:** MongoDBChatMessageHistory and session state both require the connection pool to be established at startup, not per-request.
- **Intent classification must run before validator or specialist:** The routing decision gate-keeps the entire pipeline; without it, no agent receives a request.
- **Validator must complete before specialist:** Specialists expect a fully populated data object (all required fields present); calling the specialist with partial data causes hallucination or unhelpful responses.
- **Static JSON must be loaded at server startup:** Per-request file reads add latency and risk ENOENT errors mid-demo; load into module scope at startup.
- **SSE headers must be set before any await:** In H3/Nitro, `setHeader` must be called synchronously before `sendStream`; any async work before header setting will cause buffering in some environments.
- **Intent continuity conflicts with always-reclassify:** Once a validator is mid-collection, incoming messages must bypass the classifier and route directly back to the active validator agent.

## MVP Definition

### Launch With (v1) — Hackathon Demo

Minimum viable for full demo across all 3 use cases + visual editor integration:

- [ ] POST /api/chat with SSE stream (message_chunk, agent_active, done, error) — the entire demo depends on this
- [ ] Intent classification (orchestrator) routing to faqs / catalog / schedule / generic — unlocks all use cases
- [ ] Validator agents (faqs, catalog, schedule) — required for structured data collection
- [ ] Specialist agents (faqs, catalog, schedule) — required to deliver actual answers
- [ ] Generic agent — required for greeting/farewell handling in demo script
- [ ] MongoDB memory read/write — required for intent continuity and bonus points
- [ ] Intent continuity in session state — prevents broken follow-up message routing
- [ ] Static JSON files loaded at startup — agents have no data without these
- [ ] agent_active SSE events — required by frontend for node highlighting (evaluation criterion)
- [ ] validation_update SSE events — required by frontend for form progress display
- [ ] POST /api/flow + GET /api/flow — required by Persona A's visual editor

### Add After Validation (v1.x)

Features to add once core pipeline is stable and tested:

- [ ] Alternative slot suggestion in Scheduling — add after scheduling baseline works
- [ ] Employee discount conditional logic — add after catalog filter works
- [ ] Client profile personalization in FAQs — add after FAQs baseline works
- [ ] Cross-session memory (full persistence, not just within-session) — bonus 5 pts, add if time permits

### Future Consideration (v2+)

Defer entirely; out of scope for hackathon:

- [ ] RAG / vector search — requires Atlas Vector Search setup, not worth the time for static data
- [ ] Parallel agent execution — complexity without commensurate demo value
- [ ] Full observability stack — post-hackathon if productionized
- [ ] NLP date/time parsing — structured ISO format is sufficient

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| POST /api/chat + SSE stream | HIGH | LOW | P1 |
| Intent classification (orchestrator) | HIGH | MEDIUM | P1 |
| agent_active SSE events | HIGH (judge-visible) | LOW | P1 |
| Validator agent (all 3 intents) | HIGH | HIGH | P1 |
| Specialist agent: FAQs | HIGH | MEDIUM | P1 |
| Specialist agent: Catalog | HIGH | MEDIUM | P1 |
| Specialist agent: Scheduling | HIGH | HIGH | P1 |
| Generic agent | MEDIUM | LOW | P1 |
| validation_update SSE events | MEDIUM (judge-visible) | MEDIUM | P1 |
| MongoDB memory (session) | HIGH | MEDIUM | P1 |
| Intent continuity | HIGH | MEDIUM | P1 |
| Static JSON data loading | HIGH | LOW | P1 |
| POST/GET /api/flow | MEDIUM | LOW | P1 |
| Employee discount logic | MEDIUM | LOW | P2 |
| Alternative slot suggestion | MEDIUM | MEDIUM | P2 |
| Client profile personalization (FAQs) | MEDIUM | MEDIUM | P2 |
| Cross-session memory persistence (bonus) | MEDIUM | MEDIUM | P2 |
| NLP date/time parsing | LOW | HIGH | P3 |
| Full observability | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for hackathon launch (demo fails without it)
- P2: Should have — add after P1 pipeline is end-to-end working
- P3: Nice to have — defer entirely given 18-hour constraint

## Competitor Feature Analysis

Reference: Flowise, Langflow, Voiceflow (car dealership AI), DealerAI

| Feature | Flowise / Langflow | Voiceflow / DealerAI | Our Approach |
|---------|---------|---------|--------------|
| Visual node editor + backend | Visual editor IS the backend; one product | Hosted platform, not self-hosted | Split: Persona A builds editor, Persona B builds backend API — cleaner separation for hackathon |
| Intent routing | Built-in "conditional" and "router" nodes | Black box intent classification | Explicit LLM orchestrator agent with typed intents — evaluators can see the classification decision in logs |
| Validator / slot filling | Flowise has "ifElse" nodes; no native slot filling | Built-in form collection | Hand-rolled validator agents per domain — more hackathon-credible, fully custom |
| SSE streaming | Both support SSE but it's internal to platform | Platform-native streaming | Custom SSE with typed event schema; frontend gets full control |
| Memory / history | Flowise has built-in memory nodes | Session memory via platform | MongoDBChatMessageHistory with Mongoose — gives us control and the MongoDB bonus points |
| Static JSON data source | Supported via custom tool nodes | Not applicable | Load JSON at startup in module scope; no latency on query |
| Node activation events for editor | Not applicable (editor IS the system) | Not applicable | Custom `agent_active` SSE events — our key differentiator for the visual editor integration |
| Car dealership domain logic | Generic — no employee discount, no schedule | DealerAI is domain-specific but closed | Domain logic embedded in specialist prompts + JSON filters — visible and auditable |

## Sources

- [Intent Recognition and Auto-Routing in Multi-Agent Systems (gist)](https://gist.github.com/mkbctrl/a35764e99fe0c8e8c00b2358f55cd7fa) — MEDIUM confidence, single source, verified against LangChain docs pattern
- [LangChain Multi-Agent Architecture Patterns](https://blog.langchain.com/choosing-the-right-multi-agent-architecture/) — MEDIUM confidence, official LangChain blog
- [AI SDK Stream Protocol (SSE event types)](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol) — HIGH confidence, official Vercel AI SDK documentation
- [MongoDB + LangGraph Long-Term Memory](https://www.mongodb.com/docs/atlas/ai-integrations/langchain/memory-semantic-cache/) — HIGH confidence, official MongoDB documentation
- [LangGraph State Machines for Agent Flows](https://dev.to/jamesli/langgraph-state-machines-managing-complex-agent-task-flows-in-production-36f4) — LOW confidence, single community article
- [Multi-Agent Workflows Often Fail (GitHub Blog)](https://github.blog/ai-and-ml/generative-ai/multi-agent-workflows-often-fail-heres-how-to-engineer-ones-that-dont/) — MEDIUM confidence, engineering blog post
- [SSE Streaming for LLM Chatbots (complete guide)](https://dev.to/pockit_tools/the-complete-guide-to-streaming-llm-responses-in-web-applications-from-sse-to-real-time-ui-3534) — MEDIUM confidence, multiple corroborating sources
- [Flowise Visual Builder](https://flowiseai.com/) — HIGH confidence, official product documentation
- [Conversational Forms vs Web Forms](https://collect.chat/blog/conversational-forms-vs-web-forms/) — MEDIUM confidence, industry analysis

---
*Feature research for: Multi-agent AI chatbot backend (car dealership hackathon)*
*Researched: 2026-02-28*
