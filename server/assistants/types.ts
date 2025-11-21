/**
 * ASSISTANTS API - TIPOS TYPESCRIPT
 * 
 * Definiciones de tipos para la nueva arquitectura con OpenAI Assistants
 */

/**
 * Metadata del usuario para contexto
 */
export interface UserContext {
  userId: string;
  email?: string;
  subscriptionPlan: 'free' | 'premium' | 'enterprise';
  permissions: string[];
  language: 'es' | 'en';
  firebaseToken?: string; // 🔥 Token para autenticación en requests internos
}

/**
 * Parámetros para crear un thread
 */
export interface CreateThreadParams {
  userContext: UserContext;
  initialMessage?: string;
}

/**
 * Respuesta de creación de thread
 */
export interface CreateThreadResponse {
  threadId: string;
  assistantId: string;
}

/**
 * Parámetros para enviar mensaje
 */
export interface SendMessageParams {
  threadId: string;
  message: string;
  userContext: UserContext;
  pageContext?: any; // 👁️ Contexto de página actual
}

/**
 * Tool call desde OpenAI
 */
export interface ToolCallRequest {
  toolCallId: string;
  toolName: string;
  arguments: Record<string, any>;
  userContext: UserContext;
}

/**
 * Respuesta de tool execution
 */
export interface ToolCallResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Stream update tipos
 */
export type StreamUpdateType = 
  | 'text_delta'
  | 'tool_call_start'
  | 'tool_call_end'
  | 'complete'
  | 'error';

export interface StreamUpdate {
  type: StreamUpdateType;
  content?: string;
  toolName?: string;
  data?: any;
  error?: string;
}

/**
 * Configuración de herramienta para OpenAI
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

/**
 * Executor de herramienta
 */
export type ToolExecutor = (
  args: Record<string, any>,
  userContext: UserContext
) => Promise<any>;

/**
 * Registro de herramientas
 */
export interface ToolRegistry {
  [key: string]: {
    definition: ToolDefinition;
    executor: ToolExecutor;
    requiresConfirmation?: boolean;
  };
}
