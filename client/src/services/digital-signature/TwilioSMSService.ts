/**
 * Twilio SMS Service for Digital Contract Signing
 * Handles SMS notifications, verification, and contract distribution
 */

export interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  webhookUrl?: string;
}

export interface SMSMessage {
  to: string;
  message: string;
  type: 'contract-notification' | 'verification' | 'reminder' | 'completion';
  contractId?: string;
  templateId?: string;
  variables?: Record<string, string>;
  scheduledAt?: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  cost?: number;
  deliveryStatus?: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
}

export interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  type: 'contract-notification' | 'verification' | 'reminder' | 'completion';
  variables: string[];
  maxLength: number;
}

export interface SMSVerification {
  phoneNumber: string;
  code: string;
  expiresAt: string;
  attempts: number;
  verified: boolean;
  createdAt: string;
}

export class TwilioSMSService {
  private static instance: TwilioSMSService;
  private config: SMSConfig | null = null;
  private isConfigured = false;
  private verificationCodes: Map<string, SMSVerification> = new Map();
  
  // SMS Templates optimized for contract signing
  private readonly SMS_TEMPLATES: Record<string, SMSTemplate> = {
    'contract-ready': {
      id: 'contract-ready',
      name: 'Contract Ready for Signing',
      content: '🏗️ {{contractorName}}: Su contrato para {{projectType}} (${{amount}}) está listo. Firme en: {{url}} - Expira: {{expiry}}',
      type: 'contract-notification',
      variables: ['contractorName', 'projectType', 'amount', 'url', 'expiry'],
      maxLength: 160
    },
    'contract-signed': {
      id: 'contract-signed',
      name: 'Contract Signed Notification',
      content: '✅ {{clientName}} ha firmado el contrato para {{projectType}}. Total: ${{amount}}. Ver detalles: {{url}}',
      type: 'completion',
      variables: ['clientName', 'projectType', 'amount', 'url'],
      maxLength: 160
    },
    'phone-verification': {
      id: 'phone-verification',
      name: 'Phone Number Verification',
      content: '🔐 Código de verificación para firma de contrato: {{code}}. Válido por 10 minutos. No comparta este código.',
      type: 'verification',
      variables: ['code'],
      maxLength: 160
    },
    'contract-reminder': {
      id: 'contract-reminder',
      name: 'Contract Signing Reminder',
      content: '⏰ Recordatorio: Su contrato para {{projectType}} expira en {{hours}} horas. Firme ahora: {{url}}',
      type: 'reminder',
      variables: ['projectType', 'hours', 'url'],
      maxLength: 160
    },
    'contract-expired': {
      id: 'contract-expired',
      name: 'Contract Expired Notification',
      content: '⚠️ Su contrato para {{projectType}} ha expirado. Contacte a {{contractorName}} para generar un nuevo enlace.',
      type: 'contract-notification',
      variables: ['projectType', 'contractorName'],
      maxLength: 160
    }
  };

  static getInstance(): TwilioSMSService {
    if (!TwilioSMSService.instance) {
      TwilioSMSService.instance = new TwilioSMSService();
    }
    return TwilioSMSService.instance;
  }

  /**
   * Initialize Twilio configuration
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if Twilio is configured on the server
      const response = await fetch('/api/sms/config-status');
      const result = await response.json();
      
      if (result.configured) {
        this.isConfigured = true;
        console.log('✅ Twilio SMS service configured successfully');
        return true;
      } else {
        console.warn('⚠️ Twilio SMS service not configured');
        return false;
      }
    } catch (error) {
      console.error('❌ Error initializing Twilio SMS service:', error);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Send contract notification SMS
   */
  async sendContractNotification(
    phoneNumber: string,
    templateId: string,
    variables: Record<string, string>,
    contractId?: string
  ): Promise<SMSResponse> {
    if (!this.isConfigured) {
      await this.initialize();
    }

    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Twilio SMS service not configured. Contact administrator to enable SMS notifications.'
      };
    }

    try {
      const template = this.SMS_TEMPLATES[templateId];
      if (!template) {
        return {
          success: false,
          error: `Template ${templateId} not found`
        };
      }

      // Generate message from template
      const message = this.generateMessageFromTemplate(template, variables);
      
      // Validate message length
      if (message.length > template.maxLength) {
        console.warn(`SMS message truncated from ${message.length} to ${template.maxLength} characters`);
      }

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      // Send SMS via backend API
      const response = await fetch('/api/sms/send-contract-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedPhone,
          message: message.substring(0, template.maxLength),
          type: template.type,
          templateId,
          contractId,
          variables
        })
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          messageId: result.messageId,
          status: result.status,
          cost: result.cost
        };
      } else {
        const error = await response.text();
        return {
          success: false,
          error: `SMS API error: ${error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `SMS sending failed: ${error}`
      };
    }
  }

  /**
   * Send phone verification code
   */
  async sendVerificationCode(phoneNumber: string): Promise<SMSResponse & { verificationId?: string }> {
    const code = this.generateVerificationCode();
    const verificationId = `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store verification code
    this.verificationCodes.set(verificationId, {
      phoneNumber: this.formatPhoneNumber(phoneNumber) || phoneNumber,
      code,
      expiresAt,
      attempts: 0,
      verified: false,
      createdAt: new Date().toISOString()
    });

    // Send SMS
    const smsResult = await this.sendContractNotification(
      phoneNumber,
      'phone-verification',
      { code }
    );

    if (smsResult.success) {
      return {
        ...smsResult,
        verificationId
      };
    } else {
      // Clean up stored verification if SMS failed
      this.verificationCodes.delete(verificationId);
      return smsResult;
    }
  }

  /**
   * Verify phone number with code
   */
  verifyPhoneNumber(verificationId: string, inputCode: string): {
    success: boolean;
    error?: string;
    verified?: boolean;
    attemptsRemaining?: number;
  } {
    const verification = this.verificationCodes.get(verificationId);
    
    if (!verification) {
      return {
        success: false,
        error: 'Verification ID not found or expired'
      };
    }

    // Check expiration
    if (new Date() > new Date(verification.expiresAt)) {
      this.verificationCodes.delete(verificationId);
      return {
        success: false,
        error: 'Verification code has expired'
      };
    }

    // Check attempts limit
    if (verification.attempts >= 3) {
      this.verificationCodes.delete(verificationId);
      return {
        success: false,
        error: 'Too many attempts. Request a new verification code.'
      };
    }

    // Increment attempts
    verification.attempts++;
    
    // Check code
    if (verification.code === inputCode.trim()) {
      verification.verified = true;
      return {
        success: true,
        verified: true
      };
    } else {
      const attemptsRemaining = 3 - verification.attempts;
      if (attemptsRemaining <= 0) {
        this.verificationCodes.delete(verificationId);
        return {
          success: false,
          error: 'Invalid code. Maximum attempts exceeded.'
        };
      }
      
      return {
        success: false,
        error: 'Invalid verification code',
        attemptsRemaining
      };
    }
  }

  /**
   * Schedule reminder SMS
   */
  async scheduleContractReminder(
    phoneNumber: string,
    contractData: {
      projectType: string;
      expiryDate: string;
      accessUrl: string;
    },
    reminderHours: number = 24
  ): Promise<SMSResponse> {
    const scheduledTime = new Date(new Date(contractData.expiryDate).getTime() - (reminderHours * 60 * 60 * 1000));
    
    // If reminder time is in the past, send immediately
    if (scheduledTime <= new Date()) {
      return this.sendContractNotification(
        phoneNumber,
        'contract-reminder',
        {
          projectType: contractData.projectType,
          hours: reminderHours.toString(),
          url: contractData.accessUrl
        }
      );
    }

    // Schedule for later (this would typically use a job queue in production)
    return {
      success: true,
      messageId: `scheduled_${Date.now()}`,
      status: 'scheduled'
    };
  }

  /**
   * Get SMS delivery status
   */
  async getDeliveryStatus(messageId: string): Promise<{
    status: string;
    delivered: boolean;
    deliveredAt?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`/api/sms/status/${messageId}`);
      
      if (response.ok) {
        const result = await response.json();
        return {
          status: result.status,
          delivered: ['delivered', 'read'].includes(result.status),
          deliveredAt: result.deliveredAt
        };
      } else {
        return {
          status: 'unknown',
          delivered: false,
          error: 'Could not retrieve delivery status'
        };
      }
    } catch (error) {
      return {
        status: 'error',
        delivered: false,
        error: `Status check failed: ${error}`
      };
    }
  }

  /**
   * Generate message from template
   */
  private generateMessageFromTemplate(template: SMSTemplate, variables: Record<string, string>): string {
    let message = template.content;
    
    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      message = message.replace(regex, value);
    }
    
    // Clean up any unreplaced variables
    message = message.replace(/{{[^}]+}}/g, '[N/A]');
    
    return message;
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phoneNumber: string): string | null {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Handle US/Canada numbers
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    } else if (digits.startsWith('+')) {
      return phoneNumber;
    }
    
    // For international numbers, attempt basic validation
    if (digits.length >= 10 && digits.length <= 15) {
      return `+${digits}`;
    }
    
    return null;
  }

  /**
   * Generate secure verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Clean up expired verification codes
   */
  cleanupExpiredVerifications(): number {
    const now = new Date();
    let removedCount = 0;

    for (const [id, verification] of this.verificationCodes.entries()) {
      if (new Date(verification.expiresAt) <= now) {
        this.verificationCodes.delete(id);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Get available SMS templates
   */
  getAvailableTemplates(): SMSTemplate[] {
    return Object.values(this.SMS_TEMPLATES);
  }

  /**
   * Get SMS service statistics
   */
  getServiceStats(): {
    isConfigured: boolean;
    templatesAvailable: number;
    activeVerifications: number;
    expiredVerifications: number;
  } {
    const now = new Date();
    const verifications = Array.from(this.verificationCodes.values());
    
    return {
      isConfigured: this.isConfigured,
      templatesAvailable: Object.keys(this.SMS_TEMPLATES).length,
      activeVerifications: verifications.filter(v => new Date(v.expiresAt) > now).length,
      expiredVerifications: verifications.filter(v => new Date(v.expiresAt) <= now).length
    };
  }

  /**
   * Test SMS configuration
   */
  async testConfiguration(testPhoneNumber: string): Promise<SMSResponse> {
    return this.sendContractNotification(
      testPhoneNumber,
      'phone-verification',
      { code: '123456' }
    );
  }
}

// Export singleton instance
export const twilioSMS = TwilioSMSService.getInstance();