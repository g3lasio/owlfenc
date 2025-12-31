/**
 * WORKFLOW RUNNER
 * 
 * Orquestador de workflows que conecta Mervin AI con el WorkflowEngine existente.
 * 
 * Responsabilidades:
 * - Iniciar workflows basados en tool calls de Claude
 * - Mapear parámetros de Claude a contexto de workflow
 * - Monitorear progreso de workflows
 * - Manejar workflows que requieren input adicional del usuario
 * - Retornar resultados formateados a Claude
 */

import { WorkflowEngine } from '../workflows/WorkflowEngine';
import { SystemAPIStepAdapter } from '../workflows/adapters/SystemAPIStepAdapter';
import { DeepSearchStepAdapter } from '../workflows/adapters/DeepSearchStepAdapter';
import { TransformStepAdapter } from '../workflows/adapters/TransformStepAdapter';
import { EstimateWorkflow } from '../workflows/definitions/EstimateWorkflow';
import { PropertyVerificationWorkflow } from '../workflows/definitions/PropertyVerificationWorkflow';
import { ContractWorkflow } from '../workflows/definitions/ContractWorkflow';
import { PermitWorkflow } from '../workflows/definitions/PermitWorkflow';
import type { WorkflowSession, WorkflowResult } from '../workflows/types';
import { SystemAPIService } from './SystemAPIService';

// ============= TYPES =============

export interface WorkflowExecutionRequest {
  workflowId: string;
  userId: string;
  parameters: Record<string, any>;
  conversationId?: string;
}

export interface WorkflowExecutionResult {
  success: boolean;
  workflowSessionId: string;
  status: 'completed' | 'waiting_input' | 'failed' | 'running';
  data?: any;
  error?: string;
  pendingQuestion?: {
    field: string;
    prompt: string;
  };
}

// ============= WORKFLOW RUNNER =============

export class WorkflowRunner {
  private engine: WorkflowEngine;
  private systemAPI: SystemAPIService;
  private userId: string;
  
  constructor(userId: string, authHeaders: Record<string, string> = {}, baseURL?: string) {
    this.userId = userId;
    this.engine = new WorkflowEngine();
    this.systemAPI = new SystemAPIService(userId, authHeaders, baseURL);
    
    // Registrar workflows disponibles
    this.registerWorkflows();
    
    // Registrar step adapters
    this.registerStepAdapters(userId, authHeaders, baseURL);
    
    console.log('🏃 [WORKFLOW-RUNNER] Initialized for user:', userId);
  }
  
  /**
   * Registrar todos los workflows disponibles
   */
  private registerWorkflows(): void {
    // Registrar workflow de estimados
    this.engine.registerWorkflow(EstimateWorkflow);
    
    // Registrar workflow de verificación de propiedades
    this.engine.registerWorkflow(PropertyVerificationWorkflow);
    
    // Registrar workflow de contratos
    this.engine.registerWorkflow(ContractWorkflow);
    
    // Registrar workflow de permisos
    this.engine.registerWorkflow(PermitWorkflow);
    
    // TODO: Registrar workflow de invoices cuando esté definido
    
    console.log('📋 [WORKFLOW-RUNNER] Workflows registered');
  }
  
  /**
   * Registrar step adapters personalizados
   */
  private registerStepAdapters(userId: string, authHeaders: Record<string, string>, baseURL?: string): void {
    // Adapter para llamadas a SystemAPI
    const systemAPIAdapter = new SystemAPIStepAdapter(userId, authHeaders, baseURL);
    this.engine.registerStepAdapter(systemAPIAdapter);
    
    // Adapter para DeepSearch
    const deepSearchAdapter = new DeepSearchStepAdapter(userId, authHeaders, baseURL);
    this.engine.registerStepAdapter(deepSearchAdapter);
    
    // Adapter para transformaciones
    const transformAdapter = new TransformStepAdapter();
    this.engine.registerStepAdapter(transformAdapter);
    
    console.log('🔌 [WORKFLOW-RUNNER] Step adapters registered');
  }
  
  /**
   * Ejecutar un workflow
   */
  async executeWorkflow(request: WorkflowExecutionRequest): Promise<WorkflowExecutionResult> {
    console.log('🚀 [WORKFLOW-RUNNER] Starting workflow:', request.workflowId);
    console.log('   Parameters:', Object.keys(request.parameters));
    
    try {
      // Iniciar workflow
      // IMPORTANTE: Incluir userId en initialContext para workflows que lo requieren
      const session = await this.engine.startWorkflow({
        workflowId: request.workflowId,
        userId: request.userId,
        initialContext: {
          userId: request.userId,  // Agregar userId al contexto
          ...request.parameters     // Incluir todos los demás parámetros
        },
        conversationId: request.conversationId
      });
      
      console.log('✅ [WORKFLOW-RUNNER] Workflow started:', session.sessionId);
      
      // Esperar a que el workflow complete o necesite input
      const result = await this.waitForWorkflowCompletion(session.sessionId);
      
      return result;
      
    } catch (error: any) {
      console.error('❌ [WORKFLOW-RUNNER] Workflow execution failed:', error.message);
      
      return {
        success: false,
        workflowSessionId: '',
        status: 'failed',
        error: error.message
      };
    }
  }
  
  /**
   * Resumir un workflow que está esperando input
   */
  async resumeWorkflow(
    sessionId: string,
    userInput: Record<string, any>
  ): Promise<WorkflowExecutionResult> {
    console.log('▶️ [WORKFLOW-RUNNER] Resuming workflow:', sessionId);
    console.log('   User input:', Object.keys(userInput));
    
    try {
      await this.engine.resumeWorkflow({
        sessionId,
        userInput
      });
      
      // Esperar a que complete o necesite más input
      const result = await this.waitForWorkflowCompletion(sessionId);
      
      return result;
      
    } catch (error: any) {
      console.error('❌ [WORKFLOW-RUNNER] Resume failed:', error.message);
      
      return {
        success: false,
        workflowSessionId: sessionId,
        status: 'failed',
        error: error.message
      };
    }
  }
  
  /**
   * Esperar a que un workflow complete o necesite input
   */
  private async waitForWorkflowCompletion(sessionId: string): Promise<WorkflowExecutionResult> {
    // Polling del estado del workflow
    const maxAttempts = 60; // 60 segundos máximo
    const pollIntervalMs = 1000; // 1 segundo
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const session = await this.engine.getWorkflowStatus(sessionId);
      
      if (!session) {
        throw new Error(`Workflow session not found: ${sessionId}`);
      }
      
      console.log(`🔄 [WORKFLOW-RUNNER] Status check ${attempt + 1}/${maxAttempts}: ${session.status}`);
      
      switch (session.status) {
        case 'completed':
          return {
            success: true,
            workflowSessionId: sessionId,
            status: 'completed',
            data: session.result
          };
          
        case 'waiting_input':
          return {
            success: true,
            workflowSessionId: sessionId,
            status: 'waiting_input',
            pendingQuestion: session.pendingQuestion
          };
          
        case 'failed':
          return {
            success: false,
            workflowSessionId: sessionId,
            status: 'failed',
            error: session.error?.message || 'Workflow failed'
          };
          
        case 'running':
          // Continuar esperando
          await this.sleep(pollIntervalMs);
          break;
          
        default:
          throw new Error(`Unknown workflow status: ${session.status}`);
      }
    }
    
    // Timeout
    throw new Error('Workflow execution timeout');
  }
  
  /**
   * Obtener estado de un workflow
   */
  async getWorkflowStatus(sessionId: string): Promise<WorkflowSession | null> {
    return await this.engine.getWorkflowStatus(sessionId);
  }
  
  /**
   * Cancelar un workflow
   */
  async cancelWorkflow(sessionId: string): Promise<void> {
    console.log('⛔ [WORKFLOW-RUNNER] Cancelling workflow:', sessionId);
    await this.engine.cancelWorkflow(sessionId);
  }
  
  /**
   * Ejecutar workflow de verificación de propiedad (simple, un solo paso)
   */
  async runPropertyVerification(address: string): Promise<any> {
    console.log('🏠 [WORKFLOW-RUNNER] Running property verification');
    console.log('   Address:', address);
    
    try {
      // Este workflow es simple, solo llama a un endpoint
      const result = await this.systemAPI.verifyProperty({ address });
      
      console.log('✅ [WORKFLOW-RUNNER] Property verification completed');
      
      return {
        success: true,
        data: result
      };
      
    } catch (error: any) {
      console.error('❌ [WORKFLOW-RUNNER] Property verification failed:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Método simplificado para ejecutar workflows por nombre
   */
  async run(workflowName: string, params: Record<string, any>): Promise<WorkflowExecutionResult> {
    console.log('🏃 [WORKFLOW-RUNNER] Running workflow:', workflowName);
    
    // Mapear nombres de herramientas a IDs de workflow
    const workflowMap: Record<string, string> = {
      'verify_property_ownership': 'property_verification',
      'create_estimate_workflow': 'estimate_creation',
      'create_contract_workflow': 'contract_creation',
      'check_permits_workflow': 'permit_check'
    };
    
    const workflowId = workflowMap[workflowName] || workflowName;
    
    return await this.executeWorkflow({
      workflowId,
      userId: this.userId,
      parameters: params
    });
  }
  
  /**
   * Helper: Sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
