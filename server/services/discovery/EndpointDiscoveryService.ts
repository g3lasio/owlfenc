/**
 * EndpointDiscoveryService
 * 
 * Escanea todos los endpoints del servidor y extrae su metadata
 * para generar herramientas dinámicas de Claude.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Express, Router } from 'express';
import { metadataExtractor, EndpointMetadata } from '../metadata/MetadataExtractor';

export interface DiscoveredEndpoint extends EndpointMetadata {
  sourceFile: string;
  lastModified: Date;
}

export class EndpointDiscoveryService {
  private cache: Map<string, DiscoveredEndpoint> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutos
  private lastScan: Date | null = null;

  /**
   * Descubre todos los endpoints del servidor
   */
  async discoverEndpoints(app?: Express): Promise<DiscoveredEndpoint[]> {
    // Verificar cache
    if (this.lastScan && (Date.now() - this.lastScan.getTime()) < this.cacheExpiry) {
      console.log('[ENDPOINT-DISCOVERY] Using cached endpoints');
      return Array.from(this.cache.values());
    }

    console.log('[ENDPOINT-DISCOVERY] Scanning endpoints...');

    const endpoints: DiscoveredEndpoint[] = [];

    // Escanear archivos de rutas
    const routesDir = path.join(__dirname, '../../routes');
    const routeFiles = this.scanDirectory(routesDir, '.ts');

    for (const file of routeFiles) {
      const fileEndpoints = await this.extractEndpointsFromFile(file);
      endpoints.push(...fileEndpoints);
    }

    // Actualizar cache
    this.cache.clear();
    endpoints.forEach(endpoint => {
      const key = `${endpoint.method}:${endpoint.path}`;
      this.cache.set(key, endpoint);
    });

    this.lastScan = new Date();

    console.log(`[ENDPOINT-DISCOVERY] Found ${endpoints.length} endpoints`);

    return endpoints;
  }

  /**
   * Escanea un directorio recursivamente
   */
  private scanDirectory(dir: string, extension: string): string[] {
    const files: string[] = [];

    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          files.push(...this.scanDirectory(fullPath, extension));
        } else if (stat.isFile() && item.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`[ENDPOINT-DISCOVERY] Error scanning directory ${dir}:`, error);
    }

    return files;
  }

  /**
   * Extrae endpoints de un archivo de rutas
   */
  private async extractEndpointsFromFile(filePath: string): Promise<DiscoveredEndpoint[]> {
    const endpoints: DiscoveredEndpoint[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const stat = fs.statSync(filePath);

      // Buscar definiciones de rutas
      const routePatterns = [
        /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g
      ];

      for (const pattern of routePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const [fullMatch, method, routePath] = match;
          
          // Buscar JSDoc comment antes de la definición de ruta
          const beforeRoute = content.substring(0, match.index);
          const jsdocMatch = beforeRoute.match(/\/\*\*([\s\S]*?)\*\/\s*$/);
          
          let metadata: EndpointMetadata;
          
          if (jsdocMatch) {
            // Extraer metadata de JSDoc
            const jsdocMetadata = metadataExtractor.extractFromJSDoc(jsdocMatch[0]);
            const codeMetadata = metadataExtractor.inferFromCode(content, routePath, method.toUpperCase());
            metadata = metadataExtractor.combineMetadata(jsdocMetadata, codeMetadata);
          } else {
            // Generar metadata por defecto
            metadata = metadataExtractor.generateDefaultMetadata(routePath, method.toUpperCase());
          }

          // Validar metadata
          const validation = metadataExtractor.validateMetadata(metadata);
          if (!validation.valid) {
            console.warn(`[ENDPOINT-DISCOVERY] Invalid metadata for ${method.toUpperCase()} ${routePath}:`, validation.errors);
            continue;
          }

          endpoints.push({
            ...metadata,
            sourceFile: filePath,
            lastModified: stat.mtime
          });
        }
      }
    } catch (error) {
      console.error(`[ENDPOINT-DISCOVERY] Error extracting endpoints from ${filePath}:`, error);
    }

    return endpoints;
  }

  /**
   * Obtiene un endpoint específico por método y path
   */
  getEndpoint(method: string, path: string): DiscoveredEndpoint | undefined {
    const key = `${method.toUpperCase()}:${path}`;
    return this.cache.get(key);
  }

  /**
   * Obtiene endpoints por categoría
   */
  getEndpointsByCategory(category: string): DiscoveredEndpoint[] {
    return Array.from(this.cache.values()).filter(
      endpoint => endpoint.category === category
    );
  }

  /**
   * Busca endpoints por palabra clave
   */
  searchEndpoints(query: string): DiscoveredEndpoint[] {
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.cache.values()).filter(endpoint => {
      return (
        endpoint.path.toLowerCase().includes(lowerQuery) ||
        endpoint.description.toLowerCase().includes(lowerQuery) ||
        endpoint.category?.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Invalida el cache y fuerza un nuevo escaneo
   */
  invalidateCache(): void {
    this.cache.clear();
    this.lastScan = null;
    console.log('[ENDPOINT-DISCOVERY] Cache invalidated');
  }

  /**
   * Obtiene estadísticas de endpoints descubiertos
   */
  getStats(): {
    total: number;
    byMethod: Record<string, number>;
    byCategory: Record<string, number>;
    withWorkflow: number;
    requiresAuth: number;
  } {
    const endpoints = Array.from(this.cache.values());

    const stats = {
      total: endpoints.length,
      byMethod: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      withWorkflow: 0,
      requiresAuth: 0
    };

    endpoints.forEach(endpoint => {
      // Por método
      stats.byMethod[endpoint.method] = (stats.byMethod[endpoint.method] || 0) + 1;

      // Por categoría
      const category = endpoint.category || 'general';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

      // Con workflow
      if (endpoint.workflow) {
        stats.withWorkflow++;
      }

      // Requiere autenticación
      if (endpoint.requiresAuth) {
        stats.requiresAuth++;
      }
    });

    return stats;
  }

  /**
   * Exporta todos los endpoints a JSON
   */
  exportToJSON(): string {
    const endpoints = Array.from(this.cache.values());
    return JSON.stringify(endpoints, null, 2);
  }

  /**
   * Importa endpoints desde JSON (útil para testing)
   */
  importFromJSON(json: string): void {
    try {
      const endpoints: DiscoveredEndpoint[] = JSON.parse(json);
      
      this.cache.clear();
      endpoints.forEach(endpoint => {
        const key = `${endpoint.method}:${endpoint.path}`;
        this.cache.set(key, endpoint);
      });

      this.lastScan = new Date();
      console.log(`[ENDPOINT-DISCOVERY] Imported ${endpoints.length} endpoints from JSON`);
    } catch (error) {
      console.error('[ENDPOINT-DISCOVERY] Error importing from JSON:', error);
      throw error;
    }
  }
}

// Exportar instancia singleton
export const endpointDiscoveryService = new EndpointDiscoveryService();
