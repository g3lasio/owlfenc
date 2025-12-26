/**
 * Property Verification Workflow Definition
 * 
 * Workflow simple para verificar información de ownership de una propiedad.
 * Este es el workflow más sencillo, ideal para pruebas iniciales.
 * 
 * Pasos:
 * 1. Recolectar dirección de la propiedad
 * 2. Llamar a ATTOM API para verificar ownership
 * 3. Retornar información formateada
 */

import { WorkflowDefinition } from '../types';

export const PropertyVerificationWorkflow: WorkflowDefinition = {
  id: 'property_verification',
  name: 'Property Ownership Verification',
  description: 'Verifica la información de ownership de una propiedad usando ATTOM Data',
  category: 'property',
  version: '1.0.0',
  
  requiredContext: ['userId', 'address'],
  
  config: {
    allowInterruptions: false,
    saveStateOnEachStep: false,
    maxDurationMs: 30000 // 30 segundos
  },
  
  steps: [
    // PASO 1: Verificar que tenemos la dirección
    {
      id: 'validate_address',
      type: 'transform',
      name: 'Validar Dirección',
      description: 'Validando dirección de la propiedad...',
      transform: {
        input: 'address',
        output: 'validatedAddress',
        operation: 'validate_address'
      }
    },
    
    // PASO 2: Llamar a ATTOM API
    {
      id: 'verify_property',
      type: 'call',
      name: 'Verificar Propiedad',
      description: 'Consultando base de datos de ATTOM...',
      endpoint: {
        service: 'system_api',
        method: 'verifyProperty',
        paramMapping: {
          'address': 'validatedAddress'
        }
      },
      retryPolicy: {
        maxRetries: 2,
        backoffMs: 1000
      },
      timeout: 20000 // 20 segundos
    },
    
    // PASO 3: Formatear resultado
    {
      id: 'format_result',
      type: 'transform',
      name: 'Formatear Resultado',
      description: 'Preparando información de la propiedad...',
      transform: {
        input: 'verify_property',
        output: 'formattedResult',
        operation: 'format_property_info'
      }
    }
  ]
};
