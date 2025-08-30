/**
 * 🔍 NATIONWIDE RESEARCH SERVICE  
 * Sistema de investigación expandido para todos los estados de USA
 */

import { StateInfo, jurisdictionDetector } from './JurisdictionDetector.js';

export interface ResearchSource {
  name: string;
  url: string;
  authority: 'federal' | 'state' | 'local' | 'industry';
  reliability: 'high' | 'medium' | 'low';
  specialties: string[];
}

export interface NationwideResearchResult {
  query: string;
  location: string;
  stateInfo: StateInfo | null;
  sources: ResearchSource[];
  federalSources: ResearchSource[];
  stateSources: ResearchSource[];
  localSources: ResearchSource[];
  insights: string[];
  regulations: string[];
  costFactors: string[];
  specialConsiderations: string[];
  nextSteps: string[];
}

export class NationwideResearchService {
  private readonly federalSources: ResearchSource[] = [
    {
      name: 'International Code Council (ICC)',
      url: 'https://www.iccsafe.org',
      authority: 'federal',
      reliability: 'high',
      specialties: ['building codes', 'construction standards', 'safety requirements']
    },
    {
      name: 'U.S. Department of Labor - OSHA',
      url: 'https://www.osha.gov',
      authority: 'federal',
      reliability: 'high',
      specialties: ['safety standards', 'workplace regulations', 'construction safety']
    },
    {
      name: 'HUD - Department of Housing and Urban Development',
      url: 'https://www.hud.gov',
      authority: 'federal',
      reliability: 'high',
      specialties: ['housing standards', 'accessibility requirements', 'federal programs']
    },
    {
      name: 'Environmental Protection Agency (EPA)',
      url: 'https://www.epa.gov',
      authority: 'federal',
      reliability: 'high',
      specialties: ['environmental compliance', 'lead paint regulations', 'asbestos rules']
    },
    {
      name: 'National Association of Home Builders (NAHB)',
      url: 'https://www.nahb.org',
      authority: 'industry',
      reliability: 'high',
      specialties: ['construction best practices', 'cost data', 'industry trends']
    }
  ];

  private readonly stateSourceDatabase: Map<string, ResearchSource[]> = new Map();

  constructor() {
    this.initializeStateSources();
  }

  private initializeStateSources() {
    // CALIFORNIA
    this.stateSourceDatabase.set('CA', [
      {
        name: 'Contractors State License Board (CSLB)',
        url: 'https://www.cslb.ca.gov',
        authority: 'state',
        reliability: 'high',
        specialties: ['contractor licensing', 'construction regulations', 'consumer protection']
      },
      {
        name: 'California Building Standards Commission',
        url: 'https://www.dgs.ca.gov/BSC',
        authority: 'state',
        reliability: 'high',
        specialties: ['building codes', 'construction standards', 'accessibility']
      },
      {
        name: 'California Energy Commission',
        url: 'https://www.energy.ca.gov',
        authority: 'state',
        reliability: 'high',
        specialties: ['energy efficiency', 'Title 24', 'green building']
      }
    ]);

    // TEXAS
    this.stateSourceDatabase.set('TX', [
      {
        name: 'Texas Department of Licensing and Regulation (TDLR)',
        url: 'https://www.tdlr.texas.gov',
        authority: 'state',
        reliability: 'high',
        specialties: ['contractor licensing', 'electrical regulations', 'plumbing codes']
      },
      {
        name: 'Texas Commission on Environmental Quality',
        url: 'https://www.tceq.texas.gov',
        authority: 'state',
        reliability: 'high',
        specialties: ['environmental permits', 'air quality', 'water regulations']
      }
    ]);

    // FLORIDA
    this.stateSourceDatabase.set('FL', [
      {
        name: 'Florida Department of Business and Professional Regulation',
        url: 'https://www.myfloridalicense.com',
        authority: 'state',
        reliability: 'high',
        specialties: ['contractor licensing', 'construction regulations', 'professional licensing']
      },
      {
        name: 'Florida Building Commission',
        url: 'https://www.floridabuilding.org',
        authority: 'state',
        reliability: 'high',
        specialties: ['Florida Building Code', 'hurricane standards', 'construction permits']
      }
    ]);

    // NEW YORK
    this.stateSourceDatabase.set('NY', [
      {
        name: 'New York State Department of Labor',
        url: 'https://www.labor.ny.gov',
        authority: 'state',
        reliability: 'high',
        specialties: ['construction safety', 'prevailing wages', 'worker protection']
      },
      {
        name: 'New York State Division of Building Standards',
        url: 'https://www.dos.ny.gov/dcea',
        authority: 'state',
        reliability: 'high',
        specialties: ['building codes', 'construction standards', 'accessibility']
      }
    ]);

    // ILLINOIS
    this.stateSourceDatabase.set('IL', [
      {
        name: 'Illinois Department of Financial and Professional Regulation',
        url: 'https://www.idfpr.com',
        authority: 'state',
        reliability: 'high',
        specialties: ['contractor licensing', 'professional regulation', 'home improvement']
      }
    ]);

    // ARIZONA
    this.stateSourceDatabase.set('AZ', [
      {
        name: 'Arizona Registrar of Contractors',
        url: 'https://roc.az.gov',
        authority: 'state',
        reliability: 'high',
        specialties: ['contractor licensing', 'construction regulations', 'consumer protection']
      }
    ]);

    // WASHINGTON
    this.stateSourceDatabase.set('WA', [
      {
        name: 'Washington State Department of Labor & Industries',
        url: 'https://www.lni.wa.gov',
        authority: 'state',
        reliability: 'high',
        specialties: ['contractor licensing', 'safety standards', 'construction regulations']
      }
    ]);

    // TODO: Add remaining states
  }

  /**
   * Realiza investigación comprehensiva nationwide
   */
  async conductNationwideResearch(query: string, location: string): Promise<NationwideResearchResult> {
    const stateInfo = jurisdictionDetector.detectFromAddress(location);
    
    const result: NationwideResearchResult = {
      query,
      location,
      stateInfo,
      sources: [],
      federalSources: this.federalSources,
      stateSources: [],
      localSources: [],
      insights: [],
      regulations: [],
      costFactors: [],
      specialConsiderations: [],
      nextSteps: []
    };

    // Add state-specific sources
    if (stateInfo) {
      result.stateSources = this.stateSourceDatabase.get(stateInfo.code) || [];
    }

    // Combine all sources
    result.sources = [
      ...result.federalSources,
      ...result.stateSources,
      ...result.localSources
    ];

    // Generate insights based on query type
    await this.generateInsights(query, stateInfo, result);

    return result;
  }

  private async generateInsights(query: string, stateInfo: StateInfo | null, result: NationwideResearchResult) {
    const queryLower = query.toLowerCase();

    // PERMIT-related insights
    if (queryLower.includes('permit') || queryLower.includes('permission')) {
      result.insights.push('Building permits are required for most structural work nationwide');
      result.insights.push('Permit requirements vary significantly by local jurisdiction');
      
      if (stateInfo) {
        result.insights.push(`In ${stateInfo.name}, contact ${stateInfo.constructionBoard} for state requirements`);
        result.regulations.push(...stateInfo.permitRequirements);
      }
      
      result.nextSteps.push('Contact local building department for specific permit requirements');
      result.nextSteps.push('Verify all contractors have proper licensing');
    }

    // PRICING/COST-related insights  
    if (queryLower.includes('cost') || queryLower.includes('price') || queryLower.includes('estimate')) {
      result.insights.push('Construction costs vary significantly by region and local economic factors');
      result.costFactors.push('Regional labor costs', 'Local material availability', 'Permit and inspection fees');
      
      if (stateInfo) {
        // Regional cost factors
        switch (stateInfo.region) {
          case 'West':
            result.costFactors.push('Higher labor costs', 'Seismic requirements', 'Environmental regulations');
            break;
          case 'Southeast':
            result.costFactors.push('Hurricane resistance requirements', 'Humidity/moisture considerations');
            break;
          case 'Northeast':
            result.costFactors.push('Cold weather requirements', 'Historic district restrictions');
            break;
          case 'Midwest':
            result.costFactors.push('Severe weather resistance', 'Seasonal work limitations');
            break;
        }
        
        if (stateInfo.prevailingWageRequired) {
          result.costFactors.push('Prevailing wage requirements for public projects');
        }
      }
      
      result.nextSteps.push('Get multiple quotes from licensed contractors');
      result.nextSteps.push('Factor in regional cost variations');
    }

    // MATERIALS-related insights
    if (queryLower.includes('material') || queryLower.includes('vinyl') || queryLower.includes('wood') || queryLower.includes('fence')) {
      result.insights.push('Material selection depends on local climate and building codes');
      result.insights.push('Check local availability and approved materials lists');
      
      if (stateInfo) {
        // Regional material considerations
        switch (stateInfo.region) {
          case 'West':
            result.specialConsiderations.push('Fire-resistant materials in wildfire zones');
            result.specialConsiderations.push('Seismic-resistant installation methods');
            break;
          case 'Southeast':
            result.specialConsiderations.push('Hurricane-rated materials required in coastal areas');
            result.specialConsiderations.push('Moisture and mold resistance important');
            break;
          case 'Northeast':
            result.specialConsiderations.push('Cold-weather installation considerations');
            result.specialConsiderations.push('Frost-resistant materials and installation');
            break;
        }
      }
      
      result.nextSteps.push('Verify materials meet local building codes');
      result.nextSteps.push('Consider climate-specific material requirements');
    }

    // LICENSE-related insights
    if (queryLower.includes('license') || queryLower.includes('contractor')) {
      result.insights.push('Contractor licensing requirements vary by state');
      
      if (stateInfo) {
        if (stateInfo.contractorLicenseRequired) {
          result.regulations.push(`Contractor license required in ${stateInfo.name}`);
          result.regulations.push(`Verify license through ${stateInfo.constructionBoard}`);
        } else {
          result.regulations.push(`State contractor license not required in ${stateInfo.name}, but local licensing may apply`);
        }
      }
      
      result.nextSteps.push('Verify contractor licensing for your specific location');
      result.nextSteps.push('Check insurance and bonding requirements');
    }

    // Add general nationwide considerations
    result.specialConsiderations.push('Local ordinances may have additional requirements beyond state codes');
    result.specialConsiderations.push('HOA regulations may apply in addition to municipal codes');
    result.nextSteps.push('Consult with local building department early in planning process');
  }

  /**
   * Búsqueda express optimizada por estado
   */
  async expressStateResearch(query: string, location: string): Promise<{
    sources: ResearchSource[];
    quickInsights: string[];
    estimatedCost?: { low: number; high: number; unit: string };
    regulatoryAlerts: string[];
  }> {
    const stateInfo = jurisdictionDetector.detectFromAddress(location);
    
    const result = {
      sources: [...this.federalSources],
      quickInsights: [],
      regulatoryAlerts: []
    };

    if (stateInfo) {
      result.sources.push(...(this.stateSourceDatabase.get(stateInfo.code) || []));
      
      // Quick state-specific insights
      result.quickInsights.push(`Research for ${stateInfo.name} (${stateInfo.region} region)`);
      result.quickInsights.push(`Primary authority: ${stateInfo.constructionBoard}`);
      
      // Regulatory alerts
      if (stateInfo.contractorLicenseRequired) {
        result.regulatoryAlerts.push('State contractor license required');
      }
      if (stateInfo.prevailingWageRequired) {
        result.regulatoryAlerts.push('Prevailing wage laws may apply');
      }
      
      // Special state considerations
      if (stateInfo.specialRequirements) {
        result.regulatoryAlerts.push(...stateInfo.specialRequirements);
      }
    } else {
      result.quickInsights.push('Location not recognized - using federal sources only');
      result.regulatoryAlerts.push('Unable to determine state-specific requirements');
    }

    return result;
  }

  /**
   * Obtiene fuentes por tipo de autoridad
   */
  getSourcesByAuthority(authority: ResearchSource['authority'], stateCode?: string): ResearchSource[] {
    let sources: ResearchSource[] = [];
    
    if (authority === 'federal') {
      sources = this.federalSources;
    } else if (authority === 'state' && stateCode) {
      sources = this.stateSourceDatabase.get(stateCode) || [];
    }
    
    return sources.filter(source => source.authority === authority);
  }
}

export const nationwideResearchService = new NationwideResearchService();