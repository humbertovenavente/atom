# ATOM — AI Agent Builder para Concesionaria de Autos

> Plataforma fullstack con editor visual de flujos para construir y probar agentes de IA conversacionales multi-agente, aplicados a una concesionaria de autos. Incluye chat en vivo con streaming y canal de Telegram.

**Dev Day Atom 2026** — Hackathon Challenge

---

## Tabla de Contenidos

- [Demo](#demo)
- [Stack Tecnologico](#stack-tecnologico)
- [Arquitectura](#arquitectura)
- [Pipeline Multi-Agente](#pipeline-multi-agente)
- [Canales de Comunicacion](#canales-de-comunicacion)
- [Casos de Uso](#casos-de-uso)
- [API Endpoints](#api-endpoints)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Configuracion Local](#configuracion-local)
- [Decisiones Tecnicas](#decisiones-tecnicas)

---

## Demo

- **Produccion:** https://atom-one-phi.vercel.app/
- **Repositorio:** https://github.com/humbertovenavente/atom

---

## Stack Tecnologico

| Capa | Tecnologia | Version |
|------|-----------|---------|
| **Meta-framework** | Analog.js | 2.3.0 |
| **Frontend** | Angular + TypeScript | 21 |
| **Editor Visual** | @foblex/flow | 18.1.2 |
| **Styling** | Tailwind CSS | 4.2 |
| **Backend** | Nitro/H3 (API routes de Analog) | — |
| **Base de Datos** | MongoDB Atlas + Mongoose | 9.x |
| **LLM** | Google Gemini 2.5 Flash | via @google/genai |
| **Busqueda Semantica** | MongoDB Atlas Vector Search | embeddings propios |
| **Canal Externo** | Telegram Bot API | webhooks |
| **Deploy** | Vercel | zero-config |

### Por que este stack?

**Analog.js** — Meta-framework fullstack oficial de Angular. Un solo proyecto = frontend + backend (API routes) en un monolito cohesivo. File-based routing, deploy unificado a Vercel, powered by Vite + Nitro.

**@foblex/flow** — Libreria de editor de nodos con soporte nativo Angular. Drag & drop, conexiones, zoom, y nodos custom para visualizar el pipeline de agentes.

**MongoDB Atlas** — Base de datos NoSQL con:
- Almacenamiento flexible de conversaciones y flujos
- Vector Search para busqueda semantica en vehiculos y FAQs
- Memoria persistente entre sesiones
- Colecciones separadas para conocimiento (`atom_knowledge`) y sesiones (`atom_sessions`)

**Google Gemini 2.5 Flash** — LLM rapido y capaz para clasificacion de intenciones, validacion conversacional, y generacion de respuestas especializadas. Usado directamente via `@google/genai` SDK sin frameworks intermediarios.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     ANALOG.JS (Vercel)                          │
│                                                                 │
│  ┌──────────────────────┐    ┌────────────────────────────────┐ │
│  │   FRONTEND (Angular)  │    │   BACKEND (Nitro/H3)           │ │
│  │                        │    │                                │ │
│  │  ┌────────────────┐   │    │   /api/chat.post.ts (SSE)      │ │
│  │  │  Flow Editor    │   │    │   /api/telegram.post.ts        │ │
│  │  │  (@foblex/flow) │───│───▶│                                │ │
│  │  │  Canvas + Sidebar│   │    │   ┌────────────────────────┐  │ │
│  │  └────────────────┘   │    │   │  Multi-Agent Pipeline   │  │ │
│  │                        │    │   │                        │  │ │
│  │  ┌────────────────┐   │    │   │  Memory       → load   │  │ │
│  │  │  Chat Panel     │   │    │   │  Orchestrator → intent │  │ │
│  │  │  (SSE streaming)│───│───▶│   │  Validator    → fields │  │ │
│  │  │                 │   │    │   │  Booking      → slots  │  │ │
│  │  └────────────────┘   │    │   │  Specialist   → reply  │  │ │
│  │                        │    │   │  Memory       → save   │  │ │
│  │  ┌────────────────┐   │    │   └────────────┬───────────┘  │ │
│  │  │  Config Panel   │   │    │                │              │ │
│  │  │  (per-node)     │   │    │   ┌────────────▼───────────┐  │ │
│  │  └────────────────┘   │    │   │  Vector Search Service  │  │ │
│  └──────────────────────┘    │   │  (vehicles + FAQs)      │  │ │
│                                │   └────────────┬───────────┘  │ │
│  ┌──────────────────────┐    │                │              │ │
│  │   TELEGRAM            │    │   ┌────────────▼───────────┐  │ │
│  │   Bot API (webhook)   │───▶│   │  MongoDB Atlas         │  │ │
│  └──────────────────────┘    │   │  Conversations + Flows  │  │ │
│                                │   │  Vehicles + FAQs       │  │ │
│                                │   │  Appointments + Books  │  │ │
│                                │   └────────────────────────┘  │ │
│                                └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Patron de Comunicacion

1. **Web Chat → Backend**: HTTP POST a `/api/chat` → respuesta via Server-Sent Events (SSE) para streaming en tiempo real
2. **Telegram → Backend**: Telegram envia webhook POST a `/api/telegram` → respuesta completa via Bot API `sendMessage`
3. **Backend → MongoDB**: Lectura/escritura de memoria conversacional, flujos, vehiculos, FAQs, citas
4. **Backend → Vector Search**: Busqueda semantica de vehiculos y FAQs relevantes al mensaje del usuario
5. **Backend → Gemini**: Llamadas al LLM para clasificacion de intenciones y generacion de respuestas

---

## Pipeline Multi-Agente

```
Mensaje del usuario (Web Chat o Telegram)
     │
     ▼
 MEMORIA ──────────────── Carga historial de conversacion desde MongoDB
     │
     ▼
 ORQUESTADOR ──────────── Clasifica intencion con Gemini (+ fecha actual para resolver "manana", etc.)
     │                     Extrae campos: nombre, fecha, hora, presupuesto, tipo vehiculo
     │
     ├── intent: "catalog"   ──┐
     ├── intent: "schedule"  ──┤
     ├── intent: "faqs"      ──┤
     └── intent: "generic"   ──┘
                                │
                                ▼
 VALIDADOR ────────────── Verifica campos requeridos con datos acumulados
     │                     schedule: fullName, preferredDate, preferredTime
     │                     catalog: budget, vehicleType
     │
     ▼
 BOOKING ─────────────── (Solo schedule) Cuando todos los campos estan completos:
     │                     - Busca horarios disponibles reales desde MongoDB
     │                     - Intenta reservar la cita
     │                     - Maneja conflictos (slot ocupado, dia lleno)
     │
     ▼
 ESPECIALISTA ─────────── Vector search (vehiculos + FAQs) + respuesta con Gemini
     │                     - Prompt conversacional (nunca tipo formulario)
     │                     - Inyecta horarios disponibles reales
     │                     - Contexto de datos recopilados del cliente
     │
     ▼
 MEMORIA ──────────────── Guarda turno completo en MongoDB (mensaje + respuesta + validationData)
     │
     ▼
 Respuesta al usuario
```

### Descripcion de cada Agente

| Agente | Responsabilidad |
|--------|----------------|
| **Memoria** | Carga y persiste historial conversacional + datos de validacion acumulados por sesion |
| **Orquestador** | Clasifica intencion (catalog/schedule/faqs/generic) y extrae campos del mensaje. Inyecta fecha actual para resolver fechas relativas |
| **Validador** | Verifica que los campos requeridos esten completos. No usa LLM — es logica pura |
| **Booking** | Reserva citas en MongoDB. Busca slots disponibles, valida disponibilidad, maneja conflictos. Se activa automaticamente cuando los 3 campos de schedule estan completos (fields-first) |
| **Especialista** | Genera respuesta final con Gemini usando contexto vectorial (vehiculos/FAQs), datos del cliente, y reglas conversacionales. Nunca hace preguntas tipo formulario |

### Fields-First Booking

El sistema usa un enfoque "fields-first": cuando detecta que los 3 campos de cita (nombre, fecha, hora) estan completos — sin importar la intencion clasificada — automaticamente intenta reservar. Esto permite que un usuario que da toda la info en un solo mensaje obtenga su cita sin pasos intermedios.

---

## Canales de Comunicacion

### Web Chat (SSE Streaming)

- **Endpoint**: `POST /api/chat`
- **Protocolo**: Server-Sent Events para streaming token por token
- **Eventos SSE**: `agent_active` (nodo procesando/completo), `message_chunk` (texto parcial), `booking_confirmed`, `booking_failed`, `done`, `error`
- **Session ID**: UUID generado por el frontend, persistido en localStorage

### Telegram Bot

- **Endpoint**: `POST /api/telegram` (webhook)
- **Protocolo**: Respuesta completa (no streaming) — Telegram requiere mensaje completo
- **Session ID**: `telegram-{chatId}` — completamente aislado del web chat
- **Configuracion**: Bot token almacenado en el flujo de MongoDB, configurable desde el panel del nodo Telegram en el editor visual
- **Registro**: Boton "Register Webhook" en el config panel llama a `setWebhook` de Telegram apuntando al dominio actual

Ambos canales ejecutan exactamente el mismo pipeline multi-agente (memoria → orquestador → validador → booking → especialista).

---

## Casos de Uso

### Caso 1 — Consultas Generales (FAQs)

El usuario pregunta sobre horarios, ubicacion, financiamiento, garantias, politicas de la concesionaria. El especialista busca FAQs relevantes via vector search y responde directamente. No se requiere recopilar datos adicionales.

### Caso 2 — Catalogo de Vehiculos

El usuario busca autos disponibles, precios, comparativas. El sistema recopila conversacionalmente presupuesto y tipo de vehiculo preferido, luego busca vehiculos relevantes via vector search y hace recomendaciones personalizadas.

### Caso 3 — Agendamiento de Citas

El usuario quiere agendar una cita o prueba de manejo. El sistema recopila nombre, fecha y hora de forma conversacional. Muestra unicamente horarios reales disponibles desde la base de datos. Cuando los 3 campos estan completos, reserva automaticamente y confirma al usuario.

**Flujo de booking**:
- Horarios disponibles se cargan desde MongoDB (coleccion `books` con slots por fecha)
- Maximo 4 citas por dia
- Si el slot esta ocupado, muestra alternativas disponibles
- Si el dia esta lleno, sugiere otra fecha

---

## API Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| `POST` | `/api/chat` | Chat principal — SSE streaming con pipeline multi-agente |
| `POST` | `/api/telegram` | Webhook de Telegram — mismo pipeline, respuesta completa |
| `GET` | `/api/flow` | Cargar configuracion del flujo visual |
| `POST` | `/api/flow` | Guardar configuracion del flujo visual |
| `GET` | `/api/sessions` | Listar sesiones de conversacion |
| `POST` | `/api/sessions` | Crear nueva sesion |
| `GET` | `/api/sessions/:id` | Obtener sesion especifica con historial |
| `PATCH` | `/api/sessions/:id` | Actualizar sesion (renombrar) |
| `DELETE` | `/api/sessions/:id` | Eliminar sesion |
| `GET` | `/api/vehicles` | Listar vehiculos del catalogo |
| `GET` | `/api/faq` | Listar preguntas frecuentes |
| `GET` | `/api/dates` | Obtener fechas con disponibilidad |
| `POST` | `/api/appointments` | Crear cita manualmente |

---

## Estructura del Proyecto

```
atom/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── canvas/                    # Canvas principal del editor (@foblex/flow)
│   │   │   ├── sidebar/                   # Paleta de nodos arrastrables
│   │   │   ├── flow-toolbar/              # Barra de herramientas del editor
│   │   │   ├── node-config-panel/         # Panel de configuracion por nodo (prompt, temp, bot token)
│   │   │   └── chat/                      # Panel de chat con SSE streaming
│   │   │
│   │   ├── services/
│   │   │   ├── chat.service.ts            # Cliente HTTP para /api/chat con parsing SSE
│   │   │   ├── flow.service.ts            # Estado reactivo del editor (nodos, edges, seleccion)
│   │   │   ├── i18n.service.ts            # Internacionalizacion (espanol/ingles)
│   │   │   └── theme.service.ts           # Tema claro/oscuro
│   │   │
│   │   └── pages/
│   │       └── index.page.ts              # Pagina principal (editor + chat)
│   │
│   ├── server/
│   │   ├── routes/api/
│   │   │   ├── chat.post.ts              # Pipeline multi-agente con SSE streaming
│   │   │   ├── telegram.post.ts          # Pipeline multi-agente para Telegram (no streaming)
│   │   │   ├── flow.get.ts              # Cargar flujo
│   │   │   ├── flow.post.ts             # Guardar flujo
│   │   │   ├── sessions.get.ts          # CRUD sesiones
│   │   │   ├── sessions.post.ts
│   │   │   ├── sessions/[id].get.ts
│   │   │   ├── sessions/[id].patch.ts
│   │   │   ├── sessions/[id].delete.ts
│   │   │   ├── vehicles.get.ts          # Catalogo de vehiculos
│   │   │   ├── faq.get.ts               # Preguntas frecuentes
│   │   │   ├── dates.get.ts             # Fechas con disponibilidad
│   │   │   └── appointments.post.ts     # Crear cita
│   │   │
│   │   ├── models/
│   │   │   ├── conversation.ts           # Historial + validationData + source (web/telegram)
│   │   │   ├── flow.ts                   # Nodos, edges, configs (incl. botToken)
│   │   │   ├── vehicle.ts               # Vehiculos con embeddings para vector search
│   │   │   ├── faq.ts                   # FAQs con embeddings para vector search
│   │   │   ├── appointment.ts           # Citas reservadas
│   │   │   └── book.ts                  # Slots disponibles por fecha
│   │   │
│   │   ├── services/
│   │   │   ├── vector-search.service.ts  # Busqueda semantica en vehiculos y FAQs
│   │   │   └── appointment.service.ts    # Logica de booking (reservar, verificar slots)
│   │   │
│   │   ├── memory/
│   │   │   └── memory.service.ts         # Carga y guarda conversaciones en MongoDB
│   │   │
│   │   ├── sse/
│   │   │   └── emitter.ts               # Helper para emitir eventos SSE
│   │   │
│   │   └── db/
│   │       └── connect.ts               # Conexion a MongoDB Atlas
│   │
│   └── shared/
│       └── types.ts                      # Interfaces TypeScript compartidas
│
├── scripts/
│   └── seed.ts                           # Seed de datos (vehiculos, FAQs, slots)
│
├── .env.example                          # Template de variables de entorno
├── vite.config.ts                        # Configuracion Vite + Analog.js
├── package.json
└── ARCHITECTURE.md                       # Documentacion detallada de arquitectura
```

---

## Configuracion Local

### Prerrequisitos

- Node.js >= 20.19.1
- npm >= 9.x
- Cuenta en MongoDB Atlas (free tier)
- API key de Google Gemini

### Instalacion

```bash
# 1. Clonar el repositorio
git clone https://github.com/humbertovenavente/atom.git
cd atom

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Seed de datos (vehiculos, FAQs, horarios)
npm run seed

# 5. Iniciar servidor de desarrollo
npm run dev

# 6. Abrir en el navegador
# http://localhost:5173
```

### Variables de Entorno

```env
# Base de datos MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=atom_knowledge
MONGODB_SESSIONS_DB_NAME=atom_sessions

# LLM — Google Gemini
LLM_API_KEY=your-gemini-api-key
LLM_MODEL=gemini-2.5-flash
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta

# General
NODE_ENV=development
```

### Configurar Telegram Bot

1. Crear un bot con [@BotFather](https://t.me/BotFather) en Telegram
2. Copiar el bot token
3. En el editor visual, arrastrar el nodo **Telegram** al canvas
4. Hacer clic en el nodo para abrir el panel de configuracion
5. Pegar el bot token
6. Hacer clic en **Register Webhook** — esto registra `https://{tu-dominio}/api/telegram` como webhook
7. Enviar un mensaje al bot para probar

### Deploy a Vercel

```bash
# Build
npm run build

# Deploy (requiere Vercel CLI autenticado)
npx vercel --prod

# Configurar variables de entorno en Vercel Dashboard:
# Settings → Environment Variables → agregar todas las variables del .env
```

Analog.js tiene deploy zero-config a Vercel. Las API routes en `src/server/routes/api/` se convierten automaticamente en funciones serverless.

---

## Decisiones Tecnicas

### Analog.js en lugar de Angular CLI + backend separado

Un solo proyecto = frontend + backend. Las API routes viven en `src/server/routes/` y se despliegan junto al frontend. Un solo `git push` hace deploy de todo. Trade-off: Analog.js es relativamente nuevo, pero la velocidad de desarrollo compensa.

### @foblex/flow en lugar de @xyflow/angular

Libreria madura de editor de nodos con soporte nativo Angular. Drag & drop, conexiones, y nodos custom para visualizar el pipeline de agentes.

### Google Gemini directo en lugar de LangChain

Usamos `@google/genai` SDK directamente en lugar de LangChain.js. La orquestacion multi-agente se implementa en codigo TypeScript puro con prompts especializados por etapa. Esto da control total sobre el pipeline sin abstracciones intermediarias.

### Vector Search en MongoDB Atlas

Los vehiculos y FAQs tienen embeddings almacenados en MongoDB. El `vector-search.service.ts` busca documentos semanticamente relevantes al mensaje del usuario para inyectarlos como contexto al especialista.

### SSE en lugar de WebSocket

Server-Sent Events para streaming del chat web. Es unidireccional (server → client), mas simple que WebSocket, y compatible con Vercel serverless. Telegram usa respuesta completa (no streaming) porque la Bot API requiere un mensaje terminado.

### Memoria persistente en MongoDB

Las conversaciones sobreviven entre sesiones. Cada sesion tiene su propio `sessionId` como clave. Los datos de validacion (nombre, fecha, presupuesto, etc.) se acumulan a lo largo de la conversacion y se persisten entre turnos.

### Dos bases de datos separadas

- `atom_knowledge`: vehiculos, FAQs, slots de citas — datos del negocio
- `atom_sessions`: conversaciones, flujos — datos de sesion del usuario

---

## Licencia

Proyecto desarrollado para el Dev Day Atom 2026.
