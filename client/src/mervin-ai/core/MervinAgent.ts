/**
 * MERVIN AGENT - MOTOR PRINCIPAL DEL AGENTE AUTÓNOMO
 * 
 * Este es el núcleo del nuevo sistema de agente inteligente que coordina
 * todas las operaciones y toma decisiones autónomas basadas en intenciones del usuario.
 * 
 * Responsabilidades:
 * - Análisis de intenciones del usuario
 * - Coordinación de tareas complejas
 * - Gestión de estado global del agente
 * - Ejecución autónoma de workflows
 */

import { IntentionEngine } from './IntentionEngine';
import { TaskOrchestrator } from './TaskOrchestrator';
import { SmartTaskCoordinator } from './SmartTaskCoordinator';
import { ContextManager } from './ContextManager';
import { ConversationEngine } from './ConversationEngine';
import { EndpointCoordinator } from '../services/EndpointCoordinator';
import { AgentMemory } from '../services/AgentMemory';

export interface AgentConfig {
  userId: string;
  userPermissions: any;
  subscriptionLevel: string;
  debug: boolean;
}

export interface AgentState {
  isActive: boolean;
  currentTask: string | null;
  progress: number;
  estimatedTimeRemaining: number;
  activeEndpoints: string[];
  nextSteps: string[];
  canInterrupt: boolean;
  lastActivity: Date;
}

export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  stepsCompleted: number;
  endpointsUsed: string[];
}

export class MervinAgent {
  private intentionEngine: IntentionEngine;
  private taskOrchestrator: TaskOrchestrator;
  private contextManager: ContextManager;
  private conversationEngine: ConversationEngine;
  private endpointCoordinator: EndpointCoordinator;
  private agentMemory: AgentMemory;
  private config: AgentConfig;
  private state: AgentState;
  private handleExpiredSession: boolean = false;

  constructor(config: AgentConfig) {
    // 🛡️ VALIDACIÓN DE SEGURIDAD CRÍTICA - Sesiones y Permisos
    if (!config.userId || typeof config.userId !== 'string' || config.userId.trim() === '') {
      throw new Error('🚨 SECURITY: userId is required for agent initialization');
    }

    // Validar estado de autenticación
    if (config.userPermissions === null || config.subscriptionLevel === 'expired') {
      this.handleExpiredSession = true;
    }

    this.config = config;
    this.state = {
      isActive: false,
      currentTask: null,
      progress: 0,
      estimatedTimeRemaining: 0,
      activeEndpoints: [],
      nextSteps: [],
      canInterrupt: true,
      lastActivity: new Date()
    };

    // Inicializar componentes del agente
    this.intentionEngine = new IntentionEngine(config);
    this.contextManager = new ContextManager(config.userId);
    this.conversationEngine = new ConversationEngine(config.userId);
    this.endpointCoordinator = new EndpointCoordinator(config);
    this.agentMemory = new AgentMemory(config.userId);
    this.taskOrchestrator = new TaskOrchestrator({
      endpointCoordinator: this.endpointCoordinator,
      contextManager: this.contextManager,
      agentMemory: this.agentMemory,
      config: this.config
    });

    if (config.debug) {
      console.log('🤖 [MERVIN-AGENT] Agente inicializado para usuario:', config.userId);
      console.log('🗣️ [CONVERSATION-SYSTEM] Sistema conversacional inteligente activado');
      console.log('🌍 [LANGUAGE-DETECTION] Detección automática de idioma habilitada');
    }
  }

  /**
   * Determina si el input requiere ejecución autónoma de agentes
   */
  private requiresAutonomousExecution(input: string, taskType: string): boolean {
    // Palabras clave que indican tareas específicas que requieren agentes
    const autonomousKeywords = [
      'crear', 'generar', 'hacer', 'armar', 'calcular', 'preparar',
      'estimado', 'contrato', 'permiso', 'propiedad', 'verificar',
      'create', 'generate', 'make', 'calculate', 'estimate', 'contract'
    ];
    
    const lowerInput = input.toLowerCase();
    
    // Comandos slash siempre requieren ejecución autónoma
    if (lowerInput.startsWith('/')) return true;
    
    // Si el tipo de tarea ya no es conversación, requiere ejecución
    if (taskType !== 'conversation' && taskType !== 'general') return true;
    
    // Verificar palabras clave de tareas específicas
    const hasTaskKeywords = autonomousKeywords.some(keyword => lowerInput.includes(keyword));
    
    // Patrones que indican solicitudes específicas de acción
    const actionPatterns = [
      /\b(crear?|generar?|hacer|armar)\b.*\b(estimado|contrato)\b/i,
      /\bcuanto cuesta\b.*\b(cerca|construcción|proyecto)\b/i,
      /\b(verificar?|revisar)\b.*\b(propiedad|permiso)\b/i
    ];
    
    const hasActionPattern = actionPatterns.some(pattern => pattern.test(lowerInput));
    
    return hasTaskKeywords || hasActionPattern;
  }

  /**
   * Método principal para procesar input del usuario
   * Analiza intenciones y ejecuta tareas autónomamente con conversación inteligente
   */
  async processUserInput(input: string, conversationHistory: any[]): Promise<TaskResult> {
    // 🛡️ VERIFICACIÓN DE SESIÓN EXPIRADA
    if (this.handleExpiredSession) {
      const authMessage = this.conversationEngine.getCurrentLanguageProfile().language === 'spanish'
        ? 'Tu sesión ha expirado, primo. Necesitas volver a autenticarte para continuar.'
        : 'Your session has expired, dude. You need to re-authenticate to continue.';
      
      return {
        success: false,
        error: 'Session expired',
        data: {
          conversationalResponse: authMessage,
          requiresAuthentication: true
        },
        executionTime: 0,
        stepsCompleted: 0,
        endpointsUsed: []
      };
    }

    try {
      // 1. ANÁLISIS INTELIGENTE - Determinar si requiere capacidades autónomas
      const extractedTaskType = this.extractTaskType(input);
      const requiresAutonomousAction = this.requiresAutonomousExecution(input, extractedTaskType);
      
      if (!requiresAutonomousAction) {
        // Para conversaciones normales, usar solo motor conversacional
        if (this.config.debug) {
          console.log('💬 [CONVERSATION-MODE] Normal chat detected - using conversation engine only');
        }
        
        const conversationResponse = await this.conversationEngine.processUserMessage(input);
        this.updateState({ isActive: false, lastActivity: new Date() });
        
        return {
          success: true,
          data: {
            conversationalResponse: conversationResponse.message,
            languageProfile: conversationResponse.languageProfile,
            isConversational: true
          },
          executionTime: Date.now() - (this.state.lastActivity?.getTime() || 0),
          stepsCompleted: 1,
          endpointsUsed: []
        };
      }
      
      // Solo activar para tareas que requieren ejecución autónoma
      this.updateState({ isActive: true, lastActivity: new Date() });
      
      // 2. CONECTAR AL BACKEND REORGANIZADO FASE 2
      const backendRequest = {
        input: input,
        userId: this.config.userId,
        agentMode: 'executor',  // Usar 'executor' para tareas específicas
        conversationHistory: conversationHistory.slice(-5),
        subscriptionLevel: this.config.subscriptionLevel,
        requiresWebResearch: this.requiresResearch(input),
        taskType: extractedTaskType === 'conversation' ? 'general' : extractedTaskType,
        location: 'California'
      };

      if (this.config.debug) {
        console.log('🤖 [AUTONOMOUS-TASK] Task execution required:', extractedTaskType);
      }

      // Procesar con el backend unificado reorganizado
      let backendResponse: any = null;
      try {
        backendResponse = await this.endpointCoordinator.executeEndpoint('/api/mervin/process', backendRequest);
      } catch (error) {
        if (this.config.debug) {
          console.log('⚠️ [BACKEND-FALLBACK] Error conectando al backend reorganizado, usando local:', error);
        }
      }

      // 2. Procesar mensaje con motor conversacional local (como backup)
      const conversationResponse = await this.conversationEngine.processUserMessage(input);
      
      if (this.config.debug) {
        console.log('🗣️ [CONVERSATION-RESPONSE]', conversationResponse);
      }

      // 3. Si tenemos respuesta del backend reorganizado, usarla
      if (backendResponse && backendResponse.conversationalResponse) {
        if (this.config.debug) {
          console.log('✅ [BACKEND-INTEGRATED] Usando respuesta del backend reorganizado');
        }
        
        return {
          success: true,
          data: {
            conversationalResponse: backendResponse.conversationalResponse,
            languageProfile: backendResponse.languageProfile || conversationResponse.languageProfile,
            webResearchData: backendResponse.webResearchData,
            constructionKnowledge: backendResponse.constructionKnowledge,
            taskExecution: backendResponse.taskExecution,
            isBackendPowered: true
          },
          executionTime: Date.now() - (this.state.lastActivity?.getTime() || 0),
          stepsCompleted: backendResponse.stepsCompleted || 1,
          endpointsUsed: backendResponse.endpointsUsed || ['/api/mervin/process']
        };
      }

      // 2. CRÍTICO: Determinar si es conversación simple o requiere acción
      const isSimpleConversation = this.isSimpleConversationalMessage(input, conversationResponse);
      
      if (isSimpleConversation) {
        // ✅ CONVERSACIÓN SIMPLE - Solo usar ConversationEngine
        if (this.config.debug) {
          console.log('💬 [SIMPLE-CONVERSATION] Respondiendo solo con ConversationEngine');
        }

        this.updateState({ 
          isActive: false, 
          currentTask: null, 
          progress: 100,
          activeEndpoints: [],
          canInterrupt: true
        });

        return {
          success: true,
          data: {
            conversationalResponse: conversationResponse.message,
            languageProfile: conversationResponse.languageProfile,
            isConversational: true
          },
          executionTime: Date.now() - (this.state.lastActivity?.getTime() || 0),
          stepsCompleted: 1,
          endpointsUsed: []
        };
      }

      // 3. TAREA COMPLEJA - Usar análisis completo + TaskOrchestrator
      if (this.config.debug) {
        console.log('🤖 [COMPLEX-TASK] Requiere análisis de intención y ejecución');
      }

      // Analizar la intención del usuario para tareas complejas
      const intention = await this.intentionEngine.analyzeUserInput(input, conversationHistory);
      
      if (this.config.debug) {
        console.log('🎯 [INTENTION-ANALYSIS]', intention);
      }

      // 🧙‍♂️ FLUJO ESPECIAL: Estimate Wizard Conversacional
      if (extractedTaskType === 'estimate_wizard_conversational') {
        return await this.handleEstimateWizardConversational(input, conversationHistory);
      }

      // Actualizar contexto con nueva información
      await this.contextManager.updateContext(input, intention);

      // 🛡️ VALIDAR PERMISOS CRÍTICOS antes de ejecutar
      const permissionCheck = this.validateCriticalPermissions(input, intention);
      if (!permissionCheck.allowed) {
        return {
          success: false,
          error: 'Insufficient permissions',
          data: {
            conversationalResponse: permissionCheck.message,
            requiresUpgrade: true
          },
          executionTime: 0,
          stepsCompleted: 0,
          endpointsUsed: []
        };
      }

      // Generar y ejecutar plan de tareas
      const taskResult = await this.taskOrchestrator.executeTask(intention);

      // Adaptar respuesta con personalidad conversacional
      if (taskResult.data) {
        taskResult.data.conversationalResponse = this.conversationEngine.adaptTaskResponse(
          taskResult.data.response || 'Tarea completada',
          taskResult.success
        );
        taskResult.data.languageProfile = conversationResponse.languageProfile;
      }

      // Aprender de la ejecución para futuras mejoras
      await this.agentMemory.learnFromTask(intention, taskResult);

      // Actualizar estado final
      this.updateState({ 
        isActive: false, 
        currentTask: null, 
        progress: 100,
        activeEndpoints: [],
        canInterrupt: true
      });

      return taskResult;

    } catch (error) {
      console.error('❌ [MERVIN-AGENT] Error procesando input:', error);
      
      // Generar respuesta de error con personalidad
      const errorResponse = this.conversationEngine.getCurrentLanguageProfile().language === 'spanish'
        ? 'Lo siento, primo. Hubo un problemita, pero aquí andamos para resolverlo.'
        : 'Sorry about that, dude. Hit a little snag, but we\'ll get it sorted out.';

      this.updateState({ 
        isActive: false, 
        currentTask: null, 
        progress: 0,
        activeEndpoints: [],
        canInterrupt: true
      });

      return {
        success: false,
        error: errorResponse,
        data: {
          conversationalResponse: errorResponse,
          languageProfile: this.conversationEngine.getCurrentLanguageProfile()
        },
        executionTime: 0,
        stepsCompleted: 0,
        endpointsUsed: []
      };
    }
  }

  /**
   * Generar mensaje de bienvenida personalizado
   */
  getWelcomeMessage(isAgentMode: boolean = true): string {
    return this.conversationEngine.generateWelcomeMessage(isAgentMode);
  }

  /**
   * Obtener perfil de idioma actual
   */
  getCurrentLanguageProfile() {
    return this.conversationEngine.getCurrentLanguageProfile();
  }

  /**
   * Obtener historial conversacional
   */
  getConversationHistory() {
    return this.conversationEngine.getConversationHistory();
  }

  /**
   * Obtener resumen de conversación
   */
  getConversationSummary(): string {
    return this.conversationEngine.getConversationSummary();
  }

  /**
   * MÉTODOS DE INTEGRACIÓN CON BACKEND REORGANIZADO - FASE 2
   * 
   * Estos métodos ayudan al agente a determinar cuándo usar el backend 
   * reorganizado y qué tipo de procesamiento requiere el input del usuario.
   */
  
  /**
   * Determinar si el input requiere investigación web
   */
  private requiresResearch(input: string): boolean {
    const researchKeywords = [
      'precio', 'precios', 'costo', 'costos', 'cuanto', 'cuánto',
      'actualizado', 'actual', 'mercado', 'competencia', 'tendencia',
      'permiso', 'permisos', 'regulacion', 'regulación', 'código', 'códigos',
      'material', 'materiales', 'producto', 'productos', 'proveedor',
      'mano de obra', 'labor', 'salario', 'salarios', 'tarifa', 'tarifas',
      'licencia', 'certificación', 'normativa', 'ley', 'legal',
      'investigar', 'buscar', 'averiguar', 'verificar', 'confirmar',
      'web', 'internet', 'google', 'información', 'datos'
    ];
    
    const inputLower = input.toLowerCase();
    return researchKeywords.some(keyword => inputLower.includes(keyword));
  }

  /**
   * Extraer tipo de tarea del input del usuario
   */
  private extractTaskType(input: string): string {
    const inputLower = input.toLowerCase();
    
    // Detectar flujo conversacional especial del Estimate Wizard
    if (input.includes('ESTIMATE_WIZARD_START')) {
      return 'estimate_wizard_conversational';
    }
    
    // Patrones específicos para diferentes tipos de tareas
    if (inputLower.includes('estimado') || inputLower.includes('estimate') || 
        inputLower.includes('cotización') || inputLower.includes('quote')) {
      return 'estimate';
    }
    
    if (inputLower.includes('contrato') || inputLower.includes('contract') ||
        inputLower.includes('acuerdo') || inputLower.includes('agreement')) {
      return 'contract';
    }
    
    if (inputLower.includes('permiso') || inputLower.includes('permit') ||
        inputLower.includes('licencia') || inputLower.includes('license')) {
      return 'permit';
    }
    
    if (inputLower.includes('propiedad') || inputLower.includes('property') ||
        inputLower.includes('dirección') || inputLower.includes('address')) {
      return 'property';
    }
    
    if (inputLower.includes('cliente') || inputLower.includes('client') ||
        inputLower.includes('contacto') || inputLower.includes('contact')) {
      return 'client';
    }
    
    if (this.requiresResearch(input)) {
      return 'research';
    }
    
    // Default para conversación general
    return 'conversation';
  }

  /**
   * Determinar si es un mensaje conversacional simple que NO requiere TaskOrchestrator
   * CRÍTICO: Mensajes en español SIEMPRE van al backend para mantener personalidad mexicana norteña
   */
  private isSimpleConversationalMessage(input: string, conversationResponse: any): boolean {
    const normalizedInput = input.toLowerCase().trim();
    
    // 🇲🇽 DETECCIÓN DE ESPAÑOL - SIEMPRE usar backend para español
    const isSpanish = /[áéíóúñ]|hola|como|estas|que|para|con|por|desde|hasta|cuando|donde|porque|diferencia|primo|compadre|órale|bueno|gracias|adiós/i.test(input);
    
    if (isSpanish) {
      if (this.config.debug) {
        console.log('🇲🇽 [SPANISH-DETECTED] Enviando al backend para mantener personalidad mexicana norteña');
      }
      return false; // ¡NUNCA usar frontend para español!
    }
    
    // Patrones de conversación simple SOLO para inglés
    const conversationalPatterns = [
      // Saludos en inglés únicamente
      /^(hello|hi|hey|good morning|what's up)/i,
      
      // Preguntas simples en inglés
      /^(how are you)/i,
      
      // Agradecimientos en inglés
      /^(thank you|thanks)/i,
      
      // Despedidas en inglés
      /^(bye|goodbye|see you)/i,
      
      // Confirmaciones en inglés
      /^(ok|okay|yes|correct|understood)/i,
      
      // Preguntas sobre el sistema en inglés sin acción específica
      /^(who are you|what can you do)/i
    ];

    // Si coincide con patrones conversacionales simples EN INGLÉS
    const isSimplePattern = conversationalPatterns.some(pattern => pattern.test(normalizedInput));
    
    // Si es muy corto EN INGLÉS y no contiene palabras de acción específica
    const actionWords = ['create', 'generate', 'make', 'estimate', 'contract', 'permit'];
    const hasActionWords = actionWords.some(word => normalizedInput.includes(word));
    
    const isSimpleLength = normalizedInput.length < 50 && !hasActionWords && !isSpanish;
    
    if (this.config.debug) {
      console.log('🔍 [CONVERSATION-ANALYSIS]', {
        input: normalizedInput,
        isSpanish,
        isSimplePattern,
        isSimpleLength,
        hasActionWords,
        final: isSimplePattern || isSimpleLength
      });
    }
    
    return isSimplePattern || isSimpleLength;
  }

  /**
   * Obtener estado actual del agente
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Actualizar estado del agente
   */
  private updateState(updates: Partial<AgentState>): void {
    this.state = { ...this.state, ...updates };
    
    if (this.config.debug) {
      console.log('🔄 [AGENT-STATE-UPDATE]', updates);
    }
  }

  /**
   * Interrumpir tarea actual si es posible
   */
  async interruptCurrentTask(): Promise<boolean> {
    if (!this.state.canInterrupt) {
      return false;
    }

    try {
      await this.taskOrchestrator.interruptCurrentTask();
      this.updateState({ 
        isActive: false, 
        currentTask: null, 
        progress: 0,
        activeEndpoints: [],
        canInterrupt: true
      });
      return true;
    } catch (error) {
      console.error('❌ [MERVIN-AGENT] Error interrumpiendo tarea:', error);
      return false;
    }
  }

  /**
   * Obtener sugerencias proactivas basadas en contexto
   */
  async getProactiveSuggestions(): Promise<string[]> {
    try {
      const context = await this.contextManager.getCurrentContext();
      const suggestions = await this.agentMemory.predictUserNeeds(context);
      return suggestions.map(s => s.suggestedAction);
    } catch (error) {
      console.error('❌ [MERVIN-AGENT] Error obteniendo sugerencias:', error);
      return [];
    }
  }

  /**
   * Obtener capacidades disponibles basadas en permisos
   */
  getAvailableCapabilities(): string[] {
    return this.taskOrchestrator.getAvailableCapabilities();
  }

  /**
   * 🛡️ VALIDACIÓN DE PERMISOS CRÍTICOS
   */
  private validateCriticalPermissions(input: string, intention: any): { allowed: boolean; message: string } {
    const criticalActions = [
      'generar 1000 contratos',
      'acceder a base de datos',
      'enviar emails masivos',
      'modificar configuración',
      'actualizar mi plan',
      'ejecutar como administrador',
      'cambiar permisos'
    ];

    const inputLower = input.toLowerCase();
    const hasCriticalAction = criticalActions.some(action => inputLower.includes(action));

    if (hasCriticalAction) {
      // Verificar si el usuario tiene permisos suficientes
      const userFeatures = this.config.userPermissions?.features || [];
      const isBasicPlan = this.config.subscriptionLevel === 'basic' || this.config.subscriptionLevel === 'trial';
      
      if (isBasicPlan || !userFeatures.includes('all')) {
        const language = this.conversationEngine.getCurrentLanguageProfile().language;
        const message = language === 'spanish'
          ? 'Órale primo, esa función necesita un plan más chingón. ¿Te gustaría hacer upgrade para desbloquear todo el poder?'
          : 'Hey dude, that feature needs a higher plan. Want to upgrade to unlock the full power?';
        
        return { allowed: false, message };
      }
    }

    return { allowed: true, message: '' };
  }

  /**
   * 🧙‍♂️ MANEJAR FLUJO CONVERSACIONAL DEL ESTIMATE WIZARD
   * 
   * Este método maneja el flujo paso a paso del EstimatesWizard de forma conversacional
   * usando los endpoints reales sin inventar nada.
   */
  private async handleEstimateWizardConversational(input: string, conversationHistory: any[]): Promise<TaskResult> {
    try {
      if (this.config.debug) {
        console.log('🧙‍♂️ [ESTIMATE-WIZARD-CONVERSATIONAL] Iniciando flujo paso a paso');
      }

      // Respuesta inicial pidiendo información del cliente
      const stepOneMessage = this.conversationEngine.getCurrentLanguageProfile().language === 'spanish'
        ? `¡Órale primo! Te voy a ayudar a crear un estimado profesional paso a paso.

📋 **PASO 1: Información del Cliente**

Para empezar necesito los datos del cliente:

• **Nombre del cliente** (requerido)
• **Email** (opcional)  
• **Teléfono** (opcional)
• **Dirección del proyecto** (opcional)

¿Cómo se llama el cliente para este estimado?

*Tip: También puedes decir "usar cliente existente" si ya tienes clientes registrados.*`
        : `Alright dude! I'll help you create a professional estimate step by step.

📋 **STEP 1: Client Information**

To get started I need the client data:

• **Client name** (required)
• **Email** (optional)
• **Phone** (optional)
• **Project address** (optional)

What's the client's name for this estimate?

*Tip: You can also say "use existing client" if you have registered clients.*`;

      // Actualizar estado del agente
      this.updateState({ 
        isActive: true, 
        currentTask: 'estimate_wizard_step_1',
        progress: 16, // 1 de 6 pasos = ~16%
        activeEndpoints: [],
        canInterrupt: true
      });

      return {
        success: true,
        data: {
          conversationalResponse: stepOneMessage,
          languageProfile: this.conversationEngine.getCurrentLanguageProfile(),
          wizardStep: 1,
          nextAction: 'capture_client_info',
          isWizardFlow: true,
          stepDescription: 'Capturando información del cliente'
        },
        executionTime: 100,
        stepsCompleted: 1,
        endpointsUsed: []
      };

    } catch (error) {
      console.error('❌ [ESTIMATE-WIZARD-CONVERSATIONAL] Error iniciando flujo:', error);
      
      const errorMessage = this.conversationEngine.getCurrentLanguageProfile().language === 'spanish'
        ? 'Lo siento primo, hubo un problema iniciando el estimado. Inténtalo de nuevo.'
        : 'Sorry dude, there was an issue starting the estimate. Please try again.';

      return {
        success: false,
        error: 'Failed to start estimate wizard flow',
        data: {
          conversationalResponse: errorMessage,
          languageProfile: this.conversationEngine.getCurrentLanguageProfile()
        },
        executionTime: 0,
        stepsCompleted: 0,
        endpointsUsed: []
      };
    }
  }

  /**
   * Cleanup recursos del agente
   */
  dispose(): void {
    this.taskOrchestrator.dispose();
    this.contextManager.dispose();
    
    if (this.config.debug) {
      console.log('🗑️ [MERVIN-AGENT] Agente disposed');
    }
  }
}