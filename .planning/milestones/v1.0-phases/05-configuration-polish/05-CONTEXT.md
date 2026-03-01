# Phase 5: Configuration & Polish - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can click any node to edit its configuration, persist the flow to the backend, reset to defaults, and start a new conversation. The app becomes demo-ready. No new node types, no new chat features, no new agent capabilities — just configuration controls and action buttons on top of the existing flow editor and chat.

</domain>

<decisions>
## Implementation Decisions

### Config Panel Placement & UX
- Config panel replaces the sidebar: clicking a node swaps the sidebar from node palette to config form
- 3-column grid layout stays intact (240px | 1fr | 360px) — no extra panels or overlays
- Click node to open config, explicit X/close button to return to palette. Clicking another node switches config to that node
- Selected node gets a colored border/glow on the canvas while its config is open (differentiated from active-node highlight during chat)
- Config changes apply live/immediately as user types or adjusts — no save button inside the config panel itself

### Save/Load Flow Behavior
- Explicit "Guardar" button to persist the flow to the backend (not auto-save)
- On page load, if a saved flow exists in MongoDB, load it instead of the default. Falls back to default 8-node flow if nothing saved
- Save everything: node positions, connections, AND node configurations (system prompts, temperatures) — full state round-trip
- Storage: MongoDB 'flows' collection in the existing atom_knowledge database (consistent with rest of app)

### Action Buttons Layout
- Toolbar above the canvas: horizontal bar containing "Guardar", "Reset Flow" buttons. "Nueva Conversacion" goes in the chat panel header
- Each button near its relevant context area (flow buttons near canvas, chat button near chat)
- "Reset Flow" shows a simple confirm dialog before resetting ("¿Restablecer el flujo al default?" with Confirmar/Cancelar)
- "Nueva Conversacion" clears chat messages, creates new MongoDB session, AND clears active/completed node highlights on canvas — clean slate
- Ghost/outline button style: subtle borders, no fill, matches the dark theme without competing with main UI

### Editable Node Properties
- All node types get systemPrompt (textarea) + temperature (slider) as editable fields
- toolSource and validationFields left for future phases — keep it simple
- Temperature control: range slider 0.0–2.0 with current value displayed next to it
- Panel header shows emoji icon + node label + colored type badge — clear which node is being edited
- Nodes come pre-filled with sensible default system prompts per type (e.g. orchestrator: intent classification, specialist: domain expertise, etc.)

### Claude's Discretion
- Exact default system prompt text per node type
- Slider step precision (0.1 vs 0.05)
- Toolbar styling details and spacing
- Confirm dialog implementation (native vs custom)
- Error handling for save/load failures
- Animation/transition when sidebar swaps between palette and config

</decisions>

<specifics>
## Specific Ideas

- Config panel should feel like editing settings in a professional tool — clean form, dark theme, not cluttered
- The "Guardar" button should give visual feedback on success (brief flash or checkmark)
- Default flow is the 8-node layout already hardcoded in flow.get.ts — "Reset Flow" should restore exactly this

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FlowService` (src/app/services/flow.service.ts): Already has `selectedNodeId` signal and `setSelectedNode()` method — ready for config panel trigger
- `ChatService.startNewSession()` (src/app/services/chat.service.ts:175): Already clears messages, resets session, removes localStorage — ready for "Nueva Conversacion" button
- `NodeConfig` interface (src/shared/types.ts:112): Already defines systemPrompt, temperature, toolSource, validationFields
- `FlowConfig` interface (src/shared/types.ts:85): Already defines flowId, nodes, edges, nodeConfigs — ready for save/load payload
- Default 8-node flow (src/server/routes/api/flow.get.ts): Hardcoded nodes and edges — source of truth for reset

### Established Patterns
- Angular standalone components with signals (not RxJS Observables)
- Tailwind CSS dark theme (bg-gray-900, text-white, border-gray-700)
- Nitro API routes with H3 defineEventHandler
- MongoDB via Mongoose models in src/server/models/
- 3-column grid layout in index.page.ts

### Integration Points
- `FlowService.selectedNodeId` signal exists but no node click handler in canvas yet — needs click event on nodes
- POST /api/flow route does not exist — needs to be created alongside Mongoose Flow model
- GET /api/flow currently returns hardcoded data — needs to check MongoDB first, fall back to hardcoded default
- Sidebar component needs conditional rendering: palette mode vs config mode based on selectedNodeId
- Chat component header needs "Nueva Conversacion" button added
- Page layout (index.page.ts) may need a toolbar row above the canvas

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-configuration-polish*
*Context gathered: 2026-03-01*
