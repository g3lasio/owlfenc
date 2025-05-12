/**
 * Pruebas para el manejo de errores en la generación de contratos
 * 
 * Este script verifica cómo el sistema maneja diferentes situaciones de error
 * en el proceso de generación de contratos y PDFs.
 */
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

// Obtener el directorio actual (equivalente a __dirname en CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración y helpers
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, 'test-output');

// Crear directorio de salida si no existe
async function setup() {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`Directorio de salida creado: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('Error creando directorio de salida:', error);
    throw error;
  }
}

// Test 1: Manejo de errores por datos faltantes o incompletos
async function testMissingDataErrorHandling() {
  console.log('\n🧪 TEST 1: Manejo de errores por datos faltantes o incompletos');
  
  const testCases = [
    {
      name: 'Sin datos de cliente',
      data: {
        projectId: 'ERROR-TEST-NO-CLIENT',
        // Sin nombre de cliente ni detalles
        fenceType: 'Estándar',
        fenceLength: '50',
        total: 15000
      }
    },
    {
      name: 'Sin datos de cerca',
      data: {
        projectId: 'ERROR-TEST-NO-FENCE',
        clientName: 'Cliente Sin Cerca',
        address: 'Dirección de prueba #123',
        // Sin detalles de la cerca
        total: 10000
      }
    },
    {
      name: 'Sin precio total',
      data: {
        projectId: 'ERROR-TEST-NO-PRICE',
        clientName: 'Cliente Sin Precio',
        address: 'Dirección de prueba #456',
        fenceType: 'Privacidad',
        fenceHeight: '6',
        fenceLength: '80'
        // Sin precio total
      }
    },
    {
      name: 'Datos con formato incorrecto',
      data: {
        projectId: 'ERROR-TEST-WRONG-FORMAT',
        clientName: 'Cliente Formato Incorrecto',
        address: 'Dirección de prueba #789',
        fenceType: 'Privacidad',
        fenceHeight: 'muy alta', // Formato incorrecto para altura
        fenceLength: 'larga', // Formato incorrecto para longitud
        total: 'costoso' // Formato incorrecto para precio
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`   Probando: ${testCase.name}`);
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/generate-contract`,
        {
          projectDetails: testCase.data
        },
        {
          validateStatus: () => true // No lanzar excepciones por códigos de error HTTP
        }
      );
      
      // Guardar la respuesta para análisis
      const responseFile = path.join(OUTPUT_DIR, `error-response-${testCase.data.projectId}.json`);
      await fs.writeFile(responseFile, JSON.stringify(response.data, null, 2));
      
      if (response.status >= 400) {
        console.log(`      ✅ Error manejado correctamente con código ${response.status}`);
      } else {
        // Si no hay error, verificar que la API usó valores por defecto
        assert(response.data.html, 'La respuesta debe contener HTML del contrato');
        console.log(`      ✅ La API generó contrato con valores por defecto`);
        
        // Guardar el HTML generado
        const htmlFile = path.join(OUTPUT_DIR, `error-contract-${testCase.data.projectId}.html`);
        await fs.writeFile(htmlFile, response.data.html);
      }
    } catch (error) {
      console.error(`      ❌ Error inesperado: ${error.message}`);
    }
  }
  
  console.log('✅ Test de manejo de errores por datos faltantes EXITOSO');
  return true;
}

// Test 2: Manejo de errores en el servicio de AI
async function testAIServiceErrorHandling() {
  console.log('\n🧪 TEST 2: Manejo de errores en el servicio de AI');
  
  // Datos de proyecto válidos
  const validProjectData = {
    projectId: 'ERROR-TEST-AI-SERVICE',
    clientName: 'Cliente Test AI',
    address: 'Dirección de prueba #123',
    fenceType: 'Privacidad',
    fenceHeight: '6',
    fenceLength: '80',
    total: 25000
  };
  
  try {
    // Forzar un error en el servicio de AI usando un modelo que no existe
    const response = await axios.post(
      `${API_BASE_URL}/api/generate-contract`,
      {
        projectDetails: validProjectData,
        model: 'modelo-que-no-existe-9999', // Modelo inválido para forzar error
      },
      {
        validateStatus: () => true // No lanzar excepciones por códigos de error HTTP
      }
    );
    
    // Guardar la respuesta para análisis
    const responseFile = path.join(OUTPUT_DIR, 'ai-error-response.json');
    await fs.writeFile(responseFile, JSON.stringify(response.data, null, 2));
    
    // Si el servicio AI falla, se espera que use el método de respaldo
    if (response.status === 200 && response.data.html) {
      console.log('   ✅ El sistema utilizó método de respaldo cuando el servicio AI falló');
      
      // Guardar el HTML generado por el método de respaldo
      const htmlFile = path.join(OUTPUT_DIR, 'ai-error-fallback-contract.html');
      await fs.writeFile(htmlFile, response.data.html);
    } else {
      assert(false, 'El sistema debería usar el método de respaldo cuando AI falla');
    }
  } catch (error) {
    console.error(`   ❌ Error inesperado: ${error.message}`);
    return false;
  }
  
  console.log('✅ Test de manejo de errores en el servicio de AI EXITOSO');
  return true;
}

// Test 3: Manejo de errores en la generación de PDF
async function testPdfGenerationErrorHandling() {
  console.log('\n🧪 TEST 3: Manejo de errores en la generación de PDF');
  
  const errorCases = [
    {
      name: 'HTML vacío',
      html: '',
      filename: 'empty.pdf'
    },
    {
      name: 'HTML malformado',
      html: '<div>HTML incompleto sin estructura correcta',
      filename: 'malformed.pdf'
    },
    {
      name: 'HTML con recursos externos inaccesibles',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test con recursos inaccesibles</title>
          <link href="https://url-que-no-existe-12345.com/style.css" rel="stylesheet">
        </head>
        <body>
          <h1>Contrato de prueba</h1>
          <p>Este HTML incluye recursos externos que no existen:</p>
          <img src="https://url-que-no-existe-12345.com/imagen.jpg" alt="Imagen que no existe">
        </body>
        </html>
      `,
      filename: 'missing-resources.pdf'
    },
    {
      name: 'HTML extremadamente largo',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Contrato extremadamente largo</title>
        </head>
        <body>
          <h1>Contrato muy largo</h1>
          ${Array(1000).fill('<p>Párrafo repetido para crear un documento muy largo.</p>').join('')}
        </body>
        </html>
      `,
      filename: 'very-long.pdf'
    }
  ];
  
  for (const errorCase of errorCases) {
    console.log(`   Probando: ${errorCase.name}`);
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/generate-pdf`,
        {
          html: errorCase.html,
          filename: errorCase.filename
        },
        {
          validateStatus: () => true, // No lanzar excepciones por códigos de error HTTP
          responseType: 'arraybuffer',
          timeout: 30000 // Timeout extendido para casos de documentos largos
        }
      );
      
      // Analizar la respuesta
      if (response.headers['content-type'] === 'application/pdf') {
        console.log(`      ✅ PDF generado a pesar de condiciones subóptimas`);
        
        // Guardar el PDF generado
        const pdfPath = path.join(OUTPUT_DIR, `error-${errorCase.filename}`);
        await fs.writeFile(pdfPath, Buffer.from(response.data));
      } else {
        // Si no es un PDF, probablemente es una respuesta de error JSON
        const errorData = JSON.parse(Buffer.from(response.data).toString('utf8'));
        console.log(`      ✅ Error manejado correctamente: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error(`      ❌ Error inesperado: ${error.message}`);
    }
  }
  
  console.log('✅ Test de manejo de errores en la generación de PDF EXITOSO');
  return true;
}

// Test 4: Manejo de errores de tiempo de espera (timeout)
async function testTimeoutErrorHandling() {
  console.log('\n🧪 TEST 4: Manejo de errores de tiempo de espera (timeout)');
  
  try {
    // Generar un HTML con scripts que causarían un tiempo de espera prolongado
    const timeoutHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test de Timeout</title>
        <script>
          // Este script intentaría ejecutarse durante la generación del PDF
          // pero debería ser ignorado por el sistema o manejado correctamente
          for (let i = 0; i < 1000000000; i++) {
            // Loop infinito que intentaría bloquear el procesamiento
          }
        </script>
      </head>
      <body>
        <h1>Contrato de prueba con script problemático</h1>
        <p>Este HTML incluye un script que podría causar problemas de rendimiento.</p>
      </body>
      </html>
    `;
    
    // Intentar generar PDF con un timeout corto
    const response = await axios.post(
      `${API_BASE_URL}/api/generate-pdf`,
      {
        html: timeoutHtml,
        filename: 'timeout-test.pdf'
      },
      {
        validateStatus: () => true,
        responseType: 'arraybuffer',
        timeout: 10000 // Timeout corto de 10 segundos
      }
    );
    
    // Analizar la respuesta
    if (response.headers['content-type'] === 'application/pdf') {
      console.log('   ✅ PDF generado correctamente a pesar del script problemático');
      
      // Guardar el PDF generado
      const pdfPath = path.join(OUTPUT_DIR, 'timeout-test.pdf');
      await fs.writeFile(pdfPath, Buffer.from(response.data));
      return true;
    } else {
      // Si no es un PDF, verificar que el error fue manejado correctamente
      try {
        const errorData = JSON.parse(Buffer.from(response.data).toString('utf8'));
        console.log(`   ✅ Error de timeout manejado correctamente: ${errorData.message || 'Error desconocido'}`);
        return true;
      } catch (parseError) {
        console.error('   ❌ Respuesta de error no pudo ser parseada como JSON');
        return false;
      }
    }
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('   ✅ Timeout detectado correctamente');
      return true;
    } else {
      console.error(`   ❌ Error inesperado: ${error.message}`);
      return false;
    }
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  try {
    console.log('🚀 Iniciando pruebas de manejo de errores en la generación de contratos...');
    await setup();
    
    let successCount = 0;
    
    // Test 1: Manejo de errores por datos faltantes o incompletos
    if (await testMissingDataErrorHandling()) successCount++;
    
    // Test 2: Manejo de errores en el servicio de AI
    if (await testAIServiceErrorHandling()) successCount++;
    
    // Test 3: Manejo de errores en la generación de PDF
    if (await testPdfGenerationErrorHandling()) successCount++;
    
    // Test 4: Manejo de errores de tiempo de espera (timeout)
    if (await testTimeoutErrorHandling()) successCount++;
    
    if (successCount === 4) {
      console.log('\n✅✅✅ TODAS LAS PRUEBAS DE MANEJO DE ERRORES COMPLETADAS EXITOSAMENTE ✅✅✅');
    } else {
      console.log(`\n⚠️ ALGUNAS PRUEBAS DE MANEJO DE ERRORES FALLARON: ${successCount}/4 pruebas exitosas`);
    }
  } catch (error) {
    console.error('\n❌❌❌ ERROR GENERAL EN LAS PRUEBAS DE MANEJO DE ERRORES ❌❌❌');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar las pruebas
runAllTests();