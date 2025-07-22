import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Creates PDF from HTML while preserving the original contract formatting
 * This maintains the professional layout instead of restructuring the content
 */
export async function createPdfFromFormattedHtml(htmlContent: string, options: {
  title?: string;
  contractId?: string;
} = {}): Promise<Buffer> {
  try {
    console.log('📄 [HTML-PRESERVING-PDF] Creating PDF while maintaining original contract structure');
    
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
    let currentPage = pdfDoc.addPage();
    const { width, height } = currentPage.getSize();
    let yPosition = height - 50;
    
    // Clean HTML but preserve structure markers
    let processedContent = htmlContent
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove CSS
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]/g, '') // Remove emojis
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
      .replace(/[\u2018\u2019]/g, "'") // Smart quotes
      .replace(/[\u201C\u201D]/g, '"'); // Smart double quotes
    
    // Extract text segments with basic formatting preservation
    const segments = extractFormattedSegments(processedContent);
    
    // Document header if we have a title
    if (options.title) {
      const title = options.title.toUpperCase();
      const titleWidth = timesBold.widthOfTextAtSize(title, 16);
      currentPage.drawText(title, {
        x: width / 2 - titleWidth / 2,
        y: yPosition,
        size: 16,
        font: timesBold,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;
    }
    
    // Contract ID
    if (options.contractId) {
      currentPage.drawText(`Contract ID: ${options.contractId}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });
      yPosition -= 25;
    }
    
    // Process each segment maintaining original structure
    for (const segment of segments) {
      if (yPosition < 80) {
        currentPage = pdfDoc.addPage();
        yPosition = height - 50;
      }
      
      // Determine font and size based on segment type
      let font = helveticaFont;
      let fontSize = 10;
      
      if (segment.isHeader) {
        font = helveticaBold;
        fontSize = 12;
        yPosition -= 10; // Extra space before headers
      } else if (segment.isTitle) {
        font = timesBold;
        fontSize = 14;
        yPosition -= 15; // Extra space before titles
      }
      
      // Word wrap the content
      const maxWidth = width - 100;
      const lines = wrapText(segment.text, font, fontSize, maxWidth);
      
      // Draw the lines
      for (const line of lines) {
        if (yPosition < 50) {
          currentPage = pdfDoc.addPage();
          yPosition = height - 50;
        }
        
        currentPage.drawText(line, {
          x: 50,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
        yPosition -= fontSize + 4;
      }
      
      // Add spacing after segments
      if (segment.isHeader || segment.isTitle) {
        yPosition -= 10;
      } else {
        yPosition -= 5;
      }
    }
    
    const pdfBytes = await pdfDoc.save();
    console.log('✅ [HTML-PRESERVING-PDF] PDF generated successfully while preserving original structure');
    return Buffer.from(pdfBytes);
    
  } catch (error: any) {
    console.error('❌ [HTML-PRESERVING-PDF] Failed to generate PDF:', error.message);
    throw error;
  }
}

interface TextSegment {
  text: string;
  isHeader: boolean;
  isTitle: boolean;
}

function extractFormattedSegments(html: string): TextSegment[] {
  const segments: TextSegment[] = [];
  
  // Split HTML into logical parts while preserving some structure
  const parts = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '|||TITLE|||$1|||TITLE|||')
    .replace(/<h[2-6][^>]*>(.*?)<\/h[2-6]>/gi, '|||HEADER|||$1|||HEADER|||')
    .replace(/<\/p>/gi, '|||PARA|||')
    .replace(/<br\s*\/?>/gi, '|||BREAK|||')
    .split(/\|\|\|/);
  
  let currentText = '';
  let isHeader = false;
  let isTitle = false;
  
  for (const part of parts) {
    if (part === 'TITLE') {
      if (currentText.trim()) {
        segments.push({ text: currentText.trim(), isHeader: false, isTitle: true });
        currentText = '';
      }
      isTitle = true;
      isHeader = false;
    } else if (part === 'HEADER') {
      if (currentText.trim()) {
        segments.push({ text: currentText.trim(), isHeader: isHeader, isTitle: isTitle });
        currentText = '';
      }
      isHeader = true;
      isTitle = false;
    } else if (part === 'PARA' || part === 'BREAK') {
      if (currentText.trim()) {
        segments.push({ text: currentText.trim(), isHeader: isHeader, isTitle: isTitle });
        currentText = '';
        isHeader = false;
        isTitle = false;
      }
    } else {
      // Remove HTML tags from the text content
      const cleanText = part
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanText) {
        currentText += (currentText ? ' ' : '') + cleanText;
      }
    }
  }
  
  // Add final segment if exists
  if (currentText.trim()) {
    segments.push({ text: currentText.trim(), isHeader: isHeader, isTitle: isTitle });
  }
  
  // Filter out very short segments that are likely formatting artifacts
  return segments.filter(segment => segment.text.length > 3);
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (textWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word is too long, split it
        const maxChars = Math.floor(maxWidth / (fontSize * 0.6));
        lines.push(word.substring(0, maxChars));
        currentLine = word.substring(maxChars);
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.filter(line => line.trim().length > 0);
}