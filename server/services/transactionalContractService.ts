/**
 * Transactional Contract Service
 * Handles signature processing with transactions, idempotency, and legal seals
 * CRITICAL FIX: Now uses Firebase for contracts instead of PostgreSQL
 * PRODUCTION REFACTOR: Uses async CompletionQueue for non-blocking completion
 */

import { completionQueue } from './completionQueue';
import crypto from 'crypto';
import {
  createDigitalCertificate,
  parseDeviceInfo,
  type DigitalCertificate,
  type SignatureAuditMetadata,
} from "./digitalCertification";

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

      // Import Firebase - Use only the unified instance
      const { db: firebaseDb, admin } = await import("../lib/firebase-admin");
      const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

      // CRITICAL FIX: Use Firestore transaction to prevent race conditions
      const contractRef = firebaseDb.collection('dualSignatureContracts').doc(contractId);

      // Calculate signature hash for audit
      const signatureHash = crypto
        .createHash('sha256')
        .update(signatureData)
        .digest('hex');

      // 🔐 STEP 1: Create audit metadata (BEFORE transaction)
      const auditMetadata: SignatureAuditMetadata = {
        ipAddress: ipAddress || 'Unknown',
        userAgent: userAgent || 'Unknown',
        deviceType: parseDeviceInfo(userAgent || ''),
      };

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

        // 🔐 STEP 2: Generate digital certificate (PKI) within transaction
        const signerName = party === 'contractor' ? contract.contractorName : contract.clientName;
        // ⚠️ CRITICAL FIX: Use correct field name (contractHtml not contractHTML)
        const certificate = createDigitalCertificate(
          contractId,
          contract.contractHtml || contract.contractHTML || '',
          signatureData,
          signerName || 'Unknown'
        );

        console.log(`🔐 [CERTIFICATE] Generated for ${party}:`, {
          certificateId: certificate.certificateId.substring(0, 10) + '...',
          timestamp: certificate.timestamp,
          issuer: certificate.issuer
        });

        // Prepare update data with enterprise-grade metadata
        // ⚠️ TODO: Add Cloud Storage URL persistence here (post-transaction)
        const updateData: any = party === 'contractor' ? {
          contractorSigned: true,
          contractorSignedAt: serverTimestamp(),
          contractorSignature: signatureData,
          contractorSignatureData: signatureData, // Compatibility
          contractorSignatureType: signatureType,
          contractorCertificate: certificate,
          contractorAudit: auditMetadata,
          contractorCloudStorageUrl: null, // ✅ Will be set if Cloud Storage succeeds
          updatedAt: serverTimestamp(),
        } : {
          clientSigned: true,
          clientSignedAt: serverTimestamp(),
          clientSignature: signatureData,
          clientSignatureData: signatureData, // Compatibility
          clientSignatureType: signatureType,
          clientCertificate: certificate,
          clientAudit: auditMetadata,
          clientCloudStorageUrl: null, // ✅ Will be set if Cloud Storage succeeds
          updatedAt: serverTimestamp(),
        };

        // Add legacy audit data for backward compatibility
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

        // ✅ CRITICAL FIX: Create completion job INSIDE transaction (atomic with signature)
        if (bothSigned) {
          console.log('🔥 [TRANSACTION] Both signed - creating completion job atomically');
          
          const completionJobRef = firebaseDb.collection('completionJobs').doc(contractId);
          
          // Create job document INSIDE transaction (atomic!)
          transaction.set(completionJobRef, {
            contractId,
            finalSigningIp: ipAddress || 'unknown',
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
            retryCount: 0,
          });
          
          // Update contract status to 'both_signed' (also inside transaction)
          transaction.update(contractRef, {
            status: 'both_signed',
            updatedAt: new Date(),
          });
        }

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
        console.log('🎉 [TRANSACTIONAL] Both parties signed - completion job created atomically in transaction');

        // ✅ CRITICAL FIX: Claim the job BEFORE enqueueing (distributed locking)
        // This prevents other instances from claiming the same job
        try {
          const completionJobRef = firebaseDb.collection('completionJobs').doc(contractId);
          
          const claimed = await firebaseDb.runTransaction(async (transaction) => {
            const jobDoc = await transaction.get(completionJobRef);
            
            if (!jobDoc.exists) {
              console.warn(`⚠️ [TRANSACTIONAL] Job ${contractId} not found (race condition?)`);
              return false;
            }
            
            const jobData = jobDoc.data()!;
            
            // Only claim if pending (not already claimed by another instance)
            if (jobData.status !== 'pending') {
              console.log(`⏭️ [TRANSACTIONAL] Job ${contractId} already claimed (status: ${jobData.status})`);
              return false;
            }
            
            // Claim atomically
            transaction.update(completionJobRef, {
              status: 'processing',
              claimedAt: new Date(),
              claimedBy: 'local',
              updatedAt: new Date(),
            });
            
            return true;
          });
          
          if (!claimed) {
            console.log(`⚠️ [TRANSACTIONAL] Job ${contractId} was already claimed by another worker`);
            // Job will be processed by other instance
            return {
              success: true,
              message: 'Both parties signed - completion being handled by another worker',
              status: 'both_signed',
              bothSigned: true,
              isCompleted: false,
            };
          }
          
          console.log(`✅ [TRANSACTIONAL] Job ${contractId} claimed successfully - enqueueing`);
          
          // Now enqueue (already claimed, safe to process)
          completionQueue.enqueue(
            contractId,
            ipAddress || 'unknown'
          ).catch(error => {
            console.error(`⚠️ [TRANSACTIONAL] Failed to enqueue job (will be retried from Firestore):`, error);
            // Don't fail - job is persisted and will be retried
          });
          
        } catch (claimError: any) {
          console.error(`❌ [TRANSACTIONAL] Failed to claim job ${contractId}:`, claimError);
          // Don't fail the response - job will be retried from Firestore
        }

        return {
          success: true,
          message: 'Both parties signed - contract completion in progress',
          status: 'both_signed',
          bothSigned: true,
          isCompleted: false, // Not yet completed (async job processing)
        };
      } else {
        // Only one party signed - update status
        const newStatus = party === 'contractor' ? 'contractor_signed' : 'client_signed';
        
        await contractRef.update({
          status: newStatus,
          updatedAt: new Date(),
        });

        // ✅ PHASE 5 FIX: contractHistory sync removed (single source of truth in dualSignatureContracts)
        // No longer syncing to contractHistory - using dualSignatureContracts collection only

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
   * ❌ REMOVED: completeContractInFirebase() method
   * 
   * Completion is now handled asynchronously by CompletionWorker
   * via the CompletionQueue system. This eliminates:
   * - Synchronous blocking operations (10-15s)
   * - Duplicate completion logic
   * - Race conditions
   * - Data sync issues
   * 
   * See: server/services/completionWorker.ts
   * See: server/services/completionQueue.ts
   */

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
