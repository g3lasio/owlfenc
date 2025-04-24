import axios from 'axios';
import { FullPropertyData } from '../../types/property';

// URL del wrapper de ATTOM API
const ATTOM_WRAPPER_URL = 'https://attom-wrapper.replit.app';

/**
 * Parsea una dirección completa en sus componentes
 * 
 * @param fullAddress Dirección completa (ej: "123 Main St, San Francisco, CA 94105")
 * @returns Objeto con los componentes de la dirección
 */
function parseAddress(fullAddress: string): {
  address1: string;
  city: string;
  state: string;
  zip: string;
} {
  console.log('Parseando dirección:', fullAddress);
  const parts = fullAddress.split(',').map(part => part.trim());

  // Extraer el código postal si está presente
  let zip = '';
  let state = '';
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    // Buscar código postal al final (formato "TX 12345" o sólo "12345")
    const zipMatch = lastPart.match(/(\d{5}(-\d{4})?)/);
    if (zipMatch) {
      zip = zipMatch[0];
      // Si hay código postal, el estado podría estar en la misma parte
      const stateMatch = lastPart.match(/([A-Z]{2})/);
      if (stateMatch) {
        state = stateMatch[0];
      }
    } else {
      // Si no hay código postal, el último podría ser el estado
      if (lastPart.length <= 3) {
        state = lastPart;
      }
    }
  }
  
  // Si no se encontró el estado por el método anterior, buscar en la penúltima parte
  if (!state && parts.length > 2) {
    const statePart = parts[parts.length - 2];
    const stateMatch = statePart.match(/([A-Z]{2})/);
    if (stateMatch) {
      state = stateMatch[0];
    } else if (statePart.length <= 3) {
      state = statePart;
    }
  }

  // La ciudad suele estar en la penúltima parte o antepenúltima si hay código postal separado
  let city = parts.length > 2 ? parts[parts.length - 2] : '';
  // Limpiar el estado de la parte de la ciudad si están juntos
  if (city.includes(state)) {
    city = city.replace(state, '').trim();
  }

  // La dirección de calle es la primera parte
  const address1 = parts[0];

  console.log('Dirección parseada:', { address1, city, state, zip });
  return { address1, city, state, zip };
}

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
      
      // Intentamos diferentes formatos para la llamada al API
      let response = null;
      let error = null;
      
      // Parsear la dirección para obtener sus componentes
      const { address1, city, state, zip } = parseAddress(address);
      
      // 1. Intento: usar parámetros separados
      console.log('Intento 1: Parámetros separados con formato address1, city, state, zip');
      try {
        response = await axios.get(`${ATTOM_WRAPPER_URL}/api/property/details`, {
          params: { 
            address1,
            city,
            state,
            zip
          }
        });
        console.log('Intento 1 exitoso!');
      } catch (err: any) {
        error = err;
        console.log('Intento 1 falló:', err.message);
        
        // 2. Intento: usar sólo la dirección completa como "address" 
        console.log('Intento 2: Parámetro completo "address"');
        try {
          response = await axios.get(`${ATTOM_WRAPPER_URL}/api/property/details`, {
            params: { address }
          });
          console.log('Intento 2 exitoso!');
        } catch (err2: any) {
          console.log('Intento 2 falló:', err2.message);
          
          // 3. Intento: Probar con el endpoint raíz como último recurso
          console.log('Intento 3: Endpoint raíz y parámetro address');
          try {
            response = await axios.get(`${ATTOM_WRAPPER_URL}/api/property`, {
              params: { address }
            });
            console.log('Intento 3 exitoso!');
          } catch (err3: any) {
            console.log('Intento 3 falló:', err3.message);
            // Si todos los intentos fallaron, usamos el error original
            throw error;
          }
        }
      }
      
      console.log('Respuesta del wrapper de ATTOM:', response?.status);
      
      if (response?.status === 200 && response?.data) {
        console.log('Datos recibidos del API:', JSON.stringify(response.data, null, 2));
        
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