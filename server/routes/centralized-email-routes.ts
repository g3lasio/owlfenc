/**
 * Rutas para el sistema de email centralizado
 * Todos los emails salen desde noreply@owlfenc.com con Reply-To del contratista
 */

import express from 'express';
import { resendService } from '../services/resendService';
import { EstimateEmailService } from '../services/estimateEmailService';
import { simpleTracker } from '../services/SimpleEstimateTracker';
import { nodemailerService } from '../services/nodemailerService';

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
  console.log('📧 [CENTRALIZED-EMAIL] Ruta invocada - inicio');
  
  try {
    console.log('📧 [CENTRALIZED-EMAIL] Procesando request...');
    
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

    console.log('📧 [CENTRALIZED-EMAIL] Raw body:', JSON.stringify(req.body, null, 2));

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

    // Generar HTML del estimado
    console.log('📧 [CENTRALIZED-EMAIL] Generando HTML del estimado...');
    const estimateHtml = generateEstimateHTML({
      clientName,
      contractorName,
      contractorCompany: contractorCompany || contractorName,
      estimateData,
      customMessage
    });

    console.log('📧 [CENTRALIZED-EMAIL] HTML generado, longitud:', estimateHtml.length);

    console.log('📧 [CENTRALIZED-EMAIL] Enviando email usando Resend...');

    // Enviar email usando el servicio contractor-specific
    const result = await resendService.sendContractorEmail({
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

    if (result.success) {
      return res.json({
        success: true,
        message: result.message,
        emailId: result.emailId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('Error enviando estimado centralizado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno enviando estimado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
    try {
      const estimateForTracking = {
        estimateNumber: estimateData.estimateNumber,
        client: {
          name: clientName,
          email: clientEmail
        },
        contractor: {
          email: contractorEmail
        },
        total: estimateData.total
      };
      simpleTracker.saveEstimate(estimateForTracking);
      console.log('✅ [CENTRALIZED-EMAIL] Estimado registrado para seguimiento:', estimateData.estimateNumber);
    } catch (trackingError) {
      console.log('⚠️ [CENTRALIZED-EMAIL] Error registrando estimado para seguimiento, continuando...', trackingError);
    }

    console.log('📧 [CENTRALIZED-EMAIL] Datos recibidos:', {
      clientEmail,
      clientName,
      contractorEmail,
      contractorName,
      contractorCompany,
      sendCopy,
      estimateNumber: estimateData.estimateNumber
    });

    // Enviar email usando sistema centralizado
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
      message: 'Error interno enviando estimado'
    });
  }
});

/**
 * Enviar contrato usando sistema centralizado
 * POST /api/centralized-email/send-contract
 */
router.post('/send-contract', async (req, res) => {
  try {
    const {
      clientEmail,
      clientName,
      contractorEmail,
      contractorName,
      contractorCompany,
      contractData,
      customMessage,
      sendCopy = true
    } = req.body;

    // Validar campos requeridos
    if (!clientEmail || !clientName || !contractorEmail || !contractorName || !contractData) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: clientEmail, clientName, contractorEmail, contractorName, contractData'
      });
    }

    // Generar contenido HTML del contrato
    const contractHtml = generateContractHTML({
      clientName,
      contractorName,
      contractorCompany: contractorCompany || contractorName,
      contractData,
      customMessage
    });

    // Enviar email usando sistema de contratista
    const result = await resendService.sendContractorEmail({
      toEmail: clientEmail,
      toName: clientName,
      contractorEmail,
      contractorName,
      contractorCompany: contractorCompany || contractorName,
      subject: `Contrato Profesional - ${contractData.projectType} - ${contractorCompany || contractorName}`,
      htmlContent: contractHtml,
      sendCopyToContractor: sendCopy
    });

    res.json(result);

  } catch (error) {
    console.error('Error enviando contrato centralizado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno enviando contrato'
    });
  }
});

/**
 * Verificar estado del sistema centralizado
 * GET /api/centralized-email/status
 */
router.get('/status', async (req, res) => {
  try {
    const hasApiKey = !!process.env.RESEND_API_KEY;
    
    res.json({
      success: true,
      connected: hasApiKey,
      service: 'centralized-resend',
      fromEmail: 'noreply@owlfenc.com',
      message: hasApiKey ? 'Sistema centralizado funcionando' : 'API Key de Resend requerida'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      connected: false,
      message: 'Error verificando estado'
    });
  }
});

/**
 * Generar HTML para estimado
 */
function generateEstimateHTML(params: {
  clientName: string;
  contractorName: string;
  contractorCompany: string;
  estimateData: any;
  customMessage?: string;
}): string {
  const { clientName, contractorName, contractorCompany, estimateData, customMessage } = params;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Estimado Profesional - ${contractorCompany}</title>
      <style>
        body { 
          font-family: 'Arial', 'Helvetica', sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%); 
          color: white; 
          padding: 30px 20px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .content { 
          padding: 30px; 
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
          color: #1a365d;
        }
        .custom-message {
          background: #f0f9ff;
          padding: 20px;
          border-left: 4px solid #3b82f6;
          border-radius: 8px;
          margin: 20px 0;
          font-style: italic;
        }
        .estimate-details { 
          background: #f8fafc; 
          padding: 25px; 
          border-radius: 12px; 
          margin: 25px 0; 
          border: 1px solid #e2e8f0;
        }
        .estimate-details h3 {
          margin-top: 0;
          color: #1a365d;
          font-size: 20px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
          border-bottom: none;
          font-weight: bold;
          font-size: 18px;
          color: #059669;
        }
        .contractor-info { 
          background: #ecfef5; 
          padding: 25px; 
          border-radius: 12px; 
          margin: 25px 0; 
          border-left: 4px solid #10b981;
        }
        .contractor-info h3 {
          margin-top: 0;
          color: #065f46;
        }
        .footer { 
          background: #1f2937; 
          color: white; 
          padding: 25px; 
          text-align: center; 
        }
        .footer p {
          margin: 5px 0;
          font-size: 14px;
        }
        .features {
          margin: 25px 0;
        }
        .features ul {
          list-style: none;
          padding: 0;
        }
        .features li {
          padding: 8px 0;
          padding-left: 25px;
          position: relative;
        }
        .features li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #10b981;
          font-weight: bold;
        }
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 8px;
          }
          .content {
            padding: 20px;
          }
          .detail-row {
            flex-direction: column;
            gap: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${contractorCompany}</h1>
          <p>Estimado Profesional</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            Estimado/a ${clientName},
          </div>
          
          ${customMessage ? `
            <div class="custom-message">
              ${customMessage}
            </div>
          ` : ''}
          
          <p>Gracias por contactar a <strong>${contractorCompany}</strong> para su proyecto de ${estimateData.projectType}. A continuación encontrará nuestro estimado profesional detallado.</p>
          
          <div class="estimate-details">
            <h3>📋 Detalles del Proyecto</h3>
            <div class="detail-row">
              <span><strong>Tipo de Proyecto:</strong></span>
              <span>${estimateData.projectType}</span>
            </div>
            <div class="detail-row">
              <span><strong>Ubicación:</strong></span>
              <span>${estimateData.projectLocation || 'Por definir'}</span>
            </div>
            <div class="detail-row">
              <span><strong>Descripción:</strong></span>
              <span>${estimateData.projectDescription || 'Según especificaciones'}</span>
            </div>
            <div class="detail-row">
              <span><strong>Monto Total:</strong></span>
              <span>${estimateData.totalAmount || '$0.00'}</span>
            </div>
          </div>
          
          <div class="features">
            <h3>✨ Este estimado incluye:</h3>
            <ul>
              <li>Materiales de primera calidad</li>
              <li>Mano de obra especializada</li>
              <li>Garantía en mano de obra</li>
              <li>Seguro de responsabilidad civil</li>
              <li>Limpieza completa del área de trabajo</li>
            </ul>
          </div>
          
          <div class="contractor-info">
            <h3>📞 Información de Contacto</h3>
            <p><strong>Empresa:</strong> ${contractorCompany}</p>
            <p><strong>Contacto:</strong> ${contractorName}</p>
            <p><strong>Email:</strong> ${estimateData.contractorEmail || 'info@empresa.com'}</p>
            <p><strong>Teléfono:</strong> ${estimateData.contractorPhone || 'Por proporcionar'}</p>
          </div>
          
          <p>Para proceder con su proyecto o si tiene alguna pregunta, no dude en contactarnos. Responda directamente a este email y su mensaje llegará a ${contractorName}.</p>
          
          <p><strong>Validez del estimado:</strong> 30 días</p>
          
          <p>Agradecemos la oportunidad de trabajar con usted.</p>
          
          <p>Atentamente,<br>
          <strong>${contractorName}</strong><br>
          <em>${contractorCompany}</em></p>
        </div>
        
        <div class="footer">
          <p>&copy; 2025 ${contractorCompany}. Todos los derechos reservados.</p>
          <p>Estimado generado con tecnología Mervin AI</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generar HTML para contrato
 */
function generateContractHTML(params: {
  clientName: string;
  contractorName: string;
  contractorCompany: string;
  contractData: any;
  customMessage?: string;
}): string {
  const { clientName, contractorName, contractorCompany, contractData, customMessage } = params;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contrato Profesional - ${contractorCompany}</title>
      <style>
        body { 
          font-family: 'Arial', 'Helvetica', sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #065f46 0%, #10b981 100%); 
          color: white; 
          padding: 30px 20px; 
          text-align: center; 
        }
        .content { padding: 30px; }
        .legal-notice { 
          background: #fef3c7; 
          padding: 20px; 
          border-radius: 8px; 
          margin: 20px 0; 
          border-left: 4px solid #f59e0b; 
        }
        .footer { 
          background: #1f2937; 
          color: white; 
          padding: 25px; 
          text-align: center; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${contractorCompany}</h1>
          <p>Contrato Profesional</p>
        </div>
        
        <div class="content">
          <h2>Estimado/a ${clientName},</h2>
          
          <p>Adjunto encontrará su contrato profesional generado por nuestro sistema legal Mervin AI.</p>
          
          <div class="legal-notice">
            <h3>⚖️ Protecciones Legales Incluidas:</h3>
            <ul>
              <li>🛡️ Cláusulas de protección de pagos</li>
              <li>📝 Protección contra cambios de alcance</li>
              <li>⚖️ Limitación de responsabilidad</li>
              <li>🏛️ Cumplimiento regulatorio completo</li>
            </ul>
          </div>
          
          <p>Para cualquier pregunta, responda directamente a este email.</p>
          
          <p>Atentamente,<br>
          <strong>${contractorName}</strong><br>
          <em>${contractorCompany}</em></p>
        </div>
        
        <div class="footer">
          <p>&copy; 2025 ${contractorCompany}. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default router;