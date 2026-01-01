/**
 * MERVIN CONVERSATIONAL ORCHESTRATOR
 * 
 * Orquestador principal de Mervin AI usando Claude 3.5 Sonnet.
 * Reemplaza la arquitectura de OpenAI Assistants con un sistema conversacional más flexible.
 * 
 * Responsabilidades:
 * - Gestionar conversaciones multi-turno
 * - Coordinar entre Claude, WorkflowRunner y SystemAPI
 * - Manejar tool calling y ejecución de workflows
 * - Procesar OCR de imágenes y documentos
 * - Mantener contexto y estado de conversación
 */

import { claudeEngine, type ConversationTurn } from '../ai/ClaudeConversationalEngine';
import { conversationStateManager } from '../services/ConversationStateManager';
import { WorkflowRunner } from '../services/WorkflowRunner';
import { SystemAPIService } from '../services/SystemAPIService';
import { getMervinSystemPrompt } from '../prompts/MervinSystemPrompt';
import MERVIN_CHAT_COPILOT_PROMPT from '../prompts/MervinChatCopilotPrompt';
import { getAllTools, validateToolParams } from '../tools/ClaudeToolDefinitions';
import { autoDiscoveryIntegration } from '../../services/integration/AutoDiscoveryIntegration';
import type { WorkflowExecutionResult } from '../services/WorkflowRunner';
import { processWithAgentV3, shouldUseAgentV3 } from '../../mervin-v3/integration/AgentIntegration';
import { FriendlyErrorHandler } from '../../mervin-v3/utils/FriendlyErrorHandler';

// ============= TYPES =============

export interface MervinConversationalRequest {
  input: string;
  userId: string;
  conversationId?: string;
  mode?: 'chat' | 'agent'; // Modo de operación
  pageContext?: {
    url?: string;          // URL actual donde está el usuario
    section?: string;      // Sección específica de la página
    action?: string;       // Acción que está realizando
  };
  attachments?: Array<{
    filename: string;
    mimeType: string;
    content: string; // Base64
  }>;
}

export interface MervinConversationalResponse {
  type: 'conversation' | 'workflow_started' | 'workflow_completed' | 'needs_more_info' | 'error';
  message: string;
  conversationId: string;
  data?: any;
  workflowSessionId?: string;
  executionTime: number;
}

// ============= ORCHESTRATOR =============

export class MervinConversationalOrchestrator {
  private workflowRunner: WorkflowRunner;
  private systemAPI: SystemAPIService;
  private contractorProfileCache: any = null; // ⚡ Cache del perfil del contratista
  private profileCacheTimestamp: number = 0; // Timestamp del cache
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos de TTL
  
  constructor(
    private userId: string,
    private authHeaders: Record<string, string> = {},
    private baseURL?: string
  ) {
    this.workflowRunner = new WorkflowRunner(userId, authHeaders, baseURL);
    this.systemAPI = new SystemAPIService(userId, authHeaders, baseURL);
    
    console.log('🤖 [MERVIN-CONVERSATIONAL] Initialized for user:', userId);
    
    // Inicializar auto-discovery en background
    this.initializeAutoDiscovery();
  }
  
  /**
   * Inicializa el sistema de auto-discovery en background
   */
  private async initializeAutoDiscovery(): Promise<void> {
    try {
      console.log('🌟 [MERVIN-CONVERSATIONAL] Initializing auto-discovery...');
      await autoDiscoveryIntegration.initialize();
      console.log('✅ [MERVIN-CONVERSATIONAL] Auto-discovery initialized');
    } catch (error: any) {
      console.error('❌ [MERVIN-CONVERSATIONAL] Error initializing auto-discovery:', error.message);
      // No fallar si auto-discovery falla, solo loguear
    }
  }
  
  /**
   * Procesar mensaje del usuario
   */
  async processMessage(request: MervinConversationalRequest): Promise<MervinConversationalResponse> {
    const startTime = Date.now();
    
    console.log('\n===========================================');
    console.log('🤖 [MERVIN-CONVERSATIONAL] Processing message');
    console.log('Input:', request.input.substring(0, 100) + '...');
    console.log('===========================================\n');
    
    try {
      // 1. Obtener o crear estado de conversación
      const state = conversationStateManager.getOrCreateConversation(
        request.conversationId,
        request.userId
      );
      
      console.log('💬 [MERVIN-CONVERSATIONAL] Conversation ID:', state.conversationId);
      
      // 2. Procesar attachments si existen (OCR)
      let enrichedInput = request.input;
      if (request.attachments && request.attachments.length > 0) {
        enrichedInput = await this.processAttachments(request.input, request.attachments);
      }
      
      // 3. Determinar modo de operación
      const mode = request.mode || 'agent'; // Default: agent mode
      
      // 3.5. Si está en modo agente y la solicitud es compleja, usar V3
      if (mode === 'agent' && shouldUseAgentV3(request)) {
        console.log('🚀 [MERVIN-CONVERSATIONAL] Detectada solicitud compleja, usando Modo Agente V3');
        const contractorProfile = await this.getCachedContractorProfile();
        return await processWithAgentV3(request, contractorProfile, this.authHeaders, this.baseURL || '');
      }
      
      // 4. Obtener perfil del contratista para contexto (con caché)
      const contractorProfile = await this.getCachedContractorProfile();
      
      // 5. Obtener herramientas disponibles según el modo
      const tools = mode === 'agent' ? getAllTools() : []; // Chat mode: sin herramientas
      
      // 6. Obtener prompt del sistema según el modo
      let systemPrompt = mode === 'chat' ? MERVIN_CHAT_COPILOT_PROMPT : getMervinSystemPrompt(mode);
      
      // 7. Enriquecer prompt con contexto del contratista y página
      if (contractorProfile) {
        const contextInfo = `\n\n# PERFIL DEL CONTRATISTA\n\nPERFIL DEL CONTRATISTA:\n- Nombre del negocio: ${contractorProfile.companyName || 'No especificado'}\n- Especialidad: ${contractorProfile.businessType || 'No especificado'}\n- Ubicación: ${contractorProfile.city || ''}${contractorProfile.state ? ', ' + contractorProfile.state : ''}\n- Teléfono: ${contractorProfile.phone || 'No especificado'}\n- Email: ${contractorProfile.email || 'No especificado'}\n\nUSA ESTA INFORMACIÓN para:\n1. Identificarte como "asistente de ${contractorProfile.companyName || 'tu compañía'}"\n2. Personalizar respuestas según su especialidad\n3. NO pedir datos que ya tienes`;
        systemPrompt += contextInfo;
      }
      
      // 8. Agregar contexto de página si está disponible
      if (request.pageContext && request.pageContext.url) {
        const pageInfo = `\n\n# CONTEXTO DE PÁGINA\n\nCONTEXTO DE PÁGINA: ${request.pageContext.url}${request.pageContext.section ? '\nSECCIÓN: ' + request.pageContext.section : ''}${request.pageContext.action ? '\nACCIÓN: ' + request.pageContext.action : ''}\n\nUSA ESTE CONTEXTO para dar ayuda específica y relevante a lo que el usuario está haciendo AHORA.`;
        systemPrompt += pageInfo;
      }
      
      console.log('🎯 [MERVIN-CONVERSATIONAL] Mode:', mode.toUpperCase());
      console.log('👤 [MERVIN-CONVERSATIONAL] Contractor profile loaded:', !!contractorProfile);
      console.log('🔧 [MERVIN-CONVERSATIONAL] Tools available:', tools.length);
      
      // 6. Procesar turno de conversación con Claude
      const turn = await claudeEngine.processConversationTurn(
        state,
        enrichedInput,
        tools,
        systemPrompt
      );
      
      console.log('💬 [MERVIN-CONVERSATIONAL] Turn processed');
      console.log('   Assistant response:', turn.assistantResponse.substring(0, 100) + '...');
      console.log('   Tool calls:', turn.toolCalls?.length || 0);
      console.log('   Needs more info:', turn.needsMoreInfo);
      
      // 7. Si Claude llamó a herramientas, ejecutarlas (solo en modo agent)
      if (turn.toolCalls && turn.toolCalls.length > 0) {
        if (mode === 'agent') {
          return await this.handleToolCalls(state, turn, systemPrompt, startTime);
        } else {
          // En modo chat, no debería llamar herramientas, pero por si acaso
          console.warn('⚠️  [MERVIN-CONVERSATIONAL] Tool calls in chat mode ignored');
        }
      }
      
      // 8. Si Claude está pidiendo más información
      // NOTA: En modo CHAT, siempre devolvemos 'conversation' para que el frontend muestre la respuesta
      // Solo en modo AGENT usamos 'needs_more_info' para workflows complejos
      if (turn.needsMoreInfo && mode === 'agent') {
        return {
          type: 'needs_more_info',
          message: turn.assistantResponse,
          conversationId: state.conversationId,
          executionTime: Date.now() - startTime
        };
      }
      
      // 9. Respuesta conversacional simple
      return {
        type: 'conversation',
        message: turn.assistantResponse,
        conversationId: state.conversationId,
        executionTime: Date.now() - startTime
      };
      
    } catch (error: any) {
      console.error('❌ [MERVIN-CONVERSATIONAL] Error:', error.message);
      console.error('❌ [MERVIN-CONVERSATIONAL] Stack:', error.stack);
      
      // Determinar tipo de error
      let errorType = 'generic';
      if (error.message.includes('Herramienta no disponible') || error.message.includes('Tool not found')) {
        errorType = 'tool_not_found';
      } else if (error.message.includes('Error generando plan') || error.message.includes('PlanningError')) {
        errorType = 'planning_error';
      } else if (error.message.includes('timeout')) {
        errorType = 'timeout';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorType = 'auth_error';
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
        errorType = 'network_error';
      }
      
      // Obtener mensaje amigable
      const friendlyMessage = FriendlyErrorHandler.getFriendlyMessage({
        errorType,
        originalMessage: error.message,
        userInput: request.input
      });
      
      return {
        type: 'error',
        message: friendlyMessage,
        conversationId: request.conversationId || 'unknown',
        executionTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Manejar llamadas a herramientas (tool calls)
   */
  private async handleToolCalls(
    state: any,
    turn: ConversationTurn,
    systemPrompt: string,
    startTime: number
  ): Promise<MervinConversationalResponse> {
    console.log('🔧 [MERVIN-CONVERSATIONAL] Handling tool calls');
    
    const toolResults: Array<{ toolName: string; result: any }> = [];
    
    // Ejecutar cada tool call
    for (const toolCall of turn.toolCalls!) {
      console.log(`🔧 [MERVIN-CONVERSATIONAL] Executing tool: ${toolCall.toolName}`);
      
      // Validar parámetros
      const validation = validateToolParams(toolCall.toolName, toolCall.params);
      if (!validation.valid) {
        console.error('❌ [MERVIN-CONVERSATIONAL] Invalid parameters:', validation.errors);
        
        // Devolver error a Claude para que pida la información faltante
        toolResults.push({
          toolName: toolCall.toolName,
          result: {
            success: false,
            error: `Faltan parámetros: ${validation.errors.join(', ')}`
          }
        });
        continue;
      }
      
      // Ejecutar herramienta
      const result = await this.executeTool(toolCall.toolName, toolCall.params);
      
      toolResults.push({
        toolName: toolCall.toolName,
        result
      });
      
      // Guardar resultado en el estado
      conversationStateManager.setLastToolResult(state.conversationId, result);
    }
    
    console.log('✅ [MERVIN-CONVERSATIONAL] All tools executed');
    
    // Continuar conversación con Claude usando los resultados
    const continuationTurn = await claudeEngine.continueAfterToolExecution(
      state,
      toolResults,
      getAllTools(),
      systemPrompt
    );
    
    console.log('💬 [MERVIN-CONVERSATIONAL] Continuation turn processed');
    console.log('   Response:', continuationTurn.assistantResponse.substring(0, 100) + '...');
    
    // Determinar el tipo de respuesta basado en los resultados
    const hasWorkflowResult = toolResults.some(r => 
      r.result.workflowSessionId || r.result.success
    );
    
    return {
      type: hasWorkflowResult ? 'workflow_completed' : 'conversation',
      message: continuationTurn.assistantResponse,
      conversationId: state.conversationId,
      data: toolResults.length === 1 ? toolResults[0].result : toolResults,
      workflowSessionId: toolResults.find(r => r.result.workflowSessionId)?.result.workflowSessionId,
      executionTime: Date.now() - startTime
    };
  }
  
  /**
   * Ejecutar una herramienta específica
   */
  private async executeTool(toolName: string, params: any): Promise<any> {
    console.log(`🔧 [MERVIN-CONVERSATIONAL] Executing: ${toolName}`);
    console.log('   Params:', JSON.stringify(params, null, 2));
    
    try {
      switch (toolName) {
        case 'verify_property_ownership':
          // Usar el workflow completo en lugar del método directo
          return await this.workflowRunner.executeWorkflow({
            workflowId: 'property_verification',
            userId: this.userId,
            parameters: { address: params.address }
          });
          
        case 'create_estimate_workflow':
          return await this.workflowRunner.executeWorkflow({
            workflowId: 'estimate_wizard',
            userId: this.userId,
            parameters: params
          });
          
        case 'search_client':
          return await this.systemAPI.findClient(params.searchTerm);
          
        case 'create_client':
          return await this.systemAPI.createClient(params);
          
        case 'create_contract_workflow':
          return await this.workflowRunner.executeWorkflow({
            workflowId: 'contract_generator',
            userId: this.userId,
            parameters: params
          });
          
        case 'check_permits_workflow':
          return await this.workflowRunner.executeWorkflow({
            workflowId: 'permit_advisor',
            userId: this.userId,
            parameters: params
          });
          
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
      
    } catch (error: any) {
      console.error(`❌ [MERVIN-CONVERSATIONAL] Tool execution failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Procesar attachments (OCR)
   */
  private async processAttachments(
    userInput: string,
    attachments: Array<{ filename: string; mimeType: string; content: string }>
  ): Promise<string> {
    console.log(`📎 [MERVIN-CONVERSATIONAL] Processing ${attachments.length} attachment(s)`);
    
    let enrichedInput = userInput;
    
    for (const attachment of attachments) {
      // Solo procesar imágenes con OCR
      if (attachment.mimeType.startsWith('image/')) {
        console.log(`📷 [MERVIN-CONVERSATIONAL] Processing image: ${attachment.filename}`);
        
        try {
          const extractedText = await claudeEngine.processImageWithOCR(
            attachment.content,
            attachment.mimeType as any,
            'Extrae todo el texto de esta imagen. Si es un plano o documento de construcción, identifica medidas, materiales y especificaciones.'
          );
          
          enrichedInput += `\n\n[Texto extraído de ${attachment.filename}]:\n${extractedText}`;
          
          console.log(`✅ [MERVIN-CONVERSATIONAL] OCR completed for ${attachment.filename}`);
          
        } catch (error: any) {
          console.error(`❌ [MERVIN-CONVERSATIONAL] OCR failed for ${attachment.filename}:`, error.message);
          enrichedInput += `\n\n[No se pudo leer ${attachment.filename}]`;
        }
      }
    }
    
    return enrichedInput;
  }
  
  /**
   * Limpiar conversación
   */
  clearConversation(conversationId: string): void {
    conversationStateManager.clearConversation(conversationId);
    console.log(`🗑️ [MERVIN-CONVERSATIONAL] Cleared conversation: ${conversationId}`);
  }
  
  /**
   * Obtener resumen de conversación
   */
  getConversationSummary(conversationId: string): any {
    return conversationStateManager.getSummary(conversationId);
  }
  
  /**
   * ⚡ Obtener perfil del contratista con caché
   * Evita llamadas repetidas a la DB en cada mensaje
   */
  private async getCachedContractorProfile(): Promise<any> {
    const now = Date.now();
    
    // Si el cache es válido, retornarlo
    if (this.contractorProfileCache && (now - this.profileCacheTimestamp) < this.CACHE_TTL) {
      console.log('⚡ [MERVIN-CONVERSATIONAL] Using cached contractor profile');
      return this.contractorProfileCache;
    }
    
    // Si no, obtener perfil fresco y cachearlo
    console.log('🔄 [MERVIN-CONVERSATIONAL] Fetching fresh contractor profile');
    try {
      this.contractorProfileCache = await this.systemAPI.getContractorProfile();
      this.profileCacheTimestamp = now;
      return this.contractorProfileCache;
    } catch (error: any) {
      console.error('❌ [MERVIN-CONVERSATIONAL] Failed to fetch contractor profile:', error.message);
      return null;
    }
  }
}
