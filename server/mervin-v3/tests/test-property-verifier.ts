/**
 * TEST: PROPERTY VERIFIER EN MODO AGENTE V3
 * 
 * Prueba la funcionalidad de verificación de propiedad usando el modo agente.
 */

import { AgentCore } from '../agent/AgentCore';
import type { PlanningContext } from '../types/agent-types';
import { getAllTools } from '../../mervin-v2/tools/ClaudeToolDefinitions';

async function testPropertyVerifier() {
  console.log('\n===========================================');
  console.log('🧪 TEST: PROPERTY VERIFIER EN MODO AGENTE V3');
  console.log('===========================================\n');

  // Configuración de prueba
  const userId = 'test-user-123';
  const authHeaders = {
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json'
  };
  const baseURL = process.env.BASE_URL || 'http://localhost:5000';

  // Crear el agente
  const agent = new AgentCore(userId, authHeaders, baseURL, { debug: true });

  // Casos de prueba
  const testCases = [
    {
      name: 'Caso 1: Verificación simple con dirección completa',
      userInput: 'Verifica quién es el dueño de la propiedad en 123 Main St, Fairfield, CA 94534',
      expectedSteps: 1
    },
    {
      name: 'Caso 2: Verificación con dirección parcial (debe preguntar)',
      userInput: 'Verifica la propiedad en Main Street',
      expectedSteps: 2 // Pregunta + Verificación
    },
    {
      name: 'Caso 3: Verificación múltiple',
      userInput: 'Verifica las propiedades en 123 Main St y 456 Oak Ave, ambas en Fairfield CA',
      expectedSteps: 2 // Una verificación por cada dirección
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`);
    console.log(`   Input: "${testCase.userInput}"`);
    console.log('   ---');

    try {
      const context: PlanningContext = {
        userInput: testCase.userInput,
        userId,
        contractorProfile: {
          companyName: 'Test Fencing Co.',
          businessType: 'Fencing Contractor',
          city: 'Fairfield',
          state: 'CA',
          email: 'test@example.com'
        },
        conversationHistory: [],
        recentActions: [],
        availableTools: getAllTools()
      };

      const response = await agent.processRequest(context);

      console.log(`\n   ✅ Respuesta del agente:`);
      console.log(`   Tipo: ${response.type}`);
      console.log(`   Mensaje: ${response.message.substring(0, 200)}...`);
      
      if (response.plan) {
        console.log(`   Pasos en el plan: ${response.plan.steps.length}`);
        console.log(`   Complejidad: ${response.plan.complexity}`);
        
        response.plan.steps.forEach((step, idx) => {
          console.log(`     ${idx + 1}. ${step.description}`);
        });
      }

      if (response.data) {
        console.log(`   Datos obtenidos:`, Object.keys(response.data));
      }

      console.log(`   Tiempo de ejecución: ${response.executionTime}ms`);

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n===========================================');
  console.log('✅ PRUEBAS COMPLETADAS');
  console.log('===========================================\n');
}

// Ejecutar las pruebas
if (require.main === module) {
  testPropertyVerifier().catch(error => {
    console.error('Error fatal en las pruebas:', error);
    process.exit(1);
  });
}

export { testPropertyVerifier };
