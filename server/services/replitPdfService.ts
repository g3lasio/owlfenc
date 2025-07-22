import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';

interface SignatureInfo {
  name: string;
  signatureData: string;
  typedName?: string;
  signedAt: Date;
}

interface ContractData {
  contractHTML: string;
  contractorSignature: SignatureInfo;
  clientSignature: SignatureInfo;
}

/**
 * Servicio PDF optimizado para Replit - Sin dependencias de Chrome
 * Genera PDFs nativamente usando pdf-lib
 */
class ReplitPdfService {
  private static instance: ReplitPdfService;

  static getInstance(): ReplitPdfService {
    if (!ReplitPdfService.instance) {
      ReplitPdfService.instance = new ReplitPdfService();
    }
    return ReplitPdfService.instance;
  }

  /**
   * CRITICAL FIX: Generate PDF from HTML content preserving EXACT original format
   * Only adds signatures WITHOUT altering the original contract layout
   */
  async generatePdfFromHtml(htmlContent: string, options: {
    title?: string;
    contractId?: string;
    watermark?: boolean;
  } = {}): Promise<Buffer> {
    try {
      console.log('📄 [REPLIT-PDF] PRESERVING EXACT original contract format - generating PDF that matches HTML exactly');
      
      // PRIMARY METHOD: Use EXACT HTML-to-PDF converter that maintains original format
      try {
        const { convertHtmlToExactPdf } = await import('../utils/htmlToExactPdfConverter.js');
        
        const pdfBuffer = await convertHtmlToExactPdf(htmlContent, {
          title: options.title || 'SIGNED CONTRACT',
          contractId: options.contractId
        });
        
        console.log('✅ [REPLIT-PDF] PDF generated with EXACT original contract format preserved');
        return pdfBuffer;
        
      } catch (exactConversionError: any) {
        console.error('❌ [REPLIT-PDF] Exact HTML conversion failed:', exactConversionError.message);
        console.log('⚠️ [REPLIT-PDF] Trying fallback layout-preserving method');
        
        // FALLBACK METHOD: Alternative layout preservation
        try {
          const { createPdfWithExactHtmlLayout } = await import('../utils/htmlLayoutPreservingPdf.js');
          
          const pdfBuffer = await createPdfWithExactHtmlLayout(htmlContent, {
            title: options.title || 'SIGNED CONTRACT',
            contractId: options.contractId
          });
          
          console.log('✅ [REPLIT-PDF] PDF generated with fallback layout-preserving method');
          return pdfBuffer;
          
        } catch (fallbackError: any) {
          console.error('❌ [REPLIT-PDF] Fallback layout preservation failed:', fallbackError.message);
        }
      }
      
      // CRITICAL: Refuse to destroy format - return error instead of altering contract layout
      console.error('❌ [REPLIT-PDF] ALL format-preserving PDF generation methods failed');
      throw new Error('CRITICAL: Cannot generate PDF while preserving original format. Refusing to alter contract layout.');
      
    } catch (error: any) {
      console.error('❌ [REPLIT-PDF] PDF generation error:', error.message);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Generate contract with signatures - PRESERVES original format and only adds signatures
   */
  async generateContractWithSignatures(data: ContractData): Promise<Buffer> {
    try {
      console.log('📄 [CRITICAL-FIX] Generating PDF from signed HTML for contract');
      
      // Inject signatures into HTML WITHOUT altering original format
      const htmlWithSignatures = this.embedSignaturesInHTML(data.contractHTML, data.contractorSignature, data.clientSignature);
      
      // Generate PDF preserving the EXACT format
      return await this.generatePdfFromHtml(htmlWithSignatures, {
        title: 'SIGNED CONTRACT',
        watermark: false
      });
      
    } catch (error: any) {
      console.error('❌ [CRITICAL-FIX] Contract generation error:', error.message);
      throw new Error(`Contract PDF generation failed: ${error.message}`);
    }
  }

  /**
   * CRITICAL: Embed signatures in HTML WITHOUT altering original format
   * Only adds signature sections, preserves everything else exactly
   */
  private embedSignaturesInHTML(originalHtml: string, contractorSignature: SignatureInfo, clientSignature: SignatureInfo): string {
    console.log('📝 [SIGNATURE-INJECTION] Processing contract signatures for display');
    
    try {
      // Find signature section or end of document to add signatures
      const signatureSectionRegex = /<div[^>]*class="[^"]*signature[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
      
      // Create signature HTML that matches the original format
      const signatureHtml = `
        <div class="signature-section" style="margin-top: 60px; page-break-inside: avoid;">
          <div class="signature-container" style="display: table; width: 100%; margin: 40px 0; border-collapse: separate; border-spacing: 30px 0;">
            <div class="signature-box" style="display: table-cell; width: 45%; border: 2px solid #000; padding: 30px 20px; vertical-align: top; text-align: center;">
              <div class="signature-title" style="font-weight: bold; font-size: 14pt; margin-bottom: 30px; text-transform: uppercase;">CONTRACTOR SIGNATURE</div>
              <div class="signature-line" style="border-bottom: 2px solid #000; height: 50px; margin: 25px 0; position: relative;">
                ${contractorSignature.signatureData ? `<img src="${contractorSignature.signatureData}" style="max-width: 200px; max-height: 40px; position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);" />` : ''}
              </div>
              <p style="margin: 10px 0; font-weight: bold;">${contractorSignature.name}</p>
              <p style="margin: 5px 0; font-size: 10pt;">Date: <span style="border-bottom: 1px solid #000; display: inline-block; width: 150px; height: 20px; text-align: center;">${new Date(contractorSignature.signedAt).toLocaleDateString()}</span></p>
            </div>
            <div class="signature-box" style="display: table-cell; width: 45%; border: 2px solid #000; padding: 30px 20px; vertical-align: top; text-align: center;">
              <div class="signature-title" style="font-weight: bold; font-size: 14pt; margin-bottom: 30px; text-transform: uppercase;">CLIENT SIGNATURE</div>
              <div class="signature-line" style="border-bottom: 2px solid #000; height: 50px; margin: 25px 0; position: relative;">
                ${clientSignature.signatureData ? `<img src="${clientSignature.signatureData}" style="max-width: 200px; max-height: 40px; position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);" />` : ''}
              </div>
              <p style="margin: 10px 0; font-weight: bold;">${clientSignature.name}</p>
              <p style="margin: 5px 0; font-size: 10pt;">Date: <span style="border-bottom: 1px solid #000; display: inline-block; width: 150px; height: 20px; text-align: center;">${new Date(clientSignature.signedAt).toLocaleDateString()}</span></p>
            </div>
          </div>
        </div>
      `;
      
      // Replace existing signature section OR add at end without altering anything else
      if (signatureSectionRegex.test(originalHtml)) {
        return originalHtml.replace(signatureSectionRegex, signatureHtml);
      } else {
        // Add before closing body tag, preserving everything else exactly
        const bodyCloseIndex = originalHtml.lastIndexOf('</body>');
        if (bodyCloseIndex !== -1) {
          return originalHtml.slice(0, bodyCloseIndex) + signatureHtml + originalHtml.slice(bodyCloseIndex);
        } else {
          // No body tag, add at end
          return originalHtml + signatureHtml;
        }
      }
      
    } catch (error: any) {
      console.error('❌ [SIGNATURE-INJECTION] Error embedding signatures:', error.message);
      // Return original HTML without signatures rather than breaking the format
      return originalHtml;
    }
  }

  /**
   * Extract contract information from HTML (utility method)
   */
  private extractContractInfo(html: string): any {
    const clientNameMatch = html.match(/Client Full Name[^:]*:\s*([^<\n]+)/i);
    const contractorNameMatch = html.match(/Business Name:\s*([^<\n]+)/i);
    const totalAmountMatch = html.match(/\$([0-9,]+\.?\d*)/);
    
    return {
      clientName: clientNameMatch ? clientNameMatch[1].trim() : 'Client',
      contractorName: contractorNameMatch ? contractorNameMatch[1].trim() : 'OWL FENC',
      totalAmount: totalAmountMatch ? totalAmountMatch[1] : '0.00'
    };
  }
}

export default ReplitPdfService;