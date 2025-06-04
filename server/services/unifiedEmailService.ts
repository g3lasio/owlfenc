/**
 * Servicio Unificado de Email
 * Maneja múltiples proveedores: Email personal, Resend, SendGrid
 */

import { resendService } from './resendService';
// import nodemailer from 'nodemailer'; // Comentado por ahora, implementaremos más adelante si es necesario

export interface EmailConfig {
  provider: 'personal' | 'resend' | 'sendgrid';
  settings: {
    // Para email personal
    email?: string;
    smtpHost?: string;
    smtpPort?: number;
    username?: string;
    password?: string;
    // Para Resend
    resendApiKey?: string;
    resendDomain?: string;
    // Para SendGrid
    sendgridApiKey?: string;
    sendgridFromEmail?: string;
  };
}

export interface EstimateEmailData {
  contractorEmail: string;
  contractorName: string;
  contractorCompany: string;
  clientEmail: string;
  clientName: string;
  estimateData: any;
  customMessage?: string;
  customSubject?: string;
}

export class UnifiedEmailService {
  
  /**
   * Detectar automáticamente el proveedor de email basado en el dominio
   */
  static detectEmailProvider(email: string): {
    provider: string;
    canAutoSetup: boolean;
    smtpConfig?: any;
  } {
    const domain = email.split('@')[1]?.toLowerCase();
    
    const providers = {
      'gmail.com': {
        provider: 'Gmail',
        canAutoSetup: true,
        smtpConfig: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          requiresOAuth: true
        }
      },
      'outlook.com': {
        provider: 'Outlook',
        canAutoSetup: true,
        smtpConfig: {
          host: 'smtp.live.com',
          port: 587,
          secure: false,
          requiresOAuth: true
        }
      },
      'hotmail.com': {
        provider: 'Outlook',
        canAutoSetup: true,
        smtpConfig: {
          host: 'smtp.live.com',
          port: 587,
          secure: false,
          requiresOAuth: true
        }
      },
      'yahoo.com': {
        provider: 'Yahoo',
        canAutoSetup: true,
        smtpConfig: {
          host: 'smtp.mail.yahoo.com',
          port: 587,
          secure: false
        }
      },
      'icloud.com': {
        provider: 'iCloud',
        canAutoSetup: true,
        smtpConfig: {
          host: 'smtp.mail.me.com',
          port: 587,
          secure: false
        }
      }
    };

    return (providers as any)[domain] || {
      provider: 'Custom',
      canAutoSetup: false
    };
  }

  /**
   * Enviar estimado usando la configuración del contratista
   */
  static async sendEstimate(
    emailData: EstimateEmailData,
    emailConfig: EmailConfig
  ): Promise<{ success: boolean; message: string; strategy?: string }> {
    
    try {
      console.log('📧 [UNIFIED-EMAIL] Enviando estimado...');
      console.log('📧 [UNIFIED-EMAIL] Proveedor:', emailConfig.provider);
      console.log('📧 [UNIFIED-EMAIL] Contratista:', emailData.contractorName);
      console.log('📧 [UNIFIED-EMAIL] Cliente:', emailData.clientName);

      const htmlContent = this.generateEstimateHTML(emailData);
      const subject = emailData.customSubject || 
        `Estimado Profesional - ${emailData.estimateData.projectType} - ${emailData.contractorCompany}`;

      let result;

      switch (emailConfig.provider) {
        case 'personal':
          result = await this.sendViaPersonalEmail(emailData, htmlContent, subject, emailConfig);
          break;
        
        case 'resend':
          result = await this.sendViaResend(emailData, htmlContent, subject, emailConfig);
          break;
        
        case 'sendgrid':
          result = await this.sendViaSendGrid(emailData, htmlContent, subject, emailConfig);
          break;
        
        default:
          // Fallback a email proxy usando Resend
          result = await this.sendViaEmailProxy(emailData, htmlContent, subject);
      }

      return result;

    } catch (error) {
      console.error('❌ [UNIFIED-EMAIL] Error enviando estimado:', error);
      return {
        success: false,
        message: 'Error interno enviando estimado'
      };
    }
  }

  /**
   * Enviar usando email personal del contratista
   */
  private static async sendViaPersonalEmail(
    emailData: EstimateEmailData,
    htmlContent: string,
    subject: string,
    emailConfig: EmailConfig
  ): Promise<{ success: boolean; message: string; strategy: string }> {
    
    try {
      // Para email personal, usamos el sistema proxy con reply-to
      return await this.sendViaEmailProxy(emailData, htmlContent, subject);
      
    } catch (error) {
      console.error('❌ [UNIFIED-EMAIL] Error con email personal:', error);
      return {
        success: false,
        message: 'Error enviando desde email personal',
        strategy: 'personal-failed'
      };
    }
  }

  /**
   * Enviar usando Resend API
   */
  private static async sendViaResend(
    emailData: EstimateEmailData,
    htmlContent: string,
    subject: string,
    emailConfig: EmailConfig
  ): Promise<{ success: boolean; message: string; strategy: string }> {
    
    try {
      const fromEmail = emailConfig.settings.resendDomain 
        ? `noreply@${emailConfig.settings.resendDomain}`
        : 'noreply@owlfenc.com';

      const success = await resendService.sendEmail({
        to: emailData.clientEmail,
        from: fromEmail,
        subject,
        html: htmlContent,
        replyTo: emailData.contractorEmail
      });

      return {
        success,
        message: success ? 'Estimado enviado exitosamente via Resend' : 'Error enviando via Resend',
        strategy: 'resend'
      };

    } catch (error) {
      console.error('❌ [UNIFIED-EMAIL] Error con Resend:', error);
      return {
        success: false,
        message: 'Error enviando via Resend',
        strategy: 'resend-failed'
      };
    }
  }

  /**
   * Enviar usando SendGrid
   */
  private static async sendViaSendGrid(
    emailData: EstimateEmailData,
    htmlContent: string,
    subject: string,
    emailConfig: EmailConfig
  ): Promise<{ success: boolean; message: string; strategy: string }> {
    
    try {
      // Implementar SendGrid usando la configuración del usuario
      // Por ahora retornamos el método proxy como fallback
      return await this.sendViaEmailProxy(emailData, htmlContent, subject);
      
    } catch (error) {
      console.error('❌ [UNIFIED-EMAIL] Error con SendGrid:', error);
      return {
        success: false,
        message: 'Error enviando via SendGrid',
        strategy: 'sendgrid-failed'
      };
    }
  }

  /**
   * Sistema proxy usando Resend como fallback
   */
  private static async sendViaEmailProxy(
    emailData: EstimateEmailData,
    htmlContent: string,
    subject: string
  ): Promise<{ success: boolean; message: string; strategy: string }> {
    
    try {
      const success = await resendService.sendEmail({
        to: emailData.clientEmail,
        from: 'noreply@owlfenc.com',
        subject,
        html: htmlContent,
        replyTo: emailData.contractorEmail
      });

      return {
        success,
        message: success ? 'Estimado enviado exitosamente' : 'Error enviando estimado',
        strategy: 'proxy'
      };

    } catch (error) {
      console.error('❌ [UNIFIED-EMAIL] Error con proxy:', error);
      return {
        success: false,
        message: 'Error enviando estimado via proxy',
        strategy: 'proxy-failed'
      };
    }
  }

  /**
   * Generar HTML del estimado
   */
  private static generateEstimateHTML(emailData: EstimateEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a365d; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 30px; background: white; }
          .estimate-details { background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3182ce; }
          .contractor-info { background: #e6f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { background: #2d3748; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .highlight { color: #3182ce; font-weight: bold; }
          .price { font-size: 1.5em; color: #38a169; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${emailData.contractorCompany}</h1>
            <p>Estimado Profesional</p>
          </div>
          
          <div class="content">
            <h2>Estimado/a ${emailData.clientName},</h2>
            
            ${emailData.customMessage ? `
              <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; font-style: italic;">${emailData.customMessage}</p>
              </div>
            ` : ''}
            
            <p>Gracias por contactar a <span class="highlight">${emailData.contractorCompany}</span> para su proyecto de ${emailData.estimateData.projectType}. A continuación encontrará nuestro estimado profesional detallado.</p>
            
            <div class="estimate-details">
              <h3>📋 Detalles del Proyecto:</h3>
              <p><strong>Tipo de Proyecto:</strong> ${emailData.estimateData.projectType}</p>
              <p><strong>Ubicación:</strong> ${emailData.estimateData.projectLocation || 'Por definir'}</p>
              <p><strong>Descripción:</strong> ${emailData.estimateData.projectDescription || 'Según especificaciones'}</p>
              <p><strong>Total del Estimado:</strong> <span class="price">${emailData.estimateData.totalAmount}</span></p>
            </div>
            
            <h3>✅ Este estimado incluye:</h3>
            <ul>
              <li>Materiales de primera calidad</li>
              <li>Mano de obra especializada y certificada</li>
              <li>Garantía en mano de obra</li>
              <li>Seguro de responsabilidad civil</li>
              <li>Limpieza completa del área de trabajo</li>
            </ul>
            
            <div class="contractor-info">
              <h3>📞 Información de Contacto:</h3>
              <p><strong>Empresa:</strong> ${emailData.contractorCompany}</p>
              <p><strong>Contacto:</strong> ${emailData.contractorName}</p>
              <p><strong>Email:</strong> ${emailData.contractorEmail}</p>
              <p><strong>Validez del Estimado:</strong> 30 días a partir de la fecha</p>
            </div>
            
            <p>Para proceder con su proyecto o si tiene alguna pregunta, no dude en contactarnos directamente respondiendo a este email.</p>
            
            <p>Agradecemos la oportunidad de trabajar con usted y esperamos hacer realidad su proyecto.</p>
            
            <p>Atentamente,<br>
            <strong>${emailData.contractorName}</strong><br>
            <em>${emailData.contractorCompany}</em></p>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 ${emailData.contractorCompany}. Todos los derechos reservados.</p>
            <p>Estimado generado con tecnología Mervin AI</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Validar configuración de email
   */
  static validateEmailConfig(emailConfig: EmailConfig): {
    isValid: boolean;
    errors: string[];
    recommendations: string[];
  } {
    const errors: string[] = [];
    const recommendations: string[] = [];

    switch (emailConfig.provider) {
      case 'personal':
        if (!emailConfig.settings.email) {
          errors.push('Email requerido para configuración personal');
        }
        break;
      
      case 'resend':
        if (!emailConfig.settings.resendApiKey) {
          errors.push('API Key de Resend requerida');
        }
        recommendations.push('Resend ofrece excelente entregabilidad');
        break;
      
      case 'sendgrid':
        if (!emailConfig.settings.sendgridApiKey || !emailConfig.settings.sendgridFromEmail) {
          errors.push('API Key y email de envío requeridos para SendGrid');
        }
        recommendations.push('SendGrid es ideal para volúmenes altos');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      recommendations
    };
  }
}

export const unifiedEmailService = new UnifiedEmailService();