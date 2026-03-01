// ============================================
// MENSAJES Y CHAT
// ============================================

export interface ChatRequest {
  sessionId: string;
  message: string;
  flowConfig?: FlowConfig;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentType?: AgentType;
}

export type AgentType = 'memory' | 'orchestrator' | 'validator' | 'specialist' | 'generic';

// ============================================
// AGENTES
// ============================================

export interface OrchestratorResult {
  intent: 'faqs' | 'catalog' | 'schedule' | 'generic';
  confidence: number;
  reasoning?: string;
}

export interface ValidatorResult {
  isComplete: boolean;
  collectedData: Record<string, any>;
  missingFields: string[];
  nextQuestion?: string;
}

export interface SpecialistResult {
  response: string;
  sources?: string[];
  recommendations?: any[];
}

// ============================================
// VALIDADOR — Datos por Caso de Uso
// ============================================

export interface FAQsValidationData {
  clientType?: 'nuevo' | 'existente';
  employmentType?: 'asalariado' | 'independiente';
  age?: number;
}

export interface CatalogValidationData {
  budget?: number;
  condition?: 'nuevo' | 'usado';
  hasEmployeeDiscount?: boolean;
  vehicleType?: 'sedan' | 'suv' | 'pickup' | 'hatchback' | 'deportivo';
}

export interface ScheduleValidationData {
  fullName?: string;
  preferredDate?: string;
  preferredTime?: string;
  appointmentType?: 'prueba_manejo' | 'asesoria';
  vehicleOfInterest?: string;
}

// ============================================
// MEMORIA
// ============================================

export interface ConversationMemory {
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

export interface FlowConfig {
  flowId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  nodeConfigs: Record<string, NodeConfig>;
}

export interface FlowNode {
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

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface NodeConfig {
  systemPrompt?: string;
  temperature?: number;
  toolSource?: string;
  validationFields?: string[];
}

// ============================================
// SSE EVENTS
// ============================================

export interface SSEEvent {
  event: 'agent_active' | 'message_chunk' | 'validation_update' | 'done' | 'error';
  data: any;
}

export interface AgentActiveEvent {
  node: AgentType;
  status: 'processing' | 'complete';
}

export interface MessageChunkEvent {
  content: string;
}

export interface ValidationUpdateEvent {
  collectedData: Record<string, any>;
  missingFields: string[];
}
