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
   * Send COMPLETE contract email with full review and signature capability
   */
  async sendCompleteContractEmail(params: {
    to: string;
    contractorName: string;
    contractorCompany: string;
    clientName: string;
    contractHTML: string;
    contractId: string;
    reviewUrl: string;
  }): Promise<EmailDeliveryResult> {
    try {
      console.log('📧 [COMPLETE-CONTRACT-EMAIL] Sending complete contract for review...');
      console.log('📧 [COMPLETE-CONTRACT-EMAIL] To:', params.to);
      console.log('📧 [COMPLETE-CONTRACT-EMAIL] Contract ID:', params.contractId);
      console.log('📧 [COMPLETE-CONTRACT-EMAIL] Review URL:', params.reviewUrl);

      const recipient = this.getRecipient(params.to, 'client');
      const fromEmail = this.generateFromEmail('contracts');

      // Create comprehensive email with embedded contract
      const emailHTML = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contract Review Required</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .email-container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { font-size: 24px; margin-bottom: 10px; }
            .content { padding: 30px; }
            .contract-preview { border: 2px solid #e1e5e9; border-radius: 8px; padding: 20px; margin: 20px 0; background: #fafbfc; max-height: 400px; overflow-y: auto; }
            .cta-section { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0; }
            .cta-button { 
              display: inline-block; 
              background: white; 
              color: #28a745; 
              text-decoration: none; 
              padding: 15px 30px; 
              border-radius: 8px; 
              font-weight: 600; 
              font-size: 16px;
              transition: all 0.3s ease;
            }
            .cta-button:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
            .warning-box { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-top: 1px solid #e9ecef; }
            .mobile-note { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
            @media (max-width: 600px) {
              .content { padding: 20px; }
              .header { padding: 20px; }
              .header h1 { font-size: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>📋 Contract Ready for Review</h1>
              <p>Your construction contract is ready for review and signature</p>
            </div>
            
            <div class="content">
              <h2>Hello ${params.clientName},</h2>
              <p>Your contract with <strong>${params.contractorCompany}</strong> is ready for your review and digital signature.</p>
              
              <div class="warning-box">
                <h3 style="color: #856404; margin-bottom: 10px;">⚠️ Important Legal Notice</h3>
                <p style="color: #856404; margin: 0;">
                  Please read the complete contract below carefully. This is a legally binding agreement. 
                  Do not sign unless you understand and agree to all terms.
                </p>
              </div>
              
              <div class="contract-preview">
                <h3 style="margin-bottom: 15px; color: #495057;">📄 Contract Preview:</h3>
                ${params.contractHTML}
              </div>
              
              <div class="mobile-note">
                <p><strong>📱 Mobile Users:</strong> This email contains your complete contract. You can review and sign directly below, or use the review link for a better mobile experience.</p>
              </div>
              
              <div class="cta-section">
                <h3 style="color: white; margin-bottom: 15px;">Ready to Review & Sign?</h3>
                <p style="color: white; margin-bottom: 20px; opacity: 0.9;">
                  Click below to open the secure contract review page where you can read and digitally sign your contract.
                </p>
                <a href="${params.reviewUrl}" class="cta-button">
                  🔒 Review & Sign Contract
                </a>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4>Contract Details:</h4>
                <ul style="margin-left: 20px; margin-top: 10px;">
                  <li><strong>Contract ID:</strong> ${params.contractId}</li>
                  <li><strong>Contractor:</strong> ${params.contractorCompany}</li>
                  <li><strong>Date Sent:</strong> ${new Date().toLocaleDateString()}</li>
                  <li><strong>Review Link:</strong> <a href="${params.reviewUrl}">Click here</a></li>
                </ul>
              </div>
              
              <div style="border-left: 4px solid #17a2b8; padding-left: 20px; margin: 25px 0;">
                <h4 style="color: #17a2b8;">What happens next?</h4>
                <ol style="margin-left: 20px; margin-top: 10px;">
                  <li>Review the complete contract above or click the review link</li>
                  <li>Read all terms and conditions carefully</li>
                  <li>Sign digitally using your finger or mouse</li>
                  <li>Both parties receive a signed copy automatically</li>
                </ol>
              </div>
              
              <p style="margin-top: 30px;">
                If you have any questions about this contract, please contact ${params.contractorCompany} directly. 
                Do not sign if you have unresolved concerns.
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Powered by Owl Fence Legal Defense System</strong></p>
              <p>Secure • Compliant • Professional</p>
              <p style="margin-top: 10px; font-size: 12px;">
                This email contains a legally binding contract. Please ensure you are authorized to sign on behalf of your organization.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send the complete contract email
      const emailData = {
        from: fromEmail,
        to: recipient,
        subject: `🔒 Contract Review Required - ${params.contractorCompany}`,
        html: this.addDevelopmentBanner(emailHTML, params.to)
      };

      const result = await this.resend.emails.send(emailData);
      
      console.log('✅ [COMPLETE-CONTRACT-EMAIL] Contract email sent successfully');
      console.log('📧 [COMPLETE-CONTRACT-EMAIL] Email ID:', result.data?.id);

      return {
        success: true,
        emailId: result.data?.id,
        message: `Complete contract email sent to ${params.to}`,
        strategy: 'complete-contract-delivery'
      };

    } catch (error: any) {
      console.error('❌ [COMPLETE-CONTRACT-EMAIL] Error:', error);
      return {
        success: false,
        error: error.message || 'Complete contract email delivery failed'
      };
    }
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