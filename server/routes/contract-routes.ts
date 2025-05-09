import { Express, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { mistralService } from '../services/mistralService';
import { documentService } from '../services/documentService';

// Configurar almacenamiento para multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'temp', 'uploads');
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único para evitar colisiones
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro para aceptar solo PDFs
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos PDF'));
  }
};

// Configurar multer
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
});

/**
 * Función para llenar la plantilla de contrato con los datos extraídos y las cláusulas personalizadas
 */
async function fillContractTemplate(extractedData: any, customClauses: string[]): Promise<string> {
  // Template básico para contrato, se puede mejorar o cargar desde un archivo
  const templateHTML = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contrato de Servicios</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #2c5282;
          margin-bottom: 5px;
        }
        .section {
          margin-bottom: 20px;
        }
        .section h2 {
          color: #2c5282;
          border-bottom: 1px solid #ccc;
          padding-bottom: 5px;
        }
        .party-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .party-box {
          width: 48%;
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 5px;
        }
        .clause {
          margin-bottom: 15px;
        }
        .clause-title {
          font-weight: bold;
        }
        .signature-area {
          display: flex;
          justify-content: space-between;
          margin-top: 50px;
        }
        .signature-box {
          width: 45%;
          text-align: center;
        }
        .signature-line {
          border-top: 1px solid #000;
          margin-top: 40px;
          margin-bottom: 10px;
        }
        footer {
          margin-top: 50px;
          text-align: center;
          font-size: 0.8em;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CONTRATO DE SERVICIOS</h1>
        <p>Instalación de Cercas</p>
      </div>
      
      <div class="section">
        <div class="party-info">
          <div class="party-box">
            <h3>CONTRATISTA</h3>
            <p><strong>Nombre:</strong> ${extractedData.contratista?.nombre || 'N/A'}</p>
            <p><strong>Licencia:</strong> ${extractedData.contratista?.licencia || 'N/A'}</p>
            <p><strong>Dirección:</strong> ${extractedData.contratista?.direccion || 'N/A'}</p>
            <p><strong>Teléfono:</strong> ${extractedData.contratista?.telefono || 'N/A'}</p>
            <p><strong>Email:</strong> ${extractedData.contratista?.email || 'N/A'}</p>
          </div>
          
          <div class="party-box">
            <h3>CLIENTE</h3>
            <p><strong>Nombre:</strong> ${extractedData.cliente?.nombre || 'N/A'}</p>
            <p><strong>Dirección:</strong> ${extractedData.cliente?.direccion || 'N/A'}</p>
            <p><strong>Teléfono:</strong> ${extractedData.cliente?.telefono || 'N/A'}</p>
            <p><strong>Email:</strong> ${extractedData.cliente?.email || 'N/A'}</p>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>PROYECTO</h2>
        <p><strong>Dirección de la Obra:</strong> ${extractedData.cliente?.direccion || 'N/A'}</p>
        <p><strong>Tipo de Cerca:</strong> ${extractedData.proyecto?.tipoCerca || 'N/A'}</p>
        <p><strong>Altura:</strong> ${extractedData.proyecto?.altura || 'N/A'} pies</p>
        <p><strong>Longitud Total:</strong> ${extractedData.proyecto?.longitud || 'N/A'} pies</p>
        <p><strong>Características Especiales:</strong> ${extractedData.proyecto?.caracteristicas || 'N/A'}</p>
        <p><strong>Demolición Requerida:</strong> ${extractedData.proyecto?.demolicion ? 'Sí' : 'No'}</p>
        <p><strong>Cantidad y Tipo de Puertas:</strong> ${extractedData.proyecto?.puertas || 'N/A'}</p>
      </div>
      
      <div class="section">
        <h2>PRESUPUESTO</h2>
        <p><strong>Subtotal:</strong> $${extractedData.presupuesto?.subtotal || 'N/A'}</p>
        <p><strong>Impuestos:</strong> $${extractedData.presupuesto?.impuestos || 'N/A'}</p>
        <p><strong>Total:</strong> $${extractedData.presupuesto?.total || 'N/A'}</p>
        <p><strong>Método de Pago:</strong> ${extractedData.presupuesto?.metodoPago || 'N/A'}</p>
        <p><strong>Forma de Pago:</strong> ${extractedData.presupuesto?.formaPago || 'N/A'}</p>
      </div>
      
      <div class="section">
        <h2>FECHAS</h2>
        <p><strong>Fecha de Emisión:</strong> ${extractedData.fechas?.emision || new Date().toLocaleDateString()}</p>
        <p><strong>Validez del Contrato:</strong> ${extractedData.fechas?.validez || '30 días'}</p>
        <p><strong>Tiempo Estimado de Inicio:</strong> ${extractedData.fechas?.inicioEstimado || 'A determinar'}</p>
        <p><strong>Tiempo Estimado de Finalización:</strong> ${extractedData.fechas?.finalizacionEstimada || 'A determinar'}</p>
      </div>
      
      <div class="section">
        <h2>CLÁUSULAS ESPECÍFICAS DEL PROYECTO</h2>
        ${customClauses.map((clause, index) => `
          <div class="clause">
            <p class="clause-title">Cláusula ${index + 1}</p>
            <p>${clause}</p>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>CLÁUSULAS GENERALES</h2>
        <div class="clause">
          <p class="clause-title">Modificaciones</p>
          <p>Cualquier modificación a este contrato deberá hacerse por escrito y estar firmada por ambas partes.</p>
        </div>
        <div class="clause">
          <p class="clause-title">Terminación</p>
          <p>Este contrato puede ser terminado por cualquiera de las partes con previo aviso por escrito de 7 días. En caso de terminación, el cliente deberá pagar por el trabajo ya completado.</p>
        </div>
        <div class="clause">
          <p class="clause-title">Ley Aplicable</p>
          <p>Este contrato se regirá por las leyes del estado donde se realiza la obra.</p>
        </div>
      </div>
      
      <div class="signature-area">
        <div class="signature-box">
          <div class="signature-line"></div>
          <p>Firma del Contratista</p>
          <p>${extractedData.contratista?.nombre || ''}</p>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <p>Firma del Cliente</p>
          <p>${extractedData.cliente?.nombre || ''}</p>
        </div>
      </div>
      
      <footer>
        <p>Este documento constituye un acuerdo legal entre el contratista y el cliente.</p>
      </footer>
    </body>
    </html>
  `;

  return templateHTML;
}

export function registerContractRoutes(app: Express) {
  // Ruta para generar contrato a partir de un PDF subido
  app.post('/api/generar-contrato', upload.single('pdf'), async (req: Request, res: Response) => {
    try {
      // Verificar que se subió un archivo
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se subió ningún archivo PDF' });
      }

      const filePath = req.file.path;
      console.log(`Procesando PDF: ${filePath}`);

      // Añadir logs para mejor diagnóstico
      console.log(`Procesando PDF con tamaño: ${fs.statSync(filePath).size} bytes`);
      console.log(`Tipo MIME del archivo: ${req.file.mimetype}`);
      
      // Prompt para extracción de datos
      const extractionPrompt = `
        Este es un PDF de un estimado de cercas. Por favor, extrae la siguiente información en formato JSON:
        
        1. Cliente:
           - Nombre completo (como "nombre")
           - Dirección (como "direccion")
           - Teléfono (como "telefono")
           - Email (como "email")
        
        2. Proyecto:
           - Tipo de cerca, ej. madera, vinilo, cadena (como "tipoCerca")
           - Altura en pies (como "altura")
           - Longitud total en pies (como "longitud")
           - Características especiales (como "caracteristicas")
           - Demolición requerida (como "demolicion", valor booleano)
           - Cantidad y tipo de puertas (como "puertas")
        
        3. Presupuesto:
           - Subtotal (como "subtotal")
           - Impuestos (como "impuestos")
           - Total (como "total")
           - Método de pago sugerido (como "metodoPago")
           - Forma de pago, ej. depósito inicial, pagos parciales, etc. (como "formaPago")
        
        4. Contratista:
           - Nombre de la empresa (como "nombre")
           - Licencia/Número de registro (como "licencia")
           - Dirección (como "direccion")
           - Teléfono (como "telefono")
           - Email (como "email")
        
        5. Fechas:
           - Fecha de emisión (como "emision")
           - Validez del estimado (como "validez")
           - Tiempo estimado de inicio (como "inicioEstimado")
           - Tiempo estimado de finalización (como "finalizacionEstimada")
        
        Devuelve SOLO un objeto JSON con la estructura:
        {
          "cliente": { nombre, direccion, telefono, email },
          "proyecto": { tipoCerca, altura, longitud, caracteristicas, demolicion, puertas },
          "presupuesto": { subtotal, impuestos, total, metodoPago, formaPago },
          "contratista": { nombre, licencia, direccion, telefono, email },
          "fechas": { emision, validez, inicioEstimado, finalizacionEstimada }
        }
      `;
      
      // Extraer datos del PDF usando Mistral AI con OCR avanzado
      const extractedData = await mistralService.extractDataFromPDF(filePath, extractionPrompt);
      console.log('Datos extraídos del PDF con Mistral:', JSON.stringify(extractedData, null, 2));

      // Generar cláusulas personalizadas basadas en la descripción del proyecto
      const projectDescription = `
        Instalación de cerca tipo ${extractedData.proyecto?.tipoCerca || 'estándar'} 
        de ${extractedData.proyecto?.altura || '6'} pies de altura 
        y ${extractedData.proyecto?.longitud || '100'} pies de longitud
        ${extractedData.proyecto?.caracteristicas ? `con ${extractedData.proyecto.caracteristicas}` : ''}
        ${extractedData.proyecto?.demolicion ? 'con demolición requerida' : 'sin demolición'}
        ${extractedData.proyecto?.puertas ? `incluyendo ${extractedData.proyecto.puertas}` : 'sin puertas adicionales'}
      `;
      
      const customClauses = await mistralService.generateCustomClauses(projectDescription);
      console.log('Cláusulas personalizadas generadas:', customClauses);

      // Generar HTML del contrato
      const contractHTML = await fillContractTemplate(extractedData, customClauses);

      // Generar PDF a partir del HTML
      const pdfBuffer = await documentService.generatePdfFromHtml(contractHTML);

      // Codificar el PDF como base64 para enviarlo al cliente
      const base64PDF = pdfBuffer.toString('base64');

      // Eliminar archivo temporal
      fs.unlinkSync(filePath);

      // Responder con el contrato generado
      res.json({
        success: true,
        message: 'Contrato generado exitosamente con Mistral AI',
        contrato_html: contractHTML,
        contrato_pdf_base64: base64PDF,
        datos_extraidos: extractedData,
        technology: 'mistral'
      });
    } catch (error: any) {
      console.error('Error generando contrato:', error);
      res.status(500).json({
        success: false,
        message: `Error generando contrato: ${error.message || 'Error desconocido'}`,
      });
    }
  });
}