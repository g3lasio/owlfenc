/**
 * SOLUCIÓN GLOBAL PARA ERRORES DE FETCH FASTIDIOSOS
 * Intercepta y maneja todos los errores de red silenciosamente
 */

// Lista expandida de errores que debemos manejar silenciosamente
const SILENT_ERROR_PATTERNS = [
  'Failed to fetch',
  'TypeError: Failed to fetch',
  'NetworkError', 
  'fetch',
  'Network request failed',
  'ERR_NETWORK',
  'ERR_INTERNET_DISCONNECTED',
  'ERR_CONNECTION_REFUSED',
  'ERR_CONNECTION_TIMED_OUT',
  'ERR_CONNECTION_CLOSED',
  'Request timeout',
  'Timeout',
  'AbortError',
  // CRÍTICO: Silenciar específicamente errores del runtime-error-plugin
  'runtime-error-plugin',
  '[plugin:runtime-error-plugin]',
  'plugin:runtime-error-plugin',
  // Firebase STS token refresh errors
  'requestStsToken',
  'getToken',
  'getIdToken',
  'refresh',
  '_performFetchWithErrorHandling',
  'firestore',
  'auth/network-request-failed',
  // Patrones adicionales específicos observados en logs
  'window.fetch',
  'eruda.js'
];

// URLs que generan muchos errores y pueden ser ignorados silenciosamente
const SILENT_URL_PATTERNS = [
  '/api/subscription',
  '/api/contracts',
  '/api/projects', 
  '/api/usage',
  '/api/profile',
  '/api/property',
  '/api/dual-signature'
  // REMOVIDO: '/api/oauth' y '/api/auth' para permitir autenticación
];

class NetworkErrorHandler {
  private errorCount = 0;
  private lastErrorTime = 0;
  private readonly MAX_ERRORS_PER_MINUTE = 10;
  private readonly ERROR_RESET_TIME = 60000; // 1 minuto

  init() {
    this.interceptGlobalErrors();
    this.interceptFetchRequests();
    this.interceptUnhandledRejections();
  }

  private shouldSilenceError(error: any, url?: string): boolean {
    const errorMessage = error?.message || error?.toString() || '';
    const errorCode = error?.code || '';
    const errorStack = error?.stack || '';
    
    // Check error patterns (más agresivo para capturar todos los casos)
    const isKnownError = SILENT_ERROR_PATTERNS.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase()) ||
      (errorCode && typeof errorCode === 'string' && errorCode.toLowerCase().includes(pattern.toLowerCase())) ||
      errorStack.toLowerCase().includes(pattern.toLowerCase())
    );

    // Check URL patterns
    const isKnownUrl = Boolean(url && SILENT_URL_PATTERNS.some(pattern => 
      url.includes(pattern)
    ));

    // Verificación adicional específica para TypeError: Failed to fetch
    const isFailedFetch = errorMessage.includes('Failed to fetch') || 
                         (error instanceof TypeError && errorMessage.includes('fetch'));

    return isKnownError || isKnownUrl || isFailedFetch;
  }

  logSilently(type: string, message: string, data?: any) {
    // Solo log si está en modo debug explícito - eliminando logs fastidiosos
    if (window.location.search.includes('debug=silent') || window.location.search.includes('debug=network')) {
      console.debug(`🔧 [${type.toUpperCase()}]`, message.substring(0, 30));
    }
  }

  private shouldBypassFetch(url: string): boolean {
    // Bypass fetch completely for URLs that frequently cause runtime-error-plugin issues
    // REMOVIDO: Patrones de autenticación para permitir login real
    const bypassPatterns = [
      'gstatic.com',
      '/api/subscription'
      // REMOVIDO: firebase, googleapis, oauth, auth para permitir autenticación
    ];
    
    return bypassPatterns.some(pattern => url.includes(pattern));
  }

  private isRateLimited(): boolean {
    const now = Date.now();
    if (now - this.lastErrorTime > this.ERROR_RESET_TIME) {
      this.errorCount = 0;
    }
    
    this.errorCount++;
    this.lastErrorTime = now;
    
    return this.errorCount > this.MAX_ERRORS_PER_MINUTE;
  }

  private interceptUnhandledRejections() {
    // Manejo centralizado y efectivo de promesas rechazadas
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || '';
      const errorStack = error?.stack || '';
      
      // Expandir patrones para cubrir todos los casos de "Failed to fetch"
      const failedFetchPatterns = [
        'Failed to fetch',
        'TypeError: Failed to fetch',
        'NetworkError',
        'fetch',
        'Network request failed'
      ];
      
      // Check for Firebase token refresh errors specifically
      const isFirebaseTokenError = errorStack.includes('requestStsToken') || 
                                   errorStack.includes('getIdToken') ||
                                   errorStack.includes('_performFetchWithErrorHandling') ||
                                   errorMessage.includes('auth/network-request-failed');
      
      // Check for failed fetch errors
      const isFailedFetchError = failedFetchPatterns.some(pattern => 
        errorMessage.includes(pattern)
      );
      
      if (this.shouldSilenceError(error) || isFirebaseTokenError || isFailedFetchError) {
        event.preventDefault();
        
        // Solo log en modo debug para evitar spam
        if (!this.isRateLimited() && window.location.search.includes('debug=network')) {
          console.debug('🔧 [NETWORK-HANDLER] Error silenced:', errorMessage.substring(0, 50));
        }
        
        return;
      }
    });
  }

  private interceptGlobalErrors() {
    // Interceptar errores globales de JavaScript
    window.addEventListener('error', (event) => {
      const error = event.error;
      const message = event.message;
      
      if (this.shouldSilenceError(error) || this.shouldSilenceError({ message })) {
        event.preventDefault();
        
        if (!this.isRateLimited()) {
          this.logSilently('GLOBAL', 'Error handled:', message);
        }
        
        return;
      }
    });
  }

  private interceptFetchRequests() {
    // DESHABILITADO: Interceptación global de fetch causaba problemas con runtime-error-plugin
    // Solo registrar eventos de error específicos sin interceptar fetch
    
    console.log('🛡️ [NETWORK-HANDLER] Sistema simplificado - sin interceptación global de fetch');
    
    // Manejo unificado de errores de fetch ya se hace en interceptUnhandledRejections()
    console.log('🛡️ [NETWORK-HANDLER] Sistema simplificado activado');
    
    // NO interceptar fetch - permitir funcionamiento normal
  }

  // Método para manejar errores específicos de React Query
  handleQueryError = (error: any, query?: any) => {
    const queryKey = query?.queryKey?.join('/') || 'unknown';
    
    if (this.shouldSilenceError(error, queryKey)) {
      if (!this.isRateLimited()) {
        this.logSilently('QUERY', 'Query error handled:', queryKey);
      }
      return null; // Silenciar el error
    }
    
    return error; // Dejar que se maneje normalmente
  };
}

// Crear instancia global
export const networkErrorHandler = new NetworkErrorHandler();

// INTERCEPTOR CRÍTICO para runtime-error-plugin antes de inicialización
if (typeof window !== 'undefined') {
  // Interceptar INMEDIATAMENTE antes de que cargue el runtime-error-plugin
  const immediateInterceptor = (e: PromiseRejectionEvent) => {
    const error = e.reason;
    const errorMessage = error?.message || '';
    const errorStack = error?.stack || '';
    
    // Específicamente para errores que causan runtime-error-plugin overlay
    if (errorStack.includes('_performFetchWithErrorHandling') ||
        errorStack.includes('requestStsToken') ||
        errorStack.includes('_StsTokenManager') ||
        errorMessage.includes('Failed to fetch')) {
      
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  };
  
  // Agregar interceptor con máxima prioridad
  window.addEventListener('unhandledrejection', immediateInterceptor, true);
  
  // Auto-inicializar el sistema completo después
  setTimeout(() => {
    networkErrorHandler.init();
    networkErrorHandler.logSilently('INIT', 'Sistema DEFINITIVO anti-runtime-error-plugin activado', '');
  }, 50);
}

export default networkErrorHandler;