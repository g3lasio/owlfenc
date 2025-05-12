/**
 * Servidor mock para pruebas del generador de contratos
 * 
 * Este módulo proporciona un servidor simulado que implementa
 * los endpoints necesarios para probar el sistema de generación
 * de contratos sin depender de servicios externos.
 */
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs/promises';

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorio de plantillas y recursos mock
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const MOCK_DATA_DIR = path.join(__dirname, 'mock-data');

// Asegurar que los directorios existan
async function ensureDirectories() {
  await fs.mkdir(TEMPLATES_DIR, { recursive: true });
  await fs.mkdir(MOCK_DATA_DIR, { recursive: true });
}

// Plantilla básica de contrato para pruebas
const DEFAULT_CONTRACT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contrato de Servicios</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; }
    h1 { text-align: center; color: #333; }
    .section { margin: 20px 0; }
    .section-title { font-weight: bold; margin-bottom: 10px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
    .signature { width: 45%; border-top: 1px solid #000; padding-top: 10px; }
  </style>
</head>
<body>
  <h1>CONTRATO DE SERVICIOS</h1>
  
  <div class="section">
    <div class="section-title">1. PARTES</div>
    <p><strong>CONTRATISTA:</strong> {{company}}</p>
    <p><strong>CLIENTE:</strong> {{clientName}}</p>
  </div>
  
  <div class="section">
    <div class="section-title">2. OBJETO DEL CONTRATO</div>
    <p>El CONTRATISTA se compromete a realizar la instalación de una cerca de {{fenceType}} 
       de {{fenceHeight}} pies de altura y {{fenceLength}} metros de longitud en la propiedad 
       del CLIENTE ubicada en {{address}}.</p>
  </div>
  
  <div class="section">
    <div class="section-title">3. PRECIO Y FORMA DE PAGO</div>
    <p>El precio total acordado por los servicios es de ${{total}} MXN.</p>
    <p>Anticipo: ${{depositAmount}} MXN</p>
  </div>
  
  <div class="section">
    <div class="section-title">4. PLAZOS</div>
    <p>Fecha de inicio: {{startDate}}</p>
    <p>Fecha estimada de finalización: {{completionDate}}</p>
  </div>
  
  <div class="section">
    <div class="section-title">5. MATERIALES</div>
    <p>Se utilizará material de {{fenceMaterial}} para la construcción.</p>
  </div>
  
  {{#if gates}}
  <div class="section">
    <div class="section-title">6. PUERTAS</div>
    <ul>
      {{#each gates}}
      <li>{{type}} - {{quantity}} unidad(es) - ${{price}} MXN</li>
      {{/each}}
    </ul>
  </div>
  {{/if}}
  
  <div class="signatures">
    <div class="signature">
      <p>CONTRATISTA</p>
      <p>{{company}}</p>
    </div>
    <div class="signature">
      <p>CLIENTE</p>
      <p>{{clientName}}</p>
    </div>
  </div>
</body>
</html>
`;

// Inicializar recursos mock
async function initMockResources() {
  await ensureDirectories();
  
  // Crear plantilla de contrato por defecto si no existe
  const templatePath = path.join(TEMPLATES_DIR, 'contract-template.html');
  try {
    await fs.access(templatePath);
  } catch {
    await fs.writeFile(templatePath, DEFAULT_CONTRACT_TEMPLATE);
    console.log('Plantilla de contrato mock creada:', templatePath);
  }
}

// Rellenar plantilla con datos
function fillTemplate(template, data) {
  let filledTemplate = template;
  
  // Reemplazar variables simples
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== 'object') {
      const regex = new RegExp(`{{${key}}}`, 'g');
      filledTemplate = filledTemplate.replace(regex, value);
    }
  }
  
  // Procesar condicionales
  const conditionalRegex = /{{#if ([^}]+)}}([\s\S]*?){{\/if}}/g;
  filledTemplate = filledTemplate.replace(conditionalRegex, (match, condition, content) => {
    const value = condition.split('.').reduce((obj, prop) => obj && obj[prop], data);
    return value ? content : '';
  });
  
  // Procesar bucles
  const loopRegex = /{{#each ([^}]+)}}([\s\S]*?){{\/each}}/g;
  filledTemplate = filledTemplate.replace(loopRegex, (match, arrayName, itemTemplate) => {
    const array = arrayName.split('.').reduce((obj, prop) => obj && obj[prop], data);
    if (!array || !Array.isArray(array)) return '';
    
    return array.map(item => {
      let itemContent = itemTemplate;
      for (const [key, value] of Object.entries(item)) {
        if (typeof value !== 'object') {
          const regex = new RegExp(`{{${key}}}`, 'g');
          itemContent = itemContent.replace(regex, value);
        }
      }
      return itemContent;
    }).join('');
  });
  
  return filledTemplate;
}

// ------------------- API MOCK -------------------

/**
 * Mock del endpoint de generación de contratos
 */
export async function mockGenerateContract(data) {
  console.log('[MOCK] Generando contrato con datos:', data.projectDetails);
  
  await initMockResources();
  
  try {
    // Leer la plantilla
    const templatePath = path.join(TEMPLATES_DIR, 'contract-template.html');
    const template = await fs.readFile(templatePath, 'utf-8');
    
    // Procesar datos de proyecto
    const projectDetails = data.projectDetails || {};
    
    // Completar datos faltantes con valores por defecto si se solicita
    if (data.completeData) {
      if (!projectDetails.company) projectDetails.company = 'Empresa de Cercas S.A. de C.V.';
      if (!projectDetails.fenceType) projectDetails.fenceType = 'Privacidad';
      if (!projectDetails.fenceHeight) projectDetails.fenceHeight = '6';
      if (!projectDetails.fenceLength) projectDetails.fenceLength = '50';
      if (!projectDetails.fenceMaterial) projectDetails.fenceMaterial = 'madera tratada';
      if (!projectDetails.total) projectDetails.total = 25000;
      if (!projectDetails.depositAmount) projectDetails.depositAmount = projectDetails.total * 0.5;
      if (!projectDetails.startDate) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 14);
        projectDetails.startDate = startDate.toLocaleDateString();
      }
      if (!projectDetails.completionDate) {
        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + 30);
        projectDetails.completionDate = completionDate.toLocaleDateString();
      }
    }
    
    // Generar HTML del contrato
    const html = fillTemplate(template, projectDetails);
    
    // Simular tiempo de procesamiento
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      html,
      completedData: data.completeData ? projectDetails : undefined
    };
  } catch (error) {
    console.error('[MOCK] Error generando contrato:', error);
    throw new Error(`Mock server error: ${error.message}`);
  }
}

/**
 * Mock del endpoint de generación de PDF
 */
export async function mockGeneratePDF(data) {
  console.log('[MOCK] Generando PDF con HTML de longitud:', data.html.length);
  
  // Simular tiempo de procesamiento
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // En entorno de prueba, devolvemos un buffer básico simulado
  const mockPdfBuffer = Buffer.from('PDF-MOCK');
  
  return mockPdfBuffer;
}

/**
 * Mock del endpoint de procesamiento de PDF
 */
export async function mockProcessPDF(pdfFile) {
  console.log('[MOCK] Procesando PDF de tamaño:', pdfFile.length);
  
  // Simular tiempo de procesamiento
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Datos extraídos simulados
  const extractedData = {
    clientName: 'Cliente Extraído de PDF',
    address: 'Dirección Extraída #123, Colonia Simulada',
    phone: '(55) 1234-5678',
    fenceType: 'Privacidad',
    fenceHeight: '7',
    fenceLength: '63',
    total: 35800
  };
  
  return { extractedData };
}

/**
 * Mock del endpoint de configuración de IA
 */
export async function mockAIServicesConfig() {
  return {
    openAIConfigured: true,
    mistralConfigured: true
  };
}

/**
 * Mock del endpoint de generación con OpenAI
 */
export async function mockOpenAIGenerate(data) {
  console.log('[MOCK] Generando contrato con OpenAI');
  
  // Simular tiempo de procesamiento (OpenAI es más lento)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Usar el mismo generador que el endpoint general
  const { html } = await mockGenerateContract({
    projectDetails: {
      ...data.contractData.contractor,
      ...data.contractData.client,
      ...data.contractData.project,
      gates: data.contractData.gates
    }
  });
  
  return { html };
}

/**
 * Mock del endpoint de generación con Mistral
 */
export async function mockMistralGenerate(data) {
  console.log('[MOCK] Generando contrato con Mistral');
  
  // Simular tiempo de procesamiento
  await new Promise(resolve => setTimeout(resolve, 1800));
  
  // Usar el mismo generador que el endpoint general
  const { html } = await mockGenerateContract({
    projectDetails: {
      ...data.contractData.contractor,
      ...data.contractData.client,
      ...data.contractData.project,
      gates: data.contractData.gates
    }
  });
  
  return { html };
}

/**
 * Interceptor para manejar todas las peticiones
 */
export async function mockAPIInterceptor(url, method, data) {
  console.log(`[MOCK] Interceptando petición ${method} a ${url}`);
  
  // Normalizar URL
  const endpoint = url.split('/').pop();
  
  switch (endpoint) {
    case 'generate-contract':
      return mockGenerateContract(data);
    case 'generate-pdf':
      return mockGeneratePDF(data);
    case 'process-pdf':
      return mockProcessPDF(data.pdf);
    case 'config':
      return mockAIServicesConfig();
    case 'generate':
      if (url.includes('openai')) {
        return mockOpenAIGenerate(data);
      } else if (url.includes('mistral')) {
        return mockMistralGenerate(data);
      }
      break;
    default:
      throw new Error(`Mock endpoint not implemented: ${url}`);
  }
}