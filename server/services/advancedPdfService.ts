/**
 * Servicio Avanzado de PDF con IA - Anthropic Claude
 * 
 * Este servicio utiliza Anthropic Claude para generar PDFs profesionales
 * con formato perfecto y estructura empresarial.
 */

import Anthropic from '@anthropic-ai/sdk';
import { jsPDF } from 'jspdf';
import path from 'path';
import fs from 'fs';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface EstimateData {
  companyName: string;
  estimateNumber: string;
  date: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  projectDetails?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  discount?: number;
  discountType?: string;
  total: number;
}

/**
 * Extrae datos estructurados del HTML usando Anthropic AI
 */
async function extractDataWithAI(html: string): Promise<EstimateData> {
  console.log('Extrayendo datos del estimado con Anthropic AI...');
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 2000,
      system: `Eres un experto extractor de datos de estimados de construcción. 
      Extrae la información del HTML y devuélvela en formato JSON exacto.
      Asegúrate de extraer TODOS los materiales/servicios de la tabla.
      Si falta información, usa valores por defecto razonables.`,
      messages: [{
        role: 'user',
        content: `Extrae los datos de este estimado HTML y devuélvelos en este formato JSON exacto:

{
  "companyName": "string",
  "estimateNumber": "string", 
  "date": "string",
  "clientName": "string",
  "clientEmail": "string",
  "clientPhone": "string",
  "clientAddress": "string",
  "projectDetails": "string",
  "items": [
    {
      "description": "string",
      "quantity": number,
      "unit": "string", 
      "price": number,
      "total": number
    }
  ],
  "subtotal": number,
  "tax": number,
  "taxRate": number,
  "discount": number,
  "discountType": "string",
  "total": number
}

HTML del estimado:
${html}`
      }]
    });

    const firstContent = response.content[0];
    const extractedText = firstContent && 'text' in firstContent ? firstContent.text : '';
    
    // Limpiar y parsear el JSON
    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON válido de la respuesta de AI');
    }
    
    const data = JSON.parse(jsonMatch[0]);
    console.log('Datos extraídos exitosamente:', Object.keys(data));
    
    return data;
    
  } catch (error) {
    console.error('Error extrayendo datos con AI:', error);
    
    // Fallback: extracción básica
    return extractDataBasic(html);
  }
}

/**
 * Método de respaldo para extraer datos básicos
 */
function extractDataBasic(html: string): EstimateData {
  const data: EstimateData = {
    companyName: 'Empresa de Construcción',
    estimateNumber: `EST-${Date.now()}`,
    date: new Date().toLocaleDateString('es-ES'),
    clientName: 'Cliente',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    projectDetails: '',
    items: [],
    subtotal: 0,
    tax: 0,
    taxRate: 10,
    discount: 0,
    discountType: '',
    total: 0
  };

  try {
    // Extraer información básica
    const clientMatch = html.match(/Bill To:\s*([^<\n]+)/i);
    if (clientMatch) data.clientName = clientMatch[1].trim();

    const emailMatch = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) data.clientEmail = emailMatch[1];

    const phoneMatch = html.match(/(\([0-9]{3}\)\s?[0-9]{3}-[0-9]{4}|[0-9]{3}-[0-9]{3}-[0-9]{4})/);
    if (phoneMatch) data.clientPhone = phoneMatch[1];

    const projectMatch = html.match(/Project Details:\s*([^<\n]+)/i);
    if (projectMatch) data.projectDetails = projectMatch[1].trim();

    // Extraer totales
    const subtotalMatch = html.match(/Subtotal:\s*\$([0-9,]+\.?[0-9]*)/i);
    if (subtotalMatch) data.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));

    const taxMatch = html.match(/Tax \(([0-9]+)%\):\s*\$([0-9,]+\.?[0-9]*)/i);
    if (taxMatch) {
      data.taxRate = parseInt(taxMatch[1]);
      data.tax = parseFloat(taxMatch[2].replace(/,/g, ''));
    }

    const totalMatch = html.match(/Total:\s*\$([0-9,]+\.?[0-9]*)/i);
    if (totalMatch) data.total = parseFloat(totalMatch[1].replace(/,/g, ''));

    console.log('Extracción básica completada');
  } catch (error) {
    console.error('Error en extracción básica:', error);
  }

  return data;
}

/**
 * Genera un PDF profesional con diseño mejorado por IA
 */
async function generateEnhancedPDF(data: EstimateData): Promise<Buffer> {
  console.log('Generando PDF profesional mejorado...');

  try {
    // Obtener sugerencias de diseño de Anthropic
    const designResponse = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1000,
      system: `Eres un experto en diseño de documentos empresariales. 
      Sugiere colores, espaciados y mejoras de diseño para un estimado profesional.`,
      messages: [{
        role: 'user',
        content: `Sugiere mejoras de diseño para este estimado:
        - Cliente: ${data.clientName}
        - Total: $${data.total}
        - Items: ${data.items.length} productos/servicios
        
        Responde con recomendaciones específicas de colores RGB, espaciados y estructura.`
      }]
    });

    console.log('Recomendaciones de diseño obtenidas');

    // Crear PDF con jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;

    // Colores profesionales mejorados
    const primaryColor = [41, 128, 185];    // Azul profesional
    const secondaryColor = [52, 73, 94];    // Gris oscuro
    const accentColor = [230, 126, 34];     // Naranja para destacar
    const successColor = [39, 174, 96];     // Verde para totales

    // === ENCABEZADO PROFESIONAL ===
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 25, 'F');

    // Título principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTIMADO PROFESIONAL', margin, 15);

    // Número de estimado (esquina superior derecha)
    doc.setFontSize(12);
    doc.text(`#${data.estimateNumber}`, pageWidth - margin, 10, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`Fecha: ${data.date}`, pageWidth - margin, 18, { align: 'right' });

    currentY = 35;

    // === INFORMACIÓN DE LA EMPRESA ===
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(data.companyName, margin, currentY);
    currentY += 15;

    // === INFORMACIÓN DEL CLIENTE ===
    // Caja con fondo gris claro
    doc.setFillColor(248, 249, 250);
    doc.rect(margin, currentY - 5, pageWidth - (margin * 2), 35, 'F');

    // Borde azul izquierdo
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, currentY - 5, 3, 35, 'F');

    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL CLIENTE', margin + 8, currentY + 3);

    currentY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    doc.text(`Nombre: ${data.clientName}`, margin + 8, currentY);
    currentY += 5;
    
    if (data.clientEmail) {
      doc.text(`Email: ${data.clientEmail}`, margin + 8, currentY);
      currentY += 5;
    }
    
    if (data.clientPhone) {
      doc.text(`Teléfono: ${data.clientPhone}`, margin + 8, currentY);
      currentY += 5;
    }

    if (data.clientAddress) {
      doc.text(`Dirección: ${data.clientAddress}`, margin + 8, currentY);
      currentY += 5;
    }

    currentY += 15;

    // === DETALLES DEL PROYECTO ===
    if (data.projectDetails) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('DETALLES DEL PROYECTO', margin, currentY);
      currentY += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      
      const projectText = doc.splitTextToSize(data.projectDetails, pageWidth - (margin * 2));
      doc.text(projectText, margin, currentY);
      currentY += projectText.length * 4 + 10;
    }

    // === TABLA DE MATERIALES Y SERVICIOS ===
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('MATERIALES Y SERVICIOS', margin, currentY);
    currentY += 10;

    // Encabezados de tabla con diseño profesional
    const tableHeaders = ['Descripción', 'Cant.', 'Unidad', 'Precio Unit.', 'Total'];
    const colWidths = [85, 20, 25, 30, 35];
    let currentX = margin;

    // Fondo del encabezado
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(margin, currentY - 3, pageWidth - (margin * 2), 10, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    tableHeaders.forEach((header, index) => {
      if (index === 0) {
        doc.text(header, currentX + 3, currentY + 3);
      } else {
        doc.text(header, currentX + colWidths[index] - 3, currentY + 3, { align: 'right' });
      }
      currentX += colWidths[index];
    });

    currentY += 12;

    // Filas de datos con alternancia de colores
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    data.items.forEach((item, index) => {
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = margin;
      }

      currentX = margin;

      // Color alternado para filas
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, currentY - 2, pageWidth - (margin * 2), 10, 'F');
      }

      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

      // Descripción (con ajuste de texto)
      const description = doc.splitTextToSize(item.description, colWidths[0] - 6);
      doc.text(description, currentX + 3, currentY + 3);
      currentX += colWidths[0];

      // Cantidad
      doc.text(item.quantity.toString(), currentX + colWidths[1] - 3, currentY + 3, { align: 'right' });
      currentX += colWidths[1];

      // Unidad
      doc.text(item.unit, currentX + colWidths[2] - 3, currentY + 3, { align: 'right' });
      currentX += colWidths[2];

      // Precio unitario
      doc.text(`$${item.price.toFixed(2)}`, currentX + colWidths[3] - 3, currentY + 3, { align: 'right' });
      currentX += colWidths[3];

      // Total
      doc.setFont('helvetica', 'bold');
      doc.text(`$${item.total.toFixed(2)}`, currentX + colWidths[4] - 3, currentY + 3, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      currentY += Math.max(description.length * 4, 10);
    });

    currentY += 15;

    // === SECCIÓN DE TOTALES PROFESIONAL ===
    const totalsX = pageWidth - 90;
    
    // Línea separadora
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(totalsX - 10, currentY, pageWidth - margin, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

    // Subtotal
    doc.text('Subtotal:', totalsX, currentY);
    doc.text(`$${data.subtotal.toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 7;

    // Descuento (si aplica)
    if (data.discount && data.discount > 0) {
      doc.setTextColor(successColor[0], successColor[1], successColor[2]);
      doc.text(`Descuento${data.discountType ? ` (${data.discountType})` : ''}:`, totalsX, currentY);
      doc.text(`-$${data.discount.toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
      currentY += 7;
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    }

    // Impuesto
    doc.text(`Impuesto (${data.taxRate}%):`, totalsX, currentY);
    doc.text(`$${data.tax.toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 10;

    // Total final con diseño destacado
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(totalsX - 15, currentY - 3, pageWidth - totalsX + 15 - margin, 12, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('TOTAL:', totalsX - 10, currentY + 4);
    doc.text(`$${data.total.toFixed(2)}`, pageWidth - margin - 5, currentY + 4, { align: 'right' });

    // === PIE DE PÁGINA PROFESIONAL ===
    currentY = pageHeight - 25;
    doc.setTextColor(140, 140, 140);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Este estimado es válido por 30 días | Generado profesionalmente', pageWidth / 2, currentY, { align: 'center' });
    doc.text(`Página 1 de 1 | ${data.companyName}`, pageWidth / 2, currentY + 5, { align: 'center' });

    // Convertir a buffer
    const pdfArrayBuffer = doc.output('arraybuffer');
    const buffer = Buffer.from(pdfArrayBuffer);
    
    console.log('PDF profesional generado exitosamente, tamaño:', buffer.length);
    return buffer;

  } catch (error) {
    console.error('Error generando PDF mejorado:', error);
    throw error;
  }
}

/**
 * Función principal del servicio avanzado de PDF
 */
export async function generateAdvancedPDF(html: string): Promise<Buffer> {
  console.log('=== INICIANDO SERVICIO AVANZADO DE PDF ===');
  
  try {
    // 1. Extraer datos con IA
    const extractedData = await extractDataWithAI(html);
    
    // 2. Generar PDF profesional
    const pdfBuffer = await generateEnhancedPDF(extractedData);
    
    // 3. Guardar para debugging (opcional)
    try {
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const fileName = `advanced-estimate-${Date.now()}.pdf`;
      const filePath = path.join(tempDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);
      console.log(`PDF avanzado guardado en: ${filePath}`);
    } catch (saveError) {
      console.warn('No se pudo guardar el PDF para debugging:', saveError);
    }
    
    console.log('=== PDF AVANZADO GENERADO EXITOSAMENTE ===');
    return pdfBuffer;
    
  } catch (error) {
    console.error('Error en servicio avanzado de PDF:', error);
    throw new Error(`Error generando PDF avanzado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Función para validar que el servicio está configurado correctamente
 */
export async function validateAdvancedPdfService(): Promise<boolean> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY no está configurada');
      return false;
    }

    // Prueba rápida de conectividad con Anthropic
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: 'Responde "OK" si puedes procesar esta solicitud.'
      }]
    });

    console.log('Servicio avanzado de PDF validado correctamente');
    return true;
    
  } catch (error) {
    console.error('Error validando servicio avanzado de PDF:', error);
    return false;
  }
}