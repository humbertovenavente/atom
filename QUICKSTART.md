# 🚀 QUICKSTART.md — Referencia Rápida

## Comandos Esenciales

```bash
# Crear proyecto Analog.js
npm create analog@latest ai-agent-builder

# Instalar dependencias core
npm install @xyflow/angular                    # Editor visual
npm install mongoose                           # MongoDB driver
npm install @langchain/core @langchain/openai  # IA (si usan OpenAI)
npm install uuid                               # Session IDs
npm install tailwindcss @tailwindcss/vite      # Styling

# Dev server
npm run dev          # → http://localhost:5173

# Build
npm run build

# Deploy
npx vercel --prod
```

## Estructura de API Routes (Analog.js)

```
src/server/routes/
├── api/
│   ├── chat.post.ts      →  POST /api/chat
│   ├── chat.get.ts        →  GET  /api/chat  (si necesario)
│   ├── flow.post.ts       →  POST /api/flow
│   └── flow.get.ts        →  GET  /api/flow
```

Cada archivo usa `defineEventHandler` de h3:

```typescript
// src/server/routes/api/chat.post.ts
import { defineEventHandler, readBody } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  // ... lógica
  return { message: 'OK' };
});
```

## Estructura de Pages (Analog.js)

```
src/app/pages/
├── (home).page.ts         →  /
└── editor.page.ts         →  /editor
```

Cada página es un Angular component con `export default`:

```typescript
// src/app/pages/editor.page.ts
import { Component } from '@angular/core';

@Component({
  standalone: true,
  template: `<h1>Editor</h1>`
})
export default class EditorPageComponent {}
```

## MongoDB Atlas — Setup Rápido

1. Ir a https://cloud.mongodb.com
2. Create Cluster → Free M0 → Región más cercana
3. Database Access → Crear usuario
4. Network Access → Allow from anywhere (0.0.0.0/0)
5. Copiar connection string
6. Pegar en `.env` como `MONGODB_URI`

### Conexión desde API Route

```typescript
// src/server/utils/db.ts
import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;
  
  await mongoose.connect(process.env.MONGODB_URI!);
  isConnected = true;
}
```

### Modelo de Conversación

```typescript
// src/server/models/conversation.ts
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'] },
  content: String,
  timestamp: { type: Date, default: Date.now },
  agentType: String,
});

const conversationSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true, index: true },
  messages: [messageSchema],
  validationData: { type: mongoose.Schema.Types.Mixed, default: {} },
  currentIntent: String,
}, { timestamps: true });

export const Conversation = mongoose.models.Conversation 
  || mongoose.model('Conversation', conversationSchema);
```

## @xyflow/angular — Setup Rápido

```typescript
// En el componente del editor
import { Component } from '@angular/core';
import { 
  ReactFlowModule,  // o AngularFlowModule dependiendo de versión
} from '@xyflow/angular';

@Component({
  standalone: true,
  imports: [ReactFlowModule],
  template: `
    <div style="width: 100%; height: 600px;">
      <angular-flow
        [nodes]="nodes"
        [edges]="edges"
        [nodeTypes]="nodeTypes"
        (nodesChange)="onNodesChange($event)"
        (edgesChange)="onEdgesChange($event)"
        (connect)="onConnect($event)"
      >
        <angular-flow-minimap />
        <angular-flow-controls />
        <angular-flow-background />
      </angular-flow>
    </div>
  `
})
export class FlowEditorComponent {
  nodes = [...];
  edges = [...];
  nodeTypes = {
    memory: MemoryNodeComponent,
    orchestrator: OrchestratorNodeComponent,
    // ...
  };
}
```

## LangChain.js — Setup Rápido

```typescript
// src/server/utils/llm.ts
import { ChatOpenAI } from '@langchain/openai';

export const llm = new ChatOpenAI({
  modelName: process.env.LLM_MODEL || 'gpt-4o',
  openAIApiKey: process.env.LLM_API_KEY,
  temperature: 0.1,  // bajo para clasificación, más alto para respuestas
});

// Uso básico
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const response = await llm.invoke([
  new SystemMessage('Eres un clasificador de intenciones...'),
  new HumanMessage('Quiero ver autos disponibles'),
]);

console.log(response.content);
// → '{"intent": "catalog", "confidence": 0.95}'
```

## SSE desde API Route

```typescript
// Backend (chat.post.ts)
import { defineEventHandler, readBody, setHeader } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  
  setHeader(event, 'Content-Type', 'text/event-stream');
  setHeader(event, 'Cache-Control', 'no-cache');
  setHeader(event, 'Connection', 'keep-alive');

  const send = (eventName: string, data: any) => {
    event.node.res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send('agent_active', { node: 'memory' });
  // ... procesar ...
  send('message_chunk', { content: 'Hola!' });
  send('done', {});

  event.node.res.end();
});
```

```typescript
// Frontend (chat.service.ts)
async sendMessage(sessionId: string, message: string) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    // Parsear SSE events...
  }
}
```

## Tailwind en Analog.js

```typescript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    analog(),
    tailwindcss(),
  ],
});
```

```css
/* src/styles.css */
@import "tailwindcss";
```

## Checklist de Variables de Entorno

```
✅ MONGODB_URI     — Connection string de Atlas
✅ LLM_API_KEY     — API key del modelo asignado
✅ LLM_MODEL       — Nombre del modelo (gpt-4o, claude-sonnet, etc.)
✅ LLM_BASE_URL    — URL base de la API (si no es OpenAI default)
```

## Links Útiles

- Analog.js Docs: https://analogjs.org/docs
- @xyflow/angular: https://github.com/xyflow/xyflow (buscar angular examples)
- LangChain.js: https://js.langchain.com/docs
- MongoDB Atlas: https://cloud.mongodb.com
- Vercel Deploy: https://vercel.com/docs
- h3 (server framework): https://h3.unjs.io
