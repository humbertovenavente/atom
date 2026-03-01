# 📋 TASKS.md — División de Tareas

## Equipo

| Miembro | Rol Principal |
|---------|--------------|
| **Persona A** | Frontend + Editor Visual + UX |
| **Persona B** | Backend + Agentes IA + Datos |

---

## Tareas por Miembro

### Persona A — Frontend + Editor Visual

| # | Tarea | Estado | Prioridad |
|---|-------|--------|-----------|
| A1 | Setup Analog.js + Tailwind + estructura de proyecto | ⬜ | 🔴 Crítica |
| A2 | Layout principal: sidebar + canvas + chat panel | ⬜ | 🔴 Crítica |
| A3 | Integración @xyflow/angular en el canvas | ⬜ | 🔴 Crítica |
| A4 | Nodo custom: Memoria 🧠 (diseño + color + icono) | ⬜ | 🔴 Crítica |
| A5 | Nodo custom: Orquestador 🎯 | ⬜ | 🔴 Crítica |
| A6 | Nodo custom: Validador ✅ | ⬜ | 🔴 Crítica |
| A7 | Nodo custom: Especialista 🤖 | ⬜ | 🔴 Crítica |
| A8 | Nodo custom: Genérico 💬 | ⬜ | 🔴 Crítica |
| A9 | Nodo custom: Tool/JSON 🔧 | ⬜ | 🔴 Crítica |
| A10 | Edges (conexiones) entre nodos con animación | ⬜ | 🔴 Crítica |
| A11 | Drag & drop de nodos desde sidebar al canvas | ⬜ | 🟡 Alta |
| A12 | Panel de configuración: click nodo → sidebar editable | ⬜ | 🟡 Alta |
| A13 | Chat Playground: UI completa (input, burbujas, scroll) | ⬜ | 🔴 Crítica |
| A14 | chat.service.ts: conexión HTTP/SSE al backend | ⬜ | 🔴 Crítica |
| A15 | Streaming de respuestas en el chat (SSE) | ⬜ | 🟡 Alta |
| A16 | Highlight de nodos activos durante procesamiento | ⬜ | 🟡 Alta |
| A17 | Typing indicator en el chat | ⬜ | 🟢 Media |
| A18 | Mini-mapa del editor | ⬜ | 🟢 Media |
| A19 | Zoom controls | ⬜ | 🟢 Media |
| A20 | Responsive design | ⬜ | 🟢 Media |
| A21 | Loading states y error handling en UI | ⬜ | 🟢 Media |
| A22 | Tooltips en nodos | ⬜ | 🔵 Baja |

### Persona B — Backend + Agentes IA

| # | Tarea | Estado | Prioridad |
|---|-------|--------|-----------|
| B1 | Conexión MongoDB Atlas (driver/mongoose en Nitro) | ⬜ | 🔴 Crítica |
| B2 | Definir interfaces TypeScript compartidas (types.ts) | ⬜ | 🔴 Crítica |
| B3 | API route: POST /api/chat (endpoint principal) | ⬜ | 🔴 Crítica |
| B4 | Agente Orquestador: clasificación de intenciones | ⬜ | 🔴 Crítica |
| B5 | Agente Genérico: saludos, despedidas, fuera de scope | ⬜ | 🔴 Crítica |
| B6 | Memory Service: leer/escribir contexto en MongoDB | ⬜ | 🔴 Crítica |
| B7 | Agente Validador — Caso 1 (FAQs): recopilar datos conversacionalmente | ⬜ | 🔴 Crítica |
| B8 | Agente Especialista — Caso 1 (FAQs): consultar faqs.json + personalizar | ⬜ | 🔴 Crítica |
| B9 | Agente Validador — Caso 2 (Catálogo): recopilar perfil de compra | ⬜ | 🔴 Crítica |
| B10 | Agente Especialista — Caso 2 (Catálogo): filtrar catalog.json | ⬜ | 🔴 Crítica |
| B11 | Agente Validador — Caso 3 (Agenda): recopilar datos de cita | ⬜ | 🟡 Alta |
| B12 | Agente Especialista — Caso 3 (Agenda): consultar schedule.json | ⬜ | 🟡 Alta |
| B13 | SSE streaming desde API route al frontend | ⬜ | 🟡 Alta |
| B14 | API route: POST /api/flow (guardar configuración) | ⬜ | 🟡 Alta |
| B15 | API route: GET /api/flow (cargar configuración) | ⬜ | 🟡 Alta |
| B16 | Emitir evento de "nodo activo" para highlight en frontend | ⬜ | 🟡 Alta |
| B17 | Prompt engineering: optimizar system prompts de todos los agentes | ⬜ | 🟡 Alta |
| B18 | Error handling en pipeline de agentes | ⬜ | 🟢 Media |
| B19 | README.md: arquitectura y decisiones técnicas | ⬜ | 🟢 Media |
| B20 | Configurar deploy a Vercel + env vars | ⬜ | 🟢 Media |

### Tareas Compartidas

| # | Tarea | Estado | Prioridad |
|---|-------|--------|-----------|
| C1 | Test end-to-end: flujo completo de cada caso de uso | ⬜ | 🔴 Crítica |
| C2 | Fix bugs de integración frontend ↔ backend | ⬜ | 🔴 Crítica |
| C3 | Preparar script de demo para el pitch (3-5 min) | ⬜ | 🔴 Crítica |
| C4 | Practicar pitch + anticipar preguntas técnicas | ⬜ | 🟡 Alta |

---

## Leyenda de Estados

- ⬜ Pendiente
- 🟨 En progreso
- ✅ Completado
- ❌ Descartado

## Leyenda de Prioridades

- 🔴 Crítica — Sin esto no hay demo funcional
- 🟡 Alta — Mejora significativamente la evaluación
- 🟢 Media — Nice to have, hacerlo si sobra tiempo
- 🔵 Baja — Solo si queda tiempo extra
