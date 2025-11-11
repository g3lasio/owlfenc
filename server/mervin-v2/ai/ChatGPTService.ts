/**
 * CHATGPT SERVICE - SERVICIO DE CHATGPT-4O
 * 
 * Responsabilidades:
 * - Análisis rápido de intención (< 1 segundo)
 * - Extracción de parámetros del input natural
 * - Conversaciones simples
 * - Investigación web básica
 */

import OpenAI from "openai";
import type { 
  QuickAnalysis, 
  TaskParameters, 
  TaskType,
  EstimateParams,
  ContractParams,
  PermitParams,
  PropertyParams
} from '../types/mervin-types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DEFAULT_MODEL = "gpt-4o";

export class ChatGPTService {
  /**
   * Análisis ultra-rápido de intención (< 1 segundo)
   */
  async analyzeQuick(input: string, availableTools: string[] = []): Promise<QuickAnalysis> {
    const toolsContext = availableTools.length > 0 
      ? `\n\nHERRAMIENTAS DISPONIBLES:\n${availableTools.map(t => `- ${t}`).join('\n')}`
      : '';
    
    const prompt = `Analiza este mensaje del usuario y determina:
1. ¿Es una conversación simple (saludo, pregunta general)?
2. ¿Es una tarea ejecutable (crear estimado, generar contrato, etc.)?
3. ¿Requiere razonamiento profundo?
4. ¿Necesita investigación web?
5. ¿Qué tipo de tarea es? (estimate, contract, permit, property, conversation, research)
6. ¿Es un workflow completo multi-paso o una tarea aislada?
7. ¿Idioma? (es o en)

Input: "${input}"
${toolsContext}

IMPORTANTE: 
- Si el usuario pide "revisar", "analizar", "verificar", "checar" un contrato/estimado/documento EXISTENTE → es "conversation" (análisis), NO una tarea ejecutable
- Solo es "estimate" si pide CREAR/GENERAR un nuevo estimado
- Solo es "contract" si pide CREAR/GENERAR un nuevo contrato
- Si hay archivos adjuntos y pide revisarlos → es "conversation"
- Si pide información sobre permisos → es "permit"
- Si pide verificar una propiedad/dirección → es "property"

WORKFLOWS vs TOOLS (CRÍTICO - PRIORIDAD):
- REGLA DE ORO: **SIEMPRE PREFERIR TOOLS SOBRE WORKFLOWS**
- WORKFLOWS: Solo existe "estimate_wizard" (proceso completo multi-paso de 14 pasos)
- TOOLS: Tareas individuales rápidas y directas (create_contract, verify_property, get_permit_info, create_estimate)
- ORDEN DE PRIORIDAD:
  1. Si existe una TOOL que puede hacer la tarea → usar la TOOL (isWorkflow = FALSE)
  2. Si NO existe tool pero existe workflow → usar workflow (isWorkflow = TRUE)
  3. Si no existe ni tool ni workflow → conversación
- EJEMPLOS:
  * "crear contrato" → TOOL create_contract (NO workflow)
  * "verificar propiedad" → TOOL verify_property (NO workflow)
  * "info de permisos" → TOOL get_permit_info (NO workflow)
  * "crear estimado" → TOOL create_estimate (NO workflow, aunque existe workflow)
  * "proceso completo de estimado con 14 pasos" → WORKFLOW estimate_wizard
- SOLO usar workflows si el usuario explícitamente pide un proceso multi-paso guiado

Responde SOLO con JSON:
{
  "isSimpleConversation": boolean,
  "isExecutableTask": boolean,
  "isWorkflow": boolean,
  "workflowType": "estimate_wizard" | null,
  "needsDeepThinking": boolean,
  "needsWebResearch": boolean,
  "taskType": "estimate" | "contract" | "permit" | "property" | "conversation" | "research",
  "confidence": number (0-1),
  "language": "es" | "en"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: 'Eres un analizador de intenciones. Responde SOLO con JSON válido.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 500 // 🔧 Aumentado de 300 a 500 para análisis más detallados
      });

      const content = response.choices[0].message.content || '{}';
      const analysis = JSON.parse(content) as QuickAnalysis;
      
      console.log('🎯 [CHATGPT-ANALYSIS]', analysis);
      return analysis;

    } catch (error) {
      console.error('❌ [CHATGPT-ANALYSIS] Error:', error);
      
      // Fallback analysis
      return {
        isSimpleConversation: this.isLikelyConversation(input),
        isExecutableTask: this.isLikelyTask(input),
        needsDeepThinking: false,
        needsWebResearch: false,
        taskType: this.detectTaskType(input),
        confidence: 0.5,
        language: /[áéíóúñ]/.test(input) ? 'es' : 'en'
      };
    }
  }

  /**
   * Extraer parámetros del input natural
   */
  async extractParameters(input: string, taskType: TaskType): Promise<TaskParameters> {
    const schema = this.getParameterSchema(taskType);
    
    const prompt = `Extrae los parámetros necesarios de este input del usuario para una tarea de tipo "${taskType}".

Input: "${input}"

Responde SOLO con JSON válido en este formato exacto:
${schema}

Si falta información crítica, usa null. No inventes datos.`;

    try {
      const response = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: 'Eres un extractor de parámetros. Responde SOLO con JSON válido.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 500
      });

      const content = response.choices[0].message.content || '{}';
      const params = JSON.parse(content);
      
      console.log('📋 [CHATGPT-PARAMS]', params);
      return params as TaskParameters;

    } catch (error) {
      console.error('❌ [CHATGPT-PARAMS] Error:', error);
      throw new Error(`Error extrayendo parámetros: ${(error as Error).message}`);
    }
  }

  /**
   * Generar respuesta conversacional simple
   */
  async generateResponse(input: string, conversationHistory: any[] = []): Promise<string> {
    const messages: any[] = [
      {
        role: 'system',
        content: `Eres Mervin AI, un asistente experto en construcción con personalidad mexicana norteña.
Características:
- Amigable y profesional
- Usas "primo", "compadre", "órale" de manera natural
- Respondes de forma concisa y útil
- Si no sabes algo, lo admites
- Siempre dispuesto a ayudar`
      },
      ...conversationHistory,
      { role: 'user', content: input }
    ];

    try {
      const response = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1500 // 🔧 Aumentado de 500 a 1500 para respuestas completas
      });

      const content = response.choices[0].message.content || '';
      console.log('💬 [CHATGPT-RESPONSE] Generated conversational response');
      return content;

    } catch (error) {
      console.error('❌ [CHATGPT-RESPONSE] Error:', error);
      throw new Error(`Error generando respuesta: ${(error as Error).message}`);
    }
  }

  /**
   * Verificar si es tarea ejecutable
   */
  async checkIfExecutableTask(input: string): Promise<boolean> {
    const taskKeywords = [
      'crea', 'crear', 'genera', 'generar', 'haz', 'hacer',
      'estimado', 'estimate', 'contrato', 'contract',
      'permiso', 'permit', 'propiedad', 'property',
      'verifica', 'verify', 'analiza', 'analyze'
    ];

    const lowerInput = input.toLowerCase();
    return taskKeywords.some(keyword => lowerInput.includes(keyword));
  }

  // ============= HELPERS PRIVADOS =============

  private getParameterSchema(taskType: TaskType): string {
    const schemas = {
      estimate: `{
  "clientName": "string",
  "clientEmail": "string",
  "clientPhone": "string | null",
  "projectType": "string",
  "dimensions": "string",
  "sendEmail": boolean,
  "needsResearch": boolean
}`,
      contract: `{
  "clientName": "string",
  "clientEmail": "string | null",
  "projectType": "string",
  "projectAddress": "string | null",
  "amount": number,
  "startDate": "string | null",
  "endDate": "string | null",
  "specialTerms": "string | null"
}`,
      permit: `{
  "projectType": "string",
  "projectAddress": "string",
  "projectScope": "string"
}`,
      property: `{
  "address": "string",
  "includeHistory": boolean
}`,
      conversation: '{}',
      research: '{}'
    };

    return schemas[taskType as keyof typeof schemas] || '{}';
  }

  private isLikelyConversation(input: string): boolean {
    const conversationPatterns = [
      /^(hola|hi|hello|buenas|hey)/i,
      /^(gracias|thanks|thank you)/i,
      /^(adiós|bye|goodbye|hasta luego)/i,
      /^(cómo estás|how are you|qué tal)/i,
      /^(ok|okay|bueno|perfecto|entiendo)/i
    ];

    return conversationPatterns.some(pattern => pattern.test(input.trim()));
  }

  private isLikelyTask(input: string): boolean {
    const taskWords = [
      'crear', 'generar', 'hacer', 'crear', 'genera',
      'estimado', 'contrato', 'permiso', 'propiedad',
      'estimate', 'contract', 'permit', 'property',
      'verifica', 'analiza', 'verify', 'analyze'
    ];

    const lowerInput = input.toLowerCase();
    return taskWords.some(word => lowerInput.includes(word));
  }

  private detectTaskType(input: string): TaskType {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('estimado') || lowerInput.includes('estimate')) {
      return 'estimate';
    }
    if (lowerInput.includes('contrato') || lowerInput.includes('contract')) {
      return 'contract';
    }
    if (lowerInput.includes('permiso') || lowerInput.includes('permit')) {
      return 'permit';
    }
    if (lowerInput.includes('propiedad') || lowerInput.includes('property') || lowerInput.includes('dueño') || lowerInput.includes('owner')) {
      return 'property';
    }

    return 'conversation';
  }
}
