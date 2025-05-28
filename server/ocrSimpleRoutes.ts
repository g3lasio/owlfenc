/**
 * Rutas OCR Simplificadas
 * Endpoint robusto para extracción de datos usando Anthropic
 */

import { Router } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

// Configuración de multer para archivos PDF
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB límite
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

// Inicializar Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Extrae datos de PDF usando OCR simplificado
 */
router.post('/extract-simple', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó archivo PDF'
      });
    }

    // Extraer texto del PDF
    const pdfData = await pdfParse(req.file.buffer);
    const rawText = pdfData.text;

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo extraer texto del PDF'
      });
    }

    // Usar Anthropic para extraer datos estructurados
    const extractedData = await extractDataWithAnthropic(rawText);

    res.json({
      success: true,
      rawText,
      ...extractedData
    });

  } catch (error) {
    console.error('Error en OCR simplificado:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando el PDF'
    });
  }
});

/**
 * Usa Anthropic para extraer datos estructurados del texto
 */
async function extractDataWithAnthropic(text: string) {
  const prompt = `
Analiza el siguiente texto de un estimate/presupuesto de construcción y extrae la información específica en formato JSON.

TEXTO DEL DOCUMENTO:
${text}

Extrae SOLO la información que esté claramente presente en el texto. Si no encuentras algún dato, déjalo vacío.

Responde ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "contractorName": "nombre del contratista/empresa",
  "clientName": "nombre del cliente",
  "clientAddress": "dirección completa del cliente",
  "clientPhone": "teléfono del cliente",
  "clientEmail": "email del cliente",
  "totalAmount": "monto total con formato $X,XXX.XX",
  "projectDescription": "descripción del trabajo",
  "projectType": "tipo de proyecto (cerca, techo, etc.)"
}

IMPORTANTE: 
- NO incluyas texto explicativo
- NO uses valores por defecto o inventados
- Solo extrae datos que estén explícitamente en el texto
- Formatea los montos como $X,XXX.XX
- Si no encuentras un dato, usa cadena vacía ""
`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219', // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonText = content.text.trim();
      const extractedData = JSON.parse(jsonText);
      
      return {
        contractorName: extractedData.contractorName || '',
        clientName: extractedData.clientName || '',
        clientAddress: extractedData.clientAddress || '',
        clientPhone: extractedData.clientPhone || '',
        clientEmail: extractedData.clientEmail || '',
        totalAmount: extractedData.totalAmount || '',
        projectDescription: extractedData.projectDescription || '',
        projectType: extractedData.projectType || ''
      };
    }

    throw new Error('Respuesta inválida de Anthropic');

  } catch (error) {
    console.error('Error con Anthropic:', error);
    
    // Fallback: extracción básica con expresiones regulares
    return extractDataWithRegex(text);
  }
}

/**
 * Método de respaldo usando expresiones regulares
 */
function extractDataWithRegex(text: string) {
  const data = {
    contractorName: '',
    clientName: '',
    clientAddress: '',
    clientPhone: '',
    clientEmail: '',
    totalAmount: '',
    projectDescription: '',
    projectType: ''
  };

  // Buscar empresa contratista
  const companyPatterns = [
    /(?:company|contractor|from):?\s*([A-Z\s&.,LLC]+)/i,
    /(OWL\s+FENCE?\s*(?:LLC)?)/i,
    /([A-Z][A-Z\s&.]+(?:LLC|INC|CORP))/i
  ];

  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.contractorName = match[1].trim();
      break;
    }
  }

  // Buscar cliente
  const clientPatterns = [
    /(?:to|client|customer):?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /bill\s+to:?\s*([A-Z][a-z\s]+)/i
  ];

  for (const pattern of clientPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.clientName = match[1].trim();
      break;
    }
  }

  // Buscar monto total
  const amountPatterns = [
    /total:?\s*\$?([\d,]+\.?\d*)/i,
    /amount:?\s*\$?([\d,]+\.?\d*)/i,
    /\$\s*([\d,]+\.\d{2})/g
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      data.totalAmount = `$${amount.toFixed(2)}`;
      break;
    }
  }

  // Buscar teléfono
  const phoneMatch = text.match(/(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/);
  if (phoneMatch) {
    data.clientPhone = phoneMatch[1];
  }

  // Buscar email
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    data.clientEmail = emailMatch[1];
  }

  // Buscar dirección (líneas que contienen números y palabras como St, Ave, etc.)
  const addressMatch = text.match(/\d+\s+[A-Za-z\s]+(street|st|avenue|ave|road|rd|drive|dr|way|lane|ln)/i);
  if (addressMatch) {
    data.clientAddress = addressMatch[0];
  }

  // Detectar tipo de proyecto
  const projectTypes = [
    { keywords: ['fence', 'fencing', 'cercas'], type: 'Instalación de Cercas' },
    { keywords: ['roof', 'roofing', 'techo'], type: 'Reparación de Techos' },
    { keywords: ['construction', 'building', 'construcción'], type: 'Construcción General' },
    { keywords: ['repair', 'reparación'], type: 'Reparaciones' }
  ];

  for (const projectType of projectTypes) {
    if (projectType.keywords.some(keyword => text.toLowerCase().includes(keyword))) {
      data.projectType = projectType.type;
      break;
    }
  }

  return data;
}

export default router;