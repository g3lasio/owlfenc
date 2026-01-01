/**
 * WorkflowOrchestrator
 * 
 * Orquesta la ejecución de workflows multi-paso definidos en metadata de endpoints.
 */

import { WorkflowMetadata, WorkflowStepMetadata, ConditionalMetadata } from '../metadata/MetadataExtractor';
import axios from 'axios';

export interface WorkflowContext {
  [key: string]: any;
}

export interface WorkflowState {
  currentStepIndex: number;
  completed: boolean;
  context: WorkflowContext;
  stepResults: Record<string, any>;
  pendingUserInput?: {
    step: WorkflowStepMetadata;
    prompt: string;
    options?: any[];
  };
}

export interface WorkflowExecutionResult {
  success: boolean;
  completed: boolean;
  result?: any;
  nextStep?: {
    title: string;
    description: string;
    type: string;
    prompt: string;
    options?: any[];
  };
  error?: string;
}

export class WorkflowOrchestrator {
  private readonly MAX_STEPS = 20; // Límite de pasos para prevenir loops infinitos
  private readonly DEFAULT_TIMEOUT_MS = 60000; // 60 segundos

  /**
   * Inicia la ejecución de un workflow
   */
  async startWorkflow(
    workflow: WorkflowMetadata,
    initialContext: WorkflowContext = {}
  ): Promise<WorkflowState> {
    // Validar que el workflow no tenga demasiados pasos
    if (workflow.steps.length > this.MAX_STEPS) {
      throw new Error(`Workflow has too many steps (${workflow.steps.length}). Maximum allowed: ${this.MAX_STEPS}`);
    }

    console.log('[WORKFLOW-ORCHESTRATOR] Starting workflow with', workflow.steps.length, 'steps');

    return {
      currentStepIndex: 0,
      completed: false,
      context: initialContext,
      stepResults: {}
    };
  }

  /**
   * Ejecuta el siguiente paso del workflow
   */
  async executeNextStep(
    workflow: WorkflowMetadata,
    state: WorkflowState,
    userInput?: any,
    timeoutMs: number = this.DEFAULT_TIMEOUT_MS
  ): Promise<WorkflowExecutionResult> {
    // Crear promise con timeout
    return Promise.race([
      this._executeNextStepInternal(workflow, state, userInput),
      this._createTimeoutPromise(timeoutMs)
    ]);
  }

  /**
   * Crea una promise que rechaza después del timeout
   */
  private async _createTimeoutPromise(timeoutMs: number): Promise<WorkflowExecutionResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Workflow execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Implementación interna de executeNextStep
   */
  private async _executeNextStepInternal(
    workflow: WorkflowMetadata,
    state: WorkflowState,
    userInput?: any
  ): Promise<WorkflowExecutionResult> {
    // Verificar si el workflow ya está completado
    if (state.completed) {
      return {
        success: true,
        completed: true,
        result: state.stepResults
      };
    }

    // Obtener el paso actual
    const currentStep = workflow.steps[state.currentStepIndex];
    
    if (!currentStep) {
      // No hay más pasos, workflow completado
      state.completed = true;
      return {
        success: true,
        completed: true,
        result: state.stepResults
      };
    }

    console.log(`[WORKFLOW-ORCHESTRATOR] Executing step ${state.currentStepIndex + 1}/${workflow.steps.length}: ${currentStep.title}`);

    // Verificar condición si existe
    if (currentStep.conditional && !this.evaluateCondition(currentStep.conditional, state.context)) {
      console.log(`[WORKFLOW-ORCHESTRATOR] Step ${currentStep.title} skipped due to condition`);
      state.currentStepIndex++;
      return this._executeNextStepInternal(workflow, state, userInput);
    }

    // Ejecutar el paso según su tipo
    try {
      const result = await this.executeStep(currentStep, state, userInput);
      
      if (result.needsUserInput) {
        // El paso necesita input del usuario
        return {
          success: true,
          completed: false,
          nextStep: {
            title: currentStep.title,
            description: currentStep.description,
            type: currentStep.type,
            prompt: result.prompt,
            options: result.options
          }
        };
      }

      // Guardar resultado del paso
      state.stepResults[currentStep.id] = result.data;
      
      // Actualizar contexto
      if (result.data) {
        state.context = { ...state.context, ...result.data };
      }

      // Avanzar al siguiente paso
      state.currentStepIndex++;

      // Verificar que no excedamos el límite de pasos
      if (state.currentStepIndex >= this.MAX_STEPS) {
        throw new Error(`Workflow exceeded maximum steps limit (${this.MAX_STEPS})`);
      }

      // Ejecutar siguiente paso automáticamente si no necesita input
      return this._executeNextStepInternal(workflow, state);

    } catch (error: any) {
      console.error(`[WORKFLOW-ORCHESTRATOR] Error executing step ${currentStep.title}:`, error);
      return {
        success: false,
        completed: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Ejecuta un paso individual del workflow
   */
  private async executeStep(
    step: WorkflowStepMetadata,
    state: WorkflowState,
    userInput?: any
  ): Promise<{
    needsUserInput: boolean;
    prompt?: string;
    options?: any[];
    data?: any;
  }> {
    switch (step.type) {
      case 'input':
        return this.executeInputStep(step, state, userInput);
      
      case 'select':
        return this.executeSelectStep(step, state, userInput);
      
      case 'confirm':
        return this.executeConfirmStep(step, state, userInput);
      
      case 'execute':
        return this.executeExecuteStep(step, state);
      
      case 'transform':
        return this.executeTransformStep(step, state);
      
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Ejecuta un paso de tipo 'input' (solicita texto del usuario)
   */
  private async executeInputStep(
    step: WorkflowStepMetadata,
    state: WorkflowState,
    userInput?: any
  ): Promise<any> {
    if (!userInput) {
      // Necesita input del usuario
      return {
        needsUserInput: true,
        prompt: step.description
      };
    }

    // Validar input si hay validación definida
    if (step.validation) {
      const validation = this.validateInput(userInput, step.validation);
      if (!validation.valid) {
        throw new Error(`Invalid input: ${validation.error}`);
      }
    }

    return {
      needsUserInput: false,
      data: { [step.id]: userInput }
    };
  }

  /**
   * Ejecuta un paso de tipo 'select' (solicita selección del usuario)
   */
  private async executeSelectStep(
    step: WorkflowStepMetadata,
    state: WorkflowState,
    userInput?: any
  ): Promise<any> {
    // Obtener opciones
    let options = step.options || [];

    // Si hay un source para opciones dinámicas, obtenerlas
    if (step.optionsSource) {
      try {
        const response = await axios.get(step.optionsSource);
        options = response.data;
      } catch (error) {
        console.error(`[WORKFLOW-ORCHESTRATOR] Error fetching options from ${step.optionsSource}:`, error);
      }
    }

    if (!userInput) {
      // Necesita selección del usuario
      return {
        needsUserInput: true,
        prompt: step.description,
        options
      };
    }

    // Validar que la selección sea válida
    const validOption = options.find(opt => opt.value === userInput);
    if (!validOption) {
      throw new Error(`Invalid selection: ${userInput}`);
    }

    return {
      needsUserInput: false,
      data: { [step.id]: userInput }
    };
  }

  /**
   * Ejecuta un paso de tipo 'confirm' (solicita confirmación del usuario)
   */
  private async executeConfirmStep(
    step: WorkflowStepMetadata,
    state: WorkflowState,
    userInput?: any
  ): Promise<any> {
    if (userInput === undefined) {
      // Necesita confirmación del usuario
      return {
        needsUserInput: true,
        prompt: step.description,
        options: [
          { value: true, label: 'Yes' },
          { value: false, label: 'No' }
        ]
      };
    }

    return {
      needsUserInput: false,
      data: { [step.id]: userInput }
    };
  }

  /**
   * Ejecuta un paso de tipo 'execute' (ejecuta una acción)
   */
  private async executeExecuteStep(
    step: WorkflowStepMetadata,
    state: WorkflowState
  ): Promise<any> {
    // Por ahora, simplemente retorna el contexto actual
    // En una implementación real, ejecutaría una acción específica
    return {
      needsUserInput: false,
      data: { [step.id]: 'executed' }
    };
  }

  /**
   * Ejecuta un paso de tipo 'transform' (transforma datos)
   */
  private async executeTransformStep(
    step: WorkflowStepMetadata,
    state: WorkflowState
  ): Promise<any> {
    // Por ahora, simplemente retorna el contexto actual
    // En una implementación real, transformaría los datos según la configuración
    return {
      needsUserInput: false,
      data: { [step.id]: state.context }
    };
  }

  /**
   * Evalúa una condición
   */
  private evaluateCondition(condition: ConditionalMetadata, context: WorkflowContext): boolean {
    const fieldValue = context[condition.field];

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      
      case 'not_equals':
        return fieldValue !== condition.value;
      
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      
      default:
        return false;
    }
  }

  /**
   * Valida input del usuario
   */
  private validateInput(input: any, validation: any): { valid: boolean; error?: string } {
    // Validar mínimo
    if (validation.min !== undefined && input < validation.min) {
      return {
        valid: false,
        error: `Value must be at least ${validation.min}`
      };
    }

    // Validar máximo
    if (validation.max !== undefined && input > validation.max) {
      return {
        valid: false,
        error: `Value must be at most ${validation.max}`
      };
    }

    // Validar patrón
    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(String(input))) {
        return {
          valid: false,
          error: `Value does not match required pattern`
        };
      }
    }

    // Validar enum
    if (validation.enum && !validation.enum.includes(input)) {
      return {
        valid: false,
        error: `Value must be one of: ${validation.enum.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Cancela un workflow en ejecución
   */
  async cancelWorkflow(state: WorkflowState): Promise<void> {
    console.log('[WORKFLOW-ORCHESTRATOR] Workflow cancelled');
    state.completed = true;
    state.context = {};
    state.stepResults = {};
  }

  /**
   * Reinicia un workflow desde el principio
   */
  async restartWorkflow(workflow: WorkflowMetadata): Promise<WorkflowState> {
    console.log('[WORKFLOW-ORCHESTRATOR] Restarting workflow');
    return this.startWorkflow(workflow);
  }
}

// Exportar instancia singleton
export const workflowOrchestrator = new WorkflowOrchestrator();
