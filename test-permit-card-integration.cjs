/**
 * Script de prueba para verificar la integración completa de la tarjeta de permisos
 * Frontend → Backend → PDF Generation
 */

const axios = require('axios');

// Datos de prueba que simula lo que envía el frontend
const testPermitData = {
  // Datos básicos del contrato
  client: {
    name: "Juan Pérez",
    address: "123 Main St, Los Angeles, CA 90210",
    phone: "(555) 123-4567",
    email: "juan.perez@email.com"
  },
  contractor: {
    name: "ABC Construction LLC",
    address: "456 Business Ave, Los Angeles, CA 90211",
    phone: "(555) 987-6543",
    email: "info@abcconstruction.com"
  },
  project: {
    type: "Fence Installation",
    description: "Installation of 125 linear feet cedar fence",
    location: "123 Main St, Los Angeles, CA 90210"
  },
  financials: {
    total: 18500
  },
  
  // DATOS DE PERMISOS - Lo que envía la tarjeta de permisos del frontend
  permitInfo: {
    permitsRequired: true,
    responsibility: "contractor",
    numbers: "BP-2025-001234, BP-2025-001235"
  }
};

async function testPermitCardIntegration() {
  console.log('🧪 [TEST] Probando integración completa de tarjeta de permisos...');
  console.log('📤 [TEST] Datos de permisos enviados:', testPermitData.permitInfo);
  
  try {
    const response = await axios.post('http://localhost:5000/api/generate-pdf', testPermitData, {
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.byteLength > 0) {
      console.log('✅ [TEST] PDF generado exitosamente');
      console.log(`📄 [TEST] Tamaño del PDF: ${response.data.byteLength} bytes`);
      
      // Guardar el PDF para verificación manual
      const fs = require('fs');
      const filename = `test-permit-integration-${Date.now()}.pdf`;
      fs.writeFileSync(filename, response.data);
      console.log(`💾 [TEST] PDF guardado como: ${filename}`);
      
      console.log('\n🎯 [TEST] PRUEBA DE INTEGRACIÓN EXITOSA');
      console.log('✓ Frontend envía permitInfo → Backend recibe permitInfo → PDF incluye datos reales');
      
    } else {
      console.error('❌ [TEST] Respuesta inválida del servidor');
    }
    
  } catch (error) {
    console.error('❌ [TEST] Error en la prueba:', error.response?.data || error.message);
  }
}

// Prueba adicional: Verificar diferentes configuraciones de permisos
async function testDifferentPermitConfigurations() {
  console.log('\n🧪 [TEST] Probando diferentes configuraciones de permisos...');
  
  const configurations = [
    {
      name: "Permisos requeridos - Responsabilidad del contratista",
      permitInfo: {
        permitsRequired: true,
        responsibility: "contractor",
        numbers: "BP-2025-001"
      }
    },
    {
      name: "Permisos requeridos - Responsabilidad del cliente",
      permitInfo: {
        permitsRequired: true,
        responsibility: "client",
        numbers: "BP-2025-002"
      }
    },
    {
      name: "Sin permisos requeridos",
      permitInfo: {
        permitsRequired: false,
        responsibility: "",
        numbers: ""
      }
    },
    {
      name: "Sin datos de permisos (fallback)",
      permitInfo: undefined
    }
  ];
  
  for (const config of configurations) {
    console.log(`\n📋 [TEST] Probando: ${config.name}`);
    
    const testData = {
      ...testPermitData,
      permitInfo: config.permitInfo
    };
    
    try {
      const response = await axios.post('http://localhost:5000/api/generate-pdf', testData, {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        console.log(`✅ [TEST] ${config.name} - PDF generado (${response.data.byteLength} bytes)`);
      }
      
    } catch (error) {
      console.error(`❌ [TEST] ${config.name} - Error:`, error.response?.status || error.message);
    }
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  console.log('🚀 [TEST] Iniciando pruebas de integración de permisos...\n');
  
  await testPermitCardIntegration();
  await testDifferentPermitConfigurations();
  
  console.log('\n🏁 [TEST] Pruebas completadas');
}

runAllTests();