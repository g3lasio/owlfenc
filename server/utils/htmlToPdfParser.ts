import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface ContractContent {
  title: string;
  parties: {
    contractor: string;
    client: string;
  };
  sections: Array<{
    title: string;
    content: string;
  }>;
  signatures: {
    contractor?: string;
    client?: string;
    contractorDate?: string;
    clientDate?: string;
  };
}

/**
 * Parses HTML contract content to extract meaningful structure
 */
export function parseContractHtml(htmlContent: string): ContractContent {
  console.log('📝 [HTML-PARSER] Parsing contract HTML content for structured PDF generation');
  
  // First, clean ALL problematic characters that cause WinAnsi encoding errors
  let cleanContent = htmlContent
    .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]/g, '')  // Remove ALL emojis
    .replace(/[^\x00-\x7F]/g, '')  // Remove ALL non-ASCII characters
    .replace(/[\u2018\u2019]/g, "'")  // Replace smart quotes
    .replace(/[\u201C\u201D]/g, '"')  // Replace smart double quotes
    .replace(/[\u2013\u2014]/g, '-')  // Replace em/en dashes
    .replace(/[\u2026]/g, '...')      // Replace ellipsis
    .replace(/[\u00A0]/g, ' ');       // Replace non-breaking spaces
  
  // Remove all CSS styles and script tags
  let cleanHtml = cleanContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/style="[^"]*"/gi, '')
    .replace(/class="[^"]*"/gi, '');

  // Extract contract title
  const titleMatch = cleanHtml.match(/<h1[^>]*>(.*?)<\/h1>/i) || 
                    cleanHtml.match(/Independent Contractor Agreement/i);
  const title = titleMatch ? (titleMatch[1] || 'Independent Contractor Agreement').trim() : 'Signed Contract';

  // Extract contractor and client information
  const contractor = extractPartyInfo(cleanHtml, 'contractor') || 'OWL FENC';
  const client = extractPartyInfo(cleanHtml, 'client') || 'Client';

  // Extract main content sections
  const sections = extractContractSections(cleanHtml);

  // Extract signature information
  const signatures = extractSignatureInfo(cleanHtml);

  return {
    title,
    parties: { contractor, client },
    sections,
    signatures
  };
}

function extractPartyInfo(html: string, type: 'contractor' | 'client'): string {
  if (type === 'contractor') {
    const contractorMatch = html.match(/Business Name:\s*([^<\n]+)/i) ||
                           html.match(/Contractor[^:]*:\s*([^<\n]+)/i) ||
                           html.match(/OWL FENC/i);
    return contractorMatch ? contractorMatch[1]?.trim() || 'OWL FENC' : 'OWL FENC';
  } else {
    const clientMatch = html.match(/Client Full Name[^:]*:\s*([^<\n]+)/i) ||
                       html.match(/Client[^:]*:\s*([^<\n]+)/i);
    return clientMatch ? clientMatch[1]?.trim() || 'Client' : 'Client';
  }
}

function extractContractSections(html: string): Array<{ title: string; content: string }> {
  const sections: Array<{ title: string; content: string }> = [];
  
  // Remove HTML tags but preserve structure
  const textContent = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into logical sections based on numbered headings
  const sectionRegex = /(\d+\.\s*[A-Z\s]+?)(?=\d+\.|$)/g;
  let match;
  
  while ((match = sectionRegex.exec(textContent)) !== null) {
    const sectionText = match[0].trim();
    if (sectionText.length > 20) {
      const lines = sectionText.split(/\s+/);
      const title = lines.slice(0, 5).join(' ').replace(/^\d+\.\s*/, '');
      const content = lines.slice(5).join(' ');
      
      if (title && content) {
        sections.push({
          title: title.trim(),
          content: content.trim()
        });
      }
    }
  }

  // If no numbered sections found, create general sections
  if (sections.length === 0) {
    const words = textContent.split(/\s+/);
    const chunkSize = 200;
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 50) {
        sections.push({
          title: `Section ${Math.floor(i / chunkSize) + 1}`,
          content: chunk.trim()
        });
      }
    }
  }

  return sections;
}

function extractSignatureInfo(html: string): any {
  const signatures: any = {};
  
  // Look for signature dates
  const contractorDateMatch = html.match(/contractor[^<]*date[^<]*?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (contractorDateMatch) {
    signatures.contractorDate = contractorDateMatch[1];
  }
  
  const clientDateMatch = html.match(/client[^<]*date[^<]*?(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (clientDateMatch) {
    signatures.clientDate = clientDateMatch[1];
  }

  return signatures;
}

/**
 * Creates a professional PDF from parsed contract content
 */
export async function createStructuredPdf(content: ContractContent, contractId?: string): Promise<Buffer> {
  console.log('📄 [STRUCTURED-PDF] Creating professional PDF from parsed contract content');
  
  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  let currentPage = pdfDoc.addPage();
  const { width, height } = currentPage.getSize();
  let yPosition = height - 50;
  
  // Document header
  currentPage.drawText(content.title.toUpperCase(), {
    x: width / 2 - (timesBold.widthOfTextAtSize(content.title.toUpperCase(), 18) / 2),
    y: yPosition,
    size: 18,
    font: timesBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 30;
  
  // Contract ID
  if (contractId) {
    currentPage.drawText(`Contract ID: ${contractId}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    yPosition -= 25;
  }
  
  // Parties section
  currentPage.drawText('PARTIES TO THIS AGREEMENT', {
    x: 50,
    y: yPosition,
    size: 14,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 25;
  
  currentPage.drawText(`Contractor: ${content.parties.contractor}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;
  
  currentPage.drawText(`Client: ${content.parties.client}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= 40;
  
  // Contract sections
  for (const section of content.sections) {
    // Check if we need a new page
    if (yPosition < 100) {
      currentPage = pdfDoc.addPage();
      yPosition = height - 50;
    }
    
    // Section title
    currentPage.drawText(section.title.toUpperCase(), {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;
    
    // Section content - wrap text
    const maxWidth = width - 100;
    const words = section.content.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = helveticaFont.widthOfTextAtSize(testLine, 10);
      
      if (textWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word);
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Draw content lines
    for (const line of lines) {
      if (yPosition < 50) {
        currentPage = pdfDoc.addPage();
        yPosition = height - 50;
      }
      
      currentPage.drawText(line, {
        x: 50,
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;
    }
    
    yPosition -= 20; // Space between sections
  }
  
  // Signatures section
  if (content.signatures.contractorDate || content.signatures.clientDate) {
    if (yPosition < 150) {
      currentPage = pdfDoc.addPage();
      yPosition = height - 50;
    }
    
    currentPage.drawText('DIGITAL SIGNATURES', {
      x: 50,
      y: yPosition,
      size: 14,
      font: helveticaBold,
      color: rgb(0, 0.5, 0),
    });
    yPosition -= 30;
    
    if (content.signatures.contractorDate) {
      currentPage.drawText(`Contractor Signed: ${content.signatures.contractorDate}`, {
        x: 50,
        y: yPosition,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
    }
    
    if (content.signatures.clientDate) {
      currentPage.drawText(`Client Signed: ${content.signatures.clientDate}`, {
        x: 50,
        y: yPosition,
        size: 11,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  console.log('✅ [STRUCTURED-PDF] Professional PDF generated successfully');
  return Buffer.from(pdfBytes);
}