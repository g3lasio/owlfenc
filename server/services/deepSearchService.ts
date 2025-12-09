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
import OpenAI from 'openai';
import { smartMaterialCacheService } from './smartMaterialCacheService';
import { expertContractorService } from './expertContractorService';
import { MultiIndustryExpertService } from './multiIndustryExpertService';
import { precisionQuantityCalculationService } from './precisionQuantityCalculationService';
import { materialValidationService } from './materialValidationService';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize GPT-4o as fallback
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
  private multiIndustryService = new MultiIndustryExpertService();

  /**
   * Analiza una descripción de proyecto y genera una lista completa de materiales
   * Ahora con sistema inteligente de cache y reutilización + precisión mejorada
   */
  async analyzeProject(projectDescription: string, location?: string): Promise<DeepSearchResult> {
    try {
      console.log('🔍 DeepSearch: Analizando proyecto...', { projectDescription, location });

      // ENHANCED PRECISION: Usar cálculo de precisión para proyectos ADU/construcción nueva
      if (this.isNewConstructionProject(projectDescription)) {
        console.log('🎯 Using Precision Calculation for new construction project');
        try {
          const precisionResult = await precisionQuantityCalculationService.calculateADUQuantities(
            projectDescription, 
            location || 'California'
          );
          
          return this.convertPrecisionResultToDeepSearchResult(precisionResult);
          
        } catch (precisionError) {
          console.warn('⚠️ Precision calculation failed, falling back to standard analysis:', precisionError);
        }
      }

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
        console.log(`✅ DeepSearch: Encontrados materiales existentes (${cacheResult.source}) - aplicando validación`);
        
        // SISTEMA INFALIBLE: Validar materiales de cache también
        const cacheValidation = materialValidationService.validateMaterialCompleteness(
          cacheResult.data.materials,
          projectType,
          projectDescription
        );
        
        if (cacheValidation.isComplete && cacheValidation.confidence > 0.8) {
          console.log('✅ CACHE VALIDATION PASSED: Using validated cached materials');
          
          // Apply expert contractor analysis even with cached materials
          const enhancedCacheResult = await this.applyExpertContractorPrecision(
            cacheResult.data, 
            projectDescription, 
            location
          );
          
          // Agregar marca de cache validado
          enhancedCacheResult.recommendations.push(
            '🔄 Materials retrieved from validated cache - expert precision applied'
          );
          
          return enhancedCacheResult;
        } else {
          console.log('⚠️ CACHE VALIDATION FAILED: Cache materials incomplete, running fresh analysis');
          console.log('   Missing critical:', cacheValidation.missingCritical);
          // Continuar con análisis fresco
        }
      }

      // 2. GENERAR NUEVA LISTA - Solo si no existe previamente
      console.log('🤖 DeepSearch: Generando nueva lista con IA...');
      
      // 🚀 YIELD: Release event loop before heavy AI processing
      await new Promise(resolve => setImmediate(resolve));
      
      // Generar el prompt estructurado para Claude
      const analysisPrompt = this.buildAnalysisPrompt(projectDescription, location);

      // Procesar con Claude 3.7 Sonnet con configuración optimizada para proyectos grandes
      const response = await anthropic.messages.create({
        model: this.MODEL,
        max_tokens: 8000, // Aumentado para proyectos ADU complejos
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
      const analysisResult = await this.parseClaudeResponse(responseContent.text);
      
      // ENHANCED: Apply expert contractor precision and location-based pricing
      const expertEnrichedResult = await this.applyExpertContractorPrecision(analysisResult, projectDescription, location);
      const enrichedResult = await this.enrichWithPricing(expertEnrichedResult, location);
      
      // PRECISION FILTER: Remove any tools or equipment that may have slipped through
      enrichedResult.materials = this.filterOnlyConstructionMaterials(enrichedResult.materials);

      // SISTEMA INFALIBLE: Validación de materiales críticos
      console.log('🔍 VALIDATION: Running material completeness check...');
      const validationResult = materialValidationService.validateMaterialCompleteness(
        enrichedResult.materials,
        projectType,
        projectDescription
      );

      // Agregar warnings de validación
      enrichedResult.warnings.push(...validationResult.warnings);
      enrichedResult.recommendations.push(...validationResult.recommendations);

      // ANÁLISIS SUPLEMENTARIO: Si faltan materiales críticos
      if (validationResult.supplementaryAnalysisNeeded && validationResult.missingCritical.length > 0) {
        console.log('🚨 CRITICAL MISSING MATERIALS DETECTED - Running supplementary analysis:', validationResult.missingCritical);
        
        try {
          const supplementaryMaterials = await this.runSupplementaryAnalysis(
            validationResult.missingCritical,
            projectType,
            projectDescription,
            location
          );

          // Agregar materiales suplementarios
          enrichedResult.materials.push(...supplementaryMaterials);
          
          // Recalcular totales
          enrichedResult.totalMaterialsCost = enrichedResult.materials.reduce((sum, item) => sum + item.totalPrice, 0);
          enrichedResult.grandTotal = enrichedResult.totalMaterialsCost + enrichedResult.totalLaborCost + enrichedResult.totalAdditionalCost;
          
          // Validar nuevamente para confirmar completitud
          const finalValidation = materialValidationService.validateMaterialCompleteness(
            enrichedResult.materials,
            projectType,
            projectDescription
          );
          
          enrichedResult.confidence = finalValidation.confidence;
          enrichedResult.recommendations.push(
            `🔧 Added ${supplementaryMaterials.length} critical materials through supplementary analysis`
          );
          
          console.log('✅ SUPPLEMENTARY ANALYSIS COMPLETE:', {
            addedMaterials: supplementaryMaterials.length,
            finalConfidence: finalValidation.confidence,
            nowComplete: finalValidation.isComplete
          });
          
        } catch (suppError) {
          console.error('❌ Supplementary analysis failed:', suppError);
          enrichedResult.warnings.push('⚠️ Some critical materials may be missing - manual review recommended');
          enrichedResult.confidence = Math.min(enrichedResult.confidence, 0.7);
        }
      } else {
        enrichedResult.confidence = validationResult.confidence;
        console.log('✅ VALIDATION PASSED: All critical materials present');
      }

      // Validación adicional de precios
      const pricingWarnings = materialValidationService.validatePricingReasonableness(
        enrichedResult.materials,
        projectType
      );
      enrichedResult.warnings.push(...pricingWarnings);

      console.log('✅ DeepSearch: Análisis completado con validación infalible', { 
        materialCount: enrichedResult.materials.length,
        totalCost: enrichedResult.grandTotal,
        confidence: enrichedResult.confidence,
        isComplete: validationResult.isComplete
      });

      // 3. CONTRIBUIR AL SISTEMA GLOBAL - Solo si está validado como completo
      if (validationResult.isComplete) {
        await smartMaterialCacheService.saveMaterialsList(
          projectType,
          projectDescription,
          region,
          enrichedResult
        );
        
        enrichedResult.recommendations.push(
          '🌍 Esta lista validada ha sido contribuida al sistema global de DeepSearch'
        );
      } else {
        console.log('⚠️ Skipping cache save - list not fully validated');
        enrichedResult.recommendations.push(
          '⚠️ Esta lista requiere revisión manual antes de ser guardada en cache'
        );
      }

      return enrichedResult;

    } catch (error: any) {
      console.error('❌ DeepSearch Error:', error);
      console.log('🔄 Activating GPT-4o fallback system');
      
      // FALLBACK: Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️ OpenAI API key not available, using Expert Contractor fallback');
        return this.generateExpertContractorFallback(projectDescription, location);
      }

      // FALLBACK GPT-4o: Usar GPT-4o cuando Anthropic falle
      try {
        console.log('🤖 GPT-4o: Generando lista de materiales con OpenAI GPT-4o...');
        
        // Usar el mismo prompt que se usa para Anthropic
        const analysisPrompt = this.buildAnalysisPrompt(projectDescription, location);
        
        const gptResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: this.getSystemPrompt()
            },
            {
              role: "user", 
              content: analysisPrompt
            }
          ],
          max_tokens: 4096,
          temperature: 0.1
        });

        // Procesar la respuesta de GPT-5
        const responseContent = gptResponse.choices[0]?.message?.content;
        if (!responseContent) {
          throw new Error('Respuesta vacía de GPT-5');
        }
        
        const analysisResult = await this.parseClaudeResponse(responseContent);
        
        // ENHANCED: Apply expert contractor precision and location-based pricing
        const expertEnrichedResult = await this.applyExpertContractorPrecision(analysisResult, projectDescription, location);
        const enrichedResult = await this.enrichWithPricing(expertEnrichedResult, location);
        
        // PRECISION FILTER: Remove any tools or equipment
        enrichedResult.materials = this.filterOnlyConstructionMaterials(enrichedResult.materials);
        
        // Agregar marca de fallback GPT-4o
        enrichedResult.recommendations.push('🤖 Generated using GPT-4o fallback system');
        enrichedResult.warnings.push('Used GPT-4o fallback due to Anthropic API unavailability');
        
        console.log('✅ GPT-4o Fallback: Análisis completado', { 
          materialCount: enrichedResult.materials.length,
          totalCost: enrichedResult.grandTotal
        });
        
        return enrichedResult;
        
      } catch (fallbackError: any) {
        console.error('❌ GPT-4o Fallback también falló:', fallbackError);
        console.log('🔄 Using final Expert Contractor fallback');
        return this.generateExpertContractorFallback(projectDescription, location);
      }
    }
  }

  /**
   * Genera un prompt inteligente para el análisis de Claude
   * REFACTORIZADO: Detecta CUALQUIER tipo de proyecto con IA (sin listas hardcodeadas)
   * Usa pricing por unidad profesional y ajustes precisos por ubicación
   */
  private buildAnalysisPrompt(description: string, location?: string): string {
    // Analizar ubicación para incluir contexto específico de precios con multiplicador
    const { context: locationContext, multiplier } = this.buildLocationMaterialContext(location);
    
    return `
You are a veteran materials estimator. Analyze this project and generate a materials list.

## PROJECT:
"${description}"

## LOCATION & PRICING:
${locationContext}
PRICE MULTIPLIER: ${multiplier}x (apply to all base prices)

## DIMENSION EXTRACTION CHECKLIST:
- Parse numbers WITH commas: "2,500 sqft" = 2500
- Use EXACT stated dimensions - never truncate
- If dimension unclear, estimate conservatively

## QUANTITY FORMULAS (include waste):
- Siding/Roofing: sqft × 1.10
- Fencing: lf ÷ panel_width × 1.10, posts every 8ft
- Concrete: (sqft × thickness/12) ÷ 27 × 1.05
- Drywall: sqft ÷ 32 × 1.10

## INCLUDE ONLY:
Materials that become permanent (panels, lumber, fasteners, sealants, underlayment, trim)

## EXCLUDE:
Tools, equipment, rentals, safety gear, labor

## JSON RESPONSE FORMAT:
{
  "projectType": "detected type (siding|roofing|fencing|concrete|drywall|flooring|painting|decking|plumbing|electrical|hvac|landscaping|other)",
  "projectScope": "work description",
  "materials": [{"id":"mat_001","name":"Material Name","description":"specs","category":"category","quantity":100,"unit":"sqft|lf|piece|gallon|bag","unitPrice":5.00,"totalPrice":500.00,"specifications":"details"}],
  "laborCosts": [],
  "additionalCosts": [{"category":"delivery","description":"Material delivery","cost":150,"required":true}],
  "recommendations": [],
  "warnings": [],
  "confidence": 0.90
}

Respond with ONLY valid JSON, no additional text.
`;
  }

  /**
   * Construye contexto de ubicación para precios de materiales
   * Retorna contexto narrativo Y multiplicador numérico para pricing consistente
   * FIXED: Usa word boundaries para evitar falsos positivos (e.g., "Chicago" no matchea "ca")
   */
  private buildLocationMaterialContext(location?: string): { context: string; multiplier: number } {
    if (!location || location.trim().length === 0) {
      return {
        context: 'Location: United States (national average)',
        multiplier: 1.00
      };
    }

    const locationLower = location.toLowerCase();
    
    // Estados con nombres completos y abreviaciones - usar word boundaries
    const stateData: Array<{ patterns: RegExp[]; desc: string; mult: number }> = [
      { patterns: [/\bcalifornia\b/, /\bca\b/], desc: 'California - Premium market', mult: 1.20 },
      { patterns: [/\bnew york\b/, /\bny\b/], desc: 'New York - High cost market', mult: 1.15 },
      { patterns: [/\bnew jersey\b/, /\bnj\b/], desc: 'New Jersey - High cost market', mult: 1.12 },
      { patterns: [/\bconnecticut\b/, /\bct\b/], desc: 'Connecticut - High cost market', mult: 1.12 },
      { patterns: [/\bmassachusetts\b/, /\bma\b/], desc: 'Massachusetts - High cost market', mult: 1.17 },
      { patterns: [/\bhawaii\b/, /\bhi\b/], desc: 'Hawaii - Premium island market', mult: 1.40 },
      { patterns: [/\balaska\b/, /\bak\b/], desc: 'Alaska - Remote premium market', mult: 1.40 },
      { patterns: [/\bwashington\b/, /\bwa\b/], desc: 'Washington - Moderate-high market', mult: 1.12 },
      { patterns: [/\boregon\b/, /\bor\b/], desc: 'Oregon - Moderate market', mult: 1.07 },
      { patterns: [/\bcolorado\b/, /\bco\b/], desc: 'Colorado - Growing market', mult: 1.10 },
      { patterns: [/\bflorida\b/, /\bfl\b/], desc: 'Florida - Moderate market', mult: 1.07 },
      { patterns: [/\btexas\b/, /\btx\b/], desc: 'Texas - Base rate market', mult: 1.00 },
      { patterns: [/\barizona\b/, /\baz\b/], desc: 'Arizona - Base rate market', mult: 1.00 },
      { patterns: [/\bnevada\b/, /\bnv\b/], desc: 'Nevada - Moderate market', mult: 1.05 },
      { patterns: [/\billinois\b/, /\bil\b/], desc: 'Illinois - Moderate market', mult: 1.07 },
      { patterns: [/\bpennsylvania\b/, /\bpa\b/], desc: 'Pennsylvania - Moderate market', mult: 1.05 },
      { patterns: [/\bvirginia\b/, /\bva\b/], desc: 'Virginia - Moderate market', mult: 1.07 },
      { patterns: [/\bgeorgia\b/, /\bga\b/], desc: 'Georgia - Competitive market', mult: 0.95 },
      { patterns: [/\bnorth carolina\b/, /\bnc\b/], desc: 'North Carolina - Competitive market', mult: 0.95 },
      { patterns: [/\bsouth carolina\b/, /\bsc\b/], desc: 'South Carolina - Low cost market', mult: 0.92 },
      { patterns: [/\btennessee\b/, /\btn\b/], desc: 'Tennessee - Low cost market', mult: 0.92 },
      { patterns: [/\bohio\b/, /\boh\b/], desc: 'Ohio - Low cost market', mult: 0.92 },
      { patterns: [/\bmichigan\b/, /\bmi\b/], desc: 'Michigan - Base rate market', mult: 1.00 },
    ];

    let stateInfo = '';
    let multiplier = 1.00;

    // Buscar match usando word boundaries
    for (const state of stateData) {
      if (state.patterns.some(pattern => pattern.test(locationLower))) {
        stateInfo = state.desc;
        multiplier = state.mult;
        break;
      }
    }

    // Detectar si es un ZIP code
    const zipMatch = location.match(/\b\d{5}(-\d{4})?\b/);
    const zipInfo = zipMatch ? ` | ZIP: ${zipMatch[0]}` : '';

    return {
      context: `Location: ${location}${zipInfo}${stateInfo ? ` | ${stateInfo}` : ''}`,
      multiplier
    };
  }

  /**
   * Define el prompt del sistema para Claude - Precisión Quirúrgica
   * REFACTORIZADO: Conciso y enfocado en detección inteligente
   */
  private getSystemPrompt(): string {
    return `You are a materials estimator. Output ONLY valid JSON.

RULES:
1. DETECT project type from context (not just keywords). "Shingle-style siding" = siding, NOT roofing.
2. EXTRACT dimensions exactly: "2,500 sqft" = 2500 (parse commas correctly).
3. CALCULATE quantities with waste factors (10% typical).
4. INCLUDE only permanent materials. EXCLUDE tools/equipment/labor.
5. APPLY the price multiplier provided for the location.

ALWAYS respond with valid JSON only. ALL TEXT IN ENGLISH.`;
  }

  /**
   * Procesa la respuesta de Claude y extrae los datos estructurados
   */
  private async parseClaudeResponse(responseText: string): Promise<DeepSearchResult> {
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
      console.error('Raw response (first 500 chars):', responseText.substring(0, 500));
      console.error('Raw response (last 500 chars):', responseText.substring(Math.max(0, responseText.length - 500)));
      
      // Try one more aggressive JSON repair before fallback
      console.log('🔧 Attempting aggressive JSON repair...');
      try {
        const repairedJson = this.aggressiveJsonRepair(responseText);
        if (repairedJson) {
          const jsonData = JSON.parse(repairedJson);
          this.validateResponseStructure(jsonData);
          
          // Calcular totales de forma defensiva
          const materials = Array.isArray(jsonData.materials) ? jsonData.materials : [];
          const laborCosts = Array.isArray(jsonData.laborCosts) ? jsonData.laborCosts : [];
          const additionalCosts = Array.isArray(jsonData.additionalCosts) ? jsonData.additionalCosts : [];
          
          const totalMaterialsCost = materials.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
          const totalLaborCost = laborCosts.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
          const totalAdditionalCost = additionalCosts.reduce((sum: number, item: any) => sum + (item.cost || 0), 0);

          console.log('✅ Aggressive JSON repair successful');
          return {
            projectType: jsonData.projectType,
            projectScope: jsonData.projectScope,
            materials: materials.map((item: any, index: number) => ({
              ...item,
              id: item.id || `mat_${String(index + 1).padStart(3, '0')}`,
              supplier: item.supplier || 'Home Depot/Lowes',
              sku: item.sku || 'TBD'
            })),
            laborCosts: laborCosts,
            additionalCosts: additionalCosts,
            totalMaterialsCost,
            totalLaborCost,
            totalAdditionalCost,
            grandTotal: totalMaterialsCost + totalLaborCost + totalAdditionalCost,
            confidence: Math.max(0, Math.min(1, jsonData.confidence || 0.8)),
            recommendations: [
              ...(jsonData.recommendations || []),
              'ℹ️ Estimado generado usando reparación automática de respuesta AI truncada'
            ],
            warnings: [
              ...(jsonData.warnings || []),
              '⚠️ Respuesta original fue reparada automáticamente - revise los detalles cuidadosamente'
            ],
            // Telemetría para debugging y UX
            generationMethod: 'aggressive_repair',
            aiProvider: 'claude_repaired'
          };
        }
      } catch (repairError) {
        console.log('⚠️ Aggressive JSON repair also failed:', repairError);
      }
      
      // Fallback: Generate structured response using GPT-4o
      console.log('🔄 Activating GPT-4o JSON parsing fallback');
      try {
        const gptResult = await this.generateGPT4oFallbackResponse(responseText);
        // Agregar telemetría para GPT-4o
        return {
          ...gptResult,
          generationMethod: 'gpt4o_fallback',
          aiProvider: 'gpt4o_after_claude_failure',
          recommendations: [
            ...(gptResult.recommendations || []),
            'ℹ️ Estimado generado usando GPT-4o después de que Claude falló'
          ]
        };
      } catch (gptError: any) {
        console.error('GPT-4o fallback failed:', gptError);
        
        // Final fallback: Expert Contractor Service
        console.log('🔄 Final fallback: Using Expert Contractor Service');
        const expertResult = this.generateExpertContractorFallback(
          this.extractProjectTypeFromText(responseText) + ' project',
          undefined
        );
        // Agregar telemetría para Expert Contractor fallback
        return {
          ...expertResult,
          generationMethod: 'expert_contractor_fallback',
          aiProvider: 'rule_based_system',
          warnings: [
            ...(expertResult.warnings || []),
            '⚠️ AI systems falló - usando estimado de contratista experto como fallback'
          ],
          recommendations: [
            ...(expertResult.recommendations || []),
            'ℹ️ Este estimado fue generado usando reglas de contratista experto después de fallas AI'
          ]
        };
      }
    }
  }

  /**
   * Genera respuesta de fallback usando GPT-4o cuando Claude falla con JSON parsing
   */
  private async generateGPT4oFallbackResponse(originalResponse: string): Promise<DeepSearchResult> {
    try {
      console.log('🤖 GPT-4o Fallback: Processing Claude response with GPT-4o');
      
      // Check if OpenAI API key is available and valid
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim().length < 20) {
        console.log('⚠️ OpenAI API key not available or invalid, using Expert Contractor fallback');
        return this.generateExpertContractorFallback(
          this.extractProjectTypeFromText(originalResponse) + ' project',
          undefined
        );
      }
      
      const projectType = this.extractProjectTypeFromText(originalResponse);
      
      // Usar GPT-4o para parsear y estructurar la respuesta de Claude usando SDK
      const gpt4oResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a JSON parser and material cost estimator. Your job is to extract material information from AI responses that failed to parse as JSON.

CRITICAL INSTRUCTIONS:
1. Extract ALL materials, quantities, and prices from the provided text
2. Return ONLY valid JSON - no explanations or markdown
3. Use this exact structure:
{
  "projectType": "string",
  "projectScope": "string", 
  "materials": [{"id": "string", "name": "string", "description": "string", "category": "string", "quantity": number, "unit": "string", "unitPrice": number, "totalPrice": number, "supplier": "string", "sku": "string"}],
  "laborCosts": [],
  "additionalCosts": [],
  "confidence": 0.85,
  "recommendations": ["GPT-4o fallback parsing"],
  "warnings": ["Original response had JSON parsing issues"]
}`
          },
          {
            role: "user",
            content: `Parse this failed Claude response and extract all materials into valid JSON:\n\n${originalResponse}`
          }
        ],
        max_tokens: 4096,
        temperature: 0.1
      });

      const gpt4oContent = gpt4oResponse.choices?.[0]?.message?.content;

      if (!gpt4oContent) {
        throw new Error('GPT-4o returned empty response');
      }

      console.log('🤖 GPT-4o Fallback: Parsing GPT-4o response');
      
      // Parse the GPT-4o response
      const cleanJson = this.cleanJSONString(gpt4oContent);
      const jsonData = JSON.parse(cleanJson);

      // Validate and calculate totals
      const totalMaterialsCost = jsonData.materials.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
      const totalLaborCost = jsonData.laborCosts?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
      const totalAdditionalCost = jsonData.additionalCosts?.reduce((sum: number, item: any) => sum + (item.cost || 0), 0) || 0;

      const result: DeepSearchResult = {
        projectType: jsonData.projectType || projectType,
        projectScope: jsonData.projectScope || `GPT-4o parsed ${projectType} project`,
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
        confidence: Math.max(0, Math.min(1, jsonData.confidence || 0.85)),
        recommendations: jsonData.recommendations || ['Generated using GPT-4o fallback system'],
        warnings: jsonData.warnings || ['Original AI response had JSON parsing issues - parsed by GPT-4o']
      };

      console.log('✅ GPT-4o Fallback: Successfully parsed and structured response');
      return result;

    } catch (fallbackError: any) {
      // 🚨 SECURITY: Never log external API errors directly - they may contain secrets
      const sanitizedError = {
        message: fallbackError?.message || 'Unknown error',
        code: fallbackError?.code || 'unknown',
        type: fallbackError?.type || 'unknown',
        status: fallbackError?.status || 'unknown'
      };
      console.error('GPT-4o fallback failed:', sanitizedError);
      
      // Final fallback - use Expert Contractor Service
      console.log('🔄 Final fallback: Using Expert Contractor Service');
      return this.generateExpertContractorFallback(
        this.extractProjectTypeFromText(originalResponse) + ' project',
        undefined
      );
    }
  }

  /**
   * Genera respuesta de fallback usando Expert Contractor Service cuando fallan los LLMs
   */
  private generateExpertContractorFallback(projectDescription: string, location?: string): DeepSearchResult {
    try {
      console.log('🔧 Final fallback: Using Expert Contractor Service');
      
      // Extraer información básica del proyecto
      const projectType = this.extractProjectType(projectDescription);
      
      // Usar Expert Contractor Service como fallback definitivo
      const expertResult = expertContractorService.generateExpertEstimate(
        projectDescription,
        location || 'United States',
        projectType
      );

      return {
        projectType: projectType,
        projectScope: projectDescription,
        materials: expertResult.materials || [],
        laborCosts: expertResult.labor || [],
        additionalCosts: [],
        totalMaterialsCost: expertResult.costs?.materials || 0,
        totalLaborCost: expertResult.costs?.labor || 0,
        totalAdditionalCost: 0,
        grandTotal: expertResult.costs?.total || 0,
        confidence: 0.75, // Lower confidence for non-LLM fallback
        recommendations: ['Generated using Expert Contractor Service - final fallback'],
        warnings: ['AI services unavailable - using expert contractor calculations']
      };
    } catch (fallbackError) {
      console.error('Expert Contractor fallback failed:', fallbackError);
      
      // Absolute final fallback - basic structure
      return {
        projectType: this.extractProjectType(projectDescription),
        projectScope: projectDescription,
        materials: [],
        laborCosts: [],
        additionalCosts: [],
        totalMaterialsCost: 0,
        totalLaborCost: 0,
        totalAdditionalCost: 0,
        grandTotal: 0,
        confidence: 0.1,
        recommendations: ['Unable to generate estimate - manual analysis required'],
        warnings: ['All analysis systems failed - please try again or contact support']
      };
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
   * Limpia string JSON de problemas comunes - MEJORADO para caracteres especiales
   */
  private cleanJSONString(jsonStr: string): string {
    // Remover comentarios de JavaScript
    jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');
    jsonStr = jsonStr.replace(/\/\/.*$/gm, '');
    
    // NUEVA FUNCIONALIDAD: Limpiar caracteres de control problemáticos
    // Reemplazar caracteres de control específicos que causan problemas
    jsonStr = jsonStr.replace(/\\"/g, '\\"'); // Mantener escapes válidos
    // ❌ CRÍTICO FIX: NO convertir newlines/tabs legítimos - esto ROMPE el JSON válido
    // jsonStr = jsonStr.replace(/\n/g, '\\n'); // DESHABILITADO - destruía JSON válido
    // jsonStr = jsonStr.replace(/\r/g, '\\r'); // DESHABILITADO - destruía JSON válido  
    // jsonStr = jsonStr.replace(/\t/g, '\\t'); // DESHABILITADO - destruía JSON válido
    
    // Limpiar SOLO caracteres de control realmente problemáticos (mantener \n, \t, \r legítimos)
    jsonStr = jsonStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remover NULL y control chars problemáticos
    
    // Validar JSON temprano para evitar sobre-procesamiento
    try {
      JSON.parse(jsonStr);
      console.log('✅ JSON válido después de limpieza básica');
      return jsonStr.trim();
    } catch (parseError) {
      console.log('⚠️ JSON necesita reparación adicional:', parseError.message);
      // Continuar con reparaciones más agresivas solo si es necesario
    }
    
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
    
    console.log('🧹 JSON cleaned, final length:', jsonStr.length);
    return jsonStr.trim();
  }

  /**
   * Reparación agresiva de JSON para casos de truncamiento severo
   */
  private aggressiveJsonRepair(rawResponse: string): string | null {
    try {
      console.log('🔧 Starting aggressive JSON repair...');
      
      // 1. Extraer todo el JSON disponible, incluso parcial
      let jsonPart = '';
      const jsonStart = rawResponse.indexOf('{');
      if (jsonStart === -1) return null;
      
      jsonPart = rawResponse.substring(jsonStart);
      
      // 2. Si no encuentra el final, construir un JSON válido mínimo
      if (!jsonPart.includes('}') || jsonPart.lastIndexOf('}') < jsonPart.lastIndexOf('{')) {
        console.log('🚨 JSON is severely truncated, building minimal valid structure...');
        
        // Crear estructura mínima válida
        const minimalJson = {
          projectType: "Construction Project",
          projectScope: "AI-generated estimate with partial data",
          materials: [] as any[],
          laborCosts: [] as any[],
          additionalCosts: [] as any[],
          confidence: 0.5,
          recommendations: ["This estimate was generated from truncated AI response"] as string[],
          warnings: ["Original AI response was incomplete - this is a minimal fallback"] as string[]
        };
        
        // Intentar extraer al menos algunos materiales del texto truncado
        const partialMaterials = this.extractPartialMaterials(rawResponse);
        if (partialMaterials.length > 0) {
          minimalJson.materials = partialMaterials;
          minimalJson.confidence = 0.6;
        }
        
        return JSON.stringify(minimalJson);
      }
      
      // 3. Si hay algo de JSON, intentar repararlo
      return this.cleanJSONString(jsonPart);
      
    } catch (error) {
      console.error('Aggressive JSON repair failed:', error);
      return null;
    }
  }

  /**
   * Extrae materiales parciales de respuesta truncada
   */
  private extractPartialMaterials(rawResponse: string): any[] {
    const materials: any[] = [];
    const lines = rawResponse.split('\n');
    
    for (const line of lines) {
      // Buscar patrones de materiales en texto plano
      const materialMatch = line.match(/(\d+\.?\d*)\s*(sq\s*ft|ft|linear\s*ft|cubic\s*yard|each|piece)/i);
      if (materialMatch) {
        const quantity = parseFloat(materialMatch[1]);
        const unit = materialMatch[2].toLowerCase().replace(/\s+/g, '_');
        
        materials.push({
          id: `fallback_${materials.length + 1}`,
          name: `Construction Material ${materials.length + 1}`,
          description: 'Extracted from partial AI response',
          category: 'general',
          quantity: quantity,
          unit: unit,
          unitPrice: 10, // Default price
          totalPrice: quantity * 10
        });
      }
    }
    
    return materials;
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
      unitPrice: Number((material.unitPrice * adjustmentFactor).toFixed(2)), // CÁLCULOS SEGUROS: sin × 100 problemático
      totalPrice: Number((material.totalPrice * adjustmentFactor).toFixed(2)) // CÁLCULOS SEGUROS: sin × 100 problemático
    }));

    // Aplicar ajuste a labor
    result.laborCosts = result.laborCosts.map(labor => ({
      ...labor,
      rate: Number((labor.rate * adjustmentFactor).toFixed(2)), // CÁLCULOS SEGUROS: sin × 100 problemático
      total: Number((labor.total * adjustmentFactor).toFixed(2)) // CÁLCULOS SEGUROS: sin × 100 problemático
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
      unitPrice: Number((material.unitPrice * inflationFactor).toFixed(2)), // CÁLCULOS SEGUROS: sin × 100 problemático
      totalPrice: Number((material.totalPrice * inflationFactor).toFixed(2)) // CÁLCULOS SEGUROS: sin × 100 problemático
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
   * Detecta si es un proyecto de construcción nueva que requiere precisión
   */
  private isNewConstructionProject(description: string): boolean {
    const keywords = [
      'adu', 'accessory dwelling unit', 'new construction', 'construction nueva',
      'construir', 'construccion', 'building', 'dwelling', 'house', 'home',
      '1200', 'sqft', 'square feet', 'bedroom', 'bathroom', 'kitchen'
    ];
    
    const text = description.toLowerCase();
    const keywordMatches = keywords.filter(keyword => text.includes(keyword)).length;
    
    return keywordMatches >= 3; // Si tiene 3 o más keywords, es construcción nueva
  }

  /**
   * Convierte resultado de precisión a formato DeepSearchResult
   */
  private convertPrecisionResultToDeepSearchResult(precisionResult: any): DeepSearchResult {
    const materials: MaterialItem[] = [];
    
    // Convertir cada categoría a materiales individuales
    Object.entries(precisionResult.materialsByCategory).forEach(([category, categoryMaterials]: [string, any]) => {
      categoryMaterials.forEach((material: any) => {
        materials.push({
          id: material.materialId,
          name: material.name,
          description: material.description,
          category: material.category,
          quantity: material.finalQuantity,
          unit: material.unit,
          unitPrice: material.unitPrice,
          totalPrice: material.totalPrice,
          specifications: material.specifications,
          supplier: material.supplier
        });
      });
    });

    const totalMaterialsCost = materials.reduce((sum, material) => sum + material.totalPrice, 0);

    return {
      projectType: precisionResult.projectType,
      projectScope: 'Precision calculated quantities for new construction',
      materials,
      laborCosts: [], // Se calcularía por separado
      additionalCosts: [],
      totalMaterialsCost,
      totalLaborCost: 0,
      totalAdditionalCost: 0,
      grandTotal: totalMaterialsCost,
      confidence: precisionResult.confidence,
      recommendations: [
        'Quantities calculated with precision contractor formulas',
        'Waste factors included for all materials',
        'Order timing guidance provided',
        ...precisionResult.contractorGuidance.professionalTips
      ],
      warnings: precisionResult.contractorGuidance.commonMistakes
    };
  }

  /**
   * Extrae el tipo de proyecto de la descripción
   * REFACTORIZADO: Usa detección inteligente basada en contexto
   * Evita falsos positivos como "shingle-style siding" detectado como roofing
   */
  private extractProjectType(description: string): string {
    const text = description.toLowerCase();
    
    // PASO 1: Detectar keywords primarios (altamente específicos)
    // Estos tienen prioridad máxima y no causan confusión
    const primaryKeywords: Record<string, string[]> = {
      'siding': ['siding', 'vinyl siding', 'hardie', 'fiber cement', 'lap siding', 'exterior cladding'],
      'fencing': ['fence', 'fencing', 'chain link', 'privacy fence', 'wood fence', 'vinyl fence'],
      'decking': ['deck', 'decking', 'deck board', 'composite deck', 'wood deck'],
      'flooring': ['floor', 'flooring', 'hardwood', 'laminate', 'tile floor', 'lvp', 'vinyl plank'],
      'drywall': ['drywall', 'sheetrock', 'gypsum board', 'interior wall'],
      'painting': ['paint', 'painting', 'primer', 'repaint'],
      'concrete': ['concrete', 'cement', 'slab', 'foundation', 'driveway', 'patio concrete'],
      'plumbing': ['plumbing', 'pipe', 'water heater', 'toilet', 'faucet', 'drain'],
      'electrical': ['electrical', 'wiring', 'panel', 'outlet', 'switch', 'circuit'],
      'hvac': ['hvac', 'air conditioning', 'furnace', 'ductwork', 'heating', 'cooling'],
      'landscaping': ['landscaping', 'lawn', 'irrigation', 'sprinkler', 'sod', 'garden'],
      'windows': ['window', 'windows', 'window replacement', 'window installation'],
      'doors': ['door', 'doors', 'entry door', 'interior door', 'garage door'],
    };
    
    // Contar matches por tipo de proyecto
    const matchCounts: Record<string, number> = {};
    
    for (const [projectType, keywords] of Object.entries(primaryKeywords)) {
      matchCounts[projectType] = keywords.filter(keyword => text.includes(keyword)).length;
    }
    
    // PASO 2: Detectar roofing con cuidado especial
    // "shingle" solo cuenta como roofing si NO hay "siding" en el texto
    const roofingKeywords = ['roof', 'roofing', 'roof replacement', 'reroof'];
    const shingleKeywords = ['shingle', 'asphalt shingle', 'architectural shingle'];
    
    const hasExplicitRoofing = roofingKeywords.some(k => text.includes(k));
    const hasShingle = shingleKeywords.some(k => text.includes(k));
    const hasSiding = text.includes('siding');
    
    // Si tiene "shingle" pero también tiene "siding", es siding (shingle-style siding)
    // Si tiene "shingle" sin "siding" Y tiene "roof" keywords, es roofing
    if (hasExplicitRoofing || (hasShingle && !hasSiding)) {
      matchCounts['roofing'] = (matchCounts['roofing'] || 0) + 
        (hasExplicitRoofing ? 2 : 0) + 
        (hasShingle && !hasSiding ? 1 : 0);
    }
    
    // PASO 3: Encontrar el tipo con más matches
    let bestMatch = 'general_construction';
    let highestCount = 0;
    
    for (const [projectType, count] of Object.entries(matchCounts)) {
      if (count > highestCount) {
        highestCount = count;
        bestMatch = projectType;
      }
    }
    
    // Solo retornar si tiene al menos 1 match
    if (highestCount > 0) {
      console.log(`🔍 extractProjectType: Detected "${bestMatch}" with ${highestCount} keyword matches`);
      return bestMatch;
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
            totalPrice: Number(((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)), // CÁLCULOS SEGUROS: sin × 100 problemático
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

  /**
   * Aplica precisión de contratista experto al resultado
   */
  private async applyExpertContractorPrecision(
    result: DeepSearchResult,
    projectDescription: string,
    location?: string
  ): Promise<DeepSearchResult> {
    try {
      console.log('🎯 Applying Expert Contractor precision analysis');
      
      // Use expertContractorService to enhance materials with precise calculations
      const expertResult = expertContractorService.generateExpertEstimate(
        projectDescription,
        location || 'CA',
        this.extractProjectType(projectDescription)
      );
      
      // Merge expert contractor results with existing results
      const enhancedMaterials = result.materials.map(material => {
        // Find matching expert material by name similarity
        const expertMaterial = expertResult.materials.find(expert => 
          this.areMaterialsSimilar(material.name, expert.name)
        );
        
        if (expertMaterial) {
          return {
            ...material,
            quantity: expertMaterial.quantity,
            unitPrice: expertMaterial.unitPrice,
            totalPrice: expertMaterial.totalPrice,
            specifications: expertMaterial.specifications
          };
        }
        
        return material;
      });
      
      // Add any new expert materials that weren't in original list
      const newExpertMaterials = expertResult.materials
        .filter(expertMat => !result.materials.some(mat => 
          this.areMaterialsSimilar(mat.name, expertMat.name)
        ))
        .map(expertMat => ({
          id: expertMat.id,
          name: expertMat.name,
          description: expertMat.description,
          category: expertMat.category,
          quantity: expertMat.quantity,
          unit: expertMat.unit,
          unitPrice: expertMat.unitPrice,
          totalPrice: expertMat.totalPrice,
          specifications: expertMat.specifications
        }));
      
      const allMaterials = [...enhancedMaterials, ...newExpertMaterials];
      
      return {
        ...result,
        materials: allMaterials,
        totalMaterialsCost: allMaterials.reduce((sum, item) => sum + item.totalPrice, 0),
        recommendations: [
          ...result.recommendations,
          '🎯 Expert contractor precision analysis applied',
          `📈 ${newExpertMaterials.length} materials enhanced with expert calculations`
        ]
      };
      
    } catch (error) {
      console.error('❌ Error applying expert contractor precision:', error);
      return result; // Return original result if expert analysis fails
    }
  }

  /**
   * Filtra solo materiales de construcción, removiendo herramientas y equipos
   */
  private filterOnlyConstructionMaterials(materials: MaterialItem[]): MaterialItem[] {
    const toolsAndEquipmentKeywords = [
      'drill', 'saw', 'hammer', 'level', 'tape measure', 'shovel', 'ladder',
      'wheelbarrow', 'mixer', 'compressor', 'nailer', 'grinder', 'cutter',
      'generator', 'truck', 'equipment rental', 'tool rental', 'safety gear'
    ];
    
    return materials.filter(material => {
      const name = material.name.toLowerCase();
      const description = (material.description || '').toLowerCase();
      
      // Remove if it's clearly a tool or equipment
      const isToolOrEquipment = toolsAndEquipmentKeywords.some(keyword => 
        name.includes(keyword) || description.includes(keyword)
      );
      
      if (isToolOrEquipment) {
        console.log(`⚙️ Filtered tool/equipment: ${material.name}`);
        return false;
      }
      
      return true;
    });
  }

  /**
   * Determina si dos materiales son similares para propósitos de matching
   */
  private areMaterialsSimilar(name1: string, name2: string): boolean {
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const norm1 = normalize(name1);
    const norm2 = normalize(name2);
    
    // Check if one contains the other or if they share significant words
    return norm1.includes(norm2) || norm2.includes(norm1) ||
           this.calculateSimilarity(norm1, norm2) > 0.6;
  }

  /**
   * Calcula similaridad básica entre strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calcula la distancia de Levenshtein entre dos strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * SISTEMA INFALIBLE: Ejecuta análisis suplementario para materiales faltantes
   */
  private async runSupplementaryAnalysis(
    missingCategories: string[],
    projectType: string,
    projectDescription: string,
    location?: string
  ): Promise<MaterialItem[]> {
    try {
      console.log('🔧 SUPPLEMENTARY ANALYSIS: Finding missing critical materials:', missingCategories);
      
      // Generar prompt específico para materiales faltantes
      const supplementaryPrompt = materialValidationService.generateSupplementaryAnalysisPrompt(
        missingCategories,
        projectType,
        projectDescription,
        location
      );

      console.log('🤖 Running focused AI analysis for missing materials...');
      
      // Usar Claude con prompt específico para materiales faltantes
      const response = await anthropic.messages.create({
        model: this.MODEL,
        max_tokens: 4000,
        temperature: 0.05, // Muy baja temperatura para precisión máxima
        system: this.getSupplementarySystemPrompt(),
        messages: [
          {
            role: 'user',
            content: supplementaryPrompt
          }
        ]
      });

      const responseContent = response.content[0];
      if (responseContent.type !== 'text') {
        throw new Error('Invalid response type from supplementary analysis');
      }

      // Parsear respuesta específica del análisis suplementario
      const supplementaryMaterials = this.parseSupplementaryResponse(responseContent.text);
      
      console.log('✅ SUPPLEMENTARY ANALYSIS: Found', supplementaryMaterials.length, 'missing materials');
      
      return supplementaryMaterials;
      
    } catch (error) {
      console.error('❌ SUPPLEMENTARY ANALYSIS FAILED:', error);
      
      // FALLBACK: Usar Expert Contractor Service para generar materiales críticos
      console.log('🔄 Using Expert Contractor Service as fallback for missing materials');
      
      const expertResult = expertContractorService.generateExpertEstimate(
        `Find missing ${missingCategories.join(', ')} for: ${projectDescription}`,
        location || 'CA',
        projectType
      );
      
      // Filtrar solo los materiales que corresponden a las categorías faltantes
      const fallbackMaterials = expertResult.materials
        .filter(material => this.materialMatchesMissingCategory(material, missingCategories))
        .map(material => ({
          id: material.id,
          name: material.name,
          description: material.description + ' (Expert Contractor Fallback)',
          category: material.category,
          quantity: material.quantity,
          unit: material.unit,
          unitPrice: material.unitPrice,
          totalPrice: material.totalPrice,
          specifications: material.specifications,
          supplier: material.supplier || 'Expert Contractor Recommendation'
        }));
      
      console.log('✅ FALLBACK: Generated', fallbackMaterials.length, 'materials using Expert Contractor');
      
      return fallbackMaterials;
    }
  }

  /**
   * Sistema prompt específico para análisis suplementario
   */
  private getSupplementarySystemPrompt(): string {
    return `
You are a MASTER GENERAL CONTRACTOR specialized in FINDING MISSING CRITICAL MATERIALS.

Your task is to identify specific materials that were missed in the initial analysis.

CRITICAL RULES:
1. Focus ONLY on the missing critical materials specified
2. Use precise contractor formulas for quantities
3. Include exact technical specifications
4. Apply current market pricing for the location
5. DO NOT repeat materials already provided
6. Ensure every material has a clear purpose and category match

PRECISION REQUIREMENTS:
- Exact material names with dimensions
- Specific grades and technical specifications
- Accurate quantities based on project dimensions
- Regional pricing adjustments
- Clear category classification

ALWAYS respond in valid JSON format.
ALL TEXT MUST BE IN ENGLISH ONLY.
`;
  }

  /**
   * Parsea la respuesta del análisis suplementario
   */
  private parseSupplementaryResponse(responseText: string): MaterialItem[] {
    try {
      console.log('🔍 Parsing supplementary analysis response...');
      
      // Extraer JSON de la respuesta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in supplementary response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.supplementaryMaterials || !Array.isArray(parsed.supplementaryMaterials)) {
        throw new Error('Invalid supplementary response structure');
      }

      // Convertir a formato MaterialItem
      return parsed.supplementaryMaterials.map((item: any, index: number) => ({
        id: item.id || `supp_${Date.now()}_${index}`,
        name: item.name || 'Unknown Material',
        description: item.description || '',
        category: item.category || 'materials',
        quantity: Math.max(0, Number(item.quantity) || 0),
        unit: item.unit || 'pieces',
        unitPrice: Math.max(0, Number(item.unitPrice) || 0),
        totalPrice: Math.max(0, Number(item.totalPrice) || 0),
        supplier: item.supplier || 'Contractor Recommendation',
        specifications: item.specifications || ''
      }));
      
    } catch (error) {
      console.error('Error parsing supplementary response:', error);
      return []; // Return empty array if parsing fails
    }
  }

  /**
   * Verifica si un material corresponde a una categoría faltante
   */
  private materialMatchesMissingCategory(material: any, missingCategories: string[]): boolean {
    const materialName = material.name.toLowerCase();
    const materialCategory = (material.category || '').toLowerCase();
    const materialDescription = (material.description || '').toLowerCase();
    
    return missingCategories.some(category => {
      const categoryLower = category.toLowerCase();
      
      // Mapeo de categorías a keywords
      const categoryKeywords: Record<string, string[]> = {
        'posts': ['post', 'pole', '4x4', '6x6'],
        'boards_or_panels': ['board', 'panel', 'slat', 'picket', '1x6', '1x8'],
        'hardware': ['nail', 'screw', 'bolt', 'bracket'],
        'concrete_or_foundation': ['concrete', 'cement', 'foundation'],
        'shingles_or_material': ['shingle', 'tile', 'metal', 'membrane'],
        'underlayment': ['underlayment', 'felt', 'synthetic'],
        'fasteners': ['nail', 'screw', 'fastener'],
        'flashing': ['flashing', 'drip edge', 'valley']
      };
      
      const keywords = categoryKeywords[categoryLower] || [categoryLower];
      
      return keywords.some(keyword => 
        materialName.includes(keyword) ||
        materialCategory.includes(keyword) ||
        materialDescription.includes(keyword)
      );
    });
  }
}

export const deepSearchService = new DeepSearchService();