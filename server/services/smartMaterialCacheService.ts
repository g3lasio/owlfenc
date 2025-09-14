/**
 * Smart Material Cache Service
 * 
 * Sistema inteligente para almacenar, buscar y reutilizar listas de materiales 
 * generadas por DeepSearch. Evita recálculos innecesarios y mejora la eficiencia.
 */

import { resilientDb } from '../db';
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
   * DECOUPLED: Completes all DB reads before any AI processing
   */
  async searchExistingMaterials(criteria: CacheSearchCriteria): Promise<CacheSearchResult> {
    try {
      console.log('🔍 SmartCache GLOBAL: Buscando materiales existentes...', criteria);

      // DECOUPLING STEP 1: Complete ALL database reads first, then process
      const dbReadResults = await this.performAllDatabaseReads(criteria);
      
      if (!dbReadResults) {
        console.log('⚠️ SmartCache: Database not available, skipping cache lookup');
        return { found: false, source: 'none' };
      }

      // DECOUPLING STEP 2: Process results without any DB connections open
      const projectRequirements = this.extractProjectRequirements(criteria.description || '');

      // 1. Check regional match
      if (dbReadResults.regionalMatch && this.validateMaterialRelevance(dbReadResults.regionalMatch, projectRequirements)) {
        console.log('✅ SmartCache: Coincidencia regional encontrada - requiere recálculo de cantidades');
        return {
          found: true,
          data: this.convertToDeepSearchResult(dbReadResults.regionalMatch),
          similarity: 1.0,
          source: 'exact_match',
          adaptationNeeded: true // Always require AI recalculation
        };
      }

      // 2. Check global match
      if (dbReadResults.globalMatch && this.validateMaterialRelevance(dbReadResults.globalMatch, projectRequirements)) {
        console.log('✅ SmartCache: Proyecto global similar encontrado - requiere recálculo de cantidades');
        return {
          found: true,
          data: this.convertToDeepSearchResult(dbReadResults.globalMatch.data),
          similarity: dbReadResults.globalMatch.similarity,
          source: 'similar_project',
          adaptationNeeded: true // Always require AI recalculation
        };
      }

      // 3. Check template match
      if (dbReadResults.templateMatch && this.validateMaterialRelevance(dbReadResults.templateMatch, projectRequirements)) {
        console.log('✅ SmartCache: Template universal encontrado - requiere recálculo de cantidades');
        return {
          found: true,
          data: this.convertTemplateToDeepSearchResult(dbReadResults.templateMatch, criteria.region),
          similarity: 0.8,
          source: 'template',
          adaptationNeeded: true // Always require AI recalculation
        };
      }

      console.log('❌ SmartCache: Generando nueva lista (contribuirá al sistema global)');
      return { found: false, source: 'none' };

    } catch (error) {
      console.error('❌ SmartCache Error:', error);
      return { found: false, source: 'none' };
    }
  }

  /**
   * DECOUPLING METHOD: Performs ALL database reads in one operation
   * Returns raw data without any AI processing or analysis
   */
  private async performAllDatabaseReads(criteria: CacheSearchCriteria): Promise<{
    regionalMatch?: any;
    globalMatch?: { data: any; similarity: number };
    templateMatch?: any;
  } | null> {
    return await resilientDb.executeOptional(async (db) => {
      console.log('📊 [RESILIENT-DB] Performing consolidated database reads...');
      
      const results: any = {};

      // 1. Regional match query
      try {
        const regionalResults = await db
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

        if (regionalResults.length > 0) {
          results.regionalMatch = regionalResults[0];
        }
      } catch (error) {
        console.warn('⚠️ Regional match query failed:', error);
      }

      // 2. Global similarity search (all regions)
      try {
        if (criteria.description) {
          const globalResults = await db
            .select()
            .from(smartMaterialLists)
            .where(eq(smartMaterialLists.projectType, this.normalizeProjectType(criteria.projectType)))
            .orderBy(desc(smartMaterialLists.usageCount), desc(smartMaterialLists.confidence))
            .limit(10);

          // Find best similarity match
          let bestMatch = null;
          let bestSimilarity = 0;
          
          for (const result of globalResults) {
            const similarity = this.calculateSimilarity(criteria.description, result.projectDescription);
            const threshold = criteria.similarityThreshold || 0.65;
            
            if (similarity >= threshold && similarity > bestSimilarity) {
              bestMatch = result;
              bestSimilarity = similarity;
            }
          }

          if (bestMatch) {
            results.globalMatch = { data: bestMatch, similarity: bestSimilarity };
          }
        }
      } catch (error) {
        console.warn('⚠️ Global similarity search failed:', error);
      }

      // 3. Template search
      try {
        const templateResults = await db
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

        if (templateResults.length > 0) {
          results.templateMatch = templateResults[0];
        }
      } catch (error) {
        console.warn('⚠️ Template search failed:', error);
      }

      console.log('✅ [RESILIENT-DB] Consolidated database reads completed');
      return results;
      
    }, 'SmartCache Consolidated Reads');
  }

  /**
   * Guarda una nueva lista de materiales en el cache GLOBAL
   * DECOUPLED: Uses resilient DB wrapper with retry logic
   */
  async saveMaterialsList(
    projectType: string,
    description: string,
    region: string,
    result: DeepSearchResult
  ): Promise<void> {
    try {
      console.log('💾 SmartCache GLOBAL: Contribuyendo nueva lista al sistema...');

      // DECOUPLED WRITE: Use resilient wrapper for fresh connection per operation
      await resilientDb.executeOptional(async (db) => {
        const id = `smart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Check for duplicates first
        const existing = await this.checkForDuplicatesResillient(db, projectType, description, region);
        if (existing) {
          console.log('🔄 SmartCache: Actualizando lista existente en lugar de crear duplicado');
          await this.updateExistingListResilient(db, existing.id, result);
          return;
        }

        // Create new entry with defensive null checks
        await db.insert(smartMaterialLists).values({
          id,
          projectType: this.normalizeProjectType(projectType),
          projectDescription: description,
          region: this.normalizeRegion(region),
          materialsList: result.materials || [],
          laborCosts: result.laborCosts || [],
          additionalCosts: result.additionalCosts || [],
          totalMaterialsCost: this.safeNumberToString(result.totalMaterialsCost),
          totalLaborCost: this.safeNumberToString(result.totalLaborCost),
          totalAdditionalCost: this.safeNumberToString(result.totalAdditionalCost),
          grandTotal: this.safeNumberToString(result.grandTotal),
          confidence: this.safeNumberToString(result.confidence),
          usageCount: 1
        });

        console.log('✅ SmartCache GLOBAL: Nueva contribución guardada con ID:', id);
        return id;
        
      }, 'SmartCache Save Materials List');

      console.log('🌍 Esta lista ahora está disponible para todos los usuarios del sistema');

    } catch (error) {
      console.error('❌ SmartCache Save Error:', error);
      // Graceful degradation - don't fail the AI operation if cache save fails
    }
  }

  /**
   * RESILIENT: Verifica duplicados usando conexión pasada como parámetro
   */
  private async checkForDuplicatesResillient(db: any, projectType: string, description: string, region: string): Promise<any> {
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
        const similarity = this.calculateSimilarity(description, result.projectDescription || '');
        if (similarity > 0.95) { // 95% de similitud = muy probable duplicado
          return result;
        }
      }

      return null;

    } catch (error) {
      console.error('❌ Resilient duplicate check error:', error);
      return null;
    }
  }

  /**
   * DEPRECATED: Legacy method - use checkForDuplicatesResillient instead
   */
  private async checkForDuplicates(projectType: string, description: string, region: string): Promise<any> {
    return await resilientDb.executeOptional(async (db) => {
      return await this.checkForDuplicatesResillient(db, projectType, description, region);
    }, 'Legacy Duplicate Check');
  }

  /**
   * RESILIENT: Actualiza lista existente usando conexión pasada como parámetro
   */
  private async updateExistingListResilient(db: any, id: string, newResult: DeepSearchResult): Promise<void> {
    try {
      await db
        .update(smartMaterialLists)
        .set({
          materialsList: newResult.materials || [],
          laborCosts: newResult.laborCosts || [],
          additionalCosts: newResult.additionalCosts || [],
          totalMaterialsCost: this.safeNumberToString(newResult.totalMaterialsCost),
          totalLaborCost: this.safeNumberToString(newResult.totalLaborCost),
          totalAdditionalCost: this.safeNumberToString(newResult.totalAdditionalCost),
          grandTotal: this.safeNumberToString(newResult.grandTotal),
          confidence: this.safeNumberToString(Math.max(parseFloat(this.safeNumberToString(newResult.confidence)), 0.1)),
          usageCount: sql`${smartMaterialLists.usageCount} + 1`,
          lastUsed: new Date(),
          updatedAt: new Date()
        })
        .where(eq(smartMaterialLists.id, id));

      console.log('✅ Lista existente actualizada con mejoras');

    } catch (error) {
      console.error('❌ Resilient update existing list error:', error);
      throw error; // Re-throw to be handled by resilient wrapper
    }
  }

  /**
   * DEPRECATED: Legacy method - use updateExistingListResilient instead
   */
  private async updateExistingList(id: string, newResult: DeepSearchResult): Promise<void> {
    await resilientDb.executeOptional(async (db) => {
      await this.updateExistingListResilient(db, id, newResult);
    }, 'Legacy Update Existing List');
  }

  /**
   * DEFENSIVE: Safely converts numbers to strings with null checks
   */
  private safeNumberToString(value: any): string {
    if (value === null || value === undefined) return '0';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    
    // Try to parse as number first
    const parsed = parseFloat(String(value));
    if (isNaN(parsed)) return '0';
    
    return parsed.toString();
  }

  /**
   * REMOVED: Legacy method replaced by performAllDatabaseReads consolidation
   * All regional matching now happens in the consolidated read method
   */

  /**
   * Extrae requerimientos específicos del proyecto para filtrado de materiales
   */
  private extractProjectRequirements(description: string): any {
    const desc = description.toLowerCase();
    
    return {
      includesGates: desc.includes('gate') && !desc.includes('no gate'),
      includesPainting: desc.includes('paint') && !desc.includes('no paint'),
      includesDemolition: desc.includes('demolition') || desc.includes('removal') || desc.includes('tear down'),
      projectType: this.extractProjectTypeFromDescription(desc),
      excludedItems: this.extractExcludedItems(desc),
      dimensions: this.extractDimensions(desc)
    };
  }

  /**
   * Extrae elementos específicamente excluidos del proyecto
   */
  private extractExcludedItems(description: string): string[] {
    const excluded = [];
    if (description.includes('no gate')) excluded.push('gate');
    if (description.includes('no paint')) excluded.push('paint');
    if (description.includes('no demolition')) excluded.push('demolition');
    if (description.includes('no removal')) excluded.push('removal');
    return excluded;
  }

  /**
   * Extrae dimensiones del proyecto de la descripción
   */
  private extractDimensions(description: string): any {
    const linearFeetMatch = description.match(/(\d+)\s*(linear\s*)?(ft|feet|foot)/i);
    const heightMatch = description.match(/(\d+)\s*(ft|feet|foot)\s*tall/i);
    
    return {
      linearFeet: linearFeetMatch ? parseInt(linearFeetMatch[1]) : null,
      height: heightMatch ? parseInt(heightMatch[1]) : null
    };
  }

  /**
   * Extrae tipo de proyecto de la descripción
   */
  private extractProjectTypeFromDescription(description: string): string {
    if (description.includes('fence') || description.includes('fencing')) return 'fencing';
    if (description.includes('roof') || description.includes('roofing')) return 'roofing';
    if (description.includes('deck') || description.includes('decking')) return 'decking';
    return 'general';
  }

  /**
   * Valida que los materiales cached sean relevantes para el proyecto actual
   */
  private validateMaterialRelevance(cachedData: any, projectRequirements: any): boolean {
    if (!cachedData || !cachedData.materials) return false;

    // Verificar que no se incluyan materiales excluidos
    for (const material of cachedData.materials) {
      const materialName = material.name.toLowerCase();
      
      // Filtrar materiales específicamente excluidos
      for (const excluded of projectRequirements.excludedItems) {
        if (materialName.includes(excluded)) {
          console.log(`❌ Material filtrado por exclusión: ${material.name} (excluido: ${excluded})`);
          return false;
        }
      }

      // Verificar compatibilidad de tipo de proyecto
      if (projectRequirements.projectType === 'fencing') {
        // Para proyectos de fence sin gates, excluir materiales de gate
        if (!projectRequirements.includesGates && (
          materialName.includes('gate') || 
          materialName.includes('latch') || 
          materialName.includes('hinge')
        )) {
          console.log(`❌ Material de gate filtrado para proyecto sin gates: ${material.name}`);
          return false;
        }
      }
    }

    console.log('✅ Materiales cached son relevantes para el proyecto');
    return true;
  }

  /**
   * REMOVED: Legacy method replaced by performAllDatabaseReads consolidation
   * Global similarity search now happens in the consolidated read method
   */

  /**
   * REMOVED: Legacy method replaced by performAllDatabaseReads consolidation
   * Regional similarity search now happens in the consolidated read method
   */

  /**
   * REMOVED: Legacy method replaced by performAllDatabaseReads consolidation
   * Template search now happens in the consolidated read method
   */

  /**
   * REMOVED: Legacy method - usage stats are now updated in the resilient methods
   */

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
    
    const intersection = new Set(Array.from(keywords1).filter(x => keywords2.has(x)));
    const union = new Set([...Array.from(keywords1), ...Array.from(keywords2)]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Obtiene estadísticas del cache GLOBAL con métricas de colaboración
   * RESILIENT: Uses resilient wrapper for database access
   */
  async getCacheStats(): Promise<any> {
    return await resilientDb.executeOptional(async (db) => {
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
        global: globalStats[0] || {},
        byProjectType: projectStats || [],
        topReused: topReused || [],
        collaborativeMetrics: {
          reuseRate: globalStats[0]?.savedGenerations || 0,
          crossRegionalProjects: projectStats.filter(p => p.regionsCovered > 1).length,
          averageRegionsPerProject: projectStats.length > 0 ? projectStats.reduce((sum, p) => sum + p.regionsCovered, 0) / projectStats.length : 0
        }
      };

    }, 'SmartCache Statistics') || { global: {}, byProjectType: [], topReused: [], collaborativeMetrics: {} };
  }

  /**
   * Obtiene insights de mejora continua del sistema
   * RESILIENT: Uses resilient wrapper for database access
   */
  async getSystemInsights(): Promise<any> {
    return await resilientDb.executeOptional(async (db) => {
      
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
        topEvolvingProjects: evolvingProjects || [],
        knowledgeGaps: knowledgeGaps || [],
        systemHealth: {
          avgProjectsPerType: 0, // Se calcularía
          crossRegionCollaboration: 0,
          recentActivity: 0
        }
      };

    }, 'SmartCache System Insights') || { topEvolvingProjects: [], knowledgeGaps: [], systemHealth: {} };
  }
}

export const smartMaterialCacheService = new SmartMaterialCacheService();