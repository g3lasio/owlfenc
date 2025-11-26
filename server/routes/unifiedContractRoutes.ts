/**
 * Unified Contract Management API Routes
 * Handles contract generation, data completion, and Firebase storage
 */

import { Router, Request, Response } from 'express';
import { Anthropic } from '@anthropic-ai/sdk';
import { ContractData, GeneratedContract, contractDataSchema } from '@shared/contractSchema';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { userMappingService } from '../services/userMappingService';
import { 
  requireLegalDefenseAccess,
  validateUsageLimit,
  incrementUsageOnSuccess 
} from '../middleware/subscription-auth';

const router = Router();

// Initialize Anthropic AI
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Complete missing contract data using Anthropic AI
 * 🔐 CRITICAL SECURITY FIX: Agregado verifyFirebaseAuth para proteger completado de contratos
 */
router.post('/complete-contract-data', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    // 🔐 CRITICAL SECURITY FIX: Solo usuarios autenticados pueden usar completado de contratos con IA
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
    console.log(`🔐 [SECURITY] Completing contract data for REAL user_id: ${userId}`);
    
    const { contractData } = req.body;

    console.log('🧠 Completando datos de contrato con Anthropic AI...');

    const prompt = `
    Eres un asistente experto en contratos de construcción. Analiza los datos proporcionados y completa la información faltante de manera profesional y realista.

    DATOS ACTUALES:
    ${JSON.stringify(contractData, null, 2)}

    INSTRUCCIONES:
    1. Completa SOLO los campos que están vacíos o faltantes
    2. Mantén toda la información existente intacta
    3. Para información del contratista, usa datos profesionales de OWL FENCE LLC
    4. Para fechas, sugiere fechas realistas (inicio en 1-2 semanas, duración apropiada según el proyecto)
    5. Para términos de pago, usa estándares de la industria que protejan al contratista
    6. NO inventes información específica del cliente que no se pueda deducir

    RESPONDE EN FORMATO JSON:
    {
      "completedData": {
        // Solo campos completados/sugeridos
      },
      "suggestions": [
        {
          "field": "nombre_del_campo",
          "value": "valor_sugerido", 
          "reason": "explicación_clara"
        }
      ]
    }
    `;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const result = JSON.parse(content.text);
      
      console.log('✅ Datos completados exitosamente');
      
      res.json({
        success: true,
        completedData: result.completedData || {},
        suggestions: result.suggestions || []
      });
    } else {
      throw new Error('Respuesta inválida de Anthropic');
    }

  } catch (error) {
    console.error('❌ Error completando datos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al completar datos del contrato'
    });
  }
});

/**
 * Generate defensive contract using Anthropic AI
 * 🔐 SECURITY FIX: Added full contract protection middleware
 */
router.post('/generate-defensive-contract', 
  verifyFirebaseAuth,
  requireLegalDefenseAccess,
  validateUsageLimit('contracts'),
  incrementUsageOnSuccess('contracts'),
  async (req: Request, res: Response) => {
  try {
    const { contractData, protectionLevel = 'standard' } = req.body;

    console.log('🛡️ Generando contrato defensivo con Anthropic AI...');

    // Validate contract data
    const validationResult = contractDataSchema.safeParse(contractData);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Datos de contrato inválidos',
        details: validationResult.error.errors
      });
    }

    const validatedData = validationResult.data;

    const prompt = `
    Eres un abogado experto especializado en contratos de construcción que protegen al CONTRATISTA. Genera un contrato HTML profesional que maximice la protección legal del contratista.

    DATOS DEL CONTRATO:
    ${JSON.stringify(validatedData, null, 2)}

    NIVEL DE PROTECCIÓN: ${protectionLevel}

    INSTRUCCIONES CRÍTICAS:
    1. PRIORIDAD ABSOLUTA: Proteger los intereses del contratista (OWL FENCE LLC)
    2. Incluir cláusulas de protección de pago (depósitos, pagos progresivos)
    3. Limitación de responsabilidad del contratista
    4. Protección contra cambios de alcance no autorizados
    5. Cláusulas de fuerza mayor y escalación de materiales
    6. Términos claros para finalización y aceptación del trabajo
    7. Procedimientos de resolución de disputas favorables al contratista

    ESTRUCTURA REQUERIDA:
    - Encabezado profesional con información de ambas partes
    - Descripción detallada del trabajo
    - Términos de pago protectores
    - Cronograma realista
    - Cláusulas de protección legal
    - Firmas y fechas

    GENERA UN CONTRATO HTML COMPLETO Y PROFESIONAL. Usa estilos CSS integrados para una presentación profesional.
    `;

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      console.log('✅ Contrato defensivo generado exitosamente');
      
      // Generate risk analysis
      const riskAnalysis = await generateRiskAnalysis(validatedData);
      
      const contractId = `contract_${Date.now()}`;
      
      const generatedContract: GeneratedContract = {
        id: contractId,
        projectId: contractData.projectId,
        html: content.text,
        contractData: validatedData,
        riskAnalysis,
        protections: extractProtections(content.text),
        status: 'draft',
        generatedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        contract: generatedContract
      });
    } else {
      throw new Error('Respuesta inválida de Anthropic');
    }

  } catch (error) {
    console.error('❌ Error generando contrato:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar contrato defensivo'
    });
  }
});

/**
 * Analyze contract risks and generate recommendations
 */
async function generateRiskAnalysis(contractData: ContractData) {
  try {
    const prompt = `
    Analiza los siguientes datos de contrato y evalúa los riesgos legales para el contratista:

    ${JSON.stringify(contractData, null, 2)}

    Proporciona un análisis de riesgo en formato JSON:
    {
      "riskLevel": "bajo|medio|alto|crítico",
      "riskScore": número_entre_0_y_100,
      "protectiveRecommendations": ["recomendación1", "recomendación2"],
      "contractorProtections": ["protección1", "protección2"],
      "paymentSafeguards": ["salvaguarda1", "salvaguarda2"],
      "liabilityShields": ["escudo1", "escudo2"]
    }
    `;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return JSON.parse(content.text);
    }
    
    // Fallback risk analysis
    return {
      riskLevel: 'medio',
      riskScore: 65,
      protectiveRecommendations: ['Incluir términos de pago progresivo', 'Definir claramente el alcance del trabajo'],
      contractorProtections: ['Limitación de responsabilidad', 'Cláusula de cambios autorizados'],
      paymentSafeguards: ['Depósito del 50%', 'Pagos por hitos'],
      liabilityShields: ['Cobertura de seguro requerida', 'Exención de daños consecuentes']
    };

  } catch (error) {
    console.error('Error en análisis de riesgo:', error);
    return {
      riskLevel: 'medio',
      riskScore: 50,
      protectiveRecommendations: [],
      contractorProtections: [],
      paymentSafeguards: [],
      liabilityShields: []
    };
  }
}

/**
 * Extract protection clauses from generated contract
 */
function extractProtections(html: string): string[] {
  const protections: string[] = [];
  
  // Look for common protection keywords in the HTML
  const protectionKeywords = [
    'depósito',
    'pago progresivo',
    'limitación de responsabilidad',
    'cambios autorizados',
    'fuerza mayor',
    'escalación de materiales',
    'garantía limitada'
  ];

  protectionKeywords.forEach(keyword => {
    if (html.toLowerCase().includes(keyword)) {
      protections.push(`Incluye protección: ${keyword}`);
    }
  });

  return protections;
}

/**
 * Save contract to Firebase (placeholder for now)
 */
router.post('/save-contract', async (req: Request, res: Response) => {
  try {
    const { contract, userId } = req.body;

    console.log('💾 Guardando contrato en Firebase...');

    // TODO: Implement Firebase storage
    // For now, return success to allow frontend testing
    
    res.json({
      success: true,
      contractId: contract.id,
      message: 'Contrato guardado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error guardando contrato:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar contrato'
    });
  }
});

/**
 * Get contracts by user (placeholder for Firebase integration)
 */
router.get('/contracts/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    console.log(`📋 Obteniendo contratos para usuario: ${userId}`);

    // TODO: Implement Firebase retrieval
    // Return empty array for now
    
    res.json({
      success: true,
      contracts: []
    });

  } catch (error) {
    console.error('❌ Error obteniendo contratos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener contratos'
    });
  }
});

export default router;