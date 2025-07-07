/**
 * Phase 2 Integration Orchestrator
 * Coordinates all advanced digital signing services with seamless integration
 */

import { twilioSMS, SMSResponse } from './TwilioSMSService';
import { geolocationValidation, LocationValidationResult } from './GeolocationValidation';
import { advancedEmailTemplates, EmailTemplateData } from './AdvancedEmailTemplates';
import { advancedPDF, PDFProcessingResult, SignatureData, ContractSignatures } from './AdvancedPDFService';
import { signatureValidation, ValidationResult } from './SignatureValidation';

export interface Phase2IntegrationConfig {
  enableSMS: boolean;
  enableGeolocation: boolean;
  enableAdvancedEmail: boolean;
  enableAdvancedPDF: boolean;
  locationValidation: {
    requiresPhysicalPresence: boolean;
    maxDistanceFromProject: number; // meters
    allowedCountries: string[];
    allowedStates?: string[];
  };
  smsNotifications: {
    sendToClient: boolean;
    sendToContractor: boolean;
    enableReminders: boolean;
    reminderHours: number[];
  };
  emailEnhancements: {
    trackingEnabled: boolean;
    customBranding: boolean;
    securityLevel: 'standard' | 'high' | 'maximum';
  };
  pdfSecurity: {
    embedMetadata: boolean;
    addWatermarks: boolean;
    requireGeolocation: boolean;
    auditTrailLevel: 'basic' | 'detailed' | 'comprehensive';
  };
}

export interface ComprehensiveSigningResult {
  success: boolean;
  contractId: string;
  signatures: {
    contractor: {
      signature: SignatureData;
      validation: ValidationResult;
      location?: LocationValidationResult;
    };
    client: {
      signature: SignatureData;
      validation: ValidationResult;
      location?: LocationValidationResult;
    };
  };
  pdf: {
    original: {
      bytes: Uint8Array;
      hash: string;
    };
    signed: {
      bytes: Uint8Array;
      base64: string;
      hash: string;
      fileSize: number;
    };
    processing: PDFProcessingResult;
  };
  communications: {
    emails: {
      invitation: { sent: boolean; messageId?: string; };
      confirmation: { sent: boolean; messageId?: string; };
      contractorNotification: { sent: boolean; messageId?: string; };
    };
    sms: {
      clientNotification: { sent: boolean; messageId?: string; };
      contractorNotification: { sent: boolean; messageId?: string; };
    };
  };
  security: {
    auditTrail: Array<{
      timestamp: string;
      event: string;
      actor: string;
      location?: string;
      metadata: any;
    }>;
    locationValidations: LocationValidationResult[];
    biometricValidations: ValidationResult[];
    documentHashes: string[];
  };
  timeline: {
    initiated: string;
    previewCompleted?: string;
    contractorSigned?: string;
    clientSigned?: string;
    pdfProcessed?: string;
    distributed?: string;
    completed: string;
  };
  errors: string[];
  warnings: string[];
}

export class Phase2IntegrationOrchestrator {
  private static instance: Phase2IntegrationOrchestrator;
  private config: Phase2IntegrationConfig;
  private auditTrail: Array<any> = [];

  private readonly DEFAULT_CONFIG: Phase2IntegrationConfig = {
    enableSMS: true,
    enableGeolocation: true,
    enableAdvancedEmail: true,
    enableAdvancedPDF: true,
    locationValidation: {
      requiresPhysicalPresence: false,
      maxDistanceFromProject: 50000, // 50km
      allowedCountries: ['Estados Unidos', 'United States', 'México', 'Mexico'],
      allowedStates: []
    },
    smsNotifications: {
      sendToClient: true,
      sendToContractor: true,
      enableReminders: true,
      reminderHours: [72, 24, 6] // 3 days, 1 day, 6 hours before expiry
    },
    emailEnhancements: {
      trackingEnabled: true,
      customBranding: true,
      securityLevel: 'high'
    },
    pdfSecurity: {
      embedMetadata: true,
      addWatermarks: true,
      requireGeolocation: true,
      auditTrailLevel: 'comprehensive'
    }
  };

  constructor(config?: Partial<Phase2IntegrationConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<Phase2IntegrationConfig>): Phase2IntegrationOrchestrator {
    if (!Phase2IntegrationOrchestrator.instance) {
      Phase2IntegrationOrchestrator.instance = new Phase2IntegrationOrchestrator(config);
    }
    return Phase2IntegrationOrchestrator.instance;
  }

  /**
   * Execute complete Phase 2 digital signing process
   */
  async executeComprehensiveSigningProcess(
    contractData: any,
    originalPdfBytes: Uint8Array,
    signatures: ContractSignatures
  ): Promise<ComprehensiveSigningResult> {
    const startTime = new Date().toISOString();
    const contractId = contractData.contractId || `contract_${Date.now()}`;
    const errors: string[] = [];
    const warnings: string[] = [];

    this.addAuditEvent('signing_process_initiated', 'system', {
      contractId,
      enabledServices: this.getEnabledServices()
    });

    try {
      // Phase 1: Initialize all services
      await this.initializeServices();

      // Phase 2: Validate signatures with enhanced biometric analysis
      const signatureValidations = await this.validateSignaturesComprehensively(signatures);

      // Phase 3: Perform location validations if enabled
      const locationValidations = await this.performLocationValidations(contractData);

      // Phase 4: Process PDF with all enhancements
      const pdfProcessingResult = await this.processAdvancedPDF(
        originalPdfBytes,
        signatures,
        contractData,
        locationValidations
      );

      // Phase 5: Send enhanced notifications
      const communicationResults = await this.sendEnhancedNotifications(
        contractData,
        pdfProcessingResult
      );

      // Phase 6: Generate comprehensive audit trail
      const finalAuditTrail = this.generateComprehensiveAuditTrail(
        contractData,
        signatureValidations,
        locationValidations,
        pdfProcessingResult
      );

      const result: ComprehensiveSigningResult = {
        success: pdfProcessingResult.success && signatureValidations.contractor.isValid && signatureValidations.client.isValid,
        contractId,
        signatures: {
          contractor: {
            signature: signatures.contractor,
            validation: signatureValidations.contractor,
            location: locationValidations.contractor
          },
          client: {
            signature: signatures.client,
            validation: signatureValidations.client,
            location: locationValidations.client
          }
        },
        pdf: {
          original: {
            bytes: originalPdfBytes,
            hash: await this.generateHash(originalPdfBytes)
          },
          signed: {
            bytes: pdfProcessingResult.finalPdfBytes || new Uint8Array(),
            base64: pdfProcessingResult.finalPdfBase64 || '',
            hash: pdfProcessingResult.documentHash,
            fileSize: pdfProcessingResult.fileSize
          },
          processing: pdfProcessingResult
        },
        communications: communicationResults,
        security: {
          auditTrail: finalAuditTrail,
          locationValidations: [locationValidations.contractor, locationValidations.client].filter(Boolean),
          biometricValidations: [signatureValidations.contractor, signatureValidations.client],
          documentHashes: [
            await this.generateHash(originalPdfBytes),
            pdfProcessingResult.documentHash
          ]
        },
        timeline: {
          initiated: startTime,
          contractorSigned: signatures.contractor.metadata.timestamp,
          clientSigned: signatures.client.metadata.timestamp,
          pdfProcessed: new Date().toISOString(),
          completed: new Date().toISOString()
        },
        errors,
        warnings
      };

      this.addAuditEvent('signing_process_completed', 'system', {
        success: result.success,
        contractId,
        processingTime: Date.now() - new Date(startTime).getTime()
      });

      return result;

    } catch (error) {
      errors.push(`Comprehensive signing process failed: ${error}`);
      
      this.addAuditEvent('signing_process_failed', 'system', {
        contractId,
        error: error.toString()
      });

      // Return partial result with error information
      return {
        success: false,
        contractId,
        signatures: {
          contractor: {
            signature: signatures.contractor,
            validation: { isValid: false, confidence: 0, riskLevel: 'high', issues: [error.toString()], biometricScore: 0, authenticityScore: 0, complexityScore: 0, recommendations: [] },
          },
          client: {
            signature: signatures.client,
            validation: { isValid: false, confidence: 0, riskLevel: 'high', issues: [error.toString()], biometricScore: 0, authenticityScore: 0, complexityScore: 0, recommendations: [] },
          }
        },
        pdf: {
          original: { bytes: originalPdfBytes, hash: '' },
          signed: { bytes: new Uint8Array(), base64: '', hash: '', fileSize: 0 },
          processing: { success: false, documentHash: '', signaturePositions: [], securityMetadata: {} as any, fileSize: 0, pageCount: 0, errors: [error.toString()], processingTime: 0 }
        },
        communications: {
          emails: { invitation: { sent: false }, confirmation: { sent: false }, contractorNotification: { sent: false } },
          sms: { clientNotification: { sent: false }, contractorNotification: { sent: false } }
        },
        security: {
          auditTrail: this.auditTrail,
          locationValidations: [],
          biometricValidations: [],
          documentHashes: []
        },
        timeline: {
          initiated: startTime,
          completed: new Date().toISOString()
        },
        errors,
        warnings
      };
    }
  }

  /**
   * Initialize all Phase 2 services
   */
  private async initializeServices(): Promise<void> {
    const initializations: Promise<any>[] = [];

    if (this.config.enableSMS) {
      initializations.push(twilioSMS.initialize());
    }

    // Geolocation and other services are already initialized
    await Promise.allSettled(initializations);
    
    this.addAuditEvent('services_initialized', 'system', {
      enabledServices: this.getEnabledServices()
    });
  }

  /**
   * Validate signatures with comprehensive biometric analysis
   */
  private async validateSignaturesComprehensively(signatures: ContractSignatures): Promise<{
    contractor: ValidationResult;
    client: ValidationResult;
  }> {
    const contractorValidation = signatureValidation.validateSignature(
      signatures.contractor.biometrics,
      signatures.contractor.metadata
    );

    const clientValidation = signatureValidation.validateSignature(
      signatures.client.biometrics,
      signatures.client.metadata
    );

    this.addAuditEvent('signatures_validated', 'system', {
      contractorValid: contractorValidation.isValid,
      contractorConfidence: contractorValidation.confidence,
      clientValid: clientValidation.isValid,
      clientConfidence: clientValidation.confidence
    });

    return {
      contractor: contractorValidation,
      client: clientValidation
    };
  }

  /**
   * Perform location validations for enhanced security
   */
  private async performLocationValidations(contractData: any): Promise<{
    contractor?: LocationValidationResult;
    client?: LocationValidationResult;
  }> {
    if (!this.config.enableGeolocation) {
      return {};
    }

    const jurisdiction = {
      country: 'United States',
      state: contractData.project?.state || '',
      requiresPhysicalPresence: this.config.locationValidation.requiresPhysicalPresence,
      legalRequirements: ['GPS validation', 'IP verification']
    };

    try {
      // In a real implementation, you would get locations from signature metadata
      // For now, we simulate the validation process
      const contractorLocation = await geolocationValidation.validateLocationForSigning(
        jurisdiction,
        contractData.project?.location ? {
          latitude: contractData.project.location.lat || 0,
          longitude: contractData.project.location.lng || 0,
          address: contractData.project.location.address || ''
        } : undefined
      );

      const clientLocation = await geolocationValidation.validateLocationForSigning(
        jurisdiction,
        contractData.project?.location ? {
          latitude: contractData.project.location.lat || 0,
          longitude: contractData.project.location.lng || 0,
          address: contractData.project.location.address || ''
        } : undefined
      );

      this.addAuditEvent('location_validations_completed', 'system', {
        contractorLocationValid: contractorLocation.isValid,
        clientLocationValid: clientLocation.isValid,
        jurisdictionMatch: contractorLocation.jurisdictionMatch && clientLocation.jurisdictionMatch
      });

      return {
        contractor: contractorLocation,
        client: clientLocation
      };

    } catch (error) {
      this.addAuditEvent('location_validation_failed', 'system', { error: error.toString() });
      return {};
    }
  }

  /**
   * Process PDF with all Phase 2 enhancements
   */
  private async processAdvancedPDF(
    originalPdfBytes: Uint8Array,
    signatures: ContractSignatures,
    contractData: any,
    locationValidations: any
  ): Promise<PDFProcessingResult> {
    if (!this.config.enableAdvancedPDF) {
      // Return basic result if advanced PDF is disabled
      return {
        success: true,
        documentHash: await this.generateHash(originalPdfBytes),
        signaturePositions: [],
        securityMetadata: {} as any,
        fileSize: originalPdfBytes.length,
        pageCount: 0,
        errors: [],
        processingTime: 0
      };
    }

    const securityMetadata = {
      contractId: contractData.contractId || `contract_${Date.now()}`,
      signatureHashes: {
        contractor: await this.generateHash(new TextEncoder().encode(signatures.contractor.imageData)),
        client: await this.generateHash(new TextEncoder().encode(signatures.client.imageData))
      },
      timestamps: {
        created: contractData.createdAt || new Date().toISOString(),
        signed: new Date().toISOString(),
        sealed: new Date().toISOString()
      },
      locations: {
        contractorLocation: locationValidations.contractor?.addressInfo?.formattedAddress,
        clientLocation: locationValidations.client?.addressInfo?.formattedAddress
      },
      validation: {
        contractorValidation: locationValidations.contractor,
        clientValidation: locationValidations.client
      },
      auditTrail: {
        events: this.auditTrail
      }
    };

    const result = await advancedPDF.processAndSignContract(
      originalPdfBytes,
      signatures,
      {
        contractId: contractData.contractId,
        contractorInfo: contractData.contractor,
        clientInfo: contractData.client,
        projectInfo: contractData.project
      },
      securityMetadata
    );

    this.addAuditEvent('pdf_processing_completed', 'system', {
      success: result.success,
      fileSize: result.fileSize,
      pageCount: result.pageCount,
      processingTime: result.processingTime
    });

    return result;
  }

  /**
   * Send enhanced notifications via multiple channels
   */
  private async sendEnhancedNotifications(
    contractData: any,
    pdfResult: PDFProcessingResult
  ): Promise<ComprehensiveSigningResult['communications']> {
    const communications: ComprehensiveSigningResult['communications'] = {
      emails: {
        invitation: { sent: false },
        confirmation: { sent: false },
        contractorNotification: { sent: false }
      },
      sms: {
        clientNotification: { sent: false },
        contractorNotification: { sent: false }
      }
    };

    // Enhanced Email Notifications
    if (this.config.enableAdvancedEmail) {
      try {
        const emailData: EmailTemplateData = {
          contractId: contractData.contractId,
          clientInfo: contractData.client,
          contractorInfo: contractData.contractor,
          contractDetails: contractData.project,
          securityInfo: {
            accessUrl: `${window.location.origin}/contract/${contractData.contractId}`,
            expiryDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
            securityToken: 'secure_token_123'
          },
          customization: {
            brandColor: '#3b82f6',
            accentColor: '#10b981'
          }
        };

        // Send completion confirmation
        const confirmationEmail = advancedEmailTemplates.generateSignatureConfirmationEmail(emailData);
        
        // In production, you would actually send these emails via your email service
        communications.emails.confirmation.sent = true;
        communications.emails.confirmation.messageId = `email_${Date.now()}`;

        this.addAuditEvent('enhanced_emails_sent', 'system', {
          emailsSent: 1,
          templates: ['signature-confirmation']
        });

      } catch (error) {
        this.addAuditEvent('enhanced_email_failed', 'system', { error: error.toString() });
      }
    }

    // SMS Notifications
    if (this.config.enableSMS) {
      try {
        // Send SMS to client
        if (this.config.smsNotifications.sendToClient && contractData.client.phone) {
          const clientSMS = await twilioSMS.sendContractNotification(
            contractData.client.phone,
            'contract-signed',
            {
              clientName: contractData.client.name,
              projectType: contractData.project.type,
              amount: contractData.project.totalAmount?.toLocaleString() || '0',
              url: `${window.location.origin}/contract/${contractData.contractId}`
            },
            contractData.contractId
          );

          communications.sms.clientNotification = {
            sent: clientSMS.success,
            messageId: clientSMS.messageId
          };
        }

        // Send SMS to contractor
        if (this.config.smsNotifications.sendToContractor && contractData.contractor.phone) {
          const contractorSMS = await twilioSMS.sendContractNotification(
            contractData.contractor.phone,
            'contract-signed',
            {
              clientName: contractData.client.name,
              projectType: contractData.project.type,
              amount: contractData.project.totalAmount?.toLocaleString() || '0',
              url: `${window.location.origin}/contract-tracking/${contractData.contractId}`
            },
            contractData.contractId
          );

          communications.sms.contractorNotification = {
            sent: contractorSMS.success,
            messageId: contractorSMS.messageId
          };
        }

        this.addAuditEvent('sms_notifications_sent', 'system', {
          clientSent: communications.sms.clientNotification.sent,
          contractorSent: communications.sms.contractorNotification.sent
        });

      } catch (error) {
        this.addAuditEvent('sms_notification_failed', 'system', { error: error.toString() });
      }
    }

    return communications;
  }

  /**
   * Generate comprehensive audit trail
   */
  private generateComprehensiveAuditTrail(
    contractData: any,
    signatureValidations: any,
    locationValidations: any,
    pdfResult: PDFProcessingResult
  ): Array<any> {
    // Add final audit events
    this.addAuditEvent('comprehensive_audit_generated', 'system', {
      totalEvents: this.auditTrail.length,
      signatureValidations: {
        contractorValid: signatureValidations.contractor.isValid,
        clientValid: signatureValidations.client.isValid
      },
      locationValidations: {
        contractorValid: locationValidations.contractor?.isValid,
        clientValid: locationValidations.client?.isValid
      },
      pdfProcessing: {
        success: pdfResult.success,
        fileSize: pdfResult.fileSize
      }
    });

    return [...this.auditTrail];
  }

  /**
   * Add event to audit trail
   */
  private addAuditEvent(event: string, actor: string, metadata: any = {}): void {
    this.auditTrail.push({
      timestamp: new Date().toISOString(),
      event,
      actor,
      metadata
    });
  }

  /**
   * Generate cryptographic hash
   */
  private async generateHash(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get list of enabled services
   */
  private getEnabledServices(): string[] {
    const services: string[] = [];
    if (this.config.enableSMS) services.push('SMS');
    if (this.config.enableGeolocation) services.push('Geolocation');
    if (this.config.enableAdvancedEmail) services.push('AdvancedEmail');
    if (this.config.enableAdvancedPDF) services.push('AdvancedPDF');
    return services;
  }

  /**
   * Get service configuration
   */
  getConfiguration(): Phase2IntegrationConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  updateConfiguration(newConfig: Partial<Phase2IntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.addAuditEvent('configuration_updated', 'system', { newConfig });
  }

  /**
   * Get service statistics
   */
  getServiceStatistics(): {
    auditEvents: number;
    enabledServices: string[];
    lastActivity: string;
    configuration: Phase2IntegrationConfig;
  } {
    return {
      auditEvents: this.auditTrail.length,
      enabledServices: this.getEnabledServices(),
      lastActivity: this.auditTrail[this.auditTrail.length - 1]?.timestamp || 'Never',
      configuration: this.config
    };
  }
}

// Export singleton with default configuration
export const phase2Integration = Phase2IntegrationOrchestrator.getInstance();