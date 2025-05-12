/**
 * Prueba de integración: Procesamiento de datos y generación de contratos
 * 
 * Este script verifica la integración entre diferentes componentes del sistema:
 * 1. Validación y procesamiento de datos
 * 2. Generación de contratos
 * 3. Conversión a PDF
 * 4. Manejo de casos borde y errores
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

// Datos de prueba para diferentes escenarios
const testCases = [
  {
    name: 'Caso completo con todos los datos',
    data: {
      projectId: 'COMPLETE-' + Date.now(),
      company: 'Cercas Profesionales SA de CV',
      companyAddress: 'Calle Principal #123, Colonia Centro, CDMX',
      companyPhone: '(55) 1234-5678',
      companyEmail: 'info@cercasprofesionales.mx',
      license: 'CONAFECE-12345',
      clientName: 'Juan Pérez González',
      address: 'Av. Reforma #456, Col. Juárez, CDMX',
      phone: '(55) 8765-4321',
      email: 'juan.perez@email.com',
      fenceType: 'Privacidad',
      fenceHeight: '8',
      fenceLength: '120',
      fenceMaterial: 'Cedro Rojo',
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      completionDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      total: 36500,
      depositAmount: 18250,
      materialCost: 24000,
      laborCost: 12500,
      gates: [
        { type: 'Puerta sencilla', width: '3', height: '6', quantity: 1, price: 2500 },
        { type: 'Puerta doble', width: '6', height: '6', quantity: 1, price: 4500 }
      ]
    },
    expectedSuccess: true
  },
  {
    name: 'Caso con datos mínimos',
    data: {
      projectId: 'MINIMAL-' + Date.now(),
      clientName: 'María Rodríguez',
      address: 'Calle Girasoles #789, Zapopan, Jalisco',
      fenceType: 'Malla ciclónica',
      fenceLength: '50',
      total: 15000
    },
    expectedSuccess: true
  },
  {
    name: 'Caso con caracteres especiales',
    data: {
      projectId: 'SPECIAL-' + Date.now(),
      clientName: 'José Ñúñez & Asociados, S.A.',
      address: 'Rincón del Águila #42-B, Col. Vista Hermosa, Cuernavaca',
      fenceType: 'Semi-privacidad 75%',
      fenceHeight: '2.4m',
      fenceLength: '85.5',
      fenceMaterial: 'Compuesto WPC (madera/plástico)',
      total: 24750,
      notes: 'El cliente requiere instalación en 2 fases: 1ª fase (lado norte) & 2ª fase (lado este)'
    },
    expectedSuccess: true
  },
  {
    name: 'Caso con datos faltantes críticos',
    data: {
      projectId: 'INCOMPLETE-' + Date.now(),
      // Sin nombre de cliente ni dirección
      fenceType: 'Estándar',
      fenceLength: '30',
      total: 9000
    },
    expectedSuccess: false
  },
  {
    name: 'Caso con documentos adicionales',
    data: {
      projectId: 'DOCUMENTS-' + Date.now(),
      clientName: 'Roberto Gómez Torres',
      address: 'Paseo de la Reforma #1234, CDMX',
      fenceType: 'Decorativa',
      fenceHeight: '4',
      fenceLength: '60',
      total: 18000,
      additionalDocuments: [
        { title: 'Permiso municipal', reference: 'PM-2025-4567', required: true },
        { title: 'Plano catastral', reference: 'PC-9876', required: false }
      ],
      additionalClauses: [
        'El contratista debe obtener todos los permisos municipales necesarios antes de iniciar la obra.',
        'Se respetarán los límites establecidos en el plano catastral proporcionado por el cliente.',
        'Cualquier modificación al diseño original deberá ser aprobada por escrito.'
      ]
    },
    expectedSuccess: true
  }
];

// Prueba de generación de contrato y PDF para un caso específico
async function testCase(testCase) {
  console.log(`\n🧪 PROBANDO: ${testCase.name}`);
  
  try {
    // Paso 1: Generar contrato HTML
    console.log('Generando contrato HTML...');
    const contractResponse = await axios.post(
      `${API_BASE_URL}/api/generate-contract`,
      {
        projectDetails: testCase.data
      }
    );
    
    const html = contractResponse.data.html;
    assert(html, 'El HTML del contrato no puede estar vacío');
    
    // Guardar HTML para inspección
    const htmlFilename = `test-case-${testCase.data.projectId}-contract.html`;
    await fs.writeFile(path.join(OUTPUT_DIR, htmlFilename), html);
    console.log(`   HTML guardado como: ${htmlFilename}`);
    
    // Verificar que el HTML contenga información clave
    if (testCase.data.clientName) {
      assert(html.includes(testCase.data.clientName), `El HTML debe contener el nombre del cliente: ${testCase.data.clientName}`);
    }
    
    if (testCase.data.fenceType) {
      assert(html.includes(testCase.data.fenceType), `El HTML debe contener el tipo de cerca: ${testCase.data.fenceType}`);
    }
    
    // Paso 2: Generar PDF
    console.log('Generando PDF...');
    const pdfFilename = `test-case-${testCase.data.projectId}-contract.pdf`;
    const pdfResponse = await axios.post(
      `${API_BASE_URL}/api/generate-pdf`,
      {
        html,
        filename: pdfFilename
      },
      {
        responseType: 'arraybuffer'
      }
    );
    
    // Verificar que la respuesta sea un PDF
    const contentType = pdfResponse.headers['content-type'];
    assert(contentType === 'application/pdf', `El tipo de contenido debe ser PDF, pero es: ${contentType}`);
    
    // Guardar PDF para inspección
    const pdfBuffer = Buffer.from(pdfResponse.data);
    await fs.writeFile(path.join(OUTPUT_DIR, pdfFilename), pdfBuffer);
    console.log(`   PDF guardado como: ${pdfFilename}`);
    
    console.log(`✅ ÉXITO: ${testCase.name}`);
    return true;
  } catch (error) {
    if (!testCase.expectedSuccess) {
      console.log(`✅ FALLO ESPERADO: ${testCase.name} (${error.message})`);
      return true;
    }
    
    console.error(`❌ ERROR: ${testCase.name}`);
    console.error(`   Mensaje: ${error.message}`);
    if (error.response) {
      console.error(`   Código: ${error.response.status}`);
      console.error(`   Detalles: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// Prueba de carga: Enviar múltiples solicitudes simultáneas
async function loadTest(concurrentRequests = 3) {
  console.log(`\n🧪 PRUEBA DE CARGA: ${concurrentRequests} solicitudes simultáneas`);
  
  try {
    const basicRequest = {
      projectDetails: {
        projectId: 'LOAD-TEST-' + Date.now(),
        clientName: 'Cliente de Prueba de Carga',
        address: 'Dirección de Prueba',
        fenceType: 'Estándar',
        fenceLength: '25',
        total: 7500
      }
    };
    
    const requests = [];
    for (let i = 0; i < concurrentRequests; i++) {
      const request = { ...basicRequest };
      request.projectDetails.projectId = `LOAD-TEST-${Date.now()}-${i}`;
      requests.push(
        axios.post(`${API_BASE_URL}/api/generate-contract`, request)
      );
    }
    
    const startTime = Date.now();
    const results = await Promise.all(requests);
    const endTime = Date.now();
    
    const totalTime = endTime - startTime;
    const avgTimePerRequest = totalTime / concurrentRequests;
    
    console.log(`✅ PRUEBA DE CARGA EXITOSA`);
    console.log(`   Tiempo total: ${totalTime}ms`);
    console.log(`   Tiempo promedio por solicitud: ${avgTimePerRequest.toFixed(2)}ms`);
    
    return true;
  } catch (error) {
    console.error(`❌ ERROR EN PRUEBA DE CARGA`);
    console.error(`   Mensaje: ${error.message}`);
    return false;
  }
}

// Prueba de errores y excepciones
async function testErrorHandling() {
  console.log('\n🧪 PRUEBA DE MANEJO DE ERRORES');
  
  const errorCases = [
    {
      name: 'HTML vacío',
      request: {
        html: '',
        filename: 'empty.pdf'
      },
      expectError: true
    },
    {
      name: 'HTML malformado',
      request: {
        html: '<div>Contrato incompleto sin estructura HTML correcta',
        filename: 'malformed.pdf'
      },
      expectError: false // Puppeteer generalmente maneja HTML malformado
    },
    {
      name: 'Datos JSON inválidos',
      endpoint: '/api/generate-contract',
      request: 'Esto no es JSON válido',
      expectError: true,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  ];
  
  let successCount = 0;
  
  for (const errorCase of errorCases) {
    console.log(`   Probando: ${errorCase.name}`);
    
    try {
      const endpoint = errorCase.endpoint || '/api/generate-pdf';
      
      const response = await axios.post(
        `${API_BASE_URL}${endpoint}`,
        errorCase.request,
        {
          headers: errorCase.headers,
          validateStatus: () => true // No lanzar excepciones para códigos de error HTTP
        }
      );
      
      if (errorCase.expectError) {
        assert(response.status >= 400, `Se esperaba un error, pero se recibió código ${response.status}`);
        console.log(`      ✅ Error manejado correctamente con código ${response.status}`);
        successCount++;
      } else {
        assert(response.status < 400, `No se esperaba error, pero se recibió código ${response.status}`);
        console.log(`      ✅ Sin error, como se esperaba`);
        successCount++;
      }
    } catch (error) {
      console.error(`      ❌ Error inesperado: ${error.message}`);
    }
  }
  
  console.log(`✅ PRUEBA DE MANEJO DE ERRORES: ${successCount}/${errorCases.length} casos exitosos`);
  return successCount === errorCases.length;
}

// Ejecutar todas las pruebas
async function runAllTests() {
  try {
    console.log('🚀 Iniciando pruebas de integración de datos y contratos...');
    await setup();
    
    let successCount = 0;
    const totalTests = testCases.length;
    
    // Ejecutar cada caso de prueba
    for (const testCase of testCases) {
      const success = await testCase(testCase);
      if (success) successCount++;
    }
    
    // Prueba de carga
    if (await loadTest(3)) successCount++;
    
    // Prueba de manejo de errores
    if (await testErrorHandling()) successCount++;
    
    if (successCount === totalTests + 2) { // +2 por la prueba de carga y manejo de errores
      console.log('\n✅✅✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE ✅✅✅');
    } else {
      console.log(`\n⚠️ ALGUNAS PRUEBAS FALLARON: ${successCount}/${totalTests + 2} pruebas exitosas`);
    }
  } catch (error) {
    console.error('\n❌❌❌ ERROR GENERAL EN LAS PRUEBAS ❌❌❌');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar las pruebas
runAllTests();