# AI Agent Builder — Concesionaria de Autos (Frontend)

## What This Is

Frontend de una plataforma fullstack con editor visual de flujos para construir y probar agentes de IA conversacionales aplicados a una concesionaria de autos. Incluye un editor de nodos draggable (@xyflow/angular), un chat playground con streaming SSE, y un panel de configuración de agentes. Proyecto para el Dev Day Atom 2026 (hackathon).

## Core Value

El editor visual debe mostrar los nodos del flujo de agentes y resaltar en tiempo real cuál nodo está procesando mientras el usuario chatea — eso es lo que diferencia este proyecto en la demo.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Setup proyecto Analog.js con Tailwind CSS y routing file-based
- [ ] Layout principal: sidebar (nodos) + canvas (editor) + panel derecho (chat)
- [ ] Editor visual con @xyflow/angular: 6 tipos de nodos custom con colores/iconos
- [ ] Nodos draggables, conectables con edges animados
- [ ] Chat Playground: input, burbujas user/assistant, auto-scroll
- [ ] Conexión SSE al backend para streaming de respuestas
- [ ] Highlight de nodos activos durante procesamiento del chat
- [ ] Panel de configuración: click en nodo muestra opciones editables
- [ ] Services: chat.service.ts (HTTP/SSE) y flow.service.ts (estado del editor)
- [ ] Interfaces TypeScript compartidas (models/types.ts)
- [ ] Mock del backend para desarrollo independiente
- [ ] Responsive design para pantalla de presentación

### Out of Scope

- Backend/agentes IA — Persona B lo construye en paralelo
- Deploy a Vercel — se hace al final con ambos integrados
- Dark mode — solo si sobra tiempo
- Tests unitarios — hackathon de 24h, priorizar funcionalidad

## Databases

### MongoDB Atlas — Vector DB (Knowledge Base)
- **Cluster**: Atlas compartido (connection string en `.env` como `MONGODB_URI`)
- **DB**: `atom_knowledge`
- **Propósito**: Almacenar los datos de `jsons/` como embeddings vectoriales para búsqueda semántica (Atlas Vector Search)
- **Colecciones**: `vehicles` (autos.json), `appointments` (dates.json), `faq` (faq.json)
- **Seed**: Los JSONs de `jsons/` se suben al cluster y se vectorizan para que los agentes IA hagan RAG

### MongoDB Atlas — Users & Sessions DB
- **Cluster**: Mismo Atlas cluster
- **DB**: `atom_sessions`
- **Propósito**: Persistir usuarios y sus sesiones de chat
- **Colecciones**: `users`, `sessions` (historial de conversaciones)

### Credenciales
Connection string guardado en `.env` (NO commitear). Ver `.env` para la estructura.

## Data (jsons/)

La carpeta `jsons/` contiene los datos fuente que se cargan a MongoDB Atlas Vector Search:

- **autos.json** — Inventario de vehículos disponibles (marca, modelo, año, km, color, precio, descripción, ubicación, URL imagen). ~30+ vehículos.
- **dates.json** — Slots de citas disponibles por fecha (para agendar test drives o visitas). Formato: `{fecha, slots[]}`.
- **faq.json** — Preguntas frecuentes de la agencia organizadas por categoría (Vehículos, Financiamiento, Servicio, etc.).

Estos JSONs definen el dominio del chatbot: es un asistente de concesionaria de autos que puede consultar inventario, agendar citas, y responder FAQs.

## Context

- **Hackathon**: Dev Day Atom 2026, ~18 horas efectivas de desarrollo
- **Equipo**: 2 personas. Persona A (yo) = frontend. Persona B = backend + IA
- **LLM**: Claude/Anthropic (modelo asignado)
- **Integración**: Persona B expondrá POST /api/chat con SSE, POST/GET /api/flow
- **Demo**: 3-5 minutos mostrando el editor visual + chat + nodos iluminándose en tiempo real

## Constraints

- **Stack**: Analog.js 2.x + Angular 17+ + @xyflow/angular + Tailwind CSS 3.x — definido por el equipo
- **Timeline**: ~18 horas (sábado tarde + domingo) — hackathon
- **Backend**: API routes de Nitro/H3 en src/server/routes/ — Persona B las implementa
- **Editor**: @xyflow/angular es la librería elegida para el editor de nodos

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Analog.js como meta-framework | Un solo proyecto frontend+backend, deploy unificado a Vercel | — Pending |
| @xyflow/angular para editor | Port oficial de React Flow para Angular, nodos custom, drag & drop | — Pending |
| SSE en lugar de WebSocket | Más simple, compatible con Vercel serverless, suficiente para streaming | — Pending |
| Mock backend para desarrollo | Permite trabajar en paralelo sin depender de Persona B | — Pending |
| MongoDB Atlas para datos + sesiones | Vector Search para RAG, misma infra para users/sessions | — Pending |

---
*Last updated: 2026-03-01 after adding MongoDB Atlas (vector + sessions)*
