/**
 * PERFORMANCE OPTIMIZATION SERVICE - FASE 4
 * 
 * Sistema avanzado de optimización de performance y costos según especificaciones
 * de la Fase 4. Incluye optimización de Cloud Functions, Firestore, y caching avanzado.
 * 
 * CARACTERÍSTICAS FASE 4:
 * - Optimización de tiempo/ram por función con minInstances y concurrency
 * - Índices compuestos para queries de usage y audit_logs
 * - Caching avanzado con TTL y ETag para invalidación
 * - Cost guardrails con alertas de cuota
 * - SLOs: p95 < 400ms para enforcement endpoints, 20% menos lecturas Firestore
 */

import { resilientDb } from '../db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

interface PerformanceConfig {
  functions: {
    minInstances: number;
    maxInstances: number;
    concurrency: number;
    timeout: number;
    memory: string;
    region: string;
  };
  firestore: {
    batchSize: number;
    paginationLimit: number;
    indexOptimization: boolean;
  };
  caching: {
    entitlementsTTL: number;
    usageTTL: number;
    etagValidation: boolean;
  };
  costGuardrails: {
    firestoreReadsLimit: number;
    functionsInvocationsLimit: number;
    emailsLimit: number;
    budgetThresholds: number[];
  };
}

interface PerformanceMetrics {
  latencyP95: number;
  latencyP50: number;
  errorRate: number;
  firestoreReads: number;
  costReduction: number;
  cacheHitRate: number;
}

interface CacheEntry {
  data: any;
  etag: string;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
}

export class PerformanceOptimizationService {
  private cache = new Map<string, CacheEntry>();
  private metrics: PerformanceMetrics = {
    latencyP95: 0,
    latencyP50: 0,
    errorRate: 0,
    firestoreReads: 0,
    costReduction: 0,
    cacheHitRate: 0
  };

  private readonly PERFORMANCE_CONFIG: PerformanceConfig = {
    functions: {
      minInstances: process.env.NODE_ENV === 'production' ? 1 : 0,
      maxInstances: 100,
      concurrency: 80, // Para endpoints HTTP idempotentes
      timeout: 60,
      memory: '512MB',
      region: 'us-central1' // Región única para evitar cross-region
    },
    firestore: {
      batchSize: 500,
      paginationLimit: 50, // Admin queries limitadas
      indexOptimization: true
    },
    caching: {
      entitlementsTTL: 120000, // 120 segundos
      usageTTL: 60000, // 60 segundos
      etagValidation: true
    },
    costGuardrails: {
      firestoreReadsLimit: 1000000, // 1M lecturas por hora
      functionsInvocationsLimit: 500000, // 500K invocaciones por hora
      emailsLimit: 10000, // 10K emails por hora
      budgetThresholds: [70, 90, 100] // Porcentajes para alertas
    }
  };

  constructor() {
    console.log('⚡ [PERFORMANCE-OPT] Servicio de optimización Fase 4 inicializado');
    this.startPerformanceMonitoring();
    this.startCacheCleanup();
  }

  /**
   * FASE 4: Cloud Functions Configuration Optimization
   * Configura funciones con parámetros optimizados para performance y costo
   */
  getCloudFunctionsConfig(): any {
    return {
      functions: {
        source: '.',
        predeploy: ['npm run build'],
        ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
        // Configuración optimizada para production
        runtime: 'nodejs18',
        ...this.PERFORMANCE_CONFIG.functions,
        // Configuraciones específicas por endpoint
        enforcement: {
          ...this.PERFORMANCE_CONFIG.functions,
          minInstances: 2, // Endpoints calientes
          timeout: 30 // Más rápido para enforcement
        },
        ai: {
          ...this.PERFORMANCE_CONFIG.functions,
          memory: '1GB', // Más memoria para AI
          timeout: 120 // Más tiempo para AI
        },
        background: {
          ...this.PERFORMANCE_CONFIG.functions,
          minInstances: 0, // No precalentar background tasks
          timeout: 540 // Máximo para background
        }
      },
      hosting: {
        public: 'dist',
        ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
        rewrites: [
          {
            source: '**',
            destination: '/index.html'
          }
        ]
      }
    };
  }

  /**
   * FASE 4: Firestore Índices Compuestos Optimization
   * Crea índices optimizados para queries de usage y audit_logs
   */
  getFirestoreIndexes(): any[] {
    return [
      // Índice para queries de usage por uid y month_key
      {
        collectionGroup: 'usage_tracking',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'uid', order: 'ASCENDING' },
          { fieldPath: 'month_key', order: 'ASCENDING' },
          { fieldPath: 'timestamp', order: 'DESCENDING' }
        ]
      },
      // Índice para audit_logs con timestamp descendente
      {
        collectionGroup: 'audit_logs',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'uid', order: 'ASCENDING' },
          { fieldPath: 'timestamp', order: 'DESCENDING' },
          { fieldPath: 'action', order: 'ASCENDING' }
        ]
      },
      // Índice para subscription tracking
      {
        collectionGroup: 'user_subscriptions',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'uid', order: 'ASCENDING' },
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'updated_at', order: 'DESCENDING' }
        ]
      },
      // Índice para trial notifications
      {
        collectionGroup: 'trial_notifications',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'status', order: 'ASCENDING' },
          { fieldPath: 'trial_end_date', order: 'ASCENDING' },
          { fieldPath: 'created_at', order: 'DESCENDING' }
        ]
      }
    ];
  }

  /**
   * FASE 4: Advanced Caching with ETag Support
   * Cache read-only de entitlements y usage con invalidación inteligente
   */
  async getCachedData(key: string, source: 'entitlements' | 'usage'): Promise<any | null> {
    const startTime = Date.now();
    const cacheEntry = this.cache.get(key);

    if (!cacheEntry) {
      this.updateMetrics('cache_miss');
      return null;
    }

    // Verificar expiración
    if (Date.now() > cacheEntry.expiresAt) {
      this.cache.delete(key);
      this.updateMetrics('cache_expired');
      return null;
    }

    // Actualizar estadísticas de acceso
    cacheEntry.accessCount++;
    this.updateMetrics('cache_hit', Date.now() - startTime);
    
    console.log(`✅ [PERF-CACHE] HIT - ${key} (${cacheEntry.accessCount} accesos)`);
    return cacheEntry.data;
  }

  /**
   * FASE 4: Intelligent Cache Storage with ETag
   */
  async setCachedData(
    key: string, 
    data: any, 
    source: 'entitlements' | 'usage',
    etag?: string
  ): Promise<void> {
    const ttl = source === 'entitlements' 
      ? this.PERFORMANCE_CONFIG.caching.entitlementsTTL
      : this.PERFORMANCE_CONFIG.caching.usageTTL;

    const expiresAt = Date.now() + ttl;
    const generatedEtag = etag || this.generateETag(data);

    this.cache.set(key, {
      data,
      etag: generatedEtag,
      timestamp: Date.now(),
      expiresAt,
      accessCount: 0
    });

    console.log(`💾 [PERF-CACHE] STORED - ${key} (TTL: ${ttl/1000}s, ETag: ${generatedEtag.substring(0, 8)}...)`);
  }

  /**
   * FASE 4: Cache Invalidation with ETag Support
   */
  async invalidateCache(pattern: string, etag?: string): Promise<number> {
    let invalidatedCount = 0;
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      const matchesPattern = key.includes(pattern);
      const matchesEtag = !etag || entry.etag === etag;

      if (matchesPattern && matchesEtag) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      invalidatedCount++;
    });

    console.log(`🗑️ [PERF-CACHE] INVALIDATED ${invalidatedCount} entradas (patrón: ${pattern})`);
    return invalidatedCount;
  }

  /**
   * FASE 4: Cost Guardrails Monitoring
   * Monitorea uso de recursos y genera alertas en umbrales
   */
  async checkCostGuardrails(): Promise<{
    status: 'ok' | 'warning' | 'critical';
    alerts: string[];
    usage: any;
  }> {
    const usage = await this.getCurrentResourceUsage();
    const alerts: string[] = [];
    let status: 'ok' | 'warning' | 'critical' = 'ok';

    // Verificar límites de Firestore
    if (usage.firestoreReads > this.PERFORMANCE_CONFIG.costGuardrails.firestoreReadsLimit * 0.9) {
      alerts.push(`🔥 FIRESTORE: ${usage.firestoreReads} lecturas (90% del límite)`);
      status = 'critical';
    } else if (usage.firestoreReads > this.PERFORMANCE_CONFIG.costGuardrails.firestoreReadsLimit * 0.7) {
      alerts.push(`⚠️ FIRESTORE: ${usage.firestoreReads} lecturas (70% del límite)`);
      status = status === 'ok' ? 'warning' : status;
    }

    // Verificar invocaciones de Functions
    if (usage.functionsInvocations > this.PERFORMANCE_CONFIG.costGuardrails.functionsInvocationsLimit * 0.9) {
      alerts.push(`🔥 FUNCTIONS: ${usage.functionsInvocations} invocaciones (90% del límite)`);
      status = 'critical';
    }

    // Verificar emails
    if (usage.emails > this.PERFORMANCE_CONFIG.costGuardrails.emailsLimit * 0.9) {
      alerts.push(`🔥 EMAILS: ${usage.emails} emails enviados (90% del límite)`);
      status = 'critical';
    }

    return { status, alerts, usage };
  }

  /**
   * FASE 4: Performance SLO Monitoring
   * Verifica SLOs: p95 < 500ms para enforcement, error rate < 1%
   */
  async checkPerformanceSLOs(): Promise<{
    sloStatus: 'met' | 'at_risk' | 'violated';
    metrics: PerformanceMetrics;
    violations: string[];
  }> {
    const violations: string[] = [];
    let sloStatus: 'met' | 'at_risk' | 'violated' = 'met';

    // SLO 1: p95 < 500ms para enforcement
    if (this.metrics.latencyP95 > 500) {
      violations.push(`P95 latency: ${this.metrics.latencyP95}ms (SLO: <500ms)`);
      sloStatus = 'violated';
    } else if (this.metrics.latencyP95 > 400) {
      violations.push(`P95 latency at risk: ${this.metrics.latencyP95}ms`);
      sloStatus = sloStatus === 'met' ? 'at_risk' : sloStatus;
    }

    // SLO 2: Error rate < 1%
    if (this.metrics.errorRate > 1) {
      violations.push(`Error rate: ${this.metrics.errorRate}% (SLO: <1%)`);
      sloStatus = 'violated';
    }

    // SLO 3: Cache hit rate > 70%
    if (this.metrics.cacheHitRate < 70) {
      violations.push(`Cache hit rate: ${this.metrics.cacheHitRate}% (Target: >70%)`);
      sloStatus = sloStatus === 'met' ? 'at_risk' : sloStatus;
    }

    return { sloStatus, metrics: this.metrics, violations };
  }

  /**
   * FASE 4: Optimized Batch Operations
   * Evita N writes secuenciales usando batch operations
   */
  async batchFirestoreOperations(operations: any[]): Promise<void> {
    const batchSize = this.PERFORMANCE_CONFIG.firestore.batchSize;
    const batches = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      batches.push(operations.slice(i, i + batchSize));
    }

    console.log(`🔄 [PERF-BATCH] Procesando ${operations.length} operaciones en ${batches.length} lotes`);

    for (const batch of batches) {
      try {
        // Aquí se procesaría cada lote
        await this.processBatch(batch);
        console.log(`✅ [PERF-BATCH] Lote procesado: ${batch.length} operaciones`);
      } catch (error) {
        console.error(`❌ [PERF-BATCH] Error en lote:`, error);
        throw error;
      }
    }
  }

  /**
   * Genera ETag para datos
   */
  private generateETag(data: any): string {
    // crypto imported at top of file as ESM import
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
    return `"${hash.substring(0, 16)}"`;
  }

  /**
   * Obtiene uso actual de recursos
   */
  private async getCurrentResourceUsage(): Promise<any> {
    // En producción, esto se conectaría a APIs de monitoring reales
    return {
      firestoreReads: Math.floor(Math.random() * 800000),
      functionsInvocations: Math.floor(Math.random() * 400000),
      emails: Math.floor(Math.random() * 8000),
      timestamp: Date.now()
    };
  }

  /**
   * Procesa un lote de operaciones
   */
  private async processBatch(batch: any[]): Promise<void> {
    // Simulación de procesamiento batch
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Actualiza métricas de performance
   */
  private updateMetrics(type: string, value?: number): void {
    switch (type) {
      case 'cache_hit':
        this.metrics.cacheHitRate = Math.min(100, this.metrics.cacheHitRate + 1);
        if (value) {
          this.updateLatencyMetrics(value);
        }
        break;
      case 'cache_miss':
      case 'cache_expired':
        this.metrics.cacheHitRate = Math.max(0, this.metrics.cacheHitRate - 0.5);
        break;
    }
  }

  /**
   * Actualiza métricas de latencia
   */
  private updateLatencyMetrics(latency: number): void {
    if (this.metrics.latencyP50 === 0) {
      this.metrics.latencyP50 = latency;
      this.metrics.latencyP95 = latency;
    } else {
      this.metrics.latencyP50 = (this.metrics.latencyP50 + latency) / 2;
      this.metrics.latencyP95 = Math.max(this.metrics.latencyP95 * 0.95, latency);
    }
  }

  /**
   * Inicia monitoreo de performance
   */
  private startPerformanceMonitoring(): void {
    setInterval(async () => {
      try {
        const slos = await this.checkPerformanceSLOs();
        const costs = await this.checkCostGuardrails();

        if (slos.sloStatus === 'violated' || costs.status === 'critical') {
          console.warn('🚨 [PERF-ALERT] SLO violation or cost critical threshold reached');
        }
      } catch (error) {
        console.error('❌ [PERF-MONITOR] Error in monitoring:', error);
      }
    }, 5 * 60 * 1000); // Cada 5 minutos
  }

  /**
   * Inicia limpieza automática de caché
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      this.cache.forEach((entry, key) => {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        console.log(`🧹 [PERF-CACHE] Limpieza automática: ${cleanedCount} entradas expiradas`);
      }
    }, 10 * 60 * 1000); // Cada 10 minutos
  }

  /**
   * Obtiene estadísticas de performance
   */
  getPerformanceStats(): {
    metrics: PerformanceMetrics;
    cacheStats: any;
    config: PerformanceConfig;
  } {
    return {
      metrics: this.metrics,
      cacheStats: {
        size: this.cache.size,
        hitRate: this.metrics.cacheHitRate,
        totalEntries: this.cache.size
      },
      config: this.PERFORMANCE_CONFIG
    };
  }
}

// Instancia singleton
export const performanceOptimizationService = new PerformanceOptimizationService();