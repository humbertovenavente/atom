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

export type AgentType = 'memory' | 'orchestrator' | 'validator' | 'specialist' | 'generic' | 'booking';

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
// RESERVAS (BOOKING)
// ============================================

export interface BookedSlot {
  date: string;
  time: string;
  fullName: string;
  sessionId: string;
  bookedAt: Date;
}

export type BookingFailureReason =
  | 'date_not_found'
  | 'slot_not_available'
  | 'slot_already_booked'
  | 'day_fully_booked';

export interface BookingResult {
  success: boolean;
  reason?: BookingFailureReason;
  booking?: BookedSlot;
  availableSlots?: string[];
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
  type: 'memory' | 'orchestrator' | 'validator' | 'specialist' | 'generic' | 'tool' | 'telegram';
  position: { x: number; y: number };
  size?: { width: number; height: number };
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
  botToken?: string;
}

// ============================================
// SSE EVENTS
// ============================================

export interface SSEEvent {
  event: 'agent_active' | 'message_chunk' | 'validation_update' | 'booking_confirmed' | 'booking_failed' | 'done' | 'error';
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

export interface BookingConfirmedEvent {
  date: string;
  time: string;
  fullName: string;
}

export interface BookingFailedEvent {
  reason: BookingFailureReason;
  availableSlots: string[];
}
