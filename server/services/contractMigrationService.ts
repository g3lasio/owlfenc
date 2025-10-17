/**
 * Contract Migration Service: PostgreSQL → Firebase
 * 
 * Migrates all dual-signature contracts from PostgreSQL to Firebase Firestore
 * to eliminate dual-database complexity and ensure data consistency.
 * 
 * Benefits:
 * - Single source of truth
 * - No Firebase UID ↔ PostgreSQL user_id mapping needed
 * - Real-time updates
 * - Built-in rollback support
 * - Simpler maintenance
 */

import { db } from '../db';
import { digitalContracts } from '../../shared/schema';
import { db as firebaseDb } from '../lib/firebase-admin';
import { eq } from 'drizzle-orm';

interface MigrationResult {
  success: boolean;
  totalContracts: number;
  migratedContracts: number;
  skippedContracts: number;
  errors: string[];
  details: {
    contractId: string;
    status: 'migrated' | 'skipped' | 'error';
    reason?: string;
  }[];
}

export class ContractMigrationService {
  /**
   * Migrate all contracts from PostgreSQL to Firebase
   */
  async migrateAllContracts(): Promise<MigrationResult> {
    console.log('🔄 [MIGRATION] Starting contract migration: PostgreSQL → Firebase');
    
    const result: MigrationResult = {
      success: false,
      totalContracts: 0,
      migratedContracts: 0,
      skippedContracts: 0,
      errors: [],
      details: []
    };

    try {
      // 1. Get all contracts from PostgreSQL
      const postgresContracts = await db
        .select()
        .from(digitalContracts)
        .orderBy(digitalContracts.createdAt);

      result.totalContracts = postgresContracts.length;
      console.log(`📊 [MIGRATION] Found ${result.totalContracts} contracts in PostgreSQL`);

      // 2. Migrate each contract (userId in PostgreSQL is already Firebase UID!)
      for (const contract of postgresContracts) {
        try {
          // ✅ CRITICAL FIX: userId in digitalContracts is already Firebase UID (text), no conversion needed!
          const firebaseUid = contract.userId;
          console.log(`✅ [MIGRATION] Contract ${contract.contractId}: Firebase UID ${firebaseUid}`);

          // Check if contract already exists in Firebase
          const existingDoc = await firebaseDb
            .collection('dualSignatureContracts')
            .doc(contract.contractId)
            .get();

          if (existingDoc.exists) {
            console.log(`⏭️ [MIGRATION] Contract ${contract.contractId} already exists in Firebase, skipping`);
            result.skippedContracts++;
            result.details.push({
              contractId: contract.contractId,
              status: 'skipped',
              reason: 'Already exists in Firebase'
            });
            continue;
          }

          // Determine contract status based on signatures
          let status: 'draft' | 'progress' | 'completed';
          if (contract.contractorSigned && contract.clientSigned) {
            status = 'completed';
          } else if (contract.contractorSigned || contract.clientSigned) {
            status = 'progress';
          } else {
            status = 'draft';
          }

          // Prepare Firebase document
          const firebaseContract = {
            contractId: contract.contractId,
            userId: firebaseUid, // ✅ CRITICAL: Use Firebase UID, not PostgreSQL user_id
            clientName: contract.clientName,
            clientEmail: contract.clientEmail || '',
            clientPhone: contract.clientPhone || '',
            totalAmount: parseFloat(contract.totalAmount),
            
            // Signature data
            contractorSigned: contract.contractorSigned,
            clientSigned: contract.clientSigned,
            contractorSignature: contract.contractorSignature,
            clientSignature: contract.clientSignature,
            contractorSignedAt: contract.contractorSignedAt,
            clientSignedAt: contract.clientSignedAt,
            
            // Links
            contractorSignUrl: contract.contractorSignUrl || '',
            clientSignUrl: contract.clientSignUrl || '',
            
            // PDF URLs (permanent Firebase Storage)
            permanentPdfUrl: contract.permanentPdfUrl || '',
            signedPdfPath: contract.signedPdfPath || '',
            
            // Status and metadata
            status,
            createdAt: contract.createdAt,
            updatedAt: new Date(),
            
            // Migration metadata
            migratedFrom: 'postgresql',
            migratedAt: new Date(),
            originalPostgresId: contract.id
          };

          // Save to Firebase
          await firebaseDb
            .collection('dualSignatureContracts')
            .doc(contract.contractId)
            .set(firebaseContract);

          console.log(`✅ [MIGRATION] Migrated contract ${contract.contractId} (${status})`);
          result.migratedContracts++;
          result.details.push({
            contractId: contract.contractId,
            status: 'migrated'
          });

        } catch (contractError: any) {
          const errorMsg = `Error migrating contract ${contract.contractId}: ${contractError.message}`;
          console.error(`❌ [MIGRATION] ${errorMsg}`);
          result.errors.push(errorMsg);
          result.details.push({
            contractId: contract.contractId,
            status: 'error',
            reason: contractError.message
          });
        }
      }

      result.success = result.migratedContracts > 0 || result.skippedContracts === result.totalContracts;
      
      console.log(`✅ [MIGRATION] Complete! Migrated: ${result.migratedContracts}, Skipped: ${result.skippedContracts}, Errors: ${result.errors.length}`);
      
      return result;

    } catch (error: any) {
      console.error('❌ [MIGRATION] Fatal error during migration:', error);
      result.success = false;
      result.errors.push(`Fatal error: ${error.message}`);
      return result;
    }
  }

  /**
   * Verify migration integrity by comparing counts
   */
  async verifyMigration(): Promise<{
    postgresCount: number;
    firebaseCount: number;
    isConsistent: boolean;
    missing: string[];
  }> {
    console.log('🔍 [MIGRATION-VERIFY] Verifying migration integrity...');

    // Get PostgreSQL count
    const postgresContracts = await db.select().from(digitalContracts);
    const postgresCount = postgresContracts.length;

    // Get Firebase count
    const firebaseSnapshot = await firebaseDb
      .collection('dualSignatureContracts')
      .where('migratedFrom', '==', 'postgresql')
      .get();
    const firebaseCount = firebaseSnapshot.docs.length;

    // Find missing contracts
    const postgresIds = new Set(postgresContracts.map(c => c.contractId));
    const firebaseIds = new Set(firebaseSnapshot.docs.map(doc => doc.id));
    
    const missing = Array.from(postgresIds).filter(id => !firebaseIds.has(id));

    const isConsistent = postgresCount === firebaseCount && missing.length === 0;

    console.log(`📊 [MIGRATION-VERIFY] PostgreSQL: ${postgresCount}, Firebase: ${firebaseCount}, Missing: ${missing.length}`);
    
    return {
      postgresCount,
      firebaseCount,
      isConsistent,
      missing
    };
  }
}

export const contractMigrationService = new ContractMigrationService();
