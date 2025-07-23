/**
 * SOLUCIÓN DEFINITIVA PARA PDF - PDF-LIB
 * Genera PDFs profesionales sin depender de HTML/CSS o navegadores
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as cheerio from 'cheerio';

interface ContractInfo {
  contractId: string;
  clientName: string;
  contractorName: string;
  contractPrice?: string;
  projectAddress?: string;
  workDescription?: string;
  agreementDate: string;
}

export async function generateProfessionalContractPdf(htmlContent: string, contractId: string, clientName: string): Promise<Buffer> {
  try {
    console.log('🚀 [PDF-LIB] Starting professional PDF generation');
    
    // Parse HTML to extract contract information
    const $ = cheerio.load(htmlContent);
    const bodyText = $('body').text();
    
    // Extract contract details
    const contractInfo: ContractInfo = {
      contractId,
      clientName,
      contractorName: 'OWL FENC',
      contractPrice: bodyText.match(/\$[\d,]+\.?\d*/)?.[0] || '$[Amount]',
      projectAddress: bodyText.match(/Property Address[:\s]+([^\n]+)/)?.[1] || bodyText.match(/\d+[^,\n]+(?:Street|Ave|Drive|Rd|Boulevard|Way)[^,\n]*/)?.[0] || '[Project Address]',
      workDescription: bodyText.match(/Scope of Work[:\s]+([^\n]+)/)?.[1] || 'Professional construction services',
      agreementDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    };
    
    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size: 8.5" x 11"
    
    // Fonts
    const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
    // Page margins and dimensions
    const margin = 54; // 0.75 inch
    const pageWidth = 612;
    const pageHeight = 792;
    const contentWidth = pageWidth - (margin * 2);
    
    let yPosition = pageHeight - margin;
    
    // Helper function to add text
    function addText(text: string, fontSize: number, font: any, options: { x?: number, y?: number, maxWidth?: number, color?: any, centered?: boolean } = {}) {
      const x = options.centered ? (pageWidth / 2) : (options.x || margin);
      const y = options.y || yPosition;
      const maxWidth = options.maxWidth || contentWidth;
      const color = options.color || rgb(0, 0, 0);
      
      if (options.centered) {
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: x - (textWidth / 2),
          y: y,
          size: fontSize,
          font: font,
          color: color,
        });
      } else {
        page.drawText(text, {
          x: x,
          y: y,
          size: fontSize,
          font: font,
          color: color,
        });
      }
      
      if (!options.y) {
        yPosition -= fontSize + 5;
      }
    }
    
    // Helper function to add line
    function addLine(x1: number, y1: number, x2: number, y2: number, thickness: number = 1) {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: thickness,
        color: rgb(0, 0, 0),
      });
    }
    
    // Title
    addText('INDEPENDENT CONTRACTOR AGREEMENT', 18, timesBoldFont, { centered: true });
    yPosition -= 20;
    
    // Date
    addText(`Agreement Date: ${contractInfo.agreementDate}`, 12, timesFont, { centered: true });
    yPosition -= 30;
    
    // Contract parties header
    addText('CONTRACTOR', 14, timesBoldFont, { x: margin + 50 });
    addText('CLIENT', 14, timesBoldFont, { x: margin + 250, y: yPosition + 14 + 5 });
    yPosition -= 10;
    
    // Draw boxes around parties
    const boxHeight = 100;
    addLine(margin, yPosition, margin + 200, yPosition); // Contractor box top
    addLine(margin, yPosition - boxHeight, margin + 200, yPosition - boxHeight); // Contractor box bottom
    addLine(margin, yPosition, margin, yPosition - boxHeight); // Contractor box left
    addLine(margin + 200, yPosition, margin + 200, yPosition - boxHeight); // Contractor box right
    
    addLine(margin + 220, yPosition, margin + 420, yPosition); // Client box top
    addLine(margin + 220, yPosition - boxHeight, margin + 420, yPosition - boxHeight); // Client box bottom
    addLine(margin + 220, yPosition, margin + 220, yPosition - boxHeight); // Client box left
    addLine(margin + 420, yPosition, margin + 420, yPosition - boxHeight); // Client box right
    
    // Contractor information
    let contractorY = yPosition - 15;
    addText('Business Name: OWL FENC', 10, timesFont, { x: margin + 5, y: contractorY });
    contractorY -= 15;
    addText('Address: 2901 Owens Court', 10, timesFont, { x: margin + 5, y: contractorY });
    contractorY -= 15;
    addText('Fairfield, California 94534', 10, timesFont, { x: margin + 5, y: contractorY });
    contractorY -= 15;
    addText('Phone: 202 549 3519', 10, timesFont, { x: margin + 5, y: contractorY });
    contractorY -= 15;
    addText('Email: owl@chyrris.com', 10, timesFont, { x: margin + 5, y: contractorY });
    
    // Client information
    let clientY = yPosition - 15;
    addText(`Client Name: ${contractInfo.clientName}`, 10, timesFont, { x: margin + 225, y: clientY });
    clientY -= 15;
    addText(`Property Address: ${contractInfo.projectAddress}`, 10, timesFont, { x: margin + 225, y: clientY });
    clientY -= 15;
    addText('Phone: [Client Phone]', 10, timesFont, { x: margin + 225, y: clientY });
    clientY -= 15;
    addText('Email: [Client Email]', 10, timesFont, { x: margin + 225, y: clientY });
    
    yPosition -= boxHeight + 30;
    
    // Contract sections
    addText('1. SCOPE OF WORK', 12, timesBoldFont);
    yPosition -= 5;
    addText(`The Contractor agrees to perform: ${contractInfo.workDescription}`, 10, timesFont);
    yPosition -= 20;
    
    addText('2. CONTRACT PRICE AND PAYMENT TERMS', 12, timesBoldFont);
    yPosition -= 5;
    addText(`Total contract price: ${contractInfo.contractPrice}. Payment: 50% upon signing, 50% upon completion.`, 10, timesFont);
    yPosition -= 20;
    
    addText('3. INDEPENDENT CONTRACTOR STATUS', 12, timesBoldFont);
    yPosition -= 5;
    addText('The Contractor is an independent contractor. No employer-employee relationship is created.', 10, timesFont);
    yPosition -= 20;
    
    addText('4. WARRANTIES', 12, timesBoldFont);
    yPosition -= 5;
    addText('Contractor warrants all work against defects for 2 years from completion date.', 10, timesFont);
    yPosition -= 40;
    
    // Signatures section
    addText('SIGNATURES', 14, timesBoldFont, { centered: true });
    yPosition -= 30;
    
    // Contractor signature
    addText('CONTRACTOR SIGNATURE:', 12, timesBoldFont, { x: margin });
    addLine(margin + 150, yPosition + 10, margin + 350, yPosition + 10, 1);
    yPosition -= 20;
    addText('OWL FENC', 10, timesFont, { x: margin + 150 });
    addText(`Date: ${contractInfo.agreementDate}`, 10, timesFont, { x: margin + 250, y: yPosition + 10 + 5 });
    yPosition -= 30;
    
    // Client signature
    addText('CLIENT SIGNATURE:', 12, timesBoldFont, { x: margin });
    addLine(margin + 150, yPosition + 10, margin + 350, yPosition + 10, 1);
    yPosition -= 20;
    addText(contractInfo.clientName, 10, timesFont, { x: margin + 150 });
    addText(`Date: ${contractInfo.agreementDate}`, 10, timesFont, { x: margin + 250, y: yPosition + 10 + 5 });
    
    // Footer with contract ID
    addText(`Contract ID: ${contractInfo.contractId}`, 8, timesFont, { x: pageWidth - 150, y: 30 });
    
    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    
    console.log('✅ [PDF-LIB] Professional PDF generated successfully');
    console.log(`📄 [PDF-LIB] PDF size: ${pdfBytes.length} bytes`);
    
    return Buffer.from(pdfBytes);
    
  } catch (error: any) {
    console.error('❌ [PDF-LIB] Failed to generate PDF:', error.message);
    throw new Error(`PDF-LIB generation failed: ${error.message}`);
  }
}