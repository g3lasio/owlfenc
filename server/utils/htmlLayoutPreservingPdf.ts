import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

/**
 * CRITICAL: HTML Layout Preserving PDF Generator
 * 
 * This service generates PDFs that EXACTLY match the HTML preview layout.
 * It uses Puppeteer to render HTML with all CSS intact, then converts to PDF.
 * 
 * REQUIREMENTS:
 * - Preserve 100% of original HTML/CSS styling
 * - Only modify signature areas to add signatures
 * - Output must be visually identical to HTML preview
 * - Professional Times New Roman formatting must be maintained
 */

interface SignatureData {
  contractorSignature?: {
    name: string;
    signatureData: string;
    typedName?: string;
    signedAt: Date;
  };
  clientSignature?: {
    name: string;
    signatureData: string;
    typedName?: string;
    signedAt: Date;
  };
}

export async function generateExactLayoutPdf(
  originalHtml: string,
  signatures?: SignatureData,
  options: {
    contractId?: string;
    debug?: boolean;
  } = {}
): Promise<Buffer> {
  let browser;
  
  try {
    console.log('🎯 [EXACT-LAYOUT] Using EXACT layout preservation to match HTML preview 100%');
    
    // Load HTML with cheerio to inject signatures if provided
    let htmlToRender = originalHtml;
    
    if (signatures) {
      const $ = cheerio.load(originalHtml, {
        decodeEntities: false,
        lowerCaseAttributeNames: false,
        recognizeSelfClosing: true,
      });
      
      // Helper to create signature image HTML
      const createSignatureHtml = (signature: any) => {
        if (!signature) return '';
        
        if (signature.signatureData.startsWith('data:image')) {
          // Canvas/drawn signature
          return `<img src="${signature.signatureData}" style="max-height: 50px; max-width: 250px; object-fit: contain;" alt="${signature.name} Signature" />`;
        } else {
          // Typed signature - create SVG
          const sigName = signature.typedName || signature.name;
          return `
            <svg width="250" height="50" xmlns="http://www.w3.org/2000/svg" style="display: block;">
              <text x="125" y="35" text-anchor="middle" font-family="'Brush Script MT', cursive" font-size="24" font-style="italic" fill="#000080">${sigName}</text>
            </svg>
          `;
        }
      };
      
      // Find contractor signature area
      const contractorSelectors = [
        '.sign-space:first',
        '.signature-line:first',
        '.sign-block:first .sign-space',
        '#contractor-signature',
        '[data-signature="contractor"]'
      ];
      
      for (const selector of contractorSelectors) {
        const element = $(selector);
        if (element.length > 0 && signatures.contractorSignature) {
          element.html(createSignatureHtml(signatures.contractorSignature));
          console.log('✅ [EXACT-LAYOUT] Injected contractor signature');
          break;
        }
      }
      
      // Find client signature area
      const clientSelectors = [
        '.sign-space:last',
        '.signature-line:last',
        '.sign-block:last .sign-space',
        '#client-signature',
        '[data-signature="client"]'
      ];
      
      for (const selector of clientSelectors) {
        const element = $(selector);
        if (element.length > 0 && signatures.clientSignature) {
          element.html(createSignatureHtml(signatures.clientSignature));
          console.log('✅ [EXACT-LAYOUT] Injected client signature');
          break;
        }
      }
      
      // Update date fields if signatures are provided
      if (signatures.contractorSignature?.signedAt) {
        const contractorDate = new Date(signatures.contractorSignature.signedAt).toLocaleDateString();
        $('.sign-block:first .date-line, #contractor-date').text(contractorDate);
      }
      
      if (signatures.clientSignature?.signedAt) {
        const clientDate = new Date(signatures.clientSignature.signedAt).toLocaleDateString();
        $('.sign-block:last .date-line, #client-date').text(clientDate);
      }
      
      htmlToRender = $.html();
    }
    
    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
      ],
    });
    
    const page = await browser.newPage();
    
    // Set viewport to match standard letter size
    await page.setViewport({
      width: 816,  // 8.5 inches at 96 DPI
      height: 1056, // 11 inches at 96 DPI
    });
    
    // Set the HTML content
    await page.setContent(htmlToRender, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
    });
    
    // Generate PDF with exact formatting
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-family: 'Times New Roman', serif; font-size: 10pt; color: #666;">
          <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
    });
    
    await browser.close();
    
    console.log('✅ [EXACT-LAYOUT] PDF generated with EXACT HTML layout structure preserved');
    
    return Buffer.from(pdfBuffer);
    
  } catch (error: any) {
    console.error('❌ [EXACT-LAYOUT] Error generating PDF:', error.message);
    
    if (browser) {
      await browser.close();
    }
    
    // Check for specific Chrome errors
    if (error.message.includes('Failed to launch') || 
        error.message.includes('chrome') || 
        error.message.includes('chromium')) {
      throw new Error('Chrome/Chromium not available for PDF generation. Please use HTML download instead.');
    }
    
    throw error;
  }
}

/**
 * Generate PDF from signed HTML contract
 * This is the main entry point for generating signed contract PDFs
 */
export async function generateSignedContractPdf(
  contractHtml: string,
  contractorSignature?: any,
  clientSignature?: any,
  contractId?: string
): Promise<Buffer> {
  console.log('🎯 [EXACT-LAYOUT-PDF] Creating PDF that EXACTLY matches HTML preview structure');
  
  const signatures: SignatureData = {};
  
  if (contractorSignature) {
    signatures.contractorSignature = contractorSignature;
  }
  
  if (clientSignature) {
    signatures.clientSignature = clientSignature;
  }
  
  return generateExactLayoutPdf(contractHtml, signatures, {
    contractId,
    debug: true,
  });
}