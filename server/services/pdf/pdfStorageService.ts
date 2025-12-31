/**
 * PDF Storage Service
 * 
 * Almacena PDFs y proporciona URLs públicas
 * Usa filesystem local con URLs públicas servidas por Express
 */

import fs from 'fs';
import path from 'path';

interface StorageResult {
  url: string;
  filename: string;
  filepath: string;
}

export class PDFStorageService {
  private storageDir: string;
  private baseURL: string;
  
  constructor() {
    // Directorio donde se guardarán los PDFs
    // En Replit, usar /tmp o un directorio público
    this.storageDir = process.env.PDF_STORAGE_DIR || path.join(__dirname, '../../../public/permit-reports');
    
    // URL base para acceder a los PDFs
    this.baseURL = process.env.BASE_URL || 'https://owlfenc.replit.app';
    
    // Crear directorio si no existe
    this.ensureStorageDirectory();
  }
  
  /**
   * Asegura que el directorio de almacenamiento existe
   */
  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
      console.log(`📁 [PDF-STORAGE] Directorio creado: ${this.storageDir}`);
    }
  }
  
  /**
   * Guarda un PDF y retorna la URL pública
   */
  async savePDF(buffer: Buffer, filename: string): Promise<StorageResult> {
    try {
      console.log(`💾 [PDF-STORAGE] Guardando PDF: ${filename}`);
      
      // Ruta completa del archivo
      const filepath = path.join(this.storageDir, filename);
      
      // Guardar el archivo
      fs.writeFileSync(filepath, buffer);
      
      // Generar URL pública
      const url = `${this.baseURL}/permit-reports/${filename}`;
      
      console.log(`✅ [PDF-STORAGE] PDF guardado exitosamente`);
      console.log(`🔗 [PDF-STORAGE] URL pública: ${url}`);
      
      return {
        url,
        filename,
        filepath
      };
      
    } catch (error: any) {
      console.error('❌ [PDF-STORAGE] Error guardando PDF:', error.message);
      throw new Error(`Failed to save PDF: ${error.message}`);
    }
  }
  
  /**
   * Elimina un PDF del storage
   */
  async deletePDF(filename: string): Promise<void> {
    try {
      const filepath = path.join(this.storageDir, filename);
      
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`🗑️  [PDF-STORAGE] PDF eliminado: ${filename}`);
      }
      
    } catch (error: any) {
      console.error('❌ [PDF-STORAGE] Error eliminando PDF:', error.message);
      throw new Error(`Failed to delete PDF: ${error.message}`);
    }
  }
  
  /**
   * Limpia PDFs antiguos (opcional, para mantenimiento)
   */
  async cleanOldPDFs(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      console.log(`🧹 [PDF-STORAGE] Limpiando PDFs antiguos...`);
      
      const files = fs.readdirSync(this.storageDir);
      const now = Date.now();
      let deletedCount = 0;
      
      for (const file of files) {
        if (!file.endsWith('.pdf')) continue;
        
        const filepath = path.join(this.storageDir, file);
        const stats = fs.statSync(filepath);
        const age = now - stats.mtimeMs;
        
        if (age > maxAgeMs) {
          fs.unlinkSync(filepath);
          deletedCount++;
        }
      }
      
      console.log(`✅ [PDF-STORAGE] ${deletedCount} PDFs antiguos eliminados`);
      return deletedCount;
      
    } catch (error: any) {
      console.error('❌ [PDF-STORAGE] Error limpiando PDFs:', error.message);
      return 0;
    }
  }
  
  /**
   * Obtiene estadísticas del storage
   */
  getStorageStats(): { count: number; totalSize: number; directory: string } {
    try {
      const files = fs.readdirSync(this.storageDir);
      const pdfFiles = files.filter(f => f.endsWith('.pdf'));
      
      let totalSize = 0;
      for (const file of pdfFiles) {
        const filepath = path.join(this.storageDir, file);
        const stats = fs.statSync(filepath);
        totalSize += stats.size;
      }
      
      return {
        count: pdfFiles.length,
        totalSize,
        directory: this.storageDir
      };
      
    } catch (error: any) {
      console.error('❌ [PDF-STORAGE] Error obteniendo estadísticas:', error.message);
      return { count: 0, totalSize: 0, directory: this.storageDir };
    }
  }
}

// Singleton instance
export const pdfStorageService = new PDFStorageService();
