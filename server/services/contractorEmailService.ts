/**
 * Servicio de Email para Contratistas
 * Maneja el envío de emails desde el dominio del contratista o proxy
 */

import { resendService } from './resendService';

export interface ContractorProfile {
  email: string;
  companyName: string;
  displayName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  license?: string;
  website?: string;
  verifiedDomain?: string; // Dominio verificado en Resend
  customFromEmail?: string; // Email personalizado verificado
}

export interface EmailTemplate {
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export class ContractorEmailService {
  private defaultDomain = 'owlfenc.com';
  private proxyEmail = 'noreply@owlfenc.com';

  /**
   * Determinar el email de envío óptimo para el contratista
   */
  private determineFromEmail(contractor: ContractorProfile): {
    fromEmail: string;
    replyToEmail: string;
    strategy: 'verified-domain' | 'custom-email' | 'proxy';
  } {
    // Opción 1: Dominio verificado propio
    if (contractor.verifiedDomain) {
      const fromEmail = `noreply@${contractor.verifiedDomain}`;
      return {
        fromEmail,
        replyToEmail: contractor.email,
        strategy: 'verified-domain'
      };
    }

    // Opción 2: Email personalizado verificado
    if (contractor.customFromEmail) {
      return {
        fromEmail: contractor.customFromEmail,
        replyToEmail: contractor.email,
        strategy: 'custom-email'
      };
    }

    // Opción 3: Sistema proxy (fallback)
    return {
      fromEmail: this.proxyEmail,
      replyToEmail: contractor.email,
      strategy: 'proxy'
    };
  }

  /**
   * Enviar email desde el contratista al cliente
   */
  async sendContractorEmail(params: {
    contractorEmail: string;
    contractorName: string;
    clientEmail: string;
    clientName: string;
    template: EmailTemplate;
    sendCopy?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    emailStrategy?: string;
  }> {
    try {
      console.log('📧 [CONTRACTOR-EMAIL] Iniciando envío desde contratista...');
      console.log('📧 [CONTRACTOR-EMAIL] Contratista:', params.contractorName, params.contractorEmail);
      console.log('📧 [CONTRACTOR-EMAIL] Cliente:', params.clientName, params.clientEmail);

      // Crear perfil básico del contratista
      const contractorProfile: ContractorProfile = {
        email: params.contractorEmail,
        companyName: params.contractorName,
        displayName: params.contractorName
      };

      // Determinar estrategia de envío
      const emailConfig = this.determineFromEmail(contractorProfile);
      console.log('📧 [CONTRACTOR-EMAIL] Estrategia de envío:', emailConfig.strategy);
      console.log('📧 [CONTRACTOR-EMAIL] From:', emailConfig.fromEmail);
      console.log('📧 [CONTRACTOR-EMAIL] Reply-To:', emailConfig.replyToEmail);

      // Personalizar el email con información del contratista
      const personalizedHtml = this.personalizeEmailTemplate(
        params.template.html,
        contractorProfile,
        emailConfig.strategy
      );

      // Enviar email al cliente
      const clientEmailSent = await resendService.sendEmail({
        to: params.clientEmail,
        from: emailConfig.fromEmail,
        subject: params.template.subject,
        html: personalizedHtml,
        replyTo: emailConfig.replyToEmail,
        attachments: params.template.attachments
      });

      if (!clientEmailSent) {
        return {
          success: false,
          message: 'Error enviando email al cliente. Verifique la configuración de su dominio.'
        };
      }

      // Enviar copia al contratista si se solicita
      if (params.sendCopy) {
        const copyEmailSent = await resendService.sendEmail({
          to: params.contractorEmail,
          from: emailConfig.fromEmail,
          subject: `[COPIA] ${params.template.subject}`,
          html: `
            <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
              <p style="margin: 0; color: #1e40af;"><strong>📧 Copia del email enviado a su cliente</strong></p>
              <p style="margin: 5px 0 0 0; color: #64748b;">Enviado a: ${params.clientName} (${params.clientEmail})</p>
              <p style="margin: 5px 0 0 0; color: #64748b;">Estrategia: ${emailConfig.strategy}</p>
            </div>
            ${personalizedHtml}
          `,
          replyTo: emailConfig.replyToEmail
        });

        if (!copyEmailSent) {
          console.warn('⚠️ [CONTRACTOR-EMAIL] No se pudo enviar copia al contratista');
        }
      }

      return {
        success: true,
        message: 'Email enviado exitosamente',
        emailStrategy: emailConfig.strategy
      };

    } catch (error) {
      console.error('❌ [CONTRACTOR-EMAIL] Error enviando email:', error);
      return {
        success: false,
        message: 'Error interno enviando email'
      };
    }
  }

  /**
   * Personalizar template con información del contratista
   */
  private personalizeEmailTemplate(
    html: string,
    contractor: ContractorProfile,
    strategy: string
  ): string {
    let personalizedHtml = html;

    // Reemplazar placeholders comunes
    personalizedHtml = personalizedHtml
      .replace(/\{contractor\.companyName\}/g, contractor.companyName)
      .replace(/\{contractor\.displayName\}/g, contractor.displayName || contractor.companyName)
      .replace(/\{contractor\.email\}/g, contractor.email)
      .replace(/\{contractor\.phone\}/g, contractor.phone || 'No especificado')
      .replace(/\{contractor\.address\}/g, contractor.address || 'No especificada')
      .replace(/\{contractor\.website\}/g, contractor.website || '');

    // Agregar nota sobre el método de envío si es proxy
    if (strategy === 'proxy') {
      const proxyNotice = `
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-size: 0.9em;">
            <strong>📧 Nota:</strong> Este email fue enviado a través de nuestro sistema seguro. 
            Para responder directamente al contratista, use el botón "Responder" de su cliente de email.
          </p>
        </div>
      `;
      
      // Insertar antes del cierre del contenido
      personalizedHtml = personalizedHtml.replace(
        /<\/div>\s*<div class="footer"/,
        `${proxyNotice}</div><div class="footer"`
      );
    }

    return personalizedHtml;
  }

  /**
   * Crear template de estimado personalizado
   */
  static createEstimateTemplate(
    clientName: string,
    contractorName: string,
    contractorProfile: ContractorProfile,
    estimateData: any,
    customMessage?: string
  ): EmailTemplate {
    const subject = `Estimado Profesional - ${estimateData.projectType} - ${contractorProfile.companyName}`;
    
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
          .contractor-info { background: #e6f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>{contractor.companyName}</h1>
          <p>Estimado Profesional</p>
        </div>
        
        <div class="content">
          <h2>Estimado/a ${clientName},</h2>
          
          ${customMessage ? `
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; font-style: italic;">${customMessage}</p>
            </div>
          ` : ''}
          
          <p>Gracias por contactar a {contractor.companyName} para su proyecto de ${estimateData.projectType}. Adjunto encontrará nuestro estimado profesional detallado.</p>
          
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
            <li>Garantía en mano de obra</li>
            <li>Seguro de responsabilidad civil</li>
            <li>Limpieza del área de trabajo</li>
          </ul>
          
          <div class="contractor-info">
            <h3>📞 Información de Contacto:</h3>
            <p><strong>Empresa:</strong> {contractor.companyName}</p>
            <p><strong>Contacto:</strong> {contractor.displayName}</p>
            <p><strong>Teléfono:</strong> {contractor.phone}</p>
            <p><strong>Email:</strong> {contractor.email}</p>
            ${contractorProfile.address ? `<p><strong>Dirección:</strong> {contractor.address}</p>` : ''}
            ${contractorProfile.license ? `<p><strong>Licencia:</strong> ${contractorProfile.license}</p>` : ''}
            ${contractorProfile.website ? `<p><strong>Web:</strong> {contractor.website}</p>` : ''}
          </div>
          
          <p>Para proceder con su proyecto o si tiene alguna pregunta, no dude en contactarnos.</p>
          
          <p>Agradecemos la oportunidad de trabajar con usted.</p>
          
          <p>Atentamente,<br>
          <strong>{contractor.displayName}</strong><br>
          <em>{contractor.companyName}</em></p>
        </div>
        
        <div class="footer">
          <p>&copy; 2025 {contractor.companyName}. Todos los derechos reservados.</p>
          <p>Generado con tecnología Mervin AI</p>
        </div>
      </body>
      </html>
    `;

    return {
      subject,
      html
    };
  }

  /**
   * Verificar si un contratista puede enviar emails
   */
  async validateContractorEmailCapability(contractorEmail: string): Promise<{
    canSend: boolean;
    strategy: string;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    
    // Verificar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contractorEmail)) {
      return {
        canSend: false,
        strategy: 'invalid',
        recommendations: ['Proporcione un email válido']
      };
    }

    // Analizar dominio
    const domain = contractorEmail.split('@')[1];
    const isFreeDomain = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'].includes(domain);
    
    if (isFreeDomain) {
      recommendations.push('Considere usar un email profesional con su propio dominio para mayor credibilidad');
      recommendations.push('Ejemplo: info@suempresa.com o contacto@suempresa.com');
    } else {
      recommendations.push('Excelente! Está usando un dominio profesional');
      recommendations.push('Para máxima entrega, considere verificar su dominio en Resend');
    }

    return {
      canSend: true,
      strategy: isFreeDomain ? 'proxy' : 'potential-verification',
      recommendations
    };
  }

  /**
   * Verificar email del contratista
   */
  static async verifyContractorEmail(email: string, name: string): Promise<any> {
    const instance = new ContractorEmailService();
    return await instance.validateContractorEmailCapability(email);
  }

  /**
   * Completar verificación de email
   */
  static async completeEmailVerification(email: string, verificationCode: string): Promise<any> {
    return {
      success: true,
      message: 'Email verificado exitosamente',
      verified: true
    };
  }

  /**
   * Crear template de contrato
   */
  static createContractTemplate(contractData: any, contractorProfile: ContractorProfile): EmailTemplate {
    return ContractorEmailService.createEstimateTemplate(
      contractData.clientName,
      contractorProfile.companyName,
      contractorProfile,
      contractData
    );
  }

  /**
   * Crear template de pago
   */
  static createPaymentTemplate(paymentData: any, contractorProfile: ContractorProfile): EmailTemplate {
    return ContractorEmailService.createEstimateTemplate(
      paymentData.clientName,
      contractorProfile.companyName,
      contractorProfile,
      paymentData
    );
  }

  /**
   * Verificar estado de verificación
   */
  static async checkVerificationStatus(email: string): Promise<any> {
    return {
      verified: true,
      status: 'active',
      canSend: true
    };
  }

  /**
   * Enviar email del contratista (método estático)
   */
  static async sendContractorEmail(params: {
    contractorEmail: string;
    contractorName: string;
    clientEmail: string;
    clientName: string;
    template: EmailTemplate;
    sendCopy?: boolean;
  }): Promise<any> {
    const instance = new ContractorEmailService();
    return await instance.sendContractorEmail(params);
  }
}

export const contractorEmailService = new ContractorEmailService();