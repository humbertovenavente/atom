# AI Agent Builder — Concesionaria de Autos (Frontend)

## What This Is

Frontend de una plataforma fullstack con editor visual de flujos para construir y probar agentes de IA conversacionales aplicados a una concesionaria de autos. Incluye un editor de nodos draggable (@foblex/flow), un chat playground con SSE streaming token-by-token, highlight de nodos en tiempo real, y un panel de configuración de agentes con persistencia a MongoDB. Proyecto para el Dev Day Atom 2026 (hackathon).

## Core Value

El editor visual muestra los nodos del flujo de agentes iluminándose en tiempo real mientras el usuario chatea — eso es lo que diferencia este proyecto en la demo.

## Requirements

### Validated

- ✓ Analog.js scaffold con Angular 21, Tailwind CSS v4, routing file-based — v1.0
- ✓ @foblex/flow 18.1.2 como librería de editor visual de flujos — v1.0
- ✓ Layout 3 paneles: sidebar (nodos) + canvas (editor) + panel derecho (chat) — v1.0
- ✓ 6 tipos de nodos custom con colores e iconos (Memoria, Orquestador, Validador, Especialista, Genérico, Tool) — v1.0
- ✓ Drag-drop de nodos, edges animados, mini-map, zoom controls — v1.0
- ✓ Chat playground con streaming SSE, burbujas user/assistant, auto-scroll — v1.0
- ✓ Typing indicator y blinking cursor durante streaming — v1.0
- ✓ Highlight de nodos activos durante procesamiento del chat (glow + pulse) — v1.0
- ✓ Panel de configuración: click en nodo muestra systemPrompt y temperatura editables — v1.0
- ✓ Save/load flow a MongoDB, Reset Flow, Nueva Conversación — v1.0
- ✓ ChatService (HTTP POST + SSE parsing) y FlowService (signals) — v1.0
- ✓ Interfaces TypeScript compartidas (shared/types.ts) — v1.0
- ✓ MongoDB backend: Mongoose models, seed con Gemini embeddings, VectorSearchService — v1.0
- ✓ Session persistence a MongoDB con restore en page reload — v1.0

### Active

(None — next milestone requirements TBD via /gsd:new-milestone)

### Out of Scope

- Backend/agentes IA — Persona B lo construye en paralelo
- Deploy a Vercel — se hace al final con ambos integrados
- Dark mode — solo si sobra tiempo
- Tests unitarios — hackathon, priorizar funcionalidad
- Undo/redo en el editor — complejidad alta para poco impacto en demo
- Mobile responsive — web-first para pantalla de presentación

## Context

Shipped v1.0 with 2,394 LOC TypeScript across 72 files in 2 days.
Tech stack: Analog.js 2.3 + Angular 21 + @foblex/flow 18.1 + Tailwind CSS v4 + MongoDB Atlas.
79 commits from scaffold to demo-ready app.

### Known Tech Debt (from audit)
- Per-node systemPrompt/temperature not forwarded to chat backend (config edits work but don't affect LLM)
- Session restore broken for expired sessions (200 instead of 404)
- 3 orphaned API routes (vehicles, dates, faq) with no frontend callers
- Vector index name mismatch between docs/DECISIONS.md and code

## Databases

### MongoDB Atlas — Vector DB (Knowledge Base)
- **Cluster**: Atlas compartido (connection string en `.env` como `MONGODB_URI`)
- **DB**: `atom_knowledge`
- **Colecciones**: `vehicles` (autos.json), `faqs` (faq.json), `dateslots` (dates.json), `conversations` (sessions), `flows` (saved flow configs)
- **Vector Indexes**: `vehicles_vector_index`, `faq_vector_index` (cosine, 3072 dims)

### Credenciales
Connection string en `.env` (NO commitear). `LLM_API_KEY` para embeddings/LLM.

## Data (jsons/)

La carpeta `jsons/` contiene los datos fuente que se cargan a MongoDB Atlas Vector Search:

- **autos.json** — Inventario de vehículos (~100 registros)
- **dates.json** — Slots de citas disponibles por fecha
- **faq.json** — Preguntas frecuentes por categoría

## Repo Structure

```
atom/                       # Monorepo raíz
├── .planning/              # GSD planning docs
├── .env                    # Credenciales (no se commitea)
├── jsons/                  # Datos fuente (autos, dates, FAQ)
├── scripts/seed.ts         # Seed MongoDB con embeddings
├── src/
│   ├── app/                # Angular components, services
│   │   ├── components/     # canvas, chat, sidebar, node-config-panel, flow-toolbar
│   │   └── services/       # chat.service.ts, flow.service.ts
│   ├── server/
│   │   ├── routes/api/     # Nitro API routes (chat, flow, sessions, vehicles, dates, faq)
│   │   ├── models/         # Mongoose models (Vehicle, FAQ, DateSlot, Conversation, Flow)
│   │   └── services/       # vector-search.service.ts, memory.service.ts
│   └── shared/types.ts     # Shared TypeScript interfaces
├── package.json
└── vite.config.ts
```

## Constraints

- **Stack**: Analog.js 2.x + Angular 21 + @foblex/flow 18.1 + Tailwind CSS v4
- **Timeline**: ~18 horas (hackathon)
- **Backend**: Nitro/H3 API routes in src/server/routes/
- **Editor**: @foblex/flow es la librería elegida (not @xyflow/angular which doesn't exist)
- **SSR**: Disabled (ssr: false in vite.config.ts)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Analog.js como meta-framework | Un solo proyecto frontend+backend, deploy unificado a Vercel | ✓ Good — worked seamlessly with Nitro routes |
| @foblex/flow para editor | Port nativo Angular, nodos custom, drag & drop | ✓ Good — Angular 21 compatible, rich API |
| SSE en lugar de WebSocket | Más simple, compatible con Vercel serverless | ✓ Good — token-by-token streaming works |
| MongoDB Atlas para todo | Vector Search + sessions + flow persistence en un cluster | ✓ Good — single connection, unified infra |
| Gemini embeddings (gemini-embedding-001) | Lower cost, 768 dims sufficient for hackathon | ✓ Good — fast seeding |
| Raw fetch() for SSE (not HttpClient) | HttpClient doesn't expose ReadableStream body | ✓ Good — necessary for SSE parsing |
| Angular Signals for FlowService | Reactive state without RxJS complexity | ✓ Good — clean, simple reactive state |
| Config in node.data.config (embedded) | Avoids sync issues with separate nodeConfigs map | ⚠️ Revisit — needs forwarding to chat backend |
| Session GET returns empty (not 404) | Simpler for initial implementation | ⚠️ Revisit — breaks session restore for expired sessions |

---
*Last updated: 2026-03-01 after v1.0 milestone*
