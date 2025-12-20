import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

interface SignatureData {
  contractorSignature?: string;
  contractorSignedAt?: Date;
  clientSignature?: string;
  clientSignedAt?: Date;
}

/**
 * Direct PDF overlay approach - loads existing PDF and overlays signatures only
 * This preserves 100% of the original formatting
 */
export async function overlaySignaturesOnPdf(
  originalPdfPath: string,
  signatureData: SignatureData
): Promise<Buffer> {
  try {
    console.log('🎯 [OVERLAY] Starting direct PDF overlay approach');
    
    // Load the original PDF
    const existingPdfBytes = await fs.readFile(originalPdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Get the first page (where signatures are)
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    // Load fonts
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
    // Page dimensions
    const { width, height } = firstPage.getSize();
    
    // Find signature locations (these are approximate - may need adjustment)
    // Client signature is typically on the left, contractor on the right
    const signatureY = 150; // Distance from bottom of page
    const clientSignatureX = 100;
    const contractorSignatureX = width - 300;
    
    // Draw client signature if available
    if (signatureData.clientSignature) {
      console.log('✍️ [OVERLAY] Adding client signature');
      
      // Draw signature text
      firstPage.drawText(signatureData.clientSignature, {
        x: clientSignatureX,
        y: signatureY,
        size: 24,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0.5), // Dark blue
      });
      
      // Draw date if available
      if (signatureData.clientSignedAt) {
        const dateStr = new Date(signatureData.clientSignedAt).toLocaleDateString();
        firstPage.drawText(`Date: ${dateStr}`, {
          x: clientSignatureX,
          y: signatureY - 30,
          size: 12,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
      }
    }
    
    // Draw contractor signature if available
    if (signatureData.contractorSignature) {
      console.log('✍️ [OVERLAY] Adding contractor signature');
      
      // Draw signature text
      firstPage.drawText(signatureData.contractorSignature, {
        x: contractorSignatureX,
        y: signatureY,
        size: 24,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0.5), // Dark blue
      });
      
      // Draw date if available
      if (signatureData.contractorSignedAt) {
        const dateStr = new Date(signatureData.contractorSignedAt).toLocaleDateString();
        firstPage.drawText(`Date: ${dateStr}`, {
          x: contractorSignatureX,
          y: signatureY - 30,
          size: 12,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
      }
    }
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    console.log('✅ [OVERLAY] PDF overlay completed successfully');
    
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('❌ [OVERLAY] Error in PDF overlay:', error);
    throw error;
  }
}

/**
 * Generate original contract PDF from HTML first, then overlay signatures
 * This is a two-step process to ensure perfect formatting
 */
export async function generateSignedContractWithOverlay(
  contractHtml: string,
  signatureData: SignatureData,
  contractId: string
): Promise<Buffer> {
  try {
    console.log('📄 [OVERLAY] Starting two-step PDF generation process');
    
    // Step 1: Generate original PDF from HTML using Puppeteer
    const puppeteer = await import('puppeteer');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    // Set the HTML content (use domcontentloaded to avoid external resource timeouts)
    await page.setContent(contractHtml, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    
    // Wait for all images to load
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images, (img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.addEventListener("load", resolve);
            img.addEventListener("error", resolve);
            setTimeout(resolve, 3000);
          });
        })
      );
    });
    
    // Generate PDF
    const originalPdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in',
      },
    });
    
    await browser.close();
    
    // Save original PDF temporarily
    const tempPath = path.join(process.cwd(), 'temp', `${contractId}_original.pdf`);
    await fs.mkdir(path.dirname(tempPath), { recursive: true });
    await fs.writeFile(tempPath, originalPdfBuffer);
    
    // Step 2: Overlay signatures on the original PDF
    const signedPdfBuffer = await overlaySignaturesOnPdf(tempPath, signatureData);
    
    // Clean up temp file
    await fs.unlink(tempPath).catch(() => {});
    
    return signedPdfBuffer;
  } catch (error) {
    console.error('❌ [OVERLAY] Error in two-step generation:', error);
    throw error;
  }
}