import Anthropic from '@anthropic-ai/sdk';

// Create Anthropic client for Claude - more reliable than OpenAI project-scoped keys
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Verified Municipal Building Department Directory
 * Real contact information for major US cities - verified data only
 */
const MUNICIPAL_CONTACTS: Record<string, any> = {
  'los angeles, ca': {
    department: 'Los Angeles Department of Building and Safety (LADBS)',
    phone: '(213) 482-7077',
    website: 'https://www.ladbs.org',
    physicalAddress: '201 N. Figueroa Street, Los Angeles, CA 90012',
    email: 'ladbs.webteam@lacity.org',
    onlinePortal: 'https://www.ladbsservices.lacity.org/OnlineServices/',
    hours: 'Mon-Fri 8:00 AM - 4:00 PM',
    state: 'CA'
  },
  'san diego, ca': {
    department: 'San Diego Development Services Department',
    phone: '(619) 446-5000',
    website: 'https://www.sandiego.gov/development-services',
    physicalAddress: '1222 First Avenue, San Diego, CA 92101',
    onlinePortal: 'https://www.sandiego.gov/development-services/permits',
    hours: 'Mon-Fri 8:00 AM - 5:00 PM',
    state: 'CA'
  },
  'san francisco, ca': {
    department: 'San Francisco Department of Building Inspection (DBI)',
    phone: '(628) 652-3200',
    website: 'https://sf.gov/departments/department-building-inspection',
    physicalAddress: '49 South Van Ness Ave, San Francisco, CA 94103',
    onlinePortal: 'https://sf.gov/topics/permits',
    hours: 'Mon-Fri 8:00 AM - 4:00 PM',
    state: 'CA'
  },
  'san jose, ca': {
    department: 'San Jose Building Division',
    phone: '(408) 535-3555',
    website: 'https://www.sanjoseca.gov/your-government/departments/planning-building-code-enforcement/building-division',
    physicalAddress: '200 E. Santa Clara Street, San Jose, CA 95113',
    hours: 'Mon-Fri 8:00 AM - 5:00 PM',
    state: 'CA'
  },
  'houston, tx': {
    department: 'Houston Permitting Center',
    phone: '(832) 394-8880',
    website: 'https://www.houstonpermittingcenter.org',
    physicalAddress: '1002 Washington Avenue, Houston, TX 77002',
    onlinePortal: 'https://www.houstonpermittingcenter.org/permits',
    hours: 'Mon-Fri 8:00 AM - 5:00 PM',
    state: 'TX'
  },
  'dallas, tx': {
    department: 'Dallas Development Services',
    phone: '(214) 670-3207',
    website: 'https://dallascityhall.com/departments/sustainabledevelopment/buildinginspection/Pages/default.aspx',
    physicalAddress: '320 E. Jefferson Blvd, Dallas, TX 75203',
    hours: 'Mon-Fri 7:30 AM - 5:00 PM',
    state: 'TX'
  },
  'austin, tx': {
    department: 'Austin Development Services Department',
    phone: '(512) 978-4000',
    website: 'https://www.austintexas.gov/department/development-services',
    physicalAddress: '505 Barton Springs Road, Austin, TX 78704',
    onlinePortal: 'https://abc.austintexas.gov',
    hours: 'Mon-Fri 8:00 AM - 5:00 PM',
    state: 'TX'
  },
  'phoenix, az': {
    department: 'Phoenix Development Services',
    phone: '(602) 262-7811',
    website: 'https://www.phoenix.gov/pdd',
    physicalAddress: '200 W. Washington Street, Phoenix, AZ 85003',
    onlinePortal: 'https://www.phoenix.gov/pdd/permits',
    hours: 'Mon-Fri 7:30 AM - 4:30 PM',
    state: 'AZ'
  },
  'seattle, wa': {
    department: 'Seattle Department of Construction and Inspections (SDCI)',
    phone: '(206) 684-8850',
    website: 'https://www.seattle.gov/sdci',
    physicalAddress: '700 5th Avenue, Suite 2000, Seattle, WA 98104',
    onlinePortal: 'https://www.seattle.gov/sdci/permits',
    hours: 'Mon-Fri 8:00 AM - 5:00 PM',
    state: 'WA'
  },
  'denver, co': {
    department: 'Denver Community Planning and Development',
    phone: '(720) 865-2705',
    website: 'https://www.denvergov.org/Government/Departments/Community-Planning-and-Development',
    physicalAddress: '201 W. Colfax Ave, Denver, CO 80202',
    onlinePortal: 'https://www.denvergov.org/permits',
    hours: 'Mon-Fri 7:30 AM - 5:00 PM',
    state: 'CO'
  },
  'miami, fl': {
    department: 'City of Miami Building Department',
    phone: '(305) 416-1100',
    website: 'https://www.miamigov.com/Government/Departments-Organizations/Building-Department',
    physicalAddress: '444 SW 2nd Avenue, Miami, FL 33130',
    hours: 'Mon-Fri 8:00 AM - 5:00 PM',
    state: 'FL'
  },
  'chicago, il': {
    department: 'Chicago Department of Buildings',
    phone: '(312) 744-3449',
    website: 'https://www.chicago.gov/city/en/depts/bldgs.html',
    physicalAddress: '121 N. LaSalle Street, Room 900, Chicago, IL 60602',
    onlinePortal: 'https://webapps1.chicago.gov/buildingrecords/',
    hours: 'Mon-Fri 8:30 AM - 4:30 PM',
    state: 'IL'
  },
  'new york, ny': {
    department: 'NYC Department of Buildings (DOB)',
    phone: '(212) 566-5000',
    website: 'https://www.nyc.gov/site/buildings/index.page',
    physicalAddress: '280 Broadway, New York, NY 10007',
    onlinePortal: 'https://a810-bisweb.nyc.gov/bisweb/bsqpm01.jsp',
    hours: 'Mon-Fri 9:00 AM - 5:00 PM',
    state: 'NY'
  },
  'portland, or': {
    department: 'Portland Bureau of Development Services',
    phone: '(503) 823-7300',
    website: 'https://www.portland.gov/bds',
    physicalAddress: '1900 SW 4th Avenue, Portland, OR 97201',
    onlinePortal: 'https://www.portlandmaps.com/bps/retooldevhub/',
    hours: 'Mon-Fri 8:00 AM - 4:00 PM',
    state: 'OR'
  },
  'las vegas, nv': {
    department: 'City of Las Vegas Building and Safety',
    phone: '(702) 229-6251',
    website: 'https://www.lasvegasnevada.gov/Business/Building-Safety',
    physicalAddress: '333 N. Rancho Drive, Las Vegas, NV 89106',
    hours: 'Mon-Fri 7:30 AM - 5:30 PM',
    state: 'NV'
  }
};

/**
 * Enhanced Permit Service with Project-Specific Building Codes
 * Generates detailed, project-specific building codes and permit requirements
 */
class EnhancedPermitService {
  
  /**
   * Look up verified municipal contact by city and state
   * Requires both city and state to match to avoid incorrect jurisdiction matches
   */
  private getMunicipalContact(address: string): any | null {
    const addressLower = address.toLowerCase();
    
    // Extract state code from address (e.g., "CA", "TX", "NY")
    const stateMatch = addressLower.match(/,\s*([a-z]{2})\s*\d{5}|,\s*([a-z]{2})$/);
    const stateCode = stateMatch ? (stateMatch[1] || stateMatch[2])?.toUpperCase() : null;
    
    for (const [cityStateKey, contact] of Object.entries(MUNICIPAL_CONTACTS)) {
      const [cityName, keyState] = cityStateKey.split(', ');
      
      // Must match both city name in address AND state code
      if (addressLower.includes(cityName) && stateCode === keyState?.toUpperCase()) {
        console.log(`✅ Found verified municipal contact for: ${cityName}, ${stateCode}`);
        return contact;
      }
    }
    
    console.log(`⚠️ No verified contact found for address: ${address} (state: ${stateCode || 'unknown'})`);
    return null;
  }

  /**
   * Generate fallback contact guidance when no verified data exists
   * NOTE: phone/email/website are left null - only guidance text is provided
   */
  private generateContactGuidance(address: string): any {
    const cityMatch = address.match(/([A-Za-z\s]+),\s*[A-Z]{2}/);
    const cityName = cityMatch ? cityMatch[1].trim() : 'your city';
    
    return {
      department: `${cityName} Building/Permit Department`,
      phone: null, // Don't provide fake phone - will show guidance instead
      website: null, // Don't provide fake URL - will show guidance instead
      physicalAddress: null, // Don't provide fake address
      email: null, // Don't provide fake email
      hours: null,
      onlinePortal: null,
      isGuidance: true, // Flag to indicate this is guidance, not verified data
      guidanceNote: `Contact your local building department for permit information. Search "${cityName} building permits" online or call 311 for assistance.`,
      searchTip: `Search Google for "${cityName} building permit office" to find official contact details`
    };
  }

  /**
   * Generate project-specific building codes and permit requirements
   */
  async generateProjectSpecificAnalysis(address: string, projectType: string, projectDescription: string): Promise<any> {
    try {
      console.log(`🔍 Generating enhanced analysis for ${projectType} project at ${address}`);
      
      // Look up verified municipal contact first
      const verifiedContact = this.getMunicipalContact(address);
      if (verifiedContact) {
        console.log('📞 Using verified municipal contact data');
      } else {
        console.log('⚠️ No verified contact found, will generate guidance');
      }
      
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
      let rawText = textContent?.text || '{}';
      // Clean markdown code blocks if present
      if (rawText.includes('```json')) {
        rawText = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (rawText.includes('```')) {
        rawText = rawText.replace(/```\s*/g, '');
      }
      const result = JSON.parse(rawText.trim());
      
      // OVERRIDE AI-generated contacts with verified data or helpful guidance
      const contactData = verifiedContact || this.generateContactGuidance(address);
      const isVerified = !!verifiedContact;
      
      result.contactInformation = [contactData];
      result.contactInfo = {
        // Only set actionable fields if verified data exists
        address: isVerified ? contactData.physicalAddress : null,
        phone: isVerified ? contactData.phone : null,
        email: isVerified ? contactData.email : null,
        website: isVerified ? contactData.website : null,
        hours: isVerified ? contactData.hours : null,
        onlinePortal: isVerified ? contactData.onlinePortal : null,
        department: contactData.department,
        // Add guidance fields for non-verified cases
        isGuidance: !isVerified,
        guidanceNote: !isVerified ? contactData.guidanceNote : null,
        searchTip: !isVerified ? contactData.searchTip : null
      };
      
      // Mark if using verified data or guidance
      result.contactDataSource = isVerified ? 'verified' : 'guidance';
      
      // Add metadata
      result.meta = {
        generated: new Date().toISOString(),
        projectType,
        location: this.extractLocationFromAddress(address),
        fullAddress: address,
        analysisType: 'enhanced-project-specific',
        contactDataVerified: !!verifiedContact
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

CONTACT INFORMATION RULES - VERY IMPORTANT:
- DO NOT generate placeholder or fake contact information like "permits@cityname.gov" or "(555) 123-4567"
- DO NOT invent email addresses, phone numbers, or websites you are not certain about
- For contactInformation, provide REALISTIC guidance on how to find the correct contact:
  - Use the format: "Contact [City Name] Building Department" for department names
  - For phone: use "Call 311 or search '[City Name] Building Department phone'" 
  - For email: use "Visit [City Name] official website for contact form"
  - For website: use "Search '[City Name] building permits' for official portal"
  - For address: use "Visit [City Name] City Hall or Municipal Building"
- If you know the REAL, VERIFIED contact info for major cities (like actual .gov websites), you may include it

OUTPUT FORMAT (JSON):
{
  "requiredPermits": [detailed permit array with specific requirements],
  "buildingCodes": [specific code sections with exact requirements],
  "process": [step-by-step compliance process],
  "specialConsiderations": [project-specific requirements],
  "contactInformation": [realistic guidance on finding municipal contacts - NO fake data],
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

CONTACT INFORMATION - CRITICAL RULES:
- DO NOT generate fake contact data like "permits@cityname.gov" or "(555) 123-4567"
- Provide GUIDANCE on how to find real contacts (e.g., "Search '[City Name] Building Department' for official contact")
- Only include REAL, VERIFIED contact info if you are 100% certain it exists
- For the contactInformation array, use this format:
  {
    "department": "[City Name] Building/Permit Department",
    "phone": "Call 311 or search '[City Name] permits phone'",
    "email": "Visit [City Name] official website for contact form",
    "website": "Search '[City Name] building permits online'",
    "physicalAddress": "[City Name] City Hall or Municipal Building"
  }

CRITICAL: Focus on ${projectType}-specific requirements, not generic construction codes.
CRITICAL: Include exact measurements and code section references.
CRITICAL: NO PLACEHOLDER OR FAKE CONTACT DATA - only real verified info or guidance on how to find it.`;
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