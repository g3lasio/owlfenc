/**
 * FILE PROCESSOR SERVICE
 * Procesa archivos adjuntos y extrae contenido para Mervin AI
 * 
 * Soporta:
 * - PDFs (extracción de texto)
 * - Imágenes (OCR básico con descripción)
 * - Documentos de texto (.txt, .md, .json, .csv)
 * - Archivos de código
 */

import pdfParse from 'pdf-parse';
import sharp from 'sharp';
import type { FileAttachment } from '../types/mervin-types';

export class FileProcessorService {
  
  /**
   * Procesar archivo y extraer contenido
   */
  async processFile(file: Express.Multer.File): Promise<FileAttachment> {
    const mimeType = file.mimetype;
    const filename = file.originalname;
    const size = file.size;
    
    console.log(`📎 [FILE-PROCESSOR] Procesando archivo: ${filename} (${mimeType}, ${size} bytes)`);

    // Determinar tipo y extraer contenido
    let extractedText = '';
    let content = file.buffer.toString('base64');
    const metadata: Record<string, any> = {};

    try {
      // PDFs
      if (mimeType === 'application/pdf') {
        extractedText = await this.extractFromPDF(file.buffer);
        metadata.pages = extractedText.split('\n\n').length;
      }
      
      // Imágenes
      else if (mimeType.startsWith('image/')) {
        const imageInfo = await this.analyzeImage(file.buffer);
        extractedText = imageInfo.description;
        metadata.dimensions = imageInfo.dimensions;
        metadata.format = imageInfo.format;
      }
      
      // Archivos de texto
      else if (this.isTextFile(mimeType, filename)) {
        extractedText = file.buffer.toString('utf-8');
      }
      
      // JSON
      else if (mimeType === 'application/json') {
        const jsonContent = JSON.parse(file.buffer.toString('utf-8'));
        extractedText = `JSON File: ${filename}\n${JSON.stringify(jsonContent, null, 2)}`;
      }
      
      // CSV
      else if (mimeType === 'text/csv' || filename.endsWith('.csv')) {
        extractedText = `CSV File: ${filename}\n${file.buffer.toString('utf-8')}`;
      }
      
      // Otros archivos
      else {
        extractedText = `[Archivo binario: ${filename}, tipo: ${mimeType}, tamaño: ${this.formatBytes(size)}]`;
      }

      console.log(`✅ [FILE-PROCESSOR] Archivo procesado: ${extractedText.length} caracteres extraídos`);

    } catch (error: any) {
      console.error(`❌ [FILE-PROCESSOR] Error procesando ${filename}:`, error.message);
      extractedText = `[Error procesando archivo: ${error.message}]`;
    }

    return {
      filename,
      mimeType,
      size,
      content,
      extractedText,
      metadata
    };
  }

  /**
   * Extraer texto de PDF
   */
  private async extractFromPDF(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text || '[PDF sin texto extraíble]';
    } catch (error: any) {
      throw new Error(`Error extrayendo PDF: ${error.message}`);
    }
  }

  /**
   * Analizar imagen y generar descripción básica
   */
  private async analyzeImage(buffer: Buffer): Promise<{
    description: string;
    dimensions: string;
    format: string;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();
      
      const dimensions = `${metadata.width}x${metadata.height}`;
      const format = metadata.format || 'unknown';
      
      // Descripción básica (en el futuro se puede agregar OCR con tesseract o visión AI)
      const description = `[Imagen ${format.toUpperCase()}: ${dimensions}, ${this.formatBytes(metadata.size || 0)}]`;

      return { description, dimensions, format };
    } catch (error: any) {
      throw new Error(`Error analizando imagen: ${error.message}`);
    }
  }

  /**
   * Verificar si es archivo de texto
   */
  private isTextFile(mimeType: string, filename: string): boolean {
    const textMimeTypes = [
      'text/plain',
      'text/markdown',
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'application/x-typescript',
      'application/xml',
      'text/xml'
    ];

    const textExtensions = [
      '.txt', '.md', '.markdown', '.html', '.css', '.js', '.ts', 
      '.tsx', '.jsx', '.xml', '.yaml', '.yml', '.env', '.log',
      '.sh', '.py', '.java', '.cpp', '.c', '.h', '.go', '.rs'
    ];

    return textMimeTypes.includes(mimeType) || 
           textExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  /**
   * Formatear bytes a formato legible
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Generar resumen de archivos para contexto de IA
   */
  generateFilesSummary(attachments: FileAttachment[]): string {
    if (!attachments || attachments.length === 0) {
      return '';
    }

    const summary = [
      `\n\n📎 ARCHIVOS ADJUNTOS (${attachments.length}):\n`,
      ...attachments.map((file, index) => {
        return `${index + 1}. ${file.filename} (${file.mimeType}, ${this.formatBytes(file.size)})\n   Contenido: ${file.extractedText?.substring(0, 500)}${file.extractedText && file.extractedText.length > 500 ? '...' : ''}`;
      })
    ];

    return summary.join('\n');
  }
}
