import axios from 'axios';

/**
 * Analiza un archivo CSV/Excel utilizando IA para extraer información estructurada de materiales
 * @param fileContent Contenido del archivo en formato texto
 * @param fileType Tipo de archivo (csv, excel, etc.)
 * @returns Arreglo de materiales procesados
 */
export async function analyzeFileWithAI(fileContent: string, fileType: string): Promise<any[]> {
  try {
    const response = await axios.post('/api/ai-processor/analyze-file', {
      fileContent,
      fileType
    });
    
    return response.data.materials || [];
  } catch (error) {
    console.error('Error al analizar archivo con IA:', error);
    throw new Error('No se pudo procesar el archivo. Verifica el formato e intenta nuevamente.');
  }
}

/**
 * Normaliza el contenido de un archivo CSV para asegurar formato correcto
 * @param content Contenido CSV a normalizar
 * @returns Contenido CSV normalizado
 */
export async function normalizeCSVWithAI(content: string): Promise<string> {
  try {
    const response = await axios.post('/api/ai-processor/normalize-csv', { content });
    return response.data.normalizedContent || content;
  } catch (error) {
    console.error('Error al normalizar CSV con IA:', error);
    return content; // En caso de error, devolver el contenido original
  }
}