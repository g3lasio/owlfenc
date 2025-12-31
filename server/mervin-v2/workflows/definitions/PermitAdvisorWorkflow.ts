/**
 * Permit Advisor Workflow Definition
 * 
 * Workflow para analizar permisos requeridos para proyectos de construcción.
 * Extrae información del mensaje del usuario, valida, analiza permisos,
 * genera PDF y guarda en historial.
 * 
 * Pasos:
 * 1. Extraer información del proyecto del mensaje del usuario
 * 2. Validar dirección
 * 3. Analizar permisos (usando enhancedPermitService)
 * 4. Generar PDF del reporte
 * 5. Guardar en historial
 * 6. Formatear respuesta para el usuario
 */

import { WorkflowDefinition } from '../types';

export const PermitAdvisorWorkflow: WorkflowDefinition = {
  id: 'permit_advisor',
  name: 'Permit Advisor',
  description: 'Analiza permisos requeridos para proyectos de construcción',
  category: 'permits',
  version: '1.0.0',
  
  requiredContext: ['userId', 'userMessage'],
  
  config: {
    allowInterruptions: false, // Por ahora no interrumpir, en el futuro podemos agregar
    saveStateOnEachStep: true,
    maxDurationMs: 120000 // 2 minutos
  },
  
  steps: [
    // PASO 1: Extraer información del proyecto
    {
      id: 'extract_project_info',
      type: 'transform',
      name: 'Extraer Información del Proyecto',
      description: 'Analizando tu solicitud...',
      transform: {
        input: 'userMessage',
        output: 'projectInfo',
        operation: 'extract_permit_request'
      }
    },
    
    // PASO 2: Validar dirección
    {
      id: 'validate_address',
      type: 'call',
      name: 'Validar Dirección',
      description: 'Validando dirección...',
      endpoint: {
        service: 'system_api',
        method: 'validateAddress',
        paramMapping: {
          'address': 'projectInfo.address'
        }
      }
    },
    
    // PASO 3: Analizar permisos
    {
      id: 'analyze_permits',
      type: 'call',
      name: 'Analizar Permisos',
      description: 'Consultando base de datos de permisos y regulaciones...',
      endpoint: {
        service: 'system_api',
        method: 'analyzePermits',
        paramMapping: {
          'address': 'projectInfo.address',
          'projectType': 'projectInfo.projectType',
          'projectDescription': 'projectInfo.description'
        }
      },
      retryPolicy: {
        maxRetries: 2,
        backoffMs: 1000
      },
      timeout: 60000 // 60 segundos
    },
    
    // PASO 4: Generar PDF
    {
      id: 'generate_pdf',
      type: 'call',
      name: 'Generar Reporte PDF',
      description: 'Generando reporte en PDF...',
      endpoint: {
        service: 'system_api',
        method: 'generatePermitPDF',
        paramMapping: {
          'permitData': 'analyze_permits',
          'projectInfo': 'projectInfo'
        }
      },
      timeout: 30000 // 30 segundos
    },
    
    // PASO 5: Guardar en historial
    {
      id: 'save_to_history',
      type: 'call',
      name: 'Guardar en Historial',
      description: 'Guardando en tu historial...',
      endpoint: {
        service: 'system_api',
        method: 'savePermitHistory',
        paramMapping: {
          'userId': 'userId',
          'address': 'projectInfo.address',
          'projectType': 'projectInfo.projectType',
          'results': 'analyze_permits',
          'pdfUrl': 'generate_pdf.url'
        }
      }
    },
    
    // PASO 6: Formatear respuesta
    {
      id: 'format_response',
      type: 'transform',
      name: 'Formatear Respuesta',
      description: 'Preparando respuesta...',
      transform: {
        input: 'analyze_permits',
        output: 'formattedResponse',
        operation: 'format_permit_response'
      }
    }
  ]
};
