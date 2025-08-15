/**
 * SMART TASK COORDINATOR DEMO
 * 
 * Demostración completa del nuevo motor de agente autónomo con
 * coordinación inteligente y ejecución paralela.
 * 
 * Ejemplos de uso avanzado del SmartTaskCoordinator
 */

import { SmartTaskCoordinator } from '../core/SmartTaskCoordinator';
import { IntentionEngine, UserIntention } from '../core/IntentionEngine';
import { ContextManager } from '../core/ContextManager';
import { EndpointCoordinator } from '../services/EndpointCoordinator';
import { AgentMemory } from '../services/AgentMemory';

export class SmartCoordinatorDemo {
  private coordinator: SmartTaskCoordinator;
  private intentionEngine: IntentionEngine;

  constructor() {
    // Configurar dependencias
    const endpointCoordinator = new EndpointCoordinator({
      baseURL: '/api',
      timeout: 30000,
      retryAttempts: 3
    });
    const contextManager = new ContextManager('demo_user');
    const agentMemory = new AgentMemory('demo_user');
    
    // Inicializar Smart Task Coordinator
    this.coordinator = new SmartTaskCoordinator({
      endpointCoordinator,
      contextManager,
      agentMemory,
      config: {
        maxConcurrentTasks: 3,
        timeoutMs: 30000,
        enableIntelligentDecisions: true,
        enableParallelOptimization: true
      }
    });

    this.intentionEngine = new IntentionEngine({
      endpointCoordinator,
      contextManager,
      agentMemory,
      config: {}
    });
  }

  /**
   * Demo 1: Generación inteligente de estimado con coordinación paralela
   */
  async demoIntelligentEstimate(): Promise<void> {
    console.log('🚀 [DEMO] Iniciando demostración de estimado inteligente');

    const intention: UserIntention = {
      primary: 'estimate',
      secondary: ['property', 'permit'],
      confidence: 0.95,
      complexity: 'complex',
      estimatedSteps: 5,
      requiredEndpoints: ['/api/estimates/calculate', '/api/property/details', '/api/permit/check'],
      parameters: {
        description: 'Instalar cerca de vinilo de 6 pies en patio trasero de 200 pies lineales',
        clientData: {
          name: 'Demo Cliente',
          email: 'demo@ejemplo.com',
          address: '123 Demo Street, Austin, TX 78701'
        },
        preferences: {
          includeDeepSearch: true,
          materialQuality: 'premium',
          includeLabor: true,
          sendByEmail: true
        }
      },
      context: {
        conversationHistory: [],
        recentActions: [],
        availableData: {}
      }
    };

    try {
      const result = await this.coordinator.coordinateIntelligentExecution(intention);
      
      console.log('✅ [DEMO] Estimado inteligente completado:', {
        success: result.success,
        executionTime: result.executionTime,
        agentsUsed: result.agentsUsed,
        parallelTasks: result.parallelTasks,
        optimizationsApplied: result.optimizationsApplied,
        intelligentDecisions: result.intelligentDecisions.length
      });

      // Mostrar decisiones inteligentes tomadas
      result.intelligentDecisions.forEach((decision, index) => {
        console.log(`🧠 [DECISIÓN ${index + 1}] ${decision.decision}:`, {
          reasoning: decision.reasoning,
          confidence: decision.confidence,
          riskAssessment: decision.riskAssessment
        });
      });

    } catch (error) {
      console.error('❌ [DEMO] Error en estimado inteligente:', error);
    }
  }

  /**
   * Demo 2: Generación de contrato con verificación paralela
   */
  async demoParallelContractGeneration(): Promise<void> {
    console.log('🚀 [DEMO] Iniciando demostración de contrato con verificación paralela');

    const intention: UserIntention = {
      primary: 'contract',
      secondary: ['property'],
      confidence: 0.9,
      complexity: 'complex',
      estimatedSteps: 4,
      requiredEndpoints: ['/api/legal-defense/generate-contract', '/api/property/details'],
      parameters: {
        contractType: 'professional',
        clientData: {
          name: 'Demo Cliente Contrato',
          email: 'contrato@demo.com',
          address: '456 Contract Ave, Dallas, TX 75201'
        },
        projectDetails: {
          description: 'Proyecto de cerca completa con instalación profesional',
          startDate: '2025-09-01',
          duration: '7 días'
        },
        paymentTerms: {
          milestones: [
            { title: 'Depósito inicial', percentage: 30, description: 'Al firmar contrato' },
            { title: 'Materiales entregados', percentage: 40, description: 'Al completar entrega' },
            { title: 'Proyecto finalizado', percentage: 30, description: 'Al completar instalación' }
          ],
          totalAmount: 5000
        }
      },
      context: {
        conversationHistory: [],
        recentActions: ['estimate_generated'],
        availableData: {}
      }
    };

    try {
      const result = await this.coordinator.coordinateIntelligentExecution(intention);
      
      console.log('✅ [DEMO] Contrato con verificación paralela completado:', {
        success: result.success,
        executionTime: result.executionTime,
        agentsUsed: result.agentsUsed,
        parallelTasks: result.parallelTasks,
        optimizationsApplied: result.optimizationsApplied
      });

    } catch (error) {
      console.error('❌ [DEMO] Error en contrato paralelo:', error);
    }
  }

  /**
   * Demo 3: Flujo multi-agente secuencial
   */
  async demoSequentialMultiAgent(): Promise<void> {
    console.log('🚀 [DEMO] Iniciando demostración de flujo multi-agente secuencial');

    const intention: UserIntention = {
      primary: 'estimate',
      secondary: ['property', 'permit', 'contract'],
      confidence: 0.85,
      complexity: 'multi-step',
      estimatedSteps: 8,
      requiredEndpoints: [
        '/api/estimates/calculate',
        '/api/property/details', 
        '/api/permit/check',
        '/api/legal-defense/generate-contract'
      ],
      parameters: {
        description: 'Flujo completo: estimado → verificación → permisos → contrato',
        clientData: {
          name: 'Cliente Flujo Completo',
          email: 'flujo@demo.com',
          address: '789 Sequential Blvd, Houston, TX 77001'
        },
        preferences: {
          completeWorkflow: true,
          generateContract: true,
          checkPermits: true,
          verifyProperty: true
        }
      },
      context: {
        conversationHistory: [],
        recentActions: [],
        availableData: {}
      }
    };

    try {
      const result = await this.coordinator.coordinateIntelligentExecution(intention);
      
      console.log('✅ [DEMO] Flujo multi-agente secuencial completado:', {
        success: result.success,
        executionTime: result.executionTime,
        agentsUsed: result.agentsUsed,
        stepsCompleted: result.data?.stepsCompleted || 0,
        intelligentDecisions: result.intelligentDecisions.length
      });

    } catch (error) {
      console.error('❌ [DEMO] Error en flujo secuencial:', error);
    }
  }

  /**
   * Demo 4: Prueba de optimizaciones inteligentes
   */
  async demoIntelligentOptimizations(): Promise<void> {
    console.log('🚀 [DEMO] Iniciando demostración de optimizaciones inteligentes');

    // Simular múltiples intentos para que el sistema aprenda
    const intentionTemplates = [
      {
        testId: 'optimization_test_1',
        primary: 'estimate' as const,
        complexity: 'simple' as const,
        estimatedSteps: 2,
        parameters: { description: 'Cerca simple 50 pies' }
      },
      {
        testId: 'optimization_test_2', 
        primary: 'estimate' as const,
        complexity: 'complex' as const,
        estimatedSteps: 5,
        parameters: { description: 'Cerca compleja con múltiples secciones' }
      },
      {
        testId: 'optimization_test_3',
        primary: 'contract' as const,
        complexity: 'simple' as const,
        estimatedSteps: 3,
        parameters: { contractType: 'basic' }
      }
    ];

    const results = [];

    for (const template of intentionTemplates) {
      const intention: UserIntention = {
        primary: template.primary,
        secondary: [],
        confidence: 0.8,
        complexity: template.complexity,
        estimatedSteps: template.estimatedSteps,
        requiredEndpoints: template.primary === 'estimate' ? ['/api/estimates/calculate'] : ['/api/legal-defense/generate-contract'],
        parameters: template.parameters,
        context: {
          conversationHistory: [],
          recentActions: [],
          availableData: {}
        }
      };

      try {
        const result = await this.coordinator.coordinateIntelligentExecution(intention);
        results.push({
          testId: template.testId,
          executionTime: result.executionTime,
          optimizations: result.optimizationsApplied,
          decisions: result.intelligentDecisions.length
        });
        
        console.log(`📊 [OPTIMIZACIÓN] ${template.testId}:`, {
          tiempo: result.executionTime + 'ms',
          optimizaciones: result.optimizationsApplied,
          decisiones: result.intelligentDecisions.length
        });

      } catch (error) {
        console.error(`❌ [OPTIMIZACIÓN] Error en ${template.testId}:`, error);
      }
    }

    console.log('✅ [DEMO] Análisis de optimizaciones completado:', {
      totalPruebas: results.length,
      tiempoPromedio: results.reduce((sum, r) => sum + r.executionTime, 0) / results.length,
      optimizacionesTotales: results.reduce((sum, r) => sum + r.optimizations.length, 0),
      decisionesTotales: results.reduce((sum, r) => sum + r.decisions, 0)
    });
  }

  /**
   * Ejecutar todas las demostraciones
   */
  async runAllDemos(): Promise<void> {
    console.log('🎯 [DEMO-SUITE] Iniciando suite completa de demostraciones');
    console.log('================================================');

    try {
      await this.demoIntelligentEstimate();
      console.log('------------------------------------------------');
      
      await this.demoParallelContractGeneration();
      console.log('------------------------------------------------');
      
      await this.demoSequentialMultiAgent();
      console.log('------------------------------------------------');
      
      await this.demoIntelligentOptimizations();
      console.log('================================================');
      
      console.log('✅ [DEMO-SUITE] Todas las demostraciones completadas exitosamente');
      
    } catch (error) {
      console.error('❌ [DEMO-SUITE] Error en suite de demostraciones:', error);
    }
  }
}

// Función helper para ejecutar demos desde consola
export async function runSmartCoordinatorDemo(): Promise<void> {
  const demo = new SmartCoordinatorDemo();
  await demo.runAllDemos();
}

// Auto-ejecutar si se carga directamente
if (typeof window !== 'undefined' && (window as any).runMervinDemo) {
  runSmartCoordinatorDemo();
}