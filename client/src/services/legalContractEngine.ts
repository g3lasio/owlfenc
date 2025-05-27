/**
 * Motor de Abogado Defensor Digital
 * 
 * Servicio especializado que genera contratos legales completos basados en estimados aprobados,
 * actuando como defensor legal del contratista mediante análisis inteligente con Anthropic AI.
 */

import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true
});

interface EstimateData {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  projectAddress: string;
  projectType: string;
  projectDescription: string;
  totalAmount: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  laborCost?: number;
  materialCost?: number;
  timeline?: string;
  contractorName: string;
  contractorAddress: string;
  contractorLicense?: string;
  state: string;
  createdAt: Date;
}

interface ContractGenerationOptions {
  includePermitClause: boolean;
  includeWarrantyTerms: boolean;
  paymentSchedule: 'upfront' | 'milestone' | 'completion';
  disputeResolution: 'arbitration' | 'mediation' | 'court';
}

export class LegalContractEngine {
  
  /**
   * Genera un contrato legal completo basado en un estimado aprobado
   */
  static async generateContractFromEstimate(
    estimateData: EstimateData, 
    options: Partial<ContractGenerationOptions> = {}
  ): Promise<string> {
    try {
      const defaultOptions: ContractGenerationOptions = {
        includePermitClause: true,
        includeWarrantyTerms: true,
        paymentSchedule: 'milestone',
        disputeResolution: 'arbitration',
        ...options
      };

      const prompt = this.buildContractPrompt(estimateData, defaultOptions);
      
      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        temperature: 0.1, // Baja temperatura para consistencia legal
        system: this.getLegalSystemPrompt(),
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const contractContent = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Formatear el contrato con estructura HTML profesional
      return this.formatContractAsHTML(contractContent, estimateData);

    } catch (error) {
      console.error('Error generating contract from estimate:', error);
      throw new Error('No se pudo generar el contrato. Verifica la configuración de Anthropic API.');
    }
  }

  /**
   * Sistema de instrucciones para el abogado defensor digital
   */
  private static getLegalSystemPrompt(): string {
    return `
    Eres un abogado especializado en construcción y contratos de servicios, actuando como defensor digital del contratista.

    TU MISIÓN:
    - Proteger los intereses legales del contratista en todos los aspectos
    - Generar contratos jurídicamente sólidos y ejecutables
    - Incorporar cláusulas de protección específicas para el tipo de proyecto
    - Asegurar cumplimiento de regulaciones estatales y locales
    - Minimizar riesgos de disputas y responsabilidades excesivas

    PRINCIPIOS LEGALES:
    1. Protección contra cambios de alcance no autorizados
    2. Términos de pago claros y protegidos
    3. Limitación de responsabilidad razonable
    4. Transferencia adecuada de riesgos al cliente
    5. Cláusulas de fuerza mayor y condiciones imprevistas
    6. Resolución eficiente de disputas

    FORMATO DE SALIDA:
    - Lenguaje legal claro pero profesional
    - Estructura de contrato estándar
    - Cláusulas numeradas y organizadas
    - Terminología específica de construcción
    - Adaptado a la jurisdicción del proyecto
    `;
  }

  /**
   * Construye el prompt específico para generar el contrato
   */
  private static buildContractPrompt(estimateData: EstimateData, options: ContractGenerationOptions): string {
    const projectItems = estimateData.items.map(item => 
      `- ${item.description}: ${item.quantity} unidades a $${item.unitPrice} = $${item.total}`
    ).join('\n');

    return `
    GENERAR CONTRATO DE SERVICIOS DE CONSTRUCCIÓN

    DATOS DEL PROYECTO:
    Cliente: ${estimateData.clientName}
    Email: ${estimateData.clientEmail}
    Teléfono: ${estimateData.clientPhone || 'No proporcionado'}
    Dirección del Proyecto: ${estimateData.projectAddress}
    Estado/Jurisdicción: ${estimateData.state}

    CONTRATISTA:
    Nombre: ${estimateData.contractorName}
    Dirección: ${estimateData.contractorAddress}
    Licencia: ${estimateData.contractorLicense || 'Por verificar'}

    DETALLES DEL PROYECTO:
    Tipo: ${estimateData.projectType}
    Descripción: ${estimateData.projectDescription}
    Valor Total: $${estimateData.totalAmount.toLocaleString()}
    Cronograma: ${estimateData.timeline || 'A determinar'}

    ELEMENTOS DEL TRABAJO:
    ${projectItems}

    CONFIGURACIÓN DEL CONTRATO:
    - Incluir cláusula de permisos: ${options.includePermitClause ? 'SÍ' : 'NO'}
    - Incluir términos de garantía: ${options.includeWarrantyTerms ? 'SÍ' : 'NO'}
    - Esquema de pago: ${options.paymentSchedule}
    - Resolución de disputas: ${options.disputeResolution}

    GENERAR UN CONTRATO COMPLETO QUE INCLUYA:

    1. ENCABEZADO Y PARTES
    2. DESCRIPCIÓN DEL TRABAJO (basada en el estimado)
    3. TÉRMINOS DE PAGO (protegidos para el contratista)
    4. CRONOGRAMA Y PLAZOS
    5. RESPONSABILIDADES DE CADA PARTE
    6. CLÁUSULAS DE PROTECCIÓN:
       - Cambios de alcance
       - Condiciones del sitio
       - Permisos y regulaciones
       - Limitación de responsabilidad
       - Fuerza mayor
    7. GARANTÍAS RAZONABLES
    8. RESOLUCIÓN DE DISPUTAS
    9. TERMINACIÓN DEL CONTRATO
    10. FIRMAS Y FECHA

    ENFOQUE ESPECIAL EN:
    - Proteger al contratista de riesgos excesivos
    - Asegurar pagos puntuales
    - Limitar responsabilidad por condiciones imprevistas
    - Transferir responsabilidad de permisos apropiadamente
    - Incluir cláusulas específicas para ${estimateData.projectType} en ${estimateData.state}

    El contrato debe ser profesional, ejecutable y favorecer la protección legal del contratista.
    `;
  }

  /**
   * Formatea el contrato generado como HTML profesional
   */
  private static formatContractAsHTML(contractContent: string, estimateData: EstimateData): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Construction Services Contract - ${estimateData.clientName}</title>
        <style>
            body {
                font-family: 'Times New Roman', serif;
                line-height: 1.6;
                max-width: 8.5in;
                margin: 0 auto;
                padding: 1in;
                background: white;
                color: #000;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .title {
                font-size: 24px;
                font-weight: bold;
                text-transform: uppercase;
                margin-bottom: 10px;
            }
            .subtitle {
                font-size: 14px;
                color: #666;
            }
            .section {
                margin-bottom: 25px;
            }
            .section-title {
                font-size: 16px;
                font-weight: bold;
                text-transform: uppercase;
                border-bottom: 1px solid #ccc;
                padding-bottom: 5px;
                margin-bottom: 15px;
            }
            .clause {
                margin-bottom: 15px;
                text-align: justify;
            }
            .signature-section {
                margin-top: 50px;
                display: flex;
                justify-content: space-between;
            }
            .signature-block {
                width: 45%;
                text-align: center;
            }
            .signature-line {
                border-bottom: 1px solid #000;
                height: 40px;
                margin-bottom: 5px;
            }
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #ccc;
                padding-top: 15px;
            }
            @media print {
                body { margin: 0; padding: 0.5in; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">Construction Services Contract</div>
            <div class="subtitle">
                Generated on ${currentDate}<br>
                Project: ${estimateData.projectType} - ${estimateData.projectAddress}
            </div>
        </div>

        <div class="content">
            ${contractContent.replace(/\n\n/g, '</div><div class="clause">').replace(/\n/g, '<br>')}
        </div>

        <div class="signature-section">
            <div class="signature-block">
                <div class="signature-line"></div>
                <strong>${estimateData.contractorName}</strong><br>
                Contractor<br>
                Date: _______________
            </div>
            <div class="signature-block">
                <div class="signature-line"></div>
                <strong>${estimateData.clientName}</strong><br>
                Client<br>
                Date: _______________
            </div>
        </div>

        <div class="footer">
            This contract was generated by the Legal Contract Engine<br>
            Based on approved estimate #${estimateData.id}
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Genera análisis de riesgo legal para el proyecto
   */
  static async analyzeLegalRisks(estimateData: EstimateData): Promise<string> {
    try {
      const prompt = `
      Analiza los riesgos legales del siguiente proyecto de construcción desde la perspectiva del contratista:

      PROYECTO: ${estimateData.projectType}
      UBICACIÓN: ${estimateData.projectAddress}, ${estimateData.state}
      VALOR: $${estimateData.totalAmount.toLocaleString()}
      DESCRIPCIÓN: ${estimateData.projectDescription}

      PROPORCIONA:
      1. Riesgos legales específicos identificados
      2. Nivel de riesgo (Alto/Medio/Bajo)
      3. Cláusulas de protección recomendadas
      4. Consideraciones especiales para ${estimateData.state}
      5. Recomendaciones de seguros o bonos

      Formato: Lista clara y accionable para el contratista.
      `;

      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';

    } catch (error) {
      console.error('Error analyzing legal risks:', error);
      return 'Análisis de riesgo no disponible temporalmente.';
    }
  }

  /**
   * Convierte el contrato HTML a PDF (preparación para implementación futura)
   */
  static async generatePDFContract(htmlContent: string): Promise<Blob> {
    // TODO: Implementar conversión HTML a PDF
    // Por ahora retornamos el HTML como blob para descarga
    return new Blob([htmlContent], { type: 'text/html' });
  }
}