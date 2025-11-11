/**
 * MERVIN ORCHESTRATOR V3 - ARQUITECTURA REFACTORIZADA
 * 
 * CAMBIOS PRINCIPALES vs V2:
 * 1. Separación clara entre CHAT mode y AGENT mode
 * 2. Pipeline unificado con etapas claras
 * 3. Middleware de confirmaciones que funciona ANTES de ejecutar
 * 4. Validaciones estructurales además de análisis LLM
 * 5. Flujos consolidados (eliminadas redundancias)
 * 
 * PIPELINE UNIFICADO:
 * 1. Análisis (ChatGPT + validaciones)
 * 2. Validación de Modo (CHAT vs AGENT)
 * 3. Pre-ejecución (confirmaciones)
 * 4. Ejecución (solo si pasó todas las validaciones)
 * 5. Respuesta (ChatGPT para respuestas simples, Claude para razonamiento complejo)
 */

import { ChatGPTService } from '../ai/ChatGPTService';
import { ClaudeService } from '../ai/ClaudeService';
import { SystemAPIService } from '../services/SystemAPIService';
import { ProgressStreamService } from '../services/ProgressStreamService';
import { FileProcessorService } from '../services/FileProcessorService';
import { snapshotService, type UserSnapshot } from '../services/SnapshotService';
import { toolRegistry } from '../tools/ToolRegistry';
import { registerCoreTools } from '../tools/CoreTools';
import { ConfirmationMiddleware } from '../middleware/ConfirmationMiddleware';

import type {
  MervinRequest,
  MervinResponse,
  MervinMode,
  MERVIN_MODE_PRESETS,
  QuickAnalysis,
  TaskType
} from '../types/mervin-types';

// ============= TELEMETRÍA =============

interface TelemetryEvent {
  type: 'mode_validation' | 'confirmation_blocked' | 'tool_execution' | 'error' | 'success';
  timestamp: Date;
  details: any;
}

class TelemetryService {
  private static events: TelemetryEvent[] = [];
  private static readonly MAX_EVENTS = 1000;

  static log(type: TelemetryEvent['type'], details: any) {
    const event: TelemetryEvent = { type, timestamp: new Date(), details };
    this.events.push(event);
    
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    switch (type) {
      case 'mode_validation':
        console.log(`🔐 [TELEMETRY-MODE] ${details.mode} → ${details.decision}`);
        break;
      case 'confirmation_blocked':
        console.warn(`🚫 [TELEMETRY-BLOCK] ${details.tool}: ${details.reason}`);
        break;
      case 'tool_execution':
        console.log(`📊 [TELEMETRY-TOOL] ${details.tool} (${details.duration}ms)`);
        break;
      case 'error':
        console.error(`❌ [TELEMETRY-ERROR] ${details.operation}: ${details.error}`);
        break;
      case 'success':
        console.log(`✅ [TELEMETRY-SUCCESS] ${details.operation} (${details.duration}ms)`);
        break;
    }
  }

  static getMetrics() {
    const now = Date.now();
    const last24h = this.events.filter(e => now - e.timestamp.getTime() < 86400000);
    
    return {
      totalEvents: last24h.length,
      confirmationBlocks: last24h.filter(e => e.type === 'confirmation_blocked').length,
      errors: last24h.filter(e => e.type === 'error').length,
      successRate: last24h.filter(e => e.type === 'success').length / last24h.length
    };
  }
}

// ============= ORCHESTRATOR V3 =============

export class MervinOrchestratorV3 {
  private chatgpt: ChatGPTService;
  private claude: ClaudeService;
  private systemAPI: SystemAPIService;
  private progress: ProgressStreamService | null = null;
  private userId: string;
  private snapshot: UserSnapshot | null = null;

  constructor(userId: string, authHeaders: Record<string, string> = {}, baseURL?: string) {
    this.userId = userId;
    this.chatgpt = new ChatGPTService();
    this.claude = new ClaudeService();
    this.systemAPI = new SystemAPIService(userId, authHeaders, baseURL);
    
    // Registrar herramientas principales
    registerCoreTools(userId, authHeaders, baseURL);
    console.log('🔧 [MERVIN-V3] Tools registered:', toolRegistry.getAllTools().map(t => t.name));
  }

  /**
   * Configurar streaming de progreso
   */
  setProgressStream(progress: ProgressStreamService): void {
    this.progress = progress;
  }

  /**
   * ============= PIPELINE UNIFICADO =============
   * 
   * Este es el ÚNICO método público principal
   */
  async process(request: MervinRequest): Promise<MervinResponse> {
    const startTime = Date.now();
    
    console.log('\n===========================================');
    console.log('🤖 [MERVIN-V3] Processing request');
    console.log('Input:', request.input);
    console.log('Mode:', request.mode?.type || 'AGENT_SAFE (default)');
    console.log('===========================================\n');

    try {
      // Establecer modo por defecto si no se especificó
      const mode: MervinMode = request.mode || {
        type: 'AGENT',
        autoExecute: true,
        requireConfirmationFor: ['create_contract', 'delete_*', 'send_email']
      };

      // ETAPA 1: Cargar contexto del usuario
      this.progress?.sendMessage('📸 Loading your context...');
      this.snapshot = await snapshotService.getSnapshot(request.userId);
      console.log('📸 [SNAPSHOT] Context loaded');

      // ETAPA 2: Procesar archivos adjuntos
      const filesContext = await this.processAttachments(request.attachments || []);

      // ETAPA 3: Análisis con ChatGPT + Validaciones
      this.progress?.sendMessage('🔍 Analyzing your message...');
      const analysis = await this.analyzeWithValidation(request.input + filesContext, mode);
      console.log('📊 [ANALYSIS]', analysis);

      // ETAPA 4: Validación de Modo
      const modeDecision = this.validateAgainstMode(analysis, mode);
      TelemetryService.log('mode_validation', {
        mode: mode.type,
        decision: modeDecision.action,
        reason: modeDecision.reason
      });

      // ETAPA 5: Ejecución según decisión de modo
      return await this.executeBasedOnMode(request, analysis, mode, modeDecision, filesContext, startTime);

    } catch (error: any) {
      console.error('❌ [MERVIN-V3] Error:', error);
      this.progress?.sendError(error.message);
      
      TelemetryService.log('error', {
        operation: 'process',
        error: error.message
      });

      return {
        type: 'TASK_ERROR',
        message: `Disculpa primo, hubo un error: ${error.message}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  // ============= ETAPAS DEL PIPELINE =============

  /**
   * ETAPA 2: Procesar archivos adjuntos
   */
  private async processAttachments(attachments: any[]): Promise<string> {
    if (attachments.length === 0) return '';

    this.progress?.sendMessage(`📎 Processing ${attachments.length} file(s)...`);
    const fileProcessor = new FileProcessorService();
    const filesContext = fileProcessor.generateFilesSummary(attachments);
    this.progress?.sendMessage('✅ Files processed');
    
    return filesContext;
  }

  /**
   * ETAPA 3: Análisis con ChatGPT + Validaciones estructurales
   */
  private async analyzeWithValidation(input: string, mode: MervinMode): Promise<QuickAnalysis> {
    // Obtener herramientas disponibles
    const availableTools = toolRegistry.getAllTools().map(t => 
      `${t.name}: ${t.description}`
    );
    
    // Análisis con ChatGPT
    const analysis = await this.chatgpt.analyzeQuick(input, availableTools);
    
    // VALIDACIÓN ESTRUCTURAL 1: Si está en modo CHAT, no puede ser tarea ejecutable
    if (mode.type === 'CHAT' && analysis.isExecutableTask) {
      console.log('🔐 [VALIDATION] Overriding isExecutableTask → false (CHAT mode)');
      analysis.isExecutableTask = false;
      analysis.isSimpleConversation = true;
    }
    
    // VALIDACIÓN ESTRUCTURAL 2: Si la herramienta no existe, no es ejecutable
    if (analysis.isExecutableTask && analysis.taskType) {
      const toolName = this.mapTaskTypeToTool(analysis.taskType);
      const tool = toolRegistry.getTool(toolName);
      
      if (!tool) {
        console.warn(`⚠️ [VALIDATION] Tool '${toolName}' not found → forcing conversation`);
        analysis.isExecutableTask = false;
        analysis.isSimpleConversation = true;
      }
    }
    
    return analysis;
  }

  /**
   * ETAPA 4: Validar análisis contra el modo actual
   */
  private validateAgainstMode(analysis: QuickAnalysis, mode: MervinMode): {
    action: 'EXECUTE' | 'SUGGEST' | 'CONVERSATION';
    reason: string;
  } {
    // CASO 1: Es conversación simple → responder siempre
    if (analysis.isSimpleConversation && !analysis.isExecutableTask) {
      return {
        action: 'CONVERSATION',
        reason: 'Simple conversation detected'
      };
    }

    // CASO 2: Es tarea ejecutable
    if (analysis.isExecutableTask) {
      // En modo CHAT → solo sugerir
      if (mode.type === 'CHAT') {
        if (mode.suggestActionsInChatMode) {
          return {
            action: 'SUGGEST',
            reason: 'CHAT mode - can suggest but not execute'
          };
        } else {
          return {
            action: 'CONVERSATION',
            reason: 'CHAT mode - action suggestions disabled'
          };
        }
      }
      
      // En modo AGENT → ejecutar (con confirmaciones según configuración)
      return {
        action: 'EXECUTE',
        reason: 'AGENT mode - execute with confirmation checks'
      };
    }

    // CASO 3: Análisis complejo → conversación con razonamiento
    return {
      action: 'CONVERSATION',
      reason: 'Complex query requiring reasoning'
    };
  }

  /**
   * ETAPA 5: Ejecutar según decisión de modo
   */
  private async executeBasedOnMode(
    request: MervinRequest,
    analysis: QuickAnalysis,
    mode: MervinMode,
    modeDecision: { action: string; reason: string },
    filesContext: string,
    startTime: number
  ): Promise<MervinResponse> {
    switch (modeDecision.action) {
      case 'CONVERSATION':
        return await this.handleConversation(request, analysis, filesContext, startTime);
      
      case 'SUGGEST':
        return await this.handleSuggestAction(request, analysis, filesContext, startTime);
      
      case 'EXECUTE':
        return await this.handleExecuteTask(request, analysis, mode, filesContext, startTime);
      
      default:
        throw new Error(`Unknown mode decision: ${modeDecision.action}`);
    }
  }

  // ============= HANDLERS =============

  /**
   * HANDLER: Conversación (ChatGPT para simple, Claude para complejo)
   */
  private async handleConversation(
    request: MervinRequest,
    analysis: QuickAnalysis,
    filesContext: string,
    startTime: number
  ): Promise<MervinResponse> {
    try {
      this.progress?.sendMessage('💬 Thinking...');
      
      const inputWithFiles = request.input + filesContext;
      
      // Usar Claude si requiere razonamiento profundo
      let response: string;
      if (analysis.needsDeepThinking) {
        this.progress?.sendMessage('🧠 Deep analysis...');
        response = await this.claude.processComplexQuery(inputWithFiles, {
          conversationHistory: request.conversationHistory
        });
      } else {
        // Usar ChatGPT para conversaciones simples
        response = await this.chatgpt.generateResponse(
          inputWithFiles,
          request.conversationHistory
        );
      }

      console.log('📤 [ORCHESTRATOR-RESPONSE] Sending response, length:', response.length);
      console.log('📤 [ORCHESTRATOR-RESPONSE] Content preview:', response.substring(0, 200));
      this.progress?.sendComplete(response);

      // Log telemetry
      TelemetryService.log('success', {
        operation: 'conversation',
        model: analysis.needsDeepThinking ? 'Claude' : 'ChatGPT',
        duration: Date.now() - startTime
      });

      return {
        type: 'CONVERSATION',
        message: response,
        executionTime: Date.now() - startTime
      };
    } catch (error: any) {
      console.error('❌ [CONVERSATION-ERROR]:', error.message);
      throw error;
    }
  }

  /**
   * HANDLER: Sugerir acción (modo CHAT)
   */
  private async handleSuggestAction(
    request: MervinRequest,
    analysis: QuickAnalysis,
    filesContext: string,
    startTime: number
  ): Promise<MervinResponse> {
    try {
      const taskType = analysis.taskType!;
      const toolName = this.mapTaskTypeToTool(taskType);
      const tool = toolRegistry.getTool(toolName);
      
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      // Extraer parámetros
      const inputWithFiles = request.input + filesContext;
      const params = await this.chatgpt.extractParameters(inputWithFiles, taskType);

      // Generar sugerencia conversacional
      const suggestion = `I can help you ${tool.description.toLowerCase()}. Would you like me to do that?`;
      
      this.progress?.sendComplete(suggestion);

      // Log telemetry
      TelemetryService.log('success', {
        operation: 'suggest_action',
        tool: tool.name,
        duration: Date.now() - startTime
      });

      return {
        type: 'SUGGEST_ACTION',
        message: suggestion,
        suggestedAction: {
          toolName: tool.name,
          description: tool.description,
          params
        },
        suggestedActions: ['Yes, do it', 'No, just explain', 'Let me modify'],
        executionTime: Date.now() - startTime
      };
    } catch (error: any) {
      console.error('❌ [SUGGEST-ACTION-ERROR]:', error.message);
      throw error;
    }
  }

  /**
   * HANDLER: Ejecutar tarea (modo AGENT con confirmaciones)
   */
  private async handleExecuteTask(
    request: MervinRequest,
    analysis: QuickAnalysis,
    mode: MervinMode,
    filesContext: string,
    startTime: number
  ): Promise<MervinResponse> {
    const taskType = analysis.taskType!;
    
    try {
      // PASO 1: Obtener herramienta
      const toolName = this.mapTaskTypeToTool(taskType);
      const tool = toolRegistry.getTool(toolName);
      
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      console.log(`🔧 [TOOL-EXECUTION] Using tool: ${toolName}`);

      // PASO 2: Extraer parámetros
      this.progress?.sendMessage('📋 Extracting parameters...');
      const inputWithFiles = request.input + filesContext;
      const rawParams = await this.chatgpt.extractParameters(inputWithFiles, taskType);
      console.log('📋 [PARAMS]', rawParams);

      // PASO 3: ⚡ CONFIRMACIÓN MIDDLEWARE - Validar ANTES de ejecutar
      const confirmationCheck = ConfirmationMiddleware.checkRequiresConfirmation(tool, mode);
      
      if (confirmationCheck.requiresConfirmation) {
        TelemetryService.log('confirmation_blocked', {
          tool: toolName,
          reason: confirmationCheck.reason
        });
        
        // Generar solicitud de confirmación
        const confirmationRequest = ConfirmationMiddleware.generateConfirmationRequest(
          tool,
          rawParams,
          confirmationCheck
        );
        
        this.progress?.sendMessage('⚠️ Confirmation required');
        this.progress?.sendComplete(confirmationRequest.message);

        return {
          type: 'NEEDS_CONFIRMATION',
          message: confirmationRequest.message,
          data: {
            tool: toolName,
            params: rawParams,
            confirmationCard: confirmationRequest.confirmationCard
          },
          suggestedActions: ['Confirm', 'Cancel', 'Modify'],
          executionTime: Date.now() - startTime
        };
      }

      // PASO 4: Ejecutar herramienta (solo si NO requiere confirmación)
      this.progress?.sendMessage('⚡ Executing...');
      
      const toolStartTime = Date.now();
      const result = await toolRegistry.executeToolWithSnapshot(
        toolName,
        rawParams,
        this.snapshot!
      );
      const toolDuration = Date.now() - toolStartTime;

      console.log('✅ [TOOL-RESULT]', result);
      
      TelemetryService.log('tool_execution', {
        tool: toolName,
        duration: toolDuration,
        success: result.success
      });

      // PASO 5: Validar resultado
      if (!result.success) {
        if (result.error?.includes('Missing required parameter')) {
          this.progress?.sendComplete(result.error);
          return {
            type: 'NEEDS_MORE_INFO',
            message: `I need more information: ${result.error}`,
            suggestedActions: [result.error],
            executionTime: Date.now() - startTime
          };
        }
        throw new Error(result.error || 'Tool execution failed');
      }

      // PASO 6: Generar respuesta final con Claude (razonamiento complejo)
      this.progress?.sendMessage('✨ Generating response...');
      
      const finalMessage = await this.claude.generateCompletionMessage(
        {
          success: true,
          data: result.data,
          executionTime: Date.now() - startTime,
          stepsCompleted: [],
          endpointsUsed: result.metadata?.endpointsUsed || []
        },
        analysis.language
      );

      this.progress?.sendComplete(finalMessage, result.data);
      
      TelemetryService.log('success', {
        operation: 'execute_task',
        tool: toolName,
        duration: Date.now() - startTime
      });

      return {
        type: 'TASK_COMPLETED',
        message: finalMessage,
        data: result.data,
        executionTime: Date.now() - startTime
      };

    } catch (error: any) {
      console.error(`❌ [EXECUTE-TASK-ERROR] ${taskType}:`, error.message);
      this.progress?.sendError(`Error executing ${taskType}: ${error.message}`);
      throw error;
    }
  }

  // ============= HELPERS =============

  /**
   * Mapear taskType a nombre de herramienta
   */
  private mapTaskTypeToTool(taskType: TaskType): string {
    const mapping: Record<TaskType, string> = {
      'estimate': 'create_estimate',
      'contract': 'create_contract',
      'permit': 'get_permit_info',
      'property': 'verify_property',
      'conversation': 'conversation',
      'research': 'research'
    };
    
    return mapping[taskType] || taskType;
  }

  /**
   * Obtener métricas de telemetría
   */
  static getMetrics() {
    return TelemetryService.getMetrics();
  }
}
