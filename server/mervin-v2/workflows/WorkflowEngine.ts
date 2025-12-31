/**
 * WorkflowEngine
 * 
 * Motor principal de ejecución de workflows multi-paso.
 * 
 * Responsabilidades:
 * - Iniciar workflows
 * - Ejecutar pasos secuencialmente
 * - Manejar state management
 * - Emitir eventos de progreso
 * - Manejar errores y reintentos
 * - Solicitar input del usuario cuando falte información
 */

import { 
  WorkflowDefinition, 
  WorkflowSession, 
  WorkflowStep,
  WorkflowProgressEvent,
  WorkflowResult,
  StartWorkflowRequest,
  ResumeWorkflowRequest,
  WorkflowStepAdapter
} from './types';
import { WorkflowSessionRepository } from './WorkflowSessionRepository';
import { ProgressStreamService } from '../services/ProgressStreamService';
import { v4 as uuidv4 } from 'uuid';

export class WorkflowEngine {
  private repository: WorkflowSessionRepository;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private stepAdapters: WorkflowStepAdapter[] = [];
  
  constructor(
    private progressStream?: ProgressStreamService
  ) {
    this.repository = new WorkflowSessionRepository();
    console.log('🚀 [WORKFLOW-ENGINE] Initialized');
  }
  
  /**
   * Registrar un workflow para que esté disponible
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    console.log(`📋 [WORKFLOW-ENGINE] Registered workflow: ${workflow.id} (${workflow.name})`);
  }
  
  /**
   * Registrar un step adapter personalizado
   */
  registerStepAdapter(adapter: WorkflowStepAdapter): void {
    this.stepAdapters.push(adapter);
    console.log(`🔌 [WORKFLOW-ENGINE] Registered step adapter`);
  }
  
  /**
   * Iniciar un nuevo workflow
   */
  async startWorkflow(request: StartWorkflowRequest): Promise<WorkflowSession> {
    const workflow = this.workflows.get(request.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${request.workflowId}`);
    }
    
    // CRITICAL: Default initialContext to empty object to prevent crashes
    const context = request.initialContext ?? {};
    
    // CRITICAL: Validate required context fields before starting
    if (workflow.requiredContext) {
      const missingFields = workflow.requiredContext.filter(
        field => context[field] === undefined || context[field] === null
      );
      
      if (missingFields.length > 0) {
        throw new Error(
          `Missing required context fields for workflow ${workflow.id}: ${missingFields.join(', ')}. ` +
          `Please provide: ${missingFields.join(', ')}`
        );
      }
      
      console.log(`✅ [WORKFLOW-ENGINE] All required context fields validated for ${workflow.id}`);
    }
    
    // Crear sesión
    const session: WorkflowSession = {
      sessionId: uuidv4(),
      workflowId: workflow.id,
      userId: request.userId,
      status: 'running',
      context: context,
      currentStepId: null,
      currentStepIndex: -1,
      completedSteps: [],
      startedAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        conversationId: request.conversationId,
        aiModel: request.aiModel,
        estimatedDuration: this.estimateDuration(workflow)
      }
    };
    
    await this.repository.createSession(session);
    
    // Emitir evento de inicio
    this.emitProgress({
      sessionId: session.sessionId,
      type: 'workflow_started',
      message: `Iniciando workflow: ${workflow.name}`,
      timestamp: new Date(),
      data: { workflowId: workflow.id, totalSteps: workflow.steps.length }
    });
    
    console.log(`🎬 [WORKFLOW-ENGINE] Started workflow ${workflow.id} (session: ${session.sessionId})`);
    
    // Ejecutar primer paso
    await this.executeNextStep(session, workflow);
    
    return session;
  }
  
  /**
   * Resumir un workflow que está esperando input del usuario
   */
  async resumeWorkflow(request: ResumeWorkflowRequest): Promise<WorkflowSession> {
    const session = await this.repository.getSession(request.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${request.sessionId}`);
    }
    
    const workflow = this.workflows.get(session.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${session.workflowId}`);
    }
    
    // Validar que está esperando input
    if (session.status !== 'waiting_input') {
      throw new Error(`Session is not waiting for input (status: ${session.status})`);
    }
    
    // CRITICAL: Validate required context after resume (in case userId or other required fields are missing)
    if (workflow.requiredContext) {
      const missingFields = workflow.requiredContext.filter(
        field => session.context[field] === undefined || session.context[field] === null
      );
      
      if (missingFields.length > 0) {
        throw new Error(
          `Missing required context fields after resume: ${missingFields.join(', ')}`
        );
      }
    }
    
    // Actualizar contexto con el input del usuario
    await this.repository.updateContext(session.sessionId, request.userInput);
    await this.repository.clearPendingQuestion(session.sessionId);
    
    // Obtener sesión actualizada
    const updatedSession = await this.repository.getSession(session.sessionId);
    if (!updatedSession) {
      throw new Error('Failed to get updated session');
    }
    
    console.log(`▶️ [WORKFLOW-ENGINE] Resuming workflow ${session.sessionId}`);
    
    // Continuar ejecutando
    await this.executeNextStep(updatedSession, workflow);
    
    return updatedSession;
  }
  
  /**
   * Cancelar un workflow en ejecución
   */
  async cancelWorkflow(sessionId: string): Promise<void> {
    await this.repository.updateSessionStatus(sessionId, 'cancelled');
    
    this.emitProgress({
      sessionId,
      type: 'workflow_failed',
      message: 'Workflow cancelado por el usuario',
      timestamp: new Date()
    });
    
    console.log(`⛔ [WORKFLOW-ENGINE] Cancelled workflow ${sessionId}`);
  }
  
  /**
   * Obtener estado de un workflow
   */
  async getWorkflowStatus(sessionId: string): Promise<WorkflowSession | null> {
    return await this.repository.getSession(sessionId);
  }
  
  /**
   * Ejecutar el siguiente paso del workflow
   */
  private async executeNextStep(session: WorkflowSession, workflow: WorkflowDefinition): Promise<void> {
    // Incrementar índice de paso
    session.currentStepIndex++;
    
    // Verificar si hay más pasos
    if (session.currentStepIndex >= workflow.steps.length) {
      // Workflow completado
      await this.completeWorkflow(session);
      return;
    }
    
    const step = workflow.steps[session.currentStepIndex];
    session.currentStepId = step.id;
    
    await this.repository.updateSession(session);
    
    // Emitir evento de inicio de paso
    this.emitProgress({
      sessionId: session.sessionId,
      type: 'step_started',
      stepId: step.id,
      stepName: step.name,
      stepIndex: session.currentStepIndex,
      totalSteps: workflow.steps.length,
      message: `Ejecutando: ${step.name}`,
      timestamp: new Date()
    });
    
    console.log(`🔧 [WORKFLOW-ENGINE] Executing step ${session.currentStepIndex + 1}/${workflow.steps.length}: ${step.name}`);
    
    try {
      await this.executeStep(session, step, workflow);
    } catch (error: any) {
      console.error(`❌ [WORKFLOW-ENGINE] Step ${step.id} failed:`, error);
      
      // Manejar error según configuración
      if (step.onError === 'skip') {
        console.log(`⏭️ [WORKFLOW-ENGINE] Skipping failed step ${step.id}`);
        await this.repository.addCompletedStep(session.sessionId, step.id, undefined, error.message);
        
        // Continuar con siguiente paso
        const updatedSession = await this.repository.getSession(session.sessionId);
        if (updatedSession) {
          await this.executeNextStep(updatedSession, workflow);
        }
      } else {
        // Fallar el workflow
        await this.failWorkflow(session, step.id, error);
      }
    }
  }
  
  /**
   * Ejecutar un paso individual
   */
  private async executeStep(
    session: WorkflowSession,
    step: WorkflowStep,
    workflow: WorkflowDefinition
  ): Promise<void> {
    let result: any;
    
    switch (step.type) {
      case 'collect':
        result = await this.handleCollectStep(session, step);
        break;
        
      case 'call':
        result = await this.handleCallStep(session, step);
        break;
        
      case 'branch':
        result = await this.handleBranchStep(session, step, workflow);
        return; // Branch maneja su propia continuación
        
      case 'transform':
        result = await this.handleTransformStep(session, step);
        break;
        
      case 'parallel':
        result = await this.handleParallelStep(session, step);
        break;
        
      default:
        throw new Error(`Unknown step type: ${(step as any).type}`);
    }
    
    // Guardar resultado del paso
    await this.repository.addCompletedStep(session.sessionId, step.id, result);
    
    // CRITICAL: Guardar resultado en el contexto para que esté disponible para pasos siguientes
    // Los pasos transform pueden referenciar resultados de pasos anteriores usando step.id
    session.context[step.id] = result;
    await this.repository.updateContext(session.sessionId, session.context);
    
    // Emitir evento de paso completado
    this.emitProgress({
      sessionId: session.sessionId,
      type: 'step_completed',
      stepId: step.id,
      stepName: step.name,
      stepIndex: session.currentStepIndex,
      totalSteps: workflow.steps.length,
      message: `Completado: ${step.name}`,
      timestamp: new Date(),
      data: result
    });
    
    // Continuar con siguiente paso
    const updatedSession = await this.repository.getSession(session.sessionId);
    if (updatedSession) {
      await this.executeNextStep(updatedSession, workflow);
    }
  }
  
  /**
   * Manejar paso tipo 'collect' (recolectar información)
   */
  private async handleCollectStep(session: WorkflowSession, step: WorkflowStep): Promise<any> {
    if (!step.collectFields) {
      throw new Error(`Collect step ${step.id} has no collectFields defined`);
    }
    
    // Verificar qué campos faltan
    const missingFields = step.collectFields.filter(field => 
      field.required && !session.context[field.name]
    );
    
    if (missingFields.length > 0) {
      // Preguntar al usuario
      const question = step.description || 
        `Necesito la siguiente información: ${missingFields.map(f => f.name).join(', ')}`;
      
      await this.repository.setPendingQuestion(
        session.sessionId,
        step.id,
        question,
        missingFields.map(f => f.name)
      );
      
      this.emitProgress({
        sessionId: session.sessionId,
        type: 'waiting_input',
        stepId: step.id,
        stepName: step.name,
        message: question,
        timestamp: new Date(),
        data: { missingFields: missingFields.map(f => f.name) }
      });
      
      console.log(`❓ [WORKFLOW-ENGINE] Waiting for user input: ${missingFields.map(f => f.name).join(', ')}`);
      
      // El workflow se pausa aquí hasta que el usuario responda
      return null;
    }
    
    // Todos los campos están disponibles
    const collected: Record<string, any> = {};
    for (const field of step.collectFields) {
      collected[field.name] = session.context[field.name] || field.defaultValue;
    }
    
    return collected;
  }
  
  /**
   * Manejar paso tipo 'call' (llamar endpoint/servicio)
   */
  private async handleCallStep(session: WorkflowSession, step: WorkflowStep): Promise<any> {
    if (!step.endpoint) {
      throw new Error(`Call step ${step.id} has no endpoint defined`);
    }
    
    // Buscar adapter que pueda manejar este paso
    const adapter = this.stepAdapters.find(a => a.canHandle(step));
    
    if (!adapter) {
      throw new Error(`No adapter found for step ${step.id} (service: ${step.endpoint.service})`);
    }
    
    // Ejecutar con el adapter
    const result = await adapter.execute(step, session.context);
    
    return result;
  }
  
  /**
   * Manejar paso tipo 'branch' (decisión condicional)
   */
  private async handleBranchStep(
    session: WorkflowSession,
    step: WorkflowStep,
    workflow: WorkflowDefinition
  ): Promise<void> {
    if (!step.condition) {
      throw new Error(`Branch step ${step.id} has no condition defined`);
    }
    
    const { field, operator, value, thenStep, elseStep } = step.condition;
    const fieldValue = session.context[field];
    
    let conditionMet = false;
    
    switch (operator) {
      case 'equals':
        conditionMet = fieldValue === value;
        break;
      case 'contains':
        conditionMet = String(fieldValue).includes(String(value));
        break;
      case 'exists':
        conditionMet = fieldValue !== undefined && fieldValue !== null;
        break;
      case 'gt':
        conditionMet = Number(fieldValue) > Number(value);
        break;
      case 'lt':
        conditionMet = Number(fieldValue) < Number(value);
        break;
    }
    
    const nextStepId = conditionMet ? thenStep : elseStep;
    
    if (!nextStepId) {
      // No hay siguiente paso, continuar normalmente
      const updatedSession = await this.repository.getSession(session.sessionId);
      if (updatedSession) {
        await this.executeNextStep(updatedSession, workflow);
      }
      return;
    }
    
    // Saltar al paso indicado
    const nextStepIndex = workflow.steps.findIndex(s => s.id === nextStepId);
    if (nextStepIndex === -1) {
      throw new Error(`Step not found: ${nextStepId}`);
    }
    
    session.currentStepIndex = nextStepIndex - 1; // -1 porque executeNextStep incrementará
    await this.repository.updateSession(session);
    
    const updatedSession = await this.repository.getSession(session.sessionId);
    if (updatedSession) {
      await this.executeNextStep(updatedSession, workflow);
    }
  }
  
  /**
   * Manejar paso tipo 'transform' (transformar datos)
   */
  private async handleTransformStep(session: WorkflowSession, step: WorkflowStep): Promise<any> {
    if (!step.transform) {
      throw new Error(`Transform step ${step.id} has no transform defined`);
    }
    
    // Buscar adapter que pueda manejar este paso
    const adapter = this.stepAdapters.find(a => a.canHandle(step));
    
    if (!adapter) {
      // Fallback: transformación simple (copiar valor)
      const { input, output } = step.transform;
      const inputValue = session.context[input];
      session.context[output] = inputValue;
      await this.repository.updateContext(session.sessionId, session.context);
      return { [output]: inputValue };
    }
    
    // Ejecutar con el adapter
    const result = await adapter.execute(step, session.context);
    
    // Guardar resultado en el contexto si se especifica output
    if (step.transform.output) {
      session.context[step.transform.output] = result;
      await this.repository.updateContext(session.sessionId, session.context);
    }
    
    return result;
  }
  
  /**
   * Manejar paso tipo 'parallel' (ejecutar pasos en paralelo)
   */
  private async handleParallelStep(session: WorkflowSession, step: WorkflowStep): Promise<any> {
    // TODO: Implementar ejecución paralela
    throw new Error('Parallel steps not yet implemented');
  }
  
  /**
   * Completar workflow exitosamente
   */
  private async completeWorkflow(session: WorkflowSession): Promise<void> {
    session.status = 'completed';
    session.completedAt = new Date();
    session.result = session.context;
    
    await this.repository.updateSession(session);
    
    this.emitProgress({
      sessionId: session.sessionId,
      type: 'workflow_completed',
      message: 'Workflow completado exitosamente',
      timestamp: new Date(),
      data: session.result
    });
    
    console.log(`✅ [WORKFLOW-ENGINE] Workflow completed: ${session.sessionId}`);
  }
  
  /**
   * Fallar workflow
   */
  private async failWorkflow(session: WorkflowSession, stepId: string, error: Error): Promise<void> {
    session.status = 'failed';
    session.completedAt = new Date();
    session.error = {
      stepId,
      message: error.message,
      stack: error.stack
    };
    
    await this.repository.updateSession(session);
    
    this.emitProgress({
      sessionId: session.sessionId,
      type: 'workflow_failed',
      stepId,
      message: `Error: ${error.message}`,
      timestamp: new Date()
    });
    
    console.log(`❌ [WORKFLOW-ENGINE] Workflow failed: ${session.sessionId}`);
  }
  
  /**
   * Emitir evento de progreso
   */
  private emitProgress(event: WorkflowProgressEvent): void {
    if (this.progressStream) {
      this.progressStream.sendMessage(event.message);
    }
  }
  
  /**
   * Estimar duración del workflow
   */
  private estimateDuration(workflow: WorkflowDefinition): number {
    // Estimación simple: 2 segundos por paso
    return workflow.steps.length * 2000;
  }
}
