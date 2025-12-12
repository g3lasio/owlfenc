import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

interface MunicipalContact {
  department: string;
  phone: string | null;
  website: string | null;
  physicalAddress: string | null;
  email: string | null;
  hours: string | null;
  onlinePortal: string | null;
  dataSource: 'ai_research' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  searchQuery?: string;
  isGuidance?: boolean;
  guidanceNote?: string;
  searchTip?: string;
}

/**
 * Enhanced Permit Service with DYNAMIC Municipal Contact Search
 * Uses AI-powered research to find REAL contact information for ANY US city
 */
class EnhancedPermitService {
  
  /**
   * DYNAMIC MUNICIPAL CONTACT SEARCH
   * Uses Claude AI to search and extract real building department contact info
   * Works for ANY city in the United States
   */
  async searchMunicipalContact(address: string): Promise<MunicipalContact> {
    const startTime = Date.now();
    
    const cityState = this.extractCityState(address);
    console.log(`🔍 [MUNICIPAL-SEARCH] Searching for building department contact: ${cityState}`);
    
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        temperature: 0.1,
        system: `You are an expert at finding official US municipal building department contact information.

YOUR MISSION: Find the REAL, VERIFIED contact information for the building/permit department of the specified city.

CRITICAL RULES:
1. ONLY provide information you are CONFIDENT is accurate and current
2. Use official .gov websites, city government sources
3. Phone numbers must be real public phone numbers for the building department
4. Websites must be real, working URLs (typically .gov or official city domains)
5. If you are not 100% certain about a piece of information, set it to null
6. NEVER invent or guess contact information

RESEARCH APPROACH:
- Look for "[City Name] Building Department" or "[City Name] Development Services"
- Look for "[City Name] Permit Office" or "[City Name] Planning and Building"
- Consider county-level departments for smaller cities
- Check official city government websites

RESPOND IN JSON FORMAT ONLY:
{
  "department": "Official department name",
  "phone": "Real phone number with area code, or null if uncertain",
  "website": "Real official website URL, or null if uncertain",
  "physicalAddress": "Real street address, or null if uncertain",
  "email": "Real official email, or null if uncertain",
  "hours": "Business hours, or null if uncertain",
  "onlinePortal": "URL for online permit applications, or null",
  "confidence": "high" | "medium" | "low"
}

IMPORTANT: It is BETTER to return null for a field than to provide incorrect information.`,
        messages: [
          {
            role: "user",
            content: `Find the official building/permit department contact information for: ${cityState}

Full address context: ${address}

Search for the real, verified contact details including phone number, official website, physical address, and business hours. Only include information you are confident is accurate.`
          }
        ]
      });

      const textContent = response.content.find((c) => c.type === 'text') as { type: 'text'; text: string } | undefined;
      let rawText = textContent?.text || '{}';
      
      if (rawText.includes('```json')) {
        rawText = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (rawText.includes('```')) {
        rawText = rawText.replace(/```\s*/g, '');
      }
      
      const result = JSON.parse(rawText.trim());
      const elapsedTime = Date.now() - startTime;
      
      console.log(`✅ [MUNICIPAL-SEARCH] Found contact for ${cityState} in ${elapsedTime}ms (confidence: ${result.confidence})`);
      
      return {
        department: result.department || `${cityState} Building Department`,
        phone: result.phone || null,
        website: result.website || null,
        physicalAddress: result.physicalAddress || null,
        email: result.email || null,
        hours: result.hours || null,
        onlinePortal: result.onlinePortal || null,
        dataSource: 'ai_research',
        confidence: result.confidence || 'medium',
        searchQuery: cityState
      };
      
    } catch (error) {
      console.error(`❌ [MUNICIPAL-SEARCH] Error searching for ${cityState}:`, error);
      
      return {
        department: `${cityState} Building Department`,
        phone: null,
        website: null,
        physicalAddress: null,
        email: null,
        hours: null,
        onlinePortal: null,
        dataSource: 'fallback',
        confidence: 'low',
        searchQuery: cityState,
        isGuidance: true,
        guidanceNote: `We couldn't find verified contact information for ${cityState}. Please search for "${cityState} building permits" or "${cityState} development services" to find the official building department.`,
        searchTip: `Try searching Google for "${cityState} building department phone number" to find official contact details`
      };
    }
  }

  /**
   * Extract city and state from address
   */
  private extractCityState(address: string): string {
    const cityStateMatch = address.match(/([A-Za-z\s]+),\s*([A-Z]{2})/i);
    if (cityStateMatch) {
      return `${cityStateMatch[1].trim()}, ${cityStateMatch[2].toUpperCase()}`;
    }
    
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const stateZip = parts[parts.length - 1];
      const stateMatch = stateZip.match(/([A-Z]{2})/i);
      if (stateMatch && parts.length >= 2) {
        return `${parts[parts.length - 2]}, ${stateMatch[1].toUpperCase()}`;
      }
    }
    
    return address;
  }

  /**
   * Generate project-specific building codes and permit requirements
   * Now with DYNAMIC municipal contact search for ANY US city
   */
  async generateProjectSpecificAnalysis(address: string, projectType: string, projectDescription: string): Promise<any> {
    try {
      console.log(`🔍 Generating enhanced analysis for ${projectType} project at ${address}`);
      
      const [municipalContact, codeAnalysis] = await Promise.all([
        this.searchMunicipalContact(address),
        this.generateBuildingCodeAnalysis(address, projectType, projectDescription)
      ]);
      
      console.log(`📞 Municipal contact found: ${municipalContact.department} (${municipalContact.confidence} confidence)`);
      
      const result = codeAnalysis;
      
      result.contactInformation = [municipalContact];
      
      const hasNoContactData = !municipalContact.phone && !municipalContact.website && !municipalContact.physicalAddress;
      
      result.contactInfo = {
        department: municipalContact.department,
        phone: municipalContact.phone,
        email: municipalContact.email,
        website: municipalContact.website,
        address: municipalContact.physicalAddress,
        hours: municipalContact.hours,
        onlinePortal: municipalContact.onlinePortal,
        dataSource: municipalContact.dataSource,
        confidence: municipalContact.confidence,
        isGuidance: municipalContact.isGuidance || hasNoContactData,
        guidanceNote: municipalContact.guidanceNote || (hasNoContactData ? 
          `Our AI research couldn't find complete contact details for ${this.extractCityState(address)}. Search for "${this.extractCityState(address)} building permits" to find the official building department.` : null),
        searchTip: municipalContact.searchTip || (hasNoContactData ?
          `Try searching Google for "${this.extractCityState(address)} building department" for official contact information` : null)
      };
      
      result.contactDataSource = municipalContact.dataSource;
      
      result.meta = {
        generated: new Date().toISOString(),
        projectType,
        location: this.extractCityState(address),
        fullAddress: address,
        analysisType: 'enhanced-project-specific',
        contactSearchConfidence: municipalContact.confidence
      };

      return result;
    } catch (error) {
      console.error('Error in enhanced permit analysis:', error);
      throw new Error('Failed to generate enhanced permit analysis');
    }
  }

  /**
   * Generate building code analysis separately (for parallel execution)
   */
  private async generateBuildingCodeAnalysis(address: string, projectType: string, projectDescription: string): Promise<any> {
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
    let rawText = textContent?.text || '{}';
    
    if (rawText.includes('```json')) {
      rawText = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    } else if (rawText.includes('```')) {
      rawText = rawText.replace(/```\s*/g, '');
    }
    
    return JSON.parse(rawText.trim());
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

    return prompts[projectType] || prompts['fence'];
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

DO NOT include any contact information in your response - that will be handled separately.

OUTPUT FORMAT (JSON):
{
  "requiredPermits": [detailed permit array with specific requirements],
  "buildingCodes": [specific code sections with exact requirements],
  "process": [step-by-step compliance process],
  "specialConsiderations": [project-specific requirements],
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
- REQUIRED inspections with timing and scheduling information
- SPECIFIC forms and documentation required

DO NOT include contact information - that is handled separately.

CRITICAL: Focus on ${projectType}-specific requirements, not generic construction codes.
CRITICAL: Include exact measurements and code section references.`;
  }
}

export const enhancedPermitService = new EnhancedPermitService();
