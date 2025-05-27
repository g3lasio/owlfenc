import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
});

interface ContractData {
  [key: string]: any;
}

interface SmartRecommendation {
  type: 'skip_question' | 'auto_fill' | 'legal_clause' | 'description_enhancement';
  questionId?: string;
  value?: string;
  reason: string;
  confidence: number;
}

/**
 * Servicio de Contrato Inteligente usando Anthropic
 * 
 * Este servicio utiliza IA para:
 * - Eliminar preguntas redundantes
 * - Auto-completar información obvia
 * - Generar cláusulas legales protectoras
 * - Mejorar descripciones de proyectos
 */
export class IntelligentContractService {
  
  /**
   * Analiza los datos recopilados y recomienda acciones inteligentes
   */
  static async analyzeAndRecommend(collectedData: ContractData): Promise<SmartRecommendation[]> {
    try {
      const prompt = `
      Eres Mervin AI, el asistente experto en contratos de construcción. Analiza los datos recopilados y proporciona recomendaciones inteligentes para optimizar el proceso.

      DATOS RECOPILADOS:
      ${JSON.stringify(collectedData, null, 2)}

      INSTRUCCIONES:
      1. Identifica información que se puede auto-completar basándose en datos existentes
      2. Detecta preguntas que son redundantes o innecesarias
      3. Sugiere cláusulas legales específicas que protejan al contratista
      4. Recomienda mejoras para descripciones de proyectos

      RESPONDE EN FORMATO JSON:
      {
        "recommendations": [
          {
            "type": "skip_question|auto_fill|legal_clause|description_enhancement",
            "questionId": "id_de_pregunta_si_aplica",
            "value": "valor_a_autocompletar_o_clausula",
            "reason": "explicación_clara_en_español",
            "confidence": 0.9
          }
        ]
      }

      REGLAS ESPECÍFICAS:
      - Si hay dirección, auto-completar estado (California por defecto)
      - Si hay categoría de proyecto, generar cláusulas legales específicas
      - Si hay descripción básica, sugerir mejoras profesionales
      - Priorizar protección legal del contratista
      `;

      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const result = JSON.parse(content.text);
        return result.recommendations || [];
      }
      return [];

    } catch (error) {
      console.error('Error analyzing contract data:', error);
      return [];
    }
  }

  /**
   * Genera cláusulas legales específicas para el tipo de proyecto
   */
  static async generateLegalClauses(projectData: ContractData): Promise<string> {
    try {
      const prompt = `
      Eres un abogado especializado en contratos de construcción en California. Genera cláusulas legales específicas que protejan al contratista.

      DATOS DEL PROYECTO:
      - Tipo: ${projectData.category || 'General'}
      - Ubicación: ${projectData.address || 'California'}
      - Descripción: ${projectData.description || 'Proyecto de construcción'}
      - Valor estimado: ${projectData.totalCost || 'Por determinar'}

      GENERA CLÁUSULAS ESPECÍFICAS PARA:
      1. Protección contra cambios de alcance
      2. Términos de pago y penalidades por retraso
      3. Responsabilidades de permisos y regulaciones
      4. Protección contra condiciones imprevistas
      5. Limitación de responsabilidad
      6. Resolución de disputas

      FORMATO: Texto claro y profesional en español, listo para incluir en contrato.
      `;

      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';

    } catch (error) {
      console.error('Error generating legal clauses:', error);
      return '';
    }
  }

  /**
   * Mejora la descripción del proyecto con terminología profesional
   */
  static async enhanceProjectDescription(basicDescription: string, projectCategory: string): Promise<string> {
    try {
      const prompt = `
      Eres Mervin AI, experto en proyectos de construcción. Mejora esta descripción básica del proyecto:

      DESCRIPCIÓN ORIGINAL: "${basicDescription}"
      CATEGORÍA: ${projectCategory}

      MEJORA LA DESCRIPCIÓN CON:
      - Terminología técnica profesional
      - Especificaciones claras de materiales y procesos
      - Cronograma aproximado
      - Consideraciones de seguridad y calidad
      - Cumplimiento de códigos locales de California

      RESPONDE CON: Una descripción profesional mejorada en español, clara y específica.
      `;

      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].type === 'text' ? response.content[0].text : basicDescription;

    } catch (error) {
      console.error('Error enhancing description:', error);
      return basicDescription;
    }
  }

  /**
   * Detecta el estado desde una dirección
   */
  static extractStateFromAddress(address: string): string {
    // Buscar patrones comunes de estados en direcciones
    const statePatterns = [
      /california|ca\b/i,
      /texas|tx\b/i,
      /florida|fl\b/i,
      /new york|ny\b/i,
      // Agregar más estados según sea necesario
    ];

    for (const pattern of statePatterns) {
      if (pattern.test(address)) {
        if (/california|ca\b/i.test(address)) return 'CA';
        if (/texas|tx\b/i.test(address)) return 'TX';
        if (/florida|fl\b/i.test(address)) return 'FL';
        if (/new york|ny\b/i.test(address)) return 'NY';
      }
    }

    // Por defecto California (basado en el contexto del negocio)
    return 'CA';
  }

  /**
   * Analiza si una pregunta debe omitirse basándose en datos existentes
   */
  static shouldSkipQuestion(questionId: string, collectedData: ContractData): boolean {
    // Si ya se capturó la dirección, omitir pregunta de estado
    if (questionId === 'legal.state' && collectedData['property.address']) {
      return true;
    }

    // Si ya hay información de la empresa del perfil, omitir preguntas básicas
    if (questionId.startsWith('contractor.') && collectedData.companyProfile) {
      return true;
    }

    // Agregar más lógica de omisión según sea necesario
    return false;
  }

  /**
   * Auto-completa valores obvios basándose en información existente
   */
  static autoFillValue(questionId: string, collectedData: ContractData): string | null {
    // Auto-completar estado desde dirección
    if (questionId === 'legal.state' && collectedData['property.address']) {
      return this.extractStateFromAddress(collectedData['property.address']);
    }

    // Auto-completar información del contratista desde perfil
    if (questionId === 'contractor.name' && collectedData.companyProfile?.companyName) {
      return collectedData.companyProfile.companyName;
    }

    if (questionId === 'contractor.phone' && collectedData.companyProfile?.phone) {
      return collectedData.companyProfile.phone;
    }

    if (questionId === 'contractor.email' && collectedData.companyProfile?.email) {
      return collectedData.companyProfile.email;
    }

    return null;
  }

  /**
   * Genera un resumen inteligente del progreso del contrato
   */
  static async generateProgressSummary(collectedData: ContractData): Promise<string> {
    try {
      const completionPercentage = this.calculateCompletionPercentage(collectedData);
      
      const prompt = `
      Genera un resumen conciso del progreso del contrato:

      DATOS RECOPILADOS: ${JSON.stringify(collectedData, null, 2)}
      PROGRESO: ${completionPercentage}%

      RESPONDE CON: Un resumen en español de máximo 2 líneas sobre qué se ha completado y qué falta.
      `;

      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].type === 'text' ? response.content[0].text : `Progreso: ${this.calculateCompletionPercentage(collectedData)}% completado`;

    } catch (error) {
      console.error('Error generating progress summary:', error);
      return `Progreso: ${this.calculateCompletionPercentage(collectedData)}% completado`;
    }
  }

  /**
   * Calcula el porcentaje de completitud del contrato
   */
  static calculateCompletionPercentage(collectedData: ContractData): number {
    const requiredFields = [
      'client.name',
      'property.address',
      'project.category',
      'project.description',
      'timeline.startDate',
      'payment.totalAmount'
    ];

    const completedFields = requiredFields.filter(field => {
      const keys = field.split('.');
      let value = collectedData;
      for (const key of keys) {
        value = value?.[key];
      }
      return value && value.toString().trim().length > 0;
    });

    return Math.round((completedFields.length / requiredFields.length) * 100);
  }
}