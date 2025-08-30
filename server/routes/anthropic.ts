import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { userMappingService } from '../services/userMappingService';

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
 * 🔐 CRITICAL SECURITY FIX: Agregado verifyFirebaseAuth para proteger API de IA costosa
 */
router.post('/analyze-csv', verifyFirebaseAuth, async (req, res) => {
  try {
    // 🔐 CRITICAL SECURITY FIX: Solo usuarios autenticados pueden usar API de IA costosa
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado' 
      });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ 
        error: 'Error creando mapeo de usuario' 
      });
    }
    console.log(`🔐 [SECURITY] Analyzing CSV with Anthropic for REAL user_id: ${userId}`);
    
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
    const messageContent = response.content[0];
    let content = '';
    
    if ('text' in messageContent) {
      content = messageContent.text;
    } else {
      return res.status(500).json({ 
        error: 'Formato de respuesta de Claude no reconocido'
      });
    }
    
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
      const materials = result.materials.map((material: any) => ({
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
      })).filter((m: any) => m.name && m.name.trim() !== '');
      
      return res.json({ materials });
    } catch (error: unknown) {
      console.error('Error al parsear respuesta JSON de Claude:', error);
      return res.status(500).json({ 
        error: 'Error al parsear respuesta JSON',
        rawResponse: content
      });
    }
  } catch (error: unknown) {
    console.error('Error al analizar CSV con Anthropic:', error);
    return res.status(500).json({ 
      error: 'Error al procesar el archivo CSV con Anthropic',
      message: error instanceof Error ? error.message : 'Error desconocido'
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
    
    // Extraer la respuesta de Claude
    const messageContent = response.content[0];
    let normalizedContent = '';
    
    if ('text' in messageContent) {
      normalizedContent = messageContent.text.trim();
    } else {
      return res.status(500).json({ 
        error: 'Formato de respuesta de Claude no reconocido'
      });
    }
    
    // Limpiar posibles backticks que Claude podría haber incluido
    const cleanContent = normalizedContent.replace(/^\`\`\`csv\n|\`\`\`$/g, '');
    
    return res.json({ normalizedContent: cleanContent });
  } catch (error: unknown) {
    console.error('Error al normalizar CSV con Anthropic:', error);
    return res.status(500).json({ 
      error: 'Error al normalizar CSV con Anthropic',
      message: error instanceof Error ? error.message : 'Error desconocido'
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
    const messageContent = response.content[0];
    let content = '';
    
    if ('text' in messageContent) {
      content = messageContent.text;
    } else {
      return res.status(500).json({ 
        error: 'Formato de respuesta de Claude no reconocido'
      });
    }
    
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
      const materials = result.materials.map((material: any) => ({
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
      })).filter((m: any) => m.name && m.name.trim() !== '');
      
      return res.json({ materials });
    } catch (error: unknown) {
      console.error('Error al parsear respuesta JSON de Claude:', error);
      return res.status(500).json({ 
        error: 'Error al parsear respuesta JSON',
        rawResponse: content
      });
    }
  } catch (error: unknown) {
    console.error('Error al extraer materiales con Anthropic:', error);
    return res.status(500).json({ 
      error: 'Error al extraer materiales con Anthropic',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Contract Generation Endpoint
 */
router.post('/generate-contract', async (req, res) => {
  try {
    const { contractData } = req.body;

    if (!contractData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Contract data is required' 
      });
    }

    console.log('🛡️ Generating defensive contract with Anthropic...');

    // Create a comprehensive prompt for contract generation
    const prompt = `You are an expert construction contract attorney specializing in contractor protection. Generate a complete, professional HTML contract based on the following project data:

Client: ${contractData.clientName}
Client Email: ${contractData.clientEmail}
Client Phone: ${contractData.clientPhone}
Project Address: ${contractData.clientAddress || contractData.projectLocation}
Project Type: ${contractData.projectType}
Project Description: ${contractData.projectDescription}
Total Amount: ${contractData.totalAmount}
Contractor: ${contractData.contractorName}
Start Date: ${contractData.startDate}

Create a comprehensive construction contract that includes:
1. Complete project scope and specifications
2. Payment terms with deposit and milestone structure
3. Change order procedures with written authorization requirements
4. Lien rights and mechanics' lien provisions
5. Liability limitations and insurance requirements
6. Force majeure and weather delay clauses
7. Dispute resolution procedures
8. Completion timeline and delay penalties
9. Material and labor warranties
10. Termination and cancellation clauses

The contract must prioritize contractor protection while maintaining legal enforceability. Use professional formatting with proper HTML structure and inline CSS styling for a clean, professional appearance.

Return only the complete HTML document, starting with <!DOCTYPE html>.`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      let html = content.text;
      
      // Extract HTML if wrapped in markdown
      const htmlMatch = html.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
      if (htmlMatch) {
        html = htmlMatch[0];
      }

      console.log('✅ Contract generated successfully');
      
      res.json({
        success: true,
        html: html,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'claude-3-5-sonnet-20241022'
        }
      });
    } else {
      throw new Error('Unexpected response format from Anthropic');
    }

  } catch (error) {
    console.error('❌ Contract generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;