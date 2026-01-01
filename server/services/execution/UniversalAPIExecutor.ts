/**
 * UniversalAPIExecutor
 * 
 * Ejecuta cualquier endpoint descubierto dinámicamente,
 * manejando workflows, response format enriquecido, y error handling.
 */

import axios, { AxiosRequestConfig } from 'axios';
import { DiscoveredEndpoint } from '../discovery/EndpointDiscoveryService';
import { workflowOrchestrator, WorkflowState } from '../workflow/WorkflowOrchestrator';

export interface ExecutionContext {
  userId: string;
  authHeaders?: Record<string, string>;
  baseURL?: string;
}

export interface EnrichedResponse {
  content: string;
  actions?: ActionButton[];
  options?: OptionButton[];
  links?: Link[];
  attachments?: Attachment[];
  metadata?: Record<string, any>;
}

export interface ActionButton {
  label: string;
  action: string;
  params?: Record<string, any>;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface OptionButton {
  text: string;
  value: any;
  clickable: boolean;
}

export interface Link {
  url: string;
  label: string;
  external?: boolean;
}

export interface Attachment {
  type: 'pdf' | 'image' | 'document';
  url: string;
  filename: string;
}

export class UniversalAPIExecutor {
  private workflowStates: Map<string, WorkflowState> = new Map();

  /**
   * Ejecuta un endpoint descubierto
   */
  async execute(
    endpoint: DiscoveredEndpoint,
    params: Record<string, any>,
    context: ExecutionContext
  ): Promise<EnrichedResponse> {
    console.log(`[UNIVERSAL-EXECUTOR] Executing ${endpoint.method} ${endpoint.path}`);

    // Si el endpoint tiene workflow, ejecutarlo
    if (endpoint.workflow) {
      return this.executeWorkflow(endpoint, params, context);
    }

    // Ejecutar endpoint directamente
    return this.executeEndpoint(endpoint, params, context);
  }

  /**
   * Ejecuta un workflow multi-paso
   */
  private async executeWorkflow(
    endpoint: DiscoveredEndpoint,
    params: Record<string, any>,
    context: ExecutionContext
  ): Promise<EnrichedResponse> {
    const workflowId = `${context.userId}:${endpoint.path}`;
    
    // Obtener o crear estado del workflow
    let state = this.workflowStates.get(workflowId);
    
    if (!state) {
      // Iniciar nuevo workflow
      state = await workflowOrchestrator.startWorkflow(endpoint.workflow!, params);
      this.workflowStates.set(workflowId, state);
    }

    // Ejecutar siguiente paso
    const result = await workflowOrchestrator.executeNextStep(
      endpoint.workflow!,
      state,
      params.userInput
    );

    if (!result.success) {
      // Error en el workflow
      this.workflowStates.delete(workflowId);
      return {
        content: `❌ Error en el workflow: ${result.error}`,
        metadata: { error: result.error }
      };
    }

    if (result.completed) {
      // Workflow completado
      this.workflowStates.delete(workflowId);
      
      // Ejecutar el endpoint final con los datos recopilados
      const finalResult = await this.executeEndpoint(endpoint, state.context, context);
      
      return {
        ...finalResult,
        content: `✅ Workflow completado exitosamente.\n\n${finalResult.content}`
      };
    }

    // Workflow necesita más input del usuario
    if (result.nextStep) {
      return {
        content: `**${result.nextStep.title}**\n\n${result.nextStep.prompt}`,
        options: result.nextStep.options?.map(opt => ({
          text: opt.label || String(opt.value),
          value: opt.value,
          clickable: true
        })),
        metadata: {
          workflowId,
          step: result.nextStep.title,
          type: result.nextStep.type
        }
      };
    }

    return {
      content: '⚠️ Estado de workflow inesperado',
      metadata: { workflowId }
    };
  }

  /**
   * Ejecuta un endpoint directamente (sin workflow)
   */
  private async executeEndpoint(
    endpoint: DiscoveredEndpoint,
    params: Record<string, any>,
    context: ExecutionContext
  ): Promise<EnrichedResponse> {
    try {
      // Construir URL
      const baseURL = context.baseURL || 'http://localhost:3000';
      let url = `${baseURL}${endpoint.path}`;

      // Reemplazar parámetros de path
      Object.keys(params).forEach(key => {
        url = url.replace(`:${key}`, params[key]);
      });

      // Configurar request
      const config: AxiosRequestConfig = {
        method: endpoint.method,
        url,
        headers: {
          'Content-Type': 'application/json',
          ...context.authHeaders
        }
      };

      // Agregar body para POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        config.data = params;
      }

      // Agregar query params para GET
      if (endpoint.method === 'GET') {
        config.params = params;
      }

      // Ejecutar request
      const response = await axios(config);

      // Enriquecer respuesta
      return this.enrichResponse(response.data, endpoint);

    } catch (error: any) {
      console.error(`[UNIVERSAL-EXECUTOR] Error executing endpoint:`, error);

      // Manejar error según metadata
      if (endpoint.errorHandling && endpoint.errorHandling.length > 0) {
        const errorHandler = endpoint.errorHandling.find(
          eh => error.response?.data?.error === eh.error || error.message.includes(eh.error)
        );

        if (errorHandler) {
          return this.handleError(errorHandler, error);
        }
      }

      // Error genérico
      return {
        content: `❌ Error ejecutando ${endpoint.description}: ${error.message}`,
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Enriquece la respuesta del endpoint con elementos interactivos
   */
  private enrichResponse(data: any, endpoint: DiscoveredEndpoint): EnrichedResponse {
    const enriched: EnrichedResponse = {
      content: ''
    };

    // Si la respuesta ya es un EnrichedResponse, retornarla
    if (data.content && typeof data.content === 'string') {
      return data as EnrichedResponse;
    }

    // Generar contenido basado en el tipo de respuesta
    if (endpoint.response?.format === 'pdf') {
      enriched.content = '📄 Documento PDF generado exitosamente.';
      enriched.links = [{
        url: data.url || data.pdfUrl || data.downloadUrl,
        label: 'Descargar PDF',
        external: false
      }];
      enriched.actions = [{
        label: '📧 Enviar por email',
        action: 'send_email',
        params: { documentUrl: data.url },
        style: 'secondary'
      }];
    } else if (endpoint.response?.format === 'json') {
      // Formatear JSON como texto legible
      enriched.content = this.formatJSONResponse(data);
    } else {
      // Respuesta genérica
      enriched.content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    }

    return enriched;
  }

  /**
   * Formatea respuesta JSON de manera legible
   */
  private formatJSONResponse(data: any): string {
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return 'No se encontraron resultados.';
      }

      let content = `Se encontraron ${data.length} resultado(s):\n\n`;
      data.forEach((item, index) => {
        content += `**${index + 1}.** ${this.formatObject(item)}\n`;
      });
      return content;
    }

    if (typeof data === 'object' && data !== null) {
      return this.formatObject(data);
    }

    return String(data);
  }

  /**
   * Formatea un objeto de manera legible
   */
  private formatObject(obj: any): string {
    const lines: string[] = [];

    Object.entries(obj).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        lines.push(`- **${formattedKey}:** ${value}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Maneja errores según metadata de error handling
   */
  private handleError(errorHandler: any, error: any): EnrichedResponse {
    switch (errorHandler.action) {
      case 'ask_user':
        return {
          content: `⚠️ ${errorHandler.prompt || error.message}`,
          actions: [
            {
              label: '🔄 Reintentar',
              action: 'retry',
              style: 'primary'
            },
            {
              label: '❌ Cancelar',
              action: 'cancel',
              style: 'secondary'
            }
          ]
        };

      case 'retry':
        return {
          content: `🔄 Reintentando automáticamente...`,
          metadata: { shouldRetry: true }
        };

      case 'fallback':
        return {
          content: `⚠️ Usando método alternativo...`,
          metadata: { fallbackEndpoint: errorHandler.fallbackEndpoint }
        };

      case 'fail':
      default:
        return {
          content: `❌ ${errorHandler.prompt || error.message}`,
          metadata: { error: error.message }
        };
    }
  }

  /**
   * Cancela un workflow en ejecución
   */
  async cancelWorkflow(workflowId: string): Promise<void> {
    const state = this.workflowStates.get(workflowId);
    if (state) {
      await workflowOrchestrator.cancelWorkflow(state);
      this.workflowStates.delete(workflowId);
      console.log(`[UNIVERSAL-EXECUTOR] Workflow ${workflowId} cancelled`);
    }
  }

  /**
   * Obtiene el estado de un workflow
   */
  getWorkflowState(workflowId: string): WorkflowState | undefined {
    return this.workflowStates.get(workflowId);
  }

  /**
   * Limpia workflows inactivos
   */
  cleanupInactiveWorkflows(maxAgeMinutes: number = 30): void {
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;

    // Por ahora, simplemente limpiar todos los workflows
    // En una implementación real, trackear timestamps
    this.workflowStates.clear();
    
    console.log('[UNIVERSAL-EXECUTOR] Cleaned up inactive workflows');
  }
}

// Exportar instancia singleton
export const universalAPIExecutor = new UniversalAPIExecutor();
