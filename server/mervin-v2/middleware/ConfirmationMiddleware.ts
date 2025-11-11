/**
 * CONFIRMATION MIDDLEWARE
 * 
 * Responsabilidad:
 * - Validar si una herramienta requiere confirmación ANTES de ejecutar
 * - Bloquear ejecución si necesita confirmación y no la tiene
 * - Soportar wildcards en la configuración (e.g., 'delete_*')
 */

import type { MervinMode } from '../types/mervin-types';
import type { Tool } from '../tools/ToolRegistry';

export interface ConfirmationCheck {
  requiresConfirmation: boolean;
  reason?: string;
  tool: string;
}

export class ConfirmationMiddleware {
  /**
   * Verificar si una herramienta requiere confirmación
   * según el modo actual y la configuración de la herramienta
   */
  static checkRequiresConfirmation(
    tool: Tool,
    mode: MervinMode
  ): ConfirmationCheck {
    const toolName = tool.name;
    
    // CASO 1: Modo CHAT - NO ejecutar nada, solo sugerir
    if (mode.type === 'CHAT') {
      return {
        requiresConfirmation: true,
        reason: 'In CHAT mode, tasks are only suggested, not executed automatically',
        tool: toolName
      };
    }
    
    // CASO 2: Modo AGENT con autoExecute = false - Pedir confirmación para TODO
    if (mode.type === 'AGENT' && !mode.autoExecute) {
      return {
        requiresConfirmation: true,
        reason: 'Auto-execution is disabled, all actions need confirmation',
        tool: toolName
      };
    }
    
    // CASO 3: Modo AGENT con autoExecute = true
    // Verificar si está en la lista de herramientas que requieren confirmación
    
    // Si la lista tiene '*', TODO requiere confirmación
    if (mode.requireConfirmationFor.includes('*')) {
      return {
        requiresConfirmation: true,
        reason: 'All tools require confirmation (wildcard rule)',
        tool: toolName
      };
    }
    
    // Verificar match exacto
    if (mode.requireConfirmationFor.includes(toolName)) {
      return {
        requiresConfirmation: true,
        reason: `Tool '${toolName}' is in the confirmation list`,
        tool: toolName
      };
    }
    
    // Verificar wildcards (e.g., 'delete_*')
    for (const pattern of mode.requireConfirmationFor) {
      if (this.matchesWildcard(toolName, pattern)) {
        return {
          requiresConfirmation: true,
          reason: `Tool matches pattern '${pattern}'`,
          tool: toolName
        };
      }
    }
    
    // CASO 4: La herramienta misma define requiresConfirmation = true
    if (tool.requiresConfirmation) {
      return {
        requiresConfirmation: true,
        reason: `Tool '${toolName}' is marked as requiring confirmation`,
        tool: toolName
      };
    }
    
    // NO requiere confirmación - ejecutar directamente
    return {
      requiresConfirmation: false,
      tool: toolName
    };
  }
  
  /**
   * Verificar si un nombre de herramienta coincide con un patrón wildcard
   * Ejemplos:
   * - 'delete_*' matches 'delete_user', 'delete_contract', etc.
   * - '*_critical' matches 'action_critical', 'task_critical', etc.
   */
  private static matchesWildcard(toolName: string, pattern: string): boolean {
    if (!pattern.includes('*')) {
      return false;
    }
    
    // Convertir patrón wildcard a regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')  // * → .*
      .replace(/\?/g, '.');  // ? → .
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(toolName);
  }
  
  /**
   * Determinar si debe ejecutarse o bloquearse
   * Retorna true si puede ejecutar, false si debe bloquearse
   */
  static canExecute(tool: Tool, mode: MervinMode, hasConfirmation: boolean = false): boolean {
    const check = this.checkRequiresConfirmation(tool, mode);
    
    // Si requiere confirmación pero NO la tiene, bloquear
    if (check.requiresConfirmation && !hasConfirmation) {
      console.log(`🚫 [CONFIRMATION] Bloqueando ejecución de ${tool.name}: ${check.reason}`);
      return false;
    }
    
    // Puede ejecutar
    console.log(`✅ [CONFIRMATION] Permitiendo ejecución de ${tool.name}`);
    return true;
  }
  
  /**
   * Generar respuesta de solicitud de confirmación
   */
  static generateConfirmationRequest(
    tool: Tool,
    params: any,
    check: ConfirmationCheck
  ): {
    message: string;
    confirmationCard: any;
  } {
    return {
      message: `This action requires your confirmation before I can proceed.`,
      confirmationCard: {
        type: 'action_confirmation',
        action: tool.name,
        title: `Confirm ${tool.name.replace(/_/g, ' ')}`,
        description: tool.description,
        parameters: params,
        reason: check.reason,
        warnings: this.getWarningsForTool(tool.name),
        actions: ['Confirm', 'Cancel', 'Modify']
      }
    };
  }
  
  /**
   * Obtener warnings específicos según el tipo de herramienta
   */
  private static getWarningsForTool(toolName: string): string[] {
    const warnings: Record<string, string[]> = {
      'create_contract': [
        'This will create a legally binding contract',
        'Signature links will be sent to both parties',
        'This action cannot be undone'
      ],
      'delete_estimate': [
        'This will permanently delete the estimate',
        'This action cannot be undone'
      ],
      'send_email': [
        'This will send an email to the specified recipient',
        'Make sure all information is correct before confirming'
      ]
    };
    
    return warnings[toolName] || [];
  }
}
