/**
 * Servicio de propiedad simulado
 * 
 * Este servicio proporciona datos de propiedad simulados cuando el servicio real
 * no está disponible o falla. Es útil para pruebas y desarrollo.
 */

import { FullPropertyData } from '../types/property';

export class MockPropertyService {
  /**
   * Genera datos de propiedad simulados basados en la dirección
   * Los datos generados son consistentes para la misma dirección
   */
  generateMockPropertyData(address: string): FullPropertyData {
    // Usar la dirección como semilla para generar datos consistentes
    const seed = this.hashString(address);
    
    // Generar datos con cierta variabilidad pero consistentes para la misma dirección
    return {
      owner: "Propietario Simulado",
      address: address,
      sqft: this.getRandomNumber(seed, 1000, 4000),
      bedrooms: this.getRandomNumber(seed + 1, 2, 5),
      bathrooms: this.getRandomNumber(seed + 2, 1, 4),
      lotSize: `${(this.getRandomNumber(seed + 3, 5000, 15000) / 1000).toFixed(2)} acres`,
      landSqft: this.getRandomNumber(seed + 4, 5000, 15000),
      yearBuilt: this.getRandomNumber(seed + 5, 1950, 2020),
      propertyType: "Residencial",
      ownerOccupied: true,
      verified: true,
      ownershipVerified: true,
      buildingArea: this.getRandomNumber(seed, 1000, 4000),
      propertyDetails: {
        propertyType: "Single Family Residential",
        yearBuilt: this.getRandomNumber(seed + 5, 1950, 2020),
        buildingArea: this.getRandomNumber(seed, 1000, 4000),
        lotSize: this.getRandomNumber(seed + 4, 5000, 15000),
      }
    };
  }

  /**
   * Crea un hash numérico simple a partir de una cadena
   */
  private hashString(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    
    return Math.abs(hash);
  }

  /**
   * Genera un número aleatorio dentro de un rango usando una semilla
   */
  private getRandomNumber(seed: number, min: number, max: number): number {
    const rng = this.seededRandom(seed);
    return Math.floor(min + rng * (max - min + 1));
  }

  /**
   * Generador de números pseudoaleatorios con semilla
   */
  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  /**
   * API pública para obtener datos de propiedad simulados
   */
  async getPropertyByAddress(address: string): Promise<FullPropertyData> {
    console.log('Generando datos de propiedad simulados para:', address);
    return this.generateMockPropertyData(address);
  }

  /**
   * API para obtener datos de propiedad con diagnósticos simulados
   */
  async getPropertyDetailsWithDiagnostics(address: string): Promise<any> {
    const mockData = this.generateMockPropertyData(address);
    
    return {
      data: mockData,
      status: 'SUCCESS',
      diagnostics: {
        attempts: 1,
        timestamp: Date.now(),
        parsedAddress: address,
        source: 'mock_data'
      },
      property: mockData // Para mantener compatibilidad con la respuesta original
    };
  }
}

export const mockPropertyService = new MockPropertyService();