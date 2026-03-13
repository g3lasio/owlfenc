/**
 * Servicio unificado de PDF que combina PDFMonkey con fallback de Claude Sonnet 3.7
 * Garantiza generación exitosa de PDFs usando el mejor método disponible
 */

import { downloadPdfFromResponse } from "@/lib/download-pdf";
import { pdfMonkeyService, EstimateData, PDFMonkeyResponse } from './pdfMonkeyService';
import { claudePdfFallbackService, ClaudePDFResponse } from './claudePdfFallbackService';

export interface UnifiedPDFResponse {
  success: boolean;
  downloadUrl?: string;
  method?: 'pdfmonkey' | 'claude-fallback';
  error?: string;
  documentId?: string;
}

class UnifiedPdfService {
  /**
   * Genera PDF intentando PDFMonkey primero, con fallback automático a Claude
   */
  async generatePDF(estimateData: EstimateData): Promise<UnifiedPDFResponse> {
    console.log('🔄 [Unified PDF] Iniciando generación de PDF...');
    
    // Paso 1: Intentar con PDFMonkey primero
    console.log('🐒 [Unified PDF] Intentando con PDFMonkey...');
    const pdfMonkeyResult = await pdfMonkeyService.generatePDF(estimateData);
    
    if (pdfMonkeyResult.success && pdfMonkeyResult.downloadUrl) {
      console.log('✅ [Unified PDF] PDFMonkey exitoso');
      return {
        success: true,
        downloadUrl: pdfMonkeyResult.downloadUrl,
        method: 'pdfmonkey',
        documentId: pdfMonkeyResult.documentId
      };
    }
    
    // Paso 2: Si PDFMonkey falla, usar Claude como fallback
    console.log('⚠️ [Unified PDF] PDFMonkey falló, activando fallback de Claude...');
    console.log('🐒 [Unified PDF] Error de PDFMonkey:', pdfMonkeyResult.error);
    
    const claudeResult = await claudePdfFallbackService.generateEstimateHTML(estimateData);
    
    if (!claudeResult.success || !claudeResult.html) {
      console.error('❌ [Unified PDF] Ambos servicios fallaron');
      return {
        success: false,
        error: `PDFMonkey failed: ${pdfMonkeyResult.error}. Claude fallback failed: ${claudeResult.error}`
      };
    }
    
    // Paso 3: Convertir HTML de Claude a PDF usando el servidor
    console.log('🤖 [Unified PDF] Claude generó HTML exitosamente, convirtiendo a PDF...');
    
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          html: claudeResult.html,
          title: `Estimado-${estimateData.estimateNumber || Date.now()}`
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server PDF generation failed: ${response.status}`);
      }
      
      // Para el fallback, devolvemos el blob directamente
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      console.log('✅ [Unified PDF] Fallback de Claude exitoso');
      return {
        success: true,
        downloadUrl,
        method: 'claude-fallback'
      };
      
    } catch (error) {
      console.error('❌ [Unified PDF] Error en conversión HTML a PDF:', error);
      return {
        success: false,
        error: `PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Descarga el PDF generado
   */
  async downloadPDF(downloadUrl: string, filename?: string): Promise<void> {
    try {
      const safeFilename = filename || `estimado-${Date.now()}.pdf`;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      if (isMobile) {
        // Mobile/tablet: open in new tab so user can save/share via browser
        const newTab = window.open(downloadUrl, '_blank');
        if (!newTab) window.location.href = downloadUrl;
      } else {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = safeFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      // Cleanup blob URLs after delay
      if (downloadUrl.startsWith('blob:')) {
        setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 60000);
      }
      console.log('📥 [Unified PDF] Descarga completada');
      
    } catch (error) {
      console.error('❌ [Unified PDF] Error en descarga:', error);
      throw error;
    }
  }
  
  /**
   * Verifica si PDFMonkey está disponible
   */
  async testPDFMonkeyConnection(): Promise<boolean> {
    const testData: EstimateData = {
      estimateNumber: 'TEST-001',
      clientName: 'Test Client',
      items: [{
        name: 'Test Item',
        description: 'Test Description',
        quantity: 1,
        unit: 'each',
        unitPrice: 100,
        totalPrice: 100
      }],
      total: 100
    };
    
    const result = await pdfMonkeyService.generatePDF(testData);
    return result.success;
  }
}

export const unifiedPdfService = new UnifiedPdfService();