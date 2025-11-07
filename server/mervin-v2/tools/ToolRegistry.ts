/**
 * TOOL REGISTRY - DYNAMIC TOOL EXECUTION SYSTEM
 * 
 * Responsabilidad:
 * - Registrar todas las herramientas/acciones disponibles para Mervin
 * - Ejecutar herramientas dinámicamente según los parámetros
 * - Proporcionar descripción de herramientas para AI
 */

import type { UserSnapshot } from '../services/SnapshotService';

// ============= TOOL DEFINITION =============

export interface Tool {
  name: string;
  description: string;
  category: 'create' | 'read' | 'update' | 'delete' | 'verify' | 'analyze';
  requiresConfirmation: boolean; // ¿Requiere confirmación del usuario antes de ejecutar?
  parameters: ToolParameter[];
  execute: (params: any, snapshot: UserSnapshot) => Promise<ToolResult>;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  defaultValue?: any;
  canBeInferredFromSnapshot?: boolean; // ¿Puede ser inferido del snapshot?
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  metadata?: {
    executionTime?: number;
    resourcesCreated?: string[];
    endpointsUsed?: string[];
  };
}

// ============= TOOL REGISTRY =============

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  
  /**
   * Registrar una herramienta
   */
  registerTool(tool: Tool): void {
    console.log(`🔧 [TOOL-REGISTRY] Registrando herramienta: ${tool.name}`);
    this.tools.set(tool.name, tool);
  }
  
  /**
   * Obtener una herramienta por nombre
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  /**
   * Obtener todas las herramientas
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Obtener herramientas por categoría
   */
  getToolsByCategory(category: Tool['category']): Tool[] {
    return this.getAllTools().filter(tool => tool.category === category);
  }
  
  /**
   * Ejecutar una herramienta
   */
  async executeTool(toolName: string, params: any, snapshot: UserSnapshot): Promise<ToolResult> {
    const startTime = Date.now();
    
    console.log(`⚡ [TOOL-REGISTRY] Ejecutando herramienta: ${toolName}`);
    console.log(`📋 [TOOL-REGISTRY] Parámetros:`, params);
    
    const tool = this.getTool(toolName);
    
    if (!tool) {
      console.error(`❌ [TOOL-REGISTRY] Herramienta no encontrada: ${toolName}`);
      return {
        success: false,
        error: `Tool "${toolName}" not found in registry`
      };
    }
    
    // Validar parámetros requeridos
    const missingParams = this.validateParameters(tool, params);
    if (missingParams.length > 0) {
      console.error(`❌ [TOOL-REGISTRY] Parámetros faltantes:`, missingParams);
      return {
        success: false,
        error: `Missing required parameters: ${missingParams.join(', ')}`
      };
    }
    
    try {
      // Ejecutar la herramienta
      const result = await tool.execute(params, snapshot);
      
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ [TOOL-REGISTRY] Herramienta ejecutada en ${executionTime}ms`);
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime
        }
      };
      
    } catch (error: any) {
      console.error(`❌ [TOOL-REGISTRY] Error ejecutando ${toolName}:`, error);
      
      return {
        success: false,
        error: error.message || 'Unknown error executing tool',
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }
  
  /**
   * Validar parámetros requeridos
   */
  private validateParameters(tool: Tool, params: any): string[] {
    const missingParams: string[] = [];
    
    for (const param of tool.parameters) {
      if (param.required && !(param.name in params)) {
        // Si el parámetro puede ser inferido del snapshot, no es un error
        if (!param.canBeInferredFromSnapshot) {
          missingParams.push(param.name);
        }
      }
    }
    
    return missingParams;
  }
  
  /**
   * Generar descripción de herramientas para AI
   */
  getToolsDescription(): string {
    const lines: string[] = [];
    
    lines.push('=== AVAILABLE TOOLS ===');
    lines.push('');
    
    for (const tool of this.getAllTools()) {
      lines.push(`TOOL: ${tool.name}`);
      lines.push(`Description: ${tool.description}`);
      lines.push(`Category: ${tool.category}`);
      lines.push(`Requires Confirmation: ${tool.requiresConfirmation ? 'YES' : 'NO'}`);
      lines.push('Parameters:');
      
      for (const param of tool.parameters) {
        const required = param.required ? 'REQUIRED' : 'OPTIONAL';
        const canInfer = param.canBeInferredFromSnapshot ? ' (can be inferred from context)' : '';
        lines.push(`  - ${param.name} (${param.type}, ${required})${canInfer}: ${param.description}`);
      }
      
      lines.push('');
    }
    
    lines.push('=== END TOOLS ===');
    
    return lines.join('\n');
  }
  
  /**
   * Detectar parámetros faltantes que NO pueden ser inferidos del snapshot
   */
  detectMissingParameters(toolName: string, providedParams: any): string[] {
    const tool = this.getTool(toolName);
    
    if (!tool) {
      return [];
    }
    
    const missingParams: string[] = [];
    
    for (const param of tool.parameters) {
      if (param.required && !(param.name in providedParams)) {
        // Solo reportar como faltante si NO puede ser inferido
        if (!param.canBeInferredFromSnapshot) {
          missingParams.push(param.name);
        }
      }
    }
    
    return missingParams;
  }
  
  /**
   * Auto-completar parámetros desde el snapshot
   */
  autoCompleteParameters(toolName: string, providedParams: any, snapshot: UserSnapshot): any {
    const tool = this.getTool(toolName);
    
    if (!tool) {
      return providedParams;
    }
    
    const completedParams = { ...providedParams };
    
    for (const param of tool.parameters) {
      // Si el parámetro no está provisto pero puede ser inferido
      if (!(param.name in completedParams) && param.canBeInferredFromSnapshot) {
        const inferredValue = this.inferParameterFromSnapshot(param.name, snapshot);
        
        if (inferredValue !== undefined) {
          completedParams[param.name] = inferredValue;
          console.log(`🧠 [TOOL-REGISTRY] Parámetro "${param.name}" inferido del snapshot:`, inferredValue);
        }
      }
    }
    
    return completedParams;
  }
  
  /**
   * Inferir valor de parámetro desde el snapshot
   */
  private inferParameterFromSnapshot(paramName: string, snapshot: UserSnapshot): any {
    // Mapeo de parámetros comunes a valores del snapshot
    const inferences: Record<string, () => any> = {
      'taxRate': () => snapshot.preferences.defaults.taxRate,
      'paymentTerms': () => snapshot.preferences.defaults.paymentTerms,
      'warrantyPeriod': () => snapshot.preferences.defaults.warrantyPeriod,
      'depositPercentage': () => snapshot.preferences.defaults.depositPercentage,
      'currency': () => snapshot.preferences.settings.currency,
      'language': () => snapshot.preferences.settings.language,
      'contractorName': () => snapshot.preferences.settings.companyName,
      'contractorEmail': () => snapshot.preferences.settings.companyEmail,
      'contractorPhone': () => snapshot.preferences.settings.companyPhone
    };
    
    const inferFn = inferences[paramName];
    
    if (inferFn) {
      try {
        return inferFn();
      } catch (error) {
        console.warn(`⚠️ [TOOL-REGISTRY] Error infiriendo "${paramName}":`, error);
        return undefined;
      }
    }
    
    return undefined;
  }
}

export const toolRegistry = new ToolRegistry();
