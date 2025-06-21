/**
 * Rutas limpias para generación de PDFs de facturas - SOLO jsPDF
 */

import express from 'express';
import { storage } from '../storage';
import { jsPDF } from 'jspdf';

const router = express.Router();

/**
 * POST /api/invoice-pdf/generate
 * Genera un PDF de factura usando SOLO jsPDF
 */
router.post('/generate', async (req, res) => {
  try {
    console.log('🧾 [INVOICE-PDF] Starting clean PDF generation...');
    
    const { estimateData, contractorData } = req.body;
    
    if (!estimateData || !estimateData.client || !estimateData.client.name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required estimate data'
      });
    }

    // Obtener datos del contratista desde la base de datos si no se proporcionan
    let contractor = contractorData;
    if (!contractor || !contractor.company) {
      try {
        const users = await storage.getAllUsers();
        const user = users.find(u => u.email === 'truthbackpack@gmail.com');
        if (user) {
          contractor = {
            company: user.company || 'Los primos',
            name: user.name || user.company,
            address: user.address || '2901 Owens Court',
            phone: user.phone || '(555) 123-4567',
            email: user.email || 'truthbackpack@gmail.com',
            website: user.website || 'www.losprimos.com',
            logo: user.logo
          };
        }
      } catch (error) {
        console.warn('Could not fetch contractor data from database:', error);
      }
    }

    // Generar PDF con jsPDF directamente - SIN funciones externas problemáticas
    const pdf = new jsPDF();
    
    // Configuración básica
    pdf.setFont('helvetica');
    
    // HEADER
    pdf.setDrawColor(0, 255, 255);
    pdf.setLineWidth(2);
    pdf.line(15, 15, 195, 15);
    
    // Company Info
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(contractor?.company || 'Your Company', 20, 30);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(contractor?.address || 'Company Address', 20, 38);
    pdf.text(`Phone: ${contractor?.phone || '(555) 123-4567'}`, 20, 44);
    pdf.text(`Email: ${contractor?.email || 'info@company.com'}`, 20, 50);
    
    // LOGO
    if (contractor?.logo) {
      try {
        pdf.addImage(contractor.logo, 'JPEG', 90, 25, 30, 25);
      } catch (error) {
        pdf.setFontSize(10);
        pdf.setTextColor(0, 255, 255);
        pdf.text('[LOGO]', 105, 40, { align: 'center' });
      }
    }
    
    // INVOICE Title
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('INVOICE', 150, 30);
    
    // Invoice details
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const invoiceNumber = `INV-${Date.now()}`;
    const invoiceDate = new Date().toLocaleDateString();
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();
    
    pdf.text(`Invoice #: ${invoiceNumber}`, 150, 40);
    pdf.text(`Invoice Date: ${invoiceDate}`, 150, 46);
    pdf.text(`Due Date: ${dueDate}`, 150, 52);
    
    // BILL TO
    let yPos = 80;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Bill To', 20, yPos);
    
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
    
    // ITEMS TABLE
    yPos = 120;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Items', 20, yPos);
    
    pdf.setDrawColor(0, 255, 255);
    pdf.setLineWidth(1);
    pdf.line(20, yPos + 2, 35, yPos + 2);
    
    yPos += 15;
    
    // Table headers
    const rowHeight = 8;
    pdf.setFillColor(0, 255, 255, 0.2);
    pdf.rect(20, yPos - 3, 170, rowHeight, 'F');
    
    pdf.setDrawColor(0, 255, 255);
    pdf.setLineWidth(1);
    pdf.rect(20, yPos - 3, 170, rowHeight);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Description', 22, yPos + 2);
    pdf.text('Qty', 112, yPos + 2);
    pdf.text('Price', 132, yPos + 2);
    pdf.text('Total', 162, yPos + 2);
    
    yPos += rowHeight;
    
    // Table content
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const items = estimateData.items || [];
    
    items.forEach((item: any, index: number) => {
      const description = item.name || item.description || 'Service Item';
      const quantity = item.quantity || 1;
      const price = item.price || 0;
      const total = item.total || price;
      
      if (index % 2 === 1) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(20, yPos - 3, 170, rowHeight, 'F');
      }
      
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.rect(20, yPos - 3, 170, rowHeight);
      
      const maxDescLength = 42;
      const truncatedDesc = description.length > maxDescLength 
        ? description.substring(0, maxDescLength) + '...'
        : description;
      
      pdf.setTextColor(0, 0, 0);
      pdf.text(truncatedDesc, 22, yPos + 2);
      pdf.text(quantity.toString(), 118, yPos + 2);
      pdf.text(`$${price.toFixed(2)}`, 138, yPos + 2);
      pdf.text(`$${total.toFixed(2)}`, 168, yPos + 2);
      
      yPos += rowHeight;
    });
    
    // SUMMARY
    yPos += 10;
    const summaryStartX = 130;
    
    const subtotal = estimateData.subtotal || estimateData.total || 0;
    const taxRate = estimateData.taxRate || 0;
    const discountAmount = estimateData.discountAmount || 0;
    const tax = estimateData.tax || (subtotal * taxRate / 100);
    const finalTotal = subtotal + tax - discountAmount;
    
    pdf.setDrawColor(0, 255, 255);
    pdf.setLineWidth(1);
    pdf.rect(summaryStartX, yPos - 5, 60, 35);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text('Subtotal:', summaryStartX + 5, yPos);
    pdf.text(`$${subtotal.toFixed(2)}`, summaryStartX + 45, yPos);
    yPos += 6;
    
    if (discountAmount > 0) {
      pdf.text('Discounts:', summaryStartX + 5, yPos);
      pdf.text(`-$${discountAmount.toFixed(2)}`, summaryStartX + 40, yPos);
      yPos += 6;
    }
    
    pdf.text(`Tax (${taxRate}%):`, summaryStartX + 5, yPos);
    pdf.text(`$${tax.toFixed(2)}`, summaryStartX + 45, yPos);
    yPos += 8;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('TOTAL:', summaryStartX + 5, yPos);
    pdf.text(`$${finalTotal.toFixed(2)}`, summaryStartX + 30, yPos);
    
    // THANK YOU SECTION
    yPos += 25;
    pdf.setFillColor(17, 17, 17);
    pdf.setDrawColor(0, 255, 255);
    pdf.setLineWidth(2);
    pdf.rect(20, yPos, 170, 20, 'FD');
    
    pdf.setTextColor(0, 255, 255);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Thank you for your trust in our services. We are committed to excellence', 105, yPos + 8, { align: 'center' });
    pdf.text('and look forward to partnering on future projects.', 105, yPos + 14, { align: 'center' });
    
    // FOOTER
    const footerY = 275;
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Powered by Mervin AI', 105, footerY, { align: 'center' });
    
    // Generar PDF y enviar
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    const filename = `Invoice-${estimateData.client.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    console.log(`✅ [INVOICE-PDF] Generated clean PDF: ${filename} (${pdfBuffer.length} bytes)`);
    
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

export default router;