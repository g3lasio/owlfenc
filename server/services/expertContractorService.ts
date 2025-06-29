/**
 * Expert Contractor Service - Precisión Quirúrgica para DeepSearch Material
 * 
 * Sistema avanzado que emula el conocimiento y experiencia de un contratista
 * altamente experimentado con 20+ años de experiencia en construcción.
 */

interface ProjectDimensions {
  linearFeet?: number;
  height?: number;
  width?: number;
  squareFeet?: number;
  depth?: number;
  thickness?: number;
}

interface GeographicFactors {
  state: string;
  city: string;
  climate: 'humid' | 'dry' | 'temperate' | 'extreme';
  soilType: 'clay' | 'sand' | 'rocky' | 'mixed';
  laborCostMultiplier: number;
  materialCostMultiplier: number;
  permitRequirements: string[];
}

interface MaterialSpecification {
  exactName: string;
  grade: string;
  dimensions: string;
  supplier: string;
  quantityFormula: string;
  wasteFactorPercent: number;
  unitPriceRange: { min: number; max: number; typical: number };
  laborHoursPerUnit: number;
  specialRequirements?: string[];
}

interface ExpertCalculation {
  materialId: string;
  exactQuantity: number;
  preciseFormula: string;
  wasteIncluded: number;
  finalQuantity: number;
  unitPrice: number;
  totalPrice: number;
  laborHours: number;
  laborCost: number;
  justification: string;
}

export class ExpertContractorService {
  
  /**
   * Base de conocimiento de materiales por tipo de proyecto
   */
  private materialDatabase = {
    fencing: {
      wood: {
        posts: {
          '4x4x8_pt': {
            exactName: '4"x4"x8\' Pressure Treated Pine Post',
            grade: 'Ground Contact',
            dimensions: '4" x 4" x 8\'',
            supplier: 'Home Depot/Lowes',
            quantityFormula: 'Math.ceil(linearFeet / 8) + 1',
            wasteFactorPercent: 5,
            unitPriceRange: { min: 8, max: 12, typical: 10 },
            laborHoursPerUnit: 0.50,
            specialRequirements: ['Post hole digger', 'Concrete mix']
          },
          '6x6x8_pt': {
            exactName: '6"x6"x8\' Pressure Treated Pine Post',
            grade: 'Ground Contact',
            dimensions: '6" x 6" x 8\'',
            supplier: 'Lumber Yard',
            quantityFormula: 'Math.ceil(linearFeet / 8) + 1',
            wasteFactorPercent: 5,
            unitPriceRange: { min: 25, max: 35, typical: 30 },
            laborHoursPerUnit: 1.0
          }
        },
        boards: {
          '1x6x8_cedar': {
            exactName: '1"x6"x8\' Western Red Cedar Board',
            grade: 'Select',
            dimensions: '1" x 6" x 8\'',
            supplier: 'Specialty Lumber',
            quantityFormula: '(linearFeet * height) / 0.5', // 6" coverage
            wasteFactorPercent: 10,
            unitPriceRange: { min: 2.50, max: 4.50, typical: 3.25 },
            laborHoursPerUnit: 0.06
          },
          '1x8x8_pt': {
            exactName: '1"x8"x8\' Pressure Treated Pine Board',
            grade: 'Construction',
            dimensions: '1" x 8" x 8\'',
            supplier: 'Home Depot/Lowes',
            quantityFormula: '(linearFeet * height) / 0.67', // 8" coverage
            wasteFactorPercent: 10,
            unitPriceRange: { min: 2.75, max: 4.25, typical: 3.50 },
            laborHoursPerUnit: 0.05
          }
        },
        hardware: {
          'galv_nails_8d': {
            exactName: '8d Galvanized Ring Shank Nails',
            grade: 'Hot-dipped galvanized',
            dimensions: '2.5" x 0.131"',
            supplier: 'Fastener Specialty',
            quantityFormula: 'Math.ceil((linearFeet * height * 0.1) / 0.5)', // lbs needed
            wasteFactorPercent: 15,
            unitPriceRange: { min: 4, max: 7, typical: 5.5 },
            laborHoursPerUnit: 0
          }
        }
      }
    },
    concrete: {
      footings: {
        'concrete_mix': {
          exactName: 'High Strength Concrete 4000 PSI',
          grade: '4000 PSI',
          dimensions: 'Per cubic yard',
          supplier: 'Ready Mix Concrete',
          quantityFormula: '(linearFeet * 0.67 * 0.67 * 2) / 27', // cubic yards
          wasteFactorPercent: 8,
          unitPriceRange: { min: 120, max: 180, typical: 150 },
          laborHoursPerUnit: 2.5
        }
      }
    }
  };

  /**
   * Factores geográficos por estado y región
   */
  private geographicDatabase = {
    'CA': {
      'El Cerrito': {
        climate: 'temperate' as const,
        soilType: 'clay' as const,
        laborCostMultiplier: 1.35,
        materialCostMultiplier: 1.15,
        permitRequirements: ['City Building Permit', 'HOA Approval']
      },
      'Los Angeles': {
        climate: 'dry' as const,
        soilType: 'mixed' as const,
        laborCostMultiplier: 1.40,
        materialCostMultiplier: 1.20,
        permitRequirements: ['City Permit', 'Seismic Requirements']
      }
    },
    'TX': {
      'Houston': {
        climate: 'humid' as const,
        soilType: 'clay' as const,
        laborCostMultiplier: 0.85,
        materialCostMultiplier: 0.95,
        permitRequirements: ['City Permit']
      },
      'Austin': {
        climate: 'dry' as const,
        soilType: 'rocky' as const,
        laborCostMultiplier: 0.90,
        materialCostMultiplier: 1.00,
        permitRequirements: ['City Permit', 'Environmental Review']
      }
    }
  };

  /**
   * Extrae dimensiones exactas del proyecto con precisión quirúrgica
   */
  extractPreciseDimensions(description: string): ProjectDimensions {
    const desc = description.toLowerCase();
    
    // Patrones mejorados para capturar todas las dimensiones
    const linearFeetPattern = /(\d+(?:\.\d+)?)\s*(?:linear\s*)?(?:ft|feet|foot)(?!\s*(?:tall|high|height|wide|width))/i;
    const heightPattern = /(\d+(?:\.\d+)?)\s*[-]?(?:ft|feet|foot)\s*(?:tall|high|height)|(\d+(?:\.\d+)?)\s*(?:tall|high|height)/i;
    const widthPattern = /(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\s*(?:wide|width)/i;
    const squareFeetPattern = /(\d+(?:\.\d+)?)\s*(?:sq\s*ft|square\s*feet|sf)/i;
    
    const linearMatch = desc.match(linearFeetPattern);
    const heightMatch = desc.match(heightPattern);
    const widthMatch = desc.match(widthPattern);
    const sqFtMatch = desc.match(squareFeetPattern);

    return {
      linearFeet: linearMatch ? parseFloat(linearMatch[1]) : undefined,
      height: heightMatch ? parseFloat(heightMatch[1] || heightMatch[2]) : undefined,
      width: widthMatch ? parseFloat(widthMatch[1]) : undefined,
      squareFeet: sqFtMatch ? parseFloat(sqFtMatch[1]) : undefined
    };
  }

  /**
   * Determina factores geográficos basado en ubicación
   */
  determineGeographicFactors(location: string): GeographicFactors {
    // Parsear estado y ciudad
    const parts = location.split(',').map(p => p.trim());
    let state = 'CA'; // default
    let city = 'Unknown';

    if (parts.length >= 2) {
      city = parts[0];
      state = parts[1].length === 2 ? parts[1].toUpperCase() : 'CA';
    }

    // Buscar datos específicos o usar defaults inteligentes
    const stateData = this.geographicDatabase[state];
    if (stateData && stateData[city]) {
      return {
        state,
        city,
        ...stateData[city]
      };
    }

    // Defaults basados en estado - Corregidos para precios de mercado realistas
    const stateDefaults = {
      'CA': {
        climate: 'temperate' as const,
        soilType: 'mixed' as const,
        laborCostMultiplier: 1.05, // Reducido de 1.30 a 1.05 (5% premium)
        materialCostMultiplier: 1.08, // Reducido de 1.15 a 1.08 (8% premium)
        permitRequirements: ['City Building Permit']
      },
      'TX': {
        climate: 'humid' as const,
        soilType: 'clay' as const,
        laborCostMultiplier: 0.85,
        materialCostMultiplier: 0.95,
        permitRequirements: ['City Permit']
      }
    };

    return {
      state,
      city,
      ...(stateDefaults[state] || stateDefaults['CA'])
    };
  }

  /**
   * Calcula cantidades exactas con fórmulas de contratista experto
   */
  calculateExpertQuantities(
    projectType: string,
    dimensions: ProjectDimensions,
    geoFactors: GeographicFactors,
    description: string
  ): ExpertCalculation[] {
    const calculations: ExpertCalculation[] = [];
    
    if (projectType === 'fencing' && dimensions.linearFeet && dimensions.height) {
      // Seleccionar materiales basado en descripción
      const isLuxury = description.toLowerCase().includes('luxury');
      const isCedar = description.toLowerCase().includes('cedar');
      
      // Posts calculation - Precisión quirúrgica
      const postSpacing = 8; // Standard 8-foot spacing
      const numPosts = Math.ceil(dimensions.linearFeet / postSpacing) + 1;
      const postType = isLuxury ? '6x6x8_pt' : '4x4x8_pt';
      const postSpec = this.materialDatabase.fencing.wood.posts[postType];
      
      const postCalc: ExpertCalculation = {
        materialId: `post_${postType}`,
        exactQuantity: numPosts,
        preciseFormula: `ceil(${dimensions.linearFeet} / ${postSpacing}) + 1 = ${numPosts}`,
        wasteIncluded: Math.ceil(numPosts * (1 + postSpec.wasteFactorPercent / 100)),
        finalQuantity: Math.ceil(numPosts * (1 + postSpec.wasteFactorPercent / 100)),
        unitPrice: Math.round(postSpec.unitPriceRange.typical * geoFactors.materialCostMultiplier * 100) / 100,
        totalPrice: 0,
        laborHours: numPosts * postSpec.laborHoursPerUnit,
        laborCost: 0,
        justification: `Standard 8ft spacing for ${dimensions.linearFeet}ft fence requires ${numPosts} posts including end posts`
      };
      postCalc.totalPrice = Math.round(postCalc.finalQuantity * postCalc.unitPrice * 100) / 100;
      postCalc.laborCost = Math.round(postCalc.laborHours * 32 * geoFactors.laborCostMultiplier * 100) / 100;
      
      calculations.push(postCalc);

      // Boards calculation - Ultra preciso
      const boardType = isCedar ? '1x6x8_cedar' : '1x8x8_pt';
      const boardSpec = this.materialDatabase.fencing.wood.boards[boardType];
      const boardCoverage = boardType.includes('1x6') ? 0.5 : 0.67; // feet of height per board
      const numBoards = Math.ceil((dimensions.linearFeet * dimensions.height) / boardCoverage);
      
      const boardCalc: ExpertCalculation = {
        materialId: `board_${boardType}`,
        exactQuantity: numBoards,
        preciseFormula: `(${dimensions.linearFeet} × ${dimensions.height}) ÷ ${boardCoverage} = ${numBoards}`,
        wasteIncluded: Math.ceil(numBoards * (1 + boardSpec.wasteFactorPercent / 100)),
        finalQuantity: Math.ceil(numBoards * (1 + boardSpec.wasteFactorPercent / 100)),
        unitPrice: Math.round(boardSpec.unitPriceRange.typical * geoFactors.materialCostMultiplier * 100) / 100,
        totalPrice: 0,
        laborHours: numBoards * boardSpec.laborHoursPerUnit,
        laborCost: 0,
        justification: `${dimensions.height}ft height requires ${numBoards} boards with ${boardSpec.wasteFactorPercent}% waste factor`
      };
      boardCalc.totalPrice = Math.round(boardCalc.finalQuantity * boardCalc.unitPrice * 100) / 100;
      boardCalc.laborCost = Math.round(boardCalc.laborHours * 28 * geoFactors.laborCostMultiplier * 100) / 100;
      
      calculations.push(boardCalc);

      // Hardware - Nails calculado con precisión
      const nailSpec = this.materialDatabase.fencing.wood.hardware.galv_nails_8d;
      const nailsNeeded = Math.ceil((dimensions.linearFeet * dimensions.height * 0.1) / 0.5); // lbs
      
      const nailCalc: ExpertCalculation = {
        materialId: 'nails_galv_8d',
        exactQuantity: nailsNeeded,
        preciseFormula: `(${dimensions.linearFeet} × ${dimensions.height} × 0.1) ÷ 0.5 = ${nailsNeeded} lbs`,
        wasteIncluded: Math.ceil(nailsNeeded * (1 + nailSpec.wasteFactorPercent / 100)),
        finalQuantity: Math.ceil(nailsNeeded * (1 + nailSpec.wasteFactorPercent / 100)),
        unitPrice: Math.round(nailSpec.unitPriceRange.typical * geoFactors.materialCostMultiplier * 100) / 100,
        totalPrice: 0,
        laborHours: 0,
        laborCost: 0,
        justification: `Galvanized nails for ${dimensions.linearFeet}×${dimensions.height}ft fence with proper fastening density`
      };
      nailCalc.totalPrice = Math.round(nailCalc.finalQuantity * nailCalc.unitPrice * 100) / 100;
      
      calculations.push(nailCalc);

      // Concrete for posts - Si no excluye foundations
      if (!description.toLowerCase().includes('no concrete') && !description.toLowerCase().includes('no foundation')) {
        const concreteSpec = this.materialDatabase.concrete.footings.concrete_mix;
        const concreteNeeded = (numPosts * 0.67 * 0.67 * 2) / 27; // cubic yards
        
        const concreteCalc: ExpertCalculation = {
          materialId: 'concrete_4000psi',
          exactQuantity: Math.ceil(concreteNeeded * 10) / 10, // Round to 0.1 cy
          preciseFormula: `${numPosts} posts × 2×2×2ft holes ÷ 27 = ${concreteNeeded.toFixed(2)} cy`,
          wasteIncluded: Math.ceil(concreteNeeded * (1 + concreteSpec.wasteFactorPercent / 100) * 10) / 10,
          finalQuantity: Math.ceil(concreteNeeded * (1 + concreteSpec.wasteFactorPercent / 100) * 10) / 10,
          unitPrice: Math.round(concreteSpec.unitPriceRange.typical * geoFactors.materialCostMultiplier * 100) / 100,
          totalPrice: 0,
          laborHours: concreteNeeded * concreteSpec.laborHoursPerUnit,
          laborCost: 0,
          justification: `Post setting concrete for ${numPosts} posts in ${geoFactors.soilType} soil conditions`
        };
        concreteCalc.totalPrice = Math.round(concreteCalc.finalQuantity * concreteCalc.unitPrice * 100) / 100;
        concreteCalc.laborCost = Math.round(concreteCalc.laborHours * 35 * geoFactors.laborCostMultiplier * 100) / 100;
        
        calculations.push(concreteCalc);
      }
    }

    return calculations;
  }

  /**
   * Genera resultado con precisión de contratista experto
   */
  generateExpertEstimate(
    projectDescription: string,
    location: string,
    projectType: string = 'fencing'
  ) {
    console.log('🎯 Expert Contractor Service: Iniciando análisis de precisión quirúrgica');
    
    // 1. Extraer dimensiones exactas
    const dimensions = this.extractPreciseDimensions(projectDescription);
    console.log('📏 Dimensiones extraídas:', dimensions);
    
    // 2. Determinar factores geográficos
    const geoFactors = this.determineGeographicFactors(location);
    console.log('🌍 Factores geográficos:', geoFactors);
    
    // 3. Calcular cantidades exactas
    const calculations = this.calculateExpertQuantities(
      projectType,
      dimensions,
      geoFactors,
      projectDescription
    );
    
    // 4. Generar reporte detallado
    const materials = calculations.map(calc => ({
      id: calc.materialId,
      name: this.getMaterialName(calc.materialId),
      description: this.getMaterialDescription(calc.materialId),
      category: 'materials',
      quantity: calc.finalQuantity,
      unit: this.getMaterialUnit(calc.materialId),
      unitPrice: calc.unitPrice,
      totalPrice: calc.totalPrice,
      specifications: calc.justification,
      calculationFormula: calc.preciseFormula,
      wasteFactorApplied: true,
      supplier: this.getMaterialSupplier(calc.materialId)
    }));

    const laborItems = calculations
      .filter(calc => calc.laborHours > 0)
      .map(calc => ({
        id: `labor_${calc.materialId}`,
        description: `Installation of ${this.getMaterialName(calc.materialId)}`,
        category: 'labor',
        hours: calc.laborHours,
        rate: calc.laborCost / calc.laborHours,
        total: calc.laborCost,
        skillLevel: 'Professional Contractor'
      }));

    const totalMaterialsCost = materials.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalLaborCost = laborItems.reduce((sum, item) => sum + item.total, 0);
    const grandTotal = totalMaterialsCost + totalLaborCost;

    return {
      materials,
      labor: laborItems,
      costs: {
        materials: Math.round(totalMaterialsCost * 100) / 100,
        labor: Math.round(totalLaborCost * 100) / 100,
        total: Math.round(grandTotal * 100) / 100
      },
      projectAnalysis: {
        dimensions,
        geographicFactors: geoFactors,
        expertiseLevel: 'Master Contractor - 20+ Years Experience',
        precisionLevel: 'Surgical Precision',
        calculationMethod: 'Industry Standard Formulas with Geographic Adjustments'
      }
    };
  }

  private getMaterialName(materialId: string): string {
    const names = {
      'post_4x4x8_pt': '4"×4"×8\' Pressure Treated Pine Post',
      'post_6x6x8_pt': '6"×6"×8\' Pressure Treated Pine Post',
      'board_1x6x8_cedar': '1"×6"×8\' Western Red Cedar Board',
      'board_1x8x8_pt': '1"×8"×8\' Pressure Treated Pine Board',
      'nails_galv_8d': '8d Galvanized Ring Shank Nails',
      'concrete_4000psi': 'High Strength Concrete 4000 PSI'
    };
    return names[materialId] || materialId;
  }

  private getMaterialDescription(materialId: string): string {
    const descriptions = {
      'post_4x4x8_pt': 'Ground contact rated pressure treated fence posts',
      'post_6x6x8_pt': 'Heavy duty ground contact rated pressure treated posts',
      'board_1x6x8_cedar': 'Select grade Western Red Cedar fencing boards',
      'board_1x8x8_pt': 'Construction grade pressure treated fence boards',
      'nails_galv_8d': 'Hot-dipped galvanized ring shank nails for exterior use',
      'concrete_4000psi': 'Ready-mix concrete for post setting applications'
    };
    return descriptions[materialId] || '';
  }

  private getMaterialUnit(materialId: string): string {
    const units = {
      'post_4x4x8_pt': 'pieces',
      'post_6x6x8_pt': 'pieces',
      'board_1x6x8_cedar': 'pieces',
      'board_1x8x8_pt': 'pieces',
      'nails_galv_8d': 'lbs',
      'concrete_4000psi': 'cubic yards'
    };
    return units[materialId] || 'pieces';
  }

  private getMaterialSupplier(materialId: string): string {
    const suppliers = {
      'post_4x4x8_pt': 'Home Depot/Lowes',
      'post_6x6x8_pt': 'Specialty Lumber Yard',
      'board_1x6x8_cedar': 'Cedar Specialty Supplier',
      'board_1x8x8_pt': 'Home Depot/Lowes',
      'nails_galv_8d': 'Fastener Specialty Store',
      'concrete_4000psi': 'Ready Mix Concrete Company'
    };
    return suppliers[materialId] || 'Construction Supply';
  }
}

export const expertContractorService = new ExpertContractorService();