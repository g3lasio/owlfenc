/**
 * PRUEBAS DE RENDIMIENTO Y CARGA
 * 
 * Suite integral que evalúa:
 * - Tiempo de respuesta del agente bajo carga
 * - Uso de memoria y optimización de recursos
 * - Concurrencia y paralelización de tareas
 * - Degradación graceful bajo estrés
 * - Optimización de algoritmos críticos
 */

import { ConversationEngine } from '../../mervin-ai/core/ConversationEngine';
import { MervinAgent } from '../../mervin-ai/core/MervinAgent';

describe('⚡ Pruebas de Rendimiento y Carga', () => {
  let engine: ConversationEngine;
  let agent: MervinAgent;

  beforeEach(() => {
    engine = new ConversationEngine('perf-test-user');
    agent = new MervinAgent({
      userId: 'perf-test-user',
      userPermissions: { id: 'master_contractor', features: ['all'] },
      subscriptionLevel: 'master_contractor',
      debug: false // Desactivar debug para pruebas de performance
    });
  });

  afterEach(() => {
    // Limpiar memoria después de cada prueba
    global.gc && global.gc();
  });

  describe('🏃‍♂️ Tiempo de Respuesta', () => {
    it('debe responder en menos de 1 segundo para mensajes simples', async () => {
      const simpleMessages = [
        'Hola',
        '¿Cómo estás?',
        'Gracias',
        'Necesito ayuda',
        'Adiós'
      ];

      for (const message of simpleMessages) {
        const startTime = performance.now();
        await engine.processUserMessage(message);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(1000);
      }
    });

    it('debe responder en menos de 3 segundos para tareas complejas', async () => {
      const complexTasks = [
        'Generar estimado completo con 50 materiales diferentes',
        'Crear contrato con términos personalizados y firma dual',
        'Analizar permisos para proyecto residencial complejo',
        'Verificar propiedad con historial de transacciones',
        'Coordinar múltiples endpoints para workflow completo'
      ];

      for (const task of complexTasks) {
        const startTime = performance.now();
        await agent.processUserInput(task, []);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(3000);
      }
    });

    it('debe mantener tiempo de respuesta bajo carga sostenida', async () => {
      const responseTimes: number[] = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await engine.processUserMessage(`Mensaje de carga ${i}`);
        const endTime = performance.now();
        
        responseTimes.push(endTime - startTime);
      }

      // Calcular métricas de rendimiento
      const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];
      const p99ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(iterations * 0.99)];

      expect(avgResponseTime).toBeLessThan(500); // 500ms promedio
      expect(p95ResponseTime).toBeLessThan(1000); // P95 < 1s
      expect(p99ResponseTime).toBeLessThan(2000); // P99 < 2s
    });

    it('debe optimizar inicialización en arranque en frío', async () => {
      // Simular arranque en frío
      const coldStartTime = performance.now();
      
      const coldEngine = new ConversationEngine('cold-start-user');
      await coldEngine.processUserMessage('Primer mensaje después de inicialización');
      
      const coldEndTime = performance.now();
      const coldStartDuration = coldEndTime - coldStartTime;

      expect(coldStartDuration).toBeLessThan(2000); // Menos de 2s para cold start
    });
  });

  describe('💾 Uso de Memoria', () => {
    it('debe mantener uso de memoria estable', async () => {
      const initialMemory = process.memoryUsage();

      // Procesar 1000 mensajes
      for (let i = 0; i < 1000; i++) {
        await engine.processUserMessage(`Mensaje de memoria ${i}`);
        
        // Forzar garbage collection cada 100 mensajes
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // El crecimiento de memoria no debería exceder 50MB
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });

    it('debe limpiar memoria de conversaciones antiguas', async () => {
      const memoryBefore = process.memoryUsage();

      // Crear múltiples engines para simular múltiples usuarios
      const engines = Array.from({ length: 100 }, (_, i) => 
        new ConversationEngine(`memory-user-${i}`)
      );

      // Generar historial conversacional en cada uno
      for (const eng of engines) {
        for (let i = 0; i < 50; i++) {
          await eng.processUserMessage(`Mensaje histórico ${i}`);
        }
      }

      // Forzar limpieza de memoria
      if (global.gc) global.gc();

      const memoryAfter = process.memoryUsage();
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;

      // El incremento no debería ser excesivo
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB límite
    });

    it('debe detectar memory leaks en conversaciones largas', async () => {
      const measurements: number[] = [];

      for (let i = 0; i < 20; i++) {
        // Procesar lote de mensajes
        for (let j = 0; j < 50; j++) {
          await engine.processUserMessage(`Leak test ${i}-${j}`);
        }

        // Medir memoria después de cada lote
        if (global.gc) global.gc();
        measurements.push(process.memoryUsage().heapUsed);
      }

      // Verificar que no hay crecimiento descontrolado
      const firstMeasurement = measurements[0];
      const lastMeasurement = measurements[measurements.length - 1];
      const growth = lastMeasurement - firstMeasurement;

      expect(growth).toBeLessThan(20 * 1024 * 1024); // Menos de 20MB de crecimiento
    });

    it('debe optimizar almacenamiento de contexto conversacional', async () => {
      const contextSizes: number[] = [];

      for (let i = 0; i < 100; i++) {
        await engine.processUserMessage(`Contexto ${i}: ${'A'.repeat(100)}`);
        
        // Simular medición de tamaño de contexto
        const contextSize = JSON.stringify(engine).length;
        contextSizes.push(contextSize);
      }

      // Verificar que el contexto no crece indefinidamente
      const avgContextSize = contextSizes.reduce((a, b) => a + b) / contextSizes.length;
      expect(avgContextSize).toBeLessThan(1024 * 1024); // Menos de 1MB promedio
    });
  });

  describe('🔄 Concurrencia y Paralelización', () => {
    it('debe manejar múltiples usuarios concurrentes', async () => {
      const userCount = 50;
      const messagesPerUser = 10;

      const userEngines = Array.from({ length: userCount }, (_, i) => 
        new ConversationEngine(`concurrent-user-${i}`)
      );

      const concurrentPromises: Promise<any>[] = [];

      // Generar promesas concurrentes
      for (let userIndex = 0; userIndex < userCount; userIndex++) {
        for (let msgIndex = 0; msgIndex < messagesPerUser; msgIndex++) {
          concurrentPromises.push(
            userEngines[userIndex].processUserMessage(
              `Usuario ${userIndex}, mensaje ${msgIndex}`
            )
          );
        }
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(concurrentPromises);
      const endTime = performance.now();

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBeGreaterThan(userCount * messagesPerUser * 0.95); // 95% éxito
      expect(failed).toBeLessThan(userCount * messagesPerUser * 0.05); // 5% fallo máximo
      expect(endTime - startTime).toBeLessThan(10000); // Menos de 10 segundos total
    });

    it('debe balancear carga entre instancias del agente', async () => {
      const agentInstances = Array.from({ length: 5 }, (_, i) => 
        new MervinAgent({
          userId: `load-balance-${i}`,
          userPermissions: { id: 'master_contractor', features: ['all'] },
          subscriptionLevel: 'master_contractor',
          debug: false
        })
      );

      const tasks = Array.from({ length: 25 }, (_, i) => 
        `Tarea de balanceo ${i}`
      );

      const startTime = performance.now();
      const promises = tasks.map((task, index) => {
        const agentIndex = index % agentInstances.length;
        return agentInstances[agentIndex].processUserInput(task, []);
      });

      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(25);
      expect(endTime - startTime).toBeLessThan(8000); // Paralelización efectiva
    });

    it('debe prevenir race conditions en estado compartido', async () => {
      const sharedEngine = new ConversationEngine('race-condition-test');
      
      // Múltiples operaciones concurrentes que modifican estado
      const racePromises = Array.from({ length: 20 }, (_, i) => 
        sharedEngine.processUserMessage(`Race condition test ${i}`)
      );

      const results = await Promise.allSettled(racePromises);
      
      // Todas las operaciones deberían completarse sin corrupción
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(20);

      // El estado final debería ser consistente
      const finalState = sharedEngine.getState();
      expect(finalState).toBeDefined();
    });

    it('debe optimizar uso de CPU en operaciones paralelas', async () => {
      const cpuIntensiveTasks = Array.from({ length: 10 }, (_, i) => 
        `Análisis complejo de datos masivos para proyecto ${i}`
      );

      const startTime = process.hrtime();
      
      const results = await Promise.all(
        cpuIntensiveTasks.map(task => 
          agent.processUserInput(task, [])
        )
      );

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const totalTime = seconds * 1000 + nanoseconds / 1000000; // En ms

      expect(results).toHaveLength(10);
      expect(totalTime).toBeLessThan(15000); // Menos de 15s para todas las tareas
    });
  });

  describe('🎯 Degradación Graceful', () => {
    it('debe mantener funcionalidad básica bajo alta carga', async () => {
      // Simular alta carga del sistema
      const highLoadPromises = Array.from({ length: 200 }, (_, i) => 
        engine.processUserMessage(`Carga alta ${i}`)
      );

      const results = await Promise.allSettled(highLoadPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      // Al menos 80% debería funcionar incluso bajo alta carga
      expect(successful.length).toBeGreaterThan(160);
      expect(failed.length).toBeLessThan(40);
    });

    it('debe priorizar usuarios premium bajo limitaciones', async () => {
      const basicAgent = new MervinAgent({
        userId: 'basic-user',
        userPermissions: { id: 'basic', features: ['chat'] },
        subscriptionLevel: 'basic',
        debug: false
      });

      const premiumAgent = new MervinAgent({
        userId: 'premium-user',
        userPermissions: { id: 'master_contractor', features: ['all'] },
        subscriptionLevel: 'master_contractor',
        debug: false
      });

      // Bajo estrés, usuarios premium deberían tener mejor rendimiento
      const basicPromises = Array.from({ length: 50 }, (_, i) => 
        basicAgent.processUserInput(`Basic task ${i}`, [])
      );

      const premiumPromises = Array.from({ length: 50 }, (_, i) => 
        premiumAgent.processUserInput(`Premium task ${i}`, [])
      );

      const startTime = performance.now();
      const [basicResults, premiumResults] = await Promise.all([
        Promise.allSettled(basicPromises),
        Promise.allSettled(premiumPromises)
      ]);
      const endTime = performance.now();

      const basicSuccess = basicResults.filter(r => r.status === 'fulfilled').length;
      const premiumSuccess = premiumResults.filter(r => r.status === 'fulfilled').length;

      // Usuarios premium deberían tener mayor tasa de éxito
      expect(premiumSuccess).toBeGreaterThanOrEqual(basicSuccess);
      expect(endTime - startTime).toBeLessThan(20000);
    });

    it('debe reducir funcionalidad no esencial bajo estrés', async () => {
      // Simular sistema bajo estrés
      const stressEngine = new ConversationEngine('stress-test');
      
      // Generar carga extrema
      const stressPromises = Array.from({ length: 500 }, (_, i) => 
        stressEngine.processUserMessage(`Stress test ${i}`)
      );

      const results = await Promise.allSettled(stressPromises);
      
      // El sistema debería seguir funcionando, aunque posiblemente con funcionalidad reducida
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(250); // Al menos 50% bajo estrés extremo
    });

    it('debe recuperarse automáticamente después de picos de carga', async () => {
      // Pico inicial de carga
      const peakPromises = Array.from({ length: 100 }, (_, i) => 
        engine.processUserMessage(`Peak load ${i}`)
      );

      await Promise.allSettled(peakPromises);

      // Pausa para recuperación
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar recuperación con carga normal
      const recoveryStartTime = performance.now();
      await engine.processUserMessage('Test recovery message');
      const recoveryEndTime = performance.now();

      const recoveryTime = recoveryEndTime - recoveryStartTime;
      expect(recoveryTime).toBeLessThan(1000); // Debería recuperarse rápidamente
    });
  });

  describe('🔧 Optimización de Algoritmos', () => {
    it('debe optimizar búsqueda en historial conversacional', async () => {
      // Crear historial grande
      for (let i = 0; i < 1000; i++) {
        await engine.processUserMessage(`Historial ${i}: información relevante`);
      }

      // Buscar información específica debería ser rápida
      const searchStartTime = performance.now();
      const response = await engine.processUserMessage('¿Qué información relevante mencioné?');
      const searchEndTime = performance.now();

      expect(searchEndTime - searchStartTime).toBeLessThan(500); // Búsqueda < 500ms
      expect(response.message).toContain('información'); // Debería encontrar referencias
    });

    it('debe optimizar detección de idioma para textos largos', async () => {
      const longTexts = [
        'A'.repeat(10000) + ' This is a very long English text',
        'B'.repeat(10000) + ' Este es un texto muy largo en español',
        'C'.repeat(10000) + ' Ceci est un très long texte en français'
      ];

      for (const text of longTexts) {
        const startTime = performance.now();
        const response = await engine.processUserMessage(text);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(2000); // Menos de 2s para texto largo
        expect(response.languageProfile).toBeDefined();
      }
    });

    it('debe optimizar generación de respuestas complejas', async () => {
      const complexQueries = [
        'Analiza 100 materiales, calcula costos con 15 variables, genera 3 alternativas',
        'Procesa información de 50 clientes, identifica patrones, sugiere acciones',
        'Coordina 10 endpoints, valida 20 reglas de negocio, genera reporte completo'
      ];

      for (const query of complexQueries) {
        const startTime = performance.now();
        const result = await agent.processUserInput(query, []);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(5000); // Menos de 5s para procesamiento complejo
        expect(result).toBeDefined();
      }
    });

    it('debe cachear resultados costosos computacionalmente', async () => {
      const expensiveQuery = 'Análisis computacional muy costoso con muchos cálculos';

      // Primera ejecución (sin caché)
      const firstStartTime = performance.now();
      const firstResult = await agent.processUserInput(expensiveQuery, []);
      const firstEndTime = performance.now();
      const firstDuration = firstEndTime - firstStartTime;

      // Segunda ejecución (con caché)
      const secondStartTime = performance.now();
      const secondResult = await agent.processUserInput(expensiveQuery, []);
      const secondEndTime = performance.now();
      const secondDuration = secondEndTime - secondStartTime;

      expect(firstResult).toBeDefined();
      expect(secondResult).toBeDefined();
      
      // La segunda ejecución debería ser significativamente más rápida
      expect(secondDuration).toBeLessThan(firstDuration * 0.7); // 30% más rápida
    });
  });
});