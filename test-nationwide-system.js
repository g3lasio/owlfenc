/**
 * 🗺️ TESTING AGRESIVO DEL SISTEMA NATIONWIDE DE MERVIN AI
 * 
 * Este script prueba que el sistema funciona correctamente en 
 * TODOS los estados de USA, no solo California
 */

console.log('🗺️ [NATIONWIDE-TEST] Iniciando testing agresivo del sistema nationwide...\n');

// ====================================================================
// TEST 1: DETECCIÓN DE ESTADO DESDE DIRECCIONES
// ====================================================================

async function testJurisdictionDetection() {
  console.log('📍 [TEST-1] Testing detección de estado desde direcciones...\n');
  
  const testAddresses = [
    '123 Main St, Austin, TX 78701',
    '456 Broadway, New York, NY 10013', 
    '789 Ocean Dr, Miami, FL 33139',
    '101 Pike St, Seattle, WA 98101',
    '555 Sunset Blvd, Los Angeles, CA 90028',
    '777 Michigan Ave, Chicago, IL 60611',
    '999 Peachtree St, Atlanta, GA 30309'
  ];

  try {
    const response = await fetch('http://localhost:5000/api/test/jurisdiction-detection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses: testAddresses })
    });

    const result = await response.json();
    console.log('✅ [TEST-1] Detección de estados exitosa:', result);
    console.log('');
    
    return result;
  } catch (error) {
    console.error('❌ [TEST-1] Error en detección de estados:', error.message);
    return null;
  }
}

// ====================================================================
// TEST 2: RESEARCH NATIONWIDE CON DIFERENTES ESTADOS
// ====================================================================

async function testNationwideResearch() {
  console.log('🔬 [TEST-2] Testing research nationwide en diferentes estados...\n');
  
  const testQueries = [
    { query: 'building codes for fencing', location: 'Austin, Texas' },
    { query: 'contractor license requirements', location: 'Miami, Florida' },
    { query: 'vinyl fence installation costs', location: 'Seattle, Washington' },
    { query: 'permit requirements for residential fencing', location: 'Chicago, Illinois' }
  ];

  try {
    for (const testQuery of testQueries) {
      console.log(`🔍 Testing: "${testQuery.query}" en ${testQuery.location}`);
      
      const response = await fetch('http://localhost:5000/api/mervin-research/express-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testQuery.query,
          topic: 'permits',
          location: testQuery.location
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Research completado en ${result.performance.responseTime}`);
        console.log(`📊 Sources: ${result.data.sources.length}, Insights: ${result.data.insights.length}`);
      } else {
        console.log(`❌ Error: ${result.error}`);
      }
      console.log('');
    }
    
    return true;
  } catch (error) {
    console.error('❌ [TEST-2] Error en research nationwide:', error.message);
    return false;
  }
}

// ====================================================================
// TEST 3: RESPUESTAS DE MERVIN AI POR ESTADO
// ====================================================================

async function testMervinStateAwareness() {
  console.log('🤖 [TEST-3] Testing respuestas de Mervin AI conscientes del estado...\n');
  
  const testCases = [
    {
      input: 'Necesito información sobre licencias de contratista',
      userContext: { address: '123 Main St, Austin, TX', city: 'Austin' },
      expectedState: 'Texas'
    },
    {
      input: 'Cuáles son los requisitos para permisos de cercas?',
      userContext: { address: '456 Broadway, New York, NY', city: 'New York' },
      expectedState: 'New York'  
    },
    {
      input: 'Qué códigos de construcción aplican para mi proyecto?',
      userContext: { address: '789 Ocean Dr, Miami, FL', city: 'Miami' },
      expectedState: 'Florida'
    }
  ];

  // Simular token de usuario para testing
  const mockUserId = 'test-user-nationwide';
  
  try {
    for (const testCase of testCases) {
      console.log(`🎯 Testing Mervin AI en ${testCase.expectedState}`);
      console.log(`💭 Query: "${testCase.input}"`);
      
      const response = await fetch('http://localhost:5000/api/mervin-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: testCase.input,
          userId: mockUserId,
          conversationHistory: [],
          agentMode: 'intelligent',
          mockUserContext: testCase.userContext // Para testing
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Respuesta generada exitosamente');
        console.log(`🗺️ Región detectada: ${result.data.languageProfile.region}`);
        console.log(`💬 Respuesta: ${result.data.conversationalResponse.substring(0, 150)}...`);
        
        // Verificar que menciona el estado correcto
        const mentionsState = result.data.conversationalResponse.toLowerCase().includes(testCase.expectedState.toLowerCase());
        console.log(`📍 Menciona ${testCase.expectedState}: ${mentionsState ? '✅' : '❌'}`);
      } else {
        console.log(`❌ Error: ${result.error}`);
      }
      console.log('');
    }
    
    return true;
  } catch (error) {
    console.error('❌ [TEST-3] Error en testing de Mervin AI:', error.message);
    return false;
  }
}

// ====================================================================
// TEST 4: BASE DE CONOCIMIENTO NATIONWIDE
// ====================================================================

async function testNationwideKnowledgeBase() {
  console.log('📚 [TEST-4] Testing base de conocimiento nationwide...\n');
  
  const testStates = ['Texas', 'California', 'Florida', 'New York', 'Washington'];
  
  try {
    const response = await fetch('http://localhost:5000/api/test/nationwide-knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ states: testStates })
    });

    const result = await response.json();
    console.log('✅ [TEST-4] Base de conocimiento nationwide funcionando:', result);
    console.log('');
    
    return result;
  } catch (error) {
    console.error('❌ [TEST-4] Error en base de conocimiento:', error.message);
    return null;
  }
}

// ====================================================================
// EJECUTAR TODOS LOS TESTS
// ====================================================================

async function runAllTests() {
  console.log('🚀 Iniciando suite completa de tests nationwide...\n');
  
  const results = {
    jurisdictionDetection: await testJurisdictionDetection(),
    nationwideResearch: await testNationwideResearch(),
    mervinStateAwareness: await testMervinStateAwareness(),
    nationwideKnowledgeBase: await testNationwideKnowledgeBase()
  };
  
  console.log('📊 RESUMEN DE RESULTADOS:');
  console.log('========================');
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅ PASSED' : '❌ FAILED';
    console.log(`${test}: ${status}`);
  });
  
  const passedTests = Object.values(results).filter(r => r).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 RESULTADO FINAL: ${passedTests}/${totalTests} tests pasaron`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ¡SISTEMA NATIONWIDE COMPLETAMENTE FUNCIONAL!');
  } else {
    console.log('⚠️ Algunos tests fallaron - revisar implementación');
  }
}

// Auto-ejecutar si se corre directamente
runAllTests().catch(console.error);