/**
 * Servicio de email alternativo usando nodemailer con SMTP
 * Fallback para cuando Resend no funciona correctamente
 */

import nodemailer from 'nodemailer';

export class NodemailerEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configurar transportador SMTP con Gmail
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'noreply.owlfence@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || ''
      }
    });
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log('📧 [NODEMAILER] Enviando email con SMTP...');
      console.log('📧 [NODEMAILER] Destinatario:', options.to);
      console.log('📧 [NODEMAILER] Asunto:', options.subject);

      const mailOptions = {
        from: options.from || 'Owl Fenc <noreply.owlfence@gmail.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ [NODEMAILER] Email enviado exitosamente');
      console.log('✅ [NODEMAILER] Message ID:', info.messageId);

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('❌ [NODEMAILER] Error enviando email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ [NODEMAILER] Conexión SMTP verificada');
      return true;
    } catch (error) {
      console.error('❌ [NODEMAILER] Error verificando conexión:', error);
      return false;
    }
  }
}

export const nodemailerService = new NodemailerEmailService();