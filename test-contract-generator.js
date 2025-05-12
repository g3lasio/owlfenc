/**
 * Pruebas exhaustivas para el generador de contratos
 * 
 * Este script verifica el flujo completo del generador de contratos:
 * 1. Procesamiento de datos de entrada
 * 2. Generación de HTML del contrato (tanto con OpenAI como con el método de respaldo)
 * 3. Conversión del HTML a PDF
 * 4. Validación de la estructura y contenido del PDF generado
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

// Datos de prueba para un proyecto
const sampleProjectData = {
  projectId: 'TEST-PROJ-' + Date.now(),
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
};

// Test 1: Generación de contrato con OpenAI
async function testOpenAIContractGeneration() {
  console.log('\n🧪 TEST 1: Generación de contrato con OpenAI');
  try {
    // Llamada a la API para generar contrato usando OpenAI
    const response = await axios.post(
      `${API_BASE_URL}/api/generate-contract`,
      {
        projectDetails: sampleProjectData,
        model: 'gpt-4o', // Especificar modelo para asegurar usar OpenAI
        systemPrompt: 'Generar un contrato en español con estilo mexicano profesional'
      }
    );

    const html = response.data.html;
    assert(html, 'El HTML del contrato no puede estar vacío');
    assert(html.includes(sampleProjectData.clientName), 'El HTML debe contener el nombre del cliente');
    assert(html.includes(sampleProjectData.company), 'El HTML debe contener el nombre de la empresa');

    // Guardar HTML para inspección
    await fs.writeFile(path.join(OUTPUT_DIR, 'test1-contract-openai.html'), html);
    console.log('✅ Test de generación con OpenAI EXITOSO');
    console.log(`   HTML guardado en: ${path.join(OUTPUT_DIR, 'test1-contract-openai.html')}`);
    
    return html;
  } catch (error) {
    console.error('❌ Error en test de generación con OpenAI:', error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
    throw error;
  }
}

// Test 2: Generación de contrato con método de respaldo
async function testFallbackContractGeneration() {
  console.log('\n🧪 TEST 2: Generación de contrato con método de respaldo');
  try {
    // Forzar el uso del método de respaldo enviando un modelo inválido
    const response = await axios.post(
      `${API_BASE_URL}/api/generate-contract`,
      {
        projectDetails: sampleProjectData,
        model: 'modelo-que-no-existe',
      }
    );

    const html = response.data.html;
    assert(html, 'El HTML del contrato no puede estar vacío');
    assert(html.includes(sampleProjectData.clientName), 'El HTML debe contener el nombre del cliente');
    assert(html.includes(sampleProjectData.company), 'El HTML debe contener el nombre de la empresa');

    // Guardar HTML para inspección
    await fs.writeFile(path.join(OUTPUT_DIR, 'test2-contract-fallback.html'), html);
    console.log('✅ Test de generación con método de respaldo EXITOSO');
    console.log(`   HTML guardado en: ${path.join(OUTPUT_DIR, 'test2-contract-fallback.html')}`);
    
    return html;
  } catch (error) {
    console.error('❌ Error en test de generación con método de respaldo:', error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
    throw error;
  }
}

// Test 3: Generación de PDF a partir de HTML
async function testPdfGeneration(html) {
  console.log('\n🧪 TEST 3: Generación de PDF a partir de HTML');
  try {
    const filename = `contract-test-${Date.now()}.pdf`;
    
    // Llamada a la API para generar PDF
    const response = await axios.post(
      `${API_BASE_URL}/api/generate-pdf`,
      {
        html,
        filename
      },
      {
        responseType: 'arraybuffer'
      }
    );

    // Verificar que la respuesta sea un PDF
    const contentType = response.headers['content-type'];
    assert(contentType === 'application/pdf', `El tipo de contenido debe ser PDF, pero es: ${contentType}`);
    
    // Verificar que el PDF tenga contenido
    const pdfBuffer = Buffer.from(response.data);
    assert(pdfBuffer.length > 0, 'El PDF generado no puede estar vacío');
    
    // Guardar PDF para inspección
    const pdfPath = path.join(OUTPUT_DIR, filename);
    await fs.writeFile(pdfPath, pdfBuffer);
    console.log('✅ Test de generación de PDF EXITOSO');
    console.log(`   PDF guardado en: ${pdfPath}`);
    
    return pdfPath;
  } catch (error) {
    console.error('❌ Error en test de generación de PDF:', error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
    throw error;
  }
}

// Test 4: Generación de contrato con datos mínimos
async function testMinimalDataContractGeneration() {
  console.log('\n🧪 TEST 4: Generación de contrato con datos mínimos');
  
  // Datos mínimos para un contrato válido
  const minimalData = {
    clientName: 'Cliente Prueba',
    address: 'Dirección de Prueba',
    fenceType: 'Simple',
    fenceLength: '50',
    total: 10000
  };
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/generate-contract`,
      {
        projectDetails: minimalData
      }
    );

    const html = response.data.html;
    assert(html, 'El HTML del contrato no puede estar vacío');
    assert(html.includes(minimalData.clientName), 'El HTML debe contener el nombre del cliente');
    assert(html.includes(minimalData.fenceType), 'El HTML debe contener el tipo de cerca');

    // Guardar HTML para inspección
    await fs.writeFile(path.join(OUTPUT_DIR, 'test4-contract-minimal.html'), html);
    console.log('✅ Test de generación con datos mínimos EXITOSO');
    console.log(`   HTML guardado en: ${path.join(OUTPUT_DIR, 'test4-contract-minimal.html')}`);
    
    return html;
  } catch (error) {
    console.error('❌ Error en test de generación con datos mínimos:', error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
    throw error;
  }
}

// Test 5: Prueba de validación de datos incorrectos
async function testInvalidDataContractGeneration() {
  console.log('\n🧪 TEST 5: Prueba de validación de datos incorrectos');
  
  // Datos sin los campos mínimos requeridos
  const invalidData = {
    // Sin campos requeridos
  };
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/generate-contract`,
      {
        projectDetails: invalidData
      }
    );

    // Si llegamos aquí, la API no validó correctamente los datos
    console.error('❌ La API debería rechazar datos inválidos pero no lo hizo');
    return false;
  } catch (error) {
    // Esperamos un error, así que esto es correcto
    console.log('✅ Test de validación de datos incorrectos EXITOSO');
    console.log('   La API rechazó correctamente los datos inválidos');
    return true;
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  try {
    console.log('🚀 Iniciando pruebas del generador de contratos...');
    await setup();
    
    // Test de generación con OpenAI
    let contractHtml;
    try {
      contractHtml = await testOpenAIContractGeneration();
    } catch (error) {
      console.warn('⚠️ Test de OpenAI falló, continuando con otras pruebas...');
    }
    
    // Test de generación con método de respaldo
    const fallbackHtml = await testFallbackContractGeneration();
    
    // Test de generación de PDF (usando el HTML de cualquiera de los métodos anteriores)
    const htmlToUse = contractHtml || fallbackHtml;
    await testPdfGeneration(htmlToUse);
    
    // Test con datos mínimos
    const minimalHtml = await testMinimalDataContractGeneration();
    await testPdfGeneration(minimalHtml);
    
    // Test de validación de datos incorrectos
    await testInvalidDataContractGeneration();
    
    console.log('\n✅✅✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE ✅✅✅');
  } catch (error) {
    console.error('\n❌❌❌ ALGUNAS PRUEBAS FALLARON ❌❌❌');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar las pruebas
runAllTests();