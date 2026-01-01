/**
 * MetadataExtractor
 * 
 * Extrae metadata de endpoints desde JSDoc comments y código fuente
 * para generar herramientas dinámicas de Claude.
 */

export interface EndpointMetadata {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  parameters?: ParameterMetadata[];
  response?: ResponseMetadata;
  workflow?: WorkflowMetadata;
  category?: string;
  requiresAuth?: boolean;
  rateLimit?: number;
  examples?: ExampleMetadata[];
  errorHandling?: ErrorHandlingMetadata[];
}

export interface ParameterMetadata {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
  validation?: ValidationMetadata;
  options?: OptionMetadata[];
}

export interface OptionMetadata {
  value: string | number;
  label: string;
  description?: string;
}

export interface ValidationMetadata {
  min?: number;
  max?: number;
  pattern?: string;
  enum?: (string | number)[];
}

export interface ResponseMetadata {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  description: string;
  schema?: any;
  format?: 'json' | 'pdf' | 'html' | 'text';
}

export interface WorkflowMetadata {
  steps: WorkflowStepMetadata[];
  requiresConfirmation?: boolean;
  canRollback?: boolean;
}

export interface WorkflowStepMetadata {
  id: string;
  title: string;
  description: string;
  type: 'input' | 'select' | 'confirm' | 'execute' | 'transform';
  required?: boolean;
  conditional?: ConditionalMetadata;
  validation?: ValidationMetadata;
  options?: OptionMetadata[];
  optionsSource?: string; // Endpoint para obtener opciones dinámicas
}

export interface ConditionalMetadata {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface ExampleMetadata {
  title: string;
  request: any;
  response: any;
}

export interface ErrorHandlingMetadata {
  error: string;
  action: 'retry' | 'ask_user' | 'fail' | 'fallback';
  prompt?: string;
  fallbackEndpoint?: string;
}

export class MetadataExtractor {
  /**
   * Extrae metadata de un comentario JSDoc
   */
  extractFromJSDoc(jsdocComment: string): Partial<EndpointMetadata> {
    const metadata: Partial<EndpointMetadata> = {};

    // Extraer descripción
    const descMatch = jsdocComment.match(/@description\s+(.+?)(?=@|$)/s);
    if (descMatch) {
      metadata.description = descMatch[1].trim();
    }

    // Extraer categoría
    const categoryMatch = jsdocComment.match(/@category\s+(\w+)/);
    if (categoryMatch) {
      metadata.category = categoryMatch[1];
    }

    // Extraer si requiere autenticación
    const authMatch = jsdocComment.match(/@requiresAuth\s+(true|false)/);
    if (authMatch) {
      metadata.requiresAuth = authMatch[1] === 'true';
    }

    // Extraer parámetros
    const paramMatches = jsdocComment.matchAll(/@param\s+{(\w+)}\s+(\w+)\s+(.+?)(?=@|$)/gs);
    metadata.parameters = [];
    for (const match of paramMatches) {
      const [, type, name, description] = match;
      metadata.parameters.push({
        name,
        type: type as any,
        description: description.trim(),
        required: !description.includes('(optional)')
      });
    }

    // Extraer workflow
    const workflowMatch = jsdocComment.match(/@workflow\s+({[\s\S]+?})/);
    if (workflowMatch) {
      try {
        metadata.workflow = JSON.parse(workflowMatch[1]);
      } catch (error) {
        console.error('[METADATA-EXTRACTOR] Error parsing workflow JSON:', error);
      }
    }

    // Extraer error handling
    const errorMatches = jsdocComment.matchAll(/@error\s+(\w+)\s+(.+?)(?=@|$)/gs);
    metadata.errorHandling = [];
    for (const match of errorMatches) {
      const [, error, actionStr] = match;
      const [action, ...promptParts] = actionStr.trim().split(':');
      metadata.errorHandling.push({
        error,
        action: action.trim() as any,
        prompt: promptParts.join(':').trim()
      });
    }

    return metadata;
  }

  /**
   * Infiere metadata del código de la ruta
   */
  inferFromCode(routeCode: string, path: string, method: string): Partial<EndpointMetadata> {
    const metadata: Partial<EndpointMetadata> = {
      path,
      method: method as any
    };

    // Inferir si requiere autenticación
    if (routeCode.includes('verifyFirebaseAuth') || routeCode.includes('requireAuth')) {
      metadata.requiresAuth = true;
    }

    // Inferir parámetros del req.body
    const bodyMatches = routeCode.matchAll(/req\.body\.(\w+)/g);
    const bodyParams = new Set<string>();
    for (const match of bodyMatches) {
      bodyParams.add(match[1]);
    }

    if (bodyParams.size > 0) {
      metadata.parameters = Array.from(bodyParams).map(name => ({
        name,
        type: 'string' as const,
        description: `Parameter ${name}`,
        required: true
      }));
    }

    // Inferir tipo de respuesta
    if (routeCode.includes('res.json')) {
      metadata.response = {
        type: 'object',
        description: 'JSON response',
        format: 'json'
      };
    } else if (routeCode.includes('res.send') && routeCode.includes('pdf')) {
      metadata.response = {
        type: 'string',
        description: 'PDF file',
        format: 'pdf'
      };
    }

    return metadata;
  }

  /**
   * Combina metadata extraída de JSDoc y código
   */
  combineMetadata(
    jsdocMetadata: Partial<EndpointMetadata>,
    codeMetadata: Partial<EndpointMetadata>
  ): EndpointMetadata {
    return {
      path: codeMetadata.path || '',
      method: codeMetadata.method || 'GET',
      description: jsdocMetadata.description || codeMetadata.path || 'No description',
      parameters: jsdocMetadata.parameters || codeMetadata.parameters || [],
      response: jsdocMetadata.response || codeMetadata.response,
      workflow: jsdocMetadata.workflow,
      category: jsdocMetadata.category || 'general',
      requiresAuth: jsdocMetadata.requiresAuth ?? codeMetadata.requiresAuth ?? true,
      rateLimit: jsdocMetadata.rateLimit,
      examples: jsdocMetadata.examples || [],
      errorHandling: jsdocMetadata.errorHandling || []
    };
  }

  /**
   * Valida metadata extraída
   */
  validateMetadata(metadata: EndpointMetadata): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metadata.path) {
      errors.push('Missing path');
    }

    if (!metadata.method) {
      errors.push('Missing method');
    }

    if (!metadata.description) {
      errors.push('Missing description');
    }

    // Validar workflow si existe
    if (metadata.workflow) {
      if (!metadata.workflow.steps || metadata.workflow.steps.length === 0) {
        errors.push('Workflow must have at least one step');
      }

      metadata.workflow.steps.forEach((step, index) => {
        if (!step.id) {
          errors.push(`Step ${index} missing id`);
        }
        if (!step.title) {
          errors.push(`Step ${index} missing title`);
        }
        if (!step.type) {
          errors.push(`Step ${index} missing type`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Genera metadata por defecto para endpoints sin documentación
   */
  generateDefaultMetadata(path: string, method: string): EndpointMetadata {
    // Extraer nombre del endpoint del path
    const pathParts = path.split('/').filter(p => p && !p.startsWith(':'));
    const endpointName = pathParts[pathParts.length - 1] || 'endpoint';

    // Generar descripción basada en el método y path
    let description = '';
    switch (method) {
      case 'GET':
        description = `Get ${endpointName}`;
        break;
      case 'POST':
        description = `Create ${endpointName}`;
        break;
      case 'PUT':
      case 'PATCH':
        description = `Update ${endpointName}`;
        break;
      case 'DELETE':
        description = `Delete ${endpointName}`;
        break;
    }

    return {
      path,
      method: method as any,
      description,
      parameters: [],
      category: 'general',
      requiresAuth: true
    };
  }
}

// Exportar instancia singleton
export const metadataExtractor = new MetadataExtractor();
