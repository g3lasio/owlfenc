/**
 * SIGNATURE STORAGE SERVICE
 * Robust signature collection and storage with audit trail
 */

export interface SignatureData {
  contractId: string;
  signerName: string;
  signerRole: 'contractor' | 'client';
  signatureType: 'canvas' | 'typed';
  signatureData: string; // Base64 image for canvas, typed name for text
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
  };
}

export interface ContractSignatures {
  contractId: string;
  contractorSignature?: SignatureData;
  clientSignature?: SignatureData;
  status: 'pending' | 'contractor-signed' | 'client-signed' | 'fully-signed';
  createdAt: string;
  lastUpdatedAt: string;
}

export class SignatureStorageService {
  private signatures = new Map<string, ContractSignatures>();

  /**
   * Initialize contract signature tracking
   */
  initializeContract(contractId: string): ContractSignatures {
    const contractSignatures: ContractSignatures = {
      contractId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    };
    
    this.signatures.set(contractId, contractSignatures);
    console.log(`📝 [SIGNATURE-STORAGE] Contract ${contractId} initialized for signature collection`);
    
    return contractSignatures;
  }

  /**
   * Store signature for contract
   */
  storeSignature(contractId: string, signatureData: SignatureData): boolean {
    try {
      let contractSignatures = this.signatures.get(contractId);
      
      // Initialize if not exists
      if (!contractSignatures) {
        contractSignatures = this.initializeContract(contractId);
      }

      // Store signature based on role
      if (signatureData.signerRole === 'contractor') {
        contractSignatures.contractorSignature = signatureData;
        console.log(`✅ [SIGNATURE-STORAGE] Contractor signature stored for ${contractId}`);
      } else if (signatureData.signerRole === 'client') {
        contractSignatures.clientSignature = signatureData;
        console.log(`✅ [SIGNATURE-STORAGE] Client signature stored for ${contractId}`);
      }

      // Update status
      contractSignatures.lastUpdatedAt = new Date().toISOString();
      contractSignatures.status = this.calculateStatus(contractSignatures);

      this.signatures.set(contractId, contractSignatures);
      
      console.log(`📊 [SIGNATURE-STORAGE] Contract ${contractId} status: ${contractSignatures.status}`);
      
      return true;
    } catch (error) {
      console.error(`❌ [SIGNATURE-STORAGE] Failed to store signature for ${contractId}:`, error);
      return false;
    }
  }

  /**
   * Get contract signatures
   */
  getContractSignatures(contractId: string): ContractSignatures | null {
    return this.signatures.get(contractId) || null;
  }

  /**
   * Check if contract is fully signed
   */
  isFullySigned(contractId: string): boolean {
    const signatures = this.getContractSignatures(contractId);
    return signatures?.status === 'fully-signed' || false;
  }

  /**
   * Get signature by role
   */
  getSignatureByRole(contractId: string, role: 'contractor' | 'client'): SignatureData | null {
    const signatures = this.getContractSignatures(contractId);
    if (!signatures) return null;
    
    return role === 'contractor' ? signatures.contractorSignature || null : signatures.clientSignature || null;
  }

  /**
   * Calculate contract status based on signatures
   */
  private calculateStatus(signatures: ContractSignatures): 'pending' | 'contractor-signed' | 'client-signed' | 'fully-signed' {
    const hasContractor = !!signatures.contractorSignature;
    const hasClient = !!signatures.clientSignature;
    
    if (hasContractor && hasClient) {
      return 'fully-signed';
    } else if (hasContractor) {
      return 'contractor-signed';
    } else if (hasClient) {
      return 'client-signed';
    } else {
      return 'pending';
    }
  }

  /**
   * Get all contracts with their signature status
   */
  getAllContracts(): ContractSignatures[] {
    return Array.from(this.signatures.values());
  }

  /**
   * Export signature data for legal audit
   */
  exportSignatureAuditTrail(contractId: string): any {
    const signatures = this.getContractSignatures(contractId);
    if (!signatures) return null;

    return {
      contractId,
      status: signatures.status,
      createdAt: signatures.createdAt,
      lastUpdatedAt: signatures.lastUpdatedAt,
      contractorSignature: signatures.contractorSignature ? {
        signerName: signatures.contractorSignature.signerName,
        signatureType: signatures.contractorSignature.signatureType,
        timestamp: signatures.contractorSignature.timestamp,
        ipAddress: signatures.contractorSignature.ipAddress,
        deviceInfo: signatures.contractorSignature.deviceInfo
      } : null,
      clientSignature: signatures.clientSignature ? {
        signerName: signatures.clientSignature.signerName,
        signatureType: signatures.clientSignature.signatureType,
        timestamp: signatures.clientSignature.timestamp,
        ipAddress: signatures.clientSignature.ipAddress,
        deviceInfo: signatures.clientSignature.deviceInfo
      } : null,
      auditGenerated: new Date().toISOString()
    };
  }
}

export const signatureStorage = new SignatureStorageService();