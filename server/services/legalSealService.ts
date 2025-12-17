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

/**
 * Dynamic signer representation for template-driven certificates.
 * The certificate renders ONLY the signers in this array.
 */
export interface CertificateSigner {
  role: string; // e.g., "CONTRACTOR", "CLIENT", "AUTHORIZED SIGNER"
  name: string;
  ip: string;
  signedAt: Date;
}

/**
 * Signature mode determines how many signers are expected.
 * - 'single': Only one signer (e.g., Lien Waiver - contractor only)
 * - 'dual': Both parties must sign (e.g., Independent Contractor Agreement)
 */
export type SignatureMode = 'single' | 'dual';

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
  calculatePdfHash(pdfBuffer: Buffer): string {
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

      console.log(`✅ [LEGAL-SEAL] Created seal for contract ${contractId} (folio: ${folio})`);

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

  /**
   * Append legal seal page to PDF using pdf-lib
   * 
   * TEMPLATE-DRIVEN: Renders ONLY the actual signers.
   * - Single signature templates: One centered card
   * - Dual signature templates: Two side-by-side cards
   * 
   * The certificate is a "source of authority" - it shows exactly what happened.
   */
  async appendSealPage(
    pdfBuffer: Buffer,
    folio: string,
    contractId: string,
    signers: CertificateSigner[]
  ): Promise<Buffer> {
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      
      // Load existing PDF
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Add new page for legal seal
      const page = pdfDoc.addPage([612, 792]); // Letter size
      const { width, height } = page.getSize();
      
      // Colors - Modern palette with subtle cyan accents
      const darkBlue = rgb(0.1, 0.21, 0.36);
      const accentCyan = rgb(0.18, 0.55, 0.67); // Subtle cyan for accents
      const gray = rgb(0.29, 0.33, 0.39);
      const lightGray = rgb(0.4, 0.45, 0.5);
      const cardBg = rgb(0.98, 0.99, 1.0);
      
      // Draw header with subtle gradient effect (solid color approximation)
      page.drawRectangle({
        x: 40,
        y: height - 100,
        width: width - 80,
        height: 60,
        color: darkBlue,
      });
      
      // Subtle accent line under header
      page.drawRectangle({
        x: 40,
        y: height - 102,
        width: width - 80,
        height: 3,
        color: accentCyan,
      });
      
      page.drawText('DIGITAL CERTIFICATE OF AUTHENTICITY', {
        x: width / 2 - 150,
        y: height - 75,
        size: 16,
        font: helveticaBold,
        color: rgb(1, 1, 1),
      });
      
      // Draw folio box
      const folioY = height - 150;
      page.drawText('Document Folio:', {
        x: 50,
        y: folioY,
        size: 12,
        font: helveticaBold,
        color: darkBlue,
      });
      
      page.drawText(folio, {
        x: 160,
        y: folioY,
        size: 14,
        font: helveticaBold,
        color: accentCyan,
      });
      
      const contractIdDisplay = contractId.length > 25 
        ? `${contractId.substring(0, 25)}...` 
        : contractId;
      page.drawText(`Contract ID: ${contractIdDisplay}`, {
        x: 50,
        y: folioY - 20,
        size: 10,
        font: helvetica,
        color: lightGray,
      });
      
      // Draw signing info sections - DYNAMIC based on actual signers
      const formatDate = (date: Date): string => {
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        });
      };
      
      const cardTopY = folioY - 70;
      const cardHeight = 110;
      const cardWidth = 250;
      
      console.log(`📋 [LEGAL-SEAL] Rendering ${signers.length} signer(s) on certificate`);
      
      // Helper to draw a single signer card at a given position
      const drawSignerCard = (signer: CertificateSigner, cardX: number, cardY: number) => {
        // Card shadow
        page.drawRectangle({
          x: cardX + 2,
          y: cardY - cardHeight - 2,
          width: cardWidth,
          height: cardHeight,
          color: rgb(0.9, 0.9, 0.92),
        });
        
        // Card background
        page.drawRectangle({
          x: cardX,
          y: cardY - cardHeight,
          width: cardWidth,
          height: cardHeight,
          color: cardBg,
          borderColor: accentCyan,
          borderWidth: 1.5,
        });
        
        // Accent bar at top of card
        page.drawRectangle({
          x: cardX,
          y: cardY - 3,
          width: cardWidth,
          height: 3,
          color: accentCyan,
        });
        
        page.drawText(signer.role, {
          x: cardX + 15,
          y: cardY - 25,
          size: 11,
          font: helveticaBold,
          color: darkBlue,
        });
        
        page.drawText(`Name: ${signer.name}`, {
          x: cardX + 15,
          y: cardY - 50,
          size: 10,
          font: helvetica,
          color: gray,
        });
        
        page.drawText(`IP: ${signer.ip}`, {
          x: cardX + 15,
          y: cardY - 67,
          size: 9,
          font: helvetica,
          color: lightGray,
        });
        
        page.drawText(`Signed: ${formatDate(signer.signedAt)}`, {
          x: cardX + 15,
          y: cardY - 84,
          size: 9,
          font: helvetica,
          color: lightGray,
        });
      };
      
      // Calculate layout positions based on signer count
      let currentY = cardTopY;
      
      if (signers.length === 0) {
        // Zero signers - informational document (signatureType: 'none')
        // Render compliance notice instead of signer cards
        page.drawRectangle({
          x: 40,
          y: currentY - 60,
          width: width - 80,
          height: 50,
          color: rgb(0.97, 0.98, 1.0),
          borderColor: darkBlue,
          borderWidth: 1,
        });
        
        page.drawText('DOCUMENT RECORD', {
          x: 50,
          y: currentY - 20,
          size: 11,
          font: helveticaBold,
          color: darkBlue,
        });
        
        page.drawText('This document does not require signatures. It is provided for informational purposes.', {
          x: 50,
          y: currentY - 40,
          size: 9,
          font: helvetica,
          color: gray,
        });
        
        currentY -= 80;
        
      } else if (signers.length === 1) {
        // Single signer - centered card
        const cardX = (width - cardWidth) / 2;
        drawSignerCard(signers[0], cardX, currentY);
        currentY -= cardHeight + 20;
        
      } else if (signers.length === 2) {
        // Two signers - side by side
        const leftCardX = 40;
        const rightCardX = 320;
        
        drawSignerCard(signers[0], leftCardX, currentY);
        drawSignerCard(signers[1], rightCardX, currentY);
        currentY -= cardHeight + 20;
        
      } else {
        // 3+ signers - grid layout (2 per row)
        for (let i = 0; i < signers.length; i += 2) {
          const leftCardX = 40;
          const rightCardX = 320;
          
          // Draw left card
          drawSignerCard(signers[i], leftCardX, currentY);
          
          // Draw right card if exists
          if (i + 1 < signers.length) {
            drawSignerCard(signers[i + 1], rightCardX, currentY);
          }
          
          currentY -= cardHeight + 15;
        }
      }
      
      // Verification section - position below all signer cards
      const verifyY = currentY - 30;
      page.drawRectangle({
        x: 40,
        y: verifyY - 60,
        width: width - 80,
        height: 70,
        color: rgb(0.97, 0.98, 1.0),
        borderColor: accentCyan,
        borderWidth: 1,
      });
      
      page.drawText('VERIFICATION', {
        x: 50,
        y: verifyY,
        size: 11,
        font: helveticaBold,
        color: darkBlue,
      });
      
      // Build verification URL with folio
      const verificationUrl = `https://app.owlfenc.com/verify?folio=${encodeURIComponent(folio)}`;
      
      page.drawText('To verify this document, visit:', {
        x: 50,
        y: verifyY - 18,
        size: 10,
        font: helvetica,
        color: gray,
      });
      
      page.drawText(verificationUrl, {
        x: 50,
        y: verifyY - 35,
        size: 9,
        font: helveticaBold,
        color: accentCyan,
      });
      
      page.drawText('Or scan the QR code at app.owlfenc.com/verify and enter the folio number.', {
        x: 50,
        y: verifyY - 50,
        size: 8,
        font: helvetica,
        color: lightGray,
      });
      
      // Legal disclaimer footer - dynamic based on signer count
      const disclaimerY = 80;
      
      if (signers.length === 0) {
        // Informational document disclaimer
        page.drawText('This document is provided for informational purposes. Document integrity is verified via', {
          x: 50,
          y: disclaimerY,
          size: 9,
          font: helvetica,
          color: lightGray,
        });
        page.drawText('SHA-256 hash stored in our secure database.', {
          x: 50,
          y: disclaimerY - 12,
          size: 9,
          font: helvetica,
          color: lightGray,
        });
      } else {
        // Signed document disclaimer
        const signerCountText = signers.length === 1 
          ? 'This document was digitally signed by the authorized party.' 
          : `This document was digitally signed by ${signers.length === 2 ? 'both parties' : 'all parties'}.`;
        
        page.drawText(`${signerCountText} The signature(s), timestamp(s), and IP`, {
          x: 50,
          y: disclaimerY,
          size: 9,
          font: helvetica,
          color: lightGray,
        });
        page.drawText('address(es) above serve as legal evidence of consent. Document integrity is verified via', {
          x: 50,
          y: disclaimerY - 12,
          size: 9,
          font: helvetica,
          color: lightGray,
        });
        page.drawText('SHA-256 hash stored in our secure database.', {
          x: 50,
          y: disclaimerY - 24,
          size: 9,
          font: helvetica,
          color: lightGray,
        });
      }
      
      page.drawText(`Generated: ${new Date().toISOString()}`, {
        x: 50,
        y: disclaimerY - 45,
        size: 8,
        font: helvetica,
        color: lightGray,
      });
      
      // Save and return
      const finalPdfBytes = await pdfDoc.save();
      console.log(`✅ [LEGAL-SEAL] Appended seal page to PDF with ${signers.length} signer(s) (${pdfBuffer.length} → ${finalPdfBytes.length} bytes)`);
      
      return Buffer.from(finalPdfBytes);
      
    } catch (error: any) {
      console.error('❌ [LEGAL-SEAL] Error appending seal page:', error);
      throw new Error(`Failed to append seal page: ${error.message}`);
    }
  }

  /**
   * LEGACY WRAPPER: Converts old dual-signature format to new dynamic format
   * For backward compatibility with existing code that uses the old signature
   */
  async appendSealPageLegacy(
    pdfBuffer: Buffer,
    folio: string,
    contractId: string,
    signingMetadata: {
      contractorName: string;
      contractorIp: string;
      contractorSignedAt: Date;
      clientName: string;
      clientIp: string;
      clientSignedAt: Date;
    }
  ): Promise<Buffer> {
    // Convert legacy format to new signer array format
    const signers: CertificateSigner[] = [
      {
        role: 'CONTRACTOR SIGNATURE',
        name: signingMetadata.contractorName,
        ip: signingMetadata.contractorIp,
        signedAt: signingMetadata.contractorSignedAt,
      },
      {
        role: 'CLIENT SIGNATURE',
        name: signingMetadata.clientName,
        ip: signingMetadata.clientIp,
        signedAt: signingMetadata.clientSignedAt,
      },
    ];
    
    return this.appendSealPage(pdfBuffer, folio, contractId, signers);
  }
}

// Export singleton instance
export const legalSealService = new LegalSealService();
