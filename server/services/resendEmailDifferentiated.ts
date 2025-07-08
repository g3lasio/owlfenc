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
    console.log('🔍 [EMAIL-MODE] Checking email delivery mode...');
    console.log('🔍 [EMAIL-MODE] NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 [EMAIL-MODE] ENABLE_REAL_EMAIL:', process.env.ENABLE_REAL_EMAIL);
    console.log('🔍 [EMAIL-MODE] FORCE_PRODUCTION_EMAIL:', process.env.FORCE_PRODUCTION_EMAIL);
    
    const isProduction = process.env.NODE_ENV === 'production' || 
                        process.env.FORCE_PRODUCTION_EMAIL === 'true' || 
                        process.env.ENABLE_REAL_EMAIL === 'true';
    
    console.log('🔍 [EMAIL-MODE] Result - Production mode:', isProduction);
    return isProduction;
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
              
              <!-- EMBEDDED COMPLETE CONTRACT CONTENT -->
              <div class="contract-content" style="background: #ffffff; border: 2px solid #28a745; padding: 25px; border-radius: 12px; margin: 25px 0; max-height: 600px; overflow-y: auto; font-family: 'Times New Roman', Times, serif; font-size: 14px;">
                <h2 style="color: #2c3e50; text-align: center; margin-bottom: 20px; font-size: 18px;">INDEPENDENT CONTRACTOR AGREEMENT</h2>
                
                <div style="border: 2px solid #28a745; padding: 15px; margin: 15px 0; background: #f8f9fa;">
                  <h4 style="margin: 0 0 10px 0; color: #28a745;">CONTRACTING PARTIES</h4>
                  <p style="margin: 5px 0; line-height: 1.4;"><strong>Contractor:</strong> ${params.contractorName}</p>
                  <p style="margin: 5px 0; line-height: 1.4;"><strong>Client:</strong> ${params.clientName}</p>
                  <p style="margin: 5px 0; line-height: 1.4;"><strong>Project Value:</strong> ${params.projectDetails?.value || 'As agreed'}</p>
                  <p style="margin: 5px 0; line-height: 1.4;"><strong>Project Location:</strong> ${params.projectDetails?.address || 'Client property'}</p>
                </div>

                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">1. SCOPE OF WORK</h3>
                <p style="line-height: 1.6; margin-bottom: 12px; text-align: justify;">${params.projectDetails?.description || 'Professional construction services as specified in project documentation.'}</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">2. PAYMENT TERMS</h3>
                <p style="line-height: 1.6; margin-bottom: 8px;"><strong>Total Contract Amount:</strong> ${params.projectDetails?.value || 'As specified'}</p>
                <p style="line-height: 1.6; margin-bottom: 8px;"><strong>Payment Schedule:</strong></p>
                <ul style="margin: 8px 0 12px 20px;">
                  <li>50% deposit upon contract execution</li>
                  <li>50% final payment upon project completion</li>
                </ul>
                <p style="line-height: 1.6; margin-bottom: 12px;"><strong>Payment Methods:</strong> Check, bank transfer, or approved electronic payment systems.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">3. PROJECT TIMELINE</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">Work shall commence within seven (7) days of contract execution and deposit receipt. Project completion date as specified in attached timeline documentation.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">4. WARRANTIES & GUARANTEES</h3>
                <p style="line-height: 1.6; margin-bottom: 8px;"><strong>Workmanship Warranty:</strong> Two (2) year warranty on all installation and construction work.</p>
                <p style="line-height: 1.6; margin-bottom: 12px;"><strong>Materials Warranty:</strong> Manufacturer warranties apply; Contractor provides one (1) year warranty on material defects.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">5. INSURANCE & LIABILITY</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">Contractor maintains comprehensive general liability insurance minimum $1,000,000 and workers' compensation insurance. Client is protected from liability for work-related injuries or property damages.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">6. PERMITS & COMPLIANCE</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">Contractor shall obtain all necessary permits and ensure work complies with applicable building codes, regulations, and local ordinances.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">7. CHANGE ORDERS</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">Any changes to scope of work must be documented in writing and signed by both parties before implementation. Additional charges apply to scope changes.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">8. TERMINATION</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">Either party may terminate this agreement with seven (7) days written notice. Client responsible for payment of completed work.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">9. DISPUTE RESOLUTION</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">Disputes shall be resolved through binding arbitration in accordance with applicable state laws.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">10. GOVERNING LAW</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">This agreement shall be governed by the laws of the state where the work is performed.</p>
              </div>

              <!-- SIGNATURE SECTION -->
              <div class="signature-section" style="background: #e8f5e8; border: 2px dashed #28a745; padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
                <h3 style="color: #2c3e50; margin-bottom: 20px;">🖊️ Contractor Digital Signature</h3>
                
                <div style="margin: 20px 0; text-align: left;">
                  <label style="display: block; margin-bottom: 10px;">
                    <input type="checkbox" id="contractorReview" required style="margin-right: 10px; transform: scale(1.2);">
                    I have thoroughly reviewed all contract terms and conditions
                  </label>
                  <label style="display: block; margin-bottom: 10px;">
                    <input type="checkbox" id="legalCompliance" required style="margin-right: 10px; transform: scale(1.2);">
                    I confirm this contract meets all legal and regulatory requirements
                  </label>
                </div>
                
                <p><strong>Sign by drawing below or typing your name:</strong></p>
                <canvas id="signatureCanvas" width="400" height="150" style="border: 2px solid #28a745; border-radius: 8px; background: white; cursor: crosshair; display: block; margin: 20px auto;"></canvas>
                <button type="button" onclick="clearSignature()" style="background: #6c757d; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Clear Signature</button>
                
                <p style="margin-top: 20px;"><strong>Or type your full legal name:</strong></p>
                <input type="text" id="contractorName" placeholder="Type your full legal name here" value="${params.contractorName}" style="width: 100%; padding: 12px; border: 2px solid #28a745; border-radius: 8px; margin: 10px 0; font-size: 16px;">
                
                <div style="margin-top: 30px;">
                  <button type="button" id="approveButton" style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 15px 30px; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; margin: 10px;">✅ APPROVE & SIGN CONTRACT</button>
                  <button type="button" id="rejectButton" style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 15px 30px; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; margin: 10px;">❌ REJECT CONTRACT</button>
                </div>
                
                <div id="statusMessage" style="padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-weight: bold; display: none;"></div>
              </div>

              <script>
                // Signature Canvas Setup
                const canvas = document.getElementById('signatureCanvas');
                const ctx = canvas.getContext('2d');
                let isDrawing = false;
                let hasSignature = false;

                canvas.addEventListener('mousedown', startDrawing);
                canvas.addEventListener('mousemove', draw);
                canvas.addEventListener('mouseup', stopDrawing);
                canvas.addEventListener('touchstart', handleTouch);
                canvas.addEventListener('touchmove', handleTouch);
                canvas.addEventListener('touchend', stopDrawing);

                function startDrawing(e) {
                  isDrawing = true;
                  hasSignature = true;
                  const rect = canvas.getBoundingClientRect();
                  ctx.beginPath();
                  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                }

                function draw(e) {
                  if (!isDrawing) return;
                  const rect = canvas.getBoundingClientRect();
                  ctx.lineWidth = 2;
                  ctx.lineCap = 'round';
                  ctx.strokeStyle = '#2c3e50';
                  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                  ctx.stroke();
                }

                function stopDrawing() { isDrawing = false; }

                function handleTouch(e) {
                  e.preventDefault();
                  const touch = e.touches[0];
                  const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                                   e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
                    clientX: touch.clientX, clientY: touch.clientY
                  });
                  canvas.dispatchEvent(mouseEvent);
                }

                function clearSignature() {
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  hasSignature = false;
                }

                // Add event listeners after DOM is loaded
                document.addEventListener('DOMContentLoaded', function() {
                  document.getElementById('approveButton').addEventListener('click', approveContract);
                  document.getElementById('rejectButton').addEventListener('click', rejectContract);
                });

                function showStatus(message, isSuccess) {
                  const statusDiv = document.getElementById('statusMessage');
                  statusDiv.textContent = message;
                  statusDiv.style.background = isSuccess ? '#d4edda' : '#f8d7da';
                  statusDiv.style.color = isSuccess ? '#155724' : '#721c24';
                  statusDiv.style.border = isSuccess ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
                  statusDiv.style.display = 'block';
                }

                function approveContract() {
                  const reviewChecked = document.getElementById('contractorReview').checked;
                  const legalChecked = document.getElementById('legalCompliance').checked;
                  const nameValue = document.getElementById('contractorName').value.trim();
                  
                  if (!reviewChecked || !legalChecked) {
                    showStatus('❌ Please confirm both review checkboxes', false);
                    return;
                  }
                  
                  if (!hasSignature && !nameValue) {
                    showStatus('❌ Please provide either a drawn signature or type your name', false);
                    return;
                  }

                  const signatureData = hasSignature ? canvas.toDataURL() : null;
                  const contractData = {
                    contractId: '${params.contractId}',
                    action: 'approve',
                    contractorName: nameValue,
                    signatureData: signatureData,
                    timestamp: new Date().toISOString(),
                    role: 'contractor'
                  };

                  fetch('${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://owlfenc.com'}/api/contract-signature', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(contractData)
                  })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      showStatus('✅ Contract approved successfully! Client will be notified to sign.', true);
                      document.querySelectorAll('button, input, canvas').forEach(el => el.disabled = true);
                    } else {
                      showStatus('❌ Error: ' + (data.message || 'Failed to process signature'), false);
                    }
                  })
                  .catch(error => {
                    showStatus('❌ Network error. Please try again.', false);
                  });
                }

                function rejectContract() {
                  const reason = prompt('Please provide a reason for rejecting this contract:');
                  if (!reason) return;

                  const contractData = {
                    contractId: '${params.contractId}',
                    action: 'reject',
                    reason: reason,
                    timestamp: new Date().toISOString(),
                    role: 'contractor'
                  };

                  fetch('${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://owlfenc.com'}/api/contract-signature', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(contractData)
                  })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      showStatus('Contract rejected. Client has been notified.', true);
                      document.querySelectorAll('button, input, canvas').forEach(el => el.disabled = true);
                    } else {
                      showStatus('❌ Error: ' + (data.message || 'Failed to process rejection'), false);
                    }
                  })
                  .catch(error => {
                    showStatus('❌ Network error. Please try again.', false);
                  });
                }
              </script>
              
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
              
              <!-- EMBEDDED COMPLETE CONTRACT CONTENT -->
              <div class="contract-content" style="background: #ffffff; border: 2px solid #007bff; padding: 25px; border-radius: 12px; margin: 25px 0; max-height: 600px; overflow-y: auto; font-family: 'Times New Roman', Times, serif; font-size: 14px;">
                <h2 style="color: #2c3e50; text-align: center; margin-bottom: 20px; font-size: 18px;">INDEPENDENT CONTRACTOR AGREEMENT</h2>
                
                <div style="border: 2px solid #007bff; padding: 15px; margin: 15px 0; background: #f8f9fa;">
                  <h4 style="margin: 0 0 10px 0; color: #007bff;">CONTRACTING PARTIES</h4>
                  <p style="margin: 5px 0; line-height: 1.4;"><strong>Contractor:</strong> ${params.contractorName}</p>
                  <p style="margin: 5px 0; line-height: 1.4;"><strong>Client:</strong> ${params.clientName}</p>
                  <p style="margin: 5px 0; line-height: 1.4;"><strong>Project Value:</strong> ${params.projectDetails?.value || 'As agreed'}</p>
                  <p style="margin: 5px 0; line-height: 1.4;"><strong>Project Location:</strong> ${params.projectDetails?.address || 'Your property'}</p>
                </div>

                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">1. SCOPE OF WORK</h3>
                <p style="line-height: 1.6; margin-bottom: 12px; text-align: justify;">${params.projectDetails?.description || 'Professional construction services as specified in project documentation for your property.'}</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">2. PAYMENT TERMS</h3>
                <p style="line-height: 1.6; margin-bottom: 8px;"><strong>Total Contract Amount:</strong> ${params.projectDetails?.value || 'As specified'}</p>
                <p style="line-height: 1.6; margin-bottom: 8px;"><strong>Payment Schedule:</strong></p>
                <ul style="margin: 8px 0 12px 20px;">
                  <li>50% deposit upon contract execution and signing</li>
                  <li>50% final payment upon satisfactory project completion</li>
                </ul>
                <p style="line-height: 1.6; margin-bottom: 12px;"><strong>Payment Methods:</strong> Check, bank transfer, credit card, or approved electronic payment systems.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">3. PROJECT TIMELINE</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">Work shall commence within seven (7) calendar days of contract execution and deposit receipt. Project completion date as specified in attached timeline documentation and project specifications.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">4. WARRANTIES & GUARANTEES</h3>
                <p style="line-height: 1.6; margin-bottom: 8px;"><strong>Workmanship Warranty:</strong> Two (2) year comprehensive warranty on all installation and construction work performed.</p>
                <p style="line-height: 1.6; margin-bottom: 12px;"><strong>Materials Warranty:</strong> All manufacturer warranties apply; Contractor provides additional one (1) year warranty covering material defects and installation issues.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">5. INSURANCE & LIABILITY PROTECTION</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">Contractor maintains comprehensive general liability insurance minimum $1,000,000 and workers' compensation insurance as required by law. You are fully protected from liability for work-related injuries, property damages, or accidents occurring during project execution.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">6. PERMITS & REGULATORY COMPLIANCE</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">Contractor shall obtain all necessary building permits, inspections, and ensure complete compliance with applicable building codes, regulations, zoning requirements, and local ordinances at no additional cost to Client.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">7. CHANGE ORDERS & MODIFICATIONS</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">Any changes to original scope of work must be documented in writing and signed by both parties before implementation. Additional charges for scope changes will be clearly itemized and agreed upon in advance.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">8. PROJECT COMPLETION & ACCEPTANCE</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">Project shall be deemed complete upon Client's written acceptance or seven (7) days after substantial completion, whichever occurs first. Final payment due upon completion acceptance.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">9. TERMINATION CLAUSE</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">Either party may terminate this agreement with seven (7) days written notice. Client responsible only for payment of work completed to date of termination.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">10. DISPUTE RESOLUTION</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">Any disputes arising from this agreement shall be resolved through binding arbitration in accordance with applicable state laws and local jurisdiction requirements.</p>
                
                <h3 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px;">11. GOVERNING LAW</h3>
                <p style="line-height: 1.6; margin-bottom: 12px;">This agreement shall be governed by and construed in accordance with the laws of the state where the work is performed.</p>
              </div>

              <!-- CLIENT SIGNATURE SECTION -->
              <div class="signature-section" style="background: #e3f2fd; border: 2px dashed #007bff; padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
                <h3 style="color: #2c3e50; margin-bottom: 20px;">✍️ Your Digital Signature</h3>
                
                <div style="margin: 20px 0; text-align: left;">
                  <label style="display: block; margin-bottom: 15px;">
                    <input type="checkbox" id="clientReview" required style="margin-right: 10px; transform: scale(1.2);">
                    I have carefully read and understand all contract terms and conditions
                  </label>
                  <label style="display: block; margin-bottom: 15px;">
                    <input type="checkbox" id="paymentAgreement" required style="margin-right: 10px; transform: scale(1.2);">
                    I agree to the payment terms and schedule outlined above
                  </label>
                  <label style="display: block; margin-bottom: 15px;">
                    <input type="checkbox" id="projectAuthorization" required style="margin-right: 10px; transform: scale(1.2);">
                    I authorize ${params.contractorName} to begin work as specified
                  </label>
                </div>
                
                <p><strong>Sign by drawing below or typing your name:</strong></p>
                <canvas id="clientSignatureCanvas" width="400" height="150" style="border: 2px solid #007bff; border-radius: 8px; background: white; cursor: crosshair; display: block; margin: 20px auto;"></canvas>
                <button type="button" onclick="clearClientSignature()" style="background: #6c757d; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Clear Signature</button>
                
                <p style="margin-top: 20px;"><strong>Or type your full legal name:</strong></p>
                <input type="text" id="clientName" placeholder="Type your full legal name here" value="${params.clientName}" style="width: 100%; padding: 12px; border: 2px solid #007bff; border-radius: 8px; margin: 10px 0; font-size: 16px;">
                
                <div style="margin-top: 30px;">
                  <button type="button" id="approveClientButton" style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 15px 30px; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; margin: 10px;">✅ SIGN & APPROVE CONTRACT</button>
                  <button type="button" id="rejectClientButton" style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 15px 30px; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; margin: 10px;">❌ DECLINE CONTRACT</button>
                </div>
                
                <div id="clientStatusMessage" style="padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-weight: bold; display: none;"></div>
              </div>

              <script>
                // Client Signature Canvas Setup
                const clientCanvas = document.getElementById('clientSignatureCanvas');
                const clientCtx = clientCanvas.getContext('2d');
                let isClientDrawing = false;
                let hasClientSignature = false;

                clientCanvas.addEventListener('mousedown', startClientDrawing);
                clientCanvas.addEventListener('mousemove', drawClient);
                clientCanvas.addEventListener('mouseup', stopClientDrawing);
                clientCanvas.addEventListener('touchstart', handleClientTouch);
                clientCanvas.addEventListener('touchmove', handleClientTouch);
                clientCanvas.addEventListener('touchend', stopClientDrawing);

                function startClientDrawing(e) {
                  isClientDrawing = true;
                  hasClientSignature = true;
                  const rect = clientCanvas.getBoundingClientRect();
                  clientCtx.beginPath();
                  clientCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                }

                function drawClient(e) {
                  if (!isClientDrawing) return;
                  const rect = clientCanvas.getBoundingClientRect();
                  clientCtx.lineWidth = 2;
                  clientCtx.lineCap = 'round';
                  clientCtx.strokeStyle = '#007bff';
                  clientCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                  clientCtx.stroke();
                }

                function stopClientDrawing() { isClientDrawing = false; }

                function handleClientTouch(e) {
                  e.preventDefault();
                  const touch = e.touches[0];
                  const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                                   e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
                    clientX: touch.clientX, clientY: touch.clientY
                  });
                  clientCanvas.dispatchEvent(mouseEvent);
                }

                function clearClientSignature() {
                  clientCtx.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
                  hasClientSignature = false;
                }

                // Add event listeners for client buttons after DOM is loaded
                document.addEventListener('DOMContentLoaded', function() {
                  document.getElementById('approveClientButton').addEventListener('click', approveClientContract);
                  document.getElementById('rejectClientButton').addEventListener('click', rejectClientContract);
                });

                function showClientStatus(message, isSuccess) {
                  const statusDiv = document.getElementById('clientStatusMessage');
                  statusDiv.textContent = message;
                  statusDiv.style.background = isSuccess ? '#d4edda' : '#f8d7da';
                  statusDiv.style.color = isSuccess ? '#155724' : '#721c24';
                  statusDiv.style.border = isSuccess ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
                  statusDiv.style.display = 'block';
                }

                function approveClientContract() {
                  const reviewChecked = document.getElementById('clientReview').checked;
                  const paymentChecked = document.getElementById('paymentAgreement').checked;
                  const authChecked = document.getElementById('projectAuthorization').checked;
                  const nameValue = document.getElementById('clientName').value.trim();
                  
                  if (!reviewChecked || !paymentChecked || !authChecked) {
                    showClientStatus('❌ Please confirm all three checkboxes above', false);
                    return;
                  }
                  
                  if (!hasClientSignature && !nameValue) {
                    showClientStatus('❌ Please provide either a drawn signature or type your name', false);
                    return;
                  }

                  const signatureData = hasClientSignature ? clientCanvas.toDataURL() : null;
                  const contractData = {
                    contractId: '${params.contractId}',
                    action: 'approve',
                    clientName: nameValue,
                    signatureData: signatureData,
                    timestamp: new Date().toISOString(),
                    role: 'client'
                  };

                  fetch('${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://owlfenc.com'}/api/contract-signature', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(contractData)
                  })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      showClientStatus('🎉 Contract signed successfully! You will receive a copy shortly.', true);
                      document.querySelectorAll('button, input, canvas').forEach(el => el.disabled = true);
                    } else {
                      showClientStatus('❌ Error: ' + (data.message || 'Failed to process signature'), false);
                    }
                  })
                  .catch(error => {
                    showClientStatus('❌ Network error. Please try again.', false);
                  });
                }

                function rejectClientContract() {
                  const reason = prompt('Please let us know why you are declining this contract (optional):');
                  
                  const contractData = {
                    contractId: '${params.contractId}',
                    action: 'reject',
                    reason: reason || 'Client declined contract',
                    timestamp: new Date().toISOString(),
                    role: 'client'
                  };

                  fetch('${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://owlfenc.com'}/api/contract-signature', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(contractData)
                  })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      showClientStatus('Contract declined. Your contractor has been notified.', true);
                      document.querySelectorAll('button, input, canvas').forEach(el => el.disabled = true);
                    } else {
                      showClientStatus('❌ Error: ' + (data.message || 'Failed to process response'), false);
                    }
                  })
                  .catch(error => {
                    showClientStatus('❌ Network error. Please try again.', false);
                  });
                }
              </script>
              
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