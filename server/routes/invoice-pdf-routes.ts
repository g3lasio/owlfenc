/**
 * Rutas para la generación de PDFs de facturas usando template HTML
 */

import express from 'express';
import { storage } from '../storage';
import * as fs from 'fs';
import * as path from 'path';
import { jsPDF } from 'jspdf';

const router = express.Router();

/**
 * POST /api/invoice-pdf/generate
 * Genera un PDF de factura a partir de datos de estimado
 */
router.post('/generate', async (req, res) => {
  try {
    console.log('🧾 [INVOICE-PDF] Starting invoice generation...');
    console.log('🧾 [INVOICE-PDF] Request body keys:', Object.keys(req.body));
    
    // Set longer timeout for PDF generation
    req.setTimeout(120000); // 2 minutes timeout
    
    // Extract data directly without complex validation
    const { estimateData, contractorData } = req.body;
    
    if (!estimateData || !estimateData.client || !estimateData.client.name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required estimate data'
      });
    }

    console.log('📋 [INVOICE-PDF] Processing data for client:', estimateData.client.name);

    // Obtener datos del contratista si no se proporcionan
    let contractor = contractorData || {};
    if (!contractor.company) {
      try {
        const userProfile = await storage.getUser(1);
        if (userProfile) {
          contractor = {
            company: userProfile.company || 'Your Company',
            name: userProfile.name || userProfile.company || 'Your Company',
            address: userProfile.address,
            city: userProfile.city,
            state: userProfile.state,
            zipCode: userProfile.zipCode,
            phone: userProfile.phone,
            email: userProfile.email,
            website: userProfile.website,
            logo: userProfile.logo
          };
        }
      } catch (error) {
        console.warn('Could not fetch contractor data from database:', error);
      }
    }

    // Usar template HTML para generar PDF
    console.log('🚀 [INVOICE-PDF] Using HTML template for PDF generation...');
    const pdfBuffer = await generateInvoicePdfFromTemplate(estimateData, contractor);

    // Usar template HTML para generar PDF con jsPDF
    try {
      const invoiceNumber = `INV-${Date.now()}`;
      const filename = `Invoice-${estimateData.client.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Generar PDF con estilos mejorados
      const pdf = generateInvoicePdfWithJsPDF(estimateData, contractor);
      const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
      
      console.log(`✅ [INVOICE-PDF] Generated PDF successfully: ${filename} (${pdfBuffer.length} bytes)`);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      
      return res.end(pdfBuffer, 'binary');
    } catch (error: any) {
      console.error('❌ [INVOICE-PDF] Error generating PDF:', error);
      
      // Fallback to HTML if PDF generation fails
      console.log(`⚠️ [INVOICE-PDF] Falling back to HTML template for ${estimateData.client.name}`);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(pdfBuffer.toString('utf8'));
    }


  } catch (error: any) {
    console.error('❌ [INVOICE-PDF] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate invoice PDF',
      details: error.message
    });
  }
});

/**
 * POST /api/invoice-pdf/preview
 * Genera vista previa de los datos de factura
 */
router.post('/preview', async (req, res) => {
  try {
    const { estimateData, contractorData } = req.body;
    
    const invoiceData = InvoicePdfService.convertEstimateToInvoiceData(
      estimateData,
      contractorData || {}
    );
    
    res.json({
      success: true,
      data: invoiceData
    });
    
  } catch (error: any) {
    console.error('❌ [INVOICE-PDF] Preview error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate preview',
      details: error.message
    });
  }
});

/**
 * Genera un PDF de factura usando el template HTML proporcionado
 */
async function generateInvoicePdfFromTemplate(estimateData: any, contractorData: any): Promise<Buffer> {
  try {
    // Usar el template HTML exacto que proporcionaste
    const templatePath = path.join(process.cwd(), 'attached_assets', 'invoice_template_1_html (2)_1750532077989.html');
    let htmlTemplate = '';
    
    // Si el template existe, usarlo; si no, usar el template embebido
    if (fs.existsSync(templatePath)) {
      htmlTemplate = fs.readFileSync(templatePath, 'utf8');
    } else {
      htmlTemplate = getEmbeddedInvoiceTemplate();
    }
    
    // Preparar datos para el template
    const templateData = prepareTemplateData(estimateData, contractorData);
    
    // Reemplazar variables en el template
    const processedHTML = processTemplate(htmlTemplate, templateData);
    
    // Para desarrollo, simplemente retornar el HTML como bytes
    // En producción esto se convertiría a PDF real
    return Buffer.from(processedHTML, 'utf8');
    
  } catch (error: any) {
    console.error('❌ [INVOICE-PDF] Template error:', error.message);
    throw new Error(`Failed to generate invoice from template: ${error.message}`);
  }
}

/**
 * Retorna el template HTML embebido basado en tu diseño
 */
function getEmbeddedInvoiceTemplate(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
      max-width: 800px;
      margin: auto;
      background: #fff;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-radius: 8px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #eee;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .company-details {
      flex: 1;
      text-align: left;
      line-height: 1.4;
    }
    .company-logo {
      flex: 1;
      text-align: center;
    }
    .company-logo img {
      max-height: 60px;
    }
    .invoice-info {
      flex: 1;
      text-align: right;
      line-height: 1.4;
    }
    .section { margin-bottom: 20px; }
    .section h2 {
      font-size: 1.2em;
      margin-bottom: 10px;
      border-bottom: 1px solid #eee;
      padding-bottom: 5px;
      color: #333;
      font-weight: bold;
    }
    .section.center h2 { text-align: center; }
    .bill-to pre {
      margin: 0;
      font-family: inherit;
      line-height: 1.5;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
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
      padding: 6px 8px;
      text-align: right;
      color: #333;
    }
    .summary-table tr:last-child td {
      font-weight: bold;
      font-size: 1.1em;
    }
    .payment-options ul, .notes ul, .terms ul {
      padding-left: 20px;
      color: #333;
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
    }
    .thank-you:before, .thank-you:after {
      content: '';
      position: absolute;
      width: 24px;
      height: 24px;
      border: 4px solid #0ff;
      box-sizing: border-box;
    }
    .thank-you:before { top: 0; left: 0; border-right: none; border-bottom: none; }
    .thank-you:after { bottom: 0; right: 0; border-left: none; border-top: none; }
    .thank-you:before, .thank-you:after { animation: scan 3s infinite; }
    @keyframes scan { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
    .footer {
      text-align: center;
      margin-top: 20px;
    }
    .arrow-line {
      position: relative;
      height: 4px;
      background: linear-gradient(to right, transparent, #0ff, transparent);
      margin-bottom: 8px;
      overflow: visible;
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
    }
    a { color: #007BFF; text-decoration: none; }
  </style>
</head>
<body>
  <div class="invoice-container">
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
          {{itemsRows}}
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
}

/**
 * Prepara los datos para el template
 */
function prepareTemplateData(estimateData: any, contractorData: any) {
  const invoiceNumber = `INV-${Date.now()}`;
  const invoiceDate = new Date().toLocaleDateString();
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();
  
  const company = {
    name: contractorData?.company || 'Your Company',
    address: contractorData?.address || 'Company Address',
    phone: contractorData?.phone || '(555) 123-4567',
    email: contractorData?.email || 'info@company.com',
    website: contractorData?.website || 'www.company.com',
    logo: contractorData?.logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjYiPkxvZ288L3RleHQ+PC9zdmc+'
  };
  
  const client = {
    name: estimateData.client?.name || 'Client Name',
    address: estimateData.client?.address || 'Client Address',
    contact: estimateData.client?.email || estimateData.client?.phone || 'Contact Information'
  };
  
  const invoice = {
    number: invoiceNumber,
    date: invoiceDate,
    due_date: dueDate
  };
  
  const items = estimateData.items || [];
  
  return { company, client, invoice, items };
}

/**
 * Procesa el template reemplazando variables
 */
function processTemplate(html: string, data: any): string {
  // Reemplazar variables de company
  html = html.replace(/\{\{company\.name\}\}/g, data.company.name);
  html = html.replace(/\{\{company\.address\}\}/g, data.company.address);
  html = html.replace(/\{\{company\.phone\}\}/g, data.company.phone);
  html = html.replace(/\{\{company\.email\}\}/g, data.company.email);
  html = html.replace(/\{\{company\.website\}\}/g, data.company.website);
  html = html.replace(/\{\{company\.logo\}\}/g, data.company.logo);
  
  // Reemplazar variables de client
  html = html.replace(/\{\{client\.name\}\}/g, data.client.name);
  html = html.replace(/\{\{client\.address\}\}/g, data.client.address);
  html = html.replace(/\{\{client\.contact\}\}/g, data.client.contact);
  
  // Reemplazar variables de invoice
  html = html.replace(/\{\{invoice\.number\}\}/g, data.invoice.number);
  html = html.replace(/\{\{invoice\.date\}\}/g, data.invoice.date);
  html = html.replace(/\{\{invoice\.due_date\}\}/g, data.invoice.due_date);
  
  // Generar filas de items
  const itemsRows = data.items.map((item: any) => `
          <tr>
            <td>${item.name || item.description || 'Service Item'}</td>
            <td>${item.quantity || 1}</td>
            <td>$${(item.price || 0).toFixed(2)}</td>
            <td>$${(item.total || item.price || 0).toFixed(2)}</td>
          </tr>
        `).join('');
  
  html = html.replace(/\{\{itemsRows\}\}/g, itemsRows);
  
  return html;
}

/**
 * Genera PDF usando jsPDF con estilo cyberpunk elegante
 */
function generateInvoicePdfWithJsPDF(estimateData: any, contractorData: any): jsPDF {
  const pdf = new jsPDF();
  
  // Configuración de fuentes y colores
  pdf.setFont('helvetica');
  
  // HEADER SECTION - Estilo profesional con bordes elegantes
  // Borde superior decorativo cyan
  pdf.setDrawColor(0, 255, 255); // Cyan
  pdf.setLineWidth(2);
  pdf.line(15, 15, 195, 15);
  
  // Company Info - Left side
  pdf.setFontSize(18);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text(contractorData?.company || 'Your Company', 20, 30);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(contractorData?.address || 'Company Address', 20, 38);
  pdf.text(`Phone: ${contractorData?.phone || '(555) 123-4567'}`, 20, 44);
  pdf.text(`Email: ${contractorData?.email || 'info@company.com'}`, 20, 50);
  if (contractorData?.website) {
    pdf.text(`Website: ${contractorData.website}`, 20, 56);
  }
  
  // LOGO SECTION - Center
  if (contractorData?.logo) {
    try {
      // Add logo image in center (Base64 format)
      pdf.addImage(contractorData.logo, 'JPEG', 90, 25, 30, 25);
    } catch (error) {
      console.warn('Could not add logo to PDF:', error);
      // Fallback text if logo fails
      pdf.setFontSize(10);
      pdf.setTextColor(0, 255, 255);
      pdf.text('[LOGO]', 105, 40, { align: 'center' });
    }
  } else {
    // Placeholder for logo
    pdf.setDrawColor(0, 255, 255);
    pdf.setLineWidth(1);
    pdf.rect(90, 25, 30, 25);
    pdf.setFontSize(8);
    pdf.setTextColor(0, 255, 255);
    pdf.text('LOGO', 105, 40, { align: 'center' });
  }
  
  // INVOICE Title - Right side with cyan accent
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('INVOICE', 150, 30);
  
  // Invoice details with cyan accents
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const invoiceNumber = `INV-${Date.now()}`;
  const invoiceDate = new Date().toLocaleDateString();
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();
  
  pdf.text(`Invoice #: ${invoiceNumber}`, 150, 40);
  pdf.text(`Invoice Date: ${invoiceDate}`, 150, 46);
  pdf.text(`Due Date: ${dueDate}`, 150, 52);
  
  // Header separator line
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(20, 65, 190, 65);
  
  // BILL TO SECTION
  let yPos = 80;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Bill To', 20, yPos);
  
  // Bill To border with cyan accent
  pdf.setDrawColor(0, 255, 255);
  pdf.setLineWidth(1);
  pdf.line(20, yPos + 2, 35, yPos + 2);
  
  yPos += 10;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(estimateData.client?.name || 'Client Name', 20, yPos);
  if (estimateData.client?.email) {
    yPos += 6;
    pdf.text(estimateData.client.email, 20, yPos);
  }
  if (estimateData.client?.phone) {
    yPos += 6;
    pdf.text(estimateData.client.phone, 20, yPos);
  }
  
  // ITEMS TABLE - Estilo elegante con bordes cyan
  yPos = 120;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Items', 20, yPos);
  
  // Items underline with cyan
  pdf.setDrawColor(0, 255, 255);
  pdf.setLineWidth(1);
  pdf.line(20, yPos + 2, 35, yPos + 2);
  
  yPos += 15;
  
  // TABLE HEADERS with cyan background
  const tableStartY = yPos;
  const rowHeight = 8;
  const colWidths = [90, 20, 30, 30]; // Description, Qty, Unit Price, Total
  const colPositions = [20, 110, 130, 160];
  
  // Header background - cyan accent
  pdf.setFillColor(0, 255, 255, 0.2); // Cyan with transparency effect
  pdf.rect(20, yPos - 3, 170, rowHeight, 'F');
  
  // Header borders
  pdf.setDrawColor(0, 255, 255);
  pdf.setLineWidth(1);
  pdf.rect(20, yPos - 3, 170, rowHeight);
  
  // Header text
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Item Description', colPositions[0] + 2, yPos + 2);
  pdf.text('Qty', colPositions[1] + 2, yPos + 2);
  pdf.text('Unit Price', colPositions[2] + 2, yPos + 2);
  pdf.text('Total', colPositions[3] + 2, yPos + 2);
  
  yPos += rowHeight;
  
  // TABLE CONTENT with elegant borders
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const items = estimateData.items || [];
  
  items.forEach((item: any, index: number) => {
    const description = item.name || item.description || 'Service Item';
    const quantity = item.quantity || 1;
    const price = item.price || 0;
    const total = item.total || price;
    
    // Alternate row background for elegance
    if (index % 2 === 1) {
      pdf.setFillColor(245, 245, 245);
      pdf.rect(20, yPos - 3, 170, rowHeight, 'F');
    }
    
    // Row borders
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.rect(20, yPos - 3, 170, rowHeight);
    
    // Truncate long descriptions elegantly
    const maxDescLength = 42;
    const truncatedDesc = description.length > maxDescLength 
      ? description.substring(0, maxDescLength) + '...'
      : description;
    
    pdf.setTextColor(0, 0, 0);
    pdf.text(truncatedDesc, colPositions[0] + 2, yPos + 2);
    pdf.text(quantity.toString(), colPositions[1] + 8, yPos + 2);
    pdf.text(`$${price.toFixed(2)}`, colPositions[2] + 8, yPos + 2);
    pdf.text(`$${total.toFixed(2)}`, colPositions[3] + 8, yPos + 2);
    
    yPos += rowHeight;
  });
  
  // SUMMARY SECTION - Elegant totals with correct calculations
  yPos += 10;
  const summaryStartX = 130;
  
  // Calculate totals properly
  const subtotal = estimateData.subtotal || estimateData.total || 0;
  const taxRate = estimateData.taxRate || 0;
  const discountAmount = estimateData.discountAmount || 0;
  const tax = estimateData.tax || (subtotal * taxRate / 100);
  const finalTotal = subtotal + tax - discountAmount;
  
  // Summary box with cyan border - make it taller for all fields
  pdf.setDrawColor(0, 255, 255);
  pdf.setLineWidth(1);
  pdf.rect(summaryStartX, yPos - 5, 60, 35);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  
  // Subtotal
  pdf.text('Subtotal:', summaryStartX + 5, yPos);
  pdf.text(`$${subtotal.toFixed(2)}`, summaryStartX + 45, yPos);
  yPos += 6;
  
  // Discounts (if any)
  if (discountAmount > 0) {
    pdf.text('Discounts:', summaryStartX + 5, yPos);
    pdf.text(`-$${discountAmount.toFixed(2)}`, summaryStartX + 40, yPos);
    yPos += 6;
  }
  
  // Tax
  pdf.text(`Tax (${taxRate}%):`, summaryStartX + 5, yPos);
  pdf.text(`$${tax.toFixed(2)}`, summaryStartX + 45, yPos);
  yPos += 8;
  
  // Total with emphasis
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('TOTAL:', summaryStartX + 5, yPos);
  pdf.text(`$${finalTotal.toFixed(2)}`, summaryStartX + 30, yPos);
  
  // THANK YOU SECTION - Cyberpunk style
  yPos += 25;
  
  // Cyber-style thank you box with dark background and cyan border
  pdf.setFillColor(17, 17, 17); // Dark background (#111)
  pdf.setDrawColor(0, 255, 255);
  pdf.setLineWidth(2);
  pdf.rect(20, yPos, 170, 20, 'FD');
  
  // Corner decorations
  const cornerSize = 6;
  pdf.setDrawColor(0, 255, 255);
  pdf.setLineWidth(2);
  // Top-left corner
  pdf.line(20, yPos, 20 + cornerSize, yPos);
  pdf.line(20, yPos, 20, yPos + cornerSize);
  // Top-right corner
  pdf.line(190 - cornerSize, yPos, 190, yPos);
  pdf.line(190, yPos, 190, yPos + cornerSize);
  // Bottom-left corner
  pdf.line(20, yPos + 20 - cornerSize, 20, yPos + 20);
  pdf.line(20, yPos + 20, 20 + cornerSize, yPos + 20);
  // Bottom-right corner
  pdf.line(190, yPos + 20 - cornerSize, 190, yPos + 20);
  pdf.line(190 - cornerSize, yPos + 20, 190, yPos + 20);
  
  // Thank you text in cyan (simulating Quantico font style)
  pdf.setTextColor(0, 255, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const thankYouText1 = 'Thank you for your trust in our services. We are committed to delivering excellence';
  const thankYouText2 = 'and look forward to partnering on future projects.';
  
  pdf.text(thankYouText1, 105, yPos + 8, { align: 'center' });
  pdf.text(thankYouText2, 105, yPos + 14, { align: 'center' });
  
  // NOTES & LEGAL CLAUSES SECTION
  yPos += 30;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Notes & Legal Clauses', 20, yPos);
  
  // Notes underline with cyan
  pdf.setDrawColor(0, 255, 255);
  pdf.setLineWidth(1);
  pdf.line(20, yPos + 2, 85, yPos + 2);
  
  yPos += 8;
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  
  // Legal clauses as bullet points
  const legalClauses = [
    '• This invoice is a legal document evidencing the obligation of payment.',
    '• Late fees of 1.5% monthly apply to overdue balances.',
    '• Disputes must be notified in writing within 5 days.',
    '• Governing law: jurisdiction of the Contractor.'
  ];
  
  legalClauses.forEach((clause) => {
    pdf.text(clause, 22, yPos);
    yPos += 5;
  });
  
  // TERMS & CONDITIONS SECTION
  yPos += 5;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Terms & Conditions', 20, yPos);
  
  // Terms underline with cyan
  pdf.setDrawColor(0, 255, 255);
  pdf.setLineWidth(1);
  pdf.line(20, yPos + 2, 75, yPos + 2);
  
  yPos += 8;
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  
  // Terms as bullet points
  const terms = [
    '• Payment due within 30 days of invoice date; failure permits suspension of services.',
    '• Contractor retains security interest in materials until full payment.',
    '• Client inspection period: 10 days post-completion, services deemed accepted after.',
    '• Modifications require written agreement by both parties.'
  ];
  
  terms.forEach((term) => {
    pdf.text(term, 22, yPos);
    yPos += 5;
  });
  
  // FOOTER - Estilo cyberpunk elegante
  const footerY = 275;
  
  // Gradient line effect (simulated with multiple thin lines)
  pdf.setDrawColor(0, 255, 255);
  for (let i = 0; i < 5; i++) {
    const alpha = (5 - i) / 5;
    pdf.setLineWidth(0.5);
    pdf.line(30 + i * 5, footerY, 180 - i * 5, footerY);
  }
  
  // Arrow decoration in the center
  const arrowCenterX = 105;
  pdf.setFillColor(0, 255, 255);
  // Triangle arrow pointing down
  pdf.triangle(arrowCenterX - 3, footerY - 8, arrowCenterX + 3, footerY - 8, arrowCenterX, footerY - 2, 'F');
  
  // Footer text
  yPos = footerY + 8;
  pdf.setTextColor(100, 100, 100);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('Powered by Mervin AI', 105, yPos, { align: 'center' });
  
  return pdf;
}

export default router;