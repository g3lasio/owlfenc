/**
 * Script de prueba para verificar la integración de PDF Monkey
 * 
 * Este script prueba:
 * - Conectividad con PDF Monkey API
 * - Generación de PDF de estimado
 * - Manejo de errores y logging
 * - Validación de datos
 */

import { pdfMonkeyService } from './server/services/pdfMonkeyService.js';

console.log('🧪 Iniciando pruebas de integración PDF Monkey...\n');

// Datos de prueba para estimado
const testEstimateData = {
  estimateNumber: 'EST-TEST-2025-001',
  date: new Date().toLocaleDateString(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  client: {
    name: 'Cliente de Prueba',
    email: 'cliente@test.com',
    address: '123 Test Street, Test City, CA 90210',
    phone: '555-123-4567'
  },
  contractor: {
    companyName: 'Owl Fence LLC',
    name: 'Owl Fence',
    email: 'info@owlfenc.com',
    phone: '202-549-3519',
    address: '2901 Owens Court',
    city: 'Fairfield',
    state: 'California',
    zipCode: '94534'
  },
  project: {
    type: 'Fence Installation',
    description: 'Chain link fence installation project',
    location: '123 Test Street, Test City, CA 90210',
    scopeOfWork: 'Installation of 6-ft chain link fence, 100 linear feet'
  },
  items: [
    {
      id: '1',
      name: 'Chain Link Fence',
      description: '6-ft H x 100-ft W Chain Link Fence',
      quantity: 100,
      unit: 'linear feet',
      unitPrice: 25.00,
      total: 2500.00
    },
    {
      id: '2',
      name: 'Installation Labor',
      description: 'Professional fence installation',
      quantity: 1,
      unit: 'project',
      unitPrice: 1200.00,
      total: 1200.00
    }
  ],
  subtotal: 3700.00,
  tax: 370.00,
  taxRate: 10,
  total: 4070.00,
  notes: 'Standard fence installation with 1-year warranty'
};

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  console.log('🔍 Test 1: Verificando estado del servicio PDF Monkey...');
  try {
    const isHealthy = await pdfMonkeyService.healthCheck();
    if (isHealthy) {
      console.log('✅ Test 1 PASSED: PDF Monkey está funcionando correctamente');
      passed++;
    } else {
      console.log('❌ Test 1 FAILED: PDF Monkey no está respondiendo');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 1 FAILED:', error.message);
    failed++;
  }

  console.log('');

  // Test 2: Listar Templates
  console.log('📋 Test 2: Obteniendo lista de templates...');
  try {
    const templates = await pdfMonkeyService.listTemplates();
    console.log(`✅ Test 2 PASSED: ${templates.length} templates encontrados`);
    
    if (templates.length > 0) {
      console.log('Templates disponibles:');
      templates.forEach((template, index) => {
        console.log(`  ${index + 1}. ${template.name || template.id} (ID: ${template.id})`);
      });
    }
    passed++;
  } catch (error) {
    console.log('❌ Test 2 FAILED:', error.message);
    failed++;
  }

  console.log('');

  // Test 3: Generar PDF de Estimado
  console.log('📄 Test 3: Generando PDF de estimado de prueba...');
  try {
    console.log('Datos del estimado:', {
      estimateNumber: testEstimateData.estimateNumber,
      clientName: testEstimateData.client.name,
      itemsCount: testEstimateData.items.length,
      total: testEstimateData.total
    });

    const pdfBuffer = await pdfMonkeyService.generateEstimatePDF(testEstimateData);
    
    if (pdfBuffer && pdfBuffer.length > 0) {
      console.log(`✅ Test 3 PASSED: PDF generado exitosamente (${pdfBuffer.length} bytes)`);
      
      // Guardar PDF de prueba
      const fs = await import('fs');
      const filename = `test-estimate-${Date.now()}.pdf`;
      fs.writeFileSync(filename, pdfBuffer);
      console.log(`📁 PDF guardado como: ${filename}`);
      passed++;
    } else {
      console.log('❌ Test 3 FAILED: PDF buffer vacío o nulo');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 3 FAILED:', error.message);
    failed++;
  }

  console.log('');

  // Test 4: Validación de datos incompletos
  console.log('🔒 Test 4: Probando validación con datos incompletos...');
  try {
    const incompleteData = {
      estimateNumber: '',
      client: { name: '' },
      items: []
    };

    await pdfMonkeyService.generateEstimatePDF(incompleteData);
    console.log('❌ Test 4 FAILED: Debería haber fallado con datos incompletos');
    failed++;
  } catch (error) {
    console.log('✅ Test 4 PASSED: Validación funcionando correctamente');
    console.log(`   Error esperado: ${error.message}`);
    passed++;
  }

  console.log('');

  // Resumen de resultados
  console.log('📊 RESUMEN DE PRUEBAS:');
  console.log(`✅ Pruebas exitosas: ${passed}`);
  console.log(`❌ Pruebas fallidas: ${failed}`);
  console.log(`📈 Tasa de éxito: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 ¡Todas las pruebas pasaron! PDF Monkey está configurado correctamente.');
  } else {
    console.log('\n⚠️ Algunas pruebas fallaron. Revisar configuración.');
  }

  // Recomendaciones
  console.log('\n💡 RECOMENDACIONES:');
  console.log('1. Verificar que PDFMONKEY_API_KEY esté configurado');
  console.log('2. Confirmar que tienes templates creados en PDF Monkey');
  console.log('3. Proporcionar template ID específico para mejores resultados');
}

// Ejecutar pruebas
runTests().catch(console.error);