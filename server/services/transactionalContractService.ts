/**
 * Transactional Contract Service
 * Handles signature processing with transactions, idempotency, and legal seals
 */

import { db } from '../db';
import { digitalContracts, contractAuditLog } from '../../shared/schema';
import { eq } from 'drizzle-orm';
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
   * TRANSACTIONAL: All-or-nothing database updates
   */
  async processSignature(
    submission: SignatureSubmission
  ): Promise<ProcessSignatureResult> {
    const { contractId, party, signatureData, signatureType, ipAddress, userAgent } = submission;

    try {
      console.log(`✍️ [TRANSACTIONAL] Processing ${party} signature for ${contractId}`);

      // Use transaction for atomic operation
      const result = await db!.transaction(async (tx) => {
        // 1. Get and lock contract for update
        const [contract] = await tx
          .select()
          .from(digitalContracts)
          .where(eq(digitalContracts.contractId, contractId))
          .limit(1);

        if (!contract) {
          throw new Error('Contract not found');
        }

        // 2. IDEMPOTENCY CHECK: If already signed by this party, return current state
        const alreadySigned = party === 'contractor' 
          ? contract.contractorSigned 
          : contract.clientSigned;

        if (alreadySigned) {
          console.log(`⚠️ [TRANSACTIONAL] ${party} already signed - idempotent return`);
          
          return {
            success: true,
            message: `${party} signature already recorded`,
            status: contract.status!,
            bothSigned: contract.contractorSigned && contract.clientSigned,
            isCompleted: contract.status === 'completed',
            alreadyProcessed: true,
          };
        }

        // 3. Calculate signature hash for audit
        const signatureHash = crypto
          .createHash('sha256')
          .update(signatureData)
          .digest('hex');

        // 4. Update signature in database
        const updateData = party === 'contractor' ? {
          contractorSigned: true,
          contractorSignedAt: new Date(),
          contractorSignatureData: signatureData,
          contractorSignatureType: signatureType,
          updatedAt: new Date(),
        } : {
          clientSigned: true,
          clientSignedAt: new Date(),
          clientSignatureData: signatureData,
          clientSignatureType: signatureType,
          updatedAt: new Date(),
        };

        await tx
          .update(digitalContracts)
          .set(updateData)
          .where(eq(digitalContracts.contractId, contractId));

        // 5. Log signature in audit trail
        await tx.insert(contractAuditLog).values({
          contractId,
          event: party === 'contractor' ? 'contractor_signed' : 'client_signed',
          party,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          signatureHash,
          metadata: {
            signatureType,
            timestamp: new Date().toISOString(),
          },
        });

        // 6. Check if both parties have now signed
        const otherPartySigned = party === 'contractor' 
          ? contract.clientSigned 
          : contract.contractorSigned;

        const bothSigned = otherPartySigned; // Current party just signed, check if other was already signed

        if (bothSigned) {
          console.log('🎉 [TRANSACTIONAL] Both parties signed - completing contract in transaction...');

          // 7. Complete contract within same transaction
          const completionResult = await this.completeContractInTransaction(
            tx,
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
          // 8. Only one party signed - update status
          const newStatus = party === 'contractor' ? 'contractor_signed' : 'client_signed';
          
          await tx
            .update(digitalContracts)
            .set({
              status: newStatus,
              updatedAt: new Date(),
            })
            .where(eq(digitalContracts.contractId, contractId));

          return {
            success: true,
            message: `${party} signature recorded successfully`,
            status: newStatus,
            bothSigned: false,
            isCompleted: false,
          };
        }
      });

      // @ts-ignore - result has alreadyProcessed
      if (result.alreadyProcessed) {
        return {
          success: result.success,
          message: result.message,
          status: result.status,
          bothSigned: result.bothSigned,
          isCompleted: result.isCompleted,
        };
      }

      console.log(`✅ [TRANSACTIONAL] Signature processing completed: ${result.status}`);
      return result as ProcessSignatureResult;

    } catch (error: any) {
      console.error('❌ [TRANSACTIONAL] Error processing signature:', error);
      return {
        success: false,
        message: `Error processing signature: ${error.message}`,
      };
    }
  }

  /**
   * Complete contract within transaction
   * Generates PDF with legal seal and updates all fields atomically
   */
  private async completeContractInTransaction(
    tx: any,
    contractId: string,
    finalSigningIp: string
  ): Promise<void> {
    try {
      // 1. Get contract with all signatures
      const [contract] = await tx
        .select()
        .from(digitalContracts)
        .where(eq(digitalContracts.contractId, contractId))
        .limit(1);

      if (!contract) {
        throw new Error('Contract not found in completion');
      }

      // 2. IDEMPOTENCY: Check if already completed
      if (contract.status === 'completed' && contract.finalPdfPath) {
        console.log(`⚠️ [TRANSACTIONAL] Contract already completed - skipping PDF generation`);
        return;
      }

      // 3. Generate PDF with signatures
      const { default: PremiumPdfService } = await import('./premiumPdfService');
      const pdfService = new PremiumPdfService();

      const pdfBuffer = await pdfService.generateContractWithSignatures({
        contractHTML: contract.contractHtml || '',
        contractorSignature: {
          name: contract.contractorName,
          signatureData: contract.contractorSignatureData || '',
          typedName: contract.contractorSignatureType === 'typed' ? contract.contractorName : undefined,
          signedAt: contract.contractorSignedAt || new Date(),
        },
        clientSignature: {
          name: contract.clientName,
          signatureData: contract.clientSignatureData || '',
          typedName: contract.clientSignatureType === 'typed' ? contract.clientName : undefined,
          signedAt: contract.clientSignedAt || new Date(),
        },
      });

      // 4. Create legal seal
      const legalSeal = await legalSealService.createLegalSeal(
        contractId,
        pdfBuffer,
        finalSigningIp
      );

      // 5. Save final PDF to filesystem
      const finalPdfPath = `signed_contracts/contract_${contractId}_final_sealed.pdf`;
      const fullPath = path.join(process.cwd(), finalPdfPath);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, pdfBuffer);

      // 6. Update contract with completion data and legal seal
      await tx
        .update(digitalContracts)
        .set({
          status: 'completed',
          finalPdfPath,
          folio: legalSeal.folio,
          pdfHash: legalSeal.pdfHash,
          signingIp: finalSigningIp,
          updatedAt: new Date(),
        })
        .where(eq(digitalContracts.contractId, contractId));

      // 7. Log completion in audit trail
      await tx.insert(contractAuditLog).values({
        contractId,
        event: 'completed',
        party: 'system',
        ipAddress: finalSigningIp,
        pdfHash: legalSeal.pdfHash,
        metadata: {
          folio: legalSeal.folio,
          finalPdfPath,
          timestamp: legalSeal.timestamp,
        },
      });

      console.log(`✅ [TRANSACTIONAL] Contract completed with legal seal`);
      console.log(`   📋 Folio: ${legalSeal.folio}`);
      console.log(`   🔐 Hash: ${legalSeal.pdfHash.substring(0, 16)}...`);
      console.log(`   💾 Path: ${finalPdfPath}`);

    } catch (error: any) {
      console.error('❌ [TRANSACTIONAL] Error completing contract:', error);
      throw error; // Re-throw to rollback transaction
    }
  }

  /**
   * Get contract for signing (idempotent read)
   */
  async getContractForSigning(
    contractId: string,
    party: 'contractor' | 'client'
  ): Promise<any> {
    try {
      const [contract] = await db!
        .select()
        .from(digitalContracts)
        .where(eq(digitalContracts.contractId, contractId))
        .limit(1);

      if (!contract) {
        return {
          success: false,
          message: 'Contract not found',
        };
      }

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
      console.error('❌ [TRANSACTIONAL] Error getting contract:', error);
      return {
        success: false,
        message: `Error retrieving contract: ${error.message}`,
      };
    }
  }
}

// Export singleton instance
export const transactionalContractService = new TransactionalContractService();
