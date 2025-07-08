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
                  <button type="button" id="approveButton" onclick="approveContract(); console.log('Direct onclick called');" style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 15px 30px; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; margin: 10px;">✅ APPROVE & SIGN CONTRACT</button>
                  <button type="button" id="rejectButton" onclick="rejectContract(); console.log('Direct onclick called');" style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 15px 30px; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; margin: 10px;">❌ REJECT CONTRACT</button>
                </div>
                
                <!-- ALTERNATIVE FORM-BASED APPROACH -->
                <form action="${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://owlfenc.com'}/api/contract-signature" method="POST" style="margin-top: 20px; border: 2px dashed #28a745; padding: 20px; border-radius: 8px;">
                  <h4 style="color: #28a745; text-align: center;">Alternative: Form-Based Approval</h4>
                  <p style="text-align: center; font-size: 14px; color: #666;">If buttons above don't work, use this form as backup:</p>
                  <input type="hidden" name="contractId" value="${params.contractId}">
                  <input type="hidden" name="role" value="contractor">
                  <input type="hidden" name="timestamp" value="">
                  <div style="text-align: center; margin: 15px 0;">
                    <input type="hidden" name="action" value="approve">
                    <input type="text" name="contractorName" placeholder="Your full legal name" value="${params.contractorName}" style="width: 80%; padding: 10px; margin: 5px 0; border: 2px solid #28a745; border-radius: 4px;">
                    <br>
                    <button type="submit" style="background: #28a745; color: white; padding: 12px 24px; border: none; border-radius: 4px; font-weight: 600; margin: 10px; cursor: pointer;">✅ SUBMIT APPROVAL</button>
                  </div>
                </form>
                
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

                // Multiple initialization strategies
                function initializeButtonFunctionality() {
                  console.log('🔧 [DEBUG] Initializing button functionality');
                  
                  try {
                    // Strategy 1: Direct onclick handlers (already in HTML)
                    console.log('✅ [DEBUG] Direct onclick handlers set in HTML');
                    
                    // Strategy 2: Event listeners  
                    const approveBtn = document.getElementById('approveButton');
                    const rejectBtn = document.getElementById('rejectButton');
                    
                    if (approveBtn && rejectBtn) {
                      approveBtn.addEventListener('click', function(e) {
                        console.log('📱 [DEBUG] Event listener approve clicked');
                        e.preventDefault();
                        approveContract();
                      });
                      
                      rejectBtn.addEventListener('click', function(e) {
                        console.log('📱 [DEBUG] Event listener reject clicked');
                        e.preventDefault();
                        rejectContract();
                      });
                      
                      console.log('✅ [DEBUG] Event listeners attached successfully');
                    } else {
                      console.warn('⚠️ [DEBUG] Buttons not found for event listeners');
                    }
                    
                    // Strategy 3: Global window functions (for maximum compatibility)
                    window.approveContract = approveContract;
                    window.rejectContract = rejectContract;
                    console.log('✅ [DEBUG] Global functions assigned');
                    
                    // Strategy 4: Click simulation fallback
                    setTimeout(() => {
                      const buttons = document.querySelectorAll('#approveButton, #rejectButton');
                      buttons.forEach(btn => {
                        if (!btn.onclick && !btn._hasEventListener) {
                          btn.addEventListener('click', function() {
                            console.log('🔄 [DEBUG] Fallback click handler activated');
                            const isApprove = btn.id === 'approveButton';
                            if (isApprove) {
                              approveContract();
                            } else {
                              rejectContract();
                            }
                          });
                          btn._hasEventListener = true;
                        }
                      });
                    }, 1000);
                    
                  } catch (error) {
                    console.error('❌ [DEBUG] Error initializing buttons:', error);
                  }
                }

                // Initialize immediately
                initializeButtonFunctionality();
                
                // Also initialize after DOM loaded
                document.addEventListener('DOMContentLoaded', initializeButtonFunctionality);
                
                // And initialize after window loaded
                window.addEventListener('load', initializeButtonFunctionality);

                function showStatus(message, isSuccess) {
                  const statusDiv = document.getElementById('statusMessage');
                  statusDiv.textContent = message;
                  statusDiv.style.background = isSuccess ? '#d4edda' : '#f8d7da';
                  statusDiv.style.color = isSuccess ? '#155724' : '#721c24';
                  statusDiv.style.border = isSuccess ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
                  statusDiv.style.display = 'block';
                }

                function approveContract() {
                  console.log('🔥 [BUTTON-DEBUG] approveContract function called directly');
                  console.log('🔥 [BUTTON-DEBUG] Function context:', this);
                  console.log('🔥 [BUTTON-DEBUG] Current timestamp:', new Date().toISOString());
                  
                  try {
                    const reviewElement = document.getElementById('contractorReview');
                    const legalElement = document.getElementById('legalCompliance');
                    const nameElement = document.getElementById('contractorName');
                    
                    console.log('🔥 [BUTTON-DEBUG] Form elements found:', {
                      reviewElement: !!reviewElement,
                      legalElement: !!legalElement,
                      nameElement: !!nameElement
                    });
                    
                    if (!reviewElement || !legalElement || !nameElement) {
                      console.error('🔥 [BUTTON-DEBUG] Critical elements missing from DOM');
                      showStatus('❌ Form elements not found. Please refresh page.', false);
                      return;
                    }
                    
                    const reviewChecked = reviewElement.checked;
                    const legalChecked = legalElement.checked;
                    const nameValue = nameElement.value.trim();
                    
                    console.log('🔥 [BUTTON-DEBUG] Form validation data:', {
                      reviewChecked: reviewChecked,
                      legalChecked: legalChecked,
                      nameValue: nameValue,
                      hasSignature: hasSignature
                    });
                    
                    if (!reviewChecked || !legalChecked) {
                      console.log('🔥 [BUTTON-DEBUG] Validation failed - checkboxes not checked');
                      showStatus('❌ Please confirm both review checkboxes', false);
                      return;
                    }
                    
                    if (!hasSignature && !nameValue) {
                      console.log('🔥 [BUTTON-DEBUG] Validation failed - no signature or name');
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

                    console.log('🔥 [BUTTON-DEBUG] Sending contract data:', {
                      contractId: contractData.contractId,
                      action: contractData.action,
                      role: contractData.role,
                      hasSignatureData: !!contractData.signatureData,
                      nameLength: contractData.contractorName.length
                    });

                    showStatus('⏳ Processing approval...', true);

                    fetch('${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://owlfenc.com'}/api/contract-signature', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(contractData)
                    })
                    .then(response => {
                      console.log('🔥 [BUTTON-DEBUG] Server response status:', response.status);
                      return response.json();
                    })
                    .then(data => {
                      console.log('🔥 [BUTTON-DEBUG] Server response data:', data);
                      if (data.success) {
                        showStatus('✅ Contract approved successfully! Client will be notified to sign.', true);
                        document.querySelectorAll('button, input, canvas').forEach(el => el.disabled = true);
                      } else {
                        showStatus('❌ Error: ' + (data.message || 'Failed to process signature'), false);
                      }
                    })
                    .catch(error => {
                      console.error('🔥 [BUTTON-DEBUG] Network error:', error);
                      showStatus('❌ Network error. Please try again.', false);
                    });

                  } catch (error) {
                    console.error('🔥 [BUTTON-DEBUG] Function execution error:', error);
                    showStatus('❌ Unexpected error occurred. Please refresh page.', false);
                  }
                }

                function rejectContract() {
                  console.log('🔥 [BUTTON-DEBUG] rejectContract function called directly');
                  console.log('🔥 [BUTTON-DEBUG] Function context:', this);
                  
                  try {
                    const reason = prompt('Please provide a reason for rejecting this contract:');
                    if (!reason) {
                      console.log('🔥 [BUTTON-DEBUG] User cancelled rejection prompt');
                      return;
                    }

                    console.log('🔥 [BUTTON-DEBUG] Rejection reason provided:', reason.length, 'characters');

                    const contractData = {
                      contractId: '${params.contractId}',
                      action: 'reject',
                      reason: reason,
                      timestamp: new Date().toISOString(),
                      role: 'contractor'
                    };

                    console.log('🔥 [BUTTON-DEBUG] Sending rejection data:', {
                      contractId: contractData.contractId,
                      action: contractData.action,
                      role: contractData.role,
                      reasonLength: contractData.reason.length
                    });

                    showStatus('⏳ Processing rejection...', true);

                    fetch('${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://owlfenc.com'}/api/contract-signature', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(contractData)
                    })
                    .then(response => {
                      console.log('🔥 [BUTTON-DEBUG] Rejection response status:', response.status);
                      return response.json();
                    })
                    .then(data => {
                      console.log('🔥 [BUTTON-DEBUG] Rejection response data:', data);
                      if (data.success) {
                        showStatus('✅ Contract rejected. Client has been notified.', true);
                        document.querySelectorAll('button, input, canvas').forEach(el => el.disabled = true);
                      } else {
                        showStatus('❌ Error: ' + (data.message || 'Failed to process rejection'), false);
                      }
                    })
                    .catch(error => {
                      console.error('🔥 [BUTTON-DEBUG] Rejection network error:', error);
                      showStatus('❌ Network error. Please try again.', false);
                    });

                  } catch (error) {
                    console.error('🔥 [BUTTON-DEBUG] Rejection function error:', error);
                    showStatus('❌ Unexpected error occurred. Please refresh page.', false);
                  }
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
              
              <!-- COMPLETE CONTRACT CONTENT - IDENTICAL TO PDF -->
              <div class="contract-content" style="background: #ffffff; border: 2px solid #007bff; padding: 25px; border-radius: 12px; margin: 25px 0; max-height: 800px; overflow-y: auto; font-family: 'Times New Roman', Times, serif; font-size: 12px;">
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px;">
                  <h1 style="font-size: 18px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 2px;">INDEPENDENT CONTRACTOR AGREEMENT</h1>
                </div>
                
                <div style="text-align: right; margin: 20px 0; font-weight: bold;">
                  <strong>Agreement Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>

                <div style="margin: 30px 0;">
                  <div style="display: table; width: 100%; margin: 20px 0; border-collapse: separate; border-spacing: 20px 0;">
                    <div style="display: table-cell; width: 45%; border: 2px solid #000; padding: 20px; vertical-align: top;">
                      <div style="font-weight: bold; font-size: 14px; text-align: center; margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 5px;">CONTRACTOR</div>
                      <div style="line-height: 1.8;">
                        <p><strong>Business Name:</strong> ${params.contractorName}</p>
                        <p><strong>Business Address:</strong><br>${params.contractorAddress || 'Address not provided'}</p>
                        <p><strong>Telephone:</strong> ${params.contractorPhone || 'Phone not provided'}</p>
                        <p><strong>Email:</strong> ${params.contractorEmail || 'Email not provided'}</p>
                      </div>
                    </div>
                    <div style="display: table-cell; width: 45%; border: 2px solid #000; padding: 20px; vertical-align: top;">
                      <div style="font-weight: bold; font-size: 14px; text-align: center; margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 5px;">CLIENT</div>
                      <div style="line-height: 1.8;">
                        <p><strong>Full Name/Company:</strong> ${params.clientName}</p>
                        <p><strong>Property Address:</strong><br>${params.projectDetails?.address || 'Address not provided'}</p>
                        <p><strong>Telephone:</strong> ${params.clientPhone || 'Phone not provided'}</p>
                        <p><strong>Email:</strong> ${params.clientEmail || 'Email not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div style="margin: 25px 0;">
                  <div style="font-size: 14px; font-weight: bold; margin: 25px 0 15px 0; text-transform: uppercase; text-align: center; border-bottom: 1px solid #000; padding-bottom: 5px;">WHEREAS CLAUSES</div>
                  <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                    <strong>WHEREAS,</strong> the Client desires to engage the services of an independent contractor to perform specialized construction work at the above-referenced property; and
                  </p>
                  <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                    <strong>WHEREAS,</strong> the Contractor represents that it possesses the requisite skill, experience, expertise, and all necessary licenses to perform the specified work in accordance with industry standards and applicable regulations; and
                  </p>
                  <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                    <strong>WHEREAS,</strong> both parties desire to establish clear terms and conditions governing their professional relationship and to define their respective rights, duties, and obligations;
                  </p>
                  <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                    <strong>NOW, THEREFORE,</strong> in consideration of the mutual covenants, agreements, and undertakings contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:
                  </p>
                </div>

                <div style="margin: 25px 0;">
                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">1. SCOPE OF WORK AND SPECIFICATIONS</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      The Contractor hereby agrees to furnish all labor, materials, equipment, and services necessary to complete the following work: ${params.projectDetails?.description || 'Professional construction services'}. Said work shall be performed at the following location: ${params.projectDetails?.address || 'Your property'}. All work shall be executed in a professional, workmanlike manner in strict accordance with industry best practices, applicable building codes, municipal regulations, and manufacturer specifications. The Contractor warrants that all work will meet or exceed industry standards for quality and durability.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">2. CONTRACT PRICE AND PAYMENT TERMS</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      The total contract price for all work, materials, and services described herein shall be <strong>${params.projectDetails?.value || 'As specified'} USD</strong>. Payment shall be made according to the following schedule: (a) Fifty percent (50%) of the total contract price is due and payable upon execution of this Agreement as a down payment, and (b) The remaining fifty percent (50%) balance is due and payable immediately upon substantial completion and Client's acceptance of the work. All payments shall be made in United States currency. Late payments shall accrue interest at the rate of one and one-half percent (1.5%) per month or the maximum rate permitted by law, whichever is less.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">3. COMMENCEMENT AND COMPLETION</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      The Contractor shall commence work within ten (10) business days following execution of this Agreement and receipt of the initial payment, weather and site conditions permitting. The Contractor shall proceed with due diligence and in a timely manner to achieve substantial completion. Time is of the essence in this Agreement. The Contractor shall provide the Client with reasonable advance notice of any circumstances that may delay completion, including but not limited to adverse weather conditions, permit delays, or unforeseen site conditions.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">4. INDEPENDENT CONTRACTOR STATUS</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      The Contractor is and shall remain an independent contractor in the performance of all work under this Agreement. Nothing contained herein shall be construed to create an employer-employee, partnership, joint venture, or agency relationship between the parties. The Contractor shall be solely responsible for all federal, state, and local taxes, withholdings, unemployment insurance, workers' compensation, and other statutory obligations. The Contractor retains the exclusive right to control the manner, method, and means of performing the contracted services, subject to achieving the specified results.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">5. MATERIALS, EQUIPMENT, AND WORKMANSHIP</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      Unless expressly specified otherwise in writing, the Contractor shall furnish and pay for all materials, equipment, tools, transportation, and incidental services necessary for the completion of the work. All materials shall be new, of first quality, and shall conform to applicable industry standards and manufacturer specifications. All equipment used shall be properly maintained and in safe working condition. The Contractor warrants that all work will be free from defects in materials and workmanship for a period of one (1) year from the date of completion.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">6. INSURANCE AND LIABILITY</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      The Contractor shall maintain, at its own expense, comprehensive general liability insurance with minimum coverage limits of One Million Dollars ($1,000,000) per occurrence and Two Million Dollars ($2,000,000) aggregate, naming the Client as an additional insured. The Contractor shall also maintain workers' compensation insurance as required by law. Evidence of such insurance coverage shall be provided to the Client upon request. Each party agrees to indemnify, defend, and hold harmless the other party from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorney fees) arising from or relating to their own negligent acts, errors, or omissions in connection with this Agreement.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">7. CHANGE ORDERS AND MODIFICATIONS</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      No changes, modifications, or alterations to the scope of work, specifications, or contract terms shall be valid or binding unless executed in writing and signed by both parties. Any approved change order shall specify the nature of the change, adjustment to the contract price (if any), and any modification to the completion schedule. The Contractor shall not proceed with any additional work without a signed written change order. Verbal agreements or understandings shall not be enforceable.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">8. PERMITS, LICENSES, AND CODE COMPLIANCE</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      The Contractor shall obtain and pay for all permits, licenses, and approvals required by federal, state, and local authorities for the performance of the work, unless specifically agreed otherwise in writing. All work shall be performed in strict compliance with applicable building codes, zoning ordinances, environmental regulations, safety requirements, and industry standards. The Contractor shall schedule and coordinate all required inspections. Upon completion, all permits shall be properly closed out and documentation provided to the Client.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">9. WARRANTY AND REMEDIES</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      The Contractor hereby warrants all work performed under this Agreement against defects in materials and workmanship for a period of twelve (12) months from the date of substantial completion. This warranty does not cover damage resulting from normal wear and tear, abuse, neglect, accident, or failure to properly maintain the work. Upon written notice of any warranty defect, the Contractor shall, at its option, repair or replace the defective work at no cost to the Client within thirty (30) days. This warranty is in addition to any manufacturer warranties that may apply to materials or equipment.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">10. DEFAULT AND TERMINATION</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      Either party may terminate this Agreement upon the material breach of the other party, provided that the breaching party is given written notice of the breach and fails to cure such breach within ten (10) days after receipt of notice. In the event of termination, the Contractor shall be entitled to payment for all work satisfactorily completed prior to termination, less any damages sustained by the Client as a result of Contractor's breach. The Client may also terminate this Agreement for convenience upon thirty (30) days written notice, in which case the Contractor shall be compensated for all work completed and materials ordered prior to termination.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">11. DISPUTE RESOLUTION</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      Any disputes arising under this Agreement shall first be addressed through good faith negotiations between the parties. If such negotiations fail to resolve the dispute within thirty (30) days, the matter shall be submitted to binding arbitration administered by the American Arbitration Association under its Construction Industry Arbitration Rules. The arbitration shall be conducted in the county where the work is performed. The prevailing party in any arbitration or legal proceeding shall be entitled to recover reasonable attorney fees and costs from the non-prevailing party.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">12. SAFETY AND COMPLIANCE</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      The Contractor shall maintain a safe work environment and comply with all applicable Occupational Safety and Health Administration (OSHA) regulations and industry safety standards. The Contractor shall be solely responsible for the safety of its employees, subcontractors, and work site. All personnel shall use appropriate personal protective equipment and follow established safety protocols. The Contractor shall immediately report any workplace accidents or injuries to the Client and appropriate authorities.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">13. GOVERNING LAW AND JURISDICTION</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of laws principles. The parties hereby consent to the exclusive jurisdiction of the state and federal courts located in the county where the work is performed for the resolution of any disputes arising under this Agreement. This Agreement shall be binding upon and inure to the benefit of the parties' respective heirs, successors, and assigns.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">14. ENTIRE AGREEMENT AND MODIFICATIONS</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      This Agreement constitutes the complete and exclusive statement of the agreement between the parties and supersedes all prior negotiations, representations, understandings, and agreements, whether written or oral, relating to the subject matter hereof. No amendment, modification, or waiver of any provision of this Agreement shall be effective unless set forth in a written document signed by both parties. No course of dealing or usage of trade shall be used to modify, interpret, supplement, or alter the terms of this Agreement.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">15. SEVERABILITY AND CONSTRUCTION</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      If any provision of this Agreement is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. Any invalid provision shall be replaced by a valid provision that most closely approximates the intent and economic effect of the invalid provision. The headings used in this Agreement are for convenience only and shall not affect the interpretation of any provision. This Agreement has been negotiated by the parties and shall not be construed against either party as the drafter.
                    </p>
                  </div>

                  <div style="margin-bottom: 25px;">
                    <p><span style="font-weight: bold; text-decoration: underline; font-size: 13px;">16. NOTICES</span></p>
                    <p style="text-align: justify; margin-bottom: 15px; line-height: 1.6;">
                      All notices required or permitted under this Agreement shall be in writing and shall be deemed to have been duly given when personally delivered, or three (3) days after being sent by certified mail, return receipt requested, postage prepaid, to the addresses set forth above or to such other address as either party may designate by written notice to the other party.
                    </p>
                  </div>
                </div>

                <div style="margin-top: 40px; text-align: center;">
                  <p style="text-align: center; margin-bottom: 30px; font-weight: bold;">
                    <strong>IN WITNESS WHEREOF,</strong> the parties have executed this Independent Contractor Agreement as of the date first written above.
                  </p>
                </div>
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
                  <button type="button" id="approveClientButton" onclick="console.log('🔥 [CLIENT-BUTTON-DEBUG] Direct onclick approve called'); approveClientContract(); window.approveClientContract(); return false;" onmousedown="console.log('🔥 [CLIENT-BUTTON-DEBUG] Client approve mousedown');" ontouchstart="console.log('🔥 [CLIENT-BUTTON-DEBUG] Client approve touchstart');" style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 15px 30px; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; margin: 10px;">✅ SIGN & APPROVE CONTRACT</button>
                  <button type="button" id="rejectClientButton" onclick="console.log('🔥 [CLIENT-BUTTON-DEBUG] Direct onclick reject called'); rejectClientContract(); window.rejectClientContract(); return false;" onmousedown="console.log('🔥 [CLIENT-BUTTON-DEBUG] Client reject mousedown');" ontouchstart="console.log('🔥 [CLIENT-BUTTON-DEBUG] Client reject touchstart');" style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 15px 30px; border: none; border-radius: 8px; font-weight: 600; font-size: 16px; cursor: pointer; margin: 10px;">❌ DECLINE CONTRACT</button>
                </div>
                
                <!-- ALTERNATIVE CLIENT FORM-BASED APPROACH -->
                <form action="${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://owlfenc.com'}/api/contract-signature" method="POST" style="margin-top: 20px; border: 2px dashed #007bff; padding: 20px; border-radius: 8px;">
                  <h4 style="color: #007bff; text-align: center;">Alternative: Form-Based Approval</h4>
                  <p style="text-align: center; font-size: 14px; color: #666;">If buttons above don't work, use this form as backup:</p>
                  <input type="hidden" name="contractId" value="${params.contractId}">
                  <input type="hidden" name="role" value="client">
                  <input type="hidden" name="timestamp" value="">
                  <div style="text-align: center; margin: 15px 0;">
                    <input type="hidden" name="action" value="approve">
                    <input type="text" name="clientName" placeholder="Your full legal name" value="${params.clientName}" style="width: 80%; padding: 10px; margin: 5px 0; border: 2px solid #007bff; border-radius: 4px;">
                    <br>
                    <button type="submit" style="background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; font-weight: 600; margin: 10px; cursor: pointer;">✅ SUBMIT APPROVAL</button>
                  </div>
                </form>
                
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

                // Multiple initialization strategies for client buttons
                function initializeClientButtonFunctionality() {
                  console.log('🔧 [DEBUG] Initializing client button functionality');
                  
                  try {
                    // Strategy 1: Direct onclick handlers (already in HTML)
                    console.log('✅ [DEBUG] Direct client onclick handlers set in HTML');
                    
                    // Strategy 2: Event listeners  
                    const approveBtn = document.getElementById('approveClientButton');
                    const rejectBtn = document.getElementById('rejectClientButton');
                    
                    if (approveBtn && rejectBtn) {
                      approveBtn.addEventListener('click', function(e) {
                        console.log('📱 [CLIENT-BUTTON-DEBUG] Client event listener approve clicked');
                        console.log('📱 [CLIENT-BUTTON-DEBUG] Event target:', e.target);
                        console.log('📱 [CLIENT-BUTTON-DEBUG] Event type:', e.type);
                        e.preventDefault();
                        approveClientContract();
                      });
                      
                      rejectBtn.addEventListener('click', function(e) {
                        console.log('📱 [CLIENT-BUTTON-DEBUG] Client event listener reject clicked');
                        console.log('📱 [CLIENT-BUTTON-DEBUG] Event target:', e.target);
                        console.log('📱 [CLIENT-BUTTON-DEBUG] Event type:', e.type);
                        e.preventDefault();
                        rejectClientContract();
                      });
                      
                      console.log('✅ [DEBUG] Client event listeners attached successfully');
                    } else {
                      console.warn('⚠️ [DEBUG] Client buttons not found for event listeners');
                    }
                    
                    // Strategy 3: Global window functions (for maximum compatibility)
                    window.approveClientContract = approveClientContract;
                    window.rejectClientContract = rejectClientContract;
                    console.log('✅ [DEBUG] Global client functions assigned');
                    
                    // Strategy 4: Click simulation fallback
                    setTimeout(() => {
                      const clientButtons = document.querySelectorAll('#approveClientButton, #rejectClientButton');
                      clientButtons.forEach(btn => {
                        if (!btn.onclick && !btn._hasEventListener) {
                          btn.addEventListener('click', function() {
                            console.log('🔄 [DEBUG] Client fallback click handler activated');
                            const isApprove = btn.id === 'approveClientButton';
                            if (isApprove) {
                              approveClientContract();
                            } else {
                              rejectClientContract();
                            }
                          });
                          btn._hasEventListener = true;
                        }
                      });
                    }, 1000);
                    
                  } catch (error) {
                    console.error('❌ [DEBUG] Error initializing client buttons:', error);
                  }
                }

                // Initialize immediately
                initializeClientButtonFunctionality();
                
                // Also initialize after DOM loaded
                document.addEventListener('DOMContentLoaded', initializeClientButtonFunctionality);
                
                // And initialize after window loaded  
                window.addEventListener('load', initializeClientButtonFunctionality);

                function showClientStatus(message, isSuccess) {
                  const statusDiv = document.getElementById('clientStatusMessage');
                  statusDiv.textContent = message;
                  statusDiv.style.background = isSuccess ? '#d4edda' : '#f8d7da';
                  statusDiv.style.color = isSuccess ? '#155724' : '#721c24';
                  statusDiv.style.border = isSuccess ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
                  statusDiv.style.display = 'block';
                }

                function approveClientContract() {
                  console.log('🔥 [CLIENT-BUTTON-DEBUG] approveClientContract function called directly');
                  console.log('🔥 [CLIENT-BUTTON-DEBUG] Function context:', this);
                  console.log('🔥 [CLIENT-BUTTON-DEBUG] Current timestamp:', new Date().toISOString());
                  
                  try {
                    const reviewElement = document.getElementById('clientReview');
                    const paymentElement = document.getElementById('paymentAgreement');
                    const authElement = document.getElementById('projectAuthorization');
                    const nameElement = document.getElementById('clientName');
                    
                    console.log('🔥 [CLIENT-BUTTON-DEBUG] Form elements found:', {
                      reviewElement: !!reviewElement,
                      paymentElement: !!paymentElement,
                      authElement: !!authElement,
                      nameElement: !!nameElement
                    });
                    
                    if (!reviewElement || !paymentElement || !authElement || !nameElement) {
                      console.error('🔥 [CLIENT-BUTTON-DEBUG] Critical elements missing from DOM');
                      showClientStatus('❌ Form elements not found. Please refresh page.', false);
                      return;
                    }
                    
                    const reviewChecked = reviewElement.checked;
                    const paymentChecked = paymentElement.checked;
                    const authChecked = authElement.checked;
                    const nameValue = nameElement.value.trim();
                    
                    console.log('🔥 [CLIENT-BUTTON-DEBUG] Form validation data:', {
                      reviewChecked: reviewChecked,
                      paymentChecked: paymentChecked,
                      authChecked: authChecked,
                      nameValue: nameValue,
                      hasClientSignature: hasClientSignature
                    });
                    
                    if (!reviewChecked || !paymentChecked || !authChecked) {
                      console.log('🔥 [CLIENT-BUTTON-DEBUG] Validation failed - checkboxes not checked');
                      showClientStatus('❌ Please confirm all three checkboxes above', false);
                      return;
                    }
                    
                    if (!hasClientSignature && !nameValue) {
                      console.log('🔥 [CLIENT-BUTTON-DEBUG] Validation failed - no signature or name');
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

                    console.log('🔥 [CLIENT-BUTTON-DEBUG] Sending contract data:', {
                      contractId: contractData.contractId,
                      action: contractData.action,
                      role: contractData.role,
                      hasSignatureData: !!contractData.signatureData,
                      nameLength: contractData.clientName.length
                    });

                    showClientStatus('⏳ Processing approval...', true);

                    fetch('${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://owlfenc.com'}/api/contract-signature', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(contractData)
                    })
                    .then(response => {
                      console.log('🔥 [CLIENT-BUTTON-DEBUG] Server response status:', response.status);
                      return response.json();
                    })
                    .then(data => {
                      console.log('🔥 [CLIENT-BUTTON-DEBUG] Server response data:', data);
                      if (data.success) {
                        showClientStatus('🎉 Contract signed successfully! You will receive a copy shortly.', true);
                        document.querySelectorAll('button, input, canvas').forEach(el => el.disabled = true);
                      } else {
                        showClientStatus('❌ Error: ' + (data.message || 'Failed to process signature'), false);
                      }
                    })
                    .catch(error => {
                      console.error('🔥 [CLIENT-BUTTON-DEBUG] Network error:', error);
                      showClientStatus('❌ Network error. Please try again.', false);
                    });

                  } catch (error) {
                    console.error('🔥 [CLIENT-BUTTON-DEBUG] Function execution error:', error);
                    showClientStatus('❌ Unexpected error occurred. Please refresh page.', false);
                  }
                }

                function rejectClientContract() {
                  console.log('🔥 [CLIENT-BUTTON-DEBUG] rejectClientContract function called directly');
                  console.log('🔥 [CLIENT-BUTTON-DEBUG] Function context:', this);
                  
                  try {
                    const reason = prompt('Please let us know why you are declining this contract (optional):');
                    
                    console.log('🔥 [CLIENT-BUTTON-DEBUG] Rejection reason provided:', reason ? reason.length : 0, 'characters');

                    const contractData = {
                      contractId: '${params.contractId}',
                      action: 'reject',
                      reason: reason || 'Client declined contract',
                      timestamp: new Date().toISOString(),
                      role: 'client'
                    };

                    console.log('🔥 [CLIENT-BUTTON-DEBUG] Sending rejection data:', {
                      contractId: contractData.contractId,
                      action: contractData.action,
                      role: contractData.role,
                      reasonLength: contractData.reason.length
                    });

                    showClientStatus('⏳ Processing rejection...', true);

                    fetch('${process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://owlfenc.com'}/api/contract-signature', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(contractData)
                    })
                    .then(response => {
                      console.log('🔥 [CLIENT-BUTTON-DEBUG] Rejection response status:', response.status);
                      return response.json();
                    })
                    .then(data => {
                      console.log('🔥 [CLIENT-BUTTON-DEBUG] Rejection response data:', data);
                      if (data.success) {
                        showClientStatus('✅ Contract declined. Your contractor has been notified.', true);
                        document.querySelectorAll('button, input, canvas').forEach(el => el.disabled = true);
                      } else {
                        showClientStatus('❌ Error: ' + (data.message || 'Failed to process response'), false);
                      }
                    })
                    .catch(error => {
                      console.error('🔥 [CLIENT-BUTTON-DEBUG] Rejection network error:', error);
                      showClientStatus('❌ Network error. Please try again.', false);
                    });

                  } catch (error) {
                    console.error('🔥 [CLIENT-BUTTON-DEBUG] Rejection function error:', error);
                    showClientStatus('❌ Unexpected error occurred. Please refresh page.', false);
                  }
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