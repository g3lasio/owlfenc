/**
 * TASK ORCHESTRATOR - COORDINADOR DE TAREAS AUTÓNOMAS
 * 
 * Ejecuta planes de tareas de forma autónoma, coordinando múltiples endpoints
 * y proporcionando feedback en tiempo real sobre el progreso.
 * 
 * Responsabilidades:
 * - Ejecución secuencial y paralela de tareas
 * - Coordinación de múltiples endpoints
 * - Manejo de errores y recovery automático
 * - Feedback en tiempo real de progreso
 * - Gestión de permisos y validaciones
 */

import { UserIntention, TaskExecutionPlan, TaskStep } from './IntentionEngine';
import { EndpointCoordinator } from '../services/EndpointCoordinator';
import { ContextManager } from './ContextManager';
import { AgentMemory } from '../services/AgentMemory';
import { TaskResult } from './MervinAgent';

export interface OrchestratorConfig {
  endpointCoordinator: EndpointCoordinator;
  contextManager: ContextManager;
  agentMemory: AgentMemory;
  config: any;
}

export interface StepResult {
  stepId: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  retryCount: number;
}

export interface TaskProgress {
  currentStep: number;
  totalSteps: number;
  currentStepName: string;
  progress: number;
  estimatedTimeRemaining: number;
  completedSteps: StepResult[];
  errors: string[];
}

export class TaskOrchestrator {
  private endpointCoordinator: EndpointCoordinator;
  private contextManager: ContextManager;
  private agentMemory: AgentMemory;
  private config: any;
  private currentTask: TaskExecutionPlan | null = null;
  private isExecuting = false;
  private shouldInterrupt = false;
  private progressCallbacks: ((progress: TaskProgress) => void)[] = [];

  constructor(config: OrchestratorConfig) {
    this.endpointCoordinator = config.endpointCoordinator;
    this.contextManager = config.contextManager;
    this.agentMemory = config.agentMemory;
    this.config = config.config;
  }

  /**
   * Ejecutar tarea basada en intención del usuario
   */
  async executeTask(intention: UserIntention): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      // 1. Generar plan de ejecución
      const plan = await this.generateExecutionPlan(intention);
      
      if (this.config.config.debug) {
        console.log('📋 [TASK-ORCHESTRATOR] Plan generado:', plan);
      }

      // 2. Validar permisos
      const permissionValid = await this.validatePermissions(plan);
      if (!permissionValid) {
        return {
          success: false,
          error: 'Permisos insuficientes para ejecutar esta tarea',
          executionTime: Date.now() - startTime,
          stepsCompleted: 0,
          endpointsUsed: []
        };
      }

      // 3. Ejecutar plan
      this.currentTask = plan;
      this.isExecuting = true;
      this.shouldInterrupt = false;

      const result = await this.executePlan(plan);

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        executionTime: Date.now() - startTime,
        stepsCompleted: result.completedSteps?.length || 0,
        endpointsUsed: this.extractEndpointsUsed(result.completedSteps || [])
      };

    } catch (error: unknown) {
      const errorDetails = {
        error,
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : 'Sin mensaje de error',
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined,
        errorCode: (error as any)?.code || undefined
      };
      
      console.error('❌ [TASK-ORCHESTRATOR] Error ejecutando tarea:', errorDetails);
      
      // Determinar mensaje de error más específico
      let errorMessage = 'Error desconocido en orquestador';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = 'Error no serializable';
        }
      }
      
      return {
        success: false,
        error: `Error en orquestador: ${errorMessage}`,
        executionTime: Date.now() - startTime,
        stepsCompleted: 0,
        endpointsUsed: []
      };
    } finally {
      this.isExecuting = false;
      this.currentTask = null;
      this.shouldInterrupt = false;
    }
  }

  /**
   * Generar plan de ejecución optimizado
   */
  private async generateExecutionPlan(intention: UserIntention): Promise<TaskExecutionPlan> {
    // Obtener plan base desde IntentionEngine
    const { IntentionEngine } = await import('./IntentionEngine');
    const intentionEngine = new IntentionEngine(this.config.config);
    const basePlan = await intentionEngine.generateExecutionPlan(intention);

    // Optimizar plan basado en memoria del agente
    const optimizedPlan = await this.agentMemory.optimizePlan(basePlan, intention);

    // Agregar contexto actual
    const context = await this.contextManager.getCurrentContext();
    optimizedPlan.steps = this.enrichStepsWithContext(optimizedPlan.steps, context);

    return optimizedPlan;
  }

  /**
   * Validar permisos para ejecutar el plan
   */
  private async validatePermissions(plan: TaskExecutionPlan): Promise<boolean> {
    try {
      // Obtener permisos del usuario
      const userPermissions = await this.contextManager.getUserPermissions();
      
      // Verificar cada permiso requerido
      for (const permission of plan.requiredPermissions) {
        if (!userPermissions[permission]) {
          console.warn('⚠️ [PERMISSION-CHECK] Permiso faltante:', permission);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ [PERMISSION-CHECK] Error validando permisos:', error);
      return false;
    }
  }

  /**
   * Ejecutar plan de tareas
   */
  private async executePlan(plan: TaskExecutionPlan): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    completedSteps?: StepResult[];
  }> {
    const completedSteps: StepResult[] = [];
    const stepResults: Record<string, any> = {};
    let finalData: any = null;

    try {
      // Ejecutar pasos secuencialmente
      for (let i = 0; i < plan.steps.length; i++) {
        if (this.shouldInterrupt) {
          break;
        }

        const step = plan.steps[i];
        
        // Verificar dependencias
        const dependenciesMet = this.checkDependencies(step, completedSteps);
        if (!dependenciesMet) {
          throw new Error(`Dependencias no cumplidas para paso: ${step.name}`);
        }

        // Actualizar progreso
        this.updateProgress(i, plan.steps, step.name, completedSteps);

        // Ejecutar paso
        const stepResult = await this.executeStep(step, stepResults);
        completedSteps.push(stepResult);

        if (stepResult.success) {
          stepResults[step.id] = stepResult.data;
          
          // Si es el último paso, usar su data como resultado final
          if (i === plan.steps.length - 1) {
            finalData = stepResult.data;
          }
        } else if (step.required) {
          // Si el paso es requerido y falló, intentar recovery
          const retryResult = await this.retryStep(step, stepResults);
          if (!retryResult.success) {
            throw new Error(`Paso crítico falló: ${step.name} - ${stepResult.error}`);
          }
          stepResults[step.id] = retryResult.data;
        }
      }

      // Progreso final
      this.updateProgress(plan.steps.length, plan.steps, 'Completado', completedSteps);

      return {
        success: true,
        data: finalData,
        completedSteps
      };

    } catch (error) {
      console.error('❌ [EXECUTE-PLAN] Error:', error);
      
      return {
        success: false,
        error: (error as Error).message,
        completedSteps
      };
    }
  }

  /**
   * Ejecutar un paso individual
   */
  private async executeStep(step: TaskStep, previousResults: Record<string, any>): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      if (this.config.config.debug) {
        console.log(`🔄 [EXECUTING-STEP] ${step.name}`, step);
      }

      let result: any;

      if (step.endpoint) {
        // Preparar parámetros con resultados previos
        const enrichedParams = this.enrichParameters(step.parameters, previousResults);
        
        // Ejecutar endpoint
        result = await this.endpointCoordinator.executeEndpoint(
          step.endpoint,
          enrichedParams
        );
      } else {
        // Paso sin endpoint (ej: validaciones, transformaciones)
        result = await this.executeInternalStep(step, previousResults);
      }

      return {
        stepId: step.id,
        success: true,
        data: result,
        duration: Date.now() - startTime,
        retryCount: 0
      };

    } catch (error) {
      console.error(`❌ [STEP-ERROR] ${step.name}:`, error);
      
      return {
        stepId: step.id,
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
        retryCount: 0
      };
    }
  }

  /**
   * Reintentar paso fallido
   */
  private async retryStep(step: TaskStep, previousResults: Record<string, any>): Promise<StepResult> {
    const maxRetries = 2;
    
    for (let retry = 1; retry <= maxRetries; retry++) {
      await this.delay(1000 * retry); // Backoff exponencial
      
      const result = await this.executeStep(step, previousResults);
      result.retryCount = retry;
      
      if (result.success) {
        return result;
      }
    }

    return {
      stepId: step.id,
      success: false,
      error: `Falló después de ${maxRetries} reintentos`,
      duration: 0,
      retryCount: maxRetries
    };
  }

  /**
   * Ejecutar paso interno (sin endpoint)
   */
  private async executeInternalStep(step: TaskStep, previousResults: Record<string, any>): Promise<any> {
    switch (step.id) {
      case 'general_response':
        return {
          message: 'Información general proporcionada',
          type: 'general',
          data: step.parameters
        };
        
      default:
        return {
          message: `Paso ${step.name} completado`,
          stepId: step.id,
          parameters: step.parameters
        };
    }
  }

  /**
   * Verificar dependencias de un paso
   */
  private checkDependencies(step: TaskStep, completedSteps: StepResult[]): boolean {
    if (!step.dependsOn || step.dependsOn.length === 0) {
      return true;
    }

    const completedIds = completedSteps
      .filter(s => s.success)
      .map(s => s.stepId);

    return step.dependsOn.every(dep => completedIds.includes(dep));
  }

  /**
   * Enriquecer parámetros con resultados previos
   */
  private enrichParameters(parameters: Record<string, any>, previousResults: Record<string, any>): Record<string, any> {
    const enriched = { ...parameters };

    // Agregar datos de pasos anteriores
    if (previousResults.validate_client) {
      enriched.clientData = previousResults.validate_client;
    }

    if (previousResults.select_estimate) {
      enriched.estimateData = previousResults.select_estimate;
    }

    return enriched;
  }

  /**
   * Enriquecer pasos con contexto actual
   */
  private enrichStepsWithContext(steps: TaskStep[], context: any): TaskStep[] {
    return steps.map(step => ({
      ...step,
      parameters: {
        ...step.parameters,
        context: context
      }
    }));
  }

  /**
   * Actualizar progreso y notificar callbacks
   */
  private updateProgress(
    currentStep: number,
    totalSteps: TaskStep[],
    currentStepName: string,
    completedSteps: StepResult[]
  ): void {
    const progress: TaskProgress = {
      currentStep,
      totalSteps: totalSteps.length,
      currentStepName,
      progress: (currentStep / totalSteps.length) * 100,
      estimatedTimeRemaining: this.calculateRemainingTime(currentStep, totalSteps),
      completedSteps,
      errors: completedSteps
        .filter(s => !s.success)
        .map(s => s.error || 'Error desconocido')
    };

    // Notificar callbacks
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('❌ [PROGRESS-CALLBACK] Error:', error);
      }
    });

    if (this.config.config.debug) {
      console.log('📊 [PROGRESS-UPDATE]', progress);
    }
  }

  /**
   * Calcular tiempo estimado restante
   */
  private calculateRemainingTime(currentStep: number, totalSteps: TaskStep[]): number {
    const remainingSteps = totalSteps.slice(currentStep);
    return remainingSteps.reduce((sum, step) => sum + step.estimatedDuration, 0);
  }

  /**
   * Extraer endpoints usados de los resultados
   */
  private extractEndpointsUsed(completedSteps: StepResult[]): string[] {
    // Esta lógica se podría mejorar manteniendo un registro más detallado
    return ['example-endpoint']; // Placeholder
  }

  /**
   * Registrar callback de progreso
   */
  onProgress(callback: (progress: TaskProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Interrumpir tarea actual
   */
  async interruptCurrentTask(): Promise<void> {
    if (this.isExecuting) {
      this.shouldInterrupt = true;
      console.log('⏹️ [TASK-ORCHESTRATOR] Interrupción solicitada');
    }
  }

  /**
   * Obtener capacidades disponibles
   */
  getAvailableCapabilities(): string[] {
    return [
      'estimates',
      'contracts',
      'permits',
      'property_verification',
      'payment_tracking',
      'analytics',
      'client_management',
      'material_management'
    ];
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.progressCallbacks = [];
    this.currentTask = null;
    this.isExecuting = false;
  }

  /**
   * Utilidad para delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}