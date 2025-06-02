import { resendService } from './resendService';

// Using Resend service instead of SendGrid

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface ContractorEmailParams {
  contractorEmail: string;
  contractorName: string;
  clientEmail: string;
  clientName: string;
  template: EmailTemplate;
  sendCopy?: boolean;
}

interface EmailResult {
  success: boolean;
  message?: string;
}

/**
 * Universal Email Service for Contractors
 * Handles all email sending needs: estimates, contracts, payments, notifications
 * Each contractor uses their own verified email as sender
 */
export class ContractorEmailService {
  private static pendingVerifications = new Map();
  private static verifiedEmails: string[] = [];
  
  /**
   * Verify contractor email with Resend
   * Creates a single sender verification automatically
   */
  static async verifyContractorEmail(contractorEmail: string, contractorName: string): Promise<{success: boolean, message?: string}> {
    try {
      if (!process.env.RESEND_API_KEY) {
        return {
          success: false,
          message: 'Email verification requires Resend API key. Please provide RESEND_API_KEY in environment variables.'
        };
      }

      console.log(`Sending real verification email to: ${contractorEmail}`);

      // Create verification token
      const verificationToken = require('crypto').randomBytes(32).toString('hex');
      const verificationUrl = `${process.env.APP_URL || 'https://owlfence.replit.app'}/api/contractor-email/complete-verification?token=${verificationToken}&email=${encodeURIComponent(contractorEmail)}`;
      
      // Store pending verification (in production, use database)
      ContractorEmailService.pendingVerifications.set(verificationToken, {
        email: contractorEmail,
        name: contractorName,
        timestamp: Date.now()
      });

      const verificationEmail = {
        to: contractorEmail,
        from: {
          email: 'mervin@owlfenc.com',
          name: 'Owl Fence Email Verification'
        },
        subject: 'Verify Your Email Address - Owl Fence',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1>🔐 Email Verification</h1>
              <p>Owl Fence Professional Platform</p>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1f2937;">Hello ${contractorName},</h2>
              <p>Welcome to Owl Fence! To start sending professional emails to your clients, please verify your email address.</p>
              
              <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin: 0 0 10px 0;">✅ What happens after verification:</h3>
                <ul style="color: #374151; margin: 0; padding-left: 20px;">
                  <li>Send professional estimates to clients</li>
                  <li>Email contracts and payment links</li>
                  <li>All emails will show your name and contact info</li>
                  <li>Clients can reply directly to your personal email</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                  ✅ Verify My Email Address
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                If the button doesn't work, copy and paste this link:<br>
                ${verificationUrl}
              </p>
            </div>
          </div>
        `,
        text: `Hello ${contractorName}, please verify your email: ${verificationUrl}`
      };

      const success = await resendService.sendEmail({
        to: contractorEmail,
        from: 'mervin@owlfenc.com',
        subject: 'Verify Your Email Address - Owl Fence',
        html: verificationEmail.html
      });

      if (!success) {
        throw new Error('Failed to send verification email');
      }
      
      return {
        success: true,
        message: 'Verification email sent successfully. Please check your email and click the verification link.'
      };
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      
      // Provide specific error messages based on response
      if (error.message?.includes('unauthorized') || error.message?.includes('invalid')) {
        return {
          success: false,
          message: 'Email service authorization failed. Please check your API key configuration.'
        };
      }
      
      if (error.code === 403) {
        return {
          success: false,
          message: 'SendGrid sender email not verified. Please verify mervin@owlfenc.com in SendGrid settings.'
        };
      }
      
      return {
        success: false,
        message: `Failed to send verification email: ${error.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Check email verification status
   */
  static async checkVerificationStatus(email: string): Promise<{ verified: boolean; pending: boolean; confirmedByProvider?: boolean }> {
    try {
      console.log(`Checking verification status for: ${email}`);
      
      // Para implementar verificación real con SendGrid, necesitamos:
      // 1. Mantener un registro de emails pendientes de verificación
      // 2. Solo marcar como verificado cuando SendGrid confirme via webhook
      // 3. Nunca asumir que un email está verificado solo por existir
      
      // Verificar si el email está en la lista de emails verificados
      const isVerified = ContractorEmailService.verifiedEmails.includes(email);
      
      // Verificar si hay una verificación pendiente
      const hasPendingVerification = Array.from(ContractorEmailService.pendingVerifications.values())
        .some((verification: any) => verification.email === email);
      
      return {
        verified: isVerified,
        pending: hasPendingVerification && !isVerified,
        confirmedByProvider: isVerified
      };
    } catch (error) {
      console.error('Error checking verification status:', error);
      return {
        verified: false,
        pending: false,
        confirmedByProvider: false
      };
    }
  }

  /**
   * Complete email verification when user clicks the link
   */
  static async completeEmailVerification(token: string, email: string): Promise<{success: boolean, message?: string}> {
    try {
      // Verificar que el token existe y corresponde al email
      const verification = ContractorEmailService.pendingVerifications.get(token);
      
      if (!verification) {
        return {
          success: false,
          message: 'Invalid or expired verification token'
        };
      }
      
      if (verification.email !== email) {
        return {
          success: false,
          message: 'Email mismatch for verification token'
        };
      }
      
      // Verificar que el token no ha expirado (24 horas)
      const tokenAge = Date.now() - verification.timestamp;
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (tokenAge > twentyFourHours) {
        ContractorEmailService.pendingVerifications.delete(token);
        return {
          success: false,
          message: 'Verification token has expired. Please request a new verification email.'
        };
      }
      
      // Marcar el email como verificado
      if (!ContractorEmailService.verifiedEmails.includes(email)) {
        ContractorEmailService.verifiedEmails.push(email);
      }
      
      // Remover la verificación pendiente
      ContractorEmailService.pendingVerifications.delete(token);
      
      console.log(`Email successfully verified: ${email}`);
      
      return {
        success: true,
        message: 'Email verified successfully! You can now send professional emails to clients.'
      };
    } catch (error) {
      console.error('Error completing email verification:', error);
      return {
        success: false,
        message: 'Failed to complete email verification'
      };
    }
  }

  /**
   * Send email from contractor to client
   * Automatically handles verification and professional formatting
   */
  static async sendContractorEmail(params: ContractorEmailParams): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { contractorEmail, contractorName, clientEmail, clientName, template, sendCopy } = params;

      // Validate required parameters
      if (!contractorEmail || !clientEmail || !template.subject || !template.html) {
        return {
          success: false,
          message: 'Missing required email parameters'
        };
      }

      // Main email to client using verified domain but contractor's reply-to
      const clientMessage = {
        to: clientEmail,
        from: {
          email: 'mervin@owlfenc.com',
          name: `${contractorName || 'Contractor'} via Owl Fence`
        },
        replyTo: {
          email: contractorEmail,
          name: contractorName || 'Contractor'
        },
        subject: template.subject,
        html: ContractorEmailService.addMervinSignature(template.html),
        text: template.text + '\n\n---\nPowered by Mervin AI - Professional contractor solutions'
      };

      // Initialize SendGrid for this method
      if (!process.env.SENDGRID_API_KEY) {
        return {
          success: false,
          message: 'SendGrid API key not configured'
        };
      }

      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      await sgMail.send(clientMessage);

      // Send copy to contractor if requested
      if (sendCopy) {
        const copyMessage = {
          to: contractorEmail,
          from: {
            email: 'mervin@owlfenc.com',
            name: 'Owl Fence - Email Copy'
          },
          replyTo: {
            email: 'mervin@owlfenc.com',
            name: 'Owl Fence Support'
          },
          subject: `[COPY] ${template.subject}`,
          html: `
            <div style="background: #f0f9ff; padding: 20px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
              <p style="margin: 0; color: #1e40af;"><strong>📧 Copy of email sent to your client</strong></p>
              <p style="margin: 5px 0 0 0; color: #64748b;">Sent to: ${clientName} (${clientEmail})</p>
            </div>
            ${ContractorEmailService.addMervinSignature(template.html)}
          `,
          text: `COPY of email sent to ${clientName} (${clientEmail})\n\n${template.text}`
        };

        await sgMail.send(copyMessage);
      }

      return {
        success: true,
        message: 'Email sent successfully'
      };

    } catch (error: any) {
      console.error('Error sending contractor email:', error);
      
      // Handle specific SendGrid errors
      if (error.code === 403) {
        return {
          success: false,
          message: 'Email verification required. Please verify your email address in your profile settings.'
        };
      }

      return {
        success: false,
        message: 'Failed to send email. Please try again or contact support.'
      };
    }
  }

  /**
   * Generate estimate email template
   */
  static createEstimateTemplate(
    clientName: string,
    contractorName: string,
    contractorProfile: any,
    estimateData: any,
    customMessage?: string
  ): EmailTemplate {
    const subject = `🏗️ Your Professional Estimate is Ready - ${contractorName}`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Professional Estimate - ${contractorName}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
            .estimate-summary { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .total-amount { font-size: 24px; font-weight: bold; color: #1e3a8a; text-align: center; margin: 20px 0; }
            .contact-info { background: #fafafa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .custom-message { background: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Professional Estimate</h1>
                <p>From ${contractorName}</p>
                <p>${new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
            </div>
            
            <div class="content">
                ${customMessage ? `
                <div class="custom-message">
                    <div style="white-space: pre-wrap;">${customMessage}</div>
                </div>
                ` : `
                <h2>Dear ${clientName},</h2>
                <p>I hope this message finds you well!</p>
                <p>It is my pleasure to present your completely customized professional estimate for your project.</p>
                `}
                
                <div class="estimate-summary">
                    <h3>📊 Project Summary</h3>
                    <p><strong>Description:</strong> ${estimateData.projectDetails || 'Construction project'}</p>
                    <div class="total-amount">
                        Total Investment: $${estimateData.total.toLocaleString()}
                    </div>
                </div>
                
                <div class="contact-info">
                    <h4>Contact Information</h4>
                    <p><strong>${contractorName}</strong></p>
                    <p>📧 Email: ${contractorProfile?.email}</p>
                    ${contractorProfile?.phone ? `<p>📞 Phone: ${contractorProfile.phone}</p>` : ''}
                    ${contractorProfile?.website ? `<p>🌐 Website: ${contractorProfile.website}</p>` : ''}
                    <p><strong>Important:</strong> Please reply directly to this email to reach me personally. All responses will come straight to my inbox.</p>
                </div>
                
                <p>Best regards,<br>
                <strong>${contractorName}</strong></p>
            </div>
        </div>
    </body>
    </html>`;

    const text = customMessage || `Dear ${clientName},

I hope this message finds you well!

It is my pleasure to present your completely customized professional estimate for your project.

Total Investment: $${estimateData.total.toLocaleString()}

For any questions, please contact me directly at ${contractorProfile?.email}

Best regards,
${contractorName}`;

    return { subject, html, text };
  }

  /**
   * Generate contract email template
   */
  static createContractTemplate(
    clientName: string,
    contractorName: string,
    contractorProfile: any,
    contractData: any,
    customMessage?: string
  ): EmailTemplate {
    const subject = `📋 Your Contract is Ready for Review - ${contractorName}`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contract Ready - ${contractorName}</title>
    </head>
    <body>
        <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1>Contract Ready for Review</h1>
                <p>From ${contractorName}</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
                <h2>Dear ${clientName},</h2>
                ${customMessage ? `<div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0;">
                    <div style="white-space: pre-wrap;">${customMessage}</div>
                </div>` : '<p>Your project contract is ready for review and signature.</p>'}
                
                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>📋 Contract Details</h3>
                    <p><strong>Project:</strong> ${contractData.projectDetails || 'Construction project'}</p>
                    <p><strong>Total Value:</strong> $${contractData.total?.toLocaleString() || 'TBD'}</p>
                </div>
                
                <p>Please review the contract carefully and let me know if you have any questions.</p>
                
                <p>Best regards,<br><strong>${contractorName}</strong></p>
            </div>
        </div>
    </body>
    </html>`;

    const text = `Dear ${clientName},

Your project contract is ready for review and signature.

Project: ${contractData.projectDetails || 'Construction project'}
Total Value: $${contractData.total?.toLocaleString() || 'TBD'}

Please review the contract carefully and let me know if you have any questions.

Best regards,
${contractorName}`;

    return { subject, html, text };
  }

  /**
   * Generate payment link email template
   */
  static createPaymentTemplate(
    clientName: string,
    contractorName: string,
    contractorProfile: any,
    paymentData: any,
    customMessage?: string
  ): EmailTemplate {
    const subject = `💳 Secure Payment Link - ${contractorName}`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Link - ${contractorName}</title>
    </head>
    <body>
        <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1>Secure Payment Link</h1>
                <p>From ${contractorName}</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
                <h2>Dear ${clientName},</h2>
                ${customMessage ? `<div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0;">
                    <div style="white-space: pre-wrap;">${customMessage}</div>
                </div>` : '<p>Your secure payment link is ready for processing.</p>'}
                
                <div style="background: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>💳 Payment Information</h3>
                    <p><strong>Amount:</strong> $${paymentData.amount?.toLocaleString() || 'TBD'}</p>
                    <p><strong>Description:</strong> ${paymentData.description || 'Service payment'}</p>
                </div>
                
                <p>The payment link is secure and processed through industry-standard encryption.</p>
                
                <p>Best regards,<br><strong>${contractorName}</strong></p>
            </div>
        </div>
    </body>
    </html>`;

    const text = `Dear ${clientName},

Your secure payment link is ready for processing.

Amount: $${paymentData.amount?.toLocaleString() || 'TBD'}
Description: ${paymentData.description || 'Service payment'}

The payment link is secure and processed through industry-standard encryption.

Best regards,
${contractorName}`;

    return { subject, html, text };
  }

  /**
   * Add Mervin AI signature to emails
   */
  private static addMervinSignature(html: string): string {
    const mervinFooter = `
    <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center;">
      <p style="margin: 0; color: #6b7280; font-size: 12px;">
        ⚡ Powered by <strong style="color: #3b82f6;">Mervin AI</strong> - Professional contractor solutions in under 5 minutes
      </p>
    </div>`;
    
    return html.replace('</body>', `${mervinFooter}</body>`);
  }
}

export default ContractorEmailService;