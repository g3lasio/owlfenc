/**
 * TASK PLANNER - AGENTE DE PLANIFICACIÓN
 * 
 * Responsable de analizar la solicitud del usuario y generar un plan de ejecución estructurado.
 * Utiliza Claude 3.5 Sonnet para razonamiento avanzado.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type {
  TaskPlan,
  PlanningContext,
  PlanStep,
  AgentConfig
} from '../types/agent-types';
import { PlanningError } from '../types/agent-types';
import {
  PLANNING_SYSTEM_PROMPT,
  buildPlanningPrompt
} from '../prompts/AgentPrompts';
import { FriendlyErrorHandler } from '../utils/FriendlyErrorHandler';

export class TaskPlanner {
  private anthropic: Anthropic;
  private config: AgentConfig;
  
  constructor(config: Partial<AgentConfig> = {}) {
    // Configuración por defecto inline
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
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    console.log('🧠 [TASK-PLANNER] Initialized with model:', this.config.planningModel);
  }
  
  /**
   * Genera un plan de ejecución basado en la solicitud del usuario
   */
  async generatePlan(context: PlanningContext): Promise<TaskPlan> {
    console.log('\n===========================================');
    console.log('🧠 [TASK-PLANNER] Generando plan de ejecución');
    console.log('   Input:', context.userInput.substring(0, 100) + '...');
    console.log('   Usuario:', context.userId);
    console.log('   Herramientas disponibles:', context.availableTools.length);
    console.log('===========================================\n');
    
    const startTime = Date.now();
    
    try {
      // 1. Construir el prompt con todo el contexto
      const prompt = buildPlanningPrompt(context);
      
      if (this.config.debug) {
        console.log('📝 [TASK-PLANNER] Prompt generado:');
        console.log(prompt);
      }
      
      // 2. Llamar a Claude para generar el plan
      const response = await this.anthropic.messages.create({
        model: this.config.planningModel,
        max_tokens: 4096,
        temperature: this.config.planningTemperature,
        system: PLANNING_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      
      // 3. Extraer el contenido de la respuesta
      const planText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';
      
      if (this.config.debug) {
        console.log('📝 [TASK-PLANNER] Respuesta de Claude:');
        console.log(planText);
      }
      
      // 4. Parsear el plan del LLM
      const plan = this.parsePlan(planText);
      
      // 5. Validar que el plan sea ejecutable
      this.validatePlan(plan, context.availableTools);
      
      const elapsed = Date.now() - startTime;
      
      console.log('✅ [TASK-PLANNER] Plan generado exitosamente en', elapsed, 'ms');
      console.log('   Complejidad:', plan.complexity);
      console.log('   Pasos:', plan.steps.length);
      console.log('   Requiere confirmación:', plan.needsConfirmation);
      console.log('   Duración estimada:', plan.estimatedDuration, 'segundos');
      
      // 6. Guardar el plan si está habilitado
      if (this.config.savePlans) {
        await this.savePlan(plan, context);
      }
      
      return plan;
      
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ [TASK-PLANNER] Error después de ${elapsed}ms:`, error.message);
      
      // Si ya es un PlanningError con mensaje amigable, no modificarlo
      if (error instanceof PlanningError) {
        throw error;
      }
      
      // Convertir error técnico a mensaje amigable
      const friendlyMessage = FriendlyErrorHandler.getFriendlyMessage({
        errorType: 'planning_error',
        originalMessage: error.message,
        userInput: context.userInput
      });
      
      throw new PlanningError(friendlyMessage, error);
    }
  }
  
  /**
   * Parsea la respuesta del LLM y la convierte en un TaskPlan estructurado
   */
  private parsePlan(planText: string): TaskPlan {
    try {
      // Extraer el JSON de la respuesta (puede estar envuelto en markdown)
      const jsonMatch = planText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON válido en la respuesta');
      }
      
      const planData = JSON.parse(jsonMatch[0]);
      
      // Validar que tiene los campos requeridos
      if (!planData.complexity) {
        throw new Error('Plan incompleto: falta campo "complexity"');
      }
      
      if (!planData.intent) {
        throw new Error('Plan incompleto: falta campo "intent"');
      }
      
      if (!planData.steps || !Array.isArray(planData.steps)) {
        throw new Error('Plan incompleto: falta campo "steps" o no es un array');
      }
      
      if (planData.steps.length === 0) {
        throw new Error('Plan vacío: debe tener al menos 1 paso');
      }
      
      // Validar cada paso
      for (const step of planData.steps) {
        if (!step.stepNumber || !step.action || !step.description) {
          throw new Error(`Paso inválido: falta stepNumber, action o description`);
        }
        
        if (!step.params || typeof step.params !== 'object') {
          throw new Error(`Paso ${step.stepNumber}: falta campo "params" o no es un objeto`);
        }
      }
      
      // Construir el TaskPlan
      const plan: TaskPlan = {
        complexity: planData.complexity,
        intent: planData.intent,
        steps: planData.steps.map((step: any) => ({
          stepNumber: step.stepNumber,
          action: step.action,
          description: step.description,
          params: step.params,
          successCondition: step.successCondition || 'Paso completado sin errores',
          fallbackAction: step.fallbackAction || 'Reportar error al usuario',
          requiresConfirmation: step.requiresConfirmation || false,
          status: 'pending'
        })),
        needsConfirmation: planData.needsConfirmation || false,
        confirmationMessage: planData.confirmationMessage,
        estimatedDuration: planData.estimatedDuration || 10,
        createdAt: new Date()
      };
      
      return plan;
      
    } catch (error: any) {
      console.error('❌ [TASK-PLANNER] Error parseando plan:', error.message);
      console.error('   Respuesta del LLM:', planText);
      
      throw new PlanningError(
        `Error parseando el plan generado: ${error.message}`,
        error
      );
    }
  }
  
  /**
   * Valida que un plan sea ejecutable
   */
  private validatePlan(plan: TaskPlan, availableTools: Tool[]): void {
    const toolNames = new Set(availableTools.map(t => t.name));
    
    for (const step of plan.steps) {
      // Validar que la herramienta existe
      if (!toolNames.has(step.action)) {
        const friendlyMessage = FriendlyErrorHandler.getFriendlyMessage({
          errorType: 'tool_not_found',
          originalMessage: `Herramienta no disponible: ${step.action}`,
          attemptedTool: step.action,
          availableTools: Array.from(toolNames)
        });
        
        throw new PlanningError(friendlyMessage);
      }
      
      // Validar que tiene parámetros
      if (!step.params || Object.keys(step.params).length === 0) {
        console.warn(`⚠️  [TASK-PLANNER] Paso ${step.stepNumber} no tiene parámetros`);
      }
    }
    
    console.log('✅ [TASK-PLANNER] Plan validado exitosamente');
  }
  
  /**
   * Guarda el plan en la base de datos para aprendizaje futuro
   */
  private async savePlan(plan: TaskPlan, context: PlanningContext): Promise<void> {
    try {
      // TODO: Implementar guardado en Firestore o PostgreSQL
      // Por ahora solo logueamos
      console.log('💾 [TASK-PLANNER] Plan guardado (mock)');
      
      // Estructura sugerida para Firestore:
      // collection: 'mervin_plans'
      // document: {
      //   userId: context.userId,
      //   userInput: context.userInput,
      //   plan: plan,
      //   createdAt: new Date(),
      //   executed: false,
      //   success: null
      // }
      
    } catch (error: any) {
      console.error('❌ [TASK-PLANNER] Error guardando plan:', error.message);
      // No lanzamos error, solo logueamos
    }
  }
  
  /**
   * Busca planes similares en la base de datos (para aprendizaje)
   */
  async findSimilarPlans(userInput: string, limit: number = 5): Promise<TaskPlan[]> {
    try {
      // TODO: Implementar búsqueda semántica en Firestore/PostgreSQL
      // Podría usar embeddings para encontrar planes similares
      console.log('🔍 [TASK-PLANNER] Buscando planes similares (mock)');
      
      return [];
      
    } catch (error: any) {
      console.error('❌ [TASK-PLANNER] Error buscando planes similares:', error.message);
      return [];
    }
  }
  
  /**
   * Refina un plan existente basándose en feedback
   */
  async refinePlan(
    originalPlan: TaskPlan,
    feedback: string,
    context: PlanningContext
  ): Promise<TaskPlan> {
    console.log('🔄 [TASK-PLANNER] Refinando plan basándose en feedback');
    console.log('   Feedback:', feedback);
    
    try {
      const refinementPrompt = `
El usuario proporcionó el siguiente feedback sobre el plan:

"${feedback}"

Plan original:
${JSON.stringify(originalPlan, null, 2)}

Genera un plan refinado que incorpore el feedback del usuario.
Mantén el mismo formato JSON.
`;

      const response = await this.anthropic.messages.create({
        model: this.config.planningModel,
        max_tokens: 4096,
        temperature: this.config.planningTemperature,
        system: PLANNING_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: refinementPrompt
          }
        ]
      });
      
      const planText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';
      
      const refinedPlan = this.parsePlan(planText);
      this.validatePlan(refinedPlan, context.availableTools);
      
      console.log('✅ [TASK-PLANNER] Plan refinado exitosamente');
      
      return refinedPlan;
      
    } catch (error: any) {
      console.error('❌ [TASK-PLANNER] Error refinando plan:', error.message);
      throw new PlanningError(
        `Error refinando plan: ${error.message}`,
        error
      );
    }
  }
}
