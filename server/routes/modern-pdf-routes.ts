/**
 * Rutas optimizadas para generación rápida de PDF
 * Sistema modular reutilizable para estimados y contratos
 */

import { Router } from 'express';
import { modernPdfService } from '../services/ModernPdfService';

const router = Router();

/**
 * Endpoint principal para generación rápida de PDF
 * Reemplaza completamente el sistema anterior
 */
router.post('/generate-pdf', async (req, res) => {
  const startTime = Date.now();
  console.log('🚀 [MODERN-ENDPOINT] Nueva solicitud de PDF recibida');

  try {
    const { html, title, estimateId, type = 'estimate' } = req.body;

    if (!html) {
      return res.status(400).json({
        success: false,
        error: 'HTML requerido para generar PDF'
      });
    }

    console.log(`📄 [MODERN-ENDPOINT] Generando PDF tipo: ${type}`);
    console.log(`📏 [MODERN-ENDPOINT] Tamaño HTML: ${html.length} caracteres`);

    let result;

    // Usar el método específico según el tipo
    if (type === 'contract') {
      result = await modernPdfService.generateContractPdf(html, estimateId || 'contract');
    } else {
      result = await modernPdfService.generateEstimatePdf(html, estimateId || 'estimate');
    }

    if (!result.success) {
      console.error('❌ [MODERN-ENDPOINT] Error generando PDF:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Error desconocido'
      });
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ [MODERN-ENDPOINT] PDF generado exitosamente en ${totalTime}ms`);
    console.log(`📊 [MODERN-ENDPOINT] Tiempo de procesamiento: ${result.processingTime}ms`);
    console.log(`📦 [MODERN-ENDPOINT] Tamaño del PDF: ${result.buffer!.length} bytes`);

    // Configurar headers para descarga
    const filename = title ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf` : 'documento.pdf';
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', result.buffer!.length);
    res.setHeader('X-Generation-Time', totalTime.toString());
    res.setHeader('X-Processing-Time', result.processingTime.toString());

    // Enviar el PDF
    res.send(result.buffer);

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ [MODERN-ENDPOINT] Error inesperado:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      processingTime: totalTime
    });
  }
});

/**
 * Endpoint específico para estimados (compatibilidad)
 */
router.post('/generate-estimate', async (req, res) => {
  console.log('📊 [MODERN-ENDPOINT] Solicitud específica de estimado');
  req.body.type = 'estimate';
  return router.handle(req, res, () => {});
});

/**
 * Endpoint específico para contratos (futuro uso)
 */
router.post('/generate-contract', async (req, res) => {
  console.log('📋 [MODERN-ENDPOINT] Solicitud específica de contrato');
  req.body.type = 'contract';
  return router.handle(req, res, () => {});
});

/**
 * Health check del servicio PDF
 */
router.get('/health', async (req, res) => {
  try {
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test PDF</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .test { color: #007BFF; font-size: 24px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="test">✅ Servicio PDF funcionando correctamente</div>
        <p>Generado: ${new Date().toISOString()}</p>
      </body>
      </html>
    `;

    const startTime = Date.now();
    const result = await modernPdfService.generatePdf({ html: testHtml });
    const processingTime = Date.now() - startTime;

    res.json({
      status: 'healthy',
      service: 'ModernPdfService',
      success: result.success,
      processingTime: `${processingTime}ms`,
      pdfSize: result.buffer ? `${result.buffer.length} bytes` : 'N/A',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'ModernPdfService',
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;