/**
 * AGENT CORE - ORQUESTADOR PRINCIPAL DEL MODO AGENTE V3
 * 
 * Responsable de gestionar el ciclo de vida completo de una tarea:
 * 1. Planificación
 * 2. Confirmación (opcional)
 * 3. Ejecución
 * 4. Síntesis de respuesta
 */

import { TaskPlanner } from './TaskPlanner';
import { StepExecutor } from './StepExecutor';
import { buildSynthesisPrompt, SYNTHESIS_SYSTEM_PROMPT } from '../prompts/AgentPrompts';
import type {
  AgentConfig,
  AgentResponse,
  ExecutionContext,
  PlanningContext,
  Scratchpad,
  TaskPlan,
  PlanStep
} from '../types/agent-types';
import Anthropic from '@anthropic-ai/sdk';

export class AgentCore {
  private taskPlanner: TaskPlanner;
  private stepExecutor: StepExecutor;
  private anthropic: Anthropic;
  private config: AgentConfig;
  private executionContexts: Map<string, ExecutionContext> = new Map();

  constructor(
    private userId: string,
    private authHeaders: Record<string, string> = {},
    private baseURL?: string,
    config: Partial<AgentConfig> = {}
  ) {
    // Configuración por defecto inline (sin importar DEFAULT_AGENT_CONFIG)
    this.config = {
      planningModel: 'claude-sonnet-4-5',
      synthesisModel: 'claude-sonnet-4-5',
      planningTemperature: 0.2,
      synthesisTemperature: 0.7,
      maxRetries: 3,
      stepTimeout: 60000,
      debug: false,
      savePlans: true,
      enableLearning: true,
      ...config
    };
    this.taskPlanner = new TaskPlanner(this.config);
    this.stepExecutor = new StepExecutor(userId, authHeaders, baseURL, this.config);
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    console.log('🚀 [AGENT-CORE] Initialized for user:', userId);
  }

  /**
   * Procesa una nueva solicitud del usuario
   */
  async processRequest(context: PlanningContext): Promise<AgentResponse> {
    const executionId = this.generateExecutionId();
    console.log(`\n🚀 [AGENT-CORE] Iniciando nueva ejecución: ${executionId}`);

    try {
      // 1. Generar el plan
      const plan = await this.taskPlanner.generatePlan(context);

      // 2. Crear contexto de ejecución
      const executionContext: ExecutionContext = {
        plan,
        scratchpad: {},
        currentStep: 0,
        isPaused: false,
        startedAt: new Date(),
        updatedAt: new Date()
      };
      this.executionContexts.set(executionId, executionContext);

      // 3. Si el plan requiere confirmación, pausar y preguntar
      if (plan.needsConfirmation) {
        executionContext.isPaused = true;
        executionContext.pauseReason = 'needs_confirmation';
        
        console.log(`⏸️ [AGENT-CORE] El plan requiere confirmación del usuario`);

        return {
          type: 'needs_confirmation',
          message: plan.confirmationMessage || '¿Quieres que ejecute este plan?',
          plan,
          executionId,
          executionTime: Date.now() - executionContext.startedAt.getTime()
        };
      }

      // 4. Si no, ejecutar el plan directamente
      return await this.executePlan(executionId);

    } catch (error: any) {
      console.error('❌ [AGENT-CORE] Error en el procesamiento inicial:', error.message);
      return {
        type: 'error',
        message: `Hubo un error al procesar tu solicitud: ${error.message}`,
        executionId
      };
    }
  }

  /**
   * Ejecuta un plan completo
   */
  async executePlan(executionId: string): Promise<AgentResponse> {
    const context = this.getContext(executionId);
    console.log(`▶️ [AGENT-CORE] Ejecutando plan para ${executionId}`);

    context.isPaused = false;

    for (let i = context.currentStep; i < context.plan.steps.length; i++) {
      const step = context.plan.steps[i];
      context.currentStep = i + 1;
      context.updatedAt = new Date();

      // Si el paso requiere confirmación, pausar
      if (step.requiresConfirmation) {
        context.isPaused = true;
        context.pauseReason = 'step_confirmation';
        console.log(`⏸️ [AGENT-CORE] Pausado para confirmar paso ${step.stepNumber}`);
        return {
          type: 'needs_confirmation',
          message: `¿Confirmas que quieres ejecutar el siguiente paso: ${step.description}?`,
          pendingAction: step,
          executionId
        };
      }

      // Ejecutar el paso
      const result = await this.stepExecutor.executeStepWithRetries(step, context.scratchpad);

      if (!result.success) {
        console.error(`❌ [AGENT-CORE] Falló el paso ${step.stepNumber}. Abortando plan.`);
        // TODO: Implementar lógica de fallback
        return {
          type: 'error',
          message: `El paso "${step.description}" falló. Error: ${result.error}`,
          executionId
        };
      }
    }

    // Todos los pasos completados, sintetizar respuesta final
    console.log('✅ [AGENT-CORE] Todos los pasos completados. Sintetizando respuesta...');
    const finalMessage = await this.synthesizeResponse(context);

    this.executionContexts.delete(executionId); // Limpiar contexto

    return {
      type: 'task_completed',
      message: finalMessage,
      data: context.scratchpad,
      executionId,
      executionTime: Date.now() - context.startedAt.getTime()
    };
  }

  /**
   * Reanuda la ejecución de un plan pausado
   */
  async resumeExecution(executionId: string, userResponse: any): Promise<AgentResponse> {
    const context = this.getContext(executionId);
    console.log(`🔄 [AGENT-CORE] Reanudando ejecución para ${executionId}`);

    if (!context.isPaused) {
      throw new Error('La ejecución no está pausada');
    }

    // TODO: Procesar la respuesta del usuario (ej: si/no, o información adicional)

    return this.executePlan(executionId);
  }

  /**
   * Sintetiza la respuesta final para el usuario
   */
  private async synthesizeResponse(context: ExecutionContext): Promise<string> {
    const prompt = buildSynthesisPrompt(context.plan.intent, context.plan.steps, context.scratchpad);

    try {
      const response = await this.anthropic.messages.create({
        model: this.config.synthesisModel,
        max_tokens: 2048,
        temperature: this.config.synthesisTemperature,
        system: SYNTHESIS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }]
      });

      const finalMessage = response.content[0].type === 'text' ? response.content[0].text : '¡Tarea completada!';
      console.log('📝 [AGENT-CORE] Respuesta final generada:', finalMessage.substring(0, 100));
      return finalMessage;

    } catch (error: any) {
      console.error('❌ [AGENT-CORE] Error sintetizando respuesta:', error.message);
      return '¡Listo! La tarea se completó, pero hubo un problema al generar el resumen.';
    }
  }

  /**
   * Obtiene el contexto de una ejecución
   */
  private getContext(executionId: string): ExecutionContext {
    const context = this.executionContexts.get(executionId);
    if (!context) {
      throw new Error(`No se encontró la ejecución con ID: ${executionId}`);
    }
    return context;
  }

  /**
   * Genera un ID de ejecución único
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
