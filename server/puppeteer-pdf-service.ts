import puppeteer from "puppeteer";
import path from "path";
import handlebars from "handlebars";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { formatCurrency, roundToTwoDecimals, parseCurrency } from "./utils/currencyFormatter";
import { getChromiumExecutablePath } from "./utils/chromiumResolver";

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
  isMembership?: boolean;
  selectedTemplate?: string;
  templateMode?: string;
}

export class PuppeteerPdfService {
  async generatePdf(data: EstimateData): Promise<Uint8Array> {
    console.log("🔄 Starting PDF generation...");

    let browser;

    try {
      const executablePath = getChromiumExecutablePath();

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
        format: 'Letter',
        margin: {
          top: "0.75in",
          right: "0.75in",
          bottom: "0.75in",
          left: "0.75in",
        },
        printBackground: true,
        preferCSSPageSize: false,
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

    // AUTOMATIC TEMPLATE DETECTION - Check data object for premium parameters
    console.log(`🔍 AUTO TEMPLATE: isMembership=${data.isMembership}, templateMode=${(data as any).templateMode}, selectedTemplate=${data.selectedTemplate}`);
    
    const isPremium = (data as any).templateMode === "premium" || 
                     data.isMembership === true || 
                     data.selectedTemplate === "premium";
                     
    console.log(`🎯 FINAL PREMIUM CHECK: isPremium=${isPremium}`);
                     
    // Always use the new futuristic template for better quality
    console.log("✅ Using Futuristic Professional Template");
    return this.generateFuturisticTemplate(data);
  }

  /**
   * Formats a price value ensuring proper 2 decimal places
   * Handles both string and number inputs
   */
  private formatPrice(value: string | number | undefined): string {
    if (value === undefined || value === null) return "$0.00";
    
    let numericValue: number;
    if (typeof value === 'string') {
      numericValue = parseCurrency(value);
    } else {
      numericValue = value;
    }
    
    return formatCurrency(numericValue);
  }

  /**
   * Generates the new futuristic, clean, and professional template
   */
  private generateFuturisticTemplate(data: EstimateData): string {
    const estimateNumber = data.estimate.number || `EST-${Date.now()}`;
    const estimateDate = data.estimate.date || new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const validUntil = data.estimate.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });

    // Process items with proper formatting
    const processedItems = (data.estimate?.items || []).map((item, index) => {
      const unitPrice = this.formatPrice(item.unit_price);
      const total = this.formatPrice(item.total);
      
      return {
        ...item,
        unit_price: unitPrice,
        total: total,
        index: index + 1
      };
    });

    // Format financial values
    const subtotal = this.formatPrice(data.estimate?.subtotal);
    const discountRaw = parseCurrency(data.estimate?.discounts || '0');
    const hasDiscount = discountRaw > 0;
    const discount = hasDiscount ? formatCurrency(discountRaw) : '$0.00';
    const taxRate = data.estimate?.tax_rate || 0;
    const taxAmount = this.formatPrice(data.estimate?.tax_amount);
    const total = this.formatPrice(data.estimate?.total);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional Estimate - ${estimateNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            --primary: #0066FF;
            --primary-dark: #0052CC;
            --primary-light: #E6F0FF;
            --secondary: #1A1A2E;
            --accent: #00D4AA;
            --text-dark: #0F172A;
            --text-medium: #475569;
            --text-light: #94A3B8;
            --border: #E2E8F0;
            --bg-light: #F8FAFC;
            --white: #FFFFFF;
            --success: #10B981;
            --warning: #F59E0B;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--white);
            color: var(--text-dark);
            line-height: 1.6;
            font-size: 16px;
        }
        
        .container {
            max-width: 850px;
            margin: 0 auto;
            padding: 40px;
        }
        
        /* Header Section - Three Column Layout */
        .header {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            padding-bottom: 30px;
            border-bottom: 2px solid var(--primary);
            margin-bottom: 35px;
            gap: 20px;
        }
        
        .company-section {
            text-align: left;
        }
        
        .logo-section {
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .company-logo {
            max-width: 160px;
            max-height: 100px;
            object-fit: contain;
        }
        
        .company-name {
            font-size: 28px;
            font-weight: 800;
            color: var(--secondary);
            letter-spacing: -0.5px;
            margin-bottom: 8px;
        }
        
        .company-details {
            font-size: 17px;
            color: var(--text-medium);
            line-height: 1.7;
        }
        
        .company-details div {
            margin-bottom: 4px;
        }
        
        .license-badge {
            display: inline-block;
            background: var(--primary-light);
            color: var(--primary);
            padding: 6px 14px;
            border-radius: 4px;
            font-size: 15px;
            font-weight: 600;
            margin-top: 10px;
        }
        
        .estimate-badge-section {
            text-align: right;
        }
        
        .estimate-title {
            font-size: 32px;
            font-weight: 800;
            color: var(--primary);
            letter-spacing: -0.5px;
            margin-bottom: 12px;
        }
        
        .estimate-meta {
            font-size: 17px;
            color: var(--text-medium);
        }
        
        .estimate-meta div {
            margin-bottom: 6px;
        }
        
        .estimate-meta strong {
            color: var(--text-dark);
            font-weight: 600;
        }
        
        .estimate-number {
            font-size: 20px;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 8px;
        }
        
        /* Client Section */
        .client-section {
            background: linear-gradient(135deg, var(--bg-light) 0%, var(--white) 100%);
            border: 1px solid var(--border);
            border-left: 4px solid var(--primary);
            border-radius: 0 8px 8px 0;
            padding: 24px;
            margin-bottom: 30px;
        }
        
        .section-label {
            font-size: 14px;
            font-weight: 700;
            color: var(--primary);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 14px;
        }
        
        .client-name {
            font-size: 24px;
            font-weight: 700;
            color: var(--text-dark);
            margin-bottom: 10px;
        }
        
        .client-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            font-size: 16px;
            color: var(--text-medium);
        }
        
        .client-details span {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        /* Project Description */
        .project-section {
            margin-bottom: 30px;
        }
        
        .project-description {
            background: var(--bg-light);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 22px;
            font-size: 16px;
            color: var(--text-medium);
            line-height: 1.8;
        }
        
        /* Items Table */
        .items-section {
            margin-bottom: 30px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .items-table thead {
            background: var(--secondary);
        }
        
        .items-table th {
            color: var(--white);
            font-weight: 600;
            font-size: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 18px 16px;
            text-align: left;
        }
        
        .items-table th:nth-child(2),
        .items-table th:nth-child(3) {
            text-align: center;
        }
        
        .items-table th:nth-child(4),
        .items-table th:nth-child(5) {
            text-align: right;
        }
        
        .items-table td {
            padding: 16px;
            border-bottom: 1px solid var(--border);
            font-size: 16px;
            color: var(--text-dark);
        }
        
        .items-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .items-table tbody tr:nth-child(even) {
            background: var(--bg-light);
        }
        
        .items-table tbody tr:hover {
            background: var(--primary-light);
        }
        
        .item-name {
            font-weight: 600;
            font-size: 17px;
            color: var(--text-dark);
        }
        
        .item-description {
            font-size: 15px;
            color: var(--text-light);
            margin-top: 5px;
        }
        
        .items-table td:nth-child(2),
        .items-table td:nth-child(3) {
            text-align: center;
            font-size: 16px;
        }
        
        .items-table td:nth-child(4),
        .items-table td:nth-child(5) {
            text-align: right;
            font-weight: 500;
            font-size: 16px;
        }
        
        .items-table td:nth-child(5) {
            font-weight: 700;
            font-size: 17px;
            color: var(--primary-dark);
        }
        
        /* Totals Section */
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }
        
        .totals-box {
            width: 360px;
            background: var(--bg-light);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 24px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            font-size: 17px;
            color: var(--text-medium);
        }
        
        .total-row.subtotal {
            border-bottom: 1px solid var(--border);
            padding-bottom: 16px;
            margin-bottom: 12px;
        }
        
        .total-row.discount {
            color: var(--success);
        }
        
        .total-row.final {
            background: var(--primary);
            color: var(--white);
            font-weight: 700;
            font-size: 22px;
            padding: 18px 24px;
            margin: 16px -24px -24px -24px;
            border-radius: 0 0 8px 8px;
        }
        
        .total-row span:last-child {
            font-weight: 600;
        }
        
        /* Terms Section */
        .terms-section {
            background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
            border: 1px solid #FCD34D;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 30px;
        }
        
        .terms-title {
            font-size: 18px;
            font-weight: 700;
            color: #92400E;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .terms-list {
            font-size: 15px;
            color: #78350F;
            line-height: 1.9;
        }
        
        .terms-list li {
            margin-bottom: 6px;
            list-style: none;
            padding-left: 18px;
            position: relative;
        }
        
        .terms-list li::before {
            content: "•";
            position: absolute;
            left: 0;
            color: #D97706;
        }
        
        /* Footer */
        .footer {
            text-align: center;
            padding-top: 30px;
            border-top: 2px solid var(--border);
        }
        
        .footer-message {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-dark);
            margin-bottom: 10px;
        }
        
        .footer-validity {
            font-size: 16px;
            color: var(--text-medium);
            margin-bottom: 14px;
        }
        
        .footer-thanks {
            font-size: 17px;
            color: var(--primary);
            font-weight: 500;
        }
        
        /* Print Styles */
        @media print {
            body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            .container {
                max-width: none;
                margin: 0;
                padding: 20px;
            }
            
            .items-table {
                page-break-inside: avoid;
            }
            
            .totals-section, .terms-section, .footer {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header - Three Column Layout: Company | Logo | Estimate Info -->
        <div class="header">
            <!-- Left: Company Information -->
            <div class="company-section">
                <div class="company-name">${data.company?.name || "Your Company"}</div>
                <div class="company-details">
                    ${data.company?.address ? `<div>${data.company.address}</div>` : ''}
                    ${data.company?.phone ? `<div>${data.company.phone}</div>` : ''}
                    ${data.company?.email ? `<div>${data.company.email}</div>` : ''}
                </div>
                ${data.company?.license ? `<span class="license-badge">License: ${data.company.license}</span>` : ''}
            </div>
            
            <!-- Center: Logo -->
            <div class="logo-section">
                ${data.company?.logo ? 
                    `<img src="${data.company.logo}" alt="Company Logo" class="company-logo" />` : 
                    ''
                }
            </div>
            
            <!-- Right: Estimate Information -->
            <div class="estimate-badge-section">
                <div class="estimate-title">PROFESSIONAL ESTIMATE</div>
                <div class="estimate-meta">
                    <div class="estimate-number">${estimateNumber}</div>
                    <div><strong>Date:</strong> ${estimateDate}</div>
                    <div><strong>Valid Until:</strong> ${validUntil}</div>
                </div>
            </div>
        </div>
        
        <!-- Client Information -->
        <div class="client-section">
            <div class="section-label">Bill To</div>
            <div class="client-name">${data.client?.name || "Valued Client"}</div>
            <div class="client-details">
                ${data.client?.email ? `<span>📧 ${data.client.email}</span>` : ''}
                ${data.client?.phone ? `<span>📱 ${data.client.phone}</span>` : ''}
                ${data.client?.address ? `<span>📍 ${data.client.address}</span>` : ''}
            </div>
        </div>
        
        <!-- Project Description -->
        ${data.estimate?.project_description ? `
        <div class="project-section">
            <div class="section-label">Project Details</div>
            <div class="project-description">
                ${data.estimate.project_description.replace(/\n/g, "<br>")}
            </div>
        </div>
        ` : ''}
        
        <!-- Materials & Services Table -->
        <div class="items-section">
            <div class="section-label">Materials & Services</div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 40%;">Description</th>
                        <th style="width: 10%;">Qty</th>
                        <th style="width: 15%;">Unit</th>
                        <th style="width: 17%;">Unit Price</th>
                        <th style="width: 18%;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${processedItems.map(item => `
                        <tr>
                            <td>
                                <div class="item-name">${item.code || ''}</div>
                                ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                            </td>
                            <td>${item.qty || ''}</td>
                            <td>unit</td>
                            <td>${item.unit_price}</td>
                            <td>${item.total}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <!-- Totals -->
        <div class="totals-section">
            <div class="totals-box">
                <div class="total-row subtotal">
                    <span>Subtotal:</span>
                    <span>${subtotal}</span>
                </div>
                ${hasDiscount ? `
                <div class="total-row discount">
                    <span>Discount:</span>
                    <span>-${discount}</span>
                </div>
                ` : ''}
                <div class="total-row">
                    <span>Tax (${taxRate}%):</span>
                    <span>${taxAmount}</span>
                </div>
                <div class="total-row final">
                    <span>TOTAL:</span>
                    <span>${total}</span>
                </div>
            </div>
        </div>
        
        <!-- Terms & Conditions -->
        <div class="terms-section">
            <div class="terms-title">📋 Terms & Conditions</div>
            <ul class="terms-list">
                <li>This estimate is valid for 30 days from the date of issue.</li>
                <li>A 50% deposit is required to schedule the project.</li>
                <li>Final payment is due upon project completion.</li>
                <li>Prices are subject to change based on material availability.</li>
                <li>Additional work not included in this estimate will be quoted separately.</li>
            </ul>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-message">We appreciate your business!</div>
            <div class="footer-validity">This estimate expires on ${validUntil}</div>
            <div class="footer-thanks">Thank you for choosing ${data.company?.name || "our company"} for your project.</div>
        </div>
    </div>
</body>
</html>`;
  }

  async generatePdfFromHtml(html: string): Promise<Uint8Array> {
    console.log("🔄 Starting PDF generation from HTML...");

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

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await page.evaluateHandle('document.fonts.ready');

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        margin: {
          top: "0.5in",
          right: "0.5in",
          bottom: "0.5in",
          left: "0.5in",
        },
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
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
