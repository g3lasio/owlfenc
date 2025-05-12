import { Router } from 'express';
import OpenAI from 'openai';

// Inicializar cliente de OpenAI con la API key del entorno
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const router = Router();

// Endpoint para analizar archivos CSV/Excel y extraer materiales
router.post('/analyze-file', async (req, res) => {
  try {
    const { fileContent, fileType } = req.body;
    
    if (!fileContent) {
      return res.status(400).json({ error: 'No se proporcionó contenido de archivo' });
    }
    
    // Detectar encabezados
    const hasHeaders = await detectHeaders(fileContent, fileType);
    
    // Analizar estructura de columnas
    const columnMapping = await analyzeFileColumns(fileContent, fileType, hasHeaders);
    
    // Extraer materiales del archivo
    const materials = extractMaterialsFromFile(fileContent, columnMapping, hasHeaders);
    
    return res.json({ materials });
  } catch (error) {
    console.error('Error procesando archivo con IA:', error);
    return res.status(500).json({ error: 'Error al procesar el archivo' });
  }
});

// Endpoint para normalizar contenido CSV
router.post('/normalize-csv', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'No se proporcionó contenido' });
    }
    
    const normalizedContent = await normalizeCSVContent(content);
    return res.json({ normalizedContent });
  } catch (error) {
    console.error('Error normalizando CSV:', error);
    return res.status(500).json({ error: 'Error al normalizar el contenido CSV' });
  }
});

// Funciones auxiliares
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

async function analyzeFileColumns(fileContent: string, fileType: string, hasHeaders: boolean): Promise<any> {
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

function extractMaterialsFromFile(fileContent: string, columnMapping: any, hasHeaders: boolean): any[] {
  const lines = fileContent.split('\n');
  const dataStartIndex = hasHeaders ? 1 : 0;
  const materials: any[] = [];
  
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
    const material: any = {
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
            material[field] = numValue;
          }
        } else {
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

async function normalizeCSVContent(content: string): Promise<string> {
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

export default router;