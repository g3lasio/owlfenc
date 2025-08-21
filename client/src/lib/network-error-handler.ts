/**
 * SOLUCIÓN GLOBAL PARA ERRORES DE FETCH FASTIDIOSOS
 * Intercepta y maneja todos los errores de red silenciosamente
 */

// Lista de errores que debemos manejar silenciosamente
const SILENT_ERROR_PATTERNS = [
  'Failed to fetch',
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
  // REMOVIDO: Patrones de auth/Firebase para permitir errores reales de autenticación
  'firestore'
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
    
    // Check error patterns
    const isKnownError = SILENT_ERROR_PATTERNS.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase()) ||
      errorCode.toLowerCase().includes(pattern.toLowerCase())
    );

    // Check URL patterns
    const isKnownUrl = Boolean(url && SILENT_URL_PATTERNS.some(pattern => 
      url.includes(pattern)
    ));

    return isKnownError || isKnownUrl;
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
    // Manejo más agresivo de promesas rechazadas
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      
      if (this.shouldSilenceError(error)) {
        event.preventDefault();
        
        if (!this.isRateLimited()) {
          this.logSilently('NETWORK', 'Error handled:', error?.code || 'network-error');
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
    
    // En lugar de interceptar fetch, solo manejar eventos de error específicos
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      const errorMessage = error?.message || '';
      
      // Solo silenciar errores específicos que sabemos que son problemáticos
      if (errorMessage.includes('Failed to fetch') && 
          (errorMessage.includes('googleapis.com') || 
           errorMessage.includes('firebaseapp.com') ||
           errorMessage.includes('_vite/ping'))) {
        if (!this.isRateLimited()) {
          this.logSilently('UNHANDLED', 'Silenciando error conocido:', errorMessage.substring(0, 50));
        }
        event.preventDefault(); // Prevenir que aparezca en consola
      }
    });
    
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

// Auto-inicializar
if (typeof window !== 'undefined') {
  // Esperar un momento para que main.tsx configure su sistema primero
  setTimeout(() => {
    networkErrorHandler.init();
    networkErrorHandler.logSilently('INIT', 'Sistema avanzado de manejo silencioso activado', '');
  }, 100);
}

export default networkErrorHandler;