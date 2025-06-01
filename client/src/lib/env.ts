
import { envConfig, firebaseConfig, apiKeys, isDevelopment, isProduction } from '../../../env.config';

// Re-export for easy access in client code
export { envConfig, firebaseConfig, apiKeys, isDevelopment, isProduction };

// Client-specific environment helpers
export const getEnvVar = (key: string, fallback?: string): string => {
  const value = import.meta.env[key] || process.env[key] || fallback;
  if (!value && isDevelopment) {
    console.warn(`Environment variable ${key} is not set`);
  }
  return value || '';
};

// Validate that required client environment variables are available
export const validateClientEnv = (): boolean => {
  const requiredClientVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];

  const missingVars = requiredClientVars.filter(varName => !import.meta.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required client environment variables:', missingVars);
    return false;
  }

  return true;
};

// Helper to get API base URL
export const getApiBaseUrl = (): string => {
  if (isProduction) {
    return `${window.location.origin}/api`;
  }
  return `http://localhost:${envConfig.PORT}/api`;
};

// Helper for feature flags based on environment
export const featureFlags = {
  enableDevTools: isDevelopment,
  enableAnalytics: isProduction && !!firebaseConfig.measurementId,
  enableStrictLogging: isDevelopment,
  enableAppleAuth: !!(apiKeys.openai && envConfig.APPLE_CLIENT_ID),
  enablePropertyVerification: !!(apiKeys.attom || apiKeys.corelogic),
  enableQuickBooksIntegration: !!(envConfig.QUICKBOOKS_CLIENT_ID && envConfig.QUICKBOOKS_CLIENT_SECRET),
};

// Debug helper for development
if (isDevelopment) {
  console.log('Environment Configuration Loaded:', {
    nodeEnv: envConfig.NODE_ENV,
    firebaseProject: firebaseConfig.projectId,
    featuresEnabled: Object.entries(featureFlags)
      .filter(([_, enabled]) => enabled)
      .map(([feature]) => feature),
  });
}
