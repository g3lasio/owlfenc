/**
 * Sistema unificado de generación de PDFs y previews
 * Garantiza consistencia total entre preview y PDF final
 */

import { generateUnifiedEstimateHTML } from './estimate-template';

interface EstimateData {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  projectDescription?: string;
  items?: Array<{
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
  }>;
  subtotal?: number;
  tax?: number;
  total?: number;
  notes?: string;
  estimateNumber?: string;
  estimateDate?: string;
  contractor?: {
    companyName?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    license?: string;
    insurancePolicy?: string;
  };
}

/**
 * Clase principal del sistema unificado
 */
export class UnifiedPDFSystem {
  private cachedHTML: string | null = null;
  private lastDataHash: string | null = null;

  /**
   * Genera un hash de los datos para verificar si han cambiado
   */
  private generateDataHash(data: EstimateData): string {
    return btoa(JSON.stringify(data)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * Genera HTML usando la plantilla unificada
   * Cachea el resultado para garantizar consistencia
   */
  generateHTML(data: EstimateData): string {
    const currentHash = this.generateDataHash(data);
    
    // Si los datos no han cambiado, usar el HTML cacheado
    if (this.cachedHTML && this.lastDataHash === currentHash) {
      console.log('📄 Usando HTML cacheado para garantizar consistencia');
      return this.cachedHTML;
    }

    console.log('📄 Generando nuevo HTML con plantilla unificada');
    this.cachedHTML = generateUnifiedEstimateHTML(data);
    this.lastDataHash = currentHash;
    
    return this.cachedHTML;
  }

  /**
   * Genera y muestra preview usando el HTML unificado
   */
  showPreview(data: EstimateData): string {
    const html = this.generateHTML(data);
    console.log('👁️ Mostrando preview con HTML unificado');
    return html;
  }

  /**
   * Genera PDF usando EXACTAMENTE el mismo HTML del preview
   */
  async generatePDF(data: EstimateData, filename?: string): Promise<void> {
    // Usar EXACTAMENTE el mismo HTML que se mostró en el preview
    const html = this.generateHTML(data);
    
    console.log('📋 Generando PDF con el MISMO HTML del preview');
    console.log('🔍 HTML hash:', this.lastDataHash);
    
    const finalFilename = filename || `Estimado-${data.clientName?.replace(/\s+/g, '-') || 'Cliente'}-${Date.now()}`;
    
    try {
      // Intentar con el método del servidor primero
      await this.generateServerPDF(html, finalFilename);
    } catch (serverError) {
      console.log('⚠️ Método servidor falló, intentando método cliente:', serverError);
      try {
        await this.generateClientPDF(html, finalFilename);
      } catch (clientError) {
        console.error('❌ Ambos métodos fallaron:', { serverError, clientError });
        throw new Error('No se pudo generar el PDF por ningún método disponible');
      }
    }
  }

  /**
   * Genera PDF usando el servidor (método preferido)
   */
  private async generateServerPDF(html: string, filename: string): Promise<void> {
    console.log('🖥️ Generando PDF con método servidor...');
    
    const response = await fetch('/api/pdf/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: html,
        filename: filename
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
    }

    // Descargar el PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ PDF generado exitosamente con método servidor');
  }

  /**
   * Genera PDF usando el cliente (método de respaldo)
   */
  private async generateClientPDF(html: string, filename: string): Promise<void> {
    console.log('💻 Generando PDF con método cliente...');
    
    // Importar dinámicamente jsPDF y html2canvas
    const [jsPDFModule, html2canvasModule] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);
    
    const jsPDF = jsPDFModule.default;
    const html2canvas = html2canvasModule.default;

    // Crear contenedor temporal para renderizar el HTML
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px'; // Ancho A4 en píxeles
    container.style.background = '#ffffff';
    container.style.fontFamily = 'Arial, sans-serif';
    
    document.body.appendChild(container);

    try {
      // Convertir HTML a canvas con configuración optimizada
      const canvas = await html2canvas(container, {
        scale: 2, // Calidad alta
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: container.scrollHeight
      });

      // Crear PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Añadir primera página
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Añadir páginas adicionales si es necesario
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // Descargar PDF
      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
      
      console.log('✅ PDF generado exitosamente con método cliente');
      
    } finally {
      // Limpiar el contenedor temporal
      document.body.removeChild(container);
    }
  }

  /**
   * Limpia el cache (útil cuando se quiere forzar regeneración)
   */
  clearCache(): void {
    this.cachedHTML = null;
    this.lastDataHash = null;
    console.log('🗑️ Cache de HTML limpiado');
  }

  /**
   * Verifica si el HTML está cacheado
   */
  isCached(): boolean {
    return this.cachedHTML !== null;
  }

  /**
   * Obtiene información del estado del sistema
   */
  getStatus(): { cached: boolean; dataHash: string | null } {
    return {
      cached: this.isCached(),
      dataHash: this.lastDataHash
    };
  }
}

/**
 * Instancia global del sistema unificado
 * Mantiene consistencia a través de toda la aplicación
 */
export const unifiedPDFSystem = new UnifiedPDFSystem();

/**
 * Funciones de conveniencia para mantener compatibilidad
 */
export function generateEstimatePreview(data: EstimateData): string {
  return unifiedPDFSystem.showPreview(data);
}

export async function downloadEstimatePDF(data: EstimateData, filename?: string): Promise<void> {
  return unifiedPDFSystem.generatePDF(data, filename);
}

export function clearEstimateCache(): void {
  unifiedPDFSystem.clearCache();
}