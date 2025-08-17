/**
 * ENDPOINT COORDINATOR - COORDINACIÓN INTELIGENTE DE APIS
 * 
 * Coordina y ejecuta llamadas a múltiples endpoints de forma inteligente,
 * manejando errores, timeouts, retries y optimizaciones automáticas.
 * 
 * Responsabilidades:
 * - Mapping y ejecución de endpoints
 * - Manejo de errores y recovery
 * - Optimización de secuencias
 * - Tracking de performance
 * - Rate limiting y throttling
 */

export interface EndpointConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  timeout: number;
  retries: number;
  rateLimit?: number;
  requiresAuth: boolean;
  responseType: 'json' | 'blob' | 'text';
}

export interface EndpointResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  endpoint: string;
  retryCount: number;
  statusCode?: number;
}

export interface EndpointPerformance {
  endpoint: string;
  averageResponseTime: number;
  successRate: number;
  lastUsed: Date;
  totalCalls: number;
  totalErrors: number;
}

export class EndpointCoordinator {
  private config: any;
  private endpointMap: Map<string, EndpointConfig>;
  private performanceTracker: Map<string, EndpointPerformance>;
  private rateLimitTracker: Map<string, number[]>;
  private currentRequests: Map<string, Promise<any>>;

  constructor(config: any) {
    this.config = config;
    this.endpointMap = new Map();
    this.performanceTracker = new Map();
    this.rateLimitTracker = new Map();
    this.currentRequests = new Map();
    
    this.initializeEndpoints();
  }

  /**
   * Ejecutar endpoint con manejo inteligente
   */
  async executeEndpoint(endpoint: string, parameters: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Verificar si ya hay una request en curso para este endpoint con los mismos parámetros
      const requestKey = this.generateRequestKey(endpoint, parameters);
      if (this.currentRequests.has(requestKey)) {
        console.log(`🔄 [ENDPOINT-COORDINATOR] Reusing ongoing request for ${endpoint}`);
        return await this.currentRequests.get(requestKey);
      }

      // Verificar rate limiting
      if (!this.checkRateLimit(endpoint)) {
        throw new Error(`Rate limit exceeded for endpoint: ${endpoint}`);
      }

      // Obtener configuración del endpoint
      const endpointConfig = this.getEndpointConfig(endpoint);
      
      // Crear y ejecutar request
      const requestPromise = this.executeRequest(endpointConfig, parameters);
      this.currentRequests.set(requestKey, requestPromise);

      const result = await requestPromise;
      
      // Cleanup
      this.currentRequests.delete(requestKey);
      
      // Tracking de performance
      this.trackPerformance(endpoint, Date.now() - startTime, true);
      
      return result;

    } catch (error) {
      const requestKey = this.generateRequestKey(endpoint, parameters);
      this.currentRequests.delete(requestKey);
      
      // Tracking de errores
      this.trackPerformance(endpoint, Date.now() - startTime, false);
      
      console.error(`❌ [ENDPOINT-COORDINATOR] Error en ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Ejecutar múltiples endpoints en secuencia
   */
  async executeEndpointSequence(endpoints: { endpoint: string; parameters: any }[]): Promise<EndpointResult[]> {
    const results: EndpointResult[] = [];
    
    for (const { endpoint, parameters } of endpoints) {
      const startTime = Date.now();
      
      try {
        const data = await this.executeEndpoint(endpoint, parameters);
        
        results.push({
          success: true,
          data,
          duration: Date.now() - startTime,
          endpoint,
          retryCount: 0
        });
        
      } catch (error) {
        results.push({
          success: false,
          error: (error as Error).message,
          duration: Date.now() - startTime,
          endpoint,
          retryCount: 0
        });
        
        // Si es un endpoint crítico, detener la secuencia
        if (this.isCriticalEndpoint(endpoint)) {
          break;
        }
      }
    }
    
    return results;
  }

  /**
   * Ejecutar múltiples endpoints en paralelo
   */
  async executeEndpointsParallel(endpoints: { endpoint: string; parameters: any }[]): Promise<EndpointResult[]> {
    const promises = endpoints.map(async ({ endpoint, parameters }) => {
      const startTime = Date.now();
      
      try {
        const data = await this.executeEndpoint(endpoint, parameters);
        
        return {
          success: true,
          data,
          duration: Date.now() - startTime,
          endpoint,
          retryCount: 0
        };
        
      } catch (error) {
        return {
          success: false,
          error: (error as Error).message,
          duration: Date.now() - startTime,
          endpoint,
          retryCount: 0
        };
      }
    });
    
    return Promise.all(promises);
  }

  /**
   * Manejar falla de endpoint con recovery automático
   */
  async handleEndpointFailure(endpoint: string, error: Error, parameters: any): Promise<any> {
    console.log(`🔧 [ENDPOINT-COORDINATOR] Handling failure for ${endpoint}:`, error.message);
    
    // Determinar estrategia de recovery
    const recoveryStrategy = this.determineRecoveryStrategy(endpoint, error);
    
    switch (recoveryStrategy) {
      case 'retry':
        return this.retryEndpoint(endpoint, parameters);
        
      case 'fallback':
        return this.useFallbackEndpoint(endpoint, parameters);
        
      case 'mock':
        return this.generateMockResponse(endpoint, parameters);
        
      default:
        throw error;
    }
  }

  /**
   * Obtener estadísticas de performance
   */
  getPerformanceStats(): EndpointPerformance[] {
    return Array.from(this.performanceTracker.values());
  }

  /**
   * Obtener endpoint más rápido para una funcionalidad
   */
  getFastestEndpoint(functionality: string): string | null {
    const candidates = this.getEndpointsByFunctionality(functionality);
    
    let fastest: { endpoint: string; time: number } | null = null;
    
    for (const endpoint of candidates) {
      const perf = this.performanceTracker.get(endpoint);
      if (perf && (!fastest || perf.averageResponseTime < fastest.time)) {
        fastest = { endpoint, time: perf.averageResponseTime };
      }
    }
    
    return fastest?.endpoint || null;
  }

  /**
   * Inicializar configuración de endpoints
   */
  private initializeEndpoints(): void {
    const endpoints: Record<string, EndpointConfig> = {
      // Estimates - Endpoints reales de EstimatesNew.tsx
      '/api/clients': {
        url: '/api/clients',
        method: 'GET',
        timeout: 10000,
        retries: 3,
        requiresAuth: true,
        responseType: 'json'
      },
      '/api/materials': {
        url: '/api/materials',
        method: 'GET',
        timeout: 10000,
        retries: 3,
        requiresAuth: true,
        responseType: 'json'
      },
      '/api/estimates': {
        url: '/api/estimates',
        method: 'POST',
        timeout: 15000,
        retries: 2,
        requiresAuth: true,
        responseType: 'json'
      },
      '/api/estimates/html': {
        url: '/api/estimates/html',
        method: 'POST',
        timeout: 15000,
        retries: 2,
        requiresAuth: true,
        responseType: 'json'
      },
      '/api/estimates/send': {
        url: '/api/estimates/send',
        method: 'POST',
        timeout: 15000,
        retries: 2,
        requiresAuth: true,
        responseType: 'json'
      },
      '/api/estimates/calculate': {
        url: '/api/estimates/calculate',
        method: 'POST',
        timeout: 15000,
        retries: 2,
        requiresAuth: true,
        responseType: 'json'
      },
      
      // Contracts - Endpoints reales de LegalDefenseProfile.tsx
      '/api/legal-defense/extract-pdf': {
        url: '/api/legal-defense/extract-pdf',
        method: 'POST',
        timeout: 20000,
        retries: 2,
        requiresAuth: true,
        responseType: 'json'
      },
      '/api/legal-defense/advanced-analysis': {
        url: '/api/legal-defense/advanced-analysis',
        method: 'POST',
        timeout: 20000,
        retries: 2,
        requiresAuth: true,
        responseType: 'json'
      },
      '/api/legal-defense/generate-contract': {
        url: '/api/legal-defense/generate-contract',
        method: 'POST',
        timeout: 20000,
        retries: 2,
        requiresAuth: true,
        responseType: 'json'
      },
      '/api/dual-signature': {
        url: '/api/dual-signature',
        method: 'POST',
        timeout: 15000,
        retries: 2,
        requiresAuth: true,
        responseType: 'json'
      },
      
      // Permits - Endpoints reales de PermitAdvisor.tsx
      '/api/permit/check': {
        url: '/api/permit/check',
        method: 'POST',
        timeout: 25000,
        retries: 2,
        requiresAuth: true,
        responseType: 'json'
      },
      
      // Property - Endpoints reales de PropertyOwnershipVerifier.tsx
      '/api/property/details': {
        url: '/api/property/details',
        method: 'POST',
        timeout: 20000,
        retries: 2,
        requiresAuth: true,
        responseType: 'json'
      },
      '/api/property/history': {
        url: '/api/property/history',
        method: 'GET',
        timeout: 15000,
        retries: 2,
        requiresAuth: true,
        responseType: 'json'
      },
      


      
      // PDF Generation
      '/api/generate-pdf': {
        url: '/api/generate-pdf',
        method: 'POST',
        timeout: 30000,
        retries: 1,
        requiresAuth: true,
        responseType: 'blob'
      },
      
      // Analytics
      '/api/analytics': {
        url: '/api/usage',
        method: 'GET',
        timeout: 10000,
        retries: 2,
        requiresAuth: true,
        responseType: 'json'
      },
      
      // Payment Tracking
      '/api/payment-tracking': {
        url: '/api/quickbooks',
        method: 'GET',
        timeout: 15000,
        retries: 2,
        requiresAuth: true,
        responseType: 'json'
      }
    };
    
    Object.entries(endpoints).forEach(([key, config]) => {
      this.endpointMap.set(key, config);
      this.initializePerformanceTracking(key);
    });
  }

  /**
   * Obtener configuración de endpoint
   */
  private getEndpointConfig(endpoint: string): EndpointConfig {
    const config = this.endpointMap.get(endpoint);
    if (!config) {
      throw new Error(`Endpoint no configurado: ${endpoint}`);
    }
    return config;
  }

  /**
   * Ejecutar request con configuración
   */
  private async executeRequest(config: EndpointConfig, parameters: any): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Agregar autenticación si es necesaria
      if (config.requiresAuth) {
        // Aquí se podría agregar token de autenticación
        headers['Authorization'] = `Bearer ${this.config.userId || 'anonymous'}`;
      }
      
      const response = await fetch(config.url, {
        method: config.method,
        headers,
        body: config.method !== 'GET' ? JSON.stringify(parameters) : undefined,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Procesar respuesta según tipo
      switch (config.responseType) {
        case 'json':
          return await response.json();
        case 'blob':
          return await response.blob();
        case 'text':
          return await response.text();
        default:
          return await response.json();
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Timeout after ${config.timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Verificar rate limiting
   */
  private checkRateLimit(endpoint: string): boolean {
    const config = this.endpointMap.get(endpoint);
    if (!config?.rateLimit) return true;
    
    const now = Date.now();
    const windowMs = 60000; // 1 minuto
    const calls = this.rateLimitTracker.get(endpoint) || [];
    
    // Limpiar calls antiguas
    const recentCalls = calls.filter(time => now - time < windowMs);
    
    // Verificar límite
    if (recentCalls.length >= config.rateLimit) {
      return false;
    }
    
    // Agregar call actual
    recentCalls.push(now);
    this.rateLimitTracker.set(endpoint, recentCalls);
    
    return true;
  }

  /**
   * Generar clave única para request
   */
  private generateRequestKey(endpoint: string, parameters: any): string {
    const paramStr = JSON.stringify(parameters);
    return `${endpoint}_${btoa(paramStr).slice(0, 20)}`;
  }

  /**
   * Tracking de performance
   */
  private trackPerformance(endpoint: string, duration: number, success: boolean): void {
    const current = this.performanceTracker.get(endpoint);
    
    if (current) {
      const totalCalls = current.totalCalls + 1;
      const totalErrors = current.totalErrors + (success ? 0 : 1);
      
      this.performanceTracker.set(endpoint, {
        endpoint,
        averageResponseTime: (current.averageResponseTime * current.totalCalls + duration) / totalCalls,
        successRate: ((totalCalls - totalErrors) / totalCalls) * 100,
        lastUsed: new Date(),
        totalCalls,
        totalErrors
      });
    }
  }

  /**
   * Inicializar tracking de performance
   */
  private initializePerformanceTracking(endpoint: string): void {
    this.performanceTracker.set(endpoint, {
      endpoint,
      averageResponseTime: 0,
      successRate: 100,
      lastUsed: new Date(),
      totalCalls: 0,
      totalErrors: 0
    });
  }

  /**
   * Determinar estrategia de recovery
   */
  private determineRecoveryStrategy(endpoint: string, error: Error): 'retry' | 'fallback' | 'mock' | 'fail' {
    // Errors de timeout -> retry
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return 'retry';
    }
    
    // Errors de red -> retry
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return 'retry';
    }
    
    // Errors 5xx -> retry
    if (error.message.includes('50')) {
      return 'retry';
    }
    
    // Endpoints con fallbacks disponibles
    if (this.hasFallbackEndpoint(endpoint)) {
      return 'fallback';
    }
    
    // Para desarrollo, usar mocks
    if (this.config.debug) {
      return 'mock';
    }
    
    return 'fail';
  }

  /**
   * Reintentar endpoint
   */
  private async retryEndpoint(endpoint: string, parameters: any, attempt: number = 1): Promise<any> {
    const config = this.getEndpointConfig(endpoint);
    const maxRetries = config.retries;
    
    if (attempt > maxRetries) {
      throw new Error(`Max retries (${maxRetries}) exceeded for ${endpoint}`);
    }
    
    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      return await this.executeRequest(config, parameters);
    } catch (error) {
      return this.retryEndpoint(endpoint, parameters, attempt + 1);
    }
  }

  /**
   * Usar endpoint de fallback
   */
  private async useFallbackEndpoint(endpoint: string, parameters: any): Promise<any> {
    const fallback = this.getFallbackEndpoint(endpoint);
    if (fallback) {
      console.log(`🔄 [ENDPOINT-COORDINATOR] Using fallback ${fallback} for ${endpoint}`);
      return this.executeEndpoint(fallback, parameters);
    }
    throw new Error(`No fallback available for ${endpoint}`);
  }

  /**
   * Generar respuesta mock
   */
  private generateMockResponse(endpoint: string, parameters: any): any {
    console.log(`🎭 [ENDPOINT-COORDINATOR] Generating mock response for ${endpoint}`);
    
    // Mock responses básicas por endpoint
    const mockResponses: Record<string, any> = {
      '/api/estimates': {
        success: true,
        estimateId: 'EST-' + Date.now(),
        total: 1500.00,
        message: 'Mock estimate generated'
      },
      '/api/clients': [
        { id: '1', name: 'Cliente Mock', email: 'mock@example.com' }
      ],
      '/api/materials': [
        { id: '1', name: 'Material Mock', price: 25.99, unit: 'pieza' }
      ]
    };
    
    return mockResponses[endpoint] || { success: true, mock: true, message: 'Mock response' };
  }

  /**
   * Verificar si tiene fallback
   */
  private hasFallbackEndpoint(endpoint: string): boolean {
    const fallbacks: Record<string, string> = {
      '/api/estimates': '/api/mervin/estimate'
    };
    
    return !!fallbacks[endpoint];
  }

  /**
   * Obtener fallback endpoint
   */
  private getFallbackEndpoint(endpoint: string): string | null {
    const fallbacks: Record<string, string> = {
      '/api/estimates': '/api/mervin/estimate'
    };
    
    return fallbacks[endpoint] || null;
  }

  /**
   * Verificar si es endpoint crítico
   */
  private isCriticalEndpoint(endpoint: string): boolean {
    const criticalEndpoints = [
      '/api/legal-defense',
      '/api/dual-signature',
      '/api/generate-pdf'
    ];
    
    return criticalEndpoints.includes(endpoint);
  }

  /**
   * Obtener endpoints por funcionalidad
   */
  private getEndpointsByFunctionality(functionality: string): string[] {
    const functionalityMap: Record<string, string[]> = {
      estimates: ['/api/estimates', '/api/mervin/estimate'],
      contracts: ['/api/legal-defense', '/api/dual-signature'],
      permits: ['/api/permit-advisor', '/api/property-verification'],
      clients: ['/api/clients'],
      materials: ['/api/materials']
    };
    
    return functionalityMap[functionality] || [];
  }
}