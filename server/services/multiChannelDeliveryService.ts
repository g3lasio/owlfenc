/**
 * Multi-Channel Secure Contract Delivery Service
 * 
 * Handles secure contract delivery through multiple channels:
 * - Professional Email (SendGrid)
 * - SMS (External app integration)
 * - WhatsApp Business (External app integration)
 * 
 * Uses external app URL schemes for SMS and WhatsApp to ensure
 * professional, secure appearance without depending on complex APIs.
 */

import { MailService } from '@sendgrid/mail';
import { DualSignatureService } from './dualSignatureService';

interface ContractData {
  contractorName: string;
  contractorEmail: string;
  contractorPhone: string;
  contractorCompany: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  projectDescription: string;
  totalAmount: number;
  startDate: string;
  completionDate: string;
}

interface DeliveryMethods {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

interface SecureDeliveryPayload {
  userId: string;
  contractHTML: string;
  deliveryMethods: DeliveryMethods;
  contractData: ContractData;
  securityFeatures: {
    encryption: string;
    verification: boolean;
    auditTrail: boolean;
    timeStamps: boolean;
  };
}

interface DeliveryResult {
  success: boolean;
  contractId: string;
  contractorSignUrl: string;
  clientSignUrl: string;
  deliveryResults: {
    email?: { sent: boolean; messageId?: string; error?: string };
    sms?: { sent: boolean; url?: string; error?: string };
    whatsapp?: { sent: boolean; url?: string; error?: string };
  };
}

class MultiChannelDeliveryService {
  private mailService: MailService;
  private dualSignatureService: DualSignatureService;

  constructor() {
    // Initialize SendGrid service
    this.mailService = new MailService();
    if (process.env.SENDGRID_API_KEY) {
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
    }
    
    // Initialize DualSignatureService for contract storage
    this.dualSignatureService = new DualSignatureService();
  }



  /**
   * Send professional email with contract
   */
  private async sendSecureEmail(
    contractData: ContractData, 
    contractHTML: string, 
    signUrl: string,
    isContractor: boolean = false
  ): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SendGrid API key not configured');
      }

      const recipient = isContractor ? contractData.contractorEmail : contractData.clientEmail;
      const recipientName = isContractor ? contractData.contractorName : contractData.clientName;
      const role = isContractor ? 'Contractor' : 'Client';

      const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Contract - ${contractData.contractorCompany}</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1e40af, #06b6d4); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .security-badge { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; margin: 10px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .security-features { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .feature { display: flex; align-items: center; margin: 8px 0; }
        .feature-icon { width: 16px; height: 16px; margin-right: 8px; }
        .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
      </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🔐 Secure Contract Delivery</h1>
            <div class="security-badge">Bank-Level Security • 256-bit SSL</div>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Professional Contract Management System</p>
        </div>
        
        <div class="content">
            <h2 style="color: #1f2937; margin-top: 0;">Hello ${recipientName},</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
                You have received a secure contract from <strong>${contractData.contractorCompany}</strong> 
                for the ${contractData.projectDescription} project.
            </p>
            
            <div style="background: #eff6ff; border: 1px solid #93c5fd; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin: 0 0 10px 0;">Contract Details</h3>
                <p style="margin: 5px 0; color: #374151;"><strong>Project:</strong> ${contractData.projectDescription}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Total Amount:</strong> $${contractData.totalAmount.toLocaleString()}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Start Date:</strong> ${contractData.startDate}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Your Role:</strong> ${role}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${signUrl}" class="button" style="color: white;">
                    🔐 View & Sign Secure Contract
                </a>
            </div>
            
            <div class="security-features">
                <h4 style="color: #1f2937; margin: 0 0 15px 0;">🛡️ Security Features</h4>
                <div class="feature">
                    <span style="color: #10b981;">🔒</span>
                    <span style="color: #374151; margin-left: 8px;">256-bit SSL encryption</span>
                </div>
                <div class="feature">
                    <span style="color: #3b82f6;">🔍</span>
                    <span style="color: #374151; margin-left: 8px;">Device verification required</span>
                </div>
                <div class="feature">
                    <span style="color: #8b5cf6;">📋</span>
                    <span style="color: #374151; margin-left: 8px;">Complete audit trail</span>
                </div>
                <div class="feature">
                    <span style="color: #f59e0b;">⏰</span>
                    <span style="color: #374151; margin-left: 8px;">Timestamp verification</span>
                </div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This contract link is secure and expires in 72 hours. If you have any questions, 
                please contact ${contractData.contractorCompany} directly.
            </p>
        </div>
        
        <div class="footer">
            <p style="margin: 0;">Powered by Owl Fence Professional Contract System</p>
            <p style="margin: 5px 0 0 0;">Secure • Professional • Reliable</p>
        </div>
    </div>
</body>
</html>`;

      const msg = {
        to: recipient,
        from: {
          email: 'legal@owlfenc.com',
          name: `${contractData.contractorCompany} - Secure Contracts`
        },
        subject: `🔐 Secure Contract - ${contractData.projectDescription} ($${contractData.totalAmount.toLocaleString()})`,
        html: emailContent,
      };

      const [response] = await this.mailService.send(msg);
      
      return {
        sent: true,
        messageId: response.headers['x-message-id'] || 'unknown'
      };

    } catch (error) {
      console.error('Email delivery error:', error);
      return {
        sent: false,
        error: error.message || 'Email delivery failed'
      };
    }
  }

  /**
   * Generate SMS URL for external app
   */
  private generateSMSUrl(contractData: ContractData, signUrl: string, isContractor: boolean = false): string {
    const recipient = isContractor ? contractData.contractorPhone : contractData.clientPhone;
    const recipientName = isContractor ? contractData.contractorName : contractData.clientName;
    
    const message = encodeURIComponent(
      `🔐 SECURE CONTRACT from ${contractData.contractorCompany}\n\n` +
      `Hi ${recipientName},\n\n` +
      `You have a secure contract to review and sign:\n` +
      `Project: ${contractData.projectDescription}\n` +
      `Amount: $${contractData.totalAmount.toLocaleString()}\n\n` +
      `🔗 Secure Link: ${signUrl}\n\n` +
      `⏰ Expires in 72 hours\n` +
      `🛡️ Bank-level security with 256-bit SSL encryption\n\n` +
      `This is a secure professional contract system.`
    );
    
    return `sms:${recipient}?body=${message}`;
  }

  /**
   * Generate WhatsApp URL for external app
   */
  private generateWhatsAppUrl(contractData: ContractData, signUrl: string, isContractor: boolean = false): string {
    const recipient = isContractor ? contractData.contractorPhone : contractData.clientPhone;
    const recipientName = isContractor ? contractData.contractorName : contractData.clientName;
    
    // Clean phone number for WhatsApp (remove spaces, dashes, etc.)
    const cleanPhone = recipient.replace(/[^\d]/g, '');
    
    const message = encodeURIComponent(
      `🔐 *SECURE CONTRACT* from ${contractData.contractorCompany}\n\n` +
      `Hello ${recipientName},\n\n` +
      `You have received a secure contract to review and sign:\n\n` +
      `📋 *Project:* ${contractData.projectDescription}\n` +
      `💰 *Amount:* $${contractData.totalAmount.toLocaleString()}\n` +
      `📅 *Start Date:* ${contractData.startDate}\n\n` +
      `🔗 *Secure Contract Link:*\n${signUrl}\n\n` +
      `🛡️ *Security Features:*\n` +
      `• 256-bit SSL encryption\n` +
      `• Device verification\n` +
      `• Complete audit trail\n` +
      `• Timestamp verification\n\n` +
      `⏰ This secure link expires in 72 hours.\n\n` +
      `If you have questions, please contact ${contractData.contractorCompany} directly.\n\n` +
      `_Professional Contract Management System by Owl Fence_`
    );
    
    return `https://wa.me/${cleanPhone}?text=${message}`;
  }

  /**
   * Initiate multi-channel secure delivery
   */
  async initiateSecureDelivery(payload: SecureDeliveryPayload): Promise<DeliveryResult> {
    try {
      console.log('🔐 [MULTI-CHANNEL] Starting secure delivery with contract storage...');
      
      // Use DualSignatureService to save contract to database
      const dualSignatureRequest = {
        userId: payload.userId,
        contractHTML: payload.contractHTML,
        contractData: payload.contractData
      };
      
      console.log('💾 [MULTI-CHANNEL] Saving contract to database...');
      const signatureResult = await this.dualSignatureService.initiateDualSignature(dualSignatureRequest);
      
      if (!signatureResult.success) {
        throw new Error(`Failed to save contract: ${signatureResult.message}`);
      }
      
      const contractId = signatureResult.contractId!;
      const contractorSignUrl = signatureResult.contractorSignUrl!;
      const clientSignUrl = signatureResult.clientSignUrl!;
      
      console.log('✅ [MULTI-CHANNEL] Contract saved successfully:', contractId);
      console.log('🔗 [MULTI-CHANNEL] Contractor URL:', contractorSignUrl);
      console.log('🔗 [MULTI-CHANNEL] Client URL:', clientSignUrl);
      
      const deliveryResults: DeliveryResult['deliveryResults'] = {};
      
      // Email Delivery
      if (payload.deliveryMethods.email) {
        console.log('🔐 [MULTI-CHANNEL] Sending secure emails...');
        
        // Send to contractor
        const contractorEmail = await this.sendSecureEmail(
          payload.contractData, 
          payload.contractHTML, 
          contractorSignUrl, 
          true
        );
        
        // Send to client
        const clientEmail = await this.sendSecureEmail(
          payload.contractData, 
          payload.contractHTML, 
          clientSignUrl, 
          false
        );
        
        deliveryResults.email = {
          sent: contractorEmail.sent && clientEmail.sent,
          messageId: contractorEmail.messageId || clientEmail.messageId,
          error: contractorEmail.error || clientEmail.error
        };
        
        console.log('📧 [MULTI-CHANNEL] Email delivery:', deliveryResults.email);
      }
      
      // SMS Delivery (External App)
      if (payload.deliveryMethods.sms) {
        console.log('📱 [MULTI-CHANNEL] Generating SMS URLs...');
        
        const contractorSMSUrl = this.generateSMSUrl(payload.contractData, contractorSignUrl, true);
        const clientSMSUrl = this.generateSMSUrl(payload.contractData, clientSignUrl, false);
        
        deliveryResults.sms = {
          sent: true, // URL generation always succeeds
          url: clientSMSUrl // Primary URL for client
        };
        
        console.log('📱 [MULTI-CHANNEL] SMS URLs generated successfully');
      }
      
      // WhatsApp Delivery (External App)
      if (payload.deliveryMethods.whatsapp) {
        console.log('💬 [MULTI-CHANNEL] Generating WhatsApp URLs...');
        
        const contractorWhatsAppUrl = this.generateWhatsAppUrl(payload.contractData, contractorSignUrl, true);
        const clientWhatsAppUrl = this.generateWhatsAppUrl(payload.contractData, clientSignUrl, false);
        
        deliveryResults.whatsapp = {
          sent: true, // URL generation always succeeds
          url: clientWhatsAppUrl // Primary URL for client
        };
        
        console.log('💬 [MULTI-CHANNEL] WhatsApp URLs generated successfully');
      }
      
      // Log delivery summary
      const successfulChannels = Object.entries(deliveryResults)
        .filter(([_, result]) => result.sent)
        .map(([channel, _]) => channel);
      
      console.log(`🔐 [MULTI-CHANNEL] Delivery completed via: ${successfulChannels.join(', ')}`);
      
      return {
        success: true,
        contractId,
        contractorSignUrl,
        clientSignUrl,
        deliveryResults
      };
      
    } catch (error) {
      console.error('❌ [MULTI-CHANNEL] Delivery error:', error);
      throw error;
    }
  }
}

export default new MultiChannelDeliveryService();