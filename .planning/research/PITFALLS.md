# Pitfalls Research

**Domain:** Angular flow editor + chat UI (AI Agent Builder frontend)
**Researched:** 2026-02-28
**Confidence:** MEDIUM — ngx-xyflow is beta, Analog.js 2.x has thin community coverage; React Flow performance docs are HIGH confidence; Angular SSE patterns are HIGH confidence.

---

## Critical Pitfalls

### Pitfall 1: @xyflow/angular Does Not Exist — Wrong Package Name

**What goes wrong:**
The team assumes there is an official `@xyflow/angular` package from the xyflow maintainers. No such package exists on npm. The xyflow team only publishes `@xyflow/react` and `@xyflow/svelte`. Using `ngx-xyflow` (the community Angular wrapper) is the correct path, but it is in **beta**, has missing features (custom edges, Panel component, EdgeLabelRenderer), and bundles `@xyflow/react` + `react` as actual dependencies.

**Why it happens:**
The project spec says "@xyflow/angular" because that's the logical name pattern, but it was written aspirationally. Developers install what the spec says without verifying the npm registry.

**How to avoid:**
- Install `ngx-xyflow` (not `@xyflow/angular`) during setup.
- Verify the package on npm: `npm info ngx-xyflow`.
- Read the ngx-xyflow README before writing any node code — its feature gaps (no custom edges yet) affect architecture decisions immediately.
- Accept that custom edges will need workarounds; custom nodes are supported.

**Warning signs:**
- `npm install @xyflow/angular` returns 404 or installs an unrelated package.
- Node types missing or no drag-and-drop on first run.

**Phase to address:**
Phase 1 (Project Setup) — verify and install the correct package before any feature work begins.

---

### Pitfall 2: ngx-xyflow Change Detection Causes Frozen or Lagging Canvas

**What goes wrong:**
The Angular wrapper runs xyflow's internal mouse-move, drag, and zoom events inside Angular's Zone.js. Every pointer event triggers a full change-detection cycle across the entire component tree. With 6+ custom node types and an active chat panel updating simultaneously, this degrades to visible lag or a frozen canvas during drag operations.

**Why it happens:**
Zone.js patches all browser event listeners by default. xyflow generates hundreds of mouse-move events per second during dragging. Each one runs Angular change detection. This is the same root cause that makes third-party canvas libraries notoriously slow inside Angular zones.

**How to avoid:**
- Wrap the xyflow canvas component initialization inside `NgZone.runOutsideAngular(() => {...})`.
- Use `ChangeDetectionStrategy.OnPush` on all custom node components.
- Store node positions and active-node state in Angular Signals (not plain properties) to minimize unnecessary re-renders.
- Avoid subscribing to `nodes` or `edges` arrays directly inside components that also render — access only what changes (e.g., a single node's `selected` state).

**Warning signs:**
- Dragging nodes feels sluggish even with 6 nodes.
- CPU spikes in DevTools during panning/zooming.
- Angular DevTools shows change detection running on every mouse move.

**Phase to address:**
Phase 2 (Flow Editor) — establish `OnPush` + Signals pattern from the first custom node component, before adding more nodes or real-time highlighting.

---

### Pitfall 3: SSE EventSource Left Open — Memory Leak on Component Destroy

**What goes wrong:**
The `EventSource` object opened for SSE streaming is not closed when the chat component is destroyed (e.g., route navigation, modal close). The browser maintains the open HTTP connection indefinitely. On repeated navigation, multiple orphaned connections accumulate. The backend accumulates listeners and may emit `MaxListenersExceededWarning`. Chat messages from previous sessions arrive into stale components.

**Why it happens:**
`EventSource` is a browser API, not an RxJS Observable. Developers wrap it in an Observable but forget to call `eventSource.close()` in the teardown logic. Angular's `takeUntilDestroyed` cleans up the RxJS subscription but not the underlying `EventSource` unless explicitly coded.

**How to avoid:**
```typescript
// In chat.service.ts — correct pattern
streamChat(payload: ChatRequest): Observable<string> {
  return new Observable(observer => {
    const source = new EventSource(`/api/chat?...`);
    source.onmessage = (e) => observer.next(e.data);
    source.onerror = (e) => observer.error(e);
    // CRITICAL: teardown closes the connection
    return () => source.close();
  }).pipe(takeUntilDestroyed(this.destroyRef));
}
```
- Always return the cleanup function from the Observable constructor.
- Test by navigating away during a stream — verify the network tab shows the SSE connection closed.

**Warning signs:**
- Network DevTools shows multiple open `/api/chat` SSE connections.
- Backend logs show increasing active client count over time.
- Messages appear in the wrong component after navigation.

**Phase to address:**
Phase 3 (Chat + SSE) — build the teardown function into `chat.service.ts` before writing a single line of consumer code.

---

### Pitfall 4: Analog.js SSR Breaks `@xyflow/react` and Browser-Only APIs

**What goes wrong:**
Analog.js enables SSR by default. The `ngx-xyflow` package includes `@xyflow/react` and `react` as dependencies. React/xyflow code references `window`, `document`, and `ResizeObserver` during module initialization — these do not exist in Nitro's Node.js SSR context. The build fails with `ReferenceError: window is not defined` or a blank canvas at runtime after hydration.

**Why it happens:**
Analog.js runs the Angular universal (SSR) render pass through Nitro. Any import that executes browser-side code at module evaluation time crashes the SSR step. Most React-based libraries are not SSR-safe in Node.js without explicit guards.

**How to avoid:**
- Add `ngx-xyflow` and its transitive React dependencies to `ssr.noExternal` OR `ssr.external` (test which works) in `vite.config.ts`.
- Wrap the flow editor canvas in an `@defer` block (Angular 17+) with `when isPlatformBrowser(platformId)` so it only renders on the client.
- Guard any `window`/`document` access in custom node components with `typeof window !== 'undefined'` or use Angular's `afterNextRender` hook.
- If SSR causes too much friction in the hackathon window, disable it in `vite.config.ts` (`ssr: false`) — the app does not need SSR for the demo.

**Warning signs:**
- `ng serve` or `vite build` throws `window is not defined` during SSR step.
- Canvas renders server-side HTML but is blank after client hydration.
- Hydration mismatch errors in the browser console.

**Phase to address:**
Phase 1 (Project Setup) — configure Vite SSR exclusions for xyflow before attempting to use the library; or explicitly disable SSR for the hackathon scope.

---

### Pitfall 5: Tailwind Classes Disappearing Inside Custom Node Components

**What goes wrong:**
Custom node components styled with Tailwind utility classes (e.g., `bg-blue-500 rounded-lg`) appear unstyled in the rendered canvas. The classes are present in the HTML but have no effect. Alternatively, Tailwind styles leak out of a node component and override unrelated page elements.

**Why it happens:**
Angular's default `ViewEncapsulation.Emulated` mode adds unique attribute suffixes (e.g., `_ngcontent-abc`) to all elements and scopes styles to them. However, Tailwind classes in the global stylesheet are not scoped — they should work. The real trap is the opposite: developers set `encapsulation: ViewEncapsulation.None` to "fix" perceived issues, which removes encapsulation from the entire component, allowing its styles to bleed globally and override other components' styles.

A secondary trap: for Tailwind v4, the import syntax changed to `@import "tailwindcss";` — using `@use` or the v3 `@tailwind` directives will silently fail to inject styles.

**How to avoid:**
- Import Tailwind **once** in `styles.css` (or `styles.scss`) only — never in component-level stylesheets.
- Keep the default `ViewEncapsulation.Emulated` on all custom node components — do NOT set `ViewEncapsulation.None` unless you have a specific, understood reason.
- Use Tailwind utility classes directly in component templates (`class="..."`) — they work with Emulated encapsulation because they are global CSS classes applied by class name, not by scoped selectors.
- Verify the correct import syntax for the Tailwind version in use (project spec says 3.x: use `@tailwind base; @tailwind components; @tailwind utilities;`).

**Warning signs:**
- Node component shows HTML structure but no visual styling.
- Styles from one custom node component bleed onto the sidebar or chat panel.
- Browser inspector shows Tailwind class is present but `Matched Rules` shows no corresponding CSS rule.

**Phase to address:**
Phase 1 (Project Setup) — verify Tailwind is injecting correctly with a smoke-test component before building custom nodes.

---

### Pitfall 6: Chat Auto-Scroll Fights the User When Scrolled Up

**What goes wrong:**
The chat panel always scrolls to the bottom when a new SSE token arrives. If the user has scrolled up to re-read an earlier part of the conversation, the view is violently yanked back to the bottom on every streaming token. In a demo context, this makes the chat feel broken.

**Why it happens:**
Naive implementations call `scrollTop = scrollHeight` on every message or token update without checking whether the user is already at the bottom.

Secondary issue: calling scroll immediately after pushing to the messages array scrolls to the second-to-last message, not the latest one, because Angular has not yet rendered the new DOM node. Using `setTimeout(() => scroll(), 0)` partially works but introduces timing races during SSE streaming.

**How to avoid:**
- Track a boolean `isScrolledToBottom` — update it on the container's `(scroll)` event.
- Only auto-scroll when `isScrolledToBottom === true`.
- Use `AfterViewChecked` lifecycle hook OR a `MutationObserver` on the messages container to scroll AFTER the DOM is updated, not before:
```typescript
ngAfterViewChecked() {
  if (this.isScrolledToBottom) {
    this.scrollToBottom();
  }
}
```
- For streaming tokens that arrive faster than change detection, use a debounced scroll trigger (16ms).

**Warning signs:**
- Page jumps back to bottom while trying to scroll up.
- The latest message is always cut off (scroll lands one message too early).
- Console warnings about `ExpressionChangedAfterItHasBeenCheckedError` in the chat component.

**Phase to address:**
Phase 3 (Chat UI) — implement scroll logic with the user-intent check from the first iteration, not as a later polish step.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Disable SSR entirely (`ssr: false`) | Eliminates xyflow hydration issues instantly | Loses SEO, slower first paint — irrelevant for a hackathon internal demo | Acceptable for hackathon scope |
| `ViewEncapsulation.None` on all node components | Makes global CSS "just work" | Style bleed causes impossible-to-debug visual bugs as components multiply | Never — costs more than it saves |
| `any` types for SSE message payloads | Faster initial code | SSE message shape changes break silently at runtime | Only if backend API is 100% still in flux; add types as soon as contract is stable |
| `setTimeout` for scroll after new messages | Simple to write | Timing races under fast SSE streaming | Never — use `AfterViewChecked` or `MutationObserver` instead |
| Store all flow state in component properties (no service) | Less boilerplate | Node highlight from SSE events cannot reach the canvas — forces service introduction anyway | Never — `flow.service.ts` is required by the spec; build it first |
| Skip `ngx-xyflow` beta vetting, assume it works | Faster start | Risk of hitting missing-feature wall mid-phase (e.g., no custom edges) | Never — 30-minute README read is mandatory before committing to the library |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| ngx-xyflow custom nodes | Creating node components without registering them in the `nodeTypes` config object | Pass a `nodeTypes` map to the flow component: `{ agentNode: AgentNodeComponent, ... }` |
| SSE via EventSource | Using `HttpClient` with `observe: 'events'` thinking it handles SSE | `HttpClient` does not support SSE streaming; use the native `EventSource` API wrapped in an Observable |
| Analog.js API routes (Nitro) | Importing Angular services or DI tokens inside `/src/server/routes/` | Nitro routes are Node.js handlers — they have no Angular DI context; keep them pure H3 handlers |
| Analog.js file-based routing | Naming page files without `.page.ts` suffix | Only files ending in `.page.ts` are treated as routes; plain `.ts` files in pages/ are ignored |
| Tailwind with Analog.js | Configuring `content` paths in `tailwind.config.js` that miss `.analog` component files | Include `"./src/**/*.{html,ts,analog}"` in content glob |
| Node highlight via SSE | Mutating node objects directly in the component that receives SSE events | Use `flow.service.ts` to update a Signal containing the active node ID; the canvas subscribes to that Signal |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Subscribing to full `nodes` array in canvas component | Canvas re-renders on every property change of every node | Select only the specific signal/field that changes (e.g., `activeNodeId` signal) | With 6+ nodes during SSE streaming |
| Storing large node metadata in xyflow's `data` property | xyflow serializes node data on every state change | Keep `data` minimal; store heavy metadata in the Angular service separately | With complex LLM config payloads per node |
| Animation on edges during streaming | CSS keyframe animations on all edges choke the GPU at 60fps while SSE is streaming | Use a CSS class toggle only on the active edge, not all edges | Immediately visible in DevTools Performance tab |
| Unthrottled SSE token rendering | Each token causes a separate Angular change detection cycle | Buffer tokens with `bufferTime(16)` (one frame) before updating the message signal | With fast LLM streaming (>50 tokens/sec) |
| Using `nodes` array from xyflow state as source of truth for highlight | Requires iterating all nodes on every SSE event to find the active one | Keep active node ID as a separate Signal; xyflow node components read the Signal | Negligible at 6 nodes but forms bad habit |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual feedback while SSE is connecting | User clicks "Send", nothing happens for 1-3 seconds — looks broken | Show a spinner or "thinking..." state immediately on send, before first SSE token arrives |
| Active node highlight disappears immediately after SSE ends | Demo loses its "wow" moment — nodes go dark too fast | Keep the last-active node highlighted for 1-2 seconds after stream completes |
| Unresponsive node drag while chat is streaming | User cannot interact with canvas during SSE — feels locked | Ensure SSE updates happen through Angular Signals, not in the render thread; canvas remains interactive |
| No empty state for the flow canvas | First load shows a blank canvas with no affordance | Add a placeholder message or example flow node on first render |
| Config panel opens on accidental node click during drag | Disrupts flow editing | Use a click-vs-drag threshold (>5px movement = drag, not click) — xyflow provides `onNodeClick` vs `onNodeDrag` events for this |

---

## "Looks Done But Isn't" Checklist

- [ ] **SSE connection:** Often missing EventSource teardown — verify in Network tab that connection closes on component destroy.
- [ ] **Node highlight:** Often only updates the node color but not the edge animation — verify edges also animate to the active node.
- [ ] **Custom node types:** Often registered in the template but not in the `nodeTypes` config object — verify nodes render as custom components, not as default xyflow rectangles.
- [ ] **Chat scroll:** Often scrolls to second-to-last message — verify the newest message is fully visible after sending.
- [ ] **Mobile/presentation layout:** Often looks fine at 1440px, breaks at 1024px (projector resolution) — test at 1280x720 before the demo.
- [ ] **SSE error handling:** Often missing — verify the UI shows a recoverable error state when the backend closes the stream with an error event.
- [ ] **Flow service state:** Often the canvas and chat panel use separate state — verify that clicking a node in the editor and starting a chat both reference the same flow state from `flow.service.ts`.
- [ ] **Tailwind purge:** In production build, verify custom dynamic class names (e.g., constructed with template literals) are not purged — use full class name strings only.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong package installed (no @xyflow/angular) | LOW | `npm uninstall @xyflow/angular && npm install ngx-xyflow`, update imports, restart dev server |
| Canvas lag discovered in Phase 2 | MEDIUM | Add `ChangeDetectionStrategy.OnPush` to all node components; add `NgZone.runOutsideAngular` wrapper — requires retesting all node interactions (~1 hour) |
| SSE memory leak discovered during integration | MEDIUM | Add teardown function to Observable constructor in `chat.service.ts` — isolated to one method, 30-minute fix, but requires full SSE flow retest |
| SSR blocking ngx-xyflow (window not defined) | LOW-MEDIUM | Add library to `ssr.noExternal` in `vite.config.ts`, or disable SSR entirely — 15-minute config change |
| Auto-scroll timing bugs in Phase 3 | LOW | Replace `setTimeout` scroll with `AfterViewChecked` pattern — isolated to chat component, 30-minute refactor |
| ViewEncapsulation.None style bleed | HIGH | Must audit and fix every component that set None, then re-test entire UI — avoid entirely by never setting it |
| Flow and chat state out of sync | HIGH | Requires introducing `flow.service.ts` as a shared store mid-development — all components need refactoring to use the service |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Wrong package (@xyflow/angular doesn't exist) | Phase 1: Project Setup | `npm ls ngx-xyflow` shows installed; a basic flow canvas renders in dev |
| SSR breaking xyflow (window not defined) | Phase 1: Project Setup | `ng build` completes without SSR errors; canvas renders on first page load |
| Tailwind classes not applying in nodes | Phase 1: Project Setup | Smoke-test component with Tailwind classes renders correctly |
| Canvas change detection lag | Phase 2: Flow Editor | Drag 6 nodes simultaneously; CPU stays <30% in DevTools |
| Custom nodes not rendering (nodeTypes misconfiguration) | Phase 2: Flow Editor | Each of 6 node types renders its custom template, not the default rectangle |
| SSE EventSource memory leak | Phase 3: Chat + SSE | Navigate away during a stream; Network tab shows connection closed |
| Chat auto-scroll fights user scroll | Phase 3: Chat + SSE | Scroll up mid-stream; verify page does not auto-jump to bottom |
| Node highlight missing SSE integration | Phase 4: Integration | During chat, the canvas highlights the correct node in real time |
| Demo layout broken at projector resolution | Phase 4: Integration | Test at 1280x720 before demo day |
| Unthrottled SSE token re-renders | Phase 3: Chat + SSE | Verify smooth animation at high token rate using DevTools Performance tab |

---

## Sources

- [ngx-xyflow GitHub README (beta status, missing features)](https://github.com/knackstedt/ngx-xyflow) — MEDIUM confidence (community library, beta)
- [xyflow Angular wrapper discussion — change detection and event issues](https://github.com/xyflow/xyflow/discussions/4887) — MEDIUM confidence
- [React Flow / xyflow performance documentation](https://reactflow.dev/learn/advanced-use/performance) — HIGH confidence (official docs)
- [Analog.js production SSR lessons (TechLeadPilot)](https://dev.to/dalenguyen/building-production-ready-ssr-applications-with-analogjs-lessons-from-techleadpilot-142a) — MEDIUM confidence (community post, verified against official patterns)
- [Angular takeUntilDestroyed official docs](https://angular.dev/ecosystem/rxjs-interop/take-until-destroyed) — HIGH confidence
- [Angular NgZone runOutsideAngular pattern](https://angular.dev/api/core/NgZone) — HIGH confidence (official docs)
- [Angular ViewEncapsulation official docs](https://angular.dev/api/core/ViewEncapsulation) — HIGH confidence
- [Tailwind + Angular ViewEncapsulation None conflict](https://github.com/tailwindlabs/tailwindcss/discussions/13154) — MEDIUM confidence (community discussion)
- [Chat auto-scroll with AfterViewChecked (Angular pattern)](https://medium.com/helper-studio/how-to-make-autoscroll-of-chat-when-new-message-adds-in-angular-68dd4e1e8acd) — MEDIUM confidence
- [Angular zone pollution best practices](https://angular.dev/best-practices/zone-pollution) — HIGH confidence (official)

---

*Pitfalls research for: Angular flow editor + chat UI (AI Agent Builder — Concesionaria de Autos)*
*Researched: 2026-02-28*
