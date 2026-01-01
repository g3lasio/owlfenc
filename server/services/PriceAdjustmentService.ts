/**
 * PriceAdjustmentService
 * 
 * Servicio para ajustar precios de estimados generados por DeepSearch
 * a un precio objetivo especificado por el usuario.
 */

export interface DeepSearchMaterial {
  name: string;
  description: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  category: string;
  reason?: string;
}

export interface DeepSearchLabor {
  task: string;
  description: string;
  estimatedHours: number;
  hourlyRate: number;
  totalCost: number;
  category: string;
}

export interface DeepSearchResult {
  materials: DeepSearchMaterial[];
  laborCosts: DeepSearchLabor[];
  totalMaterialCost: number;
  totalLaborCost: number;
  totalProjectCost: number;
  recommendations?: string[];
}

export interface AdjustedItem {
  name: string;
  originalPrice: number;
  adjustedPrice: number;
  difference: number;
  percentageChange: number;
}

export interface AdjustedEstimate extends DeepSearchResult {
  adjustments: AdjustedItem[];
  adjustmentStrategy: 'proportional' | 'markup' | 'custom';
  targetPrice: number;
  originalPrice: number;
  totalAdjustment: number;
  explanation: string;
}

export type AdjustmentStrategy = 'proportional' | 'markup' | 'custom';

export class PriceAdjustmentService {
  /**
   * Ajusta un estimado de DeepSearch a un precio objetivo
   */
  adjustToTargetPrice(
    estimate: DeepSearchResult,
    targetPrice: number,
    strategy: AdjustmentStrategy = 'proportional'
  ): AdjustedEstimate {
    const originalPrice = estimate.totalProjectCost;
    const difference = targetPrice - originalPrice;
    const percentageChange = (difference / originalPrice) * 100;

    console.log(`[PRICE-ADJUSTMENT] Original: $${originalPrice}, Target: $${targetPrice}, Diff: $${difference} (${percentageChange.toFixed(2)}%)`);

    switch (strategy) {
      case 'proportional':
        return this.adjustProportional(estimate, targetPrice, difference, percentageChange);
      case 'markup':
        return this.adjustWithMarkup(estimate, targetPrice, difference, percentageChange);
      case 'custom':
        return this.adjustCustom(estimate, targetPrice, difference, percentageChange);
      default:
        return this.adjustProportional(estimate, targetPrice, difference, percentageChange);
    }
  }

  /**
   * Ajuste proporcional: distribuye el ajuste proporcionalmente entre todos los items
   */
  private adjustProportional(
    estimate: DeepSearchResult,
    targetPrice: number,
    difference: number,
    percentageChange: number
  ): AdjustedEstimate {
    const adjustmentFactor = targetPrice / estimate.totalProjectCost;
    const adjustments: AdjustedItem[] = [];

    // Ajustar materiales
    const adjustedMaterials = estimate.materials.map(material => {
      const originalPrice = material.estimatedPrice;
      const adjustedPrice = parseFloat((originalPrice * adjustmentFactor).toFixed(2));
      const itemDifference = adjustedPrice - originalPrice;

      adjustments.push({
        name: material.name,
        originalPrice,
        adjustedPrice,
        difference: itemDifference,
        percentageChange
      });

      return {
        ...material,
        estimatedPrice: adjustedPrice
      };
    });

    // Ajustar labor
    const adjustedLabor = estimate.laborCosts.map(labor => {
      const originalCost = labor.totalCost;
      const adjustedCost = parseFloat((originalCost * adjustmentFactor).toFixed(2));
      const itemDifference = adjustedCost - originalCost;

      adjustments.push({
        name: labor.task,
        originalPrice: originalCost,
        adjustedPrice: adjustedCost,
        difference: itemDifference,
        percentageChange
      });

      return {
        ...labor,
        totalCost: adjustedCost,
        hourlyRate: parseFloat((labor.hourlyRate * adjustmentFactor).toFixed(2))
      };
    });

    // Calcular nuevos totales
    const newMaterialCost = adjustedMaterials.reduce((sum, m) => sum + m.estimatedPrice, 0);
    const newLaborCost = adjustedLabor.reduce((sum, l) => sum + l.totalCost, 0);
    const newTotalCost = newMaterialCost + newLaborCost;

    const explanation = this.generateProportionalExplanation(
      estimate.totalProjectCost,
      targetPrice,
      percentageChange
    );

    return {
      materials: adjustedMaterials,
      laborCosts: adjustedLabor,
      totalMaterialCost: parseFloat(newMaterialCost.toFixed(2)),
      totalLaborCost: parseFloat(newLaborCost.toFixed(2)),
      totalProjectCost: parseFloat(newTotalCost.toFixed(2)),
      recommendations: estimate.recommendations,
      adjustments,
      adjustmentStrategy: 'proportional',
      targetPrice,
      originalPrice: estimate.totalProjectCost,
      totalAdjustment: difference,
      explanation
    };
  }

  /**
   * Ajuste con markup: agrega un markup uniforme a todos los items
   */
  private adjustWithMarkup(
    estimate: DeepSearchResult,
    targetPrice: number,
    difference: number,
    percentageChange: number
  ): AdjustedEstimate {
    // Similar a proportional pero con explicación diferente
    const result = this.adjustProportional(estimate, targetPrice, difference, percentageChange);
    
    result.adjustmentStrategy = 'markup';
    result.explanation = this.generateMarkupExplanation(
      estimate.totalProjectCost,
      targetPrice,
      percentageChange
    );

    return result;
  }

  /**
   * Ajuste custom: permite ajustar items específicos
   * (Por ahora usa proportional, pero puede extenderse)
   */
  private adjustCustom(
    estimate: DeepSearchResult,
    targetPrice: number,
    difference: number,
    percentageChange: number
  ): AdjustedEstimate {
    const result = this.adjustProportional(estimate, targetPrice, difference, percentageChange);
    
    result.adjustmentStrategy = 'custom';
    result.explanation = this.generateCustomExplanation(
      estimate.totalProjectCost,
      targetPrice,
      percentageChange
    );

    return result;
  }

  /**
   * Genera explicación para ajuste proporcional
   */
  private generateProportionalExplanation(
    originalPrice: number,
    targetPrice: number,
    percentageChange: number
  ): string {
    const direction = percentageChange > 0 ? 'incremento' : 'reducción';
    const absChange = Math.abs(percentageChange);

    return `Se aplicó un ${direction} proporcional del ${absChange.toFixed(2)}% a todos los materiales y costos de labor para alcanzar el precio objetivo de $${targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. El precio original era de $${originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
  }

  /**
   * Genera explicación para ajuste con markup
   */
  private generateMarkupExplanation(
    originalPrice: number,
    targetPrice: number,
    percentageChange: number
  ): string {
    const absChange = Math.abs(percentageChange);

    if (percentageChange > 0) {
      return `Se agregó un markup del ${absChange.toFixed(2)}% sobre el costo base de $${originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} para alcanzar el precio objetivo de $${targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Este markup cubre márgenes de ganancia y contingencias.`;
    } else {
      return `Se aplicó un descuento del ${absChange.toFixed(2)}% sobre el costo base de $${originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} para alcanzar el precio objetivo de $${targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
    }
  }

  /**
   * Genera explicación para ajuste custom
   */
  private generateCustomExplanation(
    originalPrice: number,
    targetPrice: number,
    percentageChange: number
  ): string {
    const direction = percentageChange > 0 ? 'ajuste al alza' : 'ajuste a la baja';
    const absChange = Math.abs(percentageChange);

    return `Se realizó un ${direction} personalizado del ${absChange.toFixed(2)}% para alcanzar el precio objetivo de $${targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} desde el precio original de $${originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
  }

  /**
   * Valida que el precio objetivo sea razonable
   */
  validateTargetPrice(originalPrice: number, targetPrice: number): {
    valid: boolean;
    warning?: string;
  } {
    const percentageChange = ((targetPrice - originalPrice) / originalPrice) * 100;
    const absChange = Math.abs(percentageChange);

    // Advertir si el cambio es mayor al 50%
    if (absChange > 50) {
      return {
        valid: true,
        warning: `El ajuste de ${absChange.toFixed(2)}% es significativo. Considera revisar los costos base antes de aplicar este ajuste.`
      };
    }

    // Advertir si el precio objetivo es negativo
    if (targetPrice < 0) {
      return {
        valid: false,
        warning: 'El precio objetivo no puede ser negativo.'
      };
    }

    // Advertir si el precio objetivo es muy bajo
    if (targetPrice < originalPrice * 0.3) {
      return {
        valid: false,
        warning: 'El precio objetivo es demasiado bajo (menos del 30% del costo original). Esto podría resultar en pérdidas.'
      };
    }

    return { valid: true };
  }
}

// Exportar instancia singleton
export const priceAdjustmentService = new PriceAdjustmentService();
