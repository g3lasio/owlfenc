/**
 * Servicio de generación de PDFs de facturas usando Puppeteer como respaldo rápido
 */

import puppeteer from 'puppeteer';

export class PuppeteerInvoicePdfService {
  
  /**
   * Genera un PDF de factura usando Puppeteer como respaldo rápido
   */
  static async generateInvoicePdf(invoiceData: any): Promise<Buffer> {
    console.log('🚀 [PUPPETEER-INVOICE] Starting fast invoice generation...');
    
    let browser = null;
    try {
      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Generate HTML content
      const html = this.generateInvoiceHTML(invoiceData);
      
      // Set content and generate PDF
      await page.setContent(html);
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        }
      });
      
      console.log('✅ [PUPPETEER-INVOICE] Fast invoice PDF generated successfully');
      return Buffer.from(pdfBuffer);
      
    } catch (error: any) {
      console.error('❌ [PUPPETEER-INVOICE] Error generating PDF:', error.message);
      throw new Error(`Failed to generate invoice PDF: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  
  /**
   * Genera el HTML de la factura con diseño profesional
   */
  private static generateInvoiceHTML(invoiceData: any): string {
    const { company, client, invoice } = invoiceData;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.number}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000;
            background: #fff;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-name {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 10px;
            color: #000;
        }
        
        .company-details {
            font-size: 10pt;
            line-height: 1.3;
        }
        
        .invoice-title {
            flex: 1;
            text-align: right;
        }
        
        .invoice-title h1 {
            font-size: 32pt;
            font-weight: bold;
            color: #000;
            margin-bottom: 10px;
        }
        
        .invoice-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        
        .bill-to, .invoice-details {
            flex: 1;
        }
        
        .bill-to {
            padding-right: 20px;
        }
        
        .section-title {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 10px;
            color: #000;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .items-table th,
        .items-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
        }
        
        .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            font-size: 10pt;
        }
        
        .items-table td {
            font-size: 10pt;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .totals-section {
            margin-top: 20px;
            text-align: right;
        }
        
        .totals-table {
            margin-left: auto;
            border-collapse: collapse;
        }
        
        .totals-table td {
            padding: 5px 15px;
            border: none;
        }
        
        .total-label {
            font-weight: bold;
            text-align: right;
        }
        
        .total-amount {
            font-weight: bold;
            font-size: 12pt;
            text-align: right;
            border-top: 1px solid #000;
            border-bottom: 3px double #000;
        }
        
        .terms-section {
            margin-top: 30px;
            font-size: 9pt;
            border-top: 1px solid #ccc;
            padding-top: 15px;
        }
        
        .payment-info {
            margin-top: 20px;
            background-color: #f9f9f9;
            padding: 15px;
            border: 1px solid #ddd;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <div class="company-info">
                <div class="company-name">${company.name}</div>
                <div class="company-details">
                    ${company.address}<br>
                    ${company.phone}<br>
                    ${company.email}<br>
                    ${company.website || ''}
                </div>
            </div>
            <div class="invoice-title">
                <h1>INVOICE</h1>
            </div>
        </div>
        
        <!-- Invoice Meta Information -->
        <div class="invoice-meta">
            <div class="bill-to">
                <div class="section-title">BILL TO:</div>
                <div>
                    <strong>${client.name}</strong><br>
                    ${client.address || ''}<br>
                    ${client.contact || ''}
                </div>
            </div>
            <div class="invoice-details">
                <div class="section-title">INVOICE DETAILS:</div>
                <div>
                    <strong>Invoice #:</strong> ${invoice.number}<br>
                    <strong>Date:</strong> ${invoice.date}<br>
                    <strong>Due Date:</strong> ${invoice.due_date}<br>
                </div>
            </div>
        </div>
        
        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 15%;">Item Code</th>
                    <th style="width: 45%;">Description</th>
                    <th style="width: 10%;" class="text-center">Qty</th>
                    <th style="width: 15%;" class="text-right">Unit Price</th>
                    <th style="width: 15%;" class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${invoice.items.map((item: any) => `
                    <tr>
                        <td>${item.code}</td>
                        <td>${item.description}</td>
                        <td class="text-center">${item.qty}</td>
                        <td class="text-right">${item.unit_price}</td>
                        <td class="text-right">${item.total}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <!-- Totals -->
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td class="total-label">Subtotal:</td>
                    <td class="text-right">$${invoice.items.reduce((sum: number, item: any) => sum + parseFloat(item.total.replace('$', '')), 0).toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="total-label">Tax:</td>
                    <td class="text-right">$0.00</td>
                </tr>
                <tr>
                    <td class="total-label total-amount">TOTAL DUE:</td>
                    <td class="text-right total-amount">$${invoice.items.reduce((sum: number, item: any) => sum + parseFloat(item.total.replace('$', '')), 0).toFixed(2)}</td>
                </tr>
            </table>
        </div>
        
        <!-- Payment Terms -->
        <div class="terms-section">
            <div class="section-title">PAYMENT TERMS & CONDITIONS:</div>
            <p>
                Payment is due within 30 days of invoice date. Late payments may be subject to a 1.5% monthly service charge.
                Please make checks payable to ${company.name}. Thank you for your business!
            </p>
        </div>
        
        <!-- Payment Information -->
        <div class="payment-info">
            <strong>Questions about this invoice?</strong><br>
            Contact: ${company.phone} | ${company.email}
        </div>
    </div>
</body>
</html>
    `;
  }
}