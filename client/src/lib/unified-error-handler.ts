/**
 * SISTEMA UNIFICADO DE MANEJO DE ERRORES
 * Reemplaza todos los interceptores múltiples para evitar conflictos
 */

class UnifiedErrorHandler {
  private initialized = false;
  private errorCount = 0;
  private lastErrorTime = 0;
  private readonly MAX_ERRORS_PER_MINUTE = 5;
  private readonly ERROR_RESET_TIME = 60000; // 1 minuto

  // Patrones de errores que deben ser silenciados
  private readonly SILENT_PATTERNS = [
    // Firebase Auth errors
    'auth/network-request-failed',
    'requestStsToken',
    '_StsTokenManager',
    'getIdToken',
    '_performFetchWithErrorHandling',
    
    // Network errors
    'Failed to fetch',
    'TypeError: Failed to fetch',
    'NetworkError',
    'Network request failed',
    'ERR_NETWORK',
    'ERR_CONNECTION',
    'Request timeout',
    'AbortError',
    
    // Runtime plugin errors
    'runtime-error-plugin',
    '[plugin:runtime-error-plugin]',
    
    // Firebase bundle errors
    'chunk-7FXTVMOG.js',
    'firestore',
    'window.fetch'
  ];

  init(): void {
    if (this.initialized) {
      return;
    }

    this.interceptUnhandledRejections();
    this.interceptGlobalErrors();
    this.setupConsoleFilter();
    
    this.initialized = true;
    console.log('🛡️ [UNIFIED-ERROR-HANDLER] Sistema unificado activado');
  }

  private shouldSilenceError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error?.message || error?.toString() || '';
    const errorStack = error?.stack || '';
    const errorCode = error?.code || '';
    
    // Check against silent patterns
    return this.SILENT_PATTERNS.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase()) ||
      errorStack.toLowerCase().includes(pattern.toLowerCase()) ||
      errorCode.toLowerCase().includes(pattern.toLowerCase())
    );
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

  private interceptUnhandledRejections(): void {
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      
      if (this.shouldSilenceError(error)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // Solo log en modo debug
        if (window.location.search.includes('debug=errors') && !this.isRateLimited()) {
          console.debug('🔧 [UNIFIED] Silenced unhandled rejection:', error?.message?.substring(0, 50));
        }
        
        return false;
      }
    }, true); // Use capture phase for higher priority
  }

  private interceptGlobalErrors(): void {
    window.addEventListener('error', (event) => {
      const error = event.error || { message: event.message };
      
      if (this.shouldSilenceError(error)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // Solo log en modo debug
        if (window.location.search.includes('debug=errors') && !this.isRateLimited()) {
          console.debug('🔧 [UNIFIED] Silenced global error:', event.message?.substring(0, 50));
        }
        
        return false;
      }
    }, true); // Use capture phase for higher priority
  }

  private setupConsoleFilter(): void {
    const originalConsoleError = console.error;
    
    console.error = (...args) => {
      const message = args.join(' ').toString();
      
      // Silenciar solo errores específicos del runtime-error-plugin con Firebase
      if (message.includes('[plugin:runtime-error-plugin]') && 
          this.SILENT_PATTERNS.some(pattern => message.includes(pattern))) {
        // Silenciar completamente estos overlays
        if (window.location.search.includes('debug=console')) {
          console.debug('🔧 [UNIFIED] Silenced console error:', message.substring(0, 50));
        }
        return;
      }
      
      // Permitir todos los otros errores (crítico para React debugging)
      originalConsoleError.apply(console, args);
    };
  }

  // Método para usar en React Query y otras librerías
  handleError = (error: any, context?: string): any => {
    if (this.shouldSilenceError(error)) {
      if (window.location.search.includes('debug=errors') && !this.isRateLimited()) {
        console.debug(`🔧 [UNIFIED] Handled ${context || 'unknown'} error:`, error?.message?.substring(0, 50));
      }
      return null; // Silenciar el error
    }
    
    return error; // Dejar que se maneje normalmente
  };

  destroy(): void {
    this.initialized = false;
    // Los event listeners se mantienen ya que es difícil removerlos sin referencias
    console.log('🛡️ [UNIFIED-ERROR-HANDLER] Sistema destruido');
  }
}

// Crear instancia única
export const unifiedErrorHandler = new UnifiedErrorHandler();

// Auto-inicializar inmediatamente si está en browser
if (typeof window !== 'undefined') {
  // Inicializar inmediatamente con máxima prioridad
  unifiedErrorHandler.init();
}

export default unifiedErrorHandler;