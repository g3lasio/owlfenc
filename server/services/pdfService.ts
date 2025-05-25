/**
 * Servicio para la generación y procesamiento de PDFs
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb } from 'pdf-lib';
// @ts-ignore
import * as htmlPdf from 'html-pdf-node';
import { jsPDF } from 'jspdf';

/**
 * Genera un PDF a partir de contenido HTML
 * @param html Contenido HTML a convertir en PDF
 * @param options Opciones adicionales para la generación del PDF
 * @returns Buffer con el contenido del PDF generado
 */
/**
 * Función robusta para generar PDF profesional usando jsPDF
 */
async function generateProfessionalPDF(html: string): Promise<Buffer> {
  console.log('Generando PDF profesional con jsPDF...');
  
  try {
    // Crear nuevo documento PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });
    
    // Extraer datos del HTML
    const extractedData = extractEstimateData(html);
    
    // Configuración del documento
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;
    
    // Colores
    const primaryColor = [37, 99, 235]; // Azul
    const grayColor = [107, 114, 128];  // Gris
    const darkColor = [17, 24, 39];     // Negro
    
    // Encabezado con logo y información de empresa
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 15, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTIMADO PROFESIONAL', margin, 10);
    
    currentY = 25;
    
    // Información de la empresa y estimado
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(extractedData.companyName, margin, currentY);
    
    // Número de estimado y fecha (derecha)
    const rightAlign = pageWidth - margin;
    doc.text(`Estimado #: ${extractedData.estimateNumber}`, rightAlign - 60, currentY, { align: 'right' });
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Fecha: ${extractedData.date}`, rightAlign - 60, currentY, { align: 'right' });
    
    currentY += 15;
    
    // Información del cliente
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, currentY - 3, pageWidth - (margin * 2), 25, 'F');
    
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURAR A:', margin + 5, currentY + 3);
    
    currentY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(extractedData.clientName, margin + 5, currentY);
    if (extractedData.clientEmail) {
      currentY += 4;
      doc.text(extractedData.clientEmail, margin + 5, currentY);
    }
    if (extractedData.clientPhone) {
      currentY += 4;
      doc.text(extractedData.clientPhone, margin + 5, currentY);
    }
    if (extractedData.clientAddress) {
      currentY += 4;
      doc.text(extractedData.clientAddress, margin + 5, currentY);
    }
    
    currentY += 15;
    
    // Detalles del proyecto
    if (extractedData.projectDetails) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLES DEL PROYECTO:', margin, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      // Dividir texto largo en múltiples líneas
      const splitText = doc.splitTextToSize(extractedData.projectDetails, pageWidth - (margin * 2));
      doc.text(splitText, margin, currentY);
      currentY += splitText.length * 4 + 10;
    }
    
    // Tabla de materiales
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('MATERIALES Y SERVICIOS:', margin, currentY);
    currentY += 8;
    
    // Encabezados de tabla
    const tableHeaders = ['Descripción', 'Cant.', 'Unidad', 'Precio Unit.', 'Total'];
    const colWidths = [90, 20, 25, 30, 30];
    let currentX = margin;
    
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, currentY - 2, pageWidth - (margin * 2), 8, 'F');
    
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    tableHeaders.forEach((header, index) => {
      if (index === 0) {
        doc.text(header, currentX + 2, currentY + 3);
      } else {
        doc.text(header, currentX + colWidths[index] - 2, currentY + 3, { align: 'right' });
      }
      currentX += colWidths[index];
    });
    
    currentY += 10;
    
    // Filas de materiales
    doc.setFont('helvetica', 'normal');
    extractedData.items.forEach((item: any, index: number) => {
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = margin;
      }
      
      currentX = margin;
      
      // Alternar color de fondo
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, currentY - 2, pageWidth - (margin * 2), 8, 'F');
      }
      
      // Descripción
      const description = doc.splitTextToSize(item.description, colWidths[0] - 4);
      doc.text(description, currentX + 2, currentY + 3);
      currentX += colWidths[0];
      
      // Cantidad
      doc.text(item.quantity.toString(), currentX + colWidths[1] - 2, currentY + 3, { align: 'right' });
      currentX += colWidths[1];
      
      // Unidad
      doc.text(item.unit, currentX + colWidths[2] - 2, currentY + 3, { align: 'right' });
      currentX += colWidths[2];
      
      // Precio unitario
      doc.text(`$${item.price.toFixed(2)}`, currentX + colWidths[3] - 2, currentY + 3, { align: 'right' });
      currentX += colWidths[3];
      
      // Total
      doc.text(`$${item.total.toFixed(2)}`, currentX + colWidths[4] - 2, currentY + 3, { align: 'right' });
      
      currentY += Math.max(description.length * 4, 8);
    });
    
    currentY += 10;
    
    // Totales
    const totalsX = pageWidth - 80;
    doc.setDrawColor(200, 200, 200);
    doc.line(totalsX - 10, currentY, pageWidth - margin, currentY);
    currentY += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Subtotal:', totalsX, currentY);
    doc.text(`$${extractedData.subtotal.toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 6;
    
    if (extractedData.discount > 0) {
      doc.setTextColor(34, 197, 94); // Verde
      doc.text(`Descuento (${extractedData.discountRate}):`, totalsX, currentY);
      doc.text(`-$${extractedData.discount.toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
      currentY += 6;
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    }
    
    doc.text(`Impuesto (${extractedData.taxRate}%):`, totalsX, currentY);
    doc.text(`$${extractedData.tax.toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 8;
    
    // Total final
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(1);
    doc.line(totalsX - 10, currentY, pageWidth - margin, currentY);
    currentY += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('TOTAL:', totalsX, currentY);
    doc.text(`$${extractedData.total.toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
    
    // Pie de página
    currentY = pageHeight - 20;
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Estimado generado profesionalmente - Válido por 30 días', pageWidth / 2, currentY, { align: 'center' });
    
    // Convertir a buffer
    const pdfArrayBuffer = doc.output('arraybuffer');
    return Buffer.from(pdfArrayBuffer);
    
  } catch (error) {
    console.error('Error generando PDF profesional:', error);
    throw error;
  }
}

/**
 * Extrae datos estructurados del HTML del estimado
 */
function extractEstimateData(html: string): any {
  // Valores por defecto
  const data = {
    companyName: 'Nombre de Empresa',
    estimateNumber: `EST-${Date.now()}`,
    date: new Date().toLocaleDateString('es-ES'),
    clientName: 'Cliente',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    projectDetails: '',
    items: [] as Array<{
      description: string;
      quantity: number;
      unit: string;
      price: number;
      total: number;
    }>,
    subtotal: 0,
    tax: 0,
    discount: 0,
    discountRate: '',
    taxRate: '10',
    total: 0
  };
  
  try {
    // Extraer información del cliente
    const billToMatch = html.match(/Bill To:\s*([^<\n]+)/i);
    if (billToMatch) {
      data.clientName = billToMatch[1].trim();
    }
    
    // Extraer email
    const emailMatch = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      data.clientEmail = emailMatch[1];
    }
    
    // Extraer teléfono
    const phoneMatch = html.match(/(\([0-9]{3}\)\s?[0-9]{3}-[0-9]{4}|[0-9]{3}-[0-9]{3}-[0-9]{4}|\([0-9]{3}\)\s?[0-9]{7})/);
    if (phoneMatch) {
      data.clientPhone = phoneMatch[1];
    }
    
    // Extraer detalles del proyecto
    const projectMatch = html.match(/Project Details:\s*([^<\n]+)/i);
    if (projectMatch) {
      data.projectDetails = projectMatch[1].trim();
    }
    
    // Extraer totales
    const subtotalMatch = html.match(/Subtotal:\s*\$([0-9,]+\.?[0-9]*)/i);
    if (subtotalMatch) {
      data.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));
    }
    
    const taxMatch = html.match(/Tax \(([0-9]+)%\):\s*\$([0-9,]+\.?[0-9]*)/i);
    if (taxMatch) {
      data.taxRate = taxMatch[1];
      data.tax = parseFloat(taxMatch[2].replace(/,/g, ''));
    }
    
    const discountMatch = html.match(/Descuento[^$]*\$([0-9,]+\.?[0-9]*)/i);
    if (discountMatch) {
      data.discount = parseFloat(discountMatch[1].replace(/,/g, ''));
    }
    
    const totalMatch = html.match(/Total:\s*\$([0-9,]+\.?[0-9]*)/i);
    if (totalMatch) {
      data.total = parseFloat(totalMatch[1].replace(/,/g, ''));
    }
    
    // Extraer items de la tabla (simplificado)
    const tableMatches = html.match(/<tbody>[\s\S]*?<\/tbody>/i);
    if (tableMatches) {
      const rows = tableMatches[0].match(/<tr>[\s\S]*?<\/tr>/gi);
      if (rows) {
        rows.forEach(row => {
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
          if (cells && cells.length >= 5) {
            const description = cells[0].replace(/<[^>]*>/g, '').trim();
            const quantity = parseInt(cells[1].replace(/<[^>]*>/g, '').trim()) || 1;
            const unit = cells[2].replace(/<[^>]*>/g, '').trim();
            const price = parseFloat(cells[3].replace(/<[^>]*>/g, '').replace(/\$/, '').trim()) || 0;
            const total = parseFloat(cells[4].replace(/<[^>]*>/g, '').replace(/\$/, '').trim()) || 0;
            
            if (description && description.length > 5) {
              data.items.push({
                description,
                quantity,
                unit,
                price,
                total
              });
            }
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error extrayendo datos del HTML:', error);
  }
  
  return data;
}

export async function generatePDF(
  html: string, 
  options: {
    format?: 'A4' | 'Letter' | 'Legal';
    landscape?: boolean;
    margin?: { top?: string; right?: string; bottom?: string; left?: string; };
    headerTemplate?: string;
    footerTemplate?: string;
    displayHeaderFooter?: boolean;
  } = {}
): Promise<Buffer> {
  try {
    console.log('Generando PDF con contenido HTML, longitud:', html.length);
    
    // Intentar primero con el generador profesional jsPDF
    try {
      return await generateProfessionalPDF(html);
    } catch (jsPdfError) {
      console.error('Error con jsPDF, intentando con Puppeteer:', jsPdfError);
    }
    
    // Si jsPDF falla, intentar con Puppeteer
    let browser: any;
    try {
      // Valores por defecto
      const defaultOptions = {
        format: 'Letter',
        landscape: false,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        },
        displayHeaderFooter: false
      };
      
      // Combinar opciones por defecto con las proporcionadas
      const pdfOptions = {
        ...defaultOptions,
        ...options,
        margin: { ...defaultOptions.margin, ...options.margin }
      };
      
      // Lanzar navegador headless con configuración mejorada para Replit
      console.log('Lanzando navegador Puppeteer...');
      browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });
    
    // Crear nueva página
    console.log('Navegador iniciado, creando página...');
    const page = await browser.newPage();
    
    // Establecer contenido HTML
    console.log('Configurando contenido HTML...');
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generar PDF
    console.log('Generando PDF...');
    const pdfBuffer = await page.pdf({
      format: pdfOptions.format as any,
      landscape: pdfOptions.landscape,
      margin: pdfOptions.margin,
      printBackground: true,
      displayHeaderFooter: pdfOptions.displayHeaderFooter,
      headerTemplate: pdfOptions.headerTemplate || '',
      footerTemplate: pdfOptions.footerTemplate || '',
    });
    
    // Convertir a Buffer de Node.js para evitar errores de tipo
    const buffer = Buffer.from(pdfBuffer);
    
    return buffer;
    } catch (puppeteerError) {
      console.error('Error con Puppeteer:', puppeteerError);
      
      // Crear PDF básico con pdf-lib como último recurso
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]);
      
      page.drawText('ESTIMADO PROFESIONAL', {
        x: 50,
        y: 750,
        size: 16,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('PDF generado con método simplificado por limitaciones del servidor.', {
        x: 50,
        y: 700,
        size: 10,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('Error cerrando navegador:', closeError);
        }
      }
    }
  } catch (mainError) {
    console.error('Error principal en generación de PDF:', mainError);
    throw new Error(`Error al generar PDF: ${mainError instanceof Error ? mainError.message : 'Error desconocido'}`);
  }
}

/**
 * Guarda un PDF generado en el sistema de archivos para debugging
 * @param pdfBuffer Buffer con el contenido del PDF
 * @param filename Nombre del archivo a guardar
 * @returns Path donde se guardó el archivo
 */
export function savePDFToFileSystem(pdfBuffer: Buffer, filename: string): string {
  try {
    // Crear directorio temporal si no existe
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Generar path completo del archivo
    const filePath = path.join(tempDir, filename);
    
    // Guardar el archivo
    fs.writeFileSync(filePath, pdfBuffer);
    
    console.log(`PDF guardado en: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('Error guardando PDF en sistema de archivos:', error);
    throw new Error(`Error al guardar PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}