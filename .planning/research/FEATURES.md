# Feature Research

**Domain:** AI Agent Builder — Flow Editor + Chat Playground Frontend
**Researched:** 2026-02-28
**Confidence:** HIGH (flow editor features), MEDIUM (chat UX), MEDIUM (node highlighting)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any visual AI agent builder. Missing these makes the product feel broken or unfinished.

#### Flow / Node Editor

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Drag nodes from sidebar to canvas | Universal pattern in every node editor (n8n, Flowise, Langflow, ComfyUI) | LOW | @xyflow/angular provides this out of the box |
| Connect nodes with edges (handles) | The whole point of a flow editor — without this it's just a list | LOW | @xyflow/angular: output handles on source, input handles on target |
| Pan the canvas (click + drag empty area) | Standard in all editors; users expect infinite canvas navigation | LOW | Built into xyflow — no extra work |
| Zoom in/out (scroll wheel) | Users have different screen sizes; canvas must be navigable | LOW | Built into xyflow — no extra work |
| Select and move nodes (drag) | Rearranging nodes is fundamental workflow task | LOW | Built into xyflow — no extra work |
| Fit-to-view / reset viewport button | Users get lost in canvas; must be able to recover view | LOW | xyflow Controls component provides this |
| Delete nodes and edges | Required for iterating on a flow | LOW | Keyboard (Delete key) + button — xyflow supports both |
| Node type differentiation (color/icon) | Users must distinguish node roles at a glance | LOW | CSS classes / custom node templates per type |
| Node configuration panel (click-to-edit) | Clicking a node to configure it is the universal pattern (n8n, Flowise, Langflow) | MEDIUM | Right sidebar pattern; replaces full-screen modal |
| Prevent invalid connections | Users expect that incompatible handles can't connect | MEDIUM | xyflow `isValidConnection` callback |
| Animated edges during execution | Standard in Flowise and Langflow to show active flow | LOW | xyflow animated edge prop, CSS animation |

#### Chat Playground

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| User / assistant message bubbles | Universal chat pattern since WhatsApp; without this it's not a chat UI | LOW | Simple flex layout with conditional classes |
| Streaming response display | Users have been trained by ChatGPT; static wait-then-dump response feels broken | MEDIUM | SSE endpoint, EventSource, append-to-last-message pattern |
| Auto-scroll to latest message | Without this users must manually scroll every response | LOW | ViewChild + scrollIntoView or scrollTop on message container |
| Smart scroll disable on manual scroll-up | Without this, auto-scroll yanks users back while reading history | MEDIUM | Scroll event listener + flag: disable auto-scroll if user scrolled up |
| "Thinking" / typing indicator | Without this, blank wait time feels like a crash | LOW | Show animated dots or skeleton while awaiting first SSE token |
| Input field with send button | Minimum required to submit a message | LOW | Standard HTML form |
| Prevent double-send (disable while pending) | Without this users spam the send button and get multiple inflight requests | LOW | Disable input + button on submit |
| Clear indication of error state | SSE can disconnect; users must know something went wrong | LOW | Error message bubble or banner |
| Enter key to send | Universal chat UX expectation | LOW | Keydown event handler |

### Differentiators (Competitive Advantage)

These features align with the project's core value proposition and differentiate this demo from generic chat + canvas tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Real-time active node highlighting during chat | THIS is the demo moment — users see which agent node is currently processing; no other tool makes this as visceral | HIGH | Requires: SSE events include `nodeId` being processed; Angular service bridges SSE to flow state; xyflow node class/style update on active node |
| Node execution status badges (idle / active / done / error) | Makes the agent's thinking process visible and legible; Flowise shows this in traces but not on the canvas | MEDIUM | Per-node status enum; badge component inside custom node template |
| Edge pulse animation showing data flowing | Reinforces direction of data flow during execution | LOW | CSS keyframe animation on animated edges; pair with node highlighting |
| 6 semantically distinct node types with clear visual language | Flowise/n8n have 200+ generic node types; this project has 6 purpose-built ones for a specific domain — users understand instantly | LOW | Custom Angular node components per type; color + icon system |
| Automotive domain context in node configuration | "Prompt: Welcome to {{dealership_name}}" is more compelling than generic "System Prompt" | LOW | Placeholder text and labels in config panel |
| Split-view layout (canvas + chat side by side) | Langflow separates editor and playground into different views; having both visible at once makes the cause-effect relationship immediate | MEDIUM | CSS Grid: sidebar (node palette) | canvas | chat panel |
| Mock backend for demo independence | Not a user-facing feature, but critical for the hackathon: demo works even if backend isn't ready | MEDIUM | Angular service that replays SSE events from a fixed script |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem valuable but would consume hackathon time without improving the demo.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Undo / Redo (Ctrl+Z) | Standard in any editor; users expect it | Requires command pattern or full state history — 2-4 hours of implementation for non-demo value | Accept no undo; add "Reset flow" button that restores initial state |
| Flow save/load to backend | "Shouldn't I be able to save my work?" | Backend integration point outside frontend scope; adds API dependency for non-core demo feature | Hard-code the demo flow as the initial state; JSON export as future feature |
| Multiple simultaneous flows / tabs | Power user request | Complex routing and state management; zero demo value | Single flow; the demo flow IS the product |
| Collaborative editing (multi-user cursors) | Seen in Figma Weave and Freepik Spaces | WebSocket infrastructure + conflict resolution = weeks of work | Out of scope; not a hackathon differentiator |
| Custom edge templates | Requested by power users | ngx-xyflow beta explicitly lists this as unimplemented | Use built-in animated edges with color coding |
| Dark mode | "It looks more professional" | Theme system + color token audit = 2-4 hours; no demo value | Single light theme; accept limitation |
| Markdown rendering in chat | Modern chat UIs (LobeHub, Claude, ChatGPT) render markdown | ngx-marked or similar adds parsing complexity; SSE chunks arrive incomplete — mid-parse markdown is messy | Plain text responses for the demo; automotive answers don't need markdown |
| Message copy / regenerate / edit | ChatGPT has this; users expect it | Each is a separate interaction with state implications; none show agent visualization | Omit; focus UX budget on node highlighting which is unique |
| Voice input | "AI assistants should have voice" | Browser API complexity + microphone permissions + transcription = high risk | Text input only |
| Node palette search/filter | Useful when there are 100+ node types | This project has 6 node types — a filter is absurd | Scrollable palette of 6 clearly labeled nodes |

## Feature Dependencies

```
[SSE Streaming from Backend]
    └──required by──> [Chat streaming display]
                          └──required by──> [Smart auto-scroll]
                          └──required by──> [Typing indicator dismissal]
    └──required by──> [Real-time node highlighting]
                          └──required by──> [Node status badges]
                          └──required by──> [Edge pulse animation]

[Custom Angular Node Components]
    └──required by──> [Node type visual differentiation]
    └──required by──> [Node status badges inside node]
    └──enables──> [Node configuration panel content]

[Node configuration panel (right sidebar)]
    └──requires──> [Selected node state in FlowService]

[FlowService (Angular)]
    └──required by──> [Node highlighting]
    └──required by──> [Configuration panel]
    └──required by──> [Animated edge state]

[ChatService (Angular)]
    └──required by──> [SSE streaming]
    └──communicates with──> [FlowService] (to signal active node)

[Mock backend]
    └──enables──> [All SSE features without real backend]
    └──conflicts with──> [Real backend integration] (swap, not parallel)
```

### Dependency Notes

- **Node highlighting requires SSE event contract**: The SSE stream must emit `data: {"type":"node_active","nodeId":"llm-1"}` events. This must be agreed with Persona B (backend) before implementation — it's the critical interface contract.
- **Custom node components required before configuration panel**: The config panel renders content inside the selected custom node component or adjacent to it; generic nodes can't host this.
- **ChatService → FlowService coupling**: When a chat SSE event identifies an active node, ChatService must call FlowService to update state. This is the bridge that makes the demo moment work.
- **Mock backend unlocks parallel development**: Once the SSE event contract is agreed, mock backend can replay a scripted conversation with node events, letting frontend dev proceed independently.

## MVP Definition

### Launch With (v1 — Hackathon Demo)

Minimum viable product to deliver the demo moment.

- [ ] Canvas with 6 custom node types (drag, connect, pan, zoom) — establishes the visual model
- [ ] Animated edges between connected nodes — makes data flow visible at rest
- [ ] Chat panel: input, message bubbles, SSE streaming display, typing indicator — proves it's a real chat
- [ ] Smart auto-scroll (disable on manual scroll-up) — prevents jarring UX during streaming
- [ ] Real-time node highlighting during SSE execution — THIS IS THE DEMO; without it the product is just a chat with a pretty diagram beside it
- [ ] Node configuration panel: click a node, see its editable properties in right panel — shows it's a real builder
- [ ] Mock backend with scripted SSE replay — demo works even if backend isn't fully integrated

### Add After Validation (v1.x)

Add once core demo is working and time permits.

- [ ] Node execution status badges (idle/active/done/error) — enhances readability of highlighting
- [ ] Edge pulse animation synchronized with active node — enhances demo visual
- [ ] Keyboard shortcuts (Delete node, Escape to deselect) — reduces friction in live demo

### Future Consideration (v2+)

Defer entirely — not hackathon scope.

- [ ] Flow save/load — requires backend persistence
- [ ] Undo/redo — high implementation cost, zero demo value
- [ ] Markdown in chat — adds parsing complexity with minimal gain for automotive domain responses
- [ ] Multiple flow tabs — product decision, not MVP

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| SSE streaming chat display | HIGH | MEDIUM | P1 |
| Real-time node highlighting | HIGH | HIGH | P1 |
| Custom node types (6 types) | HIGH | MEDIUM | P1 |
| Drag/connect/pan/zoom canvas | HIGH | LOW | P1 |
| Typing indicator | HIGH | LOW | P1 |
| Smart auto-scroll | HIGH | LOW | P1 |
| Node configuration panel | HIGH | MEDIUM | P1 |
| Mock backend SSE replay | HIGH (for dev) | MEDIUM | P1 |
| Animated edges | MEDIUM | LOW | P2 |
| Node status badges | MEDIUM | LOW | P2 |
| Edge pulse on execution | MEDIUM | LOW | P2 |
| Keyboard shortcuts | LOW | LOW | P2 |
| Undo/redo | LOW | HIGH | P3 |
| Flow save/load | LOW (for demo) | HIGH | P3 |
| Markdown rendering | LOW | MEDIUM | P3 |
| Dark mode | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for hackathon demo
- P2: Add if time permits after P1 is solid
- P3: Out of scope for hackathon

## Competitor Feature Analysis

| Feature | Langflow | Flowise (AgentFlow V2) | n8n | This Project |
|---------|----------|------------------------|-----|--------------|
| Visual canvas | Drag+connect, pan/zoom | Drag+connect, pan/zoom | Drag+connect, pan/zoom | Same via @xyflow/angular |
| Node types | Generic (LLM, Agent, Tool, etc.) | 14 specialized nodes | 400+ connector nodes | 6 domain-specific automotive nodes |
| Playground | Separate tab/view from canvas | Separate tab/view | Separate "test" panel | SAME VIEW as canvas — key differentiator |
| Node execution visualization | Trace logs after run | Real-time via AgentFlow traces | Execution log sidebar | Real-time canvas highlighting — unique |
| Configuration panel | Click node → inline expand | Click node → inline expand | Click node → right modal | Click node → right sidebar panel |
| Streaming | Yes, SSE-based | Yes, SSE-based | Yes, SSE | Yes, SSE |
| Animated edges | No (static) | No (static) | No | Yes during execution |
| Mock/dev mode | No | No | No | Yes — critical for parallel dev |

**Key insight**: Every competitor separates the flow editor view from the chat/playground view. This project keeps them side-by-side, which is the UX that makes node highlighting pay off visually. This is the core differentiator.

## Sources

- [React Flow Feature Overview](https://reactflow.dev/examples/overview) — HIGH confidence (official docs)
- [ngx-xyflow GitHub (Angular wrapper)](https://github.com/knackstedt/ngx-xyflow) — HIGH confidence (official source); BETA status, missing custom edges
- [Flowise AgentFlow V2 Docs](https://docs.flowiseai.com/using-flowise/agentflowv2) — HIGH confidence (official docs); node types, SSE streaming, visual execution
- [Langflow Playground Docs](https://docs.langflow.org/concepts-playground) — HIGH confidence (official docs)
- [Langflow Visual Editor Docs](https://docs.langflow.org/concepts-overview) — HIGH confidence (official docs)
- [Conversational AI UI Comparison 2025 — IntuitionLabs](https://intuitionlabs.ai/articles/conversational-ai-ui-comparison-2025) — MEDIUM confidence (analysis article, multiple platforms)
- [n8n Editor UI Architecture](https://deepwiki.com/n8n-io/n8n-docs/2.2-editor-ui) — MEDIUM confidence (community docs)
- [Top 7 Node-Based AI Workflow Apps — Krea](https://www.krea.ai/articles/top-node-based-ai-workflow-apps) — MEDIUM confidence (platform review)
- [xyflow Discussion: Proper Angular wrapper](https://github.com/xyflow/xyflow/discussions/4887) — HIGH confidence (official repo discussion)
- [ZenML Langflow Alternatives Analysis](https://www.zenml.io/blog/langflow-alternatives) — MEDIUM confidence (vendor blog, verified against platform docs)

---
*Feature research for: AI Agent Builder Frontend — Analog.js + @xyflow/angular*
*Researched: 2026-02-28*
