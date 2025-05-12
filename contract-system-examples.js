/**
 * Ejemplos de uso del sistema de generación de contratos
 * 
 * Este script proporciona ejemplos completos para cada componente
 * del sistema de generación de contratos, funcionando como documentación
 * ejecutable y como herramienta de aprendizaje para los desarrolladores.
 */
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

// Importar configuración compartida
import { API_BASE_URL, API_URLS, TEST_DATA, TIMEOUTS } from './test-config.js';

// Obtener el directorio actual (equivalente a __dirname en CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de directorios para ejemplos
const EXAMPLES_DIR = path.join(__dirname, 'examples');
const OUTPUT_DIR = path.join(EXAMPLES_DIR, 'output');

// Función para inicializar directorios
async function initDirectories() {
  try {
    await fs.mkdir(EXAMPLES_DIR, { recursive: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log('✅ Directorios de ejemplos creados');
  } catch (error) {
    console.error('Error al crear directorios:', error);
  }
}

/**
 * Ejemplo 1: Generación de contrato con datos mínimos
 * 
 * Muestra cómo generar un contrato con la mínima cantidad de datos requeridos.
 */
async function exampleMinimalContract() {
  console.log('\n📝 EJEMPLO 1: Generación de contrato con datos mínimos');
  console.log('----------------------------------------------');
  
  try {
    // Datos mínimos para un contrato válido
    const minimalData = TEST_DATA.minimalContract;
    
    console.log('Datos mínimos para generar contrato:');
    console.log(JSON.stringify(minimalData, null, 2));
    
    // Llamada a la API para generar contrato
    console.log('\nEnviando solicitud al servidor...');
    const response = await axios.post(
      API_URLS.generateContract,
      { projectDetails: minimalData },
      { timeout: TIMEOUTS.request }
    );
    
    if (response.data.html) {
      console.log('✅ Contrato generado exitosamente!');
      
      // Guardar el HTML generado para inspección
      const htmlPath = path.join(OUTPUT_DIR, 'minimal-contract.html');
      await fs.writeFile(htmlPath, response.data.html);
      console.log(`   HTML guardado en: ${htmlPath}`);
      
      return {
        success: true,
        data: response.data,
        html: response.data.html
      };
    } else {
      console.log('❌ Error: Respuesta sin HTML');
      return { success: false, error: 'No HTML content' };
    }
  } catch (error) {
    console.error('❌ Error generando contrato mínimo:', error.message);
    if (error.response) {
      console.error('   Detalles:', error.response.data);
    }
    return { success: false, error };
  }
}

/**
 * Ejemplo 2: Generación de contrato completo con todos los datos
 * 
 * Muestra cómo generar un contrato con todos los datos posibles.
 */
async function exampleCompleteContract() {
  console.log('\n📝 EJEMPLO 2: Generación de contrato completo');
  console.log('----------------------------------------------');
  
  try {
    // Datos completos para un contrato
    const completeData = TEST_DATA.fullContract;
    
    console.log('Enviando solicitud con datos completos...');
    
    // Llamada a la API para generar contrato
    const response = await axios.post(
      API_URLS.generateContract,
      { projectDetails: completeData },
      { timeout: TIMEOUTS.request }
    );
    
    if (response.data.html) {
      console.log('✅ Contrato completo generado exitosamente!');
      
      // Guardar el HTML generado para inspección
      const htmlPath = path.join(OUTPUT_DIR, 'complete-contract.html');
      await fs.writeFile(htmlPath, response.data.html);
      console.log(`   HTML guardado en: ${htmlPath}`);
      
      return {
        success: true,
        data: response.data,
        html: response.data.html
      };
    } else {
      console.log('❌ Error: Respuesta sin HTML');
      return { success: false, error: 'No HTML content' };
    }
  } catch (error) {
    console.error('❌ Error generando contrato completo:', error.message);
    if (error.response) {
      console.error('   Detalles:', error.response.data);
    }
    return { success: false, error };
  }
}

/**
 * Ejemplo 3: Generación de PDF a partir de contrato HTML
 * 
 * Muestra cómo convertir un contrato HTML a PDF.
 */
async function exampleGeneratePdf(html) {
  console.log('\n📝 EJEMPLO 3: Generación de PDF a partir de contrato HTML');
  console.log('----------------------------------------------');
  
  if (!html) {
    console.log('⚠️ No se proporcionó HTML. Usando HTML de ejemplo...');
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Contrato de Ejemplo</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 2cm; }
          h1 { color: #333; text-align: center; }
          .section { margin: 1em 0; }
          .signature { margin-top: 3em; border-top: 1px solid #999; width: 40%; display: inline-block; margin-right: 10%; }
        </style>
      </head>
      <body>
        <h1>CONTRATO DE SERVICIOS</h1>
        
        <div class="section">
          <h2>1. PARTES</h2>
          <p><strong>CONTRATISTA:</strong> Cercas Profesionales S.A. de C.V.</p>
          <p><strong>CLIENTE:</strong> ${TEST_DATA.minimalContract.clientName}</p>
        </div>
        
        <div class="section">
          <h2>2. OBJETO DEL CONTRATO</h2>
          <p>Instalación de cerca tipo ${TEST_DATA.minimalContract.fenceType} 
             con longitud de ${TEST_DATA.minimalContract.fenceLength} metros.</p>
        </div>
        
        <div class="section">
          <h2>3. PRECIO</h2>
          <p>El precio total acordado es de $${TEST_DATA.minimalContract.total.toLocaleString()} pesos mexicanos.</p>
        </div>
        
        <div class="section">
          <h2>4. FIRMAS</h2>
          <div class="signature">
            <p>EL CONTRATISTA</p>
          </div>
          <div class="signature">
            <p>EL CLIENTE</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  
  try {
    console.log('Enviando solicitud para generar PDF...');
    
    // Llamada a la API para generar PDF
    const response = await axios.post(
      API_URLS.generatePdf,
      {
        html,
        filename: `ejemplo-contrato-${Date.now()}.pdf`
      },
      {
        responseType: 'arraybuffer',
        timeout: TIMEOUTS.request
      }
    );
    
    // Verificar que la respuesta sea un PDF
    if (response.headers['content-type'] === 'application/pdf') {
      console.log('✅ PDF generado exitosamente!');
      
      // Guardar el PDF generado para inspección
      const pdfPath = path.join(OUTPUT_DIR, 'example-contract.pdf');
      await fs.writeFile(pdfPath, Buffer.from(response.data));
      console.log(`   PDF guardado en: ${pdfPath}`);
      
      return {
        success: true,
        pdfPath
      };
    } else {
      console.log('❌ Error: La respuesta no es un PDF');
      return { success: false, error: 'Invalid content type' };
    }
  } catch (error) {
    console.error('❌ Error generando PDF:', error.message);
    if (error.response) {
      console.error('   Detalles:', error.response.data);
    }
    return { success: false, error };
  }
}

/**
 * Ejemplo 4: Procesamiento de PDF para extraer datos
 * 
 * Muestra cómo extraer datos de un PDF existente.
 */
async function exampleProcessPdf() {
  console.log('\n📝 EJEMPLO 4: Procesamiento de PDF para extraer datos');
  console.log('----------------------------------------------');
  
  try {
    // Primero, verificamos si existe un PDF de ejemplo
    const pdfPath = path.join(OUTPUT_DIR, 'example-contract.pdf');
    let pdfExists = false;
    
    try {
      await fs.access(pdfPath);
      pdfExists = true;
      console.log('Usando PDF existente para procesamiento');
    } catch (e) {
      console.log('No se encontró PDF existente. Generando uno de ejemplo...');
      
      // Generar un contrato HTML sencillo
      const sampleHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Presupuesto de Cerca</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 2cm; }
            h1 { color: #333; text-align: center; }
          </style>
        </head>
        <body>
          <h1>PRESUPUESTO DE CERCA</h1>
          
          <div>
            <h2>Cliente</h2>
            <p>Nombre: María González López</p>
            <p>Dirección: Calle Roble #123, Col. Los Pinos, CDMX</p>
            <p>Teléfono: (55) 1234-5678</p>
          </div>
          
          <div>
            <h2>Detalles del Proyecto</h2>
            <p>Tipo de cerca: Privacidad</p>
            <p>Material: Cedro tratado</p>
            <p>Altura: 2.1 metros (7 pies)</p>
            <p>Longitud: 45 metros</p>
          </div>
          
          <div>
            <h2>Presupuesto</h2>
            <p>Materiales: $28,500 MXN</p>
            <p>Mano de obra: $15,750 MXN</p>
            <p>Total: $44,250 MXN</p>
          </div>
        </body>
        </html>
      `;
      
      // Generar un PDF a partir del HTML
      const pdfResponse = await axios.post(
        API_URLS.generatePdf,
        {
          html: sampleHtml,
          filename: 'sample-pdf-for-processing.pdf'
        },
        {
          responseType: 'arraybuffer',
          timeout: TIMEOUTS.request
        }
      );
      
      if (pdfResponse.headers['content-type'] === 'application/pdf') {
        await fs.writeFile(pdfPath, Buffer.from(pdfResponse.data));
        pdfExists = true;
        console.log('PDF de ejemplo generado correctamente');
      }
    }
    
    if (!pdfExists) {
      console.error('❌ No se pudo generar o encontrar un PDF de ejemplo');
      return { success: false, error: 'No PDF available' };
    }
    
    // Leer el archivo PDF
    const pdfBuffer = await fs.readFile(pdfPath);
    
    // Crear FormData para enviar el archivo
    const formData = new FormData();
    formData.append('pdf', pdfBuffer, { filename: 'example.pdf' });
    
    console.log('Enviando PDF para procesamiento y extracción de datos...');
    
    // Llamar a la API para procesar el PDF
    const response = await axios.post(
      API_URLS.processPdf,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: TIMEOUTS.pdfProcessing
      }
    );
    
    if (response.data.extractedData) {
      console.log('✅ Datos extraídos exitosamente!');
      console.log('Datos extraídos:');
      console.log(JSON.stringify(response.data.extractedData, null, 2));
      
      // Guardar datos extraídos para referencia
      const dataPath = path.join(OUTPUT_DIR, 'extracted-data.json');
      await fs.writeFile(dataPath, JSON.stringify(response.data.extractedData, null, 2));
      console.log(`   Datos guardados en: ${dataPath}`);
      
      return {
        success: true,
        extractedData: response.data.extractedData
      };
    } else {
      console.log('❌ Error: No se pudieron extraer datos');
      return { success: false, error: 'No data extracted' };
    }
  } catch (error) {
    console.error('❌ Error procesando PDF:', error.message);
    if (error.response) {
      console.error('   Detalles:', error.response.data);
    }
    
    // Si el endpoint de procesamiento de PDF no está disponible, indicarlo
    if (error.code === 'ECONNREFUSED' || error.response?.status === 404) {
      console.log('⚠️ El endpoint de procesamiento de PDF no está disponible');
    }
    
    return { success: false, error };
  }
}

/**
 * Ejemplo 5: Generación de contrato con OpenAI/Mistral
 * 
 * Muestra cómo generar un contrato utilizando directamente los servicios de IA.
 */
async function exampleAIContractGeneration() {
  console.log('\n📝 EJEMPLO 5: Generación de contrato con IA');
  console.log('----------------------------------------------');
  
  try {
    // Verificar primero qué servicios de IA están disponibles
    console.log('Verificando disponibilidad de servicios de IA...');
    
    let aiConfigResponse;
    try {
      aiConfigResponse = await axios.get(
        API_URLS.aiServicesConfig,
        { timeout: 5000 }
      );
    } catch (e) {
      console.log('⚠️ No se pudo verificar configuración de IA. Suponiendo que OpenAI está disponible.');
    }
    
    const aiConfig = aiConfigResponse?.data || { openAIConfigured: true };
    
    // Datos para el contrato
    const contractData = {
      contractor: {
        name: TEST_DATA.fullContract.company,
        address: TEST_DATA.fullContract.companyAddress,
        phone: TEST_DATA.fullContract.companyPhone,
        email: TEST_DATA.fullContract.companyEmail,
        license: TEST_DATA.fullContract.license
      },
      client: {
        name: TEST_DATA.fullContract.clientName,
        address: TEST_DATA.fullContract.address,
        phone: TEST_DATA.fullContract.phone,
        email: TEST_DATA.fullContract.email
      },
      project: {
        description: `Instalación de cerca de ${TEST_DATA.fullContract.fenceType} de ${TEST_DATA.fullContract.fenceHeight} pies`,
        startDate: TEST_DATA.fullContract.startDate,
        completionDate: TEST_DATA.fullContract.completionDate,
        fenceType: TEST_DATA.fullContract.fenceType,
        fenceHeight: TEST_DATA.fullContract.fenceHeight,
        fenceLength: TEST_DATA.fullContract.fenceLength,
        fenceMaterial: TEST_DATA.fullContract.fenceMaterial,
        total: TEST_DATA.fullContract.total,
        depositAmount: TEST_DATA.fullContract.depositAmount
      },
      gates: TEST_DATA.fullContract.gates
    };
    
    let response;
    let usedAIService = '';
    
    // Intentar primero con OpenAI si está configurado
    if (aiConfig.openAIConfigured) {
      try {
        console.log('Generando contrato con OpenAI...');
        response = await axios.post(
          API_URLS.openaiGenerate,
          {
            contractData,
            model: 'gpt-4o',
            systemPrompt: 'Genera un contrato detallado y profesional para un proyecto de instalación de cerca.'
          },
          { timeout: TIMEOUTS.aiGeneration }
        );
        usedAIService = 'OpenAI';
      } catch (openaiError) {
        console.log('⚠️ Error con OpenAI, intentando con Mistral...');
      }
    }
    
    // Si OpenAI falló o no está configurado, intentar con Mistral
    if (!response && aiConfig.mistralConfigured) {
      try {
        console.log('Generando contrato con Mistral AI...');
        response = await axios.post(
          API_URLS.mistralGenerate,
          {
            contractData,
            model: 'mistral-large-latest'
          },
          { timeout: TIMEOUTS.aiGeneration }
        );
        usedAIService = 'Mistral AI';
      } catch (mistralError) {
        console.log('⚠️ Error con Mistral AI');
      }
    }
    
    // Si ambos servicios de IA fallaron, usar el endpoint general
    if (!response) {
      console.log('⚠️ Servicios de IA no disponibles. Usando endpoint general...');
      response = await axios.post(
        API_URLS.generateContract,
        { projectDetails: TEST_DATA.fullContract },
        { timeout: TIMEOUTS.request }
      );
      usedAIService = 'Endpoint general';
    }
    
    if (response?.data?.html) {
      console.log(`✅ Contrato generado exitosamente con ${usedAIService}!`);
      
      // Guardar el HTML generado para inspección
      const htmlPath = path.join(OUTPUT_DIR, `ai-contract-${usedAIService.toLowerCase().replace(' ', '-')}.html`);
      await fs.writeFile(htmlPath, response.data.html);
      console.log(`   HTML guardado en: ${htmlPath}`);
      
      return {
        success: true,
        service: usedAIService,
        data: response.data,
        html: response.data.html
      };
    } else {
      console.log('❌ Error: Respuesta sin HTML');
      return { success: false, error: 'No HTML content' };
    }
  } catch (error) {
    console.error('❌ Error generando contrato con IA:', error.message);
    if (error.response) {
      console.error('   Detalles:', error.response.data);
    }
    return { success: false, error };
  }
}

/**
 * Ejemplo 6: Manejo de errores y validación
 * 
 * Muestra cómo el sistema maneja datos inválidos o incompletos.
 */
async function exampleErrorHandling() {
  console.log('\n📝 EJEMPLO 6: Manejo de errores y validación');
  console.log('----------------------------------------------');
  
  // Caso 1: Datos incompletos
  console.log('\nCaso 1: Datos incompletos');
  try {
    const incompleteData = {
      // No incluye información del cliente ni detalles importantes
      projectId: 'INCOMPLETE-TEST-' + Date.now()
    };
    
    console.log('Enviando solicitud con datos incompletos...');
    const response = await axios.post(
      API_URLS.generateContract,
      { projectDetails: incompleteData },
      { 
        validateStatus: () => true, // No lanzar excepciones por códigos HTTP de error
        timeout: TIMEOUTS.request
      }
    );
    
    console.log(`Respuesta del servidor: ${response.status} ${response.statusText}`);
    if (response.data.error || response.status >= 400) {
      console.log('✅ El servidor rechazó correctamente los datos incompletos');
      console.log(`   Mensaje: ${response.data.message || response.data.error || 'Error no especificado'}`);
    } else {
      console.log('⚠️ El servidor aceptó datos incompletos. Validación débil.');
    }
  } catch (error) {
    console.error('Error inesperado:', error.message);
  }
  
  // Caso 2: Formato inválido
  console.log('\nCaso 2: Formato inválido');
  try {
    const invalidData = {
      clientName: 'Cliente Test',
      address: 'Dirección Test',
      // Valores numéricos como strings
      fenceHeight: 'muy alto',
      fenceLength: 'bastante largo',
      total: 'muy caro'
    };
    
    console.log('Enviando solicitud con formato inválido...');
    const response = await axios.post(
      API_URLS.generateContract,
      { projectDetails: invalidData },
      { 
        validateStatus: () => true,
        timeout: TIMEOUTS.request
      }
    );
    
    console.log(`Respuesta del servidor: ${response.status} ${response.statusText}`);
    if (response.data.error || response.status >= 400) {
      console.log('✅ El servidor rechazó correctamente los datos de formato inválido');
      console.log(`   Mensaje: ${response.data.message || response.data.error || 'Error no especificado'}`);
    } else {
      console.log('⚠️ El servidor aceptó datos de formato inválido. Validación débil.');
    }
  } catch (error) {
    console.error('Error inesperado:', error.message);
  }
  
  // Caso 3: HTML malformado
  console.log('\nCaso 3: HTML malformado');
  try {
    const invalidHtml = '<div>Este HTML está incompleto y malformado';
    
    console.log('Enviando solicitud de PDF con HTML malformado...');
    const response = await axios.post(
      API_URLS.generatePdf,
      {
        html: invalidHtml,
        filename: 'invalid-html.pdf'
      },
      { 
        validateStatus: () => true,
        timeout: TIMEOUTS.request,
        responseType: 'arraybuffer'
      }
    );
    
    console.log(`Respuesta del servidor: ${response.status} ${response.statusText}`);
    
    // Convertir arraybuffer a texto si es un error
    let responseData = {};
    if (response.headers['content-type'].includes('json')) {
      responseData = JSON.parse(Buffer.from(response.data).toString());
    }
    
    if (response.status >= 400 || responseData.error) {
      console.log('✅ El servidor rechazó correctamente el HTML malformado');
      if (responseData.message || responseData.error) {
        console.log(`   Mensaje: ${responseData.message || responseData.error}`);
      }
    } else if (response.headers['content-type'] === 'application/pdf') {
      console.log('✅ El servidor generó un PDF a pesar del HTML malformado (robusto)');
      
      // Guardar el PDF generado para inspección
      const pdfPath = path.join(OUTPUT_DIR, 'malformed-html.pdf');
      await fs.writeFile(pdfPath, Buffer.from(response.data));
      console.log(`   PDF guardado en: ${pdfPath}`);
    }
  } catch (error) {
    console.error('Error inesperado:', error.message);
  }
  
  return { success: true, message: 'Pruebas de manejo de errores completadas' };
}

/**
 * Ejecutar todos los ejemplos y generar un resumen
 */
async function runAllExamples() {
  console.log('🚀 INICIANDO EJEMPLOS DEL SISTEMA DE GENERACIÓN DE CONTRATOS');
  console.log('=======================================================');
  
  await initDirectories();
  
  const results = [
    { name: 'Contrato con datos mínimos', result: await exampleMinimalContract() },
    { name: 'Contrato completo', result: await exampleCompleteContract() },
  ];
  
  // Si tenemos un HTML generado de alguno de los ejemplos anteriores, usarlo para el ejemplo de PDF
  let html = null;
  for (const item of results) {
    if (item.result?.html) {
      html = item.result.html;
      break;
    }
  }
  
  // Continuar con los demás ejemplos
  results.push({ name: 'Generación de PDF', result: await exampleGeneratePdf(html) });
  results.push({ name: 'Procesamiento de PDF', result: await exampleProcessPdf() });
  results.push({ name: 'Generación con IA', result: await exampleAIContractGeneration() });
  results.push({ name: 'Manejo de errores', result: await exampleErrorHandling() });
  
  // Generar reporte de resultados
  console.log('\n📊 RESUMEN DE EJEMPLOS');
  console.log('===================');
  
  let successCount = 0;
  for (const { name, result } of results) {
    if (result.success) {
      console.log(`✅ ${name}: EXITOSO`);
      successCount++;
    } else {
      console.log(`❌ ${name}: FALLIDO - ${result.error?.message || 'Error desconocido'}`);
    }
  }
  
  console.log(`\nResultado: ${successCount}/${results.length} ejemplos exitosos`);
  
  // Guardar reporte en archivo
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      successful: successCount,
      failed: results.length - successCount
    },
    details: results
  };
  
  const reportPath = path.join(OUTPUT_DIR, 'examples-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReporte guardado en: ${reportPath}`);
}

// Ejecutar todos los ejemplos
runAllExamples();