/**
 * MERVIN ORCHESTRATOR V2 - CEREBRO CENTRAL
 * 
 * Este es el orquestador central que coordina toda la arquitectura V2.
 * 
 * FLUJO DE EJECUCIÓN:
 * 1. Análisis rápido con ChatGPT (< 1 segundo)
 * 2. Decisión: ¿Conversación o Tarea Ejecutable?
 * 3. Si es conversación → ChatGPT responde
 * 4. Si es tarea → Extraer parámetros → Ejecutar → Claude responde
 * 5. Streaming de progreso en tiempo real
 */

import { ChatGPTService } from '../ai/ChatGPTService';
import { ClaudeService } from '../ai/ClaudeService';
import { AIRouter } from '../ai/AIRouter';
import { SystemAPIService } from '../services/SystemAPIService';
import { WebSearchService } from '../services/WebSearchService';
import { ProgressStreamService } from '../services/ProgressStreamService';
import { FileProcessorService } from '../services/FileProcessorService';
import { WorkflowEngine } from '../workflows/WorkflowEngine';
import { SystemAPIStepAdapter } from '../workflows/adapters/SystemAPIStepAdapter';
import { EstimateWorkflow } from '../workflows/definitions/EstimateWorkflow';
import { snapshotService, type UserSnapshot } from '../services/SnapshotService';
import { toolRegistry } from '../tools/ToolRegistry';
import { registerCoreTools } from '../tools/CoreTools';

import type {
  MervinRequest,
  MervinResponse,
  QuickAnalysis,
  TaskIntent,
  TaskResult,
  TaskType,
  EstimateParams,
  ContractParams,
  PermitParams,
  PropertyParams,
  FileAttachment
} from '../types/mervin-types';

// 📊 TELEMETRÍA Y MÉTRICAS PARA ROBUSTEZ
interface TelemetryEvent {
  type: 'workflow_fallback' | 'tool_execution' | 'error' | 'success';
  timestamp: Date;
  details: any;
}

class TelemetryService {
  private static events: TelemetryEvent[] = [];
  private static readonly MAX_EVENTS = 1000;

  static log(type: TelemetryEvent['type'], details: any) {
    const event: TelemetryEvent = { type, timestamp: new Date(), details };
    this.events.push(event);
    
    // Mantener solo los últimos 1000 eventos
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Logging estructurado según tipo
    switch (type) {
      case 'workflow_fallback':
        console.warn(`🔄 [TELEMETRY-FALLBACK] ${details.workflow} → ${details.tool}`);
        console.warn(`   Reason: ${details.reason}`);
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
      fallbacks: last24h.filter(e => e.type === 'workflow_fallback').length,
      errors: last24h.filter(e => e.type === 'error').length,
      successRate: last24h.filter(e => e.type === 'success').length / last24h.length
    };
  }
}

export class MervinOrchestrator {
  private chatgpt: ChatGPTService;
  private claude: ClaudeService;
  private aiRouter: AIRouter;
  private systemAPI: SystemAPIService;
  private webSearch: WebSearchService;
  private workflowEngine: WorkflowEngine;
  private progress: ProgressStreamService | null = null;
  private userId: string;
  private snapshot: UserSnapshot | null = null;

  constructor(userId: string, authHeaders: Record<string, string> = {}, baseURL?: string) {
    this.userId = userId;
    this.chatgpt = new ChatGPTService();
    this.claude = new ClaudeService();
    this.aiRouter = new AIRouter();
    this.systemAPI = new SystemAPIService(userId, authHeaders, baseURL);
    this.webSearch = new WebSearchService();
    this.workflowEngine = new WorkflowEngine();
    
    // Registrar workflows disponibles
    this.workflowEngine.registerWorkflow(EstimateWorkflow);
    
    // Registrar step adapters
    this.workflowEngine.registerStepAdapter(new SystemAPIStepAdapter());
    
    // Registrar herramientas principales (incluyendo baseURL)
    registerCoreTools(userId, authHeaders, baseURL);
    console.log('🔧 [MERVIN-ORCHESTRATOR] Tools registered:', toolRegistry.getAllTools().map(t => t.name));
  }

  /**
   * Configurar streaming de progreso
   */
  setProgressStream(progress: ProgressStreamService): void {
    this.progress = progress;
  }

  /**
   * MÉTODO PRINCIPAL - Procesar request del usuario
   */
  async process(request: MervinRequest): Promise<MervinResponse> {
    const startTime = Date.now();
    console.log('\n=================================');
    console.log('🤖 [MERVIN-V2] Procesando request');
    console.log('Input:', request.input);
    if (request.attachments?.length) {
      console.log(`📎 Archivos adjuntos: ${request.attachments.length}`);
    }
    console.log('=================================\n');

    try {
      // 🆕 PASO 0: Obtener snapshot del contexto del usuario
      // Esto permite a Mervin conocer historial, preferencias, etc ANTES de procesar
      this.progress?.sendMessage('📸 Loading your context...');
      this.snapshot = await snapshotService.getSnapshot(request.userId);
      
      console.log('📸 [SNAPSHOT] Contexto cargado:', {
        estimates: this.snapshot.estimates.total,
        contracts: this.snapshot.contracts.total,
        propertySearches: this.snapshot.searchHistory.properties.length,
        permitSearches: this.snapshot.searchHistory.permits.length
      });
      
      // Log del resumen para que AI pueda usarlo
      console.log(this.snapshot.contextSummary);

      // Generar contexto de archivos si existen
      let filesContext = '';
      if (request.attachments && request.attachments.length > 0) {
        const fileCount = request.attachments.length;
        
        this.progress?.sendMessage(`📎 Processing ${fileCount} file${fileCount > 1 ? 's' : ''}...`);
        const fileProcessor = new FileProcessorService();
        
        // Mensaje más específico según tipo de archivo
        const hasPDF = request.attachments.some(f => f.mimeType.includes('pdf'));
        const hasImage = request.attachments.some(f => f.mimeType.startsWith('image/'));
        const hasText = request.attachments.some(f => 
          f.mimeType.startsWith('text/') || 
          f.mimeType.includes('json') || 
          f.mimeType.includes('csv')
        );
        
        if (hasPDF) {
          this.progress?.sendMessage('📄 Reading PDF document...');
        } else if (hasImage) {
          this.progress?.sendMessage('🖼️ Analyzing image metadata...');
        } else if (hasText) {
          this.progress?.sendMessage('📝 Reading text content...');
        }
        
        filesContext = fileProcessor.generateFilesSummary(request.attachments);
        this.progress?.sendMessage('✅ Files processed successfully');
        console.log('📎 [FILES] Contexto generado:', filesContext.substring(0, 200));
      }

      // PASO 1: Análisis rápido con ChatGPT (incluir archivos)
      this.progress?.sendMessage('🔍 Analyzing your message...');
      const inputWithFiles = request.input + filesContext;
      const analysis = await this.analyzeInput(inputWithFiles);

      console.log('📊 [ANALYSIS]', analysis);

      // PASO 2: Decisión de flujo
      if (analysis.isWorkflow && analysis.workflowType) {
        // FLUJO DE WORKFLOW MULTI-PASO
        return await this.handleWorkflow(request, analysis, filesContext);
      } else if (analysis.isSimpleConversation) {
        // FLUJO CONVERSACIONAL
        return await this.handleConversation(request, analysis, filesContext);
      } else if (analysis.isExecutableTask) {
        // FLUJO DE TAREA EJECUTABLE
        return await this.handleExecutableTask(request, analysis, filesContext);
      } else {
        // FLUJO DE CONSULTA COMPLEJA
        return await this.handleComplexQuery(request, analysis, filesContext);
      }

    } catch (error: any) {
      console.error('❌ [MERVIN-V2] Error:', error);
      
      this.progress?.sendError(error.message);

      return {
        type: 'TASK_ERROR',
        message: `Disculpa primo, hubo un error: ${error.message}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  // ============= FLUJOS PRINCIPALES =============

  /**
   * Flujo: Conversación Simple
   */
  private async handleConversation(
    request: MervinRequest,
    analysis: QuickAnalysis,
    filesContext: string = ''
  ): Promise<MervinResponse> {
    try {
      this.progress?.sendMessage('💬 Crafting response...');

      const inputWithFiles = request.input + filesContext;
      const response = await this.chatgpt.generateResponse(
        inputWithFiles,
        request.conversationHistory
      );

      this.progress?.sendComplete(response);

      return {
        type: 'CONVERSATION',
        message: response,
        executionTime: Date.now() - Date.now()
      };
    } catch (error: any) {
      console.error('❌ [CONVERSATION-ERROR]:', error.message);
      this.progress?.sendError(`Error generating response: ${error.message}`);
      throw error;
    }
  }

  /**
   * Flujo: Tarea Ejecutable - CON TOOL REGISTRY Y SLOT-FILLING
   */
  private async handleExecutableTask(
    request: MervinRequest,
    analysis: QuickAnalysis,
    filesContext: string = ''
  ): Promise<MervinResponse> {
    const taskType = analysis.taskType!;
    const startTime = Date.now();
    
    try {
      // PASO 1: Mapear taskType a tool name
      const toolName = this.mapTaskTypeToTool(taskType);
      const tool = toolRegistry.getTool(toolName);
      
      if (!tool) {
        throw new Error(`Tool not found: ${toolName} for task ${taskType}`);
      }

      console.log(`🔧 [TOOL-EXECUTION] Using tool: ${toolName}`);

      // PASO 2: Extraer parámetros del input con ChatGPT
      this.progress?.sendMessage('📋 Extracting required information...');
      const inputWithFiles = request.input + filesContext;
      const rawParams = await this.chatgpt.extractParameters(inputWithFiles, taskType);

      console.log('📋 [RAW-PARAMS]', rawParams);

      // PASO 3: Ejecutar con ToolRegistry (incluye slot-filling automático)
      // ToolRegistry detectará parámetros faltantes y los inferirá del snapshot
      this.progress?.sendMessage(`🔍 Checking requirements...`);
      
      const toolStartTime = Date.now();
      const result = await toolRegistry.executeToolWithSnapshot(
        toolName,
        rawParams,
        this.snapshot!
      );
      const toolDuration = Date.now() - toolStartTime;

      console.log('✅ [TOOL-RESULT]', result);
      
      // 📊 TELEMETRÍA: Registrar ejecución de herramienta
      TelemetryService.log('tool_execution', {
        tool: toolName,
        duration: toolDuration,
        success: result.success,
        timestamp: new Date().toISOString()
      });

      // PASO 4: Si requiere confirmación, generar Action Card
      if (tool.requiresConfirmation && result.success) {
        this.progress?.sendMessage('⚠️ This action requires confirmation');
        
        const confirmationCard = this.generateConfirmationCard(tool, rawParams, result);
        
        return {
          type: 'NEEDS_CONFIRMATION',
          message: `Please confirm this ${taskType} action:`,
          data: {
            tool: toolName,
            params: rawParams,
            preview: result.data,
            confirmationCard
          },
          suggestedActions: ['Confirm', 'Cancel', 'Modify']
        };
      }

      // PASO 5: Si faltaron parámetros requeridos, pedir al usuario
      if (!result.success && result.error?.includes('Missing required parameter')) {
        const message = `I need more information: ${result.error}`;
        this.progress?.sendComplete(message);
        
        return {
          type: 'NEEDS_MORE_INFO',
          message,
          suggestedActions: [result.error]
        };
      }

      // PASO 6: Si falló, reportar error
      if (!result.success) {
        throw new Error(result.error || 'Tool execution failed');
      }

      // PASO 7: Generar respuesta final profesional con Claude
      this.progress?.sendMessage('✨ Generating final response...');
      const taskResult: TaskResult = {
        success: true,
        data: result.data,
        executionTime: Date.now() - startTime,
        stepsCompleted: [],
        endpointsUsed: result.metadata?.endpointsUsed || []
      };

      const finalMessage = await this.claude.generateCompletionMessage(
        taskResult,
        analysis.language
      );

      this.progress?.sendComplete(finalMessage, result.data);

      return {
        type: 'TASK_COMPLETED',
        message: finalMessage,
        data: result.data,
        executionTime: Date.now() - startTime
      };

    } catch (error: any) {
      console.error(`❌ [EXECUTABLE-TASK-ERROR] ${taskType}:`, error.message);
      this.progress?.sendError(`Error executing ${taskType}: ${error.message}`);
      throw new Error(`Error ejecutando tarea ${taskType}: ${error.message}`);
    }
  }

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
   * Generar tarjeta de confirmación para acciones críticas
   */
  private generateConfirmationCard(tool: any, params: any, result: any) {
    return {
      type: 'action_confirmation',
      action: tool.name,
      title: `Confirm ${tool.name.replace('_', ' ')}`,
      description: tool.description,
      parameters: params,
      preview: result.data,
      warnings: tool.name === 'create_contract' ? 
        ['This will create a legally binding contract', 'Signature links will be sent to both parties'] : 
        []
    };
  }

  /**
   * Flujo: Consulta Compleja (requiere razonamiento profundo)
   */
  private async handleComplexQuery(
    request: MervinRequest,
    analysis: QuickAnalysis,
    filesContext: string = ''
  ): Promise<MervinResponse> {
    try {
      this.progress?.sendMessage('🧠 Deep analysis in progress...');

      // Usar Claude para razonamiento profundo (incluir archivos)
      const inputWithFiles = request.input + filesContext;
      const response = await this.claude.processComplexQuery(
        inputWithFiles,
        { conversationHistory: request.conversationHistory }
      );

      console.log('🧠 [CLAUDE-COMPLEX] Response:', response);

      this.progress?.sendComplete(response);

      return {
        type: 'CONVERSATION',
        message: response,
        executionTime: Date.now() - Date.now()
      };
    } catch (error: any) {
      console.error('❌ [COMPLEX-QUERY-ERROR]:', error.message);
      this.progress?.sendError(`Error processing query: ${error.message}`);
      throw error;
    }
  }

  /**
   * Flujo: Workflow Multi-Paso
   */
  private async handleWorkflow(
    request: MervinRequest,
    analysis: QuickAnalysis,
    filesContext: string = ''
  ): Promise<MervinResponse> {
    const workflowType = analysis.workflowType!;
    const startTime = Date.now();
    
    try {
      console.log(`🎬 [WORKFLOW] Starting workflow: ${workflowType}`);
      
      // 🛡️ VALIDACIÓN PREVENTIVA: Verificar que el workflow existe
      const availableWorkflows = ['estimate_wizard']; // Solo workflows registrados
      
      if (!availableWorkflows.includes(workflowType)) {
        console.warn(`⚠️ [WORKFLOW-FALLBACK] Workflow '${workflowType}' no existe`);
        console.log(`🔄 [WORKFLOW-FALLBACK] Intentando usar herramienta equivalente...`);
        
        // 🔄 FALLBACK INTELIGENTE: Mapear a herramienta equivalente
        const taskTypeFromWorkflow = this.mapWorkflowToTaskType(workflowType);
        
        if (taskTypeFromWorkflow) {
          console.log(`✅ [WORKFLOW-FALLBACK] Redirigiendo a task type: ${taskTypeFromWorkflow}`);
          
          // 📊 TELEMETRÍA: Registrar fallback
          TelemetryService.log('workflow_fallback', {
            workflow: workflowType,
            tool: taskTypeFromWorkflow,
            reason: `Workflow '${workflowType}' no existe en WorkflowEngine`,
            timestamp: new Date().toISOString()
          });
          
          // Crear un análisis modificado para usar el flujo de herramientas
          const modifiedAnalysis: QuickAnalysis = {
            ...analysis,
            isWorkflow: false,
            workflowType: null,
            isExecutableTask: true,
            taskType: taskTypeFromWorkflow
          };
          
          this.progress?.sendMessage(`🔧 Using optimized execution path...`);
          return await this.handleExecutableTask(request, modifiedAnalysis, filesContext);
        } else {
          // 📊 TELEMETRÍA: Registrar error
          TelemetryService.log('error', {
            operation: 'workflow_fallback',
            error: `No existe herramienta equivalente para workflow '${workflowType}'`
          });
          throw new Error(`Workflow '${workflowType}' no existe y no hay herramienta equivalente disponible`);
        }
      }
      
      this.progress?.sendMessage(`🎬 Iniciando workflow: ${workflowType}...`);

      // Extraer contexto inicial del input con ChatGPT
      const inputWithFiles = request.input + filesContext;
      const initialContext = await this.chatgpt.extractParameters(inputWithFiles, 'estimate');
      
      // Agregar userId al context (casting para agregar propiedad extra)
      (initialContext as any).userId = this.userId;
      
      console.log('📋 [WORKFLOW] Initial context extracted:', initialContext);

      // Configurar progress stream en el workflow engine
      if (this.progress) {
        this.workflowEngine = new WorkflowEngine(this.progress);
        this.workflowEngine.registerWorkflow(EstimateWorkflow);
        this.workflowEngine.registerStepAdapter(new SystemAPIStepAdapter());
      }

      // Iniciar workflow
      const session = await this.workflowEngine.startWorkflow({
        workflowId: workflowType,
        userId: this.userId,
        initialContext,
        conversationId: request.conversationHistory?.[0]?.content,
        aiModel: 'chatgpt-4o'
      });

      console.log(`✅ [WORKFLOW] Workflow session created: ${session.sessionId}`);

      // Verificar si está esperando input del usuario
      if (session.status === 'waiting_input' && session.pendingQuestion) {
        const message = session.pendingQuestion.question;
        this.progress?.sendComplete(message);
        
        return {
          type: 'NEEDS_MORE_INFO',
          message,
          data: {
            sessionId: session.sessionId,
            pendingFields: session.pendingQuestion.fields
          },
          suggestedActions: session.pendingQuestion.fields
        };
      }

      // Si se completó exitosamente
      if (session.status === 'completed') {
        const finalMessage = await this.claude.generateCompletionMessage(
          {
            success: true,
            data: session.result,
            executionTime: Date.now() - startTime,
            stepsCompleted: session.completedSteps.map(s => s.stepId),
            endpointsUsed: []
          },
          analysis.language
        );

        this.progress?.sendComplete(finalMessage, session.result);

        return {
          type: 'TASK_COMPLETED',
          message: finalMessage,
          data: session.result,
          executionTime: Date.now() - startTime
        };
      }

      // Si falló
      if (session.status === 'failed') {
        throw new Error(session.error?.message || 'Workflow failed');
      }

      // Estado inesperado
      throw new Error(`Unexpected workflow status: ${session.status}`);

    } catch (error: any) {
      console.error(`❌ [WORKFLOW-ERROR] ${workflowType}:`, error.message);
      this.progress?.sendError(`Error ejecutando workflow: ${error.message}`);
      throw new Error(`Error ejecutando workflow ${workflowType}: ${error.message}`);
    }
  }

  // ============= EJECUCIÓN DE TAREAS =============

  /**
   * Ejecutar tarea según su tipo
   */
  private async executeTask(taskType: TaskType, params: any): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      let result: any;

      switch (taskType) {
        case 'estimate':
          result = await this.executeEstimateTask(params as EstimateParams);
          break;
        
        case 'contract':
          result = await this.executeContractTask(params as ContractParams);
          break;
        
        case 'permit':
          result = await this.executePermitTask(params as PermitParams);
          break;
        
        case 'property':
          result = await this.executePropertyTask(params as PropertyParams);
          break;
        
        default:
          throw new Error(`Tipo de tarea no soportado: ${taskType}`);
      }

      return {
        success: true,
        data: { ...result, taskType },
        executionTime: Date.now() - startTime,
        stepsCompleted: result.steps || [],
        endpointsUsed: result.endpoints || []
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
        stepsCompleted: [],
        endpointsUsed: []
      };
    }
  }

  /**
   * Ejecutar: Crear Estimado
   */
  private async executeEstimateTask(params: EstimateParams): Promise<any> {
    const steps: string[] = [];

    // Paso 1: Crear estimado
    this.progress?.completeStep('Creating estimate...', 1, 3);
    const estimate = await this.systemAPI.createEstimate(params);
    steps.push('Estimate created');

    // Paso 2: Enviar email si se requiere
    if (params.sendEmail && params.clientEmail) {
      this.progress?.completeStep('Sending email...', 2, 3);
      await this.systemAPI.sendEstimateEmail(estimate.id, params.clientEmail);
      steps.push('Email sent');
    }

    this.progress?.completeStep('Estimate completed', 3, 3);

    return {
      estimate,
      steps,
      endpoints: ['/api/estimates', '/api/estimates/send']
    };
  }

  /**
   * Ejecutar: Crear Contrato
   */
  private async executeContractTask(params: ContractParams): Promise<any> {
    const steps: string[] = [];

    // Paso 1: Generar contenido del contrato con Claude
    this.progress?.completeStep('Generating legal contract...', 1, 3);
    const contractContent = await this.claude.generateContractContent(params);
    steps.push('Contract generated');

    // Paso 2: Crear contrato en el sistema
    this.progress?.completeStep('Saving contract...', 2, 3);
    const contract = await this.systemAPI.createContract(params, contractContent);
    steps.push('Contract saved');

    // Paso 3: Generar PDF
    this.progress?.completeStep('Generating PDF...', 3, 3);
    const pdf = await this.systemAPI.generateContractPDF(contract.id);
    steps.push('PDF generated');

    return {
      contract,
      pdf,
      steps,
      endpoints: ['/api/contracts', '/api/contracts/pdf']
    };
  }

  /**
   * Ejecutar: Consultar Permisos
   */
  private async executePermitTask(params: PermitParams): Promise<any> {
    const steps: string[] = [];

    // Consultar información de permisos
    this.progress?.completeStep('Checking required permits...', 1, 1);
    const permitInfo = await this.systemAPI.getPermitInfo(params);
    steps.push('Permits checked');

    return {
      permitInfo,
      steps,
      endpoints: ['/api/permits/check']
    };
  }

  /**
   * Ejecutar: Verificar Propiedad
   */
  private async executePropertyTask(params: PropertyParams): Promise<any> {
    const steps: string[] = [];

    // Verificar propiedad usando Atom
    this.progress?.completeStep('Verifying property with Atom...', 1, 1);
    const propertyData = await this.systemAPI.verifyProperty(params);
    steps.push('Property verified');

    return {
      propertyData,
      steps,
      endpoints: ['/api/property/details']
    };
  }

  // ============= HELPERS =============

  /**
   * Mapear workflow inexistente a task type equivalente
   */
  private mapWorkflowToTaskType(workflowType: string): TaskType | null {
    const mapping: Record<string, TaskType> = {
      'contract_generator': 'contract',
      'permit_advisor': 'permit',
      'property_verifier': 'property',
      'estimate_wizard': 'estimate'
    };
    
    return mapping[workflowType] || null;
  }

  /**
   * Análisis inicial rápido con ChatGPT
   */
  private async analyzeInput(input: string): Promise<QuickAnalysis> {
    // Obtener herramientas disponibles del ToolRegistry
    const availableTools = toolRegistry.getAllTools().map(t => 
      `${t.name}: ${t.description}`
    );
    
    return await this.chatgpt.analyzeQuick(input, availableTools);
  }

  /**
   * Validar parámetros extraídos
   */
  private validateParameters(params: any, taskType: TaskType): {
    isValid: boolean;
    missingFields: string[];
  } {
    const requiredFields = this.getRequiredFields(taskType);
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!params[field] || params[field] === null || params[field] === '') {
        missingFields.push(`- ${this.getFieldLabel(field)}`);
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Obtener campos requeridos por tipo de tarea
   */
  private getRequiredFields(taskType: TaskType): string[] {
    const fields: Record<string, string[]> = {
      estimate: ['clientName', 'clientEmail', 'projectType', 'dimensions'],
      contract: ['clientName', 'projectType', 'amount'],
      permit: ['projectType', 'projectAddress', 'projectScope'],
      property: ['address']
    };

    return fields[taskType] || [];
  }

  /**
   * Obtener label amigable para campo
   */
  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      clientName: 'Nombre del cliente',
      clientEmail: 'Email del cliente',
      projectType: 'Tipo de proyecto',
      dimensions: 'Dimensiones del proyecto',
      amount: 'Monto del contrato',
      projectAddress: 'Dirección del proyecto',
      projectScope: 'Alcance del proyecto',
      address: 'Dirección de la propiedad'
    };

    return labels[field] || field;
  }
}
