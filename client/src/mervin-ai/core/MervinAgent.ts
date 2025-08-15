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
  private endpointCoordinator: EndpointCoordinator;
  private agentMemory: AgentMemory;
  private config: AgentConfig;
  private state: AgentState;

  constructor(config: AgentConfig) {
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
    }
  }

  /**
   * Método principal para procesar input del usuario
   * Analiza intenciones y ejecuta tareas autónomamente
   */
  async processUserInput(input: string, conversationHistory: any[]): Promise<TaskResult> {
    try {
      this.updateState({ isActive: true, lastActivity: new Date() });
      
      // 1. Analizar la intención del usuario
      const intention = await this.intentionEngine.analyzeUserInput(input, conversationHistory);
      
      if (this.config.debug) {
        console.log('🎯 [INTENTION-ANALYSIS]', intention);
      }

      // 2. Actualizar contexto con nueva información
      await this.contextManager.updateContext(input, intention);

      // 3. Generar y ejecutar plan de tareas
      const taskResult = await this.taskOrchestrator.executeTask(intention);

      // 4. Aprender de la ejecución para futuras mejoras
      await this.agentMemory.learnFromTask(intention, taskResult);

      // 5. Actualizar estado final
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
      
      this.updateState({ 
        isActive: false, 
        currentTask: null, 
        progress: 0,
        activeEndpoints: [],
        canInterrupt: true
      });

      return {
        success: false,
        error: `Error en el agente: ${(error as Error).message}`,
        executionTime: 0,
        stepsCompleted: 0,
        endpointsUsed: []
      };
    }
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