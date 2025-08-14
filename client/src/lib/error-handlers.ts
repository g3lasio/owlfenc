/**
 * Sistema global de manejo de errores para prevenir unhandled rejections
 */

// Handler global para unhandled rejections
export const setupGlobalErrorHandlers = () => {
  // Capturar unhandled promise rejections - COMPLETAMENTE SILENCIOSO
  window.addEventListener('unhandledrejection', (event) => {
    // SILENCIAR COMPLETAMENTE - sin logs
    event.preventDefault();
  });

  // Capturar errores globales de JavaScript - COMPLETAMENTE SILENCIOSO
  window.addEventListener('error', (event) => {
    // SILENCIAR COMPLETAMENTE - sin logs
    event.preventDefault();
  });
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