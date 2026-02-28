# Architecture Research

**Domain:** Angular AI Agent Builder — Flow Editor + Chat UI (Analog.js frontend)
**Researched:** 2026-02-28
**Confidence:** MEDIUM-HIGH (core Angular patterns HIGH; flow library selection MEDIUM due to @xyflow/angular not existing)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Analog.js Page (src/app/pages/)                    │
│                    (editor).page.ts — pathless layout                 │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌────────────────────┐  ┌───────────────────┐  │
│  │  NodeSidebar    │  │  FlowCanvas        │  │  ChatPanel        │  │
│  │  Component      │  │  Component         │  │  Component        │  │
│  │                 │  │                    │  │                   │  │
│  │ - draggable     │  │ - vflow/xyflow     │  │ - message list    │  │
│  │   node palette  │  │   canvas           │  │ - input box       │  │
│  │ - node type     │  │ - custom nodes     │  │ - SSE stream      │  │
│  │   icons+labels  │  │ - edge animations  │  │ - auto-scroll     │  │
│  └────────┬────────┘  └────────┬───────────┘  └────────┬──────────┘  │
│           │                   │                        │              │
├───────────┴───────────────────┴────────────────────────┴─────────────┤
│                          Services Layer                               │
│  ┌──────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  FlowService             │  │  ChatService                    │   │
│  │  (flow state + signals)  │  │  (SSE + message signals)        │   │
│  └──────────────────────────┘  └─────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────┤
│                     Analog.js Nitro API Layer                         │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │  src/server/routes/ (mock in dev, Persona B in prod)          │   │
│  │  POST /api/chat  ·  GET /api/flow  ·  POST /api/flow          │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `(editor).page.ts` | Root layout page — hosts all three panels, provides services | Analog.js `.page.ts` default export, flex/grid layout |
| `NodeSidebarComponent` | Palette of draggable node type chips — drag onto canvas to add | Standalone Angular component, drag source only |
| `FlowCanvasComponent` | The ngx-vflow (or ngx-xyflow) canvas — renders flow nodes/edges | Wraps flow library, outputs node clicks and topology changes |
| `NodeConfigPanelComponent` | Right-side panel — shows editable config when a node is selected | Conditionally shown via `selectedNode` signal from FlowService |
| `ChatPanelComponent` | Chat UI — message bubbles, input, streaming SSE display | Standalone, consumes ChatService signals |
| `CustomNodeComponent` (×6) | Individual node types (LLM, RAG, Router, Tool, Input, Output) | One standalone component per node type with its icon+color |
| `FlowService` | Single source of truth for flow graph state + active node | Injectable service with signals; no RxJS unless interop needed |
| `ChatService` | HTTP POST to initiate chat, EventSource for SSE stream, message state | Injectable service: signals for messages, Observable wrapping EventSource |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── pages/
│   │   └── (editor).page.ts        # Root layout: sidebar + canvas + chat
│   ├── features/
│   │   ├── flow/
│   │   │   ├── components/
│   │   │   │   ├── flow-canvas/
│   │   │   │   │   ├── flow-canvas.component.ts
│   │   │   │   │   └── flow-canvas.component.html
│   │   │   │   ├── node-sidebar/
│   │   │   │   │   └── node-sidebar.component.ts
│   │   │   │   ├── node-config-panel/
│   │   │   │   │   └── node-config-panel.component.ts
│   │   │   │   └── custom-nodes/
│   │   │   │       ├── llm-node.component.ts
│   │   │   │       ├── rag-node.component.ts
│   │   │   │       ├── router-node.component.ts
│   │   │   │       ├── tool-node.component.ts
│   │   │   │       ├── input-node.component.ts
│   │   │   │       └── output-node.component.ts
│   │   │   └── services/
│   │   │       └── flow.service.ts
│   │   └── chat/
│   │       ├── components/
│   │       │   ├── chat-panel/
│   │       │   │   ├── chat-panel.component.ts
│   │       │   │   └── chat-panel.component.html
│   │       │   └── message-bubble/
│   │       │       └── message-bubble.component.ts
│   │       └── services/
│   │           └── chat.service.ts
│   └── core/
│       ├── models/
│       │   └── types.ts              # Shared TS interfaces (Node, Edge, Message, etc.)
│       └── mock/
│           └── mock-backend.ts       # Dev mock for SSE + flow API
├── server/
│   └── routes/
│       ├── api/
│       │   ├── chat.post.ts          # POST /api/chat — triggers SSE stream
│       │   ├── flow.get.ts           # GET /api/flow — load saved flow
│       │   └── flow.post.ts          # POST /api/flow — save flow
│       └── mock/                     # (optional) mock SSE handler for dev
└── styles/
    └── globals.css                   # Tailwind base
```

### Structure Rationale

- **`pages/`:** Analog.js scans only `.page.ts` files here. One page (`(editor).page.ts`) covers the whole SPA. The pathless name `(editor)` means the route resolves at `/` without an `editor` segment.
- **`features/flow/` and `features/chat/`:** Each feature owns its components and service. Cross-feature communication goes through services only (no direct component injection).
- **`core/models/types.ts`:** Single file for shared TypeScript interfaces so both features use identical shape definitions.
- **`core/mock/`:** Mock backend lives in core so it is easily replaced; imported only in development.
- **`server/routes/`:** Analog.js Nitro API routes. Persona B owns these files in production; Persona A writes mocks here during development.

---

## Architectural Patterns

### Pattern 1: Signals-as-Service State Store

**What:** Injectable services expose private `WritableSignal`s internally and public `Signal`s (readonly) externally. Components inject services and read signals directly in templates — no `async` pipe, no subscriptions, no `BehaviorSubject`.

**When to use:** Always. This is the correct Angular 17+ pattern for state shared across multiple components, especially in a hackathon context where NgRx is overkill.

**Trade-offs:** Simpler than NgRx (no boilerplate), slightly less tooling (no Redux DevTools). Fully sufficient for this scope.

**Example — FlowService:**
```typescript
@Injectable({ providedIn: 'root' })
export class FlowService {
  // Private writable — only the service mutates these
  private _nodes = signal<FlowNode[]>([]);
  private _edges = signal<FlowEdge[]>([]);
  private _activeNodeId = signal<string | null>(null);
  private _selectedNodeId = signal<string | null>(null);

  // Public readonly — components read these
  readonly nodes = this._nodes.asReadonly();
  readonly edges = this._edges.asReadonly();
  readonly activeNodeId = this._activeNodeId.asReadonly();
  readonly selectedNodeId = this._selectedNodeId.asReadonly();

  // Derived state — auto-updates when selectedNodeId changes
  readonly selectedNode = computed(() =>
    this._nodes().find(n => n.id === this._selectedNodeId())
  );

  setActiveNode(id: string | null) {
    this._activeNodeId.set(id);
  }

  selectNode(id: string | null) {
    this._selectedNodeId.set(id);
  }

  updateNodes(nodes: FlowNode[]) {
    this._nodes.set(nodes);
  }
}
```

### Pattern 2: Observable-Wrapped EventSource for SSE

**What:** ChatService wraps the native `EventSource` API in an RxJS `Observable`. The service accumulates streamed chunks into a signal. Components read the signal; no subscription management in components.

**When to use:** For SSE streaming. EventSource callbacks run outside Angular's zone, so signals + `effect()` or manual `ChangeDetectorRef.markForCheck()` is needed.

**Trade-offs:** Slightly more complex than WebSocket but simpler infrastructure (serverless-compatible, no handshake).

**Example — ChatService:**
```typescript
@Injectable({ providedIn: 'root' })
export class ChatService {
  private _messages = signal<ChatMessage[]>([]);
  private _isStreaming = signal(false);
  private _eventSource: EventSource | null = null;

  readonly messages = this._messages.asReadonly();
  readonly isStreaming = this._isStreaming.asReadonly();

  constructor(private http: HttpClient) {}

  sendMessage(userText: string): void {
    // Append user message immediately
    this._messages.update(msgs => [...msgs, { role: 'user', content: userText }]);
    this._isStreaming.set(true);

    // POST to initiate — backend responds with stream ID or starts SSE
    this.http.post<{ streamId: string }>('/api/chat', { message: userText })
      .subscribe(({ streamId }) => this.startSseStream(streamId));
  }

  private startSseStream(streamId: string): void {
    let assistantContent = '';
    // Append placeholder for assistant message
    this._messages.update(msgs => [...msgs, { role: 'assistant', content: '' }]);

    this._eventSource = new EventSource(`/api/chat/stream?id=${streamId}`);

    this._eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'token') {
        assistantContent += data.token;
        // Update last message in place
        this._messages.update(msgs => {
          const updated = [...msgs];
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
          return updated;
        });
      }

      if (data.type === 'node_active') {
        // Cross-feature signal: tell FlowService which node is highlighted
        inject(FlowService).setActiveNode(data.nodeId);
      }

      if (data.type === 'done') {
        this._isStreaming.set(false);
        this._eventSource?.close();
        inject(FlowService).setActiveNode(null);
      }
    };
  }
}
```

### Pattern 3: Custom Node Components for ngx-vflow (or ngx-xyflow)

**What:** Each of the 6 node types is its own standalone Angular component. The flow library maps a `type` string on a node datum to a component class.

**When to use:** Always when you need distinct visual/behavioral variants of nodes.

**Trade-offs:** More files than a single generic node component but much cleaner styling isolation and allows per-type config panels.

**IMPORTANT — Library Reality Check:**

`@xyflow/angular` does **not exist** as an official npm package (confirmed Feb 2026). The PROJECT.md names it but two community alternatives exist:

| Library | Status | Angular | Notes |
|---------|--------|---------|-------|
| `ngx-xyflow` | Beta, community | Unknown | Wraps @xyflow/react via React interop; CD issues noted by maintainer |
| `ngx-vflow` | Active, v2.4.0 Feb 2026 | v19+ for v2.x; v17+ for v1.x | Native Angular, signals-based, no React dep |

**Recommendation:** Use `ngx-vflow` v1.x (Angular 17+ compatible). It has native signal support, active maintenance, and no React runtime dependency. The team selected "@xyflow/angular" likely meaning they want xyflow-like functionality — ngx-vflow delivers this natively.

**ngx-vflow custom node pattern (HIGH confidence from docs):**
```typescript
// custom-nodes/llm-node.component.ts
@Component({
  standalone: true,
  selector: 'app-llm-node',
  template: `
    <div class="node-llm">
      <div class="node-header">LLM</div>
      <div class="node-body">{{ data().model }}</div>
    </div>
  `,
})
export class LlmNodeComponent {
  data = input.required<{ model: string; prompt: string }>();
}
```

### Pattern 4: Cross-Feature Communication via Shared Service

**What:** ChatService and FlowService are both `providedIn: 'root'`. ChatService injects FlowService to fire `setActiveNode()` when SSE delivers `node_active` events. Components never talk to each other directly.

**When to use:** When two features need to react to each other's events (chat streaming → flow node highlighting).

**Data flow:**
```
ChatPanel (sends message)
    → ChatService.sendMessage()
        → POST /api/chat
            → SSE stream opens
                → data.type === 'node_active'
                    → FlowService.setActiveNode(nodeId)   ← cross-service call
                        → FlowCanvas reads activeNodeId signal
                            → CSS class applied to node = highlight
```

---

## Data Flow

### Request Flow: User Sends Chat Message

```
[User types + submits in ChatPanel]
        ↓
ChatService.sendMessage(text)
        ↓
POST /api/chat { message: text }
        ↓ (response: streamId)
EventSource('/api/chat/stream?id=...')
        ↓ (SSE chunks arrive)
  ├── type=token   → _messages signal updated (streaming text)
  ├── type=node_active → FlowService.setActiveNode(id)
  │                        → FlowCanvas re-renders with highlight class
  └── type=done    → _isStreaming.set(false), EventSource.close()
                     FlowService.setActiveNode(null)
```

### State Management

```
FlowService (providedIn: root)
    signals: nodes, edges, activeNodeId, selectedNodeId
        ↓ read by
    FlowCanvas ── renders ngx-vflow, applies active/selected CSS
    NodeSidebar ── drag source (no reads, only triggers addNode)
    NodeConfigPanel ── reads selectedNode (computed signal)

ChatService (providedIn: root)
    signals: messages, isStreaming
        ↓ read by
    ChatPanel ── message list, input disabled state
        ↓ writes to FlowService
    FlowService.activeNodeId ── for highlight
```

### Key Data Flows

1. **Node drag-drop:** User drags chip from NodeSidebar → drops on FlowCanvas → canvas component calls `FlowService.addNode(type, position)` → `_nodes` signal updated → ngx-vflow re-renders.
2. **Node selection:** User clicks node in FlowCanvas → `FlowService.selectNode(id)` → `selectedNode` computed signal fires → NodeConfigPanel appears with form fields.
3. **Chat + highlight:** User sends message → ChatService opens SSE → `node_active` events fire `FlowService.setActiveNode()` → `activeNodeId` signal → FlowCanvas applies `.node-active` CSS to matching node.
4. **Config edit:** User edits field in NodeConfigPanel → `FlowService.updateNodeData(id, patch)` → `_nodes` signal updated → FlowCanvas re-renders node with new data.

---

## Scaling Considerations

This is a hackathon demo. Scaling is not a concern. Architecture is deliberately simple.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Demo (1-2 users) | Current design — signals + services, no store library |
| Small team product | Add @ngrx/signals SignalStore per feature if team > 3 people |
| SaaS | Add user-scoped flow persistence, WebSocket (not SSE), NgRx full store |

### Scaling Priorities

1. **First bottleneck:** Large flow graphs (100+ nodes) — ngx-vflow v2.x has virtualization; stick to v1.x for Angular 17 but know v2 handles this.
2. **Second bottleneck:** Multiple simultaneous SSE streams — EventSource has browser limit of ~6 per domain; use a multiplexing approach or WebSocket at that point.

---

## Anti-Patterns

### Anti-Pattern 1: Using @xyflow/angular (the package does not exist)

**What people do:** Assume `@xyflow/angular` is on npm because React Flow / xyflow is popular and the project spec names it.
**Why it's wrong:** As of Feb 2026 there is no official `@xyflow/angular` npm package. `npm install @xyflow/angular` will fail or install the wrong package.
**Do this instead:** Use `ngx-vflow` (native Angular, active maintenance, signals-based) or `ngx-xyflow` (Angular wrapper around React Flow, beta status, brings React runtime as dependency).

### Anti-Pattern 2: Using BehaviorSubject / RxJS for simple shared state

**What people do:** Create services with `BehaviorSubject<Node[]>` and expose `.asObservable()`, then use `async` pipe in templates.
**Why it's wrong:** Angular 17+ signals are simpler, more performant (fine-grained updates), require no `async` pipe, and have no subscription leak risk. BehaviorSubject is only warranted when you need complex stream operators (debounce, combineLatest across 3+ streams).
**Do this instead:** Signals in services as shown in Pattern 1 above.

### Anti-Pattern 3: Mutating flow graph state in the canvas component

**What people do:** Put `nodes = [...]` and `edges = [...]` arrays directly on `FlowCanvasComponent`, handle all state there.
**Why it's wrong:** Chat panel cannot read or write node state without `@Output` chains or direct injection of the component. Breaks when NodeConfigPanel also needs to write.
**Do this instead:** All state in `FlowService`. Canvas and all other components read from and write to the service only.

### Anti-Pattern 4: Putting SSE streaming logic in the component

**What people do:** Open `EventSource` directly inside `ChatPanelComponent.ngOnInit()`.
**Why it's wrong:** Component is destroyed and re-created during navigation; EventSource leaks. More importantly, FlowService cannot receive `node_active` events from an EventSource buried in ChatPanel.
**Do this instead:** EventSource lifecycle in `ChatService`, which outlives any component because it's `providedIn: 'root'`.

### Anti-Pattern 5: Analog.js layout as a full NgModule

**What people do:** Try to create an `AppModule` or `FlowModule` with declarations for the three panels.
**Why it's wrong:** Analog.js 2.x + Angular 17+ is fully standalone. NgModules are not needed and add complexity.
**Do this instead:** All components are standalone. The `.page.ts` page component imports child components directly in its `imports: []` array.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Backend POST /api/chat | `HttpClient.post()` from ChatService | Returns `{ streamId }` or streams directly |
| Backend SSE stream | Native `EventSource` in ChatService | Runs outside zone; signals handle reactivity |
| Backend GET/POST /api/flow | `HttpClient` from FlowService | Load/save flow graph as JSON |
| Mock backend (dev) | Analog Nitro routes in `src/server/routes/mock/` | Simulates SSE with setInterval token emission |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| ChatPanel ↔ FlowCanvas | Via services (ChatService → FlowService) | No direct component-to-component |
| FlowCanvas ↔ NodeConfigPanel | FlowService `selectedNode` signal | Panel appears/disappears based on signal |
| NodeSidebar ↔ FlowCanvas | FlowService.addNode() call | Sidebar calls service; canvas reads nodes signal |
| Page component ↔ children | Input bindings for layout sizing only | No data passed via inputs — data flows through services |

---

## Build Order (Dependency Implications for Roadmap)

The following order reflects what must exist before each piece can be built or tested:

```
Phase 1 — Foundation
├── Analog.js project scaffold + Tailwind + routing
├── core/models/types.ts (FlowNode, FlowEdge, ChatMessage interfaces)
├── Three-panel layout in (editor).page.ts (shell, no logic)
└── Mock Nitro API routes (so chat can be tested without backend)

Phase 2 — Flow Editor
├── FlowService (signals: nodes, edges, activeNodeId, selectedNodeId)
├── ngx-vflow (or ngx-xyflow) installed and rendering default nodes
├── 6 custom node components
├── NodeSidebar (drag-to-canvas)
└── NodeConfigPanel (reads selectedNode signal)
    DEPENDS ON: FlowService, custom nodes, flow library installed

Phase 3 — Chat + SSE
├── ChatService (signals: messages, isStreaming + EventSource wrapper)
├── ChatPanel (reads ChatService signals)
└── SSE → FlowService.setActiveNode() wiring
    DEPENDS ON: FlowService.setActiveNode() exists, mock SSE route exists

Phase 4 — Integration + Polish
├── Real backend integration (swap mock Nitro routes for Persona B's API)
├── Edge animations during active node
├── Responsive layout for demo screen
└── Error states (SSE disconnect, API failure)
    DEPENDS ON: All previous phases complete
```

**Critical dependency:** `FlowService` must be built before `ChatService` because ChatService calls `FlowService.setActiveNode()`. This means Phase 2 (flow) must precede Phase 3 (chat) even if they seem independent.

---

## Sources

- [Analog.js File-Based Routing Docs](https://analogjs.org/docs/features/routing/overview) — HIGH confidence (official docs)
- [xyflow GitHub — Angular discussion #2012](https://github.com/xyflow/xyflow/discussions/2012) — HIGH confidence (official maintainer thread confirming no @xyflow/angular)
- [ngx-xyflow discussion #4887](https://github.com/xyflow/xyflow/discussions/4887) — HIGH confidence (beta status confirmed by maintainer)
- [ngx-vflow GitHub](https://github.com/artem-mangilev/ngx-vflow) — HIGH confidence (releases page confirms v2.4.0 on Feb 15, 2026)
- [Angular State Management 2025 — Nx Blog](https://nx.dev/blog/angular-state-management-2025) — HIGH confidence (Nx is core Angular ecosystem partner)
- [Angular signals with services — official docs](https://angular.dev/tutorials/signals/7-using-signals-with-services) — HIGH confidence (official Angular docs)
- [Angular component communication in 2025 — DEV](https://dev.to/brianmtreese/how-angular-components-should-communicate-in-2025-523a) — MEDIUM confidence (community article, consistent with official docs)
- [SSE with Angular — DEV Community](https://dev.to/icolomina/subscribing-to-server-sent-events-with-angular-ee8) — MEDIUM confidence (community article, pattern widely cited)
- [Angular feature-based structure 2025](https://www.ismaelramos.dev/blog/angular-2025-project-structure-with-the-features-approach/) — MEDIUM confidence (community article, consistent with Angular style guide direction)
- [Foblex Flow (additional alternative)](https://flow.foblex.com/) — MEDIUM confidence (official library site, Angular 15+ support confirmed)

---
*Architecture research for: Angular AI Agent Builder Frontend (Analog.js)*
*Researched: 2026-02-28*
