/**
 * Twilio SMS Service for Contract Delivery
 * Handles SMS notifications for contract delivery and verification
 */

import Twilio from 'twilio';

export interface SMSParams {
  to: string;
  message: string;
  type?: 'contract-notification' | 'verification' | 'reminder';
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  deliveryStatus?: 'queued' | 'sent' | 'delivered' | 'failed';
}

export class TwilioService {
  private client: any = null;
  private fromNumber: string = '';
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTwilio();
  }

  private initializeTwilio(): void {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        console.log('📱 [TWILIO] Missing credentials - SMS functionality disabled');
        console.log('📱 [TWILIO] Required env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
        this.isConfigured = false;
        return;
      }

      this.client = Twilio(accountSid, authToken);
      this.fromNumber = fromNumber;
      this.isConfigured = true;

      console.log('✅ [TWILIO] Service initialized successfully');
      console.log('📱 [TWILIO] From number:', this.fromNumber);
    } catch (error) {
      console.error('❌ [TWILIO] Initialization failed:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(params: SMSParams): Promise<SMSResponse> {
    try {
      if (!this.isConfigured || !this.client) {
        console.log('📱 [TWILIO] Service not configured, skipping SMS');
        return {
          success: false,
          error: 'Twilio service not configured. SMS functionality disabled.'
        };
      }

      console.log('📱 [TWILIO] Sending SMS...');
      console.log('📱 [TWILIO] To:', params.to);
      console.log('📱 [TWILIO] From:', this.fromNumber);
      console.log('📱 [TWILIO] Type:', params.type || 'contract-notification');
      console.log('📱 [TWILIO] Message length:', params.message.length);

      // Validate phone number format
      const cleanTo = params.to.replace(/\s+/g, '');
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      
      if (!phoneRegex.test(cleanTo)) {
        return {
          success: false,
          error: 'Invalid phone number format. Use format: +1234567890'
        };
      }

      // Prevent sending SMS to same number as from number
      if (cleanTo === this.fromNumber) {
        console.log('📱 [TWILIO] Cannot send SMS to same number as from number, skipping...');
        return {
          success: true,
          messageId: 'skipped-same-number',
          status: 'skipped',
          deliveryStatus: 'skipped'
        };
      }

      // Ensure message is within SMS limits (160 characters for single SMS)
      if (params.message.length > 1600) {
        console.warn('📱 [TWILIO] Message exceeds recommended length, truncating...');
        params.message = params.message.substring(0, 1597) + '...';
      }

      const message = await this.client.messages.create({
        body: params.message,
        from: this.fromNumber,
        to: params.to.replace(/\s+/g, '') // Remove spaces
      });

      console.log('✅ [TWILIO] SMS sent successfully');
      console.log('📱 [TWILIO] Message SID:', message.sid);
      console.log('📱 [TWILIO] Status:', message.status);

      return {
        success: true,
        messageId: message.sid,
        status: message.status,
        deliveryStatus: message.status as any
      };

    } catch (error: any) {
      console.error('❌ [TWILIO] SMS send failed:', error);
      
      // Handle specific Twilio errors
      let errorMessage = 'Unknown SMS error';
      if (error.code) {
        switch (error.code) {
          case 21211:
            errorMessage = 'Invalid phone number';
            break;
          case 21408:
            errorMessage = 'Permission denied to send SMS to this number';
            break;
          case 21610:
            errorMessage = 'SMS not allowed to this destination';
            break;
          case 21614:
            errorMessage = 'Invalid sender phone number';
            break;
          default:
            errorMessage = error.message || 'Twilio API error';
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Send contract notification SMS
   */
  async sendContractNotification(params: {
    to: string;
    clientName: string;
    contractorName: string;
    contractorCompany: string;
    projectType: string;
    contractUrl?: string;
  }): Promise<SMSResponse> {
    const message = `🏗️ Contract Ready - ${params.contractorCompany}

Hi ${params.clientName}! Your ${params.projectType} contract from ${params.contractorName} is ready for review and signing.

${params.contractUrl ? `View contract: ${params.contractUrl}` : 'Please check your email for contract details.'}

Reply STOP to opt out.`;

    return this.sendSMS({
      to: params.to,
      message,
      type: 'contract-notification'
    });
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCode(params: {
    to: string;
    code: string;
    contractorName: string;
  }): Promise<SMSResponse> {
    const message = `🔐 Contract Verification - ${params.contractorName}

Your verification code: ${params.code}

This code expires in 10 minutes. Do not share this code.

Reply STOP to opt out.`;

    return this.sendSMS({
      to: params.to,
      message,
      type: 'verification'
    });
  }

  /**
   * Send contract completion SMS
   */
  async sendContractCompletion(params: {
    to: string;
    clientName: string;
    contractorName: string;
    contractorCompany: string;
    projectType: string;
  }): Promise<SMSResponse> {
    const message = `✅ Contract Signed - ${params.contractorCompany}

Hi ${params.clientName}! Your ${params.projectType} contract with ${params.contractorName} has been successfully signed by all parties.

Project can now begin as scheduled.

Reply STOP to opt out.`;

    return this.sendSMS({
      to: params.to,
      message,
      type: 'contract-notification'
    });
  }

  /**
   * Check if Twilio service is properly configured
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Get service status information
   */
  getServiceStatus(): {
    configured: boolean;
    fromNumber: string;
    hasCredentials: boolean;
  } {
    return {
      configured: this.isConfigured,
      fromNumber: this.fromNumber,
      hasCredentials: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
    };
  }
}

// Export singleton instance
export const twilioService = new TwilioService();