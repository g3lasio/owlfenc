import OpenAI from "openai";

// El modelo más reciente de OpenAI es "gpt-4o" que fue lanzado el 13 de mayo de 2024. 
// No cambiar a menos que el usuario lo solicite explícitamente
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY
});

interface MaterialFieldMapping {
  name: string;
  category: string;
  description?: string;
  unit: string;
  price: number;
  supplier?: string;
  supplierLink?: string;
  sku?: string;
  stock?: number;
  minStock?: number;
}

interface ProcessedMaterial {
  name: string;
  category: string;
  description: string;
  unit: string;
  price: number;
  supplier: string;
  supplierLink: string;
  sku: string;
  stock: number;
  minStock: number;
}

/**
 * Analiza un archivo CSV/Excel y extrae información estructurada sobre materiales
 * @param fileContent Contenido del archivo en formato texto
 * @param fileType Tipo de archivo (csv, excel, etc.)
 * @returns Arreglo de materiales procesados
 */
export async function processMaterialFile(fileContent: string, fileType: string): Promise<ProcessedMaterial[]> {
  try {
    // Determinar si hay encabezados en el archivo
    const hasHeaders = await detectHeaders(fileContent, fileType);
    
    // Analizar estructura de columnas con IA
    const columnMapping = await analyzeFileColumns(fileContent, fileType, hasHeaders);
    
    // Extraer y procesar los datos con la información de mapeo
    const materials = extractMaterialsFromFile(fileContent, columnMapping, hasHeaders);
    
    return materials;
  } catch (error) {
    console.error("Error al procesar archivo con IA:", error);
    throw new Error("No se pudo procesar el archivo. Verifica el formato e intenta nuevamente.");
  }
}

/**
 * Detecta si el archivo tiene encabezados
 */
async function detectHeaders(fileContent: string, fileType: string): Promise<boolean> {
  try {
    const lines = fileContent.split('\n');
    if (lines.length < 2) return false;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: "Eres un asistente especializado en análisis de datos. Tu tarea es determinar si la primera línea de un archivo representa encabezados de columna."
        },
        {
          role: "user",
          content: `Analiza la primera línea de este archivo ${fileType} y determina si son encabezados de columna. 
          Responde únicamente con "true" si son encabezados o "false" si parecen ser datos.
          
          Primera línea: ${lines[0]}
          Segunda línea: ${lines[1]}`
        }
      ],
    });
    
    const result = response.choices[0].message.content?.trim().toLowerCase();
    return result === 'true';
  } catch (error) {
    console.error("Error al detectar encabezados:", error);
    // Por defecto, asumimos que sí hay encabezados
    return true;
  }
}

/**
 * Analiza las columnas del archivo y determina qué campos corresponden a qué propiedades
 */
async function analyzeFileColumns(fileContent: string, fileType: string, hasHeaders: boolean): Promise<MaterialFieldMapping> {
  try {
    const lines = fileContent.split('\n');
    const sampleLines = lines.slice(0, Math.min(5, lines.length)).join('\n');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: `Eres un asistente especializado en análisis y mapeo de datos. Tu tarea es analizar un archivo ${fileType} 
          y determinar qué columnas corresponden a qué campos en un sistema de inventario de materiales.`
        },
        {
          role: "user",
          content: `Analiza las primeras líneas de este archivo ${fileType} y mapea las columnas a los siguientes campos de un material:
          
          - name: Nombre del material o producto
          - category: Categoría del material (ej: madera, metal, pintura)
          - description: Descripción del material
          - unit: Unidad de medida (ej: pieza, metro, kg)
          - price: Precio unitario
          - supplier: Nombre del proveedor
          - supplierLink: Enlace/URL del proveedor
          - sku: Código o referencia del producto
          - stock: Cantidad en inventario
          - minStock: Cantidad mínima de inventario
          
          ${hasHeaders ? 'La primera línea contiene los encabezados.' : 'El archivo no tiene encabezados.'}
          
          Muestra de datos:
          ${sampleLines}
          
          Responde con un objeto JSON donde las claves son los campos mencionados y los valores son los índices o nombres de las columnas correspondientes. 
          Si un campo no está presente, asigna null. Formato esperado: { "name": "columna_1", "category": "columna_3", ... }`
        }
      ],
      response_format: { type: "json_object" },
    });
    
    const mapping = JSON.parse(response.choices[0].message.content || "{}");
    return mapping;
  } catch (error) {
    console.error("Error al analizar columnas:", error);
    throw new Error("No se pudo analizar la estructura del archivo.");
  }
}

/**
 * Extrae materiales del contenido del archivo usando el mapeo de columnas
 */
function extractMaterialsFromFile(
  fileContent: string, 
  columnMapping: MaterialFieldMapping, 
  hasHeaders: boolean
): ProcessedMaterial[] {
  const lines = fileContent.split('\n');
  const dataStartIndex = hasHeaders ? 1 : 0;
  const materials: ProcessedMaterial[] = [];
  
  // Convertir los nombres de columnas a índices si es necesario
  const headerRow = hasHeaders ? lines[0].split(',').map(h => h.trim()) : [];
  const columnIndices: Record<string, number> = {};
  
  for (const [field, columnName] of Object.entries(columnMapping)) {
    if (typeof columnName === 'number') {
      columnIndices[field] = columnName;
    } else if (typeof columnName === 'string' && hasHeaders) {
      const index = headerRow.indexOf(columnName);
      columnIndices[field] = index > -1 ? index : -1;
    } else {
      columnIndices[field] = -1;
    }
  }
  
  // Procesar cada línea de datos
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(',').map(c => c.trim());
    
    // Crear objeto de material con valores predeterminados
    const material: ProcessedMaterial = {
      name: '',
      category: '',
      description: '',
      unit: '',
      price: 0,
      supplier: '',
      supplierLink: '',
      sku: '',
      stock: 0,
      minStock: 0
    };
    
    // Asignar valores según el mapeo
    for (const [field, index] of Object.entries(columnIndices)) {
      if (index >= 0 && index < columns.length) {
        const value = columns[index];
        
        if (field === 'price' || field === 'stock' || field === 'minStock') {
          // Convertir a número, eliminando posibles símbolos de moneda
          const numValue = parseFloat(value.replace(/[^0-9.-]+/g, ''));
          if (!isNaN(numValue)) {
            // @ts-ignore: Asignación dinámica
            material[field] = numValue;
          }
        } else {
          // @ts-ignore: Asignación dinámica
          material[field] = value;
        }
      }
    }
    
    // Solo agregar si tiene al menos nombre y categoría
    if (material.name && material.category) {
      materials.push(material);
    }
  }
  
  return materials;
}

/**
 * Detecta y corrige formato de archivo CSV para asegurar que sea válido
 */
export async function normalizeCSVContent(content: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: "Eres un asistente especializado en procesamiento de archivos CSV. Tu tarea es normalizar contenido CSV para asegurar que tenga un formato válido."
        },
        {
          role: "user",
          content: `Normaliza el siguiente contenido CSV para asegurar que:
          1. Usa comas como separador
          2. Las líneas terminan con saltos de línea adecuados
          3. Los valores con comas están correctamente entrecomillados
          4. No hay errores de formato
          
          Contenido:
          ${content.substring(0, 8000)} // Limitamos a 8000 caracteres para evitar límites de token
          
          Devuelve solo el CSV normalizado, sin explicaciones.`
        }
      ]
    });
    
    return response.choices[0].message.content || content;
  } catch (error) {
    console.error("Error al normalizar CSV:", error);
    return content; // En caso de error, devolver el contenido original
  }
}

/**
 * Procesa un archivo Excel convertido a texto (puede ser JSON o CSV)
 */
export async function processExcelContent(content: string): Promise<ProcessedMaterial[]> {
  try {
    // Convertir el contenido Excel a un formato que podamos procesar
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: "Eres un asistente especializado en procesamiento de datos. Tu tarea es convertir datos de Excel a un formato JSON estructurado."
        },
        {
          role: "user",
          content: `Convierte los siguientes datos (posiblemente de Excel) a un array JSON de objetos de materiales.
          Cada objeto debe tener estas propiedades: name, category, description, unit, price, supplier, supplierLink, sku, stock, minStock.
          
          Datos:
          ${content.substring(0, 8000)}
          
          Responde con un array JSON válido.`
        }
      ],
      response_format: { type: "json_object" },
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return Array.isArray(result.materials) ? result.materials : [];
  } catch (error) {
    console.error("Error al procesar Excel:", error);
    throw new Error("No se pudo procesar el archivo Excel.");
  }
}