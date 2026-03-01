# ⏰ TIMELINE.md — Plan de Ejecución (24 horas)

## Resumen

- **Sábado 28 feb**: Kickoff 2-4 PM → Desarrollo 4 PM - 12 AM (8h)
- **Domingo 1 mar**: Desarrollo 10 AM - 8 PM (10h)
- **Total**: ~18 horas efectivas de desarrollo

---

## 🟡 SÁBADO — Fundaciones (4 PM → 12 AM)

### BLOQUE 1: Setup (4:00 - 5:30 PM) ⏱️ 1.5h

**Persona A (Frontend):**
```bash
npm create analog@latest ai-agent-builder
cd ai-agent-builder
npm install @xyflow/angular
npx tailwindcss init
```
- [ ] Proyecto Analog.js creado y corriendo
- [ ] Tailwind configurado
- [ ] Layout base: sidebar izquierda (nodos) + canvas centro + chat derecha
- [ ] Routing: página principal `/editor`

**Persona B (Backend):**
- [ ] Crear cuenta MongoDB Atlas (free tier M0)
- [ ] Crear cluster + database `agent-builder`
- [ ] Crear colecciones: `conversations`, `flows`
- [ ] Obtener connection string
- [ ] Crear `src/server/routes/api/chat.post.ts` (hello world)
- [ ] Instalar dependencias: `mongoose`, `langchain`, `@langchain/openai`
- [ ] Definir `types.ts` con todas las interfaces compartidas
- [ ] Probar conexión MongoDB desde API route

**🎯 Checkpoint 5:30 PM:** Proyecto corriendo, layout visible, API route responde, MongoDB conectado.

---

### BLOQUE 2: Editor Visual — Nodos (5:30 - 7:30 PM) ⏱️ 2h

**Persona A:**
- [ ] Integrar @xyflow/angular en el canvas component
- [ ] Crear componente base de nodo custom
- [ ] Implementar 6 tipos de nodos con colores/iconos distintos:
  - 🧠 Memoria (violeta #8B5CF6)
  - 🎯 Orquestador (azul #3B82F6)
  - ✅ Validador (verde #10B981)
  - 🤖 Especialista (amarillo #F59E0B)
  - 💬 Genérico (gris #6B7280)
  - 🔧 Tool/JSON (rojo #EF4444)
- [ ] Nodos draggables en el canvas
- [ ] Conexiones (edges) entre nodos

**Persona B:**
- [ ] System prompt del Orquestador (clasificar intención)
- [ ] Función `orchestrate()`: llamada al LLM → parsear JSON de respuesta
- [ ] System prompt del Agente Genérico
- [ ] Función `handleGeneric()`: saludos/despedidas/fuera de scope
- [ ] Test manual: enviar mensaje → orquestador clasifica → genérico responde

**🎯 Checkpoint 7:30 PM:** Editor muestra nodos conectables. Backend clasifica intenciones.

---

### BLOQUE 3: Chat + Memoria (7:30 - 9:30 PM) ⏱️ 2h

**Persona A:**
- [ ] Componente Chat Playground completo:
  - Input de texto con botón enviar
  - Burbujas de mensaje (user vs assistant)
  - Auto-scroll al último mensaje
  - Contenedor scrolleable
- [ ] Sidebar del canvas: lista de nodos para drag & drop
- [ ] Panel de configuración: click en nodo → muestra opciones editables

**Persona B:**
- [ ] Memory Service completo:
  - `readMemory(sessionId)` → busca en MongoDB
  - `saveMemory(sessionId, userMsg, assistantMsg, intent)` → upsert en MongoDB
  - `updateValidationData(sessionId, data)` → merge de datos parciales
- [ ] Validador v1 genérico:
  - Recibe lista de campos requeridos + datos ya recopilados
  - LLM extrae datos del mensaje actual
  - Retorna siguiente pregunta o isComplete=true

**🎯 Checkpoint 9:30 PM:** Chat UI funcional. Memoria persiste en MongoDB. Validador pide datos.

---

### BLOQUE 4: Integración Inicial (9:30 - 12:00 AM) ⏱️ 2.5h

**Persona A:**
- [ ] `chat.service.ts` — conectar frontend al POST /api/chat
- [ ] Mostrar respuestas del backend en el chat
- [ ] Manejar estados: loading, typing, error
- [ ] Generar sessionId único por sesión (UUID)

**Persona B:**
- [ ] Pipeline completo en `chat.post.ts`:
  1. Leer memoria
  2. Orquestar
  3. Si generic → responder
  4. Si otro → validar → responder pregunta
  5. Guardar memoria
- [ ] SSE básico: enviar `agent_active` events
- [ ] Cargar JSONs estáticos (faqs.json, catalog.json, schedule.json)

**🎯 CHECKPOINT SÁBADO NOCHE:**
- ✅ Editor visual con 6 nodos conectables
- ✅ Chat funcional que envía/recibe mensajes
- ✅ Orquestador clasifica intenciones
- ✅ Agente Genérico responde saludos
- ✅ Validador empieza a pedir datos
- ✅ Memoria guarda en MongoDB

**💤 DESCANSAR** — Mañana es el día pesado.

---

## 🟢 DOMINGO — Funcionalidad Completa (10 AM → 8 PM)

### BLOQUE 5: Caso 1 — FAQs (10:00 - 11:30 AM) ⏱️ 1.5h

**Persona A:**
- [ ] Implementar SSE listener en chat.service.ts
- [ ] Parsear eventos SSE (agent_active, message_chunk, done)
- [ ] Mostrar streaming de texto en el chat progresivamente

**Persona B:**
- [ ] Validador FAQs: recopilar clientType, employmentType, age
- [ ] Especialista FAQs: leer faqs.json, personalizar respuesta por perfil
- [ ] Test: flujo completo FAQs de inicio a fin

**🎯 Checkpoint 11:30 AM:** Caso 1 funciona end-to-end con validación + respuesta personalizada.

---

### BLOQUE 6: Caso 2 — Catálogo (11:30 AM - 1:00 PM) ⏱️ 1.5h

**Persona A:**
- [ ] **Highlight de nodos activos:**
  - Escuchar eventos `agent_active` del SSE
  - Aplicar clase CSS de animación al nodo correspondiente
  - Glow/pulse effect cuando `status: 'processing'`
  - Remover cuando `status: 'complete'`

**Persona B:**
- [ ] Validador Catálogo: recopilar budget, condition, discount, vehicleType
- [ ] Especialista Catálogo: filtrar catalog.json por criterios del perfil
- [ ] Lógica de descuento de empleado (aplicar % al precio)
- [ ] Formato de respuesta: listar 3-5 opciones relevantes
- [ ] Test: flujo completo Catálogo

**🎯 Checkpoint 1:00 PM:** Caso 2 funciona. Nodos se iluminan durante procesamiento.

---

### 🍽️ ALMUERZO + SYNC (1:00 - 2:00 PM) ⏱️ 1h

- [ ] Comer algo
- [ ] Test conjunto de Caso 1 y Caso 2
- [ ] Lista de bugs encontrados
- [ ] Priorizar: ¿alcanza Caso 3? ¿Qué falta para el pitch?
- [ ] Ajustar plan de la tarde si es necesario

---

### BLOQUE 7: Caso 3 — Agenda (2:00 - 3:30 PM) ⏱️ 1.5h

**Persona A:**
- [ ] Config panel funcional:
  - Click en nodo → sidebar muestra su configuración
  - Editar system prompt del nodo
  - Editar temperatura del LLM
  - Para nodo Tool: mostrar preview del JSON
- [ ] Typing indicator (tres puntos animados mientras el bot responde)

**Persona B:**
- [ ] Validador Agenda: recopilar fullName, date, time, type, vehicle
- [ ] Especialista Agenda: consultar schedule.json, confirmar o proponer alternativas
- [ ] Manejo de fechas relativas ("mañana", "el viernes") → convertir a fecha real
- [ ] Test: flujo completo Agenda

**🎯 Checkpoint 3:30 PM:** Los 3 casos de uso funcionan. Panel de config editable.

---

### BLOQUE 8: Integración Profunda (3:30 - 5:00 PM) ⏱️ 1.5h

**Persona A:**
- [ ] Flow config → enviar al backend cuando se modifica
- [ ] Que el editor pueda cargar un flujo guardado
- [ ] Botón "Reset Flow" para volver al default
- [ ] Botón "New Conversation" para limpiar el chat
- [ ] Responsive: que funcione decente en pantalla de presentación

**Persona B:**
- [ ] POST /api/flow → guardar config de nodos en MongoDB
- [ ] GET /api/flow → cargar config guardada
- [ ] Que el pipeline use la config del flujo (prompts editados desde el panel)
- [ ] Manejo de cambio de intención a mitad de conversación
- [ ] Error handling robusto en todo el pipeline

**🎯 Checkpoint 5:00 PM:** Flow config se guarda/carga. Pipeline usa config del editor.

---

### BLOQUE 9: Polish + Testing (5:00 - 6:30 PM) ⏱️ 1.5h

**Persona A:**
- [ ] Mini-mapa del editor (si @xyflow lo soporta)
- [ ] Zoom controls (+/- y fit view)
- [ ] Tooltips en nodos (hover → muestra descripción)
- [ ] Loading states en todo el UI
- [ ] Manejo de errores visible al usuario
- [ ] Dark mode o al menos un tema profesional

**Persona B:**
- [ ] Test de los 3 casos: caminos felices + edge cases
- [ ] Optimizar prompts: que el validador sea más natural
- [ ] Que el orquestador no se confunda con respuestas de validación
- [ ] Verificar memoria persistente: cerrar y reabrir → contexto se mantiene
- [ ] Logging básico para debug

**🎯 Checkpoint 6:30 PM:** App pulida y estable. Todos los casos probados.

---

### BLOQUE 10: Deploy + Docs (6:30 - 7:30 PM) ⏱️ 1h

**Persona A:**
- [ ] Verificar que build de producción funciona: `npm run build`
- [ ] Deploy a Vercel: `vercel --prod`
- [ ] Probar app desplegada end-to-end
- [ ] Screenshots para el README

**Persona B:**
- [ ] Completar README.md (decisiones técnicas, screenshots)
- [ ] Completar TASKS.md (marcar tareas completadas, quién hizo qué)
- [ ] Verificar que el repo está limpio (.env en .gitignore)
- [ ] Push final a GitHub/GitLab

**🎯 Checkpoint 7:30 PM:** App desplegada. Repo completo con documentación.

---

### BLOQUE 11: Pitch (7:30 - 8:00 PM) ⏱️ 30min

**Script de demo (3-5 minutos):**

```
MINUTO 0-0:30 → Intro
"Construimos un AI Agent Builder para una concesionaria de autos usando
Analog.js, el meta-framework fullstack de Angular."

MINUTO 0:30-1:30 → Editor Visual
- Mostrar el canvas con los nodos pre-cargados
- Mover un nodo, hacer zoom
- Click en nodo → panel de configuración
- Mostrar que se puede editar el system prompt

MINUTO 1:30-3:00 → Demo Caso 1 o 2 (el más impresionante)
- Abrir el chat
- Escribir "Hola"
- MOSTRAR cómo los nodos se iluminan (Memory → Orchestrator → Generic)
- Escribir "Quiero ver qué autos tienen"
- Mostrar: Orchestrator → Validator → pregunta
- Responder cada pregunta del validador
- Mostrar: Validator → Specialist → respuesta con recomendaciones

MINUTO 3:00-4:00 → Demo rápida de otro caso
- Cambiar de tema: "Quiero agendar una prueba de manejo"
- Mostrar que el orquestador detecta el cambio de intención
- Validador pide nuevos datos

MINUTO 4:00-4:30 → Bonus
- "La memoria persiste en MongoDB entre sesiones"
- Refrescar página → contexto se mantiene

MINUTO 4:30-5:00 → Cierre
"Todo corre como una sola app en Analog.js, desplegada en Vercel"
```

**Preguntas anticipadas para cada miembro:**

Para Persona A:
- ¿Por qué @xyflow y no ngx-graph?
- ¿Cómo implementaste el highlight de nodos en tiempo real?
- ¿Qué harías para hacer el editor más configurable con más tiempo?

Para Persona B:
- ¿Cómo el orquestador distingue una respuesta de validación de un cambio de tema?
- ¿Por qué SSE en vez de WebSocket?
- ¿Cómo escalarías la memoria para miles de sesiones concurrentes?
- ¿Qué harías diferente con más tiempo?

---

## Checklist Final Pre-Pitch

- [ ] App desplegada y accesible
- [ ] Los 3 casos de uso funcionan en producción
- [ ] Nodos se iluminan durante el chat
- [ ] Memoria persiste entre sesiones
- [ ] README completo con arquitectura y decisiones
- [ ] TASKS.md con división clara
- [ ] Repo limpio (sin .env, sin node_modules)
- [ ] Demo script practicado
- [ ] Cada miembro puede explicar la solución completa
