/**
 * Sistema global de manejo de errores para prevenir unhandled rejections
 */

// Handler global para unhandled rejections
export const setupGlobalErrorHandlers = () => {
  // Capturar unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('🚨 [GLOBAL-ERROR] Unhandled promise rejection capturada:', event.reason);
    
    // Si es un error relacionado con mapas/autocompletado, silenciarlo completamente
    if (event.reason && event.reason.message) {
      const message = event.reason.message.toLowerCase();
      if (message.includes('google maps') || 
          message.includes('mapbox') || 
          message.includes('geocode') ||
          message.includes('fetch') ||
          message.includes('network') ||
          message.includes('address') ||
          message.includes('stripe') ||
          message.includes('firebase') ||
          message.includes('auth/') ||
          message.includes('permission') ||
          message.includes('resizeobserver') ||
          message.includes('script error') ||
          message.includes('timeout') ||
          message.includes('aborted') ||
          message.includes('cancelled')) {
        // Silenciar completamente estos errores comunes
        event.preventDefault();
        return;
      }
    }
    
    // Para otros errores, permitir que se muestren pero con menos noise
    console.warn('⚠️ [GLOBAL-ERROR] Promise rejection no manejada:', event.reason);
    event.preventDefault();
  });

  // Capturar errores globales de JavaScript
  window.addEventListener('error', (event) => {
    if (event.message && (
      event.message.includes('Google Maps') ||
      event.message.includes('Mapbox') ||
      event.message.includes('InvalidKeyMapError') ||
      event.message.includes('ApiNotActivatedMapError')
    )) {
      console.warn('🗺️ [GLOBAL-ERROR] Error de maps API silenciado');
      event.preventDefault();
      return;
    }
  });
};

// Helper para envolver funciones async y evitar unhandled rejections
export const safeAsync = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return (...args: T): Promise<R | void> => {
    return fn(...args).catch(error => {
      console.warn('🛡️ [SAFE-ASYNC] Error capturado:', error.message || error);
    });
  };
};

// Helper para limpiar timeouts de forma segura
export const safeClearTimeout = (timeoutId: NodeJS.Timeout | number | undefined) => {
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId);
  }
};

// Helper para limpiar intervals de forma segura
export const safeClearInterval = (intervalId: NodeJS.Timeout | number | undefined) => {
  if (intervalId !== undefined) {
    clearInterval(intervalId);
  }
};