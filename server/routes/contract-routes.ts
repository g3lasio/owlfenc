import { Express, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { pdfVisionService } from '../services/pdfVisionService';
import { storage } from '../storage';
import { documentService } from '../services/documentService';

// Configuración de multer para subida de archivos PDF
const upload = multer({
  dest: 'temp/uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB límite
  },
});

/**
 * Función para llenar la plantilla de contrato con los datos extraídos y las cláusulas personalizadas
 */
async function fillContractTemplate(extractedData: any, customClauses: string[]): Promise<string> {
  try {
    // Obtener la plantilla de contrato
    const templatePath = path.join(process.cwd(), 'client/src/components/templates/contract-template.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');
    
    // Obtener la fecha actual y estimada de finalización (2 semanas después)
    const today = new Date();
    const formattedToday = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    
    const completionDate = new Date();
    completionDate.setDate(today.getDate() + 14); // 2 semanas después
    const formattedCompletionDate = `${completionDate.getDate()}/${completionDate.getMonth() + 1}/${completionDate.getFullYear()}`;
    
    // Calcular el monto del depósito (50% del total)
    const totalCost = typeof extractedData.totalCost === 'number' 
      ? extractedData.totalCost 
      : parseFloat(extractedData.totalCost.replace(/[^0-9.]/g, ''));
    
    const depositAmount = totalCost * 0.5;
    const depositPercentage = 50;
    
    // Información del contratista (hardcoded por ahora, se podría obtener de la base de datos)
    const contractorInfo = {
      name: "Owl Fenc Inc.",
      address: "123 Builder St., San Diego, CA 92101",
      phone: "(555) 123-4567",
      email: "contact@owlfenc.com",
      license: "LIC-12345-A"
    };
    
    // Reemplazar marcadores de posición en la plantilla
    templateHtml = templateHtml
      // Información del contratista
      .replace(/\[Contractor Name, Address, Phone, Email, License #\]/g, 
              `${contractorInfo.name}, ${contractorInfo.address}, ${contractorInfo.phone}, ${contractorInfo.email}, License: ${contractorInfo.license}`)
      
      // Información del cliente
      .replace(/\[Client Name, Address, Phone, Email\]/g, 
              `${extractedData.clientName}, ${extractedData.clientAddress}, ${extractedData.clientPhone}, ${extractedData.clientEmail}`)
      
      // Detalles del proyecto
      .replace(/\[Detailed Project Description\]/g, extractedData.projectDescription)
      
      // Términos de pago
      .replace(/\[Total Amount\]/g, totalCost.toFixed(2))
      .replace(/\[Deposit Percentage\]%/g, `${depositPercentage}%`)
      .replace(/\[Deposit Amount\]/g, depositAmount.toFixed(2))
      .replace(/\[Payment Methods\]/g, extractedData.paymentTerms || "Transferencia bancaria o cheque")
      
      // Fechas
      .replace(/\[Start Date\]/g, formattedToday)
      .replace(/\[Completion Date\]/g, formattedCompletionDate)
      
      // Estado (hardcoded o se podría obtener de la base de datos)
      .replace(/\[State\]/g, "California")
      .replace(/\[County\]/g, "San Diego");
    
    // Añadir las cláusulas personalizadas
    // Buscamos la sección "8. Additional Terms and Amendments"
    const additionalTermsSection = '<div class="section">\n                <div class="section-title">\n                    8. Additional Terms and Amendments\n                </div>';
    
    // Crear el HTML para las cláusulas personalizadas
    let customClausesHtml = '<div class="section">\n                <div class="section-title">\n                    9. Cláusulas Personalizadas\n                </div>\n';
    
    // Añadir cada cláusula personalizada
    customClauses.forEach(clause => {
      customClausesHtml += `<p class="clause">${clause}</p>\n`;
    });
    
    customClausesHtml += '</div>\n';
    
    // Insertar las cláusulas personalizadas después de la sección 8
    const parts = templateHtml.split(additionalTermsSection);
    
    if (parts.length === 2) {
      // Encontramos la sección
      const [before, after] = parts;
      
      // Encontrar dónde termina la sección 8
      const sectionEndIndex = after.indexOf('</div>\n\n            <div');
      
      if (sectionEndIndex !== -1) {
        // Insertamos nuestras cláusulas personalizadas después de que termine la sección 8
        templateHtml = before + additionalTermsSection + after.substring(0, sectionEndIndex + 6) + 
                      customClausesHtml + after.substring(sectionEndIndex + 6);
      } else {
        // Si no podemos encontrar exactamente dónde termina, solo lo agregamos antes de la sección de firmas
        const signatureSection = '<div class="signature-section">';
        const signatureParts = templateHtml.split(signatureSection);
        
        if (signatureParts.length === 2) {
          templateHtml = signatureParts[0] + customClausesHtml + signatureSection + signatureParts[1];
        }
      }
    }
    
    return templateHtml;
  } catch (error) {
    console.error('Error filling contract template:', error);
    throw new Error('Failed to generate contract');
  }
}

export function registerContractRoutes(app: Express) {
  // Endpoint para procesar un PDF y generar un contrato
  app.post('/api/generar-contrato', upload.single('pdf'), async (req: Request, res: Response) => {
    try {
      // Verificar que se haya subido un archivo
      if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
      }
      
      console.log(`PDF recibido: ${req.file.originalname}, tamaño: ${req.file.size} bytes`);
      
      // Extraer datos del PDF usando GPT-4 Vision
      const extractedData = await pdfVisionService.extractDataFromPDF(req.file.path);
      
      console.log('Datos extraídos del PDF:', JSON.stringify(extractedData, null, 2));
      
      // Generar cláusulas personalizadas basadas en la descripción del proyecto
      const customClauses = await pdfVisionService.generateCustomClauses(
        extractedData.projectDescription
      );
      
      console.log('Cláusulas personalizadas generadas:', customClauses);
      
      // Llenar la plantilla de contrato con los datos extraídos
      const contractHtml = await fillContractTemplate(extractedData, customClauses);
      
      // Generar PDF a partir del HTML
      const contractPdfBuffer = await documentService.generatePdfFromHtml(contractHtml);
      
      // Convertir el PDF a base64 para enviarlo al frontend
      const contractPdfBase64 = contractPdfBuffer.toString('base64');
      
      // Eliminar el archivo temporal
      await fs.unlink(req.file.path).catch(err => {
        console.warn('Error eliminando archivo temporal:', err);
      });
      
      // Enviar respuesta al cliente
      res.json({
        contrato_html: contractHtml,
        contrato_pdf_base64: contractPdfBase64
      });
      
    } catch (error) {
      console.error('Error procesando PDF:', error);
      
      // Intentar eliminar el archivo temporal si existe
      if (req.file) {
        fs.unlink(req.file.path).catch(err => {
          console.warn('Error eliminando archivo temporal después de error:', err);
        });
      }
      
      res.status(500).json({ 
        error: 'Error procesando el PDF para generar contrato',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}