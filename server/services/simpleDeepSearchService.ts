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

export interface SimpleDeepSearchResult {
  projectType: string;
  projectScope: string;
  materials: MaterialItem[];
  laborCosts: LaborCost[];
  totalMaterialsCost: number;
  totalLaborCost: number;
  grandTotal: number;
  confidence: number;
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
      
      return this.parseClaudeResponse(responseText);

    } catch (error) {
      console.error('❌ Simple DeepSearch error:', error);
      throw new Error('Failed to analyze project with Claude Sonnet');
    }
  }

  private buildSimplePrompt(projectDescription: string, location?: string): string {
    return `You are a construction cost estimator. Analyze this project and provide a detailed materials and labor breakdown.

PROJECT: ${projectDescription}
${location ? `LOCATION: ${location}` : ''}

Provide your response in this exact JSON format:
{
  "projectType": "Brief project type",
  "projectScope": "Detailed scope description",
  "materials": [
    {
      "id": "unique_id",
      "name": "Material name",
      "description": "Detailed description",
      "category": "Category",
      "quantity": 10,
      "unit": "pieces/sqft/lbs",
      "unitPrice": 25.50,
      "totalPrice": 255.00,
      "supplier": "Supplier name",
      "specifications": "Technical specs"
    }
  ],
  "laborCosts": [
    {
      "category": "Labor type",
      "description": "Work description", 
      "hours": 8,
      "rate": 65.00,
      "total": 520.00
    }
  ],
  "confidence": 0.85
}

Requirements:
- Include ALL necessary materials with realistic quantities
- Calculate proper labor hours and rates for the location
- Use current 2024-2025 pricing
- Be thorough and detailed
- Only return valid JSON`;
  }

  private async parseClaudeResponse(responseText: string): Promise<SimpleDeepSearchResult> {
    try {
      // Clean the response and extract JSON
      const cleanedResponse = responseText
        .replace(/```json\s*/, '')
        .replace(/```\s*$/, '')
        .trim();

      const parsedData = JSON.parse(cleanedResponse);

      // Calculate totals
      const totalMaterialsCost = parsedData.materials?.reduce((sum: number, item: any) => 
        sum + (item.totalPrice || 0), 0) || 0;
      
      const totalLaborCost = parsedData.laborCosts?.reduce((sum: number, item: any) => 
        sum + (item.total || 0), 0) || 0;

      const result: SimpleDeepSearchResult = {
        projectType: parsedData.projectType || 'Construction Project',
        projectScope: parsedData.projectScope || 'Project analysis',
        materials: parsedData.materials || [],
        laborCosts: parsedData.laborCosts || [],
        totalMaterialsCost,
        totalLaborCost,
        grandTotal: totalMaterialsCost + totalLaborCost,
        confidence: parsedData.confidence || 0.8
      };

      console.log(`✅ SIMPLE DeepSearch: Completed analysis - ${result.materials.length} materials, $${result.grandTotal.toFixed(2)} total`);
      
      return result;

    } catch (error) {
      console.error('❌ Error parsing Claude response:', error);
      throw new Error('Failed to parse Claude response');
    }
  }
}

export const simpleDeepSearchService = new SimpleDeepSearchService();