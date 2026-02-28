# Project Research Summary

**Project:** Angular AI Agent Builder — Flow Editor + Chat UI (Hackathon Frontend)
**Domain:** Visual AI workflow editor with real-time chat playground (automotive domain)
**Researched:** 2026-02-28
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a hackathon frontend for an AI agent builder — a split-view interface with a visual node-based flow editor on the left and a streaming chat playground on the right. The core demo moment is real-time node highlighting on the canvas as the AI processes a chat message: the user sends a prompt, and the canvas lights up to show which agent node is currently executing. Every major competitor (Langflow, Flowise, n8n) separates the flow editor from the chat view; keeping them side-by-side is the primary differentiator and is what makes the node highlighting payoff visible.

The recommended stack is Angular 19 + Analog.js 2.x (meta-framework for SSR + Nitro API routes) + `@foblex/flow` (Angular-native flow library) + Tailwind CSS v4. A critical research finding is that `@xyflow/angular` — named in the project spec — does not exist as an npm package. The xyflow team only officially supports React and Svelte. The two viable Angular-native alternatives are `@foblex/flow` (recommended: `ng add` schematic, MIT, Feb 2026 release) and `ngx-vflow` (requires Angular 19.2.17+ for v2). Architecture uses Angular Signals-as-service-state with two root-level services (`FlowService`, `ChatService`) connected via a shared service call when SSE events identify an active node.

The primary risks are all known and mitigable: the wrong flow library getting installed (avoid by using `ng add @foblex/flow` on day one), SSR breaking the flow canvas (disable SSR in `vite.config.ts` for the hackathon), EventSource memory leaks (build teardown into the Observable constructor from the start), and canvas change detection lag under Zone.js (use `OnPush` + signals from the first custom node component). None of these risks are blockers if addressed proactively in the first phase.

## Key Findings

### Recommended Stack

Angular 19 + Analog.js 2.x is the right choice: Analog provides file-based routing, Nitro API routes, and a Vite build pipeline — everything needed to ship a frontend + mock backend in a single deployable unit without the ceremony of setting up a separate Express server. Tailwind CSS v4 with the `@tailwindcss/vite` plugin integrates directly into Analog's Vite config with zero configuration files. For SSE streaming, `ngx-sse-client` keeps the stream inside Angular's HttpClient/Observable pipeline and pairs cleanly with `toSignal()` for template reactivity.

The flow library decision is the highest-risk technical decision. `@foblex/flow@18.1.0` is the recommendation: it has an `ng add` Angular schematic that handles setup automatically, supports Angular 15+, is MIT-licensed, and had a release in February 2026. `ngx-vflow` is a viable alternative but requires Angular 19.2.17+ as a hard minimum for its v2.x line — confirm the exact Angular version from `npm create analog@latest` before choosing.

**Core technologies:**
- Angular 19: Framework — standalone components default, signals stable, required by Analog.js 2.x
- Analog.js 2.2.3: Meta-framework — file-based routing + Nitro API routes + Vite build in one unit
- `@foblex/flow` 18.1.0: Flow editor — Angular-native, MIT, `ng add` schematic, Feb 2026 release
- Tailwind CSS v4 + `@tailwindcss/vite`: Styling — zero-config with Analog.js Vite pipeline
- `ngx-sse-client` + `toSignal()`: SSE streaming — stays inside Angular DI + Observable pipeline
- RxJS 7.x (bundled): Async bridge — SSE is where RxJS still beats pure Signals

### Expected Features

The MVP is well-defined: 7 features that must exist to deliver the demo moment, 3 polish features to add if time permits, and a clear list of 10+ anti-features to skip. The central dependency is the SSE event contract with the backend — the stream must emit `{"type":"node_active","nodeId":"..."}` events, and this interface must be agreed before Phase 2 ends. The mock backend unlocks all SSE-dependent frontend work when the real backend is not ready.

**Must have (table stakes):**
- Canvas with 6 custom node types (drag, connect, pan, zoom) — establishes the visual model
- Chat panel: input, message bubbles, SSE streaming display, typing indicator
- Smart auto-scroll (disable on manual scroll-up) — prevents jarring UX during streaming
- Real-time node highlighting during SSE execution — the demo moment; without it the product is just a chat next to a diagram
- Node configuration panel — click a node, edit its properties in a right sidebar
- Mock backend with scripted SSE replay — demo works independently of backend readiness

**Should have (differentiators):**
- Node execution status badges (idle/active/done/error) — makes agent thinking visible
- Edge pulse animation synchronized with active node — reinforces data flow direction
- Keyboard shortcuts (Delete node, Escape to deselect) — reduces friction during live demo
- Empty canvas placeholder — prevents a blank first-load experience

**Defer (v2+):**
- Flow save/load — requires backend persistence API
- Undo/redo — command pattern implementation, 2-4 hours, zero demo value
- Markdown rendering in chat — parsing mid-SSE-stream markdown is messy; automotive responses don't need it
- Multiple flow tabs, dark mode, voice input — product decisions, not hackathon scope

### Architecture Approach

The architecture is a 3-panel Analog.js page (sidebar palette | flow canvas | chat panel) backed by two root-level Angular services. `FlowService` owns all flow graph state as signals (nodes, edges, activeNodeId, selectedNodeId). `ChatService` wraps EventSource in an Observable, accumulates streamed tokens into message signals, and calls `FlowService.setActiveNode()` when SSE delivers `node_active` events. Components never communicate directly — all state flows through services. The Analog Nitro API layer hosts mock endpoints during development and Persona B's real endpoints in production, making them swappable without frontend changes.

**Major components:**
1. `(editor).page.ts` — Root layout page; hosts all three panels, CSS grid structure
2. `NodeSidebarComponent` — Draggable node type palette; writes to FlowService only
3. `FlowCanvasComponent` — `@foblex/flow` canvas; renders nodes/edges from FlowService signals; applies active CSS class
4. `NodeConfigPanelComponent` — Right panel; appears when FlowService.selectedNode signal is non-null
5. `ChatPanelComponent` — Chat UI; reads ChatService signals; manages scroll behavior
6. `CustomNodeComponent` (x6) — One standalone component per node type: LLM, RAG, Router, Tool, Input, Output
7. `FlowService` — Single source of truth for flow state; signals-based, no RxJS
8. `ChatService` — SSE lifecycle management, message accumulation, cross-service FlowService calls

### Critical Pitfalls

1. **`@xyflow/angular` does not exist** — Install `@foblex/flow` via `ng add @foblex/flow` on day one. Never attempt `npm install @xyflow/angular`. Confirm package installs correctly before any feature work starts.

2. **SSR breaks the flow canvas** (`window is not defined`) — Disable SSR in `vite.config.ts` for the hackathon (`ssr: false`). The demo does not need SSR. This is the fastest resolution and eliminates the entire class of hydration issues.

3. **EventSource memory leak on component destroy** — Build the teardown function (`return () => source.close()`) into the Observable constructor in `ChatService` before writing a single consumer. Verify in the Network tab that connections close on navigation.

4. **Canvas change detection lag under Zone.js** — Use `ChangeDetectionStrategy.OnPush` on all custom node components from the start. Store positions and active-node state in Angular Signals. Do not mutate node objects in components.

5. **Chat auto-scroll fights user scroll** — Implement scroll with a `isScrolledToBottom` boolean flag from the first iteration. Only auto-scroll when the user is already at the bottom. Use `AfterViewChecked` — never `setTimeout` — to scroll after DOM updates.

## Implications for Roadmap

Based on the architecture's dependency chain and pitfall prevention requirements, a 4-phase structure is recommended.

### Phase 1: Foundation + Setup

**Rationale:** All pitfalls that can kill the entire project (wrong package, SSR breaking the canvas, Tailwind not injecting) must be resolved before any feature work starts. This phase produces a verified, working scaffold.
**Delivers:** Analog.js project with Tailwind v4, `@foblex/flow` installed and rendering a basic canvas, three-panel layout shell, TypeScript interfaces in `core/models/types.ts`, mock Nitro API routes returning hardcoded SSE events, SSR disabled.
**Addresses:** Canvas rendering (table stakes foundation), mock backend for dev independence
**Avoids:** Wrong package install, SSR window errors, Tailwind injection failures — all three are Phase 1 pitfalls

### Phase 2: Flow Editor

**Rationale:** `FlowService` must exist before `ChatService` because ChatService calls `FlowService.setActiveNode()`. The flow editor also requires the most library-specific setup (node type registration, drag-from-sidebar pattern) and should be built and verified before the chat panel adds complexity.
**Delivers:** `FlowService` with full signal state, all 6 custom node components with correct visual language, drag-from-sidebar working, node selection triggering `NodeConfigPanelComponent`, animated edges, `OnPush` on all node components.
**Uses:** `@foblex/flow`, Angular signals pattern, Tailwind node styling
**Implements:** FlowService, FlowCanvasComponent, NodeSidebarComponent, NodeConfigPanelComponent, 6 CustomNodeComponents
**Avoids:** Canvas lag (establish OnPush pattern here), node type misconfiguration (register in nodeTypes map)

### Phase 3: Chat + SSE Integration

**Rationale:** Depends on Phase 2 completing `FlowService.setActiveNode()`. The SSE contract with Persona B (backend) must be finalized before this phase — if it's not, the mock SSE route from Phase 1 unblocks all development.
**Delivers:** `ChatService` with Observable-wrapped EventSource and proper teardown, `ChatPanelComponent` with message bubbles and streaming display, typing indicator, smart auto-scroll, the `node_active` SSE event wiring to `FlowService.setActiveNode()`.
**Implements:** ChatService, ChatPanelComponent, MessageBubbleComponent
**Avoids:** EventSource leak (teardown in Observable constructor), auto-scroll fighting user, unthrottled SSE re-renders (buffer with `bufferTime(16)`)

### Phase 4: Integration, Polish, and Demo Hardening

**Rationale:** Only possible once all three panels are working. Polish and edge cases that make the difference between a working prototype and a compelling demo.
**Delivers:** Real backend swap (mock Nitro routes replaced by Persona B's API), node execution status badges, edge pulse animation synchronized with active node, error state handling (SSE disconnect), layout tested at 1280x720 (projector resolution), empty canvas placeholder.
**Addresses:** P2 features from FEATURES.md (badges, edge pulse, keyboard shortcuts), "looks done but isn't" checklist items
**Avoids:** Demo layout breaking at projector resolution, missing error states, node highlight with no edge animation (incomplete demo moment)

### Phase Ordering Rationale

- Phase 1 before everything: pitfall prevention at the library/infrastructure level; discovering `@foblex/flow` incompatibilities in Phase 2 would be catastrophic
- Phase 2 before Phase 3: `FlowService.setActiveNode()` is the interface that makes the demo moment work; ChatService cannot be completed without it
- Phase 3 before Phase 4: SSE integration is the highest-complexity feature; Polish must be built on top of a working integration, not alongside it
- SSE event contract (`node_active` with `nodeId`) must be agreed at the end of Phase 1 / start of Phase 2 — it is the critical interface between Persona A (frontend) and Persona B (backend)

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 2 (Flow Editor):** `@foblex/flow` is less documented than React Flow. The node type registration API, drag-from-external-source pattern, and `isValidConnection` callback need hands-on verification against the actual library API during task breakdown. The library's Feb 2026 release is recent — check the changelog for breaking changes from v17.x to v18.1.0.
- **Phase 3 (Chat + SSE):** The `node_active` SSE event contract is an interface with the backend (Persona B). If this contract changes, Phase 3 tasks need to be updated. The `ngx-sse-client` integration with `toSignal()` should be verified with a minimal spike before full `ChatService` implementation.

Phases with standard patterns (skip deeper research):

- **Phase 1 (Foundation):** Analog.js scaffold + Tailwind v4 + Vite plugin is a well-documented pattern. Instructions are in STACK.md verbatim. Execute without research.
- **Phase 4 (Polish):** CSS animations, status badge components, and error states are standard Angular UI patterns. No specialized research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Core choices (Angular 19, Analog.js, Tailwind v4) are HIGH — official docs confirmed. Flow library choice is MEDIUM — `@foblex/flow` Angular 19 compatibility inferred from "Angular 15+" claim, not directly tested. `ngx-sse-client` + `toSignal()` interop is MEDIUM — community-confirmed pattern. |
| Features | HIGH | Feature set derived from direct comparison against Langflow, Flowise, n8n official docs. MVP boundary is well-defined. Feature dependencies clearly mapped. |
| Architecture | MEDIUM-HIGH | Service pattern (signals-as-store) is HIGH — official Angular docs. Cross-service communication pattern is MEDIUM — consistent with multiple community sources. Specific `@foblex/flow` component API is MEDIUM — docs exist but Angular 19 integration not battle-tested. |
| Pitfalls | MEDIUM-HIGH | SSE teardown and Zone.js lag pitfalls are HIGH — official Angular docs. `@xyflow/angular` nonexistence is HIGH — confirmed via xyflow maintainer GitHub. SSR/xyflow conflict is MEDIUM — community-reported pattern. Auto-scroll timing is MEDIUM — widely documented in community. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **`@foblex/flow` Angular 19 compatibility:** The library claims "Angular 15+" but the version numbering convention (`18.x` = Angular 18 era) may mean Angular 19 compatibility was not explicitly tested by maintainers. Verify by running `ng add @foblex/flow` in Phase 1 and confirming a basic canvas renders before committing to the library. If it fails, fall back to `ngx-vflow` (requires confirming Angular version is 19.2.17+).
- **SSE event contract with Persona B (backend):** The `{"type":"node_active","nodeId":"..."}` event shape is assumed based on research of similar systems (Flowise, Langflow). The actual contract must be confirmed with Persona B before Phase 3. The mock backend in Phase 1 should implement this shape so frontend development proceeds against a stable contract.
- **`@foblex/flow` drag-from-external-source API:** The pattern for dragging a node type from `NodeSidebarComponent` onto the canvas (external drag source, not within-canvas drag) needs validation against the actual Foblex Flow docs during Phase 2 task breakdown. This is a documented pattern in React Flow but may have library-specific implementation in Foblex.

## Sources

### Primary (HIGH confidence)
- [Angular.dev — Signals overview](https://angular.dev/guide/signals) — signals API, `computed()`, `effect()`
- [Angular.dev — RxJS Interop `toSignal()`](https://angular.dev/ecosystem/rxjs-interop) — SSE-to-signal bridge pattern
- [Angular.dev — NgZone, ViewEncapsulation, takeUntilDestroyed](https://angular.dev/api/core/NgZone) — pitfall prevention
- [Analog.js Getting Started](https://analogjs.org/docs/getting-started) — scaffold commands, file-based routing
- [Foblex Flow GitHub](https://github.com/Foblex/f-flow) — v18.1.0, MIT, Angular 15+
- [xyflow GitHub Discussion #2012](https://github.com/xyflow/xyflow/discussions/2012) — confirms no `@xyflow/angular` package
- [Flowise AgentFlow V2 Docs](https://docs.flowiseai.com/using-flowise/agentflowv2) — node types, SSE streaming
- [Langflow Playground Docs](https://docs.langflow.org/concepts-playground) — feature comparison

### Secondary (MEDIUM confidence)
- [ngx-vflow GitHub](https://github.com/artem-mangilev/ngx-vflow) — v2.4.0 Feb 2026, Angular 19.2.17+ for v2
- [Tailwind + Analog.js + Vite discussion](https://github.com/tailwindlabs/tailwindcss/discussions/17716) — `@tailwindcss/vite` with Analog.js confirmed
- [AnalogJS 2.0 announcement — DEV Community](https://dev.to/analogjs/announcing-analogjs-20-348d) — Angular 17-20 support
- [Angular state management 2025 — Nx Blog](https://nx.dev/blog/angular-state-management-2025) — signals-as-service pattern
- [ngx-sse-client — npm](https://www.npmjs.com/package/ngx-sse-client) — HttpClient-based SSE Observable
- [Analog.js SSR production lessons](https://dev.to/dalenguyen/building-production-ready-ssr-applications-with-analogjs-lessons-from-techleadpilot-142a) — SSR pitfalls

### Tertiary (LOW confidence)
- [Angular component communication 2025 — DEV](https://dev.to/brianmtreese/how-angular-components-should-communicate-in-2025-523a) — cross-feature service pattern; consistent with official docs
- [Chat auto-scroll with AfterViewChecked](https://medium.com/helper-studio/how-to-make-autoscroll-of-chat-when-new-message-adds-in-angular-68dd4e1e8acd) — AfterViewChecked scroll pattern

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
