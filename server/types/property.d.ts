
interface PropertyOwnerData {
  owner: string;
  mailingAddress: string;
  ownerOccupied: boolean;
  ownershipVerified: boolean;
}

interface OwnerHistoryEntry {
  owner: string;
  purchaseDate?: string;
  purchasePrice?: number;
  saleDate?: string;
  salePrice?: number;
}

interface FullPropertyData {
  owner: string;
  address: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  lotSize: string;
  landSqft: number;
  yearBuilt: number;
  propertyType: string;
  ownerOccupied: boolean;
  verified: boolean;
  ownershipVerified: boolean;
  // Información adicional de historial de propiedad
  purchaseDate?: string;
  purchasePrice?: number;
  previousOwner?: string;
  ownerHistory?: OwnerHistoryEntry[];
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
