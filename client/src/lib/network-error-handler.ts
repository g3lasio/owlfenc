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
  'auth/network-request-failed',
  'auth/too-many-requests',
  'firestore',
  'Firebase',
  'requestStsToken',
  '_StsTokenManager',
  'getIdToken',
  '_performFetchWithErrorHandling'
];

// URLs que generan muchos errores y pueden ser ignorados silenciosamente
const SILENT_URL_PATTERNS = [
  '/api/subscription',
  '/api/contracts',
  '/api/projects', 
  '/api/usage',
  '/api/profile',
  '/api/property',
  '/api/dual-signature',
  '/api/oauth',
  '/api/auth'
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
          console.debug('🔧 [SILENT] Network error handled:', error?.code || 'network-error');
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
          console.debug('🔧 [SILENT] Global error handled:', message);
        }
        
        return;
      }
    });
  }

  private interceptFetchRequests() {
    // Interceptar todas las llamadas fetch para manejo robusto
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
      try {
        // Configurar timeout por defecto más bajo
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos en lugar de 30
        
        const response = await originalFetch(input, {
          ...init,
          signal: init?.signal || controller.signal
        });
        
        clearTimeout(timeoutId);
        return response;
        
      } catch (error: any) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : 'unknown';
        
        if (this.shouldSilenceError(error, url)) {
          // Crear una respuesta mock para requests que fallan constantemente
          if (url.includes('/api/')) {
            const mockResponse = new Response(
              JSON.stringify({ error: 'Network unavailable', offline: true }), 
              { 
                status: 503, 
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
              }
            );
            return mockResponse;
          }
        }
        
        throw error;
      }
    };
  }

  // Método para manejar errores específicos de React Query
  handleQueryError = (error: any, query?: any) => {
    const queryKey = query?.queryKey?.join('/') || 'unknown';
    
    if (this.shouldSilenceError(error, queryKey)) {
      if (!this.isRateLimited()) {
        console.debug('🔧 [SILENT] Query error handled:', queryKey);
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
    console.debug('🛡️ [NETWORK-HANDLER] Sistema avanzado de manejo silencioso activado');
  }, 100);
}

export default networkErrorHandler;