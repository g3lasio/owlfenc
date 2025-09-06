/**
 * DESHABILITADO: SOLUCIÓN DEFINITIVA PARA RUNTIME-ERROR-PLUGIN
 * Este archivo ha sido reemplazado por unified-error-handler.ts
 */

// DESHABILITADO - REEMPLAZADO POR SISTEMA UNIFICADO
// INTERCEPTOR CRÍTICO - Se ejecuta inmediatamente
/*
(function() {
  'use strict';
  
  // Patrones específicos que causan runtime-error-plugin overlay
  const CRITICAL_ERROR_PATTERNS = [
    '_performFetchWithErrorHandling',
    'requestStsToken',
    '_StsTokenManager.refresh',
    '_StsTokenManager.getToken', 
    'getIdToken',
    'auth/network-request-failed',
    'chunk-7FXTVMOG.js', // Bundle de Firebase específico
    'Failed to fetch'
  ];

  // Interceptor de máxima prioridad para unhandledrejection
  const criticalInterceptor = (e: PromiseRejectionEvent) => {
    const error = e.reason;
    const errorMessage = error?.message || '';
    const errorStack = error?.stack || '';
    
    // Verificar si es exactamente el tipo de error que queremos bloquear
    const isCriticalFirebaseError = CRITICAL_ERROR_PATTERNS.some(pattern => 
      errorMessage.includes(pattern) || errorStack.includes(pattern)
    );
    
    if (isCriticalFirebaseError) {
      // BLOQUEO TOTAL - no debe llegar al runtime-error-plugin
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Marcar como manejado
      Object.defineProperty(e, 'defaultPrevented', { value: true, writable: false });
      Object.defineProperty(error, '_handled', { value: true, writable: false });
      
      return false;
    }
  };
  
  // Interceptor de error global tambien
  const criticalErrorInterceptor = (e: ErrorEvent) => {
    const errorMessage = e.message || '';
    const errorStack = e.error?.stack || '';
    
    const isCriticalError = CRITICAL_ERROR_PATTERNS.some(pattern => 
      errorMessage.includes(pattern) || errorStack.includes(pattern)
    );
    
    if (isCriticalError) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  };

  // Registrar interceptores con máxima prioridad (capture phase)
  window.addEventListener('unhandledrejection', criticalInterceptor, {
    capture: true,
    passive: false
  });
  
  window.addEventListener('error', criticalErrorInterceptor, {
    capture: true, 
    passive: false
  });

  console.debug('🛡️ [RUNTIME-ERROR-KILLER] Sistema crítico activado contra Firebase Auth overlays');
})();
*/

console.log('⚠️ [RUNTIME-ERROR-KILLER] DESHABILITADO - Usando sistema unificado');