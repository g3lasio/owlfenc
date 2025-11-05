/**
 * Estimate Workflow Definition
 * 
 * Workflow completo para generar un estimado siguiendo exactamente
 * el mismo proceso que el Estimate Wizard UI.
 * 
 * Pasos:
 * 1. Recolectar información del cliente
 * 2. Recolectar detalles del proyecto
 * 3. Ejecutar DeepSearch para materiales y mano de obra
 * 4. Generar salidas (PDF, URL, email)
 */

import { WorkflowDefinition } from '../types';

export const EstimateWorkflow: WorkflowDefinition = {
  id: 'estimate_wizard',
  name: 'Estimate Wizard',
  description: 'Genera un estimado profesional completo con cálculos automáticos de materiales y mano de obra',
  category: 'estimate',
  version: '1.0.0',
  
  requiredContext: ['userId'],
  
  config: {
    allowInterruptions: true,
    saveStateOnEachStep: true,
    maxDurationMs: 300000 // 5 minutos
  },
  
  steps: [
    // PASO 1: Recolectar información del cliente
    {
      id: 'collect_client',
      type: 'collect',
      name: 'Información del Cliente',
      description: 'Necesito la información del cliente para quien es este estimado',
      collectFields: [
        {
          name: 'clientName',
          type: 'string',
          required: true,
          prompt: '¿Cuál es el nombre del cliente?'
        },
        {
          name: 'clientEmail',
          type: 'email',
          required: false,
          prompt: '¿Cuál es el email del cliente? (opcional)'
        },
        {
          name: 'clientPhone',
          type: 'phone',
          required: false,
          prompt: '¿Cuál es el teléfono del cliente? (opcional)'
        },
        {
          name: 'clientAddress',
          type: 'address',
          required: true,
          prompt: '¿Cuál es la dirección del proyecto?'
        }
      ]
    },
    
    // PASO 2: Buscar o crear cliente en el sistema
    {
      id: 'find_or_create_client',
      type: 'call',
      name: 'Buscar Cliente',
      description: 'Buscar cliente existente o crear uno nuevo',
      endpoint: {
        service: 'system_api',
        method: 'findOrCreateClient',
        paramMapping: {
          'name': 'clientName',
          'email': 'clientEmail',
          'phone': 'clientPhone'
        }
      },
      onError: 'skip' // Si falla, continuar con cliente temporal
    },
    
    // PASO 3: Recolectar detalles del proyecto
    {
      id: 'collect_project_details',
      type: 'collect',
      name: 'Detalles del Proyecto',
      description: 'Necesito detalles sobre el proyecto para calcular materiales y mano de obra',
      collectFields: [
        {
          name: 'projectType',
          type: 'string',
          required: true,
          prompt: '¿Qué tipo de proyecto es? (fence, deck, patio, roof, etc.)'
        },
        {
          name: 'projectDescription',
          type: 'string',
          required: true,
          prompt: 'Describe el proyecto en detalle (incluye medidas, materiales específicos, alcance del trabajo)'
        },
        {
          name: 'projectDimensions',
          type: 'object',
          required: false,
          prompt: '¿Cuáles son las dimensiones? (ej: 100 pies lineales, 6 pies de alto)'
        }
      ]
    },
    
    // PASO 4: Decidir si usar DeepSearch basado en la calidad de la descripción
    {
      id: 'check_description_quality',
      type: 'branch',
      name: 'Verificar Calidad de Descripción',
      condition: {
        field: 'projectDescription',
        operator: 'exists',
        value: true,
        thenStep: 'run_deepsearch',
        elseStep: 'skip_deepsearch'
      }
    },
    
    // PASO 5: Ejecutar DeepSearch para cálculos automáticos
    {
      id: 'run_deepsearch',
      type: 'call',
      name: 'Ejecutar DeepSearch',
      description: 'Calculando materiales y mano de obra con IA...',
      endpoint: {
        service: 'deepsearch',
        method: 'combined',
        paramMapping: {
          'projectDescription': 'projectDescription',
          'location': 'clientAddress'
        }
      },
      retryPolicy: {
        maxRetries: 2,
        backoffMs: 1000
      },
      timeout: 60000 // 60 segundos
    },
    
    // PASO 6: Transformar resultados de DeepSearch a items del estimado
    {
      id: 'transform_deepsearch_results',
      type: 'transform',
      name: 'Procesar Resultados',
      description: 'Procesando items calculados...',
      transform: {
        input: 'run_deepsearch',
        output: 'estimateItems',
        operation: 'deepsearch_to_items'
      }
    },
    
    // PASO 7: Calcular totales del estimado
    {
      id: 'calculate_totals',
      type: 'transform',
      name: 'Calcular Totales',
      description: 'Calculando subtotal, impuestos y total...',
      transform: {
        input: 'estimateItems',
        output: 'totals',
        operation: 'calculate_estimate_totals'
      }
    },
    
    // PASO 8: Generar estimado completo
    {
      id: 'create_estimate',
      type: 'call',
      name: 'Crear Estimado',
      description: 'Generando estimado en el sistema...',
      endpoint: {
        service: 'system_api',
        method: 'createEstimate',
        paramMapping: {
          'clientName': 'clientName',
          'clientEmail': 'clientEmail',
          'clientPhone': 'clientPhone',
          'projectType': 'projectType',
          'dimensions': 'projectDimensions'
        }
      }
    },
    
    // PASO 9: Generar PDF (opcional, solo si el usuario lo pide)
    {
      id: 'check_generate_pdf',
      type: 'branch',
      name: 'Verificar si Generar PDF',
      condition: {
        field: 'generatePDF',
        operator: 'equals',
        value: true,
        thenStep: 'generate_pdf',
        elseStep: 'check_send_email'
      }
    },
    
    // PASO 10: Generar PDF
    {
      id: 'generate_pdf',
      type: 'call',
      name: 'Generar PDF',
      description: 'Generando PDF profesional...',
      endpoint: {
        service: 'custom',
        method: 'generate_estimate_pdf',
        paramMapping: {
          'estimateId': 'create_estimate.id'
        }
      }
    },
    
    // PASO 11: Generar URL compartible
    {
      id: 'generate_share_url',
      type: 'call',
      name: 'Generar URL',
      description: 'Generando URL compartible...',
      endpoint: {
        service: 'custom',
        method: 'generate_share_url',
        paramMapping: {
          'estimateId': 'create_estimate.id'
        }
      }
    },
    
    // PASO 12: Verificar si enviar email
    {
      id: 'check_send_email',
      type: 'branch',
      name: 'Verificar si Enviar Email',
      condition: {
        field: 'sendEmail',
        operator: 'equals',
        value: true,
        thenStep: 'send_email',
        elseStep: 'workflow_complete'
      }
    },
    
    // PASO 13: Enviar email al cliente
    {
      id: 'send_email',
      type: 'call',
      name: 'Enviar Email',
      description: 'Enviando estimado por email...',
      endpoint: {
        service: 'system_api',
        method: 'sendEstimateEmail',
        paramMapping: {
          'estimateId': 'create_estimate.id',
          'clientEmail': 'clientEmail'
        }
      },
      onError: 'skip' // Si falla el email, continuar
    },
    
    // PASO 14: Paso dummy de completado
    {
      id: 'workflow_complete',
      type: 'transform',
      name: 'Workflow Completado',
      transform: {
        input: 'create_estimate',
        output: 'finalResult',
        operation: 'identity'
      }
    },
    
    // PASO 15: Paso dummy para cuando se salta DeepSearch
    {
      id: 'skip_deepsearch',
      type: 'transform',
      name: 'Saltar DeepSearch',
      description: 'La descripción del proyecto es insuficiente para DeepSearch',
      transform: {
        input: 'projectDescription',
        output: 'skipReason',
        operation: 'skip_message'
      }
    }
  ]
};
