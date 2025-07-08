/**
 * DUAL SIGNATURE WORKFLOW SYSTEM
 * Complete contractor + client dual signature workflow for US-wide distribution
 * Uses owlfenc.com institutional domain exclusively
 */

import { resendEmailDifferentiated } from './resendEmailDifferentiated';
import { twilioService } from './twilioService';

export interface DualSignatureWorkflowParams {
  contractId: string;
  contractHTML: string;
  contractorData: {
    name: string;
    company: string;
    email: string;
    phone: string;
  };
  clientData: {
    name: string;
    email: string;
    phone: string;
  };
  projectDetails: {
    description: string;
    value: string;
    address: string;
  };
}

export interface SignatureWorkflowResult {
  success: boolean;
  contractorEmailId?: string;
  clientEmailId?: string;
  contractorSmsId?: string;
  clientSmsId?: string;
  message: string;
  trackingUrls: {
    contractorReview: string;
    clientReview: string;
  };
}

export class DualSignatureWorkflow {
  private readonly baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://owlfenc.com' 
    : 'http://localhost:5000';

  /**
   * Initiate complete dual signature workflow with differentiated experiences
   * Both contractor and client receive contracts for independent signing
   */
  async initiateDualSignatureWorkflow(params: DualSignatureWorkflowParams): Promise<SignatureWorkflowResult> {
    console.log('🔄 [DUAL-SIGNATURE] Initiating complete dual signature workflow...');
    console.log('📧 [DUAL-SIGNATURE] Contract ID:', params.contractId);
    console.log('👥 [DUAL-SIGNATURE] Contractor:', params.contractorData.company);
    console.log('👤 [DUAL-SIGNATURE] Client:', params.clientData.name);

    try {
      // Generate tracking URLs for independent contract review
      const contractorReviewUrl = `${this.baseUrl}/contract-review/${params.contractId}?role=contractor`;
      const clientReviewUrl = `${this.baseUrl}/contract-review/${params.contractId}?role=client`;

      // Step 1: Send CONTRACTOR-SPECIFIC contract review email
      console.log('📧 [CONTRACTOR-EMAIL] Sending contractor-specific email...');
      const contractorEmailResult = await resendEmailDifferentiated.sendContractorReviewEmail({
        to: params.contractorData.email,
        contractorName: params.contractorData.name,
        clientName: params.clientData.name,
        contractId: params.contractId,
        reviewUrl: contractorReviewUrl,
        projectDetails: params.projectDetails
      });

      // Step 2: Send CLIENT-SPECIFIC contract review email
      console.log('📧 [CLIENT-EMAIL] Sending client-specific email...');
      const clientEmailResult = await resendEmailDifferentiated.sendClientReviewEmail({
        to: params.clientData.email,
        contractorName: params.contractorData.name,
        clientName: params.clientData.name,
        contractId: params.contractId,
        reviewUrl: clientReviewUrl,
        projectDetails: params.projectDetails
      });

      // Step 3: Send SMS notifications to both parties
      console.log('📱 [CONTRACTOR-SMS] Sending SMS to contractor...');
      const contractorSmsResult = await twilioService.sendContractNotification({
        to: params.contractorData.phone,
        contractorName: params.contractorData.name,
        clientName: params.clientData.name,
        contractId: params.contractId,
        reviewUrl: contractorReviewUrl,
        projectValue: params.projectDetails.value,
        projectDescription: params.projectDetails.description
      });

      console.log('📱 [CLIENT-SMS] Sending SMS to client...');
      const clientSmsResult = await twilioService.sendContractNotification({
        to: params.clientData.phone,
        contractorName: params.contractorData.name,
        clientName: params.clientData.name,
        contractId: params.contractId,
        reviewUrl: clientReviewUrl,
        projectValue: params.projectDetails.value,
        projectDescription: params.projectDetails.description
      });

      // Verify all deliveries successful
      const allSuccessful = contractorEmailResult.success && 
                           clientEmailResult.success && 
                           contractorSmsResult.success && 
                           clientSmsResult.success;

      if (allSuccessful) {
        console.log('✅ [DUAL-SIGNATURE] Complete dual signature workflow initiated successfully');
        console.log('📊 [TRACKING] Contractor Email ID:', contractorEmailResult.emailId);
        console.log('📊 [TRACKING] Client Email ID:', clientEmailResult.emailId);
        
        return {
          success: true,
          contractorEmailId: contractorEmailResult.emailId,
          clientEmailId: clientEmailResult.emailId,
          contractorSmsId: contractorSmsResult.messageId,
          clientSmsId: clientSmsResult.messageId,
          message: `Dual signature workflow initiated - both ${params.contractorData.company} and ${params.clientData.name} will receive contracts for independent signing`,
          trackingUrls: {
            contractorReview: contractorReviewUrl,
            clientReview: clientReviewUrl
          }
        };
      } else {
        throw new Error('One or more delivery methods failed');
      }

    } catch (error) {
      console.error('❌ [DUAL-SIGNATURE] Workflow failed:', error);
      return {
        success: false,
        message: `Dual signature workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        trackingUrls: {
          contractorReview: '',
          clientReview: ''
        }
      };
    }
  }

  /**
   * Send final signed PDF to both parties after all signatures collected
   */
  async sendFinalSignedPDF(params: {
    contractId: string;
    signedPdfBuffer: Buffer;
    contractorData: { name: string; company: string; email: string; };
    clientData: { name: string; email: string; };
    projectDetails: { description: string; value: string; };
  }): Promise<{ success: boolean; message: string; }> {
    console.log('📄 [FINAL-PDF] Sending fully signed PDF to both parties...');

    try {
      // Send final PDF to contractor
      const contractorPdfResult = await resendEmailAdvanced.sendContractEmail({
        to: params.contractorData.email,
        toName: params.contractorData.name,
        contractorEmail: params.contractorData.email,
        contractorName: params.contractorData.name,
        contractorCompany: params.contractorData.company,
        subject: `✅ Fully Signed Contract - ${params.projectDetails.description}`,
        htmlContent: this.generateFinalPdfEmailHTML('contractor', params),
        attachments: [{
          filename: `signed-contract-${params.contractId}.pdf`,
          content: params.signedPdfBuffer,
          contentType: 'application/pdf'
        }]
      });

      // Send final PDF to client
      const clientPdfResult = await resendEmailAdvanced.sendContractEmail({
        to: params.clientData.email,
        toName: params.clientData.name,
        contractorEmail: params.contractorData.email,
        contractorName: params.contractorData.name,
        contractorCompany: params.contractorData.company,
        subject: `✅ Fully Signed Contract - ${params.projectDetails.description}`,
        htmlContent: this.generateFinalPdfEmailHTML('client', params),
        attachments: [{
          filename: `signed-contract-${params.contractId}.pdf`,
          content: params.signedPdfBuffer,
          contentType: 'application/pdf'
        }]
      });

      if (contractorPdfResult.success && clientPdfResult.success) {
        console.log('✅ [FINAL-PDF] Fully signed PDF delivered to both parties');
        return {
          success: true,
          message: `Fully signed contract delivered to both ${params.contractorData.company} and ${params.clientData.name}`
        };
      } else {
        throw new Error('Failed to deliver final PDF to one or both parties');
      }

    } catch (error) {
      console.error('❌ [FINAL-PDF] Failed to send final PDF:', error);
      return {
        success: false,
        message: `Failed to send final signed PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate email HTML for final signed PDF delivery
   */
  private generateFinalPdfEmailHTML(recipientType: 'contractor' | 'client', params: any): string {
    const isContractor = recipientType === 'contractor';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fully Signed Contract</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); color: white; padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">✅ Contract Fully Executed</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">All parties have signed - contract is now legally binding</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 22px;">
              ${isContractor ? 'Contract Completion Confirmation' : 'Your Signed Contract is Ready'}
            </h2>
            
            <p style="font-size: 16px; color: #555; margin: 0 0 20px 0;">
              ${isContractor 
                ? `Your contract with ${params.clientData.name} has been fully executed by both parties.`
                : `Your contract with ${params.contractorData.company} has been fully executed by both parties.`
              }
            </p>

            <!-- Project Details -->
            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 20px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 15px 0; font-size: 18px;">📋 Project Details</h3>
              <p style="margin: 8px 0; color: #555;"><strong>Project:</strong> ${params.projectDetails.description}</p>
              <p style="margin: 8px 0; color: #555;"><strong>Value:</strong> ${params.projectDetails.value}</p>
              <p style="margin: 8px 0; color: #555;"><strong>Contract ID:</strong> ${params.contractId}</p>
              <p style="margin: 8px 0; color: #555;"><strong>Status:</strong> <span style="color: #27ae60; font-weight: 600;">Fully Executed</span></p>
            </div>

            <!-- Next Steps -->
            <div style="background: #e8f5e8; border-left: 4px solid #27ae60; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h4 style="color: #27ae60; margin: 0 0 10px 0;">📈 Next Steps</h4>
              <p style="margin: 0; color: #2c3e50;">
                ${isContractor 
                  ? 'You can now begin work as outlined in the contract. The attached PDF contains all signatures and is your official record.'
                  : 'Work will begin as outlined in the contract terms. Keep the attached PDF as your official record of the agreement.'
                }
              </p>
            </div>

            <!-- Contact Information -->
            <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f1f2f6; border-radius: 12px;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                Questions about this contract? Contact 
                ${isContractor 
                  ? `${params.clientData.name} or the Owl Fence support team`
                  : `${params.contractorData.company} directly`
                }
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #2c3e50; color: white; padding: 25px 30px; text-align: center;">
            <p style="margin: 0; font-size: 14px; opacity: 0.8;">
              Powered by Owl Fence Legal System | secure.owlfenc.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const dualSignatureWorkflow = new DualSignatureWorkflow();