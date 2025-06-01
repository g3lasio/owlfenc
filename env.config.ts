
export interface EnvConfig {
  // Firebase Configuration
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  FIREBASE_MEASUREMENT_ID?: string;

  // API Keys
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  GOOGLE_MAPS_API_KEY?: string;
  MAPBOX_ACCESS_TOKEN?: string;
  STRIPE_PUBLIC_KEY?: string;
  STRIPE_SECRET_KEY?: string;

  // Database
  DATABASE_URL?: string;
  POSTGRES_URL?: string;

  // Server Configuration
  PORT: string;
  NODE_ENV: string;
  
  // External Services
  ATTOM_API_KEY?: string;
  CORELOGIC_API_KEY?: string;
  QUICKBOOKS_CLIENT_ID?: string;
  QUICKBOOKS_CLIENT_SECRET?: string;
  
  // PDF Services
  PDFMONKEY_API_KEY?: string;
  
  // Email Services
  SENDGRID_API_KEY?: string;
  EMAIL_FROM?: string;
  
  // Apple Auth
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
}

// Function to validate and load environment variables
export function loadEnvConfig(): EnvConfig {
  const config: EnvConfig = {
    // Firebase (required)
    FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
    FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || '',
    FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
    FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '',
    FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '',
    FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID,

    // API Keys
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
    ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '',
    GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY,
    MAPBOX_ACCESS_TOKEN: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_ACCESS_TOKEN,
    STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY || process.env.STRIPE_PUBLIC_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,

    // Database
    DATABASE_URL: process.env.DATABASE_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,

    // Server
    PORT: process.env.PORT || '5000',
    NODE_ENV: process.env.NODE_ENV || 'development',

    // External Services
    ATTOM_API_KEY: process.env.ATTOM_API_KEY,
    CORELOGIC_API_KEY: process.env.CORELOGIC_API_KEY,
    QUICKBOOKS_CLIENT_ID: process.env.QUICKBOOKS_CLIENT_ID,
    QUICKBOOKS_CLIENT_SECRET: process.env.QUICKBOOKS_CLIENT_SECRET,

    // PDF Services
    PDFMONKEY_API_KEY: process.env.PDFMONKEY_API_KEY,

    // Email
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,

    // Apple Auth
    APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID,
    APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
    APPLE_KEY_ID: process.env.APPLE_KEY_ID,
    APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY,
  };

  // Validate required environment variables
  const requiredVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN', 
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID'
  ];

  const missingVars = requiredVars.filter(varName => !config[varName as keyof EnvConfig]);
  
  if (missingVars.length > 0) {
    console.warn(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return config;
}

// Load configuration
export const envConfig = loadEnvConfig();

// Helper functions for common environment checks
export const isDevelopment = envConfig.NODE_ENV === 'development';
export const isProduction = envConfig.NODE_ENV === 'production';
export const isTest = envConfig.NODE_ENV === 'test';

// Export individual configs for easier importing
export const firebaseConfig = {
  apiKey: envConfig.FIREBASE_API_KEY,
  authDomain: envConfig.FIREBASE_AUTH_DOMAIN,
  projectId: envConfig.FIREBASE_PROJECT_ID,
  storageBucket: envConfig.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envConfig.FIREBASE_MESSAGING_SENDER_ID,
  appId: envConfig.FIREBASE_APP_ID,
  measurementId: envConfig.FIREBASE_MEASUREMENT_ID,
};

export const apiKeys = {
  openai: envConfig.OPENAI_API_KEY,
  anthropic: envConfig.ANTHROPIC_API_KEY,
  googleMaps: envConfig.GOOGLE_MAPS_API_KEY,
  mapbox: envConfig.MAPBOX_ACCESS_TOKEN,
  stripe: {
    public: envConfig.STRIPE_PUBLIC_KEY,
    secret: envConfig.STRIPE_SECRET_KEY,
  },
  attom: envConfig.ATTOM_API_KEY,
  corelogic: envConfig.CORELOGIC_API_KEY,
  pdfmonkey: envConfig.PDFMONKEY_API_KEY,
  sendgrid: envConfig.SENDGRID_API_KEY,
};

export const serverConfig = {
  port: parseInt(envConfig.PORT),
  nodeEnv: envConfig.NODE_ENV,
  databaseUrl: envConfig.DATABASE_URL,
  postgresUrl: envConfig.POSTGRES_URL,
};

export const appleAuthConfig = {
  clientId: envConfig.APPLE_CLIENT_ID,
  teamId: envConfig.APPLE_TEAM_ID,
  keyId: envConfig.APPLE_KEY_ID,
  privateKey: envConfig.APPLE_PRIVATE_KEY,
};
