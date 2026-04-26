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
    overhead_amount?: string;
    markup_amount?: string;
    operational_costs_amount?: string;
    pricing_strategy?: string;
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

  async renderHtmlFromTemplate(data: EstimateData): Promise<string> {
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
   * Strips markdown bold markers (**text**) and returns plain text
   */
  private stripMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  /**
   * Generates the new futuristic, clean, and professional template
   */
  private generateFuturisticTemplate(data: EstimateData): string {
    const estimateNumber = data.estimate.number || `EST-${Date.now()}`;
    const estimateDate = data.estimate.date || new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'numeric', 
      day: 'numeric' 
    });
    const validUntil = data.estimate.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric', 
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
    const taxAmountRaw = parseCurrency(data.estimate?.tax_amount || '0');
    const taxAmount = this.formatPrice(data.estimate?.tax_amount);
    // Only show tax row if there is actually a tax rate and tax amount
    const hasTax = taxRate > 0 && taxAmountRaw > 0;
    const total = this.formatPrice(data.estimate?.total);

    // Compute display values before template string
    const taxRateDisplay = parseFloat((taxRate).toFixed(4));
    // taxAppliedTo: 'materials_only' (default, most US states) or 'full_subtotal'
    const taxAppliedTo = (data.estimate as any)?.tax_applied_to || 'materials_only';
    const taxLabel = taxAppliedTo === 'materials_only'
      ? `Tax on Materials (${taxRateDisplay}%)`
      : `Sales Tax (${taxRateDisplay}%)`;
    const totalRaw = parseCurrency(data.estimate?.total || '0');
    const depositAmount = formatCurrency(totalRaw * 0.5);
    const pricingStrategy = (data.estimate as any)?.pricing_strategy || 'A';
    const overheadAmountRaw = parseCurrency((data.estimate as any)?.overhead_amount || '0');
    const markupAmountRaw = parseCurrency((data.estimate as any)?.markup_amount || '0');
    const operationalCostsRaw = parseCurrency((data.estimate as any)?.operational_costs_amount || '0');
    const hasOverhead = pricingStrategy === 'B' && overheadAmountRaw > 0;
    const hasMarkup = pricingStrategy === 'B' && markupAmountRaw > 0;
    const hasOperational = pricingStrategy === 'B' && operationalCostsRaw > 0;
    const overheadAmountFmt = formatCurrency(overheadAmountRaw);
    const markupAmountFmt = formatCurrency(markupAmountRaw);
    const operationalCostsFmt = formatCurrency(operationalCostsRaw);

    // Build logo HTML before template string
    const logoHtml = data.company?.logo
      ? `<img src="${data.company.logo}" alt="${data.company.name || 'Company Logo'}" style="max-width:180px;max-height:70px;object-fit:contain;display:block;margin-bottom:10px;" />`
      : `<div style="font-size:22px;font-weight:800;color:#0066FF;letter-spacing:-0.5px;margin-bottom:10px;">${data.company?.name || 'Your Company'}</div>`;

    // Process project description - convert markdown to HTML
    const rawDescription = data.estimate?.project_description || '';
    const processedDescription = rawDescription
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional Estimate - ${estimateNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
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
            line-height: 1.5;
            font-size: 13px;
            -webkit-font-smoothing: antialiased;
        }

        @media print {
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
        }
        
        /* ── HEADER ─────────────────────────────────────────── */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 32px 40px 24px;
            border-bottom: 2px solid var(--primary);
            margin-bottom: 0;
            gap: 24px;
        }
        
        .company-section {
            flex: 1;
            min-width: 0;
        }

        .company-details {
            font-size: 11px;
            color: var(--text-medium);
            line-height: 1.9;
            margin-bottom: 8px;
        }
        
        .company-details .detail-row {
            display: flex;
            align-items: baseline;
            gap: 6px;
            flex-wrap: wrap;
        }

        .company-details .detail-label {
            font-size: 9px;
            font-weight: 700;
            color: #9CA3AF;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            flex-shrink: 0;
            min-width: 42px;
        }

        .company-details .detail-value {
            font-size: 11px;
            color: var(--text-medium);
            word-break: break-word;
        }
        
        .license-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: var(--primary-light);
            color: var(--primary);
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            margin-top: 6px;
            border: 1px solid rgba(0,102,255,0.2);
        }
        
        /* ── ESTIMATE BADGE (right side of header) ─────────── */
        .estimate-badge-section {
            text-align: right;
            flex-shrink: 0;
        }
        
        .estimate-title {
            font-size: 36px;
            font-weight: 900;
            color: var(--primary);
            letter-spacing: -1px;
            line-height: 1;
            margin-bottom: 10px;
            text-transform: uppercase;
        }

        .estimate-number {
            font-size: 13px;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 10px;
            letter-spacing: 0.3px;
        }
        
        .estimate-meta-table {
            font-size: 11px;
            color: var(--text-medium);
        }

        .estimate-meta-table .meta-row {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-bottom: 4px;
        }

        .estimate-meta-table .meta-label {
            color: #9CA3AF;
            font-weight: 500;
        }

        .estimate-meta-table .meta-value {
            font-weight: 600;
            color: var(--text-dark);
            min-width: 80px;
            text-align: right;
        }

        /* ── BILL TO + PROJECT GRID ─────────────────────────── */
        .client-project-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            padding: 20px 40px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 0;
        }

        .section-label {
            font-size: 10px;
            font-weight: 700;
            color: var(--primary);
            text-transform: uppercase;
            letter-spacing: 1.2px;
            padding-bottom: 6px;
            border-bottom: 2px solid var(--primary);
            width: fit-content;
            margin-bottom: 10px;
        }
        
        .client-name {
            font-size: 18px;
            font-weight: 700;
            color: var(--text-dark);
            margin-bottom: 8px;
            letter-spacing: -0.3px;
        }
        
        .client-details {
            font-size: 11px;
            color: var(--text-medium);
            line-height: 1.8;
        }

        /* ── PROJECT SCOPE ──────────────────────────────────── */
        .project-section {
            padding: 16px 40px 0;
            margin-bottom: 0;
        }

        .project-description {
            background: var(--bg-light);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px 20px;
            font-size: 11px;
            color: var(--text-medium);
            line-height: 1.8;
            margin-top: 8px;
        }
        
        /* ── ITEMS TABLE ─────────────────────────────────────── */
        .items-section {
            padding: 16px 40px 0;
            margin-bottom: 0;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
            margin-top: 8px;
        }
        
        .items-table thead {
            background: var(--secondary);
        }
        
        .items-table th {
            color: var(--white);
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 12px 14px;
            text-align: left;
        }
        
        .items-table th:nth-child(2),
        .items-table th:nth-child(3) { text-align: center; }
        .items-table th:nth-child(4),
        .items-table th:nth-child(5) { text-align: right; }
        
        .items-table td {
            padding: 11px 14px;
            border-bottom: 1px solid var(--border);
            font-size: 12px;
            color: var(--text-dark);
            vertical-align: top;
        }
        
        .items-table tbody tr:last-child td { border-bottom: none; }
        
        .item-name {
            font-weight: 600;
            font-size: 12px;
            color: var(--text-dark);
            line-height: 1.3;
        }
        
        .item-description {
            font-size: 10px;
            color: var(--text-light);
            margin-top: 2px;
            line-height: 1.4;
        }
        
        .items-table td:nth-child(2),
        .items-table td:nth-child(3) {
            text-align: center;
            font-size: 12px;
            font-weight: 500;
        }
        
        .items-table td:nth-child(4),
        .items-table td:nth-child(5) {
            text-align: right;
            font-weight: 500;
            font-size: 12px;
        }
        
        .items-table td:nth-child(5) {
            font-weight: 700;
            color: var(--primary);
        }
        
        /* ── TOTALS ──────────────────────────────────────────── */
        .totals-section {
            display: flex;
            justify-content: flex-end;
            padding: 16px 40px 0;
        }
        
        .totals-box {
            width: 280px;
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 9px 14px;
            border-bottom: 1px solid var(--border);
            font-size: 11px;
        }
        
        .total-row-label { font-weight: 500; color: var(--text-medium); }
        .total-row-value { font-weight: 600; color: var(--text-dark); }
        
        .total-row.discount .total-row-label,
        .total-row.discount .total-row-value { color: var(--success); }
        
        .total-row.grand { background: var(--primary); border-bottom: none; }
        .total-row.grand .total-row-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.9); }
        .total-row.grand .total-row-value { font-size: 16px; font-weight: 900; color: white; letter-spacing: -0.5px; }
        
        /* ── DEPOSIT NOTE ────────────────────────────────────── */
        .deposit-note {
            margin: 14px 40px 0;
            background: #FFFBEB;
            border: 1px solid #FCD34D;
            border-radius: 8px;
            padding: 10px 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .deposit-note-label { font-size: 9px; font-weight: 700; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0; }
        .deposit-note-text { font-size: 11px; font-weight: 600; color: #92400E; }
        
        /* ── TERMS ───────────────────────────────────────────── */
        .terms-section {
            margin: 14px 40px 0;
            border: 1px solid var(--border);
            border-radius: 8px;
            overflow: hidden;
        }
        .terms-header {
            background: var(--bg-light);
            padding: 8px 14px;
            font-size: 9px;
            font-weight: 700;
            color: var(--text-dark);
            text-transform: uppercase;
            letter-spacing: 0.8px;
            border-bottom: 1px solid var(--border);
        }
        .terms-body { padding: 12px 14px; }
        .terms-item { display: flex; gap: 8px; margin-bottom: 6px; align-items: flex-start; }
        .terms-dot { width: 4px; height: 4px; background: var(--primary); border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
        .terms-text { font-size: 10px; color: var(--text-medium); line-height: 1.6; }
        
        /* ── SIGNATURES ──────────────────────────────────────── */
        .signature-section {
            margin: 14px 40px 0;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .signature-box {
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 14px;
        }
        .signature-label {
            font-size: 9px;
            font-weight: 700;
            color: var(--text-light);
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 28px;
        }
        .signature-line { border-top: 1px solid var(--border); margin-bottom: 5px; }
        .signature-name { font-size: 10px; color: var(--text-medium); }
        
        /* ── FOOTER ──────────────────────────────────────────── */
        .footer {
            padding: 14px 40px;
            border-top: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-top: 16px;
        }
        .footer-line { flex: 1; height: 1px; background: linear-gradient(to right, transparent, var(--primary), transparent); }
        .footer-diamond { width: 5px; height: 5px; background: var(--primary); transform: rotate(45deg); flex-shrink: 0; }
        .footer-text { font-size: 9px; color: var(--text-light); font-weight: 500; letter-spacing: 0.3px; }
    </style>
</head>
<body>

    <!-- ══════════════════ HEADER ══════════════════ -->
    <div class="header">
        <div class="company-section">
            ${logoHtml}
            <div class="company-details">
                ${data.company?.address ? `<div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">${data.company.address}</span></div>` : ''}
                ${data.company?.phone ? `<div class="detail-row"><span class="detail-label">Tel</span><span class="detail-value">${data.company.phone}</span></div>` : ''}
                ${data.company?.email ? `<div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${data.company.email}</span></div>` : ''}
                ${data.company?.website ? `<div class="detail-row"><span class="detail-label">Web</span><span class="detail-value">${data.company.website}</span></div>` : ''}
            </div>
            ${data.company?.license ? `<span class="license-badge">Lic: ${data.company.license}</span>` : ''}
        </div>
        <div class="estimate-badge-section">
            <div class="estimate-title">Estimate</div>
            <div class="estimate-number">${estimateNumber}</div>
            <div class="estimate-meta-table">
                <div class="meta-row">
                    <span class="meta-label">Date</span>
                    <span class="meta-value">${estimateDate}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Valid Until</span>
                    <span class="meta-value" style="color:#D97706;">Exp: ${validUntil}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- ══════════════════ BILL TO + PROJECT ══════════════════ -->
    <div class="client-project-grid">
        <div>
            <div class="section-label">Bill To</div>
            <div class="client-name">${data.client?.name || 'Valued Client'}</div>
            <div class="client-details">
                ${data.client?.address ? `<div>${data.client.address}</div>` : ''}
                ${data.client?.phone ? `<div>Tel: ${data.client.phone}</div>` : ''}
                ${data.client?.email ? `<div>${data.client.email}</div>` : ''}
            </div>
        </div>
        <div>
            <div class="section-label">Project Details</div>
            <div class="client-name" style="font-size:14px;">${data.estimate?.project_description ? data.estimate.project_description.split('\n')[0].replace(/\*\*/g,'').substring(0,120) : 'Construction Services'}</div>
            <div class="client-details">
                <div>Date: ${estimateDate}</div>
                <div>Valid Until: ${validUntil}</div>
            </div>
        </div>
    </div>

    ${processedDescription ? `
    <!-- ══════════════════ PROJECT SCOPE ══════════════════ -->
    <div class="project-section">
        <div class="section-label" style="margin-bottom:8px;">Project Scope</div>
        <div class="project-description">${processedDescription}</div>
    </div>` : ''}

    <!-- ══════════════════ ITEMS TABLE ══════════════════ -->
    <div class="items-section">
        <div class="section-label" style="margin-bottom:8px;">Materials &amp; Services</div>
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
                    <td style="text-align:center;font-size:10px;color:#9CA3AF;">unit</td>
                    <td style="text-align:right;">${item.unit_price}</td>
                    <td style="text-align:right;font-weight:700;color:#0066FF;">${item.total}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>

    <!-- ══════════════════ TOTALS ══════════════════ -->
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

            ${hasTax ? `
            <div class="total-row">
                <span class="total-row-label">${taxLabel}</span>
                <span class="total-row-value">${taxAmount}</span>
            </div>` : ''}
            <div class="total-row grand">
                <span class="total-row-label">TOTAL</span>
                <span class="total-row-value">${total}</span>
            </div>
        </div>
    </div>
    <!-- ══════════════════ DEPOSIT NOTE ══════════════════ -->
    <div class="deposit-note">
        <span class="deposit-note-label">Note</span>
        <span class="deposit-note-text">50% Deposit Required to Schedule — Balance due upon project completion.</span>
    </div>

    <!-- ══════════════════ TERMS ══════════════════ -->
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

    <!-- ══════════════════ SIGNATURES ══════════════════ -->
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

    <!-- ══════════════════ FOOTER ══════════════════ -->
    <div class="footer">
        <div class="footer-line"></div>
        <div class="footer-diamond"></div>
        <div class="footer-text">Powered by Mervin AI · owlfenc.com</div>
        <div class="footer-diamond"></div>
        <div class="footer-line"></div>
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
