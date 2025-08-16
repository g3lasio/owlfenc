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
      this.updateState({ isActive: true, lastActivity: new Date() });
      
      // 1. Procesar mensaje con motor conversacional
      const conversationResponse = await this.conversationEngine.processUserMessage(input);
      
      // 2. Analizar la intención del usuario
      const intention = await this.intentionEngine.analyzeUserInput(input, conversationHistory);
      
      if (this.config.debug) {
        console.log('🎯 [INTENTION-ANALYSIS]', intention);
        console.log('🗣️ [CONVERSATION-RESPONSE]', conversationResponse);
      }

      // 3. Actualizar contexto con nueva información
      await this.contextManager.updateContext(input, intention);

      // 4. 🛡️ VALIDAR PERMISOS CRÍTICOS antes de ejecutar
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

      // 5. Generar y ejecutar plan de tareas
      const taskResult = await this.taskOrchestrator.executeTask(intention);

      // 6. Adaptar respuesta con personalidad conversacional
      if (taskResult.data) {
        taskResult.data.conversationalResponse = this.conversationEngine.adaptTaskResponse(
          taskResult.data.response || 'Tarea completada',
          taskResult.success
        );
        taskResult.data.languageProfile = conversationResponse.languageProfile;
      }

      // 7. Aprender de la ejecución para futuras mejoras
      await this.agentMemory.learnFromTask(intention, taskResult);

      // 8. Actualizar estado final
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