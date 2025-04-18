
declare global {
  var propertyCache: {
    [key: string]: {
      data: any;
      timestamp: number;
    };
  };
}

export {};
