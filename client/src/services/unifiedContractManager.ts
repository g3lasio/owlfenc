/**
 * Unified Contract Data Manager
 * Handles OCR processing, data validation, and missing field management
 */

import { ContractData, OCRResult, MissingFieldInfo, ProcessingStatus } from '@shared/contractSchema';

export class UnifiedContractManager {
  private static instance: UnifiedContractManager;
  private processingCallbacks: Array<(status: ProcessingStatus) => void> = [];

  static getInstance(): UnifiedContractManager {
    if (!UnifiedContractManager.instance) {
      UnifiedContractManager.instance = new UnifiedContractManager();
    }
    return UnifiedContractManager.instance;
  }

  /**
   * Process PDF file using Mistral AI for OCR
   */
  async processDocumentWithOCR(file: File): Promise<OCRResult> {
    this.updateProgress('ocr', 10, 'Iniciando extracción de datos con Mistral AI...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      this.updateProgress('ocr', 30, 'Enviando documento para análisis...');

      const response = await fetch('/api/legal-defense/extract-and-process', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error en procesamiento: ${response.status}`);
      }

      this.updateProgress('ocr', 70, 'Procesando datos extraídos...');

      const result = await response.json();

      // Transform response to our unified format
      const extractedData: Partial<ContractData> = {
        clientName: result.extractedData?.clientInfo?.name || '',
        clientAddress: result.extractedData?.clientInfo?.address || '',
        clientPhone: result.extractedData?.clientInfo?.phone || '',
        clientEmail: result.extractedData?.clientInfo?.email || '',
        projectType: result.extractedData?.projectInfo?.type || '',
        projectDescription: result.extractedData?.projectInfo?.description || '',
        projectLocation: result.extractedData?.projectInfo?.location || result.extractedData?.clientInfo?.address || '',
        totalAmount: result.extractedData?.financialInfo?.totalAmount || '',
        contractorName: result.extractedData?.contractorInfo?.name || 'OWL FENCE LLC',
        contractorAddress: result.extractedData?.contractorInfo?.address || '',
        contractorPhone: result.extractedData?.contractorInfo?.phone || '',
        contractorEmail: result.extractedData?.contractorInfo?.email || '',
        contractorLicense: result.extractedData?.contractorInfo?.license || '',
        dataSource: 'ocr' as const
      };

      this.updateProgress('ocr', 90, 'Validando datos extraídos...');

      const missingFields = this.detectMissingFields(extractedData);
      const confidence = this.calculateConfidence(extractedData, result);

      this.updateProgress('ocr', 100, 'Extracción completada exitosamente');

      return {
        success: true,
        extractedData,
        confidence,
        missingFields,
        rawText: result.rawText,
        processingTime: Date.now()
      };

    } catch (error) {
      console.error('Error en procesamiento OCR:', error);
      return {
        success: false,
        extractedData: {},
        confidence: 0,
        missingFields: [],
        rawText: '',
        processingTime: Date.now()
      };
    }
  }

  /**
   * Convert project data to contract format
   */
  convertProjectToContract(project: any): Partial<ContractData> {
    return {
      clientName: project.clientName || '',
      clientAddress: project.address || '',
      clientPhone: project.clientPhone || '',
      clientEmail: project.clientEmail || '',
      projectType: project.projectType || project.fenceType || 'Proyecto de construcción',
      projectDescription: project.description || '',
      projectLocation: project.address || '',
      totalAmount: project.totalPrice ? `$${project.totalPrice.toFixed(2)}` : project.estimateAmount || '',
      contractorName: 'OWL FENCE LLC',
      dataSource: 'project' as const
    };
  }

  /**
   * Detect missing required fields
   */
  detectMissingFields(data: Partial<ContractData>): string[] {
    const requiredFields = [
      'clientName',
      'clientAddress', 
      'projectType',
      'projectDescription',
      'projectLocation',
      'totalAmount'
    ];

    return requiredFields.filter(field => {
      const value = (data as any)[field];
      return !value || value.trim() === '';
    });
  }

  /**
   * Get detailed missing field information
   */
  getMissingFieldDetails(missingFields: string[]): MissingFieldInfo[] {
    const fieldInfo: Record<string, Omit<MissingFieldInfo, 'field'>> = {
      clientName: {
        displayName: 'Nombre del Cliente',
        required: true,
        reason: 'Requerido para identificar al cliente en el contrato'
      },
      clientAddress: {
        displayName: 'Dirección del Cliente',
        required: true,
        reason: 'Necesaria para ubicación del proyecto y notificaciones legales'
      },
      clientPhone: {
        displayName: 'Teléfono del Cliente',
        required: false,
        reason: 'Importante para comunicación durante el proyecto'
      },
      clientEmail: {
        displayName: 'Email del Cliente',
        required: false,
        reason: 'Necesario para envío de documentos y actualizaciones'
      },
      projectType: {
        displayName: 'Tipo de Proyecto',
        required: true,
        reason: 'Define el alcance y naturaleza del trabajo a realizar'
      },
      projectDescription: {
        displayName: 'Descripción del Proyecto',
        required: true,
        reason: 'Especifica detalladamente el trabajo a realizar'
      },
      totalAmount: {
        displayName: 'Monto Total',
        required: true,
        reason: 'Valor del contrato para términos de pago'
      },
      contractorPhone: {
        displayName: 'Teléfono del Contratista',
        required: false,
        suggestedValue: '(555) 123-4567',
        reason: 'Información de contacto profesional'
      },
      contractorEmail: {
        displayName: 'Email del Contratista',
        required: false,
        suggestedValue: 'info@owlfence.com',
        reason: 'Email de contacto profesional'
      }
    };

    return missingFields.map(field => ({
      field,
      ...fieldInfo[field]
    }));
  }

  /**
   * Validate contract data completeness
   */
  validateContractData(data: Partial<ContractData>): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    const missingRequired = this.detectMissingFields(data);
    if (missingRequired.length > 0) {
      errors.push(`Campos requeridos faltantes: ${missingRequired.join(', ')}`);
    }

    // Email validation
    if (data.clientEmail && !this.isValidEmail(data.clientEmail)) {
      errors.push('Email del cliente no es válido');
    }

    // Amount validation
    if (data.totalAmount && !this.isValidAmount(data.totalAmount)) {
      errors.push('El monto total no tiene un formato válido');
    }

    // Warnings for missing optional but important fields
    if (!data.clientPhone) {
      warnings.push('Se recomienda incluir teléfono del cliente');
    }

    if (!data.clientEmail) {
      warnings.push('Se recomienda incluir email del cliente');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Auto-complete missing data using intelligent suggestions
   */
  async autoCompleteData(data: Partial<ContractData>): Promise<Partial<ContractData>> {
    try {
      const response = await fetch('/api/anthropic/complete-contract-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contractData: data })
      });

      if (!response.ok) {
        throw new Error('Error en auto-completado');
      }

      const result = await response.json();
      return { ...data, ...result.completedData };

    } catch (error) {
      console.error('Error en auto-completado:', error);
      return data;
    }
  }

  /**
   * Register callback for processing updates
   */
  onProcessingUpdate(callback: (status: ProcessingStatus) => void): void {
    this.processingCallbacks.push(callback);
  }

  /**
   * Remove callback
   */
  removeProcessingCallback(callback: (status: ProcessingStatus) => void): void {
    this.processingCallbacks = this.processingCallbacks.filter(cb => cb !== callback);
  }

  // Private helper methods
  private updateProgress(step: ProcessingStatus['step'], progress: number, message: string): void {
    const status: ProcessingStatus = {
      step,
      progress,
      message,
      completed: progress === 100
    };

    this.processingCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error en callback de progreso:', error);
      }
    });
  }

  private calculateConfidence(extractedData: Partial<ContractData>, rawResult: any): number {
    let confidence = 0;
    const totalFields = 10; // Total expected fields

    // Base confidence from successful extraction
    const extractedFields = Object.values(extractedData).filter(value => 
      value && String(value).trim() !== ''
    ).length;

    confidence = Math.round((extractedFields / totalFields) * 100);

    // Boost confidence if key fields are present
    if (extractedData.clientName) confidence += 10;
    if (extractedData.totalAmount) confidence += 10;
    if (extractedData.projectDescription) confidence += 5;

    return Math.min(confidence, 100);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidAmount(amount: string): boolean {
    const cleanAmount = amount.replace(/[$,\s]/g, '');
    return !isNaN(parseFloat(cleanAmount)) && parseFloat(cleanAmount) > 0;
  }
}

export const unifiedContractManager = UnifiedContractManager.getInstance();