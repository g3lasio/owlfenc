/**
 * 🗺️ NATIONWIDE JURISDICTION DETECTOR
 * Sistema de detección inteligente de jurisdicción para todos los estados de USA
 */

export interface StateInfo {
  name: string;
  code: string;
  region: 'Northeast' | 'Southeast' | 'Midwest' | 'Southwest' | 'West' | 'Northwest' | 'Pacific';
  timezone: string;
  majorCities: string[];
  constructionBoard: string;
  constructionBoardUrl: string;
  buildingCodes: string[];
  permitRequirements: string[];
  contractorLicenseRequired: boolean;
  minimumInsurance: string;
  prevailingWageRequired: boolean;
  mechanicsLienLaws: string;
  specialRequirements?: string[];
}

export class NationwideJurisdictionDetector {
  private readonly stateDatabase: Map<string, StateInfo> = new Map();

  constructor() {
    this.initializeStatesDatabase();
  }

  private initializeStatesDatabase() {
    const states: StateInfo[] = [
      // WEST COAST
      {
        name: 'California',
        code: 'CA',
        region: 'West',
        timezone: 'Pacific',
        majorCities: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Fresno'],
        constructionBoard: 'Contractors State License Board (CSLB)',
        constructionBoardUrl: 'https://www.cslb.ca.gov',
        buildingCodes: ['California Building Code (CBC)', 'California Electrical Code', 'California Plumbing Code'],
        permitRequirements: ['Building permit required for structures >120 sq ft', 'Electrical permit for new circuits'],
        contractorLicenseRequired: true,
        minimumInsurance: '$15,000 surety bond + liability insurance',
        prevailingWageRequired: true,
        mechanicsLienLaws: 'California Civil Code §8000-8850'
      },
      
      // TEXAS
      {
        name: 'Texas',
        code: 'TX',
        region: 'Southwest',
        timezone: 'Central',
        majorCities: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
        constructionBoard: 'Texas Department of Licensing and Regulation (TDLR)',
        constructionBoardUrl: 'https://www.tdlr.texas.gov',
        buildingCodes: ['International Building Code (IBC)', 'Texas Building Energy Efficiency Standards'],
        permitRequirements: ['Building permit for most construction', 'Electrical permit required'],
        contractorLicenseRequired: false, // Most trades don't require state license
        minimumInsurance: 'Varies by municipality',
        prevailingWageRequired: false,
        mechanicsLienLaws: 'Texas Property Code Chapter 53'
      },

      // FLORIDA
      {
        name: 'Florida',
        code: 'FL',
        region: 'Southeast',
        timezone: 'Eastern',
        majorCities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale'],
        constructionBoard: 'Florida Department of Business and Professional Regulation',
        constructionBoardUrl: 'https://www.myfloridalicense.com',
        buildingCodes: ['Florida Building Code (FBC)', 'Florida Fire Prevention Code'],
        permitRequirements: ['Building permit required', 'Hurricane resistance standards'],
        contractorLicenseRequired: true,
        minimumInsurance: '$10,000+ liability coverage',
        prevailingWageRequired: false,
        mechanicsLienLaws: 'Florida Statutes Chapter 713',
        specialRequirements: ['Hurricane/wind resistance', 'Flood zone considerations']
      },

      // NEW YORK
      {
        name: 'New York',
        code: 'NY',
        region: 'Northeast',
        timezone: 'Eastern',
        majorCities: ['New York City', 'Buffalo', 'Rochester', 'Syracuse', 'Albany'],
        constructionBoard: 'New York State Department of Labor',
        constructionBoardUrl: 'https://www.labor.ny.gov',
        buildingCodes: ['New York State Building Code', 'New York City Building Code (NYC specific)'],
        permitRequirements: ['Building permit required', 'DOB permits for NYC'],
        contractorLicenseRequired: true,
        minimumInsurance: 'Varies by locality',
        prevailingWageRequired: true,
        mechanicsLienLaws: 'New York Lien Law Article 2'
      },

      // ILLINOIS
      {
        name: 'Illinois',
        code: 'IL',
        region: 'Midwest',
        timezone: 'Central',
        majorCities: ['Chicago', 'Aurora', 'Peoria', 'Rockford', 'Joliet'],
        constructionBoard: 'Illinois Department of Financial and Professional Regulation',
        constructionBoardUrl: 'https://www.idfpr.com',
        buildingCodes: ['Illinois State Building Code', 'Chicago Building Code (Chicago specific)'],
        permitRequirements: ['Building permit required', 'Chicago has specific requirements'],
        contractorLicenseRequired: false, // Home improvement contractors only
        minimumInsurance: 'Varies by municipality',
        prevailingWageRequired: true,
        mechanicsLienLaws: 'Illinois Mechanics Lien Act'
      },

      // ARIZONA
      {
        name: 'Arizona',
        code: 'AZ',
        region: 'Southwest',
        timezone: 'Mountain',
        majorCities: ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale'],
        constructionBoard: 'Arizona Registrar of Contractors',
        constructionBoardUrl: 'https://roc.az.gov',
        buildingCodes: ['International Building Code (IBC)', 'Arizona Building Code'],
        permitRequirements: ['Building permit required for most work'],
        contractorLicenseRequired: true,
        minimumInsurance: '$750,000 liability + surety bond',
        prevailingWageRequired: false,
        mechanicsLienLaws: 'Arizona Revised Statutes Title 33 Chapter 7'
      },

      // WASHINGTON
      {
        name: 'Washington',
        code: 'WA',
        region: 'Northwest',
        timezone: 'Pacific',
        majorCities: ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue'],
        constructionBoard: 'Washington State Department of Labor & Industries',
        constructionBoardUrl: 'https://www.lni.wa.gov',
        buildingCodes: ['Washington State Building Code', 'International Building Code base'],
        permitRequirements: ['Building permit required', 'Seismic considerations'],
        contractorLicenseRequired: true,
        minimumInsurance: 'Varies by trade and project size',
        prevailingWageRequired: true,
        mechanicsLienLaws: 'Washington Revised Code Chapter 60.04'
      }

      // TODO: Add remaining 43 states - this is a foundation with major states
    ];

    states.forEach(state => {
      this.stateDatabase.set(state.code.toLowerCase(), state);
      this.stateDatabase.set(state.name.toLowerCase(), state);
      
      // Add major cities mapping
      state.majorCities.forEach(city => {
        this.stateDatabase.set(`${city.toLowerCase()}-${state.code.toLowerCase()}`, state);
      });
    });
  }

  /**
   * Detecta jurisdicción desde dirección completa
   */
  detectFromAddress(address: string): StateInfo | null {
    const normalized = address.toLowerCase().trim();
    
    // Patrones de detección
    const statePatterns = [
      /\b([a-z]{2})\s*\d{5}/,  // State code + ZIP
      /,\s*([a-z]{2})\s*$/,     // Ending with state
      /\b(california|texas|florida|new york|illinois|arizona|washington)\b/
    ];

    for (const pattern of statePatterns) {
      const match = normalized.match(pattern);
      if (match) {
        const detected = this.stateDatabase.get(match[1]);
        if (detected) return detected;
      }
    }

    // City detection fallback
    for (const [key, state] of this.stateDatabase) {
      if (key.includes('-') && normalized.includes(key.split('-')[0])) {
        return state;
      }
    }

    return null;
  }

  /**
   * Obtiene información completa del estado
   */
  getStateInfo(stateCodeOrName: string): StateInfo | null {
    return this.stateDatabase.get(stateCodeOrName.toLowerCase()) || null;
  }

  /**
   * Lista todos los estados soportados
   */
  getAllStates(): StateInfo[] {
    const uniqueStates = new Map<string, StateInfo>();
    const stateValues = Array.from(this.stateDatabase.values());
    for (const state of stateValues) {
      uniqueStates.set(state.code, state);
    }
    return Array.from(uniqueStates.values());
  }

  /**
   * Encuentra estados por región
   */
  getStatesByRegion(region: StateInfo['region']): StateInfo[] {
    return this.getAllStates().filter(state => state.region === region);
  }
}

export const jurisdictionDetector = new NationwideJurisdictionDetector();