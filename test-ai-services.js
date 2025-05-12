/**
 * Pruebas para los servicios de IA (OpenAI y Mistral) utilizados en la generación de contratos
 * 
 * Este script verifica la funcionalidad de los servicios de IA que se utilizan para generar
 * y procesar contratos, incluyendo la generación de HTML y el procesamiento de datos.
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

// Datos de prueba para generar contratos
const sampleContractData = {
  contractor: {
    name: 'Cercas Profesionales SA de CV',
    address: 'Calle Principal #123, Colonia Centro, CDMX',
    phone: '(55) 1234-5678',
    email: 'info@cercasprofesionales.mx',
    license: 'CONAFECE-12345'
  },
  client: {
    name: 'Juan Pérez González',
    address: 'Av. Reforma #456, Col. Juárez, CDMX',
    phone: '(55) 8765-4321',
    email: 'juan.perez@email.com'
  },
  project: {
    description: 'Instalación de cerca de Privacidad de 8 pies',
    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    completionDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    fenceType: 'Privacidad',
    fenceHeight: '8',
    fenceLength: '120',
    fenceMaterial: 'Cedro Rojo',
    total: 36500,
    depositAmount: 18250
  },
  gates: [
    { type: 'Puerta sencilla', width: '3', height: '6', quantity: 1, price: 2500 },
    { type: 'Puerta doble', width: '6', height: '6', quantity: 1, price: 4500 }
  ]
};

// Test 1: Generación de contrato con OpenAI
async function testOpenAIContractGeneration() {
  console.log('\n🧪 TEST 1: Generación de contrato con OpenAI');
  
  try {
    // Verificar si tenemos API key de OpenAI
    const aiConfigResponse = await axios.get(`${API_BASE_URL}/api/ai-services/config`);
    const hasOpenAIKey = aiConfigResponse.data.openAIConfigured;
    
    if (!hasOpenAIKey) {
      console.log('⚠️ OpenAI no está configurado. Saltando prueba...');
      return null;
    }
    
    // Llamar al servicio de OpenAI para generar contrato
    const response = await axios.post(
      `${API_BASE_URL}/api/openai/generate-contract`,
      {
        contractData: sampleContractData,
        model: 'gpt-4o',
        systemPrompt: 'Genera un contrato detallado y profesional para un proyecto de instalación de cerca.'
      }
    );
    
    assert(response.data.html, 'La respuesta debe contener el HTML del contrato');
    
    // Verificar que el contrato contenga información importante
    const html = response.data.html;
    assert(html.includes(sampleContractData.contractor.name), 'El contrato debe incluir el nombre del contratista');
    assert(html.includes(sampleContractData.client.name), 'El contrato debe incluir el nombre del cliente');
    
    // Guardar HTML para inspección
    const outputPath = path.join(OUTPUT_DIR, 'openai-contract.html');
    await fs.writeFile(outputPath, html);
    console.log(`✅ Test de generación con OpenAI EXITOSO`);
    console.log(`   HTML guardado en: ${outputPath}`);
    
    return html;
  } catch (error) {
    console.error('❌ Error en test de OpenAI:', error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
    return null;
  }
}

// Test 2: Generación de contrato con Mistral AI
async function testMistralContractGeneration() {
  console.log('\n🧪 TEST 2: Generación de contrato con Mistral AI');
  
  try {
    // Verificar si tenemos API key de Mistral
    const aiConfigResponse = await axios.get(`${API_BASE_URL}/api/ai-services/config`);
    const hasMistralKey = aiConfigResponse.data.mistralConfigured;
    
    if (!hasMistralKey) {
      console.log('⚠️ Mistral AI no está configurado. Saltando prueba...');
      return null;
    }
    
    // Llamar al servicio de Mistral para generar contrato
    const response = await axios.post(
      `${API_BASE_URL}/api/mistral/generate-contract`,
      {
        contractData: sampleContractData,
        model: 'mistral-large-latest'
      }
    );
    
    assert(response.data.html, 'La respuesta debe contener el HTML del contrato');
    
    // Verificar que el contrato contenga información importante
    const html = response.data.html;
    assert(html.includes(sampleContractData.contractor.name), 'El contrato debe incluir el nombre del contratista');
    assert(html.includes(sampleContractData.client.name), 'El contrato debe incluir el nombre del cliente');
    
    // Guardar HTML para inspección
    const outputPath = path.join(OUTPUT_DIR, 'mistral-contract.html');
    await fs.writeFile(outputPath, html);
    console.log(`✅ Test de generación con Mistral AI EXITOSO`);
    console.log(`   HTML guardado en: ${outputPath}`);
    
    return html;
  } catch (error) {
    console.error('❌ Error en test de Mistral AI:', error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
    return null;
  }
}

// Test 3: Procesamiento de texto con OpenAI para extraer información
async function testOpenAITextProcessing() {
  console.log('\n🧪 TEST 3: Procesamiento de texto con OpenAI para extraer información');
  
  try {
    // Verificar si tenemos API key de OpenAI
    const aiConfigResponse = await axios.get(`${API_BASE_URL}/api/ai-services/config`);
    const hasOpenAIKey = aiConfigResponse.data.openAIConfigured;
    
    if (!hasOpenAIKey) {
      console.log('⚠️ OpenAI no está configurado. Saltando prueba...');
      return null;
    }
    
    // Texto de muestra para procesar (simula texto extraído de un PDF)
    const sampleText = `
      PRESUPUESTO DE CERCA
      
      Cercas El Profesional
      RFC: CEP980523ABC
      Dirección: Av. Insurgentes Sur #2390, Col. Chimalistac, CDMX
      Teléfono: (55) 3456-7890
      Email: contacto@cercaselprofesional.mx
      
      CLIENTE:
      Nombre: Ana María Sánchez Vega
      Dirección: Calle Álamos #45, Col. Florida, Álvaro Obregón, CDMX
      Tel: 55-9876-5432
      Email: ana.sanchez@mail.com
      
      DESCRIPCIÓN DEL PROYECTO:
      Instalación de cerca de privacidad de madera tratada de 2.1 metros de altura (7 pies)
      Longitud total: 65 metros lineales
      Material: Madera de pino tratada a presión
      Incluye: 1 puerta sencilla y 2 puertas dobles
      
      COSTOS:
      Material: $42,500 MXN
      Mano de obra: $29,800 MXN
      Puertas y accesorios: $15,700 MXN
      
      TOTAL: $88,000 MXN
      Anticipo requerido (50%): $44,000 MXN
      
      Fecha estimada de inicio: 15 de junio de 2025
      Tiempo estimado de instalación: 10 días hábiles
      
      Este presupuesto tiene una validez de 30 días a partir de la fecha.
      
      Fecha: 12 de mayo de 2025
    `;
    
    // Llamar a la API para procesar el texto
    const response = await axios.post(
      `${API_BASE_URL}/api/openai/extract-data`,
      {
        text: sampleText,
        extractionType: 'estimate'
      }
    );
    
    assert(response.data.extractedData, 'La respuesta debe contener datos extraídos');
    
    const extractedData = response.data.extractedData;
    console.log('Datos extraídos:', JSON.stringify(extractedData, null, 2));
    
    // Verificar que se extrajeron datos importantes
    assert(extractedData.clientName, 'Se debe extraer el nombre del cliente');
    assert(extractedData.fenceType, 'Se debe extraer el tipo de cerca');
    assert(extractedData.total, 'Se debe extraer el precio total');
    
    // Guardar datos extraídos para inspección
    const outputPath = path.join(OUTPUT_DIR, 'openai-extracted-data.json');
    await fs.writeFile(outputPath, JSON.stringify(extractedData, null, 2));
    console.log(`✅ Test de procesamiento de texto con OpenAI EXITOSO`);
    console.log(`   Datos guardados en: ${outputPath}`);
    
    return extractedData;
  } catch (error) {
    console.error('❌ Error en test de procesamiento de texto con OpenAI:', error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
    return null;
  }
}

// Test 4: Prueba del endpoint generalizado de generación de contratos (selecciona automáticamente el servicio disponible)
async function testGeneralContractGeneration() {
  console.log('\n🧪 TEST 4: Prueba del endpoint generalizado de generación de contratos');
  
  try {
    // Datos de proyecto simplificados
    const projectDetails = {
      projectId: 'AI-TEST-' + Date.now(),
      company: sampleContractData.contractor.name,
      companyAddress: sampleContractData.contractor.address,
      companyPhone: sampleContractData.contractor.phone,
      companyEmail: sampleContractData.contractor.email,
      license: sampleContractData.contractor.license,
      clientName: sampleContractData.client.name,
      address: sampleContractData.client.address,
      phone: sampleContractData.client.phone,
      email: sampleContractData.client.email,
      fenceType: sampleContractData.project.fenceType,
      fenceHeight: sampleContractData.project.fenceHeight,
      fenceLength: sampleContractData.project.fenceLength,
      fenceMaterial: sampleContractData.project.fenceMaterial,
      startDate: sampleContractData.project.startDate,
      completionDate: sampleContractData.project.completionDate,
      total: sampleContractData.project.total,
      depositAmount: sampleContractData.project.depositAmount,
      gates: sampleContractData.gates
    };
    
    // Llamar al endpoint general de generación de contratos
    const response = await axios.post(
      `${API_BASE_URL}/api/generate-contract`,
      {
        projectDetails
      }
    );
    
    assert(response.data.html, 'La respuesta debe contener el HTML del contrato');
    
    // Verificar que el contrato contenga información importante
    const html = response.data.html;
    assert(html.includes(projectDetails.clientName), 'El contrato debe incluir el nombre del cliente');
    assert(html.includes(projectDetails.fenceType), 'El contrato debe incluir el tipo de cerca');
    
    // Guardar HTML para inspección
    const outputPath = path.join(OUTPUT_DIR, 'general-contract.html');
    await fs.writeFile(outputPath, html);
    console.log(`✅ Test de generación generalizada de contrato EXITOSO`);
    console.log(`   HTML guardado en: ${outputPath}`);
    
    return html;
  } catch (error) {
    console.error('❌ Error en test de generación generalizada:', error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
    return null;
  }
}

// Función para probar la calidad y validez del HTML generado
async function testHtmlQuality(html, source) {
  if (!html) return false;
  
  console.log(`\n🧪 Evaluando calidad del HTML generado por ${source}`);
  
  // Criterios de calidad a evaluar
  const qualityCriteria = [
    { name: 'Estructura HTML completa', test: () => html.includes('<!DOCTYPE html>') && html.includes('</html>') },
    { name: 'Estilos CSS definidos', test: () => html.includes('<style') || html.includes('style=') },
    { name: 'Secciones clave del contrato', test: () => {
      const requiredSections = ['Partes', 'Objeto', 'Precio', 'Plazo', 'Firmas'];
      return requiredSections.every(section => 
        html.toLowerCase().includes(section.toLowerCase()) || 
        html.includes(section)
      );
    }},
    { name: 'Espacios para firma', test: () => html.includes('firma') || html.includes('Firma') },
    { name: 'Información del contratista', test: () => html.includes(sampleContractData.contractor.name) },
    { name: 'Información del cliente', test: () => html.includes(sampleContractData.client.name) },
    { name: 'Detalles del proyecto', test: () => 
      html.includes(sampleContractData.project.fenceType) || 
      html.includes(sampleContractData.project.fenceMaterial)
    },
    { name: 'Información de precios', test: () => 
      html.includes(sampleContractData.project.total.toString()) || 
      html.includes('$')
    }
  ];
  
  // Evaluar cada criterio
  let passedCount = 0;
  for (const criterion of qualityCriteria) {
    const passed = criterion.test();
    console.log(`   ${passed ? '✅' : '❌'} ${criterion.name}`);
    if (passed) passedCount++;
  }
  
  const percentScore = Math.round((passedCount / qualityCriteria.length) * 100);
  console.log(`   Puntuación de calidad: ${percentScore}% (${passedCount}/${qualityCriteria.length} criterios cumplidos)`);
  
  return {
    score: percentScore,
    passedCriteria: passedCount,
    totalCriteria: qualityCriteria.length
  };
}

// Ejecutar todas las pruebas
async function runAllTests() {
  try {
    console.log('🚀 Iniciando pruebas de servicios de IA para generación de contratos...');
    await setup();
    
    // Obtener configuración de servicios AI
    let aiConfig;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/ai-services/config`);
      aiConfig = response.data;
      console.log('Configuración de servicios AI:', aiConfig);
    } catch (error) {
      console.warn('⚠️ No se pudo obtener la configuración de servicios AI. Continuando pruebas...');
      aiConfig = { openAIConfigured: false, mistralConfigured: false };
    }
    
    // Test 1: OpenAI
    const openaiHtml = await testOpenAIContractGeneration();
    
    // Test 2: Mistral AI
    const mistralHtml = await testMistralContractGeneration();
    
    // Test 3: Procesamiento de texto con OpenAI
    const extractedData = await testOpenAITextProcessing();
    
    // Test 4: Endpoint generalizado
    const generalHtml = await testGeneralContractGeneration();
    
    // Evaluar calidad de HTML generado
    if (openaiHtml) {
      const openaiQuality = await testHtmlQuality(openaiHtml, 'OpenAI');
    }
    
    if (mistralHtml) {
      const mistralQuality = await testHtmlQuality(mistralHtml, 'Mistral AI');
    }
    
    if (generalHtml) {
      const generalQuality = await testHtmlQuality(generalHtml, 'endpoint generalizado');
    }
    
    // Comparar servicios si ambos están disponibles
    if (openaiHtml && mistralHtml) {
      console.log('\n📊 Comparación de servicios de IA:');
      
      const openaiQuality = await testHtmlQuality(openaiHtml, 'OpenAI');
      const mistralQuality = await testHtmlQuality(mistralHtml, 'Mistral AI');
      
      console.log(`   OpenAI: ${openaiQuality.score}% (${openaiQuality.passedCriteria}/${openaiQuality.totalCriteria})`);
      console.log(`   Mistral: ${mistralQuality.score}% (${mistralQuality.passedCriteria}/${mistralQuality.totalCriteria})`);
      
      if (openaiQuality.score > mistralQuality.score) {
        console.log('   🏆 OpenAI generó un contrato de mejor calidad');
      } else if (mistralQuality.score > openaiQuality.score) {
        console.log('   🏆 Mistral AI generó un contrato de mejor calidad');
      } else {
        console.log('   🏆 Ambos servicios generaron contratos de calidad similar');
      }
    }
    
    console.log('\n✅✅✅ PRUEBAS DE SERVICIOS DE IA COMPLETADAS ✅✅✅');
    
  } catch (error) {
    console.error('\n❌❌❌ ERROR GENERAL EN LAS PRUEBAS DE SERVICIOS DE IA ❌❌❌');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar las pruebas
runAllTests();