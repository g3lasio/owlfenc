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
   */
  async searchExistingMaterials(criteria: CacheSearchCriteria): Promise<CacheSearchResult> {
    try {
      console.log('🔍 SmartCache: Buscando materiales existentes...', criteria);

      // 1. Búsqueda exacta por tipo de proyecto y región
      const exactMatch = await this.findExactMatch(criteria);
      if (exactMatch.found) {
        console.log('✅ SmartCache: Coincidencia exacta encontrada');
        await this.updateUsageStats(exactMatch.data!.id);
        return exactMatch;
      }

      // 2. Búsqueda por similitud semántica
      const similarMatch = await this.findSimilarProject(criteria);
      if (similarMatch.found) {
        console.log('✅ SmartCache: Proyecto similar encontrado');
        await this.updateUsageStats(similarMatch.data!.id);
        return similarMatch;
      }

      // 3. Búsqueda en templates predefinidos
      const templateMatch = await this.findProjectTemplate(criteria);
      if (templateMatch.found) {
        console.log('✅ SmartCache: Template encontrado');
        return templateMatch;
      }

      console.log('❌ SmartCache: No se encontraron materiales existentes');
      return { found: false, source: 'none' };

    } catch (error) {
      console.error('❌ SmartCache Error:', error);
      return { found: false, source: 'none' };
    }
  }

  /**
   * Guarda una nueva lista de materiales en el cache
   */
  async saveMaterialsList(
    projectType: string,
    description: string,
    region: string,
    result: DeepSearchResult
  ): Promise<void> {
    try {
      console.log('💾 SmartCache: Guardando nueva lista de materiales...');

      const id = `smart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

      console.log('✅ SmartCache: Lista guardada con ID:', id);

    } catch (error) {
      console.error('❌ SmartCache Save Error:', error);
      // No fallar silenciosamente, solo registrar el error
    }
  }

  /**
   * Encuentra coincidencias exactas
   */
  private async findExactMatch(criteria: CacheSearchCriteria): Promise<CacheSearchResult> {
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
        .orderBy(desc(smartMaterialLists.lastUsed))
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
      console.error('❌ Exact match search error:', error);
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
   * Obtiene estadísticas del cache
   */
  async getCacheStats(): Promise<any> {
    try {
      const stats = await db
        .select({
          projectType: smartMaterialLists.projectType,
          region: smartMaterialLists.region,
          count: sql<number>`count(*)`,
          totalUsage: sql<number>`sum(${smartMaterialLists.usageCount})`,
          avgConfidence: sql<number>`avg(${smartMaterialLists.confidence})`
        })
        .from(smartMaterialLists)
        .groupBy(smartMaterialLists.projectType, smartMaterialLists.region);

      return stats;

    } catch (error) {
      console.error('❌ Cache stats error:', error);
      return [];
    }
  }
}

export const smartMaterialCacheService = new SmartMaterialCacheService();