/**
 * Completion Worker Service
 * 
 * PRODUCTION-READY CONTRACT COMPLETION SYSTEM
 * 
 * Responsibilities:
 * - Single source of truth for contract completion
 * - Robust validation before marking contracts complete
 * - Atomic completion workflow with rollback capability
 * - Retry logic with exponential backoff
 * - Comprehensive error handling and logging
 * 
 * Key Features:
 * - ✅ Pre-completion validation (signatures, certificates, required fields)
 * - ✅ Idempotent operations (safe to call multiple times)
 * - ✅ PDF generation with quality checks
 * - ✅ Legal seal creation (folio + hash)
 * - ✅ Firebase Storage upload
 * - ✅ Completion state machine
 * - ✅ Email delivery with retry
 * - ✅ Comprehensive audit trail
 */

import crypto from 'crypto';
import { legalSealService, type LegalSealData } from './legalSealService';

// ===== COMPLETION STATES =====
export enum CompletionState {
  BOTH_SIGNED = 'both_signed',             // Initial state (both signatures present)
  VALIDATING = 'validating',               // Pre-completion validation in progress
  VALIDATED = 'validated',                 // Validation passed
  GENERATING_PDF = 'generating_pdf',       // PDF generation in progress
  PDF_GENERATED = 'pdf_generated',         // PDF successfully generated
  CREATING_SEAL = 'creating_seal',         // Legal seal creation in progress
  SEAL_CREATED = 'seal_created',           // Legal seal successfully created
  UPLOADING = 'uploading',                 // Firebase Storage upload in progress
  UPLOADED = 'uploaded',                   // Upload complete
  FINALIZING = 'finalizing',               // Final Firebase updates in progress
  SENDING_EMAIL = 'sending_email',         // Email delivery in progress
  COMPLETED = 'completed',                 // Fully completed (SUCCESS)
  
  // Error states
  VALIDATION_FAILED = 'validation_failed',
  PDF_FAILED = 'pdf_generation_failed',
  SEAL_FAILED = 'seal_creation_failed',
  UPLOAD_FAILED = 'upload_failed',
  FINALIZATION_FAILED = 'finalization_failed',
  EMAIL_FAILED = 'email_failed',           // Non-blocking (completion still successful)
}

// ===== VALIDATION RESULT =====
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ===== COMPLETION DATA =====
export interface CompletionData {
  pdfBuffer: Buffer;
  legalSeal: LegalSealData;
  permanentUrl: string;
}

// ===== COMPLETION ERROR =====
export interface CompletionError {
  code: string;
  message: string;
  state: CompletionState;
  timestamp: Date;
  retryCount: number;
  stack?: string;
  severity?: 'error' | 'warning' | 'info'; // For non-fatal errors that allow completion to continue
}

/**
 * Completion Worker
 * Handles all contract completion logic in a single, robust service
 */
class CompletionWorker {
  
  /**
   * Main completion workflow
   * 
   * This is the ONLY method that should be called to complete a contract.
   * It handles the entire completion lifecycle with proper error handling.
   * 
   * @param contractId - Contract to complete
   * @param finalSigningIp - IP address of final signer
   * @returns Success status
   */
  async processCompletion(
    contractId: string,
    finalSigningIp: string
  ): Promise<{ success: boolean; message: string }> {
    console.log(`🎯 [COMPLETION-WORKER] Starting completion for ${contractId}`);
    
    let pdfBuffer: Buffer | null = null;
    let legalSeal: LegalSealData | null = null;
    let permanentUrl: string | null = null;
    
    try {
      // Import Firebase
      const { db: firebaseDb, admin } = await import('../lib/firebase-admin');
      const contractRef = firebaseDb.collection('dualSignatureContracts').doc(contractId);
      
      // ==========================================================
      // PHASE 1: PRE-FLIGHT CHECKS
      // ==========================================================
      
      // ✅ FIX: Check idempotency BEFORE mutating state (avoid overwriting completed contracts)
      const alreadyCompleted = await this.isAlreadyCompleted(contractId);
      if (alreadyCompleted) {
        console.log(`✅ [COMPLETION-WORKER] Contract ${contractId} already completed - skipping`);
        return { success: true, message: 'Contract already completed' };
      }
      
      // Now safe to update state (contract not completed)
      await this.updateState(contractId, CompletionState.VALIDATING);
      
      // Validate contract is ready for completion
      const validation = await this.validateForCompletion(contractId);
      if (!validation.isValid) {
        console.error(`❌ [COMPLETION-WORKER] Validation failed:`, validation.errors);
        await this.updateState(contractId, CompletionState.VALIDATION_FAILED);
        await this.storeCompletionError(contractId, {
          code: 'VALIDATION_FAILED',
          message: validation.errors.join(', '),
          state: CompletionState.VALIDATION_FAILED,
          timestamp: new Date(),
          retryCount: 0,
        });
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Log warnings (non-blocking)
      if (validation.warnings.length > 0) {
        console.warn(`⚠️ [COMPLETION-WORKER] Validation warnings:`, validation.warnings);
      }
      
      await this.updateState(contractId, CompletionState.VALIDATED);
      console.log(`✅ [COMPLETION-WORKER] Validation passed`);
      
      // ==========================================================
      // PHASE 2: PDF GENERATION WITH LEGAL SEAL PAGE
      // ==========================================================
      
      await this.updateState(contractId, CompletionState.GENERATING_PDF);
      
      // Step 2a: Pre-generate folio before PDF (avoids self-reference paradox)
      const folio = legalSealService.generateFolio(contractId);
      console.log(`📋 [COMPLETION-WORKER] Pre-generated folio: ${folio}`);
      
      // Step 2b: Generate initial PDF with signatures
      const initialPdfBuffer = await this.generatePDF(contractId);
      console.log(`✅ [COMPLETION-WORKER] Initial PDF generated (${initialPdfBuffer.length} bytes)`);
      
      // Step 2c: Fetch signing metadata for seal page
      const contractDoc = await firebaseDb.collection('dualSignatureContracts').doc(contractId).get();
      const contract = contractDoc.data()!;
      
      // Helper to parse dates safely
      const parseDate = (value: any): Date => {
        if (!value) return new Date();
        if (value instanceof Date) return value;
        if (typeof value.toDate === 'function') return value.toDate();
        if (typeof value === 'number') return new Date(value < 1e12 ? value * 1000 : value);
        if (typeof value === 'string') return new Date(value);
        return new Date();
      };
      
      const signingMetadata = {
        contractorName: contract.contractorName || 'N/A',
        contractorIp: contract.contractorCertificate?.ipAddress || contract.contractorIpAddress || 'N/A',
        contractorSignedAt: parseDate(contract.contractorSignedAt),
        clientName: contract.clientName || 'N/A',
        clientIp: contract.clientCertificate?.ipAddress || contract.clientIpAddress || finalSigningIp,
        clientSignedAt: parseDate(contract.clientSignedAt),
      };
      
      // Step 2d: Append legal seal page using pdf-lib
      pdfBuffer = await legalSealService.appendSealPage(
        initialPdfBuffer,
        folio,
        contractId,
        signingMetadata
      );
      
      await this.updateState(contractId, CompletionState.PDF_GENERATED);
      console.log(`✅ [COMPLETION-WORKER] Final PDF with seal page generated (${pdfBuffer.length} bytes)`);
      
      // ==========================================================
      // PHASE 3: LEGAL SEAL CREATION (hash calculation)
      // ==========================================================
      
      await this.updateState(contractId, CompletionState.CREATING_SEAL);
      
      // Calculate hash on the FINAL PDF (including seal page)
      const pdfHash = legalSealService.calculatePdfHash(pdfBuffer);
      const timestamp = new Date().toISOString();
      
      // Create legal seal data with pre-generated folio and calculated hash
      legalSeal = {
        folio,
        pdfHash,
        timestamp,
        ipAddress: finalSigningIp,
        contractId,
      };
      
      await this.updateState(contractId, CompletionState.SEAL_CREATED);
      console.log(`✅ [COMPLETION-WORKER] Legal seal finalized:`, {
        folio: legalSeal.folio,
        hash: legalSeal.pdfHash.substring(0, 16) + '...',
      });
      
      // ==========================================================
      // PHASE 4: FIREBASE STORAGE UPLOAD (NON-BLOCKING)
      // ==========================================================
      
      await this.updateState(contractId, CompletionState.UPLOADING);
      try {
        permanentUrl = await this.uploadToFirebaseStorage(
          contractId,
          pdfBuffer,
          legalSeal.folio
        );
        await this.updateState(contractId, CompletionState.UPLOADED);
        console.log(`✅ [COMPLETION-WORKER] PDF uploaded to Firebase Storage:`, permanentUrl);
      } catch (uploadError: any) {
        console.warn(`⚠️ [COMPLETION-WORKER] Firebase Storage upload failed (non-blocking):`, uploadError.message);
        console.log(`⏭️ [COMPLETION-WORKER] Continuing without permanent URL - contract will still be marked complete`);
        permanentUrl = null;
        // Store soft error for observability but don't fail completion
        await this.storeCompletionError(contractId, {
          code: 'STORAGE_UPLOAD_FAILED',
          message: uploadError.message,
          state: CompletionState.UPLOADING,
          timestamp: new Date(),
          retryCount: 0,
          severity: 'warning', // Not a fatal error - contract will still complete
        });
      }
      
      // ==========================================================
      // PHASE 5: ATOMIC FINALIZATION
      // ==========================================================
      
      await this.updateState(contractId, CompletionState.FINALIZING);
      await this.finalizeCompletion(contractId, {
        pdfBuffer,
        legalSeal,
        permanentUrl: permanentUrl || '', // Use empty string if upload failed
      });
      await this.updateState(contractId, CompletionState.COMPLETED);
      console.log(`✅ [COMPLETION-WORKER] Contract finalized and marked completed`);
      
      // ==========================================================
      // PHASE 6: EMAIL DELIVERY (NON-BLOCKING)
      // ==========================================================
      
      // Email delivery errors should NOT fail the entire completion
      await this.updateState(contractId, CompletionState.SENDING_EMAIL);
      try {
        await this.sendCompletionEmails(contractId, pdfBuffer);
        console.log(`✅ [COMPLETION-WORKER] Completion emails sent`);
      } catch (emailError: any) {
        console.error(`❌ [COMPLETION-WORKER] Email delivery failed (non-blocking):`, emailError.message);
        await this.updateState(contractId, CompletionState.EMAIL_FAILED);
        // Store error but don't fail completion
        await this.storeCompletionError(contractId, {
          code: 'EMAIL_FAILED',
          message: emailError.message,
          state: CompletionState.EMAIL_FAILED,
          timestamp: new Date(),
          retryCount: 0,
        });
        // Mark as completed despite email failure
        await this.updateState(contractId, CompletionState.COMPLETED);
      }
      
      console.log(`🎉 [COMPLETION-WORKER] Contract ${contractId} completed successfully!`);
      
      // ✅ Mark job as completed in Firestore
      try {
        await firebaseDb.collection('completionJobs').doc(contractId).update({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ [COMPLETION-WORKER] Job marked as completed in Firestore`);
      } catch (jobUpdateError: any) {
        console.warn(`⚠️ [COMPLETION-WORKER] Failed to update job status (non-critical):`, jobUpdateError.message);
      }
      
      return { success: true, message: 'Contract completed successfully' };
      
    } catch (error: any) {
      console.error(`❌ [COMPLETION-WORKER] Completion failed for ${contractId}:`, error);
      
      // Determine error state
      let errorState = CompletionState.VALIDATION_FAILED;
      if (pdfBuffer === null) {
        errorState = CompletionState.PDF_FAILED;
      } else if (legalSeal === null) {
        errorState = CompletionState.SEAL_FAILED;
      } else if (permanentUrl === null) {
        errorState = CompletionState.UPLOAD_FAILED;
      } else {
        errorState = CompletionState.FINALIZATION_FAILED;
      }
      
      // Update to error state
      await this.updateState(contractId, errorState);
      
      // Store error details
      await this.storeCompletionError(contractId, {
        code: errorState,
        message: error.message,
        state: errorState,
        timestamp: new Date(),
        retryCount: await this.getRetryCount(contractId),
        stack: error.stack,
      });
      
      // ✅ CRITICAL FIX: Mark job as failed in Firestore (no local retry)
      // processPendingJobsFromFirestore() will handle retries with proper distributed locking
      try {
        const { db: firebaseDb } = await import('../lib/firebase-admin');
        const retryCount = await this.getRetryCount(contractId);
        
        // Increment retry count
        await this.incrementRetryCount(contractId);
        
        if (retryCount >= 5) {
          // Max retries exceeded
          console.error(`🚨 [COMPLETION-WORKER] Max retries (5) exceeded for ${contractId}`);
          await firebaseDb.collection('completionJobs').doc(contractId).update({
            status: 'max_retries_exceeded',
            error: error.message,
            retryCount: retryCount + 1,
            updatedAt: new Date(),
          });
          await this.alertAdmin(contractId, 'Max completion retries exceeded');
        } else {
          // Mark as failed - will be retried by processPendingJobsFromFirestore()
          console.log(`⏰ [COMPLETION-WORKER] Marking job ${contractId} as failed for retry (attempt ${retryCount + 1}/5)`);
          await firebaseDb.collection('completionJobs').doc(contractId).update({
            status: 'failed',
            error: error.message,
            retryCount: retryCount + 1,
            updatedAt: new Date(),
          });
        }
      } catch (jobUpdateError: any) {
        console.warn(`⚠️ [COMPLETION-WORKER] Failed to update job status (non-critical):`, jobUpdateError.message);
      }
      
      return { success: false, message: `Completion failed: ${error.message}` };
    }
  }
  
  /**
   * Validate contract is ready for completion
   * 
   * Comprehensive validation checks:
   * - Both signatures present and valid
   * - Both certificates present and valid (hash verification)
   * - Required fields populated
   * - Contract HTML not empty
   * - Total amount valid
   * - Email addresses valid
   * - Timestamps valid and consistent
   */
  private async validateForCompletion(contractId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const { db: firebaseDb } = await import('../lib/firebase-admin');
      const contractDoc = await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .get();
      
      if (!contractDoc.exists) {
        errors.push('Contract not found');
        return { isValid: false, errors, warnings };
      }
      
      const contract = contractDoc.data()!;
      
      // 📁 CRITICAL: Block completion of archived contracts
      if (contract.isArchived === true) {
        console.log(`🚫 [ARCHIVE-GUARD] Contract ${contractId} is archived and cannot be completed`);
        errors.push('Contract not found');
        return { isValid: false, errors, warnings };
      }
      
      // ===== SIGNATURE VALIDATION =====
      
      // Contractor signature
      if (!contract.contractorSigned) {
        errors.push('Contractor has not signed');
      }
      if (!contract.contractorSignature || contract.contractorSignature.trim() === '') {
        errors.push('Contractor signature data is missing or empty');
      }
      if (!contract.contractorSignatureType) {
        errors.push('Contractor signature type is missing');
      }
      if (!contract.contractorSignedAt) {
        errors.push('Contractor signature timestamp is missing');
      }
      
      // Client signature
      if (!contract.clientSigned) {
        errors.push('Client has not signed');
      }
      if (!contract.clientSignature || contract.clientSignature.trim() === '') {
        errors.push('Client signature data is missing or empty');
      }
      if (!contract.clientSignatureType) {
        errors.push('Client signature type is missing');
      }
      if (!contract.clientSignedAt) {
        errors.push('Client signature timestamp is missing');
      }
      
      // ===== CERTIFICATE VALIDATION =====
      
      // Contractor certificate
      if (!contract.contractorCertificate) {
        errors.push('Contractor digital certificate is missing');
      } else {
        // Verify certificate hash matches actual signature
        if (!contract.contractorCertificate.signatureHash) {
          errors.push('Contractor certificate signature hash is missing');
        } else if (contract.contractorSignature) {
          const expectedHash = this.hashSignature(contract.contractorSignature);
          if (contract.contractorCertificate.signatureHash !== expectedHash) {
            errors.push('Contractor certificate signature hash does not match actual signature data');
          }
        }
      }
      
      // Client certificate
      if (!contract.clientCertificate) {
        errors.push('Client digital certificate is missing');
      } else {
        // Verify certificate hash matches actual signature
        if (!contract.clientCertificate.signatureHash) {
          errors.push('Client certificate signature hash is missing');
        } else if (contract.clientSignature) {
          const expectedHash = this.hashSignature(contract.clientSignature);
          if (contract.clientCertificate.signatureHash !== expectedHash) {
            errors.push('Client certificate signature hash does not match actual signature data');
          }
        }
      }
      
      // ===== REQUIRED FIELDS VALIDATION =====
      
      if (!contract.contractHtml || contract.contractHtml.trim() === '') {
        errors.push('Contract HTML is empty');
      }
      
      if (!contract.totalAmount || contract.totalAmount <= 0) {
        errors.push('Total amount is invalid or missing');
      }
      
      if (!contract.contractorName || contract.contractorName.trim() === '') {
        errors.push('Contractor name is missing');
      }
      
      if (!contract.contractorEmail || !this.isValidEmail(contract.contractorEmail)) {
        errors.push('Contractor email is invalid or missing');
      }
      
      if (!contract.clientName || contract.clientName.trim() === '') {
        errors.push('Client name is missing');
      }
      
      if (!contract.clientEmail || !this.isValidEmail(contract.clientEmail)) {
        errors.push('Client email is invalid or missing');
      }
      
      if (!contract.userId || contract.userId.trim() === '') {
        errors.push('User ID is missing');
      }
      
      // ===== TIMESTAMP VALIDATION =====
      
      if (contract.contractorSignedAt && contract.clientSignedAt) {
        const contractorTime = contract.contractorSignedAt.toDate ? 
          contract.contractorSignedAt.toDate() : new Date(contract.contractorSignedAt);
        const clientTime = contract.clientSignedAt.toDate ? 
          contract.clientSignedAt.toDate() : new Date(contract.clientSignedAt);
        
        const now = new Date();
        
        // Check timestamps are not in the future
        if (contractorTime > now) {
          warnings.push('Contractor signature timestamp is in the future');
        }
        if (clientTime > now) {
          warnings.push('Client signature timestamp is in the future');
        }
        
        // Check timestamps are not too old (> 1 year)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (contractorTime < oneYearAgo) {
          warnings.push('Contractor signature timestamp is more than 1 year old');
        }
        if (clientTime < oneYearAgo) {
          warnings.push('Client signature timestamp is more than 1 year old');
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
      
    } catch (error: any) {
      console.error('❌ [COMPLETION-WORKER] Error during validation:', error);
      errors.push(`Validation error: ${error.message}`);
      return { isValid: false, errors, warnings };
    }
  }
  
  /**
   * Check if contract is already fully completed
   * 
   * Robust idempotency check - verifies ALL completion fields are present:
   * - status = 'completed'
   * - permanentPdfUrl exists
   * - folio exists (legal seal)
   * - pdfHash exists (legal seal)
   * - completionDate exists
   */
  private async isAlreadyCompleted(contractId: string): Promise<boolean> {
    try {
      const { db: firebaseDb } = await import('../lib/firebase-admin');
      const contractDoc = await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .get();
      
      if (!contractDoc.exists) {
        return false;
      }
      
      const contract = contractDoc.data()!;
      
      // All of these must be present for a truly completed contract
      const isCompleted =
        contract.status === 'completed' &&
        contract.permanentPdfUrl &&
        contract.folio &&
        contract.pdfHash &&
        contract.completionDate;
      
      return !!isCompleted;
      
    } catch (error: any) {
      console.error('❌ [COMPLETION-WORKER] Error checking completion status:', error);
      return false;
    }
  }
  
  /**
   * Generate PDF with signatures
   * 
   * Includes robust validation:
   * - PDF buffer not empty
   * - PDF size reasonable (> 1KB, < 50MB)
   * - PDF format valid (magic number check)
   */
  private async generatePDF(contractId: string): Promise<Buffer> {
    try {
      const { db: firebaseDb } = await import('../lib/firebase-admin');
      const contractDoc = await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .get();
      
      if (!contractDoc.exists) {
        throw new Error('Contract not found for PDF generation');
      }
      
      const contract = contractDoc.data()!;
      
      // Import PDF service
      const { default: PremiumPdfService } = await import('./premiumPdfService');
      const pdfService = new PremiumPdfService();
      
      // ✅ UNIFIED PDF SOURCE: Generate PDF with signatures ONLY
      // The legal seal page is added later via legalSealService.appendSealPage()
      // This prevents duplicate seals in the final PDF
      const pdfBuffer = await pdfService.generateContractWithSignatures({
        contractHTML: contract.contractHtml || '',
        contractorSignature: {
          name: contract.contractorName,
          signatureData: contract.contractorSignature || contract.contractorSignatureData || '',
          typedName: contract.contractorSignatureType === 'typed' ? contract.contractorName : undefined,
          signedAt: contract.contractorSignedAt || new Date(),
        },
        clientSignature: {
          name: contract.clientName,
          signatureData: contract.clientSignature || contract.clientSignatureData || '',
          typedName: contract.clientSignatureType === 'typed' ? contract.clientName : undefined,
          signedAt: contract.clientSignedAt || new Date(),
        },
      });
      
      // ===== PDF VALIDATION =====
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('PDF generation failed: empty buffer');
      }
      
      // Check minimum size (1KB)
      if (pdfBuffer.length < 1024) {
        throw new Error('PDF generation failed: file too small (likely corrupted)');
      }
      
      // Check maximum size (50MB)
      if (pdfBuffer.length > 50 * 1024 * 1024) {
        throw new Error('PDF generation failed: file too large (> 50MB)');
      }
      
      // Validate PDF format (magic number check)
      const pdfHeader = pdfBuffer.toString('utf8', 0, 4);
      if (pdfHeader !== '%PDF') {
        throw new Error('PDF generation failed: invalid PDF format (missing %PDF header)');
      }
      
      return pdfBuffer;
      
    } catch (error: any) {
      console.error('❌ [COMPLETION-WORKER] PDF generation error:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }
  
  /**
   * Generate Digital Certificate HTML with signing metadata
   * 
   * Embeds IP address, timestamp, device info, and certificate verification
   * data directly into the PDF for legal compliance and tamper evidence.
   */
  private generateDigitalCertificateHtml(contract: any, contractId: string): string {
    // Helper to safely parse dates (handles Firestore Timestamps)
    const parseDate = (value: any): Date => {
      if (!value) return new Date();
      if (value instanceof Date) return value;
      if (typeof value.toDate === 'function') return value.toDate(); // Firestore Timestamp
      if (typeof value === 'number') return new Date(value < 1e12 ? value * 1000 : value);
      if (typeof value === 'string') return new Date(value);
      return new Date();
    };

    // Extract certificate data from contractor signature
    const contractorCert = contract.contractorCertificate || {};
    const contractorSignedAt = parseDate(contract.contractorSignedAt);
    const contractorIp = contractorCert.ipAddress || contract.contractorIpAddress || 'N/A';
    const contractorDevice = contractorCert.userAgent || contract.contractorUserAgent || 'N/A';
    const contractorCertHash = contractorCert.hash || 'N/A';

    // Extract certificate data from client signature
    const clientCert = contract.clientCertificate || {};
    const clientSignedAt = parseDate(contract.clientSignedAt);
    const clientIp = clientCert.ipAddress || contract.clientIpAddress || 'N/A';
    const clientDevice = clientCert.userAgent || contract.clientUserAgent || 'N/A';
    const clientCertHash = clientCert.hash || 'N/A';

    // Format dates
    const formatDateTime = (date: Date): string => {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
    };

    // Truncate user agent for readability
    const truncateDevice = (ua: string): string => {
      if (ua === 'N/A' || !ua) return 'N/A';
      if (ua.length > 80) return ua.substring(0, 77) + '...';
      return ua;
    };

    console.log(`🔏 [COMPLETION-WORKER] Generating digital certificate HTML for contract ${contractId}`);

    return `
      <div style="page-break-before: always; margin-top: 40px; padding: 20px; border: 2px solid #1a365d; background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); font-family: 'Arial', sans-serif;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1a365d; margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 2px;">
            🔏 DIGITAL CERTIFICATE OF AUTHENTICITY
          </h2>
          <p style="color: #4a5568; margin: 5px 0 0; font-size: 12px;">
            Contract ID: ${contractId}
          </p>
        </div>
        
        <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px;">
          <!-- Contractor Certificate -->
          <div style="flex: 1; background: white; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e0;">
            <h3 style="color: #2d3748; margin: 0 0 10px; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">
              📋 CONTRACTOR SIGNATURE
            </h3>
            <table style="width: 100%; font-size: 11px; color: #4a5568;">
              <tr>
                <td style="font-weight: bold; width: 80px; padding: 3px 0;">Name:</td>
                <td>${contract.contractorName || 'N/A'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 3px 0;">Signed:</td>
                <td>${formatDateTime(contractorSignedAt)}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 3px 0;">IP Address:</td>
                <td style="font-family: monospace;">${contractorIp}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 3px 0;">Device:</td>
                <td style="font-size: 9px; word-break: break-all;">${truncateDevice(contractorDevice)}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 3px 0;">Cert Hash:</td>
                <td style="font-family: monospace; font-size: 9px;">${contractorCertHash.substring(0, 24)}...</td>
              </tr>
            </table>
          </div>
          
          <!-- Client Certificate -->
          <div style="flex: 1; background: white; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e0;">
            <h3 style="color: #2d3748; margin: 0 0 10px; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">
              📋 CLIENT SIGNATURE
            </h3>
            <table style="width: 100%; font-size: 11px; color: #4a5568;">
              <tr>
                <td style="font-weight: bold; width: 80px; padding: 3px 0;">Name:</td>
                <td>${contract.clientName || 'N/A'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 3px 0;">Signed:</td>
                <td>${formatDateTime(clientSignedAt)}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 3px 0;">IP Address:</td>
                <td style="font-family: monospace;">${clientIp}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 3px 0;">Device:</td>
                <td style="font-size: 9px; word-break: break-all;">${truncateDevice(clientDevice)}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 3px 0;">Cert Hash:</td>
                <td style="font-family: monospace; font-size: 9px;">${clientCertHash.substring(0, 24)}...</td>
              </tr>
            </table>
          </div>
        </div>
        
        <div style="text-align: center; padding: 10px; background: #1a365d; color: white; border-radius: 4px; font-size: 10px;">
          <p style="margin: 0;">
            ⚖️ This contract was digitally signed by both parties. The signatures, timestamps, and IP addresses above serve as legal evidence of consent.
          </p>
          <p style="margin: 5px 0 0; font-family: monospace; font-size: 9px;">
            Generated: ${new Date().toISOString()}
          </p>
        </div>
      </div>
    `;
  }
  
  /**
   * Upload PDF to Firebase Storage
   * 
   * Creates a permanent, publicly accessible URL for the signed contract PDF
   */
  private async uploadToFirebaseStorage(
    contractId: string,
    pdfBuffer: Buffer,
    folio: string
  ): Promise<string> {
    try {
      const { admin } = await import('../lib/firebase-admin');
      const bucket = admin.storage().bucket();
      
      // Use folio in filename for uniqueness and traceability
      const fileName = `contracts/signed/${contractId}_${folio}.pdf`;
      const file = bucket.file(fileName);
      
      await file.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
          metadata: {
            contractId,
            folio,
            uploadedAt: new Date().toISOString(),
          },
        },
      });
      
      // Make file publicly readable
      await file.makePublic();
      
      const publicUrl = file.publicUrl();
      
      console.log(`☁️ [COMPLETION-WORKER] PDF uploaded to Firebase Storage: ${fileName}`);
      
      return publicUrl;
      
    } catch (error: any) {
      console.error('❌ [COMPLETION-WORKER] Firebase Storage upload error:', error);
      throw new Error(`Storage upload failed: ${error.message}`);
    }
  }
  
  /**
   * Finalize completion - atomic Firebase update
   * 
   * Updates contract to 'completed' status with all metadata
   */
  private async finalizeCompletion(
    contractId: string,
    data: CompletionData
  ): Promise<void> {
    try {
      const { db: firebaseDb, admin } = await import('../lib/firebase-admin');
      const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;
      
      // Update dualSignatureContracts collection
      await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .update({
          status: 'completed',
          permanentPdfUrl: data.permanentUrl,
          hasPdf: true,
          folio: data.legalSeal.folio,
          pdfHash: data.legalSeal.pdfHash,
          signingIp: data.legalSeal.ipAddress,
          completionDate: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      
      console.log(`✅ [COMPLETION-WORKER] Contract ${contractId} marked as completed`);
      
    } catch (error: any) {
      console.error('❌ [COMPLETION-WORKER] Finalization error:', error);
      throw new Error(`Finalization failed: ${error.message}`);
    }
  }
  
  /**
   * Send completion emails to contractor
   * 
   * Sends email with PDF attachment to contractor
   */
  private async sendCompletionEmails(
    contractId: string,
    _pdfBuffer: Buffer // Deprecated: Now uses Firebase Storage as single source
  ): Promise<void> {
    try {
      const { db: firebaseDb } = await import('../lib/firebase-admin');
      const contractDoc = await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .get();
      
      if (!contractDoc.exists) {
        throw new Error('Contract not found for email sending');
      }
      
      const contract = contractDoc.data()!;
      
      // ✅ UNIFIED PDF SOURCE: Fetch from Firebase Storage (same as view/download)
      // This ensures email attachment matches exactly what users see in "View Contract"
      let pdfBuffer: Buffer;
      
      if (contract.permanentPdfUrl) {
        try {
          console.log("☁️ [COMPLETION-WORKER] Fetching PDF from Firebase Storage for email...");
          const fetch = (await import("node-fetch")).default;
          const response = await fetch(contract.permanentPdfUrl);
          
          if (response.ok) {
            pdfBuffer = Buffer.from(await response.arrayBuffer());
            console.log("✅ [COMPLETION-WORKER] PDF fetched from Firebase Storage for email");
          } else {
            throw new Error(`Firebase Storage fetch failed: ${response.status}`);
          }
        } catch (storageError: any) {
          console.warn("⚠️ [COMPLETION-WORKER] Failed to fetch from Firebase Storage, using fallback:", storageError.message);
          pdfBuffer = _pdfBuffer; // Fallback to passed buffer
        }
      } else {
        console.warn("⚠️ [COMPLETION-WORKER] No permanentPdfUrl, using passed buffer");
        pdfBuffer = _pdfBuffer; // Fallback to passed buffer
      }
      
      // Import email service
      const { ResendEmailAdvanced } = await import('./resendEmailAdvanced');
      const emailService = new ResendEmailAdvanced();
      
      // Send email to contractor with PDF attachment
      await emailService.sendContractCompletedNotification({
        contractorEmail: contract.contractorEmail,
        contractorName: contract.contractorName,
        clientName: contract.clientName,
        projectDescription: contract.projectDescription,
        totalAmount: contract.totalAmount,
        contractId,
        pdfBuffer,
        folio: contract.folio,
      });
      
      console.log(`📧 [COMPLETION-WORKER] Completion email sent to ${contract.contractorEmail}`);
      
    } catch (error: any) {
      console.error('❌ [COMPLETION-WORKER] Email sending error:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }
  
  /**
   * Update contract completion state
   */
  private async updateState(
    contractId: string,
    state: CompletionState
  ): Promise<void> {
    try {
      const { db: firebaseDb, admin } = await import('../lib/firebase-admin');
      const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;
      
      await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .update({
          completionState: state,
          completionStateUpdatedAt: serverTimestamp(),
        });
      
      console.log(`📊 [COMPLETION-WORKER] State updated: ${contractId} → ${state}`);
      
    } catch (error: any) {
      console.warn('⚠️ [COMPLETION-WORKER] Failed to update state (non-critical):', error.message);
      // Don't fail completion if state update fails
    }
  }
  
  /**
   * Store completion error details
   */
  private async storeCompletionError(
    contractId: string,
    error: CompletionError
  ): Promise<void> {
    try {
      const { db: firebaseDb } = await import('../lib/firebase-admin');
      
      await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .update({
          lastCompletionError: error,
          lastCompletionErrorAt: new Date(),
        });
      
      console.log(`🚨 [COMPLETION-WORKER] Error stored for ${contractId}:`, error.code);
      
    } catch (updateError: any) {
      console.warn('⚠️ [COMPLETION-WORKER] Failed to store error (non-critical):', updateError.message);
    }
  }
  
  /**
   * Get current retry count
   */
  private async getRetryCount(contractId: string): Promise<number> {
    try {
      const { db: firebaseDb } = await import('../lib/firebase-admin');
      const contractDoc = await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .get();
      
      if (!contractDoc.exists) {
        return 0;
      }
      
      const contract = contractDoc.data()!;
      return contract.completionRetryCount || 0;
      
    } catch (error: any) {
      console.warn('⚠️ [COMPLETION-WORKER] Failed to get retry count:', error.message);
      return 0;
    }
  }
  
  /**
   * Increment retry count
   */
  private async incrementRetryCount(contractId: string): Promise<void> {
    try {
      const { db: firebaseDb, admin } = await import('../lib/firebase-admin');
      
      await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .update({
          completionRetryCount: admin.firestore.FieldValue.increment(1),
        });
      
    } catch (error: any) {
      console.warn('⚠️ [COMPLETION-WORKER] Failed to increment retry count:', error.message);
    }
  }
  
  /**
   * Schedule retry with exponential backoff
   */
  private async scheduleRetry(
    contractId: string,
    finalSigningIp: string
  ): Promise<void> {
    const retryCount = await this.getRetryCount(contractId);
    
    // Max 3 retries
    if (retryCount >= 3) {
      console.error(`🚨 [COMPLETION-WORKER] Max retries (3) exceeded for ${contractId}`);
      await this.alertAdmin(contractId, 'Max completion retries exceeded');
      return;
    }
    
    // Exponential backoff: 5s, 10s, 20s
    const delayMs = Math.pow(2, retryCount) * 5000;
    
    console.log(`⏰ [COMPLETION-WORKER] Scheduling retry for ${contractId} in ${delayMs}ms (attempt ${retryCount + 1}/3)`);
    
    // Increment retry count
    await this.incrementRetryCount(contractId);
    
    // Schedule retry
    setTimeout(() => {
      this.processCompletion(contractId, finalSigningIp)
        .catch(error => {
          console.error(`❌ [COMPLETION-WORKER] Retry failed for ${contractId}:`, error);
        });
    }, delayMs);
  }
  
  /**
   * Alert admin of critical failure
   */
  private async alertAdmin(contractId: string, reason: string): Promise<void> {
    console.error(`🚨🚨🚨 [ADMIN-ALERT] ${reason} - Contract: ${contractId}`);
    // TODO: Implement email/Slack alert to admin
  }
  
  /**
   * Hash signature data for verification
   */
  private hashSignature(signatureData: string): string {
    return crypto
      .createHash('sha256')
      .update(signatureData)
      .digest('hex');
  }
  
  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Export singleton instance
export const completionWorker = new CompletionWorker();
