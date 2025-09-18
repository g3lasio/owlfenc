/**
 * Simple DeepSearch Service - ONLY Claude Sonnet
 * 
 * Versión ultra-simplificada que solo usa Claude Sonnet sin validaciones complejas
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

export interface LaborCost {
  category: string;
  description: string;
  hours: number;
  rate: number;
  total: number;
}

export interface ProfessionalEstimateBreakdown {
  materials: {
    items: MaterialItem[];
    subtotal: number;
    waste: number;
    freight: number;
    total: number;
  };
  labor: {
    items: LaborCost[];
    subtotal: number;
    burden: number;
    mobilization: number;
    total: number;
  };
  permits: {
    description: string;
    estimated: number;
  };
  overhead: {
    percentage: number;
    amount: number;
    description: string;
  };
  profit: {
    percentage: number;
    amount: number;
    description: string;
  };
  contingency: {
    percentage: number;
    amount: number;
    description: string;
  };
  salesTax: {
    percentage: number;
    amount: number;
    jurisdiction: string;
  };
  subtotals: {
    materials: number;
    labor: number;
    permits: number;
    beforeTaxAndFees: number;
    overhead: number;
    profit: number;
    contingency: number;
    salesTax: number;
    finalTotal: number;
  };
}

export interface SimpleDeepSearchResult {
  projectType: string;
  projectScope: string;
  materials: MaterialItem[];
  laborCosts: LaborCost[];
  totalMaterialsCost: number;
  totalLaborCost: number;
  grandTotal: number;
  confidence: number;
  // New professional structure
  professionalBreakdown: ProfessionalEstimateBreakdown;
  subtotals: {
    materials: number;
    labor: number;
    permits: number;
    beforeTaxAndFees: number;
    overhead: number;
    profit: number;
    contingency: number;
    salesTax: number;
    finalTotal: number;
  };
}

export class SimpleDeepSearchService {
  private readonly MODEL = 'claude-3-7-sonnet-20250219';

  /**
   * Análisis simple con SOLO Claude Sonnet - sin validaciones complejas
   */
  async analyzeProject(projectDescription: string, location?: string): Promise<SimpleDeepSearchResult> {
    try {
      console.log('🔍 SIMPLE DeepSearch: Iniciando análisis con Claude Sonnet únicamente');

      const response = await anthropic.messages.create({
        model: this.MODEL,
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: this.buildSimplePrompt(projectDescription, location)
          }
        ]
      });

      const responseText = response.content[0]?.type === 'text' 
        ? response.content[0].text 
        : '';

      console.log('🔍 Claude response received, parsing...');
      
      return this.parseClaudeResponse(responseText, location);

    } catch (error) {
      console.error('❌ Simple DeepSearch error:', error);
      throw new Error('Failed to analyze project with Claude Sonnet');
    }
  }

  private buildSimplePrompt(projectDescription: string, location?: string): string {
    return `You are a professional construction estimator creating a detailed bid. Generate a comprehensive materials and labor breakdown for professional estimation.

PROJECT: ${projectDescription}
${location ? `LOCATION: ${location}` : ''}

CRITICAL REQUIREMENTS:
- Include ALL materials needed (don't miss hardware, fasteners, finishing materials)
- Use 2-person crew for labor calculations (realistic productivity)
- Base labor rates for ${location || 'the region'} market 2024-2025
- Include proper crew hours (not individual hours)
- Specify exact materials with real supplier pricing

Provide your response in this exact JSON format:
{
  "projectType": "Specific project type",
  "projectScope": "Complete detailed scope with deliverables",
  "materials": [
    {
      "id": "unique_id",
      "name": "Exact material name",
      "description": "Detailed specs and usage",
      "category": "Structural/Hardware/Finishing/Tools",
      "quantity": 10,
      "unit": "pieces/sqft/lbs/CY",
      "unitPrice": 25.50,
      "totalPrice": 255.00,
      "supplier": "Home Depot/Lowe's/Local supplier",
      "specifications": "Grade, rating, dimensions, quality"
    }
  ],
  "laborCosts": [
    {
      "category": "Specific work phase",
      "description": "Detailed work description for 2-person crew", 
      "hours": 8,
      "rate": 75.00,
      "total": 600.00
    }
  ],
  "confidence": 0.85
}

LABOR MUST INCLUDE:
- Site preparation and layout
- All installation phases
- Mobilization/demobilization
- Cleanup and final inspection
- Use 2-person crew rates (higher $/hr than single person)

MATERIALS MUST BE COMPLETE:
- All structural materials
- All hardware and fasteners  
- All finishing materials
- Basic tools/consumables if needed

Only return valid JSON - no explanations outside the JSON.`;
  }

  private async parseClaudeResponse(responseText: string, location?: string): Promise<SimpleDeepSearchResult> {
    try {
      // Clean the response and extract JSON
      const cleanedResponse = responseText
        .replace(/```json\s*/, '')
        .replace(/```\s*$/, '')
        .trim();

      const parsedData = JSON.parse(cleanedResponse);

      // Basic totals from Claude
      const baseMaterialsCost = parsedData.materials?.reduce((sum: number, item: any) => 
        sum + (item.totalPrice || 0), 0) || 0;
      
      const baseLaborCost = parsedData.laborCosts?.reduce((sum: number, item: any) => 
        sum + (item.total || 0), 0) || 0;

      // Build professional breakdown
      console.log('🔍 Building professional breakdown...');
      const professionalBreakdown = this.calculateProfessionalBreakdown(
        parsedData.materials || [],
        parsedData.laborCosts || [],
        baseMaterialsCost,
        baseLaborCost,
        location
      );

      console.log('🔍 Professional breakdown result:', {
        hasBreakdown: !!professionalBreakdown,
        hasSubtotals: !!professionalBreakdown?.subtotals,
        hasFinalTotal: !!professionalBreakdown?.subtotals?.finalTotal,
        finalTotal: professionalBreakdown?.subtotals?.finalTotal
      });

      const result: SimpleDeepSearchResult = {
        projectType: parsedData.projectType || 'Construction Project',
        projectScope: parsedData.projectScope || 'Project analysis',
        materials: parsedData.materials || [],
        laborCosts: parsedData.laborCosts || [],
        totalMaterialsCost: professionalBreakdown.materials.total,
        totalLaborCost: professionalBreakdown.labor.total,
        grandTotal: professionalBreakdown.subtotals.finalTotal,
        confidence: parsedData.confidence || 0.8,
        professionalBreakdown,
        subtotals: professionalBreakdown.subtotals
      };

      console.log(`✅ PROFESSIONAL DeepSearch: ${result.materials.length} materials, $${result.grandTotal.toFixed(2)} total professional estimate`);
      
      return result;

    } catch (error) {
      console.error('❌ Error parsing Claude response:', error);
      throw new Error('Failed to parse Claude response');
    }
  }

  private calculateProfessionalBreakdown(
    materials: MaterialItem[],
    laborCosts: LaborCost[],
    baseMaterialsCost: number,
    baseLaborCost: number,
    location?: string
  ): ProfessionalEstimateBreakdown {
    
    // Materials with professional additions
    const wastePercentage = 0.07; // 7% waste/merma
    const wasteAmount = baseMaterialsCost * wastePercentage;
    const freightAmount = this.calculateFreight(baseMaterialsCost);
    const totalMaterials = baseMaterialsCost + wasteAmount + freightAmount;

    // Labor with professional additions  
    const burdenPercentage = 0.25; // 25% burden (taxes, insurance, etc.)
    const burdenAmount = baseLaborCost * burdenPercentage;
    const mobilizationAmount = this.calculateMobilization(baseLaborCost);
    const totalLabor = baseLaborCost + burdenAmount + mobilizationAmount;

    // Permits based on location
    const permits = this.calculatePermits(location);

    // Subtotal before overhead/profit
    const beforeOverhead = totalMaterials + totalLabor + permits.estimated;

    // Professional business structure
    const overheadPercentage = 0.15; // 15% overhead
    const overheadAmount = beforeOverhead * overheadPercentage;

    const profitPercentage = 0.12; // 12% profit
    const profitAmount = (beforeOverhead + overheadAmount) * profitPercentage;

    const contingencyPercentage = 0.08; // 8% contingency
    const contingencyAmount = (beforeOverhead + overheadAmount + profitAmount) * contingencyPercentage;

    // Sales tax
    const salesTax = this.calculateSalesTax(totalMaterials, location);

    // Final total
    const finalTotal = beforeOverhead + overheadAmount + profitAmount + contingencyAmount + salesTax.amount;

    const subtotals = {
      materials: totalMaterials,
      labor: totalLabor,
      permits: permits.estimated,
      beforeTaxAndFees: beforeOverhead,
      overhead: overheadAmount,
      profit: profitAmount,
      contingency: contingencyAmount,
      salesTax: salesTax.amount,
      finalTotal
    };

    return {
      materials: {
        items: materials,
        subtotal: baseMaterialsCost,
        waste: wasteAmount,
        freight: freightAmount,
        total: totalMaterials
      },
      labor: {
        items: laborCosts,
        subtotal: baseLaborCost,
        burden: burdenAmount,
        mobilization: mobilizationAmount,
        total: totalLabor
      },
      permits,
      overhead: {
        percentage: overheadPercentage,
        amount: overheadAmount,
        description: "Business overhead (office, tools, vehicles, insurance, administration)"
      },
      profit: {
        percentage: profitPercentage,
        amount: profitAmount,
        description: "Contractor profit margin"
      },
      contingency: {
        percentage: contingencyPercentage,
        amount: contingencyAmount,
        description: "Contingency for unforeseen conditions (weather, site access, scope changes)"
      },
      salesTax,
      subtotals
    };
  }

  private calculateFreight(materialsCost: number): number {
    // Base freight calculation
    if (materialsCost < 500) return 75;
    if (materialsCost < 1500) return 125;
    if (materialsCost < 3000) return 175;
    return Math.max(200, materialsCost * 0.08);
  }

  private calculateMobilization(laborCost: number): number {
    // Mobilization based on job size
    if (laborCost < 1000) return 150;
    if (laborCost < 3000) return 250;
    return Math.max(350, laborCost * 0.12);
  }

  private calculatePermits(location?: string): { description: string; estimated: number } {
    const isCA = location?.toLowerCase().includes('california') || location?.toLowerCase().includes('ca');
    
    if (isCA) {
      return {
        description: "Building permits and inspections (California jurisdiction)",
        estimated: 400
      };
    }
    
    return {
      description: "Building permits and inspections (local jurisdiction)",
      estimated: 300
    };
  }

  private calculateSalesTax(materialsCost: number, location?: string): { percentage: number; amount: number; jurisdiction: string } {
    let taxRate = 0.10; // 10% default
    let jurisdiction = "Local";

    if (location?.toLowerCase().includes('california') || location?.toLowerCase().includes('ca')) {
      taxRate = 0.0875; // 8.75% CA average
      jurisdiction = "California";
    } else if (location?.toLowerCase().includes('texas') || location?.toLowerCase().includes('tx')) {
      taxRate = 0.0825; // 8.25% TX average  
      jurisdiction = "Texas";
    } else if (location?.toLowerCase().includes('florida') || location?.toLowerCase().includes('fl')) {
      taxRate = 0.07; // 7% FL average
      jurisdiction = "Florida";
    }

    return {
      percentage: taxRate,
      amount: materialsCost * taxRate,
      jurisdiction
    };
  }
}

export const simpleDeepSearchService = new SimpleDeepSearchService();