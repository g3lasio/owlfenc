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
import { getAllTools, validateToolParams } from '../tools/ClaudeToolDefinitions';
import type { WorkflowExecutionResult } from '../services/WorkflowRunner';

// ============= TYPES =============

export interface MervinConversationalRequest {
  input: string;
  userId: string;
  conversationId?: string;
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
  
  constructor(
    private userId: string,
    private authHeaders: Record<string, string> = {},
    private baseURL?: string
  ) {
    this.workflowRunner = new WorkflowRunner(userId, authHeaders, baseURL);
    this.systemAPI = new SystemAPIService(userId, authHeaders, baseURL);
    
    console.log('🤖 [MERVIN-CONVERSATIONAL] Initialized for user:', userId);
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
      
      // 3. Obtener herramientas disponibles
      const tools = getAllTools();
      
      // 4. Obtener prompt del sistema
      const systemPrompt = getMervinSystemPrompt();
      
      // 5. Procesar turno de conversación con Claude
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
      
      // 6. Si Claude llamó a herramientas, ejecutarlas
      if (turn.toolCalls && turn.toolCalls.length > 0) {
        return await this.handleToolCalls(state, turn, systemPrompt, startTime);
      }
      
      // 7. Si Claude está pidiendo más información
      if (turn.needsMoreInfo) {
        return {
          type: 'needs_more_info',
          message: turn.assistantResponse,
          conversationId: state.conversationId,
          executionTime: Date.now() - startTime
        };
      }
      
      // 8. Respuesta conversacional simple
      return {
        type: 'conversation',
        message: turn.assistantResponse,
        conversationId: state.conversationId,
        executionTime: Date.now() - startTime
      };
      
    } catch (error: any) {
      console.error('❌ [MERVIN-CONVERSATIONAL] Error:', error.message);
      
      return {
        type: 'error',
        message: `Disculpa primo, hubo un error: ${error.message}`,
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
}
