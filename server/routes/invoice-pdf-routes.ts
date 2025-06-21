/**
 * Rutas corregidas para la generación de PDFs de facturas
 */

import express from 'express';
import { storage } from '../storage';
import { invoicePdfService, InvoicePdfService } from '../services/invoicePdfService';
import { PuppeteerInvoicePdfService } from '../services/puppeteerInvoicePdfService';

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

    // Convertir datos de estimado a formato de factura
    const invoiceData = InvoicePdfService.convertEstimateToInvoiceData(
      estimateData,
      contractor
    );

    console.log('🔄 [INVOICE-PDF] Converted to invoice format:', {
      invoiceNumber: invoiceData.invoice.number,
      itemsCount: invoiceData.invoice.items.length,
      company: invoiceData.company.name
    });

    // Usar Puppeteer directamente para respuesta rápida
    console.log('🚀 [INVOICE-PDF] Using Puppeteer for fast generation...');
    const pdfBuffer = await PuppeteerInvoicePdfService.generateInvoicePdf(invoiceData);

    // Configurar headers para descarga de PDF binario
    const filename = `Invoice-${invoiceData.invoice.number}.pdf`;
    
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

export { router as invoicePdfRoutes };