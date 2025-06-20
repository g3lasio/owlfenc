/**
 * Smart Material Cache Service
 * 
 * Sistema inteligente para almacenar, buscar y reutilizar listas de materiales 
 * generadas por DeepSearch. Evita recálculos innecesarios y mejora la eficiencia.
 */

import { db } from '../db';
import { smartMaterialLists, projectTemplates } from '@shared/schema';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';
import { DeepSearchResult } from './deepSearchService';

export interface CacheSearchCriteria {
  projectType: string;
  region: string;
  description?: string;
  similarityThreshold?: number;
}

export interface CacheSearchResult {
  found: boolean;
  data?: DeepSearchResult;
  similarity?: number;
  source: 'exact_match' | 'similar_project' | 'template' | 'none';
  adaptationNeeded?: boolean;
}

export class SmartMaterialCacheService {
  
  /**
   * Busca listas de materiales existentes antes de generar nuevas
   * SISTEMA GLOBAL: Busca en todas las regiones para máxima reutilización
   */
  async searchExistingMaterials(criteria: CacheSearchCriteria): Promise<CacheSearchResult> {
    try {
      console.log('🔍 SmartCache GLOBAL: Buscando materiales existentes...', criteria);

      // 1. BÚSQUEDA REGIONAL EXACTA (prioridad alta)
      const regionalMatch = await this.findRegionalMatch(criteria);
      if (regionalMatch.found) {
        console.log('✅ SmartCache: Coincidencia regional encontrada');
        await this.updateUsageStats(regionalMatch.data!.id);
        return regionalMatch;
      }

      // 2. BÚSQUEDA GLOBAL POR SIMILITUD (cualquier región)
      const globalMatch = await this.findGlobalSimilarProject(criteria);
      if (globalMatch.found) {
        console.log('✅ SmartCache: Proyecto global similar encontrado');
        await this.updateUsageStats(globalMatch.data!.id);
        return globalMatch;
      }

      // 3. BÚSQUEDA EN TEMPLATES UNIVERSALES
      const templateMatch = await this.findProjectTemplate(criteria);
      if (templateMatch.found) {
        console.log('✅ SmartCache: Template universal encontrado');
        return templateMatch;
      }

      console.log('❌ SmartCache: Generando nueva lista (contribuirá al sistema global)');
      return { found: false, source: 'none' };

    } catch (error) {
      console.error('❌ SmartCache Error:', error);
      return { found: false, source: 'none' };
    }
  }

  /**
   * Guarda una nueva lista de materiales en el cache GLOBAL
   * Cada nueva lista contribuye al conocimiento colectivo
   */
  async saveMaterialsList(
    projectType: string,
    description: string,
    region: string,
    result: DeepSearchResult
  ): Promise<void> {
    try {
      console.log('💾 SmartCache GLOBAL: Contribuyendo nueva lista al sistema...');

      const id = `smart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Verificar si ya existe algo muy similar para evitar duplicados exactos
      const existing = await this.checkForDuplicates(projectType, description, region);
      if (existing) {
        console.log('🔄 SmartCache: Actualizando lista existente en lugar de crear duplicado');
        await this.updateExistingList(existing.id, result);
        return;
      }

      await db.insert(smartMaterialLists).values({
        id,
        projectType: this.normalizeProjectType(projectType),
        projectDescription: description,
        region: this.normalizeRegion(region),
        materialsList: result.materials,
        laborCosts: result.laborCosts,
        additionalCosts: result.additionalCosts,
        totalMaterialsCost: result.totalMaterialsCost.toString(),
        totalLaborCost: result.totalLaborCost.toString(),
        totalAdditionalCost: result.totalAdditionalCost.toString(),
        grandTotal: result.grandTotal.toString(),
        confidence: result.confidence.toString(),
        usageCount: 1
      });

      console.log('✅ SmartCache GLOBAL: Nueva contribución guardada con ID:', id);
      console.log('🌍 Esta lista ahora está disponible para todos los usuarios del sistema');

    } catch (error) {
      console.error('❌ SmartCache Save Error:', error);
      // No fallar silenciosamente, solo registrar el error
    }
  }

  /**
   * Verifica duplicados para evitar redundancia en el sistema global
   */
  private async checkForDuplicates(projectType: string, description: string, region: string): Promise<any> {
    try {
      const results = await db
        .select()
        .from(smartMaterialLists)
        .where(
          and(
            eq(smartMaterialLists.projectType, this.normalizeProjectType(projectType)),
            eq(smartMaterialLists.region, this.normalizeRegion(region))
          )
        )
        .limit(5);

      for (const result of results) {
        const similarity = this.calculateSimilarity(description, result.projectDescription);
        if (similarity > 0.95) { // 95% de similitud = muy probable duplicado
          return result;
        }
      }

      return null;

    } catch (error) {
      console.error('❌ Duplicate check error:', error);
      return null;
    }
  }

  /**
   * Actualiza una lista existente con nuevos datos (mejora continua)
   */
  private async updateExistingList(id: string, newResult: DeepSearchResult): Promise<void> {
    try {
      await db
        .update(smartMaterialLists)
        .set({
          materialsList: newResult.materials,
          laborCosts: newResult.laborCosts,
          additionalCosts: newResult.additionalCosts,
          totalMaterialsCost: newResult.totalMaterialsCost.toString(),
          totalLaborCost: newResult.totalLaborCost.toString(),
          totalAdditionalCost: newResult.totalAdditionalCost.toString(),
          grandTotal: newResult.grandTotal.toString(),
          confidence: Math.max(parseFloat(newResult.confidence.toString()), 0.1).toString(),
          usageCount: sql`${smartMaterialLists.usageCount} + 1`,
          lastUsed: new Date(),
          updatedAt: new Date()
        })
        .where(eq(smartMaterialLists.id, id));

      console.log('✅ Lista existente actualizada con mejoras');

    } catch (error) {
      console.error('❌ Update existing list error:', error);
    }
  }

  /**
   * Encuentra coincidencias regionales exactas
   */
  private async findRegionalMatch(criteria: CacheSearchCriteria): Promise<CacheSearchResult> {
    try {
      const results = await db
        .select()
        .from(smartMaterialLists)
        .where(
          and(
            eq(smartMaterialLists.projectType, this.normalizeProjectType(criteria.projectType)),
            eq(smartMaterialLists.region, this.normalizeRegion(criteria.region))
          )
        )
        .orderBy(desc(smartMaterialLists.usageCount), desc(smartMaterialLists.lastUsed))
        .limit(1);

      if (results.length > 0) {
        const cached = results[0];
        return {
          found: true,
          data: this.convertToDeepSearchResult(cached),
          similarity: 1.0,
          source: 'exact_match',
          adaptationNeeded: false
        };
      }

      return { found: false, source: 'none' };

    } catch (error) {
      console.error('❌ Regional match search error:', error);
      return { found: false, source: 'none' };
    }
  }

  /**
   * Búsqueda GLOBAL: Encuentra proyectos similares en CUALQUIER región
   * Esta es la clave del sistema colaborativo
   */
  private async findGlobalSimilarProject(criteria: CacheSearchCriteria): Promise<CacheSearchResult> {
    try {
      if (!criteria.description) {
        return { found: false, source: 'none' };
      }

      // Buscar por tipo de proyecto en TODAS las regiones
      const results = await db
        .select()
        .from(smartMaterialLists)
        .where(eq(smartMaterialLists.projectType, this.normalizeProjectType(criteria.projectType)))
        .orderBy(desc(smartMaterialLists.usageCount), desc(smartMaterialLists.confidence))
        .limit(10); // Analizar los 10 más populares

      // Calcular similitud semántica con todos los resultados
      for (const result of results) {
        const similarity = this.calculateSimilarity(criteria.description, result.projectDescription);
        const threshold = criteria.similarityThreshold || 0.65; // Umbral más bajo para global

        if (similarity >= threshold) {
          console.log(`🌍 Global Match encontrado - Similitud: ${(similarity*100).toFixed(1)}% | Región original: ${result.region}`);
          
          return {
            found: true,
            data: this.convertToDeepSearchResult(result),
            similarity,
            source: 'similar_project',
            adaptationNeeded: result.region !== this.normalizeRegion(criteria.region) || similarity < 0.85
          };
        }
      }

      return { found: false, source: 'none' };

    } catch (error) {
      console.error('❌ Global similar project search error:', error);
      return { found: false, source: 'none' };
    }
  }

  /**
   * Encuentra proyectos similares usando búsqueda semántica
   */
  private async findSimilarProject(criteria: CacheSearchCriteria): Promise<CacheSearchResult> {
    try {
      if (!criteria.description) {
        return { found: false, source: 'none' };
      }

      // Búsqueda por similitud de texto en descripciones
      const keywords = this.extractKeywords(criteria.description);
      
      const results = await db
        .select()
        .from(smartMaterialLists)
        .where(
          and(
            eq(smartMaterialLists.projectType, this.normalizeProjectType(criteria.projectType)),
            eq(smartMaterialLists.region, this.normalizeRegion(criteria.region))
          )
        )
        .orderBy(desc(smartMaterialLists.usageCount))
        .limit(5);

      // Calcular similitud semántica
      for (const result of results) {
        const similarity = this.calculateSimilarity(criteria.description, result.projectDescription);
        const threshold = criteria.similarityThreshold || 0.7;

        if (similarity >= threshold) {
          return {
            found: true,
            data: this.convertToDeepSearchResult(result),
            similarity,
            source: 'similar_project',
            adaptationNeeded: similarity < 0.9
          };
        }
      }

      return { found: false, source: 'none' };

    } catch (error) {
      console.error('❌ Similar project search error:', error);
      return { found: false, source: 'none' };
    }
  }

  /**
   * Busca en templates predefinidos
   */
  private async findProjectTemplate(criteria: CacheSearchCriteria): Promise<CacheSearchResult> {
    try {
      const results = await db
        .select()
        .from(projectTemplates)
        .where(
          and(
            eq(projectTemplates.projectType, this.normalizeProjectType(criteria.projectType)),
            eq(projectTemplates.isActive, true)
          )
        )
        .orderBy(desc(projectTemplates.usageCount))
        .limit(1);

      if (results.length > 0) {
        const template = results[0];
        return {
          found: true,
          data: this.convertTemplateToDeepSearchResult(template, criteria.region),
          similarity: 0.8,
          source: 'template',
          adaptationNeeded: true
        };
      }

      return { found: false, source: 'none' };

    } catch (error) {
      console.error('❌ Template search error:', error);
      return { found: false, source: 'none' };
    }
  }

  /**
   * Actualiza estadísticas de uso
   */
  private async updateUsageStats(id: string): Promise<void> {
    try {
      await db
        .update(smartMaterialLists)
        .set({
          usageCount: sql`${smartMaterialLists.usageCount} + 1`,
          lastUsed: new Date(),
          updatedAt: new Date()
        })
        .where(eq(smartMaterialLists.id, id));

    } catch (error) {
      console.error('❌ Usage stats update error:', error);
    }
  }

  /**
   * Convierte datos cache a DeepSearchResult
   */
  private convertToDeepSearchResult(cached: any): DeepSearchResult {
    return {
      projectType: cached.projectType,
      projectScope: cached.projectDescription,
      materials: Array.isArray(cached.materialsList) ? cached.materialsList : [],
      laborCosts: Array.isArray(cached.laborCosts) ? cached.laborCosts : [],
      additionalCosts: Array.isArray(cached.additionalCosts) ? cached.additionalCosts : [],
      totalMaterialsCost: parseFloat(cached.totalMaterialsCost || '0'),
      totalLaborCost: parseFloat(cached.totalLaborCost || '0'),
      totalAdditionalCost: parseFloat(cached.totalAdditionalCost || '0'),
      grandTotal: parseFloat(cached.grandTotal || '0'),
      confidence: parseFloat(cached.confidence || '0.8'),
      recommendations: ['Datos reutilizados de proyecto similar'],
      warnings: cached.adaptationNeeded ? ['Lista adaptada de proyecto similar'] : []
    };
  }

  /**
   * Convierte template a DeepSearchResult
   */
  private convertTemplateToDeepSearchResult(template: any, region: string): DeepSearchResult {
    const templateData = template.templateData;
    
    return {
      projectType: template.projectType,
      projectScope: template.description || '',
      materials: templateData.materials || [],
      laborCosts: templateData.laborCosts || [],
      additionalCosts: templateData.additionalCosts || [],
      totalMaterialsCost: templateData.totalMaterialsCost || 0,
      totalLaborCost: templateData.totalLaborCost || 0,
      totalAdditionalCost: templateData.totalAdditionalCost || 0,
      grandTotal: templateData.grandTotal || 0,
      confidence: 0.8,
      recommendations: ['Datos basados en template estándar'],
      warnings: ['Template adaptado a su región']
    };
  }

  /**
   * Normaliza tipos de proyecto
   */
  private normalizeProjectType(projectType: string): string {
    const normalizedTypes: Record<string, string> = {
      'fence': 'fencing',
      'fencing': 'fencing',
      'roof': 'roofing',
      'roofing': 'roofing',
      'deck': 'decking',
      'decking': 'decking',
      'flooring': 'flooring',
      'siding': 'siding',
      'drywall': 'drywall',
      'painting': 'painting'
    };

    const type = projectType.toLowerCase().trim();
    return normalizedTypes[type] || type;
  }

  /**
   * Normaliza regiones
   */
  private normalizeRegion(region: string): string {
    if (!region) return 'default';
    
    const regionMappings: Record<string, string> = {
      'california': 'california',
      'ca': 'california',
      'texas': 'texas',
      'tx': 'texas',
      'florida': 'florida',
      'fl': 'florida',
      'new york': 'new_york',
      'ny': 'new_york',
      'illinois': 'illinois',
      'il': 'illinois'
    };

    const normalizedRegion = region.toLowerCase().trim();
    return regionMappings[normalizedRegion] || 'default';
  }

  /**
   * Extrae palabras clave de la descripción
   */
  private extractKeywords(description: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    return description
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
  }

  /**
   * Calcula similitud entre dos descripciones
   */
  private calculateSimilarity(desc1: string, desc2: string): number {
    const keywords1 = new Set(this.extractKeywords(desc1));
    const keywords2 = new Set(this.extractKeywords(desc2));
    
    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
    const union = new Set([...keywords1, ...keywords2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Obtiene estadísticas del cache GLOBAL con métricas de colaboración
   */
  async getCacheStats(): Promise<any> {
    try {
      // Estadísticas por tipo de proyecto
      const projectStats = await db
        .select({
          projectType: smartMaterialLists.projectType,
          totalProjects: sql<number>`count(*)`,
          totalUsage: sql<number>`sum(${smartMaterialLists.usageCount})`,
          avgConfidence: sql<number>`avg(${smartMaterialLists.confidence})`,
          regionsCovered: sql<number>`count(DISTINCT ${smartMaterialLists.region})`
        })
        .from(smartMaterialLists)
        .groupBy(smartMaterialLists.projectType);

      // Estadísticas globales del sistema
      const globalStats = await db
        .select({
          totalLists: sql<number>`count(*)`,
          totalReuses: sql<number>`sum(${smartMaterialLists.usageCount})`,
          uniqueRegions: sql<number>`count(DISTINCT ${smartMaterialLists.region})`,
          uniqueProjectTypes: sql<number>`count(DISTINCT ${smartMaterialLists.projectType})`,
          avgGlobalConfidence: sql<number>`avg(${smartMaterialLists.confidence})`,
          savedGenerations: sql<number>`sum(${smartMaterialLists.usageCount}) - count(*)`
        })
        .from(smartMaterialLists);

      // Top proyectos más reutilizados (líderes de eficiencia)
      const topReused = await db
        .select({
          projectType: smartMaterialLists.projectType,
          region: smartMaterialLists.region,
          usageCount: smartMaterialLists.usageCount,
          confidence: smartMaterialLists.confidence,
          projectDescription: sql<string>`LEFT(${smartMaterialLists.projectDescription}, 100)`
        })
        .from(smartMaterialLists)
        .orderBy(desc(smartMaterialLists.usageCount))
        .limit(10);

      return {
        global: globalStats[0],
        byProjectType: projectStats,
        topReused,
        collaborativeMetrics: {
          reuseRate: globalStats[0]?.savedGenerations || 0,
          crossRegionalProjects: projectStats.filter(p => p.regionsCovered > 1).length,
          averageRegionsPerProject: projectStats.reduce((sum, p) => sum + p.regionsCovered, 0) / projectStats.length
        }
      };

    } catch (error) {
      console.error('❌ Cache stats error:', error);
      return { global: {}, byProjectType: [], topReused: [], collaborativeMetrics: {} };
    }
  }

  /**
   * Obtiene insights de mejora continua del sistema
   */
  async getSystemInsights(): Promise<any> {
    try {
      // Proyectos que más han evolucionado
      const evolvingProjects = await db
        .select({
          projectType: smartMaterialLists.projectType,
          evolution: sql<number>`${smartMaterialLists.usageCount} * ${smartMaterialLists.confidence}`,
          lastImprovement: smartMaterialLists.updatedAt,
          regionsCovered: sql<number>`count(DISTINCT ${smartMaterialLists.region}) OVER (PARTITION BY ${smartMaterialLists.projectType})`
        })
        .from(smartMaterialLists)
        .orderBy(sql`${smartMaterialLists.usageCount} * ${smartMaterialLists.confidence} DESC`)
        .limit(5);

      // Gaps de conocimiento (tipos de proyecto con pocas contribuciones)
      const knowledgeGaps = await db
        .select({
          projectType: smartMaterialLists.projectType,
          contributionCount: sql<number>`count(*)`,
          lastContribution: sql<string>`max(${smartMaterialLists.createdAt})`
        })
        .from(smartMaterialLists)
        .groupBy(smartMaterialLists.projectType)
        .having(sql`count(*) < 3`)
        .orderBy(sql`count(*) ASC`);

      return {
        topEvolvingProjects: evolvingProjects,
        knowledgeGaps,
        systemHealth: {
          avgProjectsPerType: 0, // Se calcularía
          crossRegionCollaboration: 0,
          recentActivity: 0
        }
      };

    } catch (error) {
      console.error('❌ System insights error:', error);
      return { topEvolvingProjects: [], knowledgeGaps: [], systemHealth: {} };
    }
  }
}

export const smartMaterialCacheService = new SmartMaterialCacheService();