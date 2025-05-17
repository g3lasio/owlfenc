import OpenAI from 'openai';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = 'gpt-4o';

// Intentar inicializar OpenAI con la API key, pero manejar posibles errores
let openai: OpenAI;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Tomado de las variables de entorno
    dangerouslyAllowBrowser: true // Permitir uso en el cliente (solo para desarrollo)
  });
} catch (error) {
  console.error('Error al inicializar OpenAI:', error);
}

/**
 * Mejora una descripción de proyecto utilizando GPT-4o
 * 
 * @param description La descripción original del proyecto
 * @returns Una versión mejorada de la descripción
 */
export async function enhanceProjectDescription(description: string): Promise<string> {
  if (!openai) {
    console.error('OpenAI no está inicializado. Verifica la API key.');
    throw new Error('Servicio OpenAI no disponible');
  }

  try {
    const prompt = `
    Eres Mervin, un asistente virtual especializado en proyectos de construcción, cercas y mejoras para el hogar.
    
    Por favor, mejora la siguiente descripción de proyecto para que sea más profesional, clara y detallada.
    
    Añade información técnica relevante si es necesario y organiza el texto para que sea fácil de entender.
    
    Mantén el mismo idioma (español) y usa un tono profesional pero accesible.
    
    Descripción original:
    ${description || 'Sin descripción proporcionada.'}
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Eres Mervin, un asistente especializado en mejoras de descripciones para proyectos de construcción.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message.content || 'No se pudo mejorar la descripción.';
  } catch (error) {
    console.error('Error al mejorar la descripción:', error);
    throw error;
  }
}

/**
 * Comprueba si el servicio de OpenAI está disponible
 * 
 * @returns true si el servicio está disponible, false en caso contrario
 */
export async function isOpenAIAvailable(): Promise<boolean> {
  if (!openai) return false;
  
  try {
    // Intenta hacer una llamada simple a la API
    await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: 'Hola' }],
      max_tokens: 5
    });
    return true;
  } catch (error) {
    console.error('Error verificando disponibilidad de OpenAI:', error);
    return false;
  }
}