/**
 * Servicio PDFMonkey - Generación profesional de PDFs
 * 
 * Sistema estable y rápido para estimados y contratos
 * Reemplaza completamente todos los sistemas anteriores problemáticos
 */

import axios from 'axios';

export interface PDFMonkeyResult {
  success: boolean;
  buffer?: Buffer;
  downloadUrl?: string;
  error?: string;
  processingTime: number;
  documentId?: string;
}

export class PDFMonkeyService {
  private static instance: PDFMonkeyService;
  private apiKey: string;
  private baseUrl = 'https://api.pdfmonkey.io/api/v1';

  private constructor() {
    this.apiKey = process.env.PDFMONKEY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ [PDFMONKEY] API Key no encontrada en variables de entorno');
    }
  }

  public static getInstance(): PDFMonkeyService {
    if (!PDFMonkeyService.instance) {
      PDFMonkeyService.instance = new PDFMonkeyService();
    }
    return PDFMonkeyService.instance;
  }

  /**
   * Genera PDF usando PDFMonkey con HTML
   */
  public async generatePdf(html: string, options: any = {}): Promise<PDFMonkeyResult> {
    const startTime = Date.now();
    console.log('🐒 [PDFMONKEY] Iniciando generación profesional de PDF...');

    try {
      if (!this.apiKey) {
        throw new Error('API Key de PDFMonkey no configurada');
      }

      // Usar directamente el template ID 2 que funciona mejor
      const templateId = options.templateId || '2E4DC55E-044E-4FD3-B511-FEBF950071FA';
      
      // Simplificar HTML para compatibilidad total con PDFMonkey
      const simpleHtml = html
        .replace(/\s+/g, ' ') // Eliminar espacios múltiples
        .replace(/<!--[\s\S]*?-->/g, '') // Eliminar comentarios
        .replace(/style="[^"]*"/g, '') // Eliminar todos los estilos inline
        .replace(/<style[\s\S]*?<\/style>/gi, '') // Eliminar bloques CSS
        .replace(/class="[^"]*"/g, '') // Eliminar clases CSS
        .trim();
      
      console.log(`🐒 [PDFMONKEY] HTML simplificado - Tamaño: ${simpleHtml.length} caracteres`);
      
      const documentPayload = {
        document: {
          document_template_id: templateId,
          payload: {
            html_content: simpleHtml, // HTML ultra-simplificado
            title: options.title || 'Document',
            ...options.data
          },
          meta: {
            _filename: options.filename || 'document.pdf'
          }
        }
      };

      console.log(`🐒 [PDFMONKEY] Usando template: ${templateId}`);

      console.log('📤 [PDFMONKEY] Enviando solicitud a PDFMonkey...');
      
      const response = await axios.post(
        `${this.baseUrl}/documents`,
        documentPayload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const documentId = response.data.document.id;
      console.log(`📊 [PDFMONKEY] Documento creado con ID: ${documentId}`);

      // Esperar a que el PDF esté listo y descargarlo
      const pdfBuffer = await this.waitAndDownloadPdf(documentId);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ [PDFMONKEY] PDF generado exitosamente en ${processingTime}ms`);

      return {
        success: true,
        buffer: pdfBuffer,
        documentId,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ [PDFMONKEY] Error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido en PDFMonkey',
        processingTime
      };
    }
  }

  /**
   * Espera a que el PDF esté listo y lo descarga
   */
  private async waitAndDownloadPdf(documentId: string, maxAttempts = 10): Promise<Buffer> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const statusResponse = await axios.get(
          `${this.baseUrl}/documents/${documentId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );

        const status = statusResponse.data.document.status;
        console.log(`🔄 [PDFMONKEY] Estado del documento (intento ${attempt}): ${status}`);

        if (status === 'success') {
          // Descargar el PDF
          const downloadResponse = await axios.get(
            `${this.baseUrl}/documents/${documentId}/download`,
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`
              },
              responseType: 'arraybuffer'
            }
          );

          return Buffer.from(downloadResponse.data);
        }

        if (status === 'error') {
          throw new Error('Error en la generación del PDF en PDFMonkey');
        }

        // Esperar un poco antes del siguiente intento
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        console.log(`⏳ [PDFMONKEY] Reintentando... (${attempt}/${maxAttempts})`);
      }
    }

    throw new Error('Timeout esperando la generación del PDF');
  }

  /**
   * Método específico para estimados
   */
  public async generateEstimatePdf(html: string, estimateId: string): Promise<PDFMonkeyResult> {
    console.log(`📊 [PDFMONKEY] Generando PDF para estimado: ${estimateId}`);
    
    return this.generatePdf(html, {
      filename: `estimate_${estimateId}.pdf`,
      data: {
        type: 'estimate',
        id: estimateId
      }
    });
  }

  /**
   * Método específico para contratos
   */
  public async generateContractPdf(html: string, contractId: string): Promise<PDFMonkeyResult> {
    console.log(`📋 [PDFMONKEY] Generando PDF para contrato: ${contractId}`);
    
    return this.generatePdf(html, {
      filename: `contract_${contractId}.pdf`,
      data: {
        type: 'contract',
        id: contractId
      }
    });
  }

  /**
   * Verifica la conexión con PDFMonkey
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.log('❌ [PDFMONKEY] API Key no configurada');
        return false;
      }

      const response = await axios.get(`${this.baseUrl}/current_user`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      console.log('✅ [PDFMONKEY] Conexión exitosa');
      return response.status === 200;
    } catch (error) {
      console.error('❌ [PDFMONKEY] Error de conexión:', error);
      return false;
    }
  }
}

// Instancia singleton
export const pdfMonkeyService = PDFMonkeyService.getInstance();