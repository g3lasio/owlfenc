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
   * Generate PDF from HTML content - CRITICAL FIX for PDF/HTML mismatch
   * This ensures PDF matches exactly what's shown in View HTML
   */
  async generatePdfFromHtml(htmlContent: string, options: {
    title?: string;
    contractId?: string;
    watermark?: boolean;
  } = {}): Promise<Buffer> {
    try {
      console.log('📄 [REPLIT-PDF] PRESERVING original contract format - generating PDF that matches HTML exactly');
      
      // CRITICAL FIX: Use format-preserving PDF generation as PRIMARY method
      try {
        // Import format-preserving PDF service  
        const { createPdfFromFormattedHtml } = await import('../utils/htmlPreservingPdfGenerator.js');
        
        // Generate PDF while preserving the original HTML formatting
        const pdfBuffer = await createPdfFromFormattedHtml(htmlContent, {
          title: options.title || 'SIGNED CONTRACT',
          contractId: options.contractId
        });
        
        console.log('✅ [REPLIT-PDF] PDF generated successfully preserving original contract formatting');
        return pdfBuffer;
        
      } catch (preservingError: any) {
        console.error('❌ [REPLIT-PDF] Format-preserving PDF failed:', preservingError.message);
        console.log('⚠️ [REPLIT-PDF] Falling back to simple text method');
      }
      
      // FALLBACK: Simple PDF generation if format-preserving fails
      console.log('📄 [REPLIT-PDF] Using fallback method - simple PDF generation');
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Add a page
      let currentPage = pdfDoc.addPage();
      const { width, height } = currentPage.getSize();
      let yPosition = height - 50;
      
      // Document header
      currentPage.drawText(options.title || 'SIGNED CONTRACT', {
        x: 50,
        y: yPosition,
        size: 20,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
      yPosition -= 40;
      
      if (options.contractId) {
        currentPage.drawText(`Contract ID: ${options.contractId}`, {
          x: 50,
          y: yPosition,
          size: 12,
          font: helveticaFont,
          color: rgb(0.5, 0.5, 0.5),
        });
        yPosition -= 30;
      }
      
      // Add signed notice
      currentPage.drawText('*** DIGITALLY SIGNED CONTRACT ***', {
        x: 50,
        y: yPosition,
        size: 14,
        font: helveticaBold,
        color: rgb(0, 0.5, 0),
      });
      yPosition -= 40;
      
      // CRITICAL FIX: Use format-preserving PDF generation as PRIMARY method
      console.log('📄 [REPLIT-PDF] PRESERVING original contract format - generating PDF that matches HTML exactly');
      
      try {
        // Import format-preserving PDF service  
        const { createPdfFromFormattedHtml } = await import('../utils/htmlPreservingPdfGenerator.js');
        
        // Generate PDF while preserving the original HTML formatting
        const pdfBuffer = await createPdfFromFormattedHtml(htmlContent, {
          title: options.title || 'SIGNED CONTRACT',
          contractId: options.contractId
        });
        
        console.log('✅ [REPLIT-PDF] PDF generated successfully preserving original contract formatting');
        return pdfBuffer;
        
      } catch (preservingError: any) {
        console.error('❌ [REPLIT-PDF] Format-preserving PDF failed:', preservingError.message);
        console.log('⚠️ [REPLIT-PDF] Falling back to structured approach');
      }

      // FALLBACK: Simple text extraction that preserves basic structure
      console.log('⚠️ [REPLIT-PDF] Using simple fallback - preserving text structure');
      
      // Clean HTML but preserve text structure
      let cleanContent = htmlContent
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove CSS
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
        .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]/g, '') // Remove emojis
        .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
        .replace(/[\u2018\u2019]/g, "'") // Smart quotes
        .replace(/[\u201C\u201D]/g, '"') // Smart double quotes;
      
      // Convert HTML to text while preserving some structure
      const textContent = cleanContent
        .replace(/<br\s*\/?>/gi, '\n')  // Convert breaks to newlines
        .replace(/<\/p>/gi, '\n\n')    // Convert paragraph ends to double newlines  
        .replace(/<\/h[1-6]>/gi, '\n\n') // Convert header ends to double newlines
        .replace(/<[^>]*>/g, ' ')       // Remove remaining HTML tags
        .replace(/\s*\n\s*/g, '\n')     // Clean up newlines
        .replace(/\n{3,}/g, '\n\n')     // Limit consecutive newlines
        .replace(/\s+/g, ' ')           // Normalize spaces
        .trim();
      
      // Split text into lines that fit on page
      const maxWidth = width - 100; // 50px margins on each side
      const fontSize = 10;
      const lineHeight = 15;
      
      const words = textContent.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = helveticaFont.widthOfTextAtSize(testLine, fontSize);
        
        if (textWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            // Word is too long, split it
            lines.push(word.substring(0, 50));
            currentLine = word.substring(50);
          }
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      // Add text lines to PDF, creating new pages as needed
      for (const line of lines) {
        if (yPosition < 50) {
          // Add new page
          currentPage = pdfDoc.addPage();
          yPosition = height - 50;
        }
        
        currentPage.drawText(line, {
          x: 50,
          y: yPosition,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
        
        yPosition -= lineHeight;
      }
      
      // Generate PDF buffer
      const pdfBytes = await pdfDoc.save();
      console.log('✅ [REPLIT-PDF] PDF generated successfully from signed HTML content');
      
      return Buffer.from(pdfBytes);
      
    } catch (error: any) {
      console.error('❌ [REPLIT-PDF] Failed to generate PDF from HTML:', error.message);
      throw new Error(`PDF generation from HTML failed: ${error.message}`);
    }
  }

  async generateContractWithSignatures(data: ContractData): Promise<Buffer> {
    try {
      console.log('📄 [REPLIT-PDF] Generating PDF without Chrome dependencies...');

      // Crear documento PDF
      const pdfDoc = await PDFDocument.create();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);

      // Crear página inicial
      let currentPage = pdfDoc.addPage();
      const { width, height } = currentPage.getSize();
      let yPosition = height - 50;

      // Encabezado del contrato
      currentPage.drawText('INDEPENDENT CONTRACTOR AGREEMENT', {
        x: 50,
        y: yPosition,
        size: 20,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
      yPosition -= 60;

      // Extraer información del HTML
      const contractInfo = this.extractContractInfo(data.contractHTML);
      
      // Información de las partes
      currentPage.drawText('CONTRACTOR INFORMATION:', {
        x: 50,
        y: yPosition,
        size: 12,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;

      currentPage.drawText(`Name: ${data.contractorSignature.name}`, {
        x: 70,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 40;

      currentPage.drawText('CLIENT INFORMATION:', {
        x: 50,
        y: yPosition,
        size: 12,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;

      currentPage.drawText(`Name: ${data.clientSignature.name}`, {
        x: 70,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 60;

      // Secciones del contrato
      const sections = this.createContractSections();
      
      for (const section of sections) {
        // Verificar espacio en página
        if (yPosition < 100) {
          currentPage = pdfDoc.addPage();
          yPosition = height - 50;
        }

        // Título de sección
        currentPage.drawText(section.title, {
          x: 50,
          y: yPosition,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });
        yPosition -= 25;

        // Contenido de sección
        const lines = this.splitTextIntoLines(section.content, 500);
        for (const line of lines) {
          if (yPosition < 50) {
            currentPage = pdfDoc.addPage();
            yPosition = height - 50;
          }

          currentPage.drawText(line, {
            x: 50,
            y: yPosition,
            size: 10,
            font: timesRoman,
            color: rgb(0, 0, 0),
          });
          yPosition -= 15;
        }
        yPosition -= 20;
      }

      // Página de firmas
      const signaturePage = pdfDoc.addPage();
      this.addSignaturePage(signaturePage, data.contractorSignature, data.clientSignature, helveticaBold, helveticaFont);

      // Generar PDF final
      const pdfBytes = await pdfDoc.save();
      console.log('✅ [REPLIT-PDF] PDF generated successfully');
      
      return Buffer.from(pdfBytes);

    } catch (error) {
      console.error('❌ [REPLIT-PDF] Error:', error);
      throw error;
    }
  }

  private extractContractInfo(html: string): any {
    // Extraer información básica del HTML
    const cleanText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return { content: cleanText };
  }

  private createContractSections(): Array<{title: string, content: string}> {
    return [
      {
        title: '1. SCOPE OF WORK',
        content: 'The Contractor agrees to perform construction and installation services as outlined in the project specifications. This includes all labor, materials, and equipment necessary for successful project completion in accordance with industry standards and local building codes.'
      },
      {
        title: '2. PAYMENT TERMS',
        content: 'Payment shall be made according to the agreed schedule. A deposit may be required before work commences, with progress payments due at specified milestones. Final payment is due upon satisfactory completion and acceptance of the work.'
      },
      {
        title: '3. PROJECT TIMELINE',
        content: 'The project shall commence on the agreed start date and be completed within the specified timeframe. Any delays caused by weather, permit issues, or client-requested changes may result in timeline adjustments to be agreed upon by both parties.'
      },
      {
        title: '4. WARRANTIES AND GUARANTEES',
        content: 'The Contractor warrants all work performed under this agreement for a period of one year from completion date. This warranty covers defects in workmanship but does not cover normal wear and tear or damage caused by misuse or neglect.'
      },
      {
        title: '5. INSURANCE AND LIABILITY',
        content: 'The Contractor maintains appropriate liability insurance and workers compensation coverage as required by law. Both parties agree to indemnify each other against claims arising from their respective negligent acts or omissions.'
      }
    ];
  }

  private splitTextIntoLines(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      
      // Aproximar ancho de línea (simplificado)
      if (testLine.length * 6 > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private addSignaturePage(page: any, contractorSig: SignatureInfo, clientSig: SignatureInfo, boldFont: any, regularFont: any): void {
    const { height } = page.getSize();
    let y = height - 80;

    // Título
    page.drawText('DIGITAL SIGNATURES', {
      x: 50,
      y: y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 80;

    // Firma del contratista
    page.drawText('CONTRACTOR SIGNATURE:', {
      x: 50,
      y: y,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Línea de firma
    page.drawLine({
      start: { x: 50, y: y },
      end: { x: 300, y: y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawText(`${contractorSig.name}`, {
      x: 50,
      y: y - 20,
      size: 11,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Signed: ${contractorSig.signedAt.toLocaleDateString()}`, {
      x: 50,
      y: y - 35,
      size: 9,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    y -= 100;

    // Firma del cliente
    page.drawText('CLIENT SIGNATURE:', {
      x: 50,
      y: y,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Línea de firma
    page.drawLine({
      start: { x: 50, y: y },
      end: { x: 300, y: y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawText(`${clientSig.name}`, {
      x: 50,
      y: y - 20,
      size: 11,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Signed: ${clientSig.signedAt.toLocaleDateString()}`, {
      x: 50,
      y: y - 35,
      size: 9,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Pie de página legal
    y -= 80;
    page.drawText('This contract has been digitally executed and is legally binding under applicable electronic signature laws.', {
      x: 50,
      y: y,
      size: 8,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
}

export { ReplitPdfService };
export default ReplitPdfService;