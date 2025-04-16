import axios from 'axios';

interface PropertyOwnerData {
  owner: string;
  mailingAddress: string;
  ownerOccupied: boolean;
}

interface PropertyDetailsData {
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  lotSize: string;
  yearBuilt: number;
  propertyType: string;
}

export interface FullPropertyData {
  owner: string;
  address: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  lotSize: string;
  yearBuilt: number;
  propertyType: string;
  ownerOccupied: boolean;
  verified: boolean;
}

class PropertyService {
  private apiKey: string;
  private baseUrl: string = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      'apikey': this.apiKey,
      'Accept': 'application/json'
    };
  }

  /**
   * Format address for ATTOM API query
   * Expects format like: "123 Main St, City, State ZIP"
   */
  private formatAddressForSearch(address: string): string {
    return encodeURIComponent(address.trim());
  }

  /**
   * Get property details by address
   */
  async getPropertyByAddress(address: string): Promise<FullPropertyData | null> {
    try {
      const formattedAddress = this.formatAddressForSearch(address);
      
      // First, get the property ID
      const propertyResponse = await axios.get(
        `${this.baseUrl}/property/basicprofile`,
        {
          headers: this.getHeaders(),
          params: {
            address: formattedAddress
          }
        }
      );

      if (!propertyResponse.data.property || propertyResponse.data.property.length === 0) {
        console.error('No property found for address:', address);
        return null;
      }

      const property = propertyResponse.data.property[0];
      const propertyId = property.identifier.obPropId;
      
      // Get detailed property information
      const detailsResponse = await axios.get(
        `${this.baseUrl}/property/detailwithschool`,
        {
          headers: this.getHeaders(),
          params: {
            id: propertyId
          }
        }
      );

      if (!detailsResponse.data.property || detailsResponse.data.property.length === 0) {
        console.error('No details found for property ID:', propertyId);
        return null;
      }

      const details = detailsResponse.data.property[0];
      
      // Extract owner data
      const ownerData = this.extractOwnerData(details);
      
      // Extract property details
      const propertyDetails = this.extractPropertyDetails(details);

      return {
        owner: ownerData.owner,
        address: this.formatAddress(details.address),
        ownerOccupied: ownerData.ownerOccupied,
        verified: true,
        ...propertyDetails
      };
    } catch (error) {
      console.error('Error fetching property data:', error);
      return null;
    }
  }

  /**
   * Extract owner data from property details
   */
  private extractOwnerData(propertyData: any): PropertyOwnerData {
    let owner = 'Unknown';
    let mailingAddress = '';
    let ownerOccupied = false;

    try {
      if (propertyData.owner && propertyData.owner.length > 0) {
        const ownerInfo = propertyData.owner[0];
        
        // Get owner name
        if (ownerInfo.name) {
          owner = ownerInfo.name;
        }
        
        // Get mailing address
        if (ownerInfo.mailingAddress) {
          mailingAddress = this.formatAddress(ownerInfo.mailingAddress);
        }
        
        // Determine if owner occupied by comparing property and mailing addresses
        const propertyAddress = this.formatAddress(propertyData.address);
        ownerOccupied = propertyAddress.toLowerCase() === mailingAddress.toLowerCase();
      }
    } catch (err) {
      console.error('Error extracting owner data:', err);
    }

    return {
      owner,
      mailingAddress,
      ownerOccupied
    };
  }

  /**
   * Extract property details from property data
   */
  private extractPropertyDetails(propertyData: any): PropertyDetailsData {
    let sqft = 0;
    let bedrooms = 0;
    let bathrooms = 0;
    let lotSize = '0';
    let yearBuilt = 0;
    let propertyType = 'Unknown';

    try {
      // Extract building data
      if (propertyData.building && propertyData.building.length > 0) {
        const building = propertyData.building[0];
        
        // Size
        if (building.size && building.size.universalSize) {
          sqft = parseInt(building.size.universalSize, 10) || 0;
        }
        
        // Rooms
        if (building.rooms) {
          bedrooms = parseInt(building.rooms.beds, 10) || 0;
          bathrooms = parseFloat(building.rooms.bathsTotal) || 0;
        }
        
        // Year built
        if (building.yearBuilt) {
          yearBuilt = parseInt(building.yearBuilt, 10) || 0;
        }
      }
      
      // Lot size
      if (propertyData.lot && propertyData.lot.size) {
        const acres = parseFloat(propertyData.lot.size.acres) || 0;
        lotSize = `${acres.toFixed(2)} acres`;
      }
      
      // Property type
      if (propertyData.summary && propertyData.summary.propertyType) {
        propertyType = propertyData.summary.propertyType;
      }
    } catch (err) {
      console.error('Error extracting property details:', err);
    }

    return {
      sqft,
      bedrooms,
      bathrooms,
      lotSize,
      yearBuilt,
      propertyType
    };
  }

  /**
   * Format address from parts
   */
  private formatAddress(addressObj: any): string {
    const parts = [];
    
    if (addressObj.oneLine) {
      return addressObj.oneLine;
    }
    
    if (addressObj.streetNumber) parts.push(addressObj.streetNumber);
    if (addressObj.streetName) parts.push(addressObj.streetName);
    if (addressObj.streetSuffix) parts.push(addressObj.streetSuffix);
    
    const street = parts.join(' ');
    
    const cityStateZip = [];
    if (addressObj.city) cityStateZip.push(addressObj.city);
    if (addressObj.state) cityStateZip.push(addressObj.state);
    if (addressObj.postalCode) cityStateZip.push(addressObj.postalCode);
    
    return street + (cityStateZip.length > 0 ? ', ' + cityStateZip.join(', ') : '');
  }
}

export const propertyService = new PropertyService(process.env.ATTOM_API_KEY || '');