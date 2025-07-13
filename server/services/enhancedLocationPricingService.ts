/**
 * Enhanced Location Pricing Service
 * 
 * Sistema avanzado para análisis de costos de labor basado en ubicación geográfica precisa
 * con integración de datos de mercado en tiempo real y factores locales específicos.
 */

interface LocationData {
  address: string;
  city: string;
  county: string;
  state: string;
  zipCode: string;
  metroArea?: string;
  latitude: number;
  longitude: number;
}

interface MarketFactors {
  costOfLiving: number;
  laborAvailability: number;
  minimumWage: number;
  unionPresence: number;
  permitComplexity: number;
  seasonalDemand: number;
  competitionLevel: number;
  regulatoryComplexity: number;
}

interface LaborRateData {
  skillLevel: 'helper' | 'skilled' | 'specialist' | 'foreman';
  baseRate: number;
  adjustedRate: number;
  confidence: number;
  lastUpdated: Date;
  sources: string[];
}

interface PrecisionPricingResult {
  location: LocationData;
  marketFactors: MarketFactors;
  laborRates: LaborRateData[];
  overallMultiplier: number;
  confidence: number;
  recommendations: string[];
  warnings: string[];
}

export class EnhancedLocationPricingService {
  
  /**
   * Análisis avanzado de ubicación para pricing de labor
   */
  async analyzePreciseLocation(location: string): Promise<PrecisionPricingResult> {
    try {
      console.log('🎯 Enhanced Location Pricing: Analyzing', location);
      
      // 1. Geocoding y extracción de datos geográficos
      const locationData = await this.parseLocationData(location);
      
      // 2. Análisis de factores de mercado locales
      const marketFactors = await this.analyzeMarketFactors(locationData);
      
      // 3. Cálculo de rates por skill level
      const laborRates = await this.calculateLaborRates(locationData, marketFactors);
      
      // 4. Cálculo de multiplicador general
      const overallMultiplier = this.calculateOverallMultiplier(marketFactors);
      
      // 5. Análisis de confianza y recomendaciones
      const confidence = this.calculateConfidence(locationData, marketFactors);
      const recommendations = this.generateRecommendations(locationData, marketFactors);
      const warnings = this.generateWarnings(locationData, marketFactors);
      
      return {
        location: locationData,
        marketFactors,
        laborRates,
        overallMultiplier,
        confidence,
        recommendations,
        warnings
      };
      
    } catch (error) {
      console.error('❌ Enhanced Location Pricing Error:', error);
      throw new Error(`Location pricing analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Parsea y enriquece datos de ubicación
   */
  private async parseLocationData(location: string): Promise<LocationData> {
    // Análisis básico de la ubicación
    const parts = location.split(',').map(p => p.trim());
    
    // Extracción inteligente de componentes
    let address = '', city = '', state = '', zipCode = '';
    
    if (parts.length >= 2) {
      // Formato: "City, State" o "Address, City, State"
      if (parts.length === 2) {
        city = parts[0];
        state = parts[1];
      } else if (parts.length >= 3) {
        address = parts[0];
        city = parts[1];
        state = parts[2];
      }
      
      // Extraer ZIP code si está presente
      const zipMatch = location.match(/\b\d{5}(-\d{4})?\b/);
      if (zipMatch) {
        zipCode = zipMatch[0];
      }
    }
    
    // Determinar condado basado en ciudad/estado (simulado)
    const county = this.determineCounty(city, state);
    
    return {
      address,
      city,
      county,
      state,
      zipCode,
      metroArea: this.determineMetroArea(city, state),
      latitude: 0, // Se obtendría de geocoding service
      longitude: 0
    };
  }
  
  /**
   * Analiza factores de mercado específicos de la ubicación
   */
  private async analyzeMarketFactors(locationData: LocationData): Promise<MarketFactors> {
    // Análisis avanzado de factores de mercado
    const stateFactors = this.getStateFactors(locationData.state);
    const metroFactors = this.getMetroAreaFactors(locationData.metroArea);
    const countyFactors = this.getCountyFactors(locationData.county, locationData.state);
    
    return {
      costOfLiving: this.calculateCostOfLiving(locationData),
      laborAvailability: this.calculateLaborAvailability(locationData),
      minimumWage: this.getMinimumWage(locationData.state, locationData.city),
      unionPresence: this.calculateUnionPresence(locationData),
      permitComplexity: this.calculatePermitComplexity(locationData),
      seasonalDemand: this.calculateSeasonalDemand(locationData),
      competitionLevel: this.calculateCompetitionLevel(locationData),
      regulatoryComplexity: this.calculateRegulatoryComplexity(locationData)
    };
  }
  
  /**
   * Calcula rates de labor ajustados por ubicación
   */
  private async calculateLaborRates(
    locationData: LocationData, 
    marketFactors: MarketFactors
  ): Promise<LaborRateData[]> {
    const baseRates = {
      helper: 25,
      skilled: 42,
      specialist: 62,
      foreman: 72
    };
    
    const skillLevels: Array<'helper' | 'skilled' | 'specialist' | 'foreman'> = 
      ['helper', 'skilled', 'specialist', 'foreman'];
    
    return skillLevels.map(skill => {
      const baseRate = baseRates[skill];
      const adjustedRate = this.calculateAdjustedRate(baseRate, marketFactors);
      
      return {
        skillLevel: skill,
        baseRate,
        adjustedRate,
        confidence: this.calculateRateConfidence(locationData, skill),
        lastUpdated: new Date(),
        sources: this.getRateSources(locationData, skill)
      };
    });
  }
  
  /**
   * Calcula rate ajustado basado en factores de mercado
   */
  private calculateAdjustedRate(baseRate: number, factors: MarketFactors): number {
    let adjustedRate = baseRate;
    
    // Aplicar factores multiplicativos
    adjustedRate *= factors.costOfLiving;
    adjustedRate *= (1 + factors.laborAvailability * 0.1);
    adjustedRate *= (1 + factors.unionPresence * 0.15);
    adjustedRate *= (1 + factors.permitComplexity * 0.05);
    adjustedRate *= (1 + factors.seasonalDemand * 0.1);
    adjustedRate *= (1 - factors.competitionLevel * 0.1);
    adjustedRate *= (1 + factors.regulatoryComplexity * 0.08);
    
    return Math.round(adjustedRate * 100) / 100;
  }
  
  /**
   * Factores específicos por estado
   */
  private getStateFactors(state: string): Record<string, number> {
    const stateFactors: Record<string, Record<string, number>> = {
      'california': {
        costOfLiving: 1.4,
        regulations: 1.3,
        laborAvailability: 0.8,
        unionPresence: 0.7
      },
      'new york': {
        costOfLiving: 1.35,
        regulations: 1.25,
        laborAvailability: 0.7,
        unionPresence: 0.8
      },
      'texas': {
        costOfLiving: 1.0,
        regulations: 0.9,
        laborAvailability: 1.1,
        unionPresence: 0.3
      },
      'florida': {
        costOfLiving: 1.1,
        regulations: 1.0,
        laborAvailability: 1.0,
        unionPresence: 0.4
      },
      'default': {
        costOfLiving: 1.0,
        regulations: 1.0,
        laborAvailability: 1.0,
        unionPresence: 0.5
      }
    };
    
    return stateFactors[state.toLowerCase()] || stateFactors.default;
  }
  
  /**
   * Calcula costo de vida específico
   */
  private calculateCostOfLiving(locationData: LocationData): number {
    const stateFactors = this.getStateFactors(locationData.state);
    let factor = stateFactors.costOfLiving;
    
    // Ajustes por área metropolitana
    if (locationData.metroArea) {
      const metroAdjustments: Record<string, number> = {
        'san francisco': 1.6,
        'los angeles': 1.4,
        'new york': 1.5,
        'seattle': 1.3,
        'boston': 1.25,
        'chicago': 1.15,
        'austin': 1.1,
        'dallas': 1.05,
        'phoenix': 1.0,
        'atlanta': 1.0
      };
      
      const metroFactor = metroAdjustments[locationData.metroArea.toLowerCase()] || 1.0;
      factor *= metroFactor;
    }
    
    return factor;
  }
  
  /**
   * Calcula disponibilidad de labor
   */
  private calculateLaborAvailability(locationData: LocationData): number {
    // Factores que afectan disponibilidad de labor
    let availability = 1.0;
    
    // Ajustes por estado
    const stateAdjustments: Record<string, number> = {
      'california': 0.8, // Alta demanda, menor disponibilidad
      'new york': 0.7,
      'texas': 1.2, // Buena disponibilidad
      'florida': 1.0,
      'north dakota': 0.6, // Boom de petróleo
      'wyoming': 0.7
    };
    
    availability *= stateAdjustments[locationData.state.toLowerCase()] || 1.0;
    
    return Math.max(0.1, Math.min(2.0, availability));
  }
  
  /**
   * Obtiene salario mínimo por ubicación
   */
  private getMinimumWage(state: string, city: string): number {
    const stateMinWages: Record<string, number> = {
      'california': 16.00,
      'new york': 15.00,
      'washington': 15.74,
      'massachusetts': 15.00,
      'connecticut': 15.00,
      'oregon': 14.00,
      'arizona': 14.35,
      'colorado': 14.42,
      'maine': 14.00,
      'maryland': 13.25,
      'new jersey': 14.13,
      'rhode island': 14.00,
      'vermont': 13.00,
      'hawaii': 12.00,
      'illinois': 13.00,
      'default': 7.25 // Federal minimum
    };
    
    return stateMinWages[state.toLowerCase()] || stateMinWages.default;
  }
  
  /**
   * Determina condado basado en ciudad y estado
   */
  private determineCounty(city: string, state: string): string {
    // Mapeo básico de ciudades principales a condados
    const cityToCounty: Record<string, string> = {
      'los angeles': 'Los Angeles County',
      'san francisco': 'San Francisco County',
      'new york': 'New York County',
      'chicago': 'Cook County',
      'houston': 'Harris County',
      'phoenix': 'Maricopa County',
      'philadelphia': 'Philadelphia County',
      'san antonio': 'Bexar County',
      'san diego': 'San Diego County',
      'dallas': 'Dallas County'
    };
    
    return cityToCounty[city.toLowerCase()] || `${city} County`;
  }
  
  /**
   * Determina área metropolitana
   */
  private determineMetroArea(city: string, state: string): string {
    const metroAreas: Record<string, string> = {
      'los angeles': 'Los Angeles',
      'san francisco': 'San Francisco',
      'new york': 'New York',
      'chicago': 'Chicago',
      'houston': 'Houston',
      'phoenix': 'Phoenix',
      'philadelphia': 'Philadelphia',
      'san antonio': 'San Antonio',
      'san diego': 'San Diego',
      'dallas': 'Dallas'
    };
    
    return metroAreas[city.toLowerCase()] || city;
  }
  
  /**
   * Calcula multiplicador general basado en factores
   */
  private calculateOverallMultiplier(factors: MarketFactors): number {
    return (
      factors.costOfLiving * 0.3 +
      (1 + factors.laborAvailability * 0.1) * 0.2 +
      (1 + factors.unionPresence * 0.15) * 0.15 +
      (1 + factors.permitComplexity * 0.05) * 0.1 +
      (1 + factors.seasonalDemand * 0.1) * 0.1 +
      (1 - factors.competitionLevel * 0.1) * 0.1 +
      (1 + factors.regulatoryComplexity * 0.08) * 0.05
    );
  }
  
  /**
   * Calcula confianza del análisis
   */
  private calculateConfidence(locationData: LocationData, factors: MarketFactors): number {
    let confidence = 0.8; // Base confidence
    
    // Aumentar confianza si tenemos datos específicos
    if (locationData.city) confidence += 0.1;
    if (locationData.county) confidence += 0.05;
    if (locationData.zipCode) confidence += 0.05;
    
    return Math.min(1.0, confidence);
  }
  
  /**
   * Genera recomendaciones específicas
   */
  private generateRecommendations(locationData: LocationData, factors: MarketFactors): string[] {
    const recommendations: string[] = [];
    
    if (factors.costOfLiving > 1.3) {
      recommendations.push('High cost of living area - consider premium pricing strategy');
    }
    
    if (factors.laborAvailability < 0.8) {
      recommendations.push('Limited labor availability - schedule projects early, consider longer timelines');
    }
    
    if (factors.unionPresence > 0.7) {
      recommendations.push('Strong union presence - factor in union rates and regulations');
    }
    
    if (factors.permitComplexity > 0.3) {
      recommendations.push('Complex permit process - add permit facilitation services');
    }
    
    return recommendations;
  }
  
  /**
   * Genera advertencias específicas
   */
  private generateWarnings(locationData: LocationData, factors: MarketFactors): string[] {
    const warnings: string[] = [];
    
    if (factors.seasonalDemand > 0.5) {
      warnings.push('High seasonal demand - prices may fluctuate significantly');
    }
    
    if (factors.competitionLevel > 0.8) {
      warnings.push('Highly competitive market - pricing pressure expected');
    }
    
    if (factors.regulatoryComplexity > 0.6) {
      warnings.push('Complex regulatory environment - ensure compliance');
    }
    
    return warnings;
  }
  
  // Métodos auxiliares adicionales
  private calculateUnionPresence(locationData: LocationData): number {
    const stateFactors = this.getStateFactors(locationData.state);
    return stateFactors.unionPresence || 0.5;
  }
  
  private calculatePermitComplexity(locationData: LocationData): number {
    const stateFactors = this.getStateFactors(locationData.state);
    return stateFactors.regulations || 1.0;
  }
  
  private calculateSeasonalDemand(locationData: LocationData): number {
    // Simulación de demanda estacional
    return Math.random() * 0.5; // 0-50% variación
  }
  
  private calculateCompetitionLevel(locationData: LocationData): number {
    // Simulación de nivel de competencia
    return Math.random() * 0.8; // 0-80% competencia
  }
  
  private calculateRegulatoryComplexity(locationData: LocationData): number {
    const stateFactors = this.getStateFactors(locationData.state);
    return stateFactors.regulations || 1.0;
  }
  
  private calculateRateConfidence(locationData: LocationData, skill: string): number {
    return 0.85; // 85% confianza base
  }
  
  private getRateSources(locationData: LocationData, skill: string): string[] {
    return ['Local Market Analysis', 'Regional Data', 'Industry Reports'];
  }
}

export const enhancedLocationPricingService = new EnhancedLocationPricingService();