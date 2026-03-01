# Phase 1: Infrastructure - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Prove SSE streaming, MongoDB connection, static JSON data loading, and shared TypeScript types work on a deployed Vercel Preview URL before any LLM logic is written. This is the hard gate — Phases 2-4 cannot proceed until this works.

</domain>

<decisions>
## Implementation Decisions

### SSE Event Contract
- Use the exact contract from ARCHITECTURE.md — Persona A is already coding against it
- Events: agent_active, message_chunk, validation_update, done, error
- message_chunk sends the full response as one chunk (not token-by-token streaming)
- agent_active includes node name and status (processing/complete)
- Phase 1 uses hardcoded/mock events to prove SSE works before real LLM calls

### JSON Data Files
- faqs.json, catalog.json, schedule.json were provided at kickoff — will be shared by user
- Catalog should have 20-30 vehicles for realistic demo
- Files loaded at startup, cached in memory — no per-request disk I/O
- If files aren't available yet, create realistic placeholder data

### MongoDB Schema
- Use ARCHITECTURE.md schema: sessionId (unique, indexed) + messages[] + validationData (Mixed) + currentIntent
- Two collections: conversations (chat state) and flows (editor config)
- TTL index: 7 days on updatedAt for conversations
- Mongoose with cached singleton connection pattern for serverless

### Error Handling
- Friendly Spanish error messages: "Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo."
- Errors sent via SSE error event so frontend can display them in chat
- 1 retry on LLM call failure, then fail gracefully with error SSE event
- MongoDB connection errors fail fast with clear error event

### Claude's Discretion
- Exact SSE flush/buffering strategy for Vercel
- Mongoose schema options (timestamps, virtuals)
- Static JSON loading mechanism (import vs readFile vs embedded)
- TypeScript interface organization within types.ts

</decisions>

<specifics>
## Specific Ideas

- ARCHITECTURE.md has complete TypeScript interfaces — use those as the source of truth
- QUICKSTART.md has the Mongoose connection singleton pattern and SSE emit pattern — follow those
- All responses in Spanish (this is a Guatemala City hackathon)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- ARCHITECTURE.md defines the full SSE emit pattern with h3's setHeader + res.write
- QUICKSTART.md has the Mongoose connection cache and conversation model
- .env.example has the environment variable structure

### Integration Points
- POST /api/chat is the main endpoint — frontend sends sessionId + message
- Frontend expects SSE event stream back (EventSource or fetch + ReadableStream)
- Persona A will build against whatever contract we ship in Phase 1

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-infrastructure*
*Context gathered: 2026-02-28*
