# Division de Trabajo — AI Agent Builder (Concesionaria de Autos)

**Proyecto:** Dev Day Atom 2026 — Hackathon
**Duracion:** 2 dias (28 feb - 1 mar 2026)
**Resultado:** v1.0 entregada — 2,394 LOC TypeScript, 72 archivos, 79 commits

---

## Equipo

| Miembro | Rol |
|---------|-----|
| **Adrian** | Backend + Agentes IA + Datos + Integracion |
| **Humberto** | Frontend + Editor Visual + UX |

---

## Fases del Backend (Roadmap Ejecutado)

| Fase | Descripcion | Estado |
|------|-------------|--------|
| Fase 1 | Fundacion y Setup | Completada |
| Fase 2 | Editor Visual de Flujos | Completada |
| Fase 3 | Datos y Backend (MongoDB + APIs) | Completada |
| Fase 4 | Chat y Streaming SSE | Completada |
| Fase 5 | Nodo de Telegram (agregada) | Completada |

---

## Responsabilidades de Adrian — Backend + Agentes IA + Datos

### Fase 1: Fundacion y Setup (Backend)
- Scaffold del proyecto con Analog.js 2.3 + Angular 21
- Configuracion de Vite, Tailwind CSS v4 y estructura base del proyecto
- Definicion de interfaces TypeScript compartidas (`shared/types.ts`): FlowNode, FlowEdge, ChatMessage, AgentConfig, Session
- Conexion a MongoDB Atlas desde Nitro API routes (health check)
- Configuracion de variables de entorno (MONGODB_URI, LLM_API_KEY)
- Deshabilitacion de SSR en `vite.config.ts` para evitar errores con librerias de UI

### Fase 3: Datos y Backend (MongoDB Atlas)
- Modelos Mongoose:
  - Vehicle (inventario de autos)
  - FAQ (preguntas frecuentes)
  - DateSlot (slots de citas)
  - Conversation (sesiones de chat)
  - Flow (configuraciones de flujo guardadas)
- Script de seed (`scripts/seed.ts`) que carga los 3 JSONs con Gemini embeddings para busqueda semantica
- Indices de Atlas Vector Search (`vehicles_vector_index`, `faq_vector_index`, cosine, 3072 dims)
- VectorSearchService para busqueda semantica en MongoDB
- API routes implementadas:
  - `GET /api/vehicles` — autos desde MongoDB
  - `GET /api/dates` — slots de citas disponibles
  - `GET /api/faq` — preguntas frecuentes
  - `POST /api/sessions` — crear sesion nueva
  - `GET /api/sessions/:id` — recuperar sesion con historial
- Alineacion de esquemas con nombres de campos en ingles
- MemoryService para leer/escribir contexto conversacional en MongoDB

### Fase 4: Chat y Streaming SSE (Backend)
- Pipeline LLM completo en `chat.post.ts`:
  1. Leer memoria de sesion desde MongoDB
  2. Orquestar — clasificar la intencion del usuario
  3. Si es generico — responder directamente
  4. Si es especifico — validar datos → especialista consulta con busqueda semantica
  5. Guardar memoria actualizada en MongoDB
- Agente Orquestador: clasifica intenciones (faqs, catalog, schedule, generic)
- Agente Generico: maneja saludos, despedidas y consultas fuera de scope
- Agentes Validadores (3): recopilan datos del usuario conversacionalmente
  - FAQs: tipo de cliente, tipo de empleo, edad
  - Catalogo: presupuesto, condicion, descuento, tipo de vehiculo
  - Agenda: nombre, fecha, hora, motivo, vehiculo de interes
- Agentes Especialistas (3): consultan datos reales via busqueda semantica
  - FAQs: respuesta personalizada segun perfil
  - Catalogo: filtra vehiculos y recomienda opciones
  - Agenda: consulta disponibilidad y confirma o propone alternativas
- Implementacion de SSE (Server-Sent Events):
  - Streaming token-by-token de respuestas del LLM
  - Emision de eventos `node_active` para highlight de nodos en el editor
  - Eventos: `agent_active`, `message_chunk`, `done`
- Prompt engineering de todos los system prompts de agentes
- API routes de persistencia:
  - `POST /api/flow` — guardar configuracion del flujo
  - `GET /api/flow` — cargar configuracion guardada
- Error handling en el pipeline completo de agentes

### Fase 5: Nodo de Telegram
- Tipo de nodo `telegram` en la union de tipos de FlowNode
- Backend: `telegram.post.ts` — handler de webhook para Telegram
- Pipeline de agentes no-streaming dedicado para mensajes de Telegram
- Respuesta via Telegram `sendMessage` API
- Sesiones aisladas de Telegram (campo `source` en conversationSchema)
- MemoryService con `$setOnInsert` para sesiones de Telegram
- Registro de webhook desde el navegador

---

## Responsabilidades de Humberto — Frontend + Editor Visual + UX

> **Nota:** La parte de frontend todavia necesita completarse/integrarse en algunas areas.

### Fase 1: Fundacion y Setup (Frontend)
- Integracion de @foblex/flow 18.1.2 como libreria de editor visual
- Layout de 3 paneles: sidebar (nodos) + canvas (editor) + panel derecho (chat)
- Routing file-based (pagina principal `/editor`)

### Fase 2: Editor Visual de Flujos
- 6 tipos de nodos custom con colores e iconos distintos:
  - Memoria (violeta)
  - Orquestador (azul)
  - Validador (verde)
  - Especialista (amarillo)
  - Generico (gris)
  - Tool/JSON (rojo)
- Drag & drop de nodos desde sidebar al canvas
- Edges (conexiones) animados entre nodos
- Mini-mapa del editor
- Controles de zoom (+, -, fit view)
- FlowService con Angular Signals para estado reactivo del editor
- Flujo default con 8 nodos pre-conectados que carga automaticamente
- Panel de configuracion: click en nodo muestra systemPrompt y temperatura editables

### Fase 4: Chat y Streaming SSE (Frontend)
- Chat Playground:
  - Input de texto con boton enviar
  - Burbujas de mensaje (usuario vs asistente)
  - Auto-scroll inteligente
- ChatService: conexion HTTP POST + parsing de eventos SSE con raw `fetch()`
- Streaming visual token-by-token (respuestas progresivas)
- Typing indicator (puntos animados mientras el bot procesa)
- Blinking cursor durante streaming
- Highlight de nodos activos durante procesamiento:
  - Escucha eventos `node_active` del SSE
  - Efecto glow + pulse cuando `status: 'processing'`
  - Se limpia cuando el procesamiento avanza
- Boton "Nueva Conversacion" para limpiar el chat
- Boton "Reset Flow" para volver al flujo default
- Save/load del flujo a MongoDB

### Fase 5: Nodo de Telegram (PR #1)
- Nodo visual de Telegram en el editor con icono y color propio
- Panel de configuracion condicional con campo de bot token
- Boton de registro de webhook desde la interfaz
- Contribucion via Pull Request (`feature/telegram-node`)

---

## Tareas Compartidas

| Tarea | Descripcion |
|-------|-------------|
| Test end-to-end | Flujo completo de cada caso de uso (FAQs, Catalogo, Agenda) |
| Fix bugs de integracion | Resolver problemas entre frontend y backend |
| Script de demo | Preparar demo de 3-5 minutos para el pitch |
| Practica de pitch | Ensayar presentacion + anticipar preguntas tecnicas |

---

## Casos de Uso Implementados

| Caso | Descripcion | Flujo |
|------|-------------|-------|
| **FAQs** | Consultas generales (horarios, financiamiento, garantias) | Orquestador -> Validador (recopila perfil) -> Especialista (respuesta personalizada) |
| **Catalogo** | Busqueda de vehiculos por presupuesto, tipo, descuento | Orquestador -> Validador (perfil de compra) -> Especialista (filtra catalogo) |
| **Agenda** | Agendar prueba de manejo o cita con asesor | Orquestador -> Validador (datos de cita) -> Especialista (disponibilidad) |
| **Telegram** | Canal alternativo via bot de Telegram | Webhook -> Pipeline de agentes -> Respuesta por Telegram API |

---

## Stack Tecnologico Final

| Capa | Tecnologia |
|------|-----------|
| Meta-framework | Analog.js 2.3 |
| Frontend | Angular 21 + TypeScript |
| Editor Visual | @foblex/flow 18.1.2 |
| Estilos | Tailwind CSS v4 |
| Backend | Nitro/H3 (API routes) |
| Base de Datos | MongoDB Atlas (Vector Search) |
| Embeddings | Gemini (gemini-embedding-001) |
| LLM Pipeline | LangChain.js |
| Estado Reactivo | Angular Signals |
| Streaming | Server-Sent Events (SSE) |

---

## Metricas del Proyecto

- **Lineas de codigo:** 2,394 LOC TypeScript
- **Archivos:** 72
- **Commits:** 79
- **Fases completadas:** 5/5 (100%)
- **Planes ejecutados:** 14
- **Requisitos cumplidos:** 26/26
- **Tiempo de desarrollo:** ~18 horas efectivas en 2 dias

---

## Decisiones Tecnicas Clave

| Decision | Razon | Responsable |
|----------|-------|-------------|
| Analog.js en vez de Angular CLI + backend separado | Un solo proyecto, deploy unificado, menos complejidad | Adrian |
| @foblex/flow en vez de @xyflow/angular | Port nativo Angular, compatible con Angular 21 | Humberto |
| SSE en vez de WebSocket | Mas simple, compatible con Vercel serverless | Adrian |
| MongoDB Atlas para todo | Vector Search + sesiones + flujos en un solo cluster | Adrian |
| Raw fetch() para SSE (no HttpClient) | HttpClient no expone ReadableStream body | Humberto |
| Angular Signals para FlowService | Estado reactivo sin complejidad de RxJS | Humberto |
| Gemini embeddings (768 dims) | Menor costo, suficiente para hackathon | Adrian |
| SSR deshabilitado | Evitar errores de `window` con @foblex/flow | Adrian |
