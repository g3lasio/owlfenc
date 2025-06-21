/**
 * Rutas específicas para la generación de PDFs de facturas
 */

import express from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { invoicePdfService, InvoicePdfService } from '../services/invoicePdfService';

const router = express.Router();

/**
 * POST /api/invoice-pdf/generate
 * Genera un PDF de factura a partir de datos de estimado
 */
router.post('/generate', async (req, res) => {
  try {
    console.log('🧾 [INVOICE-PDF] Starting invoice generation...');
    
    const schema = z.object({
      estimateData: z.object({
        client: z.object({
          name: z.string(),
          email: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional()
        }),
        items: z.array(z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          quantity: z.number().optional(),
          price: z.number().optional(),
          total: z.number().optional()
        })),
        subtotal: z.number().optional(),
        tax: z.number().optional(),
        total: z.number().optional()
      }),
      contractorData: z.object({
        company: z.string().optional(),
        name: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        website: z.string().optional(),
        logo: z.string().optional()
      }).optional(),
      invoiceNumber: z.string().optional()
    });

    const { estimateData, contractorData, invoiceNumber } = schema.parse(req.body);

    console.log('📋 [INVOICE-PDF] Processing data for client:', estimateData.client.name);

    // Obtener datos del contratista si no se proporcionan
    let contractor = contractorData;
    if (!contractor || !contractor.company) {
      try {
        // Intentar obtener datos del usuario actual desde la base de datos
        const userProfile = await storage.getUser(1); // Placeholder user ID
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
      contractor,
      invoiceNumber
    );

    console.log('🔄 [INVOICE-PDF] Converted to invoice format:', {
      invoiceNumber: invoiceData.invoice.number,
      itemsCount: invoiceData.invoice.items.length,
      company: invoiceData.company.name
    });

    // Generar PDF usando PDFMonkey
    const pdfBuffer = await invoicePdfService.generateInvoicePdf(invoiceData);

    // Configurar headers para descarga
    const filename = `Invoice-${invoiceData.invoice.number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    console.log(`✅ [INVOICE-PDF] Generated successfully: ${filename} (${pdfBuffer.length} bytes)`);
    res.send(pdfBuffer);

  } catch (error: any) {
    console.error('❌ [INVOICE-PDF] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate invoice PDF',
      details: error.message
    });
  }
});

/**
 * POST /api/invoice-pdf/preview
 * Genera vista previa de los datos que se enviarán a PDFMonkey
 */
router.post('/preview', async (req, res) => {
  try {
    const schema = z.object({
      estimateData: z.object({
        client: z.object({
          name: z.string(),
          email: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional()
        }),
        items: z.array(z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          quantity: z.number().optional(),
          price: z.number().optional(),
          total: z.number().optional()
        }))
      }),
      contractorData: z.object({
        company: z.string().optional(),
        name: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        website: z.string().optional(),
        logo: z.string().optional()
      }).optional()
    });

    const { estimateData, contractorData } = schema.parse(req.body);

    // Convertir a formato de factura
    const invoiceData = InvoicePdfService.convertEstimateToInvoiceData(
      estimateData,
      contractorData
    );

    res.json({
      success: true,
      invoiceData,
      templateId: '078756DF-77FD-445F-BB68-D46077101677'
    });

  } catch (error: any) {
    console.error('Error generating invoice preview:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate invoice preview',
      details: error.message
    });
  }
});

export default router;