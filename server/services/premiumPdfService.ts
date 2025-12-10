import puppeteer, { Browser } from "puppeteer";

// Browser Pool for fast PDF generation (avoids 5-7 second startup per request)
class BrowserPool {
  private static instance: BrowserPool;
  private browser: Browser | null = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<Browser> | null = null;
  private lastUsed: number = 0;
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer: NodeJS.Timeout | null = null;

  static getInstance(): BrowserPool {
    if (!BrowserPool.instance) {
      BrowserPool.instance = new BrowserPool();
    }
    return BrowserPool.instance;
  }

  async getBrowser(): Promise<Browser> {
    this.lastUsed = Date.now();
    
    // If browser exists and is connected, return it
    if (this.browser && this.browser.isConnected()) {
      this.scheduleCleanup();
      return this.browser;
    }

    // If already initializing, wait for that promise
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    // Initialize new browser
    this.isInitializing = true;
    this.initPromise = this.createBrowser();
    
    try {
      this.browser = await this.initPromise;
      this.scheduleCleanup();
      return this.browser;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  private async createBrowser(): Promise<Browser> {
    console.log("🚀 [BROWSER-POOL] Launching persistent browser instance...");
    const executablePath = "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium";
    
    const browser = await puppeteer.launch({
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
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-translate",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
      ],
    });
    
    console.log("✅ [BROWSER-POOL] Browser launched successfully");
    return browser;
  }

  private scheduleCleanup(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }
    
    this.cleanupTimer = setTimeout(async () => {
      if (this.browser && Date.now() - this.lastUsed >= this.IDLE_TIMEOUT) {
        console.log("🧹 [BROWSER-POOL] Closing idle browser...");
        await this.closeBrowser();
      }
    }, this.IDLE_TIMEOUT);
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {
        console.warn("⚠️ [BROWSER-POOL] Error closing browser:", e);
      }
      this.browser = null;
    }
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Export singleton for use across the app
export const browserPool = BrowserPool.getInstance();

export interface ContractPdfData {
  client: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  contractor: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  project: {
    type: string;
    description: string;
    location: string;
  };
  financials: {
    total: number;
  };
  jurisdiction?: {
    name: string;
    code: string;
    contractTitle: string;
    governingLaw: string;
    licenseRequirement: string;
    constructionStandards: string;
  };
  protectionClauses?: Array<{
    title: string;
    content: string;
  }>;
  permitInfo?: {
    permitsRequired: boolean;
    responsibility: string;
    numbers: string;
  };
  timeline?: {
    startDate: string;
    endDate: string;
    estimatedDuration?: string;
  };
  warranties?: {
    workmanship: string;
    materials: string;
  };
}

class PremiumPdfService {
  private static instance: PremiumPdfService;

  static getInstance(): PremiumPdfService {
    if (!PremiumPdfService.instance) {
      PremiumPdfService.instance = new PremiumPdfService();
    }
    return PremiumPdfService.instance;
  }

  /**
   * Formats currency values properly without converting
   */
  private formatCurrency(amount: number): string {
    // Format as currency directly without conversion
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Generar PDF con firmas integradas
   */
  async generateContractWithSignatures(data: {
    contractHTML: string;
    contractorSignature: {
      name: string;
      signatureData: string;
      typedName?: string;
      signedAt: Date;
    };
    clientSignature: {
      name: string;
      signatureData: string;
      typedName?: string;
      signedAt: Date;
    };
  }): Promise<Buffer> {
    let browser;
    const executablePath =
      "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium";

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
      ],
    });

    try {
      const page = await browser.newPage();

      // Create enhanced HTML with embedded signatures
      const enhancedHTML = this.embedSignaturesInHTML(
        data.contractHTML,
        data.contractorSignature,
        data.clientSignature,
      );

      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 1600 });

      // Set content with longer timeout and better error handling
      await page.setContent(enhancedHTML, {
        waitUntil: "networkidle0",
        timeout: 60000,
      });

      // Wait for images to load
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images, (img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.addEventListener("load", resolve);
              img.addEventListener("error", resolve);
              setTimeout(resolve, 3000);
            });
          }),
        );
      });

      // Generate PDF with signatures
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20mm",
          right: "15mm",
          bottom: "20mm",
          left: "15mm",
        },
      });

      console.log(
        "✅ [PDF-SERVICE] Signed PDF generated successfully, size:",
        pdfBuffer.length,
      );

      // Ensure proper buffer handling
      const finalBuffer = Buffer.isBuffer(pdfBuffer)
        ? pdfBuffer
        : Buffer.from(pdfBuffer);

      // Validate PDF
      if (finalBuffer.length === 0) {
        throw new Error("Generated PDF is empty");
      }

      return finalBuffer;
    } finally {
      await browser.close();
    }
  }

  /**
   * Embed signatures directly into contract HTML
   */
  private embedSignaturesInHTML(
    contractHTML: string,
    contractorSignature: {
      name: string;
      signatureData: string;
      typedName?: string;
      signedAt: Date;
    },
    clientSignature: {
      name: string;
      signatureData: string;
      typedName?: string;
      signedAt: Date;
    },
  ): string {
    // Helper function to create signature image with enhanced base64 handling
    const createSignatureImage = (
      signatureData: string,
      name: string,
      typedName?: string,
    ) => {
      try {
        if (signatureData && signatureData.startsWith("data:image")) {
          // Canvas/drawn signature - enhanced validation and cleaning
          console.log(`🖋️ [SIGNATURE-DEBUG] Processing drawn signature for ${name}`);
          
          let cleanData = signatureData.trim();
          
          // Ensure proper data URI format
          if (!cleanData.startsWith("data:image/png;base64,") && !cleanData.startsWith("data:image/jpeg;base64,")) {
            // Try to fix common malformed data URIs
            if (cleanData.includes("base64,")) {
              const base64Part = cleanData.split("base64,")[1];
              if (base64Part && base64Part.length > 50) {
                cleanData = `data:image/png;base64,${base64Part}`;
              }
            }
          }
          
          // Validate the base64 content
          if (cleanData.includes("base64,") && cleanData.length > 100) {
            console.log(`✅ [SIGNATURE-DEBUG] Valid drawn signature detected, length: ${cleanData.length}`);
            
            // Create img tag with enhanced styling for PDF rendering
            return `<img src="${cleanData}" 
              style="
                max-height: 50px; 
                max-width: 240px; 
                height: auto; 
                width: auto; 
                object-fit: contain; 
                display: block; 
                margin: 0 auto;
                border: none;
                background: transparent;
              " 
              alt="Drawn Signature" 
              crossorigin="anonymous" />`;
          } else {
            console.warn(`❌ [SIGNATURE-DEBUG] Invalid signature data for ${name}:`, {
              startsWithDataImage: signatureData.startsWith("data:image"),
              includesBase64: signatureData.includes("base64,"),
              length: signatureData.length
            });
            return `<div style="height: 50px; width: 240px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-style: italic; background: #f9f9f9; color: #666;">Invalid Signature Data</div>`;
          }
        } else {
          // Typed signature - create clean SVG
          console.log(`📝 [SIGNATURE-DEBUG] Processing typed signature for ${name}`);
          
          const sigName = String(typedName || name || "Signature")
            .replace(/[<>&"'`]/g, "")
            .substring(0, 25);

          const svgContent = `<svg width="240" height="50" xmlns="http://www.w3.org/2000/svg" style="background: transparent;">
            <text x="120" y="32" text-anchor="middle" font-family="Times New Roman, serif" font-style="italic" font-size="18" fill="#1a365d">${sigName}</text>
          </svg>`;

          const svgData = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString("base64")}`;
          return `<img src="${svgData}" 
            style="
              max-height: 50px; 
              max-width: 240px; 
              height: auto; 
              width: auto; 
              display: block; 
              margin: 0 auto;
              border: none;
              background: transparent;
            " 
            alt="Typed Signature" />`;
        }
      } catch (error) {
        console.error(`❌ [SIGNATURE-DEBUG] Error creating signature image for ${name}:`, error);
        return `<div style="height: 50px; width: 240px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-style: italic; color: #666; background: #f9f9f9;">Signature Processing Error</div>`;
      }
    };

    // Inject signatures into original contract fields
    let modifiedHTML = contractHTML;

    console.log("🔍 [SIGNATURE-DEBUG] Looking for signature placeholders in HTML...");
    console.log("🔍 [SIGNATURE-DEBUG] HTML length:", contractHTML.length);
    // Note: HTML preview removed to prevent PII leakage in logs

    // Create signature images
    const contractorSigImage = createSignatureImage(
      contractorSignature.signatureData,
      contractorSignature.name,
      contractorSignature.typedName,
    );

    const clientSigImage = createSignatureImage(
      clientSignature.signatureData,
      clientSignature.name,
      clientSignature.typedName,
    );

    // ✅ FIXED: Each strategy uses its own independent counter to alternate correctly
    // Strategy 1: Replace "Digital signature on file" - alternates contractor/client
    let replacementCount = 0;
    modifiedHTML = modifiedHTML.replace(
      /(.{0,200})Digital signature on file/gi,
      (match, contextBefore) => {
        replacementCount++;
        const isContractor = replacementCount % 2 === 1;
        const sigImage = isContractor ? contractorSigImage : clientSigImage;
        const sigName = isContractor ? 'CONTRACTOR' : 'CLIENT';
        console.log(`✅ [SIGNATURE-DEBUG] Strategy 1: Replacing "Digital signature on file" #${replacementCount} for ${sigName}`);
        return contextBefore + sigImage;
      }
    );

    // Strategy 2: Replace empty sign-space divs - alternates contractor/client
    let signSpaceCount = 0;
    modifiedHTML = modifiedHTML.replace(
      /(.{0,200})<div class="sign-space"><\/div>/g,
      (match, contextBefore) => {
        signSpaceCount++;
        const isContractor = signSpaceCount % 2 === 1;
        const sigImage = isContractor ? contractorSigImage : clientSigImage;
        const sigName = isContractor ? 'CONTRACTOR' : 'CLIENT';
        console.log(`✅ [SIGNATURE-DEBUG] Strategy 2: Replacing sign-space #${signSpaceCount} for ${sigName}`);
        return `${contextBefore}<div class="sign-space" style="height: 60px; margin: 10px 0; display: flex; align-items: center; justify-content: center; border-bottom: 2px solid #000; padding: 5px;">
          ${sigImage}
        </div>`;
      }
    );

    // ✅ HELPER: Safely parse any date format (Firestore Timestamp, Date, string, number)
    const parseDateSafe = (date: any, context: string): Date => {
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date;
      }
      if (date && typeof date.toDate === 'function') {
        // Firestore Timestamp
        return date.toDate();
      }
      if (typeof date === 'number') {
        // Unix timestamp (seconds or milliseconds)
        return new Date(date < 1e12 ? date * 1000 : date);
      }
      if (typeof date === 'string' && date) {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) return parsed;
      }
      console.warn(`⚠️ [SIGNATURE-DEBUG] Could not parse date for ${context}, using current date. Value:`, date);
      return new Date();
    };

    // Strategy 3: Replace "[object Object]" dates - alternates contractor/client
    let dateObjectCount = 0;
    modifiedHTML = modifiedHTML.replace(
      /(.{0,200})\[object Object\]/g,
      (match, contextBefore) => {
        dateObjectCount++;
        const isContractor = dateObjectCount % 2 === 1;
        const sigDate = isContractor ? contractorSignature.signedAt : clientSignature.signedAt;
        const sigName = isContractor ? 'CONTRACTOR' : 'CLIENT';
        const dateObj = parseDateSafe(sigDate, sigName);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        console.log(`✅ [SIGNATURE-DEBUG] Strategy 3: Replacing [object Object] #${dateObjectCount} for ${sigName} with ${formattedDate}`);
        return `${contextBefore}<span style="font-weight: bold; border-bottom: 1px solid #000; padding: 2px 10px;">${formattedDate}</span>`;
      }
    );

    // Strategy 4: Replace date placeholders - alternates contractor/client
    let dateCount = 0;
    modifiedHTML = modifiedHTML.replace(
      /(.{0,200})Date:\s*____________________/g,
      (match, contextBefore) => {
        dateCount++;
        const isContractor = dateCount % 2 === 1;
        const sigDate = isContractor ? contractorSignature.signedAt : clientSignature.signedAt;
        const sigName = isContractor ? 'CONTRACTOR' : 'CLIENT';
        const dateObj = parseDateSafe(sigDate, sigName);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        console.log(`✅ [SIGNATURE-DEBUG] Strategy 4: Replacing date placeholder #${dateCount} for ${sigName} with ${formattedDate}`);
        return `${contextBefore}Date: <span style="font-weight: bold; border-bottom: 1px solid #000; padding: 2px 10px;">${formattedDate}</span>`;
      }
    );

    // Strategy 5 removed - it was corrupting existing <img> tags by creating nested images

    // ✅ Strategy 6: Replace empty <div class="signature-line"></div> - alternates contractor/client
    let signatureLineCount = 0;
    modifiedHTML = modifiedHTML.replace(
      /<div class="signature-line"><\/div>/g,
      (match) => {
        signatureLineCount++;
        const isContractor = signatureLineCount % 2 === 1;
        const sigImage = isContractor ? contractorSigImage : clientSigImage;
        const sigName = isContractor ? 'CONTRACTOR' : 'CLIENT';
        console.log(`✅ [SIGNATURE-DEBUG] Strategy 6: Replacing signature-line #${signatureLineCount} for ${sigName}`);
        return `<div class="signature-line" style="min-height: 60px; border-bottom: 2px solid #000; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 10px; margin: 10px 0;">
          ${sigImage}
        </div>`;
      }
    );

    // ✅ Strategy 7: Replace empty <span class="date-line"></span> - alternates contractor/client
    let dateLineCount = 0;
    modifiedHTML = modifiedHTML.replace(
      /<span class="date-line"><\/span>/g,
      (match) => {
        dateLineCount++;
        const isContractor = dateLineCount % 2 === 1;
        const sigDate = isContractor ? contractorSignature.signedAt : clientSignature.signedAt;
        const sigName = isContractor ? 'CONTRACTOR' : 'CLIENT';
        const dateObj = parseDateSafe(sigDate, sigName);
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        console.log(`✅ [SIGNATURE-DEBUG] Strategy 7: Replacing date-line #${dateLineCount} for ${sigName} with ${formattedDate}`);
        return `<span class="date-line" style="font-weight: bold; border-bottom: 1px solid #000; padding: 2px 10px;">${formattedDate}</span>`;
      }
    );

    console.log(`📊 [SIGNATURE-DEBUG] Replacement summary:`);
    console.log(`  - "Digital signature on file" replaced: ${replacementCount}`);
    console.log(`  - Sign-space divs replaced: ${signSpaceCount}`);
    console.log(`  - [object Object] dates replaced: ${dateObjectCount}`);
    console.log(`  - Date placeholders replaced: ${dateCount}`);
    console.log(`  - Signature-line divs replaced: ${signatureLineCount}`);
    console.log(`  - Date-line spans replaced: ${dateLineCount}`);

    // Only add verification footer if signatures were successfully embedded
    if (
      modifiedHTML.includes("EXECUTION") ||
      (modifiedHTML.includes("CONTRACTOR") && modifiedHTML.includes("CLIENT"))
    ) {
      console.log(
        "✅ [SIGNATURE-DEBUG] Signatures embedded successfully, returning modified HTML",
      );
      return modifiedHTML;
    } else {
      // Fallback: add signature section at the end if EXECUTION section not found
      console.log("⚠️ [SIGNATURE-DEBUG] Adding fallback signature section");
      // ✅ FIXED: Use parseDateSafe for robust date handling
      const contractorDateObj = parseDateSafe(contractorSignature.signedAt, 'CONTRACTOR fallback');
      const clientDateObj = parseDateSafe(clientSignature.signedAt, 'CLIENT fallback');
      const signatureSection = `
        <div style="margin-top: 40px; page-break-inside: avoid; border-top: 2px solid #000; padding-top: 20px;">
          <h3 style="text-align: center; margin-bottom: 30px;">DIGITAL SIGNATURES</h3>
          <div style="display: flex; justify-content: space-between; gap: 40px;">
            <div style="flex: 1; text-align: center; border: 2px solid #000; padding: 20px;">
              <h4>CONTRACTOR</h4>
              <div style="margin: 20px 0; min-height: 60px; border-bottom: 2px solid #000; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 10px;">
                ${contractorSigImage}
              </div>
              <p><strong>${contractorSignature.name}</strong></p>
              <p>Date: ${contractorDateObj.toLocaleDateString()}</p>
            </div>
            <div style="flex: 1; text-align: center; border: 2px solid #000; padding: 20px;">
              <h4>CLIENT</h4>
              <div style="margin: 20px 0; min-height: 60px; border-bottom: 2px solid #000; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 10px;">
                ${clientSigImage}
              </div>
              <p><strong>${clientSignature.name}</strong></p>
              <p>Date: ${clientDateObj.toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      `;
      return modifiedHTML + signatureSection;
    }
  }

  /**
   * Generate PDF with embedded signatures
   */
  async generateSignedPDF(data: {
    contractHTML: string;
    contractorSignature: {
      name: string;
      signatureData: string;
      typedName?: string;
      signedAt: Date;
    };
    clientSignature: {
      name: string;
      signatureData: string;
      typedName?: string;
      signedAt: Date;
    };
  }): Promise<Buffer> {
    let browser;
    const executablePath =
      "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium";

    try {
      console.log(
        "📄 [PDF-SIGNATURES] Starting PDF generation with integrated signatures...",
      );

      // Modify HTML to include actual signatures
      const htmlWithSignatures = this.integrateSignatures(
        data.contractHTML,
        data.contractorSignature,
        data.clientSignature,
      );

      // Launch browser and generate PDF
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
        ],
      });

      const page = await browser.newPage();
      await page.setContent(htmlWithSignatures, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "1in",
          right: "1in",
          bottom: "1in",
          left: "1in",
        },
      });

      console.log(
        "✅ [PDF-SIGNATURES] PDF generated successfully with signatures, size:",
        pdfBuffer.length,
      );

      // Ensure proper buffer handling
      const finalBuffer = Buffer.isBuffer(pdfBuffer)
        ? pdfBuffer
        : Buffer.from(pdfBuffer);

      // Validate PDF
      if (finalBuffer.length === 0) {
        throw new Error("Generated signed PDF is empty");
      }

      return finalBuffer;
    } catch (error: any) {
      console.error(
        "❌ [PDF-SIGNATURES] Error generating PDF with signatures:",
        error,
      );
      throw new Error(`Failed to generate signed PDF: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Integrar firmas en el HTML del contrato
   */
  private integrateSignatures(
    contractHTML: string,
    contractorSignature: any,
    clientSignature: any,
  ): string {
    try {
      console.log(
        "🖊️ [PDF-SIGNATURES] Integrating signatures into contract HTML...",
      );

      // Use the same signature embedding logic as embedSignaturesInHTML
      console.log("✅ [PDF-SIGNATURES] Signatures integrated successfully");
      return this.embedSignaturesInHTML(
        contractHTML,
        contractorSignature,
        clientSignature,
      );
    } catch (error: any) {
      console.error("❌ [PDF-SIGNATURES] Error integrating signatures:", error);
      throw new Error(
        `Failed to integrate signatures: ${error?.message || "Unknown error"}`,
      );
    }
  }

  /**
   * Crear HTML para una firma individual
   */
  private createSignatureHtml(signature: any, role: string): string {
    const signedDate = new Date(signature.signedAt).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

    return `
      <div style="flex: 1; text-align: center; padding: 20px; border: 2px solid #000; margin: 10px;">
        <h4 style="margin: 0 0 20px 0; font-family: 'Times New Roman', serif;">${role.toUpperCase()}</h4>

        <div style="margin: 20px 0; min-height: 60px; border-bottom: 2px solid #000; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 10px;">
          ${
            signature.signatureData
              ? `<img src="${signature.signatureData}" alt="${role} Signature" style="max-height: 50px; max-width: 200px;">`
              : `<span style="font-family: 'Amsterdam Four', cursive; font-size: 24px;">${signature.typedName || signature.name}</span>`
          }
        </div>

        <p style="margin: 10px 0 5px 0; font-weight: bold; font-family: 'Times New Roman', serif;">
          ${signature.name}
        </p>

        <p style="margin: 5px 0; font-size: 10pt; color: #666;">
          Digitally signed on<br>
          ${signedDate}
        </p>

        <div style="margin-top: 15px; font-size: 8pt; color: #999; text-align: center;">
          <p style="margin: 2px 0;">✓ Digital Signature Verified</p>
          <p style="margin: 2px 0;">✓ Timestamp Authenticated</p>
          <p style="margin: 2px 0;">✓ Legal Defense System</p>
        </div>
      </div>
    `;
  }

  generateProfessionalLegalContractHTML(data: ContractPdfData): string {
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Independent Contractor Agreement</title>
    <style>
        @page {
            size: A4;
            margin: 1in 1in 1in 1in;
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-family: 'Times New Roman', serif;
                font-size: 10pt;
                color: #666;
            }
        }

        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000;
            background: white;
            margin: 0;
            padding: 0;
        }

        .container {
            max-width: 100%;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
        }

        .header h1 {
            font-size: 18pt;
            font-weight: bold;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .date-section {
            text-align: right;
            margin: 20px 0;
            font-weight: bold;
        }

        .parties-section {
            margin: 30px 0;
        }

        .party-info {
            display: table;
            width: 100%;
            margin: 20px 0;
            border-collapse: separate;
            border-spacing: 20px 0;
        }

        .party-box {
            display: table-cell;
            width: 45%;
            border: 2px solid #000;
            padding: 20px;
            vertical-align: top;
        }

        .party-title {
            font-weight: bold;
            font-size: 14pt;
            text-align: center;
            margin-bottom: 15px;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
        }

        .party-details {
            line-height: 1.8;
        }

        .content-section {
            margin: 25px 0;
        }

        .section-title {
            font-size: 14pt;
            font-weight: bold;
            margin: 25px 0 15px 0;
            text-transform: uppercase;
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
        }

        .legal-text {
            text-align: justify;
            margin-bottom: 15px;
            line-height: 1.6;
        }

        .numbered-section {
            margin-bottom: 25px;
        }

        .section-number {
            font-weight: bold;
            text-decoration: underline;
            font-size: 13pt;
        }

        .page-break {
            page-break-before: always;
            margin-top: 30px;
        }

        .signature-section {
            margin-top: 60px;
            page-break-inside: avoid;
        }

        .signature-container {
            display: table;
            width: 100%;
            margin: 40px 0;
            border-collapse: separate;
            border-spacing: 30px 0;
        }

        .signature-box {
            display: table-cell;
            width: 45%;
            border: 2px solid #000;
            padding: 30px 20px;
            vertical-align: top;
            text-align: center;
        }

        .signature-title {
            font-weight: bold;
            font-size: 14pt;
            margin-bottom: 30px;
            text-transform: uppercase;
        }

        .signature-line {
            border-bottom: 2px solid #000;
            height: 50px;
            margin: 25px 0;
        }

        .date-line {
            border-bottom: 1px solid #000;
            display: inline-block;
            width: 150px;
            height: 20px;
        }

        .footer-discrete {
            text-align: center;
            font-size: 8pt;
            color: #999;
            margin-top: 60px;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Independent Contractor Agreement</h1>
        </div>

        <div class="date-section">
            <strong>Agreement Date:</strong> ${currentDate}
        </div>

        <div class="parties-section">
            <div class="party-info">
                <div class="party-box">
                    <div class="party-title">Contractor</div>
                    <div class="party-details">
                        <p><strong>Business Name:</strong> ${data.contractor?.name || "Professional Contractor"}</p>
                        <p><strong>Business Address:</strong><br>${data.contractor?.address || "Address not provided"}</p>
                        <p><strong>Telephone:</strong> ${data.contractor?.phone || "Phone not provided"}</p>
                        <p><strong>Email:</strong> ${data.contractor?.email || "Email not provided"}</p>
                    </div>
                </div>
                <div class="party-box">
                    <div class="party-title">Client</div>
                    <div class="party-details">
                        <p><strong>Full Name/Company:</strong> ${data.client.name}</p>
                        <p><strong>Property Address:</strong><br>${data.client.address}</p>
                        <p><strong>Telephone:</strong> ${data.client.phone}</p>
                        <p><strong>Email:</strong> ${data.client.email}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="content-section">
            <div class="section-title">WHEREAS CLAUSES</div>
            <p class="legal-text">
                <strong>WHEREAS,</strong> the Client desires to engage the services of an independent contractor to perform specialized ${data.project.type.toLowerCase()} work at the above-referenced property; and
            </p>
            <p class="legal-text">
                <strong>WHEREAS,</strong> the Contractor represents that it possesses the requisite skill, experience, expertise, and all necessary licenses to perform the specified work in accordance with industry standards and applicable regulations; and
            </p>
            <p class="legal-text">
                <strong>WHEREAS,</strong> both parties desire to establish clear terms and conditions governing their professional relationship and to define their respective rights, duties, and obligations;
            </p>
            <p class="legal-text">
                <strong>NOW, THEREFORE,</strong> in consideration of the mutual covenants, agreements, and undertakings contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:
            </p>
        </div>

        <div class="content-section">
            <div class="numbered-section">
                <p><span class="section-number">1. SCOPE OF WORK AND SPECIFICATIONS</span></p>
                <p class="legal-text">
                    The Contractor hereby agrees to furnish all labor, materials, equipment, and services necessary to complete the following work: ${data.project.description}. Said work shall be performed at the following location: ${data.project.location}. All work shall be executed in a professional, workmanlike manner in strict accordance with industry best practices, applicable building codes, municipal regulations, and manufacturer specifications. The Contractor warrants that all work will meet or exceed industry standards for quality and durability.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">2. CONTRACT PRICE AND PAYMENT TERMS</span></p>
                <p class="legal-text">
                    The total contract price for all work, materials, and services described herein shall be <strong>$${this.formatCurrency(data.financials.total)} USD</strong>. Payment shall be made according to the following schedule: (a) Fifty percent (50%) of the total contract price is due and payable upon execution of this Agreement as a down payment, and (b) The remaining fifty percent (50%) balance is due and payable immediately upon substantial completion and Client's acceptance of the work. All payments shall be made in United States currency. Late payments shall accrue interest at the rate of one and one-half percent (1.5%) per month or the maximum rate permitted by law, whichever is less.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">3. COMMENCEMENT AND COMPLETION</span></p>
                <p class="legal-text">
                    ${this.generateTimelineSection(data.timeline)}
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">4. INDEPENDENT CONTRACTOR STATUS</span></p>
                <p class="legal-text">
                    The Contractor is and shall remain an independent contractor in the performance of all work under this Agreement. Nothing contained herein shall be construed to create an employer-employee, partnership, joint venture, or agency relationship between the parties. The Contractor shall be solely responsible for all federal, state, and local taxes, withholdings, unemployment insurance, workers' compensation, and other statutory obligations. The Contractor retains the exclusive right to control the manner, method, and means of performing the contracted services, subject to achieving the specified results.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">5. MATERIALS, EQUIPMENT, AND WORKMANSHIP</span></p>
                <p class="legal-text">
                    Unless expressly specified otherwise in writing, the Contractor shall furnish and pay for all materials, equipment, tools, transportation, and incidental services necessary for the completion of the work. All materials shall be new, of first quality, and shall conform to applicable industry standards and manufacturer specifications. All equipment used shall be properly maintained and in safe working condition. The Contractor warrants that all work will be free from defects in materials and workmanship for a period of one (1) year from the date of completion.
                </p>
            </div>

        <div class="page-break"></div>

            <div class="numbered-section">
                <p><span class="section-number">6. INSURANCE AND LIABILITY</span></p>
                <p class="legal-text">
                    The Contractor shall maintain, at its own expense, comprehensive general liability insurance with minimum coverage limits of One Million Dollars ($1,000,000) per occurrence and Two Million Dollars ($2,000,000) aggregate, naming the Client as an additional insured. The Contractor shall also maintain workers' compensation insurance as required by law. Evidence of such insurance coverage shall be provided to the Client upon request. Each party agrees to indemnify, defend, and hold harmless the other party from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorney fees) arising from or relating to their own negligent acts, errors, or omissions in connection with this Agreement.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">7. CHANGE ORDERS AND MODIFICATIONS</span></p>
                <p class="legal-text">
                    No changes, modifications, or alterations to the scope of work, specifications, or contract terms shall be valid or binding unless executed in writing and signed by both parties. Any approved change order shall specify the nature of the change, adjustment to the contract price (if any), and any modification to the completion schedule. The Contractor shall not proceed with any additional work without a signed written change order. Verbal agreements or understandings shall not be enforceable.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">8. PERMITS, LICENSES, AND CODE COMPLIANCE</span></p>
                <p class="legal-text">
                    ${this.generatePermitSection(data.permitInfo)}
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">9. WARRANTY AND REMEDIES</span></p>
                <p class="legal-text">
                    ${this.generateWarrantySection(data.warranties)}
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">10. DEFAULT AND TERMINATION</span></p>
                <p class="legal-text">
                    Either party may terminate this Agreement upon the material breach of the other party, provided that the breaching party is given written notice of the breach and fails to cure such breach within ten (10) days after receipt of notice. In the event of termination, the Contractor shall be entitled to payment for all work satisfactorily completed prior to termination, less any damages sustained by the Client as a result of Contractor's breach. The Client may also terminate this Agreement for convenience upon thirty (30) days written notice, in which case the Contractor shall be compensated for all work completed and materials ordered prior to termination.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">11. DISPUTE RESOLUTION</span></p>
                <p class="legal-text">
                    Any disputes arising under this Agreement shall first be addressed through good faith negotiations between the parties. If such negotiations fail to resolve the dispute within thirty (30) days, the matter shall be submitted to binding arbitration administered by the American Arbitration Association under its Construction Industry Arbitration Rules. The arbitration shall be conducted in the county where the work is performed. The prevailing party in any arbitration or legal proceeding shall be entitled to recover reasonable attorney fees and costs from the non-prevailing party.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">12. SAFETY AND COMPLIANCE</span></p>
                <p class="legal-text">
                    The Contractor shall maintain a safe work environment and comply with all applicable Occupational Safety and Health Administration (OSHA) regulations and industry safety standards. The Contractor shall be solely responsible for the safety of its employees, subcontractors, and work site. All personnel shall use appropriate personal protective equipment and follow established safety protocols. The Contractor shall immediately report any workplace accidents or injuries to the Client and appropriate authorities.
                </p>
            </div>
        </div>

        ${
          data.protectionClauses && data.protectionClauses.length > 0
            ? `
        <div class="page-break"></div>
        <div class="content-section">
            <div class="section-title">INTELLIGENT CONTRACTOR PROTECTION CLAUSES</div>
            <div style="background: #f0f9ff; border: 2px solid #0891b2; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <p style="font-size: 11px; color: #0f172a; margin: 0; font-weight: bold; text-align: center;">
                    🛡️ The following ${data.protectionClauses.length} clause${data.protectionClauses.length > 1 ? "s have" : " has"} been intelligently selected to provide enhanced legal protection for this project
                </p>
            </div>
            ${data.protectionClauses
              .map(
                (clause, index) => `
                <div class="numbered-section" style="border-left: 4px solid #0891b2; padding-left: 20px; margin-bottom: 25px; background: linear-gradient(to right, #f0f9ff 0%, #ffffff 100%);">
                    <p><span class="section-number" style="color: #0891b2;">${index + 13}. ${clause.title.toUpperCase()}</span></p>
                    <div style="background: #e0f2fe; padding: 12px; border-radius: 6px; margin: 10px 0; border: 1px solid #b3e5fc;">
                        <p style="font-size: 9px; color: #0891b2; margin: 0 0 8px 0; font-weight: bold; text-transform: uppercase;">
                            🔒 SELECTED PROTECTION CLAUSE - STANDARD RISK MITIGATION
                        </p>
                        <p class="legal-text" style="margin: 0; color: #0f172a;">${clause.content || "Protective clause content not available"}</p>
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>
        `
            : ""
        }

        <div class="page-break"></div>

        <div class="content-section">
            <div class="section-title">GENERAL PROVISIONS</div>

            <div class="numbered-section">
                <p><span class="section-number">${data.protectionClauses ? data.protectionClauses.length + 13 : 13}. GOVERNING LAW AND JURISDICTION</span></p>
                <p class="legal-text">
                    This Agreement shall be governed by and construed in accordance with the ${data.jurisdiction?.governingLaw || "laws of the State of California"}, without regard to its conflict of laws principles. The parties hereby consent to the exclusive jurisdiction of the state and federal courts located in the county where the work is performed for the resolution of any disputes arising under this Agreement. This Agreement shall be binding upon and inure to the benefit of the parties' respective heirs, successors, and assigns.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">${data.protectionClauses ? data.protectionClauses.length + 14 : 14}. ENTIRE AGREEMENT AND MODIFICATIONS</span></p>
                <p class="legal-text">
                    This Agreement constitutes the complete and exclusive statement of the agreement between the parties and supersedes all prior negotiations, representations, understandings, and agreements, whether written or oral, relating to the subject matter hereof. No amendment, modification, or waiver of any provision of this Agreement shall be effective unless set forth in a written document signed by both parties. No course of dealing or usage of trade shall be used to modify, interpret, supplement, or alter the terms of this Agreement.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">${data.protectionClauses ? data.protectionClauses.length + 15 : 15}. SEVERABILITY AND CONSTRUCTION</span></p>
                <p class="legal-text">
                    If any provision of this Agreement is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. Any invalid provision shall be replaced by a valid provision that most closely approximates the intent and economic effect of the invalid provision. The headings used in this Agreement are for convenience only and shall not affect the interpretation of any provision. This Agreement has been negotiated by the parties and shall not be construed against either party as the drafter.
                </p>
            </div>

            <div class="numbered-section">
                <p><span class="section-number">${data.protectionClauses ? data.protectionClauses.length + 16 : 16}. NOTICES</span></p>
                <p class="legal-text">
                    All notices required or permitted under this Agreement shall be in writing and shall be deemed to have been duly given when personally delivered, or three (3) days after being sent by certified mail, return receipt requested, postage prepaid, to the addresses set forth above or to such other address as either party may designate by written notice to the other party.
                </p>
            </div>
        </div>

        <div class="signature-section">
            <div class="section-title">EXECUTION</div>
            <p class="legal-text" style="text-align: center; margin-bottom: 30px;">
                <strong>IN WITNESS WHEREOF,</strong> the parties have executed this Independent Contractor Agreement as of the date first written above.
            </p>

            <div class="signature-container">
                <div class="signature-box">
                    <div class="signature-title">CONTRACTOR</div>
                    <div class="signature-line"></div>
                    <p><strong>${data.contractor?.name || "Professional Contractor"}</strong></p>
                    <p>Print Name</p>
                    <br>
                    <p>Date: <span class="date-line"></span></p>
                </div>
                <div class="signature-box">
                    <div class="signature-title">CLIENT</div>
                    <div class="signature-line"></div>
                    <p><strong>${data.client.name}</strong></p>
                    <p>Print Name</p>
                    <br>
                    <p>Date: <span class="date-line"></span></p>
                </div>
            </div>
        </div>

        <div class="footer-discrete">
            Powered by Mervin AI
        </div>
    </div>
</body>
</html>
    `;
  }

  private generatePermitSection(permitInfo?: {
    permitsRequired?: boolean;
    required?: boolean;
    responsibility?: string;
    numbers?: string;
  }): string {
    console.log(
      "🔧 [PERMIT-DEBUG] generatePermitSection called with:",
      JSON.stringify(permitInfo, null, 2),
    );

    if (!permitInfo) {
      console.log("🔧 [PERMIT-DEBUG] No permitInfo provided, using default");
      // Default permit section when no permitInfo is provided
      return `The Contractor shall obtain and pay for all permits, licenses, and approvals required by federal, state, and local authorities for the performance of the work, unless specifically agreed otherwise in writing. All work shall be performed in strict compliance with applicable building codes, zoning ordinances, environmental regulations, safety requirements, and industry standards. The Contractor shall schedule and coordinate all required inspections. Upon completion, all permits shall be properly closed out and documentation provided to the Client.`;
    }

    let permitText = "";

    // Support both field names: 'required' from frontend and 'permitsRequired' as backup
    const permitsRequired = permitInfo.permitsRequired || permitInfo.required;
    const responsibility = permitInfo.responsibility || "contractor";
    const numbers = permitInfo.numbers || "";

    console.log("🔧 [PERMIT-DEBUG] Processed values:", {
      permitsRequired,
      responsibility,
      numbers,
    });

    if (permitsRequired) {
      if (responsibility === "contractor") {
        permitText = `<strong>Contractor Responsibility:</strong> The Contractor shall obtain and pay for all permits, licenses, and approvals required by federal, state, and local authorities for the performance of the work. `;
      } else if (responsibility === "client") {
        permitText = `<strong>Client Responsibility:</strong> The Client is responsible for obtaining and paying for all permits, licenses, and approvals required by federal, state, and local authorities for the performance of the work. The Contractor shall provide all necessary documentation and specifications required for permit applications. `;
      } else {
        permitText = `<strong>Shared Responsibility:</strong> Both parties agree to cooperate in obtaining all permits, licenses, and approvals required by federal, state, and local authorities for the performance of the work. Specific responsibilities shall be determined by mutual agreement in writing. `;
      }

      if (numbers && numbers.trim()) {
        permitText += `<strong>Permit Numbers:</strong> ${numbers}. `;
      }
    } else {
      permitText = `<strong>No Permits Required:</strong> Based on the scope of work, no permits are anticipated to be required for this project. However, if permits become necessary during the course of work, the parties agree to address permit requirements through a written change order. `;
    }

    permitText += `All work shall be performed in strict compliance with applicable building codes, zoning ordinances, environmental regulations, safety requirements, and industry standards. The responsible party shall schedule and coordinate all required inspections. Upon completion, all permits shall be properly closed out and documentation provided as appropriate.`;

    return permitText;
  }

  private generateTimelineSection(timeline?: {
    startDate: string;
    endDate: string;
    estimatedDuration?: string;
  }): string {
    if (!timeline || (!timeline.startDate && !timeline.endDate)) {
      // Default timeline section when no timeline data is provided
      return `The Contractor shall commence work within ten (10) business days following execution of this Agreement and receipt of the initial payment, weather and site conditions permitting. The Contractor shall proceed with due diligence and in a timely manner to achieve substantial completion. Time is of the essence in this Agreement. The Contractor shall provide the Client with reasonable advance notice of any circumstances that may delay completion, including but not limited to adverse weather conditions, permit delays, or unforeseen site conditions.`;
    }

    let timelineText = "";

    if (timeline.startDate) {
      const startDate = new Date(timeline.startDate);
      const formattedStartDate = startDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      timelineText += `<strong>Project Start Date:</strong> Work shall commence on or about ${formattedStartDate}, subject to receipt of initial payment and favorable weather conditions. `;
    } else {
      timelineText += `The Contractor shall commence work within ten (10) business days following execution of this Agreement and receipt of the initial payment, weather and site conditions permitting. `;
    }

    if (timeline.endDate) {
      const endDate = new Date(timeline.endDate);
      const formattedEndDate = endDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      timelineText += `<strong>Substantial Completion Date:</strong> All work shall be substantially completed by ${formattedEndDate}. `;
    }

    if (timeline.startDate && timeline.endDate) {
      const start = new Date(timeline.startDate);
      const end = new Date(timeline.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      timelineText += `<strong>Project Duration:</strong> The estimated completion time is ${diffDays} calendar days. `;
    }

    timelineText += `Time is of the essence in this Agreement. The Contractor shall proceed with due diligence and in a timely manner to achieve substantial completion. The Contractor shall provide the Client with reasonable advance notice of any circumstances that may delay completion, including but not limited to adverse weather conditions, permit delays, or unforeseen site conditions. Extensions of time may be granted only through written agreement of both parties.`;

    return timelineText;
  }

  private generateWarrantySection(warranties?: {
    workmanship: string;
    materials: string;
  }): string {
    if (!warranties || (!warranties.workmanship && !warranties.materials)) {
      // Default warranty section when no warranty data is provided
      return `The Contractor hereby warrants all work performed under this Agreement against defects in materials and workmanship for a period of twelve (12) months from the date of substantial completion. This warranty does not cover damage resulting from normal wear and tear, abuse, neglect, accident, or failure to properly maintain the work. Upon written notice of any warranty defect, the Contractor shall, at its option, repair or replace the defective work at no cost to the Client within thirty (30) days. This warranty is in addition to any manufacturer warranties that may apply to materials or equipment.`;
    }

    let warrantyText = "";

    if (warranties.workmanship) {
      warrantyText += `<strong>Workmanship Warranty:</strong> The Contractor hereby warrants all work performed under this Agreement against defects in workmanship for a period of ${warranties.workmanship} from the date of substantial completion. `;
    }

    if (warranties.materials) {
      warrantyText += `<strong>Materials Warranty:</strong> ${warranties.materials}. `;
    }

    warrantyText += `This warranty does not cover damage resulting from normal wear and tear, abuse, neglect, accident, or failure to properly maintain the work. Upon written notice of any warranty defect, the Contractor shall, at its option, repair or replace the defective work at no cost to the Client within thirty (30) days. These warranties are in addition to any manufacturer warranties that may apply to materials or equipment.`;

    return warrantyText;
  }

  async generateProfessionalPDF(data: ContractPdfData): Promise<Buffer> {
    const startTime = Date.now();
    console.log("🎨 [PREMIUM PDF] Starting premium contract generation...");

    let page = null;
    try {
      const html = this.generateProfessionalLegalContractHTML(data);
      
      // Use browser pool for fast PDF generation (reuses browser instance)
      const browser = await browserPool.getBrowser();
      const browserTime = Date.now() - startTime;
      console.log(`⚡ [BROWSER-POOL] Browser ready in ${browserTime}ms`);

      // Create new page in existing browser context
      page = await browser.newPage();
      
      // Use faster waitUntil option - domcontentloaded is sufficient for static HTML
      await page.setContent(html, { waitUntil: "domcontentloaded" });

      const pdfBuffer = Buffer.from(
        await page.pdf({
          format: "A4",
          printBackground: true,
          margin: {
            top: "1in",
            right: "1in",
            bottom: "1in",
            left: "1in",
          },
          displayHeaderFooter: true,
          headerTemplate: "<div></div>",
          footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `,
        }),
      );

      const totalTime = Date.now() - startTime;
      console.log(`✅ [PREMIUM PDF] Premium contract generated in ${totalTime}ms`);
      return pdfBuffer;
    } catch (error) {
      console.error("❌ [PREMIUM PDF] Error generating PDF:", error);
      throw new Error("Failed to generate premium PDF contract");
    } finally {
      // Always close the page, but keep browser alive for next request
      if (page) {
        try {
          await page.close();
        } catch (e) {
          // Ignore page close errors
        }
      }
    }
  }

  /**
   * Generate contract HTML for legal compliance workflow
   */
  async generateContractHTML(data: ContractPdfData): Promise<string> {
    try {
      console.log("📄 [HTML GENERATION] Creating contract HTML...");

      // Use the same template as PDF generation but return HTML
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Independent Contractor Agreement</title>
    <style>
        body { font-family: 'Times New Roman', serif; margin: 0; padding: 40px; background: white; color: #000; }
        .header { text-align: center; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
        .parties { display: flex; justify-content: space-between; margin: 30px 0; }
        .party { border: 2px solid #000; padding: 15px; width: 45%; }
        .party h3 { margin: 0 0 10px 0; font-size: 16px; text-align: center; }
        .section { margin: 20px 0; }
        .section h3 { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
        .clause { margin: 15px 0; text-align: justify; line-height: 1.6; }
        .signature-section { margin-top: 40px; display: flex; justify-content: space-between; }
        .signature-block { width: 45%; text-align: center; }
        .signature-line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 60px; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">INDEPENDENT CONTRACTOR AGREEMENT</div>
        <p>Contract No: CON-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}</p>
        <p>Date: ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="parties">
        <div class="party">
            <h3>CONTRACTOR</h3>
            <p><strong>${data.contractor.name}</strong></p>
            <p>${data.contractor.address}</p>
            <p>Phone: ${data.contractor.phone}</p>
            <p>Email: ${data.contractor.email}</p>
        </div>
        <div class="party">
            <h3>CLIENT</h3>
            <p><strong>${data.client.name}</strong></p>
            <p>${data.client.address}</p>
            <p>Phone: ${data.client.phone}</p>
            <p>Email: ${data.client.email}</p>
        </div>
    </div>

    <div class="section">
        <h3>1. PROJECT DESCRIPTION</h3>
        <div class="clause">
            The Contractor agrees to perform the following work: ${data.project.description || "Construction services"} 
            at the location: ${data.project.location}.
        </div>
    </div>

    <div class="section">
        <h3>2. COMPENSATION</h3>
        <div class="clause">
            The total contract amount is $${data.financials.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. 
            Payment terms and schedule to be agreed upon by both parties.
        </div>
    </div>

    ${
      data.timeline
        ? `
    <div class="section">
        <h3>3. TIMELINE</h3>
        <div class="clause">
            Work shall commence on ${data.timeline.startDate || "TBD"} and be completed by ${data.timeline.endDate || "TBD"}.
            ${data.timeline.estimatedDuration ? `Estimated duration: ${data.timeline.estimatedDuration}` : ""}
        </div>
    </div>
    `
        : ""
    }

    ${
      data.warranties
        ? `
    <div class="section">
        <h3>4. WARRANTIES</h3>
        <div class="clause">
            Workmanship Warranty: ${data.warranties.workmanship || "Standard warranty"}<br>
            Materials Warranty: ${data.warranties.materials || "Manufacturer warranty"}
        </div>
    </div>
    `
        : ""
    }

    ${
      data.permitInfo?.permitsRequired
        ? `
    <div class="section">
        <h3>5. PERMITS AND COMPLIANCE</h3>
        <div class="clause">
            Permits are required for this project. Responsibility: ${data.permitInfo.responsibility || "To be determined"}
            ${data.permitInfo.numbers ? `<br>Permit Numbers: ${data.permitInfo.numbers}` : ""}
        </div>
    </div>
    `
        : ""
    }

    <div class="section">
        <h3>6. GENERAL TERMS</h3>
        <div class="clause">
            This agreement constitutes the entire agreement between the parties. Any modifications must be in writing and signed by both parties.
            The Contractor agrees to perform all work in a professional manner according to industry standards.
        </div>
    </div>

    ${
      data.protectionClauses && data.protectionClauses.length > 0
        ? `
    <div class="section">
        <h3>7. PROTECTION CLAUSES</h3>
        ${data.protectionClauses
          .map(
            (clause) => `
        <div class="clause">
            <strong>${clause.title}:</strong> ${clause.content}
        </div>
        `,
          )
          .join("")}
    </div>
    `
        : ""
    }

    <div class="signature-section">
        <div class="signature-block">
            <div class="signature-line"></div>
            <p>Contractor Signature</p>
            <p>${data.contractor.name}</p>
            <p>Date: _______________</p>
        </div>
        <div class="signature-block">
            <div class="signature-line"></div>
            <p>Client Signature</p>
            <p>${data.client.name}</p>
            <p>Date: _______________</p>
        </div>
    </div>

    <div class="footer">
        <p>This contract is legally binding when signed by both parties</p>
        <p>Powered by Legal Defense Digital Signature System</p>
    </div>
</body>
</html>`;

      console.log("✅ [HTML GENERATION] Contract HTML generated successfully");
      return htmlContent;
    } catch (error) {
      console.error(
        "❌ [HTML GENERATION] Error generating contract HTML:",
        error,
      );
      throw new Error("Failed to generate contract HTML");
    }
  }

  /**
   * Generate PDF from HTML content
   */
  async generatePdfFromHtml(
    htmlContent: string,
    options: any = {},
  ): Promise<Buffer> {
    let browser;
    try {
      console.log("🚀 [PDF-FROM-HTML] Starting PDF generation from HTML...");
      const executablePath =
        "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium";

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
        ],
      });

      const page = await browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 1600 });

      // Set content with proper error handling
      await page.setContent(htmlContent, {
        waitUntil: "networkidle0",
        timeout: 60000,
      });

      // Wait for any images to load
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images, (img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve, reject) => {
              img.addEventListener("load", resolve);
              img.addEventListener("error", resolve); // Don't fail on image errors
              setTimeout(resolve, 5000); // Timeout after 5 seconds
            });
          }),
        );
      });

      // Generate PDF with options
      const pdfOptions = {
        format: options.format || "A4",
        margin: options.margin || {
          top: "1in",
          right: "1in",
          bottom: "1in",
          left: "1in",
        },
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate || "<div></div>",
        footerTemplate: options.footerTemplate || "<div></div>",
        printBackground: true,
        preferCSSPageSize: false,
        ...options,
      };

      const pdfBuffer = await page.pdf(pdfOptions);

      console.log(
        "✅ [PDF-FROM-HTML] PDF generated successfully, size:",
        pdfBuffer.length,
      );

      // Validate PDF buffer
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error("Generated PDF buffer is empty");
      }

      // Ensure it's a proper Buffer
      const finalBuffer = Buffer.isBuffer(pdfBuffer)
        ? pdfBuffer
        : Buffer.from(pdfBuffer);

      // Check if it's a valid PDF (starts with %PDF)
      const pdfHeader = finalBuffer.slice(0, 4).toString();
      if (pdfHeader !== "%PDF") {
        console.error("❌ Invalid PDF header:", pdfHeader);
        throw new Error("Generated buffer is not a valid PDF");
      }

      return finalBuffer;
    } catch (error: any) {
      console.error(
        "❌ [PDF-FROM-HTML] Error generating PDF from HTML:",
        error,
      );
      throw new Error(`Failed to generate PDF from HTML: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

export default PremiumPdfService;
