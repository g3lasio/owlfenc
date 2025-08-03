import axios from 'axios';
import type { PropertyDetails } from '../../client/src/services/propertyVerifierService';

/**
 * Secure ATTOM API Service
 * Direct integration with ATTOM API with proper security measures
 */
class SecureAttomService {
  private readonly baseURL = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';
  private readonly apiKey: string;
  private readonly timeout = 10000; // 10 seconds
  
  constructor() {
    // Use process.env directly for server-side environment variables
    this.apiKey = process.env.ATTOM_API_KEY || '';
    
    console.log('🔧 [ATTOM-CONFIG] Initializing Secure ATTOM Service');
    console.log('🔧 [ATTOM-CONFIG] API Key configured:', !!this.apiKey);
    console.log('🔧 [ATTOM-CONFIG] API Key length:', this.apiKey ? this.apiKey.length : 0);
    console.log('🔧 [ATTOM-CONFIG] API Key preview:', this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'none');
    
    if (!this.apiKey) {
      console.warn('⚠️ [ATTOM-CONFIG] ATTOM_API_KEY not configured. Property verification will not work.');
    } else if (this.apiKey.length < 10) {
      console.warn('⚠️ [ATTOM-CONFIG] ATTOM_API_KEY appears to be too short.');
    } else {
      console.log('✅ [ATTOM-CONFIG] ATTOM API key properly configured and ready');
    }
  }

  /**
   * Validates if the API key is properly configured
   */
  private isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  /**
   * Creates secure headers for ATTOM API requests
   */
  private getSecureHeaders() {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
      'User-Agent': 'LegalDefense-PropertyVerifier/1.0'
    };
  }

  /**
   * Parses address into components required by ATTOM API
   */
  private parseAddress(fullAddress: string) {
    console.log('🏠 [ATTOM-PARSER] Parsing address for ATTOM API:', fullAddress);
    
    const parts = fullAddress.split(',').map(part => part.trim());
    
    let address1 = parts[0] || '';
    let city = '';
    let state = '';
    let zip = '';

    if (parts.length >= 2) {
      city = parts[1];
    }
    
    if (parts.length >= 3) {
      const stateZipPart = parts[2].split(' ');
      state = stateZipPart[0] || '';
      zip = stateZipPart[1] || '';
    }

    const parsed = {
      address1: address1.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      zip: zip.trim()
    };

    console.log('🏠 [ATTOM-PARSER] Parsed address:', parsed);
    return parsed;
  }

  /**
   * Makes a secure request to ATTOM API
   */
  private async makeSecureRequest(endpoint: string, params: any): Promise<any> {
    console.log('🌐 [ATTOM-REQUEST] Making secure request to:', endpoint);
    console.log('🌐 [ATTOM-REQUEST] Request params:', JSON.stringify(params, null, 2));
    
    if (!this.isConfigured()) {
      console.error('❌ [ATTOM-REQUEST] API not configured properly');
      throw new Error('ATTOM API no está configurado correctamente');
    }
    
    const startTime = Date.now();
    
    try {
      console.log('🔐 [ATTOM-REQUEST] Making secure request to ATTOM API');
      console.log('📍 [ATTOM-REQUEST] Endpoint:', `${this.baseURL}${endpoint}`);
      
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        params,
        headers: this.getSecureHeaders(),
        timeout: this.timeout,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      const responseTime = Date.now() - startTime;
      console.log(`⏱️ [ATTOM-REQUEST] Response time: ${responseTime}ms`);
      console.log(`📊 [ATTOM-REQUEST] Status: ${response.status}`);

      if (response.status === 401 || response.status === 403) {
        console.error('🚫 [ATTOM-REQUEST] API authentication failed');
        throw new Error('API authentication failed. Please check your ATTOM API key.');
      }

      if (response.status === 404) {
        console.log('📭 [ATTOM-REQUEST] Property not found in ATTOM database');
        return null;
      }

      if (response.status !== 200) {
        console.error(`⚠️ [ATTOM-REQUEST] API returned status ${response.status}`);
        console.error('📋 [ATTOM-REQUEST] Response data:', response.data);
        throw new Error(`API request failed with status ${response.status}`);
      }

      console.log('✅ [ATTOM-REQUEST] ATTOM API request successful');
      console.log('📊 [ATTOM-REQUEST] Response contains data:', !!response.data);
      return response.data;
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [ATTOM-REQUEST] Request failed after ${responseTime}ms`);
      
      if (error.code === 'ECONNABORTED') {
        console.error('⏰ [ATTOM-REQUEST] Request timeout');
        throw new Error('Request timeout. Please try again.');
      }
      
      if (error.response?.status === 429) {
        console.error('🚦 [ATTOM-REQUEST] Rate limit exceeded');
        throw new Error('Rate limit exceeded. Please wait before making another request.');
      }

      console.error('🚨 [ATTOM-REQUEST] Request failed:', error.message);
      throw error;
    }
  }

  /**
   * Gets property details using ATTOM API
   */
  async getPropertyDetails(address: string): Promise<PropertyDetails | null> {
    console.log('🔍 [ATTOM-SERVICE] Starting secure property verification');
    console.log('📍 [ATTOM-SERVICE] Address:', address);
    
    if (!address?.trim()) {
      console.error('❌ [ATTOM-SERVICE] Empty address provided');
      throw new Error('Address is required');
    }

    try {
      // Parse the address
      const addressComponents = this.parseAddress(address);
      
      // First try property/basicprofile endpoint with correct parameters
      console.log('🔍 [ATTOM-SERVICE] Trying property basic profile endpoint');
      
      const propertyData = await this.makeSecureRequest('/property/basicprofile', {
        address1: addressComponents.address1,
        address2: `${addressComponents.city}, ${addressComponents.state} ${addressComponents.zip}`.trim(),
        page: 1,
        pagesize: 10
      });

      if (!propertyData || !propertyData.property || propertyData.property.length === 0) {
        console.log('📭 [ATTOM-SERVICE] No property data found in basic profile');
        
        // Try alternative expandedprofile endpoint  
        console.log('🔍 [ATTOM-SERVICE] Trying expanded profile endpoint');
        const altData = await this.makeSecureRequest('/property/expandedprofile', {
          address1: addressComponents.address1,
          address2: `${addressComponents.city}, ${addressComponents.state} ${addressComponents.zip}`.trim(),
          page: 1,
          pagesize: 10
        });

        if (!altData || !altData.property || altData.property.length === 0) {
          console.log('📭 [ATTOM-SERVICE] No property data found in any endpoint');
          throw new Error('No se encontraron datos para esta dirección. Verifica que esté correctamente escrita con ciudad, estado y código postal.');
        }
      }

      // Process the property data
      const property = propertyData.property[0];
      console.log('✅ [ATTOM-SERVICE] Processing property data');
      console.log('📊 [ATTOM-SERVICE] Property ID:', property.identifier?.obPropId);

      const result: PropertyDetails = {
        address: address,
        owner: property.assessment?.owner?.name || 'Owner information not available',
        sqft: property.building?.size?.bldgsize || 0,
        bedrooms: property.building?.rooms?.beds || 0,
        bathrooms: property.building?.rooms?.bathstotal || 0,
        lotSize: property.lot?.lotsize1 || 'Unknown',
        landSqft: property.lot?.lotsize1 ? parseInt(property.lot.lotsize1) : undefined,
        yearBuilt: property.building?.construction?.yearbuilt || 0,
        propertyType: property.summary?.propclass || 'Unknown',
        verified: true,
        ownerOccupied: property.assessment?.owner?.ownership === 'Owner Occupied',
        ownershipVerified: true,
        purchaseDate: property.sale?.salesearchdate,
        purchasePrice: property.sale?.amount?.saleamt
      };

      console.log('✅ [ATTOM-SERVICE] Property verification completed successfully');
      console.log('👤 [ATTOM-SERVICE] Owner:', result.owner);
      console.log('🏠 [ATTOM-SERVICE] Property type:', result.propertyType);
      
      return result;

    } catch (error: any) {
      console.error('🚨 [ATTOM-SERVICE] Property verification failed:', error.message);
      
      if (error.message.includes('API authentication failed')) {
        throw new Error('Error de autenticación con el servicio de verificación. Contacta al soporte técnico.');
      }
      
      if (error.message.includes('Rate limit exceeded')) {
        throw new Error('Límite de solicitudes excedido. Espera unos minutos antes de intentar nuevamente.');
      }
      
      if (error.message.includes('timeout')) {
        throw new Error('La solicitud tardó demasiado tiempo. Intenta nuevamente.');
      }
      
      throw error;
    }
  }

  /**
   * Health check to verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    console.log('🩺 [ATTOM-HEALTH] Starting health check');
    
    if (!this.isConfigured()) {
      console.log('❌ [ATTOM-HEALTH] API not configured');
      return false;
    }

    try {
      // Try a simple request to check connectivity
      const response = await axios.get(`${this.baseURL}/property/basicprofile`, {
        params: {
          address1: '123 Test St',
          locality: 'Beverly Hills',
          countrySubd: 'CA',
          page: 1,
          pagesize: 1
        },
        headers: this.getSecureHeaders(),
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      console.log('✅ [ATTOM-HEALTH] Health check passed');
      return response.status < 500;
      
    } catch (error: any) {
      console.error('❌ [ATTOM-HEALTH] Health check failed:', error.message);
      return false;
    }
  }
}

// Export singleton instance
export const secureAttomService = new SecureAttomService();