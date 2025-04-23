import { PropertyOwnerData, FullPropertyData } from '../types/property';
import { newBackendPropertyService } from './new-backend/property-service';  // El nuevo servicio

export class PropertyService {
  private service: typeof newBackendPropertyService;

  constructor() {
    this.service = newBackendPropertyService;
  }

  async getPropertyByAddress(address: string): Promise<FullPropertyData | null> {
    try {
      return await this.service.getPropertyByAddress(address);
    } catch (error) {
      console.error('Error en property service:', error);
      return null;
    }
  }
}

export const propertyService = new PropertyService();