# Phase 4: Chat & SSE Integration - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

A working chat playground where messages stream in token-by-token via SSE, and the corresponding flow nodes illuminate in real time as the agent executes — backed by real MongoDB data. Creating new node configurations and save/load/reset functionality belong in Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Chat bubble design
- Agent-tagged bubbles: user messages on the right, assistant messages on the left with a small badge indicating which agent type responded (Memoria, Orquestador, Validador, Especialista, etc.)
- Markdown rendering enabled for assistant responses — bold, lists, inline code, since specialist agents return structured info (vehicle specs, date options)
- No timestamps displayed on messages — clean, minimal look
- No avatars — text-focused bubbles

### Streaming UX
- Typing indicator: three animated dots in an assistant bubble, shown immediately when user sends a message, replaced by streamed text once tokens arrive
- Blinking cursor (█ or |) at the end of streaming text while tokens are arriving — ChatGPT-style "typing" feel
- Input field and send button disabled while assistant is streaming — prevents interleaved messages
- No "stop generating" button — let responses stream to completion (demo responses should be fast)

### Node highlighting
- Active node gets a colored glow (box-shadow) matching the node's own color (purple for Memoria, blue for Orquestador, green for Validador, etc.) with a subtle pulse animation
- Animated flow on edges: the edge connecting the previous node to the next one lights up / animates as processing "travels" between nodes — visible pipeline flow
- After a node finishes processing (status: 'complete'), it fades to a dimmed "completed" state before returning to normal — shows pipeline progress trail
- Glow color matches each node's identity color, reinforcing the visual connection between chat agent badges and canvas nodes

### Session lifecycle
- Session auto-created on first message — no explicit "start" action, zero friction
- Session ID hidden from user — managed behind the scenes
- Restore last session on page reload: fetch previous messages from MongoDB and display them (store sessionId in localStorage)
- Empty state shows welcome message ("¡Hola! Soy tu asistente de Volkswagen...") + 3-4 suggestion chips ("Ver catálogo", "Agendar cita", "Preguntas frecuentes") that auto-fill the input field

### Claude's Discretion
- Agent badge visual style (colored dot + label vs. emoji + label — optimize for visual connection to flow nodes)
- Exact pulse animation timing and easing
- Edge animation technique (CSS or @foblex/flow API — whatever the library supports best)
- Dimmed/completed node visual treatment details
- Welcome message exact copy and suggestion chip wording
- Auto-scroll implementation details (scroll-to-bottom behavior)

</decisions>

<specifics>
## Specific Ideas

- Node highlighting with per-node colors is the hero feature — judges should immediately see which agent is "thinking" on the canvas while the chat streams
- The pipeline trail (dimmed completed nodes + animated edges) creates a visual story of how the AI processed the request
- Suggestion chips in the empty state let judges explore different intents (catalog, appointments, FAQs) without needing to type — great for a live demo
- Session restoration shows persistence capability — a strong technical demo point

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FlowService.activeNodeId` signal + `setActiveNode()`: Already wired — canvas template has `[class.node--active]` and `[class.edge--active]` CSS class bindings
- `SSE emitter` (src/server/sse/emitter.ts): Server-side SSE with `agent_active`, `message_chunk`, `validation_update`, `done`, `error` event types
- `chat.post.ts`: Mock pipeline already emits SSE events (memory → orchestrator → mock response → memory save)
- Shared types: `ChatMessage`, `SSEEvent`, `AgentActiveEvent`, `MessageChunkEvent`, `ChatRequest` all defined
- `Conversation` Mongoose model: messages, validationData, sessionId with TTL index
- `memoryService`: load/save conversation turns to MongoDB

### Established Patterns
- Angular Signals for state management (FlowService uses `signal()` throughout)
- Standalone components with Tailwind CSS utility classes
- Nitro/h3 API routes for backend
- HttpClient injected via `inject()` pattern

### Integration Points
- ChatService (new) → FlowService.setActiveNode() for node highlighting
- ChatService (new) → EventSource API for SSE consumption on the frontend
- ChatComponent → ChatService for sending messages and receiving streams
- localStorage for sessionId persistence across reloads
- GET /api/sessions/:id endpoint exists for restoring session history

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-chat-sse-integration*
*Context gathered: 2026-03-01*
