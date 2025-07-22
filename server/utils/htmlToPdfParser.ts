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
  let textContent = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract specific contract sections with better pattern matching
  const contractSections = [
    { 
      pattern: /(\d+\.\s*SCOPE OF WORK[^]*?)(?=\d+\.\s*[A-Z]|$)/i,
      title: "SCOPE OF WORK"
    },
    {
      pattern: /(\d+\.\s*CONTRACT PRICE[^]*?)(?=\d+\.\s*[A-Z]|$)/i,
      title: "CONTRACT PRICE AND PAYMENT TERMS"
    },
    {
      pattern: /(\d+\.\s*COMMENCEMENT[^]*?)(?=\d+\.\s*[A-Z]|$)/i,
      title: "COMMENCEMENT AND COMPLETION"
    },
    {
      pattern: /(\d+\.\s*INDEPENDENT CONTRACTOR[^]*?)(?=\d+\.\s*[A-Z]|$)/i,
      title: "INDEPENDENT CONTRACTOR STATUS"
    },
    {
      pattern: /(\d+\.\s*MATERIALS[^]*?)(?=\d+\.\s*[A-Z]|$)/i,
      title: "MATERIALS, EQUIPMENT, AND WORKMANSHIP"
    },
    {
      pattern: /(\d+\.\s*INSURANCE[^]*?)(?=\d+\.\s*[A-Z]|$)/i,
      title: "INSURANCE AND LIABILITY"
    },
    {
      pattern: /(\d+\.\s*CHANGE ORDERS[^]*?)(?=\d+\.\s*[A-Z]|$)/i,
      title: "CHANGE ORDERS AND MODIFICATIONS"
    },
    {
      pattern: /(\d+\.\s*PERMITS[^]*?)(?=\d+\.\s*[A-Z]|$)/i,
      title: "PERMITS, LICENSES, AND CODE COMPLIANCE"
    },
    {
      pattern: /(\d+\.\s*WARRANTY[^]*?)(?=\d+\.\s*[A-Z]|$)/i,
      title: "WARRANTY AND REMEDIES"
    },
    {
      pattern: /(\d+\.\s*DEFAULT[^]*?)(?=\d+\.\s*[A-Z]|$)/i,
      title: "DEFAULT AND TERMINATION"
    },
    {
      pattern: /(\d+\.\s*DISPUTE[^]*?)(?=\d+\.\s*[A-Z]|$)/i,
      title: "DISPUTE RESOLUTION"
    },
    {
      pattern: /(\d+\.\s*SAFETY[^]*?)(?=\d+\.\s*[A-Z]|$)/i,
      title: "SAFETY AND COMPLIANCE"
    },
    {
      pattern: /(\d+\.\s*GOVERNING LAW[^]*?)(?=\d+\.\s*[A-Z]|$)/i,
      title: "GOVERNING LAW AND JURISDICTION"
    }
  ];

  // Try to extract specific sections
  for (const section of contractSections) {
    const match = textContent.match(section.pattern);
    if (match) {
      const content = match[1]
        .replace(/^\d+\.\s*[A-Z\s]+/i, '') // Remove section number and title
        .trim()
        .substring(0, 800); // Limit content length
      
      if (content.length > 50) {
        sections.push({
          title: section.title,
          content: content
        });
      }
    }
  }

  // If no specific sections found, use simple numbered pattern
  if (sections.length === 0) {
    const simplePattern = /(\d+\.\s*[A-Z][A-Z\s]*?)([^]*?)(?=\d+\.\s*[A-Z]|$)/g;
    let match;
    
    while ((match = simplePattern.exec(textContent)) !== null && sections.length < 8) {
      const title = match[1].replace(/^\d+\.\s*/, '').trim();
      const content = match[2].trim().substring(0, 400);
      
      if (title.length > 3 && content.length > 50) {
        sections.push({
          title: title,
          content: content
        });
      }
    }
  }

  // Final fallback - create manageable chunks
  if (sections.length === 0) {
    const words = textContent.split(/\s+/);
    const chunkSize = 150; // Smaller chunks
    
    for (let i = 0; i < Math.min(words.length, 1000) && sections.length < 6; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 50) {
        sections.push({
          title: `Contract Section ${sections.length + 1}`,
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
  
  // Contract sections with better formatting
  for (let i = 0; i < content.sections.length && i < 8; i++) { // Limit to 8 sections
    const section = content.sections[i];
    
    // Check if we need a new page
    if (yPosition < 120) {
      currentPage = pdfDoc.addPage();
      yPosition = height - 50;
    }
    
    // Section number and title
    const sectionTitle = `${i + 1}. ${section.title}`;
    currentPage.drawText(sectionTitle.toUpperCase(), {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    yPosition -= 25;
    
    // Section content - wrap text with better formatting
    const maxWidth = width - 100;
    const words = section.content.split(' ').slice(0, 80); // Limit words per section
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
          // Word too long, truncate it
          lines.push(word.substring(0, 40));
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Limit lines per section
    const limitedLines = lines.slice(0, 8);
    
    // Draw content lines
    for (const line of limitedLines) {
      if (yPosition < 50) {
        currentPage = pdfDoc.addPage();
        yPosition = height - 50;
      }
      
      currentPage.drawText(line, {
        x: 55, // Slight indent
        y: yPosition,
        size: 10,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 14;
    }
    
    yPosition -= 15; // Space between sections
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