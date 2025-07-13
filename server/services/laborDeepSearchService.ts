/**
 * Labor DeepSearch IA Service
 * 
 * Este servicio utiliza IA para analizar descripciones de proyectos y generar
 * automáticamente listas de servicios de labor/mano de obra con costos estimados.
 * 
 * Funcionalidad:
 * - Análisis de descripción del proyecto para identificar tareas de labor
 * - Identificación automática de servicios necesarios (instalación, demolición, limpieza, etc.)
 * - Estimación de horas de trabajo y costos de mano de obra
 * - Generación de estimados de labor completos
 * 
 * Casos de uso:
 * - Proyectos donde el cliente provee materiales
 * - Servicios de limpieza y demolición
 * - Instalación sin materiales
 * - Servicios de preparación de sitio
 * - Hauling y disposal
 */

import Anthropic from '@anthropic-ai/sdk';
import { enhancedLocationPricingService } from './enhancedLocationPricingService';
import { advancedLaborPricingService, AdvancedLaborPricingService } from './advancedLaborPricingService';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface LaborItem {
  id: string;
  name: string;
  description: string;
  category: string; // 'preparation', 'installation', 'cleanup', 'demolition', 'hauling', 'specialty'
  quantity: number;
  unit: string; // 'linear_ft', 'square_ft', 'cubic_yard', 'square', 'project', 'per_unit'
  unitPrice: number;
  totalCost: number;
  skillLevel: string; // 'helper', 'skilled', 'specialist', 'foreman'
  complexity: string; // 'low', 'medium', 'high'
  estimatedTime: string; // duración estimada
  includes?: string[]; // qué incluye este servicio
}

interface LaborAnalysisResult {
  laborItems: LaborItem[];
  totalHours: number;
  totalLaborCost: number;
  estimatedDuration: string; // días de trabajo
  crewSize: number;
  projectComplexity: 'low' | 'medium' | 'high';
  specialRequirements: string[];
  safetyConsiderations: string[];
}

export class LaborDeepSearchService {
  
  /**
   * Analiza un proyecto y genera una lista completa de tareas de labor
   */
  async analyzeLaborRequirements(
    projectDescription: string, 
    location?: string,
    projectType?: string
  ): Promise<LaborAnalysisResult> {
    try {
      console.log('🔧 Labor DeepSearch: Iniciando análisis de labor para:', { projectDescription, location, projectType });

      // ENHANCED PRECISION: Usar sistema avanzado de pricing geográfico
      if (location && location.trim().length > 0) {
        console.log('🎯 Using Enhanced Location Pricing for:', location);
        try {
          const enhancedResult = await this.analyzeWithEnhancedPricing(projectDescription, location, projectType);
          console.log('✅ Enhanced Labor Analysis completed with', enhancedResult.laborItems.length, 'items');
          return enhancedResult;
        } catch (enhancedError) {
          console.warn('⚠️ Enhanced pricing failed, falling back to standard analysis:', enhancedError);
        }
      }

      // FALLBACK: Usar sistema original con Claude
      const prompt = this.buildLaborAnalysisPrompt(projectDescription, location, projectType);
      
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4000,
        temperature: 0.3,
        messages: [{
          role: "user",
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Invalid response type from Anthropic');
      }

      const analysisResult = this.parseClaudeResponse(content.text);
      
      console.log('✅ Labor DeepSearch: Análisis completado', {
        laborItemsCount: analysisResult.laborItems.length,
        totalCost: analysisResult.totalLaborCost,
        estimatedDuration: analysisResult.estimatedDuration
      });

      return analysisResult;

    } catch (error) {
      console.error('❌ Labor DeepSearch Error:', error);
      throw new Error(`Error en análisis de labor: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Análisis avanzado con sistema de pricing geográfico mejorado
   */
  private async analyzeWithEnhancedPricing(
    projectDescription: string,
    location: string,
    projectType?: string
  ): Promise<LaborAnalysisResult> {
    
    // 1. Obtener tareas de labor específicas del proyecto
    const laborTasks = AdvancedLaborPricingService.getProjectLaborTasks(projectDescription);
    
    // 2. Calcular costos precisos por ubicación
    const preciseCosts = await advancedLaborPricingService.calculatePreciseLaborCosts(
      projectDescription,
      location,
      laborTasks
    );
    
    // 3. Convertir a formato compatible con el sistema existente
    const laborItems: LaborItem[] = preciseCosts.map(cost => ({
      id: cost.taskId,
      name: cost.name,
      description: cost.description,
      category: this.mapTaskTypeToCategory(cost.taskId),
      quantity: cost.quantity,
      unit: cost.unit,
      unitPrice: cost.adjustedRate,
      totalCost: cost.totalCost,
      skillLevel: this.extractSkillLevel(cost.taskId),
      complexity: this.extractComplexity(cost.taskId),
      estimatedTime: this.calculateEstimatedTime(cost.totalCost, cost.adjustedRate),
      includes: [cost.description]
    }));
    
    // 4. Calcular métricas generales
    const totalLaborCost = laborItems.reduce((sum, item) => sum + item.totalCost, 0);
    const totalHours = laborItems.reduce((sum, item) => sum + (item.totalCost / item.unitPrice), 0);
    const averageRate = totalLaborCost / totalHours;
    
    // 5. Determinar complejidad del proyecto
    const projectComplexity = this.determineProjectComplexity(projectDescription, laborItems);
    
    // 6. Generar recomendaciones específicas
    const specialRequirements = this.generateSpecialRequirements(projectDescription, location);
    const safetyConsiderations = this.generateSafetyConsiderations(projectDescription);
    
    return {
      laborItems,
      totalHours,
      totalLaborCost,
      estimatedDuration: this.calculateProjectDuration(totalHours, averageRate),
      crewSize: this.calculateCrewSize(laborItems),
      projectComplexity,
      specialRequirements,
      safetyConsiderations
    };
  }

  /**
   * Métodos auxiliares para el sistema avanzado
   */
  private mapTaskTypeToCategory(taskId: string): string {
    if (taskId.includes('roofing')) return 'installation';
    if (taskId.includes('concrete')) return 'installation';
    if (taskId.includes('landscaping')) return 'installation';
    if (taskId.includes('framing')) return 'installation';
    if (taskId.includes('electrical')) return 'specialty';
    if (taskId.includes('plumbing')) return 'specialty';
    if (taskId.includes('remove')) return 'demolition';
    if (taskId.includes('cleanup')) return 'cleanup';
    if (taskId.includes('prepare')) return 'preparation';
    return 'installation';
  }

  private extractSkillLevel(taskId: string): string {
    if (taskId.includes('electrical') || taskId.includes('plumbing')) return 'specialist';
    if (taskId.includes('concrete') || taskId.includes('framing')) return 'skilled';
    if (taskId.includes('cleanup') || taskId.includes('prepare')) return 'helper';
    return 'skilled';
  }

  private extractComplexity(taskId: string): string {
    if (taskId.includes('electrical') || taskId.includes('plumbing')) return 'high';
    if (taskId.includes('concrete') || taskId.includes('framing')) return 'high';
    if (taskId.includes('roofing')) return 'medium';
    if (taskId.includes('landscaping')) return 'medium';
    if (taskId.includes('cleanup')) return 'low';
    return 'medium';
  }

  private calculateEstimatedTime(totalCost: number, rate: number): string {
    const hours = totalCost / rate;
    if (hours < 8) return `${Math.round(hours)} hours`;
    const days = Math.ceil(hours / 8);
    return `${days} day${days > 1 ? 's' : ''}`;
  }

  private determineProjectComplexity(description: string, laborItems: LaborItem[]): 'low' | 'medium' | 'high' {
    const highComplexityTasks = laborItems.filter(item => item.complexity === 'high').length;
    const totalTasks = laborItems.length;
    
    if (highComplexityTasks / totalTasks > 0.5) return 'high';
    if (highComplexityTasks > 0) return 'medium';
    return 'low';
  }

  private generateSpecialRequirements(description: string, location: string): string[] {
    const requirements: string[] = [];
    
    if (description.includes('electrical')) requirements.push('Licensed electrician required');
    if (description.includes('plumbing')) requirements.push('Licensed plumber required');
    if (description.includes('concrete')) requirements.push('Concrete mixer and equipment');
    if (description.includes('roofing')) requirements.push('Safety harnesses and fall protection');
    if (description.includes('1200') || description.includes('large')) requirements.push('Building permits required');
    
    // Location-specific requirements
    if (location.toLowerCase().includes('california')) {
      requirements.push('California contractor license required');
    }
    
    return requirements;
  }

  private generateSafetyConsiderations(description: string): string[] {
    const safety: string[] = [];
    
    if (description.includes('roofing')) safety.push('Fall protection required');
    if (description.includes('electrical')) safety.push('Electrical safety protocols');
    if (description.includes('concrete')) safety.push('Proper lifting techniques');
    if (description.includes('demolition')) safety.push('Dust and debris protection');
    
    return safety;
  }

  private calculateProjectDuration(totalHours: number, averageRate: number): string {
    const workingHoursPerDay = 8;
    const days = Math.ceil(totalHours / workingHoursPerDay);
    
    if (days <= 1) return '1 day';
    if (days <= 7) return `${days} days`;
    
    const weeks = Math.ceil(days / 5);
    return `${weeks} week${weeks > 1 ? 's' : ''}`;
  }

  private calculateCrewSize(laborItems: LaborItem[]): number {
    const specialistTasks = laborItems.filter(item => item.skillLevel === 'specialist').length;
    const skilledTasks = laborItems.filter(item => item.skillLevel === 'skilled').length;
    const helperTasks = laborItems.filter(item => item.skillLevel === 'helper').length;
    
    return Math.max(2, Math.ceil((specialistTasks + skilledTasks + helperTasks) / 3));
  }

  /**
   * Construye el prompt para Claude específico para análisis de labor
   */
  private buildLaborAnalysisPrompt(projectDescription: string, location?: string, projectType?: string): string {
    return `
You are a veteran general contractor with 25+ years experience pricing construction labor in various US markets. Research and analyze the SPECIFIC LOCATION to provide accurate local pricing that reflects real market conditions in that area.

PROJECT DESCRIPTION:
${projectDescription}

PROJECT TYPE: ${projectType || 'General'}
LOCATION: ${location || 'United States'}

LOCATION-BASED PRICING RESEARCH:
1. ANALYZE the specific location provided (city, state, or address)
2. RESEARCH local market conditions for construction labor in that area
3. CONSIDER regional factors: cost of living, labor availability, local regulations
4. ADJUST pricing based on:
   - Urban vs Rural location
   - State minimum wage laws
   - Local permit requirements
   - Regional competition levels
   - Seasonal demand patterns

REAL CONTRACTOR PRICING METHODS (NEVER use hourly rates):
• LINEAR FOOT: Fencing, trim, gutters - Research local rates for this specific area
• SQUARE FOOT: Roofing, flooring, walls - Adjust for local market conditions
• CUBIC YARD: Concrete, excavation - Factor in local disposal costs and regulations
• SQUARE (100 sqft): Roofing/siding - Consider local building codes and weather
• PER PROJECT: Small jobs - Price according to local service rates
• PER UNIT: Doors, windows, posts - Research local installation costs

REGIONAL PRICING EXAMPLES:
- California: Higher rates due to regulations and cost of living
- Texas: Moderate rates, competitive market
- Florida: Hurricane considerations affect pricing
- New York: Higher urban rates, strict codes
- Rural areas: Lower rates but travel costs
- Northeast: Weather delays factor into pricing

CRITICAL INSTRUCTIONS:
1. Include ONLY LABOR/SERVICES (NO materials)
2. Research and apply LOCAL MARKET RATES for the specific location
3. Factor in regional economic conditions and regulations
4. Use professional contractor pricing methods for that area
5. Consider local competition and demand
6. Use English for all service names and descriptions
7. Explain briefly why prices reflect local market conditions

LABOR CATEGORIES:
- Site preparation (excavation, leveling, marking)
- Demolition and removal
- Main installation and construction
- Finishing and details
- Final cleanup
- Hauling and disposal

RESPOND IN EXACT JSON FORMAT:
{
  "laborItems": [
    {
      "id": "labor_001",
      "name": "Service name in English",
      "description": "Detailed description of what's included in this service",
      "category": "preparation|installation|cleanup|demolition|hauling|specialty",
      "quantity": 250,
      "unit": "linear_ft|square_ft|cubic_yard|square|project|per_unit",
      "unitPrice": 16.00,
      "totalCost": 4000.00,
      "skillLevel": "helper|skilled|specialist|foreman",
      "complexity": "low|medium|high",
      "estimatedTime": "2-3 days",
      "includes": ["What this service includes"]
    }
  ],
  "totalLaborCost": 4000.00,
  "estimatedDuration": "5-7 days",
  "projectComplexity": "medium",
  "specialRequirements": ["special permits", "certifications"],
  "safetyConsiderations": ["safety considerations"]
}

REFERENCE RATES BY SKILL LEVEL:
- Helper: $20-30/hour
- Skilled: $35-50/hour  
- Specialist: $50-75/hour
- Foreman: $60-85/hour

Adjust rates based on location and project complexity.
ALL TEXT MUST BE IN ENGLISH ONLY.
`;
  }

  /**
   * Parsea la respuesta de Claude y estructura los datos
   */
  private parseClaudeResponse(claudeResponse: string): LaborAnalysisResult {
    try {
      // Limpiar la respuesta y extraer JSON
      const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validar estructura básica
      if (!parsed.laborItems || !Array.isArray(parsed.laborItems)) {
        throw new Error('Estructura de respuesta inválida');
      }

      // Generar IDs únicos si no existen
      parsed.laborItems = parsed.laborItems.map((item: any, index: number) => ({
        ...item,
        id: item.id || `labor_${Date.now()}_${index}`,
        totalCost: Number(item.totalCost || 0),
        hours: Number(item.hours || 0),
        hourlyRate: Number(item.hourlyRate || 0),
        crew: Number(item.crew || 1)
      }));

      // Calcular totales si no están presentes
      if (!parsed.totalHours) {
        parsed.totalHours = parsed.laborItems.reduce((sum: number, item: any) => sum + (item.hours || 0), 0);
      }

      if (!parsed.totalLaborCost) {
        parsed.totalLaborCost = parsed.laborItems.reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0);
      }

      return parsed as LaborAnalysisResult;

    } catch (error) {
      console.error('Error parseando respuesta de Claude:', error);
      throw new Error('Error procesando respuesta de IA');
    }
  }

  /**
   * Genera una lista de tareas de labor compatible con el sistema existente
   */
  async generateCompatibleLaborList(projectDescription: string, location?: string, projectType?: string): Promise<any[]> {
    const laborResult = await this.analyzeLaborRequirements(projectDescription, location, projectType);
    
    return laborResult.laborItems.map(labor => ({
      id: labor.id,
      name: labor.name,
      description: `${labor.description} (${labor.complexity} complexity, ${labor.estimatedTime})`,
      category: 'labor',
      quantity: labor.quantity,
      unit: labor.unit,
      unitPrice: labor.unitPrice,
      totalPrice: labor.totalCost,
      skillLevel: labor.skillLevel,
      complexity: labor.complexity,
      estimatedTime: labor.estimatedTime,
      includes: labor.includes || []
    }));
  }

  /**
   * Combina análisis de materiales y labor para un estimado completo
   */
  async generateCombinedEstimate(
    projectDescription: string, 
    includeMaterials: boolean = true,
    includeLabor: boolean = true,
    location?: string,
    projectType?: string
  ): Promise<{
    materials: any[];
    labor: any[];
    totalMaterialsCost: number;
    totalLaborCost: number;
    grandTotal: number;
  }> {
    
    const results = {
      materials: [] as any[],
      labor: [] as any[],
      totalMaterialsCost: 0,
      totalLaborCost: 0,
      grandTotal: 0
    };

    try {
      // PERFORMANCE OPTIMIZATION: Run both operations in parallel instead of sequential
      const promises: Promise<any>[] = [];

      // Prepare labor analysis promise
      if (includeLabor) {
        console.log('🔧 Starting parallel labor analysis...');
        promises.push(
          this.generateCompatibleLaborList(projectDescription, location, projectType)
            .then(laborItems => {
              results.labor = laborItems;
              results.totalLaborCost = laborItems.reduce((sum: number, item: any) => 
                sum + (item.totalPrice || item.totalCost || 0), 0);
              console.log('🔧 Labor analysis completed in parallel:', laborItems.length, 'items');
              return { type: 'labor', data: laborItems };
            })
        );
      }

      // Prepare materials analysis promise
      if (includeMaterials) {
        console.log('📦 Starting parallel materials analysis...');
        promises.push(
          import('./deepSearchService').then(({ deepSearchService }) =>
            deepSearchService.generateCompatibleMaterialsList(projectDescription, location)
              .then(materialsResult => {
                results.materials = materialsResult;
                results.totalMaterialsCost = materialsResult.reduce((sum: number, item: any) => 
                  sum + (item.total || 0), 0);
                console.log('📦 Materials analysis completed in parallel:', materialsResult.length, 'items');
                return { type: 'materials', data: materialsResult };
              })
          )
        );
      }

      // Wait for all parallel operations to complete
      if (promises.length > 0) {
        console.log('⚡ Waiting for', promises.length, 'parallel operations to complete...');
        await Promise.all(promises);
      }

      results.grandTotal = results.totalMaterialsCost + results.totalLaborCost;

      console.log('✅ OPTIMIZED Combined estimate generated:', {
        materialsCount: results.materials.length,
        laborCount: results.labor.length,
        totalMaterialsCost: results.totalMaterialsCost,
        totalLaborCost: results.totalLaborCost,
        grandTotal: results.grandTotal
      });

      return results;

    } catch (error) {
      console.error('❌ Error generating optimized combined estimate:', error);
      throw error;
    }
  }
}

// Crear instancia del servicio
export const laborDeepSearchService = new LaborDeepSearchService();