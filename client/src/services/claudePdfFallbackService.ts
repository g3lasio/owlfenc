/**
 * Servicio de fallback para generación de PDFs usando Claude Sonnet 3.7
 * Se activa cuando PDFMonkey falla o no responde
 */

import { EstimateData } from './pdfMonkeyService';

export interface ClaudePDFResponse {
  success: boolean;
  html?: string;
  error?: string;
}

class ClaudePdfFallbackService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor() {
    this.apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
  }

  /**
   * Genera HTML profesional para el estimado usando Claude Sonnet 3.7
   */
  async generateEstimateHTML(estimateData: EstimateData): Promise<ClaudePDFResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Anthropic API key not configured'
      };
    }

    try {
      console.log('🤖 [Claude Fallback] Generando HTML con Claude Sonnet 3.7...');

      const prompt = this.buildPrompt(estimateData);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🤖 [Claude Fallback] Error HTTP:', response.status, errorText);
        return {
          success: false,
          error: `Claude API error: ${response.status}`
        };
      }

      const result = await response.json();
      const htmlContent = result.content?.[0]?.text;

      if (!htmlContent) {
        return {
          success: false,
          error: 'Claude response missing HTML content'
        };
      }

      console.log('🤖 [Claude Fallback] HTML generado exitosamente');
      
      return {
        success: true,
        html: htmlContent
      };

    } catch (error) {
      console.error('🤖 [Claude Fallback] Error de conexión:', error);
      return {
        success: false,
        error: `Claude connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Construye el prompt para Claude basado en los datos del estimado
   */
  private buildPrompt(data: EstimateData): string {
    const currentDate = new Date().toLocaleDateString('en-US');
    const validUntilDate = data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US');

    return `Genera un documento HTML profesional para un estimado de construcción con el siguiente formato y datos:

DATOS DEL ESTIMADO:
- Número: ${data.estimateNumber || `EST-${Date.now()}`}
- Fecha: ${data.date || currentDate}
- Válido hasta: ${validUntilDate}

CLIENTE:
- Nombre: ${data.clientName || 'Cliente'}
- Dirección: ${data.clientAddress || ''}
- Email: ${data.clientEmail || ''}
- Teléfono: ${data.clientPhone || ''}

ITEMS:
${(data.items || []).map(item => 
  `- ${item.name}: ${item.description} | Cantidad: ${item.quantity} ${item.unit} | Precio unitario: $${(item.unitPrice / 100).toFixed(2)} | Total: $${(item.totalPrice / 100).toFixed(2)}`
).join('\n')}

TOTALES:
- Subtotal: $${((data.subtotal || 0) / 100).toFixed(2)}
- Descuento: $${((data.discount || 0) / 100).toFixed(2)}
- Impuestos (${data.taxPercentage || 0}%): $${((data.tax || 0) / 100).toFixed(2)}
- Total: $${((data.total || 0) / 100).toFixed(2)}

DESCRIPCIÓN DEL PROYECTO: ${data.projectDescription || ''}
NOTAS: ${data.notes || ''}

REQUERIMIENTOS:
1. Crea un HTML completo y profesional que replique exactamente el diseño de la imagen adjunta
2. Usa colores turquesa/cyan (#00BCD4) para elementos destacados
3. Incluye todas las secciones: header con datos del estimado, información del cliente, tabla de items, totales, y descripción del proyecto
4. Usa tipografía limpia y espaciado profesional
5. El documento debe ser listo para conversión a PDF
6. Incluye el footer "Building the Future, One Project at a Time."
7. Usa estilos CSS inline para máxima compatibilidad
8. Asegúrate de que la tabla sea responsive y profesional

Responde ÚNICAMENTE con el código HTML completo, sin explicaciones adicionales.`;
  }
}

export const claudePdfFallbackService = new ClaudePdfFallbackService();