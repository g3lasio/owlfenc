/**
 * Professional Invoice PDF Generation Service using Puppeteer
 * 
 * This service generates high-quality PDF invoices using the professional template
 * directly with Puppeteer, specifically designed for invoices.
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { getChromiumExecutablePath } from './utils/chromiumResolver';

interface InvoiceData {
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string;
  };
  invoice: {
    number?: string;
    date?: string;
    due_date?: string;
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
    contact?: string;
  };
  invoiceConfig?: {
    projectCompleted: boolean;
    downPaymentAmount?: string;
    totalAmountPaid: boolean;
  };
}

export class InvoicePdfService {
  private templatePath: string;
  
  constructor() {
    this.templatePath = path.join(process.cwd(), 'server', 'templates', 'professional-invoice.html');
  }

  /**
   * Initialize the service and ensure template exists
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureTemplateExists();
      console.log('✅ InvoicePdfService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize InvoicePdfService:', error);
      throw error;
    }
  }

  /**
   * Generate PDF from invoice data
   */
  async generatePdf(data: InvoiceData): Promise<Buffer> {
    console.log('🔄 Starting Invoice PDF generation with Puppeteer...');
    
    let browser;
    try {
      // Use dynamic Chromium path detection for dev/production compatibility
      const executablePath = getChromiumExecutablePath();
      
      console.log('🔍 Using Chromium executable:', executablePath);

      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-plugins'
        ]
      });

      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2
      });

      // Generate HTML content
      const htmlContent = await this.generateHtmlContent(data);
      console.log('📄 HTML content generated, length:', htmlContent.length);

      // Load HTML content
      await page.setContent(htmlContent, {
        waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
        timeout: 30000
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.75in',
          right: '0.75in',
          bottom: '0.75in',
          left: '0.75in'
        },
        preferCSSPageSize: true
      });

      console.log('✅ Invoice PDF generated successfully, size:', pdfBuffer.length, 'bytes');
      return pdfBuffer;

    } catch (error) {
      console.error('❌ Error generating Invoice PDF:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generate HTML content from template and data
   */
  private async generateHtmlContent(data: InvoiceData): Promise<string> {
    console.log('🎨 Generating HTML content from template...');
    
    try {
      let html = await fs.readFile(this.templatePath, 'utf-8');
      
      // Replace company information
      html = html.replace(/\{\{company\.name\}\}/g, data.company.name || 'Your Company');
      html = html.replace(/\{\{company\.address\}\}/g, data.company.address || 'Company Address');
      html = html.replace(/\{\{company\.phone\}\}/g, data.company.phone || 'Phone Number');
      html = html.replace(/\{\{company\.email\}\}/g, data.company.email || 'Email Address');
      html = html.replace(/\{\{company\.website\}\}/g, data.company.website || 'Website');
      
      // Handle logo
      if (data.company.logo && data.company.logo.startsWith('data:image')) {
        html = html.replace(/\{\{company\.logo\}\}/g, data.company.logo);
      } else {
        // Remove logo section if no logo
        html = html.replace(/<img src="\{\{company\.logo\}\}" alt="Company Logo">/g, '');
      }

      // Replace invoice information
      html = html.replace(/\{\{invoice\.number\}\}/g, data.invoice.number || `INV-${Date.now()}`);
      html = html.replace(/\{\{invoice\.date\}\}/g, data.invoice.date || new Date().toLocaleDateString());
      html = html.replace(/\{\{invoice\.due_date\}\}/g, data.invoice.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString());

      // Replace client information
      html = html.replace(/\{\{client\.name\}\}/g, data.client.name || 'Client Name');
      html = html.replace(/\{\{client\.address\}\}/g, data.client.address || 'Client Address');
      html = html.replace(/\{\{client\.contact\}\}/g, data.client.contact || `${data.client.phone || 'Phone'}\n${data.client.email || 'Email'}`);

      // Generate items table rows
      const itemsHtml = data.invoice.items.map(item => `
        <tr>
          <td>${item.code} – ${item.description}</td>
          <td>${item.qty}</td>
          <td>${item.unit_price}</td>
          <td>${item.total}</td>
        </tr>
      `).join('');

      // Replace items placeholder
      html = html.replace(/\{\{#each invoice\.items\}\}[\s\S]*?\{\{\/each\}\}/g, itemsHtml);

      // Calculate payment details based on invoice configuration
      const subtotalAmount = parseFloat(data.invoice.subtotal?.replace('$', '') || '0');
      const discountAmount = data.invoice.discountAmount || parseFloat(data.invoice.discounts?.replace(/[$-]/g, '') || '0');
      const taxAmount = parseFloat(data.invoice.tax_amount?.replace('$', '') || '0');
      const totalAmount = parseFloat(data.invoice.total?.replace('$', '') || '0');
      
      let amountPaid = 0;
      let balance = totalAmount;
      
      if (data.invoiceConfig) {
        if (data.invoiceConfig.totalAmountPaid) {
          // Client has paid everything
          amountPaid = totalAmount;
          balance = 0;
        } else if (data.invoiceConfig.projectCompleted === false && data.invoiceConfig.downPaymentAmount) {
          // Project not completed, but down payment made
          amountPaid = parseFloat(data.invoiceConfig.downPaymentAmount.replace(/[$,]/g, '') || '0');
          balance = totalAmount - amountPaid;
        }
      }

      // Generate totals summary section
      const totalsSummaryHtml = `
        <div class="section totals-summary">
          <h2>Totals Summary</h2>
          <table class="summary-table">
            <tr>
              <td><strong>Subtotal:</strong></td>
              <td><strong>$${subtotalAmount.toFixed(2)}</strong></td>
            </tr>
            ${discountAmount > 0 ? `
            <tr>
              <td style="color: #10b981;"><strong>Discount:</strong></td>
              <td style="color: #10b981;"><strong>-$${discountAmount.toFixed(2)}</strong></td>
            </tr>
            ` : ''}
            <tr>
              <td><strong>Tax (${data.invoice.tax_rate || 0}%):</strong></td>
              <td><strong>$${taxAmount.toFixed(2)}</strong></td>
            </tr>
            <tr style="border-top: 2px solid #333; font-size: 1.2em;">
              <td><strong>Total:</strong></td>
              <td style="color: #2563eb;"><strong>$${totalAmount.toFixed(2)}</strong></td>
            </tr>
            <tr>
              <td><strong>Amount Paid:</strong></td>
              <td style="color: #10b981;"><strong>$${amountPaid.toFixed(2)}</strong></td>
            </tr>
            <tr style="border-top: 1px solid #ccc; font-size: 1.1em;">
              <td><strong>Balance Due:</strong></td>
              <td style="color: ${balance > 0 ? '#dc2626' : '#10b981'};"><strong>$${balance.toFixed(2)}</strong></td>
            </tr>
          </table>
        </div>
      `;

      // Insert totals summary before the thank you section
      html = html.replace(
        '<div class="thank-you">',
        totalsSummaryHtml + '\n    <div class="thank-you">'
      );

      console.log('✅ HTML content processed successfully');
      return html;
      
    } catch (error) {
      console.error('❌ Error generating HTML content:', error);
      throw error;
    }
  }

  /**
   * Ensure template file exists
   */
  private async ensureTemplateExists(): Promise<void> {
    try {
      const templateDir = path.dirname(this.templatePath);
      await fs.mkdir(templateDir, { recursive: true });
      
      // Check if template exists
      try {
        await fs.access(this.templatePath);
        console.log('✅ Invoice template file found');
      } catch {
        // Create template file
        console.log('📝 Creating invoice template file...');
        await this.createTemplateFile();
      }
    } catch (error) {
      throw new Error(`Failed to ensure invoice template exists: ${error.message}`);
    }
  }

  /**
   * Create template file with professional invoice design
   */
  private async createTemplateFile(): Promise<void> {
    const templateContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Invoice</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Quantico&display=swap');
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f9f9f9;
      color: #333;
    }
    .invoice-container {
      position: relative;
      max-width: 800px;
      margin: auto;
      background: #fff;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-radius: 8px;
    }
    /* Watermark */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 400px;
      height: 400px;
      background: url('https://i.postimg.cc/G3ZFZTjy/logo-mervin.png') no-repeat center center;
      background-size: contain;
      opacity: 0.05;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #eee;
      padding-bottom: 10px;
      margin-bottom: 20px;
      z-index: 1;
      position: relative;
    }
    .company-details {
      flex: 1;
      text-align: left;
      line-height: 1.4;
      z-index: 1;
      position: relative;
    }
    .company-logo {
      flex: 1;
      text-align: center;
      z-index: 1;
      position: relative;
    }
    .company-logo img {
      max-height: 60px;
    }
    .invoice-info {
      flex: 1;
      text-align: right;
      line-height: 1.4;
      z-index: 1;
      position: relative;
    }
    .section { margin-bottom: 20px; position: relative; z-index: 1; }
    .section h2 {
      font-size: 1.2em;
      margin-bottom: 10px;
      border-bottom: 1px solid #eee;
      padding-bottom: 5px;
      color: #333;
      font-weight: bold;
      position: relative;
      z-index: 1;
    }
    .section.center h2 { text-align: center; }
    .bill-to pre {
      margin: 0;
      font-family: inherit;
      line-height: 1.5;
      color: #333;
      z-index: 1;
      position: relative;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      position: relative;
      z-index: 1;
    }
    table th, table td {
      border: 2px solid #bbb;
      padding: 8px;
      text-align: center;
      color: #333;
    }
    table thead th {
      background-color: #0ff;
      color: #000;
      font-weight: bold;
    }
    .summary-table, .summary-table th, .summary-table td {
      border: none;
      padding: 8px 12px;
      text-align: right;
      color: #333;
      position: relative;
      z-index: 1;
      font-size: 1em;
    }
    .summary-table {
      width: 100%;
      max-width: 400px;
      margin-left: auto;
      margin-right: 0;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-table tr:last-child td {
      font-weight: bold;
      font-size: 1.2em;
    }
    .totals-summary {
      margin: 30px 0;
      page-break-inside: avoid;
    }
    .totals-summary h2 {
      text-align: center;
      margin-bottom: 20px;
      color: #2563eb;
      font-size: 1.3em;
    }
    .payment-options ul, .notes ul, .terms ul {
      padding-left: 20px;
      color: #333;
      position: relative;
      z-index: 1;
    }
    .thank-you {
      position: relative;
      padding: 20px;
      margin-bottom: 20px;
      background-color: #111;
      color: #0ff;
      font-family: 'Quantico', sans-serif;
      font-style: italic;
      border-radius: 8px;
      overflow: hidden;
      border: 4px solid rgba(0,255,255,0.5);
      text-align: center;
      box-shadow: 0 0 15px rgba(0,255,255,0.6);
      z-index: 1;
    }
    .thank-you:before, .thank-you:after {
      content: '';
      position: absolute;
      width: 24px;
      height: 24px;
      border: 4px solid #0ff;
      box-sizing: border-box;
      z-index: 1;
    }
    .thank-you:before { top: 0; left: 0; border-right: none; border-bottom: none; }
    .thank-you:after { bottom: 0; right: 0; border-left: none; border-top: none; }
    @keyframes scan { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
    .thank-you:before, .thank-you:after { animation: scan 3s infinite; }
    .footer {
      text-align: center;
      margin-top: 20px;
      position: relative;
      z-index: 1;
    }
    .footer:before {
      content: '';
      display: block;
      width: 100%;
      height: 4px;
      background: linear-gradient(90deg, transparent, #0ff, transparent);
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }
    .arrow-line {
      position: relative;
      height: 4px;
      background: linear-gradient(to right, transparent, #0ff, transparent);
      margin-bottom: 8px;
      overflow: visible;
      z-index: 1;
    }
    .arrow-line:after {
      content: '';
      position: absolute;
      top: -6px;
      left: 50%;
      margin-left: -8px;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 12px solid #0ff;
      z-index: 1;
    }
    a { color: #007BFF; text-decoration: none; position: relative; z-index: 1; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="watermark"></div>
    <div class="header">
      <div class="company-details">
        <strong>{{company.name}}</strong><br>
        {{company.address}}<br>
        Phone: {{company.phone}}<br>
        Email: <a href="mailto:{{company.email}}">{{company.email}}</a><br>
        Website: <a href="{{company.website}}">{{company.website}}</a>
      </div>
      <div class="company-logo">
        <img src="{{company.logo}}" alt="Company Logo">
      </div>
      <div class="invoice-info">
        <strong>INVOICE</strong><br>
        Invoice #: {{invoice.number}}<br>
        Invoice Date: {{invoice.date}}<br>
        Due Date: {{invoice.due_date}}
      </div>
    </div>

    <div class="section bill-to">
      <h2>Bill To</h2>
      <pre>
{{client.name}}
{{client.address}}
{{client.contact}}
      </pre>
    </div>

    <div class="section items">
      <h2>Items</h2>
      <table>
        <thead>
          <tr>
            <th>Item Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {{#each invoice.items}}
          <tr>
            <td>{{code}} – {{description}}</td>
            <td>{{qty}}</td>
            <td>{{unit_price}}</td>
            <td>{{total}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>

    <div class="thank-you">
      We sincerely appreciate your business and the trust you have placed in us. It is our privilege to serve you, and we look forward to the opportunity to collaborate on future projects with the same dedication and excellence.
    </div>

    <div class="section notes center">
      <h2>Notes & Legal Clauses</h2>
      <ul>
        <li>This invoice constitutes a binding fiscal instrument evidencing the obligation of payment for services rendered or to be rendered.</li>
        <li>Interest at a rate of 1.5% per month shall accrue on any overdue balance until paid in full.</li>
        <li>Any dispute or claim arising hereunder must be communicated in writing to the Contractor within five (5) days of receipt of this invoice.</li>
        <li>This invoice and any related disputes shall be governed by and construed in accordance with the laws of the jurisdiction in which the Contractor is located.</li>
      </ul>
    </div>

    <div class="section terms center">
      <h2>Terms & Conditions</h2>
      <ul>
        <li>Payment is due no later than thirty (30) days from the Invoice Date. Failure to remit payment within this period shall entitle the Contractor to suspend services and seek recovery of the outstanding balance, including reasonable attorney's fees and collection costs.</li>
        <li>Contractor shall retain a security interest in materials and work product provided until payment is received in full. Title and risk of loss shall transfer upon receipt of full payment.</li>
        <li>Client shall inspect the work promptly and notify the Contractor in writing of any defects or non-conformities within ten (10) days of completion; failure to do so shall constitute irrevocable acceptance.</li>
        <li>No modification or waiver of any provision of this invoice shall be effective unless in writing and signed by both Parties.</li>
      </ul>
    </div>

    <div class="footer">
      <div class="arrow-line"></div>
      <div style="font-size:0.9em; color:#666;">Powered by Mervin AI</div>
    </div>
  </div>
</body>
</html>`;
    
    await fs.writeFile(this.templatePath, templateContent, 'utf-8');
    console.log('✅ Invoice template file created successfully');
  }
}

// Export instance
export const invoicePdfService = new InvoicePdfService();