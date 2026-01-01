/**
 * Contract From Estimate PDF Tool
 * 
 * Herramienta especializada que genera un contrato a partir de un PDF de estimado.
 * Maneja todo el flujo: extracción de datos → validación → generación de contrato.
 */

import { EstimateDataExtractor } from '../../services/vision/EstimateDataExtractor';
import { ImageInput } from '../../services/vision/ClaudeVisionService';

export interface ContractFromEstimatePDFInput {
  pdfFile: ImageInput;
  additionalInfo?: {
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    projectType?: string;
    projectDescription?: string;
    projectAddress?: string;
    totalAmount?: number;
    startDate?: string;
    endDate?: string;
  };
}

export interface ContractFromEstimatePDFResult {
  success: boolean;
  extractedData?: any;
  missingFields?: string[];
  needsUserInput?: boolean;
  missingFieldsMessage?: string;
  contractData?: any;
  error?: string;
}

export class ContractFromEstimatePDFTool {
  private extractor: EstimateDataExtractor;

  constructor() {
    this.extractor = new EstimateDataExtractor();
  }

  /**
   * Definición de la herramienta para Claude
   */
  static getToolDefinition() {
    return {
      name: 'create_contract_from_estimate_pdf',
      description: `Genera un contrato legal profesional a partir de un PDF de estimado adjunto.

Esta herramienta especializada:
1. Analiza el PDF del estimado automáticamente
2. Extrae todos los datos necesarios (cliente, proyecto, montos)
3. Valida que la información sea suficiente
4. Si falta información, pregunta al usuario específicamente qué necesita
5. Genera el contrato completo con firma dual

Usa esta herramienta cuando el usuario:
- Adjunte un PDF de estimado y pida generar un contrato
- Diga "el cliente aprobó el estimado, genera el contrato"
- Quiera convertir un estimado en contrato

IMPORTANTE: Esta herramienta maneja TODO el flujo automáticamente. 
NO necesitas llamar a analyze_images por separado.

Ejemplo de uso:
Usuario: "El cliente aprobó este estimado hace una semana, necesito el contrato hoy"
[Adjunta PDF]
→ Usa esta herramienta con el PDF adjunto`,
      input_schema: {
        type: 'object',
        properties: {
          pdfFile: {
            type: 'object',
            description: 'Archivo PDF del estimado',
            properties: {
              type: {
                type: 'string',
                enum: ['base64', 'path'],
                description: 'Tipo de archivo'
              },
              data: {
                type: 'string',
                description: 'Contenido en base64 o ruta del archivo'
              },
              mediaType: {
                type: 'string',
                description: 'Debe ser "application/pdf"'
              }
            },
            required: ['type', 'data']
          },
          additionalInfo: {
            type: 'object',
            description: 'Información adicional proporcionada por el usuario (opcional)',
            properties: {
              clientName: { type: 'string' },
              clientEmail: { type: 'string' },
              clientPhone: { type: 'string' },
              projectType: { type: 'string' },
              projectDescription: { type: 'string' },
              projectAddress: { type: 'string' },
              totalAmount: { type: 'number' },
              startDate: { type: 'string' },
              endDate: { type: 'string' }
            }
          }
        },
        required: ['pdfFile']
      }
    };
  }

  /**
   * Ejecutar la herramienta
   */
  async execute(input: ContractFromEstimatePDFInput): Promise<ContractFromEstimatePDFResult> {
    try {
      console.log('📄 [CONTRACT-FROM-PDF] Iniciando proceso...');

      // Paso 1: Extraer datos del PDF
      console.log('🔍 [CONTRACT-FROM-PDF] Extrayendo datos del estimado...');
      const extractedData = await this.extractor.extractFromPDF(input.pdfFile);

      // Paso 2: Combinar con información adicional del usuario
      const mergedData = this.mergeData(extractedData, input.additionalInfo);

      console.log('📊 [CONTRACT-FROM-PDF] Datos extraídos:');
      console.log(`   Cliente: ${mergedData.clientName || 'N/A'}`);
      console.log(`   Email: ${mergedData.clientEmail || 'N/A'}`);
      console.log(`   Proyecto: ${mergedData.projectType || 'N/A'}`);
      console.log(`   Monto: $${mergedData.totalAmount || 'N/A'}`);
      console.log(`   Confianza: ${(mergedData.confidence * 100).toFixed(0)}%`);

      // Paso 3: Validar si tenemos todos los datos necesarios
      if (mergedData.missingFields && mergedData.missingFields.length > 0) {
        console.log('⚠️  [CONTRACT-FROM-PDF] Faltan campos críticos');
        
        const missingMessage = this.extractor.generateMissingFieldsMessage(mergedData);
        
        return {
          success: false,
          extractedData: mergedData,
          missingFields: mergedData.missingFields,
          needsUserInput: true,
          missingFieldsMessage: missingMessage || undefined
        };
      }

      // Paso 4: Preparar datos para el workflow de contratos
      const contractData = {
        clientName: mergedData.clientName!,
        clientEmail: mergedData.clientEmail!,
        clientPhone: mergedData.clientPhone,
        projectType: mergedData.projectType!,
        projectDescription: mergedData.projectDescription!,
        projectAddress: mergedData.projectAddress!,
        totalAmount: mergedData.totalAmount!,
        startDate: mergedData.startDate,
        endDate: mergedData.endDate
      };

      console.log('✅ [CONTRACT-FROM-PDF] Datos completos, listos para generar contrato');

      return {
        success: true,
        extractedData: mergedData,
        contractData,
        needsUserInput: false
      };

    } catch (error: any) {
      console.error('❌ [CONTRACT-FROM-PDF] Error:', error);
      return {
        success: false,
        error: error.message,
        needsUserInput: false
      };
    }
  }

  /**
   * Combinar datos extraídos con información adicional del usuario
   */
  private mergeData(extracted: any, additional?: any): any {
    if (!additional) return extracted;

    // La información del usuario tiene prioridad sobre la extraída
    return {
      ...extracted,
      ...additional,
      // Recalcular campos faltantes después del merge
      missingFields: this.recalculateMissingFields({
        ...extracted,
        ...additional
      })
    };
  }

  /**
   * Recalcular campos faltantes después del merge
   */
  private recalculateMissingFields(data: any): string[] {
    const criticalFields = [
      'clientName',
      'clientEmail',
      'projectType',
      'projectDescription',
      'projectAddress',
      'totalAmount'
    ];

    return criticalFields.filter(field => !data[field]);
  }
}

// Exportar instancia singleton
export const contractFromEstimatePDFTool = new ContractFromEstimatePDFTool();
