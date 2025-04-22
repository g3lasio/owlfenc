
import axios from 'axios';

export interface PropertyDetails {
  owner: string;
  address: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  lotSize: string;
  yearBuilt: number;
  propertyType: string;
  ownerOccupied: boolean;
  verified: boolean;
  ownershipVerified: boolean;
}

class PropertyVerifierService {
  async verifyProperty(address: string): Promise<PropertyDetails> {
    try {
      const response = await axios.get('/api/property/details', {
        params: { address: address.trim() }
      });
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('No se encontró información para la dirección proporcionada');
      } else if (error.response?.status === 502) {
        throw new Error('Error de conectividad con el servicio de verificación');
      } else {
        throw new Error('Error al verificar la propiedad');
      }
    }
  }
}

export const propertyVerifierService = new PropertyVerifierService();
