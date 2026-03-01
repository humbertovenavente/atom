# Shared Decisions

Decisions that affect both frontend and backend. Updated as phases progress.

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

- **Embeddings:** Gemini text-embedding-004 (768 dimensions)
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
