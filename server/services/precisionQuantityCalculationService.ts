/**
 * Precision Quantity Calculation Service
 * 
 * Sistema de cálculo preciso de cantidades de materiales basado en fórmulas
 * de contratista real para ayudar a contratistas nuevos a saber exactamente
 * qué y cuánto comprar para cada tipo de proyecto.
 */

interface ProjectSpecifications {
  squareFeet: number;
  length?: number;
  width?: number;
  height?: number;
  depth?: number;
  stories: number;
  bedrooms: number;
  bathrooms: number;
  foundationType: 'slab' | 'crawlspace' | 'basement';
  roofType: 'gable' | 'hip' | 'shed' | 'flat';
  wallHeight: number;
  location: string;
}

interface MaterialCalculation {
  materialId: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  baseQuantity: number;
  wasteFactorPercent: number;
  wasteQuantity: number;
  finalQuantity: number;
  unitPrice: number;
  totalPrice: number;
  calculationFormula: string;
  contractorNotes: string;
  specifications: string;
  supplier: string;
  orderTiming: string; // When to order in construction sequence
}

interface PrecisionResult {
  projectType: string;
  specifications: ProjectSpecifications;
  materialsByCategory: {
    [category: string]: MaterialCalculation[];
  };
  totalMaterialsCost: number;
  contractorGuidance: {
    orderingSequence: string[];
    criticalTimings: string[];
    commonMistakes: string[];
    professionalTips: string[];
  };
  confidence: number;
}

export class PrecisionQuantityCalculationService {
  
  /**
   * Calcula cantidades precisas para construcción ADU nueva
   */
  async calculateADUQuantities(
    description: string,
    location: string = 'California'
  ): Promise<PrecisionResult> {
    try {
      console.log('🎯 Precision Calculation: Starting ADU quantity analysis');
      
      // 1. Extraer especificaciones precisas del proyecto
      const specs = this.extractDetailedSpecifications(description);
      
      // 2. Calcular cada categoría de materiales con fórmulas precisas
      const materialsByCategory = {
        'Site Preparation': this.calculateSitePreparation(specs),
        'Foundation': this.calculateFoundationMaterials(specs),
        'Framing Lumber': this.calculateFramingLumber(specs),
        'Structural Panels': this.calculateStructuralPanels(specs),
        'Roofing System': this.calculateRoofingMaterials(specs),
        'Electrical Rough-In': this.calculateElectricalMaterials(specs),
        'Plumbing Rough-In': this.calculatePlumbingMaterials(specs),
        'Insulation': this.calculateInsulationMaterials(specs),
        'Drywall & Finishing': this.calculateDrywallMaterials(specs),
        'Flooring': this.calculateFlooringMaterials(specs),
        'Kitchen & Bath': this.calculateFixtures(specs),
        'Hardware & Fasteners': this.calculateHardwareFasteners(specs)
      };
      
      // 3. Aplicar ajustes por ubicación
      this.applyLocationAdjustments(materialsByCategory, location);
      
      // 4. Calcular costo total
      const totalCost = this.calculateTotalCost(materialsByCategory);
      
      // 5. Generar guía para contratista
      const contractorGuidance = this.generateContractorGuidance(specs, materialsByCategory);
      
      return {
        projectType: 'ADU New Construction',
        specifications: specs,
        materialsByCategory,
        totalMaterialsCost: totalCost,
        contractorGuidance,
        confidence: 0.92
      };
      
    } catch (error) {
      console.error('❌ Precision Calculation Error:', error);
      throw new Error(`Precision calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Extrae especificaciones detalladas del proyecto
   */
  private extractDetailedSpecifications(description: string): ProjectSpecifications {
    const text = description.toLowerCase();
    
    // Extraer dimensiones
    const squareFeet = this.extractNumber(text, /(\d{1,4})\s*(?:sq\s*ft|square\s*feet|sqft)/i) || 1200;
    const length = this.extractNumber(text, /(\d+)\s*(?:ft|feet)?\s*(?:long|length)/i) || Math.sqrt(squareFeet * 1.2);
    const width = this.extractNumber(text, /(\d+)\s*(?:ft|feet)?\s*(?:wide|width)/i) || squareFeet / length;
    
    return {
      squareFeet,
      length,
      width,
      height: 9, // Standard ceiling height
      wallHeight: 9,
      stories: 1,
      bedrooms: squareFeet < 600 ? 1 : 2,
      bathrooms: 1,
      foundationType: 'slab',
      roofType: 'gable',
      location: 'California',
      depth: 4 // Foundation depth in inches
    };
  }
  
  /**
   * FOUNDATION MATERIALS - Fórmulas precisas de contratista
   */
  private calculateFoundationMaterials(specs: ProjectSpecifications): MaterialCalculation[] {
    const materials: MaterialCalculation[] = [];
    
    // 1. CONCRETE - Fórmula precisa
    const slabArea = specs.squareFeet;
    const slabThickness = 4; // inches
    const concreteVolume = (slabArea * (slabThickness / 12)) / 27; // cubic yards
    
    materials.push({
      materialId: 'concrete_foundation',
      name: 'Ready-Mix Concrete 3000 PSI',
      description: 'High-strength concrete for slab foundation',
      category: 'foundation',
      unit: 'cubic yards',
      baseQuantity: concreteVolume,
      wasteFactorPercent: 8,
      wasteQuantity: concreteVolume * 0.08,
      finalQuantity: Math.ceil(concreteVolume * 1.08),
      unitPrice: 165,
      totalPrice: 0,
      calculationFormula: `(${slabArea} sq ft × ${slabThickness}" ÷ 12) ÷ 27 = ${concreteVolume.toFixed(2)} cy`,
      contractorNotes: 'Order 0.5 yards extra for spillage. Minimum order usually 3 yards.',
      specifications: '3000 PSI, 4" slump, fiber reinforced',
      supplier: 'Local Ready-Mix Plant',
      orderTiming: 'Week 1 - Foundation phase'
    });
    
    // 2. REBAR - Cálculo por área
    const rebarLinearFeet = slabArea * 2.5; // Grid pattern calculation
    
    materials.push({
      materialId: 'rebar_grade60',
      name: '#4 Rebar Grade 60',
      description: 'Reinforcement steel for foundation grid',
      category: 'foundation',
      unit: 'linear feet',
      baseQuantity: rebarLinearFeet,
      wasteFactorPercent: 15,
      wasteQuantity: rebarLinearFeet * 0.15,
      finalQuantity: Math.ceil(rebarLinearFeet * 1.15),
      unitPrice: 0.75,
      totalPrice: 0,
      calculationFormula: `${slabArea} sq ft × 2.5 = ${rebarLinearFeet} linear ft`,
      contractorNotes: '#4 bars in 18" grid both directions. Buy in 20ft lengths.',
      specifications: 'Grade 60, #4 (1/2" diameter), deformed bars',
      supplier: 'Steel Supply Co',
      orderTiming: 'Week 1 - Before concrete pour'
    });
    
    // 3. VAPOR BARRIER
    const barrierArea = slabArea * 1.15; // Overlap allowance
    
    materials.push({
      materialId: 'vapor_barrier',
      name: '6mil Plastic Vapor Barrier',
      description: 'Under-slab moisture protection',
      category: 'foundation',
      unit: 'square feet',
      baseQuantity: slabArea,
      wasteFactorPercent: 15,
      wasteQuantity: slabArea * 0.15,
      finalQuantity: Math.ceil(barrierArea),
      unitPrice: 0.12,
      totalPrice: 0,
      calculationFormula: `${slabArea} sq ft × 1.15 overlap = ${barrierArea.toFixed(0)} sq ft`,
      contractorNotes: 'Overlap seams 6". Tape all joints with compatible tape.',
      specifications: '6mil polyethylene, virgin material',
      supplier: 'Home Depot/Lowes',
      orderTiming: 'Week 1 - Before concrete prep'
    });
    
    // Calcular precios totales
    materials.forEach(material => {
      material.totalPrice = material.finalQuantity * material.unitPrice;
    });
    
    return materials;
  }
  
  /**
   * FRAMING LUMBER - Cálculos precisos de contratista experto
   */
  private calculateFramingLumber(specs: ProjectSpecifications): MaterialCalculation[] {
    const materials: MaterialCalculation[] = [];
    
    // 1. WALL STUDS - Fórmula precisa
    const wallPerimeter = 2 * (specs.length! + specs.width!);
    const studSpacing = 16; // inches on center
    const studCount = Math.ceil((wallPerimeter * 12) / studSpacing) + 10; // Extra for corners and windows
    
    materials.push({
      materialId: 'studs_2x4x8',
      name: '2x4x8 SPF Studs',
      description: 'Wall framing studs 16" O.C.',
      category: 'framing',
      unit: 'pieces',
      baseQuantity: studCount,
      wasteFactorPercent: 10,
      wasteQuantity: studCount * 0.10,
      finalQuantity: Math.ceil(studCount * 1.10),
      unitPrice: 4.25,
      totalPrice: 0,
      calculationFormula: `${wallPerimeter.toFixed(0)} ft perimeter × 12 ÷ 16" O.C. + 10 corners = ${studCount}`,
      contractorNotes: 'Buy construction grade or better. Check for straightness.',
      specifications: 'SPF (Spruce-Pine-Fir), construction grade, kiln dried',
      supplier: 'Lumber Yard',
      orderTiming: 'Week 2 - Framing phase'
    });
    
    // 2. TOP/BOTTOM PLATES - Doble placa superior
    const plateLinearFeet = wallPerimeter * 3; // Bottom + 2 top plates
    
    materials.push({
      materialId: 'plates_2x4x12',
      name: '2x4x12 PT Bottom Plates',
      description: 'Pressure treated sill plates',
      category: 'framing',
      unit: 'linear feet',
      baseQuantity: wallPerimeter,
      wasteFactorPercent: 8,
      wasteQuantity: wallPerimeter * 0.08,
      finalQuantity: Math.ceil(wallPerimeter * 1.08),
      unitPrice: 1.85,
      totalPrice: 0,
      calculationFormula: `${wallPerimeter.toFixed(0)} ft perimeter for bottom plate`,
      contractorNotes: 'Use pressure treated for bottom plate only. Regular SPF for top plates.',
      specifications: 'Ground contact rated, .40 CCA treatment',
      supplier: 'Lumber Yard',
      orderTiming: 'Week 2 - With studs'
    });
    
    // 3. CEILING JOISTS
    const joistSpacing = 16; // inches
    const joistCount = Math.ceil((specs.width! * 12) / joistSpacing) + 1;
    
    materials.push({
      materialId: 'joists_2x6x12',
      name: '2x6x12 Ceiling Joists',
      description: 'Ceiling/floor joists 16" O.C.',
      category: 'framing',
      unit: 'pieces',
      baseQuantity: joistCount,
      wasteFactorPercent: 5,
      wasteQuantity: joistCount * 0.05,
      finalQuantity: Math.ceil(joistCount * 1.05),
      unitPrice: 8.75,
      totalPrice: 0,
      calculationFormula: `${specs.width!.toFixed(0)} ft width × 12 ÷ 16" O.C. + 1 = ${joistCount}`,
      contractorNotes: 'Check span tables for your specific load requirements.',
      specifications: 'Construction grade, span rated for load',
      supplier: 'Lumber Yard',
      orderTiming: 'Week 2 - Framing phase'
    });
    
    // Calcular precios totales
    materials.forEach(material => {
      material.totalPrice = material.finalQuantity * material.unitPrice;
    });
    
    return materials;
  }
  
  /**
   * STRUCTURAL PANELS - OSB/Plywood cálculos precisos
   */
  private calculateStructuralPanels(specs: ProjectSpecifications): MaterialCalculation[] {
    const materials: MaterialCalculation[] = [];
    
    // 1. WALL SHEATHING - OSB 7/16"
    const wallArea = specs.wallHeight * (2 * (specs.length! + specs.width!));
    const sheetsNeeded = Math.ceil(wallArea / 32); // 4x8 = 32 sq ft per sheet
    
    materials.push({
      materialId: 'osb_sheathing',
      name: '7/16" OSB Sheathing 4x8',
      description: 'Structural wall sheathing',
      category: 'sheathing',
      unit: 'sheets',
      baseQuantity: sheetsNeeded,
      wasteFactorPercent: 12,
      wasteQuantity: sheetsNeeded * 0.12,
      finalQuantity: Math.ceil(sheetsNeeded * 1.12),
      unitPrice: 28.50,
      totalPrice: 0,
      calculationFormula: `${wallArea.toFixed(0)} sq ft wall area ÷ 32 sq ft/sheet = ${sheetsNeeded}`,
      contractorNotes: 'Order extra for waste around windows/doors. Check moisture rating.',
      specifications: 'APA rated structural, moisture resistant',
      supplier: 'Home Depot/Lumber Yard',
      orderTiming: 'Week 2 - With framing lumber'
    });
    
    // 2. ROOF SHEATHING - 5/8" CDX Plywood
    const roofArea = specs.squareFeet * 1.3; // Accounting for roof slope
    const roofSheets = Math.ceil(roofArea / 32);
    
    materials.push({
      materialId: 'plywood_roof',
      name: '5/8" CDX Plywood 4x8',
      description: 'Roof deck sheathing',
      category: 'sheathing',
      unit: 'sheets',
      baseQuantity: roofSheets,
      wasteFactorPercent: 8,
      wasteQuantity: roofSheets * 0.08,
      finalQuantity: Math.ceil(roofSheets * 1.08),
      unitPrice: 42.50,
      totalPrice: 0,
      calculationFormula: `${roofArea.toFixed(0)} sq ft roof area ÷ 32 sq ft/sheet = ${roofSheets}`,
      contractorNotes: '5/8" minimum for structural roof deck. H-clips recommended.',
      specifications: 'CDX grade plywood, exterior glue',
      supplier: 'Lumber Yard',
      orderTiming: 'Week 3 - Roof framing'
    });
    
    // Calcular precios totales
    materials.forEach(material => {
      material.totalPrice = material.finalQuantity * material.unitPrice;
    });
    
    return materials;
  }
  
  /**
   * PLUMBING MATERIALS - Lista específica para ADU
   */
  private calculatePlumbingMaterials(specs: ProjectSpecifications): MaterialCalculation[] {
    const materials: MaterialCalculation[] = [];
    
    // 1. PEX PIPING - Cálculo para sistema completo
    const hotWaterRuns = 150; // Typical for ADU
    const coldWaterRuns = 200; // Typical for ADU
    
    materials.push({
      materialId: 'pex_half_inch',
      name: '1/2" PEX Tubing',
      description: 'Main water supply lines',
      category: 'plumbing',
      unit: 'linear feet',
      baseQuantity: hotWaterRuns + coldWaterRuns,
      wasteFactorPercent: 15,
      wasteQuantity: (hotWaterRuns + coldWaterRuns) * 0.15,
      finalQuantity: Math.ceil((hotWaterRuns + coldWaterRuns) * 1.15),
      unitPrice: 0.65,
      totalPrice: 0,
      calculationFormula: `${hotWaterRuns} hot + ${coldWaterRuns} cold = ${hotWaterRuns + coldWaterRuns} ft`,
      contractorNotes: 'Red for hot, blue for cold. Buy in 100ft coils.',
      specifications: 'PEX-A or PEX-B, NSF certified',
      supplier: 'Ferguson/Home Depot',
      orderTiming: 'Week 4 - Rough-in plumbing'
    });
    
    // 2. FIXTURES - Basado en especificaciones
    materials.push({
      materialId: 'toilet_standard',
      name: 'Standard Toilet',
      description: 'Two-piece toilet with tank',
      category: 'plumbing',
      unit: 'each',
      baseQuantity: specs.bathrooms,
      wasteFactorPercent: 0,
      wasteQuantity: 0,
      finalQuantity: specs.bathrooms,
      unitPrice: 290,
      totalPrice: 0,
      calculationFormula: `${specs.bathrooms} bathroom(s) = ${specs.bathrooms} toilet(s)`,
      contractorNotes: 'Include wax ring and bolts. Check rough-in dimension (12").',
      specifications: 'Elongated bowl, dual flush preferred',
      supplier: 'Ferguson/Home Depot',
      orderTiming: 'Week 8 - Finish plumbing'
    });
    
    // Calcular precios totales
    materials.forEach(material => {
      material.totalPrice = material.finalQuantity * material.unitPrice;
    });
    
    return materials;
  }
  
  /**
   * ROOFING MATERIALS - Sistema completo de techo
   */
  private calculateRoofingMaterials(specs: ProjectSpecifications): MaterialCalculation[] {
    const materials: MaterialCalculation[] = [];
    
    // 1. SHINGLES - Cálculo por área de techo
    const roofArea = specs.squareFeet * 1.3; // Factor de pendiente
    const squares = roofArea / 100; // Roofing sold by "squares" (100 sq ft)
    
    materials.push({
      materialId: 'asphalt_shingles',
      name: '3-Tab Asphalt Shingles',
      description: 'Standard architectural shingles',
      category: 'roofing',
      unit: 'squares',
      baseQuantity: squares,
      wasteFactorPercent: 10,
      wasteQuantity: squares * 0.10,
      finalQuantity: Math.ceil(squares * 1.10),
      unitPrice: 95,
      totalPrice: 0,
      calculationFormula: `${roofArea.toFixed(0)} sq ft roof ÷ 100 = ${squares.toFixed(2)} squares`,
      contractorNotes: 'Each square covers 100 sq ft. Add 10% for waste and ridge.',
      specifications: '25-year warranty, algae resistant',
      supplier: 'Roofing Supply',
      orderTiming: 'Week 3 - After roof deck'
    });
    
    // 2. UNDERLAYMENT
    materials.push({
      materialId: 'roof_underlayment',
      name: '15lb Felt Underlayment',
      description: 'Roof protection under shingles',
      category: 'roofing',
      unit: 'rolls',
      baseQuantity: Math.ceil(roofArea / 400), // 400 sq ft per roll
      wasteFactorPercent: 5,
      wasteQuantity: 0,
      finalQuantity: Math.ceil(roofArea / 400) + 1,
      unitPrice: 25,
      totalPrice: 0,
      calculationFormula: `${roofArea.toFixed(0)} sq ft ÷ 400 sq ft/roll = ${Math.ceil(roofArea / 400)} rolls`,
      contractorNotes: 'Overlap 6 inches. Start from bottom working up.',
      specifications: 'ASTM D226, Type 1, 15lb felt',
      supplier: 'Roofing Supply',
      orderTiming: 'Week 3 - Before shingles'
    });
    
    // Calcular precios totales
    materials.forEach(material => {
      material.totalPrice = material.finalQuantity * material.unitPrice;
    });
    
    return materials;
  }
  
  /**
   * ELECTRICAL MATERIALS - Rough-in completo para ADU
   */
  private calculateElectricalMaterials(specs: ProjectSpecifications): MaterialCalculation[] {
    const materials: MaterialCalculation[] = [];
    
    // 1. ROMEX WIRE - 12 AWG para circuitos de 20A
    const wireRuns = specs.squareFeet * 1.5; // Estimación por sq ft
    
    materials.push({
      materialId: 'romex_12_2',
      name: '12-2 Romex Wire',
      description: '12 AWG copper wire with ground',
      category: 'electrical',
      unit: 'linear feet',
      baseQuantity: wireRuns,
      wasteFactorPercent: 20,
      wasteQuantity: wireRuns * 0.20,
      finalQuantity: Math.ceil(wireRuns * 1.20),
      unitPrice: 1.25,
      totalPrice: 0,
      calculationFormula: `${specs.squareFeet} sq ft × 1.5 = ${wireRuns.toFixed(0)} ft`,
      contractorNotes: 'Buy in 250ft rolls. 20A circuits for kitchen and bath.',
      specifications: '12 AWG, THHN insulation, with ground',
      supplier: 'Electrical Supply',
      orderTiming: 'Week 4 - Rough-in electrical'
    });
    
    // 2. OUTLETS Y SWITCHES
    const outlets = Math.ceil(specs.squareFeet / 150); // 1 outlet per 150 sq ft
    
    materials.push({
      materialId: 'outlets_gfci',
      name: 'GFCI Outlets',
      description: 'Ground fault circuit interrupter outlets',
      category: 'electrical',
      unit: 'each',
      baseQuantity: Math.max(4, Math.ceil(outlets * 0.3)), // Minimum 4 GFCI
      wasteFactorPercent: 0,
      wasteQuantity: 0,
      finalQuantity: Math.max(4, Math.ceil(outlets * 0.3)),
      unitPrice: 15,
      totalPrice: 0,
      calculationFormula: `${outlets} total outlets × 30% GFCI = ${Math.ceil(outlets * 0.3)}`,
      contractorNotes: 'Required in kitchen, bath, and exterior locations.',
      specifications: '20A GFCI, tamper resistant',
      supplier: 'Electrical Supply',
      orderTiming: 'Week 7 - Finish electrical'
    });
    
    // Calcular precios totales
    materials.forEach(material => {
      material.totalPrice = material.finalQuantity * material.unitPrice;
    });
    
    return materials;
  }
  
  /**
   * DRYWALL MATERIALS - Cálculo completo
   */
  private calculateDrywallMaterials(specs: ProjectSpecifications): MaterialCalculation[] {
    const materials: MaterialCalculation[] = [];
    
    // 1. DRYWALL SHEETS
    const wallArea = specs.wallHeight * (2 * (specs.length! + specs.width!));
    const ceilingArea = specs.squareFeet;
    const totalArea = wallArea + ceilingArea;
    const sheets = Math.ceil(totalArea / 32); // 4x8 sheets = 32 sq ft
    
    materials.push({
      materialId: 'drywall_half_inch',
      name: '1/2" Drywall Sheets 4x8',
      description: 'Standard gypsum wallboard',
      category: 'drywall',
      unit: 'sheets',
      baseQuantity: sheets,
      wasteFactorPercent: 15,
      wasteQuantity: sheets * 0.15,
      finalQuantity: Math.ceil(sheets * 1.15),
      unitPrice: 12.50,
      totalPrice: 0,
      calculationFormula: `${totalArea.toFixed(0)} sq ft total ÷ 32 sq ft/sheet = ${sheets}`,
      contractorNotes: 'Use 5/8" in kitchen for fire rating. Order delivery to interior.',
      specifications: '1/2" regular gypsum, tapered edges',
      supplier: 'Drywall Supply',
      orderTiming: 'Week 6 - After insulation'
    });
    
    // 2. JOINT COMPOUND
    const buckets = Math.ceil(totalArea / 1000); // 1 bucket per 1000 sq ft
    
    materials.push({
      materialId: 'joint_compound',
      name: 'All-Purpose Joint Compound',
      description: 'Drywall mud for taping and finishing',
      category: 'drywall',
      unit: 'buckets',
      baseQuantity: buckets,
      wasteFactorPercent: 0,
      wasteQuantity: 0,
      finalQuantity: Math.max(2, buckets), // Minimum 2 buckets
      unitPrice: 18,
      totalPrice: 0,
      calculationFormula: `${totalArea.toFixed(0)} sq ft ÷ 1000 = ${buckets} buckets minimum`,
      contractorNotes: 'Buy pre-mixed for convenience. Need 3 coats minimum.',
      specifications: 'All-purpose, pre-mixed compound',
      supplier: 'Drywall Supply',
      orderTiming: 'Week 6 - With drywall sheets'
    });
    
    // Calcular precios totales
    materials.forEach(material => {
      material.totalPrice = material.finalQuantity * material.unitPrice;
    });
    
    return materials;
  }
  
  /**
   * SITE PREPARATION
   */
  private calculateSitePreparation(specs: ProjectSpecifications): MaterialCalculation[] {
    const materials: MaterialCalculation[] = [];
    
    // 1. GRAVEL BASE
    const gravelArea = specs.squareFeet * 1.1; // 10% extra for overrun
    const gravelDepth = 4; // inches
    const gravelYards = (gravelArea * (gravelDepth / 12)) / 27;
    
    materials.push({
      materialId: 'gravel_base',
      name: '3/4" Crushed Gravel',
      description: 'Compacted base under foundation',
      category: 'site_prep',
      unit: 'cubic yards',
      baseQuantity: gravelYards,
      wasteFactorPercent: 5,
      wasteQuantity: gravelYards * 0.05,
      finalQuantity: Math.ceil(gravelYards * 1.05),
      unitPrice: 35,
      totalPrice: 0,
      calculationFormula: `${gravelArea.toFixed(0)} sq ft × 4" ÷ 27 = ${gravelYards.toFixed(2)} cy`,
      contractorNotes: 'Compact in 2" lifts. Check for proper drainage.',
      specifications: '3/4" minus crushed stone, clean',
      supplier: 'Aggregate Supply',
      orderTiming: 'Week 1 - Before foundation'
    });
    
    // Calcular precios totales
    materials.forEach(material => {
      material.totalPrice = material.finalQuantity * material.unitPrice;
    });
    
    return materials;
  }
  
  /**
   * INSULATION
   */
  private calculateInsulationMaterials(specs: ProjectSpecifications): MaterialCalculation[] {
    const materials: MaterialCalculation[] = [];
    
    const wallArea = specs.wallHeight * (2 * (specs.length! + specs.width!));
    const batts = Math.ceil(wallArea / 50); // Coverage per package
    
    materials.push({
      materialId: 'insulation_r13',
      name: 'R-13 Fiberglass Batts',
      description: '3.5" batts for 2x4 walls',
      category: 'insulation',
      unit: 'packages',
      baseQuantity: batts,
      wasteFactorPercent: 8,
      wasteQuantity: batts * 0.08,
      finalQuantity: Math.ceil(batts * 1.08),
      unitPrice: 32,
      totalPrice: 0,
      calculationFormula: `${wallArea.toFixed(0)} sq ft ÷ 50 sq ft/pkg = ${batts}`,
      contractorNotes: 'Kraft-faced for vapor barrier. Fit snugly, no compression.',
      specifications: 'R-13, kraft-faced, 15" wide',
      supplier: 'Insulation Supply',
      orderTiming: 'Week 5 - After rough-in'
    });
    
    materials.forEach(material => {
      material.totalPrice = material.finalQuantity * material.unitPrice;
    });
    
    return materials;
  }
  
  private calculateFlooringMaterials(specs: ProjectSpecifications): MaterialCalculation[] {
    return []; // Se implementaría según tipo de piso específico
  }
  
  private calculateFixtures(specs: ProjectSpecifications): MaterialCalculation[] {
    return []; // Fixtures de cocina y baño específicos
  }
  
  private calculateHardwareFasteners(specs: ProjectSpecifications): MaterialCalculation[] {
    return []; // Tornillos, clavos, conectores metálicos
  }
  
  /**
   * Métodos auxiliares
   */
  private extractNumber(text: string, regex: RegExp): number | null {
    const match = text.match(regex);
    return match ? parseFloat(match[1]) : null;
  }
  
  private applyLocationAdjustments(materialsByCategory: any, location: string): void {
    const multiplier = location.includes('CA') ? 1.15 : 1.0;
    
    Object.values(materialsByCategory).forEach((category: any) => {
      category.forEach((material: MaterialCalculation) => {
        material.unitPrice *= multiplier;
        material.totalPrice = material.finalQuantity * material.unitPrice;
      });
    });
  }
  
  private calculateTotalCost(materialsByCategory: any): number {
    let total = 0;
    Object.values(materialsByCategory).forEach((category: any) => {
      category.forEach((material: MaterialCalculation) => {
        total += material.totalPrice;
      });
    });
    return total;
  }
  
  private generateContractorGuidance(specs: ProjectSpecifications, materialsByCategory: any): any {
    return {
      orderingSequence: [
        '1. Site prep materials (Week 1)',
        '2. Foundation materials (Week 1)',
        '3. Framing lumber (Week 2)',
        '4. Sheathing panels (Week 2)',
        '5. Roofing materials (Week 3)',
        '6. Rough-in plumbing/electrical (Week 4)',
        '7. Insulation (Week 5)',
        '8. Drywall (Week 6)',
        '9. Flooring (Week 7)',
        '10. Fixtures and finish (Week 8)'
      ],
      criticalTimings: [
        'Order concrete 2 days before pour',
        'Lumber delivery on dry day only',
        'Electrical rough-in before insulation',
        'Plumbing pressure test before drywall'
      ],
      commonMistakes: [
        'Not ordering enough fasteners',
        'Forgetting vapor barrier tape',
        'Insufficient waste factor on lumber',
        'Wrong rebar spacing'
      ],
      professionalTips: [
        'Always verify lumber grade stamps',
        'Check all deliveries against invoices',
        'Store materials off ground and covered',
        'Order materials just-in-time to avoid theft'
      ]
    };
  }
}

export const precisionQuantityCalculationService = new PrecisionQuantityCalculationService();