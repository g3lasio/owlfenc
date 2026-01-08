/**
 * DynamicToolGenerator
 * 
 * Genera herramientas de Claude automáticamente desde metadata de endpoints.
 */

import { DiscoveredEndpoint } from './EndpointDiscoveryService';

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export class DynamicToolGenerator {
  /**
   * Genera una herramienta de Claude desde metadata de endpoint
   */
  generateTool(endpoint: DiscoveredEndpoint): ClaudeTool {
    const toolName = this.generateToolName(endpoint);
    const description = this.generateDescription(endpoint);
    const inputSchema = this.generateInputSchema(endpoint);

    return {
      name: toolName,
      description,
      input_schema: inputSchema
    };
  }

  /**
   * Genera múltiples herramientas desde una lista de endpoints
   */
  generateTools(endpoints: DiscoveredEndpoint[]): ClaudeTool[] {
    const tools: ClaudeTool[] = [];
    const nameCount: Map<string, number> = new Map();

    endpoints.forEach(endpoint => {
      const tool = this.generateTool(endpoint);
      
      // Verificar si el nombre ya existe
      const count = nameCount.get(tool.name) || 0;
      
      if (count > 0) {
        // Agregar sufijo para evitar duplicados
        tool.name = `${tool.name}_${count}`;
        console.warn(`[DYNAMIC-TOOL-GENERATOR] Duplicate tool name detected. Renamed to: ${tool.name}`);
      }
      
      nameCount.set(tool.name.replace(/_\d+$/, ''), count + 1);
      tools.push(tool);
    });

    return tools;
  }

  /**
   * Genera el nombre de la herramienta desde el endpoint
   */
  private generateToolName(endpoint: DiscoveredEndpoint): string {
    // Convertir path a snake_case
    // Ejemplo: /api/estimates/create → create_estimate
    // Ejemplo: /api/contracts/types → get_contract_types
    
    const pathParts = endpoint.path
      .split('/')
      .filter(p => p && !p.startsWith(':') && p !== 'api');

    // Invertir el orden para que sea más natural
    // /api/estimates/create → create_estimate (no estimate_create)
    const reversed = [...pathParts].reverse();

    // Si el método es GET y no hay verbo en el path, agregar "get"
    if (endpoint.method === 'GET' && !this.hasVerb(pathParts[pathParts.length - 1])) {
      reversed.unshift('get');
    }

    // Si el método es POST y no hay verbo en el path, agregar "create"
    if (endpoint.method === 'POST' && !this.hasVerb(pathParts[pathParts.length - 1])) {
      reversed.unshift('create');
    }

    // Si el método es PUT/PATCH y no hay verbo en el path, agregar "update"
    if ((endpoint.method === 'PUT' || endpoint.method === 'PATCH') && !this.hasVerb(pathParts[pathParts.length - 1])) {
      reversed.unshift('update');
    }

    // Si el método es DELETE y no hay verbo en el path, agregar "delete"
    if (endpoint.method === 'DELETE' && !this.hasVerb(pathParts[pathParts.length - 1])) {
      reversed.unshift('delete');
    }

    return reversed.join('_').toLowerCase();
  }

  /**
   * Verifica si una palabra es un verbo común
   */
  private hasVerb(word: string | undefined): boolean {
    if (!word || typeof word !== 'string') {
      return false;
    }
    const verbs = ['create', 'get', 'update', 'delete', 'list', 'search', 'generate', 'send', 'analyze', 'verify', 'check'];
    return verbs.some(verb => word.toLowerCase().includes(verb));
  }

  /**
   * Genera la descripción de la herramienta
   */
  private generateDescription(endpoint: DiscoveredEndpoint): string {
    let description = endpoint.description;

    // Agregar información sobre workflow si existe
    if (endpoint.workflow) {
      description += `\n\nThis is a multi-step workflow with ${endpoint.workflow.steps.length} steps:`;
      endpoint.workflow.steps.forEach((step, index) => {
        description += `\n${index + 1}. ${step.title}: ${step.description}`;
      });

      if (endpoint.workflow.requiresConfirmation) {
        description += '\n\n⚠️ This workflow requires user confirmation before execution.';
      }
    }

    // Agregar información sobre autenticación
    if (endpoint.requiresAuth) {
      description += '\n\n🔐 Requires authentication.';
    }

    // Agregar ejemplos si existen
    if (endpoint.examples && endpoint.examples.length > 0) {
      description += '\n\n📝 Examples:';
      endpoint.examples.forEach((example, index) => {
        description += `\n${index + 1}. ${example.title}`;
      });
    }

    return description;
  }

  /**
   * Genera el schema de input para Claude
   */
  private generateInputSchema(endpoint: DiscoveredEndpoint): {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  } {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    // Agregar parámetros del endpoint
    if (endpoint.parameters) {
      endpoint.parameters.forEach(param => {
        properties[param.name] = {
          type: param.type,
          description: param.description
        };

        // Agregar validaciones
        if (param.validation) {
          if (param.validation.min !== undefined) {
            properties[param.name].minimum = param.validation.min;
          }
          if (param.validation.max !== undefined) {
            properties[param.name].maximum = param.validation.max;
          }
          if (param.validation.pattern) {
            properties[param.name].pattern = param.validation.pattern;
          }
          if (param.validation.enum) {
            properties[param.name].enum = param.validation.enum;
          }
        }

        // Agregar opciones si existen
        if (param.options && param.options.length > 0) {
          properties[param.name].enum = param.options.map(opt => opt.value);
          properties[param.name].description += `\n\nOptions:\n${param.options.map(opt => `- ${opt.value}: ${opt.label}`).join('\n')}`;
        }

        // Agregar default si existe
        if (param.default !== undefined) {
          properties[param.name].default = param.default;
        }

        // Agregar a required si es necesario
        if (param.required) {
          required.push(param.name);
        }
      });
    }

    // Si es un workflow, agregar parámetros de workflow
    if (endpoint.workflow) {
      // Agregar campo opcional para indicar que es un workflow
      properties._workflow = {
        type: 'boolean',
        description: 'Internal flag to indicate this is a workflow execution',
        default: true
      };
    }

    return {
      type: 'object',
      properties,
      required
    };
  }

  /**
   * Filtra herramientas por categoría
   */
  filterByCategory(tools: ClaudeTool[], category: string): ClaudeTool[] {
    // Por ahora, filtrar por nombre de herramienta
    // En el futuro, agregar metadata de categoría a ClaudeTool
    return tools.filter(tool => 
      tool.name.includes(category.toLowerCase())
    );
  }

  /**
   * Ordena herramientas por relevancia
   */
  sortByRelevance(tools: ClaudeTool[], query?: string): ClaudeTool[] {
    if (!query) {
      return tools;
    }

    const lowerQuery = query.toLowerCase();

    return tools.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, lowerQuery);
      const bScore = this.calculateRelevanceScore(b, lowerQuery);
      return bScore - aScore;
    });
  }

  /**
   * Calcula score de relevancia de una herramienta
   */
  private calculateRelevanceScore(tool: ClaudeTool, query: string): number {
    let score = 0;

    // Nombre exacto
    if (tool.name === query) {
      score += 100;
    }

    // Nombre contiene query
    if (tool.name.includes(query)) {
      score += 50;
    }

    // Descripción contiene query
    if (tool.description.toLowerCase().includes(query)) {
      score += 25;
    }

    // Parámetros contienen query
    Object.keys(tool.input_schema.properties).forEach(param => {
      if (param.includes(query)) {
        score += 10;
      }
    });

    return score;
  }

  /**
   * Valida que una herramienta sea válida
   */
  validateTool(tool: ClaudeTool): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!tool.name) {
      errors.push('Tool name is required');
    }

    if (!tool.description) {
      errors.push('Tool description is required');
    }

    if (!tool.input_schema) {
      errors.push('Tool input_schema is required');
    } else {
      if (tool.input_schema.type !== 'object') {
        errors.push('input_schema.type must be "object"');
      }

      if (!tool.input_schema.properties) {
        errors.push('input_schema.properties is required');
      }

      if (!tool.input_schema.required) {
        errors.push('input_schema.required is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Genera documentación de herramientas en formato Markdown
   */
  generateDocumentation(tools: ClaudeTool[]): string {
    let doc = '# Available Tools\n\n';

    tools.forEach(tool => {
      doc += `## ${tool.name}\n\n`;
      doc += `${tool.description}\n\n`;
      doc += `### Parameters\n\n`;

      Object.entries(tool.input_schema.properties).forEach(([name, schema]) => {
        const required = tool.input_schema.required.includes(name) ? '**required**' : 'optional';
        doc += `- **${name}** (${schema.type}, ${required}): ${schema.description}\n`;
      });

      doc += '\n---\n\n';
    });

    return doc;
  }
}

// Exportar instancia singleton
export const dynamicToolGenerator = new DynamicToolGenerator();
