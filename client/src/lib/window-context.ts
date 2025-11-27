/**
 * Detección de contexto de ventana para WebAuthn
 * Detecta si la aplicación está corriendo en iframe, top-level o popup
 * 
 * IMPORTANTE: WebAuthn en iframes cross-origin requiere:
 * 1. Atributo allow="publickey-credentials-get publickey-credentials-create" en el iframe padre
 * 2. Header Permissions-Policy en la respuesta del servidor
 * 
 * Como no controlamos el iframe padre en Replit preview, siempre usamos popup en iframes.
 */

export type WindowContext = 'top-level' | 'iframe' | 'popup';

export interface WindowContextInfo {
  context: WindowContext;
  isIframe: boolean;
  isTopLevel: boolean;
  isPopup: boolean;
  isCrossOriginIframe: boolean;
  canUseWebAuthnDirectly: boolean;
  requiresPopupForWebAuthn: boolean;
  referrer: string;
  origin: string;
}

/**
 * Lista de dominios de producción donde WebAuthn puede funcionar directamente
 */
const PRODUCTION_DOMAINS = [
  'app.owlfenc.com',
  'owlfenc.com',
  'owl-fenc.firebaseapp.com',
  'owl-fenc.web.app'
];

/**
 * Lista de patrones de iframe que requieren popup para WebAuthn
 */
const IFRAME_PATTERNS = [
  'replit.dev',
  'replit.com',
  'riker.replit.dev',
  '.id.repl.co'
];

/**
 * Cache del resultado de detección de cross-origin para evitar múltiples evaluaciones
 */
let crossOriginCacheResult: boolean | null = null;
let crossOriginCacheTime: number = 0;
const CROSS_ORIGIN_CACHE_TTL = 5000; // 5 segundos

/**
 * Detecta si estamos en un iframe cross-origin
 * Cachea el resultado para evitar múltiples accesos a window.parent.location
 */
function detectCrossOriginIframe(): boolean {
  // Usar cache si está disponible y no ha expirado
  const now = Date.now();
  if (crossOriginCacheResult !== null && (now - crossOriginCacheTime) < CROSS_ORIGIN_CACHE_TTL) {
    return crossOriginCacheResult;
  }
  
  try {
    // Si podemos acceder a window.parent.location, somos same-origin
    const parentOrigin = window.parent?.location?.origin;
    crossOriginCacheResult = parentOrigin !== window.location.origin;
    crossOriginCacheTime = now;
    return crossOriginCacheResult;
  } catch (e) {
    // Error de seguridad = definitivamente cross-origin
    crossOriginCacheResult = true;
    crossOriginCacheTime = now;
    return true;
  }
}

/**
 * Detecta si el host actual es un entorno de desarrollo/preview que requiere popup
 */
function isPreviewEnvironment(): boolean {
  const hostname = window.location.hostname;
  return IFRAME_PATTERNS.some(pattern => hostname.includes(pattern));
}

/**
 * Detecta si estamos en un entorno de producción confiable
 */
function isProductionEnvironment(): boolean {
  const hostname = window.location.hostname;
  return PRODUCTION_DOMAINS.some(domain => hostname === domain);
}

/**
 * Detecta el contexto actual de la ventana con soporte mejorado para cross-origin
 */
export function detectWindowContext(): WindowContextInfo {
  const isIframe = window.self !== window.top;
  const isPopup = !!(window.opener && window.opener !== window);
  const isTopLevel = !isIframe && !isPopup;
  const isCrossOriginIframe = isIframe && detectCrossOriginIframe();
  
  const referrer = document.referrer || '';
  const origin = window.location.origin;
  
  // WebAuthn puede funcionar directamente solo si:
  // 1. Es top-level window O
  // 2. Es un popup O
  // 3. Es un iframe same-origin en producción (con Permissions-Policy configurado)
  const canUseWebAuthnDirectly = 
    isTopLevel || 
    isPopup || 
    (isIframe && !isCrossOriginIframe && isProductionEnvironment());
  
  // Requiere popup si:
  // 1. Es un iframe cross-origin O
  // 2. Es un entorno de preview (Replit, etc.)
  const requiresPopupForWebAuthn = 
    isCrossOriginIframe || 
    (isIframe && isPreviewEnvironment());
  
  let context: WindowContext = 'top-level';
  if (isPopup) {
    context = 'popup';
  } else if (isIframe) {
    context = 'iframe';
  }
  
  console.log('🔍 [WINDOW-CONTEXT] Detected:', {
    context,
    isIframe,
    isTopLevel,
    isPopup,
    isCrossOriginIframe,
    canUseWebAuthnDirectly,
    requiresPopupForWebAuthn,
    referrer,
    origin,
    hostname: window.location.hostname,
    isPreview: isPreviewEnvironment(),
    isProduction: isProductionEnvironment()
  });
  
  return {
    context,
    isIframe,
    isTopLevel,
    isPopup,
    isCrossOriginIframe,
    canUseWebAuthnDirectly,
    requiresPopupForWebAuthn,
    referrer,
    origin
  };
}

/**
 * Lista de orígenes permitidos (dominios confiables)
 */
const ALLOWED_ORIGINS = [
  'https://app.owlfenc.com',
  'https://owlfenc.com',
  'https://owl-fenc.firebaseapp.com',
  'https://owl-fenc.web.app',
  'https://replit.dev',
  'https://replit.com',
  'http://localhost',
  'http://127.0.0.1',
];

/**
 * Verifica si el origen es confiable
 */
export function isOriginTrusted(origin: string): boolean {
  return ALLOWED_ORIGINS.some(allowed => origin.includes(allowed));
}

/**
 * Obtiene el origen esperado del popup basado en la URL actual
 */
export function getExpectedPopupOrigin(): string {
  return window.location.origin;
}

/**
 * Verifica si necesitamos usar popup para WebAuthn
 * Esta es la función principal que determina el flujo de autenticación
 */
export function needsPopupForWebAuthn(): boolean {
  const context = detectWindowContext();
  return context.requiresPopupForWebAuthn;
}

/**
 * Fuerza el uso de popup en contextos donde WebAuthn inline no funcionará
 * Usar esta función para decidir ANTES de intentar WebAuthn
 * 
 * IMPORTANTE: Esta función tiene try/catch propio para garantizar que nunca
 * lance una excepción, incluso si detectWindowContext() falla
 */
export function shouldUsePopupFirst(): boolean {
  try {
    // Detectar si estamos en iframe primero (forma más segura)
    const isInIframe = window.self !== window.top;
    
    if (!isInIframe) {
      // No estamos en iframe, no necesitamos popup
      console.log('🪟 [WINDOW-CONTEXT] Top-level window - WebAuthn inline permitido');
      return false;
    }
    
    // Estamos en iframe, verificar si es cross-origin
    const isCrossOrigin = detectCrossOriginIframe();
    
    if (isCrossOrigin) {
      console.log('🪟 [WINDOW-CONTEXT] Cross-origin iframe detectado - forzando popup');
      return true;
    }
    
    // Es iframe same-origin, verificar si es entorno de preview
    if (isPreviewEnvironment()) {
      console.log('🪟 [WINDOW-CONTEXT] Preview environment detectado - forzando popup');
      return true;
    }
    
    // Iframe same-origin en entorno de producción
    console.log('🪟 [WINDOW-CONTEXT] Same-origin iframe en producción - WebAuthn inline permitido');
    return false;
    
  } catch (error) {
    // En caso de cualquier error, asumir que necesitamos popup (más seguro)
    console.warn('⚠️ [WINDOW-CONTEXT] Error detectando contexto, asumiendo popup necesario:', error);
    return true;
  }
}
