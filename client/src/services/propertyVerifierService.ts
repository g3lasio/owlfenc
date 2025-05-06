
import axios from 'axios';

export interface OwnerHistoryEntry {
  owner: string;
  purchaseDate?: string;
  purchasePrice?: number;
  saleDate?: string;
  salePrice?: number;
}

export interface PropertyDetails {
  owner: string;
  address: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  lotSize: string;
  landSqft?: number;
  yearBuilt: number;
  propertyType: string;
  verified: boolean;
  ownerOccupied?: boolean;
  ownershipVerified?: boolean;
  // Información adicional de historial de propiedad
  purchaseDate?: string;
  purchasePrice?: number;
  previousOwner?: string;
  ownerHistory?: OwnerHistoryEntry[];
}

// URL del wrapper externo de ATTOM
const ATTOM_WRAPPER_URL = 'https://attom-wrapper.replit.app';

class PropertyVerifierService {
  async verifyProperty(address: string): Promise<PropertyDetails> {
    try {
      console.log(`Verificando propiedad con dirección: ${address}`);
      
      // Primero, intentamos usar el backend de la aplicación
      try {
        const internalResponse = await axios.get('/api/property/details', {
          params: { address: address.trim() }
        });
        
        console.log('Respuesta recibida del backend interno:', internalResponse.status);
        
        if (internalResponse.data && internalResponse.status === 200) {
          return internalResponse.data;
        }
      } catch (internalError) {
        console.log('El backend interno no pudo procesar la solicitud, intentando con servicio externo');
      }
      
      // Si el backend interno falla, conectar directamente con el wrapper externo
      try {
        console.log(`Conectando con servicio externo: ${ATTOM_WRAPPER_URL}`);
        
        // Intentamos el endpoint principal
        const externalResponse = await axios.get(`${ATTOM_WRAPPER_URL}/api/property/details`, {
          params: { address: address.trim() },
          timeout: 15000, // 15 segundos
        });
        
        console.log('Respuesta recibida del servicio externo:', externalResponse.status);
        
        if (externalResponse.data) {
          // Transformar los datos al formato que espera nuestra aplicación
          const data = externalResponse.data;
          const propertyData: PropertyDetails = {
            owner: data.owner || 'No disponible',
            address: data.address || address,
            sqft: data.buildingAreaSqFt || data.sqft || 0,
            bedrooms: data.rooms?.bedrooms || data.bedrooms || 0,
            bathrooms: data.rooms?.bathrooms || data.bathrooms || 0,
            lotSize: data.lotSizeAcres ? `${data.lotSizeAcres} acres` : data.lotSize || 'No disponible',
            landSqft: data.lotSizeSqFt || 0,
            yearBuilt: data.yearBuilt || 0,
            propertyType: data.propertyType || 'Residencial',
            ownerOccupied: !!data.ownerOccupied,
            verified: true,
            ownershipVerified: !!data.owner,
            purchaseDate: data.saleTransHistory?.[0]?.saleTransDate,
            purchasePrice: data.saleTransHistory?.[0]?.saleTransAmount,
            previousOwner: data.saleTransHistory?.[1]?.seller
          };
          
          // Agregar historial de propietarios si está disponible
          if (data.saleTransHistory && data.saleTransHistory.length > 0) {
            propertyData.ownerHistory = data.saleTransHistory.map((entry: any) => ({
              owner: entry.buyer || 'Desconocido',
              purchaseDate: entry.saleTransDate,
              purchasePrice: entry.saleTransAmount,
              saleDate: entry.recordingDate,
              salePrice: entry.saleTransAmount
            }));
          }
          
          return propertyData;
        }
        
        throw new Error('Respuesta externa sin datos');
      } catch (externalError: any) {
        console.error('Error conectando con servicio externo:', externalError.message);
        
        // Si hay un error con el primer endpoint, intentamos el endpoint alternativo
        try {
          console.log('Intentando endpoint alternativo...');
          const alternativeResponse = await axios.get(`${ATTOM_WRAPPER_URL}/api/property`, {
            params: { address: address.trim() },
            timeout: 15000,
          });
          
          if (alternativeResponse.data) {
            // Transformar la respuesta alternativa
            const data = alternativeResponse.data;
            return {
              owner: data.owner || 'No disponible',
              address: data.address || address,
              sqft: data.sqft || 0,
              bedrooms: data.bedrooms || 0,
              bathrooms: data.bathrooms || 0,
              lotSize: data.lotSize || 'No disponible',
              yearBuilt: data.yearBuilt || 0,
              propertyType: data.propertyType || 'Residencial',
              verified: true,
              ownershipVerified: !!data.owner
            };
          }
        } catch (alternativeError) {
          console.error('Error con endpoint alternativo:', alternativeError);
        }
        
        throw externalError;
      }
    } catch (error: any) {
      console.error('Error en servicio de verificación de propiedad:', error);
      
      if (error.response?.status === 404) {
        throw new Error('No se encontró información para la dirección proporcionada');
      } else if (error.response?.status === 502 || error.code === 'ECONNABORTED') {
        throw new Error('Error de conectividad con el servicio de verificación de propiedad');
      } else {
        throw new Error(error.message || 'Error al verificar la propiedad');
      }
    }
  }
}

export const propertyVerifierService = new PropertyVerifierService();
