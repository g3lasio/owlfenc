import axios from 'axios';

/**
 * Servicio para procesar archivos CSV usando Anthropic Claude
 * 
 * Claude es especialmente bueno para analizar datos tabulares
 * como archivos CSV, debido a su ventana de contexto más grande.
 */

/**
 * Analiza un archivo CSV utilizando Anthropic Claude para extraer materiales
 * @param csvContent Contenido del archivo CSV en formato texto
 * @returns Arreglo de materiales procesados
 */
export async function analyzeCSVWithAnthropic(csvContent: string): Promise<any[]> {
  try {
    // Si el contenido es muy grande, tomar sólo las primeras 300 líneas
    // para evitar problemas con el tamaño máximo de tokens
    const lines = csvContent.split('\n');
    const truncatedContent = lines.slice(0, 300).join('\n');
    
    // Realizar llamada a la API del servidor que a su vez llamará a Anthropic
    const response = await axios.post('/api/anthropic/analyze-csv', {
      csvContent: truncatedContent
    }, {
      timeout: 45000 // 45 segundos de timeout
    });
    
    if (response.data && response.data.materials) {
      console.log(`Análisis con Anthropic completado. Encontrados ${response.data.materials.length} materiales`);
      return response.data.materials;
    }
    
    throw new Error('Formato de respuesta de Anthropic no válido');
  } catch (error) {
    console.error('Error al analizar CSV con Anthropic:', error);
    throw error;
  }
}

/**
 * Normaliza el contenido de un archivo CSV para asegurar formato correcto
 * utilizando Anthropic Claude
 * @param content Contenido CSV potencialmente mal formateado
 * @returns Contenido CSV normalizado
 */
export async function normalizeCSVWithAnthropic(content: string): Promise<string> {
  try {
    // Si el contenido es muy grande, truncarlo
    const truncatedContent = content.length > 100000 
      ? content.substring(0, 100000) 
      : content;
      
    const response = await axios.post('/api/anthropic/normalize-csv', { 
      content: truncatedContent 
    }, {
      timeout: 30000 // 30 segundos de timeout
    });
    
    if (response.data && response.data.normalizedContent) {
      return response.data.normalizedContent;
    }
    
    throw new Error('No se pudo normalizar el CSV con Anthropic');
  } catch (error) {
    console.error('Error al normalizar CSV con Anthropic:', error);
    throw error;
  }
}

/**
 * Extrae información estructurada de materiales desde un texto no estructurado
 * usando Anthropic Claude
 * @param text Texto no estructurado con información sobre materiales
 * @returns Arreglo de materiales procesados
 */
export async function extractMaterialsFromText(text: string): Promise<any[]> {
  try {
    const response = await axios.post('/api/anthropic/extract-materials', {
      text
    }, {
      timeout: 30000 // 30 segundos de timeout
    });
    
    if (response.data && response.data.materials) {
      return response.data.materials;
    }
    
    throw new Error('No se pudo extraer información de materiales del texto');
  } catch (error) {
    console.error('Error al extraer materiales de texto con Anthropic:', error);
    throw error;
  }
}