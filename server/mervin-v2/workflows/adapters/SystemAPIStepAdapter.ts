/**
 * SystemAPIStepAdapter
 * 
 * Adapter para ejecutar pasos de workflow que llaman a endpoints existentes
 * a través del SystemAPIService.
 * 
 * Este adapter permite reutilizar todos los endpoints actuales sin duplicar código.
 */

import { WorkflowStep, WorkflowStepAdapter } from '../types';
import { SystemAPIService } from '../../services/SystemAPIService';

export class SystemAPIStepAdapter implements WorkflowStepAdapter {
  constructor(
    private userId: string,
    private authHeaders: Record<string, string> = {},
    private baseURL?: string
  ) {}
  
  /**
   * Verificar si este adapter puede manejar el paso
   */
  canHandle(step: WorkflowStep): boolean {
    return step.type === 'call' && 
           step.endpoint?.service === 'system_api';
  }
  
  /**
   * Ejecutar el paso
   */
  async execute(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    if (!step.endpoint) {
      throw new Error(`Step ${step.id} has no endpoint defined`);
    }
    
    const { method, params, paramMapping } = step.endpoint;
    
    // Crear instancia de SystemAPIService con authHeaders
    // Usar userId del constructor (ya autenticado) en lugar del context
    const systemAPI = new SystemAPIService(
      this.userId,
      this.authHeaders,
      this.baseURL
    );
    
    // Construir parámetros para la llamada
    const callParams = this.buildCallParams(params || {}, paramMapping || {}, context);
    
    console.log(`🔌 [SYSTEM-API-ADAPTER] Calling ${method} with params:`, callParams);
    
    try {
      // Ejecutar el método del SystemAPIService
      const result = await this.executeMethod(systemAPI, method, callParams);
      
      console.log(`✅ [SYSTEM-API-ADAPTER] ${method} completed successfully`);
      
      return result;
      
    } catch (error: any) {
      console.error(`❌ [SYSTEM-API-ADAPTER] ${method} failed:`, error.message);
      throw error;
    }
  }
  
  /**
   * Construir parámetros para la llamada combinando estáticos y mapeados
   */
  private buildCallParams(
    staticParams: Record<string, any>,
    paramMapping: Record<string, string>,
    context: Record<string, any>
  ): Record<string, any> {
    const params = { ...staticParams };
    
    // Mapear parámetros del context
    for (const [paramName, contextPath] of Object.entries(paramMapping)) {
      const value = this.getValueFromPath(context, contextPath);
      if (value !== undefined) {
        params[paramName] = value;
      }
    }
    
    return params;
  }
  
  /**
   * Obtener valor de un path en el context (soporta dot notation)
   */
  private getValueFromPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }
  
  /**
   * Ejecutar método dinámicamente en SystemAPIService
   */
  private async executeMethod(
    systemAPI: SystemAPIService,
    method: string,
    params: Record<string, any>
  ): Promise<any> {
    // Mapeo de métodos disponibles en SystemAPIService
    switch (method) {
      case 'createEstimate':
        return await systemAPI.createEstimate(params as any);
        
      case 'generateContract':
        return await systemAPI.generateContract(params as any);
        
      case 'analyzePermit':
        return await systemAPI.analyzePermit(params as any);
        
      case 'verifyProperty':
        return await systemAPI.verifyProperty(params as any);
        
      case 'searchWeb':
        return await systemAPI.searchWeb(params.query);
        
      case 'findOrCreateClient':
        return await systemAPI.findOrCreateClient(params as any);
        
      case 'validateAddress':
        return await systemAPI.validateAddress(params as any);
        
      case 'analyzePermits':
        return await systemAPI.analyzePermits(params as any);
        
      case 'generatePermitPDF':
        return await systemAPI.generatePermitPDF(params as any);
        
      case 'savePermitHistory':
        return await systemAPI.savePermitHistory(params as any);
        
      case 'searchEntity':
        return await systemAPI.searchEntity(params as any);
        
      case 'getEntity':
        return await systemAPI.getEntity(params as any);
        
      case 'listEntities':
        return await systemAPI.listEntities(params as any);
        
      default:
        throw new Error(`Unknown SystemAPI method: ${method}`);
    }
  }
}
