import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();

// Inicializar el cliente de Anthropic
// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Endpoint para analizar un archivo CSV utilizando Anthropic Claude
 * 
 * Este endpoint recibe el contenido de un archivo CSV y utiliza el modelo Claude
 * para analizar y estructurar los datos de materiales contenidos en él.
 */
router.post('/analyze-csv', async (req, res) => {
  try {
    const { csvContent } = req.body;
    
    if (!csvContent) {
      return res.status(400).json({ error: 'No se proporcionó contenido CSV' });
    }
    
    // Crear el prompt para Anthropic Claude
    const prompt = `
Analiza este archivo CSV que contiene datos de materiales para construcción de cercas. 
Extrae toda la información disponible y devuélvela como un array de objetos JSON.

El CSV comienza aquí:
\`\`\`
${csvContent}
\`\`\`

Para cada línea del CSV, crea un objeto con estas propiedades:
- name: Nombre del material (requerido)
- category: Categoría del material (ej: Madera, Metal, Cercas, etc.)
- description: Descripción del material
- unit: Unidad de medida (ej: pieza, metro, pie, etc.)
- price: Precio unitario (numérico)
- supplier: Nombre del proveedor
- supplierLink: URL del proveedor o página del producto
- sku: Código o SKU del producto
- stock: Cantidad en stock (numérico)
- minStock: Stock mínimo requerido (numérico)

Responde SOLAMENTE con un objeto JSON válido con esta estructura:
{
  "materials": [
    {
      "name": "Nombre del material 1",
      "category": "Categoría 1",
      "description": "Descripción 1",
      "unit": "unidad1",
      "price": 10.99,
      "supplier": "Proveedor 1",
      "supplierLink": "https://ejemplo.com/producto1",
      "sku": "SKU123",
      "stock": 50,
      "minStock": 10
    },
    // más materiales...
  ]
}

Si hay problemas con el formato CSV, haz tu mejor esfuerzo para extraer la información.
Si una propiedad no está disponible, usa un valor predeterminado apropiado.
IMPORTANTE: Cualquier valor numérico debe ser un número, no un string.
`;

    // Llamar a la API de Claude
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 4000,
      temperature: 0,
      messages: [
        { role: "user", content: prompt }
      ],
    });
    
    // Extraer la respuesta de Claude
    const content = response.content[0].text;
    
    // Intentar parsear la respuesta JSON
    try {
      // Buscar la estructura JSON en la respuesta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ 
          error: 'No se pudo extraer JSON de la respuesta de Claude',
          rawResponse: content
        });
      }
      
      const jsonStr = jsonMatch[0];
      const result = JSON.parse(jsonStr);
      
      if (!result.materials || !Array.isArray(result.materials)) {
        return res.status(500).json({ 
          error: 'Formato de respuesta inválido',
          rawResponse: content,
          parsedResponse: result
        });
      }
      
      // Validar y limpiar cada material
      const materials = result.materials.map(material => ({
        name: material.name || '',
        category: material.category || '',
        description: material.description || '',
        unit: material.unit || 'pieza',
        price: typeof material.price === 'number' ? material.price : parseFloat(material.price || '0') || 0,
        supplier: material.supplier || '',
        supplierLink: material.supplierLink || '',
        sku: material.sku || '',
        stock: typeof material.stock === 'number' ? material.stock : parseFloat(material.stock || '0') || 0,
        minStock: typeof material.minStock === 'number' ? material.minStock : parseFloat(material.minStock || '0') || 0
      })).filter(m => m.name && m.name.trim() !== '');
      
      return res.json({ materials });
    } catch (parseError) {
      console.error('Error al parsear respuesta JSON de Claude:', parseError);
      return res.status(500).json({ 
        error: 'Error al parsear respuesta JSON',
        rawResponse: content
      });
    }
  } catch (error) {
    console.error('Error al analizar CSV con Anthropic:', error);
    return res.status(500).json({ 
      error: 'Error al procesar el archivo CSV con Anthropic',
      message: error.message
    });
  }
});

/**
 * Endpoint para normalizar un archivo CSV potencialmente mal formateado
 */
router.post('/normalize-csv', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'No se proporcionó contenido para normalizar' });
    }
    
    // Crear el prompt para Anthropic Claude
    const prompt = `
Tengo un archivo CSV que puede estar mal formateado. Por favor, normaliza este contenido
para que sea un CSV válido y bien estructurado.

El contenido es:
\`\`\`
${content}
\`\`\`

Por favor, realiza las siguientes tareas:
1. Identifica las columnas/encabezados
2. Asegúrate de que todas las filas tengan el mismo número de columnas
3. Alinea correctamente los valores en las columnas apropiadas
4. Asegúrate de que el formato sea CSV estándar (valores separados por comas)
5. Si hay campos que contienen comas, asegúrate de que estén entre comillas

Responde SOLAMENTE con el CSV normalizado, sin explicaciones adicionales.
`;

    // Llamar a la API de Claude
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 4000,
      temperature: 0,
      messages: [
        { role: "user", content: prompt }
      ],
    });
    
    // Extraer la respuesta de Claude (asumiendo que es texto CSV limpio)
    const normalizedContent = response.content[0].text.trim();
    
    // Limpiar posibles backticks que Claude podría haber incluido
    const cleanContent = normalizedContent.replace(/^\`\`\`csv\n|\`\`\`$/g, '');
    
    return res.json({ normalizedContent: cleanContent });
  } catch (error) {
    console.error('Error al normalizar CSV con Anthropic:', error);
    return res.status(500).json({ 
      error: 'Error al normalizar CSV con Anthropic',
      message: error.message
    });
  }
});

/**
 * Endpoint para extraer información de materiales desde texto no estructurado
 */
router.post('/extract-materials', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No se proporcionó texto para analizar' });
    }
    
    // Crear el prompt para Anthropic Claude
    const prompt = `
Analiza este texto que contiene información sobre materiales de construcción para cercas.
Extrae todos los materiales mencionados y devuélvelos como un array de objetos JSON.

El texto es:
\`\`\`
${text}
\`\`\`

Para cada material mencionado, crea un objeto con estas propiedades:
- name: Nombre del material (requerido)
- category: Categoría del material (ej: Madera, Metal, Cercas, etc.)
- description: Descripción del material
- unit: Unidad de medida (ej: pieza, metro, pie, etc.)
- price: Precio unitario (numérico)
- supplier: Nombre del proveedor
- supplierLink: URL del proveedor o página del producto
- sku: Código o SKU del producto
- stock: Cantidad en stock (numérico)
- minStock: Stock mínimo requerido (numérico)

Responde SOLAMENTE con un objeto JSON válido con esta estructura:
{
  "materials": [
    {
      "name": "Nombre del material 1",
      "category": "Categoría 1",
      "description": "Descripción 1",
      "unit": "unidad1",
      "price": 10.99,
      "supplier": "Proveedor 1",
      "supplierLink": "https://ejemplo.com/producto1",
      "sku": "SKU123",
      "stock": 50,
      "minStock": 10
    },
    // más materiales...
  ]
}

Si una propiedad no está disponible en el texto, usa un valor predeterminado apropiado.
IMPORTANTE: Cualquier valor numérico debe ser un número, no un string.
`;

    // Llamar a la API de Claude
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 4000,
      temperature: 0,
      messages: [
        { role: "user", content: prompt }
      ],
    });
    
    // Extraer la respuesta de Claude
    const content = response.content[0].text;
    
    // Intentar parsear la respuesta JSON
    try {
      // Buscar la estructura JSON en la respuesta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ 
          error: 'No se pudo extraer JSON de la respuesta de Claude',
          rawResponse: content
        });
      }
      
      const jsonStr = jsonMatch[0];
      const result = JSON.parse(jsonStr);
      
      if (!result.materials || !Array.isArray(result.materials)) {
        return res.status(500).json({ 
          error: 'Formato de respuesta inválido',
          rawResponse: content,
          parsedResponse: result
        });
      }
      
      // Validar y limpiar cada material
      const materials = result.materials.map(material => ({
        name: material.name || '',
        category: material.category || '',
        description: material.description || '',
        unit: material.unit || 'pieza',
        price: typeof material.price === 'number' ? material.price : parseFloat(material.price || '0') || 0,
        supplier: material.supplier || '',
        supplierLink: material.supplierLink || '',
        sku: material.sku || '',
        stock: typeof material.stock === 'number' ? material.stock : parseFloat(material.stock || '0') || 0,
        minStock: typeof material.minStock === 'number' ? material.minStock : parseFloat(material.minStock || '0') || 0
      })).filter(m => m.name && m.name.trim() !== '');
      
      return res.json({ materials });
    } catch (parseError) {
      console.error('Error al parsear respuesta JSON de Claude:', parseError);
      return res.status(500).json({ 
        error: 'Error al parsear respuesta JSON',
        rawResponse: content
      });
    }
  } catch (error) {
    console.error('Error al extraer materiales con Anthropic:', error);
    return res.status(500).json({ 
      error: 'Error al extraer materiales con Anthropic',
      message: error.message
    });
  }
});

export default router;