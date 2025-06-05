/**
 * Servicio OCR Simplificado
 * Extrae datos básicos de PDFs de manera confiable usando Anthropic
 */

import { ContractData } from './contractTemplateService';

export interface OcrResult {
  success: boolean;
  extractedData: Partial<ContractData>;
  rawText: string;
  errors: string[];
}

class SimpleOcrService {
  
  /**
   * Extrae datos de un PDF usando OCR
   */
  async extractDataFromPdf(file: File): Promise<OcrResult> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/ocr/extract-simple', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error OCR: ${response.statusText}`);
      }

      const result = await response.json();
      return this.validateOcrResult(result);

    } catch (error) {
      console.error('Error en OCR:', error);
      return {
        success: false,
        extractedData: {},
        rawText: '',
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

  /**
   * Valida y limpia los resultados del OCR
   */
  private validateOcrResult(result: any): OcrResult {
    const errors: string[] = [];
    const extractedData: Partial<ContractData> = {};

    // Validar y limpiar datos extraídos
    if (result.contractorName) {
      extractedData.contractorName = this.cleanText(result.contractorName);
    } else {
      errors.push('No se pudo extraer el nombre del contratista');
    }

    if (result.clientName) {
      extractedData.clientName = this.cleanText(result.clientName);
    } else {
      errors.push('No se pudo extraer el nombre del cliente');
    }

    if (result.totalAmount) {
      extractedData.totalAmount = this.cleanAmount(result.totalAmount);
    } else {
      errors.push('No se pudo extraer el monto total');
    }

    if (result.projectDescription) {
      extractedData.projectDescription = this.cleanText(result.projectDescription);
    }

    if (result.clientAddress) {
      extractedData.clientAddress = this.cleanText(result.clientAddress);
    }

    if (result.contractorPhone) {
      extractedData.contractorPhone = this.cleanPhone(result.contractorPhone);
    }

    if (result.clientPhone) {
      extractedData.clientPhone = this.cleanPhone(result.clientPhone);
    }

    return {
      success: errors.length === 0,
      extractedData,
      rawText: result.rawText || '',
      errors
    };
  }

  /**
   * Limpia texto extraído
   */
  private cleanText(text: string): string {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Limpia y formatea números de teléfono
   */
  private cleanPhone(phone: string): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }

  /**
   * Limpia y formatea montos
   */
  private cleanAmount(amount: string): string {
    if (!amount) return '';
    
    // Extraer números y puntos decimales
    const cleaned = amount.replace(/[^0-9.,]/g, '');
    const number = parseFloat(cleaned.replace(/,/g, ''));
    
    if (isNaN(number)) return amount;
    
    return `$${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Sugiere correcciones automáticas para datos extraídos
   */
  suggestCorrections(extractedData: Partial<ContractData>): Partial<ContractData> {
    const corrections: Partial<ContractData> = { ...extractedData };

    // Corregir formato de emails
    if (corrections.contractorEmail && !corrections.contractorEmail.includes('@')) {
      corrections.contractorEmail = '';
    }

    if (corrections.clientEmail && !corrections.clientEmail.includes('@')) {
      corrections.clientEmail = '';
    }

    // Validar montos (verificar si no son demasiado altos o bajos)
    if (corrections.totalAmount) {
      const amount = parseFloat(corrections.totalAmount.replace(/[^0-9.]/g, ''));
      if (amount > 100000) {
        // Posible error en OCR, reducir un dígito
        corrections.totalAmount = `$${(amount / 10).toFixed(2)}`;
      }
    }

    return corrections;
  }

  /**
   * Convierte datos de proyecto existente a formato de contrato
   */
  convertProjectToContractData(project: any): Partial<ContractData> {
    return {
      clientName: project.clientName || '',
      clientAddress: project.clientAddress || '',
      clientPhone: project.clientPhone || '',
      clientEmail: project.clientEmail || '',
      projectType: project.projectType || 'Proyecto de construcción',
      projectDescription: project.projectDescription || `Proyecto basado en estimado ${project.estimateNumber}`,
      projectLocation: project.clientAddress || '',
      totalAmount: project.total ? `$${project.total.toFixed(2)}` : '',
      contractorName: 'OWL FENCE LLC',
      contractorAddress: '[Dirección del contratista]',
      contractorPhone: '[Teléfono del contratista]',
      contractorEmail: '[Email del contratista]',
      contractorLicense: '[Número de licencia]'
    };
  }
}

export const simpleOcrService = new SimpleOcrService();