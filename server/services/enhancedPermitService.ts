import Anthropic from '@anthropic-ai/sdk';

// Create Anthropic client for Claude - more reliable than OpenAI project-scoped keys
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Enhanced Permit Service with Project-Specific Building Codes
 * Generates detailed, project-specific building codes and permit requirements
 */
class EnhancedPermitService {
  
  /**
   * Generate project-specific building codes and permit requirements
   */
  async generateProjectSpecificAnalysis(address: string, projectType: string, projectDescription: string): Promise<any> {
    try {
      console.log(`🔍 Generating enhanced analysis for ${projectType} project at ${address}`);
      
      // Project-specific building code prompts
      const projectSpecificPrompts = this.getProjectSpecificPrompts(projectType);
      
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: this.getEnhancedSystemPrompt() + "\n\nIMPORTANT: You must respond with valid JSON only. No additional text before or after the JSON object.",
        messages: [
          {
            role: "user",
            content: this.buildProjectSpecificPrompt(address, projectType, projectDescription, projectSpecificPrompts) + "\n\nRespond with valid JSON only."
          }
        ]
      });

      const textContent = response.content.find((c) => c.type === 'text') as { type: 'text'; text: string } | undefined;
      const result = JSON.parse(textContent?.text || '{}');
      
      // Add metadata
      result.meta = {
        generated: new Date().toISOString(),
        projectType,
        location: this.extractLocationFromAddress(address),
        fullAddress: address,
        analysisType: 'enhanced-project-specific'
      };

      return result;
    } catch (error) {
      console.error('Error in enhanced permit analysis:', error);
      throw new Error('Failed to generate enhanced permit analysis');
    }
  }

  /**
   * Get project-specific building code requirements
   */
  private getProjectSpecificPrompts(projectType: string): any {
    const prompts: Record<string, any> = {
      'fence': {
        buildingCodes: [
          'Property line setbacks (typically 0-6 inches from property line)',
          'Maximum height restrictions (usually 6-8 feet residential)',
          'Material specifications (wood preservative treatment requirements)',
          'Foundation requirements (concrete footings depth based on frost line)',
          'Gate requirements (self-closing mechanisms near pools)',
          'Neighbor notification requirements',
          'Corner lot visibility restrictions',
          'Utility easement compliance'
        ],
        specificCodes: [
          'IRC Section R322 - Encroachment requirements',
          'Local zoning ordinance height restrictions',
          'Pool barrier code compliance (if applicable)',
          'HOA covenant compliance requirements'
        ],
        permits: [
          'Fence/Wall permit',
          'Possible electrical permit (for gate operators)',
          'Pool barrier permit (if near pool)'
        ]
      },
      'deck': {
        buildingCodes: [
          'Structural beam sizing based on span requirements',
          'Joist spacing requirements (typically 12", 16", or 24" O.C.)',
          'Railing height requirements (36" minimum, 42" recommended)',
          'Footing depth below frost line requirements',
          'Ledger board attachment specifications',
          'Stair riser and tread dimensional requirements',
          'Guard opening restrictions (4" sphere rule)',
          'Load bearing calculations (40 PSF live load, 10 PSF dead load)'
        ],
        specificCodes: [
          'IRC Section R502 - Floor systems and decks',
          'IRC Section R312 - Guards and railings',
          'IRC Section R311 - Stairs and landings',
          'Local structural engineering requirements',
          'Flashing and waterproofing specifications'
        ],
        permits: [
          'Building permit',
          'Possible electrical permit (for lighting)',
          'Structural review (for elevated decks)'
        ]
      },
      'pool': {
        buildingCodes: [
          'Barrier height requirements (minimum 4 feet)',
          'Gate self-closing and self-latching mechanisms',
          'Electrical bonding and grounding requirements',
          'Pool equipment electrical code compliance',
          'Setback requirements from structures',
          'Drainage and water management systems',
          'Pool alarm requirements (local jurisdiction)',
          'Equipment access clearance requirements'
        ],
        specificCodes: [
          'NEC Article 680 - Swimming pools and similar installations',
          'IRC Section R322 - Pool barriers',
          'Local health department pool codes',
          'Pool equipment electrical installation requirements',
          'APSP standards compliance'
        ],
        permits: [
          'Pool permit',
          'Electrical permit',
          'Plumbing permit',
          'Fence/barrier permit',
          'Health department approval'
        ]
      },
      'addition': {
        buildingCodes: [
          'Foundation requirements matching existing structure',
          'Structural connection to existing building',
          'Egress window requirements for bedrooms',
          'HVAC system sizing and distribution',
          'Electrical system capacity and panel upgrades',
          'Insulation and energy efficiency requirements',
          'Fire separation requirements',
          'Ceiling height minimums (7\'8" typical)'
        ],
        specificCodes: [
          'IRC Section R301 - Structural design criteria',
          'IRC Section R310 - Emergency escape and rescue openings',
          'IRC Chapter 11 - Energy efficiency',
          'Local energy code compliance',
          'Fire code separation requirements'
        ],
        permits: [
          'Building permit',
          'Electrical permit',
          'Plumbing permit',
          'Mechanical permit',
          'Possible foundation permit'
        ]
      },
      'remodel': {
        buildingCodes: [
          'Accessibility compliance (ADA requirements)',
          'Electrical code updates (GFCI, AFCI requirements)',
          'Insulation and energy efficiency upgrades',
          'Window and door egress compliance',
          'Structural modifications compliance',
          'Fire safety and smoke detector requirements',
          'Ventilation system requirements',
          'Flooring and material specifications'
        ],
        specificCodes: [
          'Current IRC electrical code compliance',
          'Local energy efficiency requirements',
          'ADA compliance for commercial properties',
          'Historical preservation requirements (if applicable)'
        ],
        permits: [
          'Building permit',
          'Electrical permit',
          'Plumbing permit (if applicable)',
          'Mechanical permit (if applicable)'
        ]
      }
    };

    return prompts[projectType] || prompts['fence']; // Default to fence if type not found
  }

  /**
   * Enhanced system prompt for detailed building code analysis
   */
  private getEnhancedSystemPrompt(): string {
    return `You are a professional building code expert and permit specialist with 20+ years of experience in construction compliance.

Your mission is to provide SPECIFIC, ACTIONABLE building code requirements with EXACT code section references.

CRITICAL REQUIREMENTS:
1. Provide SPECIFIC building code sections with numbers (e.g., "IRC Section R502.3.1")
2. Include EXACT measurements and specifications (e.g., "minimum 4 feet height", "16 inches on center")
3. Reference LOCAL jurisdiction requirements when possible
4. Provide ACTIONABLE compliance steps
5. Include specific permit requirements and processes
6. Focus on APPLICABLE codes for the specific project type

OUTPUT FORMAT (JSON):
{
  "requiredPermits": [detailed permit array with specific requirements],
  "buildingCodes": [specific code sections with exact requirements],
  "process": [step-by-step compliance process],
  "specialConsiderations": [project-specific requirements],
  "contactInformation": [specific municipal contacts],
  "inspectionSchedule": [required inspections with timing],
  "complianceDocuments": [required documentation and forms]
}

FOCUS: Provide building codes that are SPECIFIC to the project type, not generic construction advice.`;
  }

  /**
   * Build project-specific analysis prompt
   */
  private buildProjectSpecificPrompt(address: string, projectType: string, projectDescription: string, projectPrompts: any): string {
    return `ANALYZE BUILDING CODE REQUIREMENTS FOR SPECIFIC PROJECT:

PROJECT DETAILS:
- Type: ${projectType}
- Location: ${address}
- Description: ${projectDescription}

SPECIFIC BUILDING CODE ANALYSIS REQUIRED:

1. PROJECT-SPECIFIC BUILDING CODES:
${projectPrompts.buildingCodes?.map((code: string, index: number) => `   ${index + 1}. ${code}`).join('\n') || ''}

2. APPLICABLE CODE SECTIONS:
${projectPrompts.specificCodes?.map((code: string, index: number) => `   ${index + 1}. ${code}`).join('\n') || ''}

3. REQUIRED PERMITS:
${projectPrompts.permits?.map((permit: string, index: number) => `   ${index + 1}. ${permit}`).join('\n') || ''}

PROVIDE SPECIFIC INFORMATION INCLUDING:

- EXACT building code section numbers with specific requirements
- SPECIFIC measurements, clearances, and specifications
- DETAILED permit requirements with application processes
- STEP-BY-STEP compliance procedures
- SPECIFIC municipal contact information for this location
- REQUIRED inspections with timing and scheduling information
- SPECIFIC forms and documentation required

CRITICAL: Focus on ${projectType}-specific requirements, not generic construction codes.
CRITICAL: Include exact measurements and code section references.
CRITICAL: Provide actionable, specific information for this exact project type.`;
  }

  /**
   * Extract location information from address
   */
  private extractLocationFromAddress(address: string): string {
    // Extract city and state from address
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts.slice(-2).join(',').trim();
    }
    return address;
  }
}

export const enhancedPermitService = new EnhancedPermitService();