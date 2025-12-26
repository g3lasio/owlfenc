/**
 * TEST MERVIN CONVERSATIONAL
 * 
 * Script de prueba para el nuevo orquestador conversacional de Mervin AI.
 */

import { MervinConversationalOrchestrator } from './mervin-v2/orchestrator/MervinConversationalOrchestrator';

async function testPropertyVerification() {
  console.log('\n========================================');
  console.log('TEST: Property Verification Workflow');
  console.log('========================================\n');
  
  const orchestrator = new MervinConversationalOrchestrator(
    'test-user-123',
    {},
    'http://localhost:5000'
  );
  
  // Test 1: Verificar propiedad con dirección completa
  console.log('\n--- Test 1: Dirección completa ---');
  const response1 = await orchestrator.processMessage({
    input: 'verifica la propiedad en 123 Main St, Fairfield, CA 94534',
    userId: 'test-user-123'
  });
  
  console.log('\nResponse 1:');
  console.log('Type:', response1.type);
  console.log('Message:', response1.message);
  console.log('Execution time:', response1.executionTime, 'ms');
  
  // Test 2: Verificar propiedad con dirección incompleta (debería pedir más info)
  console.log('\n--- Test 2: Dirección incompleta ---');
  const response2 = await orchestrator.processMessage({
    input: 'verifica la casa de la calle main',
    userId: 'test-user-123'
  });
  
  console.log('\nResponse 2:');
  console.log('Type:', response2.type);
  console.log('Message:', response2.message);
  console.log('Execution time:', response2.executionTime, 'ms');
}

async function testEstimateWorkflow() {
  console.log('\n========================================');
  console.log('TEST: Estimate Workflow');
  console.log('========================================\n');
  
  const orchestrator = new MervinConversationalOrchestrator(
    'test-user-123',
    {},
    'http://localhost:5000'
  );
  
  // Test 1: Crear estimado con información completa
  console.log('\n--- Test 1: Estimado completo ---');
  const response1 = await orchestrator.processMessage({
    input: 'crea un estimado para Juan Perez, su proyecto es una cerca de madera de 100 pies lineales, 6 pies de alto, en 123 Main St, Fairfield, CA',
    userId: 'test-user-123'
  });
  
  console.log('\nResponse 1:');
  console.log('Type:', response1.type);
  console.log('Message:', response1.message);
  console.log('Execution time:', response1.executionTime, 'ms');
  
  // Test 2: Crear estimado con información incompleta (debería pedir más info)
  console.log('\n--- Test 2: Estimado incompleto ---');
  const response2 = await orchestrator.processMessage({
    input: 'crea un estimado para juan perez',
    userId: 'test-user-123'
  });
  
  console.log('\nResponse 2:');
  console.log('Type:', response2.type);
  console.log('Message:', response2.message);
  console.log('Execution time:', response2.executionTime, 'ms');
}

async function testConversationalFlow() {
  console.log('\n========================================');
  console.log('TEST: Conversational Flow (Multi-turn)');
  console.log('========================================\n');
  
  const orchestrator = new MervinConversationalOrchestrator(
    'test-user-123',
    {},
    'http://localhost:5000'
  );
  
  // Turno 1: Usuario pide estimado con info incompleta
  console.log('\n--- Turno 1 ---');
  const turn1 = await orchestrator.processMessage({
    input: 'crea un estimado para juan perez',
    userId: 'test-user-123'
  });
  
  console.log('Mervin:', turn1.message);
  console.log('Conversation ID:', turn1.conversationId);
  
  // Turno 2: Usuario proporciona más información
  console.log('\n--- Turno 2 ---');
  const turn2 = await orchestrator.processMessage({
    input: 'es una cerca de madera de 100 pies, en 123 Main St, Fairfield, CA',
    userId: 'test-user-123',
    conversationId: turn1.conversationId
  });
  
  console.log('Mervin:', turn2.message);
  
  // Turno 3: Usuario confirma
  console.log('\n--- Turno 3 ---');
  const turn3 = await orchestrator.processMessage({
    input: 'simon, continua',
    userId: 'test-user-123',
    conversationId: turn1.conversationId
  });
  
  console.log('Mervin:', turn3.message);
}

async function testClientSearch() {
  console.log('\n========================================');
  console.log('TEST: Client Search');
  console.log('========================================\n');
  
  const orchestrator = new MervinConversationalOrchestrator(
    'test-user-123',
    {},
    'http://localhost:5000'
  );
  
  // Test: Buscar cliente
  console.log('\n--- Test: Buscar cliente ---');
  const response = await orchestrator.processMessage({
    input: 'busca el cliente juan perez',
    userId: 'test-user-123'
  });
  
  console.log('\nResponse:');
  console.log('Type:', response.type);
  console.log('Message:', response.message);
  console.log('Execution time:', response.executionTime, 'ms');
}

// Ejecutar tests
async function runAllTests() {
  try {
    // Test 1: Property Verification
    await testPropertyVerification();
    
    // Test 2: Client Search
    await testClientSearch();
    
    // Test 3: Estimate Workflow
    // await testEstimateWorkflow();
    
    // Test 4: Conversational Flow
    // await testConversationalFlow();
    
    console.log('\n========================================');
    console.log('ALL TESTS COMPLETED');
    console.log('========================================\n');
    
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
  }
}

// Ejecutar
runAllTests();
