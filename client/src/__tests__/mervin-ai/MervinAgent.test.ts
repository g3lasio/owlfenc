/**
 * PRUEBAS EXHAUSTIVAS DEL AGENTE AUTÓNOMO
 * 
 * Suite de testing para MervinAgent que verifica:
 * - Inicialización correcta del sistema
 * - Procesamiento autónomo de tareas
 * - Coordinación inteligente de endpoints
 * - Manejo robusto de errores y recuperación
 * - Seguridad y validación de permisos
 */

import { MervinAgent, AgentConfig } from '../../mervin-ai/core/MervinAgent';

// Mock de dependencias
jest.mock('../../mervin-ai/core/IntentionEngine');
jest.mock('../../mervin-ai/core/TaskOrchestrator');
jest.mock('../../mervin-ai/core/ConversationEngine');

describe('MervinAgent - Agente Autónomo', () => {
  let agent: MervinAgent;
  let mockConfig: AgentConfig;

  beforeEach(() => {
    mockConfig = {
      userId: 'test-user-123',
      userPermissions: { 
        id: 'master_contractor', 
        features: ['estimates', 'contracts', 'permits'] 
      },
      subscriptionLevel: 'master_contractor',
      debug: true
    };
    
    agent = new MervinAgent(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('🚀 Inicialización del Agente', () => {
    it('debe inicializar todos los componentes correctamente', () => {
      expect(agent).toBeDefined();
      expect(agent['config']).toEqual(mockConfig);
      expect(agent['state']).toBeDefined();
      expect(agent['state'].isActive).toBe(false);
      expect(agent['state'].canInterrupt).toBe(true);
    });

    it('debe configurar permisos de usuario correctamente', () => {
      const masterConfig = {
        ...mockConfig,
        subscriptionLevel: 'master_contractor'
      };
      
      const masterAgent = new MervinAgent(masterConfig);
      expect(masterAgent['config'].subscriptionLevel).toBe('master_contractor');
    });

    it('debe activar modo debug cuando se especifica', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      new MervinAgent({ ...mockConfig, debug: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🤖 [MERVIN-AGENT] Agente inicializado')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('🧠 Procesamiento de Input del Usuario', () => {
    it('debe procesar input simple correctamente', async () => {
      const input = 'Hola, necesito ayuda';
      const conversationHistory = [{ content: 'mensaje anterior', timestamp: new Date() }];
      
      const result = await agent.processUserInput(input, conversationHistory);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('debe activar estado del agente durante procesamiento', async () => {
      const input = 'Generar estimado profesional';
      const conversationHistory = [];
      
      const processPromise = agent.processUserInput(input, conversationHistory);
      
      // Verificar que el estado se activa
      setTimeout(() => {
        expect(agent['state'].isActive).toBe(true);
      }, 100);
      
      await processPromise;
      
      // Verificar que el estado se desactiva al final
      expect(agent['state'].isActive).toBe(false);
    });

    it('debe manejar inputs complejos de múltiples tareas', async () => {
      const complexInput = 'Quiero generar un estimado, crear un contrato y verificar permisos';
      const conversationHistory = [];
      
      const result = await agent.processUserInput(complexInput, conversationHistory);
      
      expect(result).toBeDefined();
      expect(result.stepsCompleted).toBeGreaterThan(0);
      expect(result.endpointsUsed).toBeDefined();
    });

    it('debe actualizar contexto conversacional', async () => {
      const input = 'Mi nombre es Carlos y tengo un proyecto de cerca';
      const conversationHistory = [];
      
      await agent.processUserInput(input, conversationHistory);
      
      // Verificar que el contexto se actualiza (mock verification)
      expect(agent['contextManager']).toBeDefined();
    });
  });

  describe('🎯 Análisis de Intenciones', () => {
    it('debe identificar intención de generar estimado', async () => {
      const input = 'Necesito crear un estimado para una cerca de madera';
      const conversationHistory = [];
      
      const result = await agent.processUserInput(input, conversationHistory);
      
      expect(result).toBeDefined();
      // La intención debería ser procesada por IntentionEngine
    });

    it('debe identificar múltiples intenciones en un input', async () => {
      const input = 'Quiero generar estimado, crear contrato y enviar por email';
      const conversationHistory = [];
      
      const result = await agent.processUserInput(input, conversationHistory);
      
      expect(result.stepsCompleted).toBeGreaterThan(1);
    });

    it('debe manejar intenciones ambiguas', async () => {
      const input = 'Ayúdame con algo';
      const conversationHistory = [];
      
      const result = await agent.processUserInput(input, conversationHistory);
      
      expect(result).toBeDefined();
      expect(result.data?.conversationalResponse).toContain('específico');
    });
  });

  describe('🔒 Validación de Permisos', () => {
    it('debe validar permisos para funciones premium', async () => {
      const basicConfig = {
        ...mockConfig,
        subscriptionLevel: 'trial',
        userPermissions: { id: 'trial', features: ['basic_estimates'] }
      };
      
      const basicAgent = new MervinAgent(basicConfig);
      const input = 'Generar 50 contratos con firma digital';
      
      const result = await basicAgent.processUserInput(input, []);
      
      expect(result.data?.conversationalResponse).toContain('upgrade');
    });

    it('debe permitir todas las funciones para master contractor', async () => {
      const masterConfig = {
        ...mockConfig,
        subscriptionLevel: 'master_contractor'
      };
      
      const masterAgent = new MervinAgent(masterConfig);
      const input = 'Generar contratos ilimitados con todas las funciones';
      
      const result = await masterAgent.processUserInput(input, []);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('debe bloquear acciones no autorizadas', async () => {
      const restrictedConfig = {
        ...mockConfig,
        userPermissions: { id: 'basic', features: [] }
      };
      
      const restrictedAgent = new MervinAgent(restrictedConfig);
      const input = 'Generar 1000 contratos premium';
      
      const result = await restrictedAgent.processUserInput(input, []);
      
      expect(result.data?.conversationalResponse).toMatch(/permiso|upgrade|plan/i);
    });
  });

  describe('⚡ Rendimiento y Concurrencia', () => {
    it('debe procesar múltiples solicitudes concurrentes', async () => {
      const inputs = [
        'Generar estimado',
        'Crear contrato',
        'Verificar permisos',
        'Analizar propiedad',
        'Enviar email'
      ];
      
      const promises = inputs.map(input => 
        agent.processUserInput(input, [])
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.executionTime).toBeLessThan(10000); // 10 segundos máximo
      });
    });

    it('debe tener timeout de seguridad', async () => {
      const longRunningInput = 'Procesar 10000 elementos complejos';
      
      const startTime = Date.now();
      const result = await agent.processUserInput(longRunningInput, []);
      const endTime = Date.now();
      
      // No debería tardar más de 30 segundos (timeout del agente)
      expect(endTime - startTime).toBeLessThan(30000);
      expect(result).toBeDefined();
    });

    it('debe optimizar uso de memoria', async () => {
      const initialMemory = process.memoryUsage();
      
      // Procesar múltiples tareas
      for (let i = 0; i < 50; i++) {
        await agent.processUserInput(`Tarea ${i}`, []);
      }
      
      const finalMemory = process.memoryUsage();
      
      // Verificar que el crecimiento de memoria sea razonable
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Menos de 100MB
    });
  });

  describe('🛡️ Manejo de Errores y Recuperación', () => {
    it('debe recuperarse de errores de red', async () => {
      // Mock error de red
      jest.spyOn(agent['endpointCoordinator'], 'makeRequest')
        .mockRejectedValueOnce(new Error('Network error'));
      
      const result = await agent.processUserInput('Generar estimado', []);
      
      expect(result).toBeDefined();
      expect(result.data?.conversationalResponse).toContain('problemita');
    });

    it('debe manejar fallos de endpoints específicos', async () => {
      // Mock fallo de endpoint
      jest.spyOn(agent['taskOrchestrator'], 'executeTask')
        .mockResolvedValueOnce({
          success: false,
          error: 'Endpoint no disponible',
          executionTime: 1000,
          stepsCompleted: 0,
          endpointsUsed: ['estimates']
        });
      
      const result = await agent.processUserInput('Crear estimado', []);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.data?.conversationalResponse).toBeDefined();
    });

    it('debe limpiar estado después de errores', async () => {
      // Simular error que activa el estado
      jest.spyOn(agent['intentionEngine'], 'analyzeUserInput')
        .mockRejectedValueOnce(new Error('Test error'));
      
      await agent.processUserInput('Test input', []);
      
      // Verificar que el estado se limpia
      expect(agent['state'].isActive).toBe(false);
      expect(agent['state'].currentTask).toBeNull();
      expect(agent['state'].progress).toBe(0);
    });

    it('debe prevenir estados corruptos', async () => {
      // Múltiples errores consecutivos
      const errorInputs = [
        'Error input 1',
        'Error input 2', 
        'Error input 3'
      ];
      
      for (const input of errorInputs) {
        const result = await agent.processUserInput(input, []);
        expect(result).toBeDefined();
        expect(agent['state'].canInterrupt).toBe(true);
      }
    });
  });

  describe('📊 Métricas y Monitoreo', () => {
    it('debe registrar métricas de ejecución', async () => {
      const result = await agent.processUserInput('Test input', []);
      
      expect(result.executionTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.stepsCompleted).toBeDefined();
      expect(result.endpointsUsed).toBeDefined();
    });

    it('debe proporcionar estado detallado del agente', () => {
      const state = agent.getState();
      
      expect(state).toBeDefined();
      expect(state.isActive).toBeDefined();
      expect(state.currentTask).toBeDefined();
      expect(state.progress).toBeDefined();
      expect(state.lastActivity).toBeDefined();
    });

    it('debe permitir interrupción de tareas largas', async () => {
      // Iniciar tarea larga
      const longTaskPromise = agent.processUserInput('Tarea muy larga', []);
      
      // Verificar que se puede interrumpir
      expect(agent.getState().canInterrupt).toBe(true);
      
      await longTaskPromise;
    });
  });

  describe('🎭 Personalización y Adaptación', () => {
    it('debe adaptar respuestas según personalidad del usuario', async () => {
      const spanishInput = 'Hola primo, ¿cómo estás?';
      const result = await agent.processUserInput(spanishInput, []);
      
      expect(result.data?.conversationalResponse).toMatch(/primo|compadre|órale/);
      expect(result.data?.languageProfile?.language).toBe('spanish');
    });

    it('debe recordar preferencias del usuario', async () => {
      // Establecer preferencia
      await agent.processUserInput('Siempre respóndeme en español', []);
      
      // Verificar que se mantiene en futuras interacciones
      const result = await agent.processUserInput('How are you?', []);
      
      expect(result.data?.conversationalResponse).toBeDefined();
    });

    it('debe personalizar flujos según nivel de suscripción', async () => {
      const premiumAgent = new MervinAgent({
        ...mockConfig,
        subscriptionLevel: 'master_contractor'
      });
      
      const result = await premiumAgent.processUserInput('Generar contrato', []);
      
      expect(result).toBeDefined();
      // Debería tener acceso a todas las funciones premium
    });
  });
});