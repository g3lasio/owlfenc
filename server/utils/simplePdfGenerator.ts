import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Simple PDF Generator - Fallback when all other PDF services fail
 * Creates basic PDF from text content with professional formatting
 */
export async function createSimplePdfFromText(textContent: string, options: {
  title?: string;
  contractId?: string;
} = {}): Promise<Buffer> {
  try {
    console.log('📄 [SIMPLE-PDF] Creating fallback PDF from text content...');
    
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
    
    // Add signature notice
    currentPage.drawText('*** DIGITALLY SIGNED CONTRACT ***', {
      x: 50,
      y: yPosition,
      size: 14,
      font: helveticaBold,
      color: rgb(0, 0.5, 0),
    });
    yPosition -= 40;
    
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
    
    // Add footer to last page
    const lastPage = pdfDoc.getPages()[pdfDoc.getPages().length - 1];
    lastPage.drawText('*** END OF SIGNED CONTRACT ***', {
      x: 50,
      y: 50,
      size: 12,
      font: helveticaBold,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    // Generate PDF buffer
    const pdfBytes = await pdfDoc.save();
    console.log('✅ [SIMPLE-PDF] Simple PDF generated successfully from text content');
    
    return Buffer.from(pdfBytes);
    
  } catch (error: any) {
    console.error('❌ [SIMPLE-PDF] Failed to create simple PDF:', error.message);
    throw new Error(`Simple PDF generation failed: ${error.message}`);
  }
}