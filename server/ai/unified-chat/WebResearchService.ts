/**
 * WEB RESEARCH SERVICE - INVESTIGACIÓN WEB INTELIGENTE
 * 
 * Servicio especializado en investigación web usando Anthropic para obtener
 * información actualizada sobre construcción, precios, regulaciones y tendencias.
 * 
 * NOTA: Esta es una simulación de investigación web ya que Anthropic no tiene
 * acceso directo a internet. En producción se integraría con APIs de búsqueda.
 */

import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

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

  constructor(anthropic: Anthropic) {
    this.anthropic = anthropic;
    console.log('🌐 [WEB-RESEARCH] Servicio de investigación web inicializado');
  }

  /**
   * Realiza investigación web sobre un tópico específico
   * NOTA: Simulación - en producción usaría APIs de búsqueda reales
   */
  async research(query: string, topic: string): Promise<WebResearchData> {
    console.log(`🔍 [WEB-RESEARCH] Investigando: ${topic}`);
    console.log(`📝 [WEB-RESEARCH] Query: ${query}`);

    try {
      // En producción, aquí se harían llamadas a APIs de búsqueda reales
      // Por ahora, usamos el conocimiento de Anthropic para simular investigación
      const researchPrompt = this.buildResearchPrompt(query, topic);
      
      const response = await this.anthropic.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 3000,
        temperature: 0.2, // Temperatura baja para información más factual
        messages: [
          { role: 'user', content: researchPrompt }
        ]
      });

      const messageContent = response.content[0];
      if ('text' in messageContent) {
        return this.parseResearchResponse(messageContent.text);
      } else {
        throw new Error('Formato de respuesta no reconocido');
      }
    } catch (error) {
      console.error('❌ [WEB-RESEARCH] Error en investigación:', error);
      return this.getFallbackResearchData(topic);
    }
  }

  /**
   * Construye el prompt para investigación especializada
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
}