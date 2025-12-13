/**
 * Rutas del Motor de Abogado Defensor Digital
 * 
 * Endpoints específicos para generar contratos que protegen al contratista
 * usando análisis de riesgo legal y IA especializada.
 */

import { Router } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { 
  requireLegalDefenseAccess,
  validateUsageLimit,
  incrementUsageOnSuccess 
} from '../middleware/subscription-auth';
import { templateService } from '../templates/templateService';
import { featureFlags } from '../config/featureFlags';

const router = Router();

// Initialize OpenAI if available
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// Schema de validación para proyectos
const projectSchema = z.object({
  id: z.union([z.string(), z.number()]),
  clientName: z.string(),
  address: z.string(),
  projectType: z.string().optional(),
  totalPrice: z.number().optional(),
  permitStatus: z.string().optional(),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
});

// Endpoint para generar contrato defensivo con Anthropic
// 🔐 SECURITY FIX: Added full contract protection middleware
router.post('/generate-defensive-contract', 
  verifyFirebaseAuth,
  requireLegalDefenseAccess,
  validateUsageLimit('contracts'),
  incrementUsageOnSuccess('contracts'),
  async (req, res) => {
  console.log('🛡️ Iniciando generación de contrato defensivo...');
  
  try {
    const { prompt, projectData, riskAnalysis, protectionConfig, baseTemplate } = req.body;
    
    // Validar datos del proyecto
    const validatedProject = projectSchema.parse(projectData);
    console.log(`📋 Proyecto validado: ${validatedProject.clientName}`);
    
    // Verificar si Anthropic está disponible
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('⚠️ Anthropic no disponible, usando OpenAI como alternativa...');
      
      if (!openai) {
        throw new Error('Ni Anthropic ni OpenAI están configurados');
      }
      
      // Usar OpenAI como alternativa
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Eres un abogado especializado en protección de contratistas. Genera contratos HTML que protejan específicamente al contratista contra riesgos legales comunes."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });
      
      const contractHtml = response.choices[0]?.message?.content || '';
      
      return res.json({
        html: contractHtml,
        service: 'openai',
        riskLevel: riskAnalysis?.riskLevel || 'medio',
        protectionsApplied: protectionConfig ? Object.keys(protectionConfig).filter(key => protectionConfig[key]).length : 5
      });
    }
    
    // Usar Anthropic para generación defensiva
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!anthropicResponse.ok) {
      throw new Error(`Anthropic API error: ${anthropicResponse.status}`);
    }
    
    const anthropicData = await anthropicResponse.json();
    const contractHtml = anthropicData.content[0]?.text || '';
    
    console.log('✅ Contrato defensivo generado con Anthropic');
    
    res.json({
      html: contractHtml,
      service: 'anthropic',
      riskLevel: riskAnalysis?.riskLevel || 'medio',
      protectionsApplied: protectionConfig ? Object.keys(protectionConfig).filter(key => protectionConfig[key]).length : 5
    });
    
  } catch (error) {
    console.error('❌ Error generando contrato defensivo:', error);
    
    // Generar contrato de respaldo con protecciones básicas
    const fallbackHtml = generateFallbackDefensiveContract(req.body.projectData);
    
    res.json({
      html: fallbackHtml,
      service: 'fallback',
      riskLevel: 'medio',
      protectionsApplied: 3,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Endpoint para analizar riesgo legal de un proyecto
router.post('/analyze-legal-risk', async (req, res) => {
  console.log('🔍 Analizando riesgo legal del proyecto...');
  
  try {
    const project = projectSchema.parse(req.body.project);
    
    // Realizar análisis de riesgo (lógica mejorada)
    const riskAnalysis = await analyzeLegalRisk(project);
    
    console.log(`📊 Análisis completado - Riesgo: ${riskAnalysis.riskLevel}`);
    
    res.json({
      success: true,
      analysis: riskAnalysis
    });
    
  } catch (error) {
    console.error('❌ Error en análisis de riesgo:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error en análisis'
    });
  }
});

// Endpoint para obtener proyectos que necesitan contratos
router.get('/projects-for-contracts', async (req, res) => {
  try {
    const { status = 'approved', needsContract = 'true' } = req.query;
    
    // Aquí se conectaría con la base de datos real
    // Por ahora retornamos datos de ejemplo para que el frontend funcione
    const projects = [
      {
        id: 1,
        clientName: "María González",
        address: "123 Calle Principal, Ciudad",
        projectType: "fencing",
        totalPrice: 250000, // en centavos
        projectProgress: "client_approved",
        permitStatus: "approved",
        clientEmail: "maria@email.com",
        clientPhone: "(555) 123-4567"
      },
      {
        id: 2,
        clientName: "Carlos Rodriguez",
        address: "456 Avenida Central, Ciudad",
        projectType: "roofing",
        totalPrice: 800000, // en centavos
        projectProgress: "client_approved",
        permitStatus: "pending",
        clientEmail: "carlos@email.com"
      }
    ];
    
    // Filtrar según parámetros
    let filteredProjects = projects;
    if (status !== 'all') {
      filteredProjects = projects.filter(p => p.projectProgress === status || status === 'approved');
    }
    
    res.json(filteredProjects);
    
  } catch (error) {
    console.error('❌ Error obteniendo proyectos:', error);
    res.status(500).json({
      error: 'Error al obtener proyectos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Función auxiliar para análisis de riesgo legal
async function analyzeLegalRisk(project: any) {
  let riskScore = 0;
  const protectiveRecommendations: string[] = [];
  const contractorProtections: string[] = [];
  const paymentSafeguards: string[] = [];
  const liabilityShields: string[] = [];
  const scopeProtections: string[] = [];

  // Análisis de riesgo financiero
  if (project.totalPrice && project.totalPrice > 500000) {
    riskScore += 2;
    protectiveRecommendations.push('Proyecto de alto valor - requiere pagos progresivos estrictos');
    paymentSafeguards.push('Depósito inicial del 30% antes de comenzar');
    paymentSafeguards.push('Pagos por etapas con aprobación del cliente');
  }

  // Análisis de tipo de proyecto
  if (project.projectType === 'roofing') {
    riskScore += 2;
    liabilityShields.push('Limitación de responsabilidad por filtraciones después de 1 año');
    contractorProtections.push('Inspección previa de estructura existente documentada');
  }

  // Análisis de permisos
  if (!project.permitStatus || project.permitStatus === 'pending') {
    riskScore += 2;
    protectiveRecommendations.push('Permisos pendientes - cliente debe obtenerlos antes del inicio');
    contractorProtections.push('Cliente responsable de obtener todos los permisos');
  }

  // Protecciones generales
  contractorProtections.push('Derecho a suspender trabajo por falta de pago');
  paymentSafeguards.push('Intereses por pagos atrasados después de 15 días');
  scopeProtections.push('Cualquier cambio al alcance requiere orden de cambio por escrito');

  // Determinar nivel de riesgo
  let riskLevel: string;
  if (riskScore >= 6) riskLevel = 'crítico';
  else if (riskScore >= 4) riskLevel = 'alto';
  else if (riskScore >= 2) riskLevel = 'medio';
  else riskLevel = 'bajo';

  return {
    riskLevel,
    riskScore,
    protectiveRecommendations,
    contractorProtections,
    paymentSafeguards,
    liabilityShields,
    scopeProtections
  };
}

// Función auxiliar para contrato de respaldo
function generateFallbackDefensiveContract(projectData: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Contrato de Servicios - ${projectData.clientName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
        .protection-notice { background: #e8f5e8; border: 1px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .terms { margin: 20px 0; }
        .highlight { background: #fff3cd; padding: 10px; margin: 10px 0; border-left: 4px solid #ffc107; }
        .signature-section { margin-top: 40px; page-break-inside: avoid; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CONTRATO DE SERVICIOS DE CONSTRUCCIÓN</h1>
        <h2>PROTECCIÓN LEGAL PARA EL CONTRATISTA</h2>
    </div>

    <div class="protection-notice">
        <strong>🛡️ CONTRATO GENERADO POR ABOGADO DEFENSOR DIGITAL</strong><br>
        Este contrato ha sido optimizado para proteger específicamente los intereses del contratista contra riesgos legales comunes.
    </div>

    <h2>INFORMACIÓN DEL PROYECTO</h2>
    <p><strong>Cliente:</strong> ${projectData.clientName}</p>
    <p><strong>Dirección del Proyecto:</strong> ${projectData.address}</p>
    <p><strong>Tipo de Trabajo:</strong> ${projectData.projectType || 'Servicios de construcción'}</p>
    ${projectData.totalPrice ? `<p><strong>Valor del Contrato:</strong> $${(projectData.totalPrice / 100).toLocaleString()}</p>` : ''}

    <div class="terms">
        <h2>🔒 TÉRMINOS DE PAGO PROTECTIVOS</h2>
        <div class="highlight">
            <p>• <strong>Depósito inicial del 30%</strong> requerido antes del inicio de cualquier trabajo</p>
            <p>• Pagos progresivos según avance del trabajo documentado</p>
            <p>• <strong>Interés del 1.5% mensual</strong> por pagos atrasados más de 15 días</p>
            <p>• <strong>Derecho a suspender trabajo</strong> inmediatamente por falta de pago</p>
            <p>• Costos legales de cobro serán responsabilidad del cliente</p>
        </div>

        <h2>⚖️ PROTECCIÓN CONTRA CAMBIOS DE ALCANCE</h2>
        <div class="highlight">
            <p>• <strong>Cualquier modificación</strong> al trabajo acordado requiere orden de cambio por escrito</p>
            <p>• Cambios adicionales se facturan por separado a precios actuales de mercado</p>
            <p>• Cliente responsable de <strong>todos los costos por demoras</strong> no atribuibles al contratista</p>
            <p>• Acceso libre al área de trabajo debe ser proporcionado por el cliente</p>
        </div>

        <h2>🛡️ LIMITACIÓN DE RESPONSABILIDAD DEL CONTRATISTA</h2>
        <div class="highlight">
            <p>• Responsabilidad total limitada al <strong>valor de este contrato</strong></p>
            <p>• <strong>Exclusión de daños consecuenciales</strong> o pérdidas indirectas</p>
            <p>• Garantía limitada únicamente a defectos de mano de obra por 1 año</p>
            <p>• No responsabilidad por condiciones preexistentes o problemas ocultos</p>
        </div>

        <h2>📋 RESPONSABILIDADES DEL CLIENTE</h2>
        <div class="highlight">
            <p>• Obtener todos los <strong>permisos necesarios</strong> antes del inicio</p>
            <p>• Proporcionar acceso libre y seguro al área de trabajo</p>
            <p>• Informar de cualquier condición especial o peligrosa en la propiedad</p>
            <p>• Cumplir con todos los términos de pago establecidos</p>
        </div>
    </div>

    <div class="signature-section">
        <h3>ACEPTACIÓN DEL CONTRATO</h3>
        <p>Al firmar abajo, ambas partes aceptan todos los términos y condiciones establecidos en este contrato.</p>
        
        <table style="width: 100%; margin-top: 30px;">
            <tr>
                <td style="width: 45%; text-align: center; border-bottom: 1px solid #000; padding-bottom: 5px;">
                    &nbsp;
                </td>
                <td style="width: 10%;">&nbsp;</td>
                <td style="width: 45%; text-align: center; border-bottom: 1px solid #000; padding-bottom: 5px;">
                    &nbsp;
                </td>
            </tr>
            <tr>
                <td style="text-align: center; padding-top: 5px;">
                    <strong>Firma del Cliente</strong><br>
                    ${projectData.clientName}
                </td>
                <td>&nbsp;</td>
                <td style="text-align: center; padding-top: 5px;">
                    <strong>Fecha</strong>
                </td>
            </tr>
        </table>

        <table style="width: 100%; margin-top: 30px;">
            <tr>
                <td style="width: 45%; text-align: center; border-bottom: 1px solid #000; padding-bottom: 5px;">
                    &nbsp;
                </td>
                <td style="width: 10%;">&nbsp;</td>
                <td style="width: 45%; text-align: center; border-bottom: 1px solid #000; padding-bottom: 5px;">
                    &nbsp;
                </td>
            </tr>
            <tr>
                <td style="text-align: center; padding-top: 5px;">
                    <strong>Firma del Contratista</strong>
                </td>
                <td>&nbsp;</td>
                <td style="text-align: center; padding-top: 5px;">
                    <strong>Fecha</strong>
                </td>
            </tr>
        </table>
    </div>

    <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 5px; font-size: 12px; color: #666;">
        <p><strong>Nota Legal:</strong> Este contrato ha sido generado por el Motor de Abogado Defensor Digital para maximizar la protección del contratista. Se recomienda revisión por abogado local para cumplimiento con leyes estatales específicas.</p>
    </div>
</body>
</html>`;
}

// ============================================
// PHASE 1: Multi-Template System Endpoints
// ============================================

// GET available document templates (protected by feature flag)
router.get('/templates',
  verifyFirebaseAuth,
  async (req, res) => {
    try {
      if (!featureFlags.isMultiTemplateSystemEnabled()) {
        return res.status(404).json({
          success: false,
          error: 'Template system is not enabled',
        });
      }

      const templates = templateService.getTemplateMetadata();
      
      res.json({
        success: true,
        templates,
        featureFlags: {
          multiTemplateSystem: featureFlags.isMultiTemplateSystemEnabled(),
          documentTypeSelector: featureFlags.isEnabled('documentTypeSelector'),
        },
      });
    } catch (error) {
      console.error('❌ [TEMPLATES] Error fetching templates:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error fetching templates',
      });
    }
  }
);

// GET specific template details
router.get('/templates/:templateId',
  verifyFirebaseAuth,
  async (req, res) => {
    try {
      const { templateId } = req.params;

      if (!featureFlags.isMultiTemplateSystemEnabled()) {
        return res.status(404).json({
          success: false,
          error: 'Template system is not enabled',
        });
      }

      const template = templateService.getTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          error: `Template '${templateId}' not found or not available`,
        });
      }

      res.json({
        success: true,
        template: {
          id: template.id,
          name: template.name,
          displayName: template.displayName,
          description: template.description,
          category: template.category,
          templateVersion: template.templateVersion,
          signatureType: template.signatureType,
          requiredFields: template.requiredFields,
          optionalFields: template.optionalFields,
          icon: template.icon,
        },
      });
    } catch (error) {
      console.error('❌ [TEMPLATES] Error fetching template:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error fetching template',
      });
    }
  }
);

// POST generate document from template
router.post('/templates/:templateId/generate',
  verifyFirebaseAuth,
  requireLegalDefenseAccess,
  validateUsageLimit('contracts'),
  incrementUsageOnSuccess('contracts'),
  async (req, res) => {
    try {
      const { templateId } = req.params;
      const { data, branding } = req.body;

      console.log(`📋 [TEMPLATE-GENERATE] Generating ${templateId} document...`);

      if (!featureFlags.isMultiTemplateSystemEnabled()) {
        return res.status(404).json({
          success: false,
          error: 'Template system is not enabled',
        });
      }

      if (!templateService.isTemplateAvailable(templateId)) {
        return res.status(404).json({
          success: false,
          error: `Template '${templateId}' not found or not available`,
        });
      }

      const result = await templateService.generateDocument(templateId, data, branding || {});

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      console.log(`✅ [TEMPLATE-GENERATE] Document generated: ${templateId}`);

      res.json({
        success: true,
        html: result.html,
        metadata: result.metadata,
      });
    } catch (error) {
      console.error('❌ [TEMPLATE-GENERATE] Error generating document:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error generating document',
      });
    }
  }
);

export default router;