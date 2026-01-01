/**
 * Estimate Data Extractor
 * 
 * Servicio especializado para extraer datos estructurados de PDFs de estimados
 * usando Claude Sonnet Vision con prompts optimizados.
 */

import { ClaudeVisionService, ImageInput } from './ClaudeVisionService';

export interface ExtractedEstimateData {
  // Datos del cliente
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  
  // Datos del proyecto
  projectType?: string;
  projectDescription?: string;
  projectAddress?: string;
  
  // Datos financieros
  totalAmount?: number;
  subtotal?: number;
  tax?: number;
  
  // Fechas
  estimateDate?: string;
  validUntil?: string;
  startDate?: string;
  endDate?: string;
  
  // Otros
  estimateNumber?: string;
  materials?: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    price?: number;
  }>;
  
  // Metadatos de extracción
  confidence: number;
  missingFields: string[];
  extractedText?: string;
}

export class EstimateDataExtractor {
  private visionService: ClaudeVisionService;

  constructor() {
    this.visionService = new ClaudeVisionService();
  }

  /**
   * Extraer datos estructurados de un PDF de estimado
   */
  async extractFromPDF(pdfInput: ImageInput): Promise<ExtractedEstimateData> {
    try {
      console.log('📄 [ESTIMATE-EXTRACTOR] Iniciando extracción de datos...');

      // Construir prompt especializado para extracción estructurada
      const extractionPrompt = this.buildExtractionPrompt();

      // Analizar el PDF
      const result = await this.visionService.analyzeImages({
        images: [pdfInput],
        prompt: extractionPrompt,
        analysisType: 'estimate'
      });

      console.log('✅ [ESTIMATE-EXTRACTOR] Análisis completado');
      console.log('📝 [ESTIMATE-EXTRACTOR] Extrayendo datos estructurados...');

      // Extraer JSON del análisis
      const extractedData = this.parseStructuredData(result.analysis);

      // Validar y enriquecer datos
      const validatedData = this.validateAndEnrich(extractedData);

      console.log('✅ [ESTIMATE-EXTRACTOR] Extracción completada');
      console.log(`📊 [ESTIMATE-EXTRACTOR] Confianza: ${validatedData.confidence * 100}%`);
      console.log(`⚠️  [ESTIMATE-EXTRACTOR] Campos faltantes: ${validatedData.missingFields.join(', ') || 'ninguno'}`);

      return validatedData;

    } catch (error: any) {
      console.error('❌ [ESTIMATE-EXTRACTOR] Error:', error);
      throw new Error(`Error extrayendo datos del estimado: ${error.message}`);
    }
  }

  /**
   * Construir prompt especializado para extracción estructurada
   */
  private buildExtractionPrompt(): string {
    return `Analiza este documento de estimado/presupuesto y extrae TODOS los datos en formato JSON estructurado.

**INSTRUCCIONES CRÍTICAS:**
1. Extrae TODOS los campos que encuentres
2. Si un campo no está presente, usa null
3. Sé preciso con los números (sin símbolos de moneda)
4. Devuelve SOLO el JSON, sin texto adicional

**FORMATO DE RESPUESTA (JSON):**
\`\`\`json
{
  "clientName": "Nombre completo del cliente",
  "clientEmail": "email@cliente.com",
  "clientPhone": "teléfono del cliente",
  "clientAddress": "dirección del cliente",
  "projectType": "tipo de proyecto (fence, deck, patio, etc.)",
  "projectDescription": "descripción completa del alcance del trabajo",
  "projectAddress": "dirección donde se realizará el trabajo",
  "totalAmount": 5000.00,
  "subtotal": 4500.00,
  "tax": 500.00,
  "estimateDate": "2024-12-01",
  "validUntil": "2025-01-01",
  "startDate": "2025-01-15",
  "endDate": "2025-02-15",
  "estimateNumber": "EST-001",
  "materials": [
    {
      "name": "Wood Posts",
      "quantity": 20,
      "unit": "pieces",
      "price": 15.00
    }
  ]
}
\`\`\`

**NOTAS:**
- Para projectType: usa términos como "fence", "deck", "patio", "concrete", "roofing", etc.
- Para fechas: usa formato YYYY-MM-DD
- Para montos: solo números, sin símbolos ($, etc.)
- Si hay múltiples direcciones, usa la del proyecto (no la del cliente)

Analiza el documento y devuelve el JSON:`;
  }

  /**
   * Parsear datos estructurados del análisis
   */
  private parseStructuredData(analysis: string): Partial<ExtractedEstimateData> {
    try {
      // Buscar el bloque JSON en la respuesta
      const jsonMatch = analysis.match(/```json\s*([\s\S]*?)\s*```/) || 
                       analysis.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.warn('⚠️  [ESTIMATE-EXTRACTOR] No se encontró JSON en la respuesta');
        return {};
      }

      const jsonString = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonString);

      return parsed;

    } catch (error) {
      console.error('❌ [ESTIMATE-EXTRACTOR] Error parseando JSON:', error);
      // Intentar extracción manual como fallback
      return this.manualExtraction(analysis);
    }
  }

  /**
   * Extracción manual como fallback
   */
  private manualExtraction(text: string): Partial<ExtractedEstimateData> {
    const data: Partial<ExtractedEstimateData> = {};

    // Extraer email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) data.clientEmail = emailMatch[0];

    // Extraer teléfono
    const phoneMatch = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) data.clientPhone = phoneMatch[0];

    // Extraer monto total
    const amountMatch = text.match(/total[:\s]*\$?([\d,]+\.?\d*)/i);
    if (amountMatch) {
      data.totalAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    return data;
  }

  /**
   * Validar y enriquecer datos extraídos
   */
  private validateAndEnrich(data: Partial<ExtractedEstimateData>): ExtractedEstimateData {
    const missingFields: string[] = [];

    // Campos críticos para generar un contrato
    const criticalFields = [
      'clientName',
      'clientEmail',
      'projectType',
      'projectDescription',
      'projectAddress',
      'totalAmount'
    ];

    // Verificar campos críticos
    criticalFields.forEach(field => {
      if (!data[field as keyof ExtractedEstimateData]) {
        missingFields.push(field);
      }
    });

    // Calcular confianza
    const totalFields = criticalFields.length;
    const foundFields = totalFields - missingFields.length;
    const confidence = foundFields / totalFields;

    return {
      ...data,
      confidence,
      missingFields
    } as ExtractedEstimateData;
  }

  /**
   * Generar mensaje para solicitar campos faltantes
   */
  generateMissingFieldsMessage(data: ExtractedEstimateData): string | null {
    if (data.missingFields.length === 0) {
      return null;
    }

    const fieldLabels: Record<string, string> = {
      clientName: 'nombre del cliente',
      clientEmail: 'email del cliente',
      projectType: 'tipo de proyecto',
      projectDescription: 'descripción del proyecto',
      projectAddress: 'dirección del proyecto',
      totalAmount: 'monto total'
    };

    const missingLabels = data.missingFields
      .map(field => fieldLabels[field] || field)
      .join(', ');

    return `He analizado el estimado, pero necesito que me proporciones la siguiente información para generar el contrato:\n\n${missingLabels}\n\n¿Puedes proporcionarme estos datos?`;
  }
}
