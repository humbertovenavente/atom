# Phase 2: Flow Editor - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

A fully functional flow canvas where users can view, drag, and connect 6 custom node types, with FlowService managing all graph state via Angular Signals. Includes sidebar drag-and-drop, animated edges, mini-map, zoom controls, and auto-loading the default 8-node flow from the API.

</domain>

<decisions>
## Implementation Decisions

### Node visual design
- Tarjeta rectangular con puertos de entrada/salida visibles a los lados (estilo React Flow)
- Cada nodo muestra: icono (emoji, mantener los actuales), label, color de fondo sutil basado en el tipo
- Los 6 colores ya definidos en NODE_TYPE_CONFIGS se usan como fondo/borde
- Todos los nodos del mismo tamaño para mantener el canvas limpio y ordenado
- Highlight de nodo activo: borde brillante con glow/shadow animado (pulso sutil) usando el color del tipo

### Sidebar drag & drop
- Al arrastrar un nodo del sidebar al canvas: ghost/preview visual durante el drag
- El nodo cae en la posición donde el usuario suelta el mouse
- No auto-conectar — el usuario conecta manualmente arrastrando entre puertos
- El sidebar ya tiene `draggable="true"` en cada tarjeta — necesita `dragstart` con datos del tipo

### Edge animations
- Conexiones con líneas animadas (dashed con flow animation via CSS)
- Cuando un nodo está activo, las edges conectadas al nodo activo también se iluminan
- Color de edge sutil en estado normal (gris), brillante durante actividad

### Canvas controls
- Mini-mapa en esquina inferior derecha del canvas
- Controles de zoom: botones +, -, y "fit view" en esquina inferior izquierda
- @foblex/flow tiene soporte nativo para mini-map y zoom — usar las directivas del framework

### FlowService (state management)
- Angular Signals para todo el estado: nodes signal, edges signal, activeNodeId signal, selectedNodeId signal
- Cargar el default flow desde GET /api/flow al iniciar
- El service es la single source of truth — el canvas lee del service, no tiene estado propio

### Claude's Discretion
- Tamaño exacto de los nodos (px)
- Espaciado entre puertos de entrada/salida
- Estilo exacto de las animaciones CSS para edges
- Implementación del mini-map (@foblex/flow's built-in vs custom)
- Comportamiento de zoom (wheel zoom enabled/disabled)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `NODE_TYPE_CONFIGS` (models/types.ts): 6 tipos con label, color, icon, description — usar directamente para renderizar nodos custom
- `FlowNode`/`FlowEdge` interfaces (models/types.ts): ya definen id, type, label, position, data para nodos y sourceId/targetId para edges
- Mock flow data (server/routes/api/flow.get.ts): 8 nodos con posiciones y 8 edges pre-definidos — el default flow a cargar

### Established Patterns
- @foblex/flow con directivas fNode, fDragHandle, fNodeOutput, fNodeInput, f-connection — el canvas POC ya las usa
- Dark theme con bg-gray-900 / text-white / border-gray-700 — consistente en sidebar, chat, layout
- Tailwind CSS v4 para styling — no escribir CSS custom excepto para animaciones de @foblex/flow

### Integration Points
- `canvas.component.ts` tiene 2 nodos hardcodeados — reemplazar con data-driven desde FlowService
- `sidebar.component.ts` tiene draggable=true — conectar dragstart al canvas con datos del NodeType
- `index.page.ts` tiene el grid layout 240px | 1fr | 360px — el canvas ocupa el panel central

</code_context>

<specifics>
## Specific Ideas

- Los nodos deben verse profesionales para la demo (3-5 minutos). Evitar que se vea como un prototipo rápido.
- La animación de edges con flow es clave visual — representa "datos fluyendo entre agentes"
- El default flow tiene un patrón de pipeline: Orquestador → fan out a especialistas → tools → validador loops back

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-flow-editor*
*Context gathered: 2026-03-01*
