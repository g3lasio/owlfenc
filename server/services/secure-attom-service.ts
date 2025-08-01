import axios from 'axios';
import { envConfig } from '../../env.config';
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
    this.apiKey = envConfig.ATTOM_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ ATTOM_API_KEY not configured. Property verification will not work.');
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
    console.log('🏠 Parsing address for ATTOM API');
    
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

    return {
      address1: address1.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      zip: zip.trim()
    };
  }

  /**
   * Makes a secure request to ATTOM API
   */
  private async makeSecureRequest(endpoint: string, params: any): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('ATTOM API key not properly configured');
    }

    console.log('🔐 Making secure request to ATTOM API');
    console.log(`📍 Endpoint: ${endpoint}`);
    
    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        params,
        headers: this.getSecureHeaders(),
        timeout: this.timeout,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      if (response.status === 401 || response.status === 403) {
        console.error('🚫 ATTOM API authentication failed');
        throw new Error('API authentication failed. Please check your ATTOM API key.');
      }

      if (response.status === 404) {
        console.log('📭 Property not found in ATTOM database');
        return null;
      }

      if (response.status !== 200) {
        console.error(`⚠️ ATTOM API returned status ${response.status}`);
        throw new Error(`API request failed with status ${response.status}`);
      }

      console.log('✅ ATTOM API request successful');
      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try again.');
      }
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before making another request.');
      }

      console.error('🚨 ATTOM API request failed:', error.message);
      throw error;
    }
  }

  /**
   * Gets property details using ATTOM API
   */
  async getPropertyDetails(address: string): Promise<PropertyDetails | null> {
    console.log('🔍 Starting secure property verification');
    
    if (!address?.trim()) {
      throw new Error('Address is required');
    }

    const parsedAddress = this.parseAddress(address);
    
    // Validate parsed address has minimum required fields
    if (!parsedAddress.address1) {
      throw new Error('Invalid address format. Please provide a complete street address.');
    }

    try {
      // Try to get detailed property information with owner data
      const data = await this.makeSecureRequest('/property/detailowner', parsedAddress);
      
      if (!data || !data.property || data.property.length === 0) {
        console.log('📭 No property found for the given address');
        return null;
      }

      const property = data.property[0];
      
      // Extract property details
      const propertyDetails: PropertyDetails = {
        owner: this.extractOwnerName(property),
        address: this.formatAddress(property) || address,
        sqft: property.building?.size?.bldgSqFt || 0,
        bedrooms: property.building?.rooms?.beds || 0,
        bathrooms: property.building?.rooms?.baths || 0,
        lotSize: property.lot?.lotSizeAcres ? `${property.lot.lotSizeAcres} acres` : 'N/A',
        landSqft: property.lot?.lotSizeSqFt || 0,
        yearBuilt: property.building?.summary?.yearBuilt || 0,
        propertyType: property.summary?.propClass || 'Residential',
        verified: true,
        ownershipVerified: Boolean(property.owner && property.owner.length > 0),
        ownerOccupied: this.isOwnerOccupied(property),
        purchaseDate: this.getLastSaleDate(property),
        purchasePrice: this.getLastSalePrice(property),
        ownerHistory: this.extractOwnerHistory(property)
      };

      console.log('✅ Property details extracted successfully');
      return propertyDetails;

    } catch (error: any) {
      console.error('🚨 Failed to get property details:', error.message);
      throw error;
    }
  }

  /**
   * Extracts owner name from ATTOM property data
   */
  private extractOwnerName(property: any): string {
    if (property.owner && property.owner.length > 0) {
      const owner = property.owner[0];
      return owner.name || 'Owner name not available';
    }
    return 'Owner information not available';
  }

  /**
   * Formats address from ATTOM property data
   */
  private formatAddress(property: any): string | null {
    const address = property.address;
    if (!address) return null;
    
    const parts = [
      address.line1,
      address.line2,
      address.locality,
      address.countrySubd,
      address.postal1
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  /**
   * Determines if property is owner-occupied
   */
  private isOwnerOccupied(property: any): boolean {
    if (property.owner && property.owner.length > 0) {
      const owner = property.owner[0];
      const propertyAddress = property.address;
      const ownerMailingAddress = owner.mailingAddress;
      
      // Basic comparison - in a real implementation, you'd want more sophisticated matching
      if (propertyAddress && ownerMailingAddress) {
        return propertyAddress.line1 === ownerMailingAddress.line1 &&
               propertyAddress.postal1 === ownerMailingAddress.postal1;
      }
    }
    return false;
  }

  /**
   * Gets the last sale date
   */
  private getLastSaleDate(property: any): string | undefined {
    if (property.sale && property.sale.length > 0) {
      const lastSale = property.sale[0];
      return lastSale.saleTransDate;
    }
    return undefined;
  }

  /**
   * Gets the last sale price
   */
  private getLastSalePrice(property: any): number | undefined {
    if (property.sale && property.sale.length > 0) {
      const lastSale = property.sale[0];
      return lastSale.amount;
    }
    return undefined;
  }

  /**
   * Extracts owner history from property data
   */
  private extractOwnerHistory(property: any): any[] {
    const history: any[] = [];
    
    if (property.sale && property.sale.length > 0) {
      property.sale.forEach((sale: any) => {
        history.push({
          owner: sale.buyer || 'Unknown',
          purchaseDate: sale.saleTransDate,
          purchasePrice: sale.amount,
          saleDate: sale.recordingDate,
          salePrice: sale.amount
        });
      });
    }
    
    return history;
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // Simple test with a basic endpoint
      await this.makeSecureRequest('/property/basicprofile', {
        address1: '123 Main St',
        city: 'Beverly Hills',
        state: 'CA',
        zip: '90210'
      });
      return true;
    } catch (error) {
      console.error('🚨 ATTOM API health check failed:', error);
      return false;
    }
  }
}

export const secureAttomService = new SecureAttomService();