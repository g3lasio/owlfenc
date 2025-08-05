import axios from 'axios';

interface PropertyDetails {
  address: string;
  owner: string;
  sqft: number;
  bedrooms: number;
  bathrooms?: number;
  lotSize?: string;
  landSqft?: number;
  yearBuilt?: number;
  propertyType?: string;
  verified: boolean;
  ownerOccupied?: boolean;
  ownershipVerified: boolean;
  purchaseDate?: string;
  purchasePrice?: number;
}

/**
 * Secure ATTOM Data API Service
 * Implements proper address fragmentation per ATTOM documentation:
 * - address1: Street address only (e.g., "2901 Owens Ct")
 * - address2: City, State, ZIP (e.g., "Fairfield, CA 94534")
 */
class SecureAttomService {
  private apiKey: string;
  private baseURL: string = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';
  private timeout: number = 15000;

  constructor() {
    this.apiKey = process.env.ATTOM_API_KEY || '';
    console.log('🔧 [ATTOM-CONFIG] Initializing Secure ATTOM Service');
    console.log('🔧 [ATTOM-CONFIG] API Key configured:', Boolean(this.apiKey));
    console.log('🔧 [ATTOM-CONFIG] API Key length:', this.apiKey.length);
    console.log('🔧 [ATTOM-CONFIG] API Key preview:', this.apiKey.substring(0, 8) + '...');
  }

  private isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  private getSecureHeaders() {
    return {
      'Accept': 'application/json',
      'apikey': this.apiKey,
      'User-Agent': 'PropertyVerifier/1.0'
    };
  }

  /**
   * Parse address according to ATTOM API requirements
   */
  private parseAddress(fullAddress: string) {
    console.log('🏠 [ATTOM-PARSER] Parsing address:', fullAddress);
    
    const parts = fullAddress.split(',').map(part => part.trim());
    
    let address1 = '';
    let city = '';
    let state = '';
    let zip = '';
    
    if (parts.length >= 1) {
      address1 = parts[0]; // Street address
    }
    
    if (parts.length >= 2) {
      city = parts[1]; // City
    }
    
    if (parts.length >= 3) {
      // Extract state and ZIP from last part
      const lastPart = parts[2];
      const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?/);
      if (stateZipMatch) {
        state = stateZipMatch[1];
        if (stateZipMatch[2]) {
          zip = stateZipMatch[2];
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
   * Make secure request to ATTOM API
   */
  private async makeSecureRequest(endpoint: string, params: any): Promise<any> {
    console.log('🌐 [ATTOM-REQUEST] Making request to:', endpoint);
    console.log('🌐 [ATTOM-REQUEST] Params:', JSON.stringify(params, null, 2));
    
    if (!this.isConfigured()) {
      throw new Error('ATTOM API no está configurado correctamente');
    }
    
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        params,
        headers: this.getSecureHeaders(),
        timeout: this.timeout
      });
      
      const responseTime = Date.now() - startTime;
      console.log(`⏱️ [ATTOM-REQUEST] Response time: ${responseTime}ms`);
      console.log(`📊 [ATTOM-REQUEST] Status: ${response.status}`);
      
      if (response.status === 200 && response.data) {
        console.log('✅ [ATTOM-REQUEST] Request successful');
        return response.data;
      }
      
      console.log('⚠️ [ATTOM-REQUEST] API returned status', response.status);
      throw new Error(`API request failed with status ${response.status}`);
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [ATTOM-REQUEST] Request failed after ${responseTime}ms`);
      console.error('🚨 [ATTOM-REQUEST] Request failed:', error.message);
      throw error;
    }
  }

  /**
   * Get property details using ATTOM API with proper address fragmentation
   */
  async getPropertyDetails(address: string, addressComponents?: {city?: string, state?: string, zip?: string}): Promise<PropertyDetails | null> {
    console.log('🔍 [ATTOM-SERVICE] Starting property verification for:', address);
    
    if (!address?.trim()) {
      throw new Error('Address is required');
    }

    try {
      // Parse address to extract street component properly
      let components;
      if (addressComponents && (addressComponents.city || addressComponents.state || addressComponents.zip)) {
        console.log('🏠 [ATTOM-SERVICE] Using enhanced address components from frontend');
        // Extract only street address from full address
        const parsedStreet = this.parseAddress(address);
        components = {
          address1: parsedStreet.address1, // Use parsed street address only
          city: addressComponents.city || '',
          state: addressComponents.state || '',
          zip: addressComponents.zip || ''
        };
      } else {
        console.log('🏠 [ATTOM-SERVICE] Parsing address components');
        components = this.parseAddress(address);
      }
      
      // Build address2 parameter according to ATTOM documentation
      const address2Parts = [components.city, components.state, components.zip].filter(part => part && part.trim());
      const address2 = address2Parts.length > 0 ? address2Parts.join(', ') : '';
      
      console.log('🏠 [ATTOM-SERVICE] Final ATTOM parameters:', {
        address1: components.address1,
        address2: address2
      });
      
      // Try property/expandedprofile endpoint first (has owner data per ATTOM documentation)
      console.log('🔍 [ATTOM-SERVICE] Trying property/expandedprofile endpoint for owner data');
      
      let propertyData;
      let propertyRecord;
      
      try {
        propertyData = await this.makeSecureRequest('/property/expandedprofile', {
          address1: components.address1,
          address2: address2,
          page: 1,
          pagesize: 1
        });
        
        if (propertyData && propertyData.property && propertyData.property.length > 0) {
          propertyRecord = propertyData.property[0];
          console.log('✅ [ATTOM-SERVICE] Found data in expandedprofile endpoint');
        }
      } catch (error) {
        console.log('⚠️ [ATTOM-SERVICE] expandedprofile failed, trying basicprofile');
      }
      
      // Fallback to basicprofile if expandedprofile failed
      if (!propertyRecord) {
        try {
          propertyData = await this.makeSecureRequest('/property/basicprofile', {
            address1: components.address1,
            address2: address2,
            page: 1,
            pagesize: 1
          });
          
          if (propertyData && propertyData.property && propertyData.property.length > 0) {
            propertyRecord = propertyData.property[0];
            console.log('✅ [ATTOM-SERVICE] Found data in basicprofile endpoint');
          }
        } catch (error) {
          console.log('⚠️ [ATTOM-SERVICE] basicprofile failed, trying property/detail as last resort');
        }
      }
      
      // Final fallback to property/detail (doesn't have owner data but has other property info)
      if (!propertyRecord) {
        propertyData = await this.makeSecureRequest('/property/detail', {
          address1: components.address1,
          address2: address2,
          page: 1,
          pagesize: 1
        });
        
        if (!propertyData || !propertyData.property || propertyData.property.length === 0) {
          throw new Error('No se encontraron datos para esta dirección. Verifica que esté correctamente escrita con ciudad, estado y código postal.');
        }
        
        propertyRecord = propertyData.property[0];
        console.log('✅ [ATTOM-SERVICE] Found data in property/detail endpoint (no owner data)');
      }

      // Process the property data
      console.log('✅ [ATTOM-SERVICE] Processing property data');
      console.log('📊 [ATTOM-SERVICE] Property ID:', propertyRecord.identifier?.attomId);

      return this.processPropertyData(propertyRecord, address);
      
    } catch (error: any) {
      console.error('🚨 [ATTOM-SERVICE] Property verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Process ATTOM property data into PropertyDetails format
   */
  private processPropertyData(property: any, address: string): PropertyDetails {
    console.log('🔧 [ATTOM-SERVICE] Processing property data structure');
    console.log('🔍 [ATTOM-SERVICE] Raw owner data:', JSON.stringify(property.owner, null, 2));
    
    // Extract owner data according to ATTOM documentation:
    // For corporate ownership, names are in FULLName and LASTName fields
    let ownerName = 'Owner data not available';
    
    if (property.owner?.owner1) {
      const owner1 = property.owner.owner1;
      // Corporate ownership: FULLName and LASTName (exact capitalization per ATTOM)
      ownerName = owner1.FULLName || owner1.LASTName || owner1.fullName || owner1.lastName;
    } else if (property.assessment?.owner) {
      const assessmentOwner = property.assessment.owner;
      ownerName = assessmentOwner.name || assessmentOwner.FULLName || assessmentOwner.LASTName;
    }
    
    // If still no owner data, check other possible locations
    if (!ownerName || ownerName === 'Owner data not available') {
      ownerName = property.owner?.name || 
                  property.owner?.FULLName || 
                  property.owner?.LASTName || 
                  'Owner data requires premium ATTOM API access';
    }
    
    const result: PropertyDetails = {
      address: address,
      owner: ownerName,
      sqft: property.building?.size?.bldgSize || property.building?.size?.livingSize || property.building?.size?.universalSize || 0,
      bedrooms: property.building?.rooms?.beds || 0,
      bathrooms: property.building?.rooms?.bathsTotal || property.building?.rooms?.bathsFull || 0,
      lotSize: `${property.lot?.lotSize1 || 0} acres`,
      landSqft: property.lot?.lotSize2 || 0,
      yearBuilt: property.summary?.yearBuilt || 0,
      propertyType: property.summary?.propertyType || property.summary?.propType || 'Unknown',
      verified: true,
      ownerOccupied: property.summary?.absenteeInd !== 'ABSENTEE(MAIL AND SITUS NOT =)',
      ownershipVerified: true,
      purchaseDate: property.sale?.saleTransDate || undefined,
      purchasePrice: property.sale?.saleAmountData?.saleAmt || undefined
    };
    
    console.log('✅ [ATTOM-SERVICE] Property verification completed');
    console.log('👤 [ATTOM-SERVICE] Owner:', result.owner);
    console.log('🏠 [ATTOM-SERVICE] Property type:', result.propertyType);
    console.log('📐 [ATTOM-SERVICE] Size:', result.sqft, 'sqft');
    
    return result;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const response = await axios.get(`${this.baseURL}/property/basicprofile`, {
        params: {
          address1: '123 Test St',
          address2: 'Beverly Hills, CA',
          page: 1,
          pagesize: 1
        },
        headers: this.getSecureHeaders(),
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      return response.status < 500;
      
    } catch (error: any) {
      console.error('❌ [ATTOM-HEALTH] Health check failed:', error.message);
      return false;
    }
  }
}

// Export singleton instance
export const secureAttomService = new SecureAttomService();