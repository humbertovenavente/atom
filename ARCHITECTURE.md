# 🏗 ARCHITECTURE.md — Arquitectura Detallada

## Visión General del Sistema

El sistema implementa un patrón de **orquestación multi-agente** donde un agente central (Orquestador) rutea mensajes al agente especializado correcto, pasando primero por validación de datos.

---

## 1. API Endpoints

### POST /api/chat — Endpoint Principal

```typescript
// Request
{
  sessionId: string;          // ID único de la sesión/conversación
  message: string;            // Mensaje del usuario
  flowConfig?: FlowConfig;    // Configuración del editor (opcional)
}

// Response (SSE stream)
event: agent_active
data: { "node": "memory" }

event: message_chunk  
data: { "content": "Hola, bienvenido a..." }

event: agent_active
data: { "node": "orchestrator" }

event: agent_active
data: { "node": "validator" }

event: message_chunk
data: { "content": "¿Eres cliente nuevo o existente?" }

event: agent_active
data: { "node": "memory" }

event: done
data: { "sessionId": "abc123" }
```

### POST /api/flow — Guardar Configuración del Flujo

```typescript
// Request
{
  flowId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  config: Record<string, NodeConfig>;
}

// Response
{ success: true, flowId: string }
```

### GET /api/flow — Cargar Configuración

```typescript
// Response
{
  flowId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  config: Record<string, NodeConfig>;
}
```

---

## 2. Interfaces TypeScript Compartidas

```typescript
// ============================================
// MENSAJES Y CHAT
// ============================================

interface ChatRequest {
  sessionId: string;
  message: string;
  flowConfig?: FlowConfig;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentType?: AgentType;
}

type AgentType = 'memory' | 'orchestrator' | 'validator' | 'specialist' | 'generic';

// ============================================
// AGENTES
// ============================================

interface OrchestratorResult {
  intent: 'faqs' | 'catalog' | 'schedule' | 'generic';
  confidence: number;
  reasoning?: string;
}

interface ValidatorResult {
  isComplete: boolean;
  collectedData: Record<string, any>;
  missingFields: string[];
  nextQuestion?: string;
}

interface SpecialistResult {
  response: string;
  sources?: string[];
  recommendations?: any[];
}

// ============================================
// VALIDADOR — Datos por Caso de Uso
// ============================================

interface FAQsValidationData {
  clientType?: 'nuevo' | 'existente';
  employmentType?: 'asalariado' | 'independiente';
  age?: number;
}

interface CatalogValidationData {
  budget?: number;
  condition?: 'nuevo' | 'usado';
  hasEmployeeDiscount?: boolean;
  vehicleType?: 'sedan' | 'suv' | 'pickup' | 'hatchback' | 'deportivo';
}

interface ScheduleValidationData {
  fullName?: string;
  preferredDate?: string;
  preferredTime?: string;
  appointmentType?: 'prueba_manejo' | 'asesoria';
  vehicleOfInterest?: string;
}

// ============================================
// MEMORIA
// ============================================

interface ConversationMemory {
  sessionId: string;
  messages: ChatMessage[];
  validationData: Record<string, any>;
  currentIntent?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// EDITOR VISUAL
// ============================================

interface FlowConfig {
  flowId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  nodeConfigs: Record<string, NodeConfig>;
}

interface FlowNode {
  id: string;
  type: 'memory' | 'orchestrator' | 'validator' | 'specialist' | 'generic' | 'tool';
  position: { x: number; y: number };
  data: {
    label: string;
    icon: string;
    color: string;
    config?: NodeConfig;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

interface NodeConfig {
  systemPrompt?: string;
  temperature?: number;
  toolSource?: string;
  validationFields?: string[];
}

// ============================================
// SSE EVENTS
// ============================================

interface SSEEvent {
  event: 'agent_active' | 'message_chunk' | 'validation_update' | 'done' | 'error';
  data: any;
}

interface AgentActiveEvent {
  node: AgentType;
  status: 'processing' | 'complete';
}

interface MessageChunkEvent {
  content: string;
}

interface ValidationUpdateEvent {
  collectedData: Record<string, any>;
  missingFields: string[];
}
```

---

## 3. Pipeline de Procesamiento (Backend)

```
chat.post.ts
│
├── 1. Parsear request (sessionId, message)
├── 2. Iniciar SSE stream
│
├── 3. 🧠 MEMORIA (leer)
│   ├── emit: agent_active → "memory"
│   ├── MongoDB.findOne({ sessionId })
│   └── Retorna: conversation_history + validation_data
│
├── 4. 🎯 ORQUESTADOR
│   ├── emit: agent_active → "orchestrator"
│   ├── LLM call con system prompt de clasificación
│   ├── Input: mensaje + últimos N mensajes de contexto
│   └── Output: { intent, confidence }
│
├── 5. ROUTING por intent
│   │
│   ├── intent: "generic"
│   │   ├── emit: agent_active → "generic"
│   │   ├── LLM call con prompt de cortesía
│   │   └── emit: message_chunk → respuesta
│   │
│   ├── intent: "faqs" | "catalog" | "schedule"
│   │   │
│   │   ├── 5a. ✅ VALIDADOR
│   │   │   ├── emit: agent_active → "validator"
│   │   │   ├── Revisar datos ya recopilados (de memoria)
│   │   │   ├── Extraer datos del mensaje actual (LLM call)
│   │   │   ├── ¿Datos completos?
│   │   │   │   ├── NO → emit: message_chunk → pregunta siguiente
│   │   │   │   │        emit: validation_update → { collected, missing }
│   │   │   │   │        SALTAR al paso 6 (guardar y salir)
│   │   │   │   └── SÍ  → continuar al Especialista
│   │   │   └── Output: { isComplete, collectedData, nextQuestion }
│   │   │
│   │   └── 5b. 🤖 ESPECIALISTA
│   │       ├── emit: agent_active → "specialist"
│   │       ├── Consultar JSON tool correspondiente
│   │       │   ├── faqs → faqs.json (filtrar por perfil)
│   │       │   ├── catalog → catalog.json (filtrar por criterios)
│   │       │   └── schedule → schedule.json (buscar disponibilidad)
│   │       ├── LLM call con datos + resultados del tool
│   │       └── emit: message_chunk → respuesta personalizada
│
├── 6. 🧠 MEMORIA (escribir)
│   ├── emit: agent_active → "memory"
│   ├── Agregar mensaje del usuario y respuesta al historial
│   ├── Actualizar validation_data si cambió
│   └── MongoDB.updateOne({ sessionId }, conversation)
│
└── 7. emit: done → { sessionId }
```

---

## 4. System Prompts de los Agentes

### 🎯 Orquestador

```
Eres el orquestador de un sistema de atención al cliente de una concesionaria
de autos llamada [NOMBRE]. Tu ÚNICA tarea es clasificar la intención del 
mensaje del usuario.

## Contexto de la conversación
{conversation_history}

## Datos ya recopilados del usuario
{validation_data}

## Intención previa
{current_intent}

## Reglas de clasificación

Clasifica el mensaje en UNA de estas categorías:

- "faqs": Preguntas sobre la concesionaria (horarios, ubicación, proceso de 
  compra, financiamiento, garantías, servicios, promociones).

- "catalog": Búsqueda de vehículos (precios, modelos, colores, disponibilidad,
  comparativas, características técnicas, tipos de vehículo).

- "schedule": Agendar una cita (prueba de manejo, asesoría de ventas, visita,
  reservar horario).

- "generic": Saludos, despedidas, agradecimientos, preguntas no relacionadas 
  con la concesionaria, o mensajes que no encajan en las categorías anteriores.

## Regla de continuidad
Si el usuario está en medio de un flujo de validación (hay datos parcialmente
recopilados) y su mensaje parece una respuesta a la pregunta del validador,
mantén la misma intención previa ({current_intent}).

Ejemplo: Si el validador preguntó "¿Cuál es tu presupuesto?" y el usuario 
responde "200,000", la intención sigue siendo "catalog" aunque el mensaje 
solo sea un número.

## Output
Responde ÚNICAMENTE con un JSON válido, sin texto adicional:
{
  "intent": "faqs" | "catalog" | "schedule" | "generic",
  "confidence": 0.0 - 1.0,
  "reasoning": "breve explicación"
}
```

### ✅ Validador — FAQs (Caso 1)

```
Eres un asistente amigable de una concesionaria de autos. Tu tarea es 
recopilar información del cliente ANTES de responder sus preguntas.

## Datos que necesitas recopilar:
1. clientType: ¿Es cliente nuevo o existente? (nuevo/existente)
2. employmentType: ¿Es asalariado o independiente? (asalariado/independiente)
3. age: Edad aproximada (número)

## Datos ya recopilados:
{collected_data}

## Datos que faltan:
{missing_fields}

## Reglas:
- Pregunta UN dato a la vez, de forma natural y conversacional
- NO hagas preguntas como formulario. Sé amigable y contextual
- Si el usuario ya proporcionó un dato en su mensaje, extráelo sin volver a preguntar
- Cuando todos los datos estén completos, responde con: {"isComplete": true}

## Mensaje del usuario:
{user_message}

## Output
Si necesitas más datos, responde con JSON:
{
  "isComplete": false,
  "extractedData": { "campo": "valor" },  // datos extraídos de este mensaje
  "nextQuestion": "Tu pregunta natural aquí"
}

Si todos los datos están completos:
{
  "isComplete": true,
  "extractedData": { "campo": "valor" },
  "collectedData": { todos los datos completos }
}
```

### ✅ Validador — Catálogo (Caso 2)

```
Eres un asistente amigable de una concesionaria de autos. Tu tarea es 
entender las necesidades del cliente para recomendarle vehículos.

## Datos que necesitas recopilar:
1. budget: Presupuesto aproximado en quetzales/dólares (número)
2. condition: ¿Busca vehículo nuevo o usado? (nuevo/usado)
3. hasEmployeeDiscount: ¿Cuenta con descuento de empleado? (sí/no)
4. vehicleType: Tipo de vehículo preferido (sedán/SUV/pickup/hatchback/deportivo)

## Datos ya recopilados:
{collected_data}

## Datos que faltan:
{missing_fields}

## Reglas:
- Pregunta UN dato a la vez, de forma conversacional
- Si el usuario menciona un presupuesto vago como "no mucho" o "algo económico",
  pide un rango aproximado
- Si menciona un vehículo específico, infiere el tipo (ej: "RAV4" → SUV)
- Sé entusiasta sobre ayudarles a encontrar su auto ideal

## Output (mismo formato JSON que FAQs validator)
```

### ✅ Validador — Agenda (Caso 3)

```
Eres un asistente amigable de una concesionaria de autos. Tu tarea es
recopilar la información necesaria para agendar una cita.

## Datos que necesitas recopilar:
1. fullName: Nombre completo del cliente
2. preferredDate: Fecha preferida (formato YYYY-MM-DD)
3. preferredTime: Hora preferida (formato HH:MM)
4. appointmentType: Motivo de la cita (prueba_manejo/asesoria)
5. vehicleOfInterest: Vehículo de interés (opcional si es asesoría general)

## Datos ya recopilados:
{collected_data}

## Datos que faltan:
{missing_fields}

## Reglas:
- Pregunta UN dato a la vez
- Si el usuario dice "mañana", "el viernes", etc., convierte a fecha real
  usando la fecha actual: {current_date}
- Si dice "por la mañana" o "en la tarde", sugiere un horario específico
- Si el motivo es prueba de manejo, SIEMPRE pregunta el vehículo de interés
- Si es asesoría general, el vehículo es opcional

## Output (mismo formato JSON que los otros validators)
```

### 🤖 Especialista — FAQs (Caso 1)

```
Eres un especialista en atención al cliente de una concesionaria de autos.
Responde preguntas usando la base de conocimiento proporcionada.

## Perfil del cliente:
- Tipo: {clientType}
- Empleo: {employmentType}  
- Edad: {age}

## Base de conocimiento (FAQs):
{faqs_json_content}

## Reglas de personalización:
- Cliente NUEVO + JOVEN (< 30): Enfatiza opciones de financiamiento accesibles,
  planes de primer auto, y proceso de compra paso a paso
- Cliente NUEVO + INDEPENDIENTE: Menciona requisitos de documentación especiales
  para independientes, opciones sin comprobante de ingresos fijo
- Cliente EXISTENTE: Menciona beneficios de lealtad, descuentos por recompra,
  servicio preferencial
- Cliente ASALARIADO: Menciona opciones de descuento por nómina y 
  financiamiento directo

## Pregunta del usuario:
{user_question}

## Instrucciones:
- Responde de forma clara, amigable y profesional
- Personaliza la respuesta según el perfil del cliente
- Si la pregunta no está en las FAQs, indica amablemente que no tienes esa
  información y sugiere contactar directamente
- Siempre ofrece ayuda adicional al final
```

### 🤖 Especialista — Catálogo (Caso 2)

```
Eres un especialista en vehículos de una concesionaria. Ayuda al cliente
a encontrar el auto perfecto basándote en sus preferencias.

## Perfil del cliente:
- Presupuesto: {budget}
- Condición: {condition}
- Descuento empleado: {hasEmployeeDiscount}
- Tipo preferido: {vehicleType}

## Catálogo de vehículos disponibles:
{catalog_json_filtered}

## Reglas:
- Filtra el catálogo según el perfil del cliente
- Muestra máximo 3-5 opciones relevantes
- Para cada vehículo muestra: nombre, año, precio, color, características clave
- Si tiene descuento de empleado, muestra el precio con descuento
- Si no hay vehículos que coincidan exactamente, sugiere las opciones más cercanas
- Ofrece comparar vehículos si el cliente tiene dudas
- Menciona disponibilidad (en stock / por encargo)

## Pregunta del usuario:
{user_question}

## Formato de respuesta:
Responde de forma conversacional, NO como tabla. Describe cada opción de 
forma atractiva y menciona por qué es buena opción para el cliente.
```

### 🤖 Especialista — Agenda (Caso 3)

```
Eres un especialista en agendamiento de una concesionaria. Tu tarea es
confirmar o proponer alternativas para la cita del cliente.

## Datos de la cita solicitada:
- Nombre: {fullName}
- Fecha: {preferredDate}
- Hora: {preferredTime}
- Motivo: {appointmentType}
- Vehículo: {vehicleOfInterest}

## Disponibilidad de asesores:
{schedule_json_content}

## Reglas:
- Busca disponibilidad en la fecha y hora solicitada
- Si está disponible: confirma la cita con todos los detalles
- Si NO está disponible: propone las 2-3 alternativas más cercanas
  (misma fecha hora diferente, o siguiente día disponible)
- Incluye el nombre del asesor asignado
- Menciona qué llevar (documentos, licencia para prueba de manejo)
- Confirma la dirección de la concesionaria
- Da un resumen final claro de la cita confirmada
```

### 💬 Agente Genérico

```
Eres un asistente virtual amigable de una concesionaria de autos llamada
[NOMBRE]. Manejas saludos, despedidas y consultas fuera del scope del negocio.

## Reglas:
- Para saludos: Saluda amablemente y pregunta en qué puedes ayudar.
  Menciona brevemente los servicios: consultas generales, búsqueda de 
  vehículos y agendamiento de citas.
- Para despedidas: Despídete cordialmente e invita a volver.
- Para temas fuera de scope: Indica amablemente que solo puedes ayudar
  con temas de la concesionaria (consultas, vehículos, citas) y redirige.
- Mantén un tono profesional pero cálido.
- Nunca inventes información sobre vehículos, precios o disponibilidad.
- Respuestas breves y directas (2-4 oraciones máximo).
```

---

## 5. Esquema MongoDB

### Colección: conversations

```javascript
{
  _id: ObjectId,
  sessionId: "uuid-string",
  messages: [
    {
      role: "user",
      content: "Hola, quiero ver autos disponibles",
      timestamp: ISODate("2026-02-28T18:30:00Z"),
      agentType: null
    },
    {
      role: "assistant", 
      content: "¡Hola! Con gusto te ayudo a encontrar tu auto ideal...",
      timestamp: ISODate("2026-02-28T18:30:05Z"),
      agentType: "validator"
    }
  ],
  validationData: {
    intent: "catalog",
    budget: 250000,
    condition: "nuevo",
    hasEmployeeDiscount: false,
    vehicleType: null           // aún no recopilado
  },
  currentIntent: "catalog",
  createdAt: ISODate("2026-02-28T18:30:00Z"),
  updatedAt: ISODate("2026-02-28T18:35:00Z")
}
```

### Colección: flows

```javascript
{
  _id: ObjectId,
  flowId: "default",
  nodes: [
    { id: "memory-1", type: "memory", position: { x: 400, y: 50 }, data: {...} },
    { id: "orch-1", type: "orchestrator", position: { x: 400, y: 200 }, data: {...} },
    // ... más nodos
  ],
  edges: [
    { id: "e-mem-orch", source: "memory-1", target: "orch-1", animated: true },
    // ... más conexiones
  ],
  nodeConfigs: {
    "orch-1": { systemPrompt: "...", temperature: 0.1 },
    "validator-1": { validationFields: ["budget", "condition", "vehicleType"] },
    // ... más configs
  },
  createdAt: ISODate("2026-02-28T14:00:00Z"),
  updatedAt: ISODate("2026-03-01T12:00:00Z")
}
```

### Índices recomendados

```javascript
// Búsqueda rápida por sesión
db.conversations.createIndex({ sessionId: 1 }, { unique: true });

// TTL: borrar conversaciones viejas después de 7 días
db.conversations.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 604800 });

// Flujos por ID
db.flows.createIndex({ flowId: 1 }, { unique: true });
```

---

## 6. Implementación del SSE (Server-Sent Events)

### Backend — API Route (chat.post.ts)

```typescript
// src/server/routes/api/chat.post.ts
import { defineEventHandler, readBody, setHeader, setResponseStatus } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { sessionId, message } = body;

  // Configurar SSE
  setHeader(event, 'Content-Type', 'text/event-stream');
  setHeader(event, 'Cache-Control', 'no-cache');
  setHeader(event, 'Connection', 'keep-alive');

  const send = (eventName: string, data: any) => {
    event.node.res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // 1. Leer memoria
    send('agent_active', { node: 'memory', status: 'processing' });
    const memory = await readMemory(sessionId);
    send('agent_active', { node: 'memory', status: 'complete' });

    // 2. Orquestar
    send('agent_active', { node: 'orchestrator', status: 'processing' });
    const { intent } = await orchestrate(message, memory);
    send('agent_active', { node: 'orchestrator', status: 'complete' });

    // 3. Routing
    let response: string;

    if (intent === 'generic') {
      send('agent_active', { node: 'generic', status: 'processing' });
      response = await handleGeneric(message, memory);
      send('agent_active', { node: 'generic', status: 'complete' });
    } else {
      // Validar
      send('agent_active', { node: 'validator', status: 'processing' });
      const validation = await validate(intent, message, memory);
      send('agent_active', { node: 'validator', status: 'complete' });

      if (!validation.isComplete) {
        response = validation.nextQuestion!;
        send('validation_update', {
          collectedData: validation.collectedData,
          missingFields: validation.missingFields
        });
      } else {
        // Especialista
        send('agent_active', { node: 'specialist', status: 'processing' });
        response = await specialize(intent, validation.collectedData, message);
        send('agent_active', { node: 'specialist', status: 'complete' });
      }
    }

    // 4. Enviar respuesta
    send('message_chunk', { content: response });

    // 5. Guardar memoria
    send('agent_active', { node: 'memory', status: 'processing' });
    await saveMemory(sessionId, message, response, intent);
    send('agent_active', { node: 'memory', status: 'complete' });

    // 6. Fin
    send('done', { sessionId });

  } catch (error) {
    send('error', { message: 'Error procesando mensaje' });
  }

  event.node.res.end();
});
```

### Frontend — Chat Service

```typescript
// src/app/services/chat.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private activeNode$ = new Subject<{ node: string; status: string }>();
  private messageChunk$ = new Subject<string>();

  getActiveNode() { return this.activeNode$.asObservable(); }
  getMessageChunks() { return this.messageChunk$.asObservable(); }

  async sendMessage(sessionId: string, message: string): Promise<void> {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let eventName = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventName = line.slice(7);
        } else if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          switch (eventName) {
            case 'agent_active':
              this.activeNode$.next(data);
              break;
            case 'message_chunk':
              this.messageChunk$.next(data.content);
              break;
          }
        }
      }
    }
  }
}
```

---

## 7. Editor Visual — Configuración de Nodos

### Nodos Default (flujo pre-cargado)

```typescript
export const DEFAULT_NODES: FlowNode[] = [
  {
    id: 'memory-1',
    type: 'memory',
    position: { x: 400, y: 25 },
    data: { label: 'Memoria', icon: '🧠', color: '#8B5CF6' }
  },
  {
    id: 'orchestrator-1',
    type: 'orchestrator',
    position: { x: 400, y: 150 },
    data: { label: 'Orquestador', icon: '🎯', color: '#3B82F6' }
  },
  {
    id: 'validator-1',
    type: 'validator',
    position: { x: 150, y: 325 },
    data: { label: 'Validador', icon: '✅', color: '#10B981' }
  },
  {
    id: 'specialist-1',
    type: 'specialist',
    position: { x: 400, y: 325 },
    data: { label: 'Especialista', icon: '🤖', color: '#F59E0B' }
  },
  {
    id: 'generic-1',
    type: 'generic',
    position: { x: 650, y: 325 },
    data: { label: 'Genérico', icon: '💬', color: '#6B7280' }
  },
  {
    id: 'tool-faqs',
    type: 'tool',
    position: { x: 100, y: 500 },
    data: { label: 'FAQs JSON', icon: '🔧', color: '#EF4444' }
  },
  {
    id: 'tool-catalog',
    type: 'tool',
    position: { x: 350, y: 500 },
    data: { label: 'Catálogo JSON', icon: '🔧', color: '#EF4444' }
  },
  {
    id: 'tool-schedule',
    type: 'tool',
    position: { x: 600, y: 500 },
    data: { label: 'Agenda JSON', icon: '🔧', color: '#EF4444' }
  }
];

export const DEFAULT_EDGES: FlowEdge[] = [
  { id: 'e1', source: 'memory-1', target: 'orchestrator-1', animated: true },
  { id: 'e2', source: 'orchestrator-1', target: 'validator-1', label: 'faqs/catalog/schedule' },
  { id: 'e3', source: 'orchestrator-1', target: 'generic-1', label: 'generic' },
  { id: 'e4', source: 'validator-1', target: 'specialist-1', label: 'datos completos' },
  { id: 'e5', source: 'specialist-1', target: 'tool-faqs' },
  { id: 'e6', source: 'specialist-1', target: 'tool-catalog' },
  { id: 'e7', source: 'specialist-1', target: 'tool-schedule' },
];
```

### Colores y estilos por tipo de nodo

```typescript
export const NODE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  memory:       { bg: '#EDE9FE', border: '#8B5CF6', text: '#5B21B6' },  // violeta
  orchestrator: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },  // azul
  validator:    { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },  // verde
  specialist:   { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },  // amarillo
  generic:      { bg: '#F3F4F6', border: '#6B7280', text: '#1F2937' },  // gris
  tool:         { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },  // rojo
};
```

---

## 8. Flujo de Datos — Ejemplo Completo

### Escenario: Usuario busca un auto

```
TURNO 1:
  Usuario: "Hola, quiero ver qué autos tienen disponibles"
  
  🧠 Memoria: sesión nueva, sin contexto previo
  🎯 Orquestador: intent="catalog", confidence=0.95
  ✅ Validador: faltan budget, condition, discount, vehicleType
     → "¡Hola! Con gusto te ayudo a encontrar tu auto ideal. 
        Para darte las mejores opciones, ¿cuál es tu presupuesto 
        aproximado?"
  🧠 Guardar: intent=catalog, validationData={}

TURNO 2:
  Usuario: "Unos 200 mil quetzales"
  
  🧠 Memoria: recupera intent=catalog, validationData={}
  🎯 Orquestador: intent="catalog" (continuidad)
  ✅ Validador: extrae budget=200000, faltan condition, discount, type
     → "Excelente presupuesto. ¿Buscas un vehículo nuevo o usado?"
  🧠 Guardar: validationData={ budget: 200000 }

TURNO 3:
  Usuario: "Nuevo, y soy empleado de la empresa"
  
  🧠 Memoria: recupera budget=200000
  🎯 Orquestador: intent="catalog" (continuidad)
  ✅ Validador: extrae condition="nuevo", discount=true, falta vehicleType
     → "¡Genial! Tienes descuento de empleado, eso te da acceso a 
        precios especiales. ¿Qué tipo de vehículo prefieres? 
        Tenemos sedán, SUV, pickup..."
  🧠 Guardar: validationData={ budget: 200000, condition: "nuevo", 
     discount: true }

TURNO 4:
  Usuario: "SUV"
  
  🧠 Memoria: recupera datos previos
  🎯 Orquestador: intent="catalog"
  ✅ Validador: extrae vehicleType="suv", ¡DATOS COMPLETOS!
  🤖 Especialista: 
     → Filtra catalog.json: SUV + nuevo + ≤200k + descuento empleado
     → "¡Perfecto! Basándome en tu perfil, te recomiendo estas opciones:
        
        1. Toyota RAV4 2026 - Q185,000 (Q170,000 con tu descuento)
           Color: Blanco/Gris. Motor 2.5L. Disponible en sucursal.
        
        2. Honda CR-V 2025 - Q195,000 (Q180,000 con descuento)
           Color: Negro/Azul. Motor 1.5T. En stock.
        
        ¿Te gustaría más detalles de alguno o agendar una prueba 
        de manejo?"
  🧠 Guardar: datos completos + respuesta
```

---

## 9. Manejo de Edge Cases

| Escenario | Comportamiento |
|-----------|---------------|
| Usuario cambia de tema a mitad de validación | Orquestador detecta nueva intención, reinicia validador del nuevo caso |
| Usuario da múltiples datos en un mensaje | Validador extrae todos los datos posibles de un solo mensaje |
| Presupuesto fuera de rango | Especialista informa que no hay opciones y sugiere ajustar criterios |
| Fecha no disponible para cita | Especialista propone 2-3 alternativas cercanas |
| Mensaje ambiguo (baja confianza del orquestador) | Si confidence < 0.6, orquestador pide clarificación |
| Usuario pregunta algo fuera de scope | Genérico redirige amablemente a los servicios disponibles |
| Sesión sin actividad por mucho tiempo | Memory mantiene el contexto en MongoDB (TTL de 7 días) |
| Error del LLM | Catch → respuesta genérica de disculpa + retry |

---

## 10. Configuración de Deploy — Vercel

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import analog from '@analogjs/platform';

export default defineConfig({
  plugins: [
    analog({
      ssr: true,
      nitro: {
        preset: 'vercel',
      },
    }),
  ],
});
```

### vercel.json (si es necesario)

```json
{
  "framework": null,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/analog/public",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
