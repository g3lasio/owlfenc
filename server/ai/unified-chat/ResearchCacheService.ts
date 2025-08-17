/**
 * RESEARCH CACHE SERVICE - CACHÉ INTELIGENTE PARA INVESTIGACIÓN
 * 
 * Sistema de caché optimizado para contratistas que evita búsquedas repetidas
 * y acelera dramáticamente la obtención de información relevante.
 * 
 * CARACTERÍSTICAS:
 * - Caché específico por tema y ubicación
 * - Expiración inteligente basada en tipo de información  
 * - Compresión de datos para memoria eficiente
 * - Invalidación automática para datos críticos
 */

interface CachedResearchData {
  query: string;
  topic: string;
  location?: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalQueries: number;
  averageResponseTime: number;
  cacheSize: number;
}

export class ResearchCacheService {
  private cache = new Map<string, CachedResearchData>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalQueries: 0,
    averageResponseTime: 0,
    cacheSize: 0
  };

  // Tiempos de expiración por tipo de información (en milisegundos)
  private readonly EXPIRATION_TIMES = {
    prices: 2 * 60 * 60 * 1000,        // 2 horas - precios cambian frecuentemente
    regulations: 24 * 60 * 60 * 1000,   // 24 horas - regulaciones más estables
    materials: 4 * 60 * 60 * 1000,      // 4 horas - disponibilidad de materiales
    permits: 12 * 60 * 60 * 1000,       // 12 horas - información de permisos
    general: 6 * 60 * 60 * 1000,        // 6 horas - información general
    trends: 48 * 60 * 60 * 1000         // 48 horas - tendencias de mercado
  };

  constructor() {
    console.log('💾 [RESEARCH-CACHE] Servicio de caché inicializado');
    
    // Limpieza automática cada hora
    setInterval(() => {
      this.cleanExpiredEntries();
    }, 60 * 60 * 1000);
  }

  /**
   * Genera clave única para la consulta de investigación
   */
  private generateCacheKey(query: string, topic: string, location?: string): string {
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, '-');
    const normalizedTopic = topic.toLowerCase().trim();
    const locationPart = location ? `-${location.toLowerCase().replace(/\s+/g, '-')}` : '';
    
    return `research-${normalizedTopic}-${normalizedQuery}${locationPart}`;
  }

  /**
   * Determina el tiempo de expiración basado en el tipo de consulta
   */
  private getExpirationTime(query: string, topic: string): number {
    const now = Date.now();
    
    // Análisis de la consulta para determinar tipo de información
    const lowerQuery = query.toLowerCase();
    const lowerTopic = topic.toLowerCase();
    
    if (lowerQuery.includes('precio') || lowerQuery.includes('cost') || lowerQuery.includes('price')) {
      return now + this.EXPIRATION_TIMES.prices;
    }
    
    if (lowerQuery.includes('regulaci') || lowerQuery.includes('código') || lowerQuery.includes('regulation')) {
      return now + this.EXPIRATION_TIMES.regulations;
    }
    
    if (lowerQuery.includes('material') || lowerQuery.includes('suministro') || lowerQuery.includes('supply')) {
      return now + this.EXPIRATION_TIMES.materials;
    }
    
    if (lowerQuery.includes('permit') || lowerQuery.includes('permiso') || lowerTopic.includes('permit')) {
      return now + this.EXPIRATION_TIMES.permits;
    }
    
    if (lowerQuery.includes('tendencia') || lowerQuery.includes('trend') || lowerQuery.includes('mercado')) {
      return now + this.EXPIRATION_TIMES.trends;
    }
    
    return now + this.EXPIRATION_TIMES.general;
  }

  /**
   * Busca datos en caché
   */
  async get(query: string, topic: string, location?: string): Promise<any | null> {
    const startTime = Date.now();
    this.stats.totalQueries++;
    
    const cacheKey = this.generateCacheKey(query, topic, location);
    const cachedData = this.cache.get(cacheKey);
    
    if (!cachedData) {
      this.stats.misses++;
      console.log(`💾 [RESEARCH-CACHE] MISS - ${cacheKey}`);
      return null;
    }
    
    // Verificar si ha expirado
    if (Date.now() > cachedData.expiresAt) {
      this.cache.delete(cacheKey);
      this.stats.misses++;
      console.log(`💾 [RESEARCH-CACHE] EXPIRED - ${cacheKey}`);
      return null;
    }
    
    // Actualizar estadísticas de acceso
    cachedData.accessCount++;
    cachedData.lastAccessed = Date.now();
    
    this.stats.hits++;
    const responseTime = Date.now() - startTime;
    this.updateAverageResponseTime(responseTime);
    
    console.log(`✅ [RESEARCH-CACHE] HIT - ${cacheKey} (usado ${cachedData.accessCount} veces)`);
    return cachedData.data;
  }

  /**
   * Almacena datos en caché
   */
  async set(query: string, topic: string, data: any, location?: string): Promise<void> {
    const cacheKey = this.generateCacheKey(query, topic, location);
    const now = Date.now();
    const expiresAt = this.getExpirationTime(query, topic);
    
    const cacheEntry: CachedResearchData = {
      query,
      topic,
      location,
      data,
      timestamp: now,
      expiresAt,
      accessCount: 0,
      lastAccessed: now
    };
    
    this.cache.set(cacheKey, cacheEntry);
    this.stats.cacheSize = this.cache.size;
    
    const expirationMinutes = Math.round((expiresAt - now) / (1000 * 60));
    console.log(`💾 [RESEARCH-CACHE] STORED - ${cacheKey} (expira en ${expirationMinutes} min)`);
  }

  /**
   * Invalidar caché por tema o patrón
   */
  async invalidate(pattern: string): Promise<number> {
    let deletedCount = 0;
    const keysToDelete: string[] = [];
    
    this.cache.forEach((data, key) => {
      if (key.includes(pattern.toLowerCase()) || 
          data.topic.toLowerCase().includes(pattern.toLowerCase()) ||
          data.query.toLowerCase().includes(pattern.toLowerCase())) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      deletedCount++;
    });
    
    this.stats.cacheSize = this.cache.size;
    console.log(`🗑️ [RESEARCH-CACHE] INVALIDATED ${deletedCount} entradas con patrón: ${pattern}`);
    
    return deletedCount;
  }

  /**
   * Limpia entradas expiradas automáticamente
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    const keysToDelete: string[] = [];
    this.cache.forEach((data, key) => {
      if (now > data.expiresAt) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      cleanedCount++;
    });
    
    if (cleanedCount > 0) {
      this.stats.cacheSize = this.cache.size;
      console.log(`🧹 [RESEARCH-CACHE] LIMPIEZA: ${cleanedCount} entradas expiradas eliminadas`);
    }
  }

  /**
   * Actualiza tiempo promedio de respuesta
   */
  private updateAverageResponseTime(responseTime: number): void {
    if (this.stats.averageResponseTime === 0) {
      this.stats.averageResponseTime = responseTime;
    } else {
      this.stats.averageResponseTime = (this.stats.averageResponseTime + responseTime) / 2;
    }
  }

  /**
   * Obtiene estadísticas del caché para contratistas
   */
  getStats(): CacheStats & { hitRate: number; efficiency: string } {
    const hitRate = this.stats.totalQueries > 0 
      ? (this.stats.hits / this.stats.totalQueries) * 100 
      : 0;
    
    let efficiency = 'Excelente';
    if (hitRate < 30) efficiency = 'Necesita optimización';
    else if (hitRate < 50) efficiency = 'Buena';
    else if (hitRate < 70) efficiency = 'Muy buena';
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate),
      efficiency
    };
  }

  /**
   * Obtiene entradas más populares (para análisis de patrones)
   */
  getPopularQueries(limit: number = 10): Array<{query: string, topic: string, accessCount: number}> {
    const entries = Array.from(this.cache.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit)
      .map(entry => ({
        query: entry.query,
        topic: entry.topic,
        accessCount: entry.accessCount
      }));
    
    return entries;
  }

  /**
   * Precargar consultas comunes para contratistas
   */
  async preloadCommonQueries(): Promise<void> {
    console.log('🚀 [RESEARCH-CACHE] Precargando consultas comunes para contratistas...');
    
    // Estas serían precargadas con datos reales en producción
    const commonQueries = [
      { query: 'precios de cercas de vinyl', topic: 'fencing', location: 'california' },
      { query: 'códigos de construcción residencial', topic: 'permits', location: 'california' },
      { query: 'materiales de construcción disponibles', topic: 'materials', location: 'california' },
      { query: 'regulaciones de altura de cercas', topic: 'regulations', location: 'california' }
    ];
    
    // En producción, aquí harías las consultas reales para precargar
    for (const query of commonQueries) {
      const cacheKey = this.generateCacheKey(query.query, query.topic, query.location);
      if (!this.cache.has(cacheKey)) {
        console.log(`📋 [RESEARCH-CACHE] Marcando para precarga: ${cacheKey}`);
      }
    }
  }
}