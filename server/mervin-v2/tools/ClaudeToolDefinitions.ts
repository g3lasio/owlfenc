/**
 * CLAUDE TOOL DEFINITIONS
 * 
 * Definiciones de herramientas (workflows) que Claude puede usar.
 * Estas herramientas representan workflows completos, no acciones individuales.
 */

import type { ToolDefinition } from '../ai/ClaudeConversationalEngine';

// ============= WORKFLOW TOOLS =============

export const CLAUDE_WORKFLOW_TOOLS: ToolDefinition[] = [
  // PROPERTY VERIFICATION WORKFLOW
  {
    name: 'verify_property_ownership',
    description: `Verifica la información de ownership (dueño) de una propiedad usando la base de datos de ATTOM.
    
Usa esta herramienta cuando el usuario:
- Quiera saber quién es el dueño de una propiedad
- Necesite verificar información de una propiedad antes de hacer un estimado
- Pida detalles de una propiedad (sqft, año de construcción, etc.)

Esta herramienta devuelve:
- Nombre del dueño actual
- Información de la propiedad (tamaño, habitaciones, etc.)
- Historial de ownership si está disponible
- Si el dueño vive en la propiedad (owner-occupied)`,
    input_schema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Dirección completa de la propiedad. Debe incluir calle, ciudad, estado y código postal si está disponible. Ejemplo: "123 Main St, Fairfield, CA 94534"'
        }
      },
      required: ['address']
    }
  },
  
  // ESTIMATE WORKFLOW
  {
    name: 'create_estimate_workflow',
    description: `Ejecuta el workflow completo para crear un estimado profesional de construcción.

Este workflow incluye automáticamente:
1. Buscar o crear el cliente en el sistema
2. Analizar el proyecto con DeepSearch IA para calcular materiales y mano de obra
3. Generar el estimado completo con todos los cálculos
4. Crear URL compartible
5. Opcionalmente generar PDF y enviar por email

Usa esta herramienta cuando el usuario:
- Quiera crear un estimado para un cliente
- Pida un presupuesto o cotización
- Necesite calcular costos de un proyecto

IMPORTANTE: Si falta información crítica (nombre del cliente, descripción del proyecto), 
pregunta al usuario ANTES de llamar a esta herramienta. No inventes datos.`,
    input_schema: {
      type: 'object',
      properties: {
        clientName: {
          type: 'string',
          description: 'Nombre completo del cliente. Si el usuario menciona un nombre parcial o apodo, pregunta por el nombre completo.'
        },
        clientEmail: {
          type: 'string',
          description: 'Email del cliente (opcional). Si no lo tienes, puedes omitirlo.'
        },
        clientPhone: {
          type: 'string',
          description: 'Teléfono del cliente (opcional).'
        },
        clientAddress: {
          type: 'string',
          description: 'Dirección donde se realizará el proyecto. REQUERIDO para DeepSearch.'
        },
        projectType: {
          type: 'string',
          description: 'Tipo de proyecto: fence, deck, patio, concrete, roofing, etc.'
        },
        projectDescription: {
          type: 'string',
          description: 'Descripción detallada del proyecto. Incluye medidas, materiales específicos, grosor, altura, etc. Mientras más detallado, mejor será el cálculo de DeepSearch.'
        },
        projectDimensions: {
          type: 'object',
          description: 'Dimensiones del proyecto en formato estructurado (opcional si ya están en la descripción).',
          properties: {
            length: { type: 'number' },
            width: { type: 'number' },
            height: { type: 'number' },
            thickness: { type: 'number' },
            unit: { type: 'string', enum: ['feet', 'sqft', 'inches', 'meters'] }
          }
        },
        generatePDF: {
          type: 'boolean',
          description: 'Si se debe generar PDF del estimado. Default: true si el usuario lo pide explícitamente.'
        },
        sendEmail: {
          type: 'boolean',
          description: 'Si se debe enviar el estimado por email al cliente. Requiere que clientEmail esté presente.'
        }
      },
      required: ['clientName', 'clientAddress', 'projectType', 'projectDescription']
    }
  },
  
  // SEARCH CLIENT
  {
    name: 'search_client',
    description: `Busca un cliente existente en el sistema por nombre, email o teléfono.

Usa esta herramienta cuando:
- El usuario mencione un cliente por nombre y quieras verificar si existe
- Necesites obtener información de un cliente antes de crear un estimado o contrato
- El usuario pregunte por un cliente específico

Esta herramienta devuelve:
- Lista de clientes que coinciden con la búsqueda
- Información completa de cada cliente (nombre, email, teléfono, dirección)
- Si no encuentra coincidencias exactas, puede sugerir coincidencias parciales`,
    input_schema: {
      type: 'object',
      properties: {
        searchTerm: {
          type: 'string',
          description: 'Término de búsqueda: puede ser nombre, email o teléfono del cliente.'
        }
      },
      required: ['searchTerm']
    }
  },
  
  // CREATE CLIENT
  {
    name: 'create_client',
    description: `Crea un nuevo cliente en el sistema.

Usa esta herramienta cuando:
- El usuario quiera agregar un nuevo cliente
- Después de buscar un cliente y no encontrarlo
- El usuario proporcione información de un cliente nuevo

IMPORTANTE: Pregunta por la información mínima necesaria antes de crear el cliente.`,
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nombre completo del cliente'
        },
        email: {
          type: 'string',
          description: 'Email del cliente (opcional pero recomendado)'
        },
        phone: {
          type: 'string',
          description: 'Teléfono del cliente (opcional)'
        },
        address: {
          type: 'string',
          description: 'Dirección del cliente (opcional)'
        }
      },
      required: ['name']
    }
  },
  
  // CONTRACT WORKFLOW
  {
    name: 'create_contract_workflow',
    description: `Ejecuta el workflow completo para generar un contrato legal profesional.

Este workflow incluye automáticamente:
1. Recolectar información del cliente y proyecto
2. Generar contenido del contrato con IA
3. Iniciar proceso de firma dual (contractor + cliente)
4. Enviar links de firma por email

Usa esta herramienta cuando el usuario:
- Quiera crear un contrato para un proyecto
- Necesite formalizar un acuerdo con un cliente
- Pida un contrato legal

IMPORTANTE: Necesitas el email del cliente para enviar el contrato.`,
    input_schema: {
      type: 'object',
      properties: {
        clientName: {
          type: 'string',
          description: 'Nombre completo del cliente'
        },
        clientEmail: {
          type: 'string',
          description: 'Email del cliente (REQUERIDO para enviar el contrato)'
        },
        clientPhone: {
          type: 'string',
          description: 'Teléfono del cliente (opcional)'
        },
        projectType: {
          type: 'string',
          description: 'Tipo de proyecto: fence, deck, patio, concrete, roofing, etc.'
        },
        projectDescription: {
          type: 'string',
          description: 'Descripción detallada del alcance del trabajo'
        },
        projectAddress: {
          type: 'string',
          description: 'Dirección donde se realizará el trabajo'
        },
        totalAmount: {
          type: 'number',
          description: 'Monto total del contrato en dólares'
        },
        startDate: {
          type: 'string',
          description: 'Fecha de inicio del proyecto (opcional, formato: YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          description: 'Fecha estimada de finalización (opcional, formato: YYYY-MM-DD)'
        }
      },
      required: ['clientName', 'clientEmail', 'projectType', 'projectDescription', 'projectAddress', 'totalAmount']
    }
  },
  
  // PERMIT ADVISOR WORKFLOW
  {
    name: 'check_permits_workflow',
    description: `Consulta información sobre permisos de construcción necesarios para un proyecto.

Este workflow:
1. Analiza el tipo de proyecto y ubicación
2. Consulta requisitos de permisos locales
3. Proporciona información sobre qué permisos se necesitan

Usa esta herramienta cuando el usuario:
- Pregunte qué permisos necesita para un proyecto
- Quiera saber si necesita permiso para algo
- Pida información sobre regulaciones locales`,
    input_schema: {
      type: 'object',
      properties: {
        projectType: {
          type: 'string',
          description: 'Tipo de proyecto: fence, deck, patio, roofing, etc.'
        },
        projectAddress: {
          type: 'string',
          description: 'Dirección donde se realizará el proyecto'
        },
        projectScope: {
          type: 'string',
          description: 'Descripción breve del alcance (opcional)'
        }
      },
      required: ['projectType', 'projectAddress']
    }
  },
  
  // PERMIT ADVISOR WORKFLOW V2 (Con generación de PDF)
  {
    name: 'analyze_permits',
    description: `Analiza permisos requeridos para proyectos de construcción y genera un reporte completo en PDF.

Este workflow automatizado:
1. Extrae información del proyecto del mensaje del usuario
2. Valida la dirección de la propiedad
3. Analiza permisos requeridos usando la base de datos de regulaciones
4. Genera un reporte profesional en PDF descargable
5. Guarda la búsqueda en el historial del usuario

El reporte incluye:
- Lista completa de permisos requeridos con costos y timelines
- Códigos de construcción aplicables
- Proceso de aplicación paso a paso
- Información de contacto del departamento municipal
- Alertas importantes sobre el proyecto

Usa esta herramienta cuando el usuario:
- Pregunte qué permisos necesita para un proyecto específico
- Quiera un reporte detallado de permisos
- Necesite información sobre códigos de construcción
- Pida un PDF descargable con la información de permisos

IMPORTANTE: Esta herramienta puede extraer la información del mensaje del usuario,
pero si falta la dirección o el tipo de proyecto, debes incluirlos en userMessage.`,
    input_schema: {
      type: 'object',
      properties: {
        userMessage: {
          type: 'string',
          description: 'Mensaje completo del usuario con la solicitud de permisos. Debe incluir dirección y tipo de proyecto. Ejemplo: "Necesito saber qué permisos necesito para instalar una cerca de 8 pies en 123 Main St, Vacaville, CA"'
        }
      },
      required: ['userMessage']
    }
  }
];

// ============= HELPER FUNCTIONS =============

/**
 * Obtener herramienta por nombre
 */
export function getToolByName(toolName: string): ToolDefinition | null {
  return CLAUDE_WORKFLOW_TOOLS.find(t => t.name === toolName) || null;
}

/**
 * Obtener todas las herramientas
 */
export function getAllTools(): ToolDefinition[] {
  return CLAUDE_WORKFLOW_TOOLS;
}

/**
 * Obtener herramientas por categoría
 */
export function getToolsByCategory(category: 'estimate' | 'contract' | 'permit' | 'property' | 'client'): ToolDefinition[] {
  const categoryMap: Record<string, string[]> = {
    estimate: ['create_estimate_workflow'],
    contract: ['create_contract_workflow'],
    permit: ['check_permits_workflow', 'analyze_permits'],
    property: ['verify_property_ownership'],
    client: ['search_client', 'create_client']
  };
  
  const toolNames = categoryMap[category] || [];
  return CLAUDE_WORKFLOW_TOOLS.filter(t => toolNames.includes(t.name));
}

/**
 * Validar parámetros de herramienta
 */
export function validateToolParams(toolName: string, params: any): { valid: boolean; errors: string[] } {
  const tool = getToolByName(toolName);
  if (!tool) {
    return { valid: false, errors: [`Tool not found: ${toolName}`] };
  }
  
  const errors: string[] = [];
  const required = tool.input_schema.required || [];
  
  // Verificar campos requeridos
  for (const field of required) {
    if (params[field] === undefined || params[field] === null || params[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
