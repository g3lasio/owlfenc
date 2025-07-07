/**
 * Contract Distribution Service
 * Handles automatic distribution of contracts via SMS and Email with unique access links
 */

export interface ContractDistributionData {
  contractId: string;
  clientInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  contractorInfo: {
    name: string;
    company: string;
    email: string;
    phone: string;
  };
  contractSummary: {
    projectType: string;
    totalAmount: number;
    startDate: string;
    completionDate: string;
  };
  contractPdfUrl?: string;
  previewUrl?: string;
}

export interface UniqueAccessLink {
  id: string;
  contractId: string;
  recipientType: 'client' | 'contractor';
  recipientEmail: string;
  accessToken: string;
  expiresAt: string;
  isUsed: boolean;
  createdAt: string;
  lastAccessedAt?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DistributionResult {
  success: boolean;
  linkId: string;
  emailSent: boolean;
  smsSent: boolean;
  accessUrl: string;
  expiresAt: string;
  errors: string[];
  messageIds: {
    email?: string;
    sms?: string;
  };
}

export interface NotificationTemplate {
  type: 'email' | 'sms';
  subject?: string;
  content: string;
  variables: Record<string, string>;
}

export class ContractDistributionService {
  private static instance: ContractDistributionService;
  private accessLinks: Map<string, UniqueAccessLink> = new Map();
  private readonly BASE_URL = window.location.origin;
  private readonly LINK_EXPIRY_HOURS = 72; // 3 days
  
  // Template configurations
  private readonly EMAIL_TEMPLATES = {
    client: {
      subject: '📋 Contrato para Revisión y Firma - {{projectType}}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #2563eb; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
              🏗️ Contrato Listo para Revisión
            </h2>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Estimado/a <strong>{{clientName}}</strong>,
            </p>
            
            <p style="color: #374151; line-height: 1.6;">
              Su contrato para el proyecto <strong>{{projectType}}</strong> está listo para revisión y firma digital.
            </p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">📊 Resumen del Proyecto</h3>
              <ul style="color: #374151; padding-left: 20px;">
                <li><strong>Proyecto:</strong> {{projectType}}</li>
                <li><strong>Valor Total:</strong> ${{totalAmount}}</li>
                <li><strong>Fecha de Inicio:</strong> {{startDate}}</li>
                <li><strong>Fecha de Finalización:</strong> {{completionDate}}</li>
                <li><strong>Contratista:</strong> {{contractorCompany}}</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{accessUrl}}" 
                 style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        display: inline-block; 
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">
                📋 REVISAR Y FIRMAR CONTRATO
              </a>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>⚠️ Importante:</strong> Este enlace expira el {{expiryDate}} por seguridad. 
                Revise y firme el contrato antes de esta fecha.
              </p>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
                <strong>{{contractorCompany}}</strong><br>
                📧 {{contractorEmail}} | 📞 {{contractorPhone}}
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">
                Este email fue enviado automáticamente. Por favor no responda directamente a este mensaje.
              </p>
            </div>
          </div>
        </div>
      `
    },
    contractor: {
      subject: '✅ Contrato Enviado al Cliente - {{projectType}}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #059669; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
              ✅ Contrato Distribuido Exitosamente
            </h2>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              Hola <strong>{{contractorName}}</strong>,
            </p>
            
            <p style="color: #374151; line-height: 1.6;">
              El contrato para <strong>{{clientName}}</strong> ha sido enviado exitosamente para revisión y firma digital.
            </p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">📊 Detalles del Envío</h3>
              <ul style="color: #374151; padding-left: 20px;">
                <li><strong>Cliente:</strong> {{clientName}}</li>
                <li><strong>Email del Cliente:</strong> {{clientEmail}}</li>
                <li><strong>Proyecto:</strong> {{projectType}}</li>
                <li><strong>Valor:</strong> ${{totalAmount}}</li>
                <li><strong>Fecha de Envío:</strong> {{sendDate}}</li>
                <li><strong>Expira:</strong> {{expiryDate}}</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{trackingUrl}}" 
                 style="background: linear-gradient(135deg, #059669, #047857); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        display: inline-block; 
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);">
                📊 RASTREAR ESTADO DEL CONTRATO
              </a>
            </div>
            
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>💡 Próximos Pasos:</strong> Recibirá una notificación automática cuando el cliente 
                revise y firme el contrato.
              </p>
            </div>
          </div>
        </div>
      `
    }
  };

  private readonly SMS_TEMPLATES = {
    client: `🏗️ {{contractorCompany}}: Su contrato para {{projectType}} (${{totalAmount}}) está listo para firma. Enlace seguro: {{shortUrl}} - Expira: {{expiryDate}}`,
    contractor: `✅ Contrato enviado a {{clientName}} para {{projectType}}. Rastrear: {{trackingUrl}}`
  };

  static getInstance(): ContractDistributionService {
    if (!ContractDistributionService.instance) {
      ContractDistributionService.instance = new ContractDistributionService();
    }
    return ContractDistributionService.instance;
  }

  /**
   * Distribute contract to client with unique access link
   */
  async distributeToClient(
    distributionData: ContractDistributionData,
    options: {
      sendEmail: boolean;
      sendSMS: boolean;
      customMessage?: string;
    } = { sendEmail: true, sendSMS: true }
  ): Promise<DistributionResult> {
    const errors: string[] = [];
    const messageIds: { email?: string; sms?: string } = {};

    try {
      // Generate unique access link
      const accessLink = this.generateUniqueAccessLink(
        distributionData.contractId,
        'client',
        distributionData.clientInfo.email
      );

      const accessUrl = `${this.BASE_URL}/contract-signing/${accessLink.accessToken}`;
      const expiryDate = new Date(accessLink.expiresAt).toLocaleDateString('es-ES');
      
      // Prepare template variables
      const variables = {
        clientName: distributionData.clientInfo.name,
        projectType: distributionData.contractSummary.projectType,
        totalAmount: distributionData.contractSummary.totalAmount.toLocaleString(),
        startDate: new Date(distributionData.contractSummary.startDate).toLocaleDateString('es-ES'),
        completionDate: new Date(distributionData.contractSummary.completionDate).toLocaleDateString('es-ES'),
        contractorCompany: distributionData.contractorInfo.company,
        contractorEmail: distributionData.contractorInfo.email,
        contractorPhone: distributionData.contractorInfo.phone,
        accessUrl,
        expiryDate,
        sendDate: new Date().toLocaleDateString('es-ES')
      };

      // Send Email
      let emailSent = false;
      if (options.sendEmail && distributionData.clientInfo.email) {
        try {
          const emailResult = await this.sendContractEmail(
            distributionData.clientInfo.email,
            'client',
            variables
          );
          emailSent = emailResult.success;
          if (emailResult.messageId) {
            messageIds.email = emailResult.messageId;
          }
          if (!emailResult.success) {
            errors.push(`Email error: ${emailResult.error}`);
          }
        } catch (error) {
          errors.push(`Email sending failed: ${error}`);
        }
      }

      // Send SMS
      let smsSent = false;
      if (options.sendSMS && distributionData.clientInfo.phone) {
        try {
          const smsResult = await this.sendContractSMS(
            distributionData.clientInfo.phone,
            'client',
            { ...variables, shortUrl: this.shortenUrl(accessUrl) }
          );
          smsSent = smsResult.success;
          if (smsResult.messageId) {
            messageIds.sms = smsResult.messageId;
          }
          if (!smsResult.success) {
            errors.push(`SMS error: ${smsResult.error}`);
          }
        } catch (error) {
          errors.push(`SMS sending failed: ${error}`);
        }
      }

      // Store the link
      this.accessLinks.set(accessLink.id, accessLink);

      // Also send notification to contractor
      await this.notifyContractor(distributionData, accessLink, { emailSent, smsSent });

      return {
        success: (emailSent || smsSent) && errors.length === 0,
        linkId: accessLink.id,
        emailSent,
        smsSent,
        accessUrl,
        expiresAt: accessLink.expiresAt,
        errors,
        messageIds
      };

    } catch (error) {
      console.error('Contract distribution error:', error);
      return {
        success: false,
        linkId: '',
        emailSent: false,
        smsSent: false,
        accessUrl: '',
        expiresAt: '',
        errors: [`Distribution failed: ${error}`],
        messageIds: {}
      };
    }
  }

  /**
   * Generate unique access link with security token
   */
  private generateUniqueAccessLink(
    contractId: string,
    recipientType: 'client' | 'contractor',
    recipientEmail: string
  ): UniqueAccessLink {
    const accessToken = this.generateSecureToken();
    const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + (this.LINK_EXPIRY_HOURS * 60 * 60 * 1000)).toISOString();

    return {
      id: linkId,
      contractId,
      recipientType,
      recipientEmail,
      accessToken,
      expiresAt,
      isUsed: false,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Generate cryptographically secure token
   */
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Send contract email using the email service
   */
  private async sendContractEmail(
    recipientEmail: string,
    templateType: 'client' | 'contractor',
    variables: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const template = this.EMAIL_TEMPLATES[templateType];
      const subject = this.replaceVariables(template.subject, variables);
      const content = this.replaceVariables(template.content, variables);

      const response = await fetch('/api/centralized-email/send-contract-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          html: content,
          type: 'contract-signing'
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          messageId: result.messageId
        };
      } else {
        const error = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error}`
      };
    }
  }

  /**
   * Send contract SMS using Twilio (requires API key configuration)
   */
  private async sendContractSMS(
    phoneNumber: string,
    templateType: 'client' | 'contractor',
    variables: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Check if Twilio is configured
      const twilioConfigured = await this.checkTwilioConfiguration();
      if (!twilioConfigured) {
        return {
          success: false,
          error: 'Twilio SMS service not configured. Contact administrator to enable SMS notifications.'
        };
      }

      const template = this.SMS_TEMPLATES[templateType];
      const message = this.replaceVariables(template, variables);

      const response = await fetch('/api/sms/send-contract-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          message,
          type: 'contract-signing'
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          messageId: result.messageId
        };
      } else {
        const error = await response.text();
        return {
          success: false,
          error: `SMS service error: ${error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `SMS sending failed: ${error}`
      };
    }
  }

  /**
   * Check if Twilio SMS service is properly configured
   */
  private async checkTwilioConfiguration(): Promise<boolean> {
    try {
      const response = await fetch('/api/sms/config-status');
      const result = await response.json();
      return result.configured === true;
    } catch (error) {
      console.warn('Could not check Twilio configuration:', error);
      return false;
    }
  }

  /**
   * Notify contractor about successful distribution
   */
  private async notifyContractor(
    distributionData: ContractDistributionData,
    accessLink: UniqueAccessLink,
    status: { emailSent: boolean; smsSent: boolean }
  ): Promise<void> {
    const trackingUrl = `${this.BASE_URL}/contract-tracking/${accessLink.accessToken}`;
    
    const variables = {
      contractorName: distributionData.contractorInfo.name,
      clientName: distributionData.clientInfo.name,
      clientEmail: distributionData.clientInfo.email,
      projectType: distributionData.contractSummary.projectType,
      totalAmount: distributionData.contractSummary.totalAmount.toLocaleString(),
      sendDate: new Date().toLocaleDateString('es-ES'),
      expiryDate: new Date(accessLink.expiresAt).toLocaleDateString('es-ES'),
      trackingUrl
    };

    // Send notification email to contractor
    try {
      await this.sendContractEmail(
        distributionData.contractorInfo.email,
        'contractor',
        variables
      );
    } catch (error) {
      console.warn('Failed to notify contractor:', error);
    }
  }

  /**
   * Replace template variables in content
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    return result;
  }

  /**
   * Shorten URL for SMS (simple implementation)
   */
  private shortenUrl(url: string): string {
    // In production, this would use a URL shortening service
    // For now, return the last part of the token
    const token = url.split('/').pop();
    return `${this.BASE_URL}/s/${token?.substring(0, 8)}`;
  }

  /**
   * Validate access link and return contract data
   */
  async validateAccessLink(accessToken: string): Promise<{
    isValid: boolean;
    link?: UniqueAccessLink;
    error?: string;
  }> {
    const link = Array.from(this.accessLinks.values()).find(l => l.accessToken === accessToken);
    
    if (!link) {
      return {
        isValid: false,
        error: 'Invalid or expired access link'
      };
    }

    const now = new Date();
    const expiryDate = new Date(link.expiresAt);
    
    if (now > expiryDate) {
      return {
        isValid: false,
        error: 'Access link has expired'
      };
    }

    // Update last accessed time
    link.lastAccessedAt = now.toISOString();
    this.accessLinks.set(link.id, link);

    return {
      isValid: true,
      link
    };
  }

  /**
   * Mark access link as used after contract signing
   */
  markLinkAsUsed(accessToken: string): void {
    const link = Array.from(this.accessLinks.values()).find(l => l.accessToken === accessToken);
    if (link) {
      link.isUsed = true;
      this.accessLinks.set(link.id, link);
    }
  }

  /**
   * Get access link statistics
   */
  getLinkStatistics(contractId: string): {
    totalLinks: number;
    activeLinks: number;
    usedLinks: number;
    expiredLinks: number;
  } {
    const contractLinks = Array.from(this.accessLinks.values()).filter(
      link => link.contractId === contractId
    );

    const now = new Date();
    
    return {
      totalLinks: contractLinks.length,
      activeLinks: contractLinks.filter(link => !link.isUsed && new Date(link.expiresAt) > now).length,
      usedLinks: contractLinks.filter(link => link.isUsed).length,
      expiredLinks: contractLinks.filter(link => !link.isUsed && new Date(link.expiresAt) <= now).length
    };
  }

  /**
   * Clean up expired links (should be called periodically)
   */
  cleanupExpiredLinks(): number {
    const now = new Date();
    let removedCount = 0;

    for (const [linkId, link] of this.accessLinks.entries()) {
      if (new Date(link.expiresAt) <= now) {
        this.accessLinks.delete(linkId);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Get all distribution history for a contract
   */
  getDistributionHistory(contractId: string): UniqueAccessLink[] {
    return Array.from(this.accessLinks.values())
      .filter(link => link.contractId === contractId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

// Export singleton instance
export const contractDistribution = ContractDistributionService.getInstance();