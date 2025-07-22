import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * CRITICAL FIX: Creates PDF that EXACTLY matches the HTML preview layout
 * This preserves the EXACT visual structure instead of converting to plain text
 */
export async function createPdfWithExactHtmlLayout(htmlContent: string, options: {
  title?: string;
  contractId?: string;
} = {}): Promise<Buffer> {
  try {
    console.log('🎯 [EXACT-LAYOUT-PDF] Creating PDF that EXACTLY matches HTML preview structure');
    
    const pdfDoc = await PDFDocument.create();
    const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let currentPage = pdfDoc.addPage();
    const { width, height } = currentPage.getSize();
    let yPosition = height - 50;
    
    // Extract the contract layout structure from HTML
    const contractStructure = parseContractLayoutStructure(htmlContent);
    
    // 1. CENTERED HEADER SECTION (exactly like HTML)
    if (contractStructure.header) {
      const headerText = contractStructure.header.title;
      const headerWidth = timesBold.widthOfTextAtSize(headerText, 18);
      
      // Center the header exactly like HTML
      currentPage.drawText(headerText, {
        x: width / 2 - headerWidth / 2,
        y: yPosition,
        size: 18,
        font: timesBold,
        color: rgb(0, 0, 0),
      });
      yPosition -= 25;
      
      // Add header bottom border (like HTML border-bottom: 2px solid #000)
      currentPage.drawLine({
        start: { x: 50, y: yPosition },
        end: { x: width - 50, y: yPosition },
        thickness: 2,
        color: rgb(0, 0, 0),
      });
      yPosition -= 30;
      
      // Agreement date (centered, like HTML)
      if (contractStructure.header.date) {
        const dateText = contractStructure.header.date;
        const dateWidth = timesFont.widthOfTextAtSize(dateText, 12);
        currentPage.drawText(dateText, {
          x: width / 2 - dateWidth / 2,
          y: yPosition,
          size: 12,
          font: timesFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 40;
      }
    }
    
    // 2. TWO-COLUMN CONTRACTOR/CLIENT SECTION (exactly like HTML)
    if (contractStructure.parties) {
      const columnWidth = (width - 120) / 2; // 50px margins + 20px gap
      const leftColumnX = 50;
      const rightColumnX = width / 2 + 10;
      
      // CONTRACTOR column (left)
      if (contractStructure.parties.contractor) {
        currentPage.drawText('CONTRACTOR', {
          x: leftColumnX,
          y: yPosition,
          size: 14,
          font: timesBold,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
        
        const contractorLines = contractStructure.parties.contractor;
        for (const line of contractorLines) {
          currentPage.drawText(line, {
            x: leftColumnX,
            y: yPosition,
            size: 11,
            font: timesFont,
            color: rgb(0, 0, 0),
          });
          yPosition -= 15;
        }
      }
      
      // Reset yPosition for CLIENT column (right side)
      let clientYPosition = height - 50 - 25 - 30 - 40; // Same as contractor start
      
      // CLIENT column (right)
      if (contractStructure.parties.client) {
        currentPage.drawText('CLIENT', {
          x: rightColumnX,
          y: clientYPosition,
          size: 14,
          font: timesBold,
          color: rgb(0, 0, 0),
        });
        clientYPosition -= 20;
        
        const clientLines = contractStructure.parties.client;
        for (const line of clientLines) {
          currentPage.drawText(line, {
            x: rightColumnX,
            y: clientYPosition,
            size: 11,
            font: timesFont,
            color: rgb(0, 0, 0),
          });
          clientYPosition -= 15;
        }
      }
      
      // Adjust yPosition to continue after both columns
      yPosition = Math.min(yPosition, clientYPosition) - 30;
    }
    
    // 3. CONTRACT SECTIONS (numbered sections exactly like HTML)
    if (contractStructure.sections) {
      for (const section of contractStructure.sections) {
        // Check if we need a new page
        if (yPosition < 150) {
          currentPage = pdfDoc.addPage();
          yPosition = height - 50;
        }
        
        // Section header (bold, like HTML h2 style)
        const sectionHeader = section.header;
        currentPage.drawText(sectionHeader, {
          x: 50,
          y: yPosition,
          size: 12,
          font: timesBold,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
        
        // Section content (regular text, like HTML p style)
        const contentLines = wrapTextToLines(section.content, timesFont, 11, width - 100);
        for (const line of contentLines) {
          if (yPosition < 50) {
            currentPage = pdfDoc.addPage();
            yPosition = height - 50;
          }
          
          currentPage.drawText(line, {
            x: 50,
            y: yPosition,
            size: 11,
            font: timesFont,
            color: rgb(0, 0, 0),
          });
          yPosition -= 16; // line-height: 1.5 like HTML
        }
        yPosition -= 15; // Section spacing
      }
    }
    
    // 4. SIGNATURE SECTION (if present)
    if (contractStructure.signatures) {
      if (yPosition < 200) {
        currentPage = pdfDoc.addPage();
        yPosition = height - 50;
      }
      
      // Signature header
      currentPage.drawText('EXECUTION', {
        x: 50,
        y: yPosition,
        size: 12,
        font: timesBold,
        color: rgb(0, 0, 0),
      });
      yPosition -= 25;
      
      // Contractor signature
      if (contractStructure.signatures.contractor) {
        currentPage.drawText('CONTRACTOR', {
          x: 50,
          y: yPosition,
          size: 11,
          font: timesBold,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
        
        currentPage.drawText(contractStructure.signatures.contractor.name, {
          x: 70,
          y: yPosition,
          size: 11,
          font: timesFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
        
        currentPage.drawText(`Date: ${contractStructure.signatures.contractor.date}`, {
          x: 70,
          y: yPosition,
          size: 10,
          font: timesFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 30;
      }
      
      // Client signature
      if (contractStructure.signatures.client) {
        currentPage.drawText('CLIENT', {
          x: 50,
          y: yPosition,
          size: 11,
          font: timesBold,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
        
        currentPage.drawText(contractStructure.signatures.client.name, {
          x: 70,
          y: yPosition,
          size: 11,
          font: timesFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 15;
        
        currentPage.drawText(`Date: ${contractStructure.signatures.client.date}`, {
          x: 70,
          y: yPosition,
          size: 10,
          font: timesFont,
          color: rgb(0, 0, 0),
        });
      }
    }
    
    // Add contract ID footer (like HTML)
    if (options.contractId) {
      const footerText = `Contract ID: ${options.contractId}`;
      const footerWidth = helveticaFont.widthOfTextAtSize(footerText, 9);
      currentPage.drawText(footerText, {
        x: width - footerWidth - 10,
        y: 10,
        size: 9,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
    
    const pdfBytes = await pdfDoc.save();
    console.log('✅ [EXACT-LAYOUT-PDF] PDF generated with EXACT HTML layout structure preserved');
    return Buffer.from(pdfBytes);
    
  } catch (error: any) {
    console.error('❌ [EXACT-LAYOUT-PDF] Failed to generate layout-preserving PDF:', error.message);
    throw error;
  }
}

interface ContractStructure {
  header?: {
    title: string;
    date?: string;
  };
  parties?: {
    contractor?: string[];
    client?: string[];
  };
  sections?: Array<{
    header: string;
    content: string;
  }>;
  signatures?: {
    contractor?: {
      name: string;
      date: string;
    };
    client?: {
      name: string;
      date: string;
    };
  };
}

function parseContractLayoutStructure(html: string): ContractStructure {
  const structure: ContractStructure = {};
  
  // Extract header
  const headerMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (headerMatch) {
    structure.header = { title: headerMatch[1].trim() };
    
    // Look for agreement date
    const dateMatch = html.match(/Agreement Date:\s*([^<\n]+)/i);
    if (dateMatch) {
      structure.header.date = `Agreement Date: ${dateMatch[1].trim()}`;
    }
  }
  
  // Extract contractor/client info (two-column layout)
  const contractorMatch = html.match(/CONTRACTOR[^<]*<\/h[^>]*>[\s\S]*?Business Name:\s*([^<\n]+)[\s\S]*?Business Address:\s*([^<\n]+)[\s\S]*?Telephone:\s*([^<\n]+)[\s\S]*?Email:\s*([^<\n]+)/i);
  const clientMatch = html.match(/CLIENT[^<]*<\/h[^>]*>[\s\S]*?Full Name\/Company:\s*([^<\n]+)[\s\S]*?Property Address:\s*([^<\n]+)[\s\S]*?(?:Telephone:\s*([^<\n]+))?[\s\S]*?Email:\s*([^<\n]+)/i);
  
  if (contractorMatch || clientMatch) {
    structure.parties = {};
    
    if (contractorMatch) {
      structure.parties.contractor = [
        `Business Name: ${contractorMatch[1].trim()}`,
        `Business Address: ${contractorMatch[2].trim()}`,
        `Telephone: ${contractorMatch[3].trim()}`,
        `Email: ${contractorMatch[4].trim()}`
      ];
    }
    
    if (clientMatch) {
      structure.parties.client = [
        `Full Name/Company: ${clientMatch[1].trim()}`,
        `Property Address: ${clientMatch[2].trim()}`,
        clientMatch[3] ? `Telephone: ${clientMatch[3].trim()}` : '',
        `Email: ${clientMatch[4].trim()}`
      ].filter(line => line.length > 0);
    }
  }
  
  // Extract numbered sections
  const sectionPattern = /(\d+\.\s*[^<\n]+)[\s\S]*?<\/h[^>]*>([\s\S]*?)(?=\d+\.\s*[A-Z][^<\n]+<\/h[^>]*>|<div[^>]*class[^>]*signature|$)/gi;
  const sections: Array<{ header: string; content: string }> = [];
  let sectionMatch;
  
  while ((sectionMatch = sectionPattern.exec(html)) !== null) {
    const header = sectionMatch[1].trim();
    const content = sectionMatch[2]
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (content.length > 10) { // Only include sections with meaningful content
      sections.push({ header, content });
    }
  }
  
  if (sections.length > 0) {
    structure.sections = sections;
  }
  
  // Extract signatures
  const contractorSigMatch = html.match(/CONTRACTOR[\s\S]*?OWL FENC[\s\S]*?Date:\s*([^<\n]+)/i);
  const clientSigMatch = html.match(/CLIENT[\s\S]*?([^<\n]+)[\s\S]*?Print Name[\s\S]*?Date:\s*([^<\n]+)/i);
  
  if (contractorSigMatch || clientSigMatch) {
    structure.signatures = {};
    
    if (contractorSigMatch) {
      structure.signatures.contractor = {
        name: 'OWL FENC',
        date: contractorSigMatch[1].trim()
      };
    }
    
    if (clientSigMatch) {
      structure.signatures.client = {
        name: clientSigMatch[1].trim(),
        date: clientSigMatch[2].trim()
      };
    }
  }
  
  return structure;
}

function wrapTextToLines(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}