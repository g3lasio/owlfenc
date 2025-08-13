/**
 * 🔐 OAUTH CONFIGURATION SERVICE
 * Fetches OAuth configuration from secure server endpoint
 */

interface OAuthConfig {
  google: {
    clientId: string | null;
    enabled: boolean;
  };
  apple: {
    clientId: string | null;
    enabled: boolean;
  };
}

let cachedConfig: OAuthConfig | null = null;
let configPromise: Promise<OAuthConfig> | null = null;

/**
 * Obtiene la configuración OAuth desde el servidor
 */
export async function getOAuthConfig(): Promise<OAuthConfig> {
  // Usar caché si ya está disponible
  if (cachedConfig) {
    return cachedConfig;
  }

  // Evitar múltiples requests simultáneos
  if (configPromise) {
    return configPromise;
  }

  configPromise = fetchOAuthConfig();
  
  try {
    const config = await configPromise;
    cachedConfig = config;
    return config;
  } catch (error) {
    // Reset promise si hay error para permitir reintentos
    configPromise = null;
    throw error;
  }
}

async function fetchOAuthConfig(): Promise<OAuthConfig> {
  try {
    const response = await fetch('/api/oauth/config', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Timeout corto para no bloquear la UI
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`OAuth config request failed: ${response.status}`);
    }

    const config = await response.json();
    
    console.log('🔧 [OAUTH-CONFIG] Configuración obtenida del servidor:', {
      googleEnabled: config.google?.enabled || false,
      appleEnabled: config.apple?.enabled || false
    });

    return config;
  } catch (error) {
    console.error('❌ [OAUTH-CONFIG] Error obteniendo configuración:', error);
    
    // Configuración por defecto si falla el servidor
    return {
      google: { clientId: null, enabled: false },
      apple: { clientId: null, enabled: false }
    };
  }
}

/**
 * Limpia el caché de configuración (útil para testing)
 */
export function clearOAuthConfigCache(): void {
  cachedConfig = null;
  configPromise = null;
}