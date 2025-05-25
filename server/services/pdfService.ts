/**
 * Servicio para la generación y procesamiento de PDFs
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb } from 'pdf-lib';
// @ts-ignore
import * as htmlPdf from 'html-pdf-node';

/**
 * Genera un PDF a partir de contenido HTML
 * @param html Contenido HTML a convertir en PDF
 * @param options Opciones adicionales para la generación del PDF
 * @returns Buffer con el contenido del PDF generado
 */
/**
 * Función alternativa para generar PDF usando html-pdf-node cuando Puppeteer falla
 */
async function generateFallbackPDF(html: string): Promise<Buffer> {
  console.log('Usando generación de PDF alternativa con html-pdf-node...');
  
  try {
    // Configurar opciones para html-pdf-node
    const options = {
      format: 'Letter',
      width: '8.5in',
      height: '11in',
      border: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      paginationOffset: 1,
      type: 'pdf',
      quality: '75',
      timeout: 30000
    };

    // Asegurar que el HTML tenga la estructura completa
    const completeHtml = html.includes('<!DOCTYPE') ? html : `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              color: #000; 
              background: white;
            }
            * { box-sizing: border-box; }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
            }
            .company-info { flex: 1; }
            .estimate-info { text-align: right; }
            .bill-to { margin: 20px 0; }
            .materials-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .materials-table th,
            .materials-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            .materials-table th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .totals {
              text-align: right;
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .total-line { margin: 5px 0; }
            .final-total {
              font-weight: bold;
              font-size: 1.2em;
              color: #2563eb;
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    // Generar PDF usando html-pdf-node
    const file = { content: completeHtml };
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    
    console.log('PDF generado exitosamente con html-pdf-node');
    return Buffer.from(pdfBuffer);
    
  } catch (error) {
    console.error('Error con html-pdf-node, usando método básico:', error);
    
    // Como último recurso, crear un PDF básico pero funcional
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    
    // Extraer información básica del HTML
    const title = html.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1] || 'ESTIMATE';
    const clientMatch = html.match(/Bill To:\s*([^<]+)/i);
    const client = clientMatch?.[1]?.trim() || 'Cliente';
    
    // Escribir contenido básico
    page.drawText('ESTIMADO / ESTIMATE', {
      x: 50,
      y: 750,
      size: 20,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`Cliente: ${client}`, {
      x: 50,
      y: 700,
      size: 12,
      color: rgb(0, 0, 0),
    });
    
    page.drawText('Este PDF fue generado con un método simplificado.', {
      x: 50,
      y: 650,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    page.drawText('Para obtener el formato completo, por favor contacte al soporte técnico.', {
      x: 50,
      y: 630,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
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
  let browser: puppeteer.Browser | undefined;
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
  } catch (error) {
    console.error('Error con Puppeteer, usando método alternativo:', error);
    
    // Usar el método de respaldo con pdf-lib
    try {
      return await generateFallbackPDF(html);
    } catch (fallbackError) {
      console.error('Error en método de respaldo:', fallbackError);
      throw new Error(`Error al generar PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  } finally {
    // Asegurar que el navegador se cierre siempre
    if (browser) {
      try {
        await browser.close();
        console.log('Navegador cerrado correctamente');
      } catch (closeError) {
        console.error('Error al cerrar navegador:', closeError);
      }
    }
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