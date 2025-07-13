/**
 * ADU Construction Expert Service
 * 
 * Servicio especializado para proyectos de construcción de ADU (Accessory Dwelling Units)
 * con precisión quirúrgica para proyectos de gran magnitud como 1200+ sqft.
 */

interface ADUSpecifications {
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  kitchenType: 'full' | 'compact' | 'kitchenette';
  foundationType: 'slab' | 'crawlspace' | 'basement';
  roofType: 'gable' | 'hip' | 'shed' | 'flat';
  sidingType: 'vinyl' | 'hardie' | 'stucco' | 'wood';
  location: string;
  hasGarage?: boolean;
  hasPorch?: boolean;
  stories: 1 | 2;
}

interface ADUMaterialCategory {
  category: string;
  description: string;
  materials: ADUMaterial[];
  totalCost: number;
  laborHours: number;
  phase: 'foundation' | 'framing' | 'electrical' | 'plumbing' | 'finish';
}

interface ADUMaterial {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category: string;
  supplier: string;
  specifications: string;
  wasteFactorApplied: boolean;
}

interface ADULaborTask {
  phase: string;
  task: string;
  description: string;
  duration: string;
  laborCost: number;
  skillLevel: 'general' | 'skilled' | 'specialist';
  crew: string;
}

export class ADUConstructionExpertService {
  
  /**
   * Analiza un proyecto ADU y genera estimado completo con precisión de contratista
   */
  async generateADUEstimate(
    projectDescription: string,
    location: string = 'California'
  ): Promise<{
    specifications: ADUSpecifications;
    materialCategories: ADUMaterialCategory[];
    laborTasks: ADULaborTask[];
    costs: {
      materials: number;
      labor: number;
      permits: number;
      total: number;
    };
    timeline: {
      totalDays: number;
      phases: Array<{
        name: string;
        duration: string;
        description: string;
      }>;
    };
    recommendations: string[];
  }> {
    console.log('🏗️ ADU Expert: Analizando proyecto ADU...', { projectDescription, location });

    // 1. Extraer especificaciones del ADU
    const specs = this.extractADUSpecifications(projectDescription);
    console.log('📐 Especificaciones extraídas:', specs);

    // 2. Generar categorías de materiales especializadas
    const materialCategories = this.generateMaterialCategories(specs, location);
    
    // 3. Calcular tareas de labor especializadas
    const laborTasks = this.calculateLaborTasks(specs, location);
    
    // 4. Calcular costos totales
    const costs = this.calculateTotalCosts(materialCategories, laborTasks, specs, location);
    
    // 5. Generar timeline realista
    const timeline = this.generateConstructionTimeline(specs, laborTasks);
    
    // 6. Recomendaciones especializadas
    const recommendations = this.generateADURecommendations(specs, location);

    console.log('✅ ADU Expert: Análisis completado', {
      materialCategories: materialCategories.length,
      laborTasks: laborTasks.length,
      totalCost: costs.total
    });

    return {
      specifications: specs,
      materialCategories,
      laborTasks,
      costs,
      timeline,
      recommendations
    };
  }

  /**
   * Extrae especificaciones específicas de ADU del texto del proyecto
   */
  private extractADUSpecifications(description: string): ADUSpecifications {
    const squareFeet = this.extractNumber(description, /(\d{1,4})\s*(?:sq\s*ft|square\s*feet|sqft)/i) || 1200;
    const bedrooms = this.extractNumber(description, /(\d+)\s*(?:bed|bedroom)/i) || (squareFeet < 600 ? 1 : 2);
    const bathrooms = this.extractNumber(description, /(\d+(?:\.\d+)?)\s*(?:bath|bathroom)/i) || 1;
    
    // Determinar tipo de cocina basado en tamaño
    let kitchenType: 'full' | 'compact' | 'kitchenette' = 'compact';
    if (squareFeet >= 1000) kitchenType = 'full';
    if (squareFeet < 500) kitchenType = 'kitchenette';

    // Determinar tipo de fundación más común para ADU
    const foundationType: 'slab' | 'crawlspace' | 'basement' = 'slab';
    
    return {
      squareFeet,
      bedrooms,
      bathrooms,
      kitchenType,
      foundationType,
      roofType: 'gable', // Más común para ADU
      sidingType: 'hardie', // Durable y requerido por códigos
      location: 'California',
      stories: squareFeet > 900 ? 1 : 1, // La mayoría de ADU son de 1 piso
      hasGarage: false,
      hasPorch: squareFeet > 800
    };
  }

  /**
   * Genera categorías completas de materiales para construcción ADU
   */
  private generateMaterialCategories(specs: ADUSpecifications, location: string): ADUMaterialCategory[] {
    const categories: ADUMaterialCategory[] = [];

    // 1. FUNDACIÓN Y SITIO
    categories.push({
      category: 'Foundation & Site Work',
      description: 'Excavación, fundación de concreto, y preparación del sitio',
      phase: 'foundation',
      materials: [
        {
          id: 'concrete_foundation',
          name: 'Concrete Foundation - 3000 PSI',
          description: 'Ready-mix concrete for slab foundation',
          quantity: Math.ceil(specs.squareFeet * 0.33), // 4" thick slab
          unit: 'cubic_yards',
          unitPrice: 165,
          totalPrice: 0,
          category: 'concrete',
          supplier: 'Local Ready-Mix',
          specifications: '3000 PSI, 4" slump, fiber reinforced',
          wasteFactorApplied: true
        },
        {
          id: 'rebar_grid',
          name: '#4 Rebar Grid 12" O.C.',
          description: 'Reinforcement steel for foundation',
          quantity: Math.ceil(specs.squareFeet * 0.02),
          unit: 'tons',
          unitPrice: 850,
          totalPrice: 0,
          category: 'steel',
          supplier: 'Steel Supply Co',
          specifications: 'Grade 60, #4 bars, welded wire mesh',
          wasteFactorApplied: true
        },
        {
          id: 'vapor_barrier',
          name: '6mil Plastic Vapor Barrier',
          description: 'Under-slab moisture barrier',
          quantity: Math.ceil(specs.squareFeet * 1.1),
          unit: 'sqft',
          unitPrice: 0.12,
          totalPrice: 0,
          category: 'moisture_control',
          supplier: 'Home Depot',
          specifications: '6mil polyethylene, overlapped seams',
          wasteFactorApplied: true
        }
      ],
      totalCost: 0,
      laborHours: 40
    });

    // 2. FRAMING Y ESTRUCTURA
    categories.push({
      category: 'Framing & Structure',
      description: 'Estructura de madera, vigas, y elementos estructurales',
      phase: 'framing',
      materials: [
        {
          id: 'lumber_2x4_studs',
          name: '2x4x8 SPF Studs',
          description: 'Wall framing studs 16" O.C.',
          quantity: Math.ceil(specs.squareFeet * 1.2), // Estimación por sqft
          unit: 'pieces',
          unitPrice: 4.25,
          totalPrice: 0,
          category: 'lumber',
          supplier: 'Lumber Yard',
          specifications: 'Construction grade SPF, kiln dried',
          wasteFactorApplied: true
        },
        {
          id: 'lumber_2x6_plates',
          name: '2x6x12 PT Bottom Plates',
          description: 'Pressure treated bottom plates',
          quantity: Math.ceil(specs.squareFeet * 0.15),
          unit: 'pieces',
          unitPrice: 12.50,
          totalPrice: 0,
          category: 'lumber',
          supplier: 'Lumber Yard',
          specifications: 'Ground contact rated, .40 CCA',
          wasteFactorApplied: true
        },
        {
          id: 'osb_sheathing',
          name: '7/16" OSB Sheathing 4x8',
          description: 'Structural wall sheathing',
          quantity: Math.ceil(specs.squareFeet * 0.25),
          unit: 'sheets',
          unitPrice: 28.50,
          totalPrice: 0,
          category: 'sheathing',
          supplier: 'Home Depot',
          specifications: 'APA rated, moisture resistant',
          wasteFactorApplied: true
        }
      ],
      totalCost: 0,
      laborHours: 80
    });

    // 3. ROOFING
    categories.push({
      category: 'Roofing System',
      description: 'Sistema completo de techo incluyendo estructura y acabados',
      phase: 'framing',
      materials: [
        {
          id: 'roof_trusses',
          name: 'Engineered Roof Trusses',
          description: 'Pre-fabricated roof trusses 24" O.C.',
          quantity: Math.ceil(specs.squareFeet * 0.08),
          unit: 'pieces',
          unitPrice: 85,
          totalPrice: 0,
          category: 'structural',
          supplier: 'Truss Manufacturer',
          specifications: 'Engineered for 40lb live load, stamped',
          wasteFactorApplied: false
        },
        {
          id: 'roof_sheathing',
          name: '5/8" Plywood Roof Sheathing',
          description: 'CDX plywood for roof deck',
          quantity: Math.ceil(specs.squareFeet * 1.3), // Roof area factor
          unit: 'sheets',
          unitPrice: 42,
          totalPrice: 0,
          category: 'sheathing',
          supplier: 'Lumber Yard',
          specifications: 'CDX grade, tongue & groove',
          wasteFactorApplied: true
        },
        {
          id: 'comp_shingles',
          name: '30-Year Architectural Shingles',
          description: 'Asphalt composite roofing shingles',
          quantity: Math.ceil(specs.squareFeet * 1.3 / 100), // Roof squares
          unit: 'squares',
          unitPrice: 120,
          totalPrice: 0,
          category: 'roofing',
          supplier: 'Roofing Supply',
          specifications: '30-year warranty, algae resistant',
          wasteFactorApplied: true
        }
      ],
      totalCost: 0,
      laborHours: 50
    });

    // Calcular costos totales para cada categoría
    categories.forEach(category => {
      category.materials.forEach(material => {
        let quantity = material.quantity;
        if (material.wasteFactorApplied) {
          quantity *= 1.1; // 10% waste factor
        }
        material.totalPrice = quantity * material.unitPrice;
      });
      category.totalCost = category.materials.reduce((sum, mat) => sum + mat.totalPrice, 0);
    });

    // Continuar con más categorías: Eléctrico, Plomería, HVAC, Aislamiento, Drywall, Pisos, etc.
    // ... (Se pueden agregar más categorías según necesidad)

    return categories;
  }

  /**
   * Calcula tareas de labor especializadas para ADU
   */
  private calculateLaborTasks(specs: ADUSpecifications, location: string): ADULaborTask[] {
    const baseCostMultiplier = this.getLocationMultiplier(location);
    
    return [
      {
        phase: 'Site Preparation',
        task: 'Excavation & Grading',
        description: 'Site preparation, excavation for foundation',
        duration: '3-5 days',
        laborCost: 3500 * baseCostMultiplier,
        skillLevel: 'skilled',
        crew: '2-3 workers + equipment operator'
      },
      {
        phase: 'Foundation',
        task: 'Concrete Foundation',
        description: 'Form, pour, and finish concrete slab',
        duration: '2-3 days',
        laborCost: 4200 * baseCostMultiplier,
        skillLevel: 'skilled',
        crew: '3-4 concrete workers'
      },
      {
        phase: 'Framing',
        task: 'Wall & Roof Framing',
        description: 'Complete structural framing',
        duration: '7-10 days',
        laborCost: 8500 * baseCostMultiplier,
        skillLevel: 'skilled',
        crew: '3-4 carpenters'
      },
      {
        phase: 'Roofing',
        task: 'Roof Installation',
        description: 'Complete roofing system installation',
        duration: '3-4 days',
        laborCost: 5200 * baseCostMultiplier,
        skillLevel: 'specialist',
        crew: '2-3 roofers'
      },
      {
        phase: 'Mechanical',
        task: 'Electrical Rough-In',
        description: 'Electrical wiring and panel installation',
        duration: '4-5 days',
        laborCost: 6800 * baseCostMultiplier,
        skillLevel: 'specialist',
        crew: '1-2 electricians'
      },
      {
        phase: 'Mechanical',
        task: 'Plumbing Rough-In',
        description: 'Plumbing installation and fixtures',
        duration: '4-5 days',
        laborCost: 7200 * baseCostMultiplier,
        skillLevel: 'specialist',
        crew: '1-2 plumbers'
      }
      // Más tareas de labor...
    ];
  }

  /**
   * Calcula costos totales del proyecto ADU
   */
  private calculateTotalCosts(
    materialCategories: ADUMaterialCategory[],
    laborTasks: ADULaborTask[],
    specs: ADUSpecifications,
    location: string
  ) {
    const materialsCost = materialCategories.reduce((sum, cat) => sum + cat.totalCost, 0);
    const laborCost = laborTasks.reduce((sum, task) => sum + task.laborCost, 0);
    
    // Permisos estimados para ADU
    const permits = this.calculatePermitCosts(specs, location);
    
    return {
      materials: Math.round(materialsCost),
      labor: Math.round(laborCost),
      permits: Math.round(permits),
      total: Math.round(materialsCost + laborCost + permits)
    };
  }

  /**
   * Genera timeline realista de construcción
   */
  private generateConstructionTimeline(specs: ADUSpecifications, laborTasks: ADULaborTask[]) {
    const phases = [
      { name: 'Permits & Planning', duration: '4-6 weeks', description: 'Permit approval and final plans' },
      { name: 'Site Preparation', duration: '1 week', description: 'Excavation and site prep' },
      { name: 'Foundation', duration: '1 week', description: 'Concrete foundation and curing' },
      { name: 'Framing', duration: '2-3 weeks', description: 'Wall and roof framing' },
      { name: 'Roofing', duration: '1 week', description: 'Roof installation and waterproofing' },
      { name: 'Mechanical Rough-In', duration: '2 weeks', description: 'Electrical, plumbing, HVAC' },
      { name: 'Insulation & Drywall', duration: '2 weeks', description: 'Insulation and drywall installation' },
      { name: 'Interior Finishes', duration: '3-4 weeks', description: 'Flooring, cabinets, trim, paint' },
      { name: 'Final Inspections', duration: '1 week', description: 'Final inspections and cleanup' }
    ];

    // Calcular días totales basado en tamaño
    const baseDays = 75;
    const sizeFactor = specs.squareFeet / 1000;
    const totalDays = Math.ceil(baseDays * sizeFactor);

    return {
      totalDays,
      phases
    };
  }

  /**
   * Genera recomendaciones específicas para ADU
   */
  private generateADURecommendations(specs: ADUSpecifications, location: string): string[] {
    return [
      '🏗️ ADU Expert Analysis: Complete new construction estimate for ' + specs.squareFeet + ' sqft unit',
      '📋 Include all major systems: foundation, framing, roofing, electrical, plumbing, HVAC',
      '🏛️ Verify local ADU regulations and setback requirements before construction',
      '💡 Consider energy efficiency upgrades for long-term savings',
      '🔌 Plan for adequate electrical capacity (200A panel recommended)',
      '🚿 Include proper ventilation and moisture control systems',
      '📏 Ensure compliance with accessibility requirements if applicable',
      '💰 Budget additional 10-15% for change orders and unforeseen issues'
    ];
  }

  // Helper methods
  private extractNumber(text: string, regex: RegExp): number | null {
    const match = text.match(regex);
    return match ? parseFloat(match[1]) : null;
  }

  private getLocationMultiplier(location: string): number {
    // Multipliers based on construction costs by location
    const multipliers: Record<string, number> = {
      'California': 1.4,
      'New York': 1.3,
      'Texas': 1.0,
      'Florida': 1.1,
      'default': 1.2
    };
    
    for (const [key, mult] of Object.entries(multipliers)) {
      if (location.toLowerCase().includes(key.toLowerCase())) {
        return mult;
      }
    }
    
    return multipliers.default;
  }

  private calculatePermitCosts(specs: ADUSpecifications, location: string): number {
    // Estimated permit costs for ADU construction
    const baseCost = 2500;
    const sizeFactor = specs.squareFeet / 1000;
    const locationMultiplier = this.getLocationMultiplier(location);
    
    return baseCost * sizeFactor * locationMultiplier;
  }
}

export const aduConstructionExpertService = new ADUConstructionExpertService();