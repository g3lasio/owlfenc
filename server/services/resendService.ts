/**
 * Servicio de Email con Resend para Owl Fence
 * Reemplaza completamente SendGrid
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export class ResendEmailService {
  private defaultFromEmail = 'onboarding@resend.dev';
  private supportEmail = 'onboarding@resend.dev';

  /**
   * Enviar email usando Resend
   */
  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      // Validaciones previas con logs detallados
      console.log('🔍 [RESEND] Iniciando envío de email...');
      console.log('🔍 [RESEND] API Key configurada:', !!process.env.RESEND_API_KEY);
      console.log('🔍 [RESEND] Destinatario:', emailData.to);
      console.log('🔍 [RESEND] Remitente:', emailData.from || this.defaultFromEmail);
      console.log('🔍 [RESEND] Asunto:', emailData.subject);
      console.log('🔍 [RESEND] Tamaño HTML:', emailData.html?.length || 0, 'caracteres');

      if (!process.env.RESEND_API_KEY) {
        console.error('❌ [RESEND] API Key no configurada');
        return false;
      }

      if (!emailData.to || !emailData.subject || !emailData.html) {
        console.error('❌ [RESEND] Datos de email incompletos:', {
          to: !!emailData.to,
          subject: !!emailData.subject,
          html: !!emailData.html
        });
        return false;
      }

      // Preparar datos del email
      const emailPayload = {
        from: emailData.from || this.defaultFromEmail,
        to: [emailData.to],
        subject: emailData.subject,
        html: emailData.html,
        replyTo: emailData.replyTo || this.supportEmail,
        ...(emailData.attachments && emailData.attachments.length > 0 && {
          attachments: emailData.attachments.map(att => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType || 'application/octet-stream'
          }))
        })
      };

      console.log('📤 [RESEND] Enviando email con payload preparado...');
      console.log('📤 [RESEND] Attachments:', emailData.attachments?.length || 0);

      const result = await resend.emails.send(emailPayload);

      if (result.data?.id) {
        console.log('✅ [RESEND] Email enviado exitosamente');
        console.log('✅ [RESEND] ID del email:', result.data.id);
        console.log('✅ [RESEND] Destinatario confirmado:', emailData.to);
        return true;
      } else {
        console.error('❌ [RESEND] Respuesta sin ID:', result);
        return false;
      }

    } catch (error: any) {
      console.error('❌ [RESEND] Error enviando email:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3)
      });

      // Errores específicos de Resend
      if (error.status === 422) {
        console.error('❌ [RESEND] Error 422 - Datos inválidos o dominio no verificado');
      } else if (error.status === 401) {
        console.error('❌ [RESEND] Error 401 - API Key inválida o no autorizada');
      } else if (error.status === 403) {
        console.error('❌ [RESEND] Error 403 - Acceso denegado o límite excedido');
      } else if (error.status === 429) {
        console.error('❌ [RESEND] Error 429 - Límite de rate exceeded');
      }

      return false;
    }
  }

  /**
   * Enviar estimado por email
   */
  async sendEstimate(
    clientEmail: string,
    clientName: string,
    estimateData: any,
    pdfBuffer?: Buffer
  ): Promise<boolean> {
    console.log('📧 [RESEND] Iniciando envío de estimado...');
    console.log('📧 [RESEND] Cliente:', clientName, clientEmail);
    console.log('📧 [RESEND] Proyecto:', estimateData.projectType);
    console.log('📧 [RESEND] PDF adjunto:', !!pdfBuffer, pdfBuffer?.length || 0, 'bytes');

    const subject = `Estimado para ${estimateData.projectType} - Owl Fence LLC`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .estimate-details { background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #2d3748; color: white; padding: 20px; text-align: center; }
          .logo { max-width: 200px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://ik.imagekit.io/lp5czyx2a/logo%20mervin.png?updatedAt=1748883786155" alt="Owl Fence" class="logo">
          <h1>Estimado Profesional</h1>
        </div>
        
        <div class="content">
          <h2>Estimado Señor/a ${clientName},</h2>
          
          <p>Gracias por contactar a Owl Fence LLC para su proyecto de ${estimateData.projectType}. Adjunto encontrará nuestro estimado profesional detallado.</p>
          
          <div class="estimate-details">
            <h3>Detalles del Proyecto:</h3>
            <p><strong>Tipo de Proyecto:</strong> ${estimateData.projectType}</p>
            <p><strong>Ubicación:</strong> ${estimateData.projectLocation || 'Por definir'}</p>
            <p><strong>Descripción:</strong> ${estimateData.projectDescription || 'Según especificaciones'}</p>
            <p><strong>Monto Total:</strong> ${estimateData.totalAmount}</p>
          </div>
          
          <p>Este estimado es válido por 30 días e incluye:</p>
          <ul>
            <li>Materiales de primera calidad</li>
            <li>Mano de obra especializada</li>
            <li>Garantía de 2 años en mano de obra</li>
            <li>Seguro de responsabilidad civil</li>
            <li>Limpieza completa del área de trabajo</li>
          </ul>
          
          <p>Para proceder con su proyecto o si tiene alguna pregunta, no dude en contactarnos:</p>
          <p>📞 Teléfono: <strong>${estimateData.contractorPhone || '(555) 123-4567'}</strong></p>
          <p>📧 Email: <strong>${estimateData.contractorEmail || 'info@owlfenc.com'}</strong></p>
          
          <p>Agradecemos la oportunidad de trabajar con usted.</p>
          
          <p>Atentamente,<br>
          <strong>Equipo de Owl Fence LLC</strong><br>
          <em>Su partner confiable en proyectos de cercas</em></p>
        </div>
        
        <div class="footer">
          <p>&copy; 2025 Owl Fence LLC. Todos los derechos reservados.</p>
          <p>Email: support@owlfenc.com | Web: www.owlfenc.com</p>
        </div>
      </body>
      </html>
    `;

    const attachments = pdfBuffer ? [{
      filename: `Estimado-${clientName.replace(/\s/g, '-')}-${Date.now()}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }] : undefined;

    return this.sendEmail({
      to: clientEmail,
      subject,
      html,
      attachments
    });
  }

  /**
   * Enviar contrato por email
   */
  async sendContract(
    clientEmail: string,
    clientName: string,
    contractData: any,
    pdfBuffer?: Buffer
  ): Promise<boolean> {
    const subject = `Contrato Profesional - ${contractData.projectType} - Owl Fence LLC`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #065f46; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .contract-details { background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .legal-notice { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; }
          .logo { max-width: 200px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://ik.imagekit.io/lp5czyx2a/logo%20mervin.png?updatedAt=1748883786155" alt="Owl Fence" class="logo">
          <h1>Contrato Profesional Generado</h1>
        </div>
        
        <div class="content">
          <h2>Estimado Señor/a ${clientName},</h2>
          
          <p>Adjunto encontrará su contrato profesional generado por nuestro sistema legal Mervin AI, equivalente a asesoría legal de $500/hora.</p>
          
          <div class="contract-details">
            <h3>📋 Detalles del Contrato:</h3>
            <p><strong>Proyecto:</strong> ${contractData.projectType}</p>
            <p><strong>Ubicación:</strong> ${contractData.projectLocation}</p>
            <p><strong>Valor del Contrato:</strong> ${contractData.totalAmount}</p>
            <p><strong>Fecha de Inicio:</strong> ${contractData.startDate}</p>
            <p><strong>Fecha de Finalización:</strong> ${contractData.completionDate}</p>
          </div>
          
          <div class="legal-notice">
            <h3>⚖️ Protecciones Legales Incluidas:</h3>
            <ul>
              <li>🛡️ Cláusulas de protección de pagos</li>
              <li>📝 Protección contra cambios de alcance</li>
              <li>⚖️ Limitación de responsabilidad</li>
              <li>🏛️ Cumplimiento regulatorio completo</li>
              <li>🔒 Derechos de lien reservados</li>
            </ul>
          </div>
          
          <h3>📋 Próximos Pasos:</h3>
          <ol>
            <li>Revise cuidadosamente el contrato adjunto</li>
            <li>Si está de acuerdo con los términos, firme y devuelva una copia</li>
            <li>Programe la fecha de inicio del proyecto</li>
            <li>Prepare el pago inicial según los términos acordados</li>
          </ol>
          
          <p>Para cualquier pregunta sobre el contrato o el proyecto:</p>
          <p>📞 Teléfono: <strong>${contractData.contractorPhone}</strong></p>
          <p>📧 Email: <strong>${contractData.contractorEmail}</strong></p>
          
          <p>Gracias por confiar en Owl Fence LLC para su proyecto.</p>
          
          <p>Atentamente,<br>
          <strong>${contractData.contractorName}</strong><br>
          <em>Owl Fence LLC - Protegidos por Mervin AI Legal Defense</em></p>
        </div>
        
        <div class="footer">
          <p>&copy; 2025 Owl Fence LLC. Todos los derechos reservados.</p>
          <p>Contrato generado por Mervin AI Legal Defense Engine</p>
        </div>
      </body>
      </html>
    `;

    const attachments = pdfBuffer ? [{
      filename: `Contrato-${clientName.replace(/\s/g, '-')}-${Date.now()}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }] : undefined;

    return this.sendEmail({
      to: clientEmail,
      subject,
      html,
      attachments
    });
  }

  /**
   * Enviar enlace de pago
   */
  async sendPaymentLink(
    clientEmail: string,
    clientName: string,
    paymentData: {
      amount: string;
      description: string;
      paymentLink?: string;
      dueDate?: string;
    }
  ): Promise<boolean> {
    const subject = `Enlace de Pago - ${paymentData.description} - Owl Fence LLC`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #7c3aed; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .payment-card { background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 2px solid #e2e8f0; text-align: center; }
          .payment-button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0; }
          .footer { background: #374151; color: white; padding: 20px; text-align: center; }
          .logo { max-width: 200px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://ik.imagekit.io/lp5czyx2a/logo%20mervin.png?updatedAt=1748883786155" alt="Owl Fence" class="logo">
          <h1>💳 Enlace de Pago Seguro</h1>
        </div>
        
        <div class="content">
          <h2>Estimado Señor/a ${clientName},</h2>
          
          <p>Su pago está listo para ser procesado de forma segura a través de nuestro sistema.</p>
          
          <div class="payment-card">
            <h3>💰 Detalles del Pago</h3>
            <p><strong>Concepto:</strong> ${paymentData.description}</p>
            <p><strong>Monto:</strong> <span style="font-size: 1.5em; color: #10b981;">${paymentData.amount}</span></p>
            ${paymentData.dueDate ? `<p><strong>Fecha de Vencimiento:</strong> ${paymentData.dueDate}</p>` : ''}
            
            ${paymentData.paymentLink ? `
              <a href="${paymentData.paymentLink}" class="payment-button">
                🔒 Pagar Ahora de Forma Segura
              </a>
              <p style="font-size: 0.9em; color: #6b7280;">
                Procesamiento seguro con encriptación SSL
              </p>
            ` : `
              <p style="color: #ef4444;">
                Enlace de pago pendiente de generación.<br>
                Nos pondremos en contacto pronto.
              </p>
            `}
          </div>
          
          <h3>🔐 Métodos de Pago Aceptados:</h3>
          <ul>
            <li>💳 Tarjetas de crédito y débito</li>
            <li>🏦 Transferencias bancarias</li>
            <li>📱 Apple Pay / Google Pay</li>
            <li>💰 ACH / Transferencia directa</li>
          </ul>
          
          <h3>❓ ¿Tiene preguntas?</h3>
          <p>Si necesita asistencia con su pago o tiene alguna pregunta:</p>
          <p>📞 Teléfono: <strong>(555) 123-4567</strong></p>
          <p>📧 Email: <strong>payments@owlfenc.com</strong></p>
          
          <p>Gracias por su confianza en Owl Fence LLC.</p>
          
          <p>Atentamente,<br>
          <strong>Equipo de Pagos - Owl Fence LLC</strong></p>
        </div>
        
        <div class="footer">
          <p>&copy; 2025 Owl Fence LLC. Todos los derechos reservados.</p>
          <p>Procesamiento seguro de pagos | SSL Encriptado</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: clientEmail,
      subject,
      html
    });
  }

  /**
   * Verificar el estado del servicio
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Resend doesn't have a direct health check, so we'll verify the API key format
      if (!process.env.RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY no configurada');
        return false;
      }
      
      if (!process.env.RESEND_API_KEY.startsWith('re_')) {
        console.error('❌ RESEND_API_KEY formato inválido');
        return false;
      }
      
      console.log('✅ Resend service configurado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error en health check de Resend:', error);
      return false;
    }
  }
}

export const resendService = new ResendEmailService();