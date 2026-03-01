---
phase: 05-configuration-polish
plan: 01
subsystem: ui
tags: [angular, signals, flow-service, node-config, sidebar, foblex]

# Dependency graph
requires:
  - phase: 02-flow-editor
    provides: FlowService with selectedNodeId signal, canvas click handler, foblex node structure
  - phase: 04-chat-sse-integration
    provides: Established standalone component patterns with Angular signals

provides:
  - NodeConfigPanelComponent with systemPrompt textarea and temperature slider
  - FlowService.updateNodeConfig() for live node config edits
  - FlowService.saveFlow() and resetFlow() ready for Plan 02 backend wiring
  - FlowService.saveStatus signal for save button feedback
  - Signal-driven sidebar swap: palette when no node selected, config panel when node selected
  - node--selected CSS class for visual indicator on canvas (dashed outline, distinct from active pulse)
  - Click vs drag guard in CanvasComponent preventing config panel on drag

affects: [05-02-save-load-flow, chat-component]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Signal-driven conditional rendering via @if(flowService.selectedNodeId())
    - input.required<string>() signal input for NodeConfigPanel nodeId
    - computed() signals for derived node data (emoji, currentPrompt, currentTemp)
    - (input) event handlers calling service methods directly (not ngModel)
    - Private _isDragging flag with setTimeout reset to distinguish click from drag

key-files:
  created:
    - src/app/components/node-config-panel/node-config-panel.component.ts
  modified:
    - src/app/services/flow.service.ts
    - src/app/components/canvas/canvas.component.ts
    - src/app/components/canvas/canvas.component.html
    - src/app/components/sidebar/sidebar.component.ts
    - src/styles.css

key-decisions:
  - "Config stored in node.data.config (embedded per node), not top-level nodeConfigs map — avoids sync issues on save/load"
  - "resetFlow() calls GET /api/flow?default=true — Plan 02 implements backend query param to bypass MongoDB lookup"
  - "saveFlow() uses raw fetch() (not HttpClient) — consistent with ChatService SSE pattern"
  - "node--selected uses outline + box-shadow, NOT animation — visually distinct from node--active pulse animation"
  - "SidebarComponent migrated from *ngFor/NgFor to @for modern control flow while touching the file"

patterns-established:
  - "NodeConfigPanel pattern: input.required + computed signals + (input) events calling service.updateConfig()"
  - "Drag guard pattern: _isDragging flag set in onMoveNodes, cleared via setTimeout(0) to let click event fire first"

requirements-completed: [CONF-01]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 05 Plan 01: Node Configuration Panel Summary

**Signal-driven sidebar swap with NodeConfigPanelComponent — click any canvas node to edit systemPrompt and temperature with live FlowService updates**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T18:53:31Z
- **Completed:** 2026-03-01T18:55:31Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created NodeConfigPanelComponent with systemPrompt textarea (8 rows) and temperature range slider (0–2, step 0.1), DEFAULT_PROMPTS per node type in Spanish
- Extended FlowService with updateNodeConfig(), saveFlow(), resetFlow(), saveStatus signal
- SidebarComponent now conditionally renders NodeConfigPanel (when node selected) or node palette (when none selected) via @if signal check
- Canvas CanvasComponent guards click events with _isDragging flag to prevent config panel opening after drag operations
- Added .flow-node.node--selected CSS class with dashed outline distinct from active-node pulse animation

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend FlowService + add node--selected CSS** - `b985cf1` (feat)
2. **Task 2: Create NodeConfigPanel + wire SidebarComponent swap** - `50f93c3` (feat)

**Plan metadata:** (docs commit — created below)

## Files Created/Modified
- `src/app/components/node-config-panel/node-config-panel.component.ts` - New standalone component with signal inputs, computed derived state, live update handlers
- `src/app/services/flow.service.ts` - Added updateNodeConfig(), saveFlow(), resetFlow(), saveStatus signal; imported NodeConfig type
- `src/app/components/canvas/canvas.component.ts` - Added _isDragging flag, onMoveNodes sets/clears it, onNodeClick() guards setSelectedNode
- `src/app/components/canvas/canvas.component.html` - Added [class.node--selected] binding, changed (click) to onNodeClick()
- `src/app/components/sidebar/sidebar.component.ts` - Inject FlowService, @if/@else swap, NodeConfigPanelComponent import, @for migration
- `src/styles.css` - Added .flow-node.node--selected CSS class

## Decisions Made
- Config stored in `node.data.config` (embedded per node) so save payload is self-contained — avoids the top-level `nodeConfigs` sync pitfall documented in RESEARCH.md
- `resetFlow()` calls GET `/api/flow?default=true` — Plan 02 will implement the `?default=true` query param server-side to bypass MongoDB lookup
- `saveFlow()` uses raw `fetch()` matching the ChatService SSE pattern rather than HttpClient
- Sidebar migrated from `*ngFor`/`NgFor` to modern `@for` control flow while modifying the component

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. TypeScript compiled cleanly (tsconfig.app.json) after each task. Dev server confirmed app loads at localhost.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- NodeConfigPanel and FlowService methods are ready for Plan 02 (save/load flow to MongoDB)
- `saveFlow()` POSTs to `/api/flow` — Plan 02 needs to create the Nitro route and Mongoose Flow model
- `resetFlow()` calls GET `/api/flow?default=true` — Plan 02 needs to handle the `?default=true` query param
- FlowService.saveStatus signal ready for the Guardar button in the toolbar (Plan 02)

## Self-Check: PASSED

- node-config-panel.component.ts: FOUND
- flow.service.ts: FOUND (updateNodeConfig, saveFlow confirmed)
- sidebar.component.ts: FOUND (selectedNodeId conditional confirmed)
- styles.css: FOUND (node--selected confirmed)
- 05-01-SUMMARY.md: FOUND
- Commit b985cf1: FOUND
- Commit 50f93c3: FOUND

---
*Phase: 05-configuration-polish*
*Completed: 2026-03-01*
