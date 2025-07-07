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
  private platformDomain = 'resend.dev';
  private testModeEmail = 'gelasio@chyrris.com';

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required');
    }
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  /**
   * Detect if Resend is in test mode
   */
  private isTestMode(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Get appropriate recipient (handles test mode redirection)
   */
  private getRecipient(originalEmail: string): string {
    // In test mode, redirect all emails to authorized address
    if (this.isTestMode()) {
      console.log(`📧 [TEST-MODE] Redirecting email from ${originalEmail} to ${this.testModeEmail}`);
      return this.testModeEmail;
    }
    return originalEmail;
  }

  /**
   * Generate contractor-specific no-reply email
   */
  private generateContractorFromEmail(contractorCompany: string): string {
    const cleanCompanyName = contractorCompany
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);

    return `noreply-${cleanCompanyName}@${this.platformDomain}`;
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
   * Add test mode banner to email content
   */
  private addTestModeBanner(htmlContent: string, originalRecipient: string): string {
    if (!this.isTestMode()) return htmlContent;

    const banner = `
      <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 8px; text-align: center;">
        <h3 style="color: #b45309; margin: 0 0 10px 0;">📧 TEST MODE - Development Environment</h3>
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          This email was originally intended for: <strong>${originalRecipient}</strong><br>
          Redirected to authorized test email for development purposes.
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

      // Determine recipient (handle test mode)
      const finalRecipient = this.getRecipient(params.to);
      const fromEmail = this.generateContractorFromEmail(params.contractorCompany);

      // Prepare email content (add test mode banner if needed)
      const finalHtmlContent = this.addTestModeBanner(params.htmlContent, params.to);

      console.log('📧 [ADVANCED-EMAIL] From address:', fromEmail);
      console.log('📧 [ADVANCED-EMAIL] Final recipient:', finalRecipient);
      console.log('📧 [ADVANCED-EMAIL] Test mode:', this.isTestMode());

      // Prepare email payload
      const emailPayload = {
        from: fromEmail,
        to: [finalRecipient],
        subject: this.isTestMode() ? `[TEST] ${params.subject}` : params.subject,
        html: finalHtmlContent,
        replyTo: params.contractorEmail,
        headers: {
          'X-Contractor': params.contractorName,
          'X-Company': params.contractorCompany,
          'X-Original-Recipient': params.to,
          'X-Service': 'Owl-Fence-Contracts',
          'List-Unsubscribe': `<mailto:${params.contractorEmail}?subject=Unsubscribe>`
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
          message: this.isTestMode() 
            ? `Email sent to test address ${finalRecipient} (originally ${params.to})`
            : `Email sent successfully to ${finalRecipient}`,
          strategy: 'contractor-noreply'
        };
      } else {
        console.error('❌ [ADVANCED-EMAIL] No email ID returned:', result);
        
        // Handle Resend API specific errors
        if (result.error) {
          const errorMessage = result.error.message || 'Unknown Resend error';
          
          // Check for test mode limitations
          if (errorMessage.includes('You can only send testing emails')) {
            console.log('🔒 [ADVANCED-EMAIL] Test mode limitation detected, auto-redirecting...');
            
            // Retry with authorized email
            const retryPayload = {
              ...emailPayload,
              to: [this.testModeEmail],
              subject: `[AUTO-REDIRECT] ${emailPayload.subject}`,
              html: this.addTestModeBanner(params.htmlContent, params.to)
            };

            const retryResult = await this.resend.emails.send(retryPayload);
            
            if (retryResult.data?.id) {
              return {
                success: true,
                emailId: retryResult.data.id,
                message: `Email auto-redirected to authorized test address: ${this.testModeEmail}`,
                strategy: 'auto-redirect'
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
        message: `Resend service healthy - ${this.isTestMode() ? 'TEST MODE' : 'PRODUCTION MODE'}` 
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