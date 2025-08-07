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
   * Parse address into components required by ATTOM API
   * ATTOM Documentation Format:
   * - address1: Street address only (e.g., "2901 Owens Ct")
   * - address2: City, State, ZIP (e.g., "Fairfield, CA 94534")
   */
  private parseAddress(fullAddress: string) {
    console.log('🏠 [ATTOM-PARSER] Parsing address:', fullAddress);
    
    const parts = fullAddress.split(',').map(part => part.trim());
    
    let address1 = '';
    let city = '';
    let state = '';
    let zip = '';
    
    // Map of full state names to abbreviations
    const stateMap: { [key: string]: string } = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
      'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
      'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
      'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
      'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
      'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
      'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
      'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
    };
    
    if (parts.length >= 1) {
      address1 = parts[0]; // Street address
    }
    
    if (parts.length >= 2) {
      city = parts[1]; // City
    }
    
    // Process remaining parts to extract state and zip
    for (let i = 2; i < parts.length; i++) {
      const part = parts[i];
      
      // Skip country names
      if (part.toLowerCase().includes('estados unidos') || 
          part.toLowerCase().includes('united states') || 
          part.toLowerCase().includes('usa')) {
        continue;
      }
      
      // Look for ZIP code in this part
      const zipMatch = part.match(/\b(\d{5}(?:-\d{4})?)\b/);
      if (zipMatch) {
        zip = zipMatch[1];
      }
      
      // Look for state (either abbreviation or full name)
      const stateAbbrevMatch = part.match(/\b([A-Z]{2})\b/);
      if (stateAbbrevMatch) {
        state = stateAbbrevMatch[1];
      } else {
        // Check if the part contains a full state name
        for (const [fullName, abbrev] of Object.entries(stateMap)) {
          if (part.toLowerCase().includes(fullName.toLowerCase())) {
            state = abbrev;
            break;
          }
        }
      }
    }
    
    const result = {
      address1: address1.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim()
    };
    
    console.log('🏠 [ATTOM-PARSER] Parsed components:', result);
    return result;
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
  async getPropertyDetails(address: string, addressComponents?: {city?: string, state?: string, zip?: string}): Promise<PropertyDetails | null> {
    console.log('🔍 [ATTOM-SERVICE] Starting secure property verification');
    console.log('📍 [ATTOM-SERVICE] Address:', address);
    
    if (!address?.trim()) {
      console.error('❌ [ATTOM-SERVICE] Empty address provided');
      throw new Error('Address is required');
    }

    try {
      // Use provided components or parse from address string
      let components;
      if (addressComponents && (addressComponents.city || addressComponents.state || addressComponents.zip)) {
        console.log('🏠 [ATTOM-SERVICE] Using enhanced address components from frontend');
        components = {
          address1: address,
          city: addressComponents.city || '',
          state: addressComponents.state || '',
          zip: addressComponents.zip || ''
        };
      } else {
        console.log('🏠 [ATTOM-SERVICE] Parsing address components from string');
        components = this.parseAddress(address);
      }
      
      // First try property/basicprofile endpoint with correct parameters
      console.log('🔍 [ATTOM-SERVICE] Trying property basic profile endpoint');
      
      // Build address2 parameter correctly
      const address2Parts = [components.city, components.state, components.zip].filter(part => part && part.trim());
      const address2 = address2Parts.length > 0 ? address2Parts.join(', ') : '';
      
      console.log('🏠 [ATTOM-SERVICE] Final address components:', {
        address1: components.address1,
        address2: address2
      });
      
      const propertyData = await this.makeSecureRequest('/property/basicprofile', {
        address1: components.address1,
        address2: address2,
        page: 1,
        pagesize: 10
      });

      if (!propertyData || !propertyData.property || propertyData.property.length === 0) {
        console.log('📭 [ATTOM-SERVICE] No property data found in basic profile');
        
        // Try alternative expandedprofile endpoint  
        console.log('🔍 [ATTOM-SERVICE] Trying expanded profile endpoint');
        const altData = await this.makeSecureRequest('/property/expandedprofile', {
          address1: components.address1,
          address2: address2,
          page: 1,
          pagesize: 10
        });

        if (!altData || !altData.property || altData.property.length === 0) {
          console.log('📭 [ATTOM-SERVICE] No property data found in any endpoint');
          
          // Try detailowner endpoint as last resort
          console.log('🔍 [ATTOM-SERVICE] Trying detail owner endpoint as fallback');
          const ownerData = await this.makeSecureRequest('/property/detailowner', {
            address1: components.address1,
            address2: address2,
            page: 1,
            pagesize: 10
          });
          
          if (!ownerData || !ownerData.property || ownerData.property.length === 0) {
            console.log('📭 [ATTOM-SERVICE] No property data found in any endpoint including owner details');
            throw new Error('No se encontraron datos para esta dirección. Esta propiedad puede no existir en la base de datos de ATTOM o la dirección puede estar incorrecta. Prueba con una dirección diferente.');
          }
          
          // Use owner data if found
          console.log('✅ [ATTOM-SERVICE] Found property data in detail owner endpoint');
          return this.processPropertyData(ownerData.property[0], address);
        }
      }

      // Process the property data
      const property = propertyData.property[0];
      console.log('✅ [ATTOM-SERVICE] Processing property data');
      console.log('📊 [ATTOM-SERVICE] Property ID:', property.identifier?.attomId);

      return this.processPropertyData(property, address);
    } catch (error: any) {
      console.error('🚨 [ATTOM-SERVICE] Property verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Process ATTOM property data into our PropertyDetails format
   */
  private processPropertyData(property: any, address: string): PropertyDetails {
    console.log('🔧 [ATTOM-SERVICE] Processing property data structure');
    
    const result: PropertyDetails = {
        address: address,
        owner: property.owner?.owner1?.fullName || property.assessment?.owner?.name || 'Owner information not available',
        sqft: property.building?.size?.bldgSize || property.building?.size?.livingSize || property.building?.size?.universalSize || 0,
        bedrooms: property.building?.rooms?.beds || 0,
        bathrooms: (property.building?.rooms?.bathsTotal || property.building?.rooms?.bathsFull || 0),
        lotSize: `${(property.lot?.lotSize1 || 0)} acres`,
        landSqft: property.lot?.lotSize2 || 0,
        yearBuilt: property.summary?.yearBuilt || 0,
        propertyType: property.summary?.propertyType || property.summary?.propType || 'Unknown',
        verified: true,
        ownerOccupied: property.summary?.absenteeInd !== 'ABSENTEE(MAIL AND SITUS NOT =)',
        ownershipVerified: true,
        purchaseDate: property.sale?.saleTransDate || undefined,
        purchasePrice: property.sale?.saleAmountData?.saleAmt || undefined
      };
      
      console.log('✅ [ATTOM-SERVICE] Property verification completed successfully');
      console.log('👤 [ATTOM-SERVICE] Owner:', result.owner);
      console.log('🏠 [ATTOM-SERVICE] Property type:', result.propertyType);
      console.log('📐 [ATTOM-SERVICE] Size:', result.sqft, 'sqft');
      
      return result;
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