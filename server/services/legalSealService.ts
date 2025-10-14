/**
 * Legal Seal Service
 * Generates legal seals for contract PDFs with folio, hash, IP, and timestamp
 */

import crypto from 'crypto';
import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

export interface LegalSealData {
  folio: string;
  pdfHash: string;
  timestamp: string;
  ipAddress: string;
  contractId: string;
}

class LegalSealService {
  /**
   * Generate unique folio number
   * Format: FOL-YYYYMMDD-XXXXX
   */
  generateFolio(contractId: string): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    return `FOL-${dateStr}-${randomSuffix}`;
  }

  /**
   * Calculate SHA-256 hash of PDF file
   */
  async calculatePdfHash(pdfBuffer: Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(pdfBuffer);
    return hash.digest('hex');
  }

  /**
   * Calculate SHA-256 hash of PDF file from path
   */
  async calculatePdfHashFromFile(pdfPath: string): Promise<string> {
    try {
      const pdfBuffer = await readFile(pdfPath);
      return this.calculatePdfHash(pdfBuffer);
    } catch (error: any) {
      console.error('❌ [LEGAL-SEAL] Error reading PDF file:', error);
      throw new Error(`Failed to read PDF for hashing: ${error.message}`);
    }
  }

  /**
   * Create complete legal seal data
   */
  async createLegalSeal(
    contractId: string,
    pdfBuffer: Buffer,
    ipAddress: string
  ): Promise<LegalSealData> {
    try {
      const folio = this.generateFolio(contractId);
      const pdfHash = await this.calculatePdfHash(pdfBuffer);
      const timestamp = new Date().toISOString();

      const sealData: LegalSealData = {
        folio,
        pdfHash,
        timestamp,
        ipAddress,
        contractId,
      };

      console.log(`✅ [LEGAL-SEAL] Created seal for contract ${contractId}`);
      console.log(`   📋 Folio: ${folio}`);
      console.log(`   🔐 Hash: ${pdfHash.substring(0, 16)}...`);
      console.log(`   🌐 IP: ${ipAddress}`);
      console.log(`   ⏰ Time: ${timestamp}`);

      return sealData;
    } catch (error: any) {
      console.error('❌ [LEGAL-SEAL] Error creating legal seal:', error);
      throw new Error(`Failed to create legal seal: ${error.message}`);
    }
  }

  /**
   * Format legal seal for display in PDF
   */
  formatSealForPdf(sealData: LegalSealData): string {
    return `
      <div style="margin-top: 30px; padding: 15px; border: 2px solid #333; background-color: #f5f5f5;">
        <h3 style="margin: 0 0 10px 0; color: #333;">Legal Certification Seal</h3>
        <div style="font-family: monospace; font-size: 12px;">
          <p style="margin: 5px 0;"><strong>Folio:</strong> ${sealData.folio}</p>
          <p style="margin: 5px 0;"><strong>Contract ID:</strong> ${sealData.contractId}</p>
          <p style="margin: 5px 0;"><strong>Timestamp:</strong> ${new Date(sealData.timestamp).toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>IP Address:</strong> ${sealData.ipAddress}</p>
          <p style="margin: 5px 0;"><strong>Document Hash:</strong> ${sealData.pdfHash}</p>
        </div>
        <p style="margin: 10px 0 0 0; font-size: 10px; color: #666;">
          This seal certifies the authenticity and integrity of this legally binding document. 
          The hash can be used to verify the document has not been tampered with.
        </p>
      </div>
    `;
  }

  /**
   * Verify PDF hash matches the stored hash
   */
  async verifyPdfIntegrity(pdfBuffer: Buffer, storedHash: string): Promise<boolean> {
    try {
      const calculatedHash = await this.calculatePdfHash(pdfBuffer);
      const isValid = calculatedHash === storedHash;

      if (isValid) {
        console.log(`✅ [LEGAL-SEAL] PDF integrity verified`);
      } else {
        console.warn(`🚨 [LEGAL-SEAL] PDF integrity check FAILED`);
        console.warn(`   Expected: ${storedHash}`);
        console.warn(`   Got: ${calculatedHash}`);
      }

      return isValid;
    } catch (error: any) {
      console.error('❌ [LEGAL-SEAL] Error verifying PDF integrity:', error);
      return false;
    }
  }

  /**
   * Generate audit trail entry for legal seal
   */
  createAuditTrailEntry(sealData: LegalSealData, event: string): any {
    return {
      event,
      folio: sealData.folio,
      pdfHash: sealData.pdfHash,
      timestamp: sealData.timestamp,
      ipAddress: sealData.ipAddress,
      contractId: sealData.contractId,
    };
  }
}

// Export singleton instance
export const legalSealService = new LegalSealService();
