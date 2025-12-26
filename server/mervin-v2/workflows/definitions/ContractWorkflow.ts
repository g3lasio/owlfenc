/**
 * Contract Workflow Definition
 * 
 * Workflow para generar contratos legales profesionales.
 * 
 * Pasos:
 * 1. Recolectar información del cliente y proyecto
 * 2. Generar contenido del contrato con Claude
 * 3. Iniciar proceso de dual-signature
 * 4. Retornar URLs de firma
 */

import { WorkflowDefinition } from '../types';

export const ContractWorkflow: WorkflowDefinition = {
  id: 'contract_generator',
  name: 'Contract Generator',
  description: 'Genera un contrato legal profesional con sistema de firma dual',
  category: 'contract',
  version: '1.0.0',
  
  requiredContext: ['userId'],
  
  config: {
    allowInterruptions: true,
    saveStateOnEachStep: true,
    maxDurationMs: 180000 // 3 minutos
  },
  
  steps: [
    // PASO 1: Recolectar información del cliente
    {
      id: 'collect_client_info',
      type: 'collect',
      name: 'Información del Cliente',
      description: 'Recolectando información del cliente...',
      collectFields: [
        {
          name: 'clientName',
          type: 'string',
          required: true,
          prompt: '¿Cuál es el nombre completo del cliente?'
        },
        {
          name: 'clientEmail',
          type: 'email',
          required: true,
          prompt: '¿Cuál es el email del cliente? (necesario para enviar el contrato)'
        },
        {
          name: 'clientPhone',
          type: 'phone',
          required: false,
          prompt: '¿Cuál es el teléfono del cliente? (opcional)'
        }
      ]
    },
    
    // PASO 2: Recolectar detalles del proyecto
    {
      id: 'collect_project_info',
      type: 'collect',
      name: 'Detalles del Proyecto',
      description: 'Recolectando detalles del proyecto...',
      collectFields: [
        {
          name: 'projectType',
          type: 'string',
          required: true,
          prompt: '¿Qué tipo de proyecto es?'
        },
        {
          name: 'projectDescription',
          type: 'string',
          required: true,
          prompt: 'Describe el alcance del trabajo'
        },
        {
          name: 'projectAddress',
          type: 'address',
          required: true,
          prompt: '¿Dónde se realizará el trabajo?'
        },
        {
          name: 'totalAmount',
          type: 'number',
          required: true,
          prompt: '¿Cuál es el monto total del contrato?'
        },
        {
          name: 'startDate',
          type: 'string',
          required: false,
          prompt: '¿Fecha de inicio? (opcional)'
        },
        {
          name: 'endDate',
          type: 'string',
          required: false,
          prompt: '¿Fecha de finalización estimada? (opcional)'
        }
      ]
    },
    
    // PASO 3: Generar contenido del contrato con Claude
    {
      id: 'generate_contract_content',
      type: 'call',
      name: 'Generar Contrato',
      description: 'Generando contrato legal profesional...',
      endpoint: {
        service: 'custom',
        method: 'generate_contract_with_claude',
        paramMapping: {
          'clientName': 'clientName',
          'projectType': 'projectType',
          'projectAddress': 'projectAddress',
          'totalAmount': 'totalAmount',
          'startDate': 'startDate',
          'endDate': 'endDate',
          'projectDescription': 'projectDescription'
        }
      },
      timeout: 60000 // 60 segundos
    },
    
    // PASO 4: Iniciar dual-signature
    {
      id: 'initiate_dual_signature',
      type: 'call',
      name: 'Iniciar Firma Dual',
      description: 'Preparando contrato para firma...',
      endpoint: {
        service: 'system_api',
        method: 'createContract',
        paramMapping: {
          'clientName': 'clientName',
          'clientEmail': 'clientEmail',
          'projectType': 'projectType',
          'amount': 'totalAmount',
          'startDate': 'startDate',
          'endDate': 'endDate'
        }
      }
    }
  ]
};
