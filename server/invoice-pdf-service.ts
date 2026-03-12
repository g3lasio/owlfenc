/**
 * Professional Invoice PDF Generation Service using Puppeteer
 * Premium template — Inter font, logo support, payment link, clean layout
 * v2.1 — Fixed: footer overlap, summary truncation, page-break issues
 */

import { launchBrowser } from './utils/chromiumResolver';

interface InvoiceData {
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string;
    license?: string;
  };
  invoice: {
    number?: string;
    date?: string;
    due_date?: string;
    status?: string;
    items: Array<{
      code: string;
      description: string;
      qty: number | string;
      unit?: string;
      unit_price: string;
      total: string;
    }>;
    subtotal?: string;
    discounts?: string;
    discountAmount?: number;
    tax_rate?: number;
    tax_amount?: string;
    total?: string;
  };
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    contact?: string;
  };
  invoiceConfig?: {
    projectCompleted: boolean;
    downPaymentAmount?: string;
    totalAmountPaid: boolean;
  };
  paymentLink?: string;
}

export class InvoicePdfService {
  constructor() {}

  async initialize(): Promise<void> {
    console.log('✅ InvoicePdfService initialized (inline template mode)');
  }

  /**
   * Generate PDF from invoice data
   */
  async generatePdf(data: InvoiceData): Promise<Buffer> {
    console.log('🔄 Starting Invoice PDF generation with Puppeteer...');

    let browser;
    try {
      browser = await launchBrowser();
      const page = await browser.newPage();

      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

      const htmlContent = this.generateHtmlContent(data);
      console.log('📄 HTML content generated, length:', htmlContent.length);

      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Wait for fonts and images
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images, (img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.addEventListener('load', resolve);
              img.addEventListener('error', resolve);
              setTimeout(resolve, 3000);
            });
          })
        );
      });

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: { top: '0.65in', right: '0.65in', bottom: '0.65in', left: '0.65in' },
        preferCSSPageSize: false,
        displayHeaderFooter: false,
      });

      console.log('✅ Invoice PDF generated successfully, size:', pdfBuffer.length, 'bytes');
      return pdfBuffer;

    } catch (error) {
      console.error('❌ Error generating Invoice PDF:', error);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Generate premium HTML content directly (no external template file)
   */
  private generateHtmlContent(data: InvoiceData): string {
    // ── Financial calculations ────────────────────────────────
    const subtotalAmount = parseFloat((data.invoice.subtotal || '0').replace(/[$,]/g, '')) || 0;
    const discountAmount = data.invoice.discountAmount || parseFloat((data.invoice.discounts || '0').replace(/[$,\-]/g, '')) || 0;
    const taxRate = data.invoice.tax_rate || 0;
    const taxAmount = parseFloat((data.invoice.tax_amount || '0').replace(/[$,]/g, '')) || 0;
    const totalAmount = parseFloat((data.invoice.total || '0').replace(/[$,]/g, '')) || 0;

    let amountPaid = 0;
    let balance = totalAmount;

    if (data.invoiceConfig) {
      if (data.invoiceConfig.totalAmountPaid) {
        amountPaid = totalAmount;
        balance = 0;
      } else if (!data.invoiceConfig.projectCompleted && data.invoiceConfig.downPaymentAmount) {
        amountPaid = parseFloat(data.invoiceConfig.downPaymentAmount.replace(/[$,]/g, '')) || 0;
        balance = totalAmount - amountPaid;
      }
    }

    const fmt = (n: number) => `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    const taxRateDisplay = parseFloat(taxRate.toFixed(4));
    const statusColor = (data.invoice.status || 'pending') === 'paid' ? '#059669' : '#D97706';
    const statusLabel = (data.invoice.status || 'Pending').charAt(0).toUpperCase() + (data.invoice.status || 'pending').slice(1);

    // ── Logo / company header ─────────────────────────────────
    const logoHtml = data.company.logo
      ? `<img src="${data.company.logo}" alt="${data.company.name} Logo" style="max-width:180px;max-height:70px;object-fit:contain;display:block;margin-bottom:8px;">`
      : `<div style="font-size:22px;font-weight:900;color:#111827;letter-spacing:-1px;line-height:1.1;margin-bottom:8px;">${data.company.name}</div>`;

    // ── Items rows ────────────────────────────────────────────
    const itemsHtml = (data.invoice.items || []).map((item, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#F9FAFB'};">
        <td style="padding:11px 14px; vertical-align:top; border-bottom:1px solid #E5E7EB;">
          <div style="font-size:12px;font-weight:600;color:#111827;line-height:1.3;">${item.code || item.description}</div>
          ${item.code && item.description ? `<div style="font-size:10px;color:#6B7280;margin-top:2px;line-height:1.4;">${item.description}</div>` : ''}
        </td>
        <td style="padding:11px 14px;text-align:center;font-size:12px;font-weight:500;color:#111827;border-bottom:1px solid #E5E7EB;">${item.qty}</td>
        <td style="padding:11px 14px;text-align:center;font-size:11px;color:#9CA3AF;border-bottom:1px solid #E5E7EB;">${item.unit || 'unit'}</td>
        <td style="padding:11px 14px;text-align:right;font-size:12px;font-weight:500;color:#111827;border-bottom:1px solid #E5E7EB;">${item.unit_price}</td>
        <td style="padding:11px 14px;text-align:right;font-size:12px;font-weight:700;color:#0891B2;border-bottom:1px solid #E5E7EB;">${item.total}</td>
      </tr>
    `).join('');

    // ── Payment link section ──────────────────────────────────
    const paymentLinkHtml = data.paymentLink ? `
      <div style="margin:20px 0;padding:18px 22px;background:#ECFEFF;border:2px solid #0891B2;border-radius:10px;text-align:center;">
        <div style="font-size:10px;font-weight:700;color:#0E7490;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Secure Online Payment</div>
        <a href="${data.paymentLink}" style="display:inline-block;background:#0891B2;color:white;padding:11px 32px;text-decoration:none;border-radius:8px;font-weight:800;font-size:14px;letter-spacing:-0.3px;margin-bottom:8px;">
          Pay Now — ${fmt(balance)}
        </a>
        <div style="font-size:10px;color:#6B7280;word-break:break-all;margin-top:4px;">${data.paymentLink}</div>
      </div>
    ` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${data.invoice.number || ''}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: #ffffff;
    color: #111827;
    font-size: 13px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  @media print {
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
    .no-break { page-break-inside: avoid; break-inside: avoid; }
  }
  .section-label {
    font-size: 10px;
    font-weight: 700;
    color: #0891B2;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    padding-bottom: 5px;
    border-bottom: 2px solid #0891B2;
    width: fit-content;
    margin-bottom: 10px;
  }
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════════════ -->
<!-- PAGE 1 — INVOICE                                       -->
<!-- ══════════════════════════════════════════════════════ -->

<!-- HEADER ──────────────────────────────────────────────── -->
<div style="border-bottom:3px solid #0891B2;padding-bottom:22px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:flex-start;gap:24px;">
  <!-- Left: Company -->
  <div style="flex:1;min-width:0;">
    ${logoHtml}
    <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:6px;">${data.company.name}</div>
    <div style="display:flex;flex-direction:column;gap:2px;">
      ${data.company.address ? `<div style="font-size:11px;color:#6B7280;">${data.company.address}</div>` : ''}
      ${data.company.phone ? `<div style="font-size:11px;color:#6B7280;">Tel: ${data.company.phone}</div>` : ''}
      ${data.company.email ? `<div style="font-size:11px;color:#6B7280;">${data.company.email}</div>` : ''}
      ${data.company.website ? `<div style="font-size:11px;color:#6B7280;">${data.company.website}</div>` : ''}
      ${data.company.license ? `<div style="display:inline-flex;align-items:center;gap:4px;background:#ECFEFF;color:#0E7490;font-size:10px;font-weight:600;padding:3px 10px;border-radius:4px;border:1px solid rgba(8,145,178,0.25);width:fit-content;margin-top:4px;">Lic: ${data.company.license}</div>` : ''}
    </div>
  </div>
  <!-- Right: Invoice meta -->
  <div style="text-align:right;flex-shrink:0;">
    <div style="font-size:34px;font-weight:900;color:#0891B2;letter-spacing:-1.5px;line-height:1;text-transform:uppercase;margin-bottom:8px;">Invoice</div>
    <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:10px;">${data.invoice.number || 'INV-2026-00000'}</div>
    <div style="display:flex;flex-direction:column;gap:3px;">
      <div style="display:flex;justify-content:flex-end;gap:10px;font-size:11px;">
        <span style="color:#9CA3AF;font-weight:500;">Invoice Date</span>
        <span style="color:#111827;font-weight:600;min-width:80px;text-align:right;">${data.invoice.date || new Date().toLocaleDateString('en-US')}</span>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;font-size:11px;">
        <span style="color:#9CA3AF;font-weight:500;">Due Date</span>
        <span style="color:#111827;font-weight:600;min-width:80px;text-align:right;">${data.invoice.due_date || new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-US')}</span>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;font-size:11px;">
        <span style="color:#9CA3AF;font-weight:500;">Status</span>
        <span style="color:${statusColor};font-weight:700;min-width:80px;text-align:right;">● ${statusLabel}</span>
      </div>
    </div>
  </div>
</div>

<!-- BILL TO + PROJECT ────────────────────────────────────── -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding-bottom:20px;border-bottom:1px solid #E5E7EB;margin-bottom:20px;">
  <div>
    <div class="section-label">Bill To</div>
    <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:5px;">${data.client.name}</div>
    ${data.client.address ? `<div style="font-size:11px;color:#6B7280;margin-bottom:2px;">${data.client.address}</div>` : ''}
    ${data.client.phone ? `<div style="font-size:11px;color:#6B7280;margin-bottom:2px;">Tel: ${data.client.phone}</div>` : ''}
    ${data.client.email ? `<div style="font-size:11px;color:#6B7280;margin-bottom:2px;">${data.client.email}</div>` : ''}
  </div>
  <div>
    <div class="section-label">Project Details</div>
    <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:5px;">Invoice for Services</div>
    <div style="font-size:11px;color:#6B7280;margin-bottom:2px;">Date: ${data.invoice.date || new Date().toLocaleDateString('en-US')}</div>
  </div>
</div>

<!-- ITEMS TABLE ─────────────────────────────────────────── -->
<div style="margin-bottom:20px;">
  <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;">Services &amp; Materials</div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:#0891B2;">
        <th style="padding:10px 14px;text-align:left;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;width:44%;">Description</th>
        <th style="padding:10px 14px;text-align:center;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;width:8%;">Qty</th>
        <th style="padding:10px 14px;text-align:center;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;width:10%;">Unit</th>
        <th style="padding:10px 14px;text-align:right;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;width:18%;">Unit Price</th>
        <th style="padding:10px 14px;text-align:right;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;width:16%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
</div>

<!-- TOTALS ──────────────────────────────────────────────── -->
<div class="no-break" style="display:flex;justify-content:flex-end;margin-bottom:20px;">
  <div style="width:280px;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-bottom:1px solid #E5E7EB;">
      <span style="font-size:11px;font-weight:500;color:#6B7280;">Subtotal</span>
      <span style="font-size:12px;font-weight:600;color:#111827;">${fmt(subtotalAmount)}</span>
    </div>
    ${discountAmount > 0 ? `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-bottom:1px solid #E5E7EB;">
      <span style="font-size:11px;font-weight:500;color:#059669;">Discount</span>
      <span style="font-size:12px;font-weight:600;color:#059669;">-${fmt(discountAmount)}</span>
    </div>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-bottom:1px solid #E5E7EB;">
      <span style="font-size:11px;font-weight:500;color:#6B7280;">Tax (${taxRateDisplay}%)</span>
      <span style="font-size:12px;font-weight:600;color:#111827;">${fmt(taxAmount)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-bottom:1px solid #E5E7EB;">
      <span style="font-size:12px;font-weight:700;color:#111827;">Total</span>
      <span style="font-size:14px;font-weight:800;color:#0891B2;">${fmt(totalAmount)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-bottom:1px solid #E5E7EB;">
      <span style="font-size:11px;font-weight:500;color:#6B7280;">Amount Paid</span>
      <span style="font-size:12px;font-weight:600;color:#059669;">${fmt(amountPaid)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#0891B2;">
      <span style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.9);">Balance Due</span>
      <span style="font-size:17px;font-weight:900;color:white;letter-spacing:-0.5px;">${fmt(balance)}</span>
    </div>
  </div>
</div>

<!-- PAYMENT LINK (shown only if available) ──────────────── -->
${paymentLinkHtml}

<!-- THANK YOU ───────────────────────────────────────────── -->
<div style="margin-bottom:20px;">
  <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:14px 22px;text-align:center;">
    <div style="font-size:11px;font-style:italic;color:#6B7280;line-height:1.6;">
      We sincerely appreciate your business and the trust you have placed in us.<br>
      It is our privilege to serve you, and we look forward to collaborating on future projects.
    </div>
  </div>
</div>

<!-- FOOTER ──────────────────────────────────────────────── -->
<div style="border-top:1px solid #E5E7EB;padding-top:12px;display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:0;">
  <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#0891B2,transparent);"></div>
  <div style="width:5px;height:5px;background:#0891B2;transform:rotate(45deg);flex-shrink:0;"></div>
  <div style="font-size:9px;color:#9CA3AF;font-weight:500;letter-spacing:0.3px;">Powered by Mervin AI</div>
  <div style="width:5px;height:5px;background:#0891B2;transform:rotate(45deg);flex-shrink:0;"></div>
  <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#0891B2,transparent);"></div>
</div>

<!-- ══════════════════════════════════════════════════════ -->
<!-- PAGE 2 — LEGAL & TERMS                                 -->
<!-- ══════════════════════════════════════════════════════ -->
<div style="page-break-before:always;break-before:page;">

  <!-- Legal header -->
  <div style="border-bottom:3px solid #0891B2;padding-bottom:12px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;">
    <div style="font-size:18px;font-weight:800;color:#111827;letter-spacing:-0.5px;">Legal &amp; Terms</div>
    <div style="font-size:11px;color:#9CA3AF;font-weight:500;">${data.invoice.number || ''} · ${data.client.name} · ${data.invoice.date || ''}</div>
  </div>

  <!-- Notes & Legal Clauses -->
  <div style="margin-bottom:24px;">
    <div style="font-size:11px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid #E5E7EB;">Notes &amp; Legal Clauses</div>
    ${[
      'This invoice constitutes a binding fiscal instrument evidencing the obligation of payment for services rendered or to be rendered.',
      'Interest at a rate of 1.5% per month shall accrue on any overdue balance until paid in full.',
      'Any dispute or claim arising hereunder must be communicated in writing to the Contractor within five (5) days of receipt of this invoice.',
      'This invoice and any related disputes shall be governed by and construed in accordance with the laws of the jurisdiction in which the Contractor is located.'
    ].map(t => `
      <div style="display:flex;gap:10px;margin-bottom:8px;align-items:flex-start;">
        <div style="width:4px;height:4px;background:#0891B2;border-radius:50%;flex-shrink:0;margin-top:6px;"></div>
        <div style="font-size:11px;color:#6B7280;line-height:1.6;">${t}</div>
      </div>`).join('')}
  </div>

  <!-- Terms & Conditions -->
  <div style="margin-bottom:24px;">
    <div style="font-size:11px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid #E5E7EB;">Terms &amp; Conditions</div>
    ${[
      'Payment is due no later than thirty (30) days from the Invoice Date. Failure to remit payment within this period shall entitle the Contractor to suspend services and seek recovery of the outstanding balance, including reasonable attorney\'s fees and collection costs.',
      'Contractor shall retain a security interest in materials and work product provided until payment is received in full. Title and risk of loss shall transfer upon receipt of full payment.',
      'Client shall inspect the work promptly and notify the Contractor in writing of any defects or non-conformities within ten (10) days of completion; failure to do so shall constitute irrevocable acceptance.',
      'No modification or waiver of any provision of this invoice shall be effective unless in writing and signed by both Parties.'
    ].map(t => `
      <div style="display:flex;gap:10px;margin-bottom:8px;align-items:flex-start;">
        <div style="width:4px;height:4px;background:#0891B2;border-radius:50%;flex-shrink:0;margin-top:6px;"></div>
        <div style="font-size:11px;color:#6B7280;line-height:1.6;">${t}</div>
      </div>`).join('')}
  </div>

  <!-- Page 2 Footer -->
  <div style="border-top:1px solid #E5E7EB;padding-top:12px;display:flex;align-items:center;justify-content:center;gap:10px;">
    <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#0891B2,transparent);"></div>
    <div style="width:5px;height:5px;background:#0891B2;transform:rotate(45deg);flex-shrink:0;"></div>
    <div style="font-size:9px;color:#9CA3AF;font-weight:500;letter-spacing:0.3px;">Powered by Mervin AI</div>
    <div style="width:5px;height:5px;background:#0891B2;transform:rotate(45deg);flex-shrink:0;"></div>
    <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#0891B2,transparent);"></div>
  </div>

</div>

</body>
</html>`;
  }
}

// Export instance
export const invoicePdfService = new InvoicePdfService();
