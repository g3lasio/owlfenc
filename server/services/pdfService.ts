/**
 * Servicio para la generación y procesamiento de PDFs
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Genera un PDF a partir de contenido HTML
 * @param html Contenido HTML a convertir en PDF
 * @param options Opciones adicionales para la generación del PDF
 * @returns Buffer con el contenido del PDF generado
 */
/**
 * Función alternativa para generar PDF usando pdf-lib cuando Puppeteer falla
 */
async function generateFallbackPDF(html: string): Promise<Buffer> {
  console.log('Usando generación de PDF alternativa...');
  
  // Extraer texto del HTML
  const textContent = html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Crear un nuevo documento PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Tamaño Letter
  
  // Configurar fuente y tamaño
  const fontSize = 12;
  const lineHeight = 16;
  const margin = 50;
  const pageWidth = page.getWidth() - (margin * 2);
  
  // Dividir texto en líneas que caben en la página
  const words = textContent.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (testLine.length * 6 < pageWidth) { // Aproximación del ancho del texto
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  // Escribir texto en el PDF
  let yPosition = page.getHeight() - margin;
  
  for (const line of lines) {
    if (yPosition < margin + lineHeight) {
      // Crear nueva página si es necesario
      const newPage = pdfDoc.addPage([612, 792]);
      yPosition = newPage.getHeight() - margin;
      newPage.drawText(line, {
        x: margin,
        y: yPosition,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
    } else {
      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
    }
    yPosition -= lineHeight;
  }
  
  // Guardar el PDF
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
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
  let browser;
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
    const browser = await puppeteer.launch({
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