import { Router } from 'express';
import { resendService } from '../services/resendService';

const router = Router();

// Using Resend service

// Send estimate email
router.post('/send-estimate-email', async (req, res) => {
  try {
    const {
      clientEmail,
      clientName,
      contractorName,
      contractorEmail,
      estimateNumber,
      estimateHtml,
      totalAmount,
      projectDescription,
      customSubject,
      customMessage,
      sendCopy,
      contractorProfile
    } = req.body;

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'Resend API key not configured' 
      });
    }

    if (!clientEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Client email is required' 
      });
    }

    // Professional email template with custom message
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Estimado de Proyecto - ${estimateNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
            .estimate-summary { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .total-amount { font-size: 24px; font-weight: bold; color: #1e3a8a; text-align: center; margin: 20px 0; }
            .contact-info { background: #fafafa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .custom-message { background: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Estimado de Proyecto</h1>
                <p>Estimado #${estimateNumber}</p>
                <p>${new Date().toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
            </div>
            
            <div class="content">
                ${customMessage ? `
                <div class="custom-message">
                    <div style="white-space: pre-wrap;">${customMessage}</div>
                </div>
                ` : `
                <h2>Estimado Sr./Sra. ${clientName},</h2>
                <p>Nos complace presentarle el estimado detallado para su proyecto de construcción.</p>
                `}
                
                <div class="estimate-summary">
                    <h3>📊 Resumen del Proyecto</h3>
                    <p><strong>Descripción:</strong> ${projectDescription || 'Proyecto de construcción personalizado'}</p>
                    <div class="total-amount">
                        Total del Estimado: $${totalAmount.toLocaleString()}
                    </div>
                </div>
                
                <h3>Detalles del Estimado</h3>
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                    ${estimateHtml}
                </div>
                
                <div class="contact-info">
                    <h4>Información de Contacto</h4>
                    <p><strong>${contractorName}</strong></p>
                    <p>📧 Email: ${contractorEmail}</p>
                    ${contractorProfile?.phone ? `<p>📞 Teléfono: ${contractorProfile.phone}</p>` : ''}
                    ${contractorProfile?.website ? `<p>🌐 Website: ${contractorProfile.website}</p>` : ''}
                    <p>Para cualquier consulta sobre este estimado, contáctenos directamente.</p>
                </div>
                
                <p>Atentamente,<br>
                <strong>${contractorName}</strong></p>
            </div>
            
            <div class="footer">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    Este estimado es válido por 30 días desde la fecha de emisión.<br>
                    Generado profesionalmente con Owl Fence Platform
                </p>
            </div>
        </div>
    </body>
    </html>`;

    // Ensure we have a contractor email to send from
    if (!contractorEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Contractor email is required to send emails. Please update your profile.' 
      });
    }

    // Send copy to contractor if requested
    if (sendCopy && contractorEmail) {
      const copySuccess = await resendService.sendEmail({
        to: contractorEmail,
        from: contractorEmail,
        subject: `[COPY] ${customSubject || `Your Professional Estimate is Ready - ${contractorName}`}`,
        html: `<div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
          <p style="margin: 0; color: #1e40af;"><strong>📧 Copy of email sent to your client</strong></p>
          <p style="margin: 5px 0 0 0; color: #64748b;">Sent to: ${clientName} (${clientEmail})</p>
        </div>
        ${emailHtml}`,
        replyTo: contractorEmail
      });
      
      if (!copySuccess) {
        console.warn('Failed to send copy email to contractor');
      }
    }

    const success = await resendService.sendEmail({
      to: clientEmail,
      from: contractorEmail,
      subject: customSubject || `Your Professional Estimate is Ready - ${contractorName}`,
      html: emailHtml,
      replyTo: contractorEmail
    });

    if (!success) {
      throw new Error('Failed to send estimate email');
    }

    res.json({ 
      success: true, 
      message: 'Estimado enviado por correo exitosamente' 
    });

  } catch (error) {
    console.error('Error sending estimate email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al enviar el correo electrónico' 
    });
  }
});

export default router;