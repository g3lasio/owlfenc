/**
 * SOLUCIÓN ALTERNATIVA PARA PDF - JSPDF
 * Reemplaza completamente html-pdf-node que tenía problemas con ES modules
 */

import { jsPDF } from 'jspdf';
import * as cheerio from 'cheerio';

interface ContractData {
  contractId: string;
  clientName: string;
  contractorName?: string;
  projectAddress?: string;
  contractPrice?: string;
  workDescription?: string;
}

export async function generatePdfFromContract(htmlContent: string, contractData: ContractData): Promise<Buffer> {
  try {
    console.log('🚀 [ALTERNATIVE-PDF] Starting PDF generation using jsPDF');
    
    // Parse HTML content to extract text and structure
    const $ = cheerio.load(htmlContent);
    
    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter'
    });
    
    // Set font to Times Roman (closest to Times New Roman)
    doc.setFont('times', 'normal');
    
    let yPosition = 1; // Start 1 inch from top
    const leftMargin = 0.75;
    const rightMargin = 0.75;
    const pageWidth = 8.5;
    const textWidth = pageWidth - leftMargin - rightMargin;
    
    // Helper function to add text with word wrapping
    function addText(text: string, fontSize: number = 12, isBold: boolean = false, isCenter: boolean = false) {
      doc.setFontSize(fontSize);
      doc.setFont('times', isBold ? 'bold' : 'normal');
      
      // Clean text
      const cleanText = text.replace(/\s+/g, ' ').trim();
      
      if (isCenter) {
        doc.text(cleanText, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += fontSize * 0.02; // Line spacing
      } else {
        const lines = doc.splitTextToSize(cleanText, textWidth);
        doc.text(lines, leftMargin, yPosition);
        yPosition += lines.length * (fontSize * 0.02);
      }
      
      yPosition += 0.1; // Extra spacing between paragraphs
    }
    
    // Header
    addText('INDEPENDENT CONTRACTOR AGREEMENT', 18, true, true);
    yPosition += 0.2;
    
    // Date
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    addText(`Agreement Date: ${currentDate}`, 12, false, true);
    yPosition += 0.3;
    
    // Contractor and Client Info (side by side simulation)
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('CONTRACTOR', leftMargin + 1, yPosition);
    doc.text('CLIENT', leftMargin + 4.5, yPosition);
    yPosition += 0.3;
    
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    
    // Contractor details
    const contractorInfo = [
      'Business Name: OWL FENC',
      'Address: 2901 Owens Court',
      'Fairfield, California 94534',
      'Phone: 202 549 3519',
      'Email: owl@chyrris.com'
    ];
    
    // Client details
    const clientInfo = [
      `Client Name: ${contractData.clientName}`,
      contractData.projectAddress || 'Project Address: [To be filled]',
      'Phone: [Client Phone]',
      'Email: [Client Email]'
    ];
    
    const startY = yPosition;
    contractorInfo.forEach((line, index) => {
      doc.text(line, leftMargin, startY + (index * 0.2));
    });
    
    clientInfo.forEach((line, index) => {
      doc.text(line, leftMargin + 4, startY + (index * 0.2));
    });
    
    yPosition = Math.max(startY + (contractorInfo.length * 0.2), startY + (clientInfo.length * 0.2)) + 0.4;
    
    // Contract sections
    addText('SCOPE OF WORK', 14, true, true);
    addText(`The Contractor agrees to perform the following work: ${contractData.workDescription || 'Professional construction services as specified in the project requirements.'}`, 12);
    
    addText('CONTRACT PRICE AND PAYMENT TERMS', 14, true, true);
    addText(`The total contract price shall be ${contractData.contractPrice || '$[Amount]'} USD. Payment shall be made in two installments: 50% upon signing this agreement and 50% upon completion of work.`, 12);
    
    addText('INDEPENDENT CONTRACTOR STATUS', 14, true, true);
    addText('The Contractor is and shall remain an independent contractor. Nothing in this Agreement shall be construed to create an employer-employee relationship.', 12);
    
    addText('MATERIALS AND WORKMANSHIP', 14, true, true);
    addText('The Contractor shall furnish all materials, equipment, and labor necessary for completion of the work. All materials shall be new and of first quality. Work shall be performed in a workmanlike manner.', 12);
    
    addText('WARRANTY', 14, true, true);
    addText('The Contractor warrants all work against defects in workmanship for a period of 2 years from completion date.', 12);
    
    // Check if new page needed for signatures
    if (yPosition > 9) {
      doc.addPage();
      yPosition = 1;
    }
    
    // Signatures section
    yPosition += 0.5;
    addText('SIGNATURES', 16, true, true);
    yPosition += 0.3;
    
    // Contractor signature
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text('CONTRACTOR SIGNATURE:', leftMargin, yPosition);
    doc.line(leftMargin + 2.5, yPosition, leftMargin + 6, yPosition); // Signature line
    yPosition += 0.4;
    
    doc.setFont('times', 'normal');
    doc.text('OWL FENC', leftMargin + 2.5, yPosition);
    doc.text(`Date: ${currentDate}`, leftMargin + 4.5, yPosition);
    yPosition += 0.6;
    
    // Client signature
    doc.setFont('times', 'bold');
    doc.text('CLIENT SIGNATURE:', leftMargin, yPosition);
    doc.line(leftMargin + 2.5, yPosition, leftMargin + 6, yPosition); // Signature line
    yPosition += 0.4;
    
    doc.setFont('times', 'normal');
    doc.text(contractData.clientName, leftMargin + 2.5, yPosition);
    doc.text(`Date: ${currentDate}`, leftMargin + 4.5, yPosition);
    
    // Footer
    doc.setFontSize(8);
    doc.setFont('times', 'normal');
    doc.text(`Contract ID: ${contractData.contractId}`, pageWidth - 2, 10.5);
    
    console.log('✅ [ALTERNATIVE-PDF] PDF generated successfully using jsPDF');
    
    // Convert to Buffer
    const pdfBytes = doc.output('arraybuffer');
    return Buffer.from(pdfBytes);
    
  } catch (error: any) {
    console.error('❌ [ALTERNATIVE-PDF] Failed to generate PDF:', error.message);
    throw new Error(`Alternative PDF generation failed: ${error.message}`);
  }
}

export async function generateContractPdfAlternative(htmlContent: string, contractId: string, clientName: string): Promise<Buffer> {
  try {
    console.log(`🎯 [ALTERNATIVE-PDF] Generating contract PDF for: ${contractId}`);
    
    // Extract additional data from HTML if possible
    const $ = cheerio.load(htmlContent);
    
    const contractData: ContractData = {
      contractId,
      clientName,
      contractorName: 'OWL FENC',
      projectAddress: $('body').text().match(/Property Address[:\s]+([^\n]+)/)?.[1] || undefined,
      contractPrice: $('body').text().match(/\$[\d,]+\.?\d*/)?.[0] || undefined,
      workDescription: $('body').text().match(/Scope of Work[:\s]+([^\n]+)/)?.[1] || 'Professional construction services'
    };
    
    const pdfBuffer = await generatePdfFromContract(htmlContent, contractData);
    
    console.log(`✅ [ALTERNATIVE-PDF] Contract PDF generated successfully: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
    
  } catch (error: any) {
    console.error('❌ [ALTERNATIVE-PDF] Contract generation failed:', error);
    throw error;
  }
}