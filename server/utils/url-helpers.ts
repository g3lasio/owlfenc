/**
 * URL Helper Utilities
 * Centralized logic for resolving application base URLs with HTTPS enforcement
 */

interface ResolveAppBaseUrlOptions {
  requireHttps?: boolean;
  isLiveMode?: boolean;
}

/**
 * Resolves the public application base URL for Stripe redirects and webhooks
 * 
 * Priority order:
 * 1. APP_BASE_URL - Explicit configuration (recommended for production)
 * 2. REPLIT_DOMAINS - Replit production domain
 * 3. REPLIT_DEV_DOMAIN - Replit development domain
 * 4. localhost - Development fallback (only if not in LIVE mode)
 * 
 * @param options Configuration options
 * @param options.requireHttps - Enforce HTTPS protocol (default: true in LIVE mode)
 * @param options.isLiveMode - Whether Stripe is in LIVE mode (affects localhost fallback)
 * @returns The resolved base URL
 * @throws Error if no valid URL can be resolved in LIVE mode
 */
export function resolveAppBaseUrl(options: ResolveAppBaseUrlOptions = {}): string {
  const { isLiveMode = false, requireHttps = isLiveMode } = options;
  
  let baseUrl: string | null = null;
  
  // Priority 1: Explicit APP_BASE_URL (most secure, recommended for production)
  if (process.env.APP_BASE_URL) {
    baseUrl = process.env.APP_BASE_URL;
    console.log(`🔗 [URL-RESOLVER] Using APP_BASE_URL: ${baseUrl}`);
  }
  // Priority 2: REPLIT_DOMAINS (trusted Replit environment variable)
  else if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(',')[0];
    baseUrl = `https://${domain}`;
    console.log(`🔗 [URL-RESOLVER] Using REPLIT_DOMAINS: ${baseUrl}`);
  }
  // Priority 3: REPLIT_DEV_DOMAIN (trusted Replit dev environment)
  else if (process.env.REPLIT_DEV_DOMAIN) {
    baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    console.log(`🔗 [URL-RESOLVER] Using REPLIT_DEV_DOMAIN: ${baseUrl}`);
  }
  // Development fallback: localhost (ONLY if not in LIVE mode)
  else if (!isLiveMode) {
    baseUrl = 'http://localhost:5000';
    console.warn(`⚠️ [URL-RESOLVER] Using localhost fallback (development only)`);
  }
  // Error: No base URL configured in LIVE mode
  else {
    const errorMsg = `❌ [URL-RESOLVER] CRITICAL: No base URL configured for LIVE mode. Set APP_BASE_URL, REPLIT_DOMAINS, or REPLIT_DEV_DOMAIN environment variable`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  // SECURITY: Enforce HTTPS in LIVE mode or when explicitly required
  if (requireHttps && !baseUrl.startsWith('https://')) {
    const errorMsg = `❌ [URL-RESOLVER] CRITICAL: Base URL must use HTTPS (got: ${baseUrl}). This is required for Stripe in LIVE mode.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  return baseUrl;
}

/**
 * Generates a complete redirect URL for Stripe Connect flows
 * 
 * @param path - The path to append to the base URL (e.g., '/project-payments')
 * @param queryParams - Optional query parameters to append
 * @param options - URL resolution options
 * @returns Complete URL with protocol, domain, path, and query string
 */
export function generateStripeRedirectUrl(
  path: string,
  queryParams: Record<string, string> = {},
  options: ResolveAppBaseUrlOptions = {}
): string {
  const baseUrl = resolveAppBaseUrl(options);
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Build query string if params exist
  const queryString = Object.keys(queryParams).length > 0
    ? '?' + new URLSearchParams(queryParams).toString()
    : '';
  
  return `${baseUrl}${normalizedPath}${queryString}`;
}
