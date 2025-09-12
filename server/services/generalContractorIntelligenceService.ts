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

  // Continuará con los demás métodos...
  private async calculateMaterialRequirements(
    projectDescription: string,
    location: ClientLocation,
    procedures: ExecutionProcedure[]
  ): Promise<MaterialRequirement[]> {
    // TODO: Implementar cálculo inteligente de materiales
    return [];
  }

  private async estimateLocalLabor(
    procedures: ExecutionProcedure[],
    location: ClientLocation,
    magnitude: ProjectMagnitude
  ): Promise<LaborEstimate[]> {
    // TODO: Implementar estimación de labor local
    return [];
  }

  private calculateTotalProjectCost(
    materials: MaterialRequirement[],
    labor: LaborEstimate[],
    location: ClientLocation,
    magnitude: ProjectMagnitude
  ): any {
    // TODO: Implementar cálculo de costos totales
    return { total: 0, materials: 0, labor: 0, permits: 0, overhead: 0, profit: 0 };
  }

  private async validateReality(
    totalCost: any,
    projectDescription: string,
    location: ClientLocation,
    magnitude: ProjectMagnitude
  ): Promise<RealityValidation> {
    // TODO: Implementar validación de realidad
    return {
      isRealistic: true,
      confidence: 0.8,
      redFlags: [],
      marketComparison: { lowEnd: 0, typicalRange: { min: 0, max: 0 }, highEnd: 0 },
      recommendations: []
    };
  }

  private async generateContractorInsights(
    projectDescription: string,
    location: ClientLocation,
    magnitude: ProjectMagnitude,
    totalCost: any
  ): Promise<string[]> {
    // TODO: Implementar insights de contractor
    return [];
  }

  private createRealisticTimeline(
    procedures: ExecutionProcedure[],
    magnitude: ProjectMagnitude
  ): string {
    // TODO: Implementar timeline realista
    return `${magnitude.estimatedDuration.days} días de trabajo`;
  }
}