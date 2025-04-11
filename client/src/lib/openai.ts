
import { apiRequest } from "./queryClient";
import { woodFenceRules } from '../data/rules/woodfencerules.js';

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

export async function processChatMessage(message: string, context: any): Promise<any> {
  try {
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
