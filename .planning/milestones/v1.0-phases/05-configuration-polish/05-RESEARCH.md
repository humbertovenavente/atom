# Phase 5: Configuration & Polish - Research

**Researched:** 2026-03-01
**Domain:** Angular 21 Signals, @foblex/flow node click, Nitro/H3 API, Mongoose Flow model
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Config Panel Placement & UX**
- Config panel replaces the sidebar: clicking a node swaps the sidebar from node palette to config form
- 3-column grid layout stays intact (240px | 1fr | 360px) — no extra panels or overlays
- Click node to open config, explicit X/close button to return to palette. Clicking another node switches config to that node
- Selected node gets a colored border/glow on the canvas while its config is open (differentiated from active-node highlight during chat)
- Config changes apply live/immediately as user types or adjusts — no save button inside the config panel itself

**Save/Load Flow Behavior**
- Explicit "Guardar" button to persist the flow to the backend (not auto-save)
- On page load, if a saved flow exists in MongoDB, load it instead of the default. Falls back to default 8-node flow if nothing saved
- Save everything: node positions, connections, AND node configurations (system prompts, temperatures) — full state round-trip
- Storage: MongoDB 'flows' collection in the existing atom_knowledge database (consistent with rest of app)

**Action Buttons Layout**
- Toolbar above the canvas: horizontal bar containing "Guardar", "Reset Flow" buttons. "Nueva Conversacion" goes in the chat panel header
- Each button near its relevant context area (flow buttons near canvas, chat button near chat)
- "Reset Flow" shows a simple confirm dialog before resetting ("¿Restablecer el flujo al default?" with Confirmar/Cancelar)
- "Nueva Conversacion" clears chat messages, creates new MongoDB session, AND clears active/completed node highlights on canvas — clean slate
- Ghost/outline button style: subtle borders, no fill, matches the dark theme without competing with main UI

**Editable Node Properties**
- All node types get systemPrompt (textarea) + temperature (slider) as editable fields
- toolSource and validationFields left for future phases — keep it simple
- Temperature control: range slider 0.0–2.0 with current value displayed next to it
- Panel header shows emoji icon + node label + colored type badge — clear which node is being edited
- Nodes come pre-filled with sensible default system prompts per node type (e.g. orchestrator: intent classification, specialist: domain expertise, etc.)

### Claude's Discretion
- Exact default system prompt text per node type
- Slider step precision (0.1 vs 0.05)
- Toolbar styling details and spacing
- Confirm dialog implementation (native vs custom)
- Error handling for save/load failures
- Animation/transition when sidebar swaps between palette and config

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONF-01 | Panel de configuración: click en nodo muestra sidebar con opciones editables (system prompt, temperatura) | Angular signals `selectedNodeId` already exists in FlowService; canvas already has `(click)="flowService.setSelectedNode(node.id)"` wired; SidebarComponent needs @if conditional on `flowService.selectedNodeId()` |
| CONF-02 | Guardar configuración del flow al backend (POST /api/flow) | New Nitro route `flow.post.ts` needed; new Mongoose `Flow` model needed; `readBody` + `connectDB` pattern already established in chat.post.ts |
| CONF-03 | Cargar configuración del flow desde backend (GET /api/flow) | `flow.get.ts` exists but returns hardcoded data; needs MongoDB lookup first with hardcoded fallback |
| CONF-04 | Botón "Reset Flow" para volver al flujo default | FlowService.loadDefaultFlow() already calls GET /api/flow; Reset = clear nodeConfigs + call loadDefaultFlow; confirm dialog with native window.confirm or simple inline @if modal |
| CONF-05 | Botón "Nueva Conversación" para limpiar el chat e iniciar sesión nueva | ChatService.startNewSession() already exists and handles messages/session/localStorage; needs `flowService.setActiveNode(null)` + `flowService.clearCompletedNodes()` added to it (or called from button handler) |
</phase_requirements>

---

## Summary

Phase 5 is an integration and polish phase on top of a well-established codebase. Every major building block already exists: `FlowService.selectedNodeId` signal, `ChatService.startNewSession()`, the `NodeConfig` interface, the `FlowConfig` interface, and the canvas `(click)` handler. The work is primarily wiring these together and creating two missing pieces: the `NodeConfigPanel` component and the backend `POST /api/flow` + Mongoose `Flow` model.

The Angular 21 patterns throughout the project (standalone components, signals, `@if`/`@for` control flow, no NgModules) are consistent and well-established. The sidebar swap is a signal-driven conditional render — when `flowService.selectedNodeId()` is non-null, show the config panel; otherwise show the node palette. Config changes write back to `FlowNode.data.config` (via `FlowService.updateNodeConfig()`), which feeds the save payload.

The backend work follows the exact same pattern as `sessions.post.ts`: `defineEventHandler` + `readBody` + `connectDB` + Mongoose model. A single `Flow` document with a stable `flowId = 'default'` is the simplest approach — upsert on save, findOne on load.

**Primary recommendation:** Wire signals first (CONF-01 + CONF-05), then backend (CONF-02 + CONF-03), then action buttons (CONF-04). Each can be a standalone task.

---

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Angular Signals (`signal`, `computed`, `effect`) | 21.x | Reactive state for selectedNodeId → sidebar swap | Already the project's state pattern; avoids RxJS |
| `@foblex/flow` | 18.1.2 | Canvas node click events | Already installed; fNode div has `(click)` already wired |
| Nitro H3 (`defineEventHandler`, `readBody`, `createError`) | Analog 2.3 | POST /api/flow backend route | Same pattern as chat.post.ts and sessions.post.ts |
| Mongoose | 9.x | Flow model + upsert | Same pattern as Conversation, FAQ, Vehicle models |
| Tailwind CSS (dark theme) | Vite plugin | Config panel UI | All existing components use this; no new CSS needed |
| `FormsModule` (Angular) | 21.x | Two-way binding `[(ngModel)]` on textarea/range inputs | Already used in ChatComponent; clean for config forms |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `NgClass`, `NgStyle` | 21.x | Dynamic CSS on selected node border glow | Already imported in CanvasComponent |
| `window.confirm()` | Browser native | Reset Flow confirm dialog | Simplest option for hackathon; zero dependencies |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `window.confirm()` for reset dialog | Custom `@if` modal in template | Custom modal is more polished but adds 20+ lines; native is instant |
| Single `Flow` doc with fixed flowId | Multiple versioned flows | Multiple versions = complexity not needed for demo |
| Signal `selectedNodeId` already in FlowService | Local component state | Service signal is correct — it must be shared between canvas and sidebar |

**Installation:** No new packages needed. All libraries already present.

---

## Architecture Patterns

### Recommended File Changes

```
src/
├── app/
│   ├── components/
│   │   ├── sidebar/
│   │   │   └── sidebar.component.ts     # MODIFY: add @if selectedNodeId → show NodeConfigPanel
│   │   ├── canvas/
│   │   │   └── canvas.component.html    # MODIFY: add node--selected CSS class
│   │   │   └── canvas.component.ts      # MINOR: expose selectedNodeId to template (already done)
│   │   ├── node-config-panel/
│   │   │   └── node-config-panel.component.ts  # CREATE: config form component
│   │   └── chat/
│   │       └── chat.component.ts        # MODIFY: add "Nueva Conversacion" button in header
│   ├── pages/
│   │   └── index.page.ts               # MODIFY: add toolbar row above canvas grid area
│   └── services/
│       └── flow.service.ts             # MODIFY: add updateNodeConfig(), saveFlow(), loadFlow()
├── server/
│   ├── models/
│   │   └── flow.ts                     # CREATE: Mongoose Flow model
│   └── routes/api/
│       ├── flow.get.ts                 # MODIFY: check MongoDB first, fall back to hardcoded
│       └── flow.post.ts                # CREATE: save flow to MongoDB
└── shared/
    └── types.ts                        # ALREADY has FlowConfig, NodeConfig — no changes needed
```

### Pattern 1: Signal-Driven Sidebar Swap

**What:** SidebarComponent reads `flowService.selectedNodeId()` to conditionally render config panel or node palette.
**When to use:** Any time view toggles based on shared service state.

```typescript
// Source: Angular official signals guide + project's existing FlowService
// In SidebarComponent template:
@if (flowService.selectedNodeId()) {
  <app-node-config-panel [nodeId]="flowService.selectedNodeId()!" />
} @else {
  <!-- existing node palette markup -->
}
```

```typescript
// SidebarComponent class — inject FlowService
readonly flowService = inject(FlowService);
```

### Pattern 2: Live Config Updates via FlowService

**What:** NodeConfigPanel writes changes directly to FlowService via `updateNodeConfig()`. No local state needed in the panel.
**When to use:** Config that must be included in the save payload.

```typescript
// In FlowService (new method):
updateNodeConfig(nodeId: string, patch: Partial<NodeConfig>): void {
  this.nodes.update(nodes =>
    nodes.map(n =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, config: { ...n.data.config, ...patch } } }
        : n
    )
  );
}
```

```typescript
// NodeConfigPanel template — (input) event for live update:
<textarea
  [value]="node().data.config?.systemPrompt ?? ''"
  (input)="onPromptChange($event)">
</textarea>
<input type="range" min="0" max="2" step="0.1"
  [value]="node().data.config?.temperature ?? 0.7"
  (input)="onTempChange($event)">
```

### Pattern 3: Selected Node Visual Indicator

**What:** Add `node--selected` CSS class when node is selected, distinct from `node--active` (chat highlight).
**When to use:** Node is selected for config editing (not active during chat).

```html
<!-- canvas.component.html — add node--selected class -->
[class.node--selected]="flowService.selectedNodeId() === node.id"
```

```css
/* styles.css — new class */
.flow-node.node--selected {
  box-shadow: 0 0 0 2px v-bind(node.data.color), 0 0 8px 2px rgba(255,255,255,0.2);
  outline: 2px dashed currentColor;
}
```

### Pattern 4: Mongoose Flow Model (Upsert)

**What:** Single `Flow` document with `flowId: 'default'` — upsert on save, findOne on load.
**When to use:** When only one saved state is needed per app instance.

```typescript
// src/server/models/flow.ts
import mongoose from 'mongoose';

const nodeConfigSchema = new mongoose.Schema({
  systemPrompt: { type: String, default: '' },
  temperature: { type: Number, default: 0.7 },
}, { _id: false });

const flowNodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  position: { x: Number, y: Number },
  data: {
    label: String,
    icon: String,
    color: String,
    config: nodeConfigSchema,
  },
}, { _id: false });

const flowEdgeSchema = new mongoose.Schema({
  id: String,
  source: String,
  target: String,
  animated: Boolean,
}, { _id: false });

const flowSchema = new mongoose.Schema({
  flowId: { type: String, unique: true, required: true },
  nodes: [flowNodeSchema],
  edges: [flowEdgeSchema],
  nodeConfigs: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const Flow =
  mongoose.models['Flow'] || mongoose.model('Flow', flowSchema);
```

### Pattern 5: POST /api/flow Route

**What:** Accept full FlowConfig, upsert into MongoDB. Uses existing `readBody` + `connectDB` pattern.

```typescript
// src/server/routes/api/flow.post.ts
import { defineEventHandler, readBody } from 'h3';
import { connectDB } from '../../db/connect';
import { Flow } from '../../models/flow';

export default defineEventHandler(async (event) => {
  await connectDB();
  const body = await readBody(event);
  await Flow.findOneAndUpdate(
    { flowId: 'default' },
    { ...body, flowId: 'default' },
    { upsert: true, new: true }
  );
  return { ok: true };
});
```

### Pattern 6: Modified GET /api/flow

**What:** Check MongoDB first; if found, return saved data. If not found, return hardcoded default.

```typescript
// src/server/routes/api/flow.get.ts — modified
import { defineEventHandler } from 'h3';
import { connectDB } from '../../db/connect';
import { Flow } from '../../models/flow';

export default defineEventHandler(async () => {
  try {
    await connectDB();
    const saved = await Flow.findOne({ flowId: 'default' }).lean();
    if (saved) {
      return { nodes: saved.nodes, edges: saved.edges, nodeConfigs: saved.nodeConfigs };
    }
  } catch {
    // DB unavailable — fall through to default
  }
  // Hardcoded default (existing nodes/edges arrays stay here)
  return { nodes: [...hardcodedNodes], edges: [...hardcodedEdges], nodeConfigs: {} };
});
```

### Pattern 7: FlowService.saveFlow()

**What:** Collect current nodes + edges + nodeConfigs, POST to backend.

```typescript
// In FlowService:
async saveFlow(): Promise<void> {
  const payload = {
    flowId: 'default',
    nodes: this.nodes(),
    edges: this.edges(),
    nodeConfigs: {},  // nodeConfigs embedded in node.data.config per node
  };
  await fetch('/api/flow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
```

### Pattern 8: Toolbar Row in index.page.ts

**What:** Add a toolbar `div` above the canvas column in the 3-column grid.
**When to use:** Buttons that act on the flow (Guardar, Reset) should sit above the canvas, not inside it.

```typescript
// index.page.ts — wrap canvas in a grid-within-grid or add toolbar via CSS grid rows
template: `
  <div class="grid h-screen" style="grid-template-columns: 240px 1fr 360px;">
    <app-sidebar />
    <div class="flex flex-col overflow-hidden">
      <app-flow-toolbar />    <!-- NEW: Guardar + Reset Flow buttons -->
      <app-canvas class="flex-1" />
    </div>
    <app-chat />
  </div>
`
```

### Anti-Patterns to Avoid

- **Storing config in a separate signal from nodes:** Config must live in `node.data.config` so the save payload is self-contained. Don't use a separate `nodeConfigs` map signal — it creates sync issues.
- **Auto-saving on every keystroke:** LOCKED DECISION is explicit "Guardar" button — don't add debounced auto-save.
- **Using RxJS Subject for selectedNodeId:** Project uses Angular Signals throughout. Keep `selectedNodeId` as a signal in FlowService.
- **Clicking canvas background to deselect:** Not in scope for this phase. X button closes config panel.
- **Two-way binding `[(ngModel)]` calling service on every character:** Use `(input)` event and call `flowService.updateNodeConfig()` directly — avoids zone pollution and keeps signals as source of truth.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Range slider with value display | Custom slider component | Native `<input type="range">` + signal display | Native handles all browser events; styling with Tailwind accent-color |
| Confirm dialog | Custom modal component | `window.confirm()` | Zero lines of HTML; sufficient for hackathon; can be upgraded later |
| Mongoose upsert logic | Manual findOne + if/else + save | `findOneAndUpdate({ upsert: true })` | Built-in atomic upsert; handles race conditions |
| Save status feedback | Toast library | Inline signal `saveStatus = signal<'idle'\|'saving'\|'saved'\|'error'>` | No new dependency; single signal drives button text change |

**Key insight:** This phase adds no new dependencies. All complexity is wiring existing signals and following the established Nitro/Mongoose pattern.

---

## Common Pitfalls

### Pitfall 1: fNode click vs. fDragHandle conflict

**What goes wrong:** The `fDragHandle` directive on the node div makes the entire node a drag handle. A `(click)` event on the same element fires after drag operations too, incorrectly opening config panel after a drag.

**Why it happens:** Browser fires click after mouseup even when mouse moved (drag), unless the drag library cancels the click event.

**How to avoid:** The canvas already has `(click)="flowService.setSelectedNode(node.id)"` wired on the fNode div. Check if @foblex/flow suppresses clicks after drag moves. If not, track drag start/end with a boolean flag:
```typescript
private _isDragging = false;
onMoveNodes(event: FMoveNodesEvent): void {
  this._isDragging = true;
  // ... existing update logic
  setTimeout(() => this._isDragging = false, 0);
}
// In template: (click)="!isDragging && flowService.setSelectedNode(node.id)"
```

**Warning signs:** Config panel opens after every drag operation, not just clean clicks.

### Pitfall 2: GET /api/flow becomes async but was sync

**What goes wrong:** The existing `flow.get.ts` is a synchronous `defineEventHandler(() => {...})`. Changing it to `async` to do a MongoDB lookup works fine, but forgetting `await connectDB()` causes "MongooseError: bufferCommands is false" at runtime.

**Why it happens:** `bufferCommands: false` in `connectDB` means Mongoose will not queue operations — they fail immediately if not connected.

**How to avoid:** Always call `await connectDB()` as the first line of every async Nitro handler that touches Mongoose. The existing sessions.post.ts and [id].get.ts both do this correctly.

**Warning signs:** 500 error on first load of the page, "bufferCommands is false" in server logs.

### Pitfall 3: `nodeConfigs` embedded vs. separate map

**What goes wrong:** `FlowConfig` has both `nodes[].data.config` (per-node) AND a top-level `nodeConfigs: Record<string, NodeConfig>`. If updates go to one place and the save reads from the other, configs don't round-trip.

**Why it happens:** The type definition allows both patterns.

**How to avoid:** Pick one and be consistent. Recommendation: store config in `node.data.config` (already part of `FlowNode.data`) and set `nodeConfigs: {}` in the save payload for backward compatibility. When loading, merge any `nodeConfigs` entries back into nodes if `node.data.config` is absent.

**Warning signs:** After save + reload, nodes appear with empty system prompts even though they were filled.

### Pitfall 4: SidebarComponent doesn't inject FlowService

**What goes wrong:** Current `SidebarComponent` is standalone with no service injection. Adding `flowService.selectedNodeId()` requires injecting `FlowService`.

**Why it happens:** The component was built as a pure presentational component with drag behavior.

**How to avoid:** Inject `FlowService` in SidebarComponent class:
```typescript
readonly flowService = inject(FlowService);
```
Then add `NodeConfigPanelComponent` to imports array.

### Pitfall 5: "Nueva Conversacion" doesn't clear canvas highlights

**What goes wrong:** `ChatService.startNewSession()` already exists but ONLY clears messages, sessionId, localStorage. If not also calling `flowService.setActiveNode(null)` and `flowService.clearCompletedNodes()`, chat starts fresh but canvas still shows glow from previous session.

**Why it happens:** The services are separate — ChatService has no canvas awareness by default.

**How to avoid:** In the button handler (or in `startNewSession()`), also call both FlowService methods. Since ChatService already injects FlowService (it uses `flowService.setActiveNode()` in `sendMessage`), this is a one-liner addition.

### Pitfall 6: Toolbar breaks 3-column grid layout

**What goes wrong:** Naively placing a toolbar `div` before `<app-canvas>` in the `index.page.ts` template causes it to be placed in the sidebar column (first grid cell).

**Why it happens:** The 3-column CSS grid applies to direct children.

**How to avoid:** Wrap the canvas column in a `<div class="flex flex-col overflow-hidden">` so toolbar + canvas stack vertically. The wrapper div occupies the `1fr` grid cell, then flex-col stacks internally.

---

## Code Examples

Verified patterns from the existing codebase:

### NodeConfigPanel component skeleton

```typescript
// Source: established project pattern (standalone components with signals)
// src/app/components/node-config-panel/node-config-panel.component.ts
import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlowService } from '../../services/flow.service';
import type { FlowNode } from '@models/types';

const EMOJI_MAP: Record<string, string> = {
  target: '🎯', brain: '🧠', 'check-circle': '✅',
  zap: '⚡', 'message-circle': '💬', tool: '🔧',
};

const DEFAULT_PROMPTS: Record<string, string> = {
  orchestrator: 'Eres un orquestador de intención. Analiza el mensaje del usuario y determina cuál agente especializado debe responder.',
  memory: 'Eres un agente de memoria. Recupera y almacena el contexto relevante de la conversación.',
  validator: 'Eres un validador. Verifica que los datos recopilados sean completos y correctos antes de continuar.',
  specialist: 'Eres un especialista en tu dominio. Proporciona respuestas precisas y detalladas sobre tu área de expertise.',
  generic: 'Eres un asistente general. Responde de forma útil y amigable cuando ningún especialista aplique.',
  tool: 'Eres una herramienta de búsqueda. Consulta fuentes externas y devuelve datos estructurados.',
};

@Component({
  selector: 'app-node-config-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="h-full bg-gray-900 text-white border-r border-gray-700 flex flex-col">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span>{{ emoji() }}</span>
          <span class="text-sm font-medium">{{ node()?.data.label }}</span>
          <span class="text-xs px-2 py-0.5 rounded-full border"
            [style.borderColor]="node()?.data.color"
            [style.color]="node()?.data.color">
            {{ node()?.type }}
          </span>
        </div>
        <button (click)="close()"
          class="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
      </div>
      <!-- Form -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider block mb-1">System Prompt</label>
          <textarea
            [value]="currentPrompt()"
            (input)="onPromptChange($event)"
            rows="8"
            class="w-full bg-gray-800 text-white text-sm rounded-lg p-3 border border-gray-600 outline-none focus:border-blue-500 resize-none">
          </textarea>
        </div>
        <div>
          <label class="text-xs text-gray-400 uppercase tracking-wider block mb-1">
            Temperatura: {{ currentTemp() }}
          </label>
          <input type="range" min="0" max="2" step="0.1"
            [value]="currentTemp()"
            (input)="onTempChange($event)"
            class="w-full accent-blue-500">
        </div>
      </div>
    </div>
  `,
})
export class NodeConfigPanelComponent {
  readonly nodeId = input.required<string>();
  private readonly flowService = inject(FlowService);

  readonly node = computed<FlowNode | undefined>(() =>
    this.flowService.nodes().find(n => n.id === this.nodeId())
  );
  readonly emoji = computed(() => EMOJI_MAP[this.node()?.data.icon ?? ''] ?? '📦');
  readonly currentPrompt = computed(() =>
    this.node()?.data.config?.systemPrompt ?? DEFAULT_PROMPTS[this.node()?.type ?? ''] ?? ''
  );
  readonly currentTemp = computed(() => this.node()?.data.config?.temperature ?? 0.7);

  close(): void {
    this.flowService.setSelectedNode(null);
  }

  onPromptChange(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.flowService.updateNodeConfig(this.nodeId(), { systemPrompt: value });
  }

  onTempChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.flowService.updateNodeConfig(this.nodeId(), { temperature: value });
  }
}
```

### FlowService additions

```typescript
// Source: established project pattern (signals as source of truth)
// Add to FlowService:

updateNodeConfig(nodeId: string, patch: Partial<NodeConfig>): void {
  this.nodes.update(nodes =>
    nodes.map(n =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, config: { ...(n.data.config ?? {}), ...patch } } }
        : n
    )
  );
}

readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

async saveFlow(): Promise<void> {
  this.saveStatus.set('saving');
  try {
    await fetch('/api/flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flowId: 'default',
        nodes: this.nodes(),
        edges: this.edges(),
        nodeConfigs: {},
      }),
    });
    this.saveStatus.set('saved');
    setTimeout(() => this.saveStatus.set('idle'), 2000);
  } catch {
    this.saveStatus.set('error');
    setTimeout(() => this.saveStatus.set('idle'), 3000);
  }
}

resetFlow(): void {
  this.loadDefaultFlow();       // calls GET /api/flow (returns hardcoded default when no MongoDB doc for 'default' exists — or after deletion)
  this.setSelectedNode(null);
}
```

### FlowToolbar component

```typescript
// Source: established project pattern
// src/app/components/flow-toolbar/flow-toolbar.component.ts
@Component({
  selector: 'app-flow-toolbar',
  standalone: true,
  template: `
    <div class="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center gap-3">
      <button (click)="save()"
        [disabled]="flowService.saveStatus() === 'saving'"
        class="text-sm border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
        @switch (flowService.saveStatus()) {
          @case ('saving') { Guardando... }
          @case ('saved') { ✓ Guardado }
          @case ('error') { Error — Reintentar }
          @default { Guardar }
        }
      </button>
      <button (click)="reset()"
        class="text-sm border border-gray-600 text-gray-300 hover:text-red-400 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors">
        Reset Flow
      </button>
    </div>
  `,
})
export class FlowToolbarComponent {
  readonly flowService = inject(FlowService);

  save(): void {
    this.flowService.saveFlow();
  }

  reset(): void {
    if (window.confirm('¿Restablecer el flujo al default?')) {
      this.flowService.resetFlow();
    }
  }
}
```

### Modified SidebarComponent (signal-driven swap)

```typescript
// Source: established project pattern
// Add to existing SidebarComponent:
readonly flowService = inject(FlowService);
// Add to imports array: NodeConfigPanelComponent

// Replace template root div with:
template: `
  @if (flowService.selectedNodeId()) {
    <app-node-config-panel [nodeId]="flowService.selectedNodeId()!" />
  } @else {
    <div class="h-full bg-gray-900 text-white border-r border-gray-700 flex flex-col">
      <!-- existing node palette markup unchanged -->
    </div>
  }
`
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `*ngIf` structural directive | `@if` control flow block | @if is the Angular 17+ standard; NgIf is deprecated |
| `@Input()` decorator | `input()` signal function | Signal inputs preferred in Angular 17+; project mixes both — use `input.required<string>()` for new NodeConfigPanel |
| `@Output()` + `EventEmitter` | `output()` signal function | Project uses both; fine to use output() for new components |
| RxJS `BehaviorSubject` for state | Angular `signal()` | Project is signals-first; don't introduce new RxJS patterns |

**Deprecated/outdated:**
- `NgIf`: Replaced by `@if` in Angular 17+. Project's chat.component.ts already uses `@if`. Use `@if` in new components.
- `NgFor`: Replaced by `@for`. SidebarComponent still uses `*ngFor` — leave existing code; use `@for` in new code.

---

## Open Questions

1. **Reset Flow: should it also DELETE the saved MongoDB document?**
   - What we know: Reset restores the default 8-node layout. The GET /api/flow falls back to hardcoded when no MongoDB doc exists.
   - What's unclear: Should reset also clear the DB so next load also gets defaults? Or just restore in-memory?
   - Recommendation: Reset in-memory only (call `loadDefaultFlow()` which re-fetches the hardcoded default). Do NOT delete the MongoDB doc — simpler, avoids a DELETE route, and user can re-save if they want to persist the reset.

2. **Node--selected visual style: CSS-in-template vs styles.css**
   - What we know: Existing `node--active` and `node--completed` classes are in `styles.css` (global) for reliable foblex integration.
   - What's unclear: The selected border color should match `node.data.color` which is dynamic per node.
   - Recommendation: Use `[style.outlineColor]="node.data.color"` inline + a static `.node--selected { outline: 2px solid; ... }` in styles.css. This avoids the `v-bind()` CSS approach.

3. **nodeConfigs: top-level map vs. embedded in node.data.config**
   - What we know: `FlowConfig` type defines both; existing nodes have no `config` in `data`.
   - What's unclear: The backend Mongoose schema for nodes needs `config` as optional field.
   - Recommendation: Store in `node.data.config` (embedded). Top-level `nodeConfigs` in the POST body = `{}`. On load, if a saved node has `data.config`, use it; otherwise fall back to default prompts in the panel.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: `/src/app/services/flow.service.ts` — confirmed `selectedNodeId` signal + `setSelectedNode()` method
- Existing codebase: `/src/app/services/chat.service.ts:175` — confirmed `startNewSession()` exists
- Existing codebase: `/src/shared/types.ts` — confirmed `FlowConfig`, `NodeConfig`, `FlowNode.data.config` interfaces
- Existing codebase: `/src/server/routes/api/flow.get.ts` — confirmed hardcoded 8-node default
- Existing codebase: `/src/app/components/canvas/canvas.component.html:24` — confirmed `(click)="flowService.setSelectedNode(node.id)"` already wired
- Existing codebase: `/src/server/routes/api/sessions.post.ts` — confirmed `readBody`+`connectDB`+Mongoose pattern
- `@foblex/flow` d.ts: FNodeDirective has no `fNodeClick` output event — plain `(click)` DOM event on the host div is correct

### Secondary (MEDIUM confidence)
- [Angular Signals Guide](https://angular.dev/guide/signals) — computed + @if conditional rendering pattern
- [Nitro Routing Docs](https://nitro.build/guide/routing) — defineEventHandler + readBody + file-based routing
- [Angular Control Flow @if](https://angular.dev/tutorials/learn-angular/4-control-flow-if) — @if replaces NgIf in Angular 17+

### Tertiary (LOW confidence)
- None — all critical claims verified against existing project code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project; versions confirmed from package.json
- Architecture: HIGH — patterns verified against existing working code in project
- Pitfalls: HIGH (fNode click conflict, toolbar grid) / MEDIUM (nodeConfigs storage) — based on actual code inspection

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable Angular signals API; @foblex/flow 18.1.2 locked in package.json)
