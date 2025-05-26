/**
 * Servicio Moderno de Generación de PDF
 * 
 * Sistema rápido y eficaz que reemplaza completamente el sistema anterior
 * Diseñado para ser reutilizable tanto para estimados como para contratos
 */

import puppeteer from 'puppeteer-core';
import { promises as fs } from 'fs';
import path from 'path';

export interface PdfGenerationOptions {
  html: string;
  fileName?: string;
  format?: 'A4' | 'Letter';
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  headerTemplate?: string;
  footerTemplate?: string;
  displayHeaderFooter?: boolean;
}

export interface PdfResult {
  success: boolean;
  buffer?: Buffer;
  filePath?: string;
  error?: string;
  processingTime: number;
}

export class ModernPdfService {
  private static instance: ModernPdfService;
  private browser: any = null;
  private isInitializing = false;

  private constructor() {}

  public static getInstance(): ModernPdfService {
    if (!ModernPdfService.instance) {
      ModernPdfService.instance = new ModernPdfService();
    }
    return ModernPdfService.instance;
  }

  /**
   * Inicializa el navegador una sola vez para reutilización
   */
  private async initializeBrowser(): Promise<void> {
    if (this.browser || this.isInitializing) return;
    
    this.isInitializing = true;
    console.log('🚀 [MODERN-PDF] Inicializando navegador optimizado...');
    
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--memory-pressure-off'
        ],
        timeout: 30000
      });
      console.log('✅ [MODERN-PDF] Navegador listo para generar PDFs');
    } catch (error) {
      console.error('❌ [MODERN-PDF] Error inicializando navegador:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Genera PDF de forma rápida y eficiente
   */
  public async generatePdf(options: PdfGenerationOptions): Promise<PdfResult> {
    const startTime = Date.now();
    console.log('📄 [MODERN-PDF] Iniciando generación rápida...');

    try {
      // Asegurar que el navegador esté disponible
      if (!this.browser) {
        await this.initializeBrowser();
      }

      const page = await this.browser.newPage();
      
      // Configuración optimizada de la página
      await page.setViewport({ width: 1200, height: 1600 });
      
      // Establecer el contenido HTML
      console.log('📝 [MODERN-PDF] Estableciendo contenido HTML...');
      await page.setContent(options.html, { 
        waitUntil: 'networkidle0',
        timeout: 10000 
      });

      // Configuración del PDF
      const pdfOptions: any = {
        format: options.format || 'Letter',
        printBackground: true,
        margin: options.margins || {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      };

      if (options.displayHeaderFooter) {
        pdfOptions.displayHeaderFooter = true;
        pdfOptions.headerTemplate = options.headerTemplate || '';
        pdfOptions.footerTemplate = options.footerTemplate || '';
      }

      console.log('🖨️ [MODERN-PDF] Generando PDF...');
      const pdfBuffer = await page.pdf(pdfOptions);
      
      await page.close();
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ [MODERN-PDF] PDF generado exitosamente en ${processingTime}ms`);

      return {
        success: true,
        buffer: pdfBuffer,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ [MODERN-PDF] Error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        processingTime
      };
    }
  }

  /**
   * Genera PDF y lo guarda en el sistema de archivos
   */
  public async generatePdfFile(options: PdfGenerationOptions): Promise<PdfResult> {
    const result = await this.generatePdf(options);
    
    if (!result.success || !result.buffer) {
      return result;
    }

    try {
      const fileName = options.fileName || `document-${Date.now()}.pdf`;
      const tempDir = path.join(process.cwd(), 'temp');
      
      // Asegurar que el directorio temp existe
      await fs.mkdir(tempDir, { recursive: true });
      
      const filePath = path.join(tempDir, fileName);
      await fs.writeFile(filePath, result.buffer);
      
      console.log(`💾 [MODERN-PDF] Archivo guardado: ${filePath}`);
      
      return {
        ...result,
        filePath
      };
    } catch (error) {
      console.error('❌ [MODERN-PDF] Error guardando archivo:', error);
      return {
        ...result,
        error: 'Error guardando archivo PDF'
      };
    }
  }

  /**
   * Cierra el navegador para liberar recursos
   */
  public async cleanup(): Promise<void> {
    if (this.browser) {
      console.log('🧹 [MODERN-PDF] Cerrando navegador...');
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Método específico para estimados
   */
  public async generateEstimatePdf(estimateHtml: string, estimateId: string): Promise<PdfResult> {
    console.log(`📊 [MODERN-PDF] Generando PDF para estimado: ${estimateId}`);
    
    return this.generatePdf({
      html: estimateHtml,
      fileName: `estimado-${estimateId}-${Date.now()}.pdf`,
      format: 'Letter',
      margins: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    });
  }

  /**
   * Método específico para contratos (reutilizable)
   */
  public async generateContractPdf(contractHtml: string, contractId: string): Promise<PdfResult> {
    console.log(`📋 [MODERN-PDF] Generando PDF para contrato: ${contractId}`);
    
    return this.generatePdf({
      html: contractHtml,
      fileName: `contrato-${contractId}-${Date.now()}.pdf`,
      format: 'Letter',
      margins: {
        top: '0.75in',
        right: '0.75in',
        bottom: '0.75in',
        left: '0.75in'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%;"></div>',
      footerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>'
    });
  }
}

// Instancia singleton
export const modernPdfService = ModernPdfService.getInstance();

// Manejar cierre de la aplicación
process.on('SIGINT', async () => {
  console.log('🛑 [MODERN-PDF] Cerrando servicio...');
  await modernPdfService.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 [MODERN-PDF] Cerrando servicio...');
  await modernPdfService.cleanup();
  process.exit(0);
});