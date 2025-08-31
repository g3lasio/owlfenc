/**
 * SMART TASK COORDINATOR - COORDINADOR DE TAREAS INTELIGENTE
 * 
 * Motor de coordinación autónomo que orquesta múltiples agentes para ejecutar
 * tareas complejas de forma inteligente y eficiente.
 * 
 * Características principales:
 * - Coordinación inteligente de múltiples agentes
 * - Ejecución paralela optimizada de tareas
 * - Toma de decisiones contextuales automática
 * - Recovery inteligente de errores
 * - Optimización basada en patrones aprendidos
 * 
 * REGLA CRÍTICA: Usa únicamente endpoints reales de agentes existentes
 */

import { UserIntention, TaskExecutionPlan } from './IntentionEngine';
import { TaskOrchestrator, OrchestratorConfig, TaskProgress } from './TaskOrchestrator';
import { EstimateTaskAgent } from '../tasks/EstimateTaskAgent';
import { ContractTaskAgent } from '../tasks/ContractTaskAgent';
import { PropertyTaskAgent } from '../tasks/PropertyTaskAgent';
import { PermitTaskAgent } from '../tasks/PermitTaskAgent';
import { EndpointCoordinator } from '../services/EndpointCoordinator';
import { ContextManager } from './ContextManager';
import { DatabaseAgentMemory as AgentMemory } from '../services/DatabaseAgentMemory';
import { PermissionValidator } from '../services/PermissionValidator';
import { TaskResult } from './MervinAgent';

export interface CoordinatorConfig {
  endpointCoordinator: EndpointCoordinator;
  contextManager: ContextManager;
  agentMemory: AgentMemory;
  config: any;
}

export interface ParallelTaskGroup {
  id: string;
  name: string;
  agents: string[];
  canRunParallel: boolean;
  dependencies: string[];
  estimatedDuration: number;
}

export interface IntelligentDecision {
  decision: string;
  reasoning: string;
  confidence: number;
  alternativeOptions: string[];
  riskAssessment: 'low' | 'medium' | 'high';
}

export interface CoordinationResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  agentsUsed: string[];
  parallelTasks: number;
  optimizationsApplied: string[];
  intelligentDecisions: IntelligentDecision[];
}

export class SmartTaskCoordinator {
  private taskOrchestrator: TaskOrchestrator;
  private estimateAgent: EstimateTaskAgent;
  private contractAgent: ContractTaskAgent;
  private propertyAgent: PropertyTaskAgent;
  private permitAgent: PermitTaskAgent;
  private contextManager: ContextManager;
  private agentMemory: any; // Compatible with both AgentMemory and DatabaseAgentMemory
  private permissionValidator: PermissionValidator;
  private config: any;
  
  // Estado de coordinación
  private activeTaskGroups: Map<string, ParallelTaskGroup> = new Map();
  private completedTasks: Map<string, any> = new Map();
  private intelligentDecisions: IntelligentDecision[] = [];

  constructor(config: CoordinatorConfig) {
    // Inicializar TaskOrchestrator base
    this.taskOrchestrator = new TaskOrchestrator({
      endpointCoordinator: config.endpointCoordinator,
      contextManager: config.contextManager,
      agentMemory: config.agentMemory,
      config: config.config
    });

    // 🔐 CRITICAL FIX: Inicializar PermissionValidator correctamente
    this.permissionValidator = new PermissionValidator(
      config.config.userId,
      config.config.subscriptionLevel || 'free'
    );

    // Inicializar agentes especializados con PermissionValidator válido
    this.estimateAgent = new EstimateTaskAgent({
      endpointCoordinator: config.endpointCoordinator,
      contextManager: config.contextManager,
      permissionValidator: this.permissionValidator
    });
    this.contractAgent = new ContractTaskAgent({
      endpointCoordinator: config.endpointCoordinator,
      contextManager: config.contextManager,
      permissionValidator: this.permissionValidator
    });
    this.propertyAgent = new PropertyTaskAgent({
      endpointCoordinator: config.endpointCoordinator,
      contextManager: config.contextManager,
      permissionValidator: this.permissionValidator
    });
    this.permitAgent = new PermitTaskAgent({
      endpointCoordinator: config.endpointCoordinator,
      contextManager: config.contextManager,
      permissionValidator: this.permissionValidator
    });

    this.contextManager = config.contextManager;
    this.agentMemory = config.agentMemory;
    this.config = config.config;

    if (config.config.debug) {
      console.log('🔐 [SMART-COORDINATOR] PermissionValidator inicializado correctamente para usuario:', config.config.userId);
    }
  }

  /**
   * Coordinación inteligente principal
   */
  async coordinateIntelligentExecution(intention: UserIntention): Promise<CoordinationResult> {
    const startTime = Date.now();
    const agentsUsed: string[] = [];
    const optimizationsApplied: string[] = [];
    this.intelligentDecisions = [];

    try {
      console.log('🤖 [SMART-COORDINATOR] Iniciando coordinación inteligente');

      // 1. Análisis inteligente de la tarea
      const taskAnalysis = await this.analyzeTaskIntelligently(intention);
      
      // 2. Toma de decisión inteligente sobre estrategia
      const strategy = await this.makeIntelligentStrategy(intention, taskAnalysis);
      
      // 3. Determinar si usar coordinación paralela o secuencial
      const coordinationMode = this.determineCoordinationMode(intention, strategy);
      
      let result: any;
      
      if (coordinationMode === 'parallel') {
        // Ejecución paralela inteligente
        result = await this.executeParallelCoordination(intention, strategy);
        optimizationsApplied.push('parallel_execution');
      } else if (coordinationMode === 'sequential') {
        // Ejecución secuencial con agentes especializados
        result = await this.executeSequentialCoordination(intention, strategy);
        optimizationsApplied.push('sequential_optimization');
      } else {
        // Fallback al TaskOrchestrator base
        result = await this.taskOrchestrator.executeTask(intention);
        optimizationsApplied.push('orchestrator_fallback');
      }

      // 4. Aplicar optimizaciones post-ejecución
      const optimizedResult = await this.applyPostExecutionOptimizations(result);
      optimizationsApplied.push('post_execution_optimization');

      // 5. Aprender de la ejecución
      await this.learnFromExecution(intention, optimizedResult, strategy);

      return {
        success: optimizedResult.success,
        data: optimizedResult.data,
        error: optimizedResult.error,
        executionTime: Date.now() - startTime,
        agentsUsed: this.extractAgentsUsed(strategy),
        parallelTasks: coordinationMode === 'parallel' ? this.activeTaskGroups.size : 0,
        optimizationsApplied,
        intelligentDecisions: this.intelligentDecisions
      };

    } catch (error) {
      console.error('❌ [SMART-COORDINATOR] Error en coordinación:', error);
      
      return {
        success: false,
        error: `Error en coordinación inteligente: ${(error as Error).message}`,
        executionTime: Date.now() - startTime,
        agentsUsed,
        parallelTasks: 0,
        optimizationsApplied,
        intelligentDecisions: this.intelligentDecisions
      };
    }
  }

  /**
   * Análisis inteligente de la tarea
   */
  private async analyzeTaskIntelligently(intention: UserIntention): Promise<any> {
    const analysis = {
      complexity: intention.complexity,
      primaryAgent: this.determinePrimaryAgent(intention),
      supportAgents: this.determineSupportAgents(intention),
      canParallelize: this.canTasksRunInParallel(intention),
      estimatedDuration: intention.estimatedSteps * 2000, // 2s por paso
      riskLevel: this.assessRiskLevel(intention),
      requiredData: this.extractRequiredData(intention)
    };

    console.log('🧠 [SMART-COORDINATOR] Análisis:', analysis);
    return analysis;
  }

  /**
   * Toma de decisión inteligente sobre estrategia
   */
  private async makeIntelligentStrategy(intention: UserIntention, analysis: any): Promise<any> {
    const decision: IntelligentDecision = {
      decision: '',
      reasoning: '',
      confidence: 0,
      alternativeOptions: [],
      riskAssessment: analysis.riskLevel
    };

    // Decisión basada en tipo de intención y complejidad
    if (intention.primary === 'estimate' && intention.complexity === 'complex') {
      decision.decision = 'multi_agent_parallel';
      decision.reasoning = 'Estimado complejo requiere múltiples agentes: estimado + propiedad + permisos';
      decision.confidence = 0.9;
      decision.alternativeOptions = ['single_agent_estimate', 'sequential_multi_agent'];
    } else if (intention.primary === 'contract' && analysis.canParallelize) {
      decision.decision = 'parallel_verification';
      decision.reasoning = 'Contrato requiere verificación paralela de propiedad y análisis legal';
      decision.confidence = 0.85;
      decision.alternativeOptions = ['sequential_verification'];
    } else if (intention.complexity === 'multi-step') {
      decision.decision = 'sequential_specialized';
      decision.reasoning = 'Tarea multi-paso requiere ejecución secuencial especializada';
      decision.confidence = 0.8;
      decision.alternativeOptions = ['orchestrator_fallback'];
    } else {
      decision.decision = 'single_agent';
      decision.reasoning = 'Tarea simple puede ser manejada por un agente especializado';
      decision.confidence = 0.95;
      decision.alternativeOptions = ['orchestrator_fallback'];
    }

    this.intelligentDecisions.push(decision);
    
    const strategy = {
      mode: decision.decision,
      primaryAgent: analysis.primaryAgent,
      supportAgents: analysis.supportAgents,
      executionOrder: this.planExecutionOrder(intention, analysis),
      optimizations: this.planOptimizations(intention, analysis)
    };

    console.log('🎯 [SMART-COORDINATOR] Estrategia:', strategy);
    return strategy;
  }

  /**
   * Determinar modo de coordinación
   */
  private determineCoordinationMode(intention: UserIntention, strategy: any): 'parallel' | 'sequential' | 'orchestrator' {
    if (strategy.mode === 'multi_agent_parallel' || strategy.mode === 'parallel_verification') {
      return 'parallel';
    } else if (strategy.mode === 'sequential_specialized') {
      return 'sequential';
    } else {
      return 'orchestrator';
    }
  }

  /**
   * Ejecución paralela coordinada
   */
  private async executeParallelCoordination(intention: UserIntention, strategy: any): Promise<any> {
    console.log('⚡ [SMART-COORDINATOR] Ejecutando coordinación paralela');

    const parallelTasks: Promise<any>[] = [];
    const taskResults: Record<string, any> = {};

    // Ejecutar agente primario
    if (strategy.primaryAgent) {
      parallelTasks.push(this.executeAgentTask(strategy.primaryAgent, intention).then(result => {
        taskResults[strategy.primaryAgent] = result;
        return result;
      }));
    }

    // Ejecutar agentes de soporte en paralelo
    for (const supportAgent of strategy.supportAgents) {
      parallelTasks.push(this.executeAgentTask(supportAgent, intention).then(result => {
        taskResults[supportAgent] = result;
        return result;
      }));
    }

    // Esperar a que todas las tareas paralelas completen
    const results = await Promise.allSettled(parallelTasks);

    // Consolidar resultados
    const consolidatedResult = await this.consolidateParallelResults(results, taskResults, intention);

    return consolidatedResult;
  }

  /**
   * Ejecución secuencial coordinada
   */
  private async executeSequentialCoordination(intention: UserIntention, strategy: any): Promise<any> {
    console.log('🔄 [SMART-COORDINATOR] Ejecutando coordinación secuencial');

    const executionResults: any[] = [];
    let finalResult: any = null;

    // Ejecutar en orden planificado
    for (const agentName of strategy.executionOrder) {
      const agentResult = await this.executeAgentTask(agentName, intention);
      executionResults.push(agentResult);

      // Si un paso crítico falla, determinar si continuar
      if (!agentResult.success && this.isCriticalAgent(agentName, intention)) {
        const shouldContinue = await this.makeRecoveryDecision(agentResult, intention);
        if (!shouldContinue) {
          break;
        }
      }

      // El último resultado exitoso es el resultado final
      if (agentResult.success) {
        finalResult = agentResult;
      }
    }

    return finalResult || executionResults[executionResults.length - 1];
  }

  /**
   * Ejecutar tarea en agente específico
   */
  private async executeAgentTask(agentName: string, intention: UserIntention): Promise<any> {
    switch (agentName) {
      case 'estimate':
        return await this.estimateAgent.processEstimateRequest({
          projectDescription: intention.parameters.description || '',
          clientData: intention.parameters.clientData || {},
          preferences: intention.parameters.preferences || {}
        });

      case 'contract':
        return await this.contractAgent.processContractRequest({
          clientData: intention.parameters.clientData || {},
          projectDetails: intention.parameters.projectDetails || {},
          paymentTerms: intention.parameters.paymentTerms || {}
        });

      case 'property':
        return await this.propertyAgent.processPropertyRequest({
          address: intention.parameters.address || '',
          verificationLevel: intention.parameters.verificationLevel || 'basic',
          includeOwnership: intention.parameters.includeOwnership || false
        });

      case 'permit':
        return await this.permitAgent.processPermitRequest({
          propertyAddress: intention.parameters.address || '',
          projectType: intention.parameters.projectType || '',
          projectDescription: intention.parameters.description || '',
          clientData: intention.parameters.clientData || {}
        });

      default:
        throw new Error(`Agente desconocido: ${agentName}`);
    }
  }

  /**
   * Consolidar resultados paralelos
   */
  private async consolidateParallelResults(
    results: PromiseSettledResult<any>[],
    taskResults: Record<string, any>,
    intention: UserIntention
  ): Promise<any> {
    const successfulResults = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<any>).value);
    const failedResults = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason);

    if (successfulResults.length === 0) {
      return {
        success: false,
        error: 'Todas las tareas paralelas fallaron',
        data: null
      };
    }

    // Consolidar datos inteligentemente basado en el tipo de intención
    let consolidatedData: any = {};

    if (intention.primary === 'estimate') {
      // Para estimados, el resultado principal viene del agente de estimados
      const estimateResult = taskResults['estimate'];
      consolidatedData = estimateResult?.data || {};
      
      // Enriquecer con datos de propiedad y permisos si están disponibles
      if (taskResults['property']?.success) {
        consolidatedData.propertyInfo = taskResults['property'].data;
      }
      if (taskResults['permit']?.success) {
        consolidatedData.permitInfo = taskResults['permit'].data;
      }
    } else {
      // Para otros tipos, usar el primer resultado exitoso como base
      consolidatedData = successfulResults[0]?.data || {};
    }

    return {
      success: true,
      data: consolidatedData,
      parallelResults: taskResults,
      successfulTasks: successfulResults.length,
      failedTasks: failedResults.length
    };
  }

  // Métodos auxiliares para toma de decisiones inteligentes

  private determinePrimaryAgent(intention: UserIntention): string {
    const intentionToAgent: Record<string, string> = {
      'estimate': 'estimate',
      'contract': 'contract',
      'property': 'property',
      'permit': 'permit'
    };
    
    return intentionToAgent[intention.primary] || 'estimate';
  }

  private determineSupportAgents(intention: UserIntention): string[] {
    const supportMap: Record<string, string[]> = {
      'estimate': ['property', 'permit'],
      'contract': ['property'],
      'property': [],
      'permit': ['property']
    };
    
    return supportMap[intention.primary] || [];
  }

  private canTasksRunInParallel(intention: UserIntention): boolean {
    return intention.complexity !== 'simple' && intention.estimatedSteps > 2;
  }

  private assessRiskLevel(intention: UserIntention): 'low' | 'medium' | 'high' {
    if (intention.complexity === 'multi-step') return 'high';
    if (intention.complexity === 'complex') return 'medium';
    return 'low';
  }

  private extractRequiredData(intention: UserIntention): string[] {
    const required: string[] = [];
    
    if (intention.parameters.clientData) required.push('client_data');
    if (intention.parameters.address) required.push('property_address');
    if (intention.parameters.description) required.push('project_description');
    
    return required;
  }

  private planExecutionOrder(intention: UserIntention, analysis: any): string[] {
    // Orden inteligente basado en dependencias
    const order: string[] = [analysis.primaryAgent];
    
    // Agregar agentes de soporte en orden de dependencia
    if (analysis.supportAgents.includes('property')) {
      order.push('property');
    }
    if (analysis.supportAgents.includes('permit')) {
      order.push('permit');
    }
    
    return order;
  }

  private planOptimizations(intention: UserIntention, analysis: any): string[] {
    const optimizations: string[] = [];
    
    if (analysis.canParallelize) optimizations.push('parallel_execution');
    if (analysis.riskLevel === 'low') optimizations.push('fast_track');
    if (intention.confidence > 0.8) optimizations.push('skip_confirmations');
    
    return optimizations;
  }

  private isCriticalAgent(agentName: string, intention: UserIntention): boolean {
    return agentName === this.determinePrimaryAgent(intention);
  }

  private async makeRecoveryDecision(failedResult: any, intention: UserIntention): Promise<boolean> {
    // Lógica simple de recovery - en el futuro podría ser más sofisticada
    return intention.complexity === 'simple'; // Solo continuar en tareas simples
  }

  private async applyPostExecutionOptimizations(result: any): Promise<any> {
    // Optimizaciones post-ejecución (ej: cachear resultados, comprimir datos)
    return result;
  }

  private async learnFromExecution(intention: UserIntention, result: any, strategy: any): Promise<void> {
    // Guardar patrones exitosos en AgentMemory para futuras optimizaciones
    if (result.success) {
      await this.agentMemory.storeSuccessfulInteraction({
        intention,
        strategy,
        result,
        timestamp: new Date().toISOString()
      });
    }
  }

  private extractAgentsUsed(strategy: any): string[] {
    const agents: string[] = [strategy.primaryAgent];
    if (strategy.supportAgents) {
      agents.push(...strategy.supportAgents);
    }
    return agents;
  }
}