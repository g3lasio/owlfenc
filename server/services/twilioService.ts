/**
 * TWILIO SMS SERVICE FOR SECURE CONTRACT LINKS
 * Enhanced SMS delivery for contract signature workflow
 */

import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export const twilioService = {
  /**
   * Send secure contract link via SMS
   */
  async sendSecureContractSMS(params: {
    to: string;
    recipientName: string;
    secureLink: string;
    role: 'contractor' | 'client';
  }) {
    if (!client || !fromNumber) {
      console.error('❌ [TWILIO] Service not configured');
      return {
        success: false,
        message: 'SMS service not configured'
      };
    }
    
    try {
      const message = `Hi ${params.recipientName},\n\n` +
        `Your contract is ready for signature.\n\n` +
        `🔐 Secure Link (expires in 72 hours):\n${params.secureLink}\n\n` +
        `This is a single-use link for your security.\n\n` +
        `- Owl Fenc Contract Management`;
      
      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to: params.to
      });
      
      console.log(`✅ [TWILIO] SMS sent to ${params.to}: ${result.sid}`);
      
      return {
        success: true,
        messageId: result.sid,
        status: result.status
      };
      
    } catch (error) {
      console.error('❌ [TWILIO] Failed to send SMS:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send SMS'
      };
    }
  },
  
  /**
   * Send contract completion notification
   */
  async sendContractCompletionSMS(params: {
    to: string;
    recipientName: string;
    contractId: string;
  }) {
    if (!client || !fromNumber) {
      console.error('❌ [TWILIO] Service not configured');
      return {
        success: false,
        message: 'SMS service not configured'
      };
    }
    
    try {
      const message = `Hi ${params.recipientName},\n\n` +
        `✅ Contract ${params.contractId} has been fully signed!\n\n` +
        `You'll receive the signed PDF via email shortly.\n\n` +
        `Thank you for using Owl Fenc Contract Management.`;
      
      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to: params.to
      });
      
      console.log(`✅ [TWILIO] Completion SMS sent to ${params.to}: ${result.sid}`);
      
      return {
        success: true,
        messageId: result.sid,
        status: result.status
      };
      
    } catch (error) {
      console.error('❌ [TWILIO] Failed to send completion SMS:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send SMS'
      };
    }
  }
};