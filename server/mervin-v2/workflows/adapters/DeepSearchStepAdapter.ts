/**
 * DeepSearchStepAdapter
 * 
 * Adapter especializado para ejecutar DeepSearch (materiales y mano de obra)
 * directamente llamando a los endpoints de labor-deepsearch.
 */

import { WorkflowStep, WorkflowStepAdapter } from '../types';
import axios from 'axios';

export class DeepSearchStepAdapter implements WorkflowStepAdapter {
  
  /**
   * Verificar si este adapter puede manejar el paso
   */
  canHandle(step: WorkflowStep): boolean {
    return step.type === 'call' && 
           step.endpoint?.service === 'deepsearch';
  }
  
  /**
   * Ejecutar el paso
   */
  async execute(step: WorkflowStep, context: Record<string, any>): Promise<any> {
    if (!step.endpoint) {
      throw new Error(`Step ${step.id} has no endpoint defined`);
    }
    
    const { method, params, paramMapping } = step.endpoint;
    
    // Construir parámetros para la llamada
    const callParams = this.buildCallParams(params || {}, paramMapping || {}, context);
    
    console.log(`🔬 [DEEPSEARCH-ADAPTER] Executing ${method} with params:`, callParams);
    
    try {
      let result;
      
      switch (method) {
        case 'materials_only':
          result = await this.executeMaterialsOnly(callParams);
          break;
          
        case 'labor_only':
          result = await this.executeLaborOnly(callParams);
          break;
          
        case 'combined':
          result = await this.executeCombined(callParams);
          break;
          
        default:
          throw new Error(`Unknown DeepSearch method: ${method}`);
      }
      
      console.log(`✅ [DEEPSEARCH-ADAPTER] ${method} completed:`, {
        materialsCount: result.materials?.length || 0,
        laborItemsCount: result.items?.length || 0
      });
      
      return result;
      
    } catch (error: any) {
      console.error(`❌ [DEEPSEARCH-ADAPTER] ${method} failed:`, error.message);
      throw error;
    }
  }
  
  /**
   * Ejecutar DeepSearch solo para materiales
   */
  private async executeMaterialsOnly(params: any): Promise<any> {
    const response = await axios.post('http://localhost:5000/api/deepsearch/materials-only', {
      projectDescription: params.projectDescription,
      location: params.location || ''
    }, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true
    });
    
    return response.data;
  }
  
  /**
   * Ejecutar DeepSearch solo para mano de obra
   */
  private async executeLaborOnly(params: any): Promise<any> {
    const response = await axios.post('http://localhost:5000/api/labor-deepsearch/generate-items', {
      projectDescription: params.projectDescription,
      location: params.location || ''
    }, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true
    });
    
    return response.data;
  }
  
  /**
   * Ejecutar DeepSearch combinado (materiales + mano de obra)
   */
  private async executeCombined(params: any): Promise<any> {
    const response = await axios.post('http://localhost:5000/api/labor-deepsearch/combined', {
      projectDescription: params.projectDescription,
      location: params.location || ''
    }, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true
    });
    
    return response.data;
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
}
