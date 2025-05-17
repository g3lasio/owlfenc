import axios from 'axios';

/**
 * Mejora una descripción de proyecto utilizando el servidor como intermediario para llamar a OpenAI
 * 
 * @param description La descripción original del proyecto
 * @returns Una versión mejorada de la descripción
 */
export async function enhanceProjectDescription(description: string): Promise<string> {
  try {
    // Hacemos la petición al servidor en lugar de directamente a OpenAI
    const response = await axios.post('/api/enhance-description', {
      description: description || 'Sin descripción proporcionada.'
    });
    
    if (response.data && response.data.enhancedDescription) {
      return response.data.enhancedDescription;
    } else {
      throw new Error('Respuesta del servidor inválida');
    }
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
  try {
    // Intenta hacer una llamada simple a la API para verificar
    const response = await axios.get('/api/openai-status');
    return response.data.available === true;
  } catch (error) {
    console.error('Error verificando disponibilidad de OpenAI:', error);
    return false;
  }
}