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
    console.log('🔧 [ATTOM-CONFIG] Base URL:', this.baseURL);
  }

  private isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  private getSecureHeaders() {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
      'User-Agent': 'PropertyVerifier/1.0'
    };
  }

  /**
   * Parse address according to ATTOM API requirements
   * Handles both comma-separated and space-separated addresses
   */
  private parseAddress(fullAddress: string) {
    console.log('🏠 [ATTOM-PARSER] Parsing address:', fullAddress);
    
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
    
    // State abbreviations for quick lookup (case-insensitive)
    const stateAbbreviations = new Set([
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ]);
    
    // Common city names in California for quick detection (expandable)
    const commonCities = new Set([
      'napa', 'oakland', 'sacramento', 'fresno', 'bakersfield', 'fairfield',
      'san francisco', 'los angeles', 'san diego', 'san jose', 'long beach',
      'vallejo', 'berkeley', 'richmond', 'concord', 'antioch', 'vacaville'
    ]);
    
    // Check if address has commas (properly formatted)
    const hasCommas = fullAddress.includes(',');
    
    if (hasCommas) {
      // Standard comma-separated parsing
      const parts = fullAddress.split(',').map(part => part.trim());
      
      if (parts.length >= 1) {
        address1 = parts[0];
      }
      
      if (parts.length >= 2) {
        city = parts[1];
      }
      
      for (let i = 2; i < parts.length; i++) {
        const part = parts[i];
        
        if (part.toLowerCase().includes('estados unidos') || 
            part.toLowerCase().includes('united states') || 
            part.toLowerCase().includes('usa')) {
          continue;
        }
        
        const zipMatch = part.match(/\b(\d{5}(?:-\d{4})?)\b/);
        if (zipMatch) {
          zip = zipMatch[1];
        }
        
        const stateAbbrevMatch = part.match(/\b([A-Z]{2})\b/);
        if (stateAbbrevMatch && stateAbbreviations.has(stateAbbrevMatch[1])) {
          state = stateAbbrevMatch[1];
        } else {
          for (const [fullName, abbrev] of Object.entries(stateMap)) {
            if (part.toLowerCase().includes(fullName.toLowerCase())) {
              state = abbrev;
              break;
            }
          }
        }
      }
    } else {
      // Space-separated address parsing (e.g., "2305 Browns St napa Ca" or "123 Market St San Francisco CA")
      console.log('🏠 [ATTOM-PARSER] Parsing space-separated address');
      
      const words = fullAddress.trim().split(/\s+/);
      const streetSuffixes = ['st', 'street', 'ave', 'avenue', 'blvd', 'boulevard', 'dr', 'drive', 'rd', 'road', 'ln', 'lane', 'ct', 'court', 'way', 'pl', 'place', 'cir', 'circle', 'ter', 'terrace', 'pkwy', 'parkway'];
      
      // Find ZIP code first (if present)
      const zipIndex = words.findIndex(w => /^\d{5}(-\d{4})?$/.test(w));
      if (zipIndex !== -1) {
        zip = words[zipIndex];
      }
      
      // Find state abbreviation (search from end, skip ZIP if found)
      let stateIndex = -1;
      const searchEnd = zipIndex !== -1 ? zipIndex : words.length;
      for (let i = searchEnd - 1; i >= 0; i--) {
        const word = words[i].toUpperCase().replace(/[.,]/g, '');
        if (stateAbbreviations.has(word)) {
          state = word;
          stateIndex = i;
          break;
        }
      }
      
      // Find street suffix to determine where street address ends
      let streetEndIndex = -1;
      for (let i = 0; i < words.length; i++) {
        const wordLower = words[i].toLowerCase().replace(/[.,]/g, '');
        if (streetSuffixes.includes(wordLower)) {
          streetEndIndex = i;
          break;
        }
      }
      
      if (streetEndIndex !== -1 && stateIndex !== -1 && stateIndex > streetEndIndex) {
        // We have both street suffix and state
        // Street address = everything up to and including street suffix
        address1 = words.slice(0, streetEndIndex + 1).join(' ');
        // City = everything between street suffix and state (handles multi-word cities)
        if (stateIndex > streetEndIndex + 1) {
          city = words.slice(streetEndIndex + 1, stateIndex).join(' ');
        }
      } else if (stateIndex !== -1 && stateIndex > 0) {
        // No street suffix found, but we have state
        // Try common single-word city detection first
        const potentialCity = words[stateIndex - 1].toLowerCase();
        if (commonCities.has(potentialCity)) {
          city = words[stateIndex - 1];
          address1 = words.slice(0, stateIndex - 1).join(' ');
        } else {
          // Fallback: assume last word before state is city
          city = words[stateIndex - 1];
          address1 = words.slice(0, stateIndex - 1).join(' ');
        }
      } else {
        // No state found, just use the whole thing as address
        address1 = fullAddress;
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
    console.log('🌐 [ATTOM-REQUEST] Full URL:', `${this.baseURL}${endpoint}`);
    console.log('🌐 [ATTOM-REQUEST] Params:', JSON.stringify(params, null, 2));
    
    if (!this.isConfigured()) {
      throw new Error('ATTOM API no está configurado correctamente');
    }
    
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        params,
        headers: this.getSecureHeaders(),
        timeout: this.timeout,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });
      
      const responseTime = Date.now() - startTime;
      console.log(`⏱️ [ATTOM-REQUEST] Response time: ${responseTime}ms`);
      console.log(`📊 [ATTOM-REQUEST] Status: ${response.status}`);
      
      // Log detailed response for debugging
      if (response.status !== 200) {
        console.log('📋 [ATTOM-REQUEST] Response data:', JSON.stringify(response.data, null, 2));
        console.log('📋 [ATTOM-REQUEST] Response headers:', JSON.stringify(response.headers, null, 2));
      }
      
      if (response.status === 401 || response.status === 403) {
        console.error('🚫 [ATTOM-REQUEST] API authentication failed');
        throw new Error('ATTOM API authentication failed. Please check your API key.');
      }
      
      if (response.status === 404) {
        console.log('📭 [ATTOM-REQUEST] Property not found in ATTOM database');
        return null;
      }
      
      if (response.status === 400) {
        // ATTOM returns 400 with "SuccessWithoutResult" when property is not found
        if (response.data?.status?.msg === 'SuccessWithoutResult') {
          console.log('📭 [ATTOM-REQUEST] Property not found (SuccessWithoutResult)');
          return null;
        } else {
          console.error('⚠️ [ATTOM-REQUEST] Bad request - Invalid parameters');
          console.error('📋 [ATTOM-REQUEST] Error details:', response.data);
          throw new Error(`Bad request: ${response.data?.message || 'Invalid parameters sent to ATTOM API'}`);
        }
      }
      
      if (response.status === 200 && response.data) {
        console.log('✅ [ATTOM-REQUEST] Request successful');
        return response.data;
      }
      
      console.log('⚠️ [ATTOM-REQUEST] API returned unexpected status', response.status);
      throw new Error(`API request failed with status ${response.status}`);
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [ATTOM-REQUEST] Request failed after ${responseTime}ms`);
      
      if (error.code === 'ECONNABORTED') {
        console.error('⏰ [ATTOM-REQUEST] Request timed out');
        throw new Error('ATTOM API request timed out');
      }
      
      if (error.response) {
        console.error('🚨 [ATTOM-REQUEST] HTTP Error:', error.response.status);
        console.error('📋 [ATTOM-REQUEST] Error data:', error.response.data);
      } else if (error.request) {
        console.error('🌐 [ATTOM-REQUEST] No response received');
      } else {
        console.error('🚨 [ATTOM-REQUEST] Error:', error.message);
      }
      
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
      console.log('🔍 [ATTOM-SERVICE] Full property structure:', JSON.stringify(propertyRecord, null, 2));

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
    console.log('🔍 [ATTOM-SERVICE] Raw assessment owner data:', JSON.stringify(property.assessment?.owner, null, 2));
    
    // Extract owner data from correct location: assessment.owner (confirmed by ATTOM response)
    let ownerNames: string[] = [];
    
    if (property.assessment?.owner) {
      const assessmentOwner = property.assessment.owner;
      
      // Extract all owners (owner1, owner2, owner3, etc.)
      for (let i = 1; i <= 4; i++) {
        const ownerKey = `owner${i}`;
        const owner = assessmentOwner[ownerKey];
        
        if (owner && owner.fullName) {
          ownerNames.push(owner.fullName.trim());
        } else if (owner && owner.lastName) {
          // Fallback to lastName if fullName not available
          ownerNames.push(owner.lastName.trim());
        }
      }
      
      console.log('👥 [ATTOM-SERVICE] Found owners:', ownerNames);
    }
    
    // Fallback: check other possible locations
    if (ownerNames.length === 0 && property.owner?.owner1) {
      const owner1 = property.owner.owner1;
      const name = owner1.FULLName || owner1.LASTName || owner1.fullName || owner1.lastName;
      if (name) ownerNames.push(name.trim());
    }
    
    // Final fallback
    const ownerName = ownerNames.length > 0 
      ? ownerNames.join(' & ') 
      : 'Datos del propietario no disponibles';
    
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