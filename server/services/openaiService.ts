import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Inicializar el cliente de OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// El modelo más reciente y capaz de OpenAI
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";

/**
 * Genera texto utilizando la API de chat completions de OpenAI
 * @param prompt El mensaje del usuario
 * @param systemPrompt Instrucciones de sistema para guiar la respuesta del modelo
 * @param model El modelo de OpenAI a usar (por defecto gpt-4o)
 * @returns El texto generado
 */
export async function generateText(
  prompt: string,
  systemPrompt: string = "",
  model: string = DEFAULT_MODEL
): Promise<string> {
  try {
    const messages: ChatCompletionMessageParam[] = [];
    
    // Añadir prompt de sistema si se proporciona
    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt
      });
    }
    
    // Añadir el mensaje del usuario
    messages.push({
      role: "user",
      content: prompt
    });
    
    // Realizar la petición a la API
    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000
    });
    
    // Devolver el contenido generado
    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("Error en OpenAI generateText:", error);
    throw new Error(`Error al generar texto con OpenAI: ${error.message}`);
  }
}

/**
 * Genera una respuesta en formato JSON utilizando OpenAI
 * @param prompt El mensaje del usuario
 * @param systemPrompt Instrucciones de sistema 
 * @param model El modelo de OpenAI a usar
 * @returns El objeto JSON generado
 */
export async function generateJSON<T>(
  prompt: string,
  systemPrompt: string = "",
  model: string = DEFAULT_MODEL
): Promise<T> {
  try {
    // Asegurarse de que la instrucción de sistema incluya la petición de formato JSON
    const enhancedSystemPrompt = systemPrompt 
      ? `${systemPrompt}\n\nIMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido.` 
      : "Responde ÚNICAMENTE con un objeto JSON válido.";
    
    const messages: Array<{ role: string; content: string }> = [
      {
        role: "system",
        content: enhancedSystemPrompt
      },
      {
        role: "user",
        content: prompt
      }
    ];
    
    // Realizar petición especificando formato JSON
    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });
    
    const content = response.choices[0].message.content || "{}";
    return JSON.parse(content) as T;
  } catch (error) {
    console.error("Error en OpenAI generateJSON:", error);
    throw new Error(`Error al generar JSON con OpenAI: ${error.message}`);
  }
}

/**
 * Analiza un PDF (información en texto) para extraer información clave
 * @param pdfText El texto extraído del PDF
 * @returns Objeto con la información extraída
 */
export async function extractInfoFromPDF(pdfText: string): Promise<any> {
  const systemPrompt = `
    Eres un asistente especializado en extraer información relevante de documentos PDF para contratos de cercas.
    Tu tarea es extraer datos como información del cliente, detalles del proyecto, costos, etc.
    Responde solo con un objeto JSON que contenga la información extraída.
  `;
  
  const prompt = `
    Por favor extrae la siguiente información del texto del PDF y devuelve un objeto JSON con estos campos:
    
    {
      "cliente": {
        "nombre": "Nombre completo del cliente",
        "direccion": "Dirección completa del cliente",
        "telefono": "Número de teléfono del cliente",
        "email": "Email del cliente (si está disponible)"
      },
      "proyecto": {
        "descripcion": "Descripción general del proyecto",
        "tipo_cerca": "Tipo de cerca a instalar",
        "altura_cerca": "Altura de la cerca en pies",
        "longitud_cerca": "Longitud de la cerca en pies",
        "material": "Material principal de la cerca",
        "ubicacion": "Ubicación del proyecto (si es diferente a la dirección del cliente)"
      },
      "costos": {
        "costo_total": "Costo total del proyecto (número)",
        "monto_deposito": "Monto del depósito inicial (número)",
        "saldo_pendiente": "Saldo pendiente (número)"
      },
      "contratista": {
        "nombre": "Nombre de la empresa contratista",
        "licencia": "Número de licencia (si está disponible)",
        "telefono": "Teléfono del contratista",
        "email": "Email del contratista (si está disponible)"
      },
      "fechas": {
        "inicio_estimado": "Fecha estimada de inicio",
        "finalizacion_estimada": "Fecha estimada de finalización"
      }
    }

    Texto del PDF:
    ${pdfText}
    
    Si algún campo no está disponible en el texto, déjalo como null o con un valor vacío apropiado ("").
  `;
  
  return await generateJSON(prompt, systemPrompt);
}

/**
 * Genera HTML para un contrato basado en datos específicos
 * @param contractData Datos del contrato
 * @returns HTML formateado del contrato
 */
export async function generateContractHTML(contractData: any): Promise<string> {
  const systemPrompt = `
    Eres un especialista en generar contratos legales para proyectos de construcción de cercas.
    Debes crear un contrato HTML completo y profesional utilizando los datos proporcionados.
    El contrato debe tener todas las secciones estándar: partes involucradas, alcance del trabajo, compensación, 
    términos de pago, plazos, garantías, y cláusulas legales estándar.
  `;
  
  const prompt = `
    Genera un contrato HTML completo y bien formateado para un proyecto de instalación de cerca 
    utilizando los siguientes datos:
    
    ${JSON.stringify(contractData, null, 2)}
    
    El contrato debe:
    1. Tener un diseño profesional con CSS inline para mejor visualización
    2. Incluir todas las cláusulas legales estándar para protección del contratista y cliente
    3. Tener espacios para firmas al final
    4. Incluir una sección de términos y condiciones
    5. Especificar claramente los detalles del proyecto, materiales y acabados
    6. Detallar el cronograma de pagos
    
    Responde ÚNICAMENTE con el código HTML completo y válido.
  `;
  
  return await generateText(prompt, systemPrompt);
}

/**
 * Procesa un mensaje de conversación utilizando OpenAI
 * @param userMessage Mensaje del usuario
 * @param conversationContext Contexto actual de la conversación
 * @returns Respuesta generada y contexto actualizado
 */
export async function processChatMessage(
  userMessage: string, 
  conversationContext: any = {}
): Promise<{ message: string; context: any }> {
  // Preparar el historial de conversación
  const messages = conversationContext.messages || [];
  
  // Construir el contexto del sistema
  const systemPrompt = `
    Eres Mervin, un asistente virtual especializado en ayudar a contratistas de cercas.
    Actúa como un mexicano carismático y bromista. Usa expresiones como:
    - "¡Qué onda primo!"
    - "¡Échale ganas!"
    - "¡Está bien chingón!"
    - "¡No manches!"
    - "¡Órale!"
    Mantén un tono amigable y casual, como si estuvieras hablando con un primo.
    
    Estás ayudando a un cliente a generar un contrato para un proyecto de cerca.
    
    ${conversationContext.contractData ? 
      `Información actual del contrato: ${JSON.stringify(conversationContext.contractData, null, 2)}` : 
      'No hay información del contrato todavía.'}
    
    Si el usuario solicita generar un contrato, guíalo en el proceso para recopilar toda la información necesaria.
  `;
  
  // Añadir el nuevo mensaje del usuario al historial
  messages.push({
    role: "user",
    content: userMessage
  });
  
  // Crear la solicitud a OpenAI
  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ],
    temperature: 0.8,
    max_tokens: 1000
  });
  
  // Obtener la respuesta generada
  const assistantMessage = response.choices[0].message.content || "";
  
  // Actualizar el historial de mensajes
  messages.push({
    role: "assistant",
    content: assistantMessage
  });
  
  // Actualizar y devolver el contexto
  const updatedContext = {
    ...conversationContext,
    messages: messages
  };
  
  return {
    message: assistantMessage,
    context: updatedContext
  };
}