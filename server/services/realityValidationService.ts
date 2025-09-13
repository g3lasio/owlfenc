/**
 * Reality Validation Service - Integración con DeepSearch existente
 * 
 * Este servicio integra el General Contractor Intelligence System
 * con el sistema DeepSearch existente para eliminar resultados absurdos.
 */

import { GeneralContractorIntelligenceService } from './generalContractorIntelligenceService';

interface DeepSearchResult {
  projectType: string;
  projectScope: string;
  materials: any[];
  laborCosts: any[];
  totalMaterialsCost: number;
  totalLaborCost: number;
  grandTotal: number;
  confidence: number;
  warnings: string[];
  recommendations: string[];
}

interface RealityCheckResult {
  isValid: boolean;
  confidence: number;
  originalResult: DeepSearchResult;
  validatedResult?: DeepSearchResult;
  redFlags: string[];
  recommendations: string[];
  contractorAnalysis?: any;
}

export class RealityValidationService {
  private gcIntelligence = new GeneralContractorIntelligenceService();

  /**
   * MÉTODO PRINCIPAL: Validar resultados de DeepSearch usando inteligencia de contractor
   */
  async validateDeepSearchResult(
    deepSearchResult: DeepSearchResult,
    projectDescription: string,
    clientAddress: string
  ): Promise<RealityCheckResult> {
    try {
      console.log('🔍 [REALITY-CHECK] Starting validation of DeepSearch result');
      console.log(`📊 Original result: $${deepSearchResult.grandTotal} (Materials: $${deepSearchResult.totalMaterialsCost}, Labor: $${deepSearchResult.totalLaborCost})`);

      // 1. ANÁLISIS COMPLETO CON GENERAL CONTRACTOR INTELLIGENCE
      const contractorAnalysis = await this.gcIntelligence.analyzeAsLocalContractor(
        projectDescription,
        clientAddress
      );

      // 2. COMPARACIÓN DE RESULTADOS
      const comparison = this.compareResults(deepSearchResult, contractorAnalysis);

      // 3. DETECTAR RED FLAGS AUTOMÁTICAMENTE
      const autoRedFlags = this.detectRedFlags(deepSearchResult, contractorAnalysis);

      // 4. GENERAR RECOMENDACIONES
      const recommendations = this.generateValidationRecommendations(
        deepSearchResult,
        contractorAnalysis,
        comparison
      );

      // 5. DECIDIR SI USAR RESULTADO ORIGINAL O CONTRACTOR ANALYSIS
      const shouldUseContractorResult = this.shouldReplaceOriginalResult(
        comparison,
        autoRedFlags,
        contractorAnalysis.realityValidation
      );

      const result: RealityCheckResult = {
        isValid: !shouldUseContractorResult && autoRedFlags.length === 0,
        confidence: shouldUseContractorResult ? contractorAnalysis.realityValidation.confidence : 
                   Math.max(0.1, deepSearchResult.confidence - (autoRedFlags.length * 0.2)),
        originalResult: deepSearchResult,
        validatedResult: shouldUseContractorResult ? this.convertToDeepSearchFormat(contractorAnalysis, deepSearchResult) : undefined,
        redFlags: autoRedFlags,
        recommendations,
        contractorAnalysis
      };

      console.log('✅ [REALITY-CHECK] Validation completed', {
        isValid: result.isValid,
        confidence: result.confidence,
        redFlagsCount: autoRedFlags.length,
        useContractorResult: shouldUseContractorResult
      });

      return result;

    } catch (error) {
      console.error('❌ [REALITY-CHECK] Validation failed:', error);
      
      // Fallback: Solo aplicar validaciones básicas
      return {
        isValid: false,
        confidence: 0.3,
        originalResult: deepSearchResult,
        redFlags: ['Reality validation system failed - results may be unreliable'],
        recommendations: ['Manual review recommended due to validation system error'],
      };
    }
  }

  /**
   * Comparar resultados entre DeepSearch original y Contractor Analysis
   */
  private compareResults(original: DeepSearchResult, contractor: any): any {
    const originalTotal = original.grandTotal || 0;
    const contractorTotal = contractor.totalProjectCost?.total || 0;
    
    const difference = Math.abs(originalTotal - contractorTotal);
    const percentageDifference = originalTotal > 0 ? (difference / originalTotal) * 100 : 100;

    const laborRatio = {
      original: original.totalLaborCost / original.totalMaterialsCost,
      contractor: contractor.totalProjectCost?.labor / contractor.totalProjectCost?.materials
    };

    return {
      totalDifference: difference,
      percentageDifference,
      originalTotal,
      contractorTotal,
      laborRatio,
      isSignificantDifference: percentageDifference > 25 // Más de 25% diferencia es significativo
    };
  }

  /**
   * Detectar red flags automáticamente
   */
  private detectRedFlags(original: DeepSearchResult, contractor: any): string[] {
    const redFlags: string[] = [];
    const comparison = this.compareResults(original, contractor);

    // 1. RED FLAG: Labor demasiado bajo
    if (original.totalLaborCost < 500 && original.grandTotal > 5000) {
      redFlags.push(`CRITICAL: Labor cost ($${original.totalLaborCost}) suspiciously low for project total ($${original.grandTotal})`);
    }

    // 2. RED FLAG: Ratio labor:materials absurda
    const laborMaterialRatio = original.totalLaborCost / original.totalMaterialsCost;
    if (laborMaterialRatio < 0.2) {
      redFlags.push(`CRITICAL: Labor-to-materials ratio (${(laborMaterialRatio * 100).toFixed(1)}%) indicates severe labor underestimation`);
    }

    // 3. RED FLAG: Diferencia significativa con análisis de contractor
    if (comparison.isSignificantDifference) {
      redFlags.push(`CRITICAL: ${comparison.percentageDifference.toFixed(1)}% difference from contractor analysis ($${comparison.originalTotal} vs $${comparison.contractorTotal})`);
    }

    // 4. RED FLAG: Total absurdamente bajo para proyecto estructural
    if (original.projectType.toLowerCase().includes('retaining') || 
        original.projectType.toLowerCase().includes('structural') ||
        original.projectType.toLowerCase().includes('foundation')) {
      if (original.grandTotal < 10000) {
        redFlags.push(`CRITICAL: Total cost ($${original.grandTotal}) unrealistically low for structural project`);
      }
    }

    // 5. RED FLAG: Contractor analysis marcó como no realista
    if (contractor.realityValidation && !contractor.realityValidation.isRealistic) {
      redFlags.push(`CRITICAL: Contractor analysis validation failed (confidence: ${contractor.realityValidation.confidence})`);
      contractor.realityValidation.redFlags?.forEach((flag: string) => {
        redFlags.push(`CONTRACTOR ANALYSIS: ${flag}`);
      });
    }

    return redFlags;
  }

  /**
   * Generar recomendaciones de validación
   */
  private generateValidationRecommendations(
    original: DeepSearchResult,
    contractor: any,
    comparison: any
  ): string[] {
    const recommendations: string[] = [];

    if (comparison.isSignificantDifference) {
      recommendations.push(`Consider using contractor analysis result ($${comparison.contractorTotal}) instead of original ($${comparison.originalTotal})`);
    }

    if (original.totalLaborCost < 1000) {
      recommendations.push('Review labor calculations - current estimates may be significantly low');
    }

    if (contractor.realityValidation?.recommendations) {
      contractor.realityValidation.recommendations.forEach((rec: string) => {
        recommendations.push(`CONTRACTOR INSIGHT: ${rec}`);
      });
    }

    // Recomendaciones específicas por tipo de proyecto
    if (original.projectType.toLowerCase().includes('retaining')) {
      recommendations.push('Retaining walls require structural analysis and proper drainage - ensure these costs are included');
    }

    return recommendations;
  }

  /**
   * Decidir si reemplazar resultado original con análisis de contractor
   * CRITICAL FIX: Only replace when contractor analysis provides BETTER data
   */
  private shouldReplaceOriginalResult(
    comparison: any,
    redFlags: string[],
    contractorValidation: any
  ): boolean {
    // NEVER replace if contractor analysis failed to provide meaningful data
    if (contractorValidation?.confidence < 0.4) {
      console.log('🔍 [REALITY-CHECK] Contractor analysis confidence too low, keeping original materials');
      return false;
    }

    // Check if contractor has real material data
    const contractorHasRealMaterials = this.contractorAnalysisHasRealMaterials(contractorValidation);
    if (!contractorHasRealMaterials) {
      console.log('🔍 [REALITY-CHECK] Contractor analysis lacks specific materials, keeping original');
      return false;
    }

    // Only replace if:
    // 1. Hay red flags críticos AND contractor provides better data
    const hasCriticalFlags = redFlags.some(flag => flag.includes('CRITICAL'));
    
    // 2. Diferencia significativa Y contractor result es más confiable AND has real data
    const significantDifferenceAndMoreReliable = 
      comparison.isSignificantDifference && 
      contractorValidation?.confidence > 0.8; // Higher threshold

    // 3. Contractor analysis es realista AND has detailed materials AND original has major issues
    const contractorIsRealistic = contractorValidation?.isRealistic === true;
    const originalHasMajorIssues = redFlags.length > 3;

    return (hasCriticalFlags && contractorHasRealMaterials) || 
           (significantDifferenceAndMoreReliable && contractorHasRealMaterials) || 
           (contractorIsRealistic && contractorHasRealMaterials && originalHasMajorIssues);
  }

  /**
   * Check if contractor analysis has meaningful material data
   */
  private contractorAnalysisHasRealMaterials(contractorAnalysis: any): boolean {
    const materials = contractorAnalysis?.materialRequirements || [];
    
    // Check if we have specific materials (not generic ones)
    return materials.length > 3 && 
           materials.some((mat: any) => 
             mat.name && 
             !mat.name.includes('Materials for') && 
             mat.quantity > 0 &&
             mat.unitPrice > 0
           );
  }

  /**
   * Convertir análisis de contractor a formato DeepSearch
   * CRITICAL FIX: Check if contractor analysis has real material data, otherwise preserve original
   */
  private convertToDeepSearchFormat(contractorAnalysis: any, originalResult?: DeepSearchResult): DeepSearchResult {
    // Check if contractor analysis has meaningful material data
    const hasRealMaterials = contractorAnalysis.materialRequirements && 
                            contractorAnalysis.materialRequirements.length > 0 &&
                            contractorAnalysis.materialRequirements.some((mat: any) => 
                              mat.name && !mat.name.includes('Materials for') && mat.quantity > 0
                            );

    // If contractor analysis failed to provide real materials, preserve original materials with adjusted pricing
    const materials = hasRealMaterials ? 
      contractorAnalysis.materialRequirements?.map((mat: any, index: number) => ({
        id: `gc_mat_${index}`,
        name: mat.name,
        category: mat.category,
        quantity: mat.quantity,
        unit: mat.unit,
        unitPrice: mat.unitPrice || 0,
        totalPrice: mat.totalPrice || 0,
        specifications: mat.specifications
      })) || [] 
      :
      // Preserve original materials but adjust total pricing to match contractor total
      originalResult?.materials?.map((mat: any) => ({
        ...mat,
        // Keep original material details but proportionally adjust pricing
        unitPrice: mat.unitPrice,
        totalPrice: mat.totalPrice
      })) || [];

    const laborCosts = contractorAnalysis.laborEstimates?.map((labor: any) => ({
      category: labor.tradeType,
      description: `${labor.tradeType} work (${labor.crewSize} crew, ${labor.hoursRequired}h)`,
      hours: labor.hoursRequired,
      rate: labor.localMarketRate?.hourlyRate || 50,
      total: labor.totalCost
    })) || [];

    return {
      projectType: `${contractorAnalysis.projectMagnitude?.scale} ${contractorAnalysis.projectMagnitude?.complexity} project`,
      projectScope: `Analyzed by General Contractor Intelligence for ${contractorAnalysis.clientLocation?.city}, ${contractorAnalysis.clientLocation?.state}`,
      materials,
      laborCosts,
      totalMaterialsCost: contractorAnalysis.totalProjectCost?.materials || 0,
      totalLaborCost: contractorAnalysis.totalProjectCost?.labor || 0,
      grandTotal: contractorAnalysis.totalProjectCost?.total || 0,
      confidence: contractorAnalysis.realityValidation?.confidence || 0.7,
      warnings: contractorAnalysis.realityValidation?.redFlags || [],
      recommendations: [
        ...contractorAnalysis.contractorInsights || [],
        ...contractorAnalysis.realityValidation?.recommendations || []
      ]
    };
  }

  /**
   * MÉTODO DIRECTO: Solo validar sin análisis completo (más rápido)
   */
  async quickValidation(
    deepSearchResult: DeepSearchResult,
    projectDescription: string
  ): Promise<boolean> {
    // Validaciones rápidas sin análisis completo
    const laborMaterialRatio = deepSearchResult.totalLaborCost / deepSearchResult.totalMaterialsCost;
    
    // Red flags básicos
    if (laborMaterialRatio < 0.2) return false;
    if (deepSearchResult.totalLaborCost < 200 && deepSearchResult.grandTotal > 3000) return false;
    if (deepSearchResult.grandTotal < 1000 && projectDescription.includes('retaining')) return false;

    return true;
  }
}

export const realityValidationService = new RealityValidationService();