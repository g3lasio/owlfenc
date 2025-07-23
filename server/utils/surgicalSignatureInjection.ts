import * as cheerio from 'cheerio';

interface SignatureData {
  contractorSignature?: string;
  contractorSignedAt?: Date;
  clientSignature?: string;
  clientSignedAt?: Date;
}

/**
 * Surgical approach - only modify the exact signature areas in the contract HTML
 * Preserves 100% of the original formatting
 */
export async function injectSignaturesIntoHtml(
  contractHtml: string,
  signatureData: SignatureData
): Promise<string> {
  console.log('🔬 [SURGICAL] Starting surgical signature injection');
  
  // Load HTML with cheerio
  const $ = cheerio.load(contractHtml);
  
  // Find signature sections - these should be the exact selectors from the original template
  const signatureBlocks = $('.sign-block, .signature-box, .signature-section');
  console.log(`🔍 [SURGICAL] Found ${signatureBlocks.length} signature blocks`);
  
  signatureBlocks.each((index, block) => {
    const $block = $(block);
    const blockText = $block.text();
    
    // Determine if this is client or contractor signature block
    const isClientBlock = blockText.includes('Client') || blockText.includes('CLIENT');
    const isContractorBlock = blockText.includes('Contractor') || blockText.includes('CONTRACTOR');
    
    if (isClientBlock && signatureData.clientSignature) {
      console.log('✍️ [SURGICAL] Injecting client signature');
      
      // Find the signature line or space
      const signatureLine = $block.find('.sign-space, .signature-line, div:contains("_____")').first();
      if (signatureLine.length > 0) {
        // Replace with signature
        signatureLine.html(`
          <div style="font-family: 'Brush Script MT', cursive; color: #000080; font-size: 24px; padding: 10px;">
            ${signatureData.clientSignature}
          </div>
        `);
      }
      
      // Update date if present
      if (signatureData.clientSignedAt) {
        const dateLine = $block.find('div:contains("Date:"), span:contains("Date:")').first();
        if (dateLine.length > 0) {
          const dateStr = new Date(signatureData.clientSignedAt).toLocaleDateString();
          dateLine.text(`Date: ${dateStr}`);
        }
      }
    }
    
    if (isContractorBlock && signatureData.contractorSignature) {
      console.log('✍️ [SURGICAL] Injecting contractor signature');
      
      // Find the signature line or space
      const signatureLine = $block.find('.sign-space, .signature-line, div:contains("_____")').first();
      if (signatureLine.length > 0) {
        // Replace with signature
        signatureLine.html(`
          <div style="font-family: 'Brush Script MT', cursive; color: #000080; font-size: 24px; padding: 10px;">
            ${signatureData.contractorSignature}
          </div>
        `);
      }
      
      // Update date if present
      if (signatureData.contractorSignedAt) {
        const dateLine = $block.find('div:contains("Date:"), span:contains("Date:")').first();
        if (dateLine.length > 0) {
          const dateStr = new Date(signatureData.contractorSignedAt).toLocaleDateString();
          dateLine.text(`Date: ${dateStr}`);
        }
      }
    }
  });
  
  // If no signature blocks found, try alternative selectors
  if (signatureBlocks.length === 0) {
    console.log('⚠️ [SURGICAL] No signature blocks found, trying alternative approach');
    
    // Look for signature areas by text content
    const allDivs = $('div');
    allDivs.each((index, div) => {
      const $div = $(div);
      const text = $div.text();
      
      // Client signature
      if ((text.includes('Client Signature') || text.includes('CLIENT SIGNATURE')) && signatureData.clientSignature) {
        const nextDiv = $div.next('div');
        if (nextDiv.length > 0 && nextDiv.text().includes('____')) {
          nextDiv.html(`
            <div style="font-family: 'Brush Script MT', cursive; color: #000080; font-size: 24px; padding: 10px;">
              ${signatureData.clientSignature}
            </div>
          `);
        }
      }
      
      // Contractor signature
      if ((text.includes('Contractor Signature') || text.includes('CONTRACTOR SIGNATURE')) && signatureData.contractorSignature) {
        const nextDiv = $div.next('div');
        if (nextDiv.length > 0 && nextDiv.text().includes('____')) {
          nextDiv.html(`
            <div style="font-family: 'Brush Script MT', cursive; color: #000080; font-size: 24px; padding: 10px;">
              ${signatureData.contractorSignature}
            </div>
          `);
        }
      }
    });
  }
  
  console.log('✅ [SURGICAL] Signature injection completed');
  return $.html();
}

/**
 * Generate PDF from HTML with signatures using Puppeteer
 */
export async function generatePdfFromSignedHtml(
  signedHtml: string,
  contractId: string
): Promise<Buffer> {
  console.log('📄 [SURGICAL] Generating PDF from signed HTML');
  
  try {
    const puppeteer = await import('puppeteer');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    // Set the HTML content
    await page.setContent(signedHtml, {
      waitUntil: 'networkidle0',
    });
    
    // Generate PDF with exact settings to preserve formatting
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; font-family: 'Times New Roman', serif;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in',
      },
    });
    
    await browser.close();
    
    console.log('✅ [SURGICAL] PDF generated successfully');
    return Buffer.from(pdfBuffer);
    
  } catch (error) {
    console.error('❌ [SURGICAL] Error generating PDF:', error);
    throw error;
  }
}