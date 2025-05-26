/**
 * Servicio PDF Simple y Rápido
 * 
 * Alternativa ligera que no requiere Chrome ni Puppeteer
 * Funciona inmediatamente sin instalaciones adicionales
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface SimplePdfResult {
  success: boolean;
  buffer?: Buffer;
  filePath?: string;
  error?: string;
  processingTime: number;
}

export class SimplePdfService {
  private static instance: SimplePdfService;

  private constructor() {}

  public static getInstance(): SimplePdfService {
    if (!SimplePdfService.instance) {
      SimplePdfService.instance = new SimplePdfService();
    }
    return SimplePdfService.instance;
  }

  /**
   * Genera PDF usando html-pdf-node (más liviano y rápido)
   */
  public async generatePdf(html: string, options: any = {}): Promise<SimplePdfResult> {
    const startTime = Date.now();
    console.log('⚡ [SIMPLE-PDF] Iniciando generación rápida...');

    try {
      // Usar html-pdf-node que ya está instalado
      const htmlPdf = await import('html-pdf-node');
      
      const pdfOptions = {
        format: 'Letter',
        width: '8.5in',
        height: '11in',
        border: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        type: 'pdf',
        quality: '75',
        ...options
      };

      console.log('📄 [SIMPLE-PDF] Generando con html-pdf-node...');
      
      const file = { content: html };
      const pdfBuffer = await htmlPdf.generatePdf(file, pdfOptions);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ [SIMPLE-PDF] PDF generado exitosamente en ${processingTime}ms`);

      return {
        success: true,
        buffer: pdfBuffer,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ [SIMPLE-PDF] Error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        processingTime
      };
    }
  }

  /**
   * Método específico para estimados
   */
  public async generateEstimatePdf(html: string, estimateId: string): Promise<SimplePdfResult> {
    console.log(`📊 [SIMPLE-PDF] Generando PDF para estimado: ${estimateId}`);
    
    return this.generatePdf(html, {
      format: 'Letter',
      border: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      }
    });
  }

  /**
   * Método específico para contratos
   */
  public async generateContractPdf(html: string, contractId: string): Promise<SimplePdfResult> {
    console.log(`📋 [SIMPLE-PDF] Generando PDF para contrato: ${contractId}`);
    
    return this.generatePdf(html, {
      format: 'Letter',
      border: {
        top: '0.75in',
        right: '0.75in',
        bottom: '0.75in',
        left: '0.75in'
      }
    });
  }
}

// Instancia singleton
export const simplePdfService = SimplePdfService.getInstance();