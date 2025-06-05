/**
 * Prueba completa del servicio PDF optimizado
 */

import { optimizedPdfEmailService } from './server/services/OptimizedPdfEmailService.js';

// Datos de prueba realistas
const testEstimateData = {
  estimateNumber: 'EST-2025-PDF-001',
  date: new Date().toLocaleDateString('es-ES'),
  client: {
    name: 'María González',
    email: 'derek@owlfence.com', // Usar email real para prueba
    address: '123 Main Street, San Francisco, CA 94102',
    phone: '(415) 555-0123'
  },
  contractor: {
    companyName: 'Owl Fence Company',
    name: 'Derek Terry',
    email: 'info@owlfence.com',
    phone: '(202) 549-3519',
    address: '2901 Owens Court',
    city: 'Fairfield',
    state: 'California',
    zipCode: '94534',
    license: 'LIC#123456',
    website: 'owlfence.com'
  },
  project: {
    type: 'Instalación de Cerca',
    description: 'Instalación de cerca de madera perimetral',
    location: '123 Main Street, San Francisco, CA',
    scopeOfWork: 'Instalación completa de 100 pies lineales de cerca de madera de 6 pies de altura con postes de cedro y paneles de privacidad'
  },
  items: [
    {
      id: '1',
      name: 'Postes de Cedro 6ft',
      description: 'Postes tratados de cedro de alta calidad',
      quantity: 12,
      unit: 'unidades',
      unitPrice: 45.00,
      total: 540.00
    },
    {
      id: '2',
      name: 'Paneles de Privacidad',
      description: 'Paneles de madera de cedro 6x8 pies',
      quantity: 10,
      unit: 'paneles',
      unitPrice: 85.00,
      total: 850.00
    },
    {
      id: '3',
      name: 'Hardware y Herrajes',
      description: 'Bisagras, cerraduras, tornillos galvanizados',
      quantity: 1,
      unit: 'lote',
      unitPrice: 125.00,
      total: 125.00
    },
    {
      id: '4',
      name: 'Mano de Obra',
      description: 'Instalación profesional incluyendo excavación',
      quantity: 16,
      unit: 'horas',
      unitPrice: 75.00,
      total: 1200.00
    }
  ],
  subtotal: 2715.00,
  taxRate: 0.085,
  tax: 230.78,
  total: 2945.78,
  notes: 'Garantía de 2 años en materiales y mano de obra. Incluye limpieza del área de trabajo.',
  terms: 'Se requiere depósito del 50% para iniciar el trabajo. El balance se paga al completar la instalación.',
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')
};

async function testPdfEmailService() {
  console.log('🚀 Iniciando prueba del servicio PDF optimizado...');
  console.log(`📋 Estimado: ${testEstimateData.estimateNumber}`);
  console.log(`👤 Cliente: ${testEstimateData.client.name}`);
  console.log(`💰 Total: $${testEstimateData.total.toFixed(2)}`);

  try {
    const result = await optimizedPdfEmailService.sendEstimateEmail(testEstimateData);

    console.log('\n📊 RESULTADOS:');
    console.log(`✅ Éxito: ${result.success}`);
    console.log(`📧 Message ID: ${result.messageId || 'N/A'}`);
    console.log(`📄 PDF Generado: ${result.pdfGenerated}`);
    console.log(`📏 Tamaño PDF: ${result.pdfSize || 0} bytes`);
    console.log(`⏱️ Tiempo Total: ${result.processingTime}ms`);
    console.log(`📋 Tracking: ${result.estimateTracked}`);

    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }

    return result.success;

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    return false;
  }
}

// Ejecutar prueba
testPdfEmailService()
  .then(success => {
    if (success) {
      console.log('\n🎉 Prueba completada exitosamente');
      console.log('✅ El servicio PDF optimizado está funcionando correctamente');
    } else {
      console.log('\n❌ La prueba falló');
      console.log('🔧 Revise los logs para más detalles');
    }
  })
  .catch(error => {
    console.error('\n💥 Error crítico:', error);
  });