/**
 * Sistema global de manejo de errores para prevenir unhandled rejections
 */

// Handler global para unhandled rejections - VERSIÓN SELECTIVA 
export const setupGlobalErrorHandlers = () => {
  // Patrones de errores que queremos silenciar (Firebase/Clerk/API de autenticación)
  const SILENCED_ERROR_PATTERNS = [
    'ClerkJS: Something went wrong',
    'auth/network-request-failed', 
    'auth/operation-not-supported-in-this-environment',
    'Failed to fetch',
    '_performFetchWithErrorHandling',
    'requestStsToken',
    'chunk-7FXTVMOG.js',
    'engaging-eagle-59.clerk.accounts.dev'
  ];

  // Capturar unhandled promise rejections - SELECTIVO
  window.addEventListener('unhandledrejection', (event) => {
    const errorMessage = event.reason?.message || event.reason?.toString() || '';
    const errorStack = event.reason?.stack || '';
    
    // Solo silenciar errores específicos de autenticación
    const shouldSilence = SILENCED_ERROR_PATTERNS.some(pattern => 
      errorMessage.includes(pattern) || errorStack.includes(pattern)
    );
    
    if (shouldSilence) {
      event.preventDefault();
      // Log mínimo para debugging
      if (window.location.search.includes('debug=auth')) {
        console.debug('🔇 [AUTH-ERROR-SILENCED]:', errorMessage.substring(0, 100));
      }
    } else {
      // Permitir que otros errores importantes se muestren
      console.warn('⚠️ [UNHANDLED-REJECTION]:', errorMessage);
    }
  });

  // Capturar errores globales de JavaScript - SELECTIVO
  window.addEventListener('error', (event) => {
    const errorMessage = event.message || '';
    const shouldSilence = SILENCED_ERROR_PATTERNS.some(pattern => 
      errorMessage.includes(pattern)
    );
    
    if (shouldSilence) {
      event.preventDefault();
    }
    // Permitir que otros errores se muestren normalmente
  });

  // Manejar errores de recursos (imágenes, scripts, etc.) - SELECTIVO
  window.addEventListener('error', (event) => {
    if (event.target && event.target !== window) {
      const target = event.target as HTMLElement;
      const src = target.getAttribute('src') || '';
      
      // Solo silenciar errores de recursos específicos (Clerk CDN, etc.)
      const shouldSilence = SILENCED_ERROR_PATTERNS.some(pattern => 
        src.includes(pattern)
      );
      
      if (shouldSilence) {
        event.preventDefault();
      }
    }
  }, true);
};

// Helper para envolver funciones async y evitar unhandled rejections - SILENCIOSO
export const safeAsync = <T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return (...args: T): Promise<R | void> => {
    return fn(...args).catch(error => {
      // Silencioso - sin logs
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