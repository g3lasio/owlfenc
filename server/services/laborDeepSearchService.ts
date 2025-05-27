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
      // Generar labor si se solicita
      if (includeLabor) {
        console.log('🔧 Generando análisis de labor...');
        const laborResult = await this.analyzeLaborRequirements(projectDescription, location, projectType);
        results.labor = await this.generateCompatibleLaborList(projectDescription, location, projectType);
        results.totalLaborCost = laborResult.totalLaborCost;
      }

      // Generar materiales si se solicita (usando el servicio existente)
      if (includeMaterials) {
        console.log('📦 Generando análisis de materiales...');
        // Importar el servicio de materiales existente
        const { deepSearchService } = await import('./deepSearchService');
        const materialsResult = await deepSearchService.generateCompatibleMaterialsList(projectDescription, location);
        results.materials = materialsResult;
        results.totalMaterialsCost = materialsResult.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
      }

      results.grandTotal = results.totalMaterialsCost + results.totalLaborCost;

      console.log('✅ Estimado combinado generado:', {
        materialsCount: results.materials.length,
        laborCount: results.labor.length,
        totalMaterialsCost: results.totalMaterialsCost,
        totalLaborCost: results.totalLaborCost,
        grandTotal: results.grandTotal
      });

      return results;

    } catch (error) {
      console.error('❌ Error generando estimado combinado:', error);
      throw error;
    }
  }
}

// Crear instancia del servicio
export const laborDeepSearchService = new LaborDeepSearchService();