import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// DeepSearch AI endpoint
router.post('/deepsearch-ai', async (req, res) => {
  try {
    const { option, projectDescription, clientInfo } = req.body;
    
    console.log('🤖 DeepSearch AI request:', { option, projectDescription: projectDescription?.substring(0, 100) });
    
    if (!option || !projectDescription) {
      return res.status(400).json({ error: 'Falta option o projectDescription' });
    }

    let systemPrompt = '';
    let userPrompt = '';
    
    // Configure prompts based on option
    switch (option) {
      case 'materials-labor':
        systemPrompt = `Eres un experto en construcción y estimación de costos especializado en proyectos de construcción y cercas. 
        Analiza la descripción del proyecto y proporciona recomendaciones precisas para materiales y mano de obra.
        
        Responde SOLO en formato JSON válido con la siguiente estructura:
        {
          "materials": [
            {
              "name": "string",
              "description": "string",
              "quantity": number,
              "unit": "string", 
              "estimatedPrice": number,
              "category": "string",
              "reason": "string"
            }
          ],
          "laborCosts": [
            {
              "task": "string",
              "description": "string",
              "estimatedHours": number,
              "hourlyRate": number,
              "totalCost": number,
              "category": "string"
            }
          ],
          "totalMaterialCost": number,
          "totalLaborCost": number,
          "totalProjectCost": number,
          "recommendations": ["string"]
        }`;
        break;
        
      case 'materials-only':
        systemPrompt = `Eres un experto en construcción especializado en selección y estimación de materiales.
        Analiza la descripción del proyecto y proporciona recomendaciones precisas SOLO para materiales.
        
        Responde SOLO en formato JSON válido con la siguiente estructura:
        {
          "materials": [
            {
              "name": "string",
              "description": "string",
              "quantity": number,
              "unit": "string",
              "estimatedPrice": number,
              "category": "string",
              "reason": "string"
            }
          ],
          "laborCosts": [],
          "totalMaterialCost": number,
          "totalLaborCost": 0,
          "totalProjectCost": number,
          "recommendations": ["string"]
        }`;
        break;
        
      case 'labor-only':
        systemPrompt = `Eres un experto en construcción especializado en estimación de mano de obra.
        Analiza la descripción del proyecto y proporciona recomendaciones precisas SOLO para costos de mano de obra.
        
        Responde SOLO en formato JSON válido con la siguiente estructura:
        {
          "materials": [],
          "laborCosts": [
            {
              "task": "string",
              "description": "string",
              "estimatedHours": number,
              "hourlyRate": number,
              "totalCost": number,
              "category": "string"
            }
          ],
          "totalMaterialCost": 0,
          "totalLaborCost": number,
          "totalProjectCost": number,
          "recommendations": ["string"]
        }`;
        break;
        
      default:
        return res.status(400).json({ error: 'Opción no válida' });
    }
    
    userPrompt = `Proyecto: ${projectDescription}
    
    ${clientInfo ? `Cliente: ${clientInfo.name} - ${clientInfo.address || 'Dirección no especificada'}` : ''}
    
    Por favor analiza este proyecto y proporciona recomendaciones detalladas usando precios realistas de mercado 2025.
    
    Instrucciones específicas:
    - Usa precios realistas de mercado estadounidense 2025
    - Incluye cantidades precisas basadas en la descripción del proyecto
    - Proporciona razones detalladas para cada recomendación
    - Usa unidades estándar de construcción (ft, sq ft, yds, etc.)
    - Para mano de obra, usa tarifas competitivas por hora según la especialidad
    - Incluye recomendaciones adicionales para mejorar el proyecto
    
    Responde ÚNICAMENTE con el JSON válido, sin texto adicional.`;
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
      temperature: 0.7,
    });
    
    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('No se recibió contenido de OpenAI');
    }
    
    let recommendation;
    try {
      recommendation = JSON.parse(content);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      throw new Error('Error al parsear la respuesta de OpenAI');
    }
    
    // Validate and ensure required fields exist
    if (!recommendation.materials) recommendation.materials = [];
    if (!recommendation.laborCosts) recommendation.laborCosts = [];
    if (!recommendation.recommendations) recommendation.recommendations = [];
    
    // Calculate totals if missing
    if (!recommendation.totalMaterialCost) {
      recommendation.totalMaterialCost = recommendation.materials.reduce(
        (sum: number, material: any) => sum + (material.estimatedPrice * material.quantity), 0
      );
    }
    
    if (!recommendation.totalLaborCost) {
      recommendation.totalLaborCost = recommendation.laborCosts.reduce(
        (sum: number, labor: any) => sum + labor.totalCost, 0
      );
    }
    
    if (!recommendation.totalProjectCost) {
      recommendation.totalProjectCost = recommendation.totalMaterialCost + recommendation.totalLaborCost;
    }
    
    console.log('✅ DeepSearch AI response generated successfully');
    console.log('📊 Total Materials:', recommendation.materials.length);
    console.log('⚡ Total Labor Tasks:', recommendation.laborCosts.length);
    console.log('💰 Total Project Cost:', recommendation.totalProjectCost);
    
    res.json(recommendation);
    
  } catch (error) {
    console.error('❌ Error in DeepSearch AI:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;