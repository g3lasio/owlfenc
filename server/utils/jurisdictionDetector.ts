/**
 * Jurisdiction Detection Utility
 * Automatically detects the correct state jurisdiction based on project/contractor addresses
 */

interface StateInfo {
  name: string;
  code: string;
  contractTitle: string;
  governingLaw: string;
  licenseRequirement: string;
  constructionStandards: string;
}

// Comprehensive state mapping with legal specifics
const STATE_INFO: Record<string, StateInfo> = {
  // California
  CA: {
    name: "California",
    code: "CA",
    contractTitle: "California Construction Contract",
    governingLaw: "laws of the State of California",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of California",
    constructionStandards: "California building codes and construction standards"
  },
  
  // Texas
  TX: {
    name: "Texas",
    code: "TX", 
    contractTitle: "Texas Construction Contract",
    governingLaw: "laws of the State of Texas",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Texas",
    constructionStandards: "Texas building codes and construction standards"
  },
  
  // New York
  NY: {
    name: "New York",
    code: "NY",
    contractTitle: "New York Construction Contract", 
    governingLaw: "laws of the State of New York",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of New York",
    constructionStandards: "New York building codes and construction standards"
  },
  
  // Florida
  FL: {
    name: "Florida",
    code: "FL",
    contractTitle: "Florida Construction Contract",
    governingLaw: "laws of the State of Florida", 
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Florida",
    constructionStandards: "Florida building codes and construction standards"
  },
  
  // Illinois
  IL: {
    name: "Illinois",
    code: "IL",
    contractTitle: "Illinois Construction Contract",
    governingLaw: "laws of the State of Illinois",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Illinois", 
    constructionStandards: "Illinois building codes and construction standards"
  },
  
  // Pennsylvania
  PA: {
    name: "Pennsylvania", 
    code: "PA",
    contractTitle: "Pennsylvania Construction Contract",
    governingLaw: "laws of the Commonwealth of Pennsylvania",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the Commonwealth of Pennsylvania",
    constructionStandards: "Pennsylvania building codes and construction standards"
  },
  
  // Ohio
  OH: {
    name: "Ohio",
    code: "OH", 
    contractTitle: "Ohio Construction Contract",
    governingLaw: "laws of the State of Ohio",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Ohio",
    constructionStandards: "Ohio building codes and construction standards"
  },
  
  // Georgia
  GA: {
    name: "Georgia",
    code: "GA",
    contractTitle: "Georgia Construction Contract",
    governingLaw: "laws of the State of Georgia", 
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Georgia",
    constructionStandards: "Georgia building codes and construction standards"
  },
  
  // North Carolina
  NC: {
    name: "North Carolina",
    code: "NC",
    contractTitle: "North Carolina Construction Contract",
    governingLaw: "laws of the State of North Carolina",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of North Carolina",
    constructionStandards: "North Carolina building codes and construction standards"
  },
  
  // Michigan  
  MI: {
    name: "Michigan",
    code: "MI",
    contractTitle: "Michigan Construction Contract",
    governingLaw: "laws of the State of Michigan",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Michigan", 
    constructionStandards: "Michigan building codes and construction standards"
  },
  
  // New Jersey
  NJ: {
    name: "New Jersey",
    code: "NJ",
    contractTitle: "New Jersey Construction Contract",
    governingLaw: "laws of the State of New Jersey",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of New Jersey",
    constructionStandards: "New Jersey building codes and construction standards"
  },
  
  // Virginia
  VA: {
    name: "Virginia", 
    code: "VA",
    contractTitle: "Virginia Construction Contract",
    governingLaw: "laws of the Commonwealth of Virginia",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the Commonwealth of Virginia",
    constructionStandards: "Virginia building codes and construction standards"
  },
  
  // Washington
  WA: {
    name: "Washington",
    code: "WA",
    contractTitle: "Washington Construction Contract", 
    governingLaw: "laws of the State of Washington",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Washington",
    constructionStandards: "Washington building codes and construction standards"
  },
  
  // Arizona
  AZ: {
    name: "Arizona",
    code: "AZ",
    contractTitle: "Arizona Construction Contract",
    governingLaw: "laws of the State of Arizona",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Arizona",
    constructionStandards: "Arizona building codes and construction standards"
  },
  
  // Massachusetts
  MA: {
    name: "Massachusetts",
    code: "MA", 
    contractTitle: "Massachusetts Construction Contract",
    governingLaw: "laws of the Commonwealth of Massachusetts",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the Commonwealth of Massachusetts",
    constructionStandards: "Massachusetts building codes and construction standards"
  },
  
  // Tennessee
  TN: {
    name: "Tennessee",
    code: "TN",
    contractTitle: "Tennessee Construction Contract",
    governingLaw: "laws of the State of Tennessee",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Tennessee", 
    constructionStandards: "Tennessee building codes and construction standards"
  },
  
  // Indiana
  IN: {
    name: "Indiana",
    code: "IN",
    contractTitle: "Indiana Construction Contract", 
    governingLaw: "laws of the State of Indiana",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Indiana",
    constructionStandards: "Indiana building codes and construction standards"
  },
  
  // Missouri
  MO: {
    name: "Missouri",
    code: "MO",
    contractTitle: "Missouri Construction Contract",
    governingLaw: "laws of the State of Missouri",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Missouri",
    constructionStandards: "Missouri building codes and construction standards"
  },
  
  // Maryland
  MD: {
    name: "Maryland",
    code: "MD",
    contractTitle: "Maryland Construction Contract",
    governingLaw: "laws of the State of Maryland", 
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Maryland",
    constructionStandards: "Maryland building codes and construction standards"
  },
  
  // Wisconsin
  WI: {
    name: "Wisconsin",
    code: "WI",
    contractTitle: "Wisconsin Construction Contract",
    governingLaw: "laws of the State of Wisconsin",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Wisconsin",
    constructionStandards: "Wisconsin building codes and construction standards"
  },
  
  // Colorado
  CO: {
    name: "Colorado",
    code: "CO",
    contractTitle: "Colorado Construction Contract",
    governingLaw: "laws of the State of Colorado",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Colorado",
    constructionStandards: "Colorado building codes and construction standards"
  },
  
  // Minnesota
  MN: {
    name: "Minnesota",
    code: "MN", 
    contractTitle: "Minnesota Construction Contract",
    governingLaw: "laws of the State of Minnesota",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Minnesota",
    constructionStandards: "Minnesota building codes and construction standards"
  },
  
  // South Carolina
  SC: {
    name: "South Carolina",
    code: "SC",
    contractTitle: "South Carolina Construction Contract",
    governingLaw: "laws of the State of South Carolina",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of South Carolina",
    constructionStandards: "South Carolina building codes and construction standards"
  },
  
  // Alabama
  AL: {
    name: "Alabama",
    code: "AL",
    contractTitle: "Alabama Construction Contract",
    governingLaw: "laws of the State of Alabama", 
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Alabama",
    constructionStandards: "Alabama building codes and construction standards"
  },
  
  // Louisiana
  LA: {
    name: "Louisiana",
    code: "LA",
    contractTitle: "Louisiana Construction Contract",
    governingLaw: "laws of the State of Louisiana",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Louisiana",
    constructionStandards: "Louisiana building codes and construction standards"
  },
  
  // Kentucky
  KY: {
    name: "Kentucky",
    code: "KY",
    contractTitle: "Kentucky Construction Contract",
    governingLaw: "laws of the Commonwealth of Kentucky",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the Commonwealth of Kentucky",
    constructionStandards: "Kentucky building codes and construction standards"
  },
  
  // Oregon
  OR: {
    name: "Oregon", 
    code: "OR",
    contractTitle: "Oregon Construction Contract",
    governingLaw: "laws of the State of Oregon",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Oregon",
    constructionStandards: "Oregon building codes and construction standards"
  },
  
  // Oklahoma
  OK: {
    name: "Oklahoma",
    code: "OK",
    contractTitle: "Oklahoma Construction Contract",
    governingLaw: "laws of the State of Oklahoma",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Oklahoma",
    constructionStandards: "Oklahoma building codes and construction standards"
  },
  
  // Connecticut
  CT: {
    name: "Connecticut",
    code: "CT",
    contractTitle: "Connecticut Construction Contract",
    governingLaw: "laws of the State of Connecticut", 
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Connecticut",
    constructionStandards: "Connecticut building codes and construction standards"
  },
  
  // Utah
  UT: {
    name: "Utah",
    code: "UT",
    contractTitle: "Utah Construction Contract",
    governingLaw: "laws of the State of Utah",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Utah",
    constructionStandards: "Utah building codes and construction standards"
  },
  
  // Iowa
  IA: {
    name: "Iowa",
    code: "IA",
    contractTitle: "Iowa Construction Contract",
    governingLaw: "laws of the State of Iowa",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Iowa", 
    constructionStandards: "Iowa building codes and construction standards"
  },
  
  // Nevada
  NV: {
    name: "Nevada",
    code: "NV",
    contractTitle: "Nevada Construction Contract",
    governingLaw: "laws of the State of Nevada",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Nevada",
    constructionStandards: "Nevada building codes and construction standards"
  },
  
  // Arkansas
  AR: {
    name: "Arkansas",
    code: "AR", 
    contractTitle: "Arkansas Construction Contract",
    governingLaw: "laws of the State of Arkansas",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Arkansas",
    constructionStandards: "Arkansas building codes and construction standards"
  },
  
  // Mississippi
  MS: {
    name: "Mississippi",
    code: "MS",
    contractTitle: "Mississippi Construction Contract",
    governingLaw: "laws of the State of Mississippi",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Mississippi",
    constructionStandards: "Mississippi building codes and construction standards"
  },
  
  // Kansas
  KS: {
    name: "Kansas",
    code: "KS",
    contractTitle: "Kansas Construction Contract",
    governingLaw: "laws of the State of Kansas",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Kansas",
    constructionStandards: "Kansas building codes and construction standards"
  },
  
  // New Mexico
  NM: {
    name: "New Mexico",
    code: "NM",
    contractTitle: "New Mexico Construction Contract",
    governingLaw: "laws of the State of New Mexico",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of New Mexico",
    constructionStandards: "New Mexico building codes and construction standards"
  },
  
  // Nebraska
  NE: {
    name: "Nebraska",
    code: "NE",
    contractTitle: "Nebraska Construction Contract",
    governingLaw: "laws of the State of Nebraska",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Nebraska",
    constructionStandards: "Nebraska building codes and construction standards"
  },
  
  // West Virginia
  WV: {
    name: "West Virginia", 
    code: "WV",
    contractTitle: "West Virginia Construction Contract",
    governingLaw: "laws of the State of West Virginia",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of West Virginia",
    constructionStandards: "West Virginia building codes and construction standards"
  },
  
  // Idaho
  ID: {
    name: "Idaho",
    code: "ID",
    contractTitle: "Idaho Construction Contract",
    governingLaw: "laws of the State of Idaho",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Idaho",
    constructionStandards: "Idaho building codes and construction standards"
  },
  
  // Hawaii
  HI: {
    name: "Hawaii",
    code: "HI",
    contractTitle: "Hawaii Construction Contract",
    governingLaw: "laws of the State of Hawaii",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Hawaii", 
    constructionStandards: "Hawaii building codes and construction standards"
  },
  
  // New Hampshire
  NH: {
    name: "New Hampshire",
    code: "NH",
    contractTitle: "New Hampshire Construction Contract",
    governingLaw: "laws of the State of New Hampshire",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of New Hampshire",
    constructionStandards: "New Hampshire building codes and construction standards"
  },
  
  // Maine
  ME: {
    name: "Maine",
    code: "ME",
    contractTitle: "Maine Construction Contract",
    governingLaw: "laws of the State of Maine",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Maine",
    constructionStandards: "Maine building codes and construction standards"
  },
  
  // Montana
  MT: {
    name: "Montana",
    code: "MT",
    contractTitle: "Montana Construction Contract",
    governingLaw: "laws of the State of Montana",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Montana",
    constructionStandards: "Montana building codes and construction standards"
  },
  
  // Rhode Island
  RI: {
    name: "Rhode Island",
    code: "RI",
    contractTitle: "Rhode Island Construction Contract",
    governingLaw: "laws of the State of Rhode Island",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Rhode Island",
    constructionStandards: "Rhode Island building codes and construction standards"
  },
  
  // Delaware
  DE: {
    name: "Delaware",
    code: "DE",
    contractTitle: "Delaware Construction Contract",
    governingLaw: "laws of the State of Delaware",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Delaware",
    constructionStandards: "Delaware building codes and construction standards"
  },
  
  // South Dakota
  SD: {
    name: "South Dakota",
    code: "SD",
    contractTitle: "South Dakota Construction Contract",
    governingLaw: "laws of the State of South Dakota",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of South Dakota",
    constructionStandards: "South Dakota building codes and construction standards"
  },
  
  // North Dakota
  ND: {
    name: "North Dakota",
    code: "ND",
    contractTitle: "North Dakota Construction Contract",
    governingLaw: "laws of the State of North Dakota",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of North Dakota",
    constructionStandards: "North Dakota building codes and construction standards"
  },
  
  // Alaska
  AK: {
    name: "Alaska",
    code: "AK",
    contractTitle: "Alaska Construction Contract",
    governingLaw: "laws of the State of Alaska",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Alaska",
    constructionStandards: "Alaska building codes and construction standards"
  },
  
  // Vermont
  VT: {
    name: "Vermont",
    code: "VT",
    contractTitle: "Vermont Construction Contract",
    governingLaw: "laws of the State of Vermont",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Vermont",
    constructionStandards: "Vermont building codes and construction standards"
  },
  
  // Wyoming
  WY: {
    name: "Wyoming",
    code: "WY",
    contractTitle: "Wyoming Construction Contract",
    governingLaw: "laws of the State of Wyoming",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the State of Wyoming",
    constructionStandards: "Wyoming building codes and construction standards"
  },
  
  // District of Columbia
  DC: {
    name: "District of Columbia",
    code: "DC",
    contractTitle: "District of Columbia Construction Contract",
    governingLaw: "laws of the District of Columbia",
    licenseRequirement: "licensed construction professional authorized to perform construction services in the District of Columbia",
    constructionStandards: "District of Columbia building codes and construction standards"
  }
};

/**
 * Extract state code from address string
 */
export function extractStateFromAddress(address: string): string | null {
  if (!address) return null;
  
  // Common patterns for state detection
  const patterns = [
    // State abbreviations (CA, TX, NY, etc.)
    /\b([A-Z]{2})\b(?:\s+\d{5})?$/,
    /,\s*([A-Z]{2})\s*(?:\d{5})?$/,
    /,\s*([A-Z]{2})\s*,/,
    
    // Full state names
    /,\s*(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|District of Columbia)\s*(?:,|\d{5}|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) {
      const state = match[1].toUpperCase();
      
      // Convert full state names to abbreviations
      const stateMap: Record<string, string> = {
        'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
        'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
        'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
        'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
        'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
        'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
        'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
        'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
        'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
        'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
        'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
        'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
        'WISCONSIN': 'WI', 'WYOMING': 'WY', 'DISTRICT OF COLUMBIA': 'DC'
      };
      
      return stateMap[state] || (state.length === 2 ? state : null);
    }
  }
  
  return null;
}

/**
 * Determine jurisdiction based on project and contractor addresses
 * Priority: Project location > Contractor location > Default (CA)
 */
export function determineJurisdiction(projectAddress?: string, contractorAddress?: string): StateInfo {
  console.log(`🔍 [JURISDICTION] Determining jurisdiction...`);
  console.log(`📍 [JURISDICTION] Project address: ${projectAddress}`);
  console.log(`🏢 [JURISDICTION] Contractor address: ${contractorAddress}`);
  
  // Try project address first (where work is performed)
  if (projectAddress) {
    const projectState = extractStateFromAddress(projectAddress);
    if (projectState && STATE_INFO[projectState]) {
      console.log(`✅ [JURISDICTION] Detected project state: ${projectState} (${STATE_INFO[projectState].name})`);
      return STATE_INFO[projectState];
    }
  }
  
  // Try contractor address as fallback
  if (contractorAddress) {
    const contractorState = extractStateFromAddress(contractorAddress);
    if (contractorState && STATE_INFO[contractorState]) {
      console.log(`✅ [JURISDICTION] Detected contractor state: ${contractorState} (${STATE_INFO[contractorState].name})`);
      return STATE_INFO[contractorState];
    }
  }
  
  // Default to California if no state detected
  console.log(`⚠️ [JURISDICTION] No valid state detected, defaulting to California`);
  return STATE_INFO.CA;
}

/**
 * Get state info by state code
 */
export function getStateInfo(stateCode: string): StateInfo | null {
  return STATE_INFO[stateCode.toUpperCase()] || null;
}

/**
 * List all supported states
 */
export function getSupportedStates(): StateInfo[] {
  return Object.values(STATE_INFO);
}