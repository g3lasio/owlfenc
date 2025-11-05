/**
 * WorkflowEngine Types
 * 
 * Sistema de workflows declarativos para Mervin AI V2
 * Permite ejecutar procesos multi-paso (Estimate Wizard, Contract Generator, etc.)
 * con state management, progress tracking y error handling robusto.
 */

export type WorkflowStepType = 
  | 'collect'    // Recolectar información del usuario
  | 'call'       // Llamar a un endpoint/servicio
  | 'branch'     // Decisión condicional
  | 'transform'  // Transformar datos
  | 'parallel';  // Ejecutar múltiples pasos en paralelo

export type WorkflowStatus = 
  | 'pending'       // Esperando iniciar
  | 'running'       // En ejecución
  | 'waiting_input' // Esperando input del usuario
  | 'completed'     // Completado exitosamente
  | 'failed'        // Falló
  | 'cancelled';    // Cancelado por el usuario

/**
 * Definición de un paso individual en el workflow
 */
export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name: string;
  description?: string;
  
  // Para tipo 'collect': campos a recolectar
  collectFields?: {
    name: string;
    type: 'string' | 'number' | 'email' | 'phone' | 'address' | 'object';
    required: boolean;
    prompt?: string;        // Pregunta específica para el usuario
    validation?: string;    // Regex o función de validación
    defaultValue?: any;
  }[];
  
  // Para tipo 'call': endpoint a llamar
  endpoint?: {
    service: 'system_api' | 'deepsearch' | 'contract' | 'permit' | 'property' | 'custom';
    method: string;         // Nombre del método en SystemAPIService o ruta del endpoint
    params?: Record<string, any>;  // Parámetros estáticos
    paramMapping?: Record<string, string>;  // Mapeo de context a params
  };
  
  // Para tipo 'branch': condiciones
  condition?: {
    field: string;
    operator: 'equals' | 'contains' | 'exists' | 'gt' | 'lt';
    value: any;
    thenStep: string;  // ID del paso si verdadero
    elseStep?: string; // ID del paso si falso
  };
  
  // Para tipo 'transform': transformación de datos
  transform?: {
    input: string;          // Campo del context
    output: string;         // Campo destino en context
    operation: string;      // Operación a realizar
  };
  
  // Para tipo 'parallel': pasos a ejecutar en paralelo
  parallelSteps?: string[];  // IDs de pasos a ejecutar
  
  // Configuración
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
  
  timeout?: number;  // Timeout en ms
  
  onError?: 'stop' | 'skip' | 'retry';
}

/**
 * Definición completa de un workflow
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: 'estimate' | 'contract' | 'permit' | 'property' | 'payment' | 'invoice' | 'custom';
  
  // Pasos del workflow en orden
  steps: WorkflowStep[];
  
  // Context inicial requerido
  requiredContext?: string[];
  
  // Configuración global
  config?: {
    allowInterruptions?: boolean;
    saveStateOnEachStep?: boolean;
    maxDurationMs?: number;
  };
  
  // Metadata
  version: string;
  author?: string;
  createdAt?: Date;
}

/**
 * Estado de una sesión de workflow en ejecución
 */
export interface WorkflowSession {
  sessionId: string;
  workflowId: string;
  userId: string;
  
  status: WorkflowStatus;
  
  // Context acumulado del workflow
  context: Record<string, any>;
  
  // Paso actual
  currentStepId: string | null;
  currentStepIndex: number;
  
  // Historial de pasos completados
  completedSteps: {
    stepId: string;
    completedAt: Date;
    result?: any;
    error?: string;
  }[];
  
  // Información faltante que se necesita del usuario
  pendingQuestion?: {
    stepId: string;
    question: string;
    fields: string[];
    askedAt: Date;
  };
  
  // Resultados finales
  result?: any;
  error?: {
    stepId: string;
    message: string;
    stack?: string;
  };
  
  // Timestamps
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Metadata
  metadata?: {
    conversationId?: string;
    aiModel?: string;
    estimatedDuration?: number;
  };
}

/**
 * Evento de progreso del workflow
 */
export interface WorkflowProgressEvent {
  sessionId: string;
  type: 
    | 'workflow_started'
    | 'step_started'
    | 'step_completed'
    | 'step_failed'
    | 'waiting_input'
    | 'workflow_completed'
    | 'workflow_failed';
  
  stepId?: string;
  stepName?: string;
  stepIndex?: number;
  totalSteps?: number;
  
  message: string;
  timestamp: Date;
  
  data?: any;
}

/**
 * Resultado de la ejecución de un workflow
 */
export interface WorkflowResult {
  success: boolean;
  sessionId: string;
  workflowId: string;
  
  result?: any;
  error?: {
    stepId: string;
    message: string;
  };
  
  duration: number;
  stepsCompleted: number;
  totalSteps: number;
}

/**
 * Request para iniciar un workflow
 */
export interface StartWorkflowRequest {
  workflowId: string;
  userId: string;
  initialContext?: Record<string, any>;
  conversationId?: string;
  aiModel?: string;
}

/**
 * Request para resumir un workflow
 */
export interface ResumeWorkflowRequest {
  sessionId: string;
  userInput: Record<string, any>;
}

/**
 * Adapter para ejecutar pasos de workflow
 */
export interface WorkflowStepAdapter {
  canHandle(step: WorkflowStep): boolean;
  execute(step: WorkflowStep, context: Record<string, any>): Promise<any>;
}
