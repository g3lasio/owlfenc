import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { enhanceProjectDescription, createFallbackEnhancement } from '../services/projectDescriptionAI';
import OpenAI from 'openai';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { userMappingService } from '../services/userMappingService';

const router = Router();

// Schema para validar la entrada
const enhanceRequestSchema = z.object({
  originalText: z.string().min(5, 'El texto debe tener al menos 5 caracteres'),
  projectType: z.string().optional().default('general')
});

/**
 * POST /api/project/enhance-description
 * Mejora una descripción de proyecto usando OpenAI GPT-4
 * 🔐 CRITICAL SECURITY FIX: Agregado verifyFirebaseAuth para proteger mejora de IA
 */
router.post('/enhance-description', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    console.log('=== NUEVA SOLICITUD DE MEJORA DE DESCRIPCIÓN ===');
    console.log('📥 Datos recibidos:', req.body);

    // 🔐 CRITICAL SECURITY FIX: Solo usuarios autenticados pueden usar mejora de IA costosa
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuario no autenticado' 
      });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ 
        success: false,
        error: 'Error creando mapeo de usuario' 
      });
    }
    console.log(`🔐 [SECURITY] AI enhancement for REAL user_id: ${userId}`);

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
    console.log('📝 Prompt enviado:', prompt.substring(0, 200) + '...');

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

    console.log('🔍 OpenAI Full Response:', JSON.stringify(completion, null, 2));
    console.log('🔍 Choices Array:', completion.choices);
    console.log('🔍 First Choice:', completion.choices[0]);
    console.log('🔍 Message Content:', completion.choices[0]?.message?.content);

    const content = completion.choices[0].message.content?.trim();

    if (!content) {
      console.error('❌ No content generated by OpenAI');
      console.error('❌ Full completion object:', completion);
      throw new Error('No content generated by AI');
    }

    console.log('✅ Contenido generado exitosamente');
    console.log('📏 Longitud del contenido:', content.length);
    console.log('📄 Contenido generado:', content.substring(0, 100) + '...');

    res.json({
      success: true,
      enhancedContent: content,
      field,
      source: 'openai-gpt4o',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error procesando proyecto con IA:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    // Always use fallback for now since we need to ensure functionality
    console.log('🔄 Using fallback due to error...');
    const fallbackContent = generateFallbackContent(field, context);
    
    res.json({
      success: true,
      enhancedContent: fallbackContent,
      field,
      source: 'fallback-professional',
      timestamp: new Date().toISOString(),
      warning: 'Generated using professional template'
    });
  }
});

// Professional fallback content generator
function generateFallbackContent(field: string, context: any): string {
  const projectDescription = context.description || 'fencing project';
  const clientName = context.client || 'the client';
  
  switch (field) {
    case 'scope':
      return `This comprehensive ${projectDescription} includes a thorough site assessment, professional installation of high-quality materials, and complete cleanup. We will prepare the work area, ensure proper drainage and leveling, install all components according to industry standards, and conduct final quality inspections to guarantee customer satisfaction.`;
    
    case 'timeline':
      return `Based on project complexity and site conditions, estimated completion time is 3-5 business days, weather permitting. This includes preparation, installation, and final inspection phases.`;
    
    case 'process':
      return `1. Initial site survey and marking\n2. Excavation and ground preparation\n3. Setting posts with proper spacing\n4. Installing primary materials and hardware\n5. Quality control and safety inspection\n6. Site cleanup and final walkthrough`;
    
    case 'includes':
      return `• All specified materials and hardware\n• Professional installation labor\n• Site preparation and cleanup\n• Basic permits (where applicable)\n• 1-year craftsmanship warranty\n• Final inspection and approval`;
    
    case 'excludes':
      return `• Electrical work or lighting\n• Landscaping or irrigation adjustments\n• Special permits beyond basic requirements\n• Repairs to existing structures\n• Additional modifications not specified`;
    
    case 'notes':
      return `Please ensure clear site access for equipment and materials. Any underground utilities should be marked prior to work commencement. Weather conditions may affect timeline. Final payment due upon project completion and approval.`;
    
    default:
      return `Professional ${field} content for ${projectDescription} tailored for ${clientName}. This work will be completed to the highest industry standards with attention to quality and customer satisfaction.`;
  }
}

export { router as aiEnhancementRoutes };