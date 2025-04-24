
interface PropertyOwnerData {
  owner: string;
  mailingAddress: string;
  ownerOccupied: boolean;
  ownershipVerified: boolean;
}

interface FullPropertyData {
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
  ownershipVerified: boolean;
}

declare global {
  var propertyCache: {
    [key: string]: {
      data: any;
      timestamp: number;
    };
  };
  
  var lastApiErrorMessage: string;
}

export { PropertyOwnerData, FullPropertyData };
