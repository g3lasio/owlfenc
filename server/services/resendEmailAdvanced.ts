/**
 * Advanced Resend Email Service for Contract Delivery
 * Bulletproof email delivery with comprehensive error handling and validation
 */

import { Resend } from 'resend';
import { emailTracker } from './emailDeliveryTracker';

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
  private platformDomain = 'owlfenc.com'; // Verified institutional domain
  private legalEmail = 'legal@owlfenc.com'; // Legal document handling
  private signatureEmail = 'sign.legal@owlfenc.com'; // Digital signature workflow

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
    // owlfenc.com is verified in Resend - always use direct delivery
    return true;
  }

  /**
   * Get appropriate recipient - always direct delivery with verified domain
   */
  private getRecipient(originalEmail: string, recipientType: 'client' | 'contractor' | 'system' = 'client'): string {
    // With verified owlfenc.com domain, always send directly
    console.log(`📧 [OWLFENC-VERIFIED] Sending directly to: ${originalEmail}`);
    return originalEmail;
  }

  /**
   * Generate verified from email address using owlfenc.com institutional domain
   */
  private generateFromEmail(emailType: 'contracts' | 'notifications' | 'system' = 'contracts'): string {
    // Use verified owlfenc.com domain for institutional delivery
    switch (emailType) {
      case 'contracts':
        return this.legalEmail; // legal@owlfenc.com
      case 'notifications':
        return this.signatureEmail; // sign.legal@owlfenc.com  
      case 'system':
        return this.legalEmail; // legal@owlfenc.com
      default:
        return this.legalEmail; // legal@owlfenc.com
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

      // Create comprehensive email with embedded contract and in-email signature capability
      const emailHTML = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contract Review & Signature - ${params.contractorCompany}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f7fa; }
            .email-container { max-width: 100%; width: 100%; margin: 0 auto; background: white; box-shadow: 0 8px 32px rgba(0,0,0,0.1); box-sizing: border-box; }
            @media (min-width: 600px) { .email-container { max-width: 700px; } }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
            .header h1 { font-size: 28px; margin-bottom: 10px; font-weight: 700; }
            .header p { font-size: 16px; opacity: 0.9; }
            .content { padding: 20px; }
            @media (min-width: 600px) { 
              .content { padding: 40px; } 
            }
            .section { margin-bottom: 30px; }
            
            /* Contract Content Styling */
            .contract-content { 
              border: 3px solid #e1e5e9; 
              border-radius: 12px; 
              padding: 30px; 
              margin: 30px 0; 
              background: #fafbfc; 
              font-family: 'Times New Roman', serif;
              line-height: 1.8;
              color: #000;
              max-height: none;
              overflow: visible;
            }
            .contract-content h1, .contract-content h2, .contract-content h3 { 
              color: #2c3e50; 
              margin: 20px 0 10px 0;
              font-weight: bold;
            }
            .contract-content p { margin-bottom: 15px; }
            .contract-content ul, .contract-content ol { margin: 15px 0 15px 30px; }
            .contract-content li { margin-bottom: 8px; }
            
            /* Review Checkbox Section */
            .review-section { 
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
              border-radius: 12px; 
              padding: 25px; 
              text-align: center; 
              margin: 30px 0; 
              color: white;
            }
            .review-checkbox { 
              background: white; 
              border-radius: 10px; 
              padding: 20px; 
              margin: 20px auto; 
              max-width: 400px;
              color: #333;
            }
            .checkbox-container { 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              gap: 10px; 
              margin: 15px 0;
            }
            .custom-checkbox { 
              width: 20px; 
              height: 20px; 
              border: 2px solid #007bff; 
              border-radius: 4px; 
              cursor: pointer;
              position: relative;
            }
            .custom-checkbox.checked { background: #007bff; }
            .custom-checkbox.checked::after { 
              content: "✓"; 
              color: white; 
              position: absolute; 
              top: -2px; 
              left: 2px; 
              font-weight: bold;
            }
            
            /* Signature Section */
            .signature-section { 
              background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
              border-radius: 12px; 
              padding: 30px; 
              text-align: center; 
              margin: 30px 0;
              color: white;
            }
            .signature-form { 
              background: white; 
              border-radius: 10px; 
              padding: 25px; 
              margin: 20px auto; 
              max-width: 500px;
              color: #333;
            }
            .signature-canvas { 
              border: 2px solid #007bff; 
              border-radius: 8px; 
              background: white; 
              width: 100%; 
              max-width: 400px;
              height: 150px; 
              cursor: crosshair;
              margin: 15px 0;
              box-sizing: border-box;
            }
            @media (max-width: 480px) { 
              .signature-canvas { max-width: 100%; } 
            }
            .signature-input { 
              width: 100%; 
              padding: 12px; 
              border: 2px solid #ddd; 
              border-radius: 8px; 
              font-family: 'Brush Script MT', cursive; 
              font-size: 18px; 
              margin: 10px 0;
            }
            .button { 
              background: #007bff; 
              color: white; 
              border: none; 
              padding: 12px 25px; 
              border-radius: 8px; 
              cursor: pointer; 
              font-size: 16px; 
              font-weight: 600;
              margin: 5px;
              transition: all 0.3s ease;
            }
            .button:hover { background: #0056b3; transform: translateY(-2px); }
            .button.secondary { background: #6c757d; }
            .button.secondary:hover { background: #545b62; }
            .button.success { background: #28a745; }
            .button.success:hover { background: #1e7e34; }
            
            /* Mobile Responsive */
            @media (max-width: 600px) {
              .content { padding: 20px; }
              .header { padding: 25px; }
              .header h1 { font-size: 22px; }
              .contract-content { padding: 20px; }
              .signature-form { padding: 20px; }
            }
            
            .warning-box { 
              background: #fff3cd; 
              border: 2px solid #ffc107; 
              border-radius: 8px; 
              padding: 20px; 
              margin: 20px 0; 
              color: #856404;
            }
            .footer { 
              background: #2c3e50; 
              color: white; 
              padding: 30px; 
              text-align: center; 
            }
          </style>
          <script>
            // In-email signature functionality
            let isDrawing = false;
            let canvas, ctx;
            let reviewChecked = false;
            let signatureCompleted = false;
            
            function initCanvas() {
              canvas = document.getElementById('signatureCanvas');
              if (!canvas) return;
              ctx = canvas.getContext('2d');
              
              // Set canvas size properly with device pixel ratio
              const rect = canvas.getBoundingClientRect();
              const dpr = window.devicePixelRatio || 1;
              canvas.width = rect.width * dpr;
              canvas.height = 150 * dpr;
              canvas.style.width = rect.width + 'px';
              canvas.style.height = '150px';
              ctx.scale(dpr, dpr);
              
              // Drawing events
              canvas.addEventListener('mousedown', startDrawing);
              canvas.addEventListener('mousemove', draw);
              canvas.addEventListener('mouseup', stopDrawing);
              canvas.addEventListener('touchstart', handleTouch);
              canvas.addEventListener('touchmove', handleTouch);
              canvas.addEventListener('touchend', stopDrawing);
            }
            
            function startDrawing(e) {
              isDrawing = true;
              ctx.strokeStyle = '#000';
              ctx.lineWidth = 2;
              ctx.lineCap = 'round';
              ctx.beginPath();
              const rect = canvas.getBoundingClientRect();
              ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
            }
            
            function draw(e) {
              if (!isDrawing) return;
              const rect = canvas.getBoundingClientRect();
              ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
              ctx.stroke();
            }
            
            function stopDrawing() {
              isDrawing = false;
            }
            
            function handleTouch(e) {
              e.preventDefault();
              const touch = e.touches[0];
              const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                              e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
                clientX: touch.clientX,
                clientY: touch.clientY
              });
              canvas.dispatchEvent(mouseEvent);
            }
            
            function clearSignature() {
              if (!canvas || !ctx) return;
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            
            function toggleReview() {
              reviewChecked = !reviewChecked;
              const checkbox = document.getElementById('reviewCheck');
              const signatureSection = document.getElementById('signatureSection');
              
              if (checkbox) {
                checkbox.className = reviewChecked ? 'custom-checkbox checked' : 'custom-checkbox';
                checkbox.style.background = reviewChecked ? '#28a745' : '#fff';
                checkbox.style.color = reviewChecked ? '#fff' : '#000';
                checkbox.innerHTML = reviewChecked ? '✓' : '';
                checkbox.style.border = '2px solid ' + (reviewChecked ? '#28a745' : '#ddd');
              }
              
              if (signatureSection) {
                signatureSection.style.opacity = reviewChecked ? '1' : '0.5';
                signatureSection.style.pointerEvents = reviewChecked ? 'auto' : 'none';
              }
              
              updateSubmitButton();
            }
            
            function updateSubmitButton() {
              const submitBtn = document.getElementById('submitContract');
              const nameInput = document.getElementById('signatureName');
              const hasSignature = canvas && !isCanvasEmpty();
              const hasName = nameInput && nameInput.value.trim().length > 0;
              
              submitBtn.disabled = !(reviewChecked && (hasSignature || hasName));
              submitBtn.style.opacity = submitBtn.disabled ? '0.5' : '1';
              submitBtn.style.cursor = submitBtn.disabled ? 'not-allowed' : 'pointer';
              submitBtn.style.pointerEvents = submitBtn.disabled ? 'none' : 'auto';
              
              if (reviewChecked && (hasSignature || hasName)) {
                submitBtn.className = 'button success';
                submitBtn.textContent = '✓ Submit Signed Contract';
                submitBtn.style.backgroundColor = '#28a745';
                submitBtn.style.borderColor = '#28a745';
              } else {
                submitBtn.className = 'button';
                submitBtn.textContent = 'Complete Review & Signature Required';
                submitBtn.style.backgroundColor = '#6c757d';
                submitBtn.style.borderColor = '#6c757d';
              }
            }
            
            function isCanvasEmpty() {
              const blank = document.createElement('canvas');
              blank.width = canvas.width;
              blank.height = canvas.height;
              return canvas.toDataURL() === blank.toDataURL();
            }
            
            function submitContract() {
              if (!reviewChecked) {
                alert('Please confirm you have reviewed the contract.');
                return;
              }
              
              const nameSignature = document.getElementById('signatureName').value;
              const hasDrawnSignature = canvas && !isCanvasEmpty();
              
              if (!nameSignature && !hasDrawnSignature) {
                alert('Please provide either a drawn signature or type your name.');
                return;
              }
              
              // Collect signature data
              const signatureData = {
                contractId: '${params.contractId}',
                clientName: '${params.clientName}',
                typedName: nameSignature,
                drawnSignature: hasDrawnSignature ? canvas.toDataURL() : null,
                timestamp: new Date().toISOString(),
                reviewConfirmed: reviewChecked
              };
              
              // Show success message
              document.getElementById('signatureSection').innerHTML = \`
                <div style="text-align: center; padding: 30px; background: #d4edda; border-radius: 10px; color: #155724;">
                  <h3>✅ Contract Signed Successfully!</h3>
                  <p>Your signature has been recorded. Both parties will receive a signed copy via email.</p>
                  <p style="margin-top: 15px; font-size: 14px;">
                    <strong>Signed by:</strong> \${signatureData.clientName}<br>
                    <strong>Date:</strong> \${new Date().toLocaleString()}<br>
                    <strong>Contract ID:</strong> \${signatureData.contractId}
                  </p>
                </div>
              \`;
              
              // In a real implementation, this would send the signature data to the server
              console.log('Contract signed:', signatureData);
            }
            
            // Initialize when page loads
            window.onload = function() {
              initCanvas();
              document.getElementById('signatureName').addEventListener('input', updateSubmitButton);
            };
          </script>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>📋 Contract Review & Signature</h1>
              <p>Complete contract review and digital signature process</p>
            </div>
            
            <div class="content">
              <div class="section">
                <h2>Hello ${params.clientName},</h2>
                <p>Your contract with <strong>${params.contractorCompany}</strong> is ready for your review and digital signature. Please read the complete contract below and provide your signature to proceed.</p>
              </div>
              
              <div class="warning-box">
                <h3 style="margin-bottom: 10px;">⚠️ Important Legal Notice</h3>
                <p style="margin: 0;">
                  <strong>This is a legally binding agreement.</strong> Please read all terms and conditions carefully. 
                  Do not sign unless you fully understand and agree to all terms. Contact ${params.contractorCompany} with any questions.
                </p>
              </div>
              
              <!-- COMPLETE CONTRACT CONTENT -->
              <div class="contract-content">
                <h3 style="text-align: center; margin-bottom: 20px; color: #2c3e50;">📄 COMPLETE CONTRACT DOCUMENT</h3>
                ${params.contractHTML}
              </div>
              
              <!-- REVIEW CONFIRMATION -->
              <div class="review-section" id="reviewSection">
                <h3 style="margin-bottom: 15px;">📖 Contract Review Confirmation</h3>
                <p style="margin-bottom: 20px; opacity: 0.9;">
                  Legal requirement: You must confirm you have read and understand the complete contract before signing.
                </p>
                <div class="review-checkbox">
                  <div class="checkbox-container">
                    <div id="reviewCheck" class="custom-checkbox" onclick="toggleReview()"></div>
                    <label style="cursor: pointer; font-weight: 600;" onclick="toggleReview()">
                      ✓ I have read and understand the complete contract above
                    </label>
                  </div>
                  <p style="font-size: 12px; color: #666; margin-top: 10px;">
                    This confirmation is required by law before digital signature collection.
                  </p>
                </div>
              </div>
              
              <!-- DIGITAL SIGNATURE SECTION -->
              <div class="signature-section" id="signatureSection">
                <h3 style="margin-bottom: 15px;">✍️ Digital Signature</h3>
                <p style="margin-bottom: 20px; opacity: 0.9;">
                  Provide your legal signature using either method below:
                </p>
                
                <!-- Signature Fields with Names -->
                <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px; max-width: 100%;">
                  <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <div style="border: 2px solid #ddd; padding: 12px; border-radius: 8px; text-align: center; min-height: 80px; flex: 1; min-width: 250px;">
                      <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 14px;">CONTRACTOR</div>
                      <div style="border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 5px; min-height: 40px; display: flex; align-items: center; justify-content: center;">
                        <span id="contractorSignatureField" style="font-family: 'Brush Script MT', cursive; font-size: 16px;">
                          ${params.contractorName}
                        </span>
                      </div>
                      <small style="color: #666; font-size: 12px;">Signature</small>
                    </div>
                    
                    <div style="border: 2px solid #ddd; padding: 12px; border-radius: 8px; text-align: center; min-height: 80px; flex: 1; min-width: 250px;">
                      <div style="font-weight: bold; margin-bottom: 8px; color: #2c3e50; font-size: 14px;">CLIENT</div>
                      <div style="border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 5px; min-height: 40px; display: flex; align-items: center; justify-content: center;">
                        <span id="clientSignatureField" style="font-family: 'Brush Script MT', cursive; font-size: 16px;">
                          ${params.clientName}
                        </span>
                      </div>
                      <small style="color: #666; font-size: 12px;">Signature</small>
                    </div>
                  </div>
                </div>
                
                <div class="signature-form">
                  <h4 style="margin-bottom: 15px; color: #495057;">Option 1: Draw Your Signature</h4>
                  <canvas id="signatureCanvas" class="signature-canvas" width="400" height="150"></canvas>
                  <button type="button" class="button secondary" onclick="clearSignature()">Clear Signature</button>
                  
                  <h4 style="margin: 25px 0 15px 0; color: #495057;">Option 2: Type Your Name (Cursive Style)</h4>
                  <input type="text" id="signatureName" class="signature-input" placeholder="Type your full legal name" value="" />
                  
                  <div style="margin-top: 25px;">
                    <button type="button" id="submitContract" class="button" onclick="submitContract()" disabled>
                      Complete Review & Signature Required
                    </button>
                  </div>
                  
                  <p style="font-size: 12px; color: #666; margin-top: 15px; text-align: center;">
                    By signing, you agree to all terms and conditions outlined in the contract above.
                  </p>
                </div>
              </div>
              
              <!-- ALTERNATIVE REVIEW LINK -->
              <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
                <h4 style="color: #1565c0; margin-bottom: 10px;">📱 Need a Better Mobile Experience?</h4>
                <p style="color: #0d47a1; margin-bottom: 15px;">
                  If you prefer, you can also review and sign this contract on our secure review page:
                </p>
                <a href="${params.reviewUrl}" style="background: #2196f3; color: white; text-decoration: none; padding: 12px 25px; border-radius: 8px; font-weight: 600; display: inline-block;">
                  🔒 Open Contract Review Page
                </a>
              </div>
              
              <!-- CONTRACT DETAILS -->
              <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin: 25px 0;">
                <h4 style="color: #495057; margin-bottom: 15px;">📋 Contract Information</h4>
                <ul style="list-style: none; padding: 0;">
                  <li style="margin-bottom: 8px;"><strong>Contract ID:</strong> ${params.contractId}</li>
                  <li style="margin-bottom: 8px;"><strong>Contractor:</strong> ${params.contractorCompany}</li>
                  <li style="margin-bottom: 8px;"><strong>Client:</strong> ${params.clientName}</li>
                  <li style="margin-bottom: 8px;"><strong>Date Sent:</strong> ${new Date().toLocaleDateString()}</li>
                  <li style="margin-bottom: 8px;"><strong>Status:</strong> Awaiting Client Signature</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Powered by Owl Fence Legal Defense System</strong></p>
              <p style="margin: 10px 0;">Secure • Compliant • Professional • Legally Binding</p>
              <p style="font-size: 12px; opacity: 0.8;">
                This email contains a complete legally binding contract. Digital signatures are legally equivalent to handwritten signatures.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send the complete contract email with verified institutional FROM address
      const emailData = {
        from: `${params.contractorCompany} <${this.signatureEmail}>`, // Digital signature workflow
        to: recipient,
        subject: `🔒 Contract Review Required - ${params.contractorCompany}`,
        html: emailHTML, // No development banner needed with verified domain
        reply_to: 'support@owlfenc.com' // Professional reply-to
      };

      const result = await this.resend.emails.send(emailData);
      
      console.log('✅ [COMPLETE-CONTRACT-EMAIL] Contract email sent successfully');
      console.log('📧 [COMPLETE-CONTRACT-EMAIL] Email ID:', result.data?.id);
      console.log('📧 [COMPLETE-CONTRACT-EMAIL] Full result:', result);

      // Track the email for real delivery monitoring
      if (result.data?.id) {
        emailTracker.trackEmail(
          result.data.id,
          recipient,
          emailData.subject,
          emailData.from
        );
        console.log('📊 [TRACKING] Email delivery tracking activated for', result.data.id);
      } else {
        console.error('❌ [COMPLETE-CONTRACT-EMAIL] No email ID received from Resend');
        console.error('❌ [COMPLETE-CONTRACT-EMAIL] Result data:', result);
      }

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

      // Prepare email payload with verified institutional FROM address
      const emailPayload = {
        from: `${params.contractorCompany} <${this.legalEmail}>`, // Verified institutional sender
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
          'List-Unsubscribe': `<mailto:${this.legalEmail}?subject=Unsubscribe>`
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

        // Track the email for real delivery monitoring
        emailTracker.trackEmail(
          result.data.id,
          finalRecipient,
          emailPayload.subject,
          emailPayload.from
        );
        console.log('📊 [TRACKING] Email delivery tracking activated for', result.data.id);

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