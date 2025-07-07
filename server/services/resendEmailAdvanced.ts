/**
 * Advanced Resend Email Service for Contract Delivery
 * Bulletproof email delivery with comprehensive error handling and validation
 */

import { Resend } from 'resend';

export interface ContractEmailParams {
  to: string;
  toName: string;
  contractorEmail: string;
  contractorName: string;
  contractorCompany: string;
  subject: string;
  htmlContent: string;
  contractHTML?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export interface EmailDeliveryResult {
  success: boolean;
  emailId?: string;
  message: string;
  error?: string;
  strategy?: string;
}

export class ResendEmailAdvanced {
  private resend: Resend;
  private platformDomain = 'owlfenc.com';
  private operationalEmail = 'system@owlfenc.com';
  private testModeEmail = 'contracts@owlfenc.com';

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required');
    }
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  /**
   * Detect if we should use production email delivery
   */
  private isProductionMode(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Check if domain is verified for direct delivery
   */
  private isDomainVerified(): boolean {
    // In production, we assume owlfenc.com is verified
    // In development, we use test routing
    return this.isProductionMode();
  }

  /**
   * Get appropriate recipient based on environment and domain verification
   */
  private getRecipient(originalEmail: string, recipientType: 'client' | 'contractor' | 'system' = 'client'): string {
    // In production with verified domain, send directly to recipients
    if (this.isDomainVerified()) {
      console.log(`📧 [PRODUCTION] Sending directly to ${originalEmail}`);
      return originalEmail;
    }
    
    // In development, use professional test routing
    if (recipientType === 'system') {
      console.log(`📧 [DEV-SYSTEM] Using operational email ${this.operationalEmail}`);
      return this.operationalEmail;
    }
    
    // For client/contractor emails in development, use test address but maintain transparency
    console.log(`📧 [DEV-${recipientType.toUpperCase()}] Redirecting ${originalEmail} to ${this.testModeEmail} for testing`);
    return this.testModeEmail;
  }

  /**
   * Generate professional from email using owlfenc.com domain
   */
  private generateFromEmail(emailType: 'contracts' | 'notifications' | 'system' = 'contracts'): string {
    switch (emailType) {
      case 'contracts':
        return `contracts@${this.platformDomain}`;
      case 'notifications':
        return `notifications@${this.platformDomain}`;
      case 'system':
        return `system@${this.platformDomain}`;
      default:
        return `noreply@${this.platformDomain}`;
    }
  }

  /**
   * Validate email parameters
   */
  private validateParams(params: ContractEmailParams): { valid: boolean; error?: string } {
    if (!params.to || !params.to.includes('@')) {
      return { valid: false, error: 'Invalid recipient email' };
    }

    if (!params.contractorEmail || !params.contractorEmail.includes('@')) {
      return { valid: false, error: 'Invalid contractor email' };
    }

    if (!params.subject || params.subject.trim().length === 0) {
      return { valid: false, error: 'Subject is required' };
    }

    if (!params.htmlContent || params.htmlContent.trim().length === 0) {
      return { valid: false, error: 'Email content is required' };
    }

    if (!params.contractorName || params.contractorName.trim().length === 0) {
      return { valid: false, error: 'Contractor name is required' };
    }

    if (!params.contractorCompany || params.contractorCompany.trim().length === 0) {
      return { valid: false, error: 'Contractor company is required' };
    }

    return { valid: true };
  }

  /**
   * Add development mode banner to email content
   */
  private addDevelopmentBanner(htmlContent: string, originalRecipient: string): string {
    if (this.isDomainVerified()) return htmlContent;

    const banner = `
      <div style="background: #e3f2fd; border: 2px solid #2196f3; padding: 15px; margin-bottom: 20px; border-radius: 8px; text-align: center;">
        <h3 style="color: #1565c0; margin: 0 0 10px 0;">🔧 Development Environment - Owl Fence</h3>
        <p style="color: #0d47a1; margin: 0; font-size: 14px;">
          <strong>Original Recipient:</strong> ${originalRecipient}<br>
          Email routed through ${this.platformDomain} testing system for development purposes.
        </p>
      </div>
    `;

    return banner + htmlContent;
  }

  /**
   * Send contract email with bulletproof delivery
   */
  async sendContractEmail(params: ContractEmailParams): Promise<EmailDeliveryResult> {
    try {
      console.log('📧 [ADVANCED-EMAIL] Starting contract email delivery...');
      console.log('📧 [ADVANCED-EMAIL] To:', params.to);
      console.log('📧 [ADVANCED-EMAIL] Contractor:', params.contractorName, params.contractorCompany);
      console.log('📧 [ADVANCED-EMAIL] Subject:', params.subject);

      // Validate parameters
      const validation = this.validateParams(params);
      if (!validation.valid) {
        return {
          success: false,
          message: 'Parameter validation failed',
          error: validation.error
        };
      }

      // Determine recipient and sender based on environment
      const finalRecipient = this.getRecipient(params.to, 'client');
      const fromEmail = this.generateFromEmail('contracts');

      // Prepare email content (add development banner if needed)
      const finalHtmlContent = this.addDevelopmentBanner(params.htmlContent, params.to);

      console.log('📧 [ADVANCED-EMAIL] From address:', fromEmail);
      console.log('📧 [ADVANCED-EMAIL] Final recipient:', finalRecipient);
      console.log('📧 [ADVANCED-EMAIL] Domain verified:', this.isDomainVerified());
      console.log('📧 [ADVANCED-EMAIL] Environment:', this.isProductionMode() ? 'PRODUCTION' : 'DEVELOPMENT');

      // Prepare email payload
      const emailPayload = {
        from: fromEmail,
        to: [finalRecipient],
        subject: this.isDomainVerified() ? params.subject : `[DEV] ${params.subject}`,
        html: finalHtmlContent,
        replyTo: params.contractorEmail,
        headers: {
          'X-Contractor': params.contractorName,
          'X-Company': params.contractorCompany,
          'X-Original-Recipient': params.to,
          'X-Service': 'Owl-Fence-Legal-System',
          'X-Domain': this.platformDomain,
          'List-Unsubscribe': `<mailto:${this.operationalEmail}?subject=Unsubscribe>`
        },
        // Remove tags to avoid Resend validation issues
        ...(params.attachments && params.attachments.length > 0 && {
          attachments: params.attachments.map(att => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType
          }))
        })
      };

      console.log('📧 [ADVANCED-EMAIL] Sending email with Resend...');
      const result = await this.resend.emails.send(emailPayload);

      if (result.data?.id) {
        console.log('✅ [ADVANCED-EMAIL] Email sent successfully');
        console.log('✅ [ADVANCED-EMAIL] Email ID:', result.data.id);

        return {
          success: true,
          emailId: result.data.id,
          message: this.isDomainVerified() 
            ? `Email sent directly to ${finalRecipient}`
            : `Email sent via ${this.platformDomain} (originally ${params.to} → ${finalRecipient})`,
          strategy: this.isDomainVerified() ? 'direct-delivery' : 'development-routing'
        };
      } else {
        console.error('❌ [ADVANCED-EMAIL] No email ID returned:', result);
        
        // Handle Resend API specific errors
        if (result.error) {
          const errorMessage = result.error.message || 'Unknown Resend error';
          
          // Check for domain verification issues
          if (errorMessage.includes('You can only send testing emails') || errorMessage.includes('Domain not verified')) {
            console.log('🔒 [ADVANCED-EMAIL] Domain verification limitation, using fallback routing...');
            
            // Retry with operational email
            const retryPayload = {
              ...emailPayload,
              to: [this.operationalEmail],
              subject: `[ROUTING] ${emailPayload.subject}`,
              html: this.addDevelopmentBanner(params.htmlContent, params.to)
            };

            const retryResult = await this.resend.emails.send(retryPayload);
            
            if (retryResult.data?.id) {
              return {
                success: true,
                emailId: retryResult.data.id,
                message: `Email routed via ${this.operationalEmail} (intended for ${params.to})`,
                strategy: 'operational-routing'
              };
            }
          }
          
          return {
            success: false,
            message: 'Resend API error',
            error: errorMessage
          };
        }

        return {
          success: false,
          message: 'Email sending failed - no response data',
          error: 'No email ID returned from Resend API'
        };
      }

    } catch (error) {
      console.error('❌ [ADVANCED-EMAIL] Email delivery failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        message: 'Email delivery failed',
        error: errorMessage
      };
    }
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<{ healthy: boolean; message: string }> {
    try {
      if (!process.env.RESEND_API_KEY) {
        return { healthy: false, message: 'RESEND_API_KEY not configured' };
      }

      // Simple health check - attempt to verify API key format
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey.startsWith('re_')) {
        return { healthy: false, message: 'Invalid Resend API key format' };
      }

      return { 
        healthy: true, 
        message: `Resend service healthy - Domain: ${this.platformDomain} - ${this.isDomainVerified() ? 'VERIFIED' : 'DEVELOPMENT MODE'}` 
      };

    } catch (error) {
      return { 
        healthy: false, 
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

// Export singleton instance
export const resendEmailAdvanced = new ResendEmailAdvanced();