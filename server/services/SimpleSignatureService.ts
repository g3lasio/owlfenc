/**
 * Simple Digital Signature Service
 * 
 * Replaces the complex Neural Signature system with a streamlined workflow:
 * 1. One-click contract sending to both parties via email/SMS
 * 2. Mobile-friendly review and signature pages
 * 3. Automatic PDF generation with dates when both parties sign
 * 4. Automatic delivery of signed PDF to both parties
 */

import { db } from '../db';
import { digitalContracts, type DigitalContract, type InsertDigitalContract } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { resendService } from './resendService';

export class SimpleSignatureService {
  
  /**
   * Initiate simple signature workflow - replaces Neural Signature
   */
  async initiateSignatureWorkflow(contractData: {
    userId: number;
    contractId: string;
    contractorData: {
      name: string;
      email: string;
      phone?: string;
      company?: string;
    };
    clientData: {
      name: string;
      email: string;
      phone?: string;
      address?: string;
    };
    contractData: {
      projectDescription: string;
      totalAmount: number;
      startDate?: string;
      completionDate?: string;
      contractHtml: string;
    };
  }) {
    console.log('🚀 [SIMPLE-SIGNATURE] Initiating simple signature workflow...');
    
    try {
      // 1. Store contract in database
      const contractRecord: InsertDigitalContract = {
        userId: contractData.userId,
        contractId: contractData.contractId,
        contractorName: contractData.contractorData.name,
        contractorEmail: contractData.contractorData.email,
        contractorPhone: contractData.contractorData.phone || null,
        contractorCompany: contractData.contractorData.company || null,
        clientName: contractData.clientData.name,
        clientEmail: contractData.clientData.email,
        clientPhone: contractData.clientData.phone || null,
        clientAddress: contractData.clientData.address || null,
        projectDescription: contractData.contractData.projectDescription,
        totalAmount: contractData.contractData.totalAmount.toString(),
        startDate: contractData.contractData.startDate ? new Date(contractData.contractData.startDate) : null,
        completionDate: contractData.contractData.completionDate ? new Date(contractData.contractData.completionDate) : null,
        contractHtml: contractData.contractData.contractHtml,
        status: 'pending',
        emailSent: false,
      };

      const [savedContract] = await db.insert(digitalContracts).values(contractRecord).returning();
      console.log('✅ [SIMPLE-SIGNATURE] Contract saved:', savedContract.id);

      // 2. Send emails to both parties with simple signature links
      const contractorSignUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/sign/${contractData.contractId}?party=contractor`;
      const clientSignUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/sign/${contractData.contractId}?party=client`;

      // Send email to contractor
      await this.sendSimpleSignatureEmail({
        recipientEmail: contractData.contractorData.email,
        recipientName: contractData.contractorData.name,
        recipientType: 'contractor',
        contractId: contractData.contractId,
        signatureUrl: contractorSignUrl,
        projectDescription: contractData.contractData.projectDescription,
        totalAmount: contractData.contractData.totalAmount,
        clientName: contractData.clientData.name,
      });

      // Send email to client
      await this.sendSimpleSignatureEmail({
        recipientEmail: contractData.clientData.email,
        recipientName: contractData.clientData.name,
        recipientType: 'client',
        contractId: contractData.contractId,
        signatureUrl: clientSignUrl,
        projectDescription: contractData.contractData.projectDescription,
        totalAmount: contractData.contractData.totalAmount,
        contractorName: contractData.contractorData.name,
        contractorCompany: contractData.contractorData.company,
      });

      // 3. Update email sent status
      await db.update(digitalContracts)
        .set({ 
          emailSent: true, 
          emailSentAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(digitalContracts.contractId, contractData.contractId));

      console.log('✅ [SIMPLE-SIGNATURE] Emails sent to both parties');
      
      return {
        success: true,
        contractId: contractData.contractId,
        message: 'Contract sent to both parties for signature',
        contractorSignUrl,
        clientSignUrl
      };

    } catch (error) {
      console.error('❌ [SIMPLE-SIGNATURE] Error initiating workflow:', error);
      throw error;
    }
  }

  /**
   * Send simple signature email - no complex analysis, just direct signing link
   */
  private async sendSimpleSignatureEmail(params: {
    recipientEmail: string;
    recipientName: string;
    recipientType: 'contractor' | 'client';
    contractId: string;
    signatureUrl: string;
    projectDescription: string;
    totalAmount: number;
    clientName?: string;
    contractorName?: string;
    contractorCompany?: string;
  }) {
    const isContractor = params.recipientType === 'contractor';
    const otherParty = isContractor ? params.clientName : `${params.contractorName}${params.contractorCompany ? ` (${params.contractorCompany})` : ''}`;

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contract Ready for Signature</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .project-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
        .amount { font-size: 24px; font-weight: bold; color: #667eea; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        @media (max-width: 600px) { .container { padding: 10px; } .header, .content { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📄 Contract Ready for Your Signature</h1>
          <p>Simple • Fast • Secure</p>
        </div>
        
        <div class="content">
          <h2>Hello ${params.recipientName}!</h2>
          
          <p>Your contract is ready for signature. Simply click the button below to review and sign on any device.</p>
          
          <div class="project-details">
            <h3>📋 Project Details</h3>
            <p><strong>Project:</strong> ${params.projectDescription}</p>
            <p><strong>${isContractor ? 'Client' : 'Contractor'}:</strong> ${otherParty}</p>
            <p><strong>Total Amount:</strong> <span class="amount">$${params.totalAmount.toLocaleString()}</span></p>
          </div>

          <center>
            <a href="${params.signatureUrl}" class="button">
              📱 Review & Sign Contract
            </a>
          </center>

          <h3>✅ Simple Process:</h3>
          <ol>
            <li><strong>Review</strong> the contract terms on your phone or computer</li>
            <li><strong>Sign</strong> with your finger (drawing) or type your name</li>
            <li><strong>Done!</strong> Both parties receive the signed PDF automatically</li>
          </ol>

          <p><strong>Mobile Friendly:</strong> Works perfectly on iPhone, Android, tablets, and computers.</p>
          <p><strong>No Apps Required:</strong> Sign directly in your web browser - no downloads needed.</p>
          
          <div class="footer">
            <p>Contract ID: ${params.contractId}</p>
            <p>This email was sent securely from Owl Fence AI Platform</p>
            <p>Need help? Contact support for assistance.</p>
          </div>
        </div>
      </div>
    </body>
    </html>`;

    try {
      await resendService.sendEmail({
        to: params.recipientEmail,
        subject: `🖊️ Contract Ready for Signature - ${params.projectDescription}`,
        html: emailHtml,
      });

      console.log(`✅ [SIMPLE-SIGNATURE] Email sent to ${params.recipientType}: ${params.recipientEmail}`);
      
    } catch (error) {
      console.error(`❌ [SIMPLE-SIGNATURE] Failed to send email to ${params.recipientType}:`, error);
      throw error;
    }
  }

  /**
   * Get contract data for signature page
   */
  async getContractForSigning(contractId: string): Promise<DigitalContract | null> {
    try {
      const [contract] = await db.select()
        .from(digitalContracts)
        .where(eq(digitalContracts.contractId, contractId));

      return contract || null;
    } catch (error) {
      console.error('❌ [SIMPLE-SIGNATURE] Error getting contract:', error);
      return null;
    }
  }

  /**
   * Save signature from mobile-friendly signing page
   */
  async saveSignature(params: {
    contractId: string;
    party: 'contractor' | 'client';
    signatureData: string;
    signatureType: 'drawing' | 'cursive';
    signerName: string;
  }) {
    try {
      console.log(`🖊️ [SIMPLE-SIGNATURE] Saving ${params.party} signature for contract ${params.contractId}`);
      
      const updateData: any = {
        updatedAt: new Date()
      };

      if (params.party === 'contractor') {
        updateData.contractorSigned = true;
        updateData.contractorSignedAt = new Date();
        updateData.contractorSignatureData = params.signatureData;
        updateData.contractorSignatureType = params.signatureType;
      } else {
        updateData.clientSigned = true;
        updateData.clientSignedAt = new Date();
        updateData.clientSignatureData = params.signatureData;
        updateData.clientSignatureType = params.signatureType;
      }

      await db.update(digitalContracts)
        .set(updateData)
        .where(eq(digitalContracts.contractId, params.contractId));

      // Check if both parties have signed
      const [contract] = await db.select()
        .from(digitalContracts)
        .where(eq(digitalContracts.contractId, params.contractId));

      if (contract && contract.contractorSigned && contract.clientSigned) {
        // Both parties signed - update status and generate final PDF
        await this.completeBothPartiesSigned(contract);
      } else if (contract) {
        // Update status to show one party signed
        const newStatus = params.party === 'contractor' ? 'contractor_signed' : 'client_signed';
        await db.update(digitalContracts)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(digitalContracts.contractId, params.contractId));
      }

      console.log(`✅ [SIMPLE-SIGNATURE] ${params.party} signature saved successfully`);
      
      return {
        success: true,
        message: `Signature saved successfully`,
        bothPartiesSigned: contract?.contractorSigned && contract?.clientSigned
      };

    } catch (error) {
      console.error('❌ [SIMPLE-SIGNATURE] Error saving signature:', error);
      throw error;
    }
  }

  /**
   * Complete workflow when both parties have signed
   */
  private async completeBothPartiesSigned(contract: DigitalContract) {
    try {
      console.log('🎉 [SIMPLE-SIGNATURE] Both parties signed! Completing workflow...');
      
      // Update status to both_signed
      await db.update(digitalContracts)
        .set({ 
          status: 'both_signed',
          updatedAt: new Date()
        })
        .where(eq(digitalContracts.contractId, contract.contractId));

      // Generate final PDF with signatures and dates
      const signedPdfPath = await this.generateSignedPDF(contract);
      
      // Update with signed PDF path
      await db.update(digitalContracts)
        .set({ 
          status: 'completed',
          signedPdfPath,
          updatedAt: new Date()
        })
        .where(eq(digitalContracts.contractId, contract.contractId));

      // Send final signed PDF to both parties
      await this.sendCompletionEmails(contract, signedPdfPath);

      console.log('✅ [SIMPLE-SIGNATURE] Workflow completed successfully');

    } catch (error) {
      console.error('❌ [SIMPLE-SIGNATURE] Error completing workflow:', error);
      throw error;
    }
  }

  /**
   * Generate final PDF with signatures and automatic dates
   */
  private async generateSignedPDF(contract: DigitalContract): Promise<string> {
    try {
      // Import PDF service
      const { PremiumPdfService } = await import('./PremiumPdfService');
      const pdfService = new PremiumPdfService();

      // Generate signed PDF with embedded signatures and dates
      const signedHtml = this.addSignaturesToContractHtml(contract);
      const pdfBuffer = await pdfService.generatePDF(signedHtml);
      
      // Save PDF to file system (in production, use cloud storage)
      const fs = await import('fs');
      const path = await import('path');
      
      const pdfPath = path.join(process.cwd(), 'temp', `signed_contract_${contract.contractId}.pdf`);
      
      // Ensure temp directory exists
      const tempDir = path.dirname(pdfPath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      fs.writeFileSync(pdfPath, pdfBuffer);
      
      console.log('✅ [SIMPLE-SIGNATURE] Signed PDF generated:', pdfPath);
      return pdfPath;

    } catch (error) {
      console.error('❌ [SIMPLE-SIGNATURE] Error generating signed PDF:', error);
      throw error;
    }
  }

  /**
   * Add signatures and dates to contract HTML
   */
  private addSignaturesToContractHtml(contract: DigitalContract): string {
    let signedHtml = contract.contractHtml;

    // Add contractor signature section
    const contractorSignDate = contract.contractorSignedAt ? 
      new Date(contract.contractorSignedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : '';

    // Add client signature section  
    const clientSignDate = contract.clientSignedAt ?
      new Date(contract.clientSignedAt).toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'long',
        day: 'numeric'
      }) : '';

    // Insert signature sections at the end of the contract
    const signatureSection = `
      <div style="margin-top: 40px; page-break-inside: avoid;">
        <h3>SIGNATURES</h3>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="width: 50%; padding: 20px; vertical-align: top;">
              <p><strong>CONTRACTOR:</strong></p>
              <div style="border-bottom: 1px solid #000; margin: 20px 0; height: 60px; display: flex; align-items: center;">
                ${contract.contractorSignatureType === 'drawing' ? 
                  `<img src="${contract.contractorSignatureData}" style="max-height: 50px; max-width: 200px;" alt="Contractor Signature" />` :
                  `<span style="font-family: 'Dancing Script', cursive; font-size: 24px;">${contract.contractorSignatureData}</span>`
                }
              </div>
              <p>Name: ${contract.contractorName}</p>
              <p>Date: ${contractorSignDate}</p>
              ${contract.contractorCompany ? `<p>Company: ${contract.contractorCompany}</p>` : ''}
            </td>
            
            <td style="width: 50%; padding: 20px; vertical-align: top;">
              <p><strong>CLIENT:</strong></p>
              <div style="border-bottom: 1px solid #000; margin: 20px 0; height: 60px; display: flex; align-items: center;">
                ${contract.clientSignatureType === 'drawing' ? 
                  `<img src="${contract.clientSignatureData}" style="max-height: 50px; max-width: 200px;" alt="Client Signature" />` :
                  `<span style="font-family: 'Dancing Script', cursive; font-size: 24px;">${contract.clientSignatureData}</span>`
                }
              </div>
              <p>Name: ${contract.clientName}</p>
              <p>Date: ${clientSignDate}</p>
            </td>
          </tr>
        </table>
      </div>
    `;

    // Insert signature section before closing body tag
    signedHtml = signedHtml.replace('</body>', signatureSection + '</body>');

    return signedHtml;
  }

  /**
   * Send completion emails with signed PDF to both parties
   */
  private async sendCompletionEmails(contract: DigitalContract, pdfPath: string) {
    try {
      const fs = await import('fs');
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfBase64 = pdfBuffer.toString('base64');

      const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Contract Completed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Contract Successfully Signed!</h1>
            <p>Both parties have completed the signing process</p>
          </div>
          
          <div class="content">
            <div class="success">
              <strong>✅ Contract Completed</strong><br>
              All parties have signed the contract. The signed PDF is attached to this email.
            </div>

            <h3>📋 Contract Summary:</h3>
            <ul>
              <li><strong>Project:</strong> ${contract.projectDescription}</li>
              <li><strong>Contractor:</strong> ${contract.contractorName}${contract.contractorCompany ? ` (${contract.contractorCompany})` : ''}</li>
              <li><strong>Client:</strong> ${contract.clientName}</li>
              <li><strong>Amount:</strong> $${Number(contract.totalAmount).toLocaleString()}</li>
              <li><strong>Contract ID:</strong> ${contract.contractId}</li>
            </ul>

            <p><strong>Next Steps:</strong> Keep this signed contract for your records. The project can now proceed according to the agreed terms.</p>
            
            <p><em>Thank you for using Owl Fence AI Platform for your contract signing needs!</em></p>
          </div>
        </div>
      </body>
      </html>`;

      // Send to contractor
      await resendService.sendEmail({
        to: contract.contractorEmail,
        subject: `✅ Contract Completed - ${contract.projectDescription}`,
        html: emailHtml,
        attachments: [{
          filename: `signed_contract_${contract.contractId}.pdf`,
          content: pdfBase64,
        }]
      });

      // Send to client
      await resendService.sendEmail({
        to: contract.clientEmail,
        subject: `✅ Contract Completed - ${contract.projectDescription}`,
        html: emailHtml,
        attachments: [{
          filename: `signed_contract_${contract.contractId}.pdf`,
          content: pdfBase64,
        }]
      });

      console.log('✅ [SIMPLE-SIGNATURE] Completion emails sent to both parties');

    } catch (error) {
      console.error('❌ [SIMPLE-SIGNATURE] Error sending completion emails:', error);
      throw error;
    }
  }
}

export const simpleSignatureService = new SimpleSignatureService();