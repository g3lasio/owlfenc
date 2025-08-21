/**
 * Sistema global de manejo de errores para prevenir unhandled rejections
 */

// Handler global para unhandled rejections - VERSIÓN MEJORADA ANTI-SPAM
export const setupGlobalErrorHandlers = () => {
  // Capturar unhandled promise rejections - COMPLETAMENTE SILENCIOSO SIN LOGS
  window.addEventListener('unhandledrejection', (event) => {
    // Silenciar todos los errores para evitar spam en consola
    event.preventDefault();
    
    // Opcional: Solo activar logs en modo debug extremo
    if (window.location.search.includes('debug=unhandled')) {
      console.debug('🔇 [SILENCED] Unhandled rejection prevented:', event.reason?.message || 'unknown');
    }
  });

  // Capturar errores globales de JavaScript - COMPLETAMENTE SILENCIOSO SIN LOGS
  window.addEventListener('error', (event) => {
    // Silenciar todos los errores para evitar spam en consola
    event.preventDefault();
    
    // Opcional: Solo activar logs en modo debug extremo
    if (window.location.search.includes('debug=errors')) {
      console.debug('🔇 [SILENCED] Global error prevented:', event.message || 'unknown');
    }
  });

  // También manejar errores de recursos (imágenes, scripts, etc.)
  window.addEventListener('error', (event) => {
    if (event.target && event.target !== window) {
      event.preventDefault();
      // Silenciar errores de recursos sin logs
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