# Roadmap: AI Agent Builder Frontend (Hackathon)

## Overview

Five phases deliver a working demo in ~18 hours: scaffold the Angular/Analog.js project with the correct flow library and three-panel layout, build a fully functional flow editor with custom nodes and FlowService, seed MongoDB Atlas with vectorized knowledge base data, wire up the chat panel with SSE streaming and live node highlighting, then lock in configuration controls and demo-critical polish. Each phase delivers a coherent, verifiable capability that the next phase builds on.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Setup** - Analog.js scaffold, @foblex/flow, Tailwind, 3-panel layout, types, MongoDB connection
- [x] **Phase 2: Flow Editor** - Custom nodes, drag & drop, edges, mini-map, zoom, FlowService
- [x] **Phase 3: Data & Backend** - Seed MongoDB Atlas con vector embeddings desde jsons/, API routes para vehicles/dates/FAQ, users & sessions (completed 2026-03-01)
- [ ] **Phase 4: Chat & SSE Integration** - Chat UI, streaming, typing indicator, node highlighting, ChatService
- [ ] **Phase 5: Configuration & Polish** - Config panel, save/load flow, reset/new chat buttons

## Phase Details

### Phase 1: Foundation & Setup
**Goal**: A running Analog.js app with the correct flow library installed, three-panel layout visible, TypeScript types defined, and MongoDB Atlas connection verified
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05
**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts without errors and the app loads in the browser at localhost
  2. The three-panel layout (sidebar | canvas | chat) is visible and fills the viewport
  3. A basic @foblex/flow canvas renders inside the center panel (no blank screen, no SSR window errors)
  4. `models/types.ts` exports FlowNode, FlowEdge, ChatMessage, AgentConfig, User, and Session interfaces
  5. MongoDB Atlas connection succeeds from a Nitro API route (verified with a health check endpoint)
**Plans**: Complete (3 summaries)

### Phase 2: Flow Editor
**Goal**: A fully functional flow canvas where users can view, drag, and connect custom nodes, with FlowService managing all graph state via Angular Signals
**Depends on**: Phase 1
**Requirements**: FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-06, FLOW-07, SERV-02
**Success Criteria** (what must be TRUE):
  1. All 6 custom node types render on the canvas with distinct colors and icons (Memoria, Orquestador, Validador, Especialista, Generico, Tool)
  2. A node can be dragged from the sidebar palette and dropped onto the canvas
  3. Nodes can be repositioned by dragging within the canvas; connections between nodes show animated edges
  4. The default flow with 8 pre-connected nodes loads automatically on page open
  5. Mini-map and zoom controls (+, -, fit view) are visible and functional
**Plans**: Complete (3/3 executed)

### Phase 3: Data & Backend
**Goal**: Los datos de jsons/ están cargados en MongoDB Atlas con vector embeddings para búsqueda semántica, las API routes sirven datos reales desde la DB, y hay un sistema básico de users/sessions
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):
  1. Los 3 JSONs (autos, dates, FAQ) están cargados como documentos en MongoDB Atlas con embeddings vectoriales
  2. Atlas Vector Search index está creado y funcional (una query semántica devuelve resultados relevantes)
  3. GET /api/vehicles devuelve autos desde MongoDB (no desde archivo estático)
  4. GET /api/dates devuelve slots disponibles desde MongoDB
  5. POST /api/sessions crea una sesión nueva y GET /api/sessions/:id la recupera con su historial
**Plans**: 4 plans
- [x] 03-01-PLAN.md — Mongoose models (Vehicle, FAQ, DateSlot) + seed script with Gemini embeddings + Atlas Vector Search indexes
- [x] 03-02-PLAN.md — API routes (vehicles, dates, sessions) + VectorSearchService for semantic search
- [x] 03-03-PLAN.md — Schema alignment (English field names), VectorSearchService fixes, session GET fix, chat.post.ts rewiring to MongoDB, delete static data layer
- [x] 03-04-PLAN.md — Gap closure: fix seed.ts field names + index name + LLM_API_KEY, create GET /api/faq route

### Phase 4: Chat & SSE Integration
**Goal**: A working chat playground where messages stream in token-by-token via SSE, and the corresponding flow nodes illuminate in real time as the agent executes — backed by real MongoDB data
**Depends on**: Phase 2, Phase 3
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, CHAT-06, SERV-01, SERV-03
**Success Criteria** (what must be TRUE):
  1. User can type a message, press send, and see their bubble appear on the right while the assistant response streams in on the left
  2. Text appears progressively during streaming — not all at once when complete
  3. A typing indicator (animated dots) is visible while the assistant is processing
  4. When a `node_active` SSE event arrives, the corresponding node on the canvas visually highlights; the highlight clears when processing moves on
  5. Auto-scroll follows new messages when the user is at the bottom; stops auto-scrolling when the user scrolls up
  6. La sesión de chat se persiste en MongoDB (sessions collection)
**Plans**: 2 plans
- [ ] 04-01-PLAN.md — npm install + memoryService agentType support + full 4-step LLM pipeline in chat.post.ts
- [ ] 04-02-PLAN.md — Dev server startup verification + human end-to-end verification checkpoint

### Phase 5: Configuration & Polish
**Goal**: Users can click any node to edit its configuration, persist the flow to the backend, reset to defaults, and start a new conversation — the app is demo-ready
**Depends on**: Phase 4
**Requirements**: CONF-01, CONF-02, CONF-03, CONF-04, CONF-05
**Success Criteria** (what must be TRUE):
  1. Clicking a node opens a configuration panel showing that node's editable properties (system prompt, temperature)
  2. The flow can be saved to the backend (POST /api/flow) and reloaded (GET /api/flow) without losing node positions or configuration
  3. "Reset Flow" returns the canvas to the default 8-node layout
  4. "Nueva Conversacion" clears the chat history and starts a fresh session (nueva session en MongoDB)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Setup | 3/3 | Done | Yes |
| 2. Flow Editor | 3/3 | Done | Yes |
| 3. Data & Backend | 4/4 | Done | 2026-03-01 |
| 4. Chat & SSE Integration | 1/2 | In Progress|  |
| 5. Configuration & Polish | 0/? | Not started | - |
