# Shared Decisions

Decisions that affect both frontend and backend. Updated as phases progress.

---

## Phase 3: Data & Backend (current)

**Date:** 2026-03-01

### Schema Alignment

The remote codebase (post-pull) uses **Spanish field names** in Mongoose models but Atlas has **English-field seed data** from Phase 2. Decision: **update models to English** — no re-seeding.

**Vehicle model fields (English):** `brand`, `model`, `year`, `mileage`, `color`, `description`, `doors`, `segment`, `price`, `state`, `city`, `fuelType`, `engine`, `transmission`, `url`, `quantity`, `embedding`

**FAQ model fields (English):** `category`, `question`, `answer`, `originalId`, `embedding`

**Appointment model fields (English):** `date`, `slots` — maps to Atlas `appointments` collection. (`dateslots` collection is deprecated, do NOT use.)

### Database Structure (corrected from Phase 2)

Remote code uses **single-database** (not two-DB). All collections live in `atom_knowledge`:
- `vehicles`, `faq`, `appointments` — knowledge base
- `conversations` — sessions/chat history (uses `Conversation` model — name kept as-is)

### Env Var Standardization

- Use `LLM_API_KEY` everywhere (not `GEMINI_API_KEY`)
- Update `VectorSearchService` to read `process.env['LLM_API_KEY']`

### Atlas Vector Search Index Names

| Collection | Index name |
|------------|------------|
| `vehicles` | `vehicles_vector_index` |
| `faq` | `faqs_vector_index` |

### Semantic Search (VectorSearchService)

- Returns **top 3 results** (default changed from 5 → 3)
- **No score threshold** — return top N always
- **Fallback:** if `$vectorSearch` returns empty → run regular `.find()` with simple filter
- **No `searchDates()`** — appointments use date filter only (`GET /api/dates`)

### chat.post.ts Rewiring (PENDING — not completed in Phase 3)

- Switch from `data/loader.ts` (static JSON) → MongoDB + VectorSearchService
- Inject **top 3 vehicles + top 3 FAQs** into LLM system prompt context
- Delete `data/loader.ts` and static JSON source files after wiring
- **Status:** Still using static `data/loader.ts` — rewiring deferred to gap closure

### Session API

| Method | Endpoint | Behavior |
|--------|----------|----------|
| POST | /api/sessions | Creates session, returns `{ sessionId }` |
| GET | /api/sessions/:id | Returns session or 404 if not found |

- Sessions have **24-hour TTL** (MongoDB TTL index on `createdAt`)
- No `DELETE /api/sessions/:id` — "Nueva Conversación" creates a new session ID instead
- Unknown session IDs return **404** (strict — no auto-create)

---

## Phase 2: Data & Backend

**Date:** 2026-03-01

### MongoDB Structure

**Two databases on same Atlas cluster:**
- `atom_knowledge` — vehicles, appointments, faq (seeded from jsons/)
- `atom_sessions` — chat sessions

**Collections (English names, English fields):**

#### `vehicles` (in atom_knowledge)
```json
{
  "brand": "Nissan",
  "model": "Versa",
  "year": 2018,
  "mileage": 65000,
  "color": "Gris",
  "description": "Excelente sedán compacto...",
  "doors": 4,
  "segment": "Sedán",
  "price": 185000,
  "state": "Jalisco",
  "city": "Guadalajara",
  "fuelType": "Gasolina",
  "engine": 1.6,
  "transmission": "Automática",
  "imageUrl": "https://...",
  "quantity": 1,
  "embedding": [0.012, -0.034, ...]
}
```

#### `appointments` (in atom_knowledge)
```json
{
  "date": "2026-03-01",
  "slots": ["2026-03-01T15:00:00Z", "2026-03-01T16:00:00Z", ...]
}
```

#### `faq` (in atom_knowledge)
```json
{
  "category": "Vehículos y Modelos",
  "question": "¿Tienen autos para entrega inmediata?",
  "answer": "Contamos con un inventario selecto...",
  "embedding": [0.012, -0.034, ...]
}
```

#### `sessions` (in atom_sessions)
```json
{
  "sessionId": "uuid-generated-by-backend",
  "messages": [
    { "role": "user", "content": "Hola..." },
    { "role": "assistant", "content": "Bienvenido..." }
  ],
  "createdAt": "2026-03-01T...",
  "updatedAt": "2026-03-01T..."
}
```

### API Endpoints

| Method | Endpoint | Returns | Notes |
|--------|----------|---------|-------|
| GET | /api/vehicles | `Vehicle[]` | All vehicles, flat JSON array |
| GET | /api/dates | `Appointment[]` | Future slots only |
| GET | /api/faq | `FAQ[]` | All FAQ entries |
| POST | /api/sessions | `{ sessionId }` | Backend generates UUID |
| GET | /api/sessions/:id | `Session` | Full session with messages |
| POST | /api/chat | SSE stream | Vector search happens internally |

### Key Decisions

- **Embeddings:** Gemini `gemini-embedding-001` (768 dimensions) via `@google/genai`
- **Seed script:** `npm run seed` (manual, one-time)
- **Vector search:** Internal to POST /api/chat, no separate search endpoint
- **Field names:** Normalized from Spanish to English (Marca→brand, Precio→price, etc.)
- **Data content:** Stays in Spanish (descriptions, FAQ answers, colors, etc.)
- **Sessions:** Backend generates sessionId, frontend stores it

---

## Phase 1: Infrastructure (Complete)

- Analog.js v2.3.0 (Angular 21 + SSR + Nitro)
- SSE streaming via POST /api/chat
- MongoDB singleton connection
- Shared TypeScript types in `src/shared/types.ts`
