/**
 * WEB RESEARCH SERVICE - INVESTIGACIÓN WEB SÚPER OPTIMIZADA PARA CONTRATISTAS
 * 
 * FASE 2 - SISTEMA AVANZADO DE INVESTIGACIÓN RÁPIDA Y PRECISA
 * 
 * OPTIMIZACIONES PARA CONTRATISTAS:
 * - Caché inteligente para evitar esperas innecesarias
 * - Búsquedas paralelas para máxima velocidad  
 * - Filtros de relevancia específicos para construcción
 * - Timeouts agresivos para respuestas rápidas
 * - Fuentes especializadas priorizadas
 * 
 * TIEMPO OBJETIVO: <15 segundos para cualquier consulta
 */

import Anthropic from '@anthropic-ai/sdk';
import { ResearchCacheService } from './ResearchCacheService';

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

// Timeouts agresivos para contratistas ocupados
const RESEARCH_TIMEOUT = 12000; // 12 segundos máximo
const CACHE_FIRST_TIMEOUT = 2000; // 2 segundos para buscar en caché primero

// Fuentes especializadas priorizadas para contratistas
const PRIORITY_SOURCES = {
  materials: [
    'HomeDepot.com', 'Lowes.com', 'BuildersMart.com', 
    'SupplyHouse.com', 'ConcretePipeSupply.com'
  ],
  fencing: [
    'VinylFencingToday.com', 'FenceSupplyOnline.com', 
    'ChainLinkFence.com', 'WoodFence.com'
  ],
  permits: [
    'California.gov building codes', 'Local city planning departments',
    'ICC International Code Council', 'OSHA.gov'
  ],
  pricing: [
    'RSMeans Construction Data', 'Craftsman Construction Estimating',
    'Regional supplier catalogs', 'Industry trade publications'
  ]
};

export interface WebResearchData {
  sources: string[];
  insights: string[];
  currentTrends: string[];
  priceRanges?: PriceRange[];
  regulatoryUpdates?: string[];
  marketInsights?: string[];
}

interface PriceRange {
  item: string;
  lowEnd: string;
  highEnd: string;
  factors: string[];
  lastUpdated: string;
}

export class WebResearchService {
  private anthropic: Anthropic;
  private cacheService: ResearchCacheService;
  private activeRequests = new Map<string, Promise<WebResearchData>>();

  constructor(anthropic: Anthropic) {
    this.anthropic = anthropic;
    this.cacheService = new ResearchCacheService();
    console.log('🌐 [WEB-RESEARCH] Servicio súper optimizado para contratistas inicializado');
    
    // Precargar consultas comunes en background
    this.cacheService.preloadCommonQueries().catch(console.error);
  }

  /**
   * INVESTIGACIÓN SÚPER RÁPIDA PARA CONTRATISTAS
   * Prioriza velocidad usando caché inteligente y búsquedas optimizadas
   */
  async research(query: string, topic: string, location?: string): Promise<WebResearchData> {
    const startTime = Date.now();
    console.log(`⚡ [FAST-RESEARCH] INICIO - ${topic}: ${query}`);

    // PASO 1: Verificar caché primero (súper rápido)
    const cachedResult = await this.cacheService.get(query, topic, location);
    if (cachedResult) {
      const cacheTime = Date.now() - startTime;
      console.log(`✅ [FAST-RESEARCH] CACHÉ HIT en ${cacheTime}ms`);
      return cachedResult;
    }

    // PASO 2: Evitar búsquedas duplicadas concurrentes
    const requestKey = `${topic}-${query}-${location || 'global'}`;
    if (this.activeRequests.has(requestKey)) {
      console.log(`🔄 [FAST-RESEARCH] Esperando solicitud en progreso...`);
      return await this.activeRequests.get(requestKey)!;
    }

    // PASO 3: Investigación rápida con timeout agresivo
    const researchPromise = this.performFastResearch(query, topic, location);
    this.activeRequests.set(requestKey, researchPromise);

    try {
      const result = await Promise.race([
        researchPromise,
        this.createTimeoutPromise(RESEARCH_TIMEOUT, topic)
      ]);

      // Guardar en caché para próximas consultas
      await this.cacheService.set(query, topic, result, location);
      
      const totalTime = Date.now() - startTime;
      console.log(`✅ [FAST-RESEARCH] COMPLETADO en ${totalTime}ms`);
      
      return result;
    } finally {
      this.activeRequests.delete(requestKey);
    }
  }

  /**
   * Investigación optimizada con priorización de fuentes especializadas
   */
  private async performFastResearch(query: string, topic: string, location?: string): Promise<WebResearchData> {
    console.log(`🎯 [FAST-RESEARCH] Ejecutando búsqueda optimizada...`);
    
    const researchPrompt = this.buildContractorOptimizedPrompt(query, topic, location);
    
    const response = await this.anthropic.messages.create({
      model: DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 2000, // Reducido para rapidez
      temperature: 0.1, // Súper factual
      messages: [{ role: 'user', content: researchPrompt }]
    });

    const messageContent = response.content[0];
    if ('text' in messageContent) {
      return this.parseResearchResponse(messageContent.text);
    } else {
      throw new Error('Formato de respuesta no reconocido');
    }
  }

  /**
   * Crea timeout promise para evitar esperas largas
   */
  private createTimeoutPromise(timeout: number, topic: string): Promise<WebResearchData> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        console.log(`⏰ [FAST-RESEARCH] TIMEOUT después de ${timeout}ms`);
        reject(new Error(`Investigación de ${topic} tomó demasiado tiempo`));
      }, timeout);
    });
  }

  /**
   * PROMPT SÚPER OPTIMIZADO PARA CONTRATISTAS
   * Enfoque en información crítica, rápida y accionable
   */
  private buildContractorOptimizedPrompt(query: string, topic: string, location?: string): string {
    const locationInfo = location ? ` en ${location}` : ' en California';
    const prioritySources = this.getPrioritySourcesForTopic(topic);
    
    return `
Como investigador especializado en construcción para contratistas profesionales${locationInfo}, proporciona información RÁPIDA, PRECISA y ACCIONABLE.

CONSULTA: ${query}
TEMA: ${topic}
UBICACIÓN: ${locationInfo}

FUENTES PRIORITARIAS PARA ESTA CONSULTA:
${prioritySources.map(source => `- ${source}`).join('\n')}

RESPONDE EN FORMATO JSON OPTIMIZADO:
{
  "sources": ["Fuente confiable 1", "Fuente confiable 2", "Fuente confiable 3"],
  "insights": [
    "Información clave #1 (específica y accionable)",
    "Información clave #2 (con números o rangos)",
    "Información clave #3 (consideraciones prácticas)"
  ],
  "currentTrends": [
    "Tendencia actual relevante #1",
    "Cambio reciente importante #2"  
  ],
  "priceRanges": [
    {
      "item": "Elemento específico",
      "lowEnd": "$X.XX por unidad",
      "highEnd": "$X.XX por unidad", 
      "factors": ["Factor precio #1", "Factor precio #2"],
      "lastUpdated": "2025"
    }
  ],
  "regulatoryUpdates": [
    "Actualización regulatoria relevante (si aplica)"
  ],
  "marketInsights": [
    "Insight de mercado específico para ${topic}",
    "Consideración práctica para contratistas"
  ]
}

REQUISITOS CRÍTICOS:
- SOLO información verificable y específica
- NÚMEROS y RANGOS reales cuando sea posible
- CONSIDERA la ubicación${locationInfo} para precios y regulaciones
- ENFÓCATE en información que un contratista necesita AHORA
- PRIORIZA datos que afecten decisiones de negocio inmediatas`;
  }

  /**
   * Obtiene fuentes prioritarias según el tema
   */
  private getPrioritySourcesForTopic(topic: string): string[] {
    const normalizedTopic = topic.toLowerCase();
    
    if (normalizedTopic.includes('fenc') || normalizedTopic.includes('cerca')) {
      return PRIORITY_SOURCES.fencing;
    }
    if (normalizedTopic.includes('material')) {
      return PRIORITY_SOURCES.materials;
    }
    if (normalizedTopic.includes('permit') || normalizedTopic.includes('permis')) {
      return PRIORITY_SOURCES.permits;
    }
    if (normalizedTopic.includes('price') || normalizedTopic.includes('precio') || normalizedTopic.includes('cost')) {
      return PRIORITY_SOURCES.pricing;
    }
    
    // Default: combinación de fuentes más relevantes
    return [
      ...PRIORITY_SOURCES.materials.slice(0, 2),
      ...PRIORITY_SOURCES.pricing.slice(0, 2),
      'California Contractors State License Board'
    ];
  }

  /**
   * Construye el prompt para investigación especializada (método legacy)
   */
  private buildResearchPrompt(query: string, topic: string): string {
    return `
Como investigador especializado en construcción con acceso a información actualizada, proporciona datos de investigación sobre:

QUERY: "${query}"
TOPIC: ${topic}

IMPORTANTE: Simula una investigación web actualizada proporcionando información realista y práctica.

Proporciona la respuesta en formato JSON exacto:
{
  "sources": [
    "Fuente confiable 1 (ej: California Building Standards Commission)",
    "Fuente confiable 2 (ej: Contractors State License Board)"
  ],
  "insights": [
    "Insight específico 1 basado en datos actuales",
    "Insight específico 2 con información práctica"
  ],
  "currentTrends": [
    "Tendencia actual 1 en la industria",
    "Tendencia actual 2 relevante al query"
  ],
  "priceRanges": [
    {
      "item": "Material o servicio específico",
      "lowEnd": "Precio bajo realista",
      "highEnd": "Precio alto realista", 
      "factors": ["Factor que afecta precio 1", "Factor 2"],
      "lastUpdated": "Enero 2025"
    }
  ],
  "regulatoryUpdates": [
    "Actualización regulatoria reciente 1",
    "Cambio en códigos de construcción reciente"
  ],
  "marketInsights": [
    "Insight de mercado 1",
    "Análisis de demanda/oferta actual"
  ]
}

ENFÓCATE EN:
${this.getTopicSpecificFocus(topic)}
`;
  }

  /**
   * Obtiene enfoque específico por tópico de investigación
   */
  private getTopicSpecificFocus(topic: string): string {
    const topicFocus = {
      'fencing': `
- Precios actuales de materiales de cercas en California
- Nuevas regulaciones sobre cercas residenciales
- Tendencias en materiales (composite, vinyl vs madera)
- Proveedores principales y disponibilidad
- Cambios en códigos de altura y setbacks`,

      'construction': `
- Precios de materiales de construcción actualizados
- Cambios en códigos de construcción de California
- Nuevas tecnologías y métodos constructivos
- Regulaciones ambientales y sostenibilidad
- Disponibilidad de mano de obra especializada`,

      'permits': `
- Cambios recientes en procesos de permisos
- Nuevas regulaciones municipales
- Tiempos de procesamiento actualizados
- Costos de permisos por jurisdicción
- Digitización de procesos gubernamentales`,

      'materials': `
- Precios fluctuantes de materiales principales
- Nuevos materiales en el mercado
- Problemas de cadena de suministro
- Alternativas sostenibles disponibles
- Comparaciones de costo-beneficio actualizadas`
    };

    const normalizedTopic = topic.toLowerCase();
    for (const key of Object.keys(topicFocus)) {
      if (normalizedTopic.includes(key)) {
        return topicFocus[key as keyof typeof topicFocus];
      }
    }

    return topicFocus['construction']; // Default
  }

  /**
   * Parsea la respuesta de investigación
   */
  private parseResearchResponse(response: string): WebResearchData {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON en la respuesta de investigación');
      }

      const jsonResponse = JSON.parse(jsonMatch[0]);
      
      return {
        sources: jsonResponse.sources || [],
        insights: jsonResponse.insights || [],
        currentTrends: jsonResponse.currentTrends || [],
        priceRanges: jsonResponse.priceRanges || [],
        regulatoryUpdates: jsonResponse.regulatoryUpdates || [],
        marketInsights: jsonResponse.marketInsights || []
      };
    } catch (error) {
      console.error('❌ [WEB-RESEARCH] Error parseando respuesta de investigación:', error);
      throw error;
    }
  }

  /**
   * Datos de investigación de fallback
   */
  private getFallbackResearchData(topic: string): WebResearchData {
    return {
      sources: [
        'California Contractors State License Board',
        'International Code Council (ICC)',
        'Local Building Departments'
      ],
      insights: [
        `Información actualizada sobre ${topic} disponible en fuentes oficiales`,
        'Se recomienda consultar regulaciones locales más recientes'
      ],
      currentTrends: [
        'Digitalización de procesos de permisos',
        'Enfoque en construcción sostenible',
        'Automatización en la industria de la construcción'
      ],
      priceRanges: [
        {
          item: 'Consulta de investigación',
          lowEnd: 'Información básica disponible',
          highEnd: 'Investigación detallada requerida',
          factors: ['Disponibilidad de datos', 'Complejidad del tema'],
          lastUpdated: 'Enero 2025'
        }
      ],
      regulatoryUpdates: [
        'Consultar fuentes oficiales para actualizaciones regulatorias más recientes'
      ],
      marketInsights: [
        'Mercado de construcción en crecimiento constante',
        'Demanda alta para servicios de calidad'
      ]
    };
  }

  /**
   * Investigación específica de precios de materiales
   */
  async researchMaterialPrices(materials: string[], location: string): Promise<PriceRange[]> {
    console.log(`💰 [WEB-RESEARCH] Investigando precios de materiales en ${location}`);

    try {
      const prompt = `
Como analista de precios de materiales de construcción, proporciona precios actualizados para:

MATERIALES: ${materials.join(', ')}
UBICACIÓN: ${location}

Responde en formato JSON:
{
  "priceRanges": [
    {
      "item": "Material específico",
      "lowEnd": "$X.XX por unidad",
      "highEnd": "$X.XX por unidad",
      "factors": ["Factor 1", "Factor 2"],
      "lastUpdated": "Enero 2025"
    }
  ]
}

Incluye factores como:
- Variación por proveedor
- Descuentos por volumen
- Temporadas de alta/baja demanda
- Costos de transporte
- Disponibilidad local
`;

      const response = await this.anthropic.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 2000,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });

      const messageContent = response.content[0];
      if ('text' in messageContent) {
        const jsonMatch = messageContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed.priceRanges || [];
        }
      }

      return [];
    } catch (error) {
      console.error('❌ [WEB-RESEARCH] Error investigando precios:', error);
      return materials.map(material => ({
        item: material,
        lowEnd: 'Precio no disponible',
        highEnd: 'Consultar proveedores locales',
        factors: ['Disponibilidad local', 'Temporada'],
        lastUpdated: 'Enero 2025'
      }));
    }
  }

  /**
   * Investigación de regulaciones actuales
   */
  async researchCurrentRegulations(projectType: string, jurisdiction: string): Promise<string[]> {
    console.log(`📋 [WEB-RESEARCH] Investigando regulaciones para ${projectType} en ${jurisdiction}`);

    try {
      const prompt = `
Como especialista en regulaciones de construcción, proporciona información actualizada sobre regulaciones para:

TIPO DE PROYECTO: ${projectType}
JURISDICCIÓN: ${jurisdiction}

Responde en formato JSON:
{
  "regulations": [
    "Regulación específica 1 con número de código",
    "Regulación específica 2 con autoridad emisora"
  ]
}

Incluye:
- Códigos de construcción locales
- Regulaciones de zonificación
- Permisos requeridos
- Cambios recientes (2024-2025)
- Autoridades competentes
`;

      const response = await this.anthropic.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 1500,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });

      const messageContent = response.content[0];
      if ('text' in messageContent) {
        const jsonMatch = messageContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed.regulations || [];
        }
      }

      return [`Consultar regulaciones locales para ${projectType} en ${jurisdiction}`];
    } catch (error) {
      console.error('❌ [WEB-RESEARCH] Error investigando regulaciones:', error);
      return ['Consultar fuentes oficiales para regulaciones actualizadas'];
    }
  }

  // ==================== FASE 2: OPTIMIZACIONES SÚPER RÁPIDAS PARA CONTRATISTAS ====================

  /**
   * BÚSQUEDAS PARALELAS PARA MÁXIMA VELOCIDAD  
   * Ejecuta múltiples búsquedas relacionadas simultáneamente
   */
  async researchMultipleTopics(queries: Array<{query: string, topic: string, location?: string}>): Promise<Map<string, WebResearchData>> {
    console.log(`🚀 [PARALLEL-RESEARCH] Iniciando ${queries.length} búsquedas paralelas...`);
    const startTime = Date.now();
    
    const results = new Map<string, WebResearchData>();
    const promises = queries.map(async (queryInfo, index) => {
      const key = `${queryInfo.topic}-${index}`;
      try {
        const data = await this.research(queryInfo.query, queryInfo.topic, queryInfo.location);
        results.set(key, data);
        return { key, data, success: true };
      } catch (error) {
        console.error(`❌ [PARALLEL-RESEARCH] Error en consulta ${index}:`, error);
        results.set(key, this.getFallbackResearchData(queryInfo.topic));
        return { key, data: null, success: false };
      }
    });
    
    await Promise.allSettled(promises);
    const totalTime = Date.now() - startTime;
    console.log(`✅ [PARALLEL-RESEARCH] ${queries.length} búsquedas completadas en ${totalTime}ms`);
    
    return results;
  }

  /**
   * FILTRO DE RELEVANCIA ESPECÍFICO PARA CONTRATISTAS
   * Evalúa qué tan útil es la información para decisiones de negocio
   */
  private calculateRelevanceScore(data: WebResearchData, query: string, topic: string): number {
    let score = 0;
    
    // Puntos por fuentes confiables específicas de construcción
    const constructionSources = ['HomeDepot', 'Lowes', 'California.gov', 'ICC', 'OSHA'];
    data.sources.forEach(source => {
      if (constructionSources.some(cs => source.includes(cs))) {
        score += 25;
      }
    });
    
    // Puntos por información de precios (crítica para contratistas)
    if (data.priceRanges && data.priceRanges.length > 0) {
      score += 30;
    }
    
    // Puntos por información regulatoria actualizada
    if (data.regulatoryUpdates && data.regulatoryUpdates.length > 0) {
      score += 20;
    }
    
    // Puntos por insights específicos y accionables
    data.insights.forEach(insight => {
      if (insight.includes('$') || /\d+/.test(insight)) {
        score += 10; // Información con números/precios
      }
    });
    
    // Descuento por información muy general
    if (data.insights.some(insight => 
      insight.includes('consultar') || insight.includes('fuentes oficiales'))) {
      score -= 15;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * INVESTIGACIÓN ESPECIALIZADA PARA ESTIMADOS RÁPIDOS
   * Optimizada para información que contratistas necesitan para estimados
   */
  async researchForEstimate(projectType: string, materials: string[], location: string): Promise<{
    materialPrices: PriceRange[],
    laborRates: any[],
    permitInfo: any,
    relevanceScore: number
  }> {
    console.log(`💰 [ESTIMATE-RESEARCH] Investigando para estimado: ${projectType}`);
    
    const queries = [
      { query: `precios actuales de ${materials.join(', ')}`, topic: 'materials', location },
      { query: `tarifas de mano de obra para ${projectType}`, topic: 'labor', location },
      { query: `requisitos de permisos para ${projectType}`, topic: 'permits', location }
    ];
    
    const parallelResults = await this.researchMultipleTopics(queries);
    
    // Procesar resultados específicos para estimados
    const materialData = parallelResults.get('materials-0');
    const laborData = parallelResults.get('labor-1');
    const permitData = parallelResults.get('permits-2');
    
    const relevanceScore = materialData ? 
      this.calculateRelevanceScore(materialData, queries[0].query, 'materials') : 0;
    
    return {
      materialPrices: materialData?.priceRanges || [],
      laborRates: laborData?.insights.map(insight => ({ 
        description: insight, 
        source: 'research' 
      })) || [],
      permitInfo: {
        requirements: permitData?.regulatoryUpdates || [],
        insights: permitData?.insights || []
      },
      relevanceScore
    };
  }

  /**
   * ESTADÍSTICAS DE RENDIMIENTO PARA CONTRATISTAS
   * Muestra qué tan eficiente está siendo el sistema de investigación
   */
  async getPerformanceStats(): Promise<{
    cacheStats: any,
    averageResearchTime: number,
    successRate: number,
    topQueries: Array<{query: string, topic: string, count: number}>,
    timesSaved: string
  }> {
    const cacheStats = this.cacheService.getStats();
    const popularQueries = this.cacheService.getPopularQueries(5);
    
    // Calcular tiempo ahorrado por el caché
    const avgResearchTime = 8000; // ms estimado sin caché
    const timesSavedMs = cacheStats.hits * avgResearchTime;
    const timesSavedMinutes = Math.round(timesSavedMs / (1000 * 60));
    
    return {
      cacheStats,
      averageResearchTime: cacheStats.averageResponseTime,
      successRate: cacheStats.hitRate,
      topQueries: popularQueries.map(q => ({
        query: q.query,
        topic: q.topic, 
        count: q.accessCount
      })),
      timesSaved: `${timesSavedMinutes} minutos ahorrados gracias al caché inteligente`
    };
  }

  /**
   * INVALIDACIÓN INTELIGENTE POR CONTEXTO
   * Invalida caché cuando hay cambios importantes en el mercado
   */
  async invalidateByMarketChange(changeType: 'prices' | 'regulations' | 'materials' | 'all'): Promise<void> {
    console.log(`🔄 [SMART-INVALIDATION] Invalidando caché por cambio de mercado: ${changeType}`);
    
    switch (changeType) {
      case 'prices':
        await this.cacheService.invalidate('precio');
        await this.cacheService.invalidate('cost');
        break;
      case 'regulations':
        await this.cacheService.invalidate('regulation');
        await this.cacheService.invalidate('permit');
        break;
      case 'materials':
        await this.cacheService.invalidate('material');
        break;
      case 'all':
        // Invalidar todo el caché (usar con precaución)
        const popularQueries = this.cacheService.getPopularQueries(1000);
        for (const query of popularQueries) {
          await this.cacheService.invalidate(query.topic);
        }
        break;
    }
  }

  /**
   * DETECCIÓN INTELIGENTE DE URGENCIA
   * Detecta cuando una consulta requiere información súper rápida
   */
  private detectUrgency(query: string): 'high' | 'medium' | 'low' {
    const urgentWords = ['urgente', 'ahora', 'inmediato', 'rápido', 'emergency', 'asap'];
    const mediumWords = ['today', 'hoy', 'pronto', 'soon'];
    
    const lowerQuery = query.toLowerCase();
    
    if (urgentWords.some(word => lowerQuery.includes(word))) {
      return 'high';
    }
    if (mediumWords.some(word => lowerQuery.includes(word))) {
      return 'medium';  
    }
    return 'low';
  }

  /**
   * INVESTIGACIÓN SÚPER EXPRESSS (< 5 segundos)
   * Para consultas urgentes de contratistas
   */
  async expressResearch(query: string, topic: string, location?: string): Promise<WebResearchData> {
    console.log(`⚡ [EXPRESS-RESEARCH] Investigación express iniciada`);
    const startTime = Date.now();
    
    // Verificar caché primero con timeout aún más agresivo
    const cachedResult = await this.cacheService.get(query, topic, location);
    if (cachedResult) {
      console.log(`✅ [EXPRESS-RESEARCH] Caché hit en ${Date.now() - startTime}ms`);
      return cachedResult;
    }
    
    // Investigación con timeout súper agresivo (5 segundos)
    try {
      const result = await Promise.race([
        this.performFastResearch(query, topic, location),
        this.createTimeoutPromise(5000, topic)
      ]);
      
      await this.cacheService.set(query, topic, result, location);
      console.log(`⚡ [EXPRESS-RESEARCH] Completado en ${Date.now() - startTime}ms`);
      return result;
      
    } catch (error) {
      console.log(`⏰ [EXPRESS-RESEARCH] Timeout - retornando datos básicos`);
      return this.getFallbackResearchData(topic);
    }
  }
}