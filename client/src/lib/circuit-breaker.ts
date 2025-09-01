/**
 * CIRCUIT BREAKER PATTERN - SOLUCIÓN DEFINITIVA
 * Detiene automáticamente requests cuando hay problemas de conectividad
 * Elimina completamente el problema de fetch requests continuos
 */

enum CircuitState {
  CLOSED = 'CLOSED',     // Normal - requests pasan
  OPEN = 'OPEN',         // Circuito abierto - requests bloqueados
  HALF_OPEN = 'HALF_OPEN' // Probando conectividad
}

interface CircuitBreakerConfig {
  failureThreshold: number;        // Número de errores antes de abrir circuito
  timeout: number;                 // Tiempo antes de probar reconexión (ms)
  monitoringWindow: number;        // Ventana de tiempo para contar errores (ms)
  halfOpenMaxCalls: number;        // Máximo requests en estado HALF_OPEN
}

interface RequestResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fromCache?: boolean;
  circuitOpen?: boolean;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenCalls = 0;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  private config: CircuitBreakerConfig = {
    failureThreshold: 3,      // 3 errores consecutivos
    timeout: 30000,           // 30 segundos antes de probar reconexión
    monitoringWindow: 60000,  // 1 minuto ventana de monitoreo
    halfOpenMaxCalls: 2       // Máximo 2 requests de prueba
  };

  constructor(customConfig?: Partial<CircuitBreakerConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    this.initMonitoring();
    console.log('🛡️ [CIRCUIT-BREAKER] Sistema activado');
  }

  private initMonitoring() {
    // Monitor de conectividad cada 30 segundos
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Resetear contadores cada ventana de monitoreo
    setInterval(() => {
      if (this.state === CircuitState.CLOSED) {
        this.failureCount = 0;
      }
    }, this.config.monitoringWindow);
  }

  private async performHealthCheck() {
    if (this.state === CircuitState.OPEN) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      
      if (timeSinceFailure >= this.config.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenCalls = 0;
        console.log('🔄 [CIRCUIT-BREAKER] Probando reconexión...');
      }
    }
  }

  private recordSuccess() {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      console.log('✅ [CIRCUIT-BREAKER] Conectividad restaurada - circuito cerrado');
    }
  }

  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      console.log('❌ [CIRCUIT-BREAKER] Reconexión falló - circuito abierto nuevamente');
      return;
    }
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.log(`🚫 [CIRCUIT-BREAKER] Circuito ABIERTO - detectados ${this.failureCount} errores consecutivos`);
    }
  }

  private isNetworkError(error: any): boolean {
    const errorMessage = error?.message || error?.toString() || '';
    const errorCode = error?.code || '';
    
    return (
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorCode === 'auth/network-request-failed' ||
      error instanceof TypeError
    );
  }

  private getCachedResult<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCachedResult<T>(key: string, data: T, ttl: number = 300000) { // 5 min default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Ejecuta un request de manera segura a través del circuit breaker
   */
  async executeRequest<T>(
    operation: () => Promise<T>,
    operationName: string,
    cacheKey?: string,
    cacheTTL?: number
  ): Promise<RequestResult<T>> {
    
    // Si hay cache válido, usarlo independientemente del estado del circuito
    if (cacheKey) {
      const cached = this.getCachedResult<T>(cacheKey);
      if (cached) {
        return { success: true, data: cached, fromCache: true };
      }
    }

    // Si el circuito está abierto, retornar inmediatamente
    if (this.state === CircuitState.OPEN) {
      console.log(`🚫 [CIRCUIT-BREAKER] Request bloqueado: ${operationName}`);
      return { 
        success: false, 
        error: 'Conectividad temporalmente bloqueada', 
        circuitOpen: true 
      };
    }

    // Si está en HALF_OPEN, limitar número de requests
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        return { 
          success: false, 
          error: 'Circuito en modo prueba - límite alcanzado', 
          circuitOpen: true 
        };
      }
      this.halfOpenCalls++;
    }

    try {
      console.log(`⚡ [CIRCUIT-BREAKER] Ejecutando: ${operationName}`);
      const result = await operation();
      
      this.recordSuccess();
      
      // Cachear resultado exitoso si se especifica
      if (cacheKey && cacheTTL) {
        this.setCachedResult(cacheKey, result, cacheTTL);
      }
      
      return { success: true, data: result };
      
    } catch (error: any) {
      if (this.isNetworkError(error)) {
        this.recordFailure();
        console.log(`🔧 [CIRCUIT-BREAKER] Error de red registrado para: ${operationName}`);
      }
      
      return { 
        success: false, 
        error: error?.message || 'Request falló' 
      };
    }
  }

  /**
   * Ejecuta request crítico que siempre debe intentarse (ej: login del usuario)
   */
  async executeCriticalRequest<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<RequestResult<T>> {
    console.log(`🚨 [CIRCUIT-BREAKER] Request crítico: ${operationName}`);
    
    try {
      const result = await operation();
      this.recordSuccess();
      return { success: true, data: result };
    } catch (error: any) {
      if (this.isNetworkError(error)) {
        this.recordFailure();
      }
      return { 
        success: false, 
        error: error?.message || 'Request crítico falló' 
      };
    }
  }

  /**
   * Verifica si requests automáticos están permitidos
   */
  canMakeAutomaticRequest(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Limpia cache completamente
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ [CIRCUIT-BREAKER] Cache limpiado');
  }

  /**
   * Estado actual del circuito para debugging
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      cacheSize: this.cache.size,
      lastFailureTime: this.lastFailureTime
    };
  }

  /**
   * Reset manual del circuito (para casos especiales)
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.halfOpenCalls = 0;
    console.log('🔄 [CIRCUIT-BREAKER] Reset manual completado');
  }
}

// Instancia global singleton
export const circuitBreaker = new CircuitBreaker();

// Hook de React para usar el circuit breaker
export function useCircuitBreaker() {
  return {
    executeRequest: circuitBreaker.executeRequest.bind(circuitBreaker),
    executeCriticalRequest: circuitBreaker.executeCriticalRequest.bind(circuitBreaker),
    canMakeAutomaticRequest: circuitBreaker.canMakeAutomaticRequest.bind(circuitBreaker),
    getStatus: circuitBreaker.getStatus.bind(circuitBreaker),
    clearCache: circuitBreaker.clearCache.bind(circuitBreaker)
  };
}

export default circuitBreaker;