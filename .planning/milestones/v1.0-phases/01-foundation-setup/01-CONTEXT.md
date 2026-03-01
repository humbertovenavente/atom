# Phase 1: Foundation & Setup - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold a running Analog.js app with @foblex/flow installed, a three-panel layout (sidebar | canvas | chat), shared TypeScript interfaces, and a mock Nitro backend that unblocks Phase 2-4 development. No business logic — just the foundation.

</domain>

<decisions>
## Implementation Decisions

### Panel Layout
- Three-panel layout: sidebar (left), canvas (center), chat (right)
- Claude's Discretion: panel proportions, fixed vs resizable, initial content in each panel
- Sidebar should show node types for drag-and-drop (style at Claude's discretion)
- Canvas should validate @foblex/flow renders without SSR errors
- Chat panel should have at minimum an input field and send button shell

### Visual Foundation
- Claude's Discretion: color scheme (dark/light), typography, spacing
- Claude's Discretion: specific node type colors (6 types need distinct colors)
- Claude's Discretion: node highlighting style for Phase 3 active-agent effect
- Should look professional and demo-ready for a hackathon presentation

### Type Interfaces
- Claude's Discretion: design types that cover Phase 2-4 needs without over-engineering
- Must export: FlowNode, FlowEdge, ChatMessage, AgentConfig from models/types.ts
- 6 node types: Memoria, Orquestador, Validador, Especialista, Genérico, Tool
- Claude's Discretion: whether type names in code use Spanish or English
- Claude's Discretion: how much metadata to include in ChatMessage (must support node highlighting in Phase 3)
- Claude's Discretion: alignment with backend contract vs frontend-only design

### Mock Backend
- Claude's Discretion: level of SSE simulation realism
- Must include node_active event per STATE.md contract: `{"type":"node_active","nodeId":"..."}`
- Claude's Discretion: full vs minimal SSE event set (token, message_complete, error)
- Claude's Discretion: timing delays between tokens
- Claude's Discretion: API route paths (production-matching vs mock-prefixed)

### Claude's Discretion
- All implementation details across all areas — user trusts Claude's judgment
- SSR must be disabled in vite.config.ts (existing decision from STATE.md)
- @foblex/flow installed via `ng add @foblex/flow` (existing decision from STATE.md)

</decisions>

<specifics>
## Specific Ideas

- Core value: "El editor visual muestra nodos iluminándose en tiempo real mientras el usuario chatea" — foundation must enable this
- SSE event contract with Persona B (backend): `{"type":"node_active","nodeId":"..."}` — mock against this shape
- Hackathon context: ~18 hours total, 4 phases, demo-ready output matters
- Reference files exist in files.zip (README.md, ARCHITECTURE.md, TIMELINE.md, TASKS.md, QUICKSTART.md)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — Phase 1 establishes all patterns

### Integration Points
- @foblex/flow: Angular flow library, install via `ng add @foblex/flow`. Confirmed "Angular 15+" but Angular 19 compat unverified. Fallback: ngx-vflow.
- Analog.js: File-based routing, Nitro API routes for mock backend
- Tailwind CSS: Styling framework
- files.zip: Reference architecture docs from hackathon organizers

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-setup*
*Context gathered: 2026-02-28*
