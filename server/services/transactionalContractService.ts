/**
 * Transactional Contract Service
 * Handles signature processing with transactions, idempotency, and legal seals
 * CRITICAL FIX: Now uses Firebase for contracts instead of PostgreSQL
 */

import { legalSealService } from './legalSealService';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface SignatureSubmission {
  contractId: string;
  party: 'contractor' | 'client';
  signatureData: string;
  signatureType: 'drawing' | 'cursive' | 'typed';
  ipAddress?: string;
  userAgent?: string;
}

export interface ProcessSignatureResult {
  success: boolean;
  message: string;
  status?: string;
  bothSigned?: boolean;
  isCompleted?: boolean;
}

class TransactionalContractService {
  /**
   * Process signature with full transaction support
   * IDEMPOTENT: Can be called multiple times safely
   * CRITICAL FIX: Now uses Firebase instead of PostgreSQL
   */
  async processSignature(
    submission: SignatureSubmission
  ): Promise<ProcessSignatureResult> {
    const { contractId, party, signatureData, signatureType, ipAddress, userAgent } = submission;

    try {
      console.log(`✍️ [TRANSACTIONAL] Processing ${party} signature for ${contractId}`);

      // Import Firebase
      const { db: firebaseDb } = await import("../lib/firebase-admin");
      const admin = await import('firebase-admin');
      const FieldValue = admin.firestore.FieldValue;

      // CRITICAL FIX: Use Firestore transaction to prevent race conditions
      const contractRef = firebaseDb.collection('dualSignatureContracts').doc(contractId);

      // Calculate signature hash for audit
      const signatureHash = crypto
        .createHash('sha256')
        .update(signatureData)
        .digest('hex');

      // Execute atomic transaction to handle concurrent signatures correctly
      const transactionResult = await firebaseDb.runTransaction(async (transaction) => {
        // Get fresh contract data within transaction
        const contractDoc = await transaction.get(contractRef);
        
        if (!contractDoc.exists) {
          throw new Error('Contract not found in Firebase');
        }

        const contract = contractDoc.data()!;

        // IDEMPOTENCY CHECK: If already signed by this party, return current state
        const alreadySigned = party === 'contractor' 
          ? contract.contractorSigned 
          : contract.clientSigned;

        if (alreadySigned) {
          console.log(`⚠️ [TRANSACTIONAL] ${party} already signed - idempotent return`);
          return {
            alreadySigned: true,
            status: contract.status || 'signed',
            bothSigned: contract.contractorSigned && contract.clientSigned,
            isCompleted: contract.status === 'completed',
          };
        }

        // Prepare update data
        const updateData: any = party === 'contractor' ? {
          contractorSigned: true,
          contractorSignedAt: FieldValue.serverTimestamp(),
          contractorSignature: signatureData,
          contractorSignatureType: signatureType,
          updatedAt: FieldValue.serverTimestamp(),
        } : {
          clientSigned: true,
          clientSignedAt: FieldValue.serverTimestamp(),
          clientSignature: signatureData,
          clientSignatureType: signatureType,
          updatedAt: FieldValue.serverTimestamp(),
        };

        // Add audit data
        updateData.lastSignatureHash = signatureHash;
        updateData.lastSignatureIp = ipAddress || null;
        updateData.lastSignatureUserAgent = userAgent || null;

        // Update within transaction
        transaction.update(contractRef, updateData);

        // Check if both parties have now signed (using fresh data from transaction)
        const otherPartySigned = party === 'contractor' 
          ? contract.clientSigned 
          : contract.contractorSigned;

        const bothSigned = otherPartySigned;

        // Return result from transaction
        return {
          alreadySigned: false,
          bothSigned,
          contractorSigned: party === 'contractor' ? true : contract.contractorSigned,
          clientSigned: party === 'client' ? true : contract.clientSigned,
        };
      });

      // Handle idempotency case
      if (transactionResult.alreadySigned) {
        return {
          success: true,
          message: `${party} signature already recorded`,
          status: transactionResult.status,
          bothSigned: transactionResult.bothSigned,
          isCompleted: transactionResult.isCompleted,
        };
      }

      const bothSigned = transactionResult.bothSigned;

      if (bothSigned) {
        console.log('🎉 [TRANSACTIONAL] Both parties signed - completing contract...');

        // Complete contract
        await this.completeContractInFirebase(
          contractId,
          ipAddress || 'unknown'
        );

        return {
          success: true,
          message: 'Contract completed successfully',
          status: 'completed',
          bothSigned: true,
          isCompleted: true,
        };
      } else {
        // Only one party signed - update status
        const newStatus = party === 'contractor' ? 'contractor_signed' : 'client_signed';
        
        await contractRef.update({
          status: newStatus,
          updatedAt: new Date(),
        });

        // Sync with contractHistory collection
        try {
          await firebaseDb
            .collection('contractHistory')
            .doc(contractId)
            .update({
              status: newStatus,
              updatedAt: new Date(),
            });
          console.log(`✅ [TRANSACTIONAL] Contract history updated to ${newStatus}`);
        } catch (syncError) {
          console.log(`⚠️ [TRANSACTIONAL] Could not sync with contractHistory:`, syncError);
          // Don't fail the operation if sync fails
        }

        return {
          success: true,
          message: `${party} signature recorded successfully`,
          status: newStatus,
          bothSigned: false,
          isCompleted: false,
        };
      }

    } catch (error: any) {
      console.error('❌ [TRANSACTIONAL] Error processing signature:', error);
      return {
        success: false,
        message: `Error processing signature: ${error.message}`,
      };
    }
  }

  /**
   * Complete contract in Firebase
   * Generates PDF with legal seal and updates all fields
   */
  private async completeContractInFirebase(
    contractId: string,
    finalSigningIp: string
  ): Promise<void> {
    try {
      const { db: firebaseDb } = await import("../lib/firebase-admin");
      const contractRef = firebaseDb.collection('dualSignatureContracts').doc(contractId);
      const contractDoc = await contractRef.get();

      if (!contractDoc.exists) {
        throw new Error('Contract not found in completion');
      }

      const contract = contractDoc.data()!;

      // IDEMPOTENCY: Check if already completed
      if (contract.status === 'completed' && contract.finalPdfPath) {
        console.log(`⚠️ [TRANSACTIONAL] Contract already completed - skipping PDF generation`);
        return;
      }

      // Generate PDF with signatures
      const { default: PremiumPdfService } = await import('./premiumPdfService');
      const pdfService = new PremiumPdfService();

      const pdfBuffer = await pdfService.generateContractWithSignatures({
        contractHTML: contract.contractHtml || '',
        contractorSignature: {
          name: contract.contractorName,
          signatureData: contract.contractorSignature || '',
          typedName: contract.contractorSignatureType === 'typed' ? contract.contractorName : undefined,
          signedAt: contract.contractorSignedAt || new Date(),
        },
        clientSignature: {
          name: contract.clientName,
          signatureData: contract.clientSignature || '',
          typedName: contract.clientSignatureType === 'typed' ? contract.clientName : undefined,
          signedAt: contract.clientSignedAt || new Date(),
        },
      });

      // Create legal seal
      const legalSeal = await legalSealService.createLegalSeal(
        contractId,
        pdfBuffer,
        finalSigningIp
      );

      // Save final PDF to filesystem
      const finalPdfPath = `signed_contracts/contract_${contractId}_final_sealed.pdf`;
      const fullPath = path.join(process.cwd(), finalPdfPath);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, pdfBuffer);

      // Update Firebase with completion data
      await contractRef.update({
        status: 'completed',
        finalPdfPath,
        signedPdfPath: finalPdfPath,
        permanentPdfUrl: finalPdfPath,
        folio: legalSeal.folio,
        pdfHash: legalSeal.pdfHash,
        signingIp: finalSigningIp,
        updatedAt: new Date(),
      });

      console.log(`✅ [TRANSACTIONAL] Contract completed with legal seal`);
      console.log(`   📋 Folio: ${legalSeal.folio}`);
      console.log(`   🔐 Hash: ${legalSeal.pdfHash.substring(0, 16)}...`);
      console.log(`   💾 Path: ${finalPdfPath}`);

    } catch (error: any) {
      console.error('❌ [TRANSACTIONAL] Error completing contract:', error);
      throw error;
    }
  }


  /**
   * Get contract for signing (idempotent read)
   * CRITICAL FIX: Now uses Firebase instead of PostgreSQL
   */
  async getContractForSigning(
    contractId: string,
    party: 'contractor' | 'client'
  ): Promise<any> {
    try {
      const { db: firebaseDb } = await import("../lib/firebase-admin");
      const contractDoc = await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .get();

      if (!contractDoc.exists) {
        return {
          success: false,
          message: 'Contract not found in Firebase',
        };
      }

      const contract = contractDoc.data()!;

      // Check if already signed
      const alreadySigned = party === 'contractor' 
        ? contract.contractorSigned 
        : contract.clientSigned;

      return {
        success: true,
        contract,
        alreadySigned,
        message: alreadySigned 
          ? `This contract has already been signed by the ${party}` 
          : 'Contract ready for signing',
      };
    } catch (error: any) {
      console.error('❌ [TRANSACTIONAL] Error getting contract from Firebase:', error);
      return {
        success: false,
        message: `Error retrieving contract: ${error.message}`,
      };
    }
  }
}

// Export singleton instance
export const transactionalContractService = new TransactionalContractService();
