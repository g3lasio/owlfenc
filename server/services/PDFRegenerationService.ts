/**
 * PDF REGENERATION SERVICE
 * Simple service to regenerate PDFs with applied signatures
 */

import fs from 'fs/promises';
import path from 'path';

export interface SignatureInfo {
  name: string;
  role: 'contractor' | 'client';
  timestamp: string;
}

export interface PDFRegenerationRequest {
  contractId: string;
  signatureData: string; // base64
  signerInfo: SignatureInfo;
}

export interface PDFRegenerationResult {
  success: boolean;
  downloadUrl: string;
  filePath: string;
  message: string;
}

export class PDFRegenerationService {
  private readonly outputDir: string;

  constructor() {
    this.outputDir = path.join(process.cwd(), 'temp', 'signed-contracts');
    this.ensureOutputDirectory();
  }

  private async ensureOutputDirectory() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create output directory:', error);
    }
  }

  /**
   * Regenerate PDF with signature applied
   */
  async regeneratePDFWithSignature(request: PDFRegenerationRequest): Promise<PDFRegenerationResult> {
    try {
      console.log('📄 [PDF-REGEN] Starting PDF regeneration with signature...');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `signed-contract-${request.contractId}-${request.signerInfo.role}-${timestamp}.pdf`;
      const filePath = path.join(this.outputDir, fileName);
      
      // For now, create a simple PDF with signature info
      // In production, this would use a proper PDF library to embed the signature
      const pdfContent = this.generateSignedPDFContent(request);
      
      await fs.writeFile(filePath, pdfContent);

      const downloadUrl = `/api/neural-signature/download-signed-pdf/${encodeURIComponent(fileName)}`;

      console.log('✅ [PDF-REGEN] PDF regenerated successfully:', fileName);

      return {
        success: true,
        downloadUrl,
        filePath,
        message: `PDF regenerated with ${request.signerInfo.role} signature applied`
      };

    } catch (error) {
      console.error('❌ [PDF-REGEN] Failed to regenerate PDF:', error);
      return {
        success: false,
        downloadUrl: '',
        filePath: '',
        message: `PDF regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate signed PDF content (simplified for demo)
   */
  private generateSignedPDFContent(request: PDFRegenerationRequest): string {
    return `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj

4 0 obj
<< /Length 200 >>
stream
BT
/F1 12 Tf
50 750 Td
(SIGNED CONTRACT - ${request.contractId}) Tj
0 -20 Td
(Signed by: ${request.signerInfo.name}) Tj
0 -20 Td
(Role: ${request.signerInfo.role}) Tj
0 -20 Td
(Date: ${request.signerInfo.timestamp}) Tj
0 -20 Td
(Signature Applied: Yes) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000053 00000 n
0000000125 00000 n
0000000185 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
395
%%EOF
    `;
  }

  /**
   * Get signed PDF file
   */
  async getSignedPDF(fileName: string): Promise<Buffer | null> {
    try {
      const filePath = path.join(this.outputDir, fileName);
      const content = await fs.readFile(filePath);
      return content;
    } catch (error) {
      console.error('❌ [PDF-REGEN] Failed to read signed PDF:', error);
      return null;
    }
  }

  /**
   * Clean up old signed PDFs
   */
  async cleanupOldFiles(maxAgeHours: number = 24) {
    try {
      const files = await fs.readdir(this.outputDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.outputDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log('🗑️ [PDF-REGEN] Cleaned up old file:', file);
        }
      }
    } catch (error) {
      console.error('❌ [PDF-REGEN] Cleanup failed:', error);
    }
  }
}