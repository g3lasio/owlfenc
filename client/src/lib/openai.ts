
import { apiRequest } from "./queryClient";
// Commenting out woodFenceRules import as it's causing type issues and isn't used in this file
// import { woodFenceRules } from '../data/rules/woodfencerules.js';

// Using GPT-4 since it's the most capable model for handling Mexican slang and humor
const GPT_MODEL = "gpt-4";

const MEXICAN_STYLE_PROMPT = `Actúa como un mexicano carismático y bromista. Usa expresiones como:
- "¡Qué onda primo!"
- "¡Échale ganas!"
- "¡Está bien chingón!"
- "¡No manches!"
- "¡Órale!"
Mantén un tono amigable y casual, como si estuvieras hablando con un primo.`;

export async function generateEstimate(projectDetails: any): Promise<string> {
  try {
    const response = await apiRequest("POST", "/api/generate-estimate", {
      projectDetails,
      model: GPT_MODEL,
      systemPrompt: MEXICAN_STYLE_PROMPT
    });
    
    const data = await response.json();
    return data.html;
  } catch (error) {
    console.error("¡Chale! Error generando el estimado:", error);
    throw error;
  }
}

export async function generateContract(projectDetails: any): Promise<string> {
  try {
    const response = await apiRequest("POST", "/api/generate-contract", {
      projectDetails,
      model: GPT_MODEL,
      systemPrompt: MEXICAN_STYLE_PROMPT
    });
    
    const data = await response.json();
    return data.html;
  } catch (error) {
    console.error("¡No manches! Error generando el contrato:", error);
    throw error;
  }
}

/**
 * Procesa un PDF para generar un contrato utilizando Mistral AI
 * @param pdfFile El archivo PDF a procesar
 * @returns Un objeto con los datos extraídos y el HTML del contrato
 */
export async function processPDFForContract(pdfFile: File): Promise<{
  datos_extraidos: any;
  contrato_html: string;
}> {
  try {
    // Crear el FormData para enviar el archivo
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    
    // Enviar la petición a la API
    const response = await fetch('/api/generar-contrato', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error procesando el PDF');
    }
    
    const data = await response.json();
    
    return {
      datos_extraidos: data.datos_extraidos,
      contrato_html: data.contrato_html,
    };
  } catch (error) {
    console.error("¡Chale! Error procesando el PDF para el contrato:", error);
    throw error;
  }
}

/**
 * Actualiza un contrato con cláusulas personalizadas o datos adicionales
 * @param datos_extraidos Datos originales extraídos del PDF
 * @param clausulas_adicionales Lista de cláusulas personalizadas a añadir
 * @param informacion_adicional Información adicional o correcciones a datos existentes
 * @returns HTML actualizado del contrato
 */
export async function actualizarContrato(
  datos_extraidos: any, 
  clausulas_adicionales?: string[],
  informacion_adicional?: any
): Promise<{
  contrato_html: string;
  datos_actualizados: any;
}> {
  try {
    console.log('Solicitando actualización de contrato con cláusulas adicionales:', clausulas_adicionales);
    
    // Enviar la petición a la API
    const response = await fetch('/api/ajustar-contrato', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        datos_extraidos,
        clausulas_adicionales,
        informacion_adicional
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error ajustando el contrato');
    }
    
    const data = await response.json();
    
    return {
      contrato_html: data.contrato_html,
      datos_actualizados: data.datos_actualizados
    };
  } catch (error) {
    console.error("¡Órale! Error actualizando el contrato:", error);
    throw error;
  }
}

export async function processChatMessage(message: string, context: any): Promise<any> {
  try {
    console.log('Chat context being used:', context);
    const response = await apiRequest("POST", "/api/chat", {
      message,
      context,
      model: GPT_MODEL,
      systemPrompt: MEXICAN_STYLE_PROMPT
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("¡Ay caramba! Error procesando el mensaje:", error);
    throw error;
  }
}
