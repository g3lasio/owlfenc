/**
 * MERVIN V3 - PRUEBA DE CONCEPTO (POC)
 * 
 * Este archivo demuestra el flujo completo del nuevo modo agente.
 */

import { AgentCore } from '../agent/AgentCore';
import type { PlanningContext } from '../types/agent-types';

// Mock de herramientas disponibles
const MOCK_TOOLS = [
  {
    name: 'search_client',
    description: 'Busca un cliente por nombre, email o teléfono',
    input_schema: { type: 'object', properties: { searchTerm: { type: 'string' } } }
  },
  {
    name: 'create_estimate_workflow',
    description: 'Crea un estimado completo con DeepSearch',
    input_schema: { type: 'object', properties: { clientName: { type: 'string' }, projectDescription: { type: 'string' } } }
  },
  {
    name: 'send_email',
    description: 'Envía un email a un cliente',
    input_schema: { type: 'object', properties: { email: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } } }
  }
];

async function runPoC() {
  console.log('--- INICIANDO PRUEBA DE CONCEPTO DE MERVIN V3 ---');

  // 1. Configurar el agente
  const agent = new AgentCore('user-poc-123', {}, 'http://localhost:5000', { debug: true });

  // 2. Definir el contexto de la solicitud
  const context: PlanningContext = {
    userInput: 'Necesito un estimado para un nuevo cliente, Juan Pérez. El proyecto es una cerca de madera de 100 pies.',
    userId: 'user-poc-123',
    contractorProfile: {
      companyName: 'Pérez Fencing Co.',
      email: 'contact@perezfencing.com'
    },
    conversationHistory: [],
    recentActions: [],
    availableTools: MOCK_TOOLS as any
  };

  // 3. Procesar la solicitud
  const initialResponse = await agent.processRequest(context);

  console.log('\n--- RESPUESTA INICIAL DEL AGENTE ---');
  console.log(JSON.stringify(initialResponse, null, 2));

  if (initialResponse.type === 'needs_confirmation' && initialResponse.executionId) {
    console.log('\n--- EL PLAN REQUIERE CONFIRMACIÓN ---');
    console.log('Simulando aprobación del usuario...');

    // 4. Reanudar la ejecución después de la confirmación
    const finalResponse = await agent.resumeExecution(initialResponse.executionId, { confirmed: true });

    console.log('\n--- RESPUESTA FINAL DEL AGENTE ---');
    console.log(JSON.stringify(finalResponse, null, 2));
  } else if (initialResponse.type === 'task_completed') {
    console.log('\n--- TAREA COMPLETADA DIRECTAMENTE ---');
  } else {
    console.error('\n--- HUBO UN ERROR ---');
  }

  console.log('\n--- PRUEBA DE CONCEPTO FINALIZADA ---');
}

// Ejecutar la PoC
runPoC().catch(error => {
  console.error('Error fatal en la PoC:', error);
});
