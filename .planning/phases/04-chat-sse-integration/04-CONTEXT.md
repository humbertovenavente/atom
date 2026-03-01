# Phase 4: Chat & SSE Integration - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the mock LLM response in `chat.post.ts` with real streaming Gemini/OpenAI calls and wire up the full agent pipeline — Memory → Orchestrator → Validator → Specialist — emitting SSE `agent_active` events per step and streaming `message_chunk` tokens token-by-token. The frontend (ChatComponent, ChatService, canvas highlighting) is **already complete**. This phase is entirely backend + wiring.

Creating or editing nodes, saving/loading flow configs, and "nueva conversación" button are Phase 5.

</domain>

<decisions>
## Implementation Decisions

### LLM Provider
- Use the `openai` npm package (already installed) with OpenAI-compatible API
- Read from env vars: `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` (already defined in `.env.example`)
- `@google/genai` is reserved for embeddings only — do NOT use it for chat LLM calls
- Streaming: use OpenAI's `stream: true` option → iterate chunks → emit as SSE `message_chunk` events

### Agent Pipeline Depth
- Implement the **full 4-step pipeline** in `chat.post.ts`:
  1. **Memory** (`emit agent_active memory processing/complete`) — load session history via `memoryService.load()`
  2. **Orchestrator** (`emit agent_active orchestrator processing/complete`) — use LLM to classify intent into: `faqs | catalog | schedule | generic`
  3. **Validator** (`emit agent_active validator processing/complete`) — check if required fields for the intent are collected; if fields are missing, ask the next question (don't call Specialist yet); if complete, proceed
  4. **Specialist** (`emit agent_active specialist processing/complete`) — LLM call with vector search context, streaming response via SSE `message_chunk`
- All 5 node types should light up across a full conversation flow
- `AGENT_NODE_MAP` in `chat.service.ts` already maps agent types to node IDs — do not change the frontend

### Validator Behavior (Multi-turn)
- Validator **blocks** response until required fields are collected for intent:
  - `schedule`: requires `fullName`, `preferredDate`, `preferredTime` (from `ScheduleValidationData` in types.ts)
  - `catalog`: requires `budget` and `vehicleType` (from `CatalogValidationData`)
  - `faqs` and `generic`: no required fields — pass through immediately
- When fields are missing: Validator responds with `nextQuestion` (streamed via `message_chunk`), saves partial `validationData` to memory, does NOT call Specialist
- When all fields collected: proceed to Specialist with the collected data
- `agentType` on the saved assistant message should reflect which agent produced the response (`validator` or `specialist`)

### Streaming Approach
- Stream at natural chunk boundaries from the OpenAI API (don't buffer or artificially chunk)
- Each `choices[0].delta.content` from the stream → immediately emit as SSE `message_chunk: { content: chunk }`
- Do NOT wait for full response before emitting

### Memory Persistence
- After each turn, save to MongoDB via `memoryService.save()` — already accepts `intent` and `validationData` update params
- Pass `agentType` alongside messages when saving so it's available on session restore
- `sessionId` is always provided by the client (created client-side before POST)

### Error Handling
- On LLM API error: emit `SSE error event` with user-friendly Spanish message
- On MongoDB error: emit error event, don't crash server
- No retries in Phase 4 (keep it simple)
- Partial responses: if stream breaks mid-way, the partial content already in the message is acceptable

### Claude's Discretion
- Exact system prompt wording for orchestrator intent classification
- Exact system prompt for specialist responses (automotive context is established)
- Whether to extract `agentType` from SSE events client-side or receive it in `message_chunk` data
- Orchestrator LLM model choice (can use a smaller/faster model for classification vs. full model for Specialist)
- How to handle the `tool` node type (no Tool agent defined yet — leave unimplemented)

</decisions>

<specifics>
## Specific Ideas

- The comment in `chat.post.ts` says `"LLM real en Fase 4"` — that mock block is the exact target to replace
- `systemPrompt` is already constructed in `chat.post.ts` from vehicle + FAQ vector search results — use it for the Specialist call
- `void systemPrompt;` line in current mock is a placeholder signal for Phase 4
- `ValidatorResult.nextQuestion` should be a complete sentence the user can read directly
- Streaming cursor (`█`) and typing indicator (animated dots) are already in `ChatComponent` — no frontend changes needed

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `memoryService` (`src/server/memory/memory.service.ts`): `load(sessionId)` and `save(sessionId, userMsg, assistantMsg, {intent, validationData})` — already handles MongoDB upsert
- `vectorSearchService` (`src/server/services/vector-search.service.ts`): `searchVehicles(query, k)` and `searchFAQs(query, k)` — already called in mock, keep as-is
- `createEmitter(res)` (`src/server/sse/emitter.ts`): returns typed `emit(eventName, data)` function — use throughout pipeline
- `openai` npm package: already installed, just needs import + client initialization

### Established Patterns
- SSE headers already set synchronously before any `await` in `chat.post.ts` — keep this pattern exactly
- `event.node.res.flushHeaders()` call is critical for Vercel buffering — keep it
- Angular Signals used throughout services — ChatService and FlowService are signal-based, no changes needed
- `AGENT_NODE_MAP` in `ChatService` maps `memory | orchestrator | validator | specialist | generic` to node IDs

### Integration Points
- `chat.post.ts` is the only file that needs significant changes for this phase
- `ChatService.handleSSEEvent()` already handles `agent_active`, `message_chunk`, `done`, `error` — backend must emit exactly these event names
- `FlowService.setActiveNode()` / `setCompletedNode()` / `clearCompletedNodes()` are called by ChatService — no changes
- Canvas `node--active` and `node--completed` CSS classes already applied in `canvas.component.html`
- `memoryService.save()` accepts optional `{intent, validationData}` update — use this to persist Orchestrator's classification

</code_context>

<deferred>
## Deferred Ideas

- Tool node actual execution (calling external APIs) — Phase 5 or future phase
- Retry logic for LLM failures — future phase
- Multi-model routing (different models per agent) — Claude's discretion for Phase 5
- Streaming validation feedback (show validation progress in UI) — Phase 5 if needed
- `validation_update` SSE event is defined in types but not yet used by frontend — implement in Phase 5 if needed

</deferred>

---

*Phase: 04-chat-sse-integration*
*Context gathered: 2026-03-01*
