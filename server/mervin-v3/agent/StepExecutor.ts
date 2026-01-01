/**
 * STEP EXECUTOR - EJECUTOR DE PASOS DEL PLAN
 * 
 * Responsable de ejecutar cada paso del plan de manera secuencial,
 * manejar errores, reintentos y actualizar el scratchpad.
 */

import type {
  PlanStep,
  ExecutionContext,
  Scratchpad,
  AgentConfig
} from '../types/agent-types';
import { ExecutionError } from '../types/agent-types';
import { WorkflowRunner } from '../../mervin-v2/services/WorkflowRunner';
import { SystemAPIService } from '../../mervin-v2/services/SystemAPIService';
import { autoDiscoveryIntegration } from '../../services/integration/AutoDiscoveryIntegration';
import { isDynamicTool } from '../../mervin-v2/tools/ClaudeToolDefinitions';

export class StepExecutor {
  private workflowRunner: WorkflowRunner;
  private systemAPI: SystemAPIService;
  private config: AgentConfig;
  
  constructor(
    private userId: string,
    private authHeaders: Record<string, string> = {},
    private baseURL?: string,
    config: Partial<AgentConfig> = {}
  ) {
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
    this.workflowRunner = new WorkflowRunner(userId, authHeaders, baseURL);
    this.systemAPI = new SystemAPIService(userId, authHeaders, baseURL);
    
    console.log('⚙️  [STEP-EXECUTOR] Initialized for user:', userId);
  }
  
  /**
   * Ejecuta un paso individual del plan
   */
  async executeStep(
    step: PlanStep,
    scratchpad: Scratchpad
  ): Promise<{ success: boolean; result: any; error?: string }> {
    console.log(`\n⚙️  [STEP-EXECUTOR] Ejecutando paso ${step.stepNumber}: ${step.description}`);
    console.log(`   Acción: ${step.action}`);
    console.log(`   Parámetros:`, JSON.stringify(step.params, null, 2));
    
    const startTime = Date.now();
    step.startedAt = new Date();
    step.status = 'executing';
    
    try {
      // Ejecutar el paso con timeout
      const result = await this.executeWithTimeout(
        () => this.executeAction(step, scratchpad),
        this.config.stepTimeout
      );
      
      const elapsed = Date.now() - startTime;
      
      step.status = 'completed';
      step.completedAt = new Date();
      step.result = result;
      
      console.log(`✅ [STEP-EXECUTOR] Paso ${step.stepNumber} completado en ${elapsed}ms`);
      console.log(`   Resultado:`, JSON.stringify(result, null, 2).substring(0, 200));
      
      // Actualizar scratchpad
      this.updateScratchpad(scratchpad, step.action, result);
      
      return { success: true, result };
      
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      
      step.status = 'failed';
      step.completedAt = new Date();
      step.error = error.message;
      
      console.error(`❌ [STEP-EXECUTOR] Paso ${step.stepNumber} falló después de ${elapsed}ms`);
      console.error(`   Error:`, error.message);
      
      return { success: false, result: null, error: error.message };
    }
  }
  
  /**
   * Ejecuta una acción específica
   */
  private async executeAction(step: PlanStep, scratchpad: Scratchpad): Promise<any> {
    const { action, params } = step;
    
    // Resolver parámetros dinámicos del scratchpad
    const resolvedParams = this.resolveParams(params, scratchpad);
    
    console.log(`🔧 [STEP-EXECUTOR] Ejecutando acción: ${action}`);
    
    // Verificar si es una herramienta dinámica
    if (await isDynamicTool(action)) {
      console.log(`🌟 [STEP-EXECUTOR] Herramienta dinámica detectada: ${action}`);
      return await this.executeDynamicTool(action, resolvedParams);
    }
    
    // Determinar si es un workflow o una llamada directa a SystemAPI
    if (this.isWorkflow(action)) {
      return await this.executeWorkflow(action, resolvedParams);
    } else {
      return await this.executeSystemAPI(action, resolvedParams);
    }
  }
  
  /**
   * Ejecuta un workflow completo
   */
  private async executeWorkflow(workflowName: string, params: any): Promise<any> {
    console.log(`🔄 [STEP-EXECUTOR] Ejecutando workflow: ${workflowName}`);
    
    try {
      const result = await this.workflowRunner.run(workflowName, params);
      
      if (!result.success) {
        throw new Error(result.error || 'Workflow falló sin mensaje de error');
      }
      
      return result.data;
      
    } catch (error: any) {
      console.error(`❌ [STEP-EXECUTOR] Error en workflow ${workflowName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Ejecuta una llamada directa a SystemAPI
   */
  private async executeSystemAPI(action: string, params: any): Promise<any> {
    console.log(`🔗 [STEP-EXECUTOR] Ejecutando SystemAPI: ${action}`);
    
    try {
      switch (action) {
        case 'search_client':
          return await this.systemAPI.findClient(params.searchTerm);
          
        case 'create_client':
          return await this.systemAPI.createClient(params);
          
        case 'verify_property_ownership':
          return await this.systemAPI.verifyProperty({ address: params.address });
          
        case 'search_entity':
          return await this.systemAPI.searchEntity(params);
          
        case 'get_entity':
          return await this.systemAPI.getEntity(params);
          
        case 'list_entities':
          return await this.systemAPI.listEntities(params);
          
        // Agregar más acciones según sea necesario
        
        default:
          throw new Error(`Acción no soportada: ${action}`);
      }
      
    } catch (error: any) {
      console.error(`❌ [STEP-EXECUTOR] Error en SystemAPI ${action}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Determina si una acción es un workflow
   */
  private isWorkflow(action: string): boolean {
    const workflows = [
      'create_estimate_workflow',
      'create_contract_workflow',
      'check_permits_workflow',
      'verify_property_ownership',
      'analyze_permits',
      'search_entity',
      'get_entity',
      'list_entities'
    ];
    
    return workflows.includes(action);
  }
  
  /**
   * Resuelve parámetros dinámicos del scratchpad
   * Ejemplo: { clientId: "$scratchpad.client.id" } → { clientId: "client-123" }
   */
  private resolveParams(params: Record<string, any>, scratchpad: Scratchpad): Record<string, any> {
    const resolved: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('$scratchpad.')) {
        // Extraer el path del scratchpad
        const path = value.substring('$scratchpad.'.length);
        const resolvedValue = this.getNestedValue(scratchpad, path);
        
        if (resolvedValue === undefined) {
          console.warn(`⚠️  [STEP-EXECUTOR] No se pudo resolver parámetro: ${value}`);
          resolved[key] = value; // Mantener el valor original
        } else {
          resolved[key] = resolvedValue;
          console.log(`🔗 [STEP-EXECUTOR] Parámetro resuelto: ${key} = ${resolvedValue}`);
        }
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }
  
  /**
   * Obtiene un valor anidado de un objeto usando un path
   * Ejemplo: getNestedValue({ client: { id: "123" } }, "client.id") → "123"
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  /**
   * Actualiza el scratchpad con el resultado de una acción
   */
  private updateScratchpad(scratchpad: Scratchpad, action: string, result: any): void {
    // Determinar qué tipo de resultado es y guardarlo en el scratchpad
    if (action === 'search_client' || action === 'create_client') {
      scratchpad.client = result;
    } else if (action === 'create_estimate_workflow') {
      scratchpad.estimate = result;
    } else if (action === 'create_contract_workflow') {
      scratchpad.contract = result;
    } else if (action === 'verify_property_ownership') {
      scratchpad.property = result;
    } else if (action === 'check_permits_workflow') {
      scratchpad.permit = result;
    } else if (action === 'analyze_permits') {
      scratchpad.permit = result;
    } else if (action === 'search_entity') {
      // Guardar resultados de búsqueda con nombre descriptivo
      const entityType = params.entity_type || 'entity';
      scratchpad[`found_${entityType}s`] = result;
      scratchpad.lastSearch = { entity_type: params.entity_type, results: result };
    } else if (action === 'get_entity') {
      // Guardar entidad obtenida con nombre descriptivo
      const entityType = params.entity_type || 'entity';
      scratchpad[`selected_${entityType}`] = result;
    } else if (action === 'list_entities') {
      // Guardar lista de entidades
      const entityType = params.entity_type || 'entity';
      scratchpad[`${entityType}_list`] = result;
    } else {
      // Guardar con el nombre de la acción
      scratchpad[action] = result;
    }
    
    console.log(`💾 [STEP-EXECUTOR] Scratchpad actualizado:`, Object.keys(scratchpad));
  }
  
  /**
   * Ejecuta una función con timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout después de ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
  
  /**
   * Ejecuta un paso con reintentos automáticos
   */
  async executeStepWithRetries(
    step: PlanStep,
    scratchpad: Scratchpad
  ): Promise<{ success: boolean; result: any; error?: string }> {
    let lastError: string | undefined;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      console.log(`🔄 [STEP-EXECUTOR] Intento ${attempt}/${this.config.maxRetries}`);
      
      const result = await this.executeStep(step, scratchpad);
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
      
      // Si no es el último intento, esperar antes de reintentar
      if (attempt < this.config.maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
        console.log(`⏳ [STEP-EXECUTOR] Esperando ${waitTime}ms antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Todos los intentos fallaron
    return {
      success: false,
      result: null,
      error: `Falló después de ${this.config.maxRetries} intentos. Último error: ${lastError}`
    };
  }
  
  /**
   * Ejecuta el fallback action de un paso
   */
  async executeFallback(
    step: PlanStep,
    scratchpad: Scratchpad
  ): Promise<{ success: boolean; result: any; error?: string }> {
    console.log(`🔄 [STEP-EXECUTOR] Ejecutando fallback para paso ${step.stepNumber}`);
    console.log(`   Fallback action: ${step.fallbackAction}`);
    
    // TODO: Implementar lógica de fallback más sofisticada
    // Por ahora, solo retornamos un error estructurado
    
    return {
      success: false,
      result: null,
      error: `Paso ${step.stepNumber} falló. Fallback: ${step.fallbackAction}`
    };
  }
  
  /**
   * Ejecuta una herramienta dinámica descubierta automáticamente
   */
  private async executeDynamicTool(toolName: string, params: any): Promise<any> {
    console.log(`🌟 [STEP-EXECUTOR] Ejecutando herramienta dinámica: ${toolName}`);
    
    try {
      const result = await autoDiscoveryIntegration.executeTool(
        toolName,
        params,
        {
          userId: this.userId,
          authHeaders: this.authHeaders,
          baseURL: this.baseURL || 'http://localhost:3000'
        }
      );
      
      // El resultado puede ser un EnrichedResponse con content, actions, links, etc.
      // O puede ser un resultado simple
      if (result && typeof result === 'object' && 'content' in result) {
        console.log(`✅ [STEP-EXECUTOR] Herramienta dinámica completada con response enriquecido`);
        return result;
      }
      
      console.log(`✅ [STEP-EXECUTOR] Herramienta dinámica completada`);
      return result;
      
    } catch (error: any) {
      console.error(`❌ [STEP-EXECUTOR] Error en herramienta dinámica ${toolName}:`, error.message);
      throw error;
    }
  }
}
