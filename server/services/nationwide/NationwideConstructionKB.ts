/**
 * 🏗️ NATIONWIDE CONSTRUCTION KNOWLEDGE BASE
 * Base de conocimiento expandida para todos los estados de USA
 */

import { StateInfo, jurisdictionDetector } from './JurisdictionDetector.js';

export interface ConstructionStandards {
  buildingCodes: string[];
  permitRequirements: string[];
  inspectionStages: string[];
  specialConsiderations: string[];
  commonViolations: string[];
  typicalCosts: {
    low: number;
    high: number;
    factors: string[];
  };
}

export interface MaterialStandards {
  approvedMaterials: string[];
  prohibitedMaterials: string[];
  specifications: string[];
  localSuppliers?: string[];
}

export class NationwideConstructionKnowledgeBase {
  private readonly constructionStandards: Map<string, ConstructionStandards> = new Map();
  private readonly materialStandards: Map<string, Map<string, MaterialStandards>> = new Map();

  constructor() {
    this.initializeConstructionStandards();
    this.initializeMaterialStandards();
  }

  private initializeConstructionStandards() {
    // FENCING STANDARDS BY REGION
    this.constructionStandards.set('fencing-west', {
      buildingCodes: ['IBC Chapter 10', 'Local zoning ordinances', 'HOA regulations'],
      permitRequirements: [
        'Building permit for fences >6 feet',
        'Setback requirements: typically 5-15 feet from property line',
        'Height restrictions: 6-8 feet maximum'
      ],
      inspectionStages: ['Post-hole inspection', 'Final inspection'],
      specialConsiderations: [
        'Seismic requirements in CA/WA',
        'Fire-resistant materials in wildfire zones',
        'Pool safety requirements'
      ],
      commonViolations: [
        'Exceeding height limits',
        'Insufficient setbacks',
        'Non-approved materials'
      ],
      typicalCosts: {
        low: 15,  // per linear foot
        high: 45,
        factors: ['Material type', 'Height', 'Ground conditions', 'Local labor costs']
      }
    });

    this.constructionStandards.set('fencing-southeast', {
      buildingCodes: ['IBC Chapter 10', 'Florida Building Code (FL)', 'Local hurricane codes'],
      permitRequirements: [
        'Building permit for fences >6 feet',
        'Hurricane resistance standards (FL)',
        'Flood zone considerations'
      ],
      inspectionStages: ['Foundation inspection', 'Final structural inspection'],
      specialConsiderations: [
        'Hurricane/wind resistance ratings',
        'Flood zone requirements',
        'Termite prevention'
      ],
      commonViolations: [
        'Inadequate wind resistance',
        'Improper drainage around posts',
        'Non-hurricane rated materials'
      ],
      typicalCosts: {
        low: 12,
        high: 40,
        factors: ['Hurricane rating requirements', 'Flood considerations', 'Local codes']
      }
    });

    this.constructionStandards.set('fencing-northeast', {
      buildingCodes: ['IBC Chapter 10', 'State building codes', 'Municipal ordinances'],
      permitRequirements: [
        'Building permit required in most areas',
        'Frost line considerations',
        'Snow load calculations'
      ],
      inspectionStages: ['Footing depth inspection', 'Final inspection'],
      specialConsiderations: [
        'Frost line depth (3-4 feet)',
        'Snow load requirements',
        'Historic district restrictions'
      ],
      commonViolations: [
        'Insufficient footing depth',
        'Inadequate snow load rating',
        'Non-compliant materials in historic areas'
      ],
      typicalCosts: {
        low: 18,
        high: 50,
        factors: ['Frost line requirements', 'Snow load', 'Historic restrictions']
      }
    });

    this.constructionStandards.set('fencing-midwest', {
      buildingCodes: ['IBC Chapter 10', 'State amendments', 'Local zoning'],
      permitRequirements: [
        'Permit for fences >6 feet in most areas',
        'Tornado resistance considerations',
        'Agricultural exemptions available'
      ],
      inspectionStages: ['Post installation', 'Final inspection'],
      specialConsiderations: [
        'Tornado/severe weather resistance',
        'Agricultural vs residential requirements',
        'Seasonal installation limitations'
      ],
      commonViolations: [
        'Inadequate wind resistance',
        'Wrong permit type (ag vs residential)',
        'Seasonal work violations'
      ],
      typicalCosts: {
        low: 10,
        high: 35,
        factors: ['Weather resistance', 'Rural vs urban', 'Seasonal pricing']
      }
    });
  }

  private initializeMaterialStandards() {
    // VINYL FENCING MATERIALS
    const vinylStandards = new Map<string, MaterialStandards>();
    
    vinylStandards.set('west', {
      approvedMaterials: [
        'Virgin vinyl (PVC) with UV inhibitors',
        'Recycled vinyl (approved grades)',
        'Color-stabilized vinyl'
      ],
      prohibitedMaterials: [
        'Non-UV resistant vinyl',
        'Painted vinyl (in some areas)',
        'Non-fire retardant materials (wildfire zones)'
      ],
      specifications: [
        'Minimum wall thickness: 0.125"',
        'UV rating: 5+ years',
        'Impact resistance: ASTM D3679',
        'Fire rating required in WUI zones'
      ]
    });

    vinylStandards.set('southeast', {
      approvedMaterials: [
        'Hurricane-rated vinyl systems',
        'UV-resistant vinyl (high rating)',
        'Anti-fungal treated materials'
      ],
      prohibitedMaterials: [
        'Non-hurricane rated materials (FL)',
        'Materials without mold resistance'
      ],
      specifications: [
        'Wind resistance: 130+ mph (hurricane zones)',
        'Moisture resistance rating required',
        'Anti-microbial treatment',
        'Thermal expansion allowances'
      ]
    });

    this.materialStandards.set('vinyl', vinylStandards);

    // WOOD FENCING MATERIALS
    const woodStandards = new Map<string, MaterialStandards>();
    
    woodStandards.set('west', {
      approvedMaterials: [
        'Pressure-treated lumber (ACQ, CCA)',
        'Cedar (natural resistance)',
        'Redwood (California)',
        'Fire-retardant treated wood (wildfire zones)'
      ],
      prohibitedMaterials: [
        'Untreated softwood',
        'CCA-treated wood (residential use)',
        'Non-fire retardant in WUI zones'
      ],
      specifications: [
        'Pressure treatment: .40 CCA or ACQ equivalent',
        'Moisture content: <19%',
        'Fire retardant rating (wildfire areas)',
        'Grade: Construction grade or better'
      ]
    });

    this.materialStandards.set('wood', woodStandards);
  }

  /**
   * Obtiene estándares de construcción por proyecto y ubicación
   */
  getConstructionStandards(projectType: string, location: string): ConstructionStandards | null {
    const stateInfo = jurisdictionDetector.detectFromAddress(location);
    if (!stateInfo) return null;

    const key = `${projectType.toLowerCase()}-${stateInfo.region.toLowerCase()}`;
    return this.constructionStandards.get(key) || null;
  }

  /**
   * Obtiene estándares de materiales específicos
   */
  getMaterialStandards(materialType: string, location: string): MaterialStandards | null {
    const stateInfo = jurisdictionDetector.detectFromAddress(location);
    if (!stateInfo) return null;

    const materialMap = this.materialStandards.get(materialType.toLowerCase());
    if (!materialMap) return null;

    // Try specific region first, then general region
    return materialMap.get(stateInfo.region.toLowerCase()) || 
           materialMap.get('general') || null;
  }

  /**
   * Genera recomendaciones específicas por jurisdicción
   */
  generateJurisdictionRecommendations(projectType: string, location: string): string[] {
    const stateInfo = jurisdictionDetector.detectFromAddress(location);
    if (!stateInfo) {
      return ['Unable to determine location - please verify address and local requirements'];
    }

    const recommendations: string[] = [];

    // Estado-specific recommendations
    recommendations.push(`Contact ${stateInfo.constructionBoard} for licensing requirements`);
    recommendations.push(`Check ${stateInfo.constructionBoardUrl} for current regulations`);

    // Regional considerations
    switch (stateInfo.region) {
      case 'West':
        recommendations.push('Consider seismic and fire safety requirements');
        if (stateInfo.code === 'CA') {
          recommendations.push('Verify compliance with Title 24 energy efficiency');
        }
        break;
      
      case 'Southeast':
        recommendations.push('Ensure hurricane/wind resistance compliance');
        recommendations.push('Check flood zone requirements');
        break;
      
      case 'Northeast':
        recommendations.push('Account for frost line depth requirements');
        recommendations.push('Consider snow load calculations');
        break;
      
      case 'Midwest':
        recommendations.push('Plan for severe weather resistance');
        recommendations.push('Check for tornado safety requirements');
        break;
    }

    // License requirements
    if (stateInfo.contractorLicenseRequired) {
      recommendations.push(`Contractor license required in ${stateInfo.name}`);
    }

    // Prevailing wage
    if (stateInfo.prevailingWageRequired) {
      recommendations.push('Project may be subject to prevailing wage requirements');
    }

    return recommendations;
  }

  /**
   * Obtiene información de códigos de construcción por estado
   */
  getBuildingCodes(location: string): string[] {
    const stateInfo = jurisdictionDetector.detectFromAddress(location);
    return stateInfo?.buildingCodes || ['International Building Code (IBC)'];
  }

  /**
   * Calcula rangos de costos por región
   */
  estimateCostRange(projectType: string, location: string, linearFeet: number): {
    lowEstimate: number;
    highEstimate: number;
    factors: string[];
  } | null {
    const standards = this.getConstructionStandards(projectType, location);
    if (!standards) return null;

    return {
      lowEstimate: standards.typicalCosts.low * linearFeet,
      highEstimate: standards.typicalCosts.high * linearFeet,
      factors: standards.typicalCosts.factors
    };
  }
}

export const nationwideConstructionKB = new NationwideConstructionKnowledgeBase();