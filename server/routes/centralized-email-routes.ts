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
 * Test endpoint específico para verificar servicio de email
 * POST /api/centralized-email/test-send
 */
router.post('/test-send', async (req, res) => {
  try {
    console.log('📧 [CENTRALIZED-EMAIL] Test send invoked');
    
    // Test básico del servicio de email sin dependencias complejas
    const testEmail = await resendService.sendEmail({
      to: "gelasio@chyrris.com",
      from: "onboarding@resend.dev",
      subject: "Test - Sistema Owl Fence",
      html: "<h1>Test Email</h1><p>Email test funcionando correctamente</p>"
    });
    
    console.log('📧 [CENTRALIZED-EMAIL] Test result:', testEmail);
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully',
      result: testEmail
    });
    
  } catch (error) {
    console.error('❌ [CENTRALIZED-EMAIL] Test error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test de envío de estimado simple
 * POST /api/centralized-email/test-estimate
 */
router.post('/test-estimate', async (req, res) => {
  try {
    console.log('📧 [TEST-ESTIMATE] Test de estimado iniciado');
    
    const testHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #00bcd4;">Estimado Profesional</h1>
        <div style="border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
          <h2>Información del Cliente</h2>
          <p><strong>Nombre:</strong> Cliente Test</p>
          <p><strong>Email:</strong> gelasio@chyrris.com</p>
          
          <h2>Información del Contratista</h2>
          <p><strong>Nombre:</strong> Contratista Test</p>
          <p><strong>Empresa:</strong> Test Company LLC</p>
          
          <h2>Detalles del Estimado</h2>
          <p><strong>Número:</strong> EST-TEST-001</p>
          <p><strong>Total:</strong> $5,000</p>
          <p><strong>Tipo de Proyecto:</strong> Cerca de Madera</p>
        </div>
      </div>
    `;
    
    const result = await resendService.sendEmail({
      to: "gelasio@chyrris.com",
      from: "onboarding@resend.dev",
      subject: "Test Estimado - EST-001",
      html: testHtml
    });
    
    console.log('📧 [TEST-ESTIMATE] Resultado:', result);
    
    res.json({
      success: true,
      message: 'Test estimado enviado exitosamente',
      result
    });
    
  } catch (error) {
    console.error('❌ [TEST-ESTIMATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error en test de estimado',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
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
      sendCopy = true  // ✅ CORREGIDO: Default true para enviar copia al contratista
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

    // Convertir datos del frontend al formato EstimateData para EstimateEmailService
    // Asegurar que todos los campos requeridos estén definidos
    const estimateEmailData = {
      estimateNumber: estimateData.estimateNumber || `EST-${Date.now()}`,
      date: estimateData.date || new Date().toLocaleDateString('es-ES'),
      client: {
        name: clientName || 'Cliente',
        email: clientEmail || 'cliente@example.com',
        address: estimateData.client?.address || 'Dirección por especificar',
        phone: estimateData.client?.phone || 'Teléfono por especificar'
      },
      contractor: {
        companyName: contractorCompany || contractorName || 'Empresa',
        name: contractorName || 'Contratista',
        email: contractorEmail || 'contratista@example.com',
        phone: estimateData.contractor?.phone || 'Por especificar',
        address: estimateData.contractor?.address || 'Por especificar',
        city: estimateData.contractor?.city || 'Por especificar',
        state: estimateData.contractor?.state || 'CA',
        zipCode: estimateData.contractor?.zipCode || '00000',
        license: estimateData.contractor?.license || 'Por especificar',
        insurancePolicy: estimateData.contractor?.insurancePolicy || 'Por especificar',
        logo: estimateData.contractor?.logo || null,  // Usar null en lugar de string vacío
        website: estimateData.contractor?.website || 'owlfenc.com'
      },
      project: {
        type: estimateData.project?.type || estimateData.projectType || 'Proyecto de construcción',
        description: estimateData.project?.description || estimateData.title || customMessage || 'Proyecto profesional',
        location: estimateData.project?.location || estimateData.client?.address || 'Ubicación por especificar',
        scopeOfWork: estimateData.project?.scopeOfWork || estimateData.projectDetails || customMessage || 'Alcance por especificar'
      },
      items: Array.isArray(estimateData.items) ? estimateData.items : [],
      subtotal: Number(estimateData.subtotal) || 0,
      discount: Number(estimateData.discountAmount) || 0,
      discountType: estimateData.discountType || 'percentage',
      discountValue: Number(estimateData.discountValue) || 0,
      tax: Number(estimateData.tax) || 0,
      taxRate: Number(estimateData.taxRate) || 0,
      total: Number(estimateData.total) || 0,
      notes: customMessage || estimateData.notes || 'Sin notas adicionales',
      validUntil: estimateData.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES') // 30 días
    };

    console.log('📧 [CENTRALIZED-EMAIL] Datos convertidos para EstimateEmailService:', {
      estimateNumber: estimateEmailData.estimateNumber,
      clientEmail: estimateEmailData.client.email,
      contractorEmail: estimateEmailData.contractor.email,
      projectType: estimateEmailData.project.type,
      total: estimateEmailData.total,
      sendCopy
    });

    // Usar EstimateEmailService que tiene funcionalidad completa de sendCopy
    if (sendCopy) {
      console.log('✅ [CENTRALIZED-EMAIL] Enviando estimado CON copia al contratista usando EstimateEmailService...');
      const result = await EstimateEmailService.sendEstimateToClient(estimateEmailData);
      
      if (result.success) {
        console.log('✅ [CENTRALIZED-EMAIL] Estimado y copia enviados exitosamente');
        
        // Registrar para seguimiento
        try {
          const estimateForTracking = {
            estimateNumber: estimateEmailData.estimateNumber,
            client: {
              name: clientName,
              email: clientEmail
            },
            contractor: {
              email: contractorEmail
            },
            total: estimateEmailData.total
          };
          simpleTracker.saveEstimate(estimateForTracking);
          console.log('✅ [CENTRALIZED-EMAIL] Estimado registrado para seguimiento:', estimateEmailData.estimateNumber);
        } catch (trackingError) {
          console.log('⚠️ [CENTRALIZED-EMAIL] Error registrando estimado para seguimiento, continuando...', trackingError);
        }
        
        res.json({
          success: true,
          message: 'Estimado enviado exitosamente al cliente y copia enviada al contratista',
          result
        });
      } else {
        console.error('❌ [CENTRALIZED-EMAIL] Error en EstimateEmailService:', result.message);
        res.status(500).json({
          success: false,
          message: result.message
        });
      }
    } else {
      console.log('📧 [CENTRALIZED-EMAIL] Enviando estimado SIN copia al contratista...');
      
      // Solo enviar al cliente sin copia
      const success = await resendService.sendEmail({
        to: clientEmail,
        from: "mervin@owlfenc.com",
        subject: `Estimado ${estimateEmailData.estimateNumber} - ${estimateEmailData.project.type} | ${estimateEmailData.contractor.companyName}`,
        html: EstimateEmailService.generateEstimateHTML(estimateEmailData),
        replyTo: contractorEmail
      });

      if (success) {
        console.log('✅ [CENTRALIZED-EMAIL] Estimado enviado solo al cliente');
        res.json({
          success: true,
          message: 'Estimado enviado exitosamente al cliente (sin copia)'
        });
      } else {
        console.error('❌ [CENTRALIZED-EMAIL] Error enviando estimado solo al cliente');
        res.status(500).json({
          success: false,
          message: 'Error enviando estimado al cliente'
        });
      }
    }

  } catch (error) {
    console.error('❌ [CENTRALIZED-EMAIL] Error enviando estimado centralizado:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno enviando estimado',
      error: error instanceof Error ? error.message : 'Error desconocido'
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