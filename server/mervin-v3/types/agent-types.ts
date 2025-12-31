/**
 * MERVIN V3 - AGENT TYPES
 * 
 * Definiciones de tipos para el nuevo sistema de modo agente con planificación dinámica.
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

// ============= TASK PLAN TYPES =============

/**
 * Plan de ejecución generado por el TaskPlanner
 */
export interface TaskPlan {
  /** Complejidad de la tarea */
  complexity: 'simple' | 'complex';
  
  /** Intención real del usuario */
  intent: string;
  
  /** Pasos del plan de ejecución */
  steps: PlanStep[];
  
  /** ¿Requiere confirmación del usuario antes de ejecutar? */
  needsConfirmation: boolean;
  
  /** Mensaje de confirmación para el usuario */
  confirmationMessage?: string;
  
  /** Duración estimada en segundos */
  estimatedDuration: number;
  
  /** Timestamp de creación del plan */
  createdAt: Date;
}

/**
 * Un paso individual en el plan de ejecución
 */
export interface PlanStep {
  /** Número del paso (1-indexed) */
  stepNumber: number;
  
  /** Nombre de la herramienta/acción a ejecutar */
  action: string;
  
  /** Descripción legible del paso */
  description: string;
  
  /** Parámetros para la herramienta */
  params: Record<string, any>;
  
  /** Condición que indica éxito del paso */
  successCondition: string;
  
  /** Acción a tomar si el paso falla */
  fallbackAction: string;
  
  /** ¿Requiere confirmación del usuario? */
  requiresConfirmation: boolean;
  
  /** Estado de ejecución del paso */
  status?: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  
  /** Resultado de la ejecución */
  result?: any;
  
  /** Error si el paso falló */
  error?: string;
  
  /** Timestamp de inicio de ejecución */
  startedAt?: Date;
  
  /** Timestamp de finalización */
  completedAt?: Date;
}

// ============= CONTEXT TYPES =============

/**
 * Contexto completo para la planificación
 */
export interface PlanningContext {
  /** Input del usuario */
  userInput: string;
  
  /** ID del usuario */
  userId: string;
  
  /** Perfil del contratista */
  contractorProfile: ContractorProfile;
  
  /** Historial de la conversación */
  conversationHistory: ConversationMessage[];
  
  /** Acciones recientes del usuario */
  recentActions: RecentAction[];
  
  /** Herramientas disponibles */
  availableTools: Tool[];
  
  /** Contexto de página (si está disponible) */
  pageContext?: PageContext;
}

/**
 * Perfil del contratista
 */
export interface ContractorProfile {
  companyName?: string;
  businessType?: string;
  city?: string;
  state?: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

/**
 * Mensaje de conversación
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

/**
 * Acción reciente del usuario
 */
export interface RecentAction {
  action: string;
  timestamp: Date;
  result: string;
  success: boolean;
}

/**
 * Contexto de la página actual
 */
export interface PageContext {
  url?: string;
  section?: string;
  action?: string;
}

// ============= EXECUTION TYPES =============

/**
 * Contexto de ejecución del agente
 */
export interface ExecutionContext {
  /** Plan que se está ejecutando */
  plan: TaskPlan;
  
  /** Scratchpad con resultados de pasos previos */
  scratchpad: Scratchpad;
  
  /** Paso actual */
  currentStep: number;
  
  /** ¿Está pausado esperando input del usuario? */
  isPaused: boolean;
  
  /** Razón de la pausa */
  pauseReason?: string;
  
  /** Timestamp de inicio de ejecución */
  startedAt: Date;
  
  /** Timestamp de última actualización */
  updatedAt: Date;
}

/**
 * Scratchpad - Memoria de trabajo del agente
 */
export interface Scratchpad {
  /** Resultados de búsquedas de clientes */
  client?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    [key: string]: any;
  };
  
  /** Resultados de estimados */
  estimate?: {
    id: string;
    total: number;
    pdfUrl?: string;
    shareUrl?: string;
    [key: string]: any;
  };
  
  /** Resultados de contratos */
  contract?: {
    id: string;
    status: string;
    signatureUrl?: string;
    [key: string]: any;
  };
  
  /** Resultados de verificación de propiedad */
  property?: {
    owner: string;
    address: string;
    [key: string]: any;
  };
  
  /** Resultados de permisos */
  permit?: {
    required: boolean;
    permits: string[];
    [key: string]: any;
  };
  
  /** Otros datos arbitrarios */
  [key: string]: any;
}

// ============= RESPONSE TYPES =============

/**
 * Respuesta del agente al usuario
 */
export interface AgentResponse {
  /** Tipo de respuesta */
  type: 'plan_generated' | 'needs_confirmation' | 'executing' | 'step_completed' | 'task_completed' | 'needs_more_info' | 'error';
  
  /** Mensaje para el usuario */
  message: string;
  
  /** Plan generado (si aplica) */
  plan?: TaskPlan;
  
  /** Contexto de ejecución (si está ejecutando) */
  executionContext?: ExecutionContext;
  
  /** Datos adicionales */
  data?: any;
  
  /** ID de la sesión de ejecución */
  executionId?: string;
  
  /** Tiempo de ejecución en ms */
  executionTime?: number;
  
  /** Acción pendiente que requiere confirmación */
  pendingAction?: PlanStep;
  
  /** Pregunta para el usuario */
  question?: string;
  
  /** Opciones de respuesta (para preguntas de opción múltiple) */
  options?: string[];
}

// ============= AGENT CONFIG TYPES =============

/**
 * Configuración del agente
 */
export interface AgentConfig {
  /** Modelo de IA a usar para planificación */
  planningModel: 'claude-3-5-sonnet-20240620' | 'gpt-4o' | 'gpt-4o-mini';
  
  /** Modelo de IA a usar para síntesis */
  synthesisModel: 'claude-3-5-sonnet-20240620' | 'gpt-4o' | 'gpt-4o-mini';
  
  /** Temperatura para planificación (0-1) */
  planningTemperature: number;
  
  /** Temperatura para síntesis (0-1) */
  synthesisTemperature: number;
  
  /** Máximo número de reintentos por paso */
  maxRetries: number;
  
  /** Timeout por paso en ms */
  stepTimeout: number;
  
  /** ¿Habilitar modo debug? */
  debug: boolean;
  
  /** ¿Guardar planes en base de datos? */
  savePlans: boolean;
  
  /** ¿Aprender de planes exitosos? */
  enableLearning: boolean;
}

/**
 * Configuración por defecto
 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  planningModel: 'claude-3-5-sonnet-20240620',
  synthesisModel: 'claude-3-5-sonnet-20240620',
  planningTemperature: 0.2,
  synthesisTemperature: 0.7,
  maxRetries: 3,
  stepTimeout: 60000, // 60 segundos
  debug: false,
  savePlans: true,
  enableLearning: true
};

// ============= ERROR TYPES =============

/**
 * Error de planificación
 */
export class PlanningError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'PlanningError';
  }
}

/**
 * Error de ejecución
 */
export class ExecutionError extends Error {
  constructor(
    message: string,
    public step: PlanStep,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ExecutionError';
  }
}

/**
 * Error de validación
 */
export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
