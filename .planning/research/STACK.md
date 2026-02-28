# Stack Research

**Domain:** Angular-based AI Agent Builder — Flow Editor + Chat UI (Hackathon Frontend)
**Researched:** 2026-02-28
**Confidence:** MEDIUM-HIGH (core stack HIGH, flow editor library MEDIUM due to `@xyflow/angular` not existing)

---

## CRITICAL FINDING: @xyflow/angular Does Not Exist

The project brief references `@xyflow/angular`, but **this package does not exist**. The xyflow team officially supports only React (`@xyflow/react`) and Svelte (`@xyflow/svelte`). No official Angular port has been released or announced.

The team must choose between two actively maintained Angular-native alternatives:
- `@foblex/flow` — more stars (442), latest release Feb 16 2026, Angular 15+
- `ngx-vflow` — less stars (456 but smaller community), latest v2.4.0 Feb 15 2026, requires Angular 19+

**Recommendation: `@foblex/flow`** — see rationale below.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Angular | 19.x | Core framework | Standalone components default in v19; signals stable; required by ngx-vflow v2, supported by Analog.js 2.x. Zone.js still usable but signals-first is the modern path. |
| Analog.js | 2.2.3 (`@analogjs/platform`) | Meta-framework (file-based routing, API routes, SSR, Nitro) | Only meta-framework for Angular with Next.js/Nuxt-equivalent DX. Enables frontend + Nitro API routes in one project for Vercel deploy. v2 supports Angular 17-20. |
| @foblex/flow | 18.1.0 | Visual flow editor (nodes, edges, drag/drop) | MIT, Angular-native, actively maintained (Feb 2026 release), supports SSR + standalone components + zoneless. `ng add @foblex/flow` works. See alternatives section for why NOT ngx-vflow for this project. |
| Tailwind CSS | 4.x (`tailwindcss` + `@tailwindcss/vite`) | Utility-first styling | v4 is the current standard (v3 is legacy). Vite plugin (`@tailwindcss/vite`) integrates cleanly with Analog.js's Vite build pipeline — no tailwind.config.js required. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@angular/core/rxjs-interop` | bundled with Angular 19 | Bridge between RxJS Observables (SSE streams) and Signals | Use `toSignal()` to convert SSE Observable → Signal for template reactivity. Avoids manual subscription management. |
| `ngx-sse-client` | latest | SSE consumption via Angular HttpClient | Preferred over raw `EventSource` because: works with Angular HttpInterceptors, stays in the Observable/RxJS pipeline, proper Angular DI injection. |
| RxJS | 7.x (bundled with Angular) | Async stream management for SSE | SSE is the canonical use case where RxJS still beats pure Signals. Use `fromEvent` or `ngx-sse-client` Observable, then `toSignal()` for UI. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite 6.x | Build tool (provided by Analog.js) | Analog.js brings Vite — do not install separately. `@tailwindcss/vite` plugin adds Tailwind v4. |
| Vitest 3.x | Unit testing (provided by Analog.js 2.x) | Analog.js 2.x officially supports Vitest 3-4. Skip for hackathon; add later. |
| Nitro (via Analog.js) | Server engine for API routes | `src/server/routes/` for API routes. Persona B's SSE endpoint lives here. Do not install Nitro separately. |

---

## Installation

```bash
# 1. Create new Analog.js project
npm create analog@latest
# Select: Angular, SSR enabled, file-based routing

# 2. Add Foblex Flow via Angular CLI schematic (sets up imports automatically)
ng add @foblex/flow

# 3. Install Tailwind CSS v4 with Vite plugin (Analog.js uses Vite)
npm install tailwindcss @tailwindcss/vite

# 4. Install SSE client
npm install ngx-sse-client

# 5. PostCSS config (only if NOT using Vite plugin — prefer Vite plugin for Analog)
# NOT needed if using @tailwindcss/vite

# Dev dependencies (already included by Analog.js scaffolding)
# @analogjs/platform, @analogjs/vite-plugin-angular, vite, vitest
```

**vite.config.ts additions for Tailwind v4:**
```typescript
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import analog from '@analogjs/platform';

export default defineConfig({
  plugins: [
    analog(),
    tailwindcss(), // Add this
  ],
});
```

**src/styles.css:**
```css
@import "tailwindcss";
```

**Foblex Flow minimal template:**
```html
<f-flow fDraggable>
  <f-canvas>
    <f-connection fOutputId="output1" fInputId="input1"></f-connection>
    <div fNode fDragHandle [fNodePosition]="{ x: 32, y: 32 }"
         fNodeOutput fOutputId="output1" fOutputConnectableSide="right">
      Agent Node
    </div>
  </f-canvas>
</f-flow>
```

**SSE consumption pattern with signals:**
```typescript
@Injectable({ providedIn: 'root' })
export class ChatService {
  private sse = inject(SseClient);

  streamResponse(prompt: string): Observable<string> {
    return this.sse.stream('/api/chat', { body: { prompt } }).pipe(
      map(event => event.data)
    );
  }
}

// In component:
streamTokens = toSignal(
  this.chatService.streamResponse(this.currentPrompt()),
  { initialValue: '' }
);
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@foblex/flow` | `ngx-vflow` | If you are already on Angular 19.2.17+ and want a more React Flow-like signals-native API with subflows (nested flows). ngx-vflow v2.4.0 (Feb 2026) is viable but requires Angular 19.2.17+ as a hard minimum — `ng add` schematic not confirmed. |
| `@foblex/flow` | `ngx-xyflow` | Only if you need exact React Flow API parity and are comfortable with a lower-star, less-established community package. Not recommended for a hackathon. |
| Tailwind CSS v4 | Tailwind CSS v3 | Only if you need to support legacy browsers (pre-Safari 16.4, Chrome < 111). v4 is standard for new Vite projects in 2026. |
| `ngx-sse-client` | Raw `EventSource` | Raw `EventSource` works fine for simple use cases. Use raw `EventSource` if you don't need HttpInterceptor support. For this project, `ngx-sse-client` is cleaner in the Angular DI context. |
| Analog.js | Angular + Express/Fastify separately | If you wanted full control of the backend server. Overkill for a hackathon. Analog.js + Nitro handles the SSE route alongside the Angular app in one deployable unit. |
| Angular signals | NgRx | NgRx is overkill for a hackathon. Use `signal()`, `computed()`, and `effect()` directly in services. Flow state (`flow.service.ts`) and chat state (`chat.service.ts`) as signal-based services is sufficient. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@xyflow/angular` | **Does not exist** as an npm package. The xyflow team has no official Angular support. Any package with this exact name would be unofficial/unmaintained. | `@foblex/flow` (Angular-native, MIT, active) |
| `ngx-reactflow` | Deprecated and redirected to `ngx-xyflow`. Last meaningful maintenance ended mid-2024. | `@foblex/flow` or `ngx-vflow` |
| Tailwind CSS v3 with `tailwind.config.js` | Legacy configuration format. PostCSS-only setup in Analog.js is more fragile. v4 with `@tailwindcss/vite` is simpler. | Tailwind CSS v4 with Vite plugin |
| SCSS with Tailwind v4 | Tailwind v4 does not support SCSS preprocessors by design. `@apply` directives no longer work globally in SCSS files. Angular default SCSS style causes friction. | Set up Angular project with `--style css` |
| NgModules | Removed as the idiomatic Angular pattern in v19. Adds boilerplate and prevents tree-shaking. | Standalone components (`@Component({ standalone: true })`) — this is the default in Angular 19 |
| WebSockets for LLM streaming | More complex than SSE for unidirectional streaming, requires special serverless handling on Vercel. | SSE via `ngx-sse-client` — native HTTP, Vercel-compatible, browser auto-reconnects |
| `zone.js`-dependent change detection | Deprecated direction. Foblex Flow and ngx-vflow both support zoneless. | Angular's signal-based change detection with `provideExperimentalZonelessChangeDetection()` (or keep zone.js for hackathon speed) |

---

## Stack Patterns by Variant

**For this hackathon (speed over perfection):**
- Keep `zone.js` enabled — removing it requires ensuring every third-party library is zoneless-compatible; not worth the risk in 18 hours
- Use `@foblex/flow` with `ng add` — schematic handles module setup automatically
- Use `ngx-sse-client` + `toSignal()` for chat streaming — minimal boilerplate
- Tailwind v4 with `@tailwindcss/vite` — zero configuration friction

**If production-grade (post-hackathon):**
- Migrate to zoneless (`provideExperimentalZonelessChangeDetection()`)
- Evaluate `ngx-vflow` v3+ when it stabilizes on Angular 19+
- Add NgRx SignalStore if state grows beyond 2 services
- Add E2E tests with Playwright (included in Analog.js)

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@analogjs/platform@2.2.3` | Angular 17–20 | v2 supports Vite 6-7, Vitest 3-4. Angular 19 recommended. |
| `@foblex/flow@18.1.0` | Angular 15+ | Naming convention mirrors Angular version (18.x = Angular 18+). Test with Angular 19 — likely fine per "Angular 15+" claim. |
| `ngx-vflow@2.4.0` | Angular 19.2.17+ (hard minimum for v2) | v1.x for Angular 17. Use v2 only if scaffold lands on Angular 19.2+. |
| `tailwindcss@4.x` + `@tailwindcss/vite` | Vite 4+ | Analog.js 2.x uses Vite 6-7. Compatible. |
| `ngx-sse-client` | Angular 14+ | Observable-based, works with RxJS 7.x bundled with Angular 19. |

---

## Confidence Assessment

| Decision | Confidence | Basis |
|----------|------------|-------|
| Analog.js 2.2.3 as meta-framework | HIGH | Official docs, InfoQ article, npm confirmed. Angular 17-20 support verified. |
| `@xyflow/angular` does not exist | HIGH | Official xyflow GitHub, npm search, community discussions all confirm no Angular package. |
| `@foblex/flow` as flow editor | MEDIUM | Docs + GitHub + npm verified. Angular 19 compatibility inferred from "Angular 15+" claim — not directly tested. |
| Tailwind v4 with `@tailwindcss/vite` in Analog | MEDIUM | Community discussion confirmed the pattern works. Official Tailwind docs confirm Vite plugin. Analog + Tailwind v4 combo is in active community use. |
| `ngx-sse-client` for SSE | MEDIUM | npm package exists and is documented. Pattern of `toSignal()` interop is from official Angular docs (HIGH) but the specific `ngx-sse-client` integration is from community sources. |
| Angular 19 standalone + signals | HIGH | Official angular.dev docs. Signals stable in v20, experimental but usable in v19. |

---

## Sources

- [AnalogJS 2.0 announcement — DEV Community](https://dev.to/analogjs/announcing-analogjs-20-348d) — version, Angular support range
- [AnalogJS 2.0 — InfoQ coverage](https://www.infoq.com/news/2025/11/analogjs-2-angular/) — Angular 17-20 support, bundle size improvements
- [Analog.js Getting Started](https://analogjs.org/docs/getting-started) — `npm create analog@latest`, setup commands
- [xyflow GitHub — Angular Discussion #2012](https://github.com/xyflow/xyflow/discussions/2012) — confirmed no official `@xyflow/angular`
- [Foblex f-flow GitHub](https://github.com/Foblex/f-flow) — v18.1.0 Feb 2026, 442 stars, Angular 15+, MIT
- [Foblex Flow Get Started](https://flow.foblex.com/docs/get-started) — `ng add @foblex/flow`, template structure
- [ngx-vflow GitHub](https://github.com/artem-mangilev/ngx-vflow) — v2.4.0 Feb 2026, Angular 19.2.17+ for v2
- [Tailwind CSS v4 Angular guide](https://tailwindcss.com/docs/guides/angular) — PostCSS setup, `@import "tailwindcss"`
- [Tailwind + Analog.js + Vite discussion](https://github.com/tailwindlabs/tailwindcss/discussions/17716) — confirms `@tailwindcss/vite` works with Analog.js
- [Angular RxJS Interop — official docs](https://angular.dev/ecosystem/rxjs-interop) — `toSignal()` API, HIGH confidence
- [Angular Signals overview](https://angular.dev/guide/signals) — stable signals in v20, usable in v19
- [ngx-sse-client — npm](https://www.npmjs.com/package/ngx-sse-client) — HttpClient-based SSE Observable

---

*Stack research for: Angular AI Agent Builder — Flow Editor + Chat UI Frontend*
*Researched: 2026-02-28*
