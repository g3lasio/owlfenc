/**
 * General Contractor Intelligence Service
 * 
 * Sistema que piensa como un general contractor local real:
 * - Conoce la ubicación específica del cliente
 * - Entiende magnitud y complejidad del proyecto
 * - Calcula procedimientos de ejecución paso a paso
 * - Estima tiempos reales de crew y materiales
 * - NO usa bases de datos estáticas de precios
 * - Aplica conocimiento local del mercado
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ClientLocation {
  address: string;
  zipCode: string;
  city: string;
  state: string;
  county: string;
  isVerified: boolean;
  marketTier: 'rural' | 'suburban' | 'urban' | 'metro';
  climateZone: string;
  permitComplexity: 'low' | 'medium' | 'high';
}

interface ProjectMagnitude {
  scale: 'small' | 'medium' | 'large' | 'major';
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  structuralRequirements: boolean;
  permitRequired: boolean;
  specialtyTrades: string[];
  estimatedDuration: {
    days: number;
    range: { min: number; max: number };
  };
}

interface ExecutionProcedure {
  phase: string;
  description: string;
  prerequisites: string[];
  materials: string[];
  laborType: string;
  crewSize: number;
  estimatedHours: number;
  weatherDependent: boolean;
  permitCheckpoint: boolean;
}

interface MaterialRequirement {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  specifications: string;
  localAvailability: 'readily_available' | 'special_order' | 'hard_to_find';
  qualityGrade: 'basic' | 'standard' | 'premium';
  wasteAllowance: number; // percentage
}

interface LaborEstimate {
  tradeType: string;
  skillLevel: 'helper' | 'skilled' | 'specialist' | 'foreman';
  crewSize: number;
  hoursRequired: number;
  localMarketRate: {
    reasoning: string;
    hourlyRate: number;
    confidence: number;
  };
  totalCost: number;
}

interface RealityValidation {
  isRealistic: boolean;
  confidence: number;
  redFlags: string[];
  marketComparison: {
    lowEnd: number;
    typicalRange: { min: number; max: number };
    highEnd: number;
  };
  recommendations: string[];
}

interface GeneralContractorAnalysis {
  clientLocation: ClientLocation;
  projectMagnitude: ProjectMagnitude;
  executionProcedures: ExecutionProcedure[];
  materialRequirements: MaterialRequirement[];
  laborEstimates: LaborEstimate[];
  totalProjectCost: {
    materials: number;
    labor: number;
    permits: number;
    overhead: number;
    profit: number;
    total: number;
  };
  realityValidation: RealityValidation;
  contractorInsights: string[];
  timeline: string;
}

export class GeneralContractorIntelligenceService {
  private readonly MODEL = 'claude-3-7-sonnet-20250219';

  /**
   * MÉTODO PRINCIPAL: Analizar proyecto como General Contractor local
   */
  async analyzeAsLocalContractor(
    projectDescription: string,
    clientAddress: string
  ): Promise<GeneralContractorAnalysis> {
    try {
      console.log('🏗️ [GC-INTELLIGENCE] Starting local contractor analysis');
      console.log(`📍 Project: ${projectDescription}`);
      console.log(`📮 Location: ${clientAddress}`);

      // 1. VERIFICAR Y ANALIZAR UBICACIÓN DEL CLIENTE
      const clientLocation = await this.verifyAndAnalyzeLocation(clientAddress);
      
      // 2. EVALUAR MAGNITUD Y COMPLEJIDAD DEL PROYECTO
      const projectMagnitude = await this.assessProjectMagnitude(projectDescription, clientLocation);
      
      // 3. DISEÑAR PROCEDIMIENTOS DE EJECUCIÓN PASO A PASO
      const executionProcedures = await this.designExecutionProcedures(
        projectDescription, 
        clientLocation, 
        projectMagnitude
      );
      
      // 4. CALCULAR MATERIALES CON LÓGICA DE CONTRACTOR
      const materialRequirements = await this.calculateMaterialRequirements(
        projectDescription, 
        clientLocation, 
        executionProcedures
      );
      
      // 5. ESTIMAR LABOR CON CONOCIMIENTO LOCAL
      const laborEstimates = await this.estimateLocalLabor(
        executionProcedures, 
        clientLocation, 
        projectMagnitude
      );
      
      // 6. CALCULAR COSTOS TOTALES
      const totalProjectCost = this.calculateTotalProjectCost(
        materialRequirements, 
        laborEstimates, 
        clientLocation, 
        projectMagnitude
      );
      
      // 7. VALIDAR REALIDAD DE RESULTADOS
      const realityValidation = await this.validateReality(
        totalProjectCost, 
        projectDescription, 
        clientLocation, 
        projectMagnitude
      );
      
      // 8. GENERAR INSIGHTS DE CONTRACTOR
      const contractorInsights = await this.generateContractorInsights(
        projectDescription, 
        clientLocation, 
        projectMagnitude, 
        totalProjectCost
      );
      
      // 9. CREAR TIMELINE REALISTA
      const timeline = this.createRealisticTimeline(executionProcedures, projectMagnitude);

      const analysis: GeneralContractorAnalysis = {
        clientLocation,
        projectMagnitude,
        executionProcedures,
        materialRequirements,
        laborEstimates,
        totalProjectCost,
        realityValidation,
        contractorInsights,
        timeline
      };

      console.log('✅ [GC-INTELLIGENCE] Analysis completed');
      console.log(`💰 Total Project Cost: $${totalProjectCost.total.toLocaleString()}`);
      console.log(`✅ Reality Check: ${realityValidation.isRealistic ? 'PASSED' : 'FAILED'}`);

      return analysis;

    } catch (error) {
      console.error('❌ [GC-INTELLIGENCE] Analysis failed:', error);
      throw new Error(`General Contractor analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 1. VERIFICAR Y ANALIZAR UBICACIÓN DEL CLIENTE
   */
  private async verifyAndAnalyzeLocation(clientAddress: string): Promise<ClientLocation> {
    console.log('🔍 [GC-INTELLIGENCE] Verifying client location...');

    const prompt = `
Como General Contractor experimentado, analiza esta dirección del cliente y proporciona información crucial para el proyecto:

DIRECCIÓN DEL CLIENTE: "${clientAddress}"

Analiza y determina:

1. VERIFICACIÓN DE DIRECCIÓN:
   - ¿Es una dirección válida y completa?
   - Extrae: dirección, ciudad, estado, código postal, condado
   - ¿Falta información crítica?

2. CARACTERÍSTICAS DEL MERCADO LOCAL:
   - Tipo de mercado: rural, suburban, urban, metro
   - Zona climática para construcción
   - Complejidad típica de permisos en esa área
   - Disponibilidad de materials localmente
   - Costo de vida relativo del área

3. FACTORES DE CONSTRUCCIÓN LOCALES:
   - Códigos de construcción típicos
   - Regulaciones especiales conocidas
   - Temporadas de construcción óptimas
   - Disponibilidad de contractors y trades

Responde en formato JSON:
{
  "address": "dirección específica",
  "zipCode": "código postal",
  "city": "ciudad",
  "state": "estado",
  "county": "condado estimado",
  "isVerified": true/false,
  "marketTier": "rural/suburban/urban/metro",
  "climateZone": "descripción zona climática",
  "permitComplexity": "low/medium/high",
  "localFactors": {
    "materialAvailability": "descripción",
    "costOfLiving": "low/medium/high",
    "buildingSeason": "descripción",
    "laborAvailability": "descripción"
  }
}
`;

    const response = await anthropic.messages.create({
      model: this.MODEL,
      max_tokens: 2000,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Anthropic');
    }

    try {
      const locationData = JSON.parse(content.text);
      
      return {
        address: locationData.address || clientAddress,
        zipCode: locationData.zipCode || '',
        city: locationData.city || '',
        state: locationData.state || '',
        county: locationData.county || '',
        isVerified: locationData.isVerified || false,
        marketTier: locationData.marketTier || 'suburban',
        climateZone: locationData.climateZone || 'temperate',
        permitComplexity: locationData.permitComplexity || 'medium'
      };

    } catch (parseError) {
      console.warn('⚠️ [GC-INTELLIGENCE] Location parsing failed, using basic analysis');
      
      // Fallback básico
      const parts = clientAddress.split(',').map(p => p.trim());
      const zipMatch = clientAddress.match(/\b\d{5}(-\d{4})?\b/);
      
      return {
        address: clientAddress,
        zipCode: zipMatch ? zipMatch[0] : '',
        city: parts.length > 1 ? parts[0] : '',
        state: parts.length > 1 ? parts[1] : '',
        county: '',
        isVerified: false,
        marketTier: 'suburban',
        climateZone: 'temperate',
        permitComplexity: 'medium'
      };
    }
  }

  /**
   * 2. EVALUAR MAGNITUD Y COMPLEJIDAD DEL PROYECTO
   */
  private async assessProjectMagnitude(
    projectDescription: string, 
    location: ClientLocation
  ): Promise<ProjectMagnitude> {
    console.log('📏 [GC-INTELLIGENCE] Assessing project magnitude...');

    const prompt = `
Como General Contractor con 20 años de experiencia en ${location.city}, ${location.state}, evalúa la magnitud y complejidad de este proyecto:

PROYECTO: "${projectDescription}"
UBICACIÓN: ${location.city}, ${location.state} (${location.marketTier} market)

Evalúa basado en tu experiencia local:

1. ESCALA DEL PROYECTO:
   - Small: 1-3 días, 1-2 personas, <$5,000
   - Medium: 1-2 semanas, 2-4 personas, $5,000-$25,000  
   - Large: 2-6 semanas, 4-8 personas, $25,000-$100,000
   - Major: 2+ meses, 8+ personas, $100,000+

2. COMPLEJIDAD TÉCNICA:
   - Simple: trabajos básicos, sin especialistas
   - Moderate: algunos trades especializados
   - Complex: múltiples trades, coordinación crítica
   - Expert: ingeniería, permisos especiales, inspecciones

3. REQUERIMIENTOS ESPECÍFICOS:
   - ¿Requiere elementos estructurales?
   - ¿Necesita permisos de construcción?
   - ¿Qué trades especializados se necesitan?
   - ¿Cuántos días reales de trabajo?

Considera factores locales como clima, disponibilidad de materials en ${location.marketTier} markets, y regulaciones típicas en ${location.state}.

Responde en formato JSON:
{
  "scale": "small/medium/large/major",
  "complexity": "simple/moderate/complex/expert", 
  "structuralRequirements": true/false,
  "permitRequired": true/false,
  "specialtyTrades": ["lista de trades necesarios"],
  "estimatedDuration": {
    "days": número_días_trabajo,
    "range": {"min": días_mínimo, "max": días_máximo}
  },
  "reasoning": "explicación de la evaluación"
}
`;

    const response = await anthropic.messages.create({
      model: this.MODEL,
      max_tokens: 2000,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Anthropic');
    }

    try {
      const magnitude = JSON.parse(content.text);
      
      return {
        scale: magnitude.scale || 'medium',
        complexity: magnitude.complexity || 'moderate',
        structuralRequirements: magnitude.structuralRequirements || false,
        permitRequired: magnitude.permitRequired || false,
        specialtyTrades: magnitude.specialtyTrades || [],
        estimatedDuration: magnitude.estimatedDuration || { days: 7, range: { min: 5, max: 10 } }
      };

    } catch (parseError) {
      console.warn('⚠️ [GC-INTELLIGENCE] Magnitude parsing failed, using conservative estimate');
      
      return {
        scale: 'medium',
        complexity: 'moderate', 
        structuralRequirements: true,
        permitRequired: true,
        specialtyTrades: ['general'],
        estimatedDuration: { days: 10, range: { min: 7, max: 14 } }
      };
    }
  }

  /**
   * 3. DISEÑAR PROCEDIMIENTOS DE EJECUCIÓN PASO A PASO
   */
  private async designExecutionProcedures(
    projectDescription: string,
    location: ClientLocation, 
    magnitude: ProjectMagnitude
  ): Promise<ExecutionProcedure[]> {
    console.log('🔨 [GC-INTELLIGENCE] Designing execution procedures...');

    const prompt = `
Como General Contractor experimentado en ${location.city}, ${location.state}, diseña los procedimientos paso a paso para ejecutar este proyecto:

PROYECTO: "${projectDescription}"
ESCALA: ${magnitude.scale} (${magnitude.complexity} complexity)
DURACIÓN ESTIMADA: ${magnitude.estimatedDuration.days} días
UBICACIÓN: ${location.marketTier} market en ${location.state}

Diseña la secuencia exacta de trabajo que usarías con tu crew:

1. FASES DE EJECUCIÓN:
   - Lista cada fase en orden cronológico
   - Para cada fase incluye: descripción, prerequisites, materials needed, labor type, crew size, horas estimadas
   - Considera factores locales como clima en ${location.climateZone}
   - Incluye checkpoints para permisos si aplica

2. CONSIDERACIONES LOCALES:
   - Disponibilidad de materials en ${location.marketTier} markets
   - Códigos de construcción típicos en ${location.state}
   - Factors climáticos para timing
   - Inspecciones requeridas

3. CREW Y TIMING:
   - Tamaño óptimo de crew para cada fase
   - Horas reales de trabajo (no "contractor time")
   - Dependencias críticas entre fases
   - Buffer para weather/delays

Responde como array JSON de fases:
[
  {
    "phase": "nombre de la fase",
    "description": "descripción detallada del trabajo",
    "prerequisites": ["qué debe completarse antes"],
    "materials": ["materials específicos para esta fase"],
    "laborType": "tipo de trabajo/trade",
    "crewSize": número_personas,
    "estimatedHours": horas_reales,
    "weatherDependent": true/false,
    "permitCheckpoint": true/false
  }
]
`;

    const response = await anthropic.messages.create({
      model: this.MODEL,
      max_tokens: 4000,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Anthropic');
    }

    try {
      const procedures = JSON.parse(content.text);
      
      if (Array.isArray(procedures)) {
        return procedures;
      } else {
        throw new Error('Procedures response is not an array');
      }

    } catch (parseError) {
      console.warn('⚠️ [GC-INTELLIGENCE] Procedures parsing failed, using basic phases');
      
      return [
        {
          phase: 'Preparation',
          description: 'Site preparation and setup',
          prerequisites: [],
          materials: ['basic tools', 'safety equipment'],
          laborType: 'general',
          crewSize: 2,
          estimatedHours: 8,
          weatherDependent: true,
          permitCheckpoint: true
        },
        {
          phase: 'Main Construction',
          description: 'Primary construction work',
          prerequisites: ['Preparation'],
          materials: ['project-specific materials'],
          laborType: 'skilled',
          crewSize: 3,
          estimatedHours: magnitude.estimatedDuration.days * 6,
          weatherDependent: true,
          permitCheckpoint: false
        },
        {
          phase: 'Finishing',
          description: 'Completion and cleanup',
          prerequisites: ['Main Construction'],
          materials: ['finishing materials'],
          laborType: 'skilled',
          crewSize: 2,
          estimatedHours: 8,
          weatherDependent: false,
          permitCheckpoint: true
        }
      ];
    }
  }

  /**
   * 4. CALCULAR MATERIALES CON LÓGICA DE CONTRACTOR
   */
  private async calculateMaterialRequirements(
    projectDescription: string,
    location: ClientLocation,
    procedures: ExecutionProcedure[]
  ): Promise<MaterialRequirement[]> {
    console.log('📦 [GC-INTELLIGENCE] Calculating material requirements...');

    const prompt = `
Como General Contractor con 20 años de experiencia en ${location.city}, ${location.state}, calcula los materiales exactos necesarios para este proyecto:

PROYECTO: "${projectDescription}"
UBICACIÓN: ${location.marketTier} market en ${location.state}, clima ${location.climateZone}

PROCEDIMIENTOS DE EJECUCIÓN:
${procedures.map(p => `- ${p.phase}: ${p.description} (${p.crewSize} personas, ${p.estimatedHours}h)`).join('\n')}

Como contractor experimentado, calcula materiales basado en:

1. CÁLCULOS REALES DE CANTIDADES:
   - Mide y calcula cantidades exactas basado en dimensiones del proyecto
   - Incluye waste allowance realista (10-20% típico, más para materiales frágiles)
   - Considera disponibilidad local en ${location.marketTier} markets

2. ESPECIFICACIONES APROPIADAS:
   - Calidad apropriada para el tipo de proyecto y presupuesto
   - Compatibilidad con códigos locales en ${location.state}
   - Disponibilidad en suppliers locales

3. CATEGORIZACIÓN INTELIGENTE:
   - Agrupa por fase de instalación
   - Marca specialty items que requieren special order
   - Identifica materials críticos vs nice-to-have

4. CONSIDERACIONES DE CONTRACTOR:
   - ¿Qué materials mantendrías en inventory vs comprarías fresh?
   - ¿Cuáles tienen long lead times en ${location.state}?
   - ¿Hay seasonal price variations que importan?

NO uses precios específicos. Solo calcula cantidades y especificaciones.

Responde como array JSON:
[
  {
    "name": "nombre específico del material",
    "category": "structural/finishing/electrical/plumbing/etc",
    "quantity": número_exacto,
    "unit": "unidad apropiada",
    "specifications": "specs técnicas necesarias",
    "localAvailability": "readily_available/special_order/hard_to_find",
    "qualityGrade": "basic/standard/premium",
    "wasteAllowance": porcentaje_decimal,
    "reasoning": "por qué esta cantidad y especificación"
  }
]
`;

    const response = await anthropic.messages.create({
      model: this.MODEL,
      max_tokens: 4000,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Anthropic');
    }

    try {
      const materials = JSON.parse(content.text);
      
      if (Array.isArray(materials)) {
        return materials.map(m => ({
          name: m.name || 'Unknown Material',
          category: m.category || 'general',
          quantity: m.quantity || 1,
          unit: m.unit || 'each',
          specifications: m.specifications || 'Standard grade',
          localAvailability: m.localAvailability || 'readily_available',
          qualityGrade: m.qualityGrade || 'standard',
          wasteAllowance: m.wasteAllowance || 0.15
        }));
      } else {
        throw new Error('Materials response is not an array');
      }

    } catch (parseError) {
      console.warn('⚠️ [GC-INTELLIGENCE] Materials parsing failed, using basic calculation');
      
      // Fallback materials basado en procedimientos
      return procedures.map(procedure => ({
        name: `Materials for ${procedure.phase}`,
        category: procedure.laborType,
        quantity: 1,
        unit: 'lot',
        specifications: 'Standard construction grade',
        localAvailability: 'readily_available' as const,
        qualityGrade: 'standard' as const,
        wasteAllowance: 0.15
      }));
    }
  }

  /**
   * 5. ESTIMAR LABOR CON CONOCIMIENTO LOCAL (SIN BASES DE DATOS)
   */
  private async estimateLocalLabor(
    procedures: ExecutionProcedure[],
    location: ClientLocation,
    magnitude: ProjectMagnitude
  ): Promise<LaborEstimate[]> {
    console.log('👷 [GC-INTELLIGENCE] Estimating local labor costs...');

    const prompt = `
Como General Contractor que vive y trabaja en ${location.city}, ${location.state}, estima los costos de labor para este proyecto.

UBICACIÓN: ${location.city}, ${location.state} (${location.marketTier} market, permit complexity: ${location.permitComplexity})
ESCALA: ${magnitude.scale} project (${magnitude.complexity} complexity)

FASES DE TRABAJO:
${procedures.map(p => 
  `- ${p.phase}: ${p.description}
    • Labor: ${p.laborType}
    • Crew: ${p.crewSize} personas  
    • Horas: ${p.estimatedHours}
    • Weather dependent: ${p.weatherDependent ? 'Sí' : 'No'}`
).join('\n\n')}

Como contractor local con conocimiento del mercado en ${location.state}:

1. RATES LOCALES DE MERCADO:
   - Basado en tu experiencia personal en ${location.marketTier} markets
   - Considera cost of living en ${location.city}, ${location.state}
   - Incluye competencia local y disponibilidad de workers
   - Factor in union presence o lack thereof

2. AJUSTES POR COMPLEXITY:
   - Simple work vs specialty trades
   - Permit requirements (${location.permitComplexity} complexity aquí)
   - Site conditions típicas en ${location.climateZone} climate
   - Seasonal demand factors

3. CREW DYNAMICS:
   - Optimal crew size para efficiency
   - Skill level apropiado para cada fase
   - Lead time para booking quality crews
   - Local availability de specialized trades

4. REAL-WORLD FACTORS:
   - Travel time dentro de ${location.city} area
   - Setup/breakdown time realista
   - Weather delays common en ${location.climateZone}
   - Local permit inspection scheduling

IMPORTANTE: NO uses rates de bases de datos. Piensa como contractor local que conoce SU mercado.

Responde como array JSON:
[
  {
    "tradeType": "tipo específico de trabajo",
    "skillLevel": "helper/skilled/specialist/foreman",
    "crewSize": número_óptimo,
    "hoursRequired": horas_reales_incluyendo_setup,
    "localMarketRate": {
      "reasoning": "explicación detallada del rate basado en conocimiento local",
      "hourlyRate": rate_por_hora,
      "confidence": decimal_0_a_1
    },
    "totalCost": costo_total_calculado
  }
]
`;

    const response = await anthropic.messages.create({
      model: this.MODEL,
      max_tokens: 4000,
      temperature: 0.2, // Slightly higher for more nuanced local knowledge
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Anthropic');
    }

    try {
      const laborEstimates = JSON.parse(content.text);
      
      if (Array.isArray(laborEstimates)) {
        return laborEstimates.map(le => ({
          tradeType: le.tradeType || 'general',
          skillLevel: le.skillLevel || 'skilled',
          crewSize: le.crewSize || 2,
          hoursRequired: le.hoursRequired || 8,
          localMarketRate: {
            reasoning: le.localMarketRate?.reasoning || 'Standard local rate',
            hourlyRate: le.localMarketRate?.hourlyRate || 50,
            confidence: le.localMarketRate?.confidence || 0.7
          },
          totalCost: le.totalCost || (le.hoursRequired * le.localMarketRate?.hourlyRate) || 400
        }));
      } else {
        throw new Error('Labor estimates response is not an array');
      }

    } catch (parseError) {
      console.warn('⚠️ [GC-INTELLIGENCE] Labor parsing failed, using experienced contractor estimates');
      
      // Fallback: Estimaciones conservadoras basadas en procedimientos
      return procedures.map(procedure => ({
        tradeType: procedure.laborType,
        skillLevel: 'skilled' as const,
        crewSize: procedure.crewSize,
        hoursRequired: procedure.estimatedHours,
        localMarketRate: {
          reasoning: `Local ${location.marketTier} market rate for ${procedure.laborType} work in ${location.state}`,
          hourlyRate: this.getEstimatedLocalRate(procedure.laborType, location),
          confidence: 0.6
        },
        totalCost: procedure.estimatedHours * this.getEstimatedLocalRate(procedure.laborType, location) * procedure.crewSize
      }));
    }
  }

  /**
   * Helper: Estimación conservadora de rates locales basado en tipo de mercado
   */
  private getEstimatedLocalRate(laborType: string, location: ClientLocation): number {
    const baseRates: Record<string, number> = {
      'general': 40,
      'skilled': 55,
      'concrete': 60,
      'electrical': 85,
      'plumbing': 80,
      'roofing': 50,
      'framing': 45,
      'specialty': 75
    };

    const baseRate = baseRates[laborType] || baseRates['skilled'];
    
    // Ajuste por tipo de mercado
    const marketMultipliers = {
      'rural': 0.8,
      'suburban': 1.0,
      'urban': 1.2,
      'metro': 1.4
    };

    return Math.round(baseRate * (marketMultipliers[location.marketTier] || 1.0));
  }

  /**
   * 6. CALCULAR COSTOS TOTALES CON LÓGICA DE CONTRACTOR
   */
  private calculateTotalProjectCost(
    materials: MaterialRequirement[],
    labor: LaborEstimate[],
    location: ClientLocation,
    magnitude: ProjectMagnitude
  ) {
    console.log('💰 [GC-INTELLIGENCE] Calculating total project cost...');

    // Obtener precios de materiales locales usando IA
    const materialsCost = this.calculateMaterialsPricingWithAI(materials, location);
    
    // Sumar todos los costos de labor
    const laborCost = labor.reduce((sum, laborItem) => sum + laborItem.totalCost, 0);
    
    // Calcular permisos basado en complejidad local
    const permitsCost = this.calculatePermitsCost(magnitude, location);
    
    // Overhead y profit de contractor (15-25% típico)
    const subtotal = materialsCost + laborCost + permitsCost;
    const overheadPercent = this.getOverheadPercentage(magnitude, location);
    const profitPercent = this.getProfitMarginPercentage(magnitude, location);
    
    const overhead = subtotal * (overheadPercent / 100);
    const profit = (subtotal + overhead) * (profitPercent / 100);
    
    const total = subtotal + overhead + profit;

    console.log(`💰 [GC-INTELLIGENCE] Cost breakdown:`, {
      materials: materialsCost,
      labor: laborCost,
      permits: permitsCost,
      overhead,
      profit,
      total
    });

    return {
      materials: Math.round(materialsCost),
      labor: Math.round(laborCost),
      permits: Math.round(permitsCost),
      overhead: Math.round(overhead),
      profit: Math.round(profit),
      total: Math.round(total)
    };
  }

  /**
   * Calcular precios de materiales usando IA (sin base de datos)
   */
  private calculateMaterialsPricingWithAI(
    materials: MaterialRequirement[],
    location: ClientLocation
  ): number {
    // Por ahora usar estimación basada en experiencia de contractor
    // TODO: Implementar pricing inteligente con IA
    
    let totalMaterialsCost = 0;
    
    materials.forEach(material => {
      const estimatedUnitPrice = this.estimateLocalMaterialPrice(material, location);
      const totalQuantity = material.quantity * (1 + material.wasteAllowance);
      totalMaterialsCost += estimatedUnitPrice * totalQuantity;
    });
    
    return totalMaterialsCost;
  }

  /**
   * Estimar precio local de material sin base de datos
   */
  private estimateLocalMaterialPrice(material: MaterialRequirement, location: ClientLocation): number {
    // Pricing inteligente basado en tipo de material y mercado
    const basePriceEstimates: Record<string, number> = {
      'concrete': 150,     // por yard cúbico
      'lumber': 8,         // por board foot
      'blocks': 3,         // por block
      'steel': 12,         // por linear foot
      'roofing': 4,        // por sq ft
      'electrical': 25,    // por linear foot
      'plumbing': 15,      // per linear foot
      'drywall': 2,        // por sq ft
      'insulation': 1.5,   // por sq ft
      'general': 5         // por unit
    };

    const basePrice = basePriceEstimates[material.category] || basePriceEstimates['general'];
    
    // Ajustes por calidad
    const qualityMultipliers = {
      'basic': 0.8,
      'standard': 1.0,
      'premium': 1.4
    };

    // Ajustes por disponibilidad local
    const availabilityMultipliers = {
      'readily_available': 1.0,
      'special_order': 1.3,
      'hard_to_find': 1.7
    };

    // Ajustes por tipo de mercado
    const marketMultipliers = {
      'rural': 0.9,
      'suburban': 1.0,
      'urban': 1.15,
      'metro': 1.35
    };

    return Math.round(
      basePrice * 
      qualityMultipliers[material.qualityGrade] * 
      availabilityMultipliers[material.localAvailability] * 
      marketMultipliers[location.marketTier]
    );
  }

  /**
   * Calcular costos de permisos basado en complejidad
   */
  private calculatePermitsCost(magnitude: ProjectMagnitude, location: ClientLocation): number {
    if (!magnitude.permitRequired) return 0;

    const basePermitCosts = {
      'small': 150,
      'medium': 400,
      'large': 800,
      'major': 1500
    };

    const complexityMultipliers = {
      'low': 1.0,
      'medium': 1.4,
      'high': 2.0
    };

    const baseCost = basePermitCosts[magnitude.scale] || basePermitCosts['medium'];
    const complexity = complexityMultipliers[location.permitComplexity] || 1.0;

    return Math.round(baseCost * complexity);
  }

  /**
   * Obtener porcentaje de overhead basado en proyecto
   */
  private getOverheadPercentage(magnitude: ProjectMagnitude, location: ClientLocation): number {
    const baseOverhead = {
      'small': 15,
      'medium': 18,
      'large': 20,
      'major': 22
    };

    const complexityAdjustment = {
      'simple': 0,
      'moderate': 2,
      'complex': 4,
      'expert': 6
    };

    return (baseOverhead[magnitude.scale] || 18) + (complexityAdjustment[magnitude.complexity] || 2);
  }

  /**
   * Obtener margen de profit basado en proyecto
   */
  private getProfitMarginPercentage(magnitude: ProjectMagnitude, location: ClientLocation): number {
    const baseProfit = {
      'small': 20,
      'medium': 22,
      'large': 25,
      'major': 28
    };

    const marketAdjustment = {
      'rural': -2,
      'suburban': 0,
      'urban': 2,
      'metro': 4
    };

    return (baseProfit[magnitude.scale] || 22) + (marketAdjustment[location.marketTier] || 0);
  }

  /**
   * 7. VALIDAR REALIDAD DE RESULTADOS - SISTEMA ANTI-ABSURDOS
   */
  private async validateReality(
    totalCost: any,
    projectDescription: string,
    location: ClientLocation,
    magnitude: ProjectMagnitude
  ): Promise<RealityValidation> {
    console.log('🔍 [GC-INTELLIGENCE] Validating reality of results...');

    const prompt = `
Como General Contractor veterano con 25 años de experiencia en ${location.city}, ${location.state}, evalúa si este estimate es REALISTA para el mercado local.

PROYECTO: "${projectDescription}"
UBICACIÓN: ${location.city}, ${location.state} (${location.marketTier} market)
ESCALA: ${magnitude.scale} (${magnitude.complexity} complexity)

RESULTADOS A VALIDAR:
• Materials: $${totalCost.materials.toLocaleString()}
• Labor: $${totalCost.labor.toLocaleString()}
• Permits: $${totalCost.permits.toLocaleString()}
• Overhead: $${totalCost.overhead.toLocaleString()}
• Profit: $${totalCost.profit.toLocaleString()}
• TOTAL: $${totalCost.total.toLocaleString()}

VALIDACIÓN CRÍTICA:

1. SANITY CHECKS:
   - ¿El costo de labor es apropiado para el scope de trabajo?
   - ¿La ratio materials:labor tiene sentido para este tipo de proyecto?
   - ¿El total está dentro del rango realista para ${location.marketTier} markets en ${location.state}?

2. RED FLAGS POTENCIALES:
   - Labor demasiado bajo (indicating underestimation)
   - Materials costs que no make sense
   - Total que ningún contractor aceptaría
   - Missing critical cost components

3. COMPARACIÓN DE MERCADO:
   - Basado en tu experiencia en ${location.city} área
   - ¿Qué range de precios ves típicamente para proyectos similares?
   - ¿Low end, typical range, high end para esta área?

4. RECOMENDACIONES ESPECÍFICAS:
   - Ajustes necesarios si el estimate es unrealistic
   - Areas de concern específicas
   - Factores locales importantes overlooked

IMPORTANTE: Sé brutalmente honesto. Si el estimate está wrong, explica exactly por qué.

Responde en formato JSON:
{
  "isRealistic": true/false,
  "confidence": decimal_0_a_1,
  "redFlags": ["lista de problemas específicos identificados"],
  "marketComparison": {
    "lowEnd": precio_bajo_mercado,
    "typicalRange": {"min": precio_típico_min, "max": precio_típico_max},
    "highEnd": precio_alto_mercado
  },
  "recommendations": ["recomendaciones específicas para mejorar accuracy"],
  "reasoning": "explicación detallada de la evaluación"
}
`;

    try {
      const response = await anthropic.messages.create({
        model: this.MODEL,
        max_tokens: 3000,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Invalid response type from Anthropic');
      }

      const validation = JSON.parse(content.text);
      
      // Aplicar validaciones adicionales automáticas
      const autoValidation = this.performAutomaticValidations(totalCost, magnitude);
      
      return {
        isRealistic: validation.isRealistic && autoValidation.isRealistic,
        confidence: Math.min(validation.confidence || 0.5, autoValidation.confidence),
        redFlags: [...(validation.redFlags || []), ...autoValidation.redFlags],
        marketComparison: validation.marketComparison || { 
          lowEnd: totalCost.total * 0.7, 
          typicalRange: { min: totalCost.total * 0.8, max: totalCost.total * 1.3 }, 
          highEnd: totalCost.total * 1.6 
        },
        recommendations: [...(validation.recommendations || []), ...autoValidation.recommendations]
      };

    } catch (error) {
      console.warn('⚠️ [GC-INTELLIGENCE] Reality validation AI failed, using automatic checks');
      
      return this.performAutomaticValidations(totalCost, magnitude);
    }
  }

  /**
   * Validaciones automáticas para detectar resultados absurdos
   */
  private performAutomaticValidations(totalCost: any, magnitude: ProjectMagnitude): RealityValidation {
    const redFlags: string[] = [];
    const recommendations: string[] = [];
    let confidence = 0.8;

    // 1. VALIDAR RATIO LABOR:MATERIALS
    const laborToMaterialsRatio = totalCost.labor / totalCost.materials;
    
    if (laborToMaterialsRatio < 0.3) {
      redFlags.push(`Labor cost suspiciously low: $${totalCost.labor} vs materials $${totalCost.materials}`);
      recommendations.push('Increase labor estimates - current ratio indicates severe underestimation');
      confidence -= 0.4;
    }

    if (laborToMaterialsRatio > 3.0) {
      redFlags.push(`Labor cost suspiciously high relative to materials`);
      recommendations.push('Review labor calculations - ratio seems excessive');
      confidence -= 0.2;
    }

    // 2. VALIDAR TOTAL VS ESCALA DEL PROYECTO
    const minimumsByScale = {
      'small': 1000,
      'medium': 5000,
      'large': 25000,
      'major': 100000
    };

    const minimumExpected = minimumsByScale[magnitude.scale] || minimumsByScale['medium'];
    
    if (totalCost.total < minimumExpected) {
      redFlags.push(`Total cost $${totalCost.total} too low for ${magnitude.scale} ${magnitude.complexity} project`);
      recommendations.push(`Minimum expected for ${magnitude.scale} projects: $${minimumExpected}`);
      confidence -= 0.5;
    }

    // 3. VALIDAR COMPONENTES CRÍTICOS
    if (totalCost.labor < 500 && magnitude.scale !== 'small') {
      redFlags.push('Labor cost under $500 for non-small project is unrealistic');
      recommendations.push('Review labor hour calculations and local rates');
      confidence -= 0.4;
    }

    if (totalCost.materials < 100) {
      redFlags.push('Materials cost under $100 seems unrealistic for construction project');
      recommendations.push('Review material requirements and quantities');
      confidence -= 0.3;
    }

    // 4. VALIDAR OVERHEAD Y PROFIT
    const overheadRatio = totalCost.overhead / (totalCost.materials + totalCost.labor);
    if (overheadRatio < 0.10) {
      recommendations.push('Overhead seems low - ensure all indirect costs are included');
    }

    return {
      isRealistic: redFlags.length === 0,
      confidence: Math.max(0.1, confidence),
      redFlags,
      marketComparison: {
        lowEnd: totalCost.total * 0.7,
        typicalRange: { min: totalCost.total * 0.8, max: totalCost.total * 1.3 },
        highEnd: totalCost.total * 1.6
      },
      recommendations
    };
  }

  /**
   * 8. GENERAR INSIGHTS DE CONTRACTOR EXPERIMENTADO
   */
  private async generateContractorInsights(
    projectDescription: string,
    location: ClientLocation,
    magnitude: ProjectMagnitude,
    totalCost: any
  ): Promise<string[]> {
    console.log('💡 [GC-INTELLIGENCE] Generating contractor insights...');

    const insights = [
      `Project classified as ${magnitude.scale} ${magnitude.complexity} for ${location.marketTier} market in ${location.state}`,
      `Total investment: $${totalCost.total.toLocaleString()} (Materials: ${Math.round(totalCost.materials/totalCost.total*100)}%, Labor: ${Math.round(totalCost.labor/totalCost.total*100)}%)`,
      `Estimated timeline: ${magnitude.estimatedDuration.days} working days (${magnitude.estimatedDuration.range.min}-${magnitude.estimatedDuration.range.max} day range)`,
      `Local factors: ${location.permitComplexity} permit complexity, ${location.climateZone} climate zone`
    ];

    // Insights adicionales basados en magnitud
    if (magnitude.structuralRequirements) {
      insights.push('⚠️ Structural elements require engineered plans and inspections');
    }

    if (magnitude.permitRequired) {
      insights.push(`📋 Building permits required (estimated cost: $${totalCost.permits})`);
    }

    // Insights de mercado local
    if (location.marketTier === 'metro') {
      insights.push('🏙️ Metro market: Higher labor rates, more regulations, longer permit times');
    } else if (location.marketTier === 'rural') {
      insights.push('🌾 Rural market: Lower labor costs, but limited contractor availability');
    }

    return insights;
  }

  /**
   * 9. CREAR TIMELINE REALISTA CON FACTORES LOCALES
   */
  private createRealisticTimeline(
    procedures: ExecutionProcedure[],
    magnitude: ProjectMagnitude
  ): string {
    const totalWorkingDays = magnitude.estimatedDuration.days;
    const phases = procedures.length;
    
    let timeline = `${totalWorkingDays} working days across ${phases} phases:\n`;
    
    procedures.forEach((procedure, index) => {
      const dayRange = Math.ceil(procedure.estimatedHours / 8);
      timeline += `${index + 1}. ${procedure.phase}: ${dayRange} day${dayRange > 1 ? 's' : ''}`;
      
      if (procedure.weatherDependent) {
        timeline += ' (weather dependent)';
      }
      
      if (procedure.permitCheckpoint) {
        timeline += ' (permit checkpoint)';
      }
      
      timeline += '\n';
    });

    // Factores adicionales
    timeline += `\nAdditional factors:\n`;
    timeline += `• Material delivery coordination\n`;
    timeline += `• Weather buffer (10-15% additional time)\n`;
    timeline += `• Inspection scheduling\n`;
    
    const calendarDays = Math.ceil(totalWorkingDays * 1.3); // Account for weekends/delays
    timeline += `\nTotal calendar time: ~${calendarDays} days (${Math.ceil(calendarDays/7)} weeks)`;

    return timeline;
  }
}