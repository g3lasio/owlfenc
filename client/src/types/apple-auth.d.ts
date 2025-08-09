// Apple Sign-In TypeScript Definitions
declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: AppleSignInInitConfig) => void;
        signIn: (options?: AppleSignInOptions) => Promise<AppleSignInResponse>;
      };
    };
  }
}

interface AppleSignInInitConfig {
  clientId: string;
  scope: string;
  redirectURI: string;
  state?: string;
  nonce?: string;
  usePopup?: boolean;
}

interface AppleSignInOptions {
  requestedScopes?: ('name' | 'email')[];
  nonce?: string | ArrayBuffer;
  state?: string;
}

interface AppleSignInResponse {
  authorization: {
    id_token: string;
    code: string;
    state?: string;
  };
  user?: {
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export {};