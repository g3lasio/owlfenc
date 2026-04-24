/**
 * OPENROUTER CLIENT 2025 - SOLUCIÓN UNIFICADA DE AI
 * 
 * Unified AI Gateway que elimina la complejidad de múltiples API keys
 * Acceso a 300+ modelos: OpenAI, Anthropic, Google, XAI, etc.
 * Compatible 100% con OpenAI API - cambio transparente
 */

import OpenAI from 'openai';

export interface OpenRouterConfig {
  apiKey: string;
  fallbackModels?: string[];
  enableFailover?: boolean;
}

export interface ModelResponse {
  content: string;
  model: string;
  success: boolean;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class OpenRouterClient {
  private client: OpenAI;
  private fallbackModels: string[];
  private enableFailover: boolean;

  constructor(config: OpenRouterConfig) {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: config.apiKey,
      defaultHeaders: {
        "HTTP-Referer": "https://owlfenc.com",
        "X-Title": "OWL FENC - Mervin AI"
      }
    });

    // Modelos en orden de preferencia para failover
    this.fallbackModels = config.fallbackModels || [
      "anthropic/claude-3.5-sonnet",      // Mejor para análisis
      "openai/gpt-4o",                    // Mejor para conversación
      "google/gemini-pro",                // Alternativa confiable
      "x-ai/grok-beta",                   // Modelo más nuevo
      "meta-llama/llama-3.1-70b-instruct" // Open source confiable
    ];

    this.enableFailover = config.enableFailover ?? true;
  }

  /**
   * GENERACIÓN DE RESPUESTA CON FAILOVER AUTOMÁTICO
   * Si un modelo falla, automáticamente prueba el siguiente
   */
  async generateResponse(
    messages: any[],
    preferredModel?: string,
    options: any = {}
  ): Promise<ModelResponse> {
    const modelsToTry = preferredModel 
      ? [preferredModel, ...this.fallbackModels.filter(m => m !== preferredModel)]
      : this.fallbackModels;

    let lastError: string = '';

    for (const model of modelsToTry) {
      try {
        console.log(`🤖 [OPENROUTER] Intentando con modelo: ${model}`);
        
        const response = await this.client.chat.completions.create({
          model: model,
          messages: messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2000,
          ...options
        });

        const content = response.choices[0]?.message?.content || '';
        
        console.log(`✅ [OPENROUTER] Éxito con modelo: ${model}`);
        
        return {
          content,
          model,
          success: true,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0
          }
        };

      } catch (error: any) {
        lastError = error.message || 'Unknown error';
        console.log(`❌ [OPENROUTER] Fallo con ${model}: ${lastError}`);
        
        if (!this.enableFailover) {
          break;
        }
        
        // Continúa con el siguiente modelo
        continue;
      }
    }

    // Si todos los modelos fallan
    return {
      content: this.generateFallbackResponse(messages),
      model: 'fallback',
      success: false,
      error: `Todos los modelos fallaron. Último error: ${lastError}`
    };
  }

  /**
   * RESPUESTA CONVERSACIONAL INTELIGENTE
   * Optimizada para el estilo mexicano norteño de Mervin
   */
  async generateConversationalResponse(
    input: string,
    conversationHistory: any[] = [],
    userContext: any = {}
  ): Promise<ModelResponse> {
    const messages = [
      {
        role: "system",
        content: this.buildMervinSystemPrompt(userContext)
      },
      ...conversationHistory,
      {
        role: "user",
        content: input
      }
    ];

    // Usar Claude para conversación (mejor personalidad)
    return await this.generateResponse(
      messages,
      "anthropic/claude-3.5-sonnet",
      { temperature: 0.8, maxTokens: 1500 }
    );
  }

  /**
   * RESPUESTA DE INVESTIGACIÓN INTELIGENTE
   * Optimizada para tareas que requieren análisis profundo
   */
  async generateResearchResponse(
    query: string,
    context: any = {},
    taskType: string = 'general'
  ): Promise<ModelResponse> {
    const messages = [
      {
        role: "system",
        content: this.buildResearchSystemPrompt(taskType, context)
      },
      {
        role: "user",
        content: query
      }
    ];

    // Usar GPT-4o para investigación (mejor análisis)
    return await this.generateResponse(
      messages,
      "openai/gpt-4o",
      { temperature: 0.3, maxTokens: 2500 }
    );
  }

  /**
   * DETECCIÓN AUTOMÁTICA DE MEJOR MODELO PARA TAREA
   */
  private selectOptimalModel(taskType: string): string {
    const modelMapping: Record<string, string> = {
      'conversation': 'anthropic/claude-3.5-sonnet',
      'research': 'openai/gpt-4o',
      'coding': 'anthropic/claude-3.5-sonnet',
      'analysis': 'openai/gpt-4o',
      'creative': 'anthropic/claude-3.5-sonnet',
      'factual': 'google/gemini-pro',
      'realtime': 'x-ai/grok-beta'
    };

    return modelMapping[taskType] || 'anthropic/claude-3.5-sonnet';
  }

  /**
   * PROMPT DEL SISTEMA PARA MERVIN - PERSONALIDAD MEXICANA NORTEÑA
   */
  private buildMervinSystemPrompt(userContext: any): string {
    return `Eres Mervin AI, el asistente virtual de OWL FENC LLC especializado en construcción y cercas.

PERSONALIDAD NORTEÑA AUTÉNTICA:
- Mexicano norteño genuino de Monterrey/Tijuana: usa "primo", "compadre", "órale", "ándale", "qué onda", "a todo dar", "está padrísimo"
- Dices "nel" en lugar de "no", "simón" en lugar de "sí", "oiga" para llamar atención
- Usas diminutivos norteños: "tantito", "rapidito", "cerquita", "ahoritita"
- Mezclas español norteño con inglés técnico naturalmente
- Conocedor experto de cercas, permisos, estimados, contratos - eres el mero mero

CONTEXTO DEL USUARIO:
- Empresa: ${userContext.company || 'OWL FENC LLC'}
- Ubicación: ${userContext.location || 'USA (nationwide)'}
- Plan: ${userContext.plan || 'Primo Chambeador'}

INSTRUCCIONES:
1. Habla como norteño genuino mezclando español e inglés técnico
2. Sé directo y útil - el tiempo es dinero en construcción
3. Usa ejemplos específicos de la ubicación del usuario y precios reales de su área
4. Si no sabes algo exacto, di "Nel primo, eso sí no me lo sé, pero..." y ofrece alternativas
5. Siempre termina preguntando cómo puedes ayudar más: "¿En qué más te echo la mano?"

Recuerda: eres el experto en construcción más chido de toda la nación, primo.`;
  }

  /**
   * PROMPT PARA INVESTIGACIÓN Y ANÁLISIS
   */
  private buildResearchSystemPrompt(taskType: string, context: any): string {
    return `You are Mervin AI's research engine, specialized in construction, fencing, permits, and property analysis.

TASK TYPE: ${taskType}
CONTEXT: ${JSON.stringify(context)}

INSTRUCTIONS:
1. Provide accurate, up-to-date information
2. Focus on the user's local construction regulations and building codes (use context location if provided)
3. Include specific prices, codes, requirements when available
4. Structure responses clearly for contractors
5. Cite sources when possible
6. Be practical and actionable

For construction-related queries, prioritize:
- Local building codes and regulations
- Current material prices and availability
- Permit requirements and processes
- Best practices and safety considerations`;
  }

  /**
   * RESPUESTA DE EMERGENCIA CUANDO TODOS LOS MODELOS FALLAN
   */
  private generateFallbackResponse(messages: any[]): string {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    if (lastUserMessage.toLowerCase().includes('hola') || lastUserMessage.toLowerCase().includes('hello')) {
      return `¡Órale primo! Tuve un problemita técnico con las conexiones de AI, pero aquí andamos. 

¿En qué te puedo ayudar? Manejo todo lo relacionado con:
🔨 Estimados y cotizaciones de cercas
📄 Contratos y documentos legales  
🏗️ Permisos de construcción
🏠 Verificación de propiedades

Aunque tenga fallas técnicas, conozco el negocio de construcción como la palma de mi mano.`;
    }

    return `Compadre, tuve un problema técnico temporal, pero aquí estoy para ayudarte con construcción y cercas.

¿Puedes repetir tu pregunta? Especializo en:
• Estimados precisos de materiales y mano de obra
• Contratos profesionales de construcción
• Requisitos de permisos en la ubicación del usuario
• Verificación de propiedades

¡Dale, primo! La tecnología falla pero el conocimiento queda.`;
  }

  /**
   * OBTENER MODELOS DISPONIBLES
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      // En OpenRouter, esto requeriría una llamada específica a su API de modelos
      return this.fallbackModels;
    } catch (error) {
      console.error('❌ [OPENROUTER] Error obteniendo modelos:', error);
      return this.fallbackModels;
    }
  }

  /**
   * VERIFICAR ESTADO DE LA CONEXIÓN
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.generateResponse([
        { role: "user", content: "test" }
      ], undefined, { maxTokens: 10 });
      
      return response.success;
    } catch (error) {
      return false;
    }
  }
}

export default OpenRouterClient;