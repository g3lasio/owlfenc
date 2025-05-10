import { Router } from 'express';
import type { Express } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { mistralService, DatosExtraidos } from '../services/mistralService';

const router = Router();

// Configuración de Multer para la subida de archivos
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB máx
  },
  fileFilter: (req, file, callback) => {
    // Aceptar solo archivos PDF
    if (file.mimetype !== 'application/pdf') {
      return callback(new Error('Solo se permiten archivos PDF'));
    }
    callback(null, true);
  }
});

// Función para guardar temporalmente el PDF para debugging
const guardarPDFTemporal = (buffer: Buffer): string => {
  const tempDir = path.join(process.cwd(), 'temp');
  
  // Crear directorio si no existe
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const filename = `pdf_${Date.now()}.pdf`;
  const filePath = path.join(tempDir, filename);
  
  fs.writeFileSync(filePath, buffer);
  console.log(`PDF guardado temporalmente en: ${filePath}`);
  
  return filePath;
};

// Ruta para generar contrato a partir de un PDF
router.post('/generar-contrato', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }
    
    // Extraer el buffer del archivo
    const pdfBuffer = req.file.buffer;
    
    // Para debugging, guardar el PDF temporalmente
    const tempPath = guardarPDFTemporal(pdfBuffer);
    
    console.log(`Procesando PDF (${req.file.originalname}, ${req.file.size} bytes)`);
    
    // Verificar que hay una API key configurada
    if (!process.env.MISTRAL_API_KEY) {
      console.error('MISTRAL_API_KEY no está configurada en las variables de entorno');
      return res.status(500).json({ error: 'Error de configuración: API key de Mistral no disponible' });
    }
    
    try {
      // Extraer información del PDF usando Mistral OCR
      const datosExtraidos: DatosExtraidos = await mistralService.extraerInformacionPDF(pdfBuffer);
      
      console.log('Datos extraídos del PDF:', datosExtraidos);
      
      // Generar el contrato HTML
      const contratoHTML = await mistralService.generarContrato(datosExtraidos);
      
      // Retornar los datos extraídos y el contrato generado
      res.status(200).json({
        success: true,
        datos_extraidos: datosExtraidos,
        contrato_html: contratoHTML,
        // No incluimos el PDF base64 para evitar respuestas demasiado grandes
        message: 'Contrato generado exitosamente'
      });
    } catch (mistralError: any) {
      console.error('Error procesando con Mistral AI:', mistralError);
      res.status(500).json({ 
        error: 'Error procesando el PDF con Mistral AI',
        details: mistralError.message || 'Error desconocido'
      });
    }
  } catch (error: any) {
    console.error('Error en la ruta /generar-contrato:', error);
    res.status(500).json({ 
      error: 'Error al generar el contrato',
      details: error.message || 'Error desconocido'
    });
  }
});

// Ruta para solicitar ajustes al contrato
router.post('/ajustar-contrato', async (req, res) => {
  try {
    const { datos_extraidos, ajustes, informacion_adicional, clausulas_adicionales } = req.body;
    
    if (!datos_extraidos) {
      return res.status(400).json({ error: 'Se requieren los datos extraídos del contrato original' });
    }
    
    // Verificar si hay datos que previamente faltaban y ahora se proporcionan
    let datosActualizados = { ...datos_extraidos };
    
    // Actualizar información del cliente si se proporciona
    if (informacion_adicional?.cliente) {
      datosActualizados.cliente = {
        ...datosActualizados.cliente,
        ...informacion_adicional.cliente
      };
    }
    
    // Actualizar información del contratista si se proporciona
    if (informacion_adicional?.contratista) {
      datosActualizados.contratista = {
        ...datosActualizados.contratista,
        ...informacion_adicional.contratista
      };
    }
    
    // Actualizar información del proyecto si se proporciona
    if (informacion_adicional?.proyecto) {
      datosActualizados.proyecto = {
        ...datosActualizados.proyecto,
        ...informacion_adicional.proyecto
      };
    }
    
    // Actualizar información del presupuesto si se proporciona
    if (informacion_adicional?.presupuesto) {
      datosActualizados.presupuesto = {
        ...datosActualizados.presupuesto,
        ...informacion_adicional.presupuesto
      };
    }
    
    // Añadir cláusulas adicionales si se proporcionan
    if (clausulas_adicionales && Array.isArray(clausulas_adicionales) && clausulas_adicionales.length > 0) {
      datosActualizados.clausulasAdicionales = clausulas_adicionales;
    }
    
    console.log('Datos actualizados para el contrato:', JSON.stringify(datosActualizados, null, 2));
    
    // Generar un nuevo contrato con los ajustes
    const contratoHTML = await mistralService.generarContrato(datosActualizados, {
      ajustes: ajustes || [],
      ...informacion_adicional
    });
    
    res.status(200).json({
      success: true,
      contrato_html: contratoHTML,
      datos_actualizados: datosActualizados,
      message: 'Contrato ajustado exitosamente'
    });
  } catch (error: any) {
    console.error('Error ajustando el contrato:', error);
    res.status(500).json({ 
      error: 'Error al ajustar el contrato',
      details: error.message || 'Error desconocido'
    });
  }
});

// Función para registrar las rutas en la aplicación Express
export function registerContractRoutes(app: Express) {
  app.use('/api', router);
}

export default router;