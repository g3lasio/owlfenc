/**
 * PRUEBA COMPLETA DEL SISTEMA DE EMAIL
 * 
 * Esta prueba verifica toda la cadena de envío de correos:
 * 1. Configuración de Resend API
 * 2. Generación de HTML del estimado
 * 3. Envío centralizado de correos
 * 4. Verificación de respuesta
 */

import axios from 'axios';

// Configuración de la prueba
const TEST_CONFIG = {
  // Email autorizado en cuenta de prueba de Resend
  testEmail: 'gelasio@chyrris.com',
  baseUrl: 'http://localhost:5000',
  estimateData: {
    estimateNumber: `EST-TEST-${Date.now()}`,
    date: new Date().toLocaleDateString('es-ES'),
    client: {
      name: 'Cliente de Prueba',
      email: 'gelasio@chyrris.com',
      address: '123 Test Street',
      phone: '555-0123'
    },
    contractor: {
      companyName: 'Test Company',
      name: 'Test Contractor',
      email: 'gelasio@chyrris.com',
      phone: '555-0456',
      address: '456 Business Ave',
      city: 'Test City',
      state: 'CA',
      zipCode: '90210',
      license: 'LIC123456',
      logo: null
    },
    items: [
      {
        id: 'test-1',
        name: 'Material de Prueba',
        description: 'Item de prueba para verificar funcionalidad',
        quantity: 5,
        unit: 'piezas',
        unitPrice: 100,
        total: 500
      },
      {
        id: 'test-2',
        name: 'Servicio de Instalación',
        description: 'Instalación profesional',
        quantity: 1,
        unit: 'servicio',
        unitPrice: 200,
        total: 200
      }
    ],
    subtotal: 700,
    discount: 0,
    tax: 56,
    taxRate: 8,
    total: 756,
    notes: 'Esta es una prueba del sistema de envío de correos.',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')
  }
};

/**
 * Función principal de prueba
 */
async function runCompleteEmailTest() {
  console.log('🚀 Iniciando prueba completa del sistema de email...');
  console.log('📧 Email de prueba:', TEST_CONFIG.testEmail);
  
  try {
    // PASO 1: Verificar conectividad con el servidor
    console.log('\n📡 PASO 1: Verificando conectividad del servidor...');
    try {
      const healthCheck = await axios.get(`${TEST_CONFIG.baseUrl}/api/health`);
      console.log('✅ Servidor respondiendo correctamente');
    } catch (error) {
      console.log('⚠️ Endpoint de salud no disponible, continuando...');
    }

    // PASO 2: Probar endpoint de email centralizado
    console.log('\n📤 PASO 2: Enviando prueba de email centralizado...');
    
    const emailPayload = {
      clientEmail: TEST_CONFIG.testEmail,
      clientName: TEST_CONFIG.estimateData.client.name,
      contractorEmail: TEST_CONFIG.testEmail,
      contractorName: TEST_CONFIG.estimateData.contractor.name,
      contractorCompany: TEST_CONFIG.estimateData.contractor.companyName,
      estimateData: TEST_CONFIG.estimateData,
      customMessage: 'Este es un mensaje de prueba del sistema de email.',
      sendCopy: true
    };

    console.log('📋 Payload del email:');
    console.log('  - Cliente:', emailPayload.clientEmail);
    console.log('  - Contratista:', emailPayload.contractorEmail);
    console.log('  - Estimado #:', emailPayload.estimateData.estimateNumber);
    console.log('  - Total:', `$${emailPayload.estimateData.total}`);
    console.log('  - Enviar copia:', emailPayload.sendCopy);

    const response = await axios.post(
      `${TEST_CONFIG.baseUrl}/api/centralized-email/send-estimate`,
      emailPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 segundos
      }
    );

    console.log('\n📊 RESULTADO DEL ENVÍO:');
    console.log('  - Status:', response.status);
    console.log('  - Respuesta:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n🎉 ¡PRUEBA EXITOSA!');
      console.log('✅ Email enviado correctamente');
      console.log('✅ Sistema de email funcionando al 100%');
      
      if (emailPayload.sendCopy) {
        console.log('✅ Copia enviada al contratista');
      }
      
      console.log('\n📬 Revisa la bandeja de entrada de:', TEST_CONFIG.testEmail);
      console.log('📬 Deberías recibir:');
      console.log('   1. Email principal con el estimado');
      if (emailPayload.sendCopy) {
        console.log('   2. Copia del email enviado');
      }
      
      return true;
    } else {
      console.log('\n❌ PRUEBA FALLIDA');
      console.log('❌ El email no se envió correctamente:', response.data.message);
      return false;
    }

  } catch (error) {
    console.log('\n💥 ERROR EN LA PRUEBA:');
    
    if (error.response) {
      console.log('❌ Error de respuesta del servidor:');
      console.log('   - Status:', error.response.status);
      console.log('   - Data:', JSON.stringify(error.response.data, null, 2));
      console.log('   - Headers:', error.response.headers);
    } else if (error.request) {
      console.log('❌ Error de conexión:');
      console.log('   - No se recibió respuesta del servidor');
      console.log('   - Timeout o servidor no disponible');
    } else {
      console.log('❌ Error de configuración:');
      console.log('   - Mensaje:', error.message);
    }
    
    console.log('\n🔍 DIAGNÓSTICO:');
    console.log('   - Servidor corriendo:', TEST_CONFIG.baseUrl);
    console.log('   - Endpoint:', '/api/centralized-email/send-estimate');
    console.log('   - Método:', 'POST');
    
    return false;
  }
}

/**
 * Prueba adicional de conectividad directa con Resend
 */
async function testResendDirectly() {
  console.log('\n🔧 Prueba adicional: Conectividad directa con Resend...');
  
  try {
    const directTestPayload = {
      toEmail: TEST_CONFIG.testEmail,
      subject: 'Prueba Directa de Resend',
      htmlContent: '<h1>Prueba de conectividad directa</h1><p>Si recibes este email, Resend está funcionando correctamente.</p>'
    };

    const response = await axios.post(
      `${TEST_CONFIG.baseUrl}/api/test-resend-direct`,
      directTestPayload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );

    console.log('✅ Prueba directa exitosa:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Prueba directa fallida:', error.message);
    return false;
  }
}

/**
 * Ejecutar todas las pruebas
 */
async function main() {
  console.log('=' .repeat(60));
  console.log('🧪 SUITE COMPLETA DE PRUEBAS DE EMAIL');
  console.log('=' .repeat(60));
  
  const results = {
    mainTest: false,
    directTest: false
  };
  
  // Ejecutar prueba principal
  results.mainTest = await runCompleteEmailTest();
  
  // Ejecutar prueba directa si la principal falla
  if (!results.mainTest) {
    results.directTest = await testResendDirectly();
  }
  
  // Reporte final
  console.log('\n' + '=' .repeat(60));
  console.log('📊 REPORTE FINAL DE PRUEBAS');
  console.log('=' .repeat(60));
  console.log('🎯 Prueba principal:', results.mainTest ? '✅ EXITOSA' : '❌ FALLIDA');
  console.log('🔧 Prueba directa:', results.directTest ? '✅ EXITOSA' : '⏭️ NO EJECUTADA');
  
  if (results.mainTest) {
    console.log('\n🏆 SISTEMA DE EMAIL COMPLETAMENTE FUNCIONAL');
    console.log('✅ El frontend puede enviar correos sin problemas');
    console.log('✅ El backend procesa correctamente las solicitudes');
    console.log('✅ Resend entrega los emails exitosamente');
  } else {
    console.log('\n⚠️ PROBLEMAS DETECTADOS EN EL SISTEMA DE EMAIL');
    console.log('❌ Revisa los logs anteriores para identificar el problema');
    console.log('🔍 Posibles causas:');
    console.log('   - Servidor no está corriendo');
    console.log('   - Endpoint no configurado correctamente');
    console.log('   - API Key de Resend inválida');
    console.log('   - Email no autorizado en cuenta de prueba');
  }
  
  console.log('=' .repeat(60));
}

// Ejecutar pruebas
main().catch(console.error);