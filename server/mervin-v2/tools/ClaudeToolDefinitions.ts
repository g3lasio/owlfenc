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
  },
  
  // ============= VISION TOOLS =============
  
  {
    name: 'create_contract_from_estimate_pdf',
    description: `Genera un contrato legal profesional a partir de un PDF de estimado adjunto.

Esta herramienta especializada:
1. Analiza el PDF del estimado automáticamente
2. Extrae todos los datos necesarios (cliente, proyecto, montos)
3. Valida que la información sea suficiente
4. Si falta información, pregunta al usuario específicamente qué necesita
5. Genera el contrato completo con firma dual

Usa esta herramienta cuando el usuario:
- Adjunte un PDF de estimado y pida generar un contrato
- Diga "el cliente aprobó el estimado, genera el contrato"
- Quiera convertir un estimado en contrato

IMPORTANTE: Esta herramienta maneja TODO el flujo automáticamente. 
NO necesitas llamar a analyze_images por separado.

Ejemplo de uso:
Usuario: "El cliente aprobó este estimado hace una semana, necesito el contrato hoy"
[Adjunta PDF]
→ Usa esta herramienta con el PDF adjunto`,
    input_schema: {
      type: 'object',
      properties: {
        pdfFile: {
          type: 'object',
          description: 'Archivo PDF del estimado',
          properties: {
            type: {
              type: 'string',
              enum: ['base64', 'path'],
              description: 'Tipo de archivo'
            },
            data: {
              type: 'string',
              description: 'Contenido en base64 o ruta del archivo'
            },
            mediaType: {
              type: 'string',
              description: 'Debe ser "application/pdf"'
            }
          },
          required: ['type', 'data']
        },
        additionalInfo: {
          type: 'object',
          description: 'Información adicional proporcionada por el usuario (opcional)',
          properties: {
            clientName: { type: 'string' },
            clientEmail: { type: 'string' },
            clientPhone: { type: 'string' },
            projectType: { type: 'string' },
            projectDescription: { type: 'string' },
            projectAddress: { type: 'string' },
            totalAmount: { type: 'number' },
            startDate: { type: 'string' },
            endDate: { type: 'string' }
          }
        }
      },
      required: ['pdfFile']
    }
  },
  
  {
    name: 'analyze_images',
    description: `Analiza imágenes, fotos, planos, PDFs o documentos visuales para extraer información relevante.
    
Casos de uso:
- Analizar fotos del terreno para entender el proyecto
- Leer planos y extraer medidas
- Identificar materiales y estructuras en imágenes
- Procesar documentos con OCR avanzado
- Detectar características de propiedades

IMPORTANTE: Usa esta herramienta cuando el usuario adjunte imágenes o cuando necesites "ver" algo para dar una mejor respuesta.

Ejemplos:
- Usuario adjunta foto del terreno → analyze_images para describir el proyecto
- Usuario sube plano → analyze_images para extraer medidas
- Usuario pregunta sobre una imagen → analyze_images para responder`,
    input_schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          description: 'Lista de imágenes a analizar',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['url', 'base64', 'path'],
                description: 'Tipo de imagen'
              },
              data: {
                type: 'string',
                description: 'URL, base64 o ruta del archivo'
              },
              mediaType: {
                type: 'string',
                description: 'Tipo MIME (image/jpeg, image/png, etc.)'
              }
            },
            required: ['type', 'data']
          }
        },
        prompt: {
          type: 'string',
          description: 'Pregunta o instrucción sobre qué analizar en las imágenes'
        },
        context: {
          type: 'string',
          description: 'Contexto adicional sobre el proyecto o situación'
        },
        analysisType: {
          type: 'string',
          enum: ['general', 'estimate', 'contract', 'property', 'measurements'],
          description: 'Tipo de análisis a realizar'
        }
      },
      required: ['images', 'prompt']
    }
  },
  
  // ============= CONTEXT TOOLS =============
  // Herramientas genéricas para acceder a todas las entidades del sistema
  
  {
    name: 'search_entity',
    description: `Busca entidades en el sistema usando texto libre o filtros.
    
Entidades disponibles:
- client: Clientes del contratista
- estimate: Estimados/Presupuestos
- contract: Contratos
- invoice: Facturas
- project: Proyectos
- permit_history: Historial de búsquedas de permisos
- property_history: Historial de búsquedas de propiedades
- material: Materiales de construcción
- template: Templates de documentos
- project_template: Templates de proyectos
- smart_material_list: Listas inteligentes de materiales
- digital_contract: Contratos digitales
- notification: Notificaciones

Usa esta herramienta cuando el usuario:
- Busca algo por nombre, apellido, dirección, etc.
- Dice "no me acuerdo del nombre pero..."
- Quiere encontrar algo específico
- Menciona "cliente que se apellida..."
- Pide "buscar estimados de..."

Ejemplos:
- "Tengo un cliente que se apellida Webb" → search_entity(entity_type="client", query="Webb")
- "Buscar estimados de Vacaville" → search_entity(entity_type="estimate", query="Vacaville")
- "Contratos del mes pasado" → search_entity(entity_type="contract", query="", filters={"month": "last"})

La búsqueda es case-insensitive y busca en múltiples campos relevantes.`,
    input_schema: {
      type: 'object',
      properties: {
        entity_type: {
          type: 'string',
          enum: ['client', 'estimate', 'contract', 'invoice', 'project', 
                 'permit_history', 'property_history', 'material', 'template',
                 'project_template', 'smart_material_list', 'digital_contract', 'notification'],
          description: 'Tipo de entidad a buscar'
        },
        query: {
          type: 'string',
          description: 'Texto de búsqueda (nombre, apellido, dirección, etc.). Puede estar vacío si usas solo filtros.'
        },
        filters: {
          type: 'object',
          description: 'Filtros adicionales (opcional). Ejemplo: { "status": "active", "city": "Vacaville" }'
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados. Default: 10, máximo recomendado: 20'
        }
      },
      required: ['entity_type', 'query']
    }
  },
  
  {
    name: 'get_entity',
    description: `Obtiene los detalles completos de una entidad específica por su ID.
    
Usa esta herramienta cuando:
- El usuario selecciona algo de una lista ("el primero", "el de Vacaville", "John Webb")
- Necesitas detalles completos de un item
- Ya tienes el ID de la entidad
- Quieres obtener información completa antes de ejecutar otra acción

Ejemplos:
- Usuario dice "usa el primero" después de ver una lista → get_entity(entity_type="estimate", id=<id_del_primero>)
- "Dame detalles del estimado EST-123" → get_entity(entity_type="estimate", id="EST-123")
- "Información del cliente CLI-456" → get_entity(entity_type="client", id="CLI-456")

Esta herramienta devuelve TODOS los campos de la entidad, incluyendo:
- Para clientes: nombre, email, teléfono, dirección, etc.
- Para estimados: cliente, proyecto, materiales, costos, etc.
- Para contratos: términos, fechas, montos, etc.`,
    input_schema: {
      type: 'object',
      properties: {
        entity_type: {
          type: 'string',
          enum: ['client', 'estimate', 'contract', 'invoice', 'project', 
                 'permit_history', 'property_history', 'material', 'template',
                 'project_template', 'smart_material_list', 'digital_contract', 'notification'],
          description: 'Tipo de entidad'
        },
        id: {
          type: 'string',
          description: 'ID de la entidad. Puede ser numérico (123) o alfanumérico ("EST-001", "CLI-123", "CON-456")'
        }
      },
      required: ['entity_type', 'id']
    }
  },
  
  {
    name: 'list_entities',
    description: `Lista entidades con filtros y ordenamiento.
    
Usa esta herramienta cuando el usuario:
- Pide "últimos N estimados"
- Quiere ver "todos los contratos activos"
- Necesita una lista filtrada
- Dice "dame una lista de mis..."
- Pide "muéstrame los proyectos de..."

Ejemplos:
- "Dame mis últimos 3 estimados" → list_entities(entity_type="estimate", limit=3, sort="createdAt:desc")
- "Todos los contratos activos" → list_entities(entity_type="contract", filters={"status": "active"})
- "Clientes de Vacaville" → list_entities(entity_type="client", filters={"city": "Vacaville"})
- "Proyectos de fence" → list_entities(entity_type="project", filters={"projectType": "fence"})

Por defecto:
- Ordena por fecha de creación (más recientes primero)
- Límite de 10 resultados
- Filtra por el usuario actual automáticamente`,
    input_schema: {
      type: 'object',
      properties: {
        entity_type: {
          type: 'string',
          enum: ['client', 'estimate', 'contract', 'invoice', 'project', 
                 'permit_history', 'property_history', 'material', 'template',
                 'project_template', 'smart_material_list', 'digital_contract', 'notification'],
          description: 'Tipo de entidad'
        },
        filters: {
          type: 'object',
          description: 'Filtros (opcional). Ejemplo: { "status": "active", "city": "Vacaville", "projectType": "fence" }'
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados. Default: 10, máximo recomendado: 20'
        },
        sort: {
          type: 'string',
          description: 'Campo y dirección de ordenamiento. Formato: "campo:direccion". Ejemplos: "createdAt:desc" (más recientes primero), "name:asc" (alfabético), "amount:desc" (mayor a menor)'
        },
        offset: {
          type: 'number',
          description: 'Número de resultados a saltar (para paginación). Default: 0'
        }
      },
      required: ['entity_type']
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
 * Obtener herramientas por categoría
 */
export function getToolsByCategory(category: 'estimate' | 'contract' | 'permit' | 'property' | 'client' | 'context'): ToolDefinition[] {
  const categoryMap: Record<string, string[]> = {
    estimate: ['create_estimate_workflow'],
    contract: ['create_contract_workflow'],
    permit: ['check_permits_workflow', 'analyze_permits'],
    property: ['verify_property_ownership'],
    client: ['search_client', 'create_client'],
    context: ['search_entity', 'get_entity', 'list_entities']
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

/**
 * DYNAMIC TOOLS INTEGRATION
 * 
 * Integra herramientas descubiertas dinámicamente con las herramientas estáticas.
 */

import { autoDiscoveryIntegration } from '../../services/integration/AutoDiscoveryIntegration';

// Cache para getAllTools
let toolsCache: ToolDefinition[] | null = null;
let toolsCacheTimestamp: number = 0;
const TOOLS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const MAX_TOOLS_FOR_CLAUDE = 100; // Claude tiene límite de ~100 herramientas

/**
 * Obtiene todas las herramientas (estáticas + dinámicas)
 */
export async function getAllTools(): Promise<ToolDefinition[]> {
  // Verificar cache
  const now = Date.now();
  if (toolsCache && (now - toolsCacheTimestamp) < TOOLS_CACHE_TTL_MS) {
    console.log(`[CLAUDE-TOOLS] Using cached tools (${toolsCache.length} tools)`);
    return toolsCache;
  }

  try {
    // Obtener herramientas dinámicas
    const dynamicTools = await autoDiscoveryIntegration.getTools();
    
    // Combinar con herramientas estáticas
    let allTools = [...CLAUDE_WORKFLOW_TOOLS, ...dynamicTools];
    
    // Limitar a MAX_TOOLS_FOR_CLAUDE si hay demasiadas
    if (allTools.length > MAX_TOOLS_FOR_CLAUDE) {
      console.warn(`[CLAUDE-TOOLS] Too many tools (${allTools.length}). Limiting to ${MAX_TOOLS_FOR_CLAUDE} most relevant.`);
      
      // Priorizar herramientas estáticas y las dinámicas más usadas
      const staticTools = CLAUDE_WORKFLOW_TOOLS;
      const limitedDynamicTools = dynamicTools.slice(0, MAX_TOOLS_FOR_CLAUDE - staticTools.length);
      allTools = [...staticTools, ...limitedDynamicTools];
    }
    
    console.log(`[CLAUDE-TOOLS] Total tools: ${allTools.length} (${CLAUDE_WORKFLOW_TOOLS.length} static + ${allTools.length - CLAUDE_WORKFLOW_TOOLS.length} dynamic)`);
    
    // Actualizar cache
    toolsCache = allTools;
    toolsCacheTimestamp = now;
    
    return allTools;
  } catch (error) {
    console.error('[CLAUDE-TOOLS] Error getting dynamic tools:', error);
    // Fallback a herramientas estáticas
    toolsCache = CLAUDE_WORKFLOW_TOOLS;
    toolsCacheTimestamp = now;
    return CLAUDE_WORKFLOW_TOOLS;
  }
}

/**
 * Invalida el cache de herramientas (para testing o actualizaciones)
 */
export function invalidateToolsCache(): void {
  toolsCache = null;
  toolsCacheTimestamp = 0;
  console.log('[CLAUDE-TOOLS] Tools cache invalidated');
}

/**
 * Verifica si una herramienta es dinámica
 */
export async function isDynamicTool(toolName: string): Promise<boolean> {
  try {
    return await autoDiscoveryIntegration.toolExists(toolName);
  } catch (error) {
    return false;
  }
}

/**
 * Obtiene información de una herramienta dinámica
 */
export async function getDynamicToolInfo(toolName: string) {
  try {
    return await autoDiscoveryIntegration.getToolInfo(toolName);
  } catch (error) {
    console.error(`[CLAUDE-TOOLS] Error getting dynamic tool info for ${toolName}:`, error);
    return null;
  }
}
