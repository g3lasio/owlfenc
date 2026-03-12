/**
 * Professional Invoice PDF Generation Service using Puppeteer
 * Premium template — Inter font, logo support, payment link, clean layout
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
        format: 'A4',
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
        preferCSSPageSize: true,
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
      ? `<img src="${data.company.logo}" alt="${data.company.name} Logo" style="max-width:200px;max-height:80px;object-fit:contain;display:block;">`
      : `<div style="font-size:26px;font-weight:900;color:#111827;letter-spacing:-1px;line-height:1.1;">${data.company.name}</div>`;

    // ── Items rows ────────────────────────────────────────────
    const itemsHtml = (data.invoice.items || []).map((item, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#F9FAFB'}; border-bottom:1px solid #E5E7EB;">
        <td style="padding:13px 16px; vertical-align:top;">
          <div style="font-size:13px;font-weight:600;color:#111827;line-height:1.3;">${item.code || item.description}</div>
          ${item.code && item.description ? `<div style="font-size:11px;color:#6B7280;margin-top:2px;line-height:1.4;">${item.description}</div>` : ''}
        </td>
        <td style="padding:13px 16px;text-align:center;font-size:13px;font-weight:500;color:#111827;">${item.qty}</td>
        <td style="padding:13px 16px;text-align:center;font-size:12px;color:#9CA3AF;">${item.unit || 'unit'}</td>
        <td style="padding:13px 16px;text-align:right;font-size:13px;font-weight:500;color:#111827;">${item.unit_price}</td>
        <td style="padding:13px 16px;text-align:right;font-size:13px;font-weight:700;color:#0891B2;">${item.total}</td>
      </tr>
    `).join('');

    // ── Payment link section ──────────────────────────────────
    const paymentLinkHtml = data.paymentLink ? `
      <div style="margin:0 48px 24px;padding:20px 24px;background:#ECFEFF;border:2px solid #0891B2;border-radius:10px;text-align:center;">
        <div style="font-size:10px;font-weight:700;color:#0E7490;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Secure Online Payment</div>
        <a href="${data.paymentLink}" style="display:inline-block;background:#0891B2;color:white;padding:13px 36px;text-decoration:none;border-radius:8px;font-weight:800;font-size:15px;letter-spacing:-0.3px;margin-bottom:10px;">
          Pay Now — ${fmt(balance)}
        </a>
        <div style="font-size:10px;color:#6B7280;word-break:break-all;margin-top:6px;">${data.paymentLink}</div>
      </div>
    ` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${data.invoice.number || ''}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #ffffff;
    color: #111827;
    font-size: 13px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  @page { margin: 20mm 15mm 28mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
  }
  .page-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 10px 48px;
    border-top: 1px solid #E5E7EB;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: #ffffff;
    z-index: 9999;
  }
</style>
</head>
<body>

<!-- ═══════════════════════ PAGE 1 ═══════════════════════ -->

<!-- HEADER -->
<div style="padding:36px 48px 28px; border-bottom:3px solid #0891B2; display:flex; justify-content:space-between; align-items:flex-start; gap:24px;">
  <!-- Left: Company -->
  <div style="display:flex;flex-direction:column;gap:12px;">
    ${logoHtml}
    <div style="display:flex;flex-direction:column;gap:3px;">
      <div style="font-size:16px;font-weight:700;color:#111827;">${data.company.name}</div>
      ${data.company.address ? `<div style="font-size:11px;color:#6B7280;display:flex;align-items:flex-start;gap:5px;margin-bottom:2px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${data.company.address}</div>` : ''}
      ${data.company.phone ? `<div style="font-size:11px;color:#6B7280;display:flex;align-items:center;gap:5px;margin-bottom:2px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l1.79-1.79a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${data.company.phone}</div>` : ''}
      ${data.company.email ? `<div style="font-size:11px;color:#6B7280;display:flex;align-items:center;gap:5px;margin-bottom:2px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${data.company.email}</div>` : ''}
      ${data.company.website ? `<div style="font-size:11px;color:#6B7280;display:flex;align-items:center;gap:5px;margin-bottom:2px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>${data.company.website}</div>` : ''}
      ${data.company.license ? `<div style="display:inline-flex;align-items:center;gap:4px;background:#ECFEFF;color:#0E7490;font-size:10px;font-weight:600;padding:3px 10px;border-radius:4px;border:1px solid rgba(8,145,178,0.25);width:fit-content;margin-top:4px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0E7490" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Lic: ${data.company.license}</div>` : ''}
    </div>
  </div>

  <!-- Right: Invoice meta -->
  <div style="text-align:right;flex-shrink:0;">
    <div style="font-size:32px;font-weight:900;color:#0891B2;letter-spacing:-1.5px;line-height:1;text-transform:uppercase;">Invoice</div>
    <div style="font-size:15px;font-weight:700;color:#111827;margin-top:8px;letter-spacing:0.3px;">${data.invoice.number || 'INV-2026-00000'}</div>
    <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px;">
      <div style="display:flex;justify-content:flex-end;gap:10px;font-size:11px;">
        <span style="color:#9CA3AF;font-weight:500;">Invoice Date</span>
        <span style="color:#111827;font-weight:600;min-width:90px;text-align:right;">${data.invoice.date || new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</span>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;font-size:11px;">
        <span style="color:#9CA3AF;font-weight:500;">Due Date</span>
        <span style="color:#111827;font-weight:600;min-width:90px;text-align:right;">${data.invoice.due_date || new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</span>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;font-size:11px;">
        <span style="color:#9CA3AF;font-weight:500;">Status</span>
        <span style="color:${statusColor};font-weight:700;min-width:90px;text-align:right;">● ${statusLabel}</span>
      </div>
    </div>
  </div>
</div>

<!-- BILL TO + PROJECT -->
<div style="padding:24px 48px; display:grid; grid-template-columns:1fr 1fr; gap:24px; border-bottom:1px solid #E5E7EB;">
  <div>
    <div style="font-size:10px;font-weight:700;color:#0891B2;text-transform:uppercase;letter-spacing:1.2px;padding-bottom:6px;border-bottom:2px solid #0891B2;width:fit-content;margin-bottom:10px;">Bill To</div>
    <div style="font-size:17px;font-weight:700;color:#111827;letter-spacing:-0.3px;margin-bottom:5px;">${data.client.name}</div>
    ${data.client.address ? `<div style="font-size:12px;color:#6B7280;margin-bottom:3px;display:flex;align-items:flex-start;gap:5px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${data.client.address}</div>` : ''}
    ${data.client.phone ? `<div style="font-size:12px;color:#6B7280;margin-bottom:3px;display:flex;align-items:center;gap:5px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l1.79-1.79a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${data.client.phone}</div>` : ''}
    ${data.client.email ? `<div style="font-size:12px;color:#6B7280;margin-bottom:3px;display:flex;align-items:center;gap:5px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>${data.client.email}</div>` : ''}
  </div>
  <div>
    <div style="font-size:10px;font-weight:700;color:#0891B2;text-transform:uppercase;letter-spacing:1.2px;padding-bottom:6px;border-bottom:2px solid #0891B2;width:fit-content;margin-bottom:10px;">Project Details</div>
    <div style="font-size:17px;font-weight:700;color:#111827;letter-spacing:-0.3px;margin-bottom:5px;">Invoice for Services</div>
    <div style="font-size:12px;color:#6B7280;margin-bottom:3px;">Date: ${data.invoice.date || new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'})}</div>
  </div>
</div>

<!-- ITEMS TABLE -->
<div style="padding:24px 48px 0;">
  <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:12px;">Services &amp; Materials</div>
  <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:#0891B2;">
        <th style="padding:11px 16px;text-align:left;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;width:44%;">Description</th>
        <th style="padding:11px 16px;text-align:center;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;width:8%;">Qty</th>
        <th style="padding:11px 16px;text-align:center;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;width:10%;">Unit</th>
        <th style="padding:11px 16px;text-align:right;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;width:18%;">Unit Price</th>
        <th style="padding:11px 16px;text-align:right;color:white;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;width:16%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
</div>

<!-- TOTALS -->
<div style="padding:20px 48px 0; display:flex; justify-content:flex-end;">
  <div style="width:290px;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid #E5E7EB;">
      <span style="font-size:11px;font-weight:500;color:#6B7280;">Subtotal</span>
      <span style="font-size:12px;font-weight:600;color:#111827;">${fmt(subtotalAmount)}</span>
    </div>
    ${discountAmount > 0 ? `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid #E5E7EB;">
      <span style="font-size:11px;font-weight:500;color:#059669;">Discount</span>
      <span style="font-size:12px;font-weight:600;color:#059669;">-${fmt(discountAmount)}</span>
    </div>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid #E5E7EB;">
      <span style="font-size:11px;font-weight:500;color:#6B7280;">Tax (${taxRateDisplay}%)</span>
      <span style="font-size:12px;font-weight:600;color:#111827;">${fmt(taxAmount)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid #E5E7EB;">
      <span style="font-size:12px;font-weight:700;color:#111827;">Total</span>
      <span style="font-size:15px;font-weight:800;color:#0891B2;">${fmt(totalAmount)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid #E5E7EB;">
      <span style="font-size:11px;font-weight:500;color:#6B7280;">Amount Paid</span>
      <span style="font-size:12px;font-weight:600;color:#059669;">${fmt(amountPaid)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:13px 16px;background:#0891B2;">
      <span style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.9);">Balance Due</span>
      <span style="font-size:18px;font-weight:900;color:white;letter-spacing:-0.5px;">${fmt(balance)}</span>
    </div>
  </div>
</div>

<!-- PAYMENT LINK (always shown if available) -->
${paymentLinkHtml}

<!-- THANK YOU -->
<div style="padding:20px 48px;">
  <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px 24px;text-align:center;">
    <div style="font-size:12px;font-style:italic;color:#6B7280;line-height:1.6;">
      We sincerely appreciate your business and the trust you have placed in us.<br>
      It is our privilege to serve you, and we look forward to collaborating on future projects.
    </div>
  </div>
</div>

<!-- FIXED FOOTER (appears on every page) -->
<div class="page-footer">
  <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#0891B2,transparent);"></div>
  <div style="width:6px;height:6px;background:#0891B2;transform:rotate(45deg);flex-shrink:0;"></div>
  <div style="font-size:10px;color:#9CA3AF;font-weight:500;letter-spacing:0.3px;">Powered by Mervin AI</div>
  <div style="width:6px;height:6px;background:#0891B2;transform:rotate(45deg);flex-shrink:0;"></div>
  <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#0891B2,transparent);"></div>
</div>

<!-- ═══════════════════════ PAGE 2: LEGAL ═══════════════════════ -->
<div style="page-break-before:always;break-before:page;padding:48px 48px 32px;position:relative;min-height:1100px;">

  <!-- Legal header -->
  <div style="border-bottom:3px solid #0891B2;padding-bottom:12px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between;">
    <div style="font-size:20px;font-weight:800;color:#111827;letter-spacing:-0.5px;">Legal &amp; Terms</div>
    <div style="font-size:11px;color:#9CA3AF;font-weight:500;">${data.invoice.number || ''} · ${data.client.name} · ${data.invoice.date || ''}</div>
  </div>

  <!-- Notes & Legal Clauses -->
  <div style="margin-bottom:28px;">
    <div style="font-size:12px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #E5E7EB;">Notes &amp; Legal Clauses</div>
    ${[
      'This invoice constitutes a binding fiscal instrument evidencing the obligation of payment for services rendered or to be rendered.',
      'Interest at a rate of 1.5% per month shall accrue on any overdue balance until paid in full.',
      'Any dispute or claim arising hereunder must be communicated in writing to the Contractor within five (5) days of receipt of this invoice.',
      'This invoice and any related disputes shall be governed by and construed in accordance with the laws of the jurisdiction in which the Contractor is located.'
    ].map(t => `
      <div style="display:flex;gap:10px;margin-bottom:9px;align-items:flex-start;">
        <div style="width:5px;height:5px;background:#0891B2;border-radius:50%;flex-shrink:0;margin-top:6px;"></div>
        <div style="font-size:12px;color:#6B7280;line-height:1.6;">${t}</div>
      </div>`).join('')}
  </div>

  <!-- Terms & Conditions -->
  <div style="margin-bottom:28px;">
    <div style="font-size:12px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #E5E7EB;">Terms &amp; Conditions</div>
    ${[
      'Payment is due no later than thirty (30) days from the Invoice Date. Failure to remit payment within this period shall entitle the Contractor to suspend services and seek recovery of the outstanding balance, including reasonable attorney\'s fees and collection costs.',
      'Contractor shall retain a security interest in materials and work product provided until payment is received in full. Title and risk of loss shall transfer upon receipt of full payment.',
      'Client shall inspect the work promptly and notify the Contractor in writing of any defects or non-conformities within ten (10) days of completion; failure to do so shall constitute irrevocable acceptance.',
      'No modification or waiver of any provision of this invoice shall be effective unless in writing and signed by both Parties.'
    ].map(t => `
      <div style="display:flex;gap:10px;margin-bottom:9px;align-items:flex-start;">
        <div style="width:5px;height:5px;background:#0891B2;border-radius:50%;flex-shrink:0;margin-top:6px;"></div>
        <div style="font-size:12px;color:#6B7280;line-height:1.6;">${t}</div>
      </div>`).join('')}
  </div>

  <!-- Footer removed from page 2 body - handled by fixed .page-footer above -->

</div>

</body>
</html>`;
  }
}

// Export instance
export const invoicePdfService = new InvoicePdfService();
