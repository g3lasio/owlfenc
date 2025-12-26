/**
 * Unified PDF Engine Wrapper
 * 
 * Wrapper para integrar el UnifiedPdfEngine con los servicios existentes
 * sin romper la API actual.
 * 
 * Este wrapper permite:
 * 1. Usar el sistema Dual-Engine de forma transparente
 * 2. Mantener compatibilidad con código existente
 * 3. Activar/desactivar el sistema con una variable de entorno
 */

import { unifiedPdfEngine } from './unifiedPdfEngine';
import { premiumPdfService } from './premiumPdfService';

export interface PdfOptions {
  format?: 'Letter' | 'A4';
  printBackground?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

class UnifiedPdfEngineWrapper {
  private static instance: UnifiedPdfEngineWrapper;
  private isEnabled: boolean;

  constructor() {
    // Activar Unified Engine si la variable de entorno está configurada
    // Por defecto: DESACTIVADO para no romper producción actual
    this.isEnabled = process.env.USE_UNIFIED_PDF_ENGINE === 'true';
    
    if (this.isEnabled) {
      console.log('✅ [UNIFIED-PDF-WRAPPER] Unified PDF Engine ENABLED');
    } else {
      console.log('ℹ️ [UNIFIED-PDF-WRAPPER] Unified PDF Engine DISABLED (using Puppeteer only)');
    }
  }

  static getInstance(): UnifiedPdfEngineWrapper {
    if (!UnifiedPdfEngineWrapper.instance) {
      UnifiedPdfEngineWrapper.instance = new UnifiedPdfEngineWrapper();
    }
    return UnifiedPdfEngineWrapper.instance;
  }

  /**
   * Genera PDF usando Unified Engine o Puppeteer según configuración
   */
  async generatePdfFromHtml(html: string, options: PdfOptions = {}): Promise<Buffer> {
    if (!this.isEnabled) {
      // Modo legacy: solo Puppeteer
      console.log('📄 [UNIFIED-PDF-WRAPPER] Using legacy Puppeteer mode');
      return premiumPdfService.generatePdfFromHtml(html, options);
    }

    // Modo Unified: Dual-Engine con failover
    console.log('🎯 [UNIFIED-PDF-WRAPPER] Using Unified PDF Engine');
    
    // Convertir margin de string a number
    const marginValue = this.extractMarginValue(options.margin?.top || '50px');
    
    const result = await unifiedPdfEngine.generate({
      html,
      format: options.format || 'Letter',
      margin: marginValue,
      timeout: 5000, // 5 segundos timeout para Puppeteer
    });
    
    // Log del método usado
    console.log(`📊 [UNIFIED-PDF-WRAPPER] PDF generated using: ${result.method} in ${result.duration}ms`);
    
    if (!result.success) {
      console.warn(`⚠️ [UNIFIED-PDF-WRAPPER] PDF generation had issues: ${result.error}`);
    }
    
    return result.buffer;
  }

  /**
   * Extrae valor numérico del margin (ej: "50px" → 50)
   */
  private extractMarginValue(marginStr: string): number {
    const match = marginStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 50;
  }

  /**
   * Activa el Unified Engine
   */
  enable(): void {
    this.isEnabled = true;
    console.log('✅ [UNIFIED-PDF-WRAPPER] Unified PDF Engine ENABLED');
  }

  /**
   * Desactiva el Unified Engine (vuelve a Puppeteer solo)
   */
  disable(): void {
    this.isEnabled = false;
    console.log('ℹ️ [UNIFIED-PDF-WRAPPER] Unified PDF Engine DISABLED');
  }

  /**
   * Verifica si el Unified Engine está activo
   */
  isUnifiedEngineEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Obtiene métricas del Unified Engine
   */
  getMetrics() {
    if (!this.isEnabled) {
      return {
        enabled: false,
        message: 'Unified PDF Engine is disabled',
      };
    }
    
    return {
      enabled: true,
      ...unifiedPdfEngine.getMetrics(),
    };
  }
}

// Export singleton
export const unifiedPdfEngineWrapper = UnifiedPdfEngineWrapper.getInstance();
