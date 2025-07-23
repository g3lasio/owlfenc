import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

interface SignatureData {
  contractorSignature?: string;
  contractorSignedAt?: Date;
  clientSignature?: string;
  clientSignedAt?: Date;
}

/**
 * Template-based approach - uses the original contract HTML template
 * and only replaces the signature placeholders
 */
export class TemplateBasedSignatureService {
  private templatePath = path.join(process.cwd(), 'attached_assets', 'contract-template.html');
  
  async generateSignedContract(
    contractHtml: string,
    signatureData: SignatureData,
    contractId: string
  ): Promise<Buffer> {
    try {
      console.log('📋 [TEMPLATE] Starting template-based signature generation');
      
      // Read the original contract template
      const templateHtml = await fs.readFile(this.templatePath, 'utf-8');
      
      // Extract the contract content from the provided HTML
      // This includes all the specific details like client name, address, scope of work, etc.
      const contractContent = this.extractContractContent(contractHtml);
      
      // Replace placeholders in template with actual contract data
      let finalHtml = templateHtml;
      
      // Replace contract details
      Object.entries(contractContent).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        finalHtml = finalHtml.replace(new RegExp(placeholder, 'g'), value);
      });
      
      // Now handle signatures specifically
      // Find the signature section in the template
      const signaturePattern = /<div class="signatures">[\s\S]*?<\/div>[\s\n]*<\/div>/;
      const signatureMatch = finalHtml.match(signaturePattern);
      
      if (signatureMatch) {
        const originalSignatureSection = signatureMatch[0];
        let modifiedSignatureSection = originalSignatureSection;
        
        // Replace client signature
        if (signatureData.clientSignature) {
          // Find client signature block
          const clientPattern = /<div class="sign-block">[\s\S]*?Client Signature[\s\S]*?<div class="sign-space"><\/div>/;
          modifiedSignatureSection = modifiedSignatureSection.replace(
            clientPattern,
            (match) => {
              return match.replace(
                '<div class="sign-space"></div>',
                `<div class="sign-space" style="font-family: 'Brush Script MT', cursive; color: #000080; font-size: 24px; padding: 10px;">${signatureData.clientSignature}</div>`
              );
            }
          );
          
          // Update client date
          if (signatureData.clientSignedAt) {
            const dateStr = new Date(signatureData.clientSignedAt).toLocaleDateString();
            modifiedSignatureSection = modifiedSignatureSection.replace(
              /Client Signature[\s\S]*?Date: ____________________/,
              (match) => match.replace('Date: ____________________', `Date: ${dateStr}`)
            );
          }
        }
        
        // Replace contractor signature
        if (signatureData.contractorSignature) {
          // Find contractor signature block
          const contractorPattern = /<div class="sign-block">[\s\S]*?Contractor Signature[\s\S]*?<div class="sign-space"><\/div>/;
          modifiedSignatureSection = modifiedSignatureSection.replace(
            contractorPattern,
            (match) => {
              return match.replace(
                '<div class="sign-space"></div>',
                `<div class="sign-space" style="font-family: 'Brush Script MT', cursive; color: #000080; font-size: 24px; padding: 10px;">${signatureData.contractorSignature}</div>`
              );
            }
          );
          
          // Update contractor date
          if (signatureData.contractorSignedAt) {
            const dateStr = new Date(signatureData.contractorSignedAt).toLocaleDateString();
            modifiedSignatureSection = modifiedSignatureSection.replace(
              /Contractor Signature[\s\S]*?Date: ____________________/,
              (match) => match.replace('Date: ____________________', `Date: ${dateStr}`)
            );
          }
        }
        
        // Replace the signature section in the final HTML
        finalHtml = finalHtml.replace(originalSignatureSection, modifiedSignatureSection);
      }
      
      // Generate PDF using Puppeteer
      const puppeteer = await import('puppeteer');
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      
      const page = await browser.newPage();
      
      // Set the HTML content
      await page.setContent(finalHtml, {
        waitUntil: 'networkidle0',
      });
      
      // Generate PDF with exact settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `<div style="font-size: 10px; text-align: center; width: 100%;">
          <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>`,
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in',
        },
      });
      
      await browser.close();
      
      console.log('✅ [TEMPLATE] PDF generated successfully from template');
      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      console.error('❌ [TEMPLATE] Error generating signed contract:', error);
      throw error;
    }
  }
  
  private extractContractContent(html: string): Record<string, string> {
    const content: Record<string, string> = {};
    
    // Extract key contract details using regex patterns
    const patterns = {
      contractDate: /Agreement Date:\s*([^<]+)/,
      contractorName: /Contractor Business Name:\s*([^<]+)/,
      contractorAddress: /Business Address:\s*([^<]+)/,
      contractorPhone: /Telephone:\s*([^<]+)/,
      contractorEmail: /Email:\s*([^<]+)/,
      clientName: /Client Full Name\/Company:\s*([^<]+)/,
      propertyAddress: /Property Address:\s*([^<]+)/,
      clientPhone: /Telephone:\s*\(?\d{3}\)?\s*\d{3}-\d{4}/,
      clientEmail: /Email:\s*[^@]+@[^<]+/,
      scopeOfWork: /<h3[^>]*>1\.\s*SCOPE OF WORK[^<]*<\/h3>([\s\S]*?)(?=<h3|$)/,
      contractPrice: /\$[\d,]+\.\d{2}/,
    };
    
    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = html.match(pattern);
      if (match) {
        content[key] = match[1] || match[0];
      }
    });
    
    return content;
  }
}