import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as cheerio from 'cheerio';

/**
 * CRITICAL: Converts HTML to PDF maintaining EXACT original format
 * This preserves the Independent Contractor Agreement format exactly as shown in HTML
 */
export async function convertHtmlToExactPdf(htmlContent: string, options: {
  title?: string;
  contractId?: string;
} = {}): Promise<Buffer> {
  try {
    console.log('📄 [HTML-TO-PDF] Converting HTML to PDF maintaining EXACT original format');
    
    // Load HTML with cheerio for parsing
    const $ = cheerio.load(htmlContent);
    
    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
    // Extract text content while preserving structure
    const textContent = extractFormattedText(htmlContent);
    
    // Create pages based on content length
    let currentPage = pdfDoc.addPage();
    const { width, height } = currentPage.getSize();
    let yPosition = height - 50;
    const leftMargin = 50;
    const rightMargin = width - 50;
    const lineHeight = 12;
    
    // Process each line maintaining original formatting
    for (const line of textContent.lines) {
      // Check if we need a new page
      if (yPosition < 50) {
        // Add page number at bottom of current page
        const pageNumber = pdfDoc.getPageCount();
        const pageText = `Page ${pageNumber}`;
        const pageTextWidth = timesFont.widthOfTextAtSize(pageText, 10);
        currentPage.drawText(pageText, {
          x: width / 2 - pageTextWidth / 2,
          y: 20,
          size: 10,
          font: timesFont,
          color: rgb(0.5, 0.5, 0.5),
        });
        
        currentPage = pdfDoc.addPage();
        yPosition = height - 50;
      }
      
      // Determine font and positioning based on line type
      let font = timesFont;
      let fontSize = 12;
      let xPosition = leftMargin;
      
      if (line.type === 'header') {
        font = timesBold;
        fontSize = 18;
        // Center the header
        const textWidth = font.widthOfTextAtSize(line.text, fontSize);
        xPosition = width / 2 - textWidth / 2;
        yPosition -= 10; // Extra space before header
      } else if (line.type === 'title') {
        font = timesBold;
        fontSize = 14;
        yPosition -= 5; // Extra space before titles
      } else if (line.type === 'section-header') {
        font = timesBold;
        fontSize = 12;
        yPosition -= 8;
      } else if (line.type === 'date') {
        fontSize = 12;
        // Center the date
        const textWidth = font.widthOfTextAtSize(line.text, fontSize);
        xPosition = width / 2 - textWidth / 2;
      } else if (line.type === 'contractor-info' || line.type === 'client-info') {
        fontSize = 11;
        if (line.type === 'client-info') {
          xPosition = width / 2 + 10; // Right column for client
        }
      }
      
      // Draw the text
      currentPage.drawText(line.text, {
        x: xPosition,
        y: yPosition,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= lineHeight;
      
      // Add extra space after certain elements
      if (line.type === 'header') {
        yPosition -= 10;
        // Draw line under header
        currentPage.drawLine({
          start: { x: leftMargin, y: yPosition + 5 },
          end: { x: rightMargin, y: yPosition + 5 },
          thickness: 2,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
      } else if (line.type === 'section-header') {
        yPosition -= 5;
      }
    }
    
    // Add final page number
    const finalPageNumber = pdfDoc.getPageCount();
    const finalPageText = `Page ${finalPageNumber} of ${finalPageNumber}`;
    const finalPageTextWidth = timesFont.widthOfTextAtSize(finalPageText, 10);
    currentPage.drawText(finalPageText, {
      x: width / 2 - finalPageTextWidth / 2,
      y: 20,
      size: 10,
      font: timesFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    const pdfBytes = await pdfDoc.save();
    console.log('✅ [HTML-TO-PDF] PDF generated maintaining EXACT original format');
    return Buffer.from(pdfBytes);
    
  } catch (error: any) {
    console.error('❌ [HTML-TO-PDF] Error converting to PDF:', error.message);
    throw error;
  }
}

interface FormattedLine {
  text: string;
  type: 'header' | 'title' | 'section-header' | 'date' | 'contractor-info' | 'client-info' | 'content' | 'signature';
}

function extractFormattedText(html: string): { lines: FormattedLine[] } {
  const lines: FormattedLine[] = [];
  
  // Clean HTML
  let cleanHtml = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]/g, '')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
  
  // Split by lines and process
  const htmlLines = cleanHtml.split(/\n+/);
  
  for (let htmlLine of htmlLines) {
    htmlLine = htmlLine.trim();
    if (!htmlLine) continue;
    
    // Remove HTML tags but keep text
    let textLine = htmlLine.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!textLine) continue;
    
    // Determine line type based on content
    let type: FormattedLine['type'] = 'content';
    
    if (textLine.includes('INDEPENDENT CONTRACTOR AGREEMENT')) {
      type = 'header';
    } else if (textLine.includes('Agreement Date:')) {
      type = 'date';
    } else if (textLine.match(/^\d+\.\s+[A-Z\s]+$/)) {
      type = 'section-header';
    } else if (textLine.includes('CONTRACTOR') || textLine.includes('CLIENT')) {
      if (textLine.includes('Business Name:') || textLine.includes('Full Name')) {
        type = textLine.includes('Business Name:') ? 'contractor-info' : 'client-info';
      } else {
        type = 'title';
      }
    } else if (textLine.includes('WHEREAS') || textLine.includes('NOW, THEREFORE')) {
      type = 'section-header';
    }
    
    lines.push({ text: textLine, type });
  }
  
  return { lines };
}