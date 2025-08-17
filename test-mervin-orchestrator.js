/**
 * TEST RÁPIDO - MERVIN ORCHESTRATOR
 * Script simple para probar que el sistema unificado de Mervin AI funciona correctamente
 */

const { MervinChatOrchestrator } = require('./server/ai/MervinChatOrchestrator');

async function testMervinOrchestrator() {
  console.log('🧪 [TEST] Iniciando prueba del orquestrador de Mervin AI...');

  try {
    // Crear una instancia del orquestrador
    console.log('🔧 [TEST] Creando instancia del orquestrador...');
    const orchestrator = new MervinChatOrchestrator();

    // Test 1: Consulta simple
    console.log('\n📝 [TEST] Ejecutando Test 1: Consulta simple...');
    const simpleRequest = {
      input: "¿Cuánto cuesta una cerca de madera?",
      userId: "test-user-123",
      conversationHistory: [],
      agentMode: 'intelligent'
    };

    const simpleResponse = await orchestrator.processRequest(simpleRequest);
    console.log('✅ [TEST] Respuesta Test 1:', simpleResponse.conversationalResponse.substring(0, 100) + '...');

    // Test 2: Investigación web
    console.log('\n🌐 [TEST] Ejecutando Test 2: Investigación web...');
    const researchRequest = {
      input: "Investiga los precios actuales de materiales para cercas de vinyl en California",
      userId: "test-user-123",
      conversationHistory: [],
      agentMode: 'intelligent',
      requiresWebResearch: true
    };

    const researchResponse = await orchestrator.processRequest(researchRequest);
    console.log('✅ [TEST] Respuesta Test 2:', researchResponse.conversationalResponse.substring(0, 100) + '...');
    console.log('🔍 [TEST] Investigación web:', researchResponse.webResearchData ? 'Datos obtenidos' : 'Sin datos');

    // Test 3: Ejecución de tarea
    console.log('\n⚡ [TEST] Ejecutando Test 3: Ejecución de tarea...');
    const taskRequest = {
      input: "Crear un estimado para Juan García, cerca de vinyl 6 pies, 100 pies lineales",
      userId: "test-user-123",
      conversationHistory: [],
      agentMode: 'executor',
      taskType: 'estimate'
    };

    const taskResponse = await orchestrator.processRequest(taskRequest);
    console.log('✅ [TEST] Respuesta Test 3:', taskResponse.conversationalResponse.substring(0, 100) + '...');
    console.log('⚙️ [TEST] Plan de ejecución:', taskResponse.taskExecution ? `${taskResponse.taskExecution.steps.length} pasos` : 'Sin plan');

    console.log('\n🎉 [TEST] ¡Todos los tests completados exitosamente!');
    console.log('📊 [TEST] Resumen de resultados:');
    console.log(`   - Test 1 (Simple): ${simpleResponse.conversationalResponse ? '✅' : '❌'}`);
    console.log(`   - Test 2 (Investigación): ${researchResponse.webResearchData ? '✅' : '❌'}`);
    console.log(`   - Test 3 (Tareas): ${taskResponse.taskExecution ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ [TEST] Error durante las pruebas:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Ejecutar el test
testMervinOrchestrator();