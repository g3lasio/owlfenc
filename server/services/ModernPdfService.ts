/**
 * ModernPdfService - Sistema unificado y robusto de generación de PDFs
 * 
 * Características:
 * - Generación rápida (< 3 segundos objetivo)
 * - Múltiples fallbacks para máxima confiabilidad
 * - Funciona en desarrollo y producción
 * - Browser pool para reutilización de instancias
 */

import { Buffer } from 'buffer';
import { launchBrowser, getChromiumInfo } from '../utils/chromiumResolver';

interface PdfGenerationOptions {
  html: string;
  format?: 'A4' | 'Letter';
  landscape?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  timeout?: number;
}

interface PdfGenerationResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
  processingTime: number;
  method: string;
}

class ModernPdfService {
  private static instance: ModernPdfService;
  private browserPool: any = null;
  private browserLaunchPromise: Promise<any> | null = null;
  private lastBrowserUseTime: number = 0;
  private readonly BROWSER_IDLE_TIMEOUT = 60000; // 1 minute
  private readonly MAX_GENERATION_TIME = 25000; // 25 seconds max
  
  private constructor() {
    this.startIdleCleanup();
  }

  static getInstance(): ModernPdfService {
    if (!ModernPdfService.instance) {
      ModernPdfService.instance = new ModernPdfService();
    }
    return ModernPdfService.instance;
  }

  /**
   * Limpia el browser pool cuando está inactivo
   */
  private startIdleCleanup(): void {
    setInterval(async () => {
      if (this.browserPool && Date.now() - this.lastBrowserUseTime > this.BROWSER_IDLE_TIMEOUT) {
        console.log('🧹 [MODERN-PDF] Closing idle browser...');
        try {
          await this.browserPool.close();
        } catch (e) {
          // Ignore close errors
        }
        this.browserPool = null;
      }
    }, 30000);
  }

  /**
   * Obtiene o crea un browser del pool
   */
  private async getBrowser(): Promise<any> {
    this.lastBrowserUseTime = Date.now();
    
    if (this.browserPool) {
      try {
        const pages = await this.browserPool.pages();
        if (pages.length >= 0) {
          return this.browserPool;
        }
      } catch (e) {
        this.browserPool = null;
      }
    }

    if (this.browserLaunchPromise) {
      return this.browserLaunchPromise;
    }

    this.browserLaunchPromise = launchBrowser().then(browser => {
      this.browserPool = browser;
      this.browserLaunchPromise = null;
      return browser;
    }).catch(err => {
      this.browserLaunchPromise = null;
      throw err;
    });

    return this.browserLaunchPromise;
  }

  /**
   * Método principal de generación de PDF
   */
  async generatePdf(options: PdfGenerationOptions): Promise<PdfGenerationResult> {
    const startTime = Date.now();
    console.log('🚀 [MODERN-PDF] Starting PDF generation...');
    
    const chromiumInfo = getChromiumInfo();
    console.log(`📍 [MODERN-PDF] Chromium info:`, chromiumInfo);

    try {
      const result = await this.generateWithPuppeteer(options);
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ [MODERN-PDF] PDF generated in ${processingTime}ms`);
      
      return {
        success: true,
        buffer: result,
        processingTime,
        method: 'puppeteer-modern'
      };
    } catch (primaryError) {
      console.error('❌ [MODERN-PDF] Primary method failed:', primaryError);
      
      // Fallback: Try with fresh browser
      try {
        console.log('🔄 [MODERN-PDF] Trying fallback with fresh browser...');
        if (this.browserPool) {
          try { await this.browserPool.close(); } catch (e) {}
          this.browserPool = null;
        }
        
        const result = await this.generateWithFreshBrowser(options);
        const processingTime = Date.now() - startTime;
        
        return {
          success: true,
          buffer: result,
          processingTime,
          method: 'puppeteer-fresh'
        };
      } catch (fallbackError) {
        console.error('❌ [MODERN-PDF] Fallback also failed:', fallbackError);
        
        return {
          success: false,
          error: `PDF generation failed: ${(fallbackError as Error).message}`,
          processingTime: Date.now() - startTime,
          method: 'failed'
        };
      }
    }
  }

  /**
   * Generación con browser pool (rápida)
   */
  private async generateWithPuppeteer(options: PdfGenerationOptions): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    try {
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 1.5,
      });

      // Block external resources that cause timeouts
      await page.setRequestInterception(true);
      page.on('request', (request: any) => {
        const url = request.url();
        if (url.includes('fonts.googleapis.com') || 
            url.includes('fonts.gstatic.com') ||
            url.includes('google-analytics') ||
            url.includes('googletagmanager')) {
          request.abort();
        } else {
          request.continue();
        }
      });

      const timeout = options.timeout || this.MAX_GENERATION_TIME;
      
      await page.setContent(options.html, {
        waitUntil: 'domcontentloaded',
        timeout: timeout,
      });

      // Wait for images with a reasonable timeout
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images, (img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.addEventListener('load', resolve);
              img.addEventListener('error', resolve);
              setTimeout(resolve, 2000);
            });
          })
        );
      });

      const pdfBuffer = await page.pdf({
        format: options.format || 'Letter',
        landscape: options.landscape || false,
        margin: {
          top: options.margin?.top || '0.5in',
          right: options.margin?.right || '0.5in',
          bottom: options.margin?.bottom || '0.5in',
          left: options.margin?.left || '0.5in',
        },
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        scale: 1.0,
        timeout: 20000,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Generación con browser fresco (fallback)
   */
  private async generateWithFreshBrowser(options: PdfGenerationOptions): Promise<Buffer> {
    const browser = await launchBrowser();
    
    try {
      const page = await browser.newPage();
      
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 1.5,
      });

      await page.setContent(options.html, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      const pdfBuffer = await page.pdf({
        format: options.format || 'Letter',
        margin: {
          top: options.margin?.top || '0.5in',
          right: options.margin?.right || '0.5in',
          bottom: options.margin?.bottom || '0.5in',
          left: options.margin?.left || '0.5in',
        },
        printBackground: true,
        timeout: 25000,
      });

      await page.close();
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  /**
   * Genera PDF de estimado
   */
  async generateEstimatePdf(html: string, estimateId: string): Promise<PdfGenerationResult> {
    console.log(`📊 [MODERN-PDF] Generating estimate PDF: ${estimateId}`);
    return this.generatePdf({
      html,
      format: 'Letter',
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      }
    });
  }

  /**
   * Genera PDF de contrato
   */
  async generateContractPdf(html: string, contractId: string): Promise<PdfGenerationResult> {
    console.log(`📋 [MODERN-PDF] Generating contract PDF: ${contractId}`);
    return this.generatePdf({
      html,
      format: 'Letter',
      margin: {
        top: '0.75in',
        right: '0.75in',
        bottom: '0.75in',
        left: '0.75in',
      }
    });
  }

  /**
   * Genera PDF genérico desde HTML
   */
  async generateFromHtml(html: string, options?: Partial<PdfGenerationOptions>): Promise<PdfGenerationResult> {
    console.log('📄 [MODERN-PDF] Generating PDF from HTML...');
    return this.generatePdf({
      html,
      ...options
    });
  }

  /**
   * Health check del servicio
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title></head>
        <body><h1>Test PDF</h1><p>Generated at ${new Date().toISOString()}</p></body>
        </html>
      `;
      
      const result = await this.generatePdf({ html: testHtml });
      
      return {
        healthy: result.success,
        details: {
          chromiumInfo: getChromiumInfo(),
          lastGenerationTime: result.processingTime,
          method: result.method,
          bufferSize: result.buffer?.length || 0
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: (error as Error).message,
          chromiumInfo: getChromiumInfo()
        }
      };
    }
  }

  /**
   * Cierra el browser pool
   */
  async shutdown(): Promise<void> {
    if (this.browserPool) {
      try {
        await this.browserPool.close();
      } catch (e) {
        // Ignore
      }
      this.browserPool = null;
    }
  }
}

export const modernPdfService = ModernPdfService.getInstance();
export { ModernPdfService };
