# Architecture Research

**Domain:** Multi-agent chatbot backend (car dealership, hackathon)
**Researched:** 2026-02-28
**Confidence:** MEDIUM — patterns verified against ADK docs, LangChain docs, and H3/Nitro official sources; SSE-on-Vercel specifics LOW confidence (not definitively confirmed in Nitro deploy docs)

---

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                        HTTP Layer (Nitro/H3)                       │
│  POST /api/chat          POST /api/flow      GET /api/flow         │
│  → SSE stream            → save config       → load config         │
└─────────────────────────────┬─────────────────────────────────────┘
                              │ readBody({ sessionId, message })
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                     Memory Service (MongoDB)                       │
│  load(sessionId) → ConversationContext                            │
│  ConversationContext = { messages[], intent, validationState }     │
└─────────────────────────────┬─────────────────────────────────────┘
                              │ context passed into pipeline
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                    Orchestrator Agent                              │
│  Input: context + new message                                      │
│  Action: classify intent → faqs | catalog | schedule | generic     │
│  Output: context with intent set (or preserved from prior turn)    │
│  SSE: emit agent_active("orchestrator")                            │
└──────────────────┬──────────────────────────────────────┬─────────┘
                   │ intent = faqs/catalog/schedule        │ generic
        ┌──────────▼───────────────────────────┐          │
        │         Validator Agent              │          │
        │  Input: context + intent             │          │
        │  Checks: which required fields miss  │          │
        │  If missing: ask LLM to prompt user  │          │
        │  If complete: set validationState OK │          │
        │  Output: context + next question OR  │          │
        │          "ready to proceed" flag      │          │
        │  SSE: agent_active("validator")       │          │
        │       validation_update(state)        │          │
        └──────────┬───────────────────────────┘          │
                   │ validationState === complete           │
        ┌──────────▼───────────────────────────┐          │
        │        Specialist Agent              │          │
        │  Input: context + JSON data files    │          │
        │  Action: query/filter static data    │          │
        │  Action: personalize by profile      │          │
        │  Output: streamed response tokens    │          │
        │  SSE: agent_active("specialist")     │          │
        │       message_chunk (per token)      │          │
        └──────────┬───────────────────────────┘          │
                   │                                       │
        ┌──────────▼───────────────────────────────────── ▼──────┐
        │        Generic Agent (greetings / out-of-scope)         │
        │  Input: context                                          │
        │  Output: streamed conversational response                │
        │  SSE: agent_active("generic") + message_chunk           │
        └───────────────────────────┬──────────────────────────── ┘
                                    │
┌───────────────────────────────────▼───────────────────────────────┐
│                     Memory Service (MongoDB)                       │
│  save(sessionId, updatedContext)                                   │
│  Persist: messages[], intent, validationState                      │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
                       SSE: done event
                              │
                         Client (frontend editor)
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| H3 Route Handler | Accept POST, set SSE headers, create event stream, pipe agent output | `defineEventHandler` + `createEventStream` from h3 |
| Memory Service | Load/save ConversationContext for a sessionId | Mongoose model with `findOneAndUpdate` + upsert |
| Orchestrator Agent | Classify intent; preserve intent continuity across turns | Single LLM call with structured output / JSON mode |
| Validator Agent | Track which slots are collected; prompt for missing ones | LLM call; slots stored in context, not re-asked |
| Specialist Agent | Query static JSON data; personalize response by profile | LLM call with data injected into prompt context |
| Generic Agent | Handle greetings, farewells, off-topic | Simple LLM call, no data lookup |
| SSE Emitter | Push named events to client during pipeline execution | `eventStream.push({ event, data })` helper |
| Static Data Loader | Load faqs.json / catalog.json / schedule.json | Module-level `import` or `readFileSync` at startup |
| Flow Store | Persist/load editor node configurations | Mongoose model or simple MongoDB doc |

---

## Recommended Project Structure

```
src/
├── server/
│   ├── routes/
│   │   ├── api/
│   │   │   ├── chat.post.ts        # POST /api/chat → SSE stream
│   │   │   ├── flow.post.ts        # POST /api/flow → save editor config
│   │   │   └── flow.get.ts         # GET /api/flow  → load editor config
│   │   └── health.get.ts           # Health check endpoint
│   ├── agents/
│   │   ├── orchestrator.ts         # Intent classification agent
│   │   ├── validator-faqs.ts       # Slot collector for FAQ intent
│   │   ├── validator-catalog.ts    # Slot collector for Catalog intent
│   │   ├── validator-schedule.ts   # Slot collector for Schedule intent
│   │   ├── specialist-faqs.ts      # FAQ lookup + personalization agent
│   │   ├── specialist-catalog.ts   # Catalog filter + discount agent
│   │   ├── specialist-schedule.ts  # Schedule check + proposal agent
│   │   └── generic.ts              # Greetings / out-of-scope agent
│   ├── pipeline/
│   │   └── run-pipeline.ts         # Wires agents together, drives SSE emissions
│   ├── memory/
│   │   ├── conversation.model.ts   # Mongoose schema for conversations
│   │   ├── flow.model.ts           # Mongoose schema for flow configs
│   │   └── memory.service.ts       # load(sessionId) / save(sessionId, ctx)
│   ├── data/
│   │   ├── faqs.json               # Static FAQ data (loaded at kickoff)
│   │   ├── catalog.json            # Vehicle catalog data
│   │   ├── schedule.json           # Advisor availability data
│   │   └── loader.ts               # Typed loaders for each JSON file
│   ├── sse/
│   │   └── emitter.ts              # Typed SSE event emission helpers
│   └── db/
│       └── connect.ts              # MongoDB Atlas connection (singleton)
```

### Structure Rationale

- **agents/:** Each agent is a self-contained module: a TypeScript function that takes `ConversationContext` + `SSEEmitter`, makes one LLM call, and returns an updated context. No agent knows about other agents.
- **pipeline/:** The pipeline module is the only place that knows agent ordering and routing logic. It sequences agents and handles the routing decision (which validator/specialist to call based on intent).
- **memory/:** Isolated from agents. Agents receive context as a plain object; the memory service handles all MongoDB I/O.
- **sse/:** Typed helpers ensure consistent event shapes — avoids typos in event names across the codebase.
- **data/:** Static JSON loaded once at module initialization, passed into specialist agents as arguments.

---

## Architectural Patterns

### Pattern 1: Sequential Agent Pipeline with Shared Context Object

**What:** A single `ConversationContext` object is created at request start, passed through each agent in sequence, and each agent mutates and returns it. The pipeline function controls sequencing and routing.

**When to use:** When agents depend on prior agents' output — orchestrator must run before validator, validator must complete before specialist. This project is exactly this case.

**Trade-offs:** Simple to reason about; no concurrency complexity. Bottleneck is LLM latency per step (3 LLM calls in worst case). Acceptable for hackathon; would need parallelism for production scale.

**Example:**
```typescript
// pipeline/run-pipeline.ts
export async function runPipeline(
  sessionId: string,
  userMessage: string,
  emit: SSEEmitter
): Promise<void> {
  // 1. Load context from MongoDB
  let ctx = await memoryService.load(sessionId);
  ctx.messages.push({ role: 'user', content: userMessage });

  // 2. Orchestrator: classify or preserve intent
  emit({ event: 'agent_active', data: { agent: 'orchestrator' } });
  ctx = await orchestratorAgent(ctx);

  // 3. Validator: check slot completion, ask if incomplete
  if (ctx.intent !== 'generic') {
    emit({ event: 'agent_active', data: { agent: `validator-${ctx.intent}` } });
    ctx = await validatorAgent(ctx, emit);
    // If validator asked a question, save and return early
    if (ctx.validationState.status === 'pending') {
      await memoryService.save(sessionId, ctx);
      emit({ event: 'done', data: {} });
      return;
    }
  }

  // 4. Specialist or Generic: generate response
  const agent = ctx.intent === 'generic' ? genericAgent : specialistAgents[ctx.intent];
  emit({ event: 'agent_active', data: { agent: ctx.intent === 'generic' ? 'generic' : `specialist-${ctx.intent}` } });
  ctx = await agent(ctx, emit); // agent calls emit({ event: 'message_chunk', data: { text } }) per token

  // 5. Save updated context
  await memoryService.save(sessionId, ctx);
  emit({ event: 'done', data: {} });
}
```

### Pattern 2: Agent as Pure Function Module

**What:** Each agent is a TypeScript module exporting a single async function. It receives context, builds a prompt, calls the LLM, parses the output, and returns updated context. It does not import other agents or access MongoDB.

**When to use:** Always — this is the correct separation of concerns for agent systems. Agents should be independently testable without mocking the full pipeline.

**Trade-offs:** Slightly more boilerplate than a class-based approach, but much easier to test, swap, or replace individual agents.

**Example:**
```typescript
// agents/orchestrator.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ConversationContext } from '../memory/types';

const llm = new ChatGoogleGenerativeAI({ model: 'gemini-1.5-flash' });

const SYSTEM_PROMPT = `You are an intent classifier for a car dealership chatbot.
Classify the user's message as one of: faqs, catalog, schedule, generic.
Rules:
- If the current conversation already has an intent and the user is answering a question, preserve the existing intent.
- Return ONLY the intent label as a JSON object: { "intent": "faqs" }`;

export async function orchestratorAgent(ctx: ConversationContext): Promise<ConversationContext> {
  // Preserve intent if user is responding to validator questions
  if (ctx.validationState.status === 'pending') {
    return ctx; // Don't reclassify mid-validation
  }

  const result = await llm.invoke([
    { role: 'system', content: SYSTEM_PROMPT },
    ...ctx.messages.slice(-6), // Last 3 exchanges for context
  ]);

  const parsed = JSON.parse(result.content as string);
  return {
    ...ctx,
    intent: parsed.intent,
    validationState: parsed.intent !== ctx.intent
      ? { status: 'pending', collectedFields: {} } // Reset state on intent change
      : ctx.validationState,
  };
}
```

### Pattern 3: SSE Named Events with Typed Emitter

**What:** Use SSE's named event field (`event: agent_active\ndata: {...}`) rather than a single generic `data:` stream. This lets the client listen to specific event types via `eventSource.addEventListener('agent_active', ...)`.

**When to use:** When client needs to distinguish between different event types — here the frontend needs `agent_active` to highlight nodes vs `message_chunk` to append text vs `validation_update` to update form state.

**Trade-offs:** Slightly more complex SSE format than plain `data:`, but the frontend editor requires this discrimination.

**Example:**
```typescript
// sse/emitter.ts
import { EventStream } from 'h3';

export type SSEEventType = 'agent_active' | 'message_chunk' | 'validation_update' | 'done' | 'error';

export interface SSEEvent {
  event: SSEEventType;
  data: Record<string, unknown>;
}

export type SSEEmitter = (evt: SSEEvent) => Promise<void>;

export function createEmitter(eventStream: EventStream): SSEEmitter {
  return async ({ event, data }) => {
    await eventStream.push({
      event,
      data: JSON.stringify(data),
    });
  };
}
```

---

## Data Flow

### Request Flow (Happy Path — Catalog Query with Complete Slots)

```
Client POST /api/chat { sessionId, message: "quiero un SUV" }
    ↓
H3 route: createEventStream(event), call runPipeline(sessionId, message, emit)
    ↓
memoryService.load(sessionId)
  → MongoDB findOne({ sessionId })
  → returns ConversationContext (or creates empty one)
    ↓
orchestratorAgent(ctx)
  → LLM classifies "quiero un SUV" → intent: "catalog"
  → returns ctx with intent = "catalog"
    ↓
SSE emit: agent_active { agent: "validator-catalog" }
    ↓
validatorCatalogAgent(ctx, emit)
  → checks collectedFields: { budget: null, condition: null, ... }
  → fields are empty → LLM generates question "¿Cuál es tu presupuesto?"
  → SSE emit: validation_update { field: "budget", status: "pending" }
  → SSE emit: message_chunk { text: "¿Cuál es tu presupuesto?" }
  → returns ctx with validationState.status = "pending"
    ↓
memoryService.save(sessionId, ctx)
  → MongoDB findOneAndUpdate({ sessionId }, { $set: { ...ctx } }, { upsert: true })
    ↓
SSE emit: done {}
    ↓
eventStream.close()
```

### Request Flow (Intent Continuity — User Answers Validator Question)

```
Client POST /api/chat { sessionId, message: "200,000 quetzales" }
    ↓
memoryService.load(sessionId)
  → ConversationContext { intent: "catalog", validationState: { status: "pending", collectedFields: {} } }
    ↓
orchestratorAgent(ctx)
  → sees validationState.status === "pending" → PRESERVES intent "catalog" (no LLM call)
    ↓
validatorCatalogAgent(ctx, emit)
  → LLM parses "200,000 quetzales" → collectedFields.budget = 200000
  → checks remaining: condition, employeeDiscount, vehicleType still null
  → asks next question
  → returns ctx with updated collectedFields, still status: "pending"
    ↓
... (repeats until all fields collected)
    ↓
validationState.status === "complete"
    ↓
SSE emit: agent_active { agent: "specialist-catalog" }
specialistCatalogAgent(ctx, catalogData, emit)
  → filters catalog by budget/condition/vehicleType
  → applies employee discount if applicable
  → LLM streams personalized response
  → per token: SSE emit: message_chunk { text: token }
    ↓
memoryService.save + done event
```

### MongoDB Document Shape

```typescript
// Conversation document
interface ConversationDocument {
  sessionId: string;           // Primary lookup key
  intent: string | null;       // Current active intent
  validationState: {
    status: 'pending' | 'complete' | 'none';
    collectedFields: Record<string, unknown>; // Budget, clientType, etc.
  };
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    agentId?: string;           // Which agent produced this message
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Flow config document (editor persistence)
interface FlowDocument {
  configId: string;            // "default" or user-defined
  nodes: unknown[];            // Frontend editor node config
  edges: unknown[];
  updatedAt: Date;
}
```

**Schema decisions:**
- Embed `messages[]` in the conversation document (not a separate collection) — conversations are always accessed as a unit, not individually by message. MongoDB's document model fits this perfectly.
- `validationState.collectedFields` is a flexible object — different intents collect different fields. No need for rigid schema here; Mongoose's `Mixed` type works.
- Index on `sessionId` — only field ever used as a query filter.

### Key Data Flows

1. **Intent classification:** Last 6 messages (3 exchanges) passed to orchestrator — enough for context, avoids token bloat
2. **Slot collection:** `collectedFields` accumulates across turns; validator LLM receives the full list of required fields + already-collected values so it knows what to ask next
3. **Specialist data injection:** Static JSON files passed directly into specialist agent function calls — no dynamic loading, no API calls
4. **SSE backpressure:** `await eventStream.push()` is awaited per event — natural backpressure prevents overwhelming the stream

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Hackathon demo (1-5 concurrent) | Current design is correct — single Vercel serverless function per request, no concurrency issues |
| 1k users | Add Redis for session caching (replace MongoDB load on every turn); connection pooling already handled by Mongoose |
| 10k+ users | Extract agents to separate microservices; use message queue (BullMQ) for pipeline execution; stream results via Redis pub/sub |

### Scaling Priorities

1. **First bottleneck:** MongoDB connection cold starts on Vercel serverless — solved by Mongoose connection caching (global singleton pattern, standard for Next.js/Nitro serverless)
2. **Second bottleneck:** LLM latency per pipeline step (3 sequential calls = ~3-9 seconds) — solve with parallel validation if multiple intents can be detected simultaneously

---

## Anti-Patterns

### Anti-Pattern 1: Agents Calling Each Other Directly

**What people do:** Orchestrator imports and calls Validator, Validator imports and calls Specialist.
**Why it's wrong:** Creates tight coupling, circular dependency risk, impossible to test agents in isolation, impossible to change routing logic without touching agent files.
**Do this instead:** All routing lives in `pipeline/run-pipeline.ts`. Agents are pure functions that only know their own task.

### Anti-Pattern 2: Reclassifying Intent on Every Turn

**What people do:** Run the orchestrator LLM call on every message, always replacing the stored intent.
**Why it's wrong:** A user answering "presupuesto: 200k quetzales" will get reclassified as "generic" or misclassified because the message out of context looks different from the original intent signal.
**Do this instead:** Preserve intent when `validationState.status === 'pending'`. Only reclassify when the user explicitly changes topic (after validation completes).

### Anti-Pattern 3: Fetching Conversation History Inside Agents

**What people do:** Agents call `memoryService.load(sessionId)` themselves to get extra context.
**Why it's wrong:** Agents now depend on the database. They can't be unit-tested without mocking MongoDB. Side effects hidden inside agents.
**Do this instead:** Memory service is called ONLY in the pipeline function. All context is passed into agents as function arguments.

### Anti-Pattern 4: One Mega-Prompt Agent

**What people do:** Build one large agent that does classification + validation + data lookup + response generation in a single LLM call.
**Why it's wrong:** Brittle prompt engineering, hard to debug failures, can't highlight individual agents in the UI editor, scoring criteria for the hackathon explicitly rewards separate agents.
**Do this instead:** Keep agents as separate modules, each with a focused system prompt and single responsibility.

### Anti-Pattern 5: Blocking the SSE Stream for Memory Writes

**What people do:** `await memoryService.save()` before emitting `done`, blocking the client.
**Why it's wrong:** Client waits extra 50-200ms for DB write before stream closes.
**Do this instead:** Acceptable tradeoff here — saving before `done` ensures consistency. But do NOT do DB reads inside the stream after emitting has started.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google Gemini (LLM) | `@langchain/google-genai` ChatGoogleGenerativeAI | Use `gemini-1.5-flash` for speed; `gemini-1.5-pro` for quality if latency allows |
| MongoDB Atlas | Mongoose connection singleton (`db/connect.ts`) | Must cache connection in module scope for Vercel serverless cold-start performance |
| Static JSON data | Module-level import or `readFileSync` at startup | Cache in memory — no disk reads per request |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| H3 route ↔ Pipeline | Direct function call, SSEEmitter passed as arg | Route owns stream lifecycle; pipeline owns business logic |
| Pipeline ↔ Agents | Function arguments (ConversationContext in, ConversationContext out) | No shared globals, no imports between agents |
| Pipeline ↔ Memory | `load(sessionId)` / `save(sessionId, ctx)` | Called only at start and end of pipeline, not mid-flow |
| Agents ↔ LLM | LangChain.js ChatGoogleGenerativeAI.invoke() | Each agent instantiates its own LLM client (or shares a singleton) |
| Agents ↔ SSEEmitter | SSEEmitter callback passed into agents that stream (specialist, validator) | Agents that don't stream (orchestrator) don't receive the emitter |

---

## Build Order Implications

The dependency chain dictates this build order:

1. **MongoDB connection + Mongoose models** — everything else depends on persistence
2. **ConversationContext TypeScript types** — agents, memory, and pipeline all share this interface
3. **Memory service** (`load`/`save`) — pipeline cannot run without it
4. **SSE emitter helper** — route and pipeline need it before agents do
5. **H3 route skeleton** (`/api/chat` returning SSE headers + empty stream) — validates deployment works before agents are built
6. **Orchestrator agent** — simplest agent, just classification; proves LLM connectivity
7. **Generic agent** — second simplest, proves streaming works end-to-end
8. **Validator agents** (FAQ, Catalog, Schedule) — slot filling logic, depends on context types
9. **Specialist agents** (FAQ, Catalog, Schedule) — data integration, depends on JSON loader
10. **Flow store** (`/api/flow` GET/POST) — independent feature, can be built last

---

## Sources

- Google ADK multi-agent patterns: https://google.github.io/adk-docs/agents/multi-agents/ (HIGH confidence — official docs)
- H3 event handler docs: https://v1.h3.dev/guide/event-handler (MEDIUM confidence — official but SSE section incomplete)
- Nitro SSE POC (community): https://github.com/peerreynders/nitro-sse-counter (MEDIUM confidence — verified community example)
- LangChain.js agent patterns: https://docs.langchain.com/oss/javascript/langchain/agents (MEDIUM confidence — official docs)
- MongoDB chatbot schema: https://www.geeksforgeeks.org/mongodb/building-a-chatbot-with-mongodb-and-ai/ (MEDIUM confidence — verified against MongoDB community forum patterns)
- Slot filling pattern: https://docs.wingbot.ai/docs/conversationPatterns/slotFilling/slotFilling/ (MEDIUM confidence)
- SSE streaming LLM pattern: https://upstash.com/blog/sse-streaming-llm-responses (MEDIUM confidence)
- Multi-agent design patterns (InfoQ 2026): https://www.infoq.com/news/2026/01/multi-agent-design-patterns/ (MEDIUM confidence)
- Vercel SSE on Nitro: unconfirmed in official docs (LOW confidence — verify with `nitro.build/deploy` and Vercel function limits)

---

*Architecture research for: Multi-agent AI chatbot backend (car dealership, Analog.js/Nitro/H3)*
*Researched: 2026-02-28*
