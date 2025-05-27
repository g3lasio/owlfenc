/**
 * Servicio PDFMonkey para generación de PDFs con template específico
 * Template ID: 2E4DC55E-044E-4FD3-B511-FEBF950071FA
 */

export interface EstimateData {
  estimateNumber?: string;
  date?: string;
  validUntil?: string;
  clientName?: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  items?: Array<{
    name: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal?: number;
  discount?: number;
  tax?: number;
  taxPercentage?: number;
  total?: number;
  projectDescription?: string;
  notes?: string;
}

export interface PDFMonkeyResponse {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  documentId?: string;
}

class PDFMonkeyService {
  private readonly apiKey: string;
  private readonly templateId = '2E4DC55E-044E-4FD3-B511-FEBF950071FA';
  private readonly baseUrl = 'https://api.pdfmonkey.io/api/v1';

  constructor() {
    this.apiKey = import.meta.env.VITE_PDFMONKEY_API_KEY || '';
  }

  /**
   * Mapea los datos del estimado a los campos específicos del template de PDFMonkey
   */
  private mapEstimateDataToTemplate(data: EstimateData) {
    const currentDate = new Date().toLocaleDateString('en-US');
    const validUntilDate = data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US');

    return {
      // Campos del header
      estimate_no: data.estimateNumber || `EST-${Date.now()}`,
      date: data.date || currentDate,
      valid_until: validUntilDate,
      
      // Información del cliente
      client: data.clientName || '',
      address: data.clientAddress || '',
      email: data.clientEmail || '',
      phone: data.clientPhone || '',
      
      // Items del estimado - array de objetos para la tabla
      items: (data.items || []).map(item => ({
        item: item.name,
        description: item.description,
        qty: item.quantity.toString(),
        unit: item.unit,
        unit_price: `$${(item.unitPrice / 100).toFixed(2)}`,
        total: `$${(item.totalPrice / 100).toFixed(2)}`
      })),
      
      // Totales
      subtotal: `$${((data.subtotal || 0) / 100).toFixed(2)}`,
      discount: `$${((data.discount || 0) / 100).toFixed(2)}`,
      tax_percentage: `${data.taxPercentage || 0}%`,
      tax: `$${((data.tax || 0) / 100).toFixed(2)}`,
      total: `$${((data.total || 0) / 100).toFixed(2)}`,
      
      // Descripción del proyecto
      project_description: data.projectDescription || '',
      notes: data.notes || ''
    };
  }

  /**
   * Genera PDF usando PDFMonkey
   */
  async generatePDF(estimateData: EstimateData): Promise<PDFMonkeyResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'PDFMonkey API key not configured'
      };
    }

    try {
      console.log('🐒 [PDFMonkey] Iniciando generación de PDF...');
      
      const templateData = this.mapEstimateDataToTemplate(estimateData);
      
      console.log('🐒 [PDFMonkey] Datos mapeados:', templateData);

      const response = await fetch(`${this.baseUrl}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: {
            document_template_id: this.templateId,
            payload: templateData,
            meta: {
              _filename: `estimate-${templateData.estimate_no}.pdf`
            }
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🐒 [PDFMonkey] Error HTTP:', response.status, errorText);
        return {
          success: false,
          error: `PDFMonkey API error: ${response.status} - ${errorText}`
        };
      }

      const result = await response.json();
      console.log('🐒 [PDFMonkey] Respuesta exitosa:', result);

      if (result.document && result.document.download_url) {
        return {
          success: true,
          downloadUrl: result.document.download_url,
          documentId: result.document.id
        };
      } else {
        return {
          success: false,
          error: 'PDFMonkey response missing download URL'
        };
      }

    } catch (error) {
      console.error('🐒 [PDFMonkey] Error de conexión:', error);
      return {
        success: false,
        error: `PDFMonkey connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Verifica el estado de un documento
   */
  async checkDocumentStatus(documentId: string): Promise<{success: boolean; status?: string; downloadUrl?: string}> {
    if (!this.apiKey || !documentId) {
      return { success: false };
    }

    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        return { success: false };
      }

      const result = await response.json();
      return {
        success: true,
        status: result.document?.status,
        downloadUrl: result.document?.download_url
      };

    } catch (error) {
      console.error('🐒 [PDFMonkey] Error checking status:', error);
      return { success: false };
    }
  }
}

export const pdfMonkeyService = new PDFMonkeyService();