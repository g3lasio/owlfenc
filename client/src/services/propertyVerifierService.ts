
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
      
      // IMPORTANTE: NO usamos la conexión directa al servicio externo desde el frontend
      // Dejamos que el backend maneje toda la comunicación con ATTOM
      
      console.log("Enviando solicitud de verificación al backend de la aplicación");
      const internalResponse = await axios.get('/api/property/details', {
        params: { address: address.trim() },
        timeout: 30000 // Aumentamos el timeout a 30 segundos porque el backend puede tardar en conectar con ATTOM
      });
      
      console.log('Respuesta recibida del backend interno:', internalResponse.status);
      console.log('Datos recibidos:', internalResponse.data);
      
      if (internalResponse.data && internalResponse.status === 200) {
        return internalResponse.data;
      }
      
      throw new Error('No se recibieron datos válidos del servidor');
    } catch (error: any) {
      console.error('Error en servicio de verificación de propiedad:', error);
      
      // Mostrar errores detallados en la consola para depuración
      if (error.response) {
        // La solicitud fue realizada y el servidor respondió con un código de estado
        // que está fuera del rango 2xx
        console.error('Detalles del error de respuesta:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
        
        // Si el backend devuelve un mensaje de error específico, lo mostramos al usuario
        if (error.response.data && error.response.data.message) {
          throw new Error(error.response.data.message);
        }
      } else if (error.request) {
        // La solicitud fue realizada pero no se recibió respuesta
        console.error('Error de solicitud (sin respuesta):', error.request);
        throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      } else {
        // Algo sucedió en la configuración de la solicitud que provocó un error
        console.error('Error de configuración de solicitud:', error.message);
      }
      
      // Manejamos casos específicos
      if (error.response?.status === 404) {
        throw new Error('No se encontró información para la dirección proporcionada');
      } else if (error.response?.status === 502 || error.code === 'ECONNABORTED') {
        throw new Error('Error de conectividad con el servicio de verificación de propiedad');
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new Error('La verificación tomó demasiado tiempo. Por favor, intenta nuevamente.');
      } else {
        throw new Error(error.message || 'Error al verificar la propiedad');
      }
    }
  }
}

export const propertyVerifierService = new PropertyVerifierService();
