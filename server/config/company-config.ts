/**
 * 🏢 CONFIGURACIÓN DE EMPRESA NATIONWIDE
 * 
 * Sistema configurable para direcciones y datos de empresa que reemplaza
 * las direcciones hardcodeadas de California con configuración dinámica.
 */

export interface CompanyConfig {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    fullAddress: string;
  };
  contact: {
    phone: string;
    email: string;
    website: string;
  };
  licensing: {
    licenseNumber?: string;
    bondAmount?: string;
    insuranceInfo?: string;
  };
  legal: {
    jurisdiction: string;
    businessEntity: string;
  };
}

// 🗺️ CONFIGURACIONES POR REGIÓN
const COMPANY_CONFIGS: Record<string, CompanyConfig> = {
  // California (Original/Default)
  california: {
    name: "OWL FENC",
    address: {
      street: "2901 Owens Court",
      city: "Fairfield",
      state: "California", 
      zipCode: "94534",
      fullAddress: "2901 Owens Court, Fairfield, California 94534"
    },
    contact: {
      phone: "(707) 555-0123",
      email: "info@owlfenc.com",
      website: "www.owlfenc.com"
    },
    licensing: {
      licenseNumber: "C-13 License #123456",
      bondAmount: "$15,000",
      insuranceInfo: "General Liability & Workers Comp"
    },
    legal: {
      jurisdiction: "California",
      businessEntity: "LLC"
    }
  },

  // Texas Expansion
  texas: {
    name: "OWL FENC TEXAS",
    address: {
      street: "1234 Construction Blvd",
      city: "Austin",
      state: "Texas",
      zipCode: "78701",
      fullAddress: "1234 Construction Blvd, Austin, Texas 78701"
    },
    contact: {
      phone: "(512) 555-0123",
      email: "texas@owlfenc.com",
      website: "www.owlfenc.com/texas"
    },
    licensing: {
      licenseNumber: "TX License #TX123456",
      bondAmount: "$10,000",
      insuranceInfo: "General Liability & Workers Comp"
    },
    legal: {
      jurisdiction: "Texas",
      businessEntity: "LLC"
    }
  },

  // Florida Expansion
  florida: {
    name: "OWL FENC FLORIDA",
    address: {
      street: "5678 Sunshine Ave",
      city: "Miami",
      state: "Florida",
      zipCode: "33139",
      fullAddress: "5678 Sunshine Ave, Miami, Florida 33139"
    },
    contact: {
      phone: "(305) 555-0123",
      email: "florida@owlfenc.com",
      website: "www.owlfenc.com/florida"
    },
    licensing: {
      licenseNumber: "FL License #FL123456",
      bondAmount: "$12,000",
      insuranceInfo: "General Liability & Workers Comp"
    },
    legal: {
      jurisdiction: "Florida", 
      businessEntity: "LLC"
    }
  },

  // Configuración genérica para otros estados
  nationwide: {
    name: "OWL FENC",
    address: {
      street: "123 Main Street",
      city: "Your City",
      state: "Your State",
      zipCode: "12345",
      fullAddress: "123 Main Street, Your City, Your State 12345"
    },
    contact: {
      phone: "(555) 123-4567",
      email: "info@owlfenc.com",
      website: "www.owlfenc.com"
    },
    licensing: {
      licenseNumber: "Check local requirements",
      bondAmount: "Varies by state",
      insuranceInfo: "General Liability & Workers Comp"
    },
    legal: {
      jurisdiction: "Varies by location",
      businessEntity: "LLC"
    }
  }
};

/**
 * 🗺️ FUNCIÓN PRINCIPAL: Obtener configuración según ubicación
 */
export function getCompanyConfig(location?: string): CompanyConfig {
  try {
    if (!location) {
      console.log('📍 [COMPANY-CONFIG] No location provided, using California default');
      return COMPANY_CONFIGS.california;
    }

    const locationLower = location.toLowerCase();
    
    // Detectar estado específico
    if (locationLower.includes('california') || locationLower.includes('ca')) {
      return COMPANY_CONFIGS.california;
    }
    
    if (locationLower.includes('texas') || locationLower.includes('tx')) {
      return COMPANY_CONFIGS.texas;
    }
    
    if (locationLower.includes('florida') || locationLower.includes('fl')) {
      return COMPANY_CONFIGS.florida;
    }
    
    // Para otros estados, usar configuración genérica
    console.log(`📍 [COMPANY-CONFIG] Using nationwide config for location: ${location}`);
    return COMPANY_CONFIGS.nationwide;
    
  } catch (error) {
    console.error('❌ [COMPANY-CONFIG] Error getting config:', error);
    return COMPANY_CONFIGS.california; // Fallback seguro
  }
}

/**
 * 🎯 FUNCIONES HELPER ESPECÍFICAS
 */
export function getCompanyAddress(location?: string): string {
  return getCompanyConfig(location).address.fullAddress;
}

export function getCompanyName(location?: string): string {
  return getCompanyConfig(location).name;
}

export function getCompanyPhone(location?: string): string {
  return getCompanyConfig(location).contact.phone;
}

export function getCompanyEmail(location?: string): string {
  return getCompanyConfig(location).contact.email;
}

/**
 * 🔧 CONFIGURACIÓN POR VARIABLES DE ENTORNO
 */
export function getCompanyConfigFromEnv(): CompanyConfig {
  const envConfig: CompanyConfig = {
    name: process.env.COMPANY_NAME || "OWL FENC",
    address: {
      street: process.env.COMPANY_STREET || "2901 Owens Court",
      city: process.env.COMPANY_CITY || "Fairfield",
      state: process.env.COMPANY_STATE || "California",
      zipCode: process.env.COMPANY_ZIP || "94534",
      fullAddress: process.env.COMPANY_FULL_ADDRESS || 
        `${process.env.COMPANY_STREET || "2901 Owens Court"}, ${process.env.COMPANY_CITY || "Fairfield"}, ${process.env.COMPANY_STATE || "California"} ${process.env.COMPANY_ZIP || "94534"}`
    },
    contact: {
      phone: process.env.COMPANY_PHONE || "(707) 555-0123",
      email: process.env.COMPANY_EMAIL || "info@owlfenc.com", 
      website: process.env.COMPANY_WEBSITE || "www.owlfenc.com"
    },
    licensing: {
      licenseNumber: process.env.COMPANY_LICENSE || "C-13 License #123456",
      bondAmount: process.env.COMPANY_BOND || "$15,000",
      insuranceInfo: process.env.COMPANY_INSURANCE || "General Liability & Workers Comp"
    },
    legal: {
      jurisdiction: process.env.COMPANY_JURISDICTION || "California",
      businessEntity: process.env.COMPANY_ENTITY || "LLC"
    }
  };

  return envConfig;
}

// Para logging de configuración actual
export function logCurrentConfig(location?: string): void {
  const config = getCompanyConfig(location);
  console.log('🏢 [COMPANY-CONFIG] Current configuration:', {
    name: config.name,
    state: config.address.state,
    jurisdiction: config.legal.jurisdiction
  });
}