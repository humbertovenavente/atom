# Phase 1: Foundation & Setup - Research

**Researched:** 2026-02-28
**Domain:** Analog.js + Angular 19, @foblex/flow, Tailwind CSS v4, Nitro SSE
**Confidence:** MEDIUM-HIGH (core stack verified via official docs and WebFetch; some peripheral details LOW)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Three-panel layout: sidebar (left), canvas (center), chat (right)
- Sidebar should show node types for drag-and-drop (style at Claude's discretion)
- Canvas should validate @foblex/flow renders without SSR errors
- Chat panel should have at minimum an input field and send button shell
- Must export: FlowNode, FlowEdge, ChatMessage, AgentConfig from models/types.ts
- 6 node types: Memoria, Orquestador, Validador, Especialista, Genérico, Tool
- Must include node_active event per STATE.md contract: `{"type":"node_active","nodeId":"..."}`
- SSR must be disabled in vite.config.ts (existing decision from STATE.md)
- @foblex/flow installed via `ng add @foblex/flow` (existing decision from STATE.md)

### Claude's Discretion
- Panel proportions, fixed vs resizable, initial content in each panel
- Color scheme (dark/light), typography, spacing
- Specific node type colors (6 types need distinct colors)
- Node highlighting style for Phase 3 active-agent effect
- Design types that cover Phase 2-4 needs without over-engineering
- Whether type names in code use Spanish or English
- How much metadata to include in ChatMessage (must support node highlighting in Phase 3)
- Alignment with backend contract vs frontend-only design
- Level of SSE simulation realism
- Full vs minimal SSE event set (token, message_complete, error)
- Timing delays between tokens
- API route paths (production-matching vs mock-prefixed)
- All implementation details across all areas

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SETUP-01 | Proyecto Analog.js creado con Angular 17+, Tailwind CSS, y routing file-based | Analog scaffold via `npm create analog@latest`, Tailwind v4 install confirmed |
| SETUP-02 | Librería de flow editor instalada y funcionando (alternativa a @xyflow/angular) | @foblex/flow v18.1.0 via `ng add @foblex/flow`; fallback: ngx-vflow |
| SETUP-03 | Layout principal con 3 paneles: sidebar izq + canvas centro + panel der (chat) | CSS Grid or Flexbox in root AppComponent; pure CSS, no extra library needed |
| SETUP-04 | Interfaces TypeScript compartidas definidas en models/types.ts | Standard Angular pattern; design guidance provided below |
| SETUP-05 | Mock de backend (API routes de Nitro) para desarrollo independiente | Nitro `createEventStream` + h3 `defineEventHandler`; SSE confirmed supported |
</phase_requirements>

---

## Summary

Phase 1 is a greenfield Analog.js setup on top of Angular 19. The Analog meta-framework (Vite + Nitro) is the primary orchestrator — it handles file-based routing, the dev server, and the API layer. The key challenge is getting @foblex/flow to render correctly without SSR errors; the solution is straightforward: disable SSR globally in vite.config.ts on day one (already a locked decision).

The three-panel layout is pure Angular + CSS (no additional layout library needed). Tailwind CSS v4 is now CSS-first (`@import "tailwindcss"` in styles.css with a .postcssrc.json), which is a breaking change from v3. The Nitro SSE mock uses `createEventStream` from h3, available natively in Analog's server layer.

The most important risk is @foblex/flow Angular 19 compatibility: the latest release (v18.1.0, February 2026) claims Angular 15+ support, and the `ng add` schematic works across both Angular CLI and Nx. However, explicit Angular 19 testing is not confirmed in public documentation. Plan for ngx-vflow as a 30-minute fallback if `ng add @foblex/flow` fails.

**Primary recommendation:** Scaffold with `npm create analog@latest`, disable SSR immediately, install @foblex/flow via schematic, add Tailwind v4 CSS-first, wire the three-panel layout in the root component, define types, and implement the Nitro SSE mock — in that order.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Analog.js | latest (2.x) | Meta-framework: file routing, Nitro API, Vite build | Locked by project |
| Angular | 19.x (scaffolded) | Component framework | Locked by project |
| @foblex/flow | 18.1.0 (Feb 2026) | Flow canvas / node editor | Locked by project |
| Tailwind CSS | v4.x | Utility-first CSS | Locked by project |
| TypeScript | 5.x (Angular 19 default) | Type safety | Standard Angular |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tailwindcss/postcss | v4.x | PostCSS integration for Tailwind v4 | Required alongside Tailwind v4 |
| postcss | latest | CSS transform pipeline | Required by Tailwind v4 |
| h3 | bundled with Nitro | Event handler utilities, `createEventStream` | SSE mock backend |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @foblex/flow | ngx-vflow | ngx-vflow requires Angular 19.2.17+, simpler API but fewer features; use if `ng add @foblex/flow` fails |
| Tailwind v4 CSS-first | Tailwind v3 | v3 uses tailwind.config.js and is more familiar; v4 is what create-analog scaffolds in 2025 |
| Nitro SSE (`createEventStream`) | Manual `res.write` with text/event-stream headers | Manual approach works but `createEventStream` is cleaner and handles connection lifecycle |

**Installation:**
```bash
# 1. Scaffold Analog project
npm create analog@latest

# 2. Install @foblex/flow via schematic
ng add @foblex/flow

# 3. Install Tailwind v4 (if not selected during scaffold)
npm install tailwindcss @tailwindcss/postcss postcss --force
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── pages/
│   │   └── index.page.ts          # Main page (three-panel layout)
│   ├── components/
│   │   ├── sidebar/               # Node palette sidebar
│   │   ├── canvas/                # @foblex/flow canvas wrapper
│   │   └── chat/                  # Chat input shell
│   └── app.config.ts              # App providers (provideFileRouter, provideHttpClient)
├── server/
│   └── routes/
│       └── api/
│           └── chat.ts            # Mock SSE endpoint
├── models/
│   └── types.ts                   # Shared TypeScript interfaces
└── styles.css                     # @import "tailwindcss";
vite.config.ts                     # analog({ ssr: false })
.postcssrc.json                    # { "plugins": { "@tailwindcss/postcss": {} } }
```

### Pattern 1: Disable SSR in vite.config.ts

**What:** Set `ssr: false` in the Analog plugin to avoid `window is not defined` errors from @foblex/flow.
**When to use:** Always for this project — canvas libraries access browser APIs at import time.

```typescript
// vite.config.ts
// Source: https://analogjs.org/docs/features/server/server-side-rendering
import { defineConfig } from 'vite';
import analog from '@analogjs/platform';

export default defineConfig(({ mode }) => ({
  plugins: [
    analog({
      ssr: false,
      prerender: {
        routes: [],
      },
    }),
  ],
}));
```

### Pattern 2: @foblex/flow Basic Canvas

**What:** Minimum viable canvas that proves @foblex/flow renders without errors.
**When to use:** Phase 1 canvas validation step.

```html
<!-- canvas component template -->
<!-- Source: https://flow.foblex.com/docs/get-started -->
<f-flow fDraggable>
  <f-canvas>
    <!-- connections first, then nodes -->
    <f-connection fOutputId="out-1" fInputId="in-1"></f-connection>

    <div
      fNode
      fDragHandle
      fNodeOutput
      [fNodePosition]="{ x: 100, y: 100 }"
      fOutputId="out-1"
      fOutputConnectableSide="right">
      Node A
    </div>

    <div
      fNode
      fDragHandle
      fNodeInput
      [fNodePosition]="{ x: 300, y: 100 }"
      fInputId="in-1"
      fInputConnectableSide="left">
      Node B
    </div>
  </f-canvas>
</f-flow>
```

```typescript
// canvas.component.ts — import the module that ng add installs
import { FFlowModule } from '@foblex/flow';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [FFlowModule],
  templateUrl: './canvas.component.html',
})
export class CanvasComponent {}
```

### Pattern 3: Three-Panel Layout with CSS Grid

**What:** Full-viewport three-panel layout using CSS Grid on the root page component.
**When to use:** Root page `index.page.ts`.

```typescript
// src/app/pages/index.page.ts
import { Component } from '@angular/core';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { CanvasComponent } from '../components/canvas/canvas.component';
import { ChatComponent } from '../components/chat/chat.component';

@Component({
  selector: 'app-index',
  standalone: true,
  imports: [SidebarComponent, CanvasComponent, ChatComponent],
  template: `
    <div class="grid h-screen" style="grid-template-columns: 240px 1fr 320px;">
      <app-sidebar class="border-r border-gray-700 overflow-y-auto" />
      <app-canvas class="overflow-hidden" />
      <app-chat class="border-l border-gray-700 flex flex-col" />
    </div>
  `,
})
export class IndexPageComponent {}
```

### Pattern 4: Nitro SSE Mock with createEventStream

**What:** Mock `/api/chat` SSE endpoint that emits scripted events including `node_active`.
**When to use:** Phase 1 mock backend (SETUP-05).

```typescript
// src/server/routes/api/chat.ts
// Source: https://nitro.build/guide/websocket (SSE section)
import { defineEventHandler, createEventStream } from 'h3';

interface SseEvent {
  type: 'token' | 'node_active' | 'message_complete' | 'error';
  nodeId?: string;
  token?: string;
}

export default defineEventHandler(async (event) => {
  const eventStream = createEventStream(event);

  const script: SseEvent[] = [
    { type: 'node_active', nodeId: 'orchestrator-1' },
    { type: 'token', token: 'Procesando' },
    { type: 'token', token: ' tu' },
    { type: 'token', token: ' solicitud...' },
    { type: 'node_active', nodeId: 'specialist-1' },
    { type: 'token', token: ' Respuesta' },
    { type: 'token', token: ' completada.' },
    { type: 'message_complete' },
  ];

  let i = 0;
  const interval = setInterval(async () => {
    if (i < script.length) {
      await eventStream.push(JSON.stringify(script[i]));
      i++;
    } else {
      clearInterval(interval);
      await eventStream.close();
    }
  }, 200);

  eventStream.onClosed(async () => {
    clearInterval(interval);
    await eventStream.close();
  });

  return eventStream.send();
});
```

**NOTE:** The `push()` method accepts a string. The SSE event type/id fields are set by the `createEventStream` internals. To send structured data, serialize to JSON string and parse on the client. The contract shape `{"type":"node_active","nodeId":"..."}` is carried in the data payload string.

### Pattern 5: Shared TypeScript Interfaces

**What:** Minimal interfaces in `src/models/types.ts` designed to cover Phase 2-4 needs.

```typescript
// src/models/types.ts

export type NodeType =
  | 'memoria'
  | 'orquestador'
  | 'validador'
  | 'especialista'
  | 'generico'
  | 'tool';

export interface FlowNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  data?: {
    systemPrompt?: string;
    temperature?: number;
    [key: string]: unknown;
  };
}

export interface FlowEdge {
  id: string;
  sourceId: string;      // matches fOutputId on source node
  targetId: string;      // matches fInputId on target node
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  activeNodeId?: string; // populated from node_active events — enables Phase 3 highlighting
}

export interface AgentConfig {
  nodeId: string;
  nodeType: NodeType;
  systemPrompt: string;
  temperature: number;   // 0.0 - 2.0
}

// SSE event shapes (backend contract)
export type SseEventType = 'token' | 'node_active' | 'message_complete' | 'error';

export interface SseEvent {
  type: SseEventType;
  nodeId?: string;       // present on node_active events
  token?: string;        // present on token events
  message?: string;      // present on error events
}
```

### Pattern 6: Tailwind CSS v4 Configuration

**What:** CSS-first Tailwind v4 configuration — no tailwind.config.js.
**When to use:** Immediately after scaffold.

```json
// .postcssrc.json (root of project)
// Source: https://tailwindcss.com/docs/installation/framework-guides/angular
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

```css
/* src/styles.css */
@import "tailwindcss";

/* Global resets for full-viewport app */
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
```

### Anti-Patterns to Avoid

- **Do NOT use SSR guard hooks** (`isPlatformBrowser`) instead of disabling SSR: canvas libraries like @foblex/flow access `window` at module load time, so guards inside components are ineffective.
- **Do NOT nest `<f-canvas>` outside `<f-flow>`**: all nodes and connections must be children of `<f-canvas>` which is itself inside `<f-flow>`.
- **Do NOT use Tailwind v3 config patterns** (tailwind.config.js, `@tailwind base/components/utilities`): v4 is entirely CSS-first.
- **Do NOT use `RouterModule`**: Analog uses `provideFileRouter()` from `@analogjs/router`, not the classic RouterModule.
- **Do NOT define node output IDs and input IDs without ensuring they are unique** across the flow — @foblex/flow matches connections by exact string ID equality.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Flow canvas rendering | Custom SVG drag-and-drop system | @foblex/flow | Edge routing, zoom, pan, connection management are each 500+ LOC problems |
| SSE connection lifecycle | Manual `res.write` loop with keep-alive headers | `createEventStream` from h3 | Connection cleanup, error handling, back-pressure are non-trivial |
| CSS utility classes | Component-level inline styles | Tailwind CSS v4 | Consistency, responsive design, hackathon speed |
| File-based routing | Express-style manual router | Analog's file router | Analog already provides it — duplicating breaks the SSR opt-out config |
| TypeScript path aliases | Manual relative imports (`../../models/types`) | `tsconfig.json` `paths` config | Prevents refactoring pain when moving files between phases |

**Key insight:** The entire value of Analog.js is that Nitro, file routing, and the Vite build are pre-integrated. Any hand-rolled alternative costs 2-4 hours in a hackathon context.

---

## Common Pitfalls

### Pitfall 1: SSR Window Error from @foblex/flow

**What goes wrong:** `ReferenceError: window is not defined` at server startup or first request.
**Why it happens:** @foblex/flow (and most canvas/D3 libraries) reference `window` or `document` at module initialization, before any component lifecycle guard can run. Analog's SSR server renders components on Node.js where `window` does not exist.
**How to avoid:** Set `ssr: false` in `vite.config.ts` before installing @foblex/flow. This is a LOCKED decision.
**Warning signs:** Error visible in terminal on `npm run dev`, not in browser console.

### Pitfall 2: Tailwind v4 Breaking Changes vs v3

**What goes wrong:** Tailwind utility classes not applied; build error about missing config.
**Why it happens:** Tailwind v4 is "CSS-first." There is no `tailwind.config.js` by default. Directives `@tailwind base`, `@tailwind components`, `@tailwind utilities` are removed — replaced by `@import "tailwindcss"`.
**How to avoid:** Create `.postcssrc.json` at project root and add `@import "tailwindcss"` to `styles.css`. Do not create `tailwind.config.js` unless customizing the theme.
**Warning signs:** Tailwind classes have no effect; build log shows PostCSS plugin not found.

### Pitfall 3: @foblex/flow ng add Schematic Failure

**What goes wrong:** `ng add @foblex/flow` throws a peer dependency error or Angular version mismatch.
**Why it happens:** @foblex/flow claims Angular 15+ support but explicit Angular 19 test coverage is not publicly confirmed. `ng add` schematics check `peerDependencies` at install time.
**How to avoid:** Run `ng add @foblex/flow` first, before other changes. If it fails, use fallback: `npm install ngx-vflow` (explicitly supports Angular 19.2.17+). The 30-minute fallback budget is justified.
**Warning signs:** npm error about peer dependency, schematic aborts without modifying files.

### Pitfall 4: Analog app.config.ts Missing provideFileRouter

**What goes wrong:** File-based routes (`.page.ts` files) don't resolve; app shows blank or 404.
**Why it happens:** Analog's file router is not enabled by default in bare Angular — it must be added via `provideFileRouter()` from `@analogjs/router`.
**How to avoid:** Ensure `app.config.ts` includes both `provideFileRouter()` and `provideHttpClient(withFetch())`.

```typescript
// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideFileRouter, requestContextInterceptor } from '@analogjs/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFileRouter(),
    provideHttpClient(
      withFetch(),
      withInterceptors([requestContextInterceptor]),
    ),
  ],
};
```

**Warning signs:** Navigation to `/` shows blank screen; dev console shows router errors.

### Pitfall 5: @foblex/flow Requires Styles — None Are Default

**What goes wrong:** Canvas renders but nodes are invisible or have no size/border.
**Why it happens:** @foblex/flow provides no default component styles — you must define `.f-flow`, `.f-node` heights and appearance.
**How to avoid:** Add minimum CSS to `styles.css` after install.

```css
/* styles.css — minimum @foblex/flow styles */
.f-flow {
  width: 100%;
  height: 100%;
  background: #1a1a2e;
}
.f-node {
  padding: 12px 16px;
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 6px;
  cursor: grab;
  color: #e0e0e0;
}
.f-node.f-selected {
  border-color: #6c63ff;
  box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.4);
}
```

**Warning signs:** Canvas area is blank; no visual nodes appear even though Angular component renders.

### Pitfall 6: SSE push() Sends Raw String — Client Must JSON.parse

**What goes wrong:** Frontend tries to access `event.type` but gets undefined because the SSE data is a raw JSON string.
**Why it happens:** `createEventStream.push()` accepts a string — there is no built-in typed event routing. The JSON must be parsed by the consumer.
**How to avoid:** On the server, `push(JSON.stringify(payload))`. On the client, `JSON.parse(event.data)` before reading `.type`.
**Warning signs:** `event.type` is undefined; `event.data` is a string like `'{"type":"node_active",...}'`.

---

## Code Examples

### Analog API Route (SSE) — Verified Pattern

```typescript
// src/server/routes/api/chat.ts
// Source: https://nitro.build/guide/websocket (SSE section)
import { defineEventHandler, createEventStream } from 'h3';

export default defineEventHandler(async (event) => {
  const eventStream = createEventStream(event);

  // Push one event immediately, then close
  await eventStream.push(JSON.stringify({
    type: 'node_active',
    nodeId: 'orchestrator-1'
  }));

  eventStream.onClosed(async () => {
    await eventStream.close();
  });

  return eventStream.send();
});
```

### Tailwind v4 PostCSS Config — Verified Pattern

```json
// .postcssrc.json
// Source: https://tailwindcss.com/docs/installation/framework-guides/angular
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

### Analog app.config.ts — Verified Pattern

```typescript
// src/app/app.config.ts
// Source: https://analogjs.org/docs/features/api/overview (inferred from Analog docs)
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideFileRouter, requestContextInterceptor } from '@analogjs/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFileRouter(),
    provideHttpClient(
      withFetch(),
      withInterceptors([requestContextInterceptor]),
    ),
  ],
};
```

### vite.config.ts SSR Disable — Verified Pattern

```typescript
// vite.config.ts
// Source: https://analogjs.org/docs/features/server/server-side-rendering
import { defineConfig } from 'vite';
import analog from '@analogjs/platform';

export default defineConfig(({ mode }) => ({
  plugins: [
    analog({
      ssr: false,
      prerender: { routes: [] },
    }),
  ],
}));
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` + `@tailwind base/components/utilities` | `.postcssrc.json` + `@import "tailwindcss"` in CSS | Tailwind v4 (2025) | Must not use v3 patterns even if familiar |
| `NgModule` + `RouterModule.forRoot()` | Standalone components + `provideFileRouter()` | Angular 15+ / Analog | All components in this project are standalone |
| `ng add @angular/ssr` for SSR | `analog({ ssr: false })` to disable SSR | Analog architecture | Analog manages SSR, not Angular Universal |
| `@xyflow/angular` (does not exist) | `@foblex/flow` or `ngx-vflow` | Project research | @xyflow is React-only; confirmed in STATE.md |

**Deprecated/outdated:**
- `@xyflow/angular`: Does not exist as an npm package. Do not use.
- `NgModule`-based architecture: Not used in Angular 19 standalone projects.
- `tailwind.config.js` (for v4): v4 is CSS-first; config file only needed for custom theme overrides.

---

## Open Questions

1. **@foblex/flow exact Angular 19 peer dependency**
   - What we know: Latest release is v18.1.0 (February 2026). Claims Angular 15+ support. `ng add` schematic exists.
   - What's unclear: Whether Angular 19 is tested and peer-deps pass without `--force`.
   - Recommendation: Run `ng add @foblex/flow` as the first action in Phase 1. If schematic fails, immediately switch to ngx-vflow (`npm install ngx-vflow`). Document the outcome in STATE.md for Phase 2.

2. **`createEventStream` push() typed event fields**
   - What we know: `push(string)` sends data. The SSE protocol supports `event:`, `data:`, and `id:` fields.
   - What's unclear: Whether h3's `createEventStream` exposes the SSE event-type field, or only the data field (internal docs not accessible).
   - Recommendation: Use the data-as-JSON approach: push JSON string, parse on client. This is confirmed to work and matches the `{"type":"node_active","nodeId":"..."}` contract shape.

3. **Analog 2.0 scaffold vs 1.x scaffold differences**
   - What we know: Analog 2.0 was released in 2025 (InfoQ, November 2025). `npm create analog@latest` will scaffold 2.x.
   - What's unclear: Whether `vite.config.ts` structure, `app.config.ts` providers, and file layout differ meaningfully from 1.x examples.
   - Recommendation: Accept scaffold output as-is, then apply `ssr: false` and provider changes from locked decisions.

---

## Sources

### Primary (HIGH confidence)
- [Analog SSR docs](https://analogjs.org/docs/features/server/server-side-rendering) — `ssr: false` config in `analog()` plugin verified
- [Analog API Routes docs](https://analogjs.org/docs/features/api/overview) — file-based API routes in `src/server/routes/api/`, h3 + Nitro confirmed
- [Nitro WebSocket/SSE guide](https://nitro.build/guide/websocket) — `createEventStream` pattern verified
- [Tailwind Angular install guide](https://tailwindcss.com/docs/installation/framework-guides/angular) — v4 `.postcssrc.json` and `@import "tailwindcss"` verified
- [@foblex/flow get-started](https://flow.foblex.com/docs/get-started) — `ng add @foblex/flow`, `<f-flow>/<f-canvas>/<f-connection>` template verified

### Secondary (MEDIUM confidence)
- [WebSearch: @foblex/flow GitHub releases](https://github.com/Foblex/f-flow/releases) — v18.1.0 current version, Angular 15+ claim
- [WebSearch: ngx-vflow npm](https://www.npmjs.com/package/ngx-vflow) — Angular 19.2.17+ support confirmed
- [WebSearch: Analog Getting Started](https://analogjs.org/docs/getting-started) — `npm create analog@latest` scaffold command
- [WebSearch: Analog app.config.ts providers](https://github.com/brandonroberts/analog-angular-start) — `provideFileRouter`, `requestContextInterceptor` pattern

### Tertiary (LOW confidence)
- SSE Nuxt 3 gist — `res.write`-based manual SSE approach (fallback reference only, not the primary path)
- WebSearch: "Analog 2.0 Angular 19 scaffold" — 2.x scaffold structure inferred, not directly verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all major libraries verified via official docs or direct page fetch
- Architecture: MEDIUM-HIGH — patterns from official docs; @foblex/flow Angular 19 exact compat is MEDIUM (unverified peer deps)
- Pitfalls: MEDIUM — SSR pitfall verified by Analog docs; others inferred from library behavior patterns

**Research date:** 2026-02-28
**Valid until:** 2026-03-07 (7 days — fast-moving stack: @foblex/flow active releases, Analog 2.x in active development)
