# Phase 6: Chat Pipeline Fixes - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Rewire the chat backend to use vectorSearchService with a real LLM call (replacing the mock response), make all 5 agent node types illuminate during chat, and fix agent badge display on streamed messages. No new features — closing integration gaps so the E2E flow works demo-ready.

</domain>

<decisions>
## Implementation Decisions

### LLM Integration
- Use Google Gemini (gemini-2.0-flash) for chat responses — already installed (@google/genai), same LLM_API_KEY used for embeddings
- Replace the mock response in chat.post.ts (line 56) with a real Gemini streaming call
- The systemPrompt built from vectorSearch results (vehicles + FAQs) should be passed to the LLM as system instruction
- Stream the LLM response token-by-token via existing SSE emit('message_chunk') pattern

### Agent Node Illumination
- Simulate all 5 agent nodes lighting up in sequence for every message: Memory → Orchestrator → Specialist → Validator → Generic
- This looks impressive in the demo — all nodes activate even if some steps are lightweight
- Each agent emits processing/complete events in the correct order via SSE

### Agent Badge Display
- Set the agent badge on the streamed message when the generic (final responding) agent activates
- One badge per message — shows which agent produced the final response
- ChatService.handleSSEEvent needs to write agentType to the current assistant message when agent_active events arrive

### Claude's Discretion
- Exact Gemini API call parameters (maxTokens, topP, etc.)
- Timing/delays between agent illumination steps
- Error handling for LLM failures
- Whether to use Gemini streaming API or collect full response then emit chunks

</decisions>

<specifics>
## Specific Ideas

- The mock response on line 56 of chat.post.ts says "Fase 3 — LLM real en Fase 4" — this must be replaced with actual LLM output
- `void systemPrompt;` on line 59 should become the actual system instruction for Gemini
- The AGENT_NODE_MAP in chat.service.ts already maps all 5 types — frontend is ready, backend just needs to emit all 5

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `vectorSearchService` (src/server/services/vector-search.service.ts): Already imported and called in chat.post.ts — searchVehicles() and searchFAQs() working
- `@google/genai` SDK: Already installed, used for embeddings via `GoogleGenAI` class
- `createEmitter` (src/server/sse/emitter.ts): SSE emit pattern already working for agent_active, message_chunk, done, error events
- `AGENT_NODE_MAP` (src/app/services/chat.service.ts:10): Maps all 5 agent types to node IDs — frontend handling is complete
- `memoryService` (src/server/memory/memory.service.ts): Load/save conversation history already working

### Established Patterns
- SSE streaming via H3 event handler with flushHeaders()
- Agent events: emit('agent_active', { node, status }) pattern
- LLM_API_KEY environment variable for Gemini access
- Conversation memory persisted in MongoDB sessions

### Integration Points
- chat.post.ts lines 53-61: Mock response block to replace with real LLM call
- chat.post.ts lines 39-49: systemPrompt already built — needs to feed into Gemini
- ChatService.handleSSEEvent: agent_active case needs to also set agentType on current message
- All 5 agent types need emit() calls in the backend pipeline

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-chat-pipeline-fixes*
*Context gathered: 2026-03-01*
