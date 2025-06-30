import express from 'express';
import { EstimateEmailService } from '../services/estimateEmailService';
import { resendService } from '../services/resendService';

const router = express.Router();

/**
 * Test endpoint to verify routes are working
 * GET /api/centralized-email/test
 */
router.get('/test', (req, res) => {
  console.log('📧 [CENTRALIZED-EMAIL] Test endpoint invoked');
  res.json({ success: true, message: 'Centralized email routes working' });
});

/**
 * Enviar estimado usando sistema centralizado
 * POST /api/centralized-email/send-estimate
 */
router.post('/send-estimate', async (req, res) => {
  console.log('📧 [CENTRALIZED-EMAIL] Iniciando proceso de envío de estimado');
  
  try {
    const {
      clientEmail,
      clientName,
      contractorEmail,
      contractorName,
      contractorCompany,
      estimateData,
      customMessage,
      sendCopy = false
    } = req.body;

    console.log('📧 [CENTRALIZED-EMAIL] Datos recibidos:', {
      clientEmail,
      clientName,
      contractorEmail,
      contractorName,
      contractorCompany,
      sendCopy,
      estimateNumber: estimateData?.estimateNumber
    });

    // Validar campos requeridos
    if (!clientEmail || !clientName || !contractorEmail || !contractorName || !estimateData) {
      console.error('❌ [CENTRALIZED-EMAIL] Campos faltantes:', {
        clientEmail: !!clientEmail,
        clientName: !!clientName,
        contractorEmail: !!contractorEmail,
        contractorName: !!contractorName,
        estimateData: !!estimateData
      });
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: clientEmail, clientName, contractorEmail, contractorName, estimateData'
      });
    }

    console.log('📧 [CENTRALIZED-EMAIL] Generando HTML del estimado...');
    const estimateHtml = EstimateEmailService.generateEstimateHTML(estimateData);
    console.log('📧 [CENTRALIZED-EMAIL] HTML generado, longitud:', estimateHtml?.length || 0);

    console.log('📧 [CENTRALIZED-EMAIL] Enviando email usando Resend...');
    const result = await resendService.sendCentralizedEmail({
      toEmail: clientEmail,
      toName: clientName,
      contractorEmail,
      contractorName,
      contractorCompany: contractorCompany || contractorName,
      subject: `Estimado Profesional - ${estimateData.estimateNumber} - ${contractorCompany || contractorName}`,
      htmlContent: estimateHtml,
      sendCopyToContractor: sendCopy
    });

    console.log('📧 [CENTRALIZED-EMAIL] Resultado del envío:', result);

    // Detectar limitaciones de Resend API en modo de prueba
    if (!result.success && result.message && result.message.includes('You can only send testing emails')) {
      console.log('🔒 [CENTRALIZED-EMAIL] Detectada limitación de Resend API - modo de prueba');
      
      // Email autorizado para pruebas
      const authorizedTestEmail = 'gelasio@chyrris.com';
      
      // Reintento automático con email autorizado
      console.log('🔄 [CENTRALIZED-EMAIL] Reintentando con email autorizado para demostración...');
      const retryResult = await resendService.sendCentralizedEmail({
        toEmail: authorizedTestEmail,
        toName: `[DEMO] ${clientName}`,
        contractorEmail: authorizedTestEmail,
        contractorName,
        contractorCompany: contractorCompany || contractorName,
        subject: `[DEMO] Estimado Profesional - ${estimateData.estimateNumber} - ${contractorCompany || contractorName}`,
        htmlContent: estimateHtml.replace(clientEmail, `${clientEmail} (Demo sent to ${authorizedTestEmail})`),
        sendCopyToContractor: sendCopy
      });
      
      if (retryResult.success) {
        res.json({
          success: true,
          message: `Email de demostración enviado exitosamente a ${authorizedTestEmail}`,
          emailId: 'centralized-email-demo',
          demoMode: true,
          originalClient: clientEmail,
          authorizedEmail: authorizedTestEmail,
          warning: 'Resend API en modo de prueba - email enviado a dirección autorizada'
        });
        return;
      }
      
      // Si el reintento también falla, enviar información detallada
      res.status(403).json({
        success: false,
        message: 'Limitación del servicio de email: Modo de prueba activo',
        error: 'RESEND_TEST_MODE_LIMITATION',
        details: {
          authorizedEmail: authorizedTestEmail,
          attemptedEmail: clientEmail,
          solution: 'Para enviar emails a cualquier dirección, se requiere verificar un dominio en resend.com/domains',
          supportUrl: 'https://resend.com/domains'
        },
        rawError: result.message
      });
      return;
    }

    res.json(result);

  } catch (error) {
    console.error('Error enviando estimado centralizado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno enviando estimado',
      error: error.message
    });
  }
});

export default router;