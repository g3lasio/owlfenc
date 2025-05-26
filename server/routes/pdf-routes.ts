/**
 * Rutas para el servicio de generación de PDF
 */

import express from 'express';
import multer from 'multer';
import { generatePDF, savePDFToFileSystem } from '../services/pdfService';
import { generateAdvancedPDF, validateAdvancedPdfService } from '../services/advancedPdfService';

const router = express.Router();

// Configurar multer para parsear el FormData
const upload = multer({ storage: multer.memoryStorage() });

// 🚀 NUEVO SISTEMA PDF RÁPIDO - Reemplaza sistema lento anterior
router.post('/generate', upload.none(), async (req, res) => {
  const startTime = Date.now();
  console.log('🐒 [PDFMONKEY] Nueva solicitud interceptada - Usando servicio profesional');

  try {
    const { html, title, estimateId, type = 'estimate' } = req.body;

    if (!html) {
      return res.status(400).json({
        success: false,
        error: 'HTML requerido para generar PDF'
      });
    }

    console.log(`📄 [PDFMONKEY] Generando PDF profesional - Tamaño HTML: ${html.length} caracteres`);

    // 🐒 USAR PDFMONKEY - Sistema profesional y estable
    const { pdfMonkeyService } = await import('../services/PDFMonkeyService');
    
    let result;
    if (type === 'contract') {
      result = await pdfMonkeyService.generateContractPdf(html, estimateId || 'contract');
    } else {
      result = await pdfMonkeyService.generateEstimatePdf(html, estimateId || 'estimate');
    }

    if (!result.success) {
      console.error('❌ [FAST-PDF] Error generando PDF:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Error desconocido'
      });
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ [FAST-PDF] PDF generado exitosamente en ${totalTime}ms (vs 38 segundos anterior)`);
    console.log(`📊 [FAST-PDF] Mejora de velocidad: ${Math.round(38000/totalTime)}x más rápido`);

    // Configurar headers para descarga
    const filename = title ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf` : 'documento.pdf';
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', result.buffer!.length);
    res.setHeader('X-Generation-Time', totalTime.toString());
    res.setHeader('X-Processing-Time', result.processingTime.toString());

    console.log('✅ [FAST-PDF] Enviando PDF optimizado...');
    
    // Enviar el PDF
    res.send(result.buffer);
    console.log('🎯 [FAST-PDF] PDF enviado exitosamente');
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ [FAST-PDF] Error inesperado:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      processingTime: totalTime
    });
  }
});

// Endpoint para verificar el estado del servicio de PDF
router.get('/status', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;