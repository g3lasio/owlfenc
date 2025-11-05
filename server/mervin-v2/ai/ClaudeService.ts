/**
 * CLAUDE SERVICE - SERVICIO DE CLAUDE SONNET 4
 * 
 * Responsabilidades:
 * - Generación de contratos legales profesionales
 * - Respuestas finales profesionales
 * - Análisis de documentos complejos
 * - Razonamiento profundo
 */

import Anthropic from '@anthropic-ai/sdk';
import type { TaskResult } from '../types/mervin-types';

// Modelo más reciente de Anthropic (claude-3-7-sonnet-20250219)
const DEFAULT_MODEL = "claude-3-7-sonnet-20250219";

export class ClaudeService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generar mensaje final profesional después de completar tarea
   */
  async generateCompletionMessage(
    taskResult: TaskResult, 
    language: 'es' | 'en'
  ): Promise<string> {
    const isSpanish = language === 'es';
    
    const systemPrompt = isSpanish 
      ? `Eres Mervin AI, un asistente experto en construcción con personalidad mexicana norteña.
Acabas de completar una tarea exitosamente. Tu trabajo es:
1. Informar al usuario de manera profesional pero amigable
2. Incluir todos los datos importantes del resultado
3. Usar tu personalidad natural: "primo", "compadre", "órale", etc.
4. Ser conciso pero completo
5. Incluir emojis relevantes

Características importantes:
- Profesional pero accesible
- Confiable y claro
- Entusiasta sobre el trabajo bien hecho`
      : `You are Mervin AI, a construction expert assistant with a friendly Mexican personality.
You just completed a task successfully. Your job is to:
1. Inform the user professionally but friendly
2. Include all important result data
3. Use natural expressions like "dude", "bro", etc.
4. Be concise but complete
5. Include relevant emojis

Important traits:
- Professional but accessible
- Reliable and clear
- Enthusiastic about work well done`;

    const userPrompt = isSpanish
      ? `Acabas de completar esta tarea:

Tipo: ${taskResult.data?.taskType || 'tarea'}
Resultado: ${JSON.stringify(taskResult.data, null, 2)}
Tiempo de ejecución: ${taskResult.executionTime}ms
Pasos completados: ${taskResult.stepsCompleted?.join(', ')}

Genera un mensaje profesional informando al usuario del éxito.

IMPORTANTE - URLs CLICKABLES:
- Si el resultado contiene URLs (shareableUrl, url, pdfUrl, link, etc.), debes incluirlas EN TEXTO COMPLETO como enlaces clickables
- Escribe las URLs completas sin acortar: https://ejemplo.com/ruta/completa
- Asegúrate que las URLs estén en su propia línea o claramente separadas del texto
- Ejemplo: "Puedes revisar tu estimado aquí: https://chyrris.com/s/ABC123"

Incluye:
- Confirmación clara
- Datos importantes (IDs, totales)
- URLs COMPLETAS Y CLICKABLES si existen en el resultado
- Próximos pasos si aplica
- Ofrecimiento de ayuda adicional`
      : `You just completed this task:

Type: ${taskResult.data?.taskType || 'task'}
Result: ${JSON.stringify(taskResult.data, null, 2)}
Execution time: ${taskResult.executionTime}ms
Steps completed: ${taskResult.stepsCompleted?.join(', ')}

Generate a professional message informing the user of success.

IMPORTANT - CLICKABLE URLs:
- If the result contains URLs (shareableUrl, url, pdfUrl, link, etc.), you MUST include them IN FULL TEXT as clickable links
- Write complete URLs without shortening: https://example.com/full/path
- Make sure URLs are on their own line or clearly separated from text
- Example: "You can review your estimate here: https://chyrris.com/s/ABC123"

Include:
- Clear confirmation
- Important data (IDs, totals)
- COMPLETE AND CLICKABLE URLs if they exist in the result
- Next steps if applicable
- Offer of additional help`;

    try {
      const response = await this.anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: systemPrompt + '\n\n' + userPrompt
          }
        ]
      });

      const content = response.content[0];
      const message = content.type === 'text' ? content.text : '';
      
      console.log('✨ [CLAUDE-COMPLETION] Generated professional message');
      return message;

    } catch (error) {
      console.error('❌ [CLAUDE-COMPLETION] Error:', error);
      
      // Fallback simple
      return isSpanish
        ? `✅ ¡Listo primo! Tarea completada exitosamente.\n\nResultado:\n${JSON.stringify(taskResult.data, null, 2)}\n\n¿Necesitas algo más?`
        : `✅ Done dude! Task completed successfully.\n\nResult:\n${JSON.stringify(taskResult.data, null, 2)}\n\nNeed anything else?`;
    }
  }

  /**
   * Generar contenido de contrato legal profesional
   */
  async generateContractContent(params: {
    clientName: string;
    projectType: string;
    projectAddress?: string;
    amount: number;
    startDate?: string;
    endDate?: string;
    specialTerms?: string;
  }): Promise<string> {
    const prompt = `Genera un contrato de construcción profesional y completo con estos detalles:

Cliente: ${params.clientName}
Tipo de proyecto: ${params.projectType}
Dirección: ${params.projectAddress || 'Por definir'}
Monto: $${params.amount.toLocaleString('en-US')}
Fecha de inicio: ${params.startDate || 'Por definir'}
Fecha de fin: ${params.endDate || 'Por definir'}
Términos especiales: ${params.specialTerms || 'Ninguno'}

El contrato debe incluir:
1. Encabezado profesional con fecha
2. Identificación de las partes (Contratista y Cliente)
3. Descripción del trabajo
4. Monto y términos de pago
5. Cronograma
6. Garantías y responsabilidades
7. Cláusulas de cancelación
8. Seguro y permisos
9. Resolución de disputas
10. Espacios para firmas

Formato: Documento legal profesional en español (México).`;

    try {
      const response = await this.anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      const contractText = content.type === 'text' ? content.text : '';
      
      console.log('📄 [CLAUDE-CONTRACT] Generated professional contract');
      return contractText;

    } catch (error) {
      console.error('❌ [CLAUDE-CONTRACT] Error:', error);
      throw new Error(`Error generando contrato: ${(error as Error).message}`);
    }
  }

  /**
   * Procesar consulta compleja que requiere razonamiento profundo
   */
  async processComplexQuery(input: string, context?: any): Promise<string> {
    const systemPrompt = `Eres Mervin AI, un experto en construcción con conocimiento profundo sobre:
- Estimación de costos y materiales
- Contratos de construcción
- Permisos y regulaciones
- Propiedades y catastro
- Mejores prácticas de la industria

Respondes de manera:
- Profesional pero amigable
- Técnicamente precisa
- Con personalidad mexicana norteña natural
- Concisa pero completa`;

    try {
      const response = await this.anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: systemPrompt + '\n\n' + input
          }
        ]
      });

      const content = response.content[0];
      const message = content.type === 'text' ? content.text : '';
      
      console.log('🧠 [CLAUDE-COMPLEX] Processed complex query');
      return message;

    } catch (error) {
      console.error('❌ [CLAUDE-COMPLEX] Error:', error);
      throw new Error(`Error procesando consulta: ${(error as Error).message}`);
    }
  }

  /**
   * Analizar documento complejo
   */
  async analyzeDocument(document: string, analysisType: string): Promise<any> {
    const prompt = `Analiza este documento y proporciona un análisis de tipo "${analysisType}":

${document}

Proporciona un análisis detallado y profesional.`;

    try {
      const response = await this.anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      const analysis = content.type === 'text' ? content.text : '';
      
      console.log('📊 [CLAUDE-ANALYSIS] Analyzed document');
      return { analysis, success: true };

    } catch (error) {
      console.error('❌ [CLAUDE-ANALYSIS] Error:', error);
      throw new Error(`Error analizando documento: ${(error as Error).message}`);
    }
  }
}
