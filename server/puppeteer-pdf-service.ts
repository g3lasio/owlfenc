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
    // Generate beautiful HTML similar to the preview but optimized for PDF
    const estimateNumber = data.estimate.number || `EST-${Date.now()}`;
    const estimateDate = data.estimate.date || new Date().toLocaleDateString();
    const validUntil = data.estimate.valid_until || new Date(Date.now() + 30 * 86400000).toLocaleDateString();

    const logoHtml = data.contractorInfo.logo ? 
      `<img src="${data.contractorInfo.logo}" alt="Company Logo" style="max-width: 120px; max-height: 80px; margin-bottom: 10px;" />` :
      `<div style="width: 120px; height: 80px; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; color: #666; font-size: 14px; text-align: center;">Logo</div>`;

    // Calculate totals
    const subtotalNum = parseFloat(data.estimate.subtotal?.replace(/[\$,]/g, '') || '0');
    const discountNum = parseFloat(data.estimate.discounts?.replace(/[\$,-]/g, '') || '0');
    const taxNum = parseFloat(data.estimate.tax_amount?.replace(/[\$,]/g, '') || '0');
    const totalNum = parseFloat(data.estimate.total?.replace(/[\$,]/g, '') || '0');

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Estimado Premium - ${data.contractorInfo.name}</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #fff;
            color: #333;
            line-height: 1.6;
          }
          
          .premium-container {
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          
          .premium-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
          }
          
          .company-section {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 20px;
          }
          
          .company-logo {
            border-radius: 8px;
            background: rgba(255,255,255,0.1);
            padding: 10px;
          }
          
          .company-info h1 {
            margin: 0 0 8px 0;
            font-size: 24px;
            font-weight: 700;
          }
          
          .company-info p {
            margin: 0;
            opacity: 0.9;
            font-size: 14px;
          }
          
          .estimate-badge {
            text-align: center;
            background: rgba(255,255,255,0.15);
            padding: 20px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.2);
          }
          
          .estimate-badge h2 {
            margin: 0 0 5px 0;
            font-size: 20px;
            font-weight: 600;
          }
          
          .estimate-number {
            font-size: 16px;
            opacity: 0.9;
          }
          
          .content-section {
            padding: 30px;
          }
          
          .client-project-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          
          .info-card h3 {
            color: #2563eb;
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
          }
          
          .info-card p {
            margin: 5px 0;
            font-size: 14px;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          
          .items-table th {
            background: #f8fafc;
            color: #374151;
            font-weight: 600;
            padding: 15px 12px;
            text-align: left;
            font-size: 14px;
          }
          
          .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
          }
          
          .items-table tr:last-child td {
            border-bottom: none;
          }
          
          .items-table tr:hover {
            background: #f9fafb;
          }
          
          .totals-section {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 25px;
            border-radius: 8px;
            margin-top: 20px;
          }
          
          .totals-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            font-size: 14px;
          }
          
          .totals-row.total {
            border-top: 2px solid #2563eb;
            margin-top: 10px;
            padding-top: 15px;
            font-weight: 700;
            font-size: 18px;
            color: #2563eb;
          }
          
          .terms-section {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
          }
          
          .terms-section h3 {
            color: #374151;
            font-size: 16px;
            margin: 0 0 15px 0;
          }
          
          .terms-section ul {
            margin: 0;
            padding-left: 20px;
          }
          
          .terms-section li {
            margin: 8px 0;
            font-size: 13px;
            color: #6b7280;
          }
          
          @media print {
            body { margin: 0; }
            .premium-container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="premium-container">
          <!-- Premium Header -->
          <div class="premium-header">
            <div class="company-section">
              ${logoHtml}
              <div class="company-info">
                <h1>${data.contractorInfo.name || 'Your Company'}</h1>
                <p>${data.contractorInfo.address || ''}</p>
                <p>${data.contractorInfo.phone || ''} • ${data.contractorInfo.email || ''}</p>
              </div>
            </div>
            <div class="estimate-badge">
              <h2>ESTIMADO</h2>
              <div class="estimate-number">${estimateNumber}</div>
              <div style="font-size: 12px; margin-top: 8px;">${estimateDate}</div>
            </div>
          </div>
          
          <!-- Content Section -->
          <div class="content-section">
            <!-- Client and Project Info -->
            <div class="client-project-grid">
              <div class="info-card">
                <h3>Información del Cliente</h3>
                <p><strong>Nombre:</strong> ${data.client.name || ''}</p>
                <p><strong>Email:</strong> ${data.client.email || ''}</p>
                <p><strong>Teléfono:</strong> ${data.client.phone || ''}</p>
                <p><strong>Dirección:</strong> ${data.client.address || ''}</p>
              </div>
              
              <div class="info-card">
                <h3>Detalles del Proyecto</h3>
                <p><strong>Fecha:</strong> ${estimateDate}</p>
                <p><strong>Válido hasta:</strong> ${validUntil}</p>
                <p><strong>Descripción:</strong></p>
                <p style="margin-top: 10px; font-size: 13px; line-height: 1.5;">${data.project.description || 'Proyecto de construcción profesional'}</p>
              </div>
            </div>
            
            <!-- Items Table -->
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 35%;">Material/Servicio</th>
                  <th style="width: 15%;">Cantidad</th>
                  <th style="width: 20%;">Precio Unitario</th>
                  <th style="width: 20%;">Total</th>
                  <th style="width: 10%;">Descripción</th>
                </tr>
              </thead>
              <tbody>
                ${data.estimate.items.map(item => `
                  <tr>
                    <td><strong>${item.name || item.code}</strong></td>
                    <td>${item.quantity}</td>
                    <td>${item.unitPrice}</td>
                    <td><strong>${item.total}</strong></td>
                    <td style="font-size: 12px; color: #666;">${item.description || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <!-- Totals Section -->
            <div class="totals-section">
              <div class="totals-row">
                <span>Subtotal:</span>
                <span><strong>${data.estimate.subtotal}</strong></span>
              </div>
              ${discountNum > 0 ? `
                <div class="totals-row">
                  <span>Descuento:</span>
                  <span><strong>${data.estimate.discounts}</strong></span>
                </div>
              ` : ''}
              ${taxNum > 0 ? `
                <div class="totals-row">
                  <span>Impuestos (${data.estimate.tax_rate}%):</span>
                  <span><strong>${data.estimate.tax_amount}</strong></span>
                </div>
              ` : ''}
              <div class="totals-row total">
                <span>TOTAL:</span>
                <span>${data.estimate.total}</span>
              </div>
            </div>
            
            <!-- Terms and Conditions -->
            <div class="terms-section">
              <h3>Términos y Condiciones</h3>
              <ul>
                <li>El pago debe realizarse dentro de los 30 días posteriores a la recepción de la factura.</li>
                <li>Los pagos tardíos están sujetos a un cargo de interés mensual del 1.5%.</li>
                <li>Este estimado es válido por 30 días a partir de la fecha de emisión.</li>
                <li>Los precios pueden variar según la disponibilidad de materiales.</li>
                <li>Se requiere un depósito del 50% para iniciar el proyecto.</li>
              </ul>
            </div>
          </div>
        </div>
      </body>
      </html>
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
