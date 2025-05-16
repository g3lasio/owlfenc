/**
 * Rutas para el servicio de generación de PDF
 */

import express from 'express';
import multer from 'multer';
import { generatePDF, savePDFToFileSystem } from '../services/pdfService';

const router = express.Router();

// Configurar multer para parsear el FormData
const upload = multer({ storage: multer.memoryStorage() });

// Endpoint para generar un PDF a partir de contenido HTML
router.post('/generate', upload.none(), async (req, res) => {
  try {
    const { html, filename = 'document.pdf' } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'No se proporcionó contenido HTML' });
    }
    
    // Generar el PDF
    const pdfBuffer = await generatePDF(html);
    
    // Para debug, guardar una copia en el sistema de archivos
    if (process.env.NODE_ENV !== 'production') {
      savePDFToFileSystem(pdfBuffer, `debug-${Date.now()}.pdf`);
    }
    
    // Establecer cabeceras para la descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Enviar el PDF como respuesta
    res.send(pdfBuffer);
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