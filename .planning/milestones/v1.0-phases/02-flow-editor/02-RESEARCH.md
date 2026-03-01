# Phase 2: Flow Editor - Research

**Researched:** 2026-03-01
**Domain:** @foblex/flow + Angular Signals + drag-and-drop canvas
**Confidence:** HIGH (existing POC in codebase confirms API; decisions locked from CONTEXT.md)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Node visual design:**
- Rectangular card with visible input/output ports on sides (React Flow style)
- Each node shows: icon (emoji via icon map), label, subtle background color based on type
- The 6 colors in NODE_TYPE_CONFIGS used as background/border
- All nodes same size for clean canvas
- Active node highlight: bright border with animated glow/shadow (subtle pulse) using type color

**Sidebar drag & drop:**
- Ghost/preview visual during drag from sidebar to canvas
- Node drops at mouse-release position
- No auto-connect — user connects manually by dragging between ports
- Sidebar already has `draggable="true"` — needs `dragstart` with node type data

**Edge animations:**
- Animated dashed lines with CSS flow animation
- When a node is active, connected edges also illuminate
- Normal state: subtle gray; active state: bright

**Canvas controls:**
- Mini-map in bottom-right corner of canvas
- Zoom controls: +, -, fit view in bottom-left
- Use @foblex/flow native directives for mini-map and zoom

**FlowService (state management):**
- Angular Signals for all state: nodes signal, edges signal, activeNodeId signal, selectedNodeId signal
- Load default flow from GET /api/flow on init
- Service is single source of truth — canvas reads from service, no local state

### Claude's Discretion
- Exact node size (px)
- Port spacing
- Exact CSS animation style for edges
- Mini-map implementation (@foblex/flow built-in vs custom)
- Wheel zoom behavior (enabled/disabled)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FLOW-01 | 6 custom node types rendered on canvas with distinct colors and icons | NODE_TYPE_CONFIGS drives rendering; fNode directive + custom template per type |
| FLOW-02 | Nodes are draggable on canvas (repositionable with mouse) | fDraggable + fDragHandle directives — already working in POC |
| FLOW-03 | Edges/connections between nodes with flow animation | f-connection + CSS @keyframes dashoffset animation on stroke-dasharray |
| FLOW-04 | Default flow pre-loaded with 8 connected nodes | FlowService loads GET /api/flow; maps response to nodes/edges signals |
| FLOW-05 | Mini-map showing canvas overview | f-minimap or fMinimap directive from @foblex/flow FFlowModule |
| FLOW-06 | Zoom controls (+, -, fit view) | @foblex/flow FZoomModule or built-in zoom directives |
| FLOW-07 | Sidebar with draggable nodes to canvas (external drag & drop) | HTML5 dragstart on sidebar cards; canvas dropzone handles fExternalItem or manual drop |
| SERV-02 | FlowService with editor state (nodes, edges, activeNodeId, selectedNodeId) using signals | Angular signal(), computed(), inject(HttpClient) for API load |
</phase_requirements>

---

## Summary

Phase 2 builds on a working @foblex/flow POC (2 hardcoded nodes with 1 connection). The existing canvas.component.ts and canvas.component.html already use fNode, fDragHandle, fNodeOutput, fNodeInput, f-connection, and fDraggable directives correctly. The task is to: (1) create FlowService with Angular Signals, (2) replace hardcoded nodes with data-driven rendering from the service, (3) implement 6 custom node templates, (4) wire sidebar drag to canvas drop, (5) add mini-map and zoom controls.

The key architectural insight is that @foblex/flow uses Angular directives rather than component-per-node — you render *ngFor over nodes and apply fNode/fDragHandle to each. This means custom node templates are just divs with directives, not custom components. The signal-based FlowService feeds directly into the template via signal reads in `ngFor`.

Edge animation is purely CSS: @foblex/flow renders SVG paths for f-connection elements; CSS targeting those SVG paths with stroke-dasharray + @keyframes achieves the "flowing data" effect.

**Primary recommendation:** Build FlowService first (signals + HTTP load), then refactor canvas to data-driven ngFor, then add node styles, then wire sidebar drop, then add mini-map/zoom.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @foblex/flow | 18.1.2 (installed) | Flow canvas, node drag, connections | Already installed and working; Angular 21 compatible |
| @angular/core signals | Angular 21 (project) | State management (signal, computed, effect) | Locked decision; no NgRx needed for this scope |
| @angular/common/http | Angular 21 (project) | Load default flow from GET /api/flow | Standard Angular HTTP client |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @angular/common NgFor | Angular 21 | Iterate nodes/edges in template | Rendering data-driven node list |
| Tailwind CSS v4 | v4 (installed) | Node card styling, sidebar, layout | All structural styling |
| CSS @keyframes | Native browser | Edge flow animation (dashed line movement) | Custom animation on SVG paths rendered by @foblex/flow |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @foblex/flow | @xyflow/angular | @xyflow/angular does not exist as npm package (confirmed pre-phase decision) |
| Angular Signals | RxJS BehaviorSubject | Signals chosen — simpler, no subscription management |
| CSS animation on SVG | JS-animated edges | CSS is sufficient; no JS overhead |

**Installation:** Nothing new — all packages already installed.

## Architecture Patterns

### Recommended Project Structure

```
frontend/src/
├── app/
│   ├── services/
│   │   └── flow.service.ts          # SERV-02: signals + HTTP load
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── canvas.component.ts  # Refactor: inject FlowService, ngFor nodes
│   │   │   ├── canvas.component.html
│   │   │   └── canvas.component.css # Edge animation @keyframes (or global styles.css)
│   │   └── sidebar/
│   │       └── sidebar.component.ts # Add dragstart handler with node type data
│   └── pages/
│       └── index.page.ts            # Unchanged (grid layout already correct)
└── models/
    └── types.ts                     # FlowNode, FlowEdge, NODE_TYPE_CONFIGS (already exists)
```

### Pattern 1: FlowService with Angular Signals

**What:** Injectable service that owns all flow state as signals; loads data from API on init.
**When to use:** Single source of truth pattern — canvas and sidebar both inject and read.

```typescript
// frontend/src/app/services/flow.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FlowNode, FlowEdge } from '../../models/types';

@Injectable({ providedIn: 'root' })
export class FlowService {
  private http = inject(HttpClient);

  nodes = signal<FlowNode[]>([]);
  edges = signal<FlowEdge[]>([]);
  activeNodeId = signal<string | null>(null);
  selectedNodeId = signal<string | null>(null);

  loadDefaultFlow(): void {
    this.http.get<{ nodes: FlowNode[]; edges: FlowEdge[] }>('/api/flow')
      .subscribe(data => {
        this.nodes.set(data.nodes);
        this.edges.set(data.edges);
      });
  }

  addNode(node: FlowNode): void {
    this.nodes.update(nodes => [...nodes, node]);
  }

  updateNodePosition(id: string, position: { x: number; y: number }): void {
    this.nodes.update(nodes =>
      nodes.map(n => n.id === id ? { ...n, position } : n)
    );
  }

  setActiveNode(id: string | null): void {
    this.activeNodeId.set(id);
  }

  setSelectedNode(id: string | null): void {
    this.selectedNodeId.set(id);
  }
}
```

### Pattern 2: Data-Driven Canvas with ngFor + foblex directives

**What:** Replace hardcoded nodes with *ngFor over FlowService.nodes signal.
**When to use:** Once FlowService is built.

```typescript
// canvas.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { NgFor, NgClass, NgStyle } from '@angular/common';
import { FFlowModule } from '@foblex/flow';
import { FlowService } from '../../services/flow.service';
import { NODE_TYPE_CONFIGS } from '../../../models/types';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [FFlowModule, NgFor, NgClass, NgStyle],
  host: { class: 'block w-full h-full' },
  templateUrl: './canvas.component.html',
})
export class CanvasComponent implements OnInit {
  flowService = inject(FlowService);
  nodeTypeConfigs = NODE_TYPE_CONFIGS;

  ngOnInit(): void {
    this.flowService.loadDefaultFlow();
  }

  getNodeConfig(type: string) {
    return this.nodeTypeConfigs.find(c => c.type === type) ?? this.nodeTypeConfigs[0];
  }

  onNodePositionChange(id: string, position: { x: number; y: number }): void {
    this.flowService.updateNodePosition(id, position);
  }
}
```

```html
<!-- canvas.component.html -->
<f-flow fDraggable (drop)="onCanvasDrop($event)" (dragover)="$event.preventDefault()">
  <f-canvas>
    <!-- Edges -->
    <f-connection
      *ngFor="let edge of flowService.edges()"
      [fOutputId]="edge.source + '-out'"
      [fInputId]="edge.target + '-in'"
      class="flow-edge">
    </f-connection>

    <!-- Nodes -->
    <div
      *ngFor="let node of flowService.nodes()"
      fNode
      fDragHandle
      [fNodeId]="node.id"
      [fNodePosition]="node.position"
      [ngClass]="{'node--active': flowService.activeNodeId() === node.id}"
      [ngStyle]="{'border-color': getNodeConfig(node.type).color}"
      class="flow-node"
      (click)="flowService.setSelectedNode(node.id)">
      <!-- Input port (left side) -->
      <div fNodeInput [fInputId]="node.id + '-in'" fInputConnectableSide="left" class="node-port node-port--in"></div>
      <!-- Node body -->
      <span class="node-icon">{{ getNodeConfig(node.type).emoji }}</span>
      <span class="node-label">{{ node.label }}</span>
      <!-- Output port (right side) -->
      <div fNodeOutput [fOutputId]="node.id + '-out'" fOutputConnectableSide="right" class="node-port node-port--out"></div>
    </div>
  </f-canvas>

  <!-- Mini-map -->
  <f-mini-map></f-mini-map>
</f-flow>
```

### Pattern 3: Sidebar Drag + Canvas Drop (External Nodes)

**What:** HTML5 dragstart passes node type; canvas drop creates new node at cursor position.
**When to use:** FLOW-07 — sidebar to canvas drag & drop.

```typescript
// sidebar.component.ts — add dragstart handler
onDragStart(event: DragEvent, nodeType: string): void {
  event.dataTransfer?.setData('application/node-type', nodeType);
}
```

```html
<!-- sidebar template update -->
<div
  *ngFor="let node of nodeTypes"
  draggable="true"
  (dragstart)="onDragStart($event, node.type)"
  ...>
```

```typescript
// canvas.component.ts — handle drop
onCanvasDrop(event: DragEvent): void {
  event.preventDefault();
  const nodeType = event.dataTransfer?.getData('application/node-type');
  if (!nodeType) return;

  // Get canvas element bounds to compute relative position
  const canvas = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const position = {
    x: event.clientX - canvas.left,
    y: event.clientY - canvas.top,
  };

  const config = this.getNodeConfig(nodeType);
  const newNode = {
    id: `${nodeType}-${Date.now()}`,
    type: nodeType,
    label: config.label,
    position,
    data: {},
  };
  this.flowService.addNode(newNode);
}
```

### Pattern 4: Edge Flow Animation (CSS on SVG)

**What:** @foblex/flow renders f-connection as SVG path elements. Target with CSS to animate.
**When to use:** FLOW-03 — dashed animated edges.

```css
/* global styles.css — @foblex/flow SVG paths need global scope */
/* Animated flow edges */
.flow-edge path {
  stroke: #4b5563; /* gray-600 normal state */
  stroke-width: 2;
  stroke-dasharray: 8 4;
  animation: flow-dash 1s linear infinite;
}

.flow-edge.edge--active path {
  stroke: #60a5fa; /* blue-400 active state */
  filter: drop-shadow(0 0 4px #60a5fa);
}

@keyframes flow-dash {
  to {
    stroke-dashoffset: -12;
  }
}

/* Active node pulse */
.node--active {
  box-shadow: 0 0 0 2px currentColor, 0 0 12px currentColor;
  animation: node-pulse 2s ease-in-out infinite;
}

@keyframes node-pulse {
  0%, 100% { box-shadow: 0 0 0 2px currentColor, 0 0 8px currentColor; }
  50% { box-shadow: 0 0 0 2px currentColor, 0 0 16px currentColor; }
}
```

### Anti-Patterns to Avoid

- **Storing position state in CanvasComponent:** foblex emits position changes — always sync back to FlowService so signals are the truth. Don't rely on component-local variables for node position.
- **Creating one Angular component per node type:** @foblex/flow works with directive-decorated divs. Creating 6 separate components adds complexity without benefit; use one ngFor with type-based config lookup instead.
- **Writing custom pan/zoom:** @foblex/flow has built-in pan and zoom. Do not reimplement.
- **Using ViewEncapsulation.Emulated for foblex styles:** foblex SVG elements are rendered outside component shadow DOM. Use global styles.css or ViewEncapsulation.None for edge/node CSS.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canvas pan + zoom | Custom mouse event handlers | @foblex/flow built-in (fDraggable on f-flow) | Viewport math, event conflicts, pinch-to-zoom are complex |
| Connection routing | SVG bezier curve math | f-connection directive | Port attachment, curve smoothing, hit detection |
| Mini-map rendering | Canvas 2D scaled render | f-mini-map directive | Viewport sync, scale ratio, click-to-navigate |
| Drag ghost preview | Custom drag image creation | Browser HTML5 DragEvent default ghost | dataTransfer.setDragImage is finicky; browser default is sufficient |
| Node port hit detection | Custom proximity math | fNodeInput/fNodeOutput connectable sides | @foblex/flow handles port snap zones |

**Key insight:** @foblex/flow owns the canvas interaction layer. Treat it as a black box for pan/zoom/connection routing; only customize the visual appearance of nodes and edges.

## Common Pitfalls

### Pitfall 1: fNodePosition is an input binding, not a template literal

**What goes wrong:** Writing `[fNodePosition]="{ x: 100, y: 200 }"` as an object literal in the template causes change detection issues — Angular creates a new object every cycle.
**Why it happens:** Object literals in templates are not referentially stable.
**How to avoid:** Always bind to a signal or component property: `[fNodePosition]="node.position"` where `node` comes from the signal array.
**Warning signs:** Nodes jitter or constantly re-render in devtools.

### Pitfall 2: CSS encapsulation blocks foblex SVG styling

**What goes wrong:** Edge animations in a component's styleUrl don't apply to SVG paths inside f-connection.
**Why it happens:** @foblex/flow renders SVG outside the component's host element scope. ViewEncapsulation.Emulated scopes CSS to the component.
**How to avoid:** Put edge/node CSS in global `styles.css` (confirmed working in Phase 1 for demo nodes). Already established pattern.
**Warning signs:** CSS rules written in canvas.component.css have no effect on edges.

### Pitfall 3: External drag drop position is offset

**What goes wrong:** Node appears at wrong position after dropping from sidebar — offset from where user released.
**Why it happens:** `event.clientX/Y` is relative to viewport; canvas may be scrolled or have a transform (from zoom/pan). Need to account for canvas bounds.
**How to avoid:** Use `getBoundingClientRect()` on the canvas container and subtract offset. If canvas is zoomed, also divide by current zoom scale. Check if @foblex/flow exposes a `screenToCanvas(point)` utility.
**Warning signs:** Drop position is off by a fixed amount; gets worse when canvas is panned.

### Pitfall 4: fNodeId not set causes connection routing failures

**What goes wrong:** f-connection with fOutputId/fInputId can't find the matching port.
**Why it happens:** fNode needs a unique fNodeId set, and fNodeInput/fNodeOutput need matching fInputId/fOutputId.
**How to avoid:** Follow the ID convention: node id=`"X"`, input id=`"X-in"`, output id=`"X-out"`. Edges reference `edge.sourceId` → output id, `edge.targetId` → input id.
**Warning signs:** Console errors about missing port IDs; edges render but don't attach to nodes.

### Pitfall 5: Signal read in template requires `()` call syntax

**What goes wrong:** `flowService.nodes` in template renders `[Signal<FlowNode[]>]` text instead of array.
**Why it happens:** Angular signals are functions — must be called to read the value.
**How to avoid:** Always use `flowService.nodes()` in templates, not `flowService.nodes`.
**Warning signs:** `*ngFor` iterates over a single item which is the signal object itself.

## Code Examples

### FlowService load on init (SERV-02)

```typescript
// Inject HttpClient and load on demand
// Call from CanvasComponent.ngOnInit()
loadDefaultFlow(): void {
  this.http.get<{ nodes: FlowNode[]; edges: FlowEdge[] }>('/api/flow')
    .subscribe({
      next: (data) => {
        this.nodes.set(data.nodes);
        this.edges.set(data.edges);
      },
      error: (err) => console.error('Failed to load flow:', err)
    });
}
```

### NODE_TYPE_CONFIGS usage for node rendering

```typescript
// From existing types.ts — use as config lookup
// In canvas component:
getNodeConfig(type: string): NodeTypeConfig {
  return NODE_TYPE_CONFIGS.find(c => c.type === type) ?? NODE_TYPE_CONFIGS[0];
}

// Emoji map (same as sidebar — consolidate to shared util or keep per-component)
readonly iconEmojiMap: Record<string, string> = {
  'target': '🎯',
  'brain': '🧠',
  'check-circle': '✅',
  'zap': '⚡',
  'message-circle': '💬',
  'tool': '🔧',
};
```

### @foblex/flow mini-map and zoom (FLOW-05, FLOW-06)

```html
<!-- Based on @foblex/flow FFlowModule exports -->
<f-flow fDraggable>
  <f-canvas>
    <!-- nodes and edges here -->
  </f-canvas>

  <!-- Mini-map: bottom-right -->
  <f-mini-map></f-mini-map>

  <!-- Zoom controls: bottom-left -->
  <f-zoom></f-zoom>
</f-flow>
```

Note: Exact directive/component names (`f-mini-map`, `f-zoom`) must be verified against @foblex/flow 18.x docs — see Open Questions.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RxJS BehaviorSubject for state | Angular Signals signal() | Angular 17+ | No subscription/unsubscribe boilerplate |
| NgModule imports | Standalone components + imports[] | Angular 17+ | Each component declares its own imports |
| Scoped CSS for canvas libraries | Global styles.css for canvas lib overrides | Established in Phase 1 | Edge/node CSS must go in styles.css |

**Deprecated/outdated:**
- `*ngFor` with `NgFor` import: still valid but Angular 17+ `@for` control flow syntax is the new approach. Project currently uses NgFor (sidebar.component.ts) — stay consistent with existing code. Either is fine; don't mix.

## Open Questions

1. **Exact @foblex/flow mini-map and zoom directive names**
   - What we know: @foblex/flow 18.1.2 is installed; FFlowModule is imported
   - What's unclear: Whether mini-map is `<f-mini-map>`, `<f-minimap>`, or accessed via a directive. Whether zoom is a built-in component or needs separate import.
   - Recommendation: Check `node_modules/@foblex/flow` exports or @foblex/flow official docs at https://flow.foblex.com before implementing FLOW-05/FLOW-06. Take 5 minutes to verify before writing the template.

2. **@foblex/flow fNodeId binding syntax**
   - What we know: POC uses `fOutputId="demo-out-1"` (string literal). Data-driven requires dynamic binding.
   - What's unclear: Whether `[fNodeId]="node.id"` works as a property binding or if it's only a static attribute.
   - Recommendation: Test `[fNodeId]="node.id"` first. If it fails, use `[attr.fNodeId]`. Check @foblex/flow source in node_modules if needed.

3. **Canvas coordinate system for drop position**
   - What we know: HTML5 drop gives viewport coordinates; canvas may be panned/zoomed.
   - What's unclear: Whether @foblex/flow exposes a `screenToCanvas()` or `toCanvasPoint()` utility to convert screen coords to canvas coords.
   - Recommendation: Search @foblex/flow for screen-to-canvas conversion before writing manual math. If not available, implement: `canvasX = (clientX - canvasRect.left - panOffset.x) / zoomScale`.

4. **fNodePosition mutability on drag**
   - What we know: POC sets position as component property; foblex updates it visually on drag.
   - What's unclear: Whether @foblex/flow emits a position-changed event that the component should listen to for syncing back to FlowService, or if foblex mutates the bound position object directly.
   - Recommendation: Look for `(fNodePositionChange)` or similar output event on fNode. If not present, position sync may need to happen only on drag-end via a flow-level event.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `/home/jose/atom/frontend/src/app/components/canvas/canvas.component.html` — confirmed working directives: fNode, fDragHandle, fNodeOutput, fNodeInput, f-connection, fDraggable, fOutputId, fInputId, fOutputConnectableSide, fInputConnectableSide, fNodePosition
- `/home/jose/atom/frontend/src/app/components/sidebar/sidebar.component.ts` — confirmed draggable=true and NODE_TYPE_CONFIGS usage
- `.planning/phases/02-flow-editor/02-CONTEXT.md` — locked decisions from user

### Secondary (MEDIUM confidence)
- STATE.md accumulated decisions: fNodePosition uses signal input binding `[fNodePosition]="..."`, styles in global styles.css for reliable foblex integration
- Angular official docs pattern for `signal()`, `inject()`, `HttpClient` — standard Angular 21 APIs

### Tertiary (LOW confidence — validate before implementing)
- @foblex/flow mini-map/zoom directive names: `f-mini-map`, `f-zoom` — assumed from @foblex naming convention, NOT verified against 18.x source
- `screenToCanvas()` utility existence in @foblex/flow — assumed possible, not verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — @foblex/flow working in codebase, Angular Signals are Angular 21 built-in
- Architecture: HIGH — patterns derived from working POC code
- Pitfalls: HIGH — pitfalls 1, 2, 4, 5 confirmed from STATE.md and existing code; pitfall 3 is universal HTML5 DnD knowledge
- Mini-map/zoom directive names: LOW — needs verification against @foblex/flow 18.x docs before FLOW-05/FLOW-06 tasks

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable library; 30 days)
