# Phase 4: Chat & SSE Integration - Research

**Researched:** 2026-03-01
**Domain:** Angular 21 SSE Streaming, Chat UI, Node Highlighting, Session Persistence
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Chat bubble design
- Agent-tagged bubbles: user messages on the right, assistant messages on the left with a small badge indicating which agent type responded (Memoria, Orquestador, Validador, Especialista, etc.)
- Markdown rendering enabled for assistant responses — bold, lists, inline code, since specialist agents return structured info (vehicle specs, date options)
- No timestamps displayed on messages — clean, minimal look
- No avatars — text-focused bubbles

#### Streaming UX
- Typing indicator: three animated dots in an assistant bubble, shown immediately when user sends a message, replaced by streamed text once tokens arrive
- Blinking cursor (█ or |) at the end of streaming text while tokens are arriving — ChatGPT-style "typing" feel
- Input field and send button disabled while assistant is streaming — prevents interleaved messages
- No "stop generating" button — let responses stream to completion (demo responses should be fast)

#### Node highlighting
- Active node gets a colored glow (box-shadow) matching the node's own color (purple for Memoria, blue for Orquestador, green for Validador, etc.) with a subtle pulse animation
- Animated flow on edges: the edge connecting the previous node to the next one lights up / animates as processing "travels" between nodes — visible pipeline flow
- After a node finishes processing (status: 'complete'), it fades to a dimmed "completed" state before returning to normal — shows pipeline progress trail
- Glow color matches each node's identity color, reinforcing the visual connection between chat agent badges and canvas nodes

#### Session lifecycle
- Session auto-created on first message — no explicit "start" action, zero friction
- Session ID hidden from user — managed behind the scenes
- Restore last session on page reload: fetch previous messages from MongoDB and display them (store sessionId in localStorage)
- Empty state shows welcome message ("¡Hola! Soy tu asistente de Volkswagen...") + 3-4 suggestion chips ("Ver catálogo", "Agendar cita", "Preguntas frecuentes") that auto-fill the input field

### Claude's Discretion
- Agent badge visual style (colored dot + label vs. emoji + label — optimize for visual connection to flow nodes)
- Exact pulse animation timing and easing
- Edge animation technique (CSS or @foblex/flow API — whatever the library supports best)
- Dimmed/completed node visual treatment details
- Welcome message exact copy and suggestion chip wording
- Auto-scroll implementation details (scroll-to-bottom behavior)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHAT-01 | UI de chat con campo de texto, botón enviar, y área de mensajes scrolleable | ChatComponent already scaffolded; needs signals for messages[], isStreaming, input value; scroll container with ViewChild |
| CHAT-02 | Burbujas de mensaje diferenciadas para user (derecha) y assistant (izquierda) | Tailwind flex/justify utilities; agent badge via agentType field already in ChatMessage interface |
| CHAT-03 | Auto-scroll al último mensaje (respetando cuando el usuario hace scroll up) | ViewChild ElementRef scroll container; afterEvery change detection or effect(); scroll position check pattern |
| CHAT-04 | Streaming de respuestas via SSE mostrando texto progresivamente | fetch() + ReadableStream + eventsource-parser@3.0.6 already installed; NOT EventSource (GET-only); ChatService accumulates chunks into signal |
| CHAT-05 | Typing indicator (tres puntos animados) mientras el bot procesa | Conditional CSS animation in message list; isStreaming signal controls visibility |
| CHAT-06 | Nodos del flow se iluminan/resaltan en tiempo real según el agente activo durante el chat | FlowService.setActiveNode() already wired to canvas; ChatService calls it on agent_active events; AgentType→nodeId mapping needed |
| SERV-01 | ChatService con conexión HTTP POST al backend y parsing de SSE events | fetch() + eventsource-parser pattern; inject(HttpClient) NOT used for SSE; standalone Angular service |
| SERV-03 | Comunicación ChatService → FlowService para highlight de nodos activos | FlowService already provided in root; inject(FlowService) in ChatService; completedNodeIds signal needed in FlowService |
</phase_requirements>

---

## Summary

Phase 4 builds the complete chat experience: a ChatService that consumes the existing `POST /api/chat` SSE endpoint, a fully functional ChatComponent with streaming UI, and the node-highlighting bridge from chat events to the canvas. All backend infrastructure (SSE emitter, session management via Conversation model, MongoDB memory) is already in place from Phases 2 and 3. This phase is purely frontend + light backend wiring.

The critical technical insight is that **native `EventSource` only supports GET requests** — the chat endpoint is a POST. The correct approach is `fetch()` + `ReadableStream` + `eventsource-parser` (already installed at v3.0.6) for SSE parsing. This pattern is the current industry standard for POST-based SSE streams and avoids any third-party SSE wrapper library.

There is one key mismatch to resolve: the SSE `agent_active` events emit `AgentType` values ('memory', 'orchestrator') but `FlowService.activeNodeId` compares against `FlowNode.id` values ('memory-1', 'orchestrator-1'). ChatService must maintain a mapping from AgentType to actual node IDs. Additionally, the "completed" node state (dimmed after processing) requires a `completedNodeIds` signal in FlowService and a `node--completed` CSS class — neither exists yet.

**Primary recommendation:** Build a single `ChatService` (injectable) using fetch + eventsource-parser for SSE, inject `FlowService` directly for node highlighting, and keep the ChatComponent as a thin UI layer driven by signals. Add `completedNodeIds` signal to FlowService and `node--completed` CSS to styles.css.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Angular Signals | 21.2.0 (built-in) | Reactive state for messages, streaming state, session | Already used throughout FlowService; no additional imports needed |
| fetch API | Browser native | POST + ReadableStream SSE consumption | Only option for POST SSE; EventSource is GET-only |
| eventsource-parser | 3.0.6 (installed) | Parse SSE protocol from raw stream chunks | Already in node_modules as transitive dep; createParser({onEvent}) API |
| marked | 15.0.12 (installed) | Markdown to HTML conversion for assistant bubbles | Already in package.json; marked.parse() is synchronous |
| @angular/common DomSanitizer | 21.2.0 (built-in) | Trust HTML from marked for [innerHTML] binding | Required for XSS-safe innerHTML; inject(DomSanitizer) + bypassSecurityTrustHtml() |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @angular/forms FormsModule | 21.2.0 (installed) | Two-way binding for chat input | Import in ChatComponent standalone imports for [(ngModel)] |
| uuid (frontend) | NOT needed | Session ID generation | Session created by POST /api/sessions on backend; frontend just stores it |
| localStorage | Browser native | Persist sessionId across page reloads | window.localStorage.getItem/setItem in ChatService |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fetch + eventsource-parser | EventSource API | EventSource is simpler but only supports GET — POST body (message, sessionId) is required |
| fetch + eventsource-parser | @microsoft/fetch-event-source | Good lib but not installed; eventsource-parser already available |
| marked + DomSanitizer | ngx-markdown | ngx-markdown not installed; overkill for this use case; marked already installed |
| Angular signals | RxJS Observables | FlowService uses signals throughout; consistency argues for signals |

**Installation:** No new packages needed — eventsource-parser, marked, and all Angular packages are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
src/app/
├── services/
│   ├── flow.service.ts          # Existing — add completedNodeIds signal + setCompletedNode()
│   └── chat.service.ts          # NEW — SSE consumption, session management, message state
├── components/
│   └── chat/
│       ├── chat.component.ts    # Existing shell — replace with full implementation
│       └── chat.component.html  # NEW — extract template for readability (optional)
└── (shared)
    └── types.ts                 # Existing — no changes needed
src/styles.css                   # Existing — add node--completed CSS class
```

### Pattern 1: ChatService with fetch + eventsource-parser SSE

**What:** POST to /api/chat, read ReadableStream, parse SSE protocol, emit parsed events to signal-based state.

**When to use:** Always for POST-based SSE in Angular. Never use EventSource for POST endpoints.

```typescript
// ChatService pattern — inject in chat component
import { Injectable, inject, signal, computed } from '@angular/core';
import { createParser } from 'eventsource-parser';
import { FlowService } from './flow.service';
import type { ChatMessage, AgentActiveEvent, MessageChunkEvent } from '@models/types';

// AgentType -> node ID mapping (must match flow.get.ts node IDs)
const AGENT_NODE_MAP: Record<string, string> = {
  memory: 'memory-1',
  orchestrator: 'orchestrator-1',
  validator: 'validator-1',
  specialist: 'specialist-faqs',  // default; override per-event if nodeId provided
  generic: 'generic-1',
};

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly flowService = inject(FlowService);

  // State signals
  readonly messages = signal<ChatMessage[]>([]);
  readonly isStreaming = signal(false);
  readonly sessionId = signal<string | null>(null);

  async sendMessage(userText: string): Promise<void> {
    if (this.isStreaming()) return;

    // Add user message immediately
    this.messages.update(msgs => [...msgs, {
      role: 'user',
      content: userText,
      timestamp: new Date(),
    }]);

    this.isStreaming.set(true);
    let currentSessionId = this.sessionId();

    // Auto-create session on first message
    if (!currentSessionId) {
      const res = await fetch('/api/sessions', { method: 'POST' });
      const { sessionId } = await res.json();
      currentSessionId = sessionId;
      this.sessionId.set(sessionId);
      localStorage.setItem('chat_session_id', sessionId);
    }

    // Add placeholder assistant message
    this.messages.update(msgs => [...msgs, {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      agentType: undefined,
    }]);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId, message: userText }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const parser = createParser({
      onEvent: (event) => this.handleSSEEvent(event),
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }

    this.isStreaming.set(false);
    this.flowService.setActiveNode(null);
    this.flowService.clearCompletedNodes();
  }

  private handleSSEEvent(event: { event?: string; data: string }): void {
    const data = JSON.parse(event.data);
    switch (event.event) {
      case 'agent_active': {
        const e = data as AgentActiveEvent;
        const nodeId = AGENT_NODE_MAP[e.node];
        if (nodeId) {
          if (e.status === 'processing') {
            this.flowService.setActiveNode(nodeId);
          } else if (e.status === 'complete') {
            this.flowService.setCompletedNode(nodeId);
            this.flowService.setActiveNode(null);
          }
        }
        break;
      }
      case 'message_chunk': {
        const e = data as MessageChunkEvent;
        this.messages.update(msgs => {
          const last = msgs[msgs.length - 1];
          if (last?.role === 'assistant') {
            return [...msgs.slice(0, -1), { ...last, content: last.content + e.content }];
          }
          return msgs;
        });
        break;
      }
      case 'done':
        break;
      case 'error':
        this.messages.update(msgs => {
          const last = msgs[msgs.length - 1];
          if (last?.role === 'assistant' && !last.content) {
            return [...msgs.slice(0, -1), { ...last, content: data.message ?? 'Error' }];
          }
          return msgs;
        });
        break;
    }
  }

  async loadSession(sessionId: string): Promise<void> {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (!res.ok) {
      localStorage.removeItem('chat_session_id');
      return;
    }
    const conversation = await res.json();
    this.sessionId.set(sessionId);
    this.messages.set(conversation.messages.map((m: any) => ({
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
      agentType: m.agentType,
    })));
  }
}
```

### Pattern 2: ChatComponent — Signal-driven UI with auto-scroll

**What:** Thin component layer reading ChatService signals; auto-scroll via afterEveryRender or effect().

```typescript
// Auto-scroll pattern with user scroll position guard
import { Component, inject, ViewChild, ElementRef, effect, afterNextRender } from '@angular/core';
import { ChatService } from '../../services/chat.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Component({
  selector: 'app-chat',
  standalone: true,
  // ...
})
export class ChatComponent {
  protected readonly chat = inject(ChatService);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  private userScrolledUp = false;

  constructor() {
    // Auto-scroll when messages change, respecting user scroll position
    effect(() => {
      this.chat.messages(); // subscribe to changes
      if (!this.userScrolledUp) {
        // Use setTimeout to run after DOM update
        setTimeout(() => this.scrollToBottom(), 0);
      }
    });
  }

  renderMarkdown(content: string): SafeHtml {
    const html = marked.parse(content) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    this.userScrolledUp = !atBottom;
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
```

### Pattern 3: FlowService additions for completed node state

**What:** Add `completedNodeIds` signal and mutation methods for the "dimmed pipeline trail" feature.

```typescript
// Additions to FlowService
readonly completedNodeIds = signal<Set<string>>(new Set());

setCompletedNode(id: string): void {
  this.completedNodeIds.update(ids => new Set([...ids, id]));
}

clearCompletedNodes(): void {
  this.completedNodeIds.set(new Set());
}
```

Canvas template update:
```html
<!-- Add node--completed class binding alongside node--active -->
[class.node--active]="flowService.activeNodeId() === node.id"
[class.node--completed]="flowService.completedNodeIds().has(node.id) && flowService.activeNodeId() !== node.id"
```

### Pattern 4: Session Restore on Init

**What:** On ChatComponent init, check localStorage for existing sessionId and restore.

```typescript
// In ChatComponent ngOnInit or constructor with afterNextRender
ngOnInit(): void {
  const savedSessionId = localStorage.getItem('chat_session_id');
  if (savedSessionId) {
    this.chat.loadSession(savedSessionId);
  }
}
```

### Anti-Patterns to Avoid

- **Using EventSource for POST endpoints:** EventSource only supports GET. The chat endpoint sends message+sessionId in the body — must use fetch + ReadableStream.
- **Calling FlowService.setActiveNode(nodeId) with AgentType directly:** `activeNodeId` is compared to `node.id` in the template. 'memory' !== 'memory-1'. Always go through AGENT_NODE_MAP.
- **Building entire message string before displaying:** defeats streaming. Accumulate tokens incrementally into the assistant message signal.
- **Using HttpClient for SSE:** Angular's HttpClient wraps fetch but doesn't expose the streaming ReadableStream body needed for SSE parsing. Use raw fetch().
- **DomSanitizer bypassed without marked sanitization:** marked.parse() produces safe HTML for markdown subsets (bold, lists, code). Safe to bypassSecurityTrustHtml() for this controlled input.
- **Calling marked.parse() on every keystroke/token:** call only when rendering complete messages or when the stream completes, not on every character — causes jitter.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE protocol parsing | Custom line-split parser | eventsource-parser@3.0.6 (installed) | Handles partial chunks, BOM, multi-line data, retry fields; already installed |
| Markdown to HTML | Custom regex markdown | marked@15.0.12 (installed) | Spec-compliant, handles nested structures, already imported |
| HTML sanitization | Custom HTML stripping | DomSanitizer.bypassSecurityTrustHtml() | Angular's built-in; safe for controlled marked output |
| Session ID generation | UUID on frontend | POST /api/sessions → backend returns sessionId | Already implemented; backend uses uuid@9.0.1 |

**Key insight:** All external dependencies for this phase are already installed. Zero `npm install` commands needed.

---

## Common Pitfalls

### Pitfall 1: AgentType vs Node ID Mismatch
**What goes wrong:** `FlowService.setActiveNode('memory')` — no node illuminates on canvas because node.id is 'memory-1' not 'memory'.
**Why it happens:** SSE `agent_active` events use `AgentType` ('memory', 'orchestrator') while `FlowNode.id` uses a different naming convention ('memory-1', 'orchestrator-1', 'specialist-faqs').
**How to avoid:** Define `AGENT_NODE_MAP` constant in ChatService that maps AgentType to the exact node IDs from flow.get.ts. Keep the map co-located with ChatService so any flow.get.ts node ID change is easy to find.
**Warning signs:** Node highlighting never appears even when agent_active events are received.

### Pitfall 2: specialist AgentType Maps to Multiple Nodes
**What goes wrong:** 'specialist' maps to which of the three specialist nodes? (specialist-faqs, specialist-catalog, specialist-schedule)
**Why it happens:** AgentType is 'specialist' but there are 3 specialist nodes on canvas.
**How to avoid:** The `agent_active` event payload from `chat.post.ts` currently sends `{ node: 'memory' | 'orchestrator' }` only. When Phase 4 wires in real specialist agents, the backend should send a more specific nodeId. For now, map 'specialist' to the first specialist node ('specialist-faqs') as default, OR update the backend to send `{ node: 'specialist-faqs' | 'specialist-catalog' | 'specialist-schedule' }`. **Update the SSE event payload to use actual node IDs instead of AgentType for precise highlighting** — this is the cleanest fix.
**Warning signs:** Only one specialist node ever illuminates.

### Pitfall 3: ReadableStream Partial Chunk Boundary
**What goes wrong:** SSE parser receives half an event line, e.g., `"data: {"conten"` — JSON.parse fails.
**Why it happens:** TCP chunks don't align to SSE event boundaries.
**How to avoid:** eventsource-parser handles this automatically — it buffers incomplete lines. The `onEvent` callback only fires when a complete event (terminated by `\n\n`) is received. Never hand-roll line splitting.
**Warning signs:** Occasional JSON parse errors in console during streaming.

### Pitfall 4: Missing flushHeaders() on Server Side
**What goes wrong:** SSE stream buffers entirely and delivers as one response at the end — no streaming effect.
**Why it happens:** Node.js HTTP response may buffer headers until body is sent.
**How to avoid:** `event.node.res.flushHeaders()` is already called in `chat.post.ts` synchronously before any `await`. This is already correct — do not remove it.
**Warning signs:** Typing indicator shows, then all text appears at once.

### Pitfall 5: Auto-Scroll Fighting User Scroll
**What goes wrong:** User scrolls up to read previous messages; auto-scroll keeps jumping to bottom.
**Why it happens:** Effect runs on every message update without checking scroll position.
**How to avoid:** Track `userScrolledUp` boolean in scroll event handler. Only auto-scroll when `!userScrolledUp`. Reset `userScrolledUp = false` when user manually scrolls to bottom.
**Warning signs:** User cannot read previous messages while streaming is active.

### Pitfall 6: marked.parse() Returns Promise in v15
**What goes wrong:** `marked.parse(content)` returns `string | Promise<string>` in marked v15.
**Why it happens:** marked v15 supports async plugins.
**How to avoid:** Cast as string: `marked.parse(content) as string` — for synchronous usage without async plugins, parse is synchronous. OR use `marked.parseInline(content)` for simpler inline-only markdown.
**Warning signs:** TypeScript error on `marked.parse()` return type.

### Pitfall 7: Completed Node CSS Missing currentColor Context
**What goes wrong:** `node--completed` opacity/filter doesn't work as expected.
**Why it happens:** CSS `currentColor` inherits from `color` property, not `borderColor`. Node border color is set via `[style.borderColor]`, not via `color`.
**How to avoid:** `node--active` glow uses `currentColor` which works because `box-shadow` uses text color by default — but node border color is `borderColor` style. The existing `node--active` CSS actually uses `currentColor` which refers to the CSS `color` property (text color, inherited as white from body). The glow appears white, NOT per-node colored, unless `color` is set to match. **To get per-node glow color:** set `[style.color]="node.data.color"` on the node div, then `currentColor` in box-shadow will use the node color.
**Warning signs:** All node glows appear the same color (white) instead of per-node colors.

---

## Code Examples

### SSE Stream Consumption with eventsource-parser v3

```typescript
// Source: eventsource-parser v3.0.6 dist/index.js + fetch API (browser native)
import { createParser } from 'eventsource-parser';

async function consumeSSEStream(url: string, body: object): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  // v3 API: createParser({onEvent}) — NOT createParser(callback)
  // Passing a function directly throws TypeError: "`callbacks` must be an object"
  const parser = createParser({
    onEvent: (event) => {
      const data = JSON.parse(event.data);
      console.log('SSE event:', event.event, data);
    },
  });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.feed(decoder.decode(value, { stream: true }));
  }
}
```

### Markdown Rendering with DomSanitizer

```typescript
// Source: Angular 21 docs (DomSanitizer) + marked v15 API
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

// In component class:
private readonly sanitizer = inject(DomSanitizer);

renderMarkdown(content: string): SafeHtml {
  // marked.parse() is synchronous when no async plugins registered
  const html = marked.parse(content) as string;
  return this.sanitizer.bypassSecurityTrustHtml(html);
}

// In template:
// <div [innerHTML]="renderMarkdown(message.content)"></div>
```

### Typing Indicator (Three Animated Dots)

```css
/* styles.css — add to existing styles */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
  align-items: center;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #9CA3AF;
  border-radius: 50%;
  animation: typing-bounce 1.4s ease-in-out infinite;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}
```

```html
<!-- Show typing indicator when streaming AND last message content is empty -->
@if (chat.isStreaming() && lastMessageIsEmpty()) {
  <div class="typing-indicator">
    <span></span><span></span><span></span>
  </div>
}
```

### Blinking Cursor at Stream End

```html
<!-- Append cursor to streaming message content -->
@if (message.role === 'assistant' && chat.isStreaming() && isLastMessage(message)) {
  <span class="streaming-cursor">█</span>
}
```

```css
.streaming-cursor {
  animation: cursor-blink 1s step-end infinite;
}
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

### Node Completed (Dimmed Pipeline Trail)

```css
/* styles.css — add after node--active */
.node--completed {
  opacity: 0.45;
  filter: grayscale(0.3);
  transition: opacity 0.5s ease, filter 0.5s ease;
}
```

```html
<!-- canvas.component.html — node div binding -->
[class.node--active]="flowService.activeNodeId() === node.id"
[class.node--completed]="flowService.completedNodeIds().has(node.id) && flowService.activeNodeId() !== node.id"
```

### Per-Node Colored Glow (Critical Fix)

```html
<!-- Set style.color to match borderColor so currentColor works in box-shadow -->
<div
  fNode
  [fNodeId]="node.id"
  [fNodePosition]="node.position"
  class="flow-node"
  [class.node--active]="flowService.activeNodeId() === node.id"
  [class.node--completed]="flowService.completedNodeIds().has(node.id) && flowService.activeNodeId() !== node.id"
  [style.borderColor]="node.data.color"
  [style.color]="node.data.color"
  (click)="flowService.setSelectedNode(node.id)">
```

### Session Restore on Component Init

```typescript
// In ChatComponent constructor or ngOnInit
constructor() {
  afterNextRender(() => {
    // Only runs in browser (SSR-safe — though SSR is disabled in this project)
    const savedId = localStorage.getItem('chat_session_id');
    if (savedId) {
      this.chat.loadSession(savedId).catch(() => {
        localStorage.removeItem('chat_session_id');
      });
    }
  });
}
```

### Suggestion Chips (Empty State)

```html
<!-- Show when no messages and not streaming -->
@if (chat.messages().length === 0 && !chat.isStreaming()) {
  <div class="flex flex-col items-center gap-6 py-8">
    <p class="text-gray-400 text-sm text-center max-w-xs">
      ¡Hola! Soy tu asistente de Volkswagen. ¿En qué te puedo ayudar hoy?
    </p>
    <div class="flex flex-col gap-2 w-full">
      @for (chip of suggestionChips; track chip) {
        <button
          (click)="fillInput(chip)"
          class="text-left text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 py-2 border border-gray-600 transition-colors">
          {{ chip }}
        </button>
      }
    </div>
  </div>
}
```

---

## Key Implementation Details Discovered from Codebase

### Existing Infrastructure (CONFIRMED — no re-implementation needed)

| Asset | Location | Status |
|-------|----------|--------|
| SSE emitter | `src/server/sse/emitter.ts` | Ready — `createEmitter(res)` returns emit fn |
| Mock chat pipeline | `src/server/routes/api/chat.post.ts` | Ready — emits agent_active + message_chunk + done events |
| Session POST | `src/server/routes/api/sessions.post.ts` | Ready — returns `{ sessionId }` |
| Session GET | `src/server/routes/api/sessions/[id].get.ts` | Ready — returns Conversation or 404 |
| FlowService signals | `src/app/services/flow.service.ts` | Ready — `setActiveNode()`, `activeNodeId` signal |
| node--active CSS | `src/styles.css` | Ready — pulse animation with currentColor |
| edge--active CSS | `src/styles.css` | Ready — blue glow on active edges |
| ChatMessage type | `src/shared/types.ts` | Ready — role, content, timestamp, agentType |
| eventsource-parser | `node_modules/eventsource-parser@3.0.6` | Installed — createParser({onEvent}) API |
| marked | `node_modules/marked@15.0.12` | Installed — marked.parse(str) as string |

### Things That Need to Be Created or Modified

| Change | Why |
|--------|-----|
| `ChatService` (new) | Core service — SSE consumption, message state, session management |
| `FlowService.completedNodeIds` signal + methods | "Dimmed pipeline trail" requires tracking completed nodes |
| `FlowService.clearCompletedNodes()` | Reset after each conversation turn |
| `node--completed` CSS in styles.css | Visual for dimmed completed state |
| `[style.color]="node.data.color"` on canvas node div | Makes `currentColor` in box-shadow use node's identity color |
| `ChatComponent` full implementation | Existing is a skeleton — needs messages, streaming, markdown |

### Node ID Mapping (CONFIRMED from flow.get.ts)

```typescript
const AGENT_NODE_MAP: Record<string, string> = {
  memory: 'memory-1',
  orchestrator: 'orchestrator-1',
  validator: 'validator-1',
  specialist: 'specialist-faqs',   // Phase 4 should update backend to send specific IDs
  generic: 'generic-1',
};
```

The backend `chat.post.ts` currently only emits `agent_active` for 'memory' and 'orchestrator'. Phase 4 needs to extend this to cover more pipeline nodes when real AI integration happens, but for demo purposes the mock pipeline is sufficient.

### SSE Event Format (CONFIRMED from chat.post.ts + emitter.ts)

```
event: agent_active
data: {"node":"memory","status":"processing"}

event: agent_active
data: {"node":"memory","status":"complete"}

event: message_chunk
data: {"content":"Hola! Recibí tu mensaje..."}

event: done
data: {"sessionId":"uuid"}
```

The `message_chunk` event currently sends the entire response as one chunk (not word-by-word). Phase 4 frontend must handle both: single large chunk (current mock) and multiple small chunks (future real AI). Accumulate content by appending, not replacing.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| EventSource for SSE | fetch + eventsource-parser for POST SSE | ~2022 (as POST SSE became common) | Must use fetch; EventSource is GET-only |
| Observable-based Angular state | Angular Signals | Angular 16+ (2023), standard in 17+ | FlowService already signals — ChatService must match |
| Template-driven `markdownToHtml` pipe | DomSanitizer + marked.parse() | Stable pattern | No new libs; marked already installed |

**Deprecated/outdated:**
- Using `EventSource` for POST endpoints: Not supported — EventSource spec is GET-only.
- RxJS Subject for chat messages: Works but inconsistent with project's signal-first pattern.

---

## Open Questions

1. **Will backend emit word-level token chunks or full responses?**
   - What we know: Current mock sends one `message_chunk` with full response; future AI (Gemini/OpenAI) streams tokens
   - What's unclear: Timing of Phase 4 backend integration vs demo
   - Recommendation: Build accumulate-by-appending pattern now — handles both single and multi-chunk correctly

2. **Should backend `agent_active` events send AgentType or actual node IDs?**
   - What we know: SSE uses AgentType ('memory') but canvas uses node IDs ('memory-1')
   - What's unclear: Whether to fix at frontend (mapping) or backend (send node IDs)
   - Recommendation: Fix at frontend with AGENT_NODE_MAP for now (no backend change needed). Note: specialist type maps ambiguously — update backend to emit 'specialist-faqs' | 'specialist-catalog' | 'specialist-schedule' when specialist agent integration happens

3. **What about the `validation_update` SSE event type?**
   - What we know: SSEEventType includes 'validation_update'; ValidationUpdateEvent interface exists; not emitted in current mock
   - What's unclear: Will Phase 4 wire validator agent to emit this?
   - Recommendation: Handle gracefully in switch-case (ignore or log) — don't block on this

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `src/server/sse/emitter.ts`, `src/server/routes/api/chat.post.ts`, `src/app/services/flow.service.ts`, `src/app/components/canvas/canvas.component.*`, `src/styles.css`, `src/shared/types.ts` — all actual implementations confirmed
- `node_modules/eventsource-parser/dist/index.js` — source code read directly, v3 API confirmed: `createParser({onEvent})` (object, NOT function)
- `node_modules/marked/package.json` — version 15.0.12 confirmed; `marked.parse()` API stable
- `package.json` — all dependencies confirmed present, no new installs needed
- Angular 21.2.0 confirmed via `node_modules/@angular/core/package.json`

### Secondary (MEDIUM confidence)
- Angular DomSanitizer `bypassSecurityTrustHtml` pattern — standard Angular security pattern, verified against Angular common knowledge

### Tertiary (LOW confidence)
- marked.parse() returning `string | Promise<string>` in v15 — based on training knowledge of marked v5+ async plugins; cast `as string` is the safe workaround

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified present in node_modules; versions confirmed
- Architecture: HIGH — based on direct codebase inspection; existing FlowService patterns confirmed
- Pitfalls: HIGH for AgentType/nodeId mismatch and currentColor glow (confirmed from code); MEDIUM for marked async behavior (training knowledge)

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (Angular/marked APIs are stable; eventsource-parser API confirmed from source)
