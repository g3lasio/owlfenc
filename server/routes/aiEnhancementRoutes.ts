import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { enhanceProjectDescription, createFallbackEnhancement } from '../services/projectDescriptionAI';
import OpenAI from 'openai';

const router = Router();

// Schema para validar la entrada
const enhanceRequestSchema = z.object({
  originalText: z.string().min(5, 'El texto debe tener al menos 5 caracteres'),
  projectType: z.string().optional().default('general')
});

/**
 * POST /api/project/enhance-description
 * Mejora una descripción de proyecto usando OpenAI GPT-4
 */
router.post('/enhance-description', async (req: Request, res: Response) => {
  try {
    console.log('=== NUEVA SOLICITUD DE MEJORA DE DESCRIPCIÓN ===');
    console.log('📥 Datos recibidos:', req.body);

    // Validar entrada
    const validatedData = enhanceRequestSchema.parse(req.body);
    const { originalText, projectType } = validatedData;

    console.log('✅ Datos validados:', { originalText: originalText.substring(0, 50) + '...', projectType });

    // Intentar mejora con OpenAI
    try {
      console.log('🚀 Iniciando mejora con OpenAI GPT-4...');
      
      const enhancement = await enhanceProjectDescription({
        originalText,
        projectType
      });

      console.log('✅ Mejora completada exitosamente');
      console.log('📏 Longitud de descripción mejorada:', enhancement.enhancedDescription.length);
      console.log('🔹 Número de bullet points:', enhancement.bulletPoints.length);

      res.json({
        success: true,
        enhancedDescription: enhancement.enhancedDescription,
        bulletPoints: enhancement.bulletPoints,
        professionalSummary: enhancement.professionalSummary,
        source: 'openai-gpt4'
      });

    } catch (aiError) {
      console.warn('⚠️ Error con OpenAI, usando método de respaldo:', aiError.message);

      // Usar método de respaldo si OpenAI falla
      const fallbackEnhancement = createFallbackEnhancement(originalText);

      res.json({
        success: true,
        enhancedDescription: fallbackEnhancement.enhancedDescription,
        bulletPoints: fallbackEnhancement.bulletPoints,
        professionalSummary: fallbackEnhancement.professionalSummary,
        source: 'fallback',
        warning: 'Se usó método de respaldo debido a un error con el servicio de IA'
      });
    }

  } catch (error) {
    console.error('❌ Error en enhance-description:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

// Schema para validar solicitudes de mejora de proyecto
const projectEnhanceSchema = z.object({
  prompt: z.string().min(10, 'El prompt debe tener al menos 10 caracteres'),
  field: z.string().min(1, 'El campo es requerido'),
  context: z.object({
    description: z.string(),
    client: z.string(),
    materials: z.string(),
    totalValue: z.number()
  })
});

/**
 * POST /api/ai/enhance-project
 * Mejora campos específicos de un proyecto usando IA
 */
router.post('/enhance-project', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Nueva solicitud de mejora de proyecto con IA');
    console.log('📥 Datos recibidos:', req.body);

    // Validar entrada
    const validatedData = projectEnhanceSchema.parse(req.body);
    const { prompt, field, context } = validatedData;

    console.log('✅ Datos validados:', { field, contextDescription: context.description.substring(0, 50) + '...' });

    // Inicializar OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key no configurada');
    }

    console.log('🤖 Procesando con OpenAI GPT-4...');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a professional contractor expert with over 20 years of experience in construction and estimates. You generate accurate and professional technical content for project estimates. Always respond in English."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content?.trim();

    if (!content) {
      throw new Error('No se pudo generar contenido');
    }

    console.log('✅ Contenido generado exitosamente');
    console.log('📏 Longitud del contenido:', content.length);

    res.json({
      success: true,
      enhancedContent: content,
      field,
      source: 'openai-gpt4o',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error procesando proyecto con IA:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.errors
      });
    }

    // Error específico de OpenAI
    if (error.code === 'insufficient_quota' || error.code === 'invalid_api_key') {
      return res.status(401).json({
        success: false,
        error: 'Error de autenticación con OpenAI',
        message: 'API key inválida o cuota insuficiente'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: error.message
    });
  }
});

export { router as aiEnhancementRoutes };