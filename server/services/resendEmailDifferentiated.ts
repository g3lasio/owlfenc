/**
 * DIFFERENTIATED EMAIL SERVICE
 * Separate contractor and client email templates with role-specific experiences
 */

import { Resend } from 'resend';

export interface EmailDeliveryResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export class ResendEmailDifferentiated {
  private resend: Resend;
  private platformDomain = 'owlfenc.com';

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  /**
   * Check if domain is verified with Resend
   */
  private isDomainVerified(): boolean {
    return process.env.NODE_ENV === 'production' || process.env.FORCE_PRODUCTION_EMAIL === 'true' || process.env.ENABLE_REAL_EMAIL === 'true';
  }

  /**
   * Get appropriate recipient (handles test mode)
   */
  private getRecipient(originalEmail: string, role: 'contractor' | 'client'): string {
    if (this.isDomainVerified()) {
      return originalEmail;
    }
    
    // In test mode, route to gelasio@chyrris.com
    console.log(`🔧 [TEST-MODE] Routing ${role} email from ${originalEmail} to gelasio@chyrris.com`);
    return 'gelasio@chyrris.com';
  }

  /**
   * Send contractor-specific contract review email
   */
  async sendContractorReviewEmail(params: {
    to: string;
    contractorName: string;
    clientName: string;
    contractId: string;
    reviewUrl: string;
    projectDetails: {
      description: string;
      value: string;
      address: string;
    };
  }): Promise<EmailDeliveryResult> {
    try {
      console.log('📧 [CONTRACTOR-EMAIL] Sending contractor-specific email...');
      
      const recipient = this.getRecipient(params.to, 'contractor');
      const emailHtml = this.generateContractorEmailTemplate(params);
      
      const emailOptions = {
        from: 'legal@owlfenc.com',
        to: recipient,
        subject: `🔐 Contractor Review Required - Contract ${params.contractId}`,
        html: emailHtml,
        tags: [
          { name: 'category', value: 'contractor-signature' },
          { name: 'contract-id', value: params.contractId },
          { name: 'recipient-role', value: 'contractor' }
        ]
      };

      const result = await this.resend.emails.send(emailOptions);
      
      console.log('✅ [CONTRACTOR-EMAIL] Email sent successfully');
      console.log('📊 [CONTRACTOR-EMAIL] Email ID:', result.data?.id);
      
      return {
        success: true,
        emailId: result.data?.id
      };
    } catch (error) {
      console.error('❌ [CONTRACTOR-EMAIL] Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      };
    }
  }

  /**
   * Send client-specific contract review email  
   */
  async sendClientReviewEmail(params: {
    to: string;
    contractorName: string;
    clientName: string;
    contractId: string;
    reviewUrl: string;
    projectDetails: {
      description: string;
      value: string;
      address: string;
    };
  }): Promise<EmailDeliveryResult> {
    try {
      console.log('📧 [CLIENT-EMAIL] Sending client-specific email...');
      
      const recipient = this.getRecipient(params.to, 'client');
      const emailHtml = this.generateClientEmailTemplate(params);
      
      const emailOptions = {
        from: 'sign.legal@owlfenc.com',
        to: recipient,
        subject: `📋 Your Contract Ready for Signature - ${params.projectDetails.description}`,
        html: emailHtml,
        tags: [
          { name: 'category', value: 'client-signature' },
          { name: 'contract-id', value: params.contractId },
          { name: 'recipient-role', value: 'client' }
        ]
      };

      const result = await this.resend.emails.send(emailOptions);
      
      console.log('✅ [CLIENT-EMAIL] Email sent successfully');
      console.log('📊 [CLIENT-EMAIL] Email ID:', result.data?.id);
      
      return {
        success: true,
        emailId: result.data?.id
      };
    } catch (error) {
      console.error('❌ [CLIENT-EMAIL] Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      };
    }
  }

  /**
   * Generate contractor-specific email template
   */
  private generateContractorEmailTemplate(params: any): string {
    const testModeBanner = !this.isDomainVerified() ? `
      <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 8px; text-align: center;">
        <h3 style="color: #856404; margin: 0 0 10px 0;">🔧 Development Environment - Owl Fence</h3>
        <p style="color: #856404; margin: 0; font-size: 14px;">
          <strong>Original Recipient:</strong> ${params.to}<br>
          Email routed through testing system for development purposes.
        </p>
      </div>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contractor Contract Review - ${params.contractId}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
            .email-container { max-width: 600px; margin: 0 auto; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            @media (max-width: 640px) { .email-container { max-width: 100%; margin: 0; } }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { font-size: 24px; margin-bottom: 8px; font-weight: 700; }
            .header p { font-size: 14px; opacity: 0.9; margin: 0; }
            .content { padding: 30px; }
            .section { margin-bottom: 25px; }
            .contractor-alert { background: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 8px; margin-bottom: 25px; }
            .contractor-alert h3 { color: #856404; margin: 0 0 10px 0; font-size: 18px; }
            .contractor-alert p { color: #856404; margin: 0; }
            .project-summary { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; }
            .review-button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .review-button:hover { background: #218838; }
            .footer { background: #f8f9fa; padding: 25px; text-align: center; color: #6c757d; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="email-container">
            ${testModeBanner}
            <div class="header">
              <h1>🔐 Contractor Review Required</h1>
              <p>Contract ready for your professional review and signature</p>
            </div>
            
            <div class="content">
              <div class="contractor-alert">
                <h3>⚠️ Action Required from ${params.contractorName}</h3>
                <p>As the contracting professional, please review this contract before your client signs. Your expertise ensures legal compliance and project protection.</p>
              </div>
              
              <div class="section">
                <h2 style="color: #2c3e50; margin-bottom: 15px;">Contract Details</h2>
                <div class="project-summary">
                  <p><strong>Contract ID:</strong> ${params.contractId}</p>
                  <p><strong>Client:</strong> ${params.clientName}</p>
                  <p><strong>Project:</strong> ${params.projectDetails?.description || 'Professional Construction Services'}</p>
                  <p><strong>Value:</strong> ${params.projectDetails?.value || 'TBD'}</p>
                  <p><strong>Location:</strong> ${params.projectDetails?.address || 'On-site'}</p>
                </div>
              </div>
              
              <div class="section">
                <h3 style="color: #2c3e50;">Contractor Review Process</h3>
                <ol style="color: #495057; line-height: 1.6;">
                  <li><strong>Review Contract Terms:</strong> Examine all clauses, payment terms, and project specifications</li>
                  <li><strong>Verify Legal Compliance:</strong> Ensure all regulatory requirements and protections are included</li>
                  <li><strong>Add Your Signature:</strong> Sign digitally to authorize the contract</li>
                  <li><strong>Client Notification:</strong> Client will be notified to review and sign after your approval</li>
                </ol>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${params.reviewUrl}" class="review-button">Review & Sign Contract</a>
              </div>
              
              <div style="background: #e9ecef; padding: 15px; border-radius: 8px; margin-top: 25px;">
                <p style="margin: 0; color: #495057; font-size: 14px;">
                  <strong>Professional Note:</strong> This contract includes comprehensive legal protections, insurance requirements, and industry-standard terms to safeguard your business interests.
                </p>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Owl Fence Legal Services</strong></p>
              <p>Secure Contract Management for Construction Professionals</p>
              <p style="margin-top: 15px;">
                📧 legal@owlfenc.com | 🌐 owlfenc.com<br>
                Professional contract management for US contractors
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    return html;
  }

  /**
   * Generate client-specific email template
   */
  private generateClientEmailTemplate(params: any): string {
    const testModeBanner = !this.isDomainVerified() ? `
      <div style="background: #e3f2fd; border: 2px solid #2196f3; padding: 15px; margin-bottom: 20px; border-radius: 8px; text-align: center;">
        <h3 style="color: #1565c0; margin: 0 0 10px 0;">🔧 Development Environment - Owl Fence</h3>
        <p style="color: #0d47a1; margin: 0; font-size: 14px;">
          <strong>Original Recipient:</strong> ${params.to}<br>
          Email routed through testing system for development purposes.
        </p>
      </div>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contract Ready for Your Signature - ${params.contractId}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
            .email-container { max-width: 600px; margin: 0 auto; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            @media (max-width: 640px) { .email-container { max-width: 100%; margin: 0; } }
            .header { background: linear-gradient(135deg, #007bff 0%, #6610f2 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { font-size: 24px; margin-bottom: 8px; font-weight: 700; }
            .header p { font-size: 14px; opacity: 0.9; margin: 0; }
            .content { padding: 30px; }
            .section { margin-bottom: 25px; }
            .client-welcome { background: #d1ecf1; border: 2px solid #17a2b8; padding: 20px; border-radius: 8px; margin-bottom: 25px; }
            .client-welcome h3 { color: #0c5460; margin: 0 0 10px 0; font-size: 18px; }
            .client-welcome p { color: #0c5460; margin: 0; }
            .project-summary { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
            .sign-button { display: inline-block; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .sign-button:hover { background: #0056b3; }
            .footer { background: #f8f9fa; padding: 25px; text-align: center; color: #6c757d; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="email-container">
            ${testModeBanner}
            <div class="header">
              <h1>📋 Your Contract is Ready</h1>
              <p>Review and sign your project contract with ${params.contractorName}</p>
            </div>
            
            <div class="content">
              <div class="client-welcome">
                <h3>👋 Hello ${params.clientName},</h3>
                <p>Your contractor has prepared a comprehensive contract for your project. Please review the terms and provide your digital signature to proceed.</p>
              </div>
              
              <div class="section">
                <h2 style="color: #2c3e50; margin-bottom: 15px;">Project Summary</h2>
                <div class="project-summary">
                  <p><strong>Contractor:</strong> ${params.contractorName}</p>
                  <p><strong>Project:</strong> ${params.projectDetails?.description || 'Construction Services'}</p>
                  <p><strong>Project Value:</strong> ${params.projectDetails?.value || 'As quoted'}</p>
                  <p><strong>Location:</strong> ${params.projectDetails?.address || 'Your property'}</p>
                  <p><strong>Contract ID:</strong> ${params.contractId}</p>
                </div>
              </div>
              
              <div class="section">
                <h3 style="color: #2c3e50;">What's Included in Your Contract</h3>
                <ul style="color: #495057; line-height: 1.6;">
                  <li><strong>Project Specifications:</strong> Detailed scope of work and materials</li>
                  <li><strong>Payment Terms:</strong> Clear payment schedule and pricing</li>
                  <li><strong>Timeline:</strong> Project start and completion dates</li>
                  <li><strong>Legal Protections:</strong> Warranty, insurance, and liability coverage</li>
                  <li><strong>Quality Guarantees:</strong> Workmanship and material warranties</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${params.reviewUrl}" class="sign-button">Review & Sign Contract</a>
              </div>
              
              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin-top: 25px;">
                <p style="margin: 0; color: #155724; font-size: 14px;">
                  <strong>🔒 Secure Process:</strong> Your signature is legally binding and securely processed. You can review the complete contract before signing.
                </p>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Owl Fence Contract Services</strong></p>
              <p>Secure digital contracts for construction projects</p>
              <p style="margin-top: 15px;">
                📧 sign.legal@owlfenc.com | 🌐 owlfenc.com<br>
                Questions? Contact your contractor: ${params.contractorName}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    return html;
  }
}

export const resendEmailDifferentiated = new ResendEmailDifferentiated();