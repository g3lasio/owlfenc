import axios from 'axios';
import { FullPropertyData } from '../../types/property';

// URL del wrapper de ATTOM API
const ATTOM_WRAPPER_URL = 'https://attom-wrapper.replit.app';

/**
 * Servicio para obtener detalles de propiedad utilizando el wrapper de ATTOM API
 */
class NewBackendPropertyService {
  
  /**
   * Obtiene detalles de una propiedad a partir de su dirección
   * 
   * @param address Dirección completa de la propiedad
   * @returns Datos completos de la propiedad o null si no se encuentra
   */
  async getPropertyByAddress(address: string): Promise<FullPropertyData | null> {
    try {
      console.log(`Consultando dirección en ATTOM wrapper: ${address}`);
      
      // Verificamos si hay datos en caché
      const cacheKey = `property:${address.toLowerCase().trim()}`;
      if (global.propertyCache && global.propertyCache[cacheKey]) {
        const cacheEntry = global.propertyCache[cacheKey];
        // Si los datos en caché tienen menos de 24 horas, los usamos
        if (Date.now() - cacheEntry.timestamp < 24 * 60 * 60 * 1000) {
          console.log('Usando datos de caché para la dirección:', address);
          return cacheEntry.data;
        }
      }
      
      // Realizamos la petición al wrapper
      console.log(`Conectando con ${ATTOM_WRAPPER_URL}/api/property-details?address=${encodeURIComponent(address)}`);
      
      const response = await axios.get(`${ATTOM_WRAPPER_URL}/api/property-details`, {
        params: { address }
      });
      
      console.log('Respuesta del wrapper de ATTOM:', response.status);
      
      if (response.status === 200 && response.data) {
        // Transformamos la respuesta al formato esperado por la aplicación
        const propertyData: FullPropertyData = {
          owner: response.data.owner || 'No disponible',
          address: response.data.address || address,
          sqft: response.data.buildingAreaSqFt || 0,
          bedrooms: response.data.rooms?.bedrooms || 0,
          bathrooms: response.data.rooms?.bathrooms || 0,
          lotSize: response.data.lotSizeAcres ? `${response.data.lotSizeAcres} acres` : 'No disponible',
          yearBuilt: response.data.yearBuilt || 0,
          propertyType: response.data.propertyType || 'Residencial',
          ownerOccupied: !!response.data.ownerOccupied,
          verified: true, // Los datos de ATTOM se consideran verificados
          ownershipVerified: !!response.data.owner
        };
        
        console.log('Datos recibidos del API:', JSON.stringify(response.data, null, 2));
        console.log('Datos transformados:', JSON.stringify(propertyData, null, 2));
        
        // Guardar en caché
        if (!global.propertyCache) {
          global.propertyCache = {};
        }
        global.propertyCache[cacheKey] = {
          data: propertyData,
          timestamp: Date.now()
        };
        
        return propertyData;
      }
      
      console.log('No se encontraron datos para la dirección:', address);
      return null;
    } catch (error: any) {
      // Guardar el mensaje de error para diagnóstico
      if (error.message) {
        global.lastApiErrorMessage = error.message;
      }
      
      console.error('Error al consultar ATTOM wrapper:', error.message);
      
      if (error.response) {
        console.error('Detalles de error:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      // Re-lanzamos el error para que sea manejado por el llamador
      throw error;
    }
  }
}

export const newBackendPropertyService = new NewBackendPropertyService();