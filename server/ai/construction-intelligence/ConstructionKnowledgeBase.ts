/**
 * CONSTRUCTION KNOWLEDGE BASE - BASE DE CONOCIMIENTO ESPECIALIZADO
 * 
 * Sistema de conocimiento profundo sobre construcción, materiales, códigos,
 * regulaciones y mejores prácticas en la industria de la construcción.
 */

import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

export interface ConstructionKnowledge {
  materialSuggestions: MaterialSuggestion[];
  legalConsiderations: string[];
  bestPractices: string[];
  codeRequirements?: string[];
  costEstimations?: CostEstimation[];
  timeEstimations?: string[];
}

interface MaterialSuggestion {
  name: string;
  category: string;
  specifications: string;
  estimatedCost: string;
  supplier: string;
  pros: string[];
  cons: string[];
}

interface CostEstimation {
  item: string;
  unitCost: string;
  laborCost: string;
  totalEstimated: string;
  factors: string[];
}

export class ConstructionKnowledgeBase {
  private anthropic: Anthropic;

  constructor(anthropic: Anthropic) {
    this.anthropic = anthropic;
    console.log('🏗️ [CONSTRUCTION-KB] Base de conocimiento de construcción inicializada');
  }

  /**
   * Obtiene conocimiento relevante sobre construcción basado en la consulta
   */
  async getRelevantKnowledge(query: string, category: string): Promise<ConstructionKnowledge> {
    console.log(`🔍 [CONSTRUCTION-KB] Consultando conocimiento para: ${category}`);

    try {
      const prompt = this.buildKnowledgePrompt(query, category);
      
      const response = await this.anthropic.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 4000,
        temperature: 0.1, // Baja temperatura para respuestas precisas
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      const messageContent = response.content[0];
      if ('text' in messageContent) {
        return this.parseKnowledgeResponse(messageContent.text);
      } else {
        throw new Error('Formato de respuesta no reconocido');
      }
    } catch (error) {
      console.error('❌ [CONSTRUCTION-KB] Error obteniendo conocimiento:', error);
      return this.getFallbackKnowledge(category);
    }
  }

  /**
   * Construye el prompt especializado para obtener conocimiento de construcción
   */
  private buildKnowledgePrompt(query: string, category: string): string {
    const basePrompt = `
Como experto en construcción con 20+ años de experiencia en California y México, proporciona conocimiento técnico detallado.

CONSULTA: "${query}"
CATEGORÍA: ${category}

Proporciona información en formato JSON con esta estructura exacta:
{
  "materialSuggestions": [
    {
      "name": "Nombre del material",
      "category": "Categoría",
      "specifications": "Especificaciones técnicas detalladas",
      "estimatedCost": "Rango de costo estimado",
      "supplier": "Proveedor sugerido",
      "pros": ["Ventaja 1", "Ventaja 2"],
      "cons": ["Desventaja 1", "Desventaja 2"]
    }
  ],
  "legalConsiderations": [
    "Consideración legal 1 con códigos específicos",
    "Consideración legal 2 con regulaciones"
  ],
  "bestPractices": [
    "Mejor práctica 1 con explicación técnica",
    "Mejor práctica 2 con detalles de implementación"
  ],
  "codeRequirements": [
    "Código de construcción específico con número de sección",
    "Requisito regulatorio con jurisdicción"
  ],
  "costEstimations": [
    {
      "item": "Material o servicio",
      "unitCost": "Costo por unidad",
      "laborCost": "Costo de mano de obra",
      "totalEstimated": "Total estimado",
      "factors": ["Factor que afecta el costo 1", "Factor 2"]
    }
  ],
  "timeEstimations": [
    "Tiempo estimado para fase 1: X días",
    "Tiempo estimado para fase 2: Y días"
  ]
}`;

    return basePrompt + this.getCategorySpecificPrompt(category);
  }

  /**
   * Obtiene prompts específicos por categoría
   */
  private getCategorySpecificPrompt(category: string): string {
    const categoryPrompts = {
      'fencing': `

ENFÓCATE EN:
- Tipos de cercas (madera, vinyl, metal, chain-link)
- Regulaciones de altura por zona (residencial vs comercial)
- Códigos de construcción específicos para cercas
- Consideraciones de líneas de propiedad y servidumbres
- Métodos de instalación y cimentación
- Materiales de alta calidad vs económicos
- Mantenimiento y durabilidad
- Permisos requeridos por jurisdicción`,

      'permits': `

ENFÓCATE EN:
- Tipos de permisos requeridos por tipo de proyecto
- Procesos de solicitud por jurisdicción
- Documentos necesarios para cada permiso
- Tiempos de procesamiento típicos
- Costos de permisos por categoría
- Inspecciones requeridas y cronograma
- Penalidades por trabajo sin permiso
- Contactos de oficinas de permisos locales`,

      'contracts': `

ENFÓCATE EN:
- Elementos legales esenciales en contratos de construcción
- Cláusulas de protección para contratistas
- Términos de pago y cronogramas
- Manejo de cambios de alcance
- Seguros y garantías requeridos
- Resolución de disputas
- Cumplimiento de códigos y regulaciones
- Protecciones contra mechanics' liens`,

      'materials': `

ENFÓCATE EN:
- Especificaciones técnicas detalladas
- Códigos de construcción aplicables
- Proveedores confiables en California
- Comparaciones de costo-beneficio
- Durabilidad y garantías
- Consideraciones climáticas
- Instalación correcta y herramientas necesarias
- Alternativas sostenibles y eco-friendly`
    };

    return categoryPrompts[category as keyof typeof categoryPrompts] || categoryPrompts['fencing'];
  }

  /**
   * Parsea la respuesta de Anthropic y la convierte a ConstructionKnowledge
   */
  private parseKnowledgeResponse(response: string): ConstructionKnowledge {
    try {
      // Buscar el JSON en la respuesta
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se encontró JSON en la respuesta');
      }

      const jsonResponse = JSON.parse(jsonMatch[0]);
      
      // Validar y estructurar la respuesta
      return {
        materialSuggestions: jsonResponse.materialSuggestions || [],
        legalConsiderations: jsonResponse.legalConsiderations || [],
        bestPractices: jsonResponse.bestPractices || [],
        codeRequirements: jsonResponse.codeRequirements || [],
        costEstimations: jsonResponse.costEstimations || [],
        timeEstimations: jsonResponse.timeEstimations || []
      };
    } catch (error) {
      console.error('❌ [CONSTRUCTION-KB] Error parseando respuesta:', error);
      throw error;
    }
  }

  /**
   * Proporciona conocimiento básico de fallback en caso de error
   */
  private getFallbackKnowledge(category: string): ConstructionKnowledge {
    const fallbacks = {
      'fencing': {
        materialSuggestions: [
          {
            name: 'Cedar Privacy Fence',
            category: 'Madera',
            specifications: '6ft height, 1x6 cedar boards, pressure treated posts',
            estimatedCost: '$25-35 per linear foot',
            supplier: 'Local lumber yards',
            pros: ['Natural appearance', 'Good privacy', 'Moderate cost'],
            cons: ['Requires maintenance', 'Weather susceptible']
          }
        ],
        legalConsiderations: [
          'Verificar líneas de propiedad antes de instalación',
          'Obtener permisos para cercas mayores a 6 pies'
        ],
        bestPractices: [
          'Usar concrete para posts en suelo blando',
          'Dejar espacios para drenaje'
        ],
        codeRequirements: [
          'Altura máxima 6ft en área frontal (residencial)',
          'Requerimiento de permisos según jurisdicción'
        ]
      },
      'general': {
        materialSuggestions: [],
        legalConsiderations: [
          'Consultar códigos de construcción locales',
          'Obtener todos los permisos necesarios'
        ],
        bestPractices: [
          'Planificar cuidadosamente antes de comenzar',
          'Usar materiales de calidad'
        ],
        codeRequirements: [
          'Cumplir con códigos de construcción locales',
          'Seguir regulaciones de seguridad'
        ]
      }
    };

    return fallbacks[category as keyof typeof fallbacks] || fallbacks['general'];
  }

  /**
   * Obtiene información específica sobre códigos de construcción
   */
  async getConstructionCodes(projectType: string, location: string): Promise<string[]> {
    console.log(`📋 [CONSTRUCTION-KB] Consultando códigos para: ${projectType} en ${location}`);

    try {
      const prompt = `
Como experto en códigos de construcción de California, proporciona una lista específica de códigos y regulaciones aplicables.

TIPO DE PROYECTO: ${projectType}
UBICACIÓN: ${location}

Proporciona una lista en formato JSON de códigos específicos:
{
  "codes": [
    "Código específico con número de sección y descripción",
    "Regulación específica con jurisdicción aplicable"
  ]
}

Incluye códigos de:
- California Building Code (CBC)
- Local municipal codes
- Códigos de cercas específicos
- Regulaciones de zonificación
- Códigos de setback
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
          return parsed.codes || [];
        }
      }

      return ['Consultar California Building Code para requisitos específicos'];
    } catch (error) {
      console.error('❌ [CONSTRUCTION-KB] Error obteniendo códigos:', error);
      return ['Consultar códigos de construcción locales aplicables'];
    }
  }
}