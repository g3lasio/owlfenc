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

export class MervinOrchestrator {
  private chatgpt: ChatGPTService;
  private claude: ClaudeService;
  private aiRouter: AIRouter;
  private systemAPI: SystemAPIService;
  private webSearch: WebSearchService;
  private progress: ProgressStreamService | null = null;

  constructor(userId: string, authHeaders: Record<string, string> = {}, baseURL?: string) {
    this.chatgpt = new ChatGPTService();
    this.claude = new ClaudeService();
    this.aiRouter = new AIRouter();
    this.systemAPI = new SystemAPIService(userId, authHeaders, baseURL);
    this.webSearch = new WebSearchService();
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
      if (analysis.isSimpleConversation) {
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
  }

  /**
   * Flujo: Tarea Ejecutable
   */
  private async handleExecutableTask(
    request: MervinRequest,
    analysis: QuickAnalysis,
    filesContext: string = ''
  ): Promise<MervinResponse> {
    const taskType = analysis.taskType!;
    
    try {
      // PASO 1: Extraer parámetros (incluir archivos)
      this.progress?.sendMessage('📋 Extracting required information...');
      const inputWithFiles = request.input + filesContext;
      const params = await this.chatgpt.extractParameters(inputWithFiles, taskType);

      console.log('📋 [PARAMS]', params);

      // PASO 2: Verificar si tenemos toda la información
      const validation = this.validateParameters(params, taskType);
      if (!validation.isValid) {
        return {
          type: 'NEEDS_MORE_INFO',
          message: `I need more information:\n${validation.missingFields.join('\n')}`,
          suggestedActions: validation.missingFields
        };
      }

      // PASO 3: Ejecutar tarea
      this.progress?.sendMessage(`⚙️ Executing task: ${taskType}...`);
      const taskResult = await this.executeTask(taskType, params);

      console.log('✅ [TASK-RESULT]', taskResult);

      // PASO 4: Generar respuesta final profesional con Claude
      this.progress?.sendMessage('✨ Generating final response...');
      const finalMessage = await this.claude.generateCompletionMessage(
        taskResult,
        analysis.language
      );

      this.progress?.sendComplete(finalMessage, taskResult.data);

      return {
        type: 'TASK_COMPLETED',
        message: finalMessage,
        data: taskResult.data,
        executionTime: taskResult.executionTime
      };

    } catch (error: any) {
      throw new Error(`Error ejecutando tarea ${taskType}: ${error.message}`);
    }
  }

  /**
   * Flujo: Consulta Compleja (requiere razonamiento profundo)
   */
  private async handleComplexQuery(
    request: MervinRequest,
    analysis: QuickAnalysis,
    filesContext: string = ''
  ): Promise<MervinResponse> {
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
   * Análisis inicial rápido con ChatGPT
   */
  private async analyzeInput(input: string): Promise<QuickAnalysis> {
    return await this.chatgpt.analyzeQuick(input);
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
