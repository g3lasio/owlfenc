/**
 * Servicio de Email con Resend para Owl Fenc
 * Reemplaza completamente SendGrid
 */

import { Resend } from 'resend';

// Initialize Resend with proper configuration
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
  private platformDomain = 'owlfenc.com'; // Dominio profesional de Owl Fenc
  private fallbackDomain = 'resend.dev'; // Dominio de respaldo para desarrollo
  private noReplyEmail = `noreply@${this.platformDomain}`; // Email principal no-reply
  private defaultFromEmail = `noreply@${this.platformDomain}`;
  private supportEmail = `support@${this.platformDomain}`;
  // REMOVED: No test mode redirection for contractor platform to prevent data isolation issues

  /**
   * Multi-tenant contractor platform - NO test mode to prevent data isolation
   * Each contractor must send emails to their own clients
   */
  private isTestMode(): boolean {
    // CRITICAL: Always false for contractor platform to ensure proper email routing
    return false;
  }

  /**
   * Multi-tenant contractor platform - ALWAYS direct delivery
   * No redirection to prevent data isolation between contractors
   */
  private getAppropriateRecipient(originalEmail: string, isSystemTest: boolean = false): string {
    // CRITICAL: Multi-tenant platform requires direct email delivery
    // Each contractor's emails must go to their own clients only
    console.log(`📧 [DIRECT-DELIVERY] Sending email directly to: ${originalEmail}`);
    return originalEmail;
  }

  /**
   * Generar email no-reply profesional usando dominio owlfenc.com
   */
  private generateContractorNoReplyEmail(contractorEmail: string, contractorCompany: string): string {
    // Usar siempre noreply@owlfenc.com para máxima profesionalidad
    // Los clients verán emails desde el dominio oficial de Owl Fenc
    return this.noReplyEmail;
  }

  /**
   * Enviar email desde dominio del contratista con forwarding apropiado
   */
  async sendContractorEmail(params: {
    toEmail: string;
    toName: string;
    contractorEmail: string;
    contractorName: string;
    contractorCompany: string;
    subject: string;
    htmlContent: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }>;
    sendCopyToContractor?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    emailId?: string;
  }> {
    try {
      console.log('📧 [CONTRACTOR-EMAIL] Iniciando envío desde dominio del contratista...');
      console.log('📧 [CONTRACTOR-EMAIL] Cliente:', params.toName, params.toEmail);
      console.log('📧 [CONTRACTOR-EMAIL] Contratista:', params.contractorName, params.contractorEmail);
      console.log('📧 [CONTRACTOR-EMAIL] Empresa:', params.contractorCompany);

      // Generar email no-reply específico del contratista
      const contractorNoReplyEmail = this.generateContractorNoReplyEmail(params.contractorEmail, params.contractorCompany);
      console.log('📧 [CONTRACTOR-EMAIL] Email no-reply generado:', contractorNoReplyEmail);

      // Los emails de contratistas van directamente a clientes reales (NO redirección)
      const finalRecipient = this.getAppropriateRecipient(params.toEmail, false);
      
      // Los emails van directamente sin modificación de contenido
      let finalHtmlContent = params.htmlContent;
      
      // Intentar enviar email desde dominio del contratista
      let clientEmailResult = await this.sendEmail({
        to: params.toEmail,
        from: contractorNoReplyEmail,
        subject: params.subject,
        html: finalHtmlContent,
        replyTo: params.contractorEmail, // Respuestas van directamente al contratista
        attachments: params.attachments
      });

      console.log('📧 [CONTRACTOR-EMAIL] Resultado del envío:', clientEmailResult);

      // Si el envío falla, usar estrategia de recuperación específica del contratista
      if (!clientEmailResult) {
        console.log('📧 [CONTRACTOR-EMAIL] Envío falló, intentando estrategia de recuperación...');
        
        // Estrategia 1: Intentar con email directo del contratista
        console.log('📧 [CONTRACTOR-DIRECT] Intentando con email directo del contratista...');
        const directEmailResult = await this.sendEmail({
          to: params.toEmail, // Email directo del cliente sin redirección
          from: params.contractorEmail, // Email directo del contratista
          subject: params.subject,
          html: finalHtmlContent,
          attachments: params.attachments
        });

        if (directEmailResult) {
          console.log('✅ [CONTRACTOR-DIRECT] Email enviado usando email directo del contratista');
          return {
            success: true,
            message: `Email enviado desde ${params.contractorEmail}. Respuestas irán directamente al contratista.`,
            emailId: 'contractor-direct'
          };
        }

        // Estrategia 2: Solo si falla todo y específicamente para este contratista (no centralizado)
        console.log('📧 [CONTRACTOR-FALLBACK] Todas las estrategias del contratista fallaron...');
        return {
          success: false,
          message: `Error: No se pudo enviar email desde ${contractorNoReplyEmail} ni desde ${params.contractorEmail}. Cada contratista debe configurar su propio dominio de email o usar un servicio verificado.`
        };
      }

      // Enviar copia al contratista si se solicita y el envío fue exitoso
      if (clientEmailResult && params.sendCopyToContractor) {
        console.log('📧 [CONTRACTOR-EMAIL] Enviando copia al contratista...');
        
        // Los contratistas SIEMPRE reciben sus propias copias sin redirección
        const contractorRecipient = params.contractorEmail;
        
        const copyHtml = `
          <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4caf50;">
            <h4 style="color: #2e7d32; margin: 0 0 10px 0;">📧 Copia del Email Enviado a Cliente</h4>
            <p style="color: #2e7d32; margin: 0;">
              <strong>Cliente:</strong> ${params.toName} (${params.toEmail})<br>
              <strong>Desde:</strong> ${contractorNoReplyEmail}<br>
              <strong>Reply-To:</strong> ${params.contractorEmail}<br>
              <strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}
            </p>
          </div>
          ${params.htmlContent}
        `;

        const copyResult = await this.sendEmail({
          to: contractorRecipient, // Usar el destinatario procesado
          from: contractorNoReplyEmail,
          subject: `[COPIA] ${params.subject}`,
          html: copyHtml
        });
        
        if (copyResult) {
          console.log('✅ [CONTRACTOR-EMAIL] Copia enviada exitosamente al contratista');
        } else {
          console.log('⚠️ [CONTRACTOR-EMAIL] No se pudo enviar copia al contratista (no crítico)');
        }
      }

      return {
        success: true,
        message: `Email enviado exitosamente desde ${contractorNoReplyEmail} a ${params.toEmail}`,
        emailId: 'contractor-success'
      };

    } catch (error) {
      console.error('❌ [CONTRACTOR-EMAIL] Error enviando email:', error);
      return {
        success: false,
        message: `Error enviando email del contratista: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Enviar email usando Resend
   */
  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      // Validaciones previas con logs detallados
      console.log('🔍 [RESEND] Iniciando envío de email...');
      console.log('🔍 [RESEND] API Key configurada:', !!process.env.RESEND_API_KEY);
      console.log('🔍 [RESEND] Destinatario:', emailData.to);
      console.log('🔍 [RESEND] Remitente solicitado:', emailData.from);
      console.log('🔍 [RESEND] Remitente por defecto:', emailData.from);
      console.log('🔍 [RESEND] Remitente final:', emailData.from);
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

      // Always use verified domain for production emails
      const fromEmail = emailData.from || this.defaultFromEmail;
      
      // Preparar datos del email con headers anti-spam
      const emailPayload = {
        from: fromEmail,
        to: [emailData.to],
        subject: emailData.subject,
        html: emailData.html,
        replyTo: emailData.replyTo || this.supportEmail,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
          'X-Mailer': 'Owl Fenc Professional Platform',
          'List-Unsubscribe': '<mailto:unsubscribe@owlfenc.com?subject=Unsubscribe>',
          'X-Entity-Ref-ID': `email-${Date.now()}`,
          'Authentication-Results': 'owlfenc.com',
          'DKIM-Signature': 'v=1; a=rsa-sha256; c=relaxed/relaxed; d=owlfenc.com'
        },
        tags: [
          { name: 'category', value: 'business-estimate' },
          { name: 'priority', value: 'high' },
          { name: 'source', value: 'owl-fence-platform' }
        ],
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

      console.log('📧 [RESEND] Enviando con payload:', JSON.stringify({
        from: emailPayload.from,
        to: emailPayload.to,
        subject: emailPayload.subject,
        htmlLength: emailPayload.html.length
      }, null, 2));

      const result = await resend.emails.send(emailPayload);

      console.log('📧 [RESEND] Respuesta completa:', JSON.stringify(result, null, 2));

      if (result.data?.id) {
        console.log('✅ [RESEND] Email enviado exitosamente');
        console.log('✅ [RESEND] ID del email:', result.data.id);
        console.log('✅ [RESEND] Destinatario confirmado:', emailData.to);
        return true;
      } else {
        console.error('❌ [RESEND] Respuesta sin ID:', result);
        if (result.error) {
          console.error('❌ [RESEND] Error detallado:', result.error);
        }
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

    const subject = `Estimado para ${estimateData.projectType} - Owl Fenc`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Quantico:wght@400;700&display=swap');
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
          h1, .brand-name { font-family: 'Quantico', sans-serif; }
          .content { padding: 20px; }
          .estimate-details { background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #2d3748; color: white; padding: 20px; text-align: center; }
          .logo { max-width: 200px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://i.postimg.cc/8zcM3ZC9/White-logo-no-background.png" alt="Owl Fenc" class="logo" style="max-width: 300px; height: auto;">
          <h1>Estimado Profesional</h1>
        </div>
        
        <div class="content">
          <h2>Estimado Señor/a ${clientName},</h2>
          
          <p>Gracias por contactar a Owl Fenc para su proyecto de ${estimateData.projectType}. Adjunto encontrará nuestro estimado profesional detallado.</p>
          
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
          <strong>Equipo de Owl Fenc</strong><br>
          <em>Su partner confiable en proyectos de cercas</em></p>
        </div>
        
        <div class="footer">
          <p>&copy; 2025 Owl Fenc. Todos los derechos reservados.</p>
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
    const subject = `Contrato Profesional - ${contractData.projectType} - Owl Fenc`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Quantico:wght@400;700&display=swap');
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #065f46; color: white; padding: 20px; text-align: center; }
          h1, .brand-name { font-family: 'Quantico', sans-serif; }
          .content { padding: 20px; }
          .contract-details { background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .legal-notice { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; }
          .logo { max-width: 200px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://i.postimg.cc/8zcM3ZC9/White-logo-no-background.png" alt="Owl Fenc" class="logo" style="max-width: 300px; height: auto;">
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
          
          <p>Gracias por confiar en Owl Fenc para su proyecto.</p>
          
          <p>Atentamente,<br>
          <strong>${contractData.contractorName}</strong><br>
          <em>Owl Fenc - Protegidos por Mervin AI Legal Defense</em></p>
        </div>
        
        <div class="footer">
          <p>&copy; 2025 Owl Fenc. Todos los derechos reservados.</p>
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
    const subject = `Enlace de Pago - ${paymentData.description} - Owl Fenc`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Quantico:wght@400;700&display=swap');
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #7c3aed; color: white; padding: 20px; text-align: center; }
          h1, .brand-name { font-family: 'Quantico', sans-serif; }
          .content { padding: 20px; }
          .payment-card { background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border: 2px solid #e2e8f0; text-align: center; }
          .payment-button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0; }
          .footer { background: #374151; color: white; padding: 20px; text-align: center; }
          .logo { max-width: 200px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://i.postimg.cc/8zcM3ZC9/White-logo-no-background.png" alt="Owl Fenc" class="logo" style="max-width: 300px; height: auto;">
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
          
          <p>Gracias por su confianza en Owl Fenc.</p>
          
          <p>Atentamente,<br>
          <strong>Equipo de Pagos - Owl Fenc</strong></p>
        </div>
        
        <div class="footer">
          <p>&copy; 2025 Owl Fenc. Todos los derechos reservados.</p>
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
   * Enviar email de bienvenida cuando se activa una cuenta o suscripción
   * Tono mexicano, motivador y auténtico
   */
  async sendWelcomeEmail(params: {
    userEmail: string;
    userName: string;
    planName: string;
    planFeatures: string[];
  }): Promise<boolean> {
    try {
      console.log('🎉 [WELCOME-EMAIL] Enviando email de bienvenida a:', params.userEmail);
      
      const subject = '¡Bienvenido a Owl Fenc, compa! 🦉';
      
      const html = `
      <!DOCTYPE html>
      <html lang="es-MX">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a Owl Fenc</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: #ffffff;
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: 700;
          }
          .header .emoji {
            font-size: 48px;
            margin-bottom: 10px;
            display: block;
          }
          .content {
            padding: 40px 30px;
          }
          .welcome-message {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #f59e0b;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
          }
          .welcome-message p {
            margin: 0;
            font-size: 16px;
            line-height: 1.8;
            color: #78350f;
          }
          .features {
            background-color: #f3f4f6;
            padding: 25px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .features h3 {
            margin: 0 0 15px 0;
            color: #1f2937;
            font-size: 18px;
          }
          .features ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .features li {
            padding: 8px 0;
            color: #374151;
            font-size: 15px;
          }
          .features li:before {
            content: "✅ ";
            margin-right: 8px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%);
            color: #ffffff;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
          }
          .motivational-quote {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 25px 0;
            border-radius: 8px;
            font-style: italic;
            color: #1e3a8a;
          }
          .footer {
            background-color: #f3f4f6;
            padding: 25px 30px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="emoji">🦉</span>
            <h1>¡Bienvenido a Owl Fenc!</h1>
          </div>
          
          <div class="content">
            <p>Hola <strong>${params.userName || 'Compa'}</strong>,</p>
            
            <div class="welcome-message">
              <p>
                <strong>¡Bienvenido a Owl Fenc, compa!</strong><br><br>
                Aquí las oportunidades no se esperan… <strong>se construyen</strong>.<br>
                Tu cuenta ya está activa y lista para empezar a generar grandes resultados.<br><br>
                Gracias por confiar en nosotros — ahora sí, <strong>a darle duro y con todo</strong>.
              </p>
            </div>
            
            <p>
              Has activado el plan <strong>${params.planName}</strong> y tienes acceso completo a todas estas herramientas profesionales:
            </p>
            
            <div class="features">
              <h3>🚀 Tus Beneficios Activos:</h3>
              <ul>
                ${params.planFeatures.map(feature => `<li>${feature}</li>`).join('')}
              </ul>
            </div>
            
            <div class="motivational-quote">
              <p>
                "El éxito no es cuestión de suerte, es cuestión de echarle ganas y usar las herramientas correctas.<br>
                Con Owl Fenc, tienes todo lo que necesitas para crecer tu negocio como contratista."
              </p>
            </div>
            
            <center>
              <a href="https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'app.owlfenc.com'}/dashboard" class="cta-button" style="color: #ffffff;">
                🎯 Comenzar Ahora →
              </a>
            </center>
            
            <p style="margin-top: 30px;">
              <strong>¿Necesitas ayuda?</strong><br>
              Nuestro equipo está listo para apoyarte en lo que necesites.
            </p>
            
            <p>
              📧 Email: <strong>support@owlfenc.com</strong><br>
              💬 Chat en vivo: Disponible en el dashboard
            </p>
            
            <p style="margin-top: 30px;">
              ¡A darle con todo!<br>
              <strong>El equipo de Owl Fenc</strong> 🦉
            </p>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 Owl Fenc. Todos los derechos reservados.</p>
            <p>Herramientas profesionales para contratistas que construyen su futuro.</p>
          </div>
        </div>
      </body>
      </html>
      `;

      const result = await this.sendEmail({
        to: params.userEmail,
        subject,
        html,
        from: `Owl Fenc <${this.noReplyEmail}>`,
        replyTo: this.supportEmail
      });

      if (result) {
        console.log('✅ [WELCOME-EMAIL] Email de bienvenida enviado exitosamente');
      } else {
        console.error('❌ [WELCOME-EMAIL] Error enviando email de bienvenida');
      }

      return result;
    } catch (error) {
      console.error('❌ [WELCOME-EMAIL] Error en sendWelcomeEmail:', error);
      return false;
    }
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