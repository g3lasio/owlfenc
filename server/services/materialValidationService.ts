/**
 * Material Validation Service - Sistema Infalible
 * 
 * Sistema de validación de materiales críticos que garantiza que ningún
 * material esencial sea omitido en los análisis de DeepSearch.
 */

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

interface CriticalMaterialCategory {
  name: string;
  required: boolean;
  keywords: string[];
  minimumQuantity?: number;
  warningMessage: string;
}

interface ProjectValidationRules {
  [projectType: string]: {
    criticalCategories: CriticalMaterialCategory[];
    optionalCategories: string[];
    warningThresholds: {
      totalCost: { min: number; max: number };
      materialCount: { min: number; max: number };
    };
  };
}

interface ValidationResult {
  isComplete: boolean;
  missingCritical: string[];
  warnings: string[];
  recommendations: string[];
  confidence: number;
  supplementaryAnalysisNeeded: boolean;
}

export class MaterialValidationService {
  
  /**
   * Base de datos de materiales críticos por tipo de proyecto
   */
  private validationRules: ProjectValidationRules = {
    fencing: {
      criticalCategories: [
        {
          name: 'posts',
          required: true,
          keywords: ['post', 'pole', 'support', '4x4', '6x6'],
          minimumQuantity: 2,
          warningMessage: 'Fence posts are essential - cannot build fence without structural posts'
        },
        {
          name: 'boards_or_panels',
          required: true,
          keywords: ['board', 'panel', 'slat', 'picket', '1x6', '1x8', 'cedar', 'pine'],
          warningMessage: 'Fence boards/panels are required for the actual fence surface'
        },
        {
          name: 'hardware',
          required: true,
          keywords: ['nail', 'screw', 'bolt', 'bracket', 'hinge', 'galvanized'],
          warningMessage: 'Hardware/fasteners are critical for assembly'
        },
        {
          name: 'concrete_or_foundation',
          required: true,
          keywords: ['concrete', 'cement', 'mix', 'foundation', 'footing'],
          warningMessage: 'Concrete is required for setting fence posts properly'
        }
      ],
      optionalCategories: ['gate', 'paint', 'stain', 'cap', 'trim'],
      warningThresholds: {
        totalCost: { min: 15, max: 50 }, // per linear foot
        materialCount: { min: 4, max: 15 }
      }
    },
    
    roofing: {
      criticalCategories: [
        {
          name: 'shingles_or_material',
          required: true,
          keywords: ['shingle', 'tile', 'metal', 'membrane', 'asphalt', 'composite'],
          warningMessage: 'Primary roofing material is essential'
        },
        {
          name: 'underlayment',
          required: true,
          keywords: ['underlayment', 'felt', 'synthetic', 'barrier', 'ice dam'],
          warningMessage: 'Underlayment protects against water infiltration'
        },
        {
          name: 'fasteners',
          required: true,
          keywords: ['nail', 'screw', 'fastener', 'roofing nail'],
          warningMessage: 'Fasteners are critical for securing roofing material'
        },
        {
          name: 'flashing',
          required: true,
          keywords: ['flashing', 'drip edge', 'valley', 'step flashing'],
          warningMessage: 'Flashing prevents water leaks at critical points'
        }
      ],
      optionalCategories: ['ventilation', 'gutter', 'trim'],
      warningThresholds: {
        totalCost: { min: 8, max: 25 }, // per square foot
        materialCount: { min: 4, max: 12 }
      }
    },
    
    foundation: {
      criticalCategories: [
        {
          name: 'concrete',
          required: true,
          keywords: ['concrete', 'cement', 'ready mix', 'psi'],
          warningMessage: 'Concrete is the primary foundation material'
        },
        {
          name: 'rebar',
          required: true,
          keywords: ['rebar', 'reinforcement', 'steel bar', '#4', '#5'],
          warningMessage: 'Rebar provides structural reinforcement'
        },
        {
          name: 'forms',
          required: true,
          keywords: ['form', 'lumber', '2x8', '2x10', 'plywood'],
          warningMessage: 'Forms contain concrete during pour'
        },
        {
          name: 'vapor_barrier',
          required: true,
          keywords: ['vapor barrier', 'plastic', 'membrane', 'moisture'],
          warningMessage: 'Vapor barrier prevents moisture infiltration'
        }
      ],
      optionalCategories: ['insulation', 'anchor'],
      warningThresholds: {
        totalCost: { min: 12, max: 35 }, // per square foot
        materialCount: { min: 4, max: 10 }
      }
    },
    
    flooring: {
      criticalCategories: [
        {
          name: 'flooring_material',
          required: true,
          keywords: ['laminate', 'hardwood', 'vinyl', 'tile', 'plank', 'board'],
          warningMessage: 'Primary flooring material is essential'
        },
        {
          name: 'underlayment',
          required: true,
          keywords: ['underlayment', 'padding', 'foam', 'moisture barrier'],
          warningMessage: 'Underlayment provides stability and moisture protection'
        },
        {
          name: 'transition_strips',
          required: true,
          keywords: ['transition', 'molding', 'quarter round', 'shoe molding', 'trim'],
          warningMessage: 'Transition pieces provide finished appearance'
        }
      ],
      optionalCategories: ['adhesive', 'sealer'],
      warningThresholds: {
        totalCost: { min: 3, max: 15 }, // per square foot
        materialCount: { min: 3, max: 8 }
      }
    },
    
    concrete: {
      criticalCategories: [
        {
          name: 'concrete_mix',
          required: true,
          keywords: ['concrete', 'cement', 'ready mix', 'psi', 'cubic yard'],
          warningMessage: 'Concrete mix is the primary material'
        },
        {
          name: 'reinforcement',
          required: true,
          keywords: ['rebar', 'mesh', 'fiber', 'wire mesh', 'reinforcement'],
          warningMessage: 'Reinforcement prevents cracking and adds strength'
        }
      ],
      optionalCategories: ['sealer', 'color', 'texture'],
      warningThresholds: {
        totalCost: { min: 8, max: 20 }, // per square foot
        materialCount: { min: 2, max: 8 }
      }
    }
  };

  /**
   * Valida que una lista de materiales esté completa para el tipo de proyecto
   */
  validateMaterialCompleteness(
    materials: MaterialItem[],
    projectType: string,
    projectDescription: string
  ): ValidationResult {
    console.log(`🔍 Validating material completeness for ${projectType} project`);
    
    const rules = this.getValidationRules(projectType);
    const missingCritical: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // 1. Verificar categorías críticas
    for (const category of rules.criticalCategories) {
      const found = this.findMaterialsInCategory(materials, category);
      
      if (found.length === 0 && category.required) {
        missingCritical.push(category.name);
        warnings.push(`❌ CRITICAL MISSING: ${category.warningMessage}`);
      } else if (found.length > 0 && category.minimumQuantity) {
        const totalQuantity = found.reduce((sum, mat) => sum + mat.quantity, 0);
        if (totalQuantity < category.minimumQuantity) {
          warnings.push(`⚠️ Low quantity for ${category.name}: ${totalQuantity} (min recommended: ${category.minimumQuantity})`);
        }
      }
    }
    
    // 2. Verificar umbrales de costo y cantidad
    const totalCost = materials.reduce((sum, mat) => sum + mat.totalPrice, 0);
    const materialCount = materials.length;
    
    if (totalCost < rules.warningThresholds.totalCost.min * this.estimateProjectSize(projectDescription)) {
      warnings.push(`💰 Total cost seems low for this project size: $${totalCost.toFixed(2)}`);
    }
    
    if (materialCount < rules.warningThresholds.materialCount.min) {
      warnings.push(`📦 Material count seems low: ${materialCount} items (expected min: ${rules.warningThresholds.materialCount.min})`);
    }
    
    // 3. Generar recomendaciones
    if (missingCritical.length === 0) {
      recommendations.push('✅ All critical material categories are present');
    } else {
      recommendations.push(`🔧 Run supplementary analysis to find: ${missingCritical.join(', ')}`);
    }
    
    // 4. Calcular confianza
    const completeness = (rules.criticalCategories.length - missingCritical.length) / rules.criticalCategories.length;
    const confidence = Math.max(0.3, completeness * 0.9); // Never below 30%
    
    console.log(`✅ Validation complete: ${missingCritical.length} missing critical, confidence: ${(confidence * 100).toFixed(1)}%`);
    
    return {
      isComplete: missingCritical.length === 0,
      missingCritical,
      warnings,
      recommendations,
      confidence,
      supplementaryAnalysisNeeded: missingCritical.length > 0
    };
  }

  /**
   * Genera análisis suplementario para materiales faltantes
   */
  generateSupplementaryAnalysisPrompt(
    missingCategories: string[],
    projectType: string,
    projectDescription: string,
    location?: string
  ): string {
    const rules = this.getValidationRules(projectType);
    const missingDetails = missingCategories.map(cat => {
      const category = rules.criticalCategories.find(c => c.name === cat);
      return {
        name: cat,
        keywords: category?.keywords || [],
        reason: category?.warningMessage || ''
      };
    });

    return `
CRITICAL MATERIAL RECOVERY ANALYSIS

Original project analysis was INCOMPLETE. You must find the missing critical materials listed below.

PROJECT: ${projectDescription}
LOCATION: ${location || 'United States'}
PROJECT TYPE: ${projectType}

MISSING CRITICAL MATERIALS:
${missingDetails.map(detail => `
- ${detail.name.toUpperCase()}
  Keywords: ${detail.keywords.join(', ')}
  Why Critical: ${detail.reason}
`).join('')}

INSTRUCTIONS:
1. Focus ONLY on finding these missing critical materials
2. Use precise contractor formulas for quantities
3. Include current market prices for the location
4. Specify exact technical details and suppliers
5. DO NOT repeat materials already provided

Respond in this exact JSON format:
{
  "supplementaryMaterials": [
    {
      "id": "sup_001",
      "name": "Exact technical name",
      "description": "Detailed description",
      "category": "category_name",
      "quantity": number,
      "unit": "unit",
      "unitPrice": price,
      "totalPrice": total,
      "specifications": "Technical specs",
      "supplier": "Supplier name",
      "criticalFor": "which missing category this addresses"
    }
  ],
  "analysis": "Brief explanation of why these materials were initially missed"
}

ALL TEXT MUST BE IN ENGLISH ONLY.
`;
  }

  /**
   * Busca materiales que pertenecen a una categoría específica
   */
  private findMaterialsInCategory(materials: MaterialItem[], category: CriticalMaterialCategory): MaterialItem[] {
    return materials.filter(material => {
      const name = material.name.toLowerCase();
      const description = (material.description || '').toLowerCase();
      const category_field = (material.category || '').toLowerCase();
      
      return category.keywords.some(keyword => 
        name.includes(keyword.toLowerCase()) ||
        description.includes(keyword.toLowerCase()) ||
        category_field.includes(keyword.toLowerCase())
      );
    });
  }

  /**
   * Obtiene reglas de validación para un tipo de proyecto
   */
  private getValidationRules(projectType: string) {
    const normalizedType = projectType.toLowerCase();
    
    // Mapeo de variaciones de nombres de proyecto
    if (normalizedType.includes('fence') || normalizedType.includes('fencing')) {
      return this.validationRules.fencing;
    }
    if (normalizedType.includes('roof') || normalizedType.includes('roofing')) {
      return this.validationRules.roofing;
    }
    if (normalizedType.includes('foundation') || normalizedType.includes('footing')) {
      return this.validationRules.foundation;
    }
    if (normalizedType.includes('floor') || normalizedType.includes('flooring')) {
      return this.validationRules.flooring;
    }
    if (normalizedType.includes('concrete') || normalizedType.includes('slab')) {
      return this.validationRules.concrete;
    }
    
    // Default a fencing si no se encuentra tipo específico
    return this.validationRules.fencing;
  }

  /**
   * Estima el tamaño del proyecto basado en la descripción
   */
  private estimateProjectSize(description: string): number {
    const linearFeetMatch = description.match(/(\d+)\s*(?:linear\s*)?(?:ft|feet|foot)/i);
    const squareFeetMatch = description.match(/(\d+)\s*(?:sq\s*ft|square\s*feet)/i);
    
    if (linearFeetMatch) {
      return parseInt(linearFeetMatch[1]);
    }
    if (squareFeetMatch) {
      return parseInt(squareFeetMatch[1]);
    }
    
    // Default size estimation
    return 100;
  }

  /**
   * Valida que los materiales tengan precios razonables
   */
  validatePricingReasonableness(materials: MaterialItem[], projectType: string): string[] {
    const warnings: string[] = [];
    const rules = this.getValidationRules(projectType);
    
    materials.forEach(material => {
      // Verificar precios unitarios sospechosamente bajos o altos
      if (material.unitPrice < 0.10) {
        warnings.push(`💰 Suspiciously low unit price for ${material.name}: $${material.unitPrice}`);
      }
      
      if (material.unitPrice > 1000 && !material.name.toLowerCase().includes('equipment')) {
        warnings.push(`💰 Very high unit price for ${material.name}: $${material.unitPrice} - verify accuracy`);
      }
      
      // Verificar cantidades sospechosas
      if (material.quantity === 0) {
        warnings.push(`📦 Zero quantity for ${material.name} - this should be removed or corrected`);
      }
      
      if (material.quantity > 10000 && material.unit !== 'piece' && material.unit !== 'linear_ft') {
        warnings.push(`📦 Very high quantity for ${material.name}: ${material.quantity} ${material.unit}`);
      }
    });
    
    return warnings;
  }
}

export const materialValidationService = new MaterialValidationService();