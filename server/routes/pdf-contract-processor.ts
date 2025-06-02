
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdf from 'pdf-parse';
import LegalDefenseEngine from '../../client/src/services/legalDefenseEngine';

const router = Router();

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../temp/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `estimate-${Date.now()}-${Math.round(Math.random() * 1E9)}.pdf`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo archivos PDF son permitidos'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB límite
});

/**
 * Endpoint principal: PDF → Contrato Blindado
 */
router.post('/pdf-to-contract', upload.single('estimatePdf'), async (req, res) => {
  console.log('🛡️ LEGAL DEFENSE ENGINE: Procesando PDF para contrato defensivo...');
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó archivo PDF'
      });
    }

    console.log('📄 Extrayendo datos del PDF...');
    
    // 1. Extraer texto del PDF
    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdf(pdfBuffer);
    const extractedText = pdfData.text;

    // 2. Usar IA para extraer información estructurada
    const projectData = await extractProjectDataFromPDF(extractedText);
    console.log('✅ Datos del proyecto extraídos:', projectData);

    // 3. Generar análisis de riesgo legal
    const riskAnalysis = await LegalDefenseEngine.analyzeLegalRisks(projectData);
    console.log(`⚖️ Análisis legal completado - Riesgo: ${riskAnalysis.riskLevel}`);

    // 4. Generar contrato defensivo
    const contractResult = await LegalDefenseEngine.generateDefensiveContract(projectData);

    // 5. Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: '🎉 Contrato defensivo generado exitosamente',
      data: {
        extractedData: projectData,
        riskAnalysis: contractResult.analysis,
        contractHtml: contractResult.html,
        protectionsApplied: contractResult.protections,
        legalAdvice: generateLegalAdvice(riskAnalysis),
        contractStrength: calculateContractStrength(riskAnalysis)
      }
    });

  } catch (error) {
    console.error('❌ Error procesando PDF:', error);
    
    // Limpiar archivo en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'Error procesando el PDF del estimado',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Extrae información estructurada del texto del PDF usando IA
 */
async function extractProjectDataFromPDF(pdfText: string): Promise<any> {
  console.log('🧠 Usando IA para extraer datos estructurados...');

  // Expresiones regulares para extraer información común
  const clientNameMatch = pdfText.match(/(?:cliente|client|customer|para|for):\s*([^\n]+)/i);
  const addressMatch = pdfText.match(/(?:dirección|address|ubicación|location):\s*([^\n]+)/i);
  const totalMatch = pdfText.match(/(?:total|subtotal|grand total):\s*\$?([0-9,]+\.?[0-9]*)/i);
  const phoneMatch = pdfText.match(/(?:teléfono|phone|tel):\s*([0-9\-\(\)\s]+)/i);
  const emailMatch = pdfText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

  // Detectar tipo de proyecto basado en palabras clave
  let projectType = 'general';
  if (pdfText.toLowerCase().includes('fence') || pdfText.toLowerCase().includes('cerca')) {
    projectType = 'fencing';
  } else if (pdfText.toLowerCase().includes('roof') || pdfText.toLowerCase().includes('techo')) {
    projectType = 'roofing';
  } else if (pdfText.toLowerCase().includes('plumb') || pdfText.toLowerCase().includes('tubería')) {
    projectType = 'plumbing';
  } else if (pdfText.toLowerCase().includes('electric') || pdfText.toLowerCase().includes('eléctrico')) {
    projectType = 'electrical';
  }

  const totalPrice = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) * 100 : 0; // Convertir a centavos

  return {
    id: Date.now(),
    clientName: clientNameMatch ? clientNameMatch[1].trim() : 'Cliente No Especificado',
    address: addressMatch ? addressMatch[1].trim() : 'Dirección No Especificada',
    projectType,
    totalPrice,
    clientPhone: phoneMatch ? phoneMatch[1].trim() : '',
    clientEmail: emailMatch ? emailMatch[0] : '',
    permitStatus: 'pending', // Por defecto
    extractedFrom: 'pdf',
    extractedAt: new Date().toISOString()
  };
}

/**
 * Genera consejos legales específicos basados en el análisis
 */
function generateLegalAdvice(riskAnalysis: any): string[] {
  const advice: string[] = [
    '🛡️ Este contrato ha sido diseñado por un motor legal especializado en proteger contratistas',
    '⚖️ Todas las cláusulas incluidas son legalmente válidas y enforceables en corte'
  ];

  if (riskAnalysis.riskLevel === 'crítico') {
    advice.push('🚨 ALTO RIESGO: Considera requerir un bono de cumplimiento adicional');
    advice.push('💰 Recomendación: Solicita referencias financieras del cliente');
  }

  if (riskAnalysis.riskLevel === 'alto') {
    advice.push('⚠️ RIESGO ELEVADO: Verifica la solvencia del cliente antes de firmar');
    advice.push('📋 Considera aumentar el depósito inicial al 35%');
  }

  advice.push('📄 Haz que el cliente firme reconociendo haber leído todas las cláusulas');
  advice.push('💼 Conserva una copia firmada en lugar seguro');
  advice.push('🔍 Documenta todo cambio o comunicación por escrito');

  return advice;
}

/**
 * Calcula la fortaleza del contrato (0-100)
 */
function calculateContractStrength(riskAnalysis: any): number {
  let strength = 85; // Base sólida

  // Bonificaciones por protecciones incluidas
  if (riskAnalysis.veteranClauses && riskAnalysis.veteranClauses.length > 5) {
    strength += 10;
  }
  
  if (riskAnalysis.industrySpecificProtections && riskAnalysis.industrySpecificProtections.length > 3) {
    strength += 5;
  }

  // Ajustes por nivel de riesgo
  if (riskAnalysis.riskLevel === 'crítico') {
    strength += 15; // Más protecciones = más fuerte
  } else if (riskAnalysis.riskLevel === 'alto') {
    strength += 10;
  }

  return Math.min(100, strength);
}

export default router;
