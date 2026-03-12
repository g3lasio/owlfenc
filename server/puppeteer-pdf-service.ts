import path from "path";
import handlebars from "handlebars";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { formatCurrency, roundToTwoDecimals, parseCurrency } from "./utils/currencyFormatter";
import { launchBrowser } from "./utils/chromiumResolver";

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
      const html = await this.renderHtmlFromTemplate(data);

      browser = await launchBrowser();

      const page = await browser.newPage();

      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2,
      });

      // Use domcontentloaded instead of networkidle0 to avoid external resource timeouts
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
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

    // Compute display values before template string
    const taxRateDisplay = parseFloat((taxRate).toFixed(4));
    const totalRaw = parseCurrency(data.estimate?.total || '0');
    const depositAmount = formatCurrency(totalRaw * 0.5);

    // Build logo HTML before template string
    const logoHtml = data.company?.logo
      ? `<img src="${data.company.logo}" alt="${data.company.name || 'Company Logo'}" style="max-width:200px;max-height:80px;object-fit:contain;display:block;margin-bottom:8px;" />`
      : `<div style="font-size:26px;font-weight:800;color:#0891b2;letter-spacing:-0.5px;margin-bottom:8px;">${data.company?.name || 'Your Company'}</div>`;

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
        
        .item-name {
            font-weight: 600;
            font-size: 13px;
            color: var(--text-dark);
            line-height: 1.3;
        }
        
        .item-description {
            font-size: 11px;
            color: var(--text-light);
            margin-top: 2px;
            line-height: 1.4;
        }
        
        .items-table td:nth-child(2),
        .items-table td:nth-child(3) {
            text-align: center;
            font-size: 13px;
            font-weight: 500;
        }
        
        .items-table td:nth-child(4),
        .items-table td:nth-child(5) {
            text-align: right;
            font-weight: 500;
            font-size: 13px;
        }
        
        .items-table td:nth-child(5) {
            font-weight: 700;
            color: var(--primary);
        }
        
        /* Totals */
        .totals-section {
            display: flex;
            justify-content: flex-end;
            padding: 20px 48px 0;
        }
        
        .totals-box {
            width: 290px;
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 16px;
            border-bottom: 1px solid var(--border);
            font-size: 12px;
        }
        
        .total-row-label { font-weight: 500; color: var(--text-medium); }
        .total-row-value { font-weight: 600; color: var(--text-dark); }
        
        .total-row.discount .total-row-label,
        .total-row.discount .total-row-value { color: var(--success); }
        
        .total-row.grand { background: var(--primary); border-bottom: none; }
        .total-row.grand .total-row-label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.9); }
        .total-row.grand .total-row-value { font-size: 18px; font-weight: 900; color: white; letter-spacing: -0.5px; }
        
        /* Deposit note */
        .deposit-note {
            margin: 16px 48px 0;
            background: #FFFBEB;
            border: 1px solid #FCD34D;
            border-radius: 8px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .deposit-note-text { font-size: 12px; font-weight: 600; color: #92400E; }
        
        /* Terms */
        .terms-section { margin: 20px 48px 0; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        .terms-header { background: var(--bg-light); padding: 10px 16px; font-size: 10px; font-weight: 700; color: var(--text-dark); text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid var(--border); }
        .terms-body { padding: 14px 16px; }
        .terms-item { display: flex; gap: 10px; margin-bottom: 8px; align-items: flex-start; }
        .terms-dot { width: 5px; height: 5px; background: var(--primary); border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
        .terms-text { font-size: 11px; color: var(--text-medium); line-height: 1.6; }
        
        /* Signatures */
        .signature-section { margin: 20px 48px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .signature-box { border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
        .signature-label { font-size: 10px; font-weight: 700; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 32px; }
        .signature-line { border-top: 1px solid var(--border); margin-bottom: 6px; }
        .signature-name { font-size: 11px; color: var(--text-medium); }
        
        /* Footer */
        .footer { padding: 16px 48px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 20px; }
        .footer-line { flex: 1; height: 1px; background: linear-gradient(to right, transparent, var(--primary), transparent); }
        .footer-diamond { width: 6px; height: 6px; background: var(--primary); transform: rotate(45deg); flex-shrink: 0; }
        .footer-text { font-size: 10px; color: var(--text-light); font-weight: 500; letter-spacing: 0.3px; }
        
        @media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    </style>
</head>
<body>
<div class="container">

    <!-- HEADER -->
    <div class="header">
        <div class="company-section">
            ${logoHtml}
            <div class="company-details">
                ${data.company?.address ? `<div><span style="font-size:10px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Address</span> ${data.company.address}</div>` : ''}
                ${data.company?.phone ? `<div><span style="font-size:10px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Tel</span> ${data.company.phone}</div>` : ''}
                ${data.company?.email ? `<div><span style="font-size:10px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Email</span> ${data.company.email}</div>` : ''}
                ${data.company?.website ? `<div><span style="font-size:10px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Web</span> ${data.company.website}</div>` : ''}
            </div>
            ${data.company?.license ? `<span class="license-badge">Lic: ${data.company.license}</span>` : ''}
        </div>
        <div class="estimate-badge-section">
            <div class="estimate-title">Estimate</div>
            <div class="estimate-number">${estimateNumber}</div>
            <div class="estimate-meta">
                <div class="estimate-meta-row">
                    <span class="estimate-meta-label">Date</span>
                    <span class="estimate-meta-value">${estimateDate}</span>
                </div>
                <div class="estimate-meta-row">
                    <span class="estimate-meta-label">Valid Until</span>
                    <span class="estimate-meta-value" style="color:#D97706;">Exp: ${validUntil}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- BILL TO + PROJECT -->
    <div class="client-project-grid">
        <div>
            <div class="section-label">Bill To</div>
            <div class="client-name">${data.client?.name || 'Valued Client'}</div>
            <div class="client-details">
                ${data.client?.address ? `<span>${data.client.address}</span>` : ''}
                ${data.client?.phone ? `<span>Tel: ${data.client.phone}</span>` : ''}
                ${data.client?.email ? `<span>${data.client.email}</span>` : ''}
            </div>
        </div>
        <div>
            <div class="section-label">Project Details</div>
            <div class="client-name">Construction Services</div>
            <div class="client-details">
                <span>Date: ${estimateDate}</span>
                <span>Valid Until: ${validUntil}</span>
            </div>
        </div>
    </div>

    ${data.estimate?.project_description ? `
    <div class="project-section" style="padding-top:16px;">
        <div class="section-label" style="margin:0 48px 8px;">Project Scope</div>
        <div class="project-description">${data.estimate.project_description.replace(/\n/g, '<br>')}</div>
    </div>` : ''}

    <!-- ITEMS TABLE -->
    <div class="items-section" style="padding-top:20px;">
        <div class="section-label" style="margin:0 48px 10px;">Materials &amp; Services</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width:44%;">Description</th>
                    <th style="width:8%;text-align:center;">Qty</th>
                    <th style="width:10%;text-align:center;">Unit</th>
                    <th style="width:18%;text-align:right;">Unit Price</th>
                    <th style="width:16%;text-align:right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${processedItems.map((item, i) => `
                <tr style="background:${i % 2 === 0 ? '#ffffff' : '#F9FAFB'};">
                    <td>
                        <div class="item-name">${item.code || item.description}</div>
                        ${item.code && item.description ? `<div class="item-description">${item.description}</div>` : ''}
                    </td>
                    <td style="text-align:center;">${item.qty || ''}</td>
                    <td style="text-align:center;font-size:11px;color:#9CA3AF;">unit</td>
                    <td style="text-align:right;">${item.unit_price}</td>
                    <td style="text-align:right;font-weight:700;color:#0891B2;">${item.total}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>

    <!-- TOTALS -->
    <div class="totals-section">
        <div class="totals-box">
            <div class="total-row">
                <span class="total-row-label">Subtotal</span>
                <span class="total-row-value">${subtotal}</span>
            </div>
            ${hasDiscount ? `
            <div class="total-row discount">
                <span class="total-row-label">Discount</span>
                <span class="total-row-value">-${discount}</span>
            </div>` : ''}
            <div class="total-row">
                <span class="total-row-label">Tax (${taxRateDisplay}%)</span>
                <span class="total-row-value">${taxAmount}</span>
            </div>
            <div class="total-row grand">
                <span class="total-row-label">TOTAL</span>
                <span class="total-row-value">${total}</span>
            </div>
        </div>
    </div>

    <!-- DEPOSIT NOTE -->
    <div class="deposit-note">
        <div style="font-size:11px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.5px;">Note</div>
        <div class="deposit-note-text">50% Deposit Required to Schedule — Balance due upon project completion.</div>
    </div>

    <!-- TERMS -->
    <div class="terms-section">
        <div class="terms-header">Terms &amp; Conditions</div>
        <div class="terms-body">
            ${[
                'This estimate is valid for 30 days from the date of issue.',
                'A 50% deposit is required to schedule and begin the project.',
                'Final payment is due upon project completion and client inspection.',
                'Prices are subject to change based on material availability and market conditions.',
                'Additional work not included in this estimate will be quoted separately before proceeding.'
            ].map(t => `<div class="terms-item"><div class="terms-dot"></div><div class="terms-text">${t}</div></div>`).join('')}
        </div>
    </div>

    <!-- SIGNATURES -->
    <div class="signature-section">
        <div class="signature-box">
            <div class="signature-label">Client Acceptance</div>
            <div class="signature-line"></div>
            <div class="signature-name">${data.client?.name || 'Client Name'} &nbsp;&nbsp;&nbsp;&nbsp; Date: ___________</div>
        </div>
        <div class="signature-box">
            <div class="signature-label">Contractor</div>
            <div class="signature-line"></div>
            <div class="signature-name">${data.company?.name || 'Contractor'} &nbsp;&nbsp;&nbsp;&nbsp; Date: ___________</div>
        </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
        <div class="footer-line"></div>
        <div class="footer-diamond"></div>
        <div class="footer-text">Powered by Mervin AI · owlfenc.com</div>
        <div class="footer-diamond"></div>
        <div class="footer-line"></div>
    </div>

</div>
</body>
</html>`;
  }

  async generatePdfFromHtml(html: string): Promise<Uint8Array> {
    console.log("🔄 Starting PDF generation from HTML...");

    let browser;

    try {
      browser = await launchBrowser();

      const page = await browser.newPage();

      // Block external resources that cause timeouts in production
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        const url = request.url();
        // Block external fonts and unnecessary resources to prevent timeouts
        if (resourceType === 'font' && !url.startsWith('data:')) {
          request.abort();
        } else if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
          request.abort();
        } else {
          request.continue();
        }
      });

      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2,
      });

      // Use domcontentloaded instead of networkidle0 to avoid external resource timeouts
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Wait for all images to load (with per-image timeout)
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images, (img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.addEventListener("load", resolve);
              img.addEventListener("error", resolve);
              setTimeout(resolve, 3000); // 3 second max per image
            });
          })
        );
      });

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
