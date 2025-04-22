
interface PropertyOwnerData {
  owner: string;
  mailingAddress: string;
  ownerOccupied: boolean;
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

export { PropertyOwnerData };
