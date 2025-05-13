declare module 'node-quickbooks' {
  export default class QuickBooks {
    constructor(
      consumerKey: string,
      consumerSecret: string,
      accessToken: string,
      useAccessTokenFn: boolean,
      realmId: string,
      useSandbox: boolean,
      debug: boolean,
      minorVersion?: string | null,
      oauthVersion?: string,
      refreshToken?: string
    );

    findItems(
      criteria: { type: string } | object,
      callback: (error: any, items: any) => void
    ): void;

    // Añadir más métodos según sea necesario para futuras funcionalidades
  }
}