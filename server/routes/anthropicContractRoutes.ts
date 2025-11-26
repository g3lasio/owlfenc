// server/routes/anthropicContractRoutes.ts

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { userMappingService } from '../services/userMappingService';
import { 
  requireLegalDefenseAccess,
  validateUsageLimit,
  incrementUsageOnSuccess 
} from '../middleware/subscription-auth';

const router = Router();

// Inicializar cliente de Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Endpoint para generar contratos usando Anthropic Claude
 * 🔐 SECURITY FIX: Added full contract protection middleware
 */
router.post('/generate-contract', 
  verifyFirebaseAuth,
  requireLegalDefenseAccess,
  validateUsageLimit('contracts'),
  incrementUsageOnSuccess('contracts'),
  async (req, res) => {
  try {
    // 🔐 CRITICAL SECURITY FIX: Solo usuarios autenticados pueden generar contratos con IA
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
    console.log(`🔐 [SECURITY] Contract generation for REAL user_id: ${userId}`);
    
    const { prompt, projectData, baseTemplate, enhancementLevel, legalCompliance } = req.body;

    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prompt is required' 
      });
    }

    // Generar contrato con Anthropic
    // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4000,
      temperature: 0.3, // Baja temperatura para consistencia legal
      system: `You are an expert construction contract attorney with 20+ years of experience in contractor protection and legal compliance. You specialize in creating bulletproof contracts that protect contractors while maintaining legal validity.

Key principles:
1. Always prioritize contractor protection and payment security
2. Include comprehensive change order procedures
3. Ensure strong lien rights and collection mechanisms
4. Address all potential liability concerns
5. Include state-specific legal requirements
6. Use clear, enforceable language
7. Anticipate and prevent common contract disputes

Output high-quality HTML using the specified CSS classes and professional formatting.`,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const generatedContent = message.content[0];
    
    if (generatedContent.type !== 'text') {
      throw new Error('Unexpected response format from Anthropic');
    }

    // Extraer HTML del contenido generado
    let html = generatedContent.text;
    
    // Limpiar el HTML si viene con markdown o texto adicional
    const htmlMatch = html.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
    if (htmlMatch) {
      html = htmlMatch[0];
    } else {
      // Si no hay HTML completo, envolver el contenido
      html = wrapContentInTemplate(html, baseTemplate);
    }

    // Analizar mejoras aplicadas
    const enhancements = analyzeContractEnhancements(html, enhancementLevel);

    res.json({
      success: true,
      html,
      enhancements,
      metadata: {
        model: 'claude-3-7-sonnet-20250219',
        generatedAt: new Date().toISOString(),
        enhancementLevel,
        complianceScore: legalCompliance?.complianceScore || 0
      }
    });

  } catch (error) {
    console.error('Error generating contract with Anthropic:', error);
    
    // Respuesta de error detallada
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      fallbackAvailable: true
    });
  }
});

/**
 * Endpoint para mejorar secciones específicas del contrato
 */
router.post('/enhance-section', async (req, res) => {
  try {
    const { section, currentContent, projectContext, enhancementType } = req.body;

    const enhancementPrompt = `As a construction contract expert, enhance the following contract section:

SECTION: ${section}
CURRENT CONTENT: ${currentContent}
PROJECT CONTEXT: ${JSON.stringify(projectContext, null, 2)}
ENHANCEMENT TYPE: ${enhancementType}

Please provide an enhanced version that:
1. Strengthens contractor protections
2. Improves legal clarity and enforceability
3. Addresses potential disputes or ambiguities
4. Maintains professional tone and structure
5. Incorporates industry best practices

Return only the enhanced content in HTML format using appropriate CSS classes.`;

    // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1500,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: enhancementPrompt
        }
      ],
    });

    const enhancedContent = message.content[0];
    
    if (enhancedContent.type !== 'text') {
      throw new Error('Unexpected response format from Anthropic');
    }

    res.json({
      success: true,
      enhancedContent: enhancedContent.text,
      originalContent: currentContent,
      section,
      enhancementType
    });

  } catch (error) {
    console.error('Error enhancing contract section:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enhance section'
    });
  }
});

/**
 * Endpoint para validar cumplimiento legal usando IA
 */
router.post('/validate-compliance', async (req, res) => {
  try {
    const { contractHtml, state, projectType, contractValue } = req.body;

    const validationPrompt = `As a legal compliance expert for ${state} construction law, review this contract for legal compliance and contractor protection:

CONTRACT HTML: ${contractHtml}
STATE: ${state}
PROJECT TYPE: ${projectType}
CONTRACT VALUE: ${contractValue}

Analyze and provide:
1. Legal compliance issues (if any)
2. Missing state-specific requirements
3. Contractor protection gaps
4. Recommendations for improvement
5. Risk assessment (1-10 scale)

Respond in JSON format with detailed analysis.`;

    // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2000,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: validationPrompt
        }
      ],
    });

    const analysis = message.content[0];
    
    if (analysis.type !== 'text') {
      throw new Error('Unexpected response format from Anthropic');
    }

    // Intentar parsear como JSON
    let validationResult;
    try {
      validationResult = JSON.parse(analysis.text);
    } catch {
      // Si no es JSON válido, crear estructura básica
      validationResult = {
        complianceIssues: [],
        missingRequirements: [],
        protectionGaps: [],
        recommendations: [analysis.text],
        riskScore: 5
      };
    }

    res.json({
      success: true,
      validation: validationResult,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error validating contract compliance:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    });
  }
});

/**
 * Envuelve contenido en la plantilla base si no está completo
 */
function wrapContentInTemplate(content: string, baseTemplate: string): string {
  // Si el contenido ya es HTML completo, devolverlo tal como está
  if (content.includes('<!DOCTYPE html>') || content.includes('<html>')) {
    return content;
  }

  // Extraer el contenido del cuerpo de la plantilla base
  const bodyMatch = baseTemplate.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) {
    return content; // Si no se puede extraer, devolver contenido tal como está
  }

  // Reemplazar el contenido del cuerpo con el contenido generado
  const templateBody = bodyMatch[1];
  const newBody = templateBody.replace(
    /<div class="contract-container">[\s\S]*<\/div>/i,
    `<div class="contract-container">${content}</div>`
  );

  return baseTemplate.replace(
    /<body[^>]*>[\s\S]*<\/body>/i,
    `<body>${newBody}</body>`
  );
}

/**
 * Analiza las mejoras aplicadas al contrato
 */
function analyzeContractEnhancements(html: string, enhancementLevel: string): string[] {
  const enhancements: string[] = [];

  // Detectar mejoras específicas basadas en el contenido
  if (html.includes('change order') || html.includes('Change Order')) {
    enhancements.push('Advanced change order procedures');
  }

  if (html.includes('lien') || html.includes('Lien')) {
    enhancements.push('Mechanics lien protections');
  }

  if (html.includes('performance bond') || html.includes('Performance Bond')) {
    enhancements.push('Performance bond requirements');
  }

  if (html.includes('attorney') || html.includes('legal fee')) {
    enhancements.push('Attorney fees and legal cost recovery');
  }

  if (html.includes('indemnif') || html.includes('hold harmless')) {
    enhancements.push('Liability limitation and indemnification');
  }

  if (html.includes('termination') || html.includes('Termination')) {
    enhancements.push('Contract termination protections');
  }

  if (html.includes('warranty') || html.includes('Warranty')) {
    enhancements.push('Warranty and defect remedy procedures');
  }

  if (html.includes('insurance') || html.includes('Insurance')) {
    enhancements.push('Insurance and bonding requirements');
  }

  // Agregar mejoras según el nivel
  if (enhancementLevel === 'professional') {
    enhancements.push('Professional-grade contractor protections');
  } else if (enhancementLevel === 'premium') {
    enhancements.push('Premium legal safeguards and risk management');
  }

  return enhancements;
}

export default router;