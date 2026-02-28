# AI Agent Builder — Backend (Concesionaria de Autos)

## What This Is

Backend API and multi-agent orchestration system for a car dealership AI chatbot. Part of a 2-person hackathon project (Dev Day Atom 2026) where Persona A builds the frontend/editor and Persona B (us) builds the backend: API routes, agent pipeline, memory persistence, and data tools. The frontend connects via HTTP POST with SSE streaming.

## Core Value

The multi-agent pipeline must correctly classify user intent, conversationally collect required data through validation, and deliver personalized responses from static JSON data sources — all streaming in real-time via SSE with node-activation events for the visual editor.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] POST /api/chat endpoint that receives sessionId + message and returns SSE stream
- [ ] Orchestrator agent that classifies intent into faqs/catalog/schedule/generic
- [ ] Memory service that reads/writes conversation context to MongoDB Atlas
- [ ] Validator agent for FAQs: collects clientType, employmentType, age
- [ ] Validator agent for Catalog: collects budget, condition, employeeDiscount, vehicleType
- [ ] Validator agent for Scheduling: collects fullName, date, time, appointmentType, vehicleOfInterest
- [ ] Specialist agent for FAQs: queries faqs.json, personalizes by client profile
- [ ] Specialist agent for Catalog: filters catalog.json by criteria, applies employee discount
- [ ] Specialist agent for Scheduling: checks schedule.json availability, proposes alternatives
- [ ] Generic agent for greetings, farewells, and out-of-scope messages
- [ ] SSE events: agent_active, message_chunk, validation_update, done, error
- [ ] Intent continuity: maintain current intent when user responds to validator questions
- [ ] POST /api/flow and GET /api/flow for saving/loading editor configurations
- [ ] Static JSON data files: faqs.json, catalog.json, schedule.json
- [ ] Conversation memory persists across sessions in MongoDB (bonus: +5 pts)

### Out of Scope

- Frontend/editor UI — Persona A's responsibility
- WebSocket implementation — using SSE (simpler, Vercel-compatible)
- Real external API integrations — using static JSON files
- User authentication — not required for hackathon demo
- RAG/vector database — static JSON is sufficient for the demo
- Production error monitoring — basic error handling only

## Context

- **Hackathon**: Dev Day Atom 2026, Guatemala City. Saturday Feb 28 (kickoff 2-4 PM, dev until midnight) + Sunday Mar 1 (10 AM - 8 PM). ~18 hours total.
- **Team**: 2 people. Persona A = frontend/editor. Persona B (us) = backend/agents.
- **Evaluation**: Architecture (35pts), UX/Editor (25pts), Use Cases (25pts), Teamwork (15pts), + bonuses.
- **Frontend expects**: SSE stream from POST /api/chat with agent_active events (node highlighting), message_chunk events (chat display), and validation_update events.
- **Data format**: JSON files provided at kickoff with FAQs, vehicle catalog, and advisor schedule.
- **Deploy target**: Vercel (Nitro/H3 API routes from Analog.js).

## Constraints

- **LLM**: Google Gemini — use @langchain/google-genai or direct Gemini SDK
- **Database**: MongoDB Atlas (free tier M0) — already provisioned
- **Runtime**: Nitro/H3 server routes (Analog.js meta-framework) — API routes in src/server/routes/
- **Timeline**: ~18 hours of development across 2 days
- **Deploy**: Must work on Vercel serverless (SSE compatible)
- **Framework**: h3 event handlers (defineEventHandler, readBody, setHeader)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Gemini as LLM | API key available, cost-effective | — Pending |
| MongoDB over Firestore | More flexible queries, familiar driver, aggregation support | — Pending |
| SSE over WebSocket | Simpler, unidirectional streaming sufficient, Vercel-compatible | — Pending |
| LangChain.js for orchestration | Multi-agent chains, prompt templates, memory management built-in | — Pending |
| Static JSON over real APIs | Hackathon time constraint, sufficient for demo | — Pending |
| Mongoose for MongoDB | Schema validation, faster development vs native driver | — Pending |

---
*Last updated: 2026-02-28 after initialization*
