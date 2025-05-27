/**
 * Rutas específicas para PDFMonkey con template de estimados
 * Template ID: 2E4DC55E-044E-4FD3-B511-FEBF950071FA
 */

import express from 'express';
import axios from 'axios';

const router = express.Router();

interface EstimateData {
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

/**
 * Mapea los datos del estimado a los campos específicos del template PDFMonkey
 */
function mapEstimateDataToTemplate(data: EstimateData) {
  const currentDate = new Date().toLocaleDateString('en-US');
  const validUntilDate = data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US');

  return {
    // Header fields
    estimate_no: data.estimateNumber || `EST-${Date.now()}`,
    date: data.date || currentDate,
    valid_until: validUntilDate,
    
    // Client information
    client: data.clientName || '',
    address: data.clientAddress || '',
    email: data.clientEmail || '',
    phone: data.clientPhone || '',
    
    // Items array for table
    items: (data.items || []).map(item => ({
      item: item.name,
      description: item.description,
      qty: item.quantity.toString(),
      unit: item.unit,
      unit_price: `$${(item.unitPrice / 100).toFixed(2)}`,
      total: `$${(item.totalPrice / 100).toFixed(2)}`
    })),
    
    // Totals
    subtotal: `$${((data.subtotal || 0) / 100).toFixed(2)}`,
    discount: `$${((data.discount || 0) / 100).toFixed(2)}`,
    tax_percentage: `${data.taxPercentage || 0}%`,
    tax: `$${((data.tax || 0) / 100).toFixed(2)}`,
    total: `$${((data.total || 0) / 100).toFixed(2)}`,
    
    // Project description
    project_description: data.projectDescription || '',
    notes: data.notes || ''
  };
}

/**
 * Genera HTML con Claude como fallback
 */
async function generateFallbackHTML(estimateData: EstimateData): Promise<string> {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!anthropicApiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const currentDate = new Date().toLocaleDateString('en-US');
  const validUntilDate = estimateData.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US');

  const prompt = `Genera un documento HTML profesional para un estimado de construcción con el siguiente formato y datos:

DATOS DEL ESTIMADO:
- Número: ${estimateData.estimateNumber || `EST-${Date.now()}`}
- Fecha: ${estimateData.date || currentDate}
- Válido hasta: ${validUntilDate}

CLIENTE:
- Nombre: ${estimateData.clientName || 'Cliente'}
- Dirección: ${estimateData.clientAddress || ''}
- Email: ${estimateData.clientEmail || ''}
- Teléfono: ${estimateData.clientPhone || ''}

ITEMS:
${(estimateData.items || []).map(item => 
  `- ${item.name}: ${item.description} | Cantidad: ${item.quantity} ${item.unit} | Precio unitario: $${(item.unitPrice / 100).toFixed(2)} | Total: $${(item.totalPrice / 100).toFixed(2)}`
).join('\n')}

TOTALES:
- Subtotal: $${((estimateData.subtotal || 0) / 100).toFixed(2)}
- Descuento: $${((estimateData.discount || 0) / 100).toFixed(2)}
- Impuestos (${estimateData.taxPercentage || 0}%): $${((estimateData.tax || 0) / 100).toFixed(2)}
- Total: $${((estimateData.total || 0) / 100).toFixed(2)}

DESCRIPCIÓN DEL PROYECTO: ${estimateData.projectDescription || ''}
NOTAS: ${estimateData.notes || ''}

REQUERIMIENTOS:
1. Crea un HTML completo y profesional que replique exactamente el diseño turquesa/cyan
2. Usa colores turquesa/cyan (#00BCD4) para elementos destacados
3. Incluye todas las secciones: header, información del cliente, tabla de items, totales, y descripción del proyecto
4. Usa tipografía limpia y espaciado profesional
5. El documento debe ser listo para conversión a PDF
6. Incluye el footer "Building the Future, One Project at a Time."
7. Usa estilos CSS inline para máxima compatibilidad

Responde ÚNICAMENTE con el código HTML completo, sin explicaciones adicionales.`;

  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  }, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01'
    }
  });

  return response.data.content?.[0]?.text || '';
}

// POST /api/pdfmonkey-estimates/generate - Genera PDF con PDFMonkey usando template específico
router.post('/generate', async (req, res) => {
  try {
    console.log('🚀 [PDFMonkey Estimates] Iniciando generación con template específico...');
    
    const estimateData: EstimateData = req.body;
    const pdfMonkeyApiKey = process.env.PDFMONKEY_API_KEY;
    
    if (!pdfMonkeyApiKey) {
      console.log('⚠️ [PDFMonkey Estimates] API key no encontrada, usando fallback...');
      return await handleFallback(estimateData, res);
    }

    // Paso 1: Intentar con PDFMonkey
    try {
      console.log('🐒 [PDFMonkey Estimates] Mapeando datos para template específico...');
      const templateData = mapEstimateDataToTemplate(estimateData);
      
      console.log('🐒 [PDFMonkey Estimates] Datos mapeados:', JSON.stringify(templateData, null, 2));

      const response = await axios.post('https://api.pdfmonkey.io/api/v1/documents', {
        document: {
          document_template_id: '2E4DC55E-044E-4FD3-B511-FEBF950071FA',
          payload: templateData,
          meta: {
            _filename: `estimate-${templateData.estimate_no}.pdf`
          }
        }
      }, {
        headers: {
          'Authorization': `Bearer ${pdfMonkeyApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data?.document?.download_url) {
        console.log('✅ [PDFMonkey Estimates] PDF generado exitosamente con template específico');
        return res.json({
          success: true,
          downloadUrl: response.data.document.download_url,
          method: 'pdfmonkey',
          documentId: response.data.document.id
        });
      } else {
        throw new Error('PDFMonkey response missing download URL');
      }

    } catch (pdfMonkeyError) {
      console.log('⚠️ [PDFMonkey Estimates] PDFMonkey falló, activando fallback de Claude...');
      console.error('🐒 [PDFMonkey Estimates] Error:', pdfMonkeyError);
      return await handleFallback(estimateData, res);
    }

  } catch (error) {
    console.error('❌ [PDFMonkey Estimates] Error general:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Función auxiliar para manejar el fallback con Claude
async function handleFallback(estimateData: EstimateData, res: express.Response) {
  try {
    console.log('🤖 [Claude Fallback] Generando HTML con Claude Sonnet 3.7...');
    
    const html = await generateFallbackHTML(estimateData);
    
    if (!html) {
      throw new Error('Claude failed to generate HTML');
    }

    console.log('🤖 [Claude Fallback] HTML generado exitosamente, convirtiendo a PDF...');

    // Importar el servicio PDF existente para conversión
    const { pdfMonkeyService } = await import('../services/PDFMonkeyService');
    
    const pdfResult = await pdfMonkeyService.generatePdf(html, {
      title: `Estimado-${estimateData.estimateNumber || Date.now()}`,
      filename: `estimate-${estimateData.estimateNumber || Date.now()}.pdf`
    });

    if (pdfResult.success && pdfResult.buffer) {
      console.log('✅ [Claude Fallback] PDF generado exitosamente');
      
      // Enviar PDF como respuesta
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="estimate-${estimateData.estimateNumber || Date.now()}.pdf"`);
      res.send(pdfResult.buffer);
    } else {
      throw new Error(pdfResult.error || 'PDF generation failed');
    }

  } catch (fallbackError) {
    console.error('❌ [Claude Fallback] Error:', fallbackError);
    res.status(500).json({
      success: false,
      error: 'Both PDFMonkey and Claude fallback failed',
      method: 'fallback-failed'
    });
  }
}

export default router;