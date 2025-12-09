/**
 * Labor DeepSearch IA Service - REFACTORIZADO
 * 
 * Este servicio utiliza IA (Claude) para analizar descripciones de proyectos y generar
 * automáticamente listas de servicios de labor/mano de obra con costos estimados.
 * 
 * CAMBIOS IMPORTANTES:
 * - Claude es el método PRINCIPAL de análisis (no fallback)
 * - Detecta CUALQUIER tipo de proyecto con IA (sin listas hardcodeadas)
 * - Usa pricing por unidad profesional (sqft, lf, cyd, square, unit, project)
 * - Aplica ajustes precisos por ubicación (state, city, zip)
 * 
 * Casos de uso:
 * - Proyectos donde el cliente provee materiales
 * - Servicios de limpieza y demolición
 * - Instalación sin materiales
 * - Servicios de preparación de sitio
 * - Hauling y disposal
 * - CUALQUIER tipo de servicio de construcción
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface LaborItem {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  skillLevel: string;
  complexity: string;
  estimatedTime: string;
  includes?: string[];
}

interface LaborAnalysisResult {
  laborItems: LaborItem[];
  totalHours: number;
  totalLaborCost: number;
  estimatedDuration: string;
  crewSize: number;
  projectComplexity: 'low' | 'medium' | 'high';
  specialRequirements: string[];
  safetyConsiderations: string[];
  detectedProjectType: string;
  locationAnalysis: {
    state: string;
    city: string;
    marketMultiplier: number;
  };
}

export class LaborDeepSearchService {
  
  /**
   * Analiza un proyecto y genera una lista completa de tareas de labor
   * SIEMPRE usa Claude IA como método principal de análisis
   */
  async analyzeLaborRequirements(
    projectDescription: string, 
    location?: string,
    projectType?: string
  ): Promise<LaborAnalysisResult> {
    try {
      console.log('🔧 Labor DeepSearch IA: Iniciando análisis con Claude para:', { 
        projectDescription: projectDescription.substring(0, 100), 
        location, 
        projectType 
      });

      // SIEMPRE usar Claude IA para análisis - es el método principal
      const prompt = this.buildIntelligentLaborPrompt(projectDescription, location, projectType);
      
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        temperature: 0.2,
        messages: [{
          role: "user",
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Invalid response type from Anthropic');
      }

      const analysisResult = this.parseClaudeResponse(content.text, location);
      
      console.log('✅ Labor DeepSearch IA: Análisis completado', {
        detectedType: analysisResult.detectedProjectType,
        laborItemsCount: analysisResult.laborItems.length,
        totalCost: analysisResult.totalLaborCost,
        estimatedDuration: analysisResult.estimatedDuration,
        location: analysisResult.locationAnalysis
      });

      return analysisResult;

    } catch (error) {
      console.error('❌ Labor DeepSearch IA Error:', error);
      throw new Error(`Error en análisis de labor: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Construye el prompt inteligente para Claude
   * Diseñado para detectar CUALQUIER tipo de proyecto y usar pricing profesional
   */
  private buildIntelligentLaborPrompt(projectDescription: string, location?: string, projectType?: string): string {
    // Analizar ubicación para incluir contexto específico
    const locationContext = this.buildLocationContext(location);
    
    return `
You are a veteran general contractor with 30+ years of experience pricing construction labor across ALL types of projects in the United States. You have deep knowledge of labor markets, regional pricing variations, and professional contractor pricing methods.

## PROJECT DESCRIPTION TO ANALYZE:
"${projectDescription}"

## LOCATION INFORMATION:
${locationContext}

## YOUR TASK:
Analyze this project description and generate a COMPLETE list of labor/service tasks with accurate pricing. You must:

1. **DETECT THE PROJECT TYPE**: Identify what type of work this is (fencing, roofing, concrete, painting, cleaning, demolition, landscaping, electrical, plumbing, HVAC, engineering, general construction, or ANY other service). Be specific.

2. **GENERATE LABOR TASKS**: Create a detailed list of ALL labor tasks required to complete this project. Think like a professional contractor preparing a bid.

3. **USE PROFESSIONAL PRICING UNITS** (CRITICAL - contractors NEVER charge hourly):
   - LINEAR FOOT (lf): For fences, trim, gutters, baseboards, piping
   - SQUARE FOOT (sqft): For roofing, flooring, walls, painting, pressure washing
   - SQUARE (100 sqft): For roofing shingles, siding
   - CUBIC YARD (cyd): For concrete, excavation, debris removal, hauling
   - PER UNIT: For doors, windows, fixtures, posts, trees
   - PER PROJECT: For small complete jobs, permits, engineering
   - PER TON: For asphalt, gravel, hauling heavy materials

4. **APPLY LOCATION-BASED PRICING**:
   - California: +35-50% (highest labor costs)
   - New York/NJ/CT: +25-40%
   - Hawaii/Alaska: +40-60%
   - Texas/Arizona: Base rate
   - Florida: +5-15%
   - Midwest: -5-10%
   - Southeast: -10-15%
   - Rural areas: -15-20% but add travel costs

## LABOR CATEGORY TYPES:
- preparation: Site prep, excavation, layout, marking
- demolition: Tear-out, removal of existing structures
- installation: Main construction/installation work
- finishing: Detail work, trim, final adjustments
- cleanup: Site cleanup, debris removal
- hauling: Transportation, disposal
- specialty: Licensed work (electrical, plumbing, engineering)

## SKILL LEVELS AND BASE RATES:
- helper: $18-28/hr equivalent (cleanup, basic labor)
- skilled: $35-55/hr equivalent (most trade work)
- specialist: $55-85/hr equivalent (electrical, plumbing, HVAC)
- foreman: $65-95/hr equivalent (supervision, complex work)
- engineer: $100-200/hr equivalent (structural, permits)

## REAL CONTRACTOR PRICING EXAMPLES:

### Fencing (per linear foot):
- Wood fence installation: $18-35/lf
- Vinyl fence installation: $20-40/lf
- Chain link installation: $12-25/lf
- Post hole digging: $25-45 per hole
- Gate installation: $150-400 per gate

### Roofing (per square = 100 sqft):
- Shingle tear-off: $75-150/square
- Shingle installation: $350-650/square
- Underlayment: $50-100/square

### Concrete (per sqft or cyd):
- Flatwork: $8-18/sqft
- Stamped concrete: $12-25/sqft
- Demolition: $3-8/sqft
- Excavation: $45-85/cyd

### Painting (per sqft):
- Interior walls: $1.50-4/sqft
- Exterior: $2-6/sqft
- Prep work: $0.50-2/sqft

### Demolition/Hauling:
- Debris removal: $45-95/cyd
- Dumpster load: $350-650/load

### Cleaning Services:
- Pressure washing: $0.15-0.50/sqft
- Window cleaning: $5-15/window
- Post-construction cleanup: $0.10-0.30/sqft

### Landscaping:
- Sod installation: $1-3/sqft
- Tree removal: $300-2000/tree
- Grading: $1-4/sqft

## RESPONSE FORMAT (JSON ONLY):
{
  "detectedProjectType": "Specific type of project identified",
  "laborItems": [
    {
      "id": "labor_001",
      "name": "Task name in English",
      "description": "What this service includes",
      "category": "preparation|installation|demolition|cleanup|hauling|specialty|finishing",
      "quantity": 200,
      "unit": "lf|sqft|square|cyd|unit|project|ton",
      "unitPrice": 22.50,
      "totalCost": 4500.00,
      "skillLevel": "helper|skilled|specialist|foreman|engineer",
      "complexity": "low|medium|high",
      "estimatedTime": "1-2 days",
      "includes": ["What is included in this price"]
    }
  ],
  "totalLaborCost": 4500.00,
  "estimatedDuration": "3-5 days",
  "crewSize": 3,
  "projectComplexity": "low|medium|high",
  "specialRequirements": ["Permits", "Licensed workers", etc.],
  "safetyConsiderations": ["Safety requirements"],
  "locationAnalysis": {
    "state": "California",
    "city": "San Diego",
    "marketMultiplier": 1.35
  }
}

IMPORTANT RULES:
1. Analyze the ENTIRE description to understand the full scope
2. NEVER use hourly rates as the unit - convert to professional units
3. Include ALL labor tasks needed (don't skip prep or cleanup)
4. If description mentions "labor only" or "customer provides materials", include ZERO material costs
5. Apply location multiplier to all rates
6. Be realistic - these are actual contractor prices
7. ALL TEXT MUST BE IN ENGLISH

Respond with ONLY the JSON object, no additional text.
`;
  }

  /**
   * Construye contexto de ubicación para el prompt
   */
  private buildLocationContext(location?: string): string {
    if (!location || location.trim().length === 0) {
      return `Location: United States (general pricing)
Note: No specific location provided, using national average rates.`;
    }

    // Detectar componentes de la ubicación
    const locationLower = location.toLowerCase();
    let stateInfo = '';
    let cityInfo = '';
    let zipInfo = '';

    // Detectar estados comunes
    const statePatterns: Record<string, string> = {
      'california': 'California - Premium market (+35-50%)',
      'ca': 'California - Premium market (+35-50%)',
      'new york': 'New York - High cost market (+25-40%)',
      'ny': 'New York - High cost market (+25-40%)',
      'texas': 'Texas - Competitive market (base rate)',
      'tx': 'Texas - Competitive market (base rate)',
      'florida': 'Florida - Moderate market (+5-15%)',
      'fl': 'Florida - Moderate market (+5-15%)',
      'arizona': 'Arizona - Competitive market (base rate)',
      'az': 'Arizona - Competitive market (base rate)',
      'hawaii': 'Hawaii - Premium island market (+40-60%)',
      'hi': 'Hawaii - Premium island market (+40-60%)',
      'alaska': 'Alaska - Remote premium market (+40-60%)',
      'ak': 'Alaska - Remote premium market (+40-60%)',
      'washington': 'Washington - High cost market (+15-25%)',
      'wa': 'Washington - High cost market (+15-25%)',
      'oregon': 'Oregon - Moderate-high market (+10-20%)',
      'or': 'Oregon - Moderate-high market (+10-20%)',
      'colorado': 'Colorado - Growing market (+10-15%)',
      'co': 'Colorado - Growing market (+10-15%)',
      'nevada': 'Nevada - Moderate market (+5-10%)',
      'nv': 'Nevada - Moderate market (+5-10%)',
      'massachusetts': 'Massachusetts - High cost market (+20-35%)',
      'ma': 'Massachusetts - High cost market (+20-35%)',
      'new jersey': 'New Jersey - High cost market (+20-30%)',
      'nj': 'New Jersey - High cost market (+20-30%)',
      'connecticut': 'Connecticut - High cost market (+20-30%)',
      'ct': 'Connecticut - High cost market (+20-30%)',
      'illinois': 'Illinois - Moderate-high market (+10-20%)',
      'il': 'Illinois - Moderate-high market (+10-20%)',
      'georgia': 'Georgia - Competitive market (-5-10%)',
      'ga': 'Georgia - Competitive market (-5-10%)',
      'north carolina': 'North Carolina - Competitive market (-5-10%)',
      'nc': 'North Carolina - Competitive market (-5-10%)',
      'south carolina': 'South Carolina - Low cost market (-10-15%)',
      'sc': 'South Carolina - Low cost market (-10-15%)',
      'tennessee': 'Tennessee - Low cost market (-10-15%)',
      'tn': 'Tennessee - Low cost market (-10-15%)',
      'ohio': 'Ohio - Low cost market (-10-15%)',
      'oh': 'Ohio - Low cost market (-10-15%)',
      'michigan': 'Michigan - Moderate market (base rate)',
      'mi': 'Michigan - Moderate market (base rate)',
      'pennsylvania': 'Pennsylvania - Moderate market (+5-10%)',
      'pa': 'Pennsylvania - Moderate market (+5-10%)',
      'virginia': 'Virginia - Moderate-high market (+10-15%)',
      'va': 'Virginia - Moderate-high market (+10-15%)',
    };

    for (const [key, value] of Object.entries(statePatterns)) {
      if (locationLower.includes(key)) {
        stateInfo = value;
        break;
      }
    }

    // Detectar si es un ZIP code
    const zipMatch = location.match(/\b\d{5}(-\d{4})?\b/);
    if (zipMatch) {
      zipInfo = `ZIP Code: ${zipMatch[0]}`;
    }

    return `Location: ${location}
${stateInfo ? `State Analysis: ${stateInfo}` : ''}
${zipInfo ? zipInfo : ''}
${cityInfo ? `City: ${cityInfo}` : ''}

IMPORTANT: Apply the appropriate regional labor rate multiplier based on this location.
Research the specific market conditions for this area and adjust pricing accordingly.`;
  }

  /**
   * Parsea la respuesta de Claude y estructura los datos
   */
  private parseClaudeResponse(claudeResponse: string, location?: string): LaborAnalysisResult {
    try {
      // Limpiar la respuesta y extraer JSON
      const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validar estructura básica
      if (!parsed.laborItems || !Array.isArray(parsed.laborItems)) {
        throw new Error('Estructura de respuesta inválida: falta laborItems');
      }

      // ALLOWED PROFESSIONAL UNITS - contractors never charge hourly
      const ALLOWED_UNITS = ['lf', 'sqft', 'square', 'cyd', 'unit', 'project', 'ton', 'each', 'linear_ft', 'square_ft', 'cubic_yard'];
      
      // Normalize unit to approved format
      const normalizeUnit = (unit: string): string => {
        const unitLower = (unit || '').toLowerCase().trim();
        
        // Map common variations to standard units
        const unitMap: Record<string, string> = {
          'linear foot': 'lf',
          'linear feet': 'lf',
          'linear_foot': 'lf',
          'linear_feet': 'lf',
          'lin ft': 'lf',
          'lineal foot': 'lf',
          'square foot': 'sqft',
          'square feet': 'sqft',
          'sq ft': 'sqft',
          'sq. ft.': 'sqft',
          'square_foot': 'sqft',
          'square_feet': 'sqft',
          'cubic yard': 'cyd',
          'cubic yards': 'cyd',
          'cu yd': 'cyd',
          'cubic_yard': 'cyd',
          'per unit': 'unit',
          'per project': 'project',
          'per each': 'each',
          'per ton': 'ton',
          '100 sqft': 'square',
          '100sqft': 'square',
          // REJECT hourly units - convert to project
          'hour': 'project',
          'hours': 'project',
          'hr': 'project',
          'hrs': 'project',
          'hourly': 'project',
          'per hour': 'project',
        };
        
        if (unitMap[unitLower]) {
          return unitMap[unitLower];
        }
        
        // If unit is in allowed list, return as-is
        if (ALLOWED_UNITS.includes(unitLower)) {
          return unitLower;
        }
        
        // Log warning for unknown units and default to project
        console.warn(`⚠️ Unknown unit "${unit}" detected, defaulting to "project"`);
        return 'project';
      };

      // Generar IDs únicos si no existen y normalizar datos
      parsed.laborItems = parsed.laborItems.map((item: any, index: number) => {
        const normalizedUnit = normalizeUnit(item.unit);
        
        // If unit was converted from hourly, recalculate as lump sum
        const isHourlyConverted = ['hour', 'hours', 'hr', 'hrs', 'hourly', 'per hour'].includes((item.unit || '').toLowerCase());
        
        return {
          id: item.id || `labor_${Date.now()}_${index}`,
          name: item.name || 'Labor Task',
          description: item.description || '',
          category: item.category || 'installation',
          quantity: isHourlyConverted ? 1 : (Number(item.quantity) || 1),
          unit: normalizedUnit,
          unitPrice: isHourlyConverted ? Number(item.totalCost) || 0 : (Number(item.unitPrice) || 0),
          totalCost: Number(item.totalCost) || 0,
          skillLevel: item.skillLevel || 'skilled',
          complexity: item.complexity || 'medium',
          estimatedTime: item.estimatedTime || '1 day',
          includes: item.includes || []
        };
      });

      // Calcular totales si no están presentes
      if (!parsed.totalLaborCost) {
        parsed.totalLaborCost = parsed.laborItems.reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0);
      }

      // Calcular horas estimadas basado en costos
      if (!parsed.totalHours) {
        // Estimar horas basado en costo total y rate promedio de $45/hr
        parsed.totalHours = Math.round(parsed.totalLaborCost / 45);
      }

      // Valores por defecto para campos opcionales
      const result: LaborAnalysisResult = {
        laborItems: parsed.laborItems,
        totalHours: Number(parsed.totalHours) || 0,
        totalLaborCost: Number(parsed.totalLaborCost) || 0,
        estimatedDuration: parsed.estimatedDuration || this.calculateDuration(parsed.totalHours),
        crewSize: Number(parsed.crewSize) || 2,
        projectComplexity: parsed.projectComplexity || 'medium',
        specialRequirements: parsed.specialRequirements || [],
        safetyConsiderations: parsed.safetyConsiderations || [],
        detectedProjectType: parsed.detectedProjectType || 'General Construction',
        locationAnalysis: parsed.locationAnalysis || {
          state: this.extractState(location),
          city: '',
          marketMultiplier: 1.0
        }
      };

      return result;

    } catch (error) {
      console.error('Error parseando respuesta de Claude:', error);
      throw new Error('Error procesando respuesta de IA');
    }
  }

  /**
   * Calcula duración basada en horas
   */
  private calculateDuration(totalHours: number): string {
    if (!totalHours || totalHours <= 0) return '1 day';
    
    const workingHoursPerDay = 8;
    const days = Math.ceil(totalHours / workingHoursPerDay);
    
    if (days <= 1) return '1 day';
    if (days <= 7) return `${days} days`;
    
    const weeks = Math.ceil(days / 5);
    return `${weeks} week${weeks > 1 ? 's' : ''}`;
  }

  /**
   * Extrae el estado de la ubicación
   */
  private extractState(location?: string): string {
    if (!location) return 'United States';
    
    const stateAbbreviations: Record<string, string> = {
      'ca': 'California', 'california': 'California',
      'tx': 'Texas', 'texas': 'Texas',
      'fl': 'Florida', 'florida': 'Florida',
      'ny': 'New York', 'new york': 'New York',
      'az': 'Arizona', 'arizona': 'Arizona',
      'wa': 'Washington', 'washington': 'Washington',
      'or': 'Oregon', 'oregon': 'Oregon',
      'co': 'Colorado', 'colorado': 'Colorado',
      'nv': 'Nevada', 'nevada': 'Nevada',
      'ga': 'Georgia', 'georgia': 'Georgia',
      'nc': 'North Carolina', 'north carolina': 'North Carolina',
    };

    const locationLower = location.toLowerCase();
    for (const [abbr, fullName] of Object.entries(stateAbbreviations)) {
      if (locationLower.includes(abbr)) {
        return fullName;
      }
    }

    return location;
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
      const promises: Promise<any>[] = [];

      if (includeLabor) {
        console.log('🔧 Starting labor analysis with Claude IA...');
        promises.push(
          this.generateCompatibleLaborList(projectDescription, location, projectType)
            .then(laborItems => {
              results.labor = laborItems;
              results.totalLaborCost = laborItems.reduce((sum: number, item: any) => 
                sum + (item.totalPrice || item.totalCost || 0), 0);
              console.log('🔧 Labor analysis completed:', laborItems.length, 'items');
              return { type: 'labor', data: laborItems };
            })
        );
      }

      if (includeMaterials) {
        console.log('📦 Starting materials analysis...');
        promises.push(
          import('./deepSearchService').then(({ deepSearchService }) =>
            deepSearchService.generateCompatibleMaterialsList(projectDescription, location)
              .then(materialsResult => {
                results.materials = materialsResult;
                results.totalMaterialsCost = materialsResult.reduce((sum: number, item: any) => 
                  sum + (item.total || 0), 0);
                console.log('📦 Materials analysis completed:', materialsResult.length, 'items');
                return { type: 'materials', data: materialsResult };
              })
          )
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      results.grandTotal = results.totalMaterialsCost + results.totalLaborCost;

      console.log('✅ Combined estimate generated:', {
        materialsCount: results.materials.length,
        laborCount: results.labor.length,
        grandTotal: results.grandTotal
      });

      return results;

    } catch (error) {
      console.error('❌ Error generating combined estimate:', error);
      throw error;
    }
  }
}

export const laborDeepSearchService = new LaborDeepSearchService();
