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
   * Adds a dedicated seal page with folio, verification URL, and signing metadata.
   * The hash is NOT embedded in the PDF to avoid self-reference paradox.
   * Instead, the hash is calculated on the final PDF and stored server-side.
   */
  async appendSealPage(
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
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      
      // Load existing PDF
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Add new page for legal seal
      const page = pdfDoc.addPage([612, 792]); // Letter size
      const { width, height } = page.getSize();
      
      // Colors
      const darkBlue = rgb(0.1, 0.21, 0.36);
      const gray = rgb(0.29, 0.33, 0.39);
      const lightGray = rgb(0.4, 0.45, 0.5);
      
      // Draw header
      page.drawRectangle({
        x: 40,
        y: height - 100,
        width: width - 80,
        height: 60,
        color: darkBlue,
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
        color: gray,
      });
      
      page.drawText(`Contract ID: ${contractId.substring(0, 20)}...`, {
        x: 50,
        y: folioY - 20,
        size: 10,
        font: helvetica,
        color: lightGray,
      });
      
      // Draw signing info sections
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
      
      // Contractor section
      const contractorY = folioY - 80;
      page.drawRectangle({
        x: 40,
        y: contractorY - 80,
        width: 250,
        height: 100,
        borderColor: darkBlue,
        borderWidth: 1,
      });
      
      page.drawText('CONTRACTOR SIGNATURE', {
        x: 50,
        y: contractorY,
        size: 11,
        font: helveticaBold,
        color: darkBlue,
      });
      
      page.drawText(`Name: ${signingMetadata.contractorName}`, {
        x: 50,
        y: contractorY - 20,
        size: 10,
        font: helvetica,
        color: gray,
      });
      
      page.drawText(`IP: ${signingMetadata.contractorIp}`, {
        x: 50,
        y: contractorY - 35,
        size: 9,
        font: helvetica,
        color: lightGray,
      });
      
      page.drawText(`Signed: ${formatDate(signingMetadata.contractorSignedAt)}`, {
        x: 50,
        y: contractorY - 50,
        size: 9,
        font: helvetica,
        color: lightGray,
      });
      
      // Client section
      page.drawRectangle({
        x: 310,
        y: contractorY - 80,
        width: 250,
        height: 100,
        borderColor: darkBlue,
        borderWidth: 1,
      });
      
      page.drawText('CLIENT SIGNATURE', {
        x: 320,
        y: contractorY,
        size: 11,
        font: helveticaBold,
        color: darkBlue,
      });
      
      page.drawText(`Name: ${signingMetadata.clientName}`, {
        x: 320,
        y: contractorY - 20,
        size: 10,
        font: helvetica,
        color: gray,
      });
      
      page.drawText(`IP: ${signingMetadata.clientIp}`, {
        x: 320,
        y: contractorY - 35,
        size: 9,
        font: helvetica,
        color: lightGray,
      });
      
      page.drawText(`Signed: ${formatDate(signingMetadata.clientSignedAt)}`, {
        x: 320,
        y: contractorY - 50,
        size: 9,
        font: helvetica,
        color: lightGray,
      });
      
      // Verification section
      const verifyY = contractorY - 140;
      page.drawRectangle({
        x: 40,
        y: verifyY - 60,
        width: width - 80,
        height: 70,
        color: rgb(0.95, 0.95, 0.97),
        borderColor: darkBlue,
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
        color: darkBlue,
      });
      
      page.drawText('Or scan the QR code at app.owlfenc.com/verify and enter the folio number.', {
        x: 50,
        y: verifyY - 50,
        size: 8,
        font: helvetica,
        color: lightGray,
      });
      
      // Legal disclaimer footer
      const disclaimerY = 80;
      page.drawText('This document was digitally signed by both parties. The signatures, timestamps, and IP', {
        x: 50,
        y: disclaimerY,
        size: 9,
        font: helvetica,
        color: lightGray,
      });
      page.drawText('addresses above serve as legal evidence of consent. Document integrity is verified via', {
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
      
      page.drawText(`Generated: ${new Date().toISOString()}`, {
        x: 50,
        y: disclaimerY - 45,
        size: 8,
        font: helvetica,
        color: lightGray,
      });
      
      // Save and return
      const finalPdfBytes = await pdfDoc.save();
      console.log(`✅ [LEGAL-SEAL] Appended seal page to PDF (${pdfBuffer.length} → ${finalPdfBytes.length} bytes)`);
      
      return Buffer.from(finalPdfBytes);
      
    } catch (error: any) {
      console.error('❌ [LEGAL-SEAL] Error appending seal page:', error);
      throw new Error(`Failed to append seal page: ${error.message}`);
    }
  }
}

// Export singleton instance
export const legalSealService = new LegalSealService();
