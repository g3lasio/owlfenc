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

// Endpoint para generar un PDF a partir de contenido HTML
router.post('/generate', upload.none(), async (req, res) => {
  try {
    console.log('Recibida solicitud para generar PDF');
    
    const { html, filename = 'document.pdf' } = req.body;
    
    if (!html) {
      console.log('Error: No se proporcionó contenido HTML');
      return res.status(400).json({ error: 'No se proporcionó contenido HTML' });
    }
    
    console.log('Generando PDF avanzado con contenido HTML, longitud:', html.length);
    
    // Verificar que el servicio avanzado esté disponible y generar PDF
    const isServiceReady = await validateAdvancedPdfService();
    
    let pdfBuffer: Buffer;
    
    if (isServiceReady) {
      console.log('Usando servicio avanzado de PDF con IA...');
      pdfBuffer = await generateAdvancedPDF(html);
    } else {
      console.log('Servicio avanzado no disponible, usando método estándar...');
      pdfBuffer = await generatePDF(html);
    }
    
    console.log('PDF generado correctamente, tamaño:', pdfBuffer.length);
    
    // Para debug, guardar una copia en el sistema de archivos
    if (process.env.NODE_ENV !== 'production') {
      const savedPath = savePDFToFileSystem(pdfBuffer, `debug-${Date.now()}.pdf`);
      console.log('PDF guardado para debug en:', savedPath);
    }
    
    // Establecer cabeceras para la descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    console.log('Enviando PDF como respuesta...');
    
    // Enviar el PDF como respuesta
    res.send(pdfBuffer);
    console.log('PDF enviado con éxito');
  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ 
      error: 'Error al generar el PDF',
      details: error instanceof Error ? error.message : 'Error desconocido' 
    });
  }
});

// Endpoint para verificar el estado del servicio de PDF
router.get('/status', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;