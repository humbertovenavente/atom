# 🤖 AI Agent Builder — Concesionaria de Autos

> Plataforma fullstack con editor visual de flujos para construir y probar agentes de IA conversacionales aplicados a una concesionaria de autos.

**Dev Day Atom 2026** — Hackathon Challenge

---

## 📋 Tabla de Contenidos

- [Demo](#-demo)
- [Stack Tecnológico](#-stack-tecnológico)
- [Arquitectura](#-arquitectura)
- [Flujo del Agente](#-flujo-del-agente)
- [Casos de Uso](#-casos-de-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Configuración Local](#-configuración-local)
- [Decisiones Técnicas](#-decisiones-técnicas)
- [División de Tareas](#-división-de-tareas)

---

## 🚀 Demo

- **URL de producción:** `[INSERTAR URL DE VERCEL]`
- **Repositorio:** `[INSERTAR URL DE GITHUB]`

---

## 🛠 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Meta-framework** | Analog.js | 2.x |
| **Frontend** | Angular + TypeScript | 17+ |
| **Editor Visual** | @xyflow/angular (Angular Flow) | latest |
| **Styling** | Tailwind CSS | 3.x |
| **Backend** | Nitro/H3 (API routes de Analog) | — |
| **Base de Datos** | MongoDB Atlas | 7.x |
| **Framework IA** | LangChain.js | latest |
| **LLM** | [MODELO ASIGNADO] | — |
| **Deploy** | Vercel | — |

### ¿Por qué este stack?

**Analog.js** — Elegimos el meta-framework fullstack oficial de Angular porque:
- Un solo proyecto = frontend + backend (API routes) en un monolito cohesivo
- File-based routing para páginas y API endpoints
- Deploy unificado a Vercel (zero-config)
- Powered by Vite (DX rápido) y Nitro (server routes de producción)
- Alineado con el ecosistema Angular que usa Atom como referencia

**@xyflow/angular** — Librería madura para editores de nodos con soporte nativo Angular. Drag & drop, conexiones, mini-mapa, zoom, y nodos custom out-of-the-box.

**MongoDB Atlas** — Base de datos NoSQL que nos da:
- Flexibilidad para almacenar conversaciones con estructura variable
- Memoria persistente entre sesiones (+5 pts bonus)
- Free tier suficiente para el hackathon
- Driver nativo para Node.js/Nitro

**LangChain.js** — Orquestación multi-agente con:
- Chains para encadenar lógica de agentes
- Prompt templates reutilizables
- Integración nativa con múltiples LLMs
- Memory management built-in

---

## 🏗 Arquitectura

```
┌──────────────────────────────────────────────────────┐
│                    ANALOG.JS (Vercel)                  │
│                                                        │
│  ┌─────────────────────┐  ┌────────────────────────┐  │
│  │   FRONTEND (Angular) │  │  BACKEND (Nitro/H3)    │  │
│  │                       │  │                        │  │
│  │  ┌───────────────┐   │  │  /api/chat.post.ts     │  │
│  │  │  Flow Editor   │   │  │  ┌──────────────────┐  │  │
│  │  │  (@xyflow)     │───│──│─▶│  Orchestration   │  │  │
│  │  │               │   │  │  │     Layer         │  │  │
│  │  │  🧠🎯✅🤖💬🔧│   │  │  │                  │  │  │
│  │  └───────────────┘   │  │  │  Orchestrator 🎯  │  │  │
│  │                       │  │  │    ├─ Validator ✅ │  │  │
│  │  ┌───────────────┐   │  │  │    ├─ Specialist🤖│  │  │
│  │  │  Playground    │   │  │  │    ├─ Generic  💬 │  │  │
│  │  │  (Chat Live)   │───│──│─▶│    └─ Memory   🧠│  │  │
│  │  │               │   │  │  └──────────┬───────┘  │  │
│  │  └───────────────┘   │  │             │          │  │
│  └─────────────────────┘  │  ┌──────────▼───────┐  │  │
│                            │  │  Tool Layer 🔧   │  │  │
│                            │  │  ├─ faqs.json     │  │  │
│                            │  │  ├─ catalog.json  │  │  │
│                            │  │  └─ schedule.json │  │  │
│                            │  └──────────────────┘  │  │
│                            │          │              │  │
│                            │  ┌───────▼──────────┐  │  │
│                            │  │  MongoDB Atlas    │  │  │
│                            │  │  (Memoria +       │  │  │
│                            │  │   Conversaciones) │  │  │
│                            │  └──────────────────┘  │  │
│                            └────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Patrón de Comunicación

1. **Frontend → Backend**: HTTP POST a `/api/chat` con mensaje del usuario + session ID
2. **Backend → Frontend**: Server-Sent Events (SSE) para streaming de respuestas
3. **Backend → MongoDB**: Lectura/escritura de memoria conversacional
4. **Backend → JSON Tools**: Consulta a archivos estáticos para datos del negocio
5. **Backend → LLM**: Llamadas a la API del modelo para cada agente

---

## 🔄 Flujo del Agente

```
📨 Mensaje del usuario
     │
     ▼
🧠 MEMORIA ──────────── Lee contexto previo de MongoDB
     │
     ▼
🎯 ORQUESTADOR ──────── Clasifica intención del mensaje
     │
     ├─── intent: "faqs"      → ✅ Validador FAQs      → 🤖 Especialista FAQs
     ├─── intent: "catalog"   → ✅ Validador Catálogo   → 🤖 Especialista Catálogo
     ├─── intent: "schedule"  → ✅ Validador Agenda     → 🤖 Especialista Agenda
     └─── intent: "generic"   → 💬 Agente Genérico
                                      │
                                      ▼
                              🧠 MEMORIA ──── Guarda contexto en MongoDB
                                      │
                                      ▼
                              📤 Respuesta al usuario
```

### Descripción de cada Nodo

| Nodo | Responsabilidad | Input | Output |
|------|----------------|-------|--------|
| **Memoria 🧠** | Recupera y persiste el contexto conversacional | session_id | conversation_history |
| **Orquestador 🎯** | Analiza intención y rutea al agente correcto | mensaje + contexto | intent + confidence |
| **Validador ✅** | Recopila datos necesarios del usuario de forma conversacional | mensaje + datos_faltantes | datos_completos o pregunta_siguiente |
| **Especialista 🤖** | Resuelve el caso consultando la fuente de datos | datos_validados + tool | respuesta_personalizada |
| **Genérico 💬** | Maneja saludos, despedidas y fuera de scope | mensaje | respuesta_cortés |
| **Tool/JSON 🔧** | Fuente de datos estática | query/filtros | datos_crudos |

---

## 📦 Casos de Uso

### Caso 1 — Consultas Generales (FAQs)

**Escenario**: El usuario pregunta sobre horarios, ubicación, financiamiento, garantías, etc.

**Flujo del Validador** — Recopila antes de responder:
1. ¿Eres cliente nuevo o existente?
2. ¿Eres asalariado o independiente?
3. Edad aproximada

**Personalización**: El Especialista adapta la respuesta de FAQs según el perfil. Un cliente nuevo asalariado joven recibe info diferente a un cliente existente independiente.

**Tool**: `faqs.json` — Preguntas frecuentes categorizadas con respuestas parametrizadas.

---

### Caso 2 — Catálogo de Vehículos

**Escenario**: El usuario busca autos disponibles, precios, comparativas.

**Flujo del Validador** — Recopila antes de mostrar opciones:
1. Presupuesto aproximado
2. ¿Nuevo o usado?
3. ¿Cuenta con descuento de empleado?
4. Preferencia de tipo (sedán, SUV, pickup, etc.)

**Personalización**: El Especialista filtra el catálogo y recomienda opciones basadas en el perfil.

**Tool**: `catalog.json` — Inventario con precios, colores, disponibilidad y características.

---

### Caso 3 — Agendamiento de Cita

**Escenario**: El usuario quiere agendar prueba de manejo o cita con asesor.

**Flujo del Validador** — Recopila:
1. Nombre completo
2. Fecha preferida
3. Hora preferida
4. Motivo (prueba de manejo o asesoría)
5. Vehículo de interés (si aplica)

**Personalización**: El Especialista consulta disponibilidad y confirma o propone alternativas.

**Tool**: `schedule.json` — Disponibilidad de asesores por fecha y hora.

---

## 📁 Estructura del Proyecto

```
ai-agent-builder/
├── src/
│   ├── app/
│   │   ├── pages/
│   │   │   ├── (home).page.ts                 # Landing → redirige al editor
│   │   │   └── editor.page.ts                 # Página principal
│   │   │
│   │   ├── components/
│   │   │   ├── flow-editor/                   # Editor visual
│   │   │   │   ├── flow-editor.component.ts   # Canvas principal (@xyflow)
│   │   │   │   ├── flow-editor.component.html
│   │   │   │   ├── nodes/                     # Nodos custom
│   │   │   │   │   ├── memory-node.component.ts
│   │   │   │   │   ├── orchestrator-node.component.ts
│   │   │   │   │   ├── validator-node.component.ts
│   │   │   │   │   ├── specialist-node.component.ts
│   │   │   │   │   ├── generic-node.component.ts
│   │   │   │   │   └── tool-node.component.ts
│   │   │   │   └── config-panel/              # Panel de configuración
│   │   │   │       └── config-panel.component.ts
│   │   │   │
│   │   │   └── playground/                    # Chat live
│   │   │       ├── chat-window.component.ts
│   │   │       └── message-bubble.component.ts
│   │   │
│   │   ├── services/
│   │   │   ├── chat.service.ts                # HTTP → /api/chat
│   │   │   └── flow.service.ts                # Estado del editor
│   │   │
│   │   └── models/
│   │       └── types.ts                       # Interfaces compartidas
│   │
│   └── server/
│       └── routes/
│           └── api/
│               ├── chat.post.ts               # POST /api/chat
│               ├── flow.post.ts               # POST /api/flow (guardar)
│               ├── flow.get.ts                # GET /api/flow (cargar)
│               │
│               ├── agents/                    # Lógica de agentes
│               │   ├── orchestrator.ts
│               │   ├── validator.ts
│               │   ├── specialist.ts
│               │   ├── generic.ts
│               │   └── memory.ts
│               │
│               └── data/                      # JSONs estáticos
│                   ├── faqs.json
│                   ├── catalog.json
│                   └── schedule.json
│
├── .env                                       # API keys (no commitear)
├── .env.example                               # Template de variables
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── README.md
├── TASKS.md
└── ARCHITECTURE.md
```

---

## ⚙️ Configuración Local

### Prerrequisitos

- Node.js >= 18.x
- npm >= 9.x
- Cuenta en MongoDB Atlas (free tier)
- API key del modelo de IA asignado

### Instalación

```bash
# 1. Clonar el repositorio
git clone [URL_DEL_REPO]
cd ai-agent-builder

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales:
#   MONGODB_URI=mongodb+srv://...
#   LLM_API_KEY=sk-...
#   LLM_MODEL=gpt-4o / claude-sonnet-4-20250514

# 4. Iniciar servidor de desarrollo
npm run dev

# 5. Abrir en el navegador
# http://localhost:5173
```

### Variables de Entorno

```env
# Base de datos
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/agent-builder

# Modelo de IA
LLM_API_KEY=your-api-key-here
LLM_MODEL=gpt-4o
LLM_BASE_URL=https://api.openai.com/v1

# Configuración
NODE_ENV=development
```

### Deploy a Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variables de entorno en Vercel Dashboard
# Settings → Environment Variables → agregar MONGODB_URI y LLM_API_KEY
```

---

## 🧠 Decisiones Técnicas

### 1. ¿Por qué Analog.js en lugar de Angular CLI + NestJS separado?

**Problema**: Con un backend y frontend separados, tendríamos dos repos, dos deploys, CORS, y más complejidad en 24 horas.

**Solución**: Analog.js unifica todo en un proyecto. Las API routes viven en `src/server/routes/` y se despliegan junto al frontend. Un solo `git push` hace deploy de todo.

**Trade-off**: Analog.js es relativamente nuevo y tiene menos documentación que NestJS. Aceptamos esa curva a cambio de velocidad de desarrollo.

### 2. ¿Por qué @xyflow/angular para el editor visual?

**Problema**: Necesitábamos un editor de nodos draggable y conectable con soporte Angular.

**Solución**: @xyflow/angular (antes ngx-flowchart) es el port oficial de React Flow para Angular. Tiene nodos custom, edges animados, mini-mapa, y zoom.

**Alternativa descartada**: ngx-graph — más orientado a visualización estática, no a editores interactivos.

### 3. ¿Por qué MongoDB en lugar de Firestore?

**Problema**: Necesitamos almacenar conversaciones con estructura flexible y consultas sobre historial.

**Solución**: MongoDB Atlas da flexibilidad de esquema, aggregation pipelines para buscar en historiales, y el driver de Node.js funciona directo en las API routes de Nitro.

**Trade-off**: Firestore hubiera sido más rápido de configurar con Firebase Auth, pero MongoDB nos da más control y es más familiar.

### 4. ¿Por qué LangChain.js para la orquestación?

**Problema**: Orquestar múltiples agentes con memoria, tools, y prompts encadenados.

**Solución**: LangChain.js provee abstracciones para chains, agents, memory, y tool calling que aceleran el desarrollo.

**Alternativa viable**: Vercel AI SDK — más simple pero menos flexible para multi-agente.

### 5. Streaming con SSE en lugar de WebSocket

**Problema**: Mostrar respuestas en tiempo real del LLM.

**Solución**: Server-Sent Events (SSE) desde las API routes de Nitro. Es unidireccional (server → client), más simple que WebSocket, y suficiente para streaming de texto.

**Trade-off**: WebSocket permitiría comunicación bidireccional, pero SSE es más simple y compatible con Vercel serverless.

### 6. Memoria: In-memory → MongoDB (persistente)

**Base**: Conversaciones se mantienen en memoria durante la sesión.
**Bonus implementado**: Persistencia en MongoDB — las conversaciones sobreviven entre sesiones usando el session_id como clave.

---

## 📊 Criterios de Evaluación — Cómo los cubrimos

| Criterio | Pts | Nuestra implementación |
|----------|-----|----------------------|
| **Arquitectura** | 35 | Analog.js fullstack, separación clara agentes/tools/memoria, código tipado |
| **UX + Editor** | 25 | @xyflow con nodos custom, config panel, highlight activo, chat integrado |
| **Funcionalidad** | 25 | 3 casos de uso completos (FAQs + Catálogo + Agenda) |
| **Trabajo en equipo** | 15 | División clara frontend/backend, documentación completa |
| **Bonus: Memoria persistente** | +5 | MongoDB Atlas |
| **Total estimado** | **~92+** | |

---

## 📄 Licencia

Proyecto desarrollado para el Dev Day Atom 2026.
