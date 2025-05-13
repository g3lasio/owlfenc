declare module 'intuit-oauth' {
  export default class OAuthClient {
    constructor(options: {
      clientId: string;
      clientSecret: string;
      environment: string;
      redirectUri: string;
    });

    static scopes: {
      Accounting: string;
      Payment: string;
      Payroll: string;
      TimeTracking: string;
      Benefits: string;
      Profile: string;
      Email: string;
      Phone: string;
      Address: string;
      OpenId: string;
    };

    authorizeUri(options: {
      scope: string[];
      state: string;
    }): string;

    createToken(url: string): Promise<any>;

    refresh(): Promise<any>;

    setToken(options: {
      refresh_token: string;
    }): void;

    getToken(): any;
  }
}