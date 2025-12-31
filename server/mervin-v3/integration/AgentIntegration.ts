/**
 * AGENT INTEGRATION - INTEGRACIÓN CON MERVIN V2
 * 
 * Este módulo conecta el AgentCore V3 con el MervinConversationalOrchestrator existente.
 * Permite que el modo agente V3 coexista con el sistema V2.
 */

import { AgentCore } from '../agent/AgentCore';
import type { 
  AgentResponse, 
  PlanningContext,
  ContractorProfile 
} from '../types/agent-types';
import { getAllTools } from '../../mervin-v2/tools/ClaudeToolDefinitions';
import type { MervinConversationalRequest, MervinConversationalResponse } from '../../mervin-v2/orchestrator/MervinConversationalOrchestrator';

/**
 * Verifica si el usuario tiene acceso al modo agente V3
 * Solo usuarios de planes Mero Patrón y Master Contractor
 */
export async function hasAgentV3Access(userId: string, authHeaders: Record<string, string>, baseURL: string): Promise<boolean> {
  try {
    // Llamar al endpoint de perfil para obtener el plan del usuario
    const response = await fetch(`${baseURL}/api/profile`, {
      headers: authHeaders
    });
    
    if (!response.ok) {
      console.error('❌ [AGENT-INTEGRATION] Error obteniendo perfil del usuario');
      return false;
    }
    
    const profile = await response.json();
    
    // Verificar si el plan es Mero Patrón (id: 9) o Master Contractor (id: 6)
    const allowedPlans = [9, 6]; // mero_patron, MASTER_CONTRACTOR
    const hasPaidPlan = allowedPlans.includes(profile.subscriptionPlanId);
    
    console.log(`🔐 [AGENT-INTEGRATION] Usuario ${userId} - Plan: ${profile.subscriptionPlanId} - Acceso V3: ${hasPaidPlan}`);
    
    return hasPaidPlan;
    
  } catch (error: any) {
    console.error('❌ [AGENT-INTEGRATION] Error verificando acceso:', error.message);
    return false;
  }
}

/**
 * Convierte una solicitud de Mervin V2 a contexto de planificación de V3
 */
export function convertToAgentContext(
  request: MervinConversationalRequest,
  contractorProfile: any
): PlanningContext {
  return {
    userInput: request.input,
    userId: request.userId,
    contractorProfile: {
      companyName: contractorProfile?.companyName,
      businessType: contractorProfile?.businessType,
      city: contractorProfile?.city,
      state: contractorProfile?.state,
      email: contractorProfile?.email,
      phone: contractorProfile?.phone
    },
    conversationHistory: [], // TODO: Obtener del conversationStateManager
    recentActions: [], // TODO: Obtener del historial del usuario
    availableTools: getAllTools(),
    pageContext: request.pageContext
  };
}

/**
 * Convierte una respuesta del agente V3 a formato de Mervin V2
 */
export function convertToMervinResponse(
  agentResponse: AgentResponse,
  conversationId: string
): MervinConversationalResponse {
  // Mapear tipos de respuesta
  let type: MervinConversationalResponse['type'];
  
  switch (agentResponse.type) {
    case 'task_completed':
      type = 'workflow_completed';
      break;
    case 'needs_confirmation':
    case 'needs_more_info':
      type = 'needs_more_info';
      break;
    case 'error':
      type = 'error';
      break;
    default:
      type = 'conversation';
  }
  
  return {
    type,
    message: agentResponse.message,
    conversationId,
    data: agentResponse.data,
    workflowSessionId: agentResponse.executionId,
    executionTime: agentResponse.executionTime || 0
  };
}

/**
 * Procesa una solicitud usando el modo agente V3
 */
export async function processWithAgentV3(
  request: MervinConversationalRequest,
  contractorProfile: any,
  authHeaders: Record<string, string>,
  baseURL: string
): Promise<MervinConversationalResponse> {
  console.log('🚀 [AGENT-INTEGRATION] Procesando con Modo Agente V3');
  
  try {
    // 1. Verificar acceso
    const hasAccess = await hasAgentV3Access(request.userId, authHeaders, baseURL);
    
    if (!hasAccess) {
      console.log('⛔ [AGENT-INTEGRATION] Usuario no tiene acceso al modo agente V3');
      return {
        type: 'error',
        message: 'El modo agente está disponible solo para usuarios de planes Mero Patrón y Master Contractor. Actualiza tu plan para acceder a esta funcionalidad.',
        conversationId: request.conversationId || 'no-conversation',
        executionTime: 0
      };
    }
    
    // 2. Crear el agente
    const agent = new AgentCore(
      request.userId,
      authHeaders,
      baseURL,
      { debug: false } // Cambiar a true para debugging
    );
    
    // 3. Convertir la solicitud a contexto de planificación
    const context = convertToAgentContext(request, contractorProfile);
    
    // 4. Procesar la solicitud
    const agentResponse = await agent.processRequest(context);
    
    // 5. Convertir la respuesta a formato de Mervin V2
    const mervinResponse = convertToMervinResponse(
      agentResponse,
      request.conversationId || 'new-conversation'
    );
    
    console.log('✅ [AGENT-INTEGRATION] Procesamiento completado con V3');
    
    return mervinResponse;
    
  } catch (error: any) {
    console.error('❌ [AGENT-INTEGRATION] Error en modo agente V3:', error.message);
    
    return {
      type: 'error',
      message: `Error en el modo agente: ${error.message}`,
      conversationId: request.conversationId || 'error-conversation',
      executionTime: 0
    };
  }
}

/**
 * Detecta si la solicitud debe usar el modo agente V3
 * Basado en palabras clave y complejidad de la solicitud
 */
export function shouldUseAgentV3(request: MervinConversationalRequest): boolean {
  // Si el modo está explícitamente configurado como 'agent', usar V3
  if (request.mode === 'agent') {
    return true;
  }
  
  // Detectar palabras clave que indican tareas complejas
  const agentKeywords = [
    'automatiza',
    'completa',
    'y luego',
    'después',
    'también',
    'además',
    'todo el proceso',
    'de principio a fin'
  ];
  
  const input = request.input.toLowerCase();
  const hasAgentKeyword = agentKeywords.some(keyword => input.includes(keyword));
  
  // Detectar múltiples acciones en una sola solicitud
  const hasMultipleActions = (
    (input.includes('crea') || input.includes('genera')) &&
    (input.includes('envía') || input.includes('manda'))
  );
  
  return hasAgentKeyword || hasMultipleActions;
}
