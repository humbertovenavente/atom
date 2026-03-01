# Requirements: AI Agent Builder Frontend

**Defined:** 2026-02-28
**Core Value:** El editor visual muestra nodos iluminándose en tiempo real mientras el usuario chatea — eso es lo que gana la demo.

## v1 Requirements

### Setup & Foundation

- [ ] **SETUP-01**: Proyecto Analog.js creado con Angular 17+, Tailwind CSS, y routing file-based
- [ ] **SETUP-02**: Librería de flow editor instalada y funcionando (alternativa a @xyflow/angular)
- [ ] **SETUP-03**: Layout principal con 3 paneles: sidebar izq (nodos) + canvas centro (editor) + panel der (chat)
- [ ] **SETUP-04**: Interfaces TypeScript compartidas definidas en models/types.ts
- [ ] **SETUP-05**: Mock de backend (API routes de Nitro) para desarrollo independiente de Persona B

### Flow Editor

- [ ] **FLOW-01**: 6 tipos de nodos custom renderizados en el canvas con colores e iconos distintos (Memoria, Orquestador, Validador, Especialista, Genérico, Tool)
- [ ] **FLOW-02**: Nodos son draggables en el canvas (reposicionables con mouse)
- [ ] **FLOW-03**: Edges/conexiones entre nodos con animación de flujo
- [ ] **FLOW-04**: Flujo default pre-cargado con los 8 nodos conectados correctamente
- [ ] **FLOW-05**: Mini-mapa del editor mostrando vista general del canvas
- [ ] **FLOW-06**: Controles de zoom (+, -, fit view)
- [ ] **FLOW-07**: Sidebar con lista de nodos arrastrables al canvas (drag & drop externo)

### Chat Playground

- [ ] **CHAT-01**: UI de chat con campo de texto, botón enviar, y área de mensajes scrolleable
- [ ] **CHAT-02**: Burbujas de mensaje diferenciadas para user (derecha) y assistant (izquierda)
- [ ] **CHAT-03**: Auto-scroll al último mensaje (respetando cuando el usuario hace scroll up)
- [ ] **CHAT-04**: Streaming de respuestas via SSE mostrando texto progresivamente
- [ ] **CHAT-05**: Typing indicator (tres puntos animados) mientras el bot procesa
- [ ] **CHAT-06**: Nodos del flow se iluminan/resaltan en tiempo real según el agente activo durante el chat

### Configuration

- [ ] **CONF-01**: Panel de configuración: click en nodo muestra sidebar con opciones editables (system prompt, temperatura)
- [ ] **CONF-02**: Guardar configuración del flow al backend (POST /api/flow)
- [ ] **CONF-03**: Cargar configuración del flow desde backend (GET /api/flow)
- [ ] **CONF-04**: Botón "Reset Flow" para volver al flujo default
- [ ] **CONF-05**: Botón "Nueva Conversación" para limpiar el chat e iniciar sesión nueva

### Data & Backend

- [ ] **DATA-01**: Conexión a MongoDB Atlas configurada en Nitro (usando MONGODB_URI de .env)
- [ ] **DATA-02**: Script/seed que carga autos.json, dates.json y faq.json a MongoDB Atlas con vector embeddings
- [ ] **DATA-03**: Atlas Vector Search index creado y funcional para búsqueda semántica
- [ ] **DATA-04**: API routes GET /api/vehicles, GET /api/dates, GET /api/faq sirviendo datos desde MongoDB
- [ ] **DATA-05**: Sistema de sessions: POST /api/sessions (crear), GET /api/sessions/:id (recuperar con historial)

### Services

- [ ] **SERV-01**: ChatService con conexión HTTP POST al backend y parsing de SSE events
- [ ] **SERV-02**: FlowService con estado del editor (nodos, edges, nodo activo, nodo seleccionado) usando signals
- [ ] **SERV-03**: Comunicación ChatService → FlowService para highlight de nodos activos

## v2 Requirements

### Polish

- **POL-01**: Dark mode o tema profesional
- **POL-02**: Tooltips en nodos al hacer hover
- **POL-03**: Responsive design completo para distintas resoluciones
- **POL-04**: Animaciones de transición entre estados

### Advanced

- **ADV-01**: Undo/redo en el editor
- **ADV-02**: Exportar/importar flujo como JSON
- **ADV-03**: Markdown rendering en respuestas del chat

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend/agentes IA | Persona B lo construye en paralelo |
| Deploy a Vercel | Se hace al final con ambos integrados |
| Tests unitarios | Hackathon de 18h, priorizar funcionalidad |
| Autenticación de usuarios | No es parte del MVP del hackathon |
| Voice input | Alto costo de implementación, zero ROI en demo |
| Undo/redo | Complejidad alta para poco impacto en demo |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 | Pending |
| SETUP-02 | Phase 1 | Pending |
| SETUP-03 | Phase 1 | Pending |
| SETUP-04 | Phase 1 | Pending |
| SETUP-05 | Phase 1 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| DATA-05 | Phase 2 | Pending |
| FLOW-01 | Phase 3 | Pending |
| FLOW-02 | Phase 3 | Pending |
| FLOW-03 | Phase 3 | Pending |
| FLOW-04 | Phase 3 | Pending |
| FLOW-05 | Phase 3 | Pending |
| FLOW-06 | Phase 3 | Pending |
| FLOW-07 | Phase 3 | Pending |
| CHAT-01 | Phase 4 | Pending |
| CHAT-02 | Phase 4 | Pending |
| CHAT-03 | Phase 4 | Pending |
| CHAT-04 | Phase 4 | Pending |
| CHAT-05 | Phase 4 | Pending |
| CHAT-06 | Phase 4 | Pending |
| CONF-01 | Phase 5 | Pending |
| CONF-02 | Phase 5 | Pending |
| CONF-03 | Phase 5 | Pending |
| CONF-04 | Phase 5 | Pending |
| CONF-05 | Phase 5 | Pending |
| SERV-01 | Phase 4 | Pending |
| SERV-02 | Phase 3 | Pending |
| SERV-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 31 total (26 original + 5 DATA)
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-03-01 after adding MongoDB Atlas data requirements*
