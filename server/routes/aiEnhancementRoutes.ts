import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { enhanceProjectDescription, createFallbackEnhancement } from '../services/projectDescriptionAI';

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

export { router as aiEnhancementRoutes };