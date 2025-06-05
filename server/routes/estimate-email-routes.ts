import express from 'express';
import { simpleTracker } from '../services/SimpleEstimateTracker.js';
import { resendService } from '../services/resendService.js';
import { optimizedPdfEmailService } from '../services/OptimizedPdfEmailService.js';

const router = express.Router();

// GET handler para aprobación rápida desde enlaces de email
router.get('/approve', async (req, res) => {
  try {
    const { estimateId, clientName, clientEmail, contractorEmail, action } = req.query;

    if (action === 'quick-approve') {
      console.log('⚡ [QUICK-APPROVE] Procesando aprobación rápida:', {
        estimateId,
        clientEmail,
        contractorEmail
      });

      // Actualizar estado en el tracker
      await simpleTracker.updateEstimateStatus(estimateId as string, 'approved', {
        clientName: clientName as string,
        clientEmail: clientEmail as string,
        approvalDate: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvalMethod: 'quick-email'
      });

      // Notificar al contratista
      const contractorNotificationHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #d1fae5; padding: 20px; border-radius: 12px; border-left: 4px solid #10b981;">
            <h2 style="color: #065f46; margin: 0 0 15px 0;">✅ Estimado Aprobado</h2>
            <p style="color: #047857; margin: 0 0 10px 0;"><strong>Estimado:</strong> ${estimateId}</p>
            <p style="color: #047857; margin: 0 0 10px 0;"><strong>Cliente:</strong> ${clientName}</p>
            <p style="color: #047857; margin: 0 0 10px 0;"><strong>Email:</strong> ${clientEmail}</p>
            <p style="color: #047857; margin: 0;"><strong>Aprobado:</strong> ${new Date().toLocaleString('es-ES')}</p>
          </div>
        </div>
      `;

      await resendService.sendEmail({
        to: contractorEmail as string,
        subject: `✅ Estimado ${estimateId} Aprobado - Proyecto Listo para Iniciar`,
        html: contractorNotificationHtml
      });

      // Responder con página de confirmación
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Estimado Aprobado</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; background: #f0fdf4; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .success { background: #d1fae5; color: #065f46; padding: 20px; border-radius: 8px; text-align: center; }
              .details { margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success">
                <h1>✅ Estimado Aprobado Exitosamente</h1>
                <p>Su aprobación ha sido procesada y el contratista ha sido notificado.</p>
              </div>
              <div class="details">
                <p><strong>Estimado:</strong> ${estimateId}</p>
                <p><strong>Cliente:</strong> ${clientName}</p>
                <p><strong>Fecha de Aprobación:</strong> ${new Date().toLocaleString('es-ES')}</p>
              </div>
              <p style="text-align: center; color: #6b7280;">El contratista se comunicará con usted pronto para coordinar el inicio del proyecto.</p>
            </div>
          </body>
        </html>
      `);
      return;
    }

    res.status(400).send('Acción no soportada');
  } catch (error) {
    console.error('❌ [EMAIL-APPROVE-GET] Error:', error);
    res.status(500).send('Error procesando aprobación');
  }
});

// GET handler para solicitar cambios
router.get('/request-changes', async (req, res) => {
  try {
    const { estimateId, clientName, clientEmail, contractorEmail } = req.query;

    console.log('📝 [REQUEST-CHANGES-GET] Procesando solicitud de cambios:', {
      estimateId,
      clientEmail,
      contractorEmail
    });

    // Responder con formulario de cambios
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Solicitar Cambios - ${estimateId}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; background: #fef3e2; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: #fef3e2; color: #92400e; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
            .form-group { margin-bottom: 20px; }
            .form-label { display: block; margin-bottom: 8px; font-weight: 600; color: #374151; }
            .form-input, .form-textarea { width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; }
            .form-textarea { min-height: 120px; resize: vertical; }
            .btn-submit { background: #f59e0b; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; width: 100%; }
            .btn-submit:hover { background: #d97706; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📝 Solicitar Cambios al Estimado</h1>
              <p>Estimado: ${estimateId}</p>
            </div>
            
            <form action="/api/estimate-email/request-changes" method="POST">
              <input type="hidden" name="estimateId" value="${estimateId}">
              <input type="hidden" name="contractorEmail" value="${contractorEmail}">
              
              <div class="form-group">
                <label class="form-label">Su nombre completo:</label>
                <input type="text" name="clientName" class="form-input" value="${clientName}" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">Email de contacto:</label>
                <input type="email" name="clientEmail" class="form-input" value="${clientEmail}" required>
              </div>
              
              <div class="form-group">
                <label class="form-label">Describa los cambios que necesita:</label>
                <textarea name="clientNotes" class="form-textarea" 
                          placeholder="Por favor describa específicamente qué cambios le gustaría hacer al estimado..." 
                          required></textarea>
              </div>
              
              <div class="form-group">
                <label class="form-label">Cambios específicos solicitados:</label>
                <textarea name="requestedChanges" class="form-textarea" 
                          placeholder="Ej: Cambiar material de madera a vinilo, ajustar número de postes, modificar cronograma, etc..." 
                          required></textarea>
              </div>
              
              <button type="submit" class="btn-submit">📝 Enviar Solicitud de Cambios</button>
            </form>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ [REQUEST-CHANGES-GET] Error:', error);
    res.status(500).send('Error procesando solicitud');
  }
});

// Endpoint para aprobación de estimados directamente desde email
router.post('/approve', async (req, res) => {
  try {
    const { estimateId, clientName, clientEmail, contractorEmail, approvalDate } = req.body;
    
    console.log('📋 [EMAIL-APPROVE] Procesando aprobación desde email:', {
      estimateId,
      clientName,
      clientEmail,
      contractorEmail
    });

    // Actualizar estado en el tracker
    await simpleTracker.updateEstimateStatus(estimateId, 'approved', {
      clientName,
      clientEmail,
      approvalDate,
      approvedAt: new Date().toISOString(),
      approvalMethod: 'email'
    });

    // Notificar al contratista por email
    const contractorNotificationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #059669; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">✅ Estimate Approved!</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #059669; margin: 0 0 15px 0;">Estimate ${estimateId} has been approved</h2>
          
          <div style="margin-bottom: 15px;">
            <strong>Client:</strong> ${clientName}<br>
            <strong>Email:</strong> ${clientEmail}<br>
            <strong>Approved on:</strong> ${approvalDate}<br>
            <strong>Status:</strong> <span style="color: #059669; font-weight: bold;">APPROVED</span>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #059669;">
            <p style="margin: 0; color: #374151;">
              <strong>Next Steps:</strong> You can now proceed with the project according to the terms outlined in the estimate. 
              The client has confirmed their approval and you can begin scheduling the work.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px;">
          <p>This notification was sent automatically when the client approved the estimate via email.</p>
        </div>
      </div>
    `;

    await resendService.sendEmail({
      to: contractorEmail,
      subject: `✅ Estimate ${estimateId} Approved - Ready to Begin Project`,
      html: contractorNotificationHtml
    });

    console.log('✅ [EMAIL-APPROVE] Aprobación procesada exitosamente');
    
    // Responder con página de confirmación
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Estimate Approved</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .success { color: #059669; text-align: center; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">
            <h1>✅ Estimate Approved Successfully!</h1>
            <p>Thank you for approving estimate ${estimateId}.</p>
            <p>The contractor has been notified and will contact you soon to schedule the project.</p>
            <p><small>You can close this window.</small></p>
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ [EMAIL-APPROVE] Error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .error { color: #dc2626; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error">
            <h1>❌ Error Processing Approval</h1>
            <p>There was an error processing your approval. Please try again or contact the contractor directly.</p>
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

// Endpoint para solicitudes de cambios directamente desde email
router.post('/adjust', async (req, res) => {
  try {
    const { estimateId, clientName, clientEmail, contractorEmail, clientNotes, requestedChanges } = req.body;
    
    console.log('📝 [EMAIL-ADJUST] Procesando solicitud de cambios desde email:', {
      estimateId,
      clientName,
      clientEmail,
      contractorEmail
    });

    // Actualizar estado en el tracker
    await simpleTracker.updateEstimateStatus(estimateId, 'adjustment_requested', {
      clientName,
      clientEmail,
      clientNotes,
      requestedChanges,
      requestedAt: new Date().toISOString(),
      requestMethod: 'email'
    });

    // Notificar al contratista por email
    const contractorNotificationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #d97706; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">📝 Changes Requested</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #d97706; margin: 0 0 15px 0;">Client has requested changes to estimate ${estimateId}</h2>
          
          <div style="margin-bottom: 20px;">
            <strong>Client:</strong> ${clientName}<br>
            <strong>Email:</strong> ${clientEmail}<br>
            <strong>Requested on:</strong> ${new Date().toLocaleDateString()}<br>
            <strong>Status:</strong> <span style="color: #d97706; font-weight: bold;">CHANGES REQUESTED</span>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #d97706; margin-bottom: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #374151;">Client Notes:</h4>
            <p style="margin: 0; color: #6b7280;">${clientNotes}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #d97706;">
            <h4 style="margin: 0 0 10px 0; color: #374151;">Requested Changes:</h4>
            <p style="margin: 0; color: #6b7280;">${requestedChanges}</p>
          </div>
        </div>
        
        <div style="background: #fef3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <h4 style="margin: 0 0 10px 0; color: #92400e;">Next Steps:</h4>
          <p style="margin: 0; color: #92400e;">
            Please review the requested changes and create a revised estimate. 
            Contact the client directly to clarify any questions about the modifications.
          </p>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
          <p>This notification was sent automatically when the client requested changes via email.</p>
        </div>
      </div>
    `;

    await resendService.sendEmail({
      to: contractorEmail,
      subject: `📝 Changes Requested for Estimate ${estimateId}`,
      html: contractorNotificationHtml
    });

    console.log('✅ [EMAIL-ADJUST] Solicitud de cambios procesada exitosamente');
    
    // Responder con página de confirmación
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Changes Requested</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .success { color: #d97706; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">
            <h1>📝 Changes Requested Successfully!</h1>
            <p>Your request for changes to estimate ${estimateId} has been sent.</p>
            <p>The contractor will review your requests and provide a revised estimate soon.</p>
            <p><small>You can close this window.</small></p>
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('❌ [EMAIL-ADJUST] Error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .error { color: #dc2626; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error">
            <h1>❌ Error Processing Request</h1>
            <p>There was an error processing your change request. Please try again or contact the contractor directly.</p>
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

// Endpoint optimizado para envío de PDFs con PDF Monkey
router.post('/send-optimized', async (req, res) => {
  try {
    console.log('🚀 [OPTIMIZED-PDF] Procesando envío optimizado de estimado...');
    
    const result = await optimizedPdfEmailService.sendEstimateEmail(req.body);
    
    if (result.success) {
      console.log(`✅ [OPTIMIZED-PDF] Estimado enviado exitosamente en ${result.processingTime}ms`);
      res.json({
        success: true,
        message: 'Estimado enviado exitosamente con PDF generado por PDF Monkey',
        data: {
          messageId: result.messageId,
          pdfGenerated: result.pdfGenerated,
          pdfSize: result.pdfSize,
          processingTime: result.processingTime,
          estimateTracked: result.estimateTracked
        }
      });
    } else {
      console.log(`❌ [OPTIMIZED-PDF] Error: ${result.error}`);
      res.status(500).json({
        success: false,
        error: result.error,
        processingTime: result.processingTime
      });
    }
  } catch (error) {
    console.error('❌ [OPTIMIZED-PDF] Error crítico:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;