
import axios from 'axios';
// 🔥 NO FIREBASE IMPORTS - Use session-based auth instead

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

// Secure Property Verification Service
// All API communication goes through our secure backend

class PropertyVerifierService {
  async verifyProperty(address: string, placeData?: any): Promise<PropertyDetails> {
    console.log('🔍 Starting secure property verification for:', address);
    
    if (!address?.trim()) {
      throw new Error('Por favor ingresa una dirección válida');
    }

    try {
      console.log('📡 Sending request to secure backend API');
      
      // 🔐 GET FIREBASE AUTHENTICATION TOKEN
      if (!auth.currentUser) {
        throw new Error('Usuario no autenticado. Por favor inicia sesión.');
      }
      
      const token = await auth.currentUser.getIdToken();
      console.log('🔐 Firebase token obtained for property verification');
      
      // Preparar parámetros con información completa si está disponible
      const params: any = { address: address.trim() };
      
      if (placeData && placeData.context) {
        // Extraer información específica de Mapbox para mejor precisión
        const city = placeData.context.find((c: any) => c.id.startsWith('place.'))?.text;
        const state = placeData.context.find((c: any) => c.id.startsWith('region.'))?.short_code?.replace('US-', '');
        const zip = placeData.context.find((c: any) => c.id.startsWith('postcode.'))?.text;
        
        if (city) params.city = city;
        if (state) params.state = state;
        if (zip) params.zip = zip;
        
        console.log('🏠 Enhanced address components:', { city, state, zip });
      }
      
      const response = await axios.get('/api/property/details', {
        params,
        timeout: 25000, // 25 seconds timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}` // 🔐 INCLUDE FIREBASE AUTH TOKEN
        }
      });
      
      console.log('✅ Backend response received:', {
        status: response.status,
        hasData: !!response.data
      });
      
      if (response.data && response.status === 200) {
        console.log('✅ Property verification successful');
        return response.data;
      }
      
      throw new Error('No se recibieron datos válidos del servidor');
      
    } catch (error: any) {
      console.error('🚨 Property verification failed:', error.message);
      
      // Log detailed error information for debugging
      if (error.response) {
        console.error('📋 Error details:', {
          status: error.response.status,
          message: error.response.data?.message,
          details: error.response.data?.details
        });
        
        // Use specific error message from backend if available
        if (error.response.data?.message) {
          throw new Error(error.response.data.message);
        }
      } else if (error.request) {
        console.error('🌐 Network error - no response received');
        throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      } else {
        console.error('⚙️ Request configuration error:', error.message);
      }
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        throw new Error('No se encontró información para la dirección proporcionada. Verifica que esté correctamente escrita con ciudad, estado y código postal.');
      } else if (error.response?.status === 408 || error.code === 'ECONNABORTED') {
        throw new Error('La solicitud tardó demasiado tiempo. Intenta nuevamente.');
      } else if (error.response?.status === 429) {
        throw new Error('Límite de solicitudes excedido. Espera unos minutos antes de intentar nuevamente.');
      } else if (error.response?.status >= 500) {
        throw new Error('Error del servidor. Si el problema persiste, contacta al soporte técnico.');
      } else {
        throw new Error(error.message || 'Error al verificar la propiedad');
      }
    }
  }
}

export const propertyVerifierService = new PropertyVerifierService();
