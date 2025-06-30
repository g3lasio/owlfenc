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