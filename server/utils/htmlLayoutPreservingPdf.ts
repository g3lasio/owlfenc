import * as puppeteer from 'puppeteer';

interface PdfOptions {
  title?: string;
  contractId?: string;
}

/**
 * Creates a PDF that EXACTLY preserves the HTML layout
 * This is the ultimate solution to maintain 100% visual fidelity
 */
export async function createPdfWithExactHtmlLayout(
  htmlContent: string,
  options: PdfOptions = {}
): Promise<Buffer> {
  console.log('🎯 [EXACT-LAYOUT] Starting PDF generation with exact HTML layout preservation');
  
  let browser;
  
  try {
    // Launch Puppeteer with optimal settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ],
    });
    
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2,
    });
    
    // Inject the HTML content
    await page.setContent(htmlContent, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000,
    });
    
    // Wait for any fonts to load
    await page.evaluateHandle('document.fonts.ready');
    
    // Additional wait to ensure all rendering is complete
    await page.waitForTimeout(1000);
    
    // Generate PDF with settings that preserve the exact layout
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; font-family: 'Times New Roman', serif; color: #666;">
          <span style="margin: 0 auto;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
      margin: {
        top: '0.75in',
        right: '0.75in',
        bottom: '1in',
        left: '0.75in',
      },
      preferCSSPageSize: false,
      scale: 1,
    });
    
    console.log('✅ [EXACT-LAYOUT] PDF generated successfully with exact HTML layout preserved');
    return Buffer.from(pdfBuffer);
    
  } catch (error) {
    console.error('❌ [EXACT-LAYOUT] Error generating PDF:', error);
    throw new Error(`Failed to generate PDF with exact layout: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Fallback method using simpler PDF generation
 */
export async function createFallbackPdf(
  htmlContent: string,
  options: PdfOptions = {}
): Promise<Buffer> {
  console.log('📄 [FALLBACK] Creating simple PDF from HTML content');
  
  try {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const cheerio = await import('cheerio');
    
    // Parse HTML to extract key information
    const $ = cheerio.load(htmlContent);
    
    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();
    
    // Embed fonts
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
    // Add content
    let yPosition = height - 80;
    
    // Title
    const title = options.title || 'INDEPENDENT CONTRACTOR AGREEMENT';
    page.drawText(title, {
      x: 50,
      y: yPosition,
      size: 18,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;
    
    // Extract and add key contract information
    const contractText = $.text()
      .replace(/\s+/g, ' ')
      .trim();
    
    // Add contract ID if provided
    if (options.contractId) {
      page.drawText(`Contract ID: ${options.contractId}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: timesRoman,
        color: rgb(0.5, 0.5, 0.5),
      });
      yPosition -= 30;
    }
    
    // Add main content (truncated for simple fallback)
    const lines = contractText.split(' ').reduce((acc: string[], word, i) => {
      if (i % 10 === 0) acc.push('');
      acc[acc.length - 1] += word + ' ';
      return acc;
    }, []);
    
    for (const line of lines.slice(0, 20)) {
      if (yPosition < 100) break;
      page.drawText(line.trim(), {
        x: 50,
        y: yPosition,
        size: 12,
        font: timesRoman,
        color: rgb(0, 0, 0),
        maxWidth: width - 100,
      });
      yPosition -= 20;
    }
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    console.log('✅ [FALLBACK] Simple PDF created successfully');
    
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error('❌ [FALLBACK] Error creating fallback PDF:', error);
    throw error;
  }
}