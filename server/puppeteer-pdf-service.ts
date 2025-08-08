import puppeteer from "puppeteer";
import path from "path";
import handlebars from "handlebars";
import fs from "fs/promises";
import { fileURLToPath } from "url";

interface EstimateData {
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string;
    license?: string;
  };
  estimate: {
    number?: string;
    date?: string;
    valid_until?: string;
    project_description?: string;
    items: Array<{
      code: string;
      description: string;
      qty: number | string;
      unit_price: string;
      total: string;
    }>;
    subtotal?: string;
    discounts?: string;
    tax_rate?: number;
    tax_amount?: string;
    total?: string;
  };
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  isMembership?:boolean;
  selectedTemplate?: string;
}

export class PuppeteerPdfService {
  async generatePdf(data: EstimateData): Promise<Uint8Array> {
    console.log("🔄 Starting PDF generation...");

    let browser;

    try {
      const executablePath =
        "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium";

      const html = await this.renderHtmlFromTemplate(data);

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

      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2,
      });

      await page.setContent(html, {
        waitUntil: ["networkidle0", "domcontentloaded"],
        timeout: 30000,
      });

      const pdfBuffer = await page.pdf({
        width: "1200",
        margin: {
          top: "0.75in",
          right: "0.75in",
          bottom: "0.75in",
          left: "0.75in",
        },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
      });

      console.log(`✅ PDF generated - Size: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
    } catch (error) {
      console.error("❌ PDF generation failed:", error);
      throw new Error(`PDF generation failed: ${(error as Error).message}`);
    } finally {
      if (browser) await browser.close();
    }
  }

  private async renderHtmlFromTemplate(data: EstimateData): Promise<string> {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Template mapping based on selectedTemplate - Simplified to 2 options
    const templateMapping: Record<string, string> = {
      basic: "estimate-template-free.html",
      premium: "estimate-template-premium-advanced.html",
      // Legacy support for old template names
      professional: "professional_estimate_template.html", 
      luxury: "luxurytemplate.html",
      standard: "estimate-template.html",
      free: "estimate-template-free.html"
    };

    // AUTOMATIC TEMPLATE DETECTION - Check multiple data sources
    console.log(`🔍 AUTO TEMPLATE: isMembership=${data.isMembership}, templateMode=${data.templateMode}, planId checking...`);
    
    let templateFile = "estimate-template-free.html"; // Default to basic
    
    // ENHANCED AUTO-DETECTION: Check multiple premium indicators
    const isPremium = data.templateMode === "premium" || 
                     data.isMembership === true || 
                     data.selectedTemplate === "premium";
                     
    if (isPremium) {
      // USE BEAUTIFUL HTML FROM PREVIEW INSTEAD OF TEMPLATE FILE
      console.log("✅ AUTO-SELECTED: PREMIUM template - Using preview-style HTML generation");
      return this.generatePremiumHtmlFromPreview(data);
    } else {
      console.log("✅ AUTO-SELECTED: BASIC template (no premium indicators found)");
    }

    const templatePath = path.join(
      __dirname,
      "../client/src/components/templates/",
      templateFile
    );
    
    console.log(`🎨 Using template: ${templateFile} for selectedTemplate: ${data.selectedTemplate}`);
    const html = await fs.readFile(templatePath, "utf-8");

    const template = handlebars.compile(html);

    const mappedData = {
      number: data.estimate.number || `EST-${Date.now()}`,
      date: data.estimate.date || new Date().toLocaleDateString(),
      validUntil:
        data.estimate.valid_until ||
        new Date(Date.now() + 30 * 86400000).toLocaleDateString(),
      client: {
        name: data.client.name || "",
        address: data.client.address || "",
        phone: data.client.phone || "",
        email: data.client.email || "",
      },
      contractorInfo: {
        name: data.company.name || "",
        address: data.company.address || "",
        phone: data.company.phone || "",
        email: data.company.email || "",
        license: data.company.license || "",
        logo: data.company.logo || "",
      },
      project: {
        description: data.estimate.project_description || "",
      },
      items: data.estimate.items.map((item) => ({
        name: item.code,
        description: item.description,
        quantity: item.qty,
        unitPrice: item.unit_price,
        total: item.total,
      })),
      subtotal: data.estimate.subtotal || "0",
      discount: data.estimate.discounts || "0",
      taxRate: data.estimate.tax_rate || 0,
      taxAmount: data.estimate.tax_amount || "0",
      total: data.estimate.total || "0",
      terms: [
        "Payment is due within 30 days of receipt of invoice.",
        "Late payments are subject to a 1.5% monthly interest charge.",
        "This estimate is valid for 30 days from the date of issue.",
      ],
    };

    return template(mappedData);
  }

  private generatePremiumHtmlFromPreview(data: EstimateData): string {
    // COPIADO EXACTAMENTE DE generateEstimatePreview() - EL HTML HERMOSO DEL PREVIEW
    const estimateNumber = data.estimate.number || `EST-${Date.now()}`;
    const estimateDate = data.estimate.date || new Date().toLocaleDateString();
    
    // Calculate discount amount for conditional display
    const discountAmount = parseFloat(data.estimate.discounts?.replace(/[\$,-]/g, '') || '0');
    const taxAmount = parseFloat(data.estimate.tax_amount?.replace(/[\$,]/g, '') || '0');

    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header with Company Info and Logo -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
          <div style="flex: 1;">
            ${data.contractorInfo.logo ? `<img src="${data.contractorInfo.logo}" alt="Company Logo" style="max-width: 120px; max-height: 80px; margin-bottom: 10px;" />` : `<div style="width: 120px; height: 80px; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; color: #666; font-size: 14px;">Logo</div>`}
            <h2 style="margin: 0; color: #2563eb; font-size: 1.5em;">${data.contractorInfo.name || ""}</h2>
            <p style="margin: 5px 0; color: #666;">
              ${data.contractorInfo.address || ""}<br>
              ${data.contractorInfo.phone || ""}<br>
              ${data.contractorInfo.email || ""}
            </p>
            ${data.contractorInfo.license ? `<p style="margin: 5px 0; font-size: 0.9em; color: #666;">License: ${data.contractorInfo.license}</p>` : ""}
          </div>
          
          <div style="text-align: right;">
            <h1 style="margin: 0; color: #2563eb; font-size: 2.2em;">PROFESSIONAL ESTIMATE</h1>
            <p style="margin: 10px 0; font-size: 1.1em;"><strong>Estimate #:</strong> ${estimateNumber}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${estimateDate}</p>
          </div>
        </div>
        
        <!-- Client Information -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div style="flex: 1; padding-right: 20px;">
            <h3 style="color: #2563eb; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">BILL TO:</h3>
            <p style="margin: 5px 0; font-size: 1.1em; color: #000000;"><strong>${data.client.name || "Client not specified"}</strong></p>
            <p style="margin: 5px 0; color: #000000;">${data.client.email || ""}</p>
            <p style="margin: 5px 0; color: #000000;">${data.client.phone || ""}</p>
            <p style="margin: 5px 0; color: #000000;">${data.client.address || ""}</p>
          </div>
        </div>

        <!-- Project Details -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #2563eb; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">MATERIALS AND SERVICES:</h3>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; line-height: 1.6;">
            ${data.project.description?.replace(/\n/g, "<br>") || "Professional construction services"}
          </div>
        </div>

        <!-- Materials & Labor Table -->
        <table style="width: 100%; border-collapse: collapse; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 30px;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: left; font-weight: bold;">Description</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: center; font-weight: bold;">Qty.</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: center; font-weight: bold;">Unit</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: right; font-weight: bold;">Unit Price</th>
              <th style="border: 1px solid #2563eb; padding: 12px; text-align: right; font-weight: bold;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.estimate.items.map((item, index) => `
              <tr style="background: ${index % 2 === 0 ? "#f8fafc" : "#ffffff"};">
                <td style="border: 1px solid #ddd; padding: 12px; color: #000000;">
                  <strong>${item.name}</strong>
                  ${item.description ? `<br><small style="color: #333333;">${item.description}</small>` : ""}
                </td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; color: #000000;">${item.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: center; color: #000000;">unit</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right; color: #000000;">${item.unitPrice}</td>
                <td style="border: 1px solid #ddd; padding: 12px; text-align: right; font-weight: bold; color: #000000;">${item.total}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="text-align: right; margin-top: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 2px solid #e5e7eb;">
          <div style="margin-bottom: 10px; font-size: 1.1em; color: #000000;">
            <span style="margin-right: 40px; color: #000000;"><strong>Subtotal:</strong></span>
            <span style="font-weight: bold; color: #000000;">${data.estimate.subtotal}</span>
          </div>
          ${discountAmount > 0 ? `
            <div style="margin-bottom: 10px; font-size: 1.1em; color: #22c55e;">
              <span style="margin-right: 40px; color: #22c55e;"><strong>Discount:</strong></span>
              <span style="font-weight: bold; color: #22c55e;">${data.estimate.discounts}</span>
            </div>
          ` : ""}
          <div style="margin-bottom: 15px; font-size: 1.1em; color: #000000;">
            <span style="margin-right: 40px; color: #000000;"><strong>Tax (${data.estimate.tax_rate}%):</strong></span>
            <span style="font-weight: bold; color: #000000;">${data.estimate.tax_amount}</span>
          </div>
          <div style="border-top: 2px solid #2563eb; padding-top: 15px; font-size: 1.3em; color: #2563eb;">
            <span style="margin-right: 40px; color: #2563eb;"><strong>TOTAL:</strong></span>
            <span style="font-weight: bold; font-size: 1.2em; color: #2563eb;">${data.estimate.total}</span>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #666; font-size: 0.9em;">
          <p style="margin: 10px 0;"><strong>This estimate is valid for 30 days from the date shown above.</strong></p>
          <p style="margin: 10px 0;">Thank you for considering ${data.contractorInfo.name || "our company"} for your project!</p>
        </div>
      </div>
    `;
  }

  async generatePdfFromHtml(html: string): Promise<Uint8Array> {
    console.log("🔄 Starting PDF generation from HTML...");

    let browser;

    try {
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

      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2,
      });

      await page.setContent(html, {
        waitUntil: ["networkidle0", "domcontentloaded"],
        timeout: 30000,
      });

      // Give extra time for CSS to fully render
      await page.waitForTimeout(2000);
      
      // Ensure fonts are loaded
      await page.evaluateHandle('document.fonts.ready');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        width: '8.5in',
        height: '11in',
        margin: {
          top: "0.5in",
          right: "0.5in",
          bottom: "0.5in",
          left: "0.5in",
        },
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        scale: 1.0,
      });

      console.log(`✅ PDF generated from HTML - Size: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
    } catch (error) {
      console.error("❌ PDF generation from HTML failed:", error);
      throw new Error(`PDF generation from HTML failed: ${(error as Error).message}`);
    } finally {
      if (browser) await browser.close();
    }
  }
}

export const puppeteerPdfService = new PuppeteerPdfService();
