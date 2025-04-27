/**
 * Servicio de propiedad simulado
 * 
 * Este servicio proporciona datos de propiedad simulados cuando el servicio real
 * no está disponible o falla. Es útil para pruebas y desarrollo.
 */

interface FullPropertyData {
  address: string;
  parcelNumber: string;
  owner: string;
  lotSize: number;
  yearBuilt: number;
  bedrooms: number;
  bathrooms: number;
  totalArea: number;
  propertyType: string;
  lastSalePrice: number;
  lastSaleDate: string;
  taxAssessment: number;
  zoningCode: string;
  floodZone: boolean;
  latitude: number;
  longitude: number;
}

export class MockPropertyService {
  /**
   * Genera datos de propiedad simulados basados en la dirección
   * Los datos generados son consistentes para la misma dirección
   */
  generateMockPropertyData(address: string): FullPropertyData {
    // Crear un hash único a partir de la dirección para generar datos consistentes
    const seed = this.hashString(address);
    
    // Generar datos de propiedad simulados basados en la semilla
    const data: FullPropertyData = {
      address: address,
      parcelNumber: `P-${100000 + Math.floor(this.seededRandom(seed + 1) * 899999)}`,
      owner: `Propietario-${Math.floor(this.seededRandom(seed + 2) * 999)}`,
      lotSize: this.getRandomNumber(seed + 3, 2000, 10000),
      yearBuilt: Math.floor(this.getRandomNumber(seed + 4, 1950, 2022)),
      bedrooms: Math.floor(this.getRandomNumber(seed + 5, 2, 6)),
      bathrooms: Math.floor(this.getRandomNumber(seed + 6, 1, 5) * 2) / 2, // 1, 1.5, 2, 2.5, etc.
      totalArea: this.getRandomNumber(seed + 7, 800, 3500),
      propertyType: ["Residencial", "Comercial", "Industrial", "Mixto"][Math.floor(this.seededRandom(seed + 8) * 4)],
      lastSalePrice: Math.floor(this.getRandomNumber(seed + 9, 150000, 800000) / 5000) * 5000,
      lastSaleDate: `${2010 + Math.floor(this.seededRandom(seed + 10) * 12)}-${1 + Math.floor(this.seededRandom(seed + 11) * 12)}-${1 + Math.floor(this.seededRandom(seed + 12) * 28)}`,
      taxAssessment: Math.floor(this.getRandomNumber(seed + 13, 100000, 600000) / 1000) * 1000,
      zoningCode: `Z-${["R", "C", "I", "M"][Math.floor(this.seededRandom(seed + 14) * 4)]}${Math.floor(this.seededRandom(seed + 15) * 9) + 1}`,
      floodZone: this.seededRandom(seed + 16) > 0.7,
      latitude: 25 + this.seededRandom(seed + 17) * 10,
      longitude: -100 - this.seededRandom(seed + 18) * 20
    };
    
    return data;
  }
  
  /**
   * Crea un hash numérico simple a partir de una cadena
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convertir a entero de 32 bits
    }
    return Math.abs(hash);
  }
  
  /**
   * Genera un número aleatorio dentro de un rango usando una semilla
   */
  private getRandomNumber(seed: number, min: number, max: number): number {
    return min + this.seededRandom(seed) * (max - min);
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
    console.log('Generando datos simulados para:', address);
    return this.generateMockPropertyData(address);
  }
  
  /**
   * API para obtener datos de propiedad con diagnósticos simulados
   */
  async getPropertyDetailsWithDiagnostics(address: string): Promise<any> {
    console.log('Generando datos simulados con diagnósticos para:', address);
    const propertyData = this.generateMockPropertyData(address);
    
    return {
      status: 'SUCCESS',
      data: propertyData,
      diagnostics: {
        source: 'mock_data',
        processingTime: 35,
        reliability: 'desarrollo',
        parsedAddress: {
          street: address.split(',')[0],
          city: (address.split(',')[1] || '').trim(),
          state: (address.split(',')[2] || '').trim()
        }
      }
    };
  }
}

export const mockPropertyService = new MockPropertyService();