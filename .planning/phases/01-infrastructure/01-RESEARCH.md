# Phase 1: Infrastructure - Research

**Researched:** 2026-02-28
**Domain:** SSE streaming (Nitro/H3 on Vercel), MongoDB Atlas singleton connection, static JSON loading, TypeScript shared types
**Confidence:** MEDIUM-HIGH (SSE-on-Vercel specifics LOW; rest HIGH verified against official docs and prior project research)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**SSE Event Contract**
- Use the exact contract from ARCHITECTURE.md — Persona A is already coding against it
- Events: agent_active, message_chunk, validation_update, done, error
- message_chunk sends the full response as one chunk (not token-by-token streaming)
- agent_active includes node name and status (processing/complete)
- Phase 1 uses hardcoded/mock events to prove SSE works before real LLM calls

**JSON Data Files**
- faqs.json, catalog.json, schedule.json were provided at kickoff — will be shared by user
- Catalog should have 20-30 vehicles for realistic demo
- Files loaded at startup, cached in memory — no per-request disk I/O
- If files aren't available yet, create realistic placeholder data

**MongoDB Schema**
- Use ARCHITECTURE.md schema: sessionId (unique, indexed) + messages[] + validationData (Mixed) + currentIntent
- Two collections: conversations (chat state) and flows (editor config)
- TTL index: 7 days on updatedAt for conversations
- Mongoose with cached singleton connection pattern for serverless

**Error Handling**
- Friendly Spanish error messages: "Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo."
- Errors sent via SSE error event so frontend can display them in chat
- 1 retry on LLM call failure, then fail gracefully with error SSE event
- MongoDB connection errors fail fast with clear error event

### Claude's Discretion

- Exact SSE flush/buffering strategy for Vercel
- Mongoose schema options (timestamps, virtuals)
- Static JSON loading mechanism (import vs readFile vs embedded)
- TypeScript interface organization within types.ts

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | POST /api/chat endpoint accepts sessionId + message and returns SSE event stream | SSE pattern with h3 raw res.write; Nitro route file naming; setHeader synchronous before any await |
| INFRA-02 | SSE emits typed events: agent_active, message_chunk, validation_update, done, error | Typed SSEEmitter helper; named event format `event: X\ndata: Y\n\n`; mock pipeline for Phase 1 proof |
| INFRA-03 | MongoDB Atlas connection with cached singleton pattern for serverless | global._mongooseConn pattern; maxPoolSize: 3; bufferCommands: false; Mongoose 9.x |
| INFRA-04 | Static JSON data files loaded and accessible to specialist agents | Module-level import or readFileSync at startup; typed loader module; placeholder data strategy |
| INFRA-05 | TypeScript interfaces for all shared types (ChatRequest, ChatMessage, AgentType, FlowConfig, SSEEvent, etc.) | ARCHITECTURE.md contains the complete interface set; compile check via tsc --noEmit |
| MEM-01 | Memory service reads conversation history + validation state from MongoDB by sessionId | Mongoose findOne({ sessionId }) returning ConversationDocument; upsert on first access |
| MEM-02 | Memory service writes user message, assistant response, intent, and validation data after each turn | findOneAndUpdate with $set + $push on messages[]; confirmed pattern in ARCHITECTURE.md |
| MEM-04 | Validation state (collected fields, current intent) persists across turns without loss | validationData: Mixed + currentIntent: String in conversation schema; TTL on updatedAt |

</phase_requirements>

---

## Summary

Phase 1 is an infrastructure spike: prove the four foundations work on a deployed Vercel Preview URL before any LLM code is written. The four foundations are: (1) SSE streaming end-to-end from browser to Vercel, (2) MongoDB Atlas read/write with a serverless-safe singleton connection, (3) static JSON files loaded once at startup and accessible in-process, and (4) all shared TypeScript types compiling cleanly. Success means a hardcoded mock pipeline flowing through a real Vercel Preview URL — no agent logic, no LLM calls.

The critical unknown for this phase is whether h3's `createEventStream` works reliably on Vercel or whether raw `res.write()` is required. Prior project research (PITFALLS.md, STATE.md) flags this as LOW confidence and recommends a 30-minute spike at phase start. The fallback — raw `event.node.res.write()` — is confirmed to work by the ARCHITECTURE.md pattern already written for this project. The plan should treat this as a spike-then-choose decision, not an assumption.

MongoDB, static loading, and TypeScript types are high-confidence, well-precedented areas. The Mongoose singleton pattern is battle-tested on Vercel serverless. TypeScript interfaces are already fully defined in ARCHITECTURE.md and need only transcription into a `types.ts` file. The main execution risk in this phase is SSE buffering on Vercel; everything else is mechanical scaffolding.

**Primary recommendation:** Start the SSE spike first. Set the two SSE headers synchronously, call `res.flushHeaders()` immediately, write a hardcoded 3-event sequence, end the response. Deploy to Vercel Preview and open a browser EventSource. If events arrive in real time, proceed with `res.write()` pattern. Only then build MongoDB and JSON loading on top of the proven transport.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mongoose | ^9.x | MongoDB ODM, schema validation, connection caching | Mongoose 9 released Nov 2025; improved TS inference; schema catches malformed data early; faster than raw driver for hackathon cadence |
| h3 | bundled with Nitro | SSE delivery, request/response helpers | Already included via Analog.js/Nitro — zero install cost; `defineEventHandler`, `readBody`, `setHeader` are the documented API |
| typescript | ^5.4+ | Shared type definitions, compile-time safety | Required for `@langchain/core` v1.x; resolves type inference issues from TS 4.x |
| zod | ^3.23.8 | Schema validation (avoid v4) | CRITICAL: Zod v4 + Gemini + withStructuredOutput has open bug #8769; v3 works correctly |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mongodb | ^6.x | Native driver (peer dep for @langchain/mongodb) | Required by Mongoose 9 internally; also needed when @langchain/mongodb is added in later phases |
| @types/node | ^20 or ^22 | Node.js type definitions | Required for TypeScript compilation of Nitro server routes |
| uuid | ^9.x | Session ID generation | Phase 1 uses it for test session IDs; frontend will generate its own in production |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `event.node.res.write()` (raw) | h3 `createEventStream` | createEventStream is cleaner API but documented as experimental; raw write is lower-level but confirmed in Vercel production by PITFALLS.md research |
| Module-level `import` for JSON | `readFileSync` at startup | Both work; `import` is simpler and avoids path resolution issues in Nitro's bundled environment; `readFileSync` requires correct `__dirname` resolution |
| Mongoose singleton via global | Mongoose `connection.readyState` check only | `global._mongooseConn` pattern survives Vercel hot reloads; readyState-only is simpler but less resilient across container restarts |

**Installation:**
```bash
# Already in Analog.js: h3, nitro, typescript
# Phase 1 additions:
npm install mongoose mongodb
npm install -D @types/node
# uuid (if needed for test session generation)
npm install uuid
npm install -D @types/uuid
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── server/
│   ├── routes/
│   │   └── api/
│   │       ├── chat.post.ts        # POST /api/chat → SSE stream (Phase 1: mock pipeline)
│   │       ├── flow.post.ts        # POST /api/flow → save editor config (Phase 3)
│   │       └── flow.get.ts         # GET  /api/flow → load editor config (Phase 3)
│   ├── db/
│   │   └── connect.ts              # MongoDB singleton connection
│   ├── models/
│   │   ├── conversation.ts         # Mongoose Conversation schema + model
│   │   └── flow.ts                 # Mongoose Flow schema + model (stubbed for Phase 1)
│   ├── memory/
│   │   └── memory.service.ts       # load(sessionId) / save(sessionId, data)
│   ├── data/
│   │   ├── faqs.json               # Static FAQ data (placeholder until kickoff)
│   │   ├── catalog.json            # Vehicle catalog (placeholder, 20-30 vehicles)
│   │   ├── schedule.json           # Advisor availability (placeholder)
│   │   └── loader.ts               # Typed exports: faqsData, catalogData, scheduleData
│   └── sse/
│       └── emitter.ts              # Typed SSE emission helper
└── shared/
    └── types.ts                    # All shared TypeScript interfaces (from ARCHITECTURE.md)
```

### Pattern 1: SSE via Raw res.write (Recommended Starting Point)

**What:** Set SSE headers synchronously, call `res.flushHeaders()` immediately, then write named events using `event.node.res.write()` with the `event: X\ndata: Y\n\n` format.

**When to use:** This is the Phase 1 implementation. If the spike confirms `createEventStream` works reliably on Vercel, the implementation can be upgraded — but `res.write()` is the safe default.

**Example:**
```typescript
// src/server/routes/api/chat.post.ts
// Source: ARCHITECTURE.md (project doc) + PITFALLS.md research
import { defineEventHandler, readBody, setHeader } from 'h3';
import { connectDB } from '../db/connect';
import { memoryService } from '../memory/memory.service';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { sessionId, message } = body;

  // Set SSE headers SYNCHRONOUSLY before any await
  setHeader(event, 'Content-Type', 'text/event-stream');
  setHeader(event, 'Cache-Control', 'no-cache');
  setHeader(event, 'Connection', 'keep-alive');

  // Flush headers immediately — prevents Vercel buffering
  event.node.res.flushHeaders();

  const send = (eventName: string, data: unknown) => {
    event.node.res.write(
      `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`
    );
  };

  try {
    await connectDB();

    // Phase 1: Mock pipeline (hardcoded events proving SSE works)
    send('agent_active', { node: 'memory', status: 'processing' });
    const memory = await memoryService.load(sessionId);
    send('agent_active', { node: 'memory', status: 'complete' });

    send('agent_active', { node: 'orchestrator', status: 'processing' });
    // Phase 1: hardcoded response, no real LLM
    await new Promise((r) => setTimeout(r, 100)); // simulate processing
    send('agent_active', { node: 'orchestrator', status: 'complete' });

    const mockResponse = `Hola! Recibí tu mensaje: "${message}". (Respuesta simulada — Fase 1)`;
    send('message_chunk', { content: mockResponse });

    send('agent_active', { node: 'memory', status: 'processing' });
    await memoryService.save(sessionId, message, mockResponse);
    send('agent_active', { node: 'memory', status: 'complete' });

    send('done', { sessionId });
  } catch (error) {
    send('error', {
      message: 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo.',
    });
  } finally {
    event.node.res.end();
  }
});
```

### Pattern 2: MongoDB Singleton Connection

**What:** Cache the Mongoose connection in the Node.js global scope so it survives across Vercel warm function invocations. Set `maxPoolSize: 3` to stay within Atlas M0 limits under concurrent load.

**When to use:** Always — this is the only correct pattern for Mongoose on Vercel serverless. Do not create a new connection per request.

**Example:**
```typescript
// src/server/db/connect.ts
// Source: PITFALLS.md research (Vercel community + official Mongoose docs)
import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: typeof mongoose | null;
}

export async function connectDB(): Promise<void> {
  if (global._mongooseConn && mongoose.connection.readyState === 1) {
    return; // Already connected
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  global._mongooseConn = await mongoose.connect(uri, {
    maxPoolSize: 3,           // Stay within Atlas M0 limits under concurrent load
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,    // Fail fast — don't queue when disconnected
  });
}
```

### Pattern 3: Mongoose Conversation Model

**What:** Exact schema matching ARCHITECTURE.md + QUICKSTART.md. Uses `{ timestamps: true }` for auto createdAt/updatedAt, TTL index on updatedAt for 7-day cleanup.

**Example:**
```typescript
// src/server/models/conversation.ts
// Source: ARCHITECTURE.md schema + QUICKSTART.md pattern
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  agentType: { type: String, default: null },
});

const conversationSchema = new mongoose.Schema(
  {
    sessionId: { type: String, unique: true, index: true, required: true },
    messages: [messageSchema],
    validationData: { type: mongoose.Schema.Types.Mixed, default: {} },
    currentIntent: { type: String, default: null },
  },
  { timestamps: true }  // adds createdAt, updatedAt automatically
);

// TTL index: auto-delete conversations after 7 days of inactivity
conversationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 604800 });

export const Conversation =
  mongoose.models['Conversation'] ||
  mongoose.model('Conversation', conversationSchema);
```

### Pattern 4: Typed SSE Emitter

**What:** A factory function that returns a typed `emit` callback. Centralizes event format enforcement and avoids string typos for event names throughout the pipeline.

**Example:**
```typescript
// src/server/sse/emitter.ts
// Source: derived from ARCHITECTURE.md SSEEvent interfaces
import type { ServerResponse } from 'node:http';

export type SSEEventType =
  | 'agent_active'
  | 'message_chunk'
  | 'validation_update'
  | 'done'
  | 'error';

export type SSEEmitter = (eventName: SSEEventType, data: unknown) => void;

export function createEmitter(res: ServerResponse): SSEEmitter {
  return (eventName, data) => {
    res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
  };
}
```

### Pattern 5: Static JSON Loader

**What:** Load JSON files once at module initialization using `import` (Nitro bundles them) or `readFileSync` with process.cwd() path. Export typed constants so agents receive pre-loaded data as function arguments.

**When to use:** Always load at module level, never per request.

**Example:**
```typescript
// src/server/data/loader.ts
// Source: ARCHITECTURE.md pattern + FEATURES.md dependency notes

// Option A: ES import (preferred in Nitro — bundled at build time)
import faqsData from './faqs.json';
import catalogData from './catalog.json';
import scheduleData from './schedule.json';

// Export typed constants
export { faqsData, catalogData, scheduleData };

// Option B: readFileSync (if import fails due to Nitro config)
// import { readFileSync } from 'node:fs';
// import { resolve } from 'node:path';
// const faqsData = JSON.parse(readFileSync(resolve(process.cwd(), 'src/server/data/faqs.json'), 'utf-8'));
```

### Pattern 6: Memory Service

**What:** Two-function service (`load` and `save`) that is the ONLY code allowed to touch MongoDB conversation state. Agents receive context as plain objects; they never call this service directly.

**Example:**
```typescript
// src/server/memory/memory.service.ts
// Source: ARCHITECTURE.md + .planning/research/ARCHITECTURE.md
import { connectDB } from '../db/connect';
import { Conversation } from '../models/conversation';

export interface ConversationContext {
  sessionId: string;
  messages: Array<{ role: string; content: string; timestamp: Date; agentType?: string }>;
  validationData: Record<string, unknown>;
  currentIntent: string | null;
}

export const memoryService = {
  async load(sessionId: string): Promise<ConversationContext> {
    await connectDB();
    const doc = await Conversation.findOne({ sessionId });
    if (!doc) {
      return { sessionId, messages: [], validationData: {}, currentIntent: null };
    }
    return {
      sessionId: doc.sessionId,
      messages: doc.messages,
      validationData: doc.validationData ?? {},
      currentIntent: doc.currentIntent ?? null,
    };
  },

  async save(
    sessionId: string,
    userMessage: string,
    assistantResponse: string,
    update?: { intent?: string; validationData?: Record<string, unknown> }
  ): Promise<void> {
    await connectDB();
    await Conversation.findOneAndUpdate(
      { sessionId },
      {
        $push: {
          messages: {
            $each: [
              { role: 'user', content: userMessage, timestamp: new Date() },
              { role: 'assistant', content: assistantResponse, timestamp: new Date() },
            ],
          },
        },
        $set: {
          ...(update?.intent !== undefined && { currentIntent: update.intent }),
          ...(update?.validationData !== undefined && { validationData: update.validationData }),
        },
      },
      { upsert: true, new: true }
    );
  },
};
```

### Anti-Patterns to Avoid

- **Setting SSE headers after an await:** Any `await` before `setHeader` + `flushHeaders` causes Vercel to buffer the entire response. Headers MUST be set synchronously before the first async call.
- **Creating a new Mongoose connection per request:** Exhausts Atlas M0 connection limit (500 max) under concurrent demo load. Always use the global singleton pattern.
- **Loading JSON files per request:** Adds disk I/O latency to every chat request. Load once at module scope.
- **Using `mongoose.models.Conversation` without the `||` fallback:** In serverless hot reload, the model may already be registered. `mongoose.models['Conversation'] || mongoose.model(...)` prevents "Cannot overwrite model" errors.
- **Relying on `createEventStream` without a flushHeaders fallback:** h3's experimental SSE API may buffer on Vercel. Verify on a real Preview URL during the Phase 1 spike.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MongoDB connection pooling for serverless | Custom connection cache | `global._mongooseConn` + Mongoose singleton | Connection lifecycle, retry logic, pool management are all handled by Mongoose; hand-rolling misses edge cases around cold starts and partial disconnects |
| SSE event format serialization | Custom stream writer | `event.node.res.write()` with the standard `event: X\ndata: Y\n\n` format | SSE spec has specific line termination rules; hand-rolling risks malformed events that browsers silently discard |
| TypeScript interface definitions | Infer from runtime shapes | Transcribe from ARCHITECTURE.md verbatim | The interfaces are already designed and Persona A is coding against them; any deviation breaks the frontend contract |
| JSON file path resolution in Nitro | `__dirname` hacks | ES `import` (Nitro bundles JSON) or `process.cwd()` prefix | Nitro's bundled environment handles `__dirname` differently from Node.js; `import` is the safe path |

**Key insight:** Phase 1 has no novel engineering problems. Every component has a standard, well-documented solution. The value is in assembling them correctly and verifying end-to-end on Vercel — not in building clever abstractions.

---

## Common Pitfalls

### Pitfall 1: SSE Buffered on Vercel (Silent Failure)

**What goes wrong:** The browser opens an EventSource or fetch stream, the request hangs for the entire duration of the function, then all events arrive at once at the end — defeating the purpose of SSE.

**Why it happens:** Vercel wraps Lambda execution with response streaming infrastructure. Without an explicit `flushHeaders()` call, the response buffer holds until the handler returns. H3's `createEventStream` is documented as experimental and may not trigger flushing on all Vercel configurations.

**How to avoid:** Call `event.node.res.flushHeaders()` immediately after setting headers, before the first `await`. Test on a real Vercel Preview URL — not just locally with `npm run dev`. Local Nitro dev server does not replicate Vercel buffering behavior.

**Warning signs:**
- SSE works locally but no events appear on Vercel Preview until the function completes
- All events arrive simultaneously in the browser after a long delay
- Frontend EventSource fires `onmessage` for all events at once, not one at a time

**Recovery:** Switch from `createEventStream` to raw `res.write()` with explicit `flushHeaders()`. This is the pattern in ARCHITECTURE.md and is confirmed to work.

---

### Pitfall 2: MongoDB Connection Exhausted Under Concurrent Load

**What goes wrong:** Multiple simultaneous requests (e.g., two demo judges testing at the same time) each spawn a new Mongoose connection pool. Atlas M0 free tier allows 500 connections. With default `maxPoolSize: 5` and 10 concurrent Vercel invocations: 10 × 5 = 50 connections. Spikes can hit the limit and produce `MongoServerError: too many connections`.

**Why it happens:** Each Vercel function invocation runs in its own container. Without the global singleton pattern, the cached connection variable is not shared across containers.

**How to avoid:** Use `global._mongooseConn` pattern with `maxPoolSize: 3`. Check `mongoose.connection.readyState === 1` before reconnecting. Set `bufferCommands: false` to fail fast instead of queuing silently.

**Warning signs:**
- Works alone but crashes when 2+ people test simultaneously
- Intermittent `MongoServerError: too many connections` in Vercel function logs

---

### Pitfall 3: "Cannot overwrite model" on Nitro Hot Reload

**What goes wrong:** In development with hot module replacement (HMR), Mongoose model registration runs multiple times. The second registration throws: `OverwriteModelError: Cannot overwrite 'Conversation' model once compiled.`

**Why it happens:** Nitro re-executes module files on change. Mongoose's model registry is global and does not reset between hot reloads.

**How to avoid:** Always use the guard pattern:
```typescript
export const Conversation = mongoose.models['Conversation']
  || mongoose.model('Conversation', conversationSchema);
```

**Warning signs:** Server crashes on file save during development with `OverwriteModelError`.

---

### Pitfall 4: JSON Import Path Resolution Fails in Nitro Bundle

**What goes wrong:** `import faqsData from './faqs.json'` works locally but throws `Cannot find module` or returns `undefined` after `npm run build` because Nitro's bundler excludes the JSON file or resolves the path differently.

**Why it happens:** Nitro uses Rollup/esbuild internally. JSON imports are supported but require the file to be within the bundle scope. Files outside `src/` or in non-standard paths may be excluded.

**How to avoid:** Place JSON files inside `src/server/data/`. Use ES `import` syntax (Nitro bundles them). If bundling fails, fall back to `readFileSync(resolve(process.cwd(), 'src/server/data/faqs.json'))` — but test this path after `npm run build` not just `npm run dev`.

**Warning signs:** `undefined` data in production but correct data in development. `MODULE_NOT_FOUND` errors in Vercel function logs.

---

### Pitfall 5: TypeScript Compilation Fails Due to Missing tsconfig Settings

**What goes wrong:** Shared types in `types.ts` use features that require specific tsconfig options (`exactOptionalPropertyTypes`, `strict`, `moduleResolution`). Compilation succeeds locally but fails in Vercel's build step.

**Why it happens:** Analog.js creates a default tsconfig that may not match what the ARCHITECTURE.md interfaces assume (e.g., `interface FlowNode` uses optional fields that require `strict: true` to infer correctly).

**How to avoid:** Run `tsc --noEmit` as a build step and fix all errors before the first Vercel deploy. Keep all interfaces in a single `src/shared/types.ts` file so changes propagate to one place.

**Warning signs:** Vercel build log shows TypeScript errors that don't appear in local dev (which may skip type checking by default).

---

## Code Examples

Verified patterns from project documentation and prior research:

### SSE Named Event Format (Standard)

```typescript
// Standard SSE named-event format — browsers parse this correctly
// Source: SSE spec (RFC 8895) + ARCHITECTURE.md
const send = (eventName: string, data: unknown) => {
  event.node.res.write(
    `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`
  );
};

// Usage examples matching ARCHITECTURE.md contract:
send('agent_active', { node: 'memory', status: 'processing' });
send('message_chunk', { content: 'Hola, bienvenido...' });
send('validation_update', { collectedData: {}, missingFields: ['budget'] });
send('done', { sessionId: 'abc123' });
send('error', { message: 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo.' });
```

### MongoDB TTL Index Setup

```typescript
// src/server/models/conversation.ts
// Source: ARCHITECTURE.md "Índices recomendados" + MongoDB docs
// This MUST be set before the model is compiled — i.e., in the schema definition

// Index 1: fast lookup by sessionId
conversationSchema.index({ sessionId: 1 }, { unique: true });

// Index 2: TTL — MongoDB auto-deletes documents 7 days after last update
conversationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 604800 });

// NOTE: TTL index uses updatedAt (not createdAt) so active sessions are never
// deleted. With { timestamps: true }, Mongoose sets updatedAt on every save.
```

### Vercel Function Duration Config

```typescript
// src/server/routes/api/chat.post.ts
// Source: PITFALLS.md + Vercel docs (maxDuration for streaming routes)
// Must be a named export at module level — not inside the handler

export const config = {
  maxDuration: 60,  // seconds; Hobby plan max is 60s; Fluid Compute allows up to 300s
};

export default defineEventHandler(async (event) => {
  // ... handler
});
```

### Shared Types (Full Set from ARCHITECTURE.md)

```typescript
// src/shared/types.ts
// Source: ARCHITECTURE.md Section 2 — transcribe verbatim, these are the locked contracts

export interface ChatRequest {
  sessionId: string;
  message: string;
  flowConfig?: FlowConfig;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentType?: AgentType;
}

export type AgentType = 'memory' | 'orchestrator' | 'validator' | 'specialist' | 'generic';

export interface OrchestratorResult {
  intent: 'faqs' | 'catalog' | 'schedule' | 'generic';
  confidence: number;
  reasoning?: string;
}

export interface ValidatorResult {
  isComplete: boolean;
  collectedData: Record<string, unknown>;
  missingFields: string[];
  nextQuestion?: string;
}

export interface SpecialistResult {
  response: string;
  sources?: string[];
  recommendations?: unknown[];
}

export interface ConversationMemory {
  sessionId: string;
  messages: ChatMessage[];
  validationData: Record<string, unknown>;
  currentIntent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SSEEvent {
  event: 'agent_active' | 'message_chunk' | 'validation_update' | 'done' | 'error';
  data: unknown;
}

export interface AgentActiveEvent {
  node: AgentType;
  status: 'processing' | 'complete';
}

export interface MessageChunkEvent {
  content: string;
}

export interface ValidationUpdateEvent {
  collectedData: Record<string, unknown>;
  missingFields: string[];
}

export interface FlowConfig {
  flowId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  nodeConfigs: Record<string, NodeConfig>;
}

export interface FlowNode {
  id: string;
  type: 'memory' | 'orchestrator' | 'validator' | 'specialist' | 'generic' | 'tool';
  position: { x: number; y: number };
  data: { label: string; icon: string; color: string; config?: NodeConfig };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface NodeConfig {
  systemPrompt?: string;
  temperature?: number;
  toolSource?: string;
  validationFields?: string[];
}
```

### Analog.js Route File Naming Convention

```
src/server/routes/api/
├── chat.post.ts    → POST /api/chat
├── flow.post.ts    → POST /api/flow
└── flow.get.ts     → GET  /api/flow

File naming: [name].[method].ts
Methods: get, post, put, patch, delete
Source: QUICKSTART.md "Estructura de API Routes (Analog.js)"
```

### Placeholder JSON Data Structure

Since faqs.json, catalog.json, and schedule.json are not yet available, create placeholder files with minimal realistic structure:

```json
// src/server/data/catalog.json (placeholder — 3 vehicles, expand to 20-30 at kickoff)
[
  {
    "id": "rav4-2026-blanco",
    "brand": "Toyota",
    "model": "RAV4",
    "year": 2026,
    "type": "suv",
    "condition": "nuevo",
    "price": 185000,
    "employeePrice": 170000,
    "colors": ["Blanco", "Gris"],
    "inStock": true,
    "features": ["Motor 2.5L", "AWD", "Pantalla 10.5\""]
  }
]

// src/server/data/faqs.json (placeholder)
[
  {
    "id": "faq-horario",
    "question": "¿Cuál es el horario de atención?",
    "answer": "Atendemos de lunes a viernes de 8am a 6pm y sábados de 9am a 4pm.",
    "tags": ["horario", "atención"]
  }
]

// src/server/data/schedule.json (placeholder)
{
  "advisors": [
    {
      "id": "advisor-001",
      "name": "Carlos Méndez",
      "available": [
        { "date": "2026-03-02", "slots": ["09:00", "10:00", "14:00", "15:00"] },
        { "date": "2026-03-03", "slots": ["09:00", "11:00", "16:00"] }
      ]
    }
  ]
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `gemini-2.0-flash` model string | `gemini-2.5-flash` | Feb 2026 (2.0 deprecated, retires Mar 3, 2026) | API calls WILL fail after March 3 — use 2.5 now |
| Mongoose v8 | Mongoose v9 | Nov 2025 | 40% fewer manual TS type declarations; array virtuals; schema-level projections |
| `mongoose.connect()` with default pool | `mongoose.connect()` with `maxPoolSize: 3, bufferCommands: false` | Ongoing best practice for serverless | Required for Vercel serverless stability under concurrent load |
| Raw `JSON.parse()` on LLM output | LangChain `JsonOutputParser` or sanitizer | Ongoing — LLMs still wrap JSON in markdown | Required in Phase 2+; Phase 1 has no LLM calls so not yet relevant |
| `AgentExecutor` | LCEL chains with `withStructuredOutput` | LangChain v0.2+ | AgentExecutor is deprecated; matters starting Phase 2 |
| `zod v4` | `zod v3 (^3.23.8)` | Open bug as of Feb 2026 (GitHub #8769) | Do NOT upgrade to Zod v4 until the bug is resolved |

**Deprecated/outdated (do not use):**
- `gemini-2.0-flash`: Retires March 3, 2026. API calls fail after cutoff.
- Zod v4 with Gemini structured output: Open bug #8769 — use `^3.23.8`.
- `AgentExecutor`: Deprecated in LangChain — use LCEL pipe() chains instead.
- `@langchain/community` MongoDBChatMessageHistory: Moved to `@langchain/mongodb`.
- `RunnableBranch` for routing: Marked legacy — use conditional logic in pipeline instead.

---

## Open Questions

1. **Does h3 `createEventStream` flush on Vercel without `flushHeaders()`?**
   - What we know: PITFALLS.md research flagged this as LOW confidence; the community GitHub issue (h3 #903) shows Vercel-specific buffering problems with `createEventStream`; ARCHITECTURE.md uses raw `res.write()` which is the fallback
   - What's unclear: Whether a recent Nitro or h3 version has resolved the buffering issue; exact Nitro version shipped with the Analog.js scaffold
   - Recommendation: Spike first with raw `res.write()` + `flushHeaders()` (confirmed pattern), then evaluate `createEventStream` as an upgrade if desired. Do not assume it works — verify on Vercel Preview in the first 30 minutes of Phase 1.

2. **What is the exact Nitro/Analog.js version in the project scaffold?**
   - What we know: The project has not been scaffolded yet (no `src/` directory, no `package.json`); `npm create analog@latest` is the creation command from QUICKSTART.md
   - What's unclear: The exact version of Analog.js that will be scaffolded on the day, and whether its bundled Nitro version supports JSON imports from `src/server/data/`
   - Recommendation: After scaffolding, check `package.json` for `@analogjs/platform` version and cross-reference Nitro's JSON import support. Have the `readFileSync` fallback in the loader as a comment.

3. **What is the exact schema of faqs.json, catalog.json, schedule.json?**
   - What we know: Files.zip does not contain these files; they will be provided at hackathon kickoff; placeholder data must be created for Phase 1
   - What's unclear: The exact field names, nesting structure, and number of records
   - Recommendation: Create placeholder files with the minimal structures shown in Code Examples above. Design the `loader.ts` with generic `unknown[]` types until the real files arrive, then update the types without touching the loader logic.

---

## Sources

### Primary (HIGH confidence)
- ARCHITECTURE.md (project document) — SSE event contract, TypeScript interfaces, MongoDB schema, Vercel config
- QUICKSTART.md (project document) — Mongoose singleton pattern, API route file naming, SSE pattern
- .planning/research/STACK.md — version matrix, Zod v4 bug, gemini-2.5-flash migration
- .planning/research/PITFALLS.md — SSE buffering on Vercel, MongoDB connection exhaustion, Mongoose overwrite error
- .planning/research/ARCHITECTURE.md — project structure, pipeline patterns, anti-patterns

### Secondary (MEDIUM confidence)
- Vercel docs /docs/functions/limitations — 300s timeout with Fluid Compute confirmed
- mongoosejs.com/docs/guide.html — Mongoose 9.x confirmed current with TypeScript improvements
- GitHub issue h3 #903 — Vercel SSE buffering with createEventStream
- Vercel community discussion #424 — cached Mongoose connection pattern validated by community + Vercel engineers

### Tertiary (LOW confidence)
- h3 createEventStream working on Vercel — only community reports, not official Nitro/Vercel documentation; flagged as spike-required

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed in prior research; Mongoose, h3, TypeScript are stable and well-documented
- Architecture: HIGH — patterns directly from ARCHITECTURE.md and QUICKSTART.md which are project truth documents; SSE-on-Vercel is the only LOW area
- Pitfalls: MEDIUM-HIGH — SSE buffering confirmed by multiple GitHub issues; MongoDB exhaustion pattern is community-verified; Mongoose overwrite is standard knowledge

**Research date:** 2026-02-28
**Valid until:** 2026-03-14 (14 days — stable libraries; Vercel SSE behavior may change with Nitro updates)

**Key constraint for planner:** Phase 1 MUST include a spike task as the first task: deploy a minimal SSE endpoint to Vercel Preview and verify real-time event delivery in a browser before building MongoDB or JSON loading on top of it. This is the only unknown that cannot be resolved by research alone.
