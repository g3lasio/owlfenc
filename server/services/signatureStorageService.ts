import fs from 'fs/promises';
import path from 'path';

/**
 * Signature Storage Service
 * Handles secure storage and retrieval of digital signatures for contract processing
 */

export interface SignatureRecord {
  contractId: string;
  role: 'contractor' | 'client';
  action: 'approve' | 'reject';
  signatureName?: string;
  signatureData?: string; // Base64 image data
  reason?: string; // For rejections
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface StorageResult {
  success: boolean;
  signatureId?: string;
  error?: string;
}

class SignatureStorageService {
  private storageDir: string;

  constructor() {
    this.storageDir = path.join(process.cwd(), 'temp', 'signatures');
    this.ensureStorageDirectory();
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      console.error('❌ [SIGNATURE-STORAGE] Failed to create storage directory:', error);
    }
  }

  /**
   * Store a signature record
   */
  async storeSignature(record: SignatureRecord): Promise<StorageResult> {
    try {
      console.log('💾 [SIGNATURE-STORAGE] Storing signature record...');
      console.log('📄 [SIGNATURE-STORAGE] Contract ID:', record.contractId);
      console.log('👤 [SIGNATURE-STORAGE] Role:', record.role);
      console.log('✅ [SIGNATURE-STORAGE] Action:', record.action);

      // Generate unique signature ID
      const signatureId = `SIG-${record.contractId}-${record.role}-${Date.now()}`;
      
      // Prepare storage record
      const storageRecord = {
        ...record,
        signatureId,
        storedAt: new Date().toISOString()
      };

      // Store as JSON file
      const filename = `${signatureId}.json`;
      const filepath = path.join(this.storageDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(storageRecord, null, 2), 'utf8');
      
      console.log('✅ [SIGNATURE-STORAGE] Signature stored successfully');
      console.log('📁 [SIGNATURE-STORAGE] File:', filename);

      return {
        success: true,
        signatureId
      };
    } catch (error) {
      console.error('❌ [SIGNATURE-STORAGE] Failed to store signature:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown storage error'
      };
    }
  }

  /**
   * Retrieve all signatures for a contract
   */
  async getContractSignatures(contractId: string): Promise<SignatureRecord[]> {
    try {
      console.log('🔍 [SIGNATURE-STORAGE] Retrieving signatures for contract:', contractId);
      
      await this.ensureStorageDirectory();
      
      const files = await fs.readdir(this.storageDir);
      const contractFiles = files.filter(file => 
        file.startsWith(`SIG-${contractId}`) && file.endsWith('.json')
      );

      const signatures: SignatureRecord[] = [];

      for (const file of contractFiles) {
        try {
          const filepath = path.join(this.storageDir, file);
          const content = await fs.readFile(filepath, 'utf8');
          const record = JSON.parse(content);
          signatures.push(record);
        } catch (error) {
          console.warn('⚠️ [SIGNATURE-STORAGE] Failed to read signature file:', file, error);
        }
      }

      console.log('📊 [SIGNATURE-STORAGE] Found', signatures.length, 'signatures for contract', contractId);
      return signatures;
    } catch (error) {
      console.error('❌ [SIGNATURE-STORAGE] Failed to retrieve signatures:', error);
      return [];
    }
  }

  /**
   * Get signature by signature ID
   */
  async getSignatureById(signatureId: string): Promise<SignatureRecord | null> {
    try {
      const filepath = path.join(this.storageDir, `${signatureId}.json`);
      const content = await fs.readFile(filepath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('⚠️ [SIGNATURE-STORAGE] Signature not found:', signatureId);
      return null;
    }
  }

  /**
   * Check if both contractor and client have signed a contract
   */
  async isContractFullySigned(contractId: string): Promise<boolean> {
    try {
      const signatures = await this.getContractSignatures(contractId);
      
      const contractorApproval = signatures.find(sig => 
        sig.role === 'contractor' && sig.action === 'approve'
      );
      
      const clientApproval = signatures.find(sig => 
        sig.role === 'client' && sig.action === 'approve'
      );

      const isFullySigned = !!(contractorApproval && clientApproval);
      
      console.log('🔍 [SIGNATURE-STORAGE] Contract', contractId, 'fully signed:', isFullySigned);
      console.log('👷 [SIGNATURE-STORAGE] Contractor approved:', !!contractorApproval);
      console.log('👤 [SIGNATURE-STORAGE] Client approved:', !!clientApproval);

      return isFullySigned;
    } catch (error) {
      console.error('❌ [SIGNATURE-STORAGE] Failed to check contract status:', error);
      return false;
    }
  }

  /**
   * Get contract signature status summary
   */
  async getContractStatus(contractId: string): Promise<{
    contractorSigned: boolean;
    clientSigned: boolean;
    contractorRejected: boolean;
    clientRejected: boolean;
    fullySigned: boolean;
    rejected: boolean;
  }> {
    try {
      const signatures = await this.getContractSignatures(contractId);
      
      const contractorApproval = signatures.find(sig => 
        sig.role === 'contractor' && sig.action === 'approve'
      );
      
      const clientApproval = signatures.find(sig => 
        sig.role === 'client' && sig.action === 'approve'
      );

      const contractorRejection = signatures.find(sig => 
        sig.role === 'contractor' && sig.action === 'reject'
      );
      
      const clientRejection = signatures.find(sig => 
        sig.role === 'client' && sig.action === 'reject'
      );

      return {
        contractorSigned: !!contractorApproval,
        clientSigned: !!clientApproval,
        contractorRejected: !!contractorRejection,
        clientRejected: !!clientRejection,
        fullySigned: !!(contractorApproval && clientApproval),
        rejected: !!(contractorRejection || clientRejection)
      };
    } catch (error) {
      console.error('❌ [SIGNATURE-STORAGE] Failed to get contract status:', error);
      return {
        contractorSigned: false,
        clientSigned: false,
        contractorRejected: false,
        clientRejected: false,
        fullySigned: false,
        rejected: false
      };
    }
  }

  /**
   * Clean old signature files (older than 30 days)
   */
  async cleanOldSignatures(): Promise<void> {
    try {
      console.log('🧹 [SIGNATURE-STORAGE] Cleaning old signature files...');
      
      await this.ensureStorageDirectory();
      
      const files = await fs.readdir(this.storageDir);
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const filepath = path.join(this.storageDir, file);
          const stats = await fs.stat(filepath);
          
          if (stats.mtime.getTime() < thirtyDaysAgo) {
            await fs.unlink(filepath);
            deletedCount++;
          }
        } catch (error) {
          console.warn('⚠️ [SIGNATURE-STORAGE] Failed to process file during cleanup:', file);
        }
      }

      console.log('✅ [SIGNATURE-STORAGE] Cleanup completed. Deleted', deletedCount, 'old files');
    } catch (error) {
      console.error('❌ [SIGNATURE-STORAGE] Failed to clean old signatures:', error);
    }
  }
}

export const signatureStorageService = new SignatureStorageService();