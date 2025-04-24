import { PropertyOwnerData, FullPropertyData } from '../types/property';
import { newBackendPropertyService } from './new-backend/property-service';  // El nuevo servicio

// Tipo para el resultado con diagnósticos
interface PropertyDetailsDiagnostics {
  data: FullPropertyData | null;
  status: string;
  error?: any;
  diagnostics: {
    attempts: number;
    lastError: any;
    timestamp: number;
    parsedAddress: any;
    parseError?: string;
  };
}

export class PropertyService {
  private service: typeof newBackendPropertyService;

  constructor() {
    this.service = newBackendPropertyService;
  }

  /**
   * Obtiene detalles de una propiedad a partir de su dirección
   * 
   * @param address Dirección completa de la propiedad
   * @returns Datos completos de la propiedad o null si no se encuentra
   */
  async getPropertyByAddress(address: string): Promise<FullPropertyData | null> {
    try {
      return await this.service.getPropertyByAddress(address);
    } catch (error) {
      console.error('Error en property service:', error);
      return null;
    }
  }
  
  /**
   * Obtiene detalles de una propiedad con diagnósticos extendidos
   * 
   * @param address Dirección completa de la propiedad
   * @returns Objeto con datos, estado, información de error y diagnósticos
   */
  async getPropertyDetailsWithDiagnostics(address: string): Promise<PropertyDetailsDiagnostics> {
    try {
      return await this.service.getPropertyDetailsWithDiagnostics(address);
    } catch (error: any) {
      console.error('Error en property service (diagnósticos):', error);
      
      // En caso de error, devolver una respuesta con la información del error
      return {
        data: null,
        status: 'ERROR',
        error: {
          message: error.message,
          stack: error.stack
        },
        diagnostics: {
          attempts: 0,
          lastError: error,
          timestamp: Date.now(),
          parsedAddress: null,
          parseError: 'Error en capa de abstracción del servicio'
        }
      };
    }
  }
}

export const propertyService = new PropertyService();