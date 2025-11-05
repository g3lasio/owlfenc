/**
 * AI ROUTER - ROUTER INTELIGENTE DE AIs
 * 
 * Responsabilidad:
 * - Decidir qué AI usar para cada subtarea
 * - Optimizar costos y velocidad
 * - Routing inteligente
 */

import type { TaskType } from '../types/mervin-types';

export type AIProvider = 'chatgpt' | 'claude';

export interface RoutingDecision {
  provider: AIProvider;
  reason: string;
  estimatedCost: number; // en centavos de dólar
  estimatedTime: number; // en milisegundos
}

export class AIRouter {
  /**
   * Decidir qué AI usar para una tarea específica
   */
  routeTask(taskType: TaskType, complexity: 'low' | 'medium' | 'high'): RoutingDecision {
    // REGLAS DE ROUTING:
    
    // 1. Contratos siempre usan Claude (mejor calidad legal)
    if (taskType === 'contract') {
      return {
        provider: 'claude',
        reason: 'Contratos requieren máxima calidad legal y profesionalismo',
        estimatedCost: 5, // ~$0.05
        estimatedTime: 3000 // 3 segundos
      };
    }

    // 2. Conversaciones simples usan ChatGPT (más rápido y barato)
    if (taskType === 'conversation' && complexity === 'low') {
      return {
        provider: 'chatgpt',
        reason: 'Conversación simple, ChatGPT es más rápido',
        estimatedCost: 1, // ~$0.01
        estimatedTime: 800 // 0.8 segundos
      };
    }

    // 3. Análisis inicial SIEMPRE ChatGPT (velocidad)
    // Este caso se maneja en el orquestador, no aquí

    // 4. Respuestas finales de tareas ejecutadas usan Claude (profesionalismo)
    if (complexity === 'high') {
      return {
        provider: 'claude',
        reason: 'Tarea compleja requiere respuesta profesional de calidad',
        estimatedCost: 4, // ~$0.04
        estimatedTime: 2500 // 2.5 segundos
      };
    }

    // 5. Default: ChatGPT para el resto (balance costo/velocidad)
    return {
      provider: 'chatgpt',
      reason: 'Balance óptimo de velocidad y costo para esta tarea',
      estimatedCost: 2, // ~$0.02
      estimatedTime: 1200 // 1.2 segundos
    };
  }

  /**
   * Decidir AI para análisis inicial (siempre ChatGPT)
   */
  routeInitialAnalysis(): RoutingDecision {
    return {
      provider: 'chatgpt',
      reason: 'Análisis inicial requiere máxima velocidad',
      estimatedCost: 1,
      estimatedTime: 600
    };
  }

  /**
   * Decidir AI para extracción de parámetros (siempre ChatGPT)
   */
  routeParameterExtraction(): RoutingDecision {
    return {
      provider: 'chatgpt',
      reason: 'Extracción de parámetros es tarea rápida',
      estimatedCost: 1,
      estimatedTime: 700
    };
  }

  /**
   * Decidir AI para respuesta final
   */
  routeFinalResponse(taskType: TaskType, wasTaskExecuted: boolean): RoutingDecision {
    // Si se ejecutó una tarea real, usar Claude para respuesta profesional
    if (wasTaskExecuted && taskType !== 'conversation') {
      return {
        provider: 'claude',
        reason: 'Tarea ejecutada requiere respuesta profesional',
        estimatedCost: 4,
        estimatedTime: 2000
      };
    }

    // Conversaciones simples usan ChatGPT
    return {
      provider: 'chatgpt',
      reason: 'Conversación simple no requiere Claude',
      estimatedCost: 1,
      estimatedTime: 900
    };
  }

  /**
   * Decidir AI para generación de contrato
   */
  routeContractGeneration(): RoutingDecision {
    return {
      provider: 'claude',
      reason: 'Contratos legales requieren máxima calidad de Claude',
      estimatedCost: 6,
      estimatedTime: 4000
    };
  }

  /**
   * Estimar costo total de una operación completa
   */
  estimateTotalCost(operations: RoutingDecision[]): number {
    return operations.reduce((total, op) => total + op.estimatedCost, 0);
  }

  /**
   * Estimar tiempo total de una operación completa
   */
  estimateTotalTime(operations: RoutingDecision[], parallel: boolean = false): number {
    if (parallel) {
      // Si es paralelo, el tiempo es el máximo
      return Math.max(...operations.map(op => op.estimatedTime));
    }
    // Si es secuencial, sumar tiempos
    return operations.reduce((total, op) => total + op.estimatedTime, 0);
  }

  /**
   * Log de decisión de routing para debugging
   */
  logRoutingDecision(decision: RoutingDecision, context: string): void {
    console.log(`🎯 [AI-ROUTER] ${context}:`, {
      provider: decision.provider.toUpperCase(),
      reason: decision.reason,
      estimatedCost: `$${(decision.estimatedCost / 100).toFixed(3)}`,
      estimatedTime: `${decision.estimatedTime}ms`
    });
  }
}
