/**
 * AutoDiscoveryIntegration
 * 
 * Integra el sistema de Auto-Discovery con Mervin Agent,
 * permitiendo que Mervin use dinámicamente todos los endpoints descubiertos.
 */

import { endpointDiscoveryService, DiscoveredEndpoint } from '../discovery/EndpointDiscoveryService';
import { dynamicToolGenerator, ClaudeTool } from '../discovery/DynamicToolGenerator';
import { universalAPIExecutor, ExecutionContext, EnrichedResponse } from '../execution/UniversalAPIExecutor';

export interface AutoDiscoveryConfig {
  enableCache: boolean;
  cacheExpiryMinutes: number;
  excludeCategories?: string[];
  includeCategories?: string[];
  maxTools?: number;
}

export class AutoDiscoveryIntegration {
  private config: AutoDiscoveryConfig;
  private cachedTools: ClaudeTool[] | null = null;
  private cachedEndpoints: Map<string, DiscoveredEndpoint> = new Map();

  constructor(config: Partial<AutoDiscoveryConfig> = {}) {
    this.config = {
      enableCache: true,
      cacheExpiryMinutes: 5,
      maxTools: 100,
      ...config
    };
  }

  /**
   * Inicializa el sistema de auto-discovery
   */
  async initialize(): Promise<void> {
    console.log('[AUTO-DISCOVERY] Initializing...');

    // Descubrir endpoints
    const endpoints = await endpointDiscoveryService.discoverEndpoints();
    console.log(`[AUTO-DISCOVERY] Discovered ${endpoints.length} endpoints`);

    // Filtrar endpoints según configuración
    const filteredEndpoints = this.filterEndpoints(endpoints);
    console.log(`[AUTO-DISCOVERY] Filtered to ${filteredEndpoints.length} endpoints`);

    // Generar herramientas de Claude
    this.cachedTools = dynamicToolGenerator.generateTools(filteredEndpoints);
    console.log(`[AUTO-DISCOVERY] Generated ${this.cachedTools.length} tools`);

    // Cachear endpoints por nombre de herramienta
    filteredEndpoints.forEach(endpoint => {
      const tool = dynamicToolGenerator.generateTool(endpoint);
      this.cachedEndpoints.set(tool.name, endpoint);
    });

    console.log('[AUTO-DISCOVERY] Initialization complete');
  }

  /**
   * Obtiene todas las herramientas disponibles para Claude
   */
  async getTools(): Promise<ClaudeTool[]> {
    if (!this.cachedTools || !this.config.enableCache) {
      await this.initialize();
    }

    return this.cachedTools || [];
  }

  /**
   * Ejecuta una herramienta por nombre
   */
  async executeTool(
    toolName: string,
    params: Record<string, any>,
    context: ExecutionContext
  ): Promise<EnrichedResponse> {
    console.log(`[AUTO-DISCOVERY] Executing tool: ${toolName}`);

    // Obtener endpoint correspondiente
    const endpoint = this.cachedEndpoints.get(toolName);

    if (!endpoint) {
      // Intentar re-descubrir endpoints
      await this.initialize();
      const retryEndpoint = this.cachedEndpoints.get(toolName);

      if (!retryEndpoint) {
        return {
          content: `❌ Herramienta no encontrada: ${toolName}`,
          metadata: { error: 'Tool not found' }
        };
      }

      return universalAPIExecutor.execute(retryEndpoint, params, context);
    }

    // Ejecutar endpoint
    return universalAPIExecutor.execute(endpoint, params, context);
  }

  /**
   * Filtra endpoints según configuración
   */
  private filterEndpoints(endpoints: DiscoveredEndpoint[]): DiscoveredEndpoint[] {
    let filtered = endpoints;

    // Filtrar por categorías excluidas
    if (this.config.excludeCategories && this.config.excludeCategories.length > 0) {
      filtered = filtered.filter(
        endpoint => !this.config.excludeCategories!.includes(endpoint.category || '')
      );
    }

    // Filtrar por categorías incluidas
    if (this.config.includeCategories && this.config.includeCategories.length > 0) {
      filtered = filtered.filter(
        endpoint => this.config.includeCategories!.includes(endpoint.category || '')
      );
    }

    // Limitar número de herramientas
    if (this.config.maxTools && filtered.length > this.config.maxTools) {
      console.warn(`[AUTO-DISCOVERY] Too many tools (${filtered.length}), limiting to ${this.config.maxTools}`);
      filtered = filtered.slice(0, this.config.maxTools);
    }

    return filtered;
  }

  /**
   * Busca herramientas por palabra clave
   */
  async searchTools(query: string): Promise<ClaudeTool[]> {
    const tools = await this.getTools();
    return dynamicToolGenerator.sortByRelevance(tools, query);
  }

  /**
   * Obtiene herramientas por categoría
   */
  async getToolsByCategory(category: string): Promise<ClaudeTool[]> {
    const tools = await this.getTools();
    return dynamicToolGenerator.filterByCategory(tools, category);
  }

  /**
   * Invalida el cache y fuerza re-descubrimiento
   */
  async refresh(): Promise<void> {
    console.log('[AUTO-DISCOVERY] Refreshing...');
    this.cachedTools = null;
    this.cachedEndpoints.clear();
    endpointDiscoveryService.invalidateCache();
    await this.initialize();
  }

  /**
   * Obtiene estadísticas del sistema
   */
  async getStats(): Promise<{
    totalEndpoints: number;
    totalTools: number;
    byCategory: Record<string, number>;
    byMethod: Record<string, number>;
    withWorkflow: number;
  }> {
    const endpoints = await endpointDiscoveryService.discoverEndpoints();
    const tools = await this.getTools();

    const stats = endpointDiscoveryService.getStats();

    return {
      totalEndpoints: endpoints.length,
      totalTools: tools.length,
      byCategory: stats.byCategory,
      byMethod: stats.byMethod,
      withWorkflow: stats.withWorkflow
    };
  }

  /**
   * Genera documentación de todas las herramientas
   */
  async generateDocumentation(): Promise<string> {
    const tools = await this.getTools();
    return dynamicToolGenerator.generateDocumentation(tools);
  }

  /**
   * Verifica si una herramienta existe
   */
  async toolExists(toolName: string): Promise<boolean> {
    return this.cachedEndpoints.has(toolName);
  }

  /**
   * Obtiene información de una herramienta específica
   */
  async getToolInfo(toolName: string): Promise<{
    tool: ClaudeTool;
    endpoint: DiscoveredEndpoint;
  } | null> {
    const endpoint = this.cachedEndpoints.get(toolName);
    if (!endpoint) {
      return null;
    }

    const tool = dynamicToolGenerator.generateTool(endpoint);

    return { tool, endpoint };
  }
}

// Exportar instancia singleton
export const autoDiscoveryIntegration = new AutoDiscoveryIntegration({
  enableCache: true,
  cacheExpiryMinutes: 5,
  maxTools: 100
});
