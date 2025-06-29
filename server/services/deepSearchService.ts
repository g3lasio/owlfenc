/**
 * Mervin DeepSearch IA Service
 * 
 * Este servicio utiliza IA para analizar descripciones de proyectos y generar
 * automáticamente listas de materiales con cantidades y precios estimados.
 * 
 * Funcionalidad:
 * - Análisis de descripción del proyecto
 * - Identificación automática de materiales necesarios
 * - Consulta de precios en tiempo real
 * - Generación de estimados completos
 */

import Anthropic from '@anthropic-ai/sdk';
import { smartMaterialCacheService } from './smartMaterialCacheService';
import { expertContractorService } from './expertContractorService';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface MaterialItem {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  supplier?: string;
  sku?: string;
  specifications?: string;
}

export interface LaborCost {
  category: string;
  description: string;
  hours: number;
  rate: number;
  total: number;
}

export interface AdditionalCost {
  category: string;
  description: string;
  cost: number;
  required: boolean;
}

export interface DeepSearchResult {
  projectType: string;
  projectScope: string;
  materials: MaterialItem[];
  laborCosts: LaborCost[];
  additionalCosts: AdditionalCost[];
  totalMaterialsCost: number;
  totalLaborCost: number;
  totalAdditionalCost: number;
  grandTotal: number;
  confidence: number;
  recommendations: string[];
  warnings: string[];
}

export class DeepSearchService {
  private readonly MODEL = 'claude-3-7-sonnet-20250219';

  /**
   * Analiza una descripción de proyecto y genera una lista completa de materiales
   * Ahora con sistema inteligente de cache y reutilización
   */
  async analyzeProject(projectDescription: string, location?: string): Promise<DeepSearchResult> {
    try {
      console.log('🔍 DeepSearch: Analizando proyecto...', { projectDescription, location });

      // 1. BUSCAR EN CACHE PRIMERO - Verificar existencia previa
      const projectType = this.extractProjectType(projectDescription);
      const region = location || 'default';

      const cacheResult = await smartMaterialCacheService.searchExistingMaterials({
        projectType,
        region,
        description: projectDescription,
        similarityThreshold: 0.75
      });

      if (cacheResult.found && cacheResult.data) {
        console.log(`✅ DeepSearch: Encontrados materiales existentes (${cacheResult.source}) - recalculando cantidades`);
        
        // CRITICAL FIX: Always recalculate quantities for new project specifications
        // This restores the intelligent calculation logic that was bypassed
        return await this.recalculateMaterialQuantities(
          cacheResult.data, 
          projectDescription, 
          location
        );
      }

      // 2. GENERAR NUEVA LISTA - Solo si no existe previamente
      console.log('🤖 DeepSearch: Generando nueva lista con IA...');
      
      // Generar el prompt estructurado para Claude
      const analysisPrompt = this.buildAnalysisPrompt(projectDescription, location);

      // Procesar con Claude 3.7 Sonnet
      const response = await anthropic.messages.create({
        model: this.MODEL,
        max_tokens: 4000,
        temperature: 0.1, // Baja temperatura para resultados más consistentes
        system: this.getSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: analysisPrompt
          }
        ]
      });

      // Procesar la respuesta de Claude
      const responseContent = response.content[0];
      if (responseContent.type !== 'text') {
        throw new Error('Respuesta de Claude no es de tipo texto');
      }
      const analysisResult = this.parseClaudeResponse(responseContent.text);
      
      // Enriquecer con datos de precios actualizados
      const enrichedResult = await this.enrichWithPricing(analysisResult, location);

      console.log('✅ DeepSearch: Análisis completado', { 
        materialCount: enrichedResult.materials.length,
        totalCost: enrichedResult.grandTotal 
      });

      // 3. CONTRIBUIR AL SISTEMA GLOBAL - Para beneficio de toda la comunidad
      await smartMaterialCacheService.saveMaterialsList(
        projectType,
        projectDescription,
        region,
        enrichedResult
      );

      // Agregar marca de contribución al sistema
      enrichedResult.recommendations.push(
        '🌍 Esta lista ha sido contribuida al sistema global de DeepSearch para beneficiar a toda la comunidad'
      );

      return enrichedResult;

    } catch (error: any) {
      console.error('❌ DeepSearch Error:', error);
      throw new Error(`Error en análisis DeepSearch: ${error.message}`);
    }
  }

  /**
   * Genera un prompt estructurado para el análisis de Claude
   */
  private buildAnalysisPrompt(description: string, location?: string): string {
    const locationContext = location ? `\nProject Location: ${location}` : '';
    
    return `
Analyze the following construction project description and generate a complete list of required materials:

PROJECT DESCRIPTION:
${description}${locationContext}

Please provide your analysis in the following exact JSON format:

{
  "projectType": "specific project type",
  "projectScope": "detailed work scope",
  "materials": [
    {
      "id": "mat_001",
      "name": "Commercial material name",
      "description": "Detailed description",
      "category": "category (lumber, metal, concrete, hardware, etc.)",
      "quantity": number,
      "unit": "unit (feet, pounds, gallons, pieces, etc.)",
      "unitPrice": estimated_price_per_unit,
      "totalPrice": total_price,
      "specifications": "technical specifications"
    }
  ],
  "laborCosts": [
    {
      "category": "work type",
      "description": "work description",
      "hours": estimated_hours,
      "rate": hourly_rate,
      "total": total_labor
    }
  ],
  "additionalCosts": [
    {
      "category": "permits|transport|equipment|other",
      "description": "cost description",
      "cost": amount,
      "required": true/false
    }
  ],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "warnings": ["warning 1", "warning 2"],
  "confidence": number_between_0_and_1
}

IMPORTANT:
- Be specific with real commercial material names
- Include all necessary materials, even small ones (screws, adhesives, etc.)
- Calculate realistic quantities based on dimensions
- Provide current US market estimated prices
- Include realistic labor costs for the region
- Consider local permits and regulations
- Ensure JSON is valid and complete
- ALL TEXT MUST BE IN ENGLISH ONLY
`;
  }

  /**
   * Define el prompt del sistema para Claude
   */
  private getSystemPrompt(): string {
    return `
You are an expert construction contractor with 20+ years of experience in project estimation. 
Your specialty is analyzing project descriptions and generating complete and accurate material lists.

SPECIALIZED KNOWLEDGE:
- Construction materials and their specifications
- Current construction material market prices
- Building codes and regulations
- Installation techniques and best practices
- Suppliers like Home Depot, Lowes, Ferguson, etc.

INSTRUCTIONS:
1. Carefully analyze each project description
2. Identify ALL necessary materials, even the smallest ones
3. Calculate precise quantities based on standard dimensions
4. Provide realistic current market prices
5. Include appropriate labor costs for the type of work
6. Consider factors like waste, extras and contingencies
7. Suggest alternatives or improvements when appropriate
8. Warn about possible complications or special requirements

ALWAYS RESPOND IN VALID JSON FORMAT.
ALL TEXT MUST BE IN ENGLISH ONLY.
`;
  }

  /**
   * Procesa la respuesta de Claude y extrae los datos estructurados
   */
  private parseClaudeResponse(responseText: string): DeepSearchResult {
    try {
      console.log('🔍 Parsing Claude response, length:', responseText.length);
      
      // Limpiar y extraer JSON de la respuesta
      let jsonString = this.extractAndCleanJSON(responseText);
      
      if (!jsonString) {
        throw new Error('No valid JSON found in response');
      }

      console.log('🔍 Extracted JSON preview:', jsonString.substring(0, 200) + '...');
      const jsonData = JSON.parse(jsonString);

      // Validar la estructura
      this.validateResponseStructure(jsonData);

      // Calcular totales
      const totalMaterialsCost = jsonData.materials.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
      const totalLaborCost = jsonData.laborCosts.reduce((sum: number, item: any) => sum + item.total, 0);
      const totalAdditionalCost = jsonData.additionalCosts.reduce((sum: number, item: any) => sum + item.cost, 0);

      return {
        projectType: jsonData.projectType,
        projectScope: jsonData.projectScope,
        materials: jsonData.materials.map((item: any, index: number) => ({
          ...item,
          id: item.id || `mat_${String(index + 1).padStart(3, '0')}`,
          supplier: item.supplier || 'Home Depot/Lowes',
          sku: item.sku || 'TBD'
        })),
        laborCosts: jsonData.laborCosts || [],
        additionalCosts: jsonData.additionalCosts || [],
        totalMaterialsCost,
        totalLaborCost,
        totalAdditionalCost,
        grandTotal: totalMaterialsCost + totalLaborCost + totalAdditionalCost,
        confidence: Math.max(0, Math.min(1, jsonData.confidence || 0.8)),
        recommendations: jsonData.recommendations || [],
        warnings: jsonData.warnings || []
      };

    } catch (error: any) {
      console.error('Error parsing Claude response:', error);
      console.error('Raw response:', responseText.substring(0, 500));
      
      // Fallback: Generate structured response using expert contractor service
      console.log('🔄 Activating fallback - using Expert Contractor Service');
      return this.generateFallbackResponse(responseText);
    }
  }

  /**
   * Genera respuesta de fallback cuando Claude falla
   */
  private generateFallbackResponse(originalResponse: string): DeepSearchResult {
    try {
      // Extraer información básica del texto de respuesta
      const projectType = this.extractProjectTypeFromText(originalResponse);
      
      // Usar Expert Contractor Service como fallback
      const expertResult = expertContractorService.generateExpertEstimate(
        `${projectType} project requiring materials analysis`,
        'United States'
      );

      return {
        projectType: projectType,
        projectScope: 'Material analysis with expert fallback',
        materials: expertResult.materials,
        laborCosts: expertResult.labor,
        additionalCosts: [],
        totalMaterialsCost: expertResult.costs.materials,
        totalLaborCost: expertResult.costs.labor,
        totalAdditionalCost: 0,
        grandTotal: expertResult.costs.total,
        confidence: 0.75, // Lower confidence for fallback
        recommendations: ['Generated using expert fallback system'],
        warnings: ['Original AI response had formatting issues - using expert calculations']
      };
    } catch (fallbackError) {
      console.error('Fallback generation failed:', fallbackError);
      throw new Error('Both primary and fallback analysis failed');
    }
  }

  /**
   * Extrae tipo de proyecto del texto de respuesta
   */
  private extractProjectTypeFromText(text: string): string {
    const lowText = text.toLowerCase();
    
    if (lowText.includes('flooring') || lowText.includes('laminate') || lowText.includes('hardwood')) {
      return 'flooring';
    }
    if (lowText.includes('fence') || lowText.includes('fencing')) {
      return 'fencing';
    }
    if (lowText.includes('roofing') || lowText.includes('roof')) {
      return 'roofing';
    }
    if (lowText.includes('concrete') || lowText.includes('foundation')) {
      return 'concrete';
    }
    
    return 'general_construction';
  }

  /**
   * Extrae y limpia JSON de la respuesta de Claude
   */
  private extractAndCleanJSON(responseText: string): string | null {
    try {
      // 1. Buscar JSON en markdown code blocks primero
      let jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        console.log('🔍 Found JSON in markdown code block');
        return this.cleanJSONString(jsonMatch[1]);
      }
      
      // 2. Buscar entre triple backticks sin json
      jsonMatch = responseText.match(/```\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        console.log('🔍 Found JSON in plain code block');
        return this.cleanJSONString(jsonMatch[1]);
      }
      
      // 3. Buscar JSON directamente (último recurso)
      jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('🔍 Found JSON directly in text');
        return this.cleanJSONString(jsonMatch[0]);
      }
      
      console.log('❌ No JSON found in response');
      return null;
      
    } catch (error) {
      console.error('Error extracting JSON:', error);
      return null;
    }
  }

  /**
   * Limpia string JSON de problemas comunes
   */
  private cleanJSONString(jsonStr: string): string {
    // Remover comentarios de JavaScript
    jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');
    jsonStr = jsonStr.replace(/\/\/.*$/gm, '');
    
    // Corregir strings cortados (problema específico de Claude)
    jsonStr = jsonStr.replace(/"\s*$/g, '""');
    jsonStr = jsonStr.replace(/,\s*$/, '');
    
    // Encontrar strings incompletos en el JSON y completarlos
    jsonStr = jsonStr.replace(/"([^"]*?)$/gm, '"$1"');
    
    // Corregir comillas simples a dobles
    jsonStr = jsonStr.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":');
    
    // Corregir valores con comillas simples
    jsonStr = jsonStr.replace(/:[\s]*'([^']*?)'/g, ': "$1"');
    
    // Remover trailing commas
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
    
    // Corregir espacios en nombres de propiedades
    jsonStr = jsonStr.replace(/(\w+)(\s+)(\w+):/g, '"$1$3":');
    
    // Asegurar que el JSON esté completo
    if (!jsonStr.endsWith('}')) {
      const openBraces = (jsonStr.match(/\{/g) || []).length;
      const closeBraces = (jsonStr.match(/\}/g) || []).length;
      const missing = openBraces - closeBraces;
      for (let i = 0; i < missing; i++) {
        jsonStr += '}';
      }
    }
    
    return jsonStr.trim();
  }

  /**
   * Valida la estructura de la respuesta de Claude
   */
  private validateResponseStructure(data: any): void {
    const required = ['projectType', 'materials'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Campos requeridos faltantes: ${missing.join(', ')}`);
    }

    if (!Array.isArray(data.materials)) {
      throw new Error('El campo materials debe ser un array');
    }
  }

  /**
   * Enriquece los resultados con precios actualizados y datos adicionales
   */
  private async enrichWithPricing(result: DeepSearchResult, location?: string): Promise<DeepSearchResult> {
    try {
      // Aplicar ajustes regionales si se proporciona ubicación
      if (location) {
        result = this.applyRegionalAdjustments(result, location);
      }

      // Aplicar factores de inflación y mercado actuales
      result = this.applyMarketAdjustments(result);

      // Recalcular totales
      result.totalMaterialsCost = result.materials.reduce((sum, item) => sum + item.totalPrice, 0);
      result.totalLaborCost = result.laborCosts.reduce((sum, item) => sum + item.total, 0);
      result.totalAdditionalCost = result.additionalCosts.reduce((sum, item) => sum + item.cost, 0);
      result.grandTotal = result.totalMaterialsCost + result.totalLaborCost + result.totalAdditionalCost;

      return result;

    } catch (error) {
      console.error('Error enriching with pricing:', error);
      // Retornar resultado original si falla el enriquecimiento
      return result;
    }
  }

  /**
   * Aplica ajustes de precios basados en la región
   */
  private applyRegionalAdjustments(result: DeepSearchResult, location: string): DeepSearchResult {
    // Factores de ajuste regional simplificados
    const regionalFactors: Record<string, number> = {
      'california': 1.3,
      'new york': 1.25,
      'texas': 1.0,
      'florida': 1.1,
      'illinois': 1.15,
      'default': 1.0
    };

    const locationLower = location.toLowerCase();
    const factor = Object.keys(regionalFactors).find(key => 
      locationLower.includes(key)
    ) || 'default';
    
    const adjustmentFactor = regionalFactors[factor];

    // Aplicar ajuste a materiales
    result.materials = result.materials.map(material => ({
      ...material,
      unitPrice: Math.round(material.unitPrice * adjustmentFactor * 100) / 100,
      totalPrice: Math.round(material.totalPrice * adjustmentFactor * 100) / 100
    }));

    // Aplicar ajuste a labor
    result.laborCosts = result.laborCosts.map(labor => ({
      ...labor,
      rate: Math.round(labor.rate * adjustmentFactor * 100) / 100,
      total: Math.round(labor.total * adjustmentFactor * 100) / 100
    }));

    return result;
  }

  /**
   * Aplica ajustes de mercado actuales
   */
  private applyMarketAdjustments(result: DeepSearchResult): DeepSearchResult {
    // Factor de inflación actual (esto se podría obtener de una API externa)
    const inflationFactor = 1.08; // 8% ajuste por inflación reciente

    result.materials = result.materials.map(material => ({
      ...material,
      unitPrice: Math.round(material.unitPrice * inflationFactor * 100) / 100,
      totalPrice: Math.round(material.totalPrice * inflationFactor * 100) / 100
    }));

    return result;
  }

  /**
   * Genera una lista de materiales compatible con el sistema existente de Mervin
   */
  async generateCompatibleMaterialsList(projectDescription: string, location?: string): Promise<any[]> {
    const deepSearchResult = await this.analyzeProject(projectDescription, location);
    
    return deepSearchResult.materials.map(material => ({
      id: material.id,
      name: material.name,
      description: material.description,
      category: material.category,
      quantity: material.quantity,
      unit: material.unit,
      price: material.unitPrice,
      total: material.totalPrice,
      supplier: material.supplier,
      specifications: material.specifications
    }));
  }

  /**
   * Extrae el tipo de proyecto de la descripción
   */
  private extractProjectType(description: string): string {
    const text = description.toLowerCase();
    
    const projectTypes = [
      { keywords: ['fence', 'fencing', 'chain link', 'privacy fence'], type: 'fencing' },
      { keywords: ['roof', 'roofing', 'shingle', 'tile'], type: 'roofing' },
      { keywords: ['deck', 'decking', 'patio', 'deck board'], type: 'decking' },
      { keywords: ['floor', 'flooring', 'hardwood', 'laminate'], type: 'flooring' },
      { keywords: ['siding', 'exterior wall', 'vinyl siding'], type: 'siding' },
      { keywords: ['drywall', 'sheetrock', 'interior wall'], type: 'drywall' },
      { keywords: ['paint', 'painting', 'primer'], type: 'painting' }
    ];

    for (const project of projectTypes) {
      if (project.keywords.some(keyword => text.includes(keyword))) {
        return project.type;
      }
    }

    return 'general_construction';
  }

  /**
   * CRITICAL FIX: Recalcula cantidades de materiales usando IA para el proyecto específico
   * Esto restaura la lógica inteligente de cálculo que se perdió con el sistema de cache
   */
  private async recalculateMaterialQuantities(
    existingResult: DeepSearchResult,
    newDescription: string,
    location?: string
  ): Promise<DeepSearchResult> {
    try {
      console.log('🔢 DeepSearch: Recalculando cantidades con IA para proyecto específico...');

      // Extraer información específica del proyecto nuevo
      const projectSpecs = this.extractProjectSpecifications(newDescription);
      
      // Generar prompt específico para recálculo de cantidades
      const recalculationPrompt = this.buildQuantityRecalculationPrompt(
        existingResult.materials,
        newDescription,
        projectSpecs,
        location
      );

      // Procesar con Claude para recálculo inteligente
      const response = await anthropic.messages.create({
        model: this.MODEL,
        max_tokens: 3000,
        temperature: 0.1, // Baja temperatura para cálculos precisos
        system: this.getQuantityRecalculationSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: recalculationPrompt
          }
        ]
      });

      const responseContent = response.content[0];
      if (responseContent.type !== 'text') {
        throw new Error('Respuesta de Claude no es de tipo texto');
      }

      // Procesar respuesta y actualizar cantidades
      const recalculatedMaterials = this.parseQuantityRecalculationResponse(
        responseContent.text,
        existingResult.materials
      );

      // Filtrar materiales irrelevantes basado en especificaciones del proyecto
      const filteredMaterials = this.filterIrrelevantMaterials(
        recalculatedMaterials,
        projectSpecs
      );

      // Actualizar resultado con cantidades recalculadas
      const updatedResult: DeepSearchResult = {
        ...existingResult,
        projectScope: newDescription,
        materials: filteredMaterials,
        totalMaterialsCost: filteredMaterials.reduce((sum, item) => sum + item.totalPrice, 0),
        confidence: Math.max(0.85, existingResult.confidence), // Alta confianza por recálculo
        recommendations: [
          ...existingResult.recommendations,
          '🔢 Cantidades recalculadas específicamente para este proyecto',
          '🎯 Materiales filtrados por relevancia al proyecto'
        ],
        warnings: []
      };

      // Recalcular totales
      updatedResult.grandTotal = updatedResult.totalMaterialsCost + 
                                 updatedResult.totalLaborCost + 
                                 updatedResult.totalAdditionalCost;

      console.log('✅ DeepSearch: Cantidades recalculadas correctamente', {
        originalMaterials: existingResult.materials.length,
        filteredMaterials: filteredMaterials.length,
        newTotalCost: updatedResult.totalMaterialsCost
      });

      return updatedResult;

    } catch (error) {
      console.error('❌ Error en recálculo de cantidades:', error);
      // Fallback: usar adaptación básica si falla el recálculo
      return await this.adaptExistingMaterials(existingResult, newDescription, location);
    }
  }

  /**
   * Adapta materiales existentes para un nuevo proyecto similar (método de respaldo)
   */
  private async adaptExistingMaterials(
    existingResult: DeepSearchResult, 
    newDescription: string, 
    location?: string
  ): Promise<DeepSearchResult> {
    try {
      console.log('🔄 DeepSearch: Adaptando materiales existentes...');

      // Aplicar ajustes menores basados en diferencias
      const adaptedResult = { ...existingResult };
      
      // Aplicar ajustes regionales si la ubicación es diferente
      if (location) {
        const regionalAdjusted = this.applyRegionalAdjustments(adaptedResult, location);
        adaptedResult.materials = regionalAdjusted.materials;
        adaptedResult.laborCosts = regionalAdjusted.laborCosts;
      }

      // Actualizar scope con nueva descripción
      adaptedResult.projectScope = newDescription;
      adaptedResult.recommendations.push('Lista adaptada de proyecto similar');
      adaptedResult.confidence = Math.max(0.7, adaptedResult.confidence - 0.1);

      // Recalcular totales
      adaptedResult.totalMaterialsCost = adaptedResult.materials.reduce((sum, item) => sum + item.totalPrice, 0);
      adaptedResult.totalLaborCost = adaptedResult.laborCosts.reduce((sum, item) => sum + item.total, 0);
      adaptedResult.totalAdditionalCost = adaptedResult.additionalCosts.reduce((sum, item) => sum + item.cost, 0);
      adaptedResult.grandTotal = adaptedResult.totalMaterialsCost + adaptedResult.totalLaborCost + adaptedResult.totalAdditionalCost;

      return adaptedResult;

    } catch (error) {
      console.error('❌ Adaptation error:', error);
      // Si falla la adaptación, usar datos originales
      return existingResult;
    }
  }

  /**
   * Extrae especificaciones exactas del proyecto para cálculos precisos
   */
  private extractProjectSpecifications(description: string): any {
    const desc = description.toLowerCase();
    
    // Extraer dimensiones exactas
    const linearFeetMatch = desc.match(/(\d+)\s*(linear\s*)?(ft|feet|foot)/i);
    const heightMatch = desc.match(/(\d+)\s*(ft|feet|foot)\s*tall/i);
    const widthMatch = desc.match(/(\d+)\s*(ft|feet|foot)\s*wide/i);
    
    // Extraer exclusiones específicas
    const excludesGates = desc.includes('no gate') || desc.includes('without gate');
    const excludesPainting = desc.includes('no paint') || desc.includes('without paint');
    const excludesDemolition = desc.includes('no demolition') || desc.includes('without demolition');
    
    return {
      linearFeet: linearFeetMatch ? parseInt(linearFeetMatch[1]) : null,
      height: heightMatch ? parseInt(heightMatch[1]) : null,
      width: widthMatch ? parseInt(widthMatch[1]) : null,
      excludesGates,
      excludesPainting, 
      excludesDemolition,
      projectType: this.extractProjectType(description)
    };
  }

  /**
   * Construye prompt para recálculo inteligente de cantidades
   */
  private buildQuantityRecalculationPrompt(
    existingMaterials: MaterialItem[],
    newDescription: string,
    projectSpecs: any,
    location?: string
  ): string {
    const materialsContext = existingMaterials.map(m => 
      `- ${m.name}: ${m.quantity} ${m.unit} ($${m.unitPrice})`
    ).join('\n');

    return `
You are a construction estimator recalculating material quantities for a specific project.

EXISTING MATERIALS LIST:
${materialsContext}

NEW PROJECT DESCRIPTION:
${newDescription}

PROJECT SPECIFICATIONS:
- Linear Feet: ${projectSpecs.linearFeet || 'Not specified'}
- Height: ${projectSpecs.height || 'Not specified'} feet
- Location: ${location || 'United States'}
- Excludes Gates: ${projectSpecs.excludesGates}
- Excludes Painting: ${projectSpecs.excludesPainting}
- Excludes Demolition: ${projectSpecs.excludesDemolition}

CRITICAL INSTRUCTIONS:
1. Recalculate EXACT quantities based on the NEW project specifications
2. If linear feet is specified, calculate ALL materials for EXACTLY that length
3. Remove materials that are excluded (gates, paint, demolition items)
4. Keep unit prices the same but adjust quantities precisely
5. Maintain realistic waste factors (5-10%)

Respond with JSON array of materials with updated quantities:
[
  {
    "id": "material_id",
    "name": "material_name", 
    "quantity": recalculated_quantity,
    "unit": "unit",
    "unitPrice": same_price,
    "totalPrice": quantity * unitPrice,
    "include": true/false
  }
]

Focus on PRECISION and RELEVANCE. Exclude irrelevant materials completely.`;
  }

  /**
   * Sistema prompt para recálculo de cantidades
   */
  private getQuantityRecalculationSystemPrompt(): string {
    return `You are an expert construction estimator specializing in precise material quantity calculations. 
    Your job is to recalculate exact material quantities based on specific project dimensions and requirements.
    Always provide accurate calculations and exclude irrelevant materials completely.
    Respond only with valid JSON format.`;
  }

  /**
   * Procesa respuesta de recálculo de cantidades
   */
  private parseQuantityRecalculationResponse(
    responseText: string,
    originalMaterials: MaterialItem[]
  ): MaterialItem[] {
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON array found in response');
      }

      const updatedMaterials = JSON.parse(jsonMatch[0]);
      
      return updatedMaterials
        .filter((item: any) => item.include !== false)
        .map((item: any) => {
          const original = originalMaterials.find(m => m.id === item.id || m.name === item.name);
          return {
            id: item.id || original?.id || `mat_${Date.now()}`,
            name: item.name,
            description: original?.description || item.description || '',
            category: original?.category || 'materials',
            quantity: Math.max(0, item.quantity || 0),
            unit: item.unit || original?.unit || 'pieces',
            unitPrice: item.unitPrice || original?.unitPrice || 0,
            totalPrice: Math.round((item.quantity || 0) * (item.unitPrice || 0) * 100) / 100,
            supplier: original?.supplier,
            specifications: original?.specifications
          };
        });

    } catch (error) {
      console.error('Error parsing quantity recalculation response:', error);
      // Fallback: return original materials
      return originalMaterials;
    }
  }

  /**
   * Determina si debe usar modo experto con precisión quirúrgica
   */
  private shouldUseExpertMode(projectDescription: string): boolean {
    const desc = projectDescription.toLowerCase();
    
    // Activar modo experto si hay dimensiones específicas
    const hasSpecificDimensions = /(\d+)\s*(linear\s*)?(ft|feet|foot)/.test(desc) || 
                                  /(\d+)\s*(sq\s*ft|square\s*feet)/.test(desc);
    
    // Activar para proyectos con exclusiones específicas
    const hasSpecificExclusions = desc.includes('no gate') || 
                                  desc.includes('no paint') || 
                                  desc.includes('no demolition');
    
    // Activar para materiales premium o específicos
    const hasPremiumMaterials = desc.includes('luxury') || 
                               desc.includes('cedar') || 
                               desc.includes('premium');
    
    // Activar para proyectos complejos
    const isComplexProject = desc.includes('multi-level') || 
                             desc.includes('custom') || 
                             desc.includes('commercial');
    
    return hasSpecificDimensions || hasSpecificExclusions || hasPremiumMaterials || isComplexProject;
  }

  /**
   * Filtra materiales irrelevantes basado en especificaciones del proyecto
   */
  private filterIrrelevantMaterials(
    materials: MaterialItem[],
    projectSpecs: any
  ): MaterialItem[] {
    return materials.filter(material => {
      const name = material.name.toLowerCase();
      
      // Filtrar materiales excluidos específicamente
      if (projectSpecs.excludesGates && (
        name.includes('gate') || 
        name.includes('latch') || 
        name.includes('hinge')
      )) {
        console.log(`❌ Filtered gate material: ${material.name}`);
        return false;
      }

      if (projectSpecs.excludesPainting && (
        name.includes('paint') || 
        name.includes('primer') || 
        name.includes('stain')
      )) {
        console.log(`❌ Filtered paint material: ${material.name}`);
        return false;
      }

      if (projectSpecs.excludesDemolition && (
        name.includes('removal') || 
        name.includes('demolition') || 
        name.includes('disposal')
      )) {
        console.log(`❌ Filtered demolition material: ${material.name}`);
        return false;
      }

      return true;
    });
  }
}

export const deepSearchService = new DeepSearchService();