/**
 * Permit Advisor Workflow Definition
 * 
 * Workflow para consultar información sobre permisos de construcción necesarios.
 * 
 * Pasos:
 * 1. Recolectar información del proyecto
 * 2. Consultar API de permisos
 * 3. Formatear y retornar información
 */

import { WorkflowDefinition } from '../types';

export const PermitWorkflow: WorkflowDefinition = {
  id: 'permit_advisor',
  name: 'Permit Advisor',
  description: 'Consulta información sobre permisos de construcción necesarios',
  category: 'permit',
  version: '1.0.0',
  
  requiredContext: ['userId'],
  
  config: {
    allowInterruptions: true,
    saveStateOnEachStep: false,
    maxDurationMs: 60000 // 1 minuto
  },
  
  steps: [
    // PASO 1: Recolectar información del proyecto
    {
      id: 'collect_project_info',
      type: 'collect',
      name: 'Información del Proyecto',
      description: 'Recolectando información del proyecto...',
      collectFields: [
        {
          name: 'projectType',
          type: 'string',
          required: true,
          prompt: '¿Qué tipo de proyecto es? (fence, deck, patio, roofing, etc.)'
        },
        {
          name: 'projectAddress',
          type: 'address',
          required: true,
          prompt: '¿Dónde se realizará el proyecto?'
        },
        {
          name: 'projectScope',
          type: 'string',
          required: false,
          prompt: 'Describe brevemente el alcance del proyecto (opcional)'
        }
      ]
    },
    
    // PASO 2: Consultar información de permisos
    {
      id: 'check_permits',
      type: 'call',
      name: 'Consultar Permisos',
      description: 'Consultando requisitos de permisos...',
      endpoint: {
        service: 'system_api',
        method: 'analyzePermit',
        paramMapping: {
          'projectType': 'projectType',
          'projectAddress': 'projectAddress',
          'projectScope': 'projectScope'
        }
      },
      retryPolicy: {
        maxRetries: 2,
        backoffMs: 1000
      },
      timeout: 30000 // 30 segundos
    },
    
    // PASO 3: Formatear resultado
    {
      id: 'format_permit_info',
      type: 'transform',
      name: 'Formatear Información',
      description: 'Preparando información de permisos...',
      transform: {
        input: 'check_permits',
        output: 'formattedPermitInfo',
        operation: 'identity'
      }
    }
  ]
};
