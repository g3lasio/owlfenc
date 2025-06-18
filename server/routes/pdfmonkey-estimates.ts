/**
 * Rutas específicas para PDFMonkey con template de estimados
 * Template ID: 2E4DC55E-044E-4FD3-B511-FEBF950071FA
 */

import express from 'express';
import axios from 'axios';
import { storage } from '../storage';

const router = express.Router();

interface EstimateData {
  estimateNumber?: string;
  date?: string;
  validUntil?: string;
  clientName?: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  contractorCompanyName?: string;
  contractorAddress?: string;
  contractorPhone?: string;
  contractorEmail?: string;
  contractorLicense?: string;
  items?: Array<{
    name: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice?: number;
    total?: number;
  }>;
  subtotal?: number;
  discount?: number;
  discountType?: string;
  discountValue?: number;
  tax?: number;
  taxRate?: number;
  taxPercentage?: number;
  total?: number;
  projectDescription?: string;
  notes?: string;
  userId?: number;
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
    
    // Contractor information
    contractor_company: data.contractorCompanyName || '',
    contractor_address: data.contractorAddress || '',
    contractor_phone: data.contractorPhone || '',
    contractor_email: data.contractorEmail || '',
    contractor_license: data.contractorLicense || '',
    
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
      unit_price: `$${(item.unitPrice || 0).toFixed(2)}`,
      total: `$${(item.total || item.totalPrice || 0).toFixed(2)}`
    })),
    
    // Totals
    subtotal: `$${(data.subtotal || 0).toFixed(2)}`,
    discount: `$${(data.discount || 0).toFixed(2)}`,
    tax_percentage: `${data.taxRate || data.taxPercentage || 0}%`,
    tax: `$${(data.tax || 0).toFixed(2)}`,
    total: `$${(data.total || 0).toFixed(2)}`,
    
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
  `- ${item.name}: ${item.description} | Cantidad: ${item.quantity} ${item.unit} | Precio unitario: $${(item.unitPrice || 0).toFixed(2)} | Total: $${(item.total || item.totalPrice || 0).toFixed(2)}`
).join('\n')}

TOTALES:
- Subtotal: $${(estimateData.subtotal || 0).toFixed(2)}
- Descuento: $${(estimateData.discount || 0).toFixed(2)}
- Impuestos (${estimateData.taxRate || estimateData.taxPercentage || 0}%): $${(estimateData.tax || 0).toFixed(2)}
- Total: $${(estimateData.total || 0).toFixed(2)}

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
    
    // Obtener información del contratista desde la base de datos
    let contractorData = null;
    if (estimateData.userId) {
      try {
        const user = await storage.getUser(estimateData.userId);
        if (user) {
          contractorData = {
            companyName: user.companyName || 'Owl Fenc',
            address: `${user.address || '2901 Owens Court'}, ${user.city || 'Fairfield'}, ${user.state || 'California'} ${user.zipCode || '94534'}`,
            phone: user.phone || '202 549 3519',
            email: user.email || 'info@owlfenc.com',
            license: user.licenseNumber || ''
          };
        }
      } catch (error) {
        console.log('⚠️ [PDFMonkey Estimates] Error obteniendo datos del usuario, usando datos por defecto');
      }
    }
    
    // Si no se pudo obtener datos del usuario, usar datos por defecto del perfil actual
    if (!contractorData) {
      contractorData = {
        companyName: 'Owl Fenc',
        address: '2901 Owens Court, Fairfield, California 94534',
        phone: '202 549 3519',
        email: 'info@chyrris.com',
        license: ''
      };
    }
    
    // Combinar datos del estimado con información del contratista
    const enrichedEstimateData = {
      ...estimateData,
      contractorCompanyName: contractorData.companyName,
      contractorAddress: contractorData.address,
      contractorPhone: contractorData.phone,
      contractorEmail: contractorData.email,
      contractorLicense: contractorData.license
    };
    
    if (!pdfMonkeyApiKey) {
      console.log('⚠️ [PDFMonkey Estimates] API key no encontrada, usando fallback...');
      return await handleFallback(enrichedEstimateData, res);
    }

    // Paso 1: Intentar con PDFMonkey
    try {
      console.log('🐒 [PDFMonkey Estimates] Mapeando datos para template específico...');
      const templateData = mapEstimateDataToTemplate(enrichedEstimateData);
      
      console.log('🐒 [PDFMonkey Estimates] Datos mapeados:', JSON.stringify(templateData, null, 2));

      // Usar endpoint asíncrono para evitar timeouts y obtener URL directa
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
        timeout: 10000  // Reducir timeout inicial
      });

      if (response.data?.document) {
        const document = response.data.document;
        
        // Si ya tiene URL de descarga, devolver inmediatamente
        if (document.download_url) {
          console.log('✅ [PDFMonkey Estimates] PDF listo inmediatamente');
          return res.json({
            success: true,
            downloadUrl: document.download_url,
            method: 'pdfmonkey',
            documentId: document.id
          });
        }
        
        // Si no, esperar a que esté listo (máximo 3 intentos)
        if (document.id) {
          console.log('🔄 [PDFMonkey Estimates] Esperando procesamiento del documento...');
          
          for (let attempt = 1; attempt <= 3; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
            
            try {
              const statusResponse = await axios.get(`https://api.pdfmonkey.io/api/v1/documents/${document.id}`, {
                headers: {
                  'Authorization': `Bearer ${pdfMonkeyApiKey}`
                },
                timeout: 5000
              });
              
              const updatedDoc = statusResponse.data?.document;
              
              if (updatedDoc?.download_url) {
                console.log(`✅ [PDFMonkey Estimates] PDF listo después de ${attempt} intentos`);
                return res.json({
                  success: true,
                  downloadUrl: updatedDoc.download_url,
                  method: 'pdfmonkey',
                  documentId: updatedDoc.id
                });
              }
              
              if (updatedDoc?.status === 'error') {
                console.log('❌ [PDFMonkey Estimates] Error en procesamiento:', updatedDoc.error);
                throw new Error(`PDFMonkey processing error: ${updatedDoc.error}`);
              }
              
              console.log(`⏳ [PDFMonkey Estimates] Intento ${attempt}/3 - Estado: ${updatedDoc?.status}`);
              
            } catch (statusError) {
              console.log(`⚠️ [PDFMonkey Estimates] Error verificando estado (intento ${attempt}):`, statusError);
              if (attempt === 3) {
                throw new Error('PDFMonkey status check failed after 3 attempts');
              }
            }
          }
        }
        
        throw new Error('PDFMonkey document not ready after waiting');
      } else {
        throw new Error('PDFMonkey response missing document');
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
    
    if (!html || html.length < 100) {
      throw new Error('Claude failed to generate valid HTML');
    }

    console.log('🤖 [Claude Fallback] HTML generado exitosamente, convirtiendo a PDF...');

    // Usar un método de conversión más simple y confiable
    const puppeteer = await import('puppeteer');
    
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      
      // Configurar el tamaño de página
      await page.setViewport({ width: 1200, height: 1600 });
      
      // Cargar HTML y esperar a que se renderice
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Generar PDF con configuración optimizada
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });
      
      console.log('✅ [Claude Fallback] PDF generado exitosamente con Puppeteer');
      
      // Enviar PDF como respuesta
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="estimate-${estimateData.estimateNumber || Date.now()}.pdf"`);
      res.send(pdfBuffer);
      
    } finally {
      if (browser) {
        await browser.close();
      }
    }

  } catch (fallbackError) {
    console.error('❌ [Claude Fallback] Error:', fallbackError);
    
    // Último recurso: generar un PDF simple con los datos básicos
    try {
      console.log('📄 [Last Resort] Generando PDF básico de emergencia...');
      
      const basicHtml = generateBasicFallbackHTML(estimateData);
      const puppeteer = await import('puppeteer');
      
      let browser;
      try {
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(basicHtml);
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="estimate-basic-${Date.now()}.pdf"`);
        res.send(pdfBuffer);
        
        console.log('✅ [Last Resort] PDF básico generado exitosamente');
        
      } finally {
        if (browser) {
          await browser.close();
        }
      }
      
    } catch (lastResortError) {
      console.error('❌ [Last Resort] Error final:', lastResortError);
      res.status(500).json({
        success: false,
        error: 'All PDF generation methods failed',
        method: 'complete-failure'
      });
    }
  }
}

// Función para generar HTML básico de emergencia
function generateBasicFallbackHTML(estimateData: EstimateData): string {
  const currentDate = new Date().toLocaleDateString('en-US');
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Estimate ${estimateData.estimateNumber || 'DRAFT'}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { border-bottom: 3px solid #00BCD4; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #00BCD4; font-size: 24px; font-weight: bold; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .section { background: #f9f9f9; padding: 15px; border-radius: 5px; }
        .label { font-weight: bold; color: #555; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #00BCD4; color: white; }
        .total { font-size: 18px; font-weight: bold; color: #00BCD4; text-align: right; }
        .footer { margin-top: 40px; text-align: center; color: #00BCD4; font-style: italic; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">ESTIMATE</div>
        <div>No: ${estimateData.estimateNumber || `EST-${Date.now()}`}</div>
        <div>Date: ${estimateData.date || currentDate}</div>
    </div>
    
    <div class="info-grid">
        <div class="section">
            <div class="label">Client Information:</div>
            <div>Name: ${estimateData.clientName || 'N/A'}</div>
            <div>Address: ${estimateData.clientAddress || 'N/A'}</div>
            <div>Email: ${estimateData.clientEmail || 'N/A'}</div>
            <div>Phone: ${estimateData.clientPhone || 'N/A'}</div>
        </div>
        <div class="section">
            <div class="label">Project Details:</div>
            <div>${estimateData.projectDescription || 'Construction project'}</div>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Unit Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${(estimateData.items || []).map(item => `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unit}</td>
                    <td>$${(item.unitPrice / 100).toFixed(2)}</td>
                    <td>$${(item.totalPrice / 100).toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="total">
        <div>Subtotal: $${((estimateData.subtotal || 0) / 100).toFixed(2)}</div>
        <div>Tax (${estimateData.taxPercentage || 0}%): $${((estimateData.tax || 0) / 100).toFixed(2)}</div>
        <div>TOTAL: $${((estimateData.total || 0) / 100).toFixed(2)}</div>
    </div>
    
    ${estimateData.notes ? `<div style="margin-top: 30px;"><strong>Notes:</strong><br>${estimateData.notes}</div>` : ''}
    
    <div class="footer">
        Building the Future, One Project at a Time.
    </div>
</body>
</html>`;
}

export default router;