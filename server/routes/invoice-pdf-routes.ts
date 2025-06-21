/**
 * Rutas para la generación de PDFs de facturas usando Puppeteer
 */

import express from 'express';
import { storage } from '../storage';
import puppeteer from 'puppeteer';

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

    // Usar Puppeteer directamente para generar PDF real
    console.log('🚀 [INVOICE-PDF] Using Puppeteer for direct PDF generation...');
    const pdfBuffer = await generateInvoicePdfWithPuppeteer(estimateData, contractor);

    // Configurar headers para descarga de PDF binario
    const invoiceNumber = `INV-${Date.now()}`;
    const filename = `Invoice-${estimateData.client.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    console.log(`✅ [INVOICE-PDF] Generated successfully: ${filename} (${pdfBuffer.length} bytes)`);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    
    return res.end(pdfBuffer, 'binary');

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
 * Genera un PDF de factura usando Puppeteer directamente
 */
async function generateInvoicePdfWithPuppeteer(estimateData: any, contractorData: any): Promise<Buffer> {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Generar HTML de la factura
    const html = generateInvoiceHTML(estimateData, contractorData);
    
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
    
    return Buffer.from(pdfBuffer);
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Genera el HTML de la factura
 */
function generateInvoiceHTML(estimateData: any, contractorData: any): string {
  const invoiceNumber = `INV-${Date.now()}`;
  const invoiceDate = new Date().toLocaleDateString();
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();
  
  const companyName = contractorData?.company || 'Your Company';
  const companyPhone = contractorData?.phone || '(555) 123-4567';
  const companyEmail = contractorData?.email || 'info@company.com';
  
  const clientName = estimateData.client?.name || 'Client Name';
  const clientEmail = estimateData.client?.email || '';
  const clientPhone = estimateData.client?.phone || '';
  
  const items = estimateData.items || [];
  const total = estimateData.total || 0;
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${invoiceNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
        .company-info h1 { font-size: 24px; color: #000; margin-bottom: 10px; }
        .invoice-title { text-align: right; }
        .invoice-title h2 { font-size: 28px; color: #000; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .bill-to, .invoice-info { flex: 1; }
        .bill-to { padding-right: 20px; }
        .section-title { font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #000; padding: 8px; text-align: left; }
        .items-table th { background-color: #f5f5f5; font-weight: bold; }
        .text-right { text-align: right; }
        .totals { margin-top: 20px; text-align: right; }
        .total-line { margin: 5px 0; }
        .total-amount { font-size: 16px; font-weight: bold; border-top: 2px solid #000; padding-top: 5px; }
        .terms { margin-top: 30px; font-size: 10px; border-top: 1px solid #ccc; padding-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-info">
                <h1>${companyName}</h1>
                <div>${companyPhone}</div>
                <div>${companyEmail}</div>
            </div>
            <div class="invoice-title">
                <h2>INVOICE</h2>
            </div>
        </div>
        
        <div class="invoice-details">
            <div class="bill-to">
                <div class="section-title">BILL TO:</div>
                <div><strong>${clientName}</strong></div>
                ${clientEmail ? `<div>${clientEmail}</div>` : ''}
                ${clientPhone ? `<div>${clientPhone}</div>` : ''}
            </div>
            <div class="invoice-info">
                <div class="section-title">INVOICE DETAILS:</div>
                <div><strong>Invoice #:</strong> ${invoiceNumber}</div>
                <div><strong>Date:</strong> ${invoiceDate}</div>
                <div><strong>Due Date:</strong> ${dueDate}</div>
            </div>
        </div>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="width: 10%;" class="text-right">Qty</th>
                    <th style="width: 15%;" class="text-right">Unit Price</th>
                    <th style="width: 15%;" class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${items.map((item: any) => `
                    <tr>
                        <td>${item.description || item.name || 'Service Item'}</td>
                        <td class="text-right">${item.quantity || 1}</td>
                        <td class="text-right">$${(item.price || 0).toFixed(2)}</td>
                        <td class="text-right">$${(item.total || item.price || 0).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="totals">
            <div class="total-line">Subtotal: $${total.toFixed(2)}</div>
            <div class="total-line">Tax: $0.00</div>
            <div class="total-line total-amount">TOTAL: $${total.toFixed(2)}</div>
        </div>
        
        <div class="terms">
            <strong>Payment Terms:</strong> Payment is due within 30 days of invoice date. 
            Thank you for your business!
        </div>
    </div>
</body>
</html>`;
}

export default router;