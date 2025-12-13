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
    const userMapping = await userMappingService.getInternalUserId(firebaseUid);
    let userId = typeof userMapping === 'object' ? userMapping?.id : userMapping;
    if (!userId) {
      const newMapping = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      userId = typeof newMapping === 'object' ? newMapping?.id : newMapping;
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

    } catch (aiError: any) {
      console.warn('⚠️ Error con OpenAI, usando método de respaldo:', aiError?.message);

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
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });

    // Always use fallback for now since we need to ensure functionality
    console.log('🔄 Using fallback due to error...');
    const fallbackField = req.body?.field || 'general';
    const fallbackContext = req.body?.context || {};
    const fallbackContent = generateFallbackContent(fallbackField, fallbackContext);
    
    res.json({
      success: true,
      enhancedContent: fallbackContent,
      field: fallbackField,
      source: 'fallback-professional',
      timestamp: new Date().toISOString(),
      warning: 'Generated using professional template'
    });
  }
});

// Schema for Change Order AI Enhancement
const changeOrderEnhanceSchema = z.object({
  originalText: z.string().min(5, 'Description must have at least 5 characters'),
  costType: z.enum(['addition', 'deduction']),
  additionalCost: z.number(),
  adjustTimeline: z.boolean().default(false),
  newCompletionDate: z.string().optional(),
  originalContract: z.object({
    clientName: z.string().optional(),
    originalTotal: z.number().optional(),
    originalDate: z.string().optional(),
    projectType: z.string().optional(),
  }).optional(),
});

/**
 * POST /api/ai/enhance-change-order
 * AI Enhancement for Change Order descriptions
 * Transforms contractor notes into professional legal-style text
 * 🔐 SECURITY: Requires Firebase authentication
 */
router.post('/enhance-change-order', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    console.log('🔧 [CHANGE-ORDER-AI] New enhancement request');
    
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }
    
    const userMapping = await userMappingService.getInternalUserId(firebaseUid);
    let userId = typeof userMapping === 'object' ? userMapping?.id : userMapping;
    if (!userId) {
      const newMapping = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      userId = typeof newMapping === 'object' ? newMapping?.id : newMapping;
    }
    console.log(`🔐 [SECURITY] Change Order AI enhancement for user_id: ${userId}`);

    const validatedData = changeOrderEnhanceSchema.parse(req.body);
    const { originalText, costType, additionalCost, adjustTimeline, newCompletionDate, originalContract } = validatedData;

    console.log('✅ [CHANGE-ORDER-AI] Data validated, calling OpenAI...');

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const costImpactText = costType === 'addition' 
      ? `Additional cost of $${additionalCost.toLocaleString()}` 
      : `Credit/reduction of $${additionalCost.toLocaleString()}`;

    const timelineText = adjustTimeline && newCompletionDate 
      ? `New completion date: ${newCompletionDate}` 
      : 'No timeline changes';

    const systemPrompt = `You are a legal document specialist for construction contracts. Your task is to transform a contractor's brief notes into a professional, legally-sound Change Order description.

CRITICAL RULES:
1. DO NOT invent any materials, quantities, dates, or conditions that are not in the original text
2. ONLY reorganize, clarify, and legally formalize the existing information
3. Maintain factual accuracy - if something is unclear, phrase it generally rather than inventing details
4. Use professional legal language suitable for a contract amendment
5. Connect scope change → cost impact → timeline impact logically

OUTPUT FORMAT (use these exact section headers):
## CHANGE SUMMARY
[One sentence summary of the change]

## DETAILED SCOPE OF CHANGE
[Expand and clarify the contractor's notes into professional language]

## COST IMPACT
[State the financial adjustment clearly]

## SCHEDULE IMPACT
[State any timeline changes or confirm no changes]

## CONFIRMATION
All other terms and conditions of the original contract dated [ORIGINAL_DATE] remain unchanged and in full force and effect.`;

    const userPrompt = `Transform this contractor's change description into a professional Change Order document:

ORIGINAL CONTRACTOR NOTES:
"${originalText}"

FINANCIAL IMPACT:
- Type: ${costType === 'addition' ? 'Addition (+)' : 'Deduction (-)'}
- Amount: $${additionalCost.toLocaleString()}
${originalContract?.originalTotal ? `- Original Contract Value: $${originalContract.originalTotal.toLocaleString()}` : ''}

TIMELINE:
${timelineText}

${originalContract?.clientName ? `CLIENT: ${originalContract.clientName}` : ''}
${originalContract?.projectType ? `PROJECT TYPE: ${originalContract.projectType}` : ''}
${originalContract?.originalDate ? `ORIGINAL CONTRACT DATE: ${originalContract.originalDate}` : ''}

Remember: Do NOT invent any details. Only reorganize and professionalize what the contractor provided.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.4,
    });

    const enhancedContent = completion.choices[0].message.content?.trim();

    if (!enhancedContent) {
      throw new Error('No content generated by AI');
    }

    console.log('✅ [CHANGE-ORDER-AI] Enhancement generated successfully');

    res.json({
      success: true,
      enhancedDescription: enhancedContent,
      metadata: {
        aiEnhanced: true,
        aiOriginalText: originalText,
        aiFinalText: enhancedContent,
        aiModelVersion: 'gpt-4o',
        timestamp: new Date().toISOString(),
      },
      source: 'openai-gpt4o',
    });

  } catch (error: any) {
    console.error('❌ [CHANGE-ORDER-AI] Error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: error.errors
      });
    }

    // Fallback: return a professionally formatted version without AI
    const fallback = generateChangeOrderFallback(req.body);
    res.json({
      success: true,
      enhancedDescription: fallback,
      metadata: {
        aiEnhanced: false,
        aiOriginalText: req.body.originalText || '',
        aiFinalText: fallback,
        aiModelVersion: 'fallback',
        timestamp: new Date().toISOString(),
      },
      source: 'fallback',
      warning: 'Generated using professional template due to AI service unavailability'
    });
  }
});

// Fallback generator for Change Order enhancement
function generateChangeOrderFallback(data: any): string {
  const { originalText, costType, additionalCost, adjustTimeline, newCompletionDate } = data;
  const costLabel = costType === 'addition' ? 'increase' : 'decrease';
  
  return `## CHANGE SUMMARY
This Change Order documents modifications to the original contract scope as described below.

## DETAILED SCOPE OF CHANGE
${originalText || 'Scope changes as discussed and agreed upon by both parties.'}

## COST IMPACT
The contract value will ${costLabel} by $${(additionalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}.

## SCHEDULE IMPACT
${adjustTimeline && newCompletionDate 
  ? `The project completion date has been adjusted to ${newCompletionDate}.` 
  : 'No changes to the original project timeline.'}

## CONFIRMATION
All other terms and conditions of the original contract remain unchanged and in full force and effect.`;
}

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