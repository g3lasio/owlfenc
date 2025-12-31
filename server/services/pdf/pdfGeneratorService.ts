/**
 * PDF Generator Service
 * 
 * Genera PDFs de reportes de permisos usando Puppeteer
 * Convierte HTML a PDF de alta calidad
 */

import puppeteer from 'puppeteer';
import { generatePermitReportHTML, CompanyInfo } from './permitReportGenerator';
import fs from 'fs';
import path from 'path';

interface PDFGenerationResult {
  buffer: Buffer;
  filename: string;
  size: number;
}

interface PermitPDFParams {
  permitData: any;
  companyInfo: CompanyInfo;
  projectInfo?: {
    address: string;
    projectType: string;
    projectDescription?: string;
  };
}

export class PDFGeneratorService {
  
  /**
   * Genera un PDF del reporte de permisos
   */
  async generatePermitPDF(params: PermitPDFParams): Promise<PDFGenerationResult> {
    const startTime = Date.now();
    console.log('📄 [PDF-GENERATOR] Iniciando generación de PDF...');
    
    try {
      // 1. Generar HTML del reporte
      console.log('🔧 [PDF-GENERATOR] Generando HTML...');
      const html = generatePermitReportHTML(params.permitData, params.companyInfo);
      
      // 2. Lanzar Puppeteer
      console.log('🚀 [PDF-GENERATOR] Lanzando Puppeteer...');
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      // 3. Cargar HTML
      console.log('📝 [PDF-GENERATOR] Cargando contenido HTML...');
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });
      
      // 4. Generar PDF
      console.log('🖨️  [PDF-GENERATOR] Generando PDF...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0'
        }
      });
      
      // 5. Cerrar browser
      await browser.close();
      
      // 6. Generar nombre de archivo
      const address = params.projectInfo?.address || params.permitData.meta?.location || 'property';
      const sanitizedAddress = address
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
      
      const timestamp = Date.now();
      const filename = `permit-report-${sanitizedAddress}-${timestamp}.pdf`;
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ [PDF-GENERATOR] PDF generado exitosamente en ${duration}ms`);
      console.log(`📊 [PDF-GENERATOR] Tamaño: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
      console.log(`📁 [PDF-GENERATOR] Nombre: ${filename}`);
      
      return {
        buffer: pdfBuffer,
        filename,
        size: pdfBuffer.length
      };
      
    } catch (error: any) {
      console.error('❌ [PDF-GENERATOR] Error generando PDF:', error.message);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }
  
  /**
   * Guarda un PDF en el filesystem (para desarrollo/testing)
   */
  async savePDFToFile(buffer: Buffer, filename: string, directory: string = '/tmp'): Promise<string> {
    try {
      // Crear directorio si no existe
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      
      const filepath = path.join(directory, filename);
      fs.writeFileSync(filepath, buffer);
      
      console.log(`💾 [PDF-GENERATOR] PDF guardado en: ${filepath}`);
      return filepath;
      
    } catch (error: any) {
      console.error('❌ [PDF-GENERATOR] Error guardando PDF:', error.message);
      throw new Error(`Failed to save PDF: ${error.message}`);
    }
  }
}

// Singleton instance
export const pdfGeneratorService = new PDFGeneratorService();
