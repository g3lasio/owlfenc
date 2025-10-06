/**
 * Detección de contexto de ventana para WebAuthn
 * Detecta si la aplicación está corriendo en iframe, top-level o popup
 */

export type WindowContext = 'top-level' | 'iframe' | 'popup';

export interface WindowContextInfo {
  context: WindowContext;
  isIframe: boolean;
  isTopLevel: boolean;
  isPopup: boolean;
  canUseWebAuthnDirectly: boolean;
  referrer: string;
  origin: string;
}

/**
 * Lista de orígenes permitidos (dominios confiables)
 */
const ALLOWED_ORIGINS = [
  'https://replit.dev',
  'https://replit.com',
  'http://localhost',
  'http://127.0.0.1',
];

/**
 * Detecta el contexto actual de la ventana
 */
export function detectWindowContext(): WindowContextInfo {
  const isIframe = window.self !== window.top;
  const isPopup = !!(window.opener && window.opener !== window);
  const isTopLevel = !isIframe && !isPopup;
  
  const referrer = document.referrer || '';
  const origin = window.location.origin;
  
  // Determinar si puede usar WebAuthn directamente
  // WebAuthn funciona en top-level y popups, pero NO en iframes
  const canUseWebAuthnDirectly = isTopLevel || isPopup;
  
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
    canUseWebAuthnDirectly,
    referrer,
    origin
  });
  
  return {
    context,
    isIframe,
    isTopLevel,
    isPopup,
    canUseWebAuthnDirectly,
    referrer,
    origin
  };
}

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
 * Verifica si estamos en un iframe y necesitamos usar popup para WebAuthn
 */
export function needsPopupForWebAuthn(): boolean {
  const context = detectWindowContext();
  return context.isIframe;
}
