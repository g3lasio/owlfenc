/**
 * Rutas unificadas para el sistema de email
 * Maneja envío de estimados y contratos con múltiples proveedores
 */

import express from 'express';
import { UnifiedEmailService } from '../services/unifiedEmailService';

const router = express.Router();

/**
 * Enviar estimado por email
 * POST /api/unified-email/send-estimate
 */
router.post('/send-estimate', async (req, res) => {
  try {
    const {
      contractorEmail,
      contractorName,
      contractorCompany,
      clientEmail,
      clientName,
      estimateData,
      customMessage,
      customSubject
    } = req.body;

    // Validar campos requeridos
    if (!contractorEmail || !contractorName || !clientEmail || !estimateData) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: email del contratista, nombre, email del cliente, o datos del estimado'
      });
    }

    console.log('📧 [UNIFIED-EMAIL-ROUTES] Enviando estimado...');
    console.log('📧 [UNIFIED-EMAIL-ROUTES] Contratista:', contractorName, contractorEmail);
    console.log('📧 [UNIFIED-EMAIL-ROUTES] Cliente:', clientName, clientEmail);
    console.log('📧 [UNIFIED-EMAIL-ROUTES] Proyecto:', estimateData.projectType);

    const emailData = {
      contractorEmail,
      contractorName,
      contractorCompany: contractorCompany || contractorName,
      clientEmail,
      clientName,
      estimateData,
      customMessage,
      customSubject
    };

    // Por defecto, usar sistema proxy para simplicidad
    const emailConfig = {
      provider: 'personal' as const,
      settings: {
        email: contractorEmail
      }
    };

    const result = await UnifiedEmailService.sendEstimate(emailData, emailConfig);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        strategy: result.strategy,
        estimateId: estimateData.estimateNumber || `EST-${Date.now()}`
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ [UNIFIED-EMAIL-ROUTES] Error enviando estimado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor enviando estimado'
    });
  }
});

/**
 * Validar email del contratista
 * POST /api/unified-email/validate-contractor
 */
router.post('/validate-contractor', async (req, res) => {
  try {
    const { contractorEmail } = req.body;

    if (!contractorEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email del contratista requerido'
      });
    }

    const detection = UnifiedEmailService.detectEmailProvider(contractorEmail);
    
    res.json({
      success: true,
      email: contractorEmail,
      provider: detection.provider,
      canAutoSetup: detection.canAutoSetup,
      strategy: 'proxy', // Siempre usar proxy para simplicidad
      recommendations: [
        'Tu email está listo para enviar estimados',
        'Los clientes recibirán emails profesionales',
        'Las respuestas llegarán directamente a tu email'
      ]
    });

  } catch (error) {
    console.error('❌ [UNIFIED-EMAIL-ROUTES] Error validando email:', error);
    res.status(500).json({
      success: false,
      message: 'Error validando email del contratista'
    });
  }
});

/**
 * Verificar estado del sistema de email
 * GET /api/unified-email/status
 */
router.get('/status', async (req, res) => {
  try {
    const { contractorEmail } = req.query;

    // Verificar que Resend esté funcionando (nuestro sistema proxy)
    const resendWorking = !!process.env.RESEND_API_KEY;

    res.json({
      success: true,
      systemReady: resendWorking,
      proxyAvailable: resendWorking,
      contractorEmail: contractorEmail || null,
      strategy: 'proxy',
      message: resendWorking 
        ? 'Sistema de email listo para enviar estimados'
        : 'Sistema de email no configurado'
    });

  } catch (error) {
    console.error('❌ [UNIFIED-EMAIL-ROUTES] Error verificando estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando estado del sistema'
    });
  }
});

/**
 * Obtener información del proveedor de email
 * GET /api/unified-email/provider-info/:email
 */
router.get('/provider-info/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requerido'
      });
    }

    const detection = UnifiedEmailService.detectEmailProvider(email);
    
    res.json({
      success: true,
      email,
      providerInfo: detection,
      recommendedStrategy: 'proxy',
      setup: {
        required: false,
        steps: [
          'Tu email ya está listo para usar',
          'No se requiere configuración adicional',
          'Los estimados se enviarán automáticamente'
        ]
      }
    });

  } catch (error) {
    console.error('❌ [UNIFIED-EMAIL-ROUTES] Error obteniendo info del proveedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo información del proveedor'
    });
  }
});

/**
 * Enviar contrato por email
 * POST /api/unified-email/send-contract
 */
router.post('/send-contract', async (req, res) => {
  try {
    const {
      contractorEmail,
      contractorName,
      contractorCompany,
      clientEmail,
      clientName,
      contractData,
      customMessage,
      customSubject
    } = req.body;

    // Validar campos requeridos
    if (!contractorEmail || !contractorName || !clientEmail || !contractData) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos'
      });
    }

    console.log('📧 [UNIFIED-EMAIL-ROUTES] Enviando contrato...');
    console.log('📧 [UNIFIED-EMAIL-ROUTES] Contratista:', contractorName, contractorEmail);
    console.log('📧 [UNIFIED-EMAIL-ROUTES] Cliente:', clientName, clientEmail);

    // Por simplicidad, usar el mismo sistema que estimados
    const emailData = {
      contractorEmail,
      contractorName,
      contractorCompany: contractorCompany || contractorName,
      clientEmail,
      clientName,
      estimateData: contractData, // Reutilizar la misma estructura
      customMessage,
      customSubject: customSubject || `Contrato Profesional - ${contractData.projectType} - ${contractorCompany || contractorName}`
    };

    const emailConfig = {
      provider: 'personal' as const,
      settings: {
        email: contractorEmail
      }
    };

    const result = await UnifiedEmailService.sendEstimate(emailData, emailConfig);

    if (result.success) {
      res.json({
        success: true,
        message: 'Contrato enviado exitosamente',
        strategy: result.strategy,
        contractId: contractData.contractNumber || `CONTRACT-${Date.now()}`
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ [UNIFIED-EMAIL-ROUTES] Error enviando contrato:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor enviando contrato'
    });
  }
});

export default router;