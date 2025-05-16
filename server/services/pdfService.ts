/**
 * Servicio para la generación y procesamiento de PDFs
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

/**
 * Genera un PDF a partir de contenido HTML
 * @param html Contenido HTML a convertir en PDF
 * @param options Opciones adicionales para la generación del PDF
 * @returns Buffer con el contenido del PDF generado
 */
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
    
    // Lanzar navegador headless
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Crear nueva página
    const page = await browser.newPage();
    
    // Establecer contenido HTML
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generar PDF
    const pdfBuffer = await page.pdf({
      format: pdfOptions.format as any,
      landscape: pdfOptions.landscape,
      margin: pdfOptions.margin,
      printBackground: true,
      displayHeaderFooter: pdfOptions.displayHeaderFooter,
      headerTemplate: pdfOptions.headerTemplate || '',
      footerTemplate: pdfOptions.footerTemplate || '',
    });
    
    // Cerrar navegador
    await browser.close();
    
    return pdfBuffer;
  } catch (error) {
    console.error('Error generando PDF:', error);
    throw new Error(`Error al generar PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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