/**
 * Pruebas de validación del PDF generado
 * 
 * Este script verifica la consistencia y validez de los PDFs generados
 * desde el punto de vista de su estructura, contenido y conformidad con
 * los estándares PDF.
 */
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const assert = require('assert');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Configuración y helpers
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_FILES_DIR = path.join(__dirname, 'test-files');
const OUTPUT_DIR = path.join(__dirname, 'test-output');

// Crear directorios necesarios
async function setup() {
  try {
    await fs.mkdir(TEST_FILES_DIR, { recursive: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`Directorios creados: ${TEST_FILES_DIR}, ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('Error en setup:', error);
    throw error;
  }
}

// Datos de prueba para generar un contrato y PDF
const sampleProjectData = {
  projectId: 'PDF-TEST-' + Date.now(),
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

// Generar un PDF de contrato para pruebas
async function generateTestPdf() {
  console.log('\n🧪 Generando PDF de contrato para pruebas');
  
  try {
    // Generar contrato HTML
    const contractResponse = await axios.post(
      `${API_BASE_URL}/api/generate-contract`,
      {
        projectDetails: sampleProjectData
      }
    );
    
    const html = contractResponse.data.html;
    
    // Generar PDF
    const filename = `validation-test-${Date.now()}.pdf`;
    const pdfResponse = await axios.post(
      `${API_BASE_URL}/api/generate-pdf`,
      {
        html,
        filename
      },
      {
        responseType: 'arraybuffer'
      }
    );
    
    // Guardar PDF para validación
    const pdfPath = path.join(OUTPUT_DIR, filename);
    await fs.writeFile(pdfPath, Buffer.from(pdfResponse.data));
    console.log(`✅ PDF generado: ${pdfPath}`);
    
    return pdfPath;
  } catch (error) {
    console.error('❌ Error generando PDF de prueba:', error.message);
    throw error;
  }
}

// Test 1: Validar estructura del PDF
async function validatePdfStructure(pdfPath) {
  console.log('\n🧪 TEST 1: Validación de estructura del PDF');
  
  try {
    // Leer el archivo PDF
    const data = await fs.readFile(pdfPath);
    const pdfData = new Uint8Array(data);
    
    // Cargar el PDF con pdf.js
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    // Verificar que el PDF tenga al menos una página
    assert(pdf.numPages > 0, 'El PDF debe tener al menos una página');
    console.log(`   El PDF tiene ${pdf.numPages} páginas`);
    
    // Obtener metadatos del PDF
    const metadata = await pdf.getMetadata();
    console.log('   Metadatos del PDF:', metadata.info);
    
    // Extraer texto de la primera página
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => item.str).join(' ');
    
    // Verificar que el texto contenga información clave
    assert(text.includes(sampleProjectData.clientName), 'El PDF debe contener el nombre del cliente');
    assert(text.includes(sampleProjectData.company), 'El PDF debe contener el nombre de la empresa');
    
    console.log('✅ Test de estructura del PDF EXITOSO');
    
    return {
      numPages: pdf.numPages,
      metadata: metadata.info,
      firstPageText: text
    };
  } catch (error) {
    console.error('❌ Error validando estructura del PDF:', error.message);
    throw error;
  }
}

// Test 2: Verificar contenido del PDF
async function validatePdfContent(pdfInfo) {
  console.log('\n🧪 TEST 2: Validación de contenido del PDF');
  
  try {
    const { firstPageText } = pdfInfo;
    
    // Verificar información principal en el contenido
    const requiredTerms = [
      sampleProjectData.clientName,
      sampleProjectData.company,
      sampleProjectData.fenceType,
      sampleProjectData.fenceMaterial
    ];
    
    for (const term of requiredTerms) {
      assert(firstPageText.includes(term), `El contenido debe incluir "${term}"`);
      console.log(`   ✓ Contiene "${term}"`);
    }
    
    // Verificar que el contenido incluya cifras importantes
    const priceString = sampleProjectData.total.toString();
    assert(firstPageText.includes(priceString), `El contenido debe incluir el precio total: ${priceString}`);
    console.log(`   ✓ Contiene precio total: ${priceString}`);
    
    // Verificar información de dimensiones de la cerca
    assert(
      firstPageText.includes(sampleProjectData.fenceHeight) && 
      firstPageText.includes(sampleProjectData.fenceLength),
      'El contenido debe incluir las dimensiones de la cerca'
    );
    console.log(`   ✓ Contiene dimensiones de la cerca`);
    
    console.log('✅ Test de contenido del PDF EXITOSO');
    return true;
  } catch (error) {
    console.error('❌ Error validando contenido del PDF:', error.message);
    throw error;
  }
}

// Test 3: Verificar accesibilidad del PDF generado
async function validatePdfAccessibility(pdfPath) {
  console.log('\n🧪 TEST 3: Validación de accesibilidad del PDF');
  
  try {
    // Leer el archivo PDF
    const data = await fs.readFile(pdfPath);
    const pdfData = new Uint8Array(data);
    
    // Cargar el PDF con pdf.js
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    // Verificar estructura de esquema (outline)
    let hasOutline = false;
    try {
      const outline = await pdf.getOutline();
      hasOutline = outline && outline.length > 0;
    } catch (e) {
      // Algunos PDFs no tienen outline, lo cual no es un error crítico
      console.log('   Nota: El PDF no tiene esquema de navegación (outline)');
    }
    
    // Extraer etiquetas de estructura si están disponibles
    let hasStructureTree = false;
    try {
      const page = await pdf.getPage(1);
      const structTree = await page.getStructTree();
      hasStructureTree = structTree && structTree.children && structTree.children.length > 0;
    } catch (e) {
      // Algunos PDFs no tienen etiquetas de estructura, lo cual no es un error crítico
      console.log('   Nota: El PDF no tiene árbol de estructura definido');
    }
    
    // Extraer texto de todas las páginas para verificar orden lógico
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(' ');
    }
    
    // Verificar que el texto tenga un orden lógico
    // (Verificamos que secciones importantes aparezcan en el orden esperado)
    const textSections = [
      sampleProjectData.company,
      sampleProjectData.clientName,
      'Proyecto',
      'Pago',
      'Firma'
    ];
    
    let lastIndex = -1;
    for (const section of textSections) {
      const currentIndex = fullText.indexOf(section);
      assert(currentIndex > -1, `La sección "${section}" debe estar presente en el texto`);
      assert(currentIndex > lastIndex, `La sección "${section}" debe aparecer después de la sección anterior`);
      lastIndex = currentIndex;
    }
    
    console.log('✅ Test de accesibilidad del PDF EXITOSO');
    return {
      hasOutline,
      hasStructureTree
    };
  } catch (error) {
    console.error('❌ Error validando accesibilidad del PDF:', error.message);
    throw error;
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  try {
    console.log('🚀 Iniciando pruebas de validación de PDF...');
    await setup();
    
    try {
      // Instalar dependencia pdf.js si no está instalada
      require.resolve('pdfjs-dist');
    } catch (e) {
      console.log('⚠️ pdf.js no está instalado. Por favor, instálelo con:');
      console.log('npm install pdfjs-dist@legacy');
      throw new Error('Falta la dependencia pdfjs-dist');
    }
    
    // Generar PDF para pruebas
    const pdfPath = await generateTestPdf();
    
    // Validar estructura del PDF
    const pdfInfo = await validatePdfStructure(pdfPath);
    
    // Validar contenido del PDF
    await validatePdfContent(pdfInfo);
    
    // Validar accesibilidad del PDF
    await validatePdfAccessibility(pdfPath);
    
    console.log('\n✅✅✅ TODAS LAS PRUEBAS DE VALIDACIÓN DE PDF COMPLETADAS EXITOSAMENTE ✅✅✅');
  } catch (error) {
    console.error('\n❌❌❌ ALGUNAS PRUEBAS DE VALIDACIÓN DE PDF FALLARON ❌❌❌');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar las pruebas
runAllTests();