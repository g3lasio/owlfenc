import puppeteer from "puppeteer";
import { Buffer } from "buffer";
import { getChromiumExecutablePath } from "./utils/chromiumResolver";

export class EnhancedPdfService {
  private static instance: EnhancedPdfService;

  static getInstance(): EnhancedPdfService {
    if (!EnhancedPdfService.instance) {
      EnhancedPdfService.instance = new EnhancedPdfService();
    }
    return EnhancedPdfService.instance;
  }

  async generatePdfFromHtml(html: string, options: {
    format?: 'A4' | 'Letter';
    landscape?: boolean;
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  } = {}): Promise<Buffer> {
    console.log("🔄 [ENHANCED-PDF] Starting enhanced PDF generation...");

    let browser;

    try {
      const executablePath = getChromiumExecutablePath();

      browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
          "--disable-extensions",
          "--disable-plugins",
          "--disable-features=VizDisplayCompositor",
          "--disable-background-timer-throttling",
          "--disable-renderer-backgrounding",
          "--disable-backgrounding-occluded-windows",
        ],
      });

      const page = await browser.newPage();

      // Set optimal viewport for PDF generation
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 1,
      });

      // Enhanced content loading with error handling
      console.log("📄 [ENHANCED-PDF] Setting page content...");
      await page.setContent(html, {
        waitUntil: ["networkidle0", "domcontentloaded", "load"],
        timeout: 45000,
      });

      // Wait for fonts and CSS to fully load
      console.log("🎨 [ENHANCED-PDF] Waiting for styles to load...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Ensure all fonts are loaded
      await page.evaluate(() => document.fonts.ready);
      
      // Wait for any CSS transitions/animations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Validate content is properly rendered
      const contentHeight = await page.evaluate(() => document.body.scrollHeight);
      console.log(`📏 [ENHANCED-PDF] Content height: ${contentHeight}px`);

      // Generate PDF with optimized settings
      console.log("🖨️ [ENHANCED-PDF] Generating PDF...");
      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        landscape: options.landscape || false,
        margin: {
          top: options.margin?.top || "0.5in",
          right: options.margin?.right || "0.5in",
          bottom: options.margin?.bottom || "0.5in",
          left: options.margin?.left || "0.5in",
        },
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        scale: 1.0,
        timeout: 30000,
      });

      // Convert to Buffer and validate
      const finalBuffer = Buffer.from(pdfBuffer);
      
      console.log("✅ [ENHANCED-PDF] PDF generated successfully");
      console.log("🔍 [ENHANCED-PDF] Buffer validation:", {
        isBuffer: Buffer.isBuffer(finalBuffer),
        length: finalBuffer.length,
        firstBytes: finalBuffer.subarray(0, 8).toString("hex"),
        isPDF: finalBuffer.subarray(0, 4).toString() === "%PDF",
        sizeKB: Math.round(finalBuffer.length / 1024),
      });

      // Validate PDF header
      if (!finalBuffer.subarray(0, 4).toString().startsWith("%PDF")) {
        throw new Error("Generated file is not a valid PDF");
      }

      return finalBuffer;
    } catch (error) {
      console.error("❌ [ENHANCED-PDF] PDF generation failed:", error);
      throw new Error(`Enhanced PDF generation failed: ${(error as Error).message}`);
    } finally {
      if (browser) {
        await browser.close();
        console.log("🏁 [ENHANCED-PDF] Browser closed");
      }
    }
  }

  async validateHtml(html: string): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Basic HTML validation
    if (!html.includes('<!DOCTYPE html>')) {
      issues.push("Missing DOCTYPE declaration");
    }
    
    if (!html.includes('<head>') || !html.includes('</head>')) {
      issues.push("Missing or malformed head section");
    }
    
    if (!html.includes('<style>') && !html.includes('style=')) {
      issues.push("No CSS styles found");
    }
    
    if (html.length < 1000) {
      issues.push("HTML content seems too short");
    }
    
    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

export const enhancedPdfService = EnhancedPdfService.getInstance();