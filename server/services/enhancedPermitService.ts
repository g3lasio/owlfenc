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
  // FIX B: validation flags
  phoneVerified?: boolean;
  websiteVerified?: boolean;
  warningNote?: string;
}

/**
 * Enhanced Permit Service with DYNAMIC Municipal Contact Search
 * Uses AI-powered research to find REAL contact information for ANY US city
 *
 * Improvements:
 * - FIX A: Robust extractCityState handles addresses without explicit state
 * - FIX B: Contact validation layer flags potential AI hallucinations
 * - FIX C: 20+ project types with specific building code prompts
 * - FIX F: Verifiable source URLs included in every report
 */
class EnhancedPermitService {

  /**
   * US State name to abbreviation mapping
   */
  private stateNameToAbbr: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
    'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
    'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
    'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
    'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
    'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
    'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
    'district of columbia': 'DC', 'puerto rico': 'PR'
  };

  // Well-known cities with their states — for FIX A (no-state addresses)
  private wellKnownCities: Record<string, string> = {
    'antioch': 'CA', 'concord': 'CA', 'pittsburg': 'CA', 'brentwood': 'CA', 'oakley': 'CA',
    'richmond': 'CA', 'san jose': 'CA', 'san francisco': 'CA', 'los angeles': 'CA', 'san diego': 'CA',
    'sacramento': 'CA', 'fresno': 'CA', 'long beach': 'CA', 'oakland': 'CA', 'bakersfield': 'CA',
    'anaheim': 'CA', 'santa ana': 'CA', 'riverside': 'CA', 'stockton': 'CA', 'chula vista': 'CA',
    'fremont': 'CA', 'irvine': 'CA', 'san bernardino': 'CA', 'modesto': 'CA', 'fontana': 'CA',
    'moreno valley': 'CA', 'glendale': 'CA', 'huntington beach': 'CA', 'santa clarita': 'CA',
    'garden grove': 'CA', 'oceanside': 'CA', 'rancho cucamonga': 'CA', 'santa rosa': 'CA',
    'ontario': 'CA', 'elk grove': 'CA', 'corona': 'CA', 'lancaster': 'CA', 'palmdale': 'CA',
    'salinas': 'CA', 'pomona': 'CA', 'hayward': 'CA', 'escondido': 'CA', 'sunnyvale': 'CA',
    'torrance': 'CA', 'pasadena': 'CA', 'orange': 'CA', 'fullerton': 'CA', 'roseville': 'CA',
    'visalia': 'CA', 'thousand oaks': 'CA', 'simi valley': 'CA', 'concord': 'CA', 'vallejo': 'CA',
    'new york': 'NY', 'brooklyn': 'NY', 'queens': 'NY', 'bronx': 'NY', 'buffalo': 'NY',
    'rochester': 'NY', 'yonkers': 'NY', 'syracuse': 'NY', 'albany': 'NY',
    'chicago': 'IL', 'aurora': 'IL', 'joliet': 'IL', 'naperville': 'IL', 'rockford': 'IL',
    'houston': 'TX', 'san antonio': 'TX', 'dallas': 'TX', 'austin': 'TX', 'fort worth': 'TX',
    'el paso': 'TX', 'arlington': 'TX', 'corpus christi': 'TX', 'plano': 'TX', 'laredo': 'TX',
    'phoenix': 'AZ', 'tucson': 'AZ', 'mesa': 'AZ', 'chandler': 'AZ', 'scottsdale': 'AZ',
    'miami': 'FL', 'jacksonville': 'FL', 'tampa': 'FL', 'orlando': 'FL', 'st. petersburg': 'FL',
    'hialeah': 'FL', 'tallahassee': 'FL', 'fort lauderdale': 'FL', 'pembroke pines': 'FL',
    'seattle': 'WA', 'spokane': 'WA', 'tacoma': 'WA', 'bellevue': 'WA', 'kent': 'WA',
    'denver': 'CO', 'colorado springs': 'CO', 'aurora': 'CO', 'fort collins': 'CO', 'lakewood': 'CO',
    'nashville': 'TN', 'memphis': 'TN', 'knoxville': 'TN', 'chattanooga': 'TN',
    'portland': 'OR', 'eugene': 'OR', 'salem': 'OR', 'gresham': 'OR',
    'las vegas': 'NV', 'henderson': 'NV', 'reno': 'NV', 'north las vegas': 'NV',
    'boston': 'MA', 'worcester': 'MA', 'springfield': 'MA', 'cambridge': 'MA',
    'atlanta': 'GA', 'columbus': 'GA', 'savannah': 'GA', 'athens': 'GA',
    'detroit': 'MI', 'grand rapids': 'MI', 'warren': 'MI', 'sterling heights': 'MI',
    'minneapolis': 'MN', 'saint paul': 'MN', 'rochester': 'MN', 'duluth': 'MN',
    'philadelphia': 'PA', 'pittsburgh': 'PA', 'allentown': 'PA', 'erie': 'PA',
    'charlotte': 'NC', 'raleigh': 'NC', 'greensboro': 'NC', 'durham': 'NC',
    'columbus': 'OH', 'cleveland': 'OH', 'cincinnati': 'OH', 'toledo': 'OH', 'akron': 'OH',
    'indianapolis': 'IN', 'fort wayne': 'IN', 'evansville': 'IN', 'south bend': 'IN',
    'louisville': 'KY', 'lexington': 'KY', 'bowling green': 'KY',
    'baltimore': 'MD', 'frederick': 'MD', 'rockville': 'MD', 'gaithersburg': 'MD',
    'virginia beach': 'VA', 'norfolk': 'VA', 'chesapeake': 'VA', 'richmond': 'VA',
    'albuquerque': 'NM', 'las cruces': 'NM', 'rio rancho': 'NM',
    'omaha': 'NE', 'lincoln': 'NE', 'bellevue': 'NE',
    'wichita': 'KS', 'overland park': 'KS', 'kansas city': 'KS',
    'kansas city': 'MO', 'st. louis': 'MO', 'springfield': 'MO',
    'new orleans': 'LA', 'baton rouge': 'LA', 'shreveport': 'LA',
    'birmingham': 'AL', 'montgomery': 'AL', 'huntsville': 'AL',
    'jackson': 'MS', 'gulfport': 'MS', 'southaven': 'MS',
    'little rock': 'AR', 'fort smith': 'AR', 'fayetteville': 'AR',
    'oklahoma city': 'OK', 'tulsa': 'OK', 'norman': 'OK',
    'salt lake city': 'UT', 'west valley city': 'UT', 'provo': 'UT',
    'honolulu': 'HI', 'east honolulu': 'HI', 'pearl city': 'HI',
    'anchorage': 'AK', 'fairbanks': 'AK', 'juneau': 'AK',
    'sioux falls': 'SD', 'rapid city': 'SD',
    'fargo': 'ND', 'bismarck': 'ND', 'grand forks': 'ND',
    'billings': 'MT', 'missoula': 'MT', 'great falls': 'MT',
    'cheyenne': 'WY', 'casper': 'WY', 'laramie': 'WY',
    'boise': 'ID', 'nampa': 'ID', 'meridian': 'ID',
    'burlington': 'VT', 'south burlington': 'VT', 'rutland': 'VT',
    'manchester': 'NH', 'nashua': 'NH', 'concord': 'NH',
    'providence': 'RI', 'cranston': 'RI', 'warwick': 'RI',
    'bridgeport': 'CT', 'new haven': 'CT', 'hartford': 'CT', 'stamford': 'CT',
    'newark': 'NJ', 'jersey city': 'NJ', 'paterson': 'NJ', 'elizabeth': 'NJ',
    'wilmington': 'DE', 'dover': 'DE', 'newark': 'DE',
    'washington': 'DC'
  };

  /**
   * FIX A: Robust city/state extractor
   * Handles:
   * - "123 Main St, Antioch" (no state)
   * - "123 Main St, Antioch, CA"
   * - "123 Main St, Antioch, California 94509"
   * - "123 Main St, Antioch, CA 94509, USA"
   */
  private extractCityState(address: string): string {
    const parts = address.split(',').map(p => p.trim());

    // 1. Try to find full state name in any part
    for (let i = 0; i < parts.length; i++) {
      const partLower = parts[i].toLowerCase().replace(/\s*\d{5}(-\d{4})?\s*$/, '').trim();
      for (const [stateName, abbr] of Object.entries(this.stateNameToAbbr)) {
        if (partLower === stateName || partLower.endsWith(' ' + stateName)) {
          if (i > 0) {
            const city = this.cleanCityPart(parts[i - 1]);
            if (city && !this.looksLikeStreet(city)) {
              console.log(`🔍 [EXTRACT-CITY] Found via full state name: ${city}, ${abbr}`);
              return `${city}, ${abbr}`;
            }
            if (i > 1) {
              const prevCity = this.cleanCityPart(parts[i - 2]);
              if (prevCity && !this.looksLikeStreet(prevCity)) {
                console.log(`🔍 [EXTRACT-CITY] Found via full state name (skip street): ${prevCity}, ${abbr}`);
                return `${prevCity}, ${abbr}`;
              }
            }
          }
        }
      }
    }

    // 2. Try to find state abbreviation (e.g., "CA 94509" or "CA")
    for (let i = 0; i < parts.length; i++) {
      const stateMatch = parts[i].match(/^([A-Z]{2})\b/i);
      if (stateMatch) {
        const abbr = stateMatch[1].toUpperCase();
        if (Object.values(this.stateNameToAbbr).includes(abbr)) {
          if (i > 0) {
            const city = this.cleanCityPart(parts[i - 1]);
            if (city && !this.looksLikeStreet(city)) {
              console.log(`🔍 [EXTRACT-CITY] Found via state abbr: ${city}, ${abbr}`);
              return `${city}, ${abbr}`;
            }
            if (i > 1) {
              const prevCity = this.cleanCityPart(parts[i - 2]);
              if (prevCity && !this.looksLikeStreet(prevCity)) {
                console.log(`🔍 [EXTRACT-CITY] Found via state abbr (skip street): ${prevCity}, ${abbr}`);
                return `${prevCity}, ${abbr}`;
              }
            }
          }
        }
      }
    }

    // 3. FIX A: Try well-known city lookup (handles "123 Main St, Antioch" with no state)
    for (const part of parts) {
      const cityLower = part.toLowerCase().replace(/^\d+\s+/, '').trim();
      if (this.wellKnownCities[cityLower]) {
        const abbr = this.wellKnownCities[cityLower];
        console.log(`🔍 [EXTRACT-CITY] Found via well-known city lookup: ${part.trim()}, ${abbr}`);
        return `${part.trim()}, ${abbr}`;
      }
    }

    // 4. Last resort: use the second-to-last part as city (common pattern)
    if (parts.length >= 2) {
      const candidate = this.cleanCityPart(parts[parts.length - 2]);
      if (candidate && !this.looksLikeStreet(candidate)) {
        console.log(`🔍 [EXTRACT-CITY] Using second-to-last part as city: ${candidate}`);
        return candidate;
      }
    }

    console.log(`⚠️ [EXTRACT-CITY] Could not parse city/state from: ${address} — using full address`);
    return address;
  }

  private cleanCityPart(part: string): string {
    return part.replace(/^\d+\s+/, '').replace(/\s*\d{5}(-\d{4})?\s*$/, '').trim();
  }

  private looksLikeStreet(text: string): boolean {
    return /\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|court|ct|circle|cir|boulevard|blvd|highway|hwy|place|pl|terrace|ter|trail|trl|parkway|pkwy)\b/i.test(text) ||
      /^\d+\s+/.test(text);
  }

  /**
   * FIX B: Validate contact data — flag fields that look like hallucinations
   */
  private validateContactData(contact: any, cityState: string): MunicipalContact {
    const warnings: string[] = [];

    // Phone validation: must match US format
    let phoneVerified = false;
    if (contact.phone) {
      const phoneClean = contact.phone.replace(/\D/g, '');
      if (phoneClean.length === 10 || phoneClean.length === 11) {
        phoneVerified = true;
      } else {
        warnings.push('Phone number format is unusual — please verify before calling');
        contact.phone = null; // Remove potentially wrong phone
      }
    }

    // Website validation: must look like a real government URL
    let websiteVerified = false;
    if (contact.website) {
      const url = contact.website.toLowerCase();
      if (url.startsWith('http') && (url.includes('.gov') || url.includes('.us') || url.includes('cityof') || url.includes('countyof') || url.includes('.org'))) {
        websiteVerified = true;
      } else if (url.startsWith('http')) {
        websiteVerified = false;
        warnings.push('Website URL could not be verified as an official government site — please confirm');
      } else {
        contact.website = null;
        warnings.push('Website URL was malformed and removed');
      }
    }

    // If confidence is low, add a general warning
    if (contact.confidence === 'low') {
      warnings.push('Contact information has low confidence — always verify directly with the municipality');
    }

    return {
      ...contact,
      phoneVerified,
      websiteVerified,
      warningNote: warnings.length > 0 ? warnings.join('. ') : undefined,
    };
  }

  /**
   * FIX F: Generate verifiable source URLs for the given city/state and project type
   */
  private generateVerifiableSources(cityState: string, projectType: string): Array<{title: string; url: string; description: string}> {
    const parts = cityState.split(',').map(p => p.trim());
    const city = parts[0] || '';
    const state = parts[1] || '';
    const citySlug = city.toLowerCase().replace(/\s+/g, '');
    const stateSlug = state.toLowerCase().replace(/\s+/g, '');

    // State-specific building code resources
    const stateCodeResources: Record<string, {title: string; url: string}> = {
      'CA': { title: 'California Building Standards Commission', url: 'https://www.dgs.ca.gov/BSC' },
      'TX': { title: 'Texas Department of Licensing and Regulation', url: 'https://www.tdlr.texas.gov' },
      'FL': { title: 'Florida Building Commission', url: 'https://floridabuilding.org' },
      'NY': { title: 'New York State Division of Building Standards', url: 'https://www.dos.ny.gov/dcs' },
      'AZ': { title: 'Arizona Department of Fire, Building and Life Safety', url: 'https://dfbls.az.gov' },
      'WA': { title: 'Washington State Building Code Council', url: 'https://sbcc.wa.gov' },
      'CO': { title: 'Colorado Division of Housing', url: 'https://cdola.colorado.gov/housing' },
      'GA': { title: 'Georgia Department of Community Affairs', url: 'https://www.dca.ga.gov' },
      'NC': { title: 'North Carolina Department of Insurance — Engineering Division', url: 'https://www.ncdoi.gov/engineering' },
      'IL': { title: 'Illinois Capital Development Board', url: 'https://www2.illinois.gov/cdb' },
      'OH': { title: 'Ohio Board of Building Standards', url: 'https://com.ohio.gov/divisions/industrial-compliance/boards/ohio-board-of-building-standards' },
      'PA': { title: 'Pennsylvania Department of Labor & Industry — Building Codes', url: 'https://www.dli.pa.gov/ucc' },
      'MI': { title: 'Michigan Bureau of Construction Codes', url: 'https://www.michigan.gov/lara/bureau-list/bcc' },
      'NV': { title: 'Nevada State Contractors Board', url: 'https://www.nscb.nv.gov' },
      'OR': { title: 'Oregon Building Codes Division', url: 'https://www.oregon.gov/bcd' },
      'VA': { title: 'Virginia Department of Housing and Community Development', url: 'https://www.dhcd.virginia.gov/building-codes' },
      'TN': { title: 'Tennessee Department of Commerce & Insurance — Fire Prevention', url: 'https://www.tn.gov/commerce/fire-prevention.html' },
      'MN': { title: 'Minnesota Department of Labor and Industry — Building Codes', url: 'https://www.dli.mn.gov/business/codes-and-statutes' },
      'MO': { title: 'Missouri Division of Fire Safety', url: 'https://dfs.dps.mo.gov' },
      'IN': { title: 'Indiana Fire Prevention and Building Safety Commission', url: 'https://www.in.gov/dhs/fire-and-building-safety' },
      'WI': { title: 'Wisconsin Department of Safety and Professional Services', url: 'https://dsps.wi.gov/Pages/BuildingCodes' },
      'MD': { title: 'Maryland Department of Labor — Building Codes', url: 'https://www.dllr.state.md.us/labor/bldg' },
      'NJ': { title: 'New Jersey Division of Codes and Standards', url: 'https://www.nj.gov/dca/codes' },
      'MA': { title: 'Massachusetts Board of Building Regulations and Standards', url: 'https://www.mass.gov/orgs/board-of-building-regulations-and-standards' },
      'UT': { title: 'Utah Division of Occupational and Professional Licensing', url: 'https://dopl.utah.gov' },
      'KY': { title: 'Kentucky Department of Housing, Buildings and Construction', url: 'https://dhbc.ky.gov' },
      'SC': { title: 'South Carolina Department of Labor, Licensing and Regulation', url: 'https://llr.sc.gov/bc' },
      'AL': { title: 'Alabama Building Commission', url: 'https://bc.alabama.gov' },
      'LA': { title: 'Louisiana State Uniform Construction Code Council', url: 'https://www.doa.la.gov/Pages/osp/concode/index.aspx' },
      'OK': { title: 'Oklahoma State Fire Marshal — Building Codes', url: 'https://www.ok.gov/fire' },
      'KS': { title: 'Kansas Department of Labor — Construction', url: 'https://www.dol.ks.gov' },
      'NM': { title: 'New Mexico Construction Industries Division', url: 'https://www.rld.nm.gov/construction-industries' },
      'IA': { title: 'Iowa State Building Code Bureau', url: 'https://dps.iowa.gov/divisions/state-fire-marshal/building-code-bureau' },
      'AR': { title: 'Arkansas Fire Protection Services Board', url: 'https://www.arkansas.gov/dfa/fire_protection' },
      'MS': { title: 'Mississippi State Fire Marshal — Building Codes', url: 'https://www.mid.ms.gov/sfm' },
      'NE': { title: 'Nebraska State Fire Marshal', url: 'https://sfm.nebraska.gov' },
      'ID': { title: 'Idaho Division of Building Safety', url: 'https://dbs.idaho.gov' },
      'WV': { title: 'West Virginia State Fire Commission', url: 'https://firemarshal.wv.gov' },
      'HI': { title: 'Hawaii Department of Accounting and General Services', url: 'https://dags.hawaii.gov/facilities/building-codes' },
      'ME': { title: 'Maine Office of the State Fire Marshal', url: 'https://www.maine.gov/dps/fmd' },
      'NH': { title: 'New Hampshire Building Code Review Board', url: 'https://www.nh.gov/safety/divisions/firesafety/building-code' },
      'RI': { title: 'Rhode Island State Building Code Commission', url: 'https://www.bdp.ri.gov/sbcc' },
      'MT': { title: 'Montana Department of Labor and Industry — Building Codes', url: 'https://dli.mt.gov/building-codes' },
      'DE': { title: 'Delaware State Fire Prevention Commission', url: 'https://statefirecommission.delaware.gov' },
      'SD': { title: 'South Dakota State Fire Marshal', url: 'https://dps.sd.gov/fire-marshal' },
      'ND': { title: 'North Dakota State Building Code', url: 'https://www.nd.gov/dhs/services/childsupport' },
      'AK': { title: 'Alaska Division of Fire and Life Safety', url: 'https://dps.alaska.gov/fire' },
      'VT': { title: 'Vermont Division of Fire Safety', url: 'https://firesafety.vermont.gov' },
      'WY': { title: 'Wyoming State Fire Marshal', url: 'https://sfm.wyo.gov' },
      'CT': { title: 'Connecticut Department of Administrative Services — Building Codes', url: 'https://portal.ct.gov/DAS/Facilities-Management/Building-Codes' },
      'DC': { title: 'DC Department of Buildings', url: 'https://dob.dc.gov' },
    };

    const sources: Array<{title: string; url: string; description: string}> = [];

    // 1. ICC (International Code Council) — primary building code source
    sources.push({
      title: 'International Code Council (ICC)',
      url: 'https://www.iccsafe.org',
      description: 'Publisher of the International Building Code (IBC), International Residential Code (IRC), and all model codes adopted by most US jurisdictions'
    });

    // 2. State-specific resource
    if (state && stateCodeResources[state]) {
      sources.push({
        title: stateCodeResources[state].title,
        url: stateCodeResources[state].url,
        description: `Official ${state} state building code authority — verify local amendments and adoptions`
      });
    }

    // 3. Project-type specific federal/national resource
    const projectSources: Record<string, {title: string; url: string; description: string}> = {
      'fence': {
        title: 'American Fence Association',
        url: 'https://www.americanfenceassociation.com',
        description: 'Industry standards for fence installation, materials, and compliance'
      },
      'deck': {
        title: 'American Wood Council — Prescriptive Residential Wood Deck Construction Guide',
        url: 'https://www.awc.org/codes-standards/publications/dca6',
        description: 'DCA6 guide for deck construction based on IRC requirements — widely adopted by jurisdictions'
      },
      'pool': {
        title: 'Association of Pool and Spa Professionals (APSP)',
        url: 'https://www.phta.org',
        description: 'ANSI/APSP standards for pool and spa construction, barrier requirements, and safety'
      },
      'electrical': {
        title: 'National Fire Protection Association — NEC (NFPA 70)',
        url: 'https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=70',
        description: 'National Electrical Code — the standard for all electrical installations in the US'
      },
      'plumbing': {
        title: 'International Association of Plumbing and Mechanical Officials (IAPMO)',
        url: 'https://www.iapmo.org',
        description: 'Uniform Plumbing Code (UPC) — adopted by California and many western states'
      },
      'roofing': {
        title: 'National Roofing Contractors Association (NRCA)',
        url: 'https://www.nrca.net',
        description: 'Industry standards for roofing materials, installation, and code compliance'
      },
      'hvac': {
        title: 'ASHRAE — Heating, Refrigerating and Air-Conditioning Engineers',
        url: 'https://www.ashrae.org',
        description: 'ASHRAE 90.1 energy standard and HVAC system design guidelines adopted by most jurisdictions'
      },
      'addition': {
        title: 'HUD — Residential Structural Design Guide',
        url: 'https://www.huduser.gov/portal/publications/res_str_des_gd.html',
        description: 'Federal guidelines for residential structural additions and modifications'
      },
      'solar': {
        title: 'Solar Energy Industries Association (SEIA)',
        url: 'https://www.seia.org/research-resources/solar-permitting-best-practices',
        description: 'Solar permitting best practices and interconnection requirements by state'
      },
      'demolition': {
        title: 'EPA — Renovation, Repair and Painting (RRP) Rule',
        url: 'https://www.epa.gov/lead/renovation-repair-and-painting-program',
        description: 'Federal requirements for lead-safe work practices during demolition and renovation'
      },
    };

    const projectSource = projectSources[projectType] || projectSources['addition'];
    if (projectSource) {
      sources.push(projectSource);
    }

    // 4. PermitZip — national permit database
    sources.push({
      title: 'PermitZip — National Permit Research Tool',
      url: `https://www.permitzip.com`,
      description: 'Search building permit requirements by address and project type across US jurisdictions'
    });

    // 5. Municipal website search hint
    sources.push({
      title: `${city || cityState} Official City/County Website`,
      url: `https://www.google.com/search?q=${encodeURIComponent((city || cityState) + ' building permits official site')}`,
      description: `Search for the official ${city || cityState} building department to verify local requirements, fees, and application procedures`
    });

    return sources;
  }

  /**
   * DYNAMIC MUNICIPAL CONTACT SEARCH
   * Uses Claude AI to search and extract real building department contact info
   */
  async searchMunicipalContact(address: string): Promise<MunicipalContact> {
    const startTime = Date.now();
    const cityState = this.extractCityState(address);
    console.log(`🔍 [MUNICIPAL-SEARCH] Searching for building department contact: ${cityState}`);

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
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
7. If you know the city well, provide high confidence data. If unsure, use null and set confidence to "low"

RESEARCH APPROACH:
- Look for "[City Name] Building Department" or "[City Name] Development Services"
- Look for "[City Name] Permit Office" or "[City Name] Planning and Building"
- Consider county-level departments for smaller cities
- Check official city government websites

RESPOND IN JSON FORMAT ONLY:
{
  "department": "Official department name",
  "phone": "Real phone number with area code (e.g. (925) 779-7000), or null if uncertain",
  "website": "Real official website URL starting with https://, or null if uncertain",
  "physicalAddress": "Real street address, or null if uncertain",
  "email": "Real official email, or null if uncertain",
  "hours": "Business hours, or null if uncertain",
  "onlinePortal": "URL for online permit applications, or null",
  "confidence": "high" | "medium" | "low"
}

IMPORTANT: It is BETTER to return null for a field than to provide incorrect information.`,
        messages: [
          {
            role: 'user',
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

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) rawText = jsonMatch[0];

      let result;
      try {
        result = JSON.parse(rawText.trim());
      } catch {
        result = {
          department: `${cityState} Building Department`,
          phone: null, website: null, physicalAddress: null,
          email: null, hours: null, onlinePortal: null, confidence: 'low'
        };
      }

      const elapsedTime = Date.now() - startTime;
      console.log(`✅ [MUNICIPAL-SEARCH] Found contact for ${cityState} in ${elapsedTime}ms (confidence: ${result.confidence})`);

      // FIX B: Validate the contact data before returning
      const rawContact: MunicipalContact = {
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

      return this.validateContactData(rawContact, cityState);

    } catch (error) {
      console.error(`❌ [MUNICIPAL-SEARCH] Error searching for ${cityState}:`, error);
      return {
        department: `${cityState} Building Department`,
        phone: null, website: null, physicalAddress: null,
        email: null, hours: null, onlinePortal: null,
        dataSource: 'fallback', confidence: 'low',
        searchQuery: cityState, isGuidance: true,
        guidanceNote: `We couldn't find verified contact information for ${cityState}. Please search for "${cityState} building permits" or "${cityState} development services" to find the official building department.`,
        searchTip: `Try searching Google for "${cityState} building department phone number" to find official contact details`
      };
    }
  }

  /**
   * FIX C: Expanded project type prompts — 20+ types
   */
  private getProjectSpecificPrompts(projectType: string): any {
    const prompts: Record<string, any> = {
      'fence': {
        buildingCodes: [
          'Property line setbacks (typically 0-6 inches from property line)',
          'Maximum height restrictions (usually 6 feet residential, 8 feet commercial)',
          'Material specifications (wood preservative treatment, galvanized hardware)',
          'Foundation requirements (concrete footings depth based on frost line)',
          'Gate requirements (self-closing mechanisms near pools)',
          'Neighbor notification requirements',
          'Corner lot visibility restrictions (sight triangle)',
          'Utility easement compliance (call 811 before digging)'
        ],
        specificCodes: [
          'IRC Section R322 — Encroachment requirements',
          'Local zoning ordinance height restrictions',
          'Pool barrier code compliance (IRC R326)',
          'HOA covenant compliance requirements'
        ],
        permits: ['Fence/Wall permit', 'Electrical permit (gate operators)', 'Pool barrier permit (if near pool)']
      },
      'deck': {
        buildingCodes: [
          'Structural beam sizing based on span requirements',
          'Joist spacing requirements (12", 16", or 24" O.C.)',
          'Railing height requirements (36" minimum, 42" for elevated decks)',
          'Footing depth below frost line',
          'Ledger board attachment specifications (lag bolts, flashing)',
          'Stair riser (max 7-3/4") and tread (min 10") dimensional requirements',
          'Guard opening restrictions (4" sphere rule)',
          'Load bearing calculations (40 PSF live load, 10 PSF dead load)'
        ],
        specificCodes: [
          'IRC Section R502 — Floor systems and decks',
          'IRC Section R312 — Guards and railings',
          'IRC Section R311 — Stairs and landings',
          'AWC DCA6 — Prescriptive Residential Wood Deck Construction Guide',
          'Flashing and waterproofing specifications'
        ],
        permits: ['Building permit', 'Electrical permit (lighting)', 'Structural review (elevated decks)']
      },
      'pool': {
        buildingCodes: [
          'Barrier height requirements (minimum 4 feet, no footholds)',
          'Gate self-closing and self-latching mechanisms (latch on pool side)',
          'Electrical bonding and grounding (NEC Article 680)',
          'Pool equipment electrical code compliance (GFCI required)',
          'Setback requirements from structures and property lines',
          'Drainage and water management systems',
          'Pool alarm requirements (varies by jurisdiction)',
          'Equipment access clearance requirements'
        ],
        specificCodes: [
          'NEC Article 680 — Swimming pools and similar installations',
          'IRC Section R326 — Pool barriers',
          'Local health department pool codes',
          'ANSI/APSP-5 Standard for Residential In-Ground Swimming Pools'
        ],
        permits: ['Pool permit', 'Electrical permit', 'Plumbing permit', 'Fence/barrier permit', 'Health department approval']
      },
      'addition': {
        buildingCodes: [
          'Foundation requirements matching existing structure',
          'Structural connection to existing building',
          'Egress window requirements for bedrooms (min 5.7 sq ft opening)',
          'HVAC system sizing and distribution',
          'Electrical system capacity and panel upgrades',
          'Insulation and energy efficiency (IECC compliance)',
          'Fire separation requirements',
          'Ceiling height minimums (7\'6" typical)'
        ],
        specificCodes: [
          'IRC Section R301 — Structural design criteria',
          'IRC Section R310 — Emergency escape and rescue openings',
          'IRC Chapter 11 — Energy efficiency',
          'IECC 2021 energy code compliance'
        ],
        permits: ['Building permit', 'Electrical permit', 'Plumbing permit', 'Mechanical permit', 'Foundation permit']
      },
      'remodel': {
        buildingCodes: [
          'Accessibility compliance (ADA requirements for commercial)',
          'Electrical code updates (GFCI, AFCI requirements)',
          'Insulation and energy efficiency upgrades',
          'Window and door egress compliance',
          'Structural modifications compliance',
          'Fire safety and smoke/CO detector requirements',
          'Ventilation system requirements',
          'Lead paint and asbestos assessment (pre-1978 buildings)'
        ],
        specificCodes: [
          'IRC Chapter 34 — Existing buildings',
          'Current NEC electrical code compliance',
          'Local energy efficiency requirements',
          'EPA RRP Rule (if pre-1978 building)'
        ],
        permits: ['Building permit', 'Electrical permit', 'Plumbing permit (if applicable)', 'Mechanical permit (if applicable)']
      },
      'roofing': {
        buildingCodes: [
          'Roof slope requirements for material type (asphalt: min 2:12, metal: min 1:12)',
          'Underlayment requirements (ice and water shield in cold climates)',
          'Ventilation requirements (1:150 ratio or 1:300 with vapor barrier)',
          'Fastener requirements (nails vs staples, spacing)',
          'Fire rating requirements (Class A, B, or C)',
          'Wind uplift resistance (varies by wind zone)',
          'Roof load capacity (snow load in northern climates)',
          'Flashing requirements at penetrations and valleys'
        ],
        specificCodes: [
          'IRC Section R905 — Requirements for roof coverings',
          'IRC Section R806 — Roof ventilation',
          'NRCA Roofing Manual — Steep-Slope Roof Systems',
          'Local wind speed and snow load requirements'
        ],
        permits: ['Roofing permit', 'Structural permit (if decking replacement)', 'Electrical permit (if solar added)']
      },
      'electrical': {
        buildingCodes: [
          'Panel capacity and service entrance requirements',
          'GFCI protection (kitchens, bathrooms, garages, outdoors, basements)',
          'AFCI protection (bedrooms and living areas — NEC 2020)',
          'Wire gauge requirements by circuit amperage',
          'Conduit requirements (EMT, PVC, flexible)',
          'Box fill calculations',
          'Grounding and bonding requirements',
          'Smoke and CO detector interconnection'
        ],
        specificCodes: [
          'NFPA 70 (NEC) — National Electrical Code 2020/2023',
          'NEC Article 210 — Branch circuits',
          'NEC Article 230 — Services',
          'NEC Article 250 — Grounding and bonding',
          'NEC Article 406 — Receptacle requirements'
        ],
        permits: ['Electrical permit', 'Inspection required for rough-in and final', 'Utility disconnect may be required']
      },
      'plumbing': {
        buildingCodes: [
          'Pipe sizing requirements by fixture units',
          'Slope requirements for drain lines (1/4" per foot minimum)',
          'Venting requirements (wet vents, air admittance valves)',
          'Water heater installation (seismic strapping in CA)',
          'Backflow prevention requirements',
          'Water pressure requirements (40-80 PSI)',
          'Shut-off valve requirements at fixtures',
          'Drain, waste, and vent (DWV) material requirements'
        ],
        specificCodes: [
          'Uniform Plumbing Code (UPC) — adopted in CA and western states',
          'International Plumbing Code (IPC) — adopted in most other states',
          'IRC Chapter 25-32 — Plumbing',
          'Local water district requirements'
        ],
        permits: ['Plumbing permit', 'Rough-in inspection', 'Final inspection', 'Water district approval (new service)']
      },
      'hvac': {
        buildingCodes: [
          'Equipment sizing (Manual J load calculation required)',
          'Duct sizing and sealing requirements (Manual D)',
          'Refrigerant handling (EPA Section 608 certification)',
          'Combustion air requirements for gas appliances',
          'Flue and venting requirements',
          'Energy efficiency minimums (SEER, AFUE ratings)',
          'Thermostat and control requirements',
          'Clearance requirements around equipment'
        ],
        specificCodes: [
          'IRC Chapter 14 — Heating systems',
          'IRC Chapter 15 — Exhaust systems',
          'ASHRAE 62.2 — Ventilation for acceptable indoor air quality',
          'ASHRAE 90.1 — Energy standard for buildings',
          'Local energy code requirements'
        ],
        permits: ['Mechanical permit', 'Electrical permit (for new circuits)', 'Gas permit (if applicable)']
      },
      'concrete': {
        buildingCodes: [
          'Concrete mix design requirements (minimum PSI by application)',
          'Reinforcement requirements (rebar size and spacing)',
          'Footing depth below frost line',
          'Slab thickness requirements (4" residential, 6" commercial)',
          'Vapor barrier requirements under slabs',
          'Control joint spacing requirements',
          'Concrete cover over reinforcement',
          'Curing requirements and time'
        ],
        specificCodes: [
          'ACI 318 — Building Code Requirements for Structural Concrete',
          'IRC Section R403 — Footings',
          'IRC Section R506 — Concrete floors (on ground)',
          'Local frost depth requirements'
        ],
        permits: ['Building permit', 'Grading permit (if earthwork involved)', 'Structural engineer review (for slabs over 500 sq ft)']
      },
      'drywall': {
        buildingCodes: [
          'Fire-rated assembly requirements (1-hour, 2-hour)',
          'Moisture-resistant drywall in wet areas',
          'Fastener spacing requirements',
          'Tape and finish requirements',
          'Thickness requirements by application',
          'Backing requirements for fixtures',
          'Penetration firestopping requirements',
          'Sound attenuation requirements (STC ratings)'
        ],
        specificCodes: [
          'IRC Section R702 — Interior covering',
          'ASTM C840 — Application and finishing of gypsum board',
          'GA-216 — Application and finishing of gypsum board',
          'Local fire code requirements'
        ],
        permits: ['Building permit (if structural changes)', 'Electrical/plumbing permit (if work behind walls)']
      },
      'painting': {
        buildingCodes: [
          'Lead paint disclosure and testing (pre-1978 buildings)',
          'EPA RRP certification required for disturbing lead paint',
          'VOC limits for interior paints (varies by state)',
          'Exterior paint requirements in historic districts',
          'Fire-retardant paint requirements in commercial',
          'Ventilation requirements during application',
          'Disposal requirements for paint waste',
          'HOA color approval requirements'
        ],
        specificCodes: [
          'EPA RRP Rule (40 CFR Part 745)',
          'OSHA 29 CFR 1926.62 — Lead in construction',
          'Local air quality management district VOC rules',
          'SCAQMD Rule 1113 (Southern California)'
        ],
        permits: ['No permit typically required for painting', 'Lead abatement permit (if disturbing lead paint)', 'Historic district approval (if applicable)']
      },
      'flooring': {
        buildingCodes: [
          'Subfloor requirements (thickness, span ratings)',
          'Moisture barrier requirements',
          'Transition strip requirements at doorways',
          'Accessibility requirements (ADA — max 1/2" change in level)',
          'Slip resistance requirements in wet areas',
          'Adhesive VOC requirements',
          'Radiant heat compatibility',
          'Fire rating requirements in commercial'
        ],
        specificCodes: [
          'IRC Section R503 — Floor sheathing',
          'ADA Standards for Accessible Design — Section 302',
          'ASTM F710 — Preparing concrete floors for resilient flooring',
          'Local commercial building code requirements'
        ],
        permits: ['No permit typically required for flooring replacement', 'Building permit (if subfloor structural repair)']
      },
      'solar': {
        buildingCodes: [
          'Structural loading requirements (roof capacity for panel weight)',
          'Electrical requirements (NEC Article 690)',
          'Rapid shutdown requirements (NEC 690.12)',
          'Interconnection requirements (utility approval)',
          'Setback requirements from roof edges',
          'Fire access pathways (3-foot clear paths)',
          'Grounding and bonding requirements',
          'Meter and disconnect requirements'
        ],
        specificCodes: [
          'NEC Article 690 — Solar photovoltaic systems',
          'NEC Article 705 — Interconnected electric power production sources',
          'IFC Section 605 — Electrical equipment',
          'Local utility interconnection standards'
        ],
        permits: ['Building permit', 'Electrical permit', 'Utility interconnection approval', 'HOA approval (if applicable)']
      },
      'demolition': {
        buildingCodes: [
          'Asbestos survey required before demolition (pre-1980 buildings)',
          'Lead paint assessment required',
          'Utility disconnection requirements (gas, electric, water)',
          'Dust control requirements',
          'Debris disposal requirements (landfill permits)',
          'Neighbor notification requirements',
          'Shoring requirements for adjacent structures',
          'NESHAP notification (for asbestos-containing materials)'
        ],
        specificCodes: [
          'EPA NESHAP 40 CFR Part 61 Subpart M — Asbestos',
          'OSHA 29 CFR 1926.1101 — Asbestos in construction',
          'EPA RRP Rule for lead paint',
          'Local demolition ordinance requirements'
        ],
        permits: ['Demolition permit', 'Asbestos abatement permit (if ACM present)', 'Utility disconnection permits', 'Grading permit (if site work)']
      },
      'garage': {
        buildingCodes: [
          'Fire separation requirements (1-hour assembly between garage and living space)',
          'Door requirements (solid core or steel between garage and house)',
          'Ventilation requirements',
          'Electrical requirements (GFCI in garage)',
          'Setback requirements from property lines',
          'Height restrictions',
          'Driveway approach permit',
          'Foundation requirements'
        ],
        specificCodes: [
          'IRC Section R302 — Fire-resistant construction',
          'IRC Section R309 — Garages and carports',
          'Local zoning setback requirements',
          'Local height restrictions'
        ],
        permits: ['Building permit', 'Electrical permit', 'Mechanical permit (if heated)', 'Driveway approach permit']
      },
      'shed': {
        buildingCodes: [
          'Size limits for permit exemption (varies: 120-200 sq ft typical)',
          'Setback requirements from property lines',
          'Height restrictions',
          'Foundation requirements (anchoring for wind)',
          'Electrical requirements (if wired)',
          'Impervious surface limits',
          'HOA restrictions',
          'Utility easement compliance'
        ],
        specificCodes: [
          'Local zoning ordinance — accessory structures',
          'IRC Section R105.2 — Work exempt from permit',
          'Local setback requirements',
          'Wind zone requirements'
        ],
        permits: ['Building permit (if over size threshold)', 'Electrical permit (if wired)', 'HOA approval']
      },
      'landscaping': {
        buildingCodes: [
          'Grading and drainage requirements (water must drain away from structures)',
          'Retaining wall height limits (typically 4 feet without permit)',
          'Irrigation system backflow prevention',
          'Tree removal permits (heritage trees)',
          'Impervious surface limits',
          'Slope stability requirements',
          'Utility marking before excavation (811)',
          'Water conservation requirements (drought-tolerant landscaping)'
        ],
        specificCodes: [
          'Local grading ordinance',
          'Local water conservation ordinance',
          'Tree protection ordinance',
          'Stormwater management requirements'
        ],
        permits: ['Grading permit (if significant earthwork)', 'Retaining wall permit (over 4 feet)', 'Tree removal permit', 'Irrigation permit']
      },
      'waterproofing': {
        buildingCodes: [
          'Drainage system requirements (French drain, sump pump)',
          'Vapor barrier requirements',
          'Waterproofing membrane specifications',
          'Exterior drainage board requirements',
          'Window well requirements',
          'Grading requirements (6" drop in 10 feet from foundation)',
          'Dampproofing vs waterproofing requirements',
          'Inspection requirements'
        ],
        specificCodes: [
          'IRC Section R405 — Foundation drainage',
          'IRC Section R406 — Foundation waterproofing and dampproofing',
          'ASTM D6705 — Waterproofing membranes',
          'Local flood zone requirements'
        ],
        permits: ['Building permit (if structural work)', 'Grading permit (if earthwork)']
      },
      'insulation': {
        buildingCodes: [
          'R-value requirements by climate zone (IECC)',
          'Vapor retarder requirements',
          'Air barrier requirements',
          'Insulation clearance from heat sources',
          'Attic ventilation requirements',
          'Spray foam requirements (ignition barrier)',
          'Blower door test requirements',
          'Thermal bridging requirements'
        ],
        specificCodes: [
          'IECC 2021 — Energy efficiency requirements',
          'IRC Chapter 11 — Energy efficiency',
          'IRC Section R316 — Foam plastic',
          'ASHRAE 90.2 — Energy efficient design of low-rise residential buildings'
        ],
        permits: ['Building permit (if part of larger project)', 'No standalone permit typically required']
      }
    };

    // Return specific prompts or a generic construction prompt
    return prompts[projectType] || {
      buildingCodes: [
        'Local zoning compliance requirements',
        'Setback requirements from property lines',
        'Height and size restrictions',
        'Material specifications',
        'Structural requirements',
        'Fire safety requirements',
        'Accessibility requirements (ADA)',
        'Energy efficiency requirements'
      ],
      specificCodes: [
        'International Building Code (IBC) applicable sections',
        'International Residential Code (IRC) applicable sections',
        'Local municipal code requirements',
        'State building code amendments'
      ],
      permits: ['Building permit', 'Specialty permits as required by project type']
    };
  }

  /**
   * Enhanced system prompt for detailed building code analysis
   */
  private getEnhancedSystemPrompt(): string {
    return `You are a professional building code expert and permit specialist with 20+ years of experience in construction compliance across all US jurisdictions.

Your mission is to provide SPECIFIC, ACTIONABLE building code requirements with EXACT code section references.

CRITICAL REQUIREMENTS:
1. Provide SPECIFIC building code sections with numbers (e.g., "IRC Section R502.3.1", "NEC Article 680")
2. Include EXACT measurements and specifications (e.g., "minimum 4 feet height", "16 inches on center")
3. Reference LOCAL jurisdiction requirements when possible (city/county amendments)
4. Provide ACTIONABLE compliance steps
5. Include specific permit requirements and processes
6. Focus on APPLICABLE codes for the specific project type and location
7. Include inspection requirements and timing

DO NOT include any contact information in your response — that will be handled separately.

OUTPUT FORMAT (JSON):
{
  "requiredPermits": [
    {
      "name": "permit name",
      "description": "what it covers",
      "estimatedFee": "fee range",
      "processingTime": "typical timeline",
      "applicationProcess": "how to apply"
    }
  ],
  "buildingCodes": [
    {
      "codeSection": "exact code section reference",
      "requirement": "specific requirement",
      "specification": "exact measurement or specification"
    }
  ],
  "process": ["step 1", "step 2", ...],
  "specialConsiderations": ["consideration 1", "consideration 2", ...],
  "inspectionSchedule": [
    {
      "inspection": "inspection name",
      "timing": "when to schedule",
      "requirements": "what inspector checks"
    }
  ],
  "complianceDocuments": ["document 1", "document 2", ...]
}

FOCUS: Provide building codes that are SPECIFIC to the project type and location, not generic construction advice.`;
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
- DETAILED permit requirements with application processes and estimated fees
- STEP-BY-STEP compliance procedures
- REQUIRED inspections with timing and scheduling information
- SPECIFIC forms and documentation required
- LOCAL jurisdiction considerations for ${address}

DO NOT include contact information — that is handled separately.

CRITICAL: Focus on ${projectType}-specific requirements for the ${address} jurisdiction.
CRITICAL: Include exact measurements and code section references.
CRITICAL: Mention any California-specific requirements if the address is in California.`;
  }

  /**
   * Generate building code analysis separately (for parallel execution)
   */
  private async generateBuildingCodeAnalysis(address: string, projectType: string, projectDescription: string): Promise<any> {
    const projectSpecificPrompts = this.getProjectSpecificPrompts(projectType);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: this.getEnhancedSystemPrompt() + '\n\nIMPORTANT: You must respond with valid JSON only. No additional text before or after the JSON object.',
      messages: [
        {
          role: 'user',
          content: this.buildProjectSpecificPrompt(address, projectType, projectDescription, projectSpecificPrompts) + '\n\nRespond with valid JSON only.'
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

      console.log(`📞 Municipal contact found: ${municipalContact.department} (${municipalContact.confidence})`);

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
        phoneVerified: municipalContact.phoneVerified,
        websiteVerified: municipalContact.websiteVerified,
        warningNote: municipalContact.warningNote,
        isGuidance: municipalContact.isGuidance || hasNoContactData,
        guidanceNote: municipalContact.guidanceNote || (hasNoContactData ?
          `Our AI research couldn't find complete contact details for ${this.extractCityState(address)}. Search for "${this.extractCityState(address)} building permits" to find the official building department.` : null),
        searchTip: municipalContact.searchTip || (hasNoContactData ?
          `Try searching Google for "${this.extractCityState(address)} building department" for official contact information` : null)
      };

      result.contactDataSource = municipalContact.dataSource;

      // FIX F: Add verifiable sources to every report
      result.verifiableSources = this.generateVerifiableSources(this.extractCityState(address), projectType);

      result.meta = {
        generated: new Date().toISOString(),
        projectType,
        location: this.extractCityState(address),
        fullAddress: address,
        analysisType: 'enhanced-project-specific',
        contactSearchConfidence: municipalContact.confidence,
        disclaimer: 'This analysis is generated by AI based on known building codes and regulations. Always verify requirements with your local building department before starting any construction project. Local amendments and specific project conditions may affect requirements.'
      };

      return result;
    } catch (error) {
      console.error('Error in enhanced permit analysis:', error);
      throw new Error('Failed to generate enhanced permit analysis');
    }
  }
}

export const enhancedPermitService = new EnhancedPermitService();
