/**
 * CRITICAL: Exact Format Signature Service
 * 
 * This service ensures that signed contracts maintain EXACTLY the same
 * format as the original template, with ONLY signatures added.
 * 
 * REQUIREMENTS (NEVER DEVIATE):
 * - Original HTML structure must remain 100% unchanged
 * - Original CSS styling must be preserved exactly
 * - Only signature fields should be modified
 * - PDF output must be visually identical to HTML preview
 */

import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

interface SignatureData {
  name: string;
  signatureData: string;
  typedName?: string;
  signedAt: Date;
}

export class ExactFormatSignatureService {
  /**
   * CRITICAL: Embed signatures while preserving EXACT original format
   */
  static embedSignaturesPreservingFormat(
    originalHTML: string,
    contractorSignature: SignatureData,
    clientSignature: SignatureData
  ): string {
    console.log('🎯 [EXACT-FORMAT] Preserving original format while adding signatures');

    // Load HTML with cheerio for precise manipulation
    const $ = cheerio.load(originalHTML, {
      decodeEntities: false,
      lowerCaseAttributeNames: false,
    });

    // Create signature image function that matches original styling
    const createSignatureImage = (signatureData: string, name: string, typedName?: string) => {
      if (signatureData.startsWith('data:image')) {
        // Canvas/drawn signature - preserve original signature area styling
        return `<img src="${signatureData}" style="max-height: 50px; max-width: 250px; object-fit: contain; display: block; margin: 0 auto;" alt="${name} Signature" />`;
      } else {
        // Typed signature - create clean SVG matching original format
        const sigName = typedName || name;
        const svgData = `data:image/svg+xml;base64,${Buffer.from(`
          <svg width="250" height="50" xmlns="http://www.w3.org/2000/svg">
            <text x="125" y="35" text-anchor="middle" font-family="Times, serif" font-size="24" font-style="italic" fill="#000080">${sigName}</text>
          </svg>
        `).toString('base64')}`;
        return `<img src="${svgData}" style="max-height: 50px; max-width: 250px; object-fit: contain; display: block; margin: 0 auto;" alt="${name} Signature" />`;
      }
    };

    try {
      // Find signature lines using multiple selectors to ensure we catch all formats
      const signatureSelectors = [
        '.signature-line',
        '.sign-space', 
        '[class*="signature"]',
        '[class*="sign"]'
      ];

      let signatureElements = $();
      signatureSelectors.forEach(selector => {
        signatureElements = signatureElements.add($(selector));
      });

      console.log(`🔍 [EXACT-FORMAT] Found ${signatureElements.length} signature elements`);

      // If no specific signature elements found, look for empty divs in signature sections
      if (signatureElements.length === 0) {
        $('.signature-section div, .signatures div, .sign-block').each((i, el) => {
          const $el = $(el);
          if ($el.text().trim() === '' && $el.children().length === 0) {
            signatureElements = signatureElements.add($el);
          }
        });
      }

      // Process signature elements
      signatureElements.each((index, element) => {
        const $element = $(element);
        
        if (index === 0) {
          // First signature element = Contractor
          const contractorSigImage = createSignatureImage(
            contractorSignature.signatureData,
            contractorSignature.name,
            contractorSignature.typedName
          );
          $element.html(contractorSigImage);
          console.log('✅ [EXACT-FORMAT] Added contractor signature to element', index);
        } else if (index === 1) {
          // Second signature element = Client  
          const clientSigImage = createSignatureImage(
            clientSignature.signatureData,
            clientSignature.name,
            clientSignature.typedName
          );
          $element.html(clientSigImage);
          console.log('✅ [EXACT-FORMAT] Added client signature to element', index);
        }
      });

      // Find and fill date fields
      const dateSelectors = [
        '.date-line',
        '[class*="date"]',
        'input[type="date"]'
      ];

      let dateElements = $();
      dateSelectors.forEach(selector => {
        dateElements = dateElements.add($(selector));
      });

      // Fill contractor date (first date element)
      if (dateElements.length >= 1) {
        const contractorDate = contractorSignature.signedAt.toLocaleDateString();
        $(dateElements[0]).html(contractorDate).text(contractorDate);
        console.log('✅ [EXACT-FORMAT] Added contractor date:', contractorDate);
      }

      // Fill client date (second date element)
      if (dateElements.length >= 2) {
        const clientDate = clientSignature.signedAt.toLocaleDateString();
        $(dateElements[1]).html(clientDate).text(clientDate);
        console.log('✅ [EXACT-FORMAT] Added client date:', clientDate);
      }

      // Return modified HTML with original structure preserved
      const modifiedHTML = $.html();
      console.log('🎯 [EXACT-FORMAT] Signatures embedded while preserving original format');
      
      return modifiedHTML;

    } catch (error) {
      console.error('❌ [EXACT-FORMAT] Error embedding signatures:', error);
      // Return original HTML if signature embedding fails
      return originalHTML;
    }
  }

  /**
   * CRITICAL: Generate PDF maintaining EXACT visual layout
   */
  static async generateExactFormatPDF(signedHTML: string): Promise<Buffer> {
    console.log('🎯 [EXACT-LAYOUT-PDF] Creating PDF that EXACTLY matches HTML preview structure');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-plugins'
      ]
    });

    try {
      const page = await browser.newPage();
      
      // Set viewport to match typical A4 proportions
      await page.setViewport({ 
        width: 794, // A4 width in pixels at 96dpi 
        height: 1123 // A4 height in pixels at 96dpi
      });

      // Load HTML content and wait for all resources
      await page.setContent(signedHTML, { 
        waitUntil: ['networkidle0', 'domcontentloaded']
      });

      // Allow additional time for fonts and styling to load
      await page.waitForTimeout(2000);

      // Generate PDF with exact settings to match HTML layout
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true, // CRITICAL: Preserve all background styling
        preferCSSPageSize: true, // CRITICAL: Use CSS page size settings
        margin: {
          top: '1in',
          right: '1in', 
          bottom: '1in',
          left: '1in'
        }
      });

      console.log('✅ [EXACT-LAYOUT-PDF] PDF generated with EXACT HTML layout structure preserved');
      return Buffer.from(pdfBuffer);

    } catch (error) {
      console.error('❌ [EXACT-LAYOUT-PDF] Error generating PDF:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  /**
   * CRITICAL: Complete process - embed signatures and generate exact PDF
   */
  static async createSignedContractWithExactFormat(
    originalHTML: string,
    contractorSignature: SignatureData,
    clientSignature: SignatureData
  ): Promise<Buffer> {
    console.log('🎯 [EXACT-FORMAT] Starting complete signed contract generation with exact format preservation');

    // Step 1: Embed signatures while preserving exact format
    const signedHTML = this.embedSignaturesPreservingFormat(
      originalHTML,
      contractorSignature,
      clientSignature
    );

    // Step 2: Generate PDF with exact layout preservation
    const pdfBuffer = await this.generateExactFormatPDF(signedHTML);

    console.log('✅ [EXACT-FORMAT] Signed contract generated with EXACT original format preserved');
    return pdfBuffer;
  }

  /**
   * Preserve original contract format while adding signatures
   * @deprecated - Use embedSignaturesPreservingFormat instead
   */
  private static preserveOriginalFormat(
    htmlContent: string,
    contractorSignature: SignatureData,
    clientSignature: SignatureData
  ): string {
    return this.embedSignaturesPreservingFormat(htmlContent, contractorSignature, clientSignature);
  }

  /**
   * Inline signature into HTML without disrupting structure
   * Helper method for signature placement
   */
  private static inlineSignatureIntoHTML(
    htmlContent: string,
    signature: SignatureData,
    party: 'contractor' | 'client'
  ): string {
    const placeholder = party === 'contractor' 
      ? 'CONTRACTOR_SIGNATURE_PLACEHOLDER'
      : 'CLIENT_SIGNATURE_PLACEHOLDER';
    
    const signatureHTML = this.generateSignatureHTML(signature, party);
    
    // Replace placeholder while preserving all surrounding HTML structure
    return htmlContent.replace(placeholder, signatureHTML);
  }

  /**
   * Generate signature HTML that matches contract style
   */
  private static generateSignatureHTML(signature: SignatureData, party: string): string {
    if (signature.signatureData.startsWith('data:image')) {
      // Canvas/drawn signature
      return `<img src="${signature.signatureData}" style="max-height: 50px; max-width: 250px; object-fit: contain; display: block; margin: 0 auto;" alt="${signature.name} Signature" />`;
    } else {
      // Typed signature - create clean SVG
      const sigName = signature.typedName || signature.name;
      const svgData = `data:image/svg+xml;base64,${Buffer.from(`
        <svg width="250" height="50" xmlns="http://www.w3.org/2000/svg">
          <text x="125" y="35" text-anchor="middle" font-family="Times, serif" font-size="24" font-style="italic" fill="#000080">${sigName}</text>
        </svg>
      `).toString('base64')}`;
      return `<img src="${svgData}" style="max-height: 50px; max-width: 250px; object-fit: contain; display: block; margin: 0 auto;" alt="${signature.name} Signature" />`;
    }
  }

  /**
   * Convert HTML to PDF while maintaining exact formatting
   * @deprecated - Use generateExactFormatPDF instead
   */
  private static async convertHTMLToPDF(htmlContent: string): Promise<Buffer> {
    return await this.generateExactFormatPDF(htmlContent);
  }
}