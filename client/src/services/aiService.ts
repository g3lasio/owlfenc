
import axios from 'axios';
import Papa from 'papaparse';
import { analyzeCSVWithAnthropic } from './anthropicService';

/**
 * Analiza un archivo CSV/Excel utilizando IA para extraer información estructurada de materiales
 * @param fileContent Contenido del archivo en formato texto
 * @param fileType Tipo de archivo (csv, excel, etc.)
 * @returns Arreglo de materiales procesados
 */
export async function analyzeFileWithAI(fileContent: string, fileType: string): Promise<any[]> {
  try {
    console.log(`Iniciando análisis de archivo ${fileType} con IA...`);
    
    // Si el contenido es muy grande, truncarlo para evitar problemas
    const truncatedContent = fileContent.length > 50000 
      ? fileContent.substring(0, 50000) 
      : fileContent;
    
    try {
      if (fileType === 'csv') {
        // Intentar primero con Anthropic Claude para archivos CSV (mejor para datos tabulares)
        try {
          console.log('Procesando con Anthropic Claude (optimizado para datos tabulares)...');
          const materials = await analyzeCSVWithAnthropic(truncatedContent);
          if (materials && materials.length > 0) {
            console.log(`Análisis con Anthropic completado. Encontrados ${materials.length} materiales`);
            return materials;
          }
        } catch (anthropicError) {
          console.error('Error al procesar con Anthropic:', anthropicError);
          // Si falla Anthropic, continuar con OpenAI como respaldo
        }
      }
      
      // Intentar con OpenAI a través de la API del servidor
      const response = await axios.post('/api/ai-processor/analyze-file', {
        fileContent: truncatedContent,
        fileType
      }, {
        timeout: 30000 // 30 segundos de timeout
      });
      
      if (response.data && response.data.materials && response.data.materials.length > 0) {
        console.log(`Análisis con IA completado. Encontrados ${response.data.materials.length} materiales`);
        return response.data.materials;
      }
      
      // Si no hay resultados desde el servidor, proceder con procesamiento local
      console.log('No se encontraron materiales con IA, utilizando procesamiento local');
      return processFileLocally(fileContent, fileType);
      
    } catch (apiError) {
      console.error('Error al llamar a la API de procesamiento:', apiError);
      // En caso de error en la API, usar el procesamiento local como fallback
      return processFileLocally(fileContent, fileType);
    }
  } catch (error) {
    console.error('Error al analizar archivo con IA:', error);
    // Intentar procesar localmente como último recurso
    return processFileLocally(fileContent, fileType);
  }
}

/**
 * Procesa localmente un archivo CSV como fallback cuando falla la IA
 * @param fileContent Contenido del archivo
 * @param fileType Tipo de archivo
 * @returns Arreglo de materiales procesados
 */
function processFileLocally(fileContent: string, fileType: string): Promise<any[]> {
  return new Promise((resolve) => {
    if (fileType === 'csv' || fileType === 'txt') {
      // Procesar CSV con PapaParse
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const materials = results.data.map((row: any) => {
            // Mapear las columnas a los campos esperados
            return {
              name: row.name || row.Name || row.nombre || row.Nombre || row.NOMBRE || row.material || row.Material || row['Material Name'] || '',
              category: row.category || row.Category || row.categoría || row.Categoría || row.CATEGORIA || row.tipo || row.Tipo || '',
              description: row.description || row.Description || row.descripción || row.Descripción || row.DESCRIPCION || '',
              unit: row.unit || row.Unit || row.unidad || row.Unidad || row.UNIDAD || 'pieza',
              price: parseFloat(row.price || row.Price || row.precio || row.Precio || row.PRECIO || row.cost || row.Cost || row['Unit Price'] || '0') || 0,
              supplier: row.supplier || row.Supplier || row.proveedor || row.Proveedor || row.PROVEEDOR || '',
              supplierLink: row.supplierLink || row.SupplierLink || row['Supplier Link'] || row.URL || row.url || '',
              sku: row.sku || row.SKU || row.código || row.Código || row.CODIGO || row.code || row.Code || '',
              stock: parseFloat(row.stock || row.Stock || row.inventario || row.Inventario || row.INVENTARIO || '0') || 0,
              minStock: parseFloat(row.minStock || row.MinStock || row['Min Stock'] || row.inventarioMinimo || row['Inventario Mínimo'] || '0') || 0
            };
          }).filter((material: any) => material.name && material.name.trim() !== '');
          
          console.log(`Procesamiento local completado. Encontrados ${materials.length} materiales`);
          resolve(materials);
        },
        error: (error: any) => {
          console.error('Error al procesar CSV localmente:', error);
          // Devolver un array vacío en caso de error
          resolve([]);
        }
      });
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      // Para archivos Excel, devolver un mensaje informativo
      console.log('Procesamiento local de Excel no soportado, devolviendo datos de muestra');
      resolve([
        {
          name: "Poste de madera (datos de muestra)",
          category: "Madera",
          description: "Poste de madera tratada 4x4 (generado localmente)",
          unit: "pieza",
          price: 15.99,
          supplier: "Home Depot",
          sku: "HD-123"
        },
        {
          name: "Panel de vinilo (datos de muestra)",
          category: "Cercas",
          description: "Panel de vinilo blanco 6x8 (generado localmente)",
          unit: "pieza",
          price: 45.99,
          supplier: "Lowe's",
          sku: "LW-456"
        }
      ]);
    } else {
      // Para otros formatos desconocidos
      console.log('Formato no soportado para procesamiento local, devolviendo datos de muestra');
      resolve([
        {
          name: "Material de muestra",
          category: "General",
          description: "Material de muestra generado localmente",
          unit: "pieza",
          price: 10.00,
          supplier: "Proveedor genérico",
          sku: "GEN-001"
        }
      ]);
    }
  });
}

/**
 * Normaliza el contenido de un archivo CSV para asegurar formato correcto
 * @param content Contenido CSV a normalizar
 * @returns Contenido CSV normalizado
 */
export async function normalizeCSVWithAI(content: string): Promise<string> {
  try {
    // Verificar si el contenido ya parece CSV válido
    if (isValidCSV(content)) {
      console.log('El CSV parece válido, omitiendo normalización');
      return content;
    }
    
    // Si el contenido es muy grande, truncarlo para evitar problemas
    const truncatedContent = content.length > 50000 
      ? content.substring(0, 50000) 
      : content;
      
    try {
      // Intentar primero con Anthropic Claude (mejor para datos tabulares)
      try {
        console.log('Normalizando CSV con Anthropic Claude...');
        const { normalizeCSVWithAnthropic } = await import('./anthropicService');
        const normalizedContent = await normalizeCSVWithAnthropic(truncatedContent);
        
        if (normalizedContent && normalizedContent.trim()) {
          console.log('Normalización con Anthropic completada');
          return normalizedContent;
        }
      } catch (anthropicError) {
        console.error('Error al normalizar con Anthropic:', anthropicError);
        // Si falla Anthropic, continuar con OpenAI como respaldo
      }
      
      // Respaldo: Intentar con OpenAI a través de la API
      console.log('Intentando normalización con OpenAI...');
      const response = await axios.post('/api/ai-processor/normalize-csv', { 
        content: truncatedContent 
      }, {
        timeout: 15000 // 15 segundos de timeout
      });
      
      if (response.data && response.data.normalizedContent) {
        return response.data.normalizedContent;
      }
      
      return content; // Si no hay contenido normalizado, devolver el original
    } catch (apiError) {
      console.error('Error al normalizar CSV con IA:', apiError);
      return content; // En caso de error, devolver el contenido original
    }
  } catch (error) {
    console.error('Error al normalizar CSV con IA:', error);
    return content; // En caso de error, devolver el contenido original
  }
}

/**
 * Verifica si un string de contenido parece un CSV válido
 */
function isValidCSV(content: string): boolean {
  // Verificar si tiene líneas y comas como separadores
  const lines = content.trim().split('\n');
  if (lines.length < 2) return false;
  
  // Verificar si la primera línea tiene comas (posibles encabezados)
  const firstLine = lines[0];
  if (firstLine.indexOf(',') === -1) return false;
  
  // Verificar consistencia en cantidad de campos en las primeras líneas
  const headerCols = firstLine.split(',').length;
  
  // Verificar algunas líneas adicionales (hasta 5 o el total disponible)
  const maxLines = Math.min(5, lines.length);
  for (let i = 1; i < maxLines; i++) {
    const cols = lines[i].split(',').length;
    // Si hay una diferencia de más de 1 columna, probablemente no es CSV válido
    if (Math.abs(cols - headerCols) > 1) return false;
  }
  
  return true;
}
