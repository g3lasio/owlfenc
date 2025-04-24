/**
 * Script para probar el formato exacto requerido por el wrapper ATTOM
 * 
 * Basado en los mensajes de error, parece que el wrapper espera parámetros
 * específicos en un formato exacto.
 */

import axios from 'axios';

// URL del wrapper ATTOM
const ATTOM_WRAPPER_URL = 'https://attom-wrapper.replit.app';

// Direcciones reales para pruebas
const testAddresses = [
  "1234 Main St, San Francisco, CA 94105",
  "555 California St, San Francisco, CA 94104",
  "1600 Amphitheatre Parkway, Mountain View, CA 94043",
  "1 Apple Park Way, Cupertino, CA 95014"
];

// Función para formatear el resultado para mejor legibilidad
const formatResult = (data) => {
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return 'Error al formatear: ' + e.message;
  }
};

// Función para probar un parámetro específico
async function testSpecificFormat() {
  const endpoint = '/api/property/details';
  
  // Probar varias combinaciones específicas basadas en los mensajes de error
  const tests = [
    // Test 1: Probar con street_address (basado en el error MISSING_ADDRESS1)
    { params: { street_address: testAddresses[0] } },
    
    // Test 2: Probar específicamente con nombres de parámetros en formato attom
    { params: { 
        address: testAddresses[0].split(',')[0],
        citystatezip: testAddresses[0].replace(/^[^,]+,\s*/, '')
    }},

    // Test 3: Enviar exactamente "address1"
    { params: { 
        address1: testAddresses[0].split(',')[0],
        city: testAddresses[0].split(',')[1].trim(),
        state: testAddresses[0].split(',')[2].trim().split(' ')[0],
        postalcode: testAddresses[0].split(',')[2].trim().split(' ')[1]
    }},
    
    // Test 4: Probar con formato diferente y zipcode como "postal" 
    { params: { 
        addressLine1: testAddresses[1].split(',')[0],
        city: testAddresses[1].split(',')[1].trim(),
        state: testAddresses[1].split(',')[2].trim().split(' ')[0],
        postal: testAddresses[1].split(',')[2].trim().split(' ')[1]
    }},
    
    // Test 5: Probar con address = completo y addressline1 = calle
    { params: { 
        address: testAddresses[2],
        addressline1: testAddresses[2].split(',')[0]
    }},

    // Test 6: Probar con todos los parámetros posibles
    { params: {
        streetAddress: testAddresses[3].split(',')[0],
        address1: testAddresses[3].split(',')[0],
        address: testAddresses[3],
        city: testAddresses[3].split(',')[1].trim(),
        state: testAddresses[3].split(',')[2].trim().split(' ')[0],
        zip: testAddresses[3].split(',')[2].trim().split(' ')[1],
        postalcode: testAddresses[3].split(',')[2].trim().split(' ')[1],
        postal: testAddresses[3].split(',')[2].trim().split(' ')[1]
    }}
  ];

  console.log('=== REALIZANDO PRUEBAS ESPECÍFICAS ===');
  
  for (const [index, test] of tests.entries()) {
    console.log(`\n> Test ${index + 1}: ${JSON.stringify(test.params)}`);
    
    try {
      const response = await axios.get(`${ATTOM_WRAPPER_URL}${endpoint}`, {
        params: test.params
      });
      
      console.log(`✅ ÉXITO - Status: ${response.status}`);
      console.log('Respuesta:', formatResult(response.data).substring(0, 300) + '...');
      
      // Si funciona, intentar con otra dirección real para confirmar
      if (index === 0) {
        console.log('\n> Confirmando con otra dirección...');
        
        const confirmParams = { ...test.params };
        confirmParams[Object.keys(confirmParams)[0]] = testAddresses[2];
        
        try {
          const confirm = await axios.get(`${ATTOM_WRAPPER_URL}${endpoint}`, {
            params: confirmParams
          });
          
          console.log(`✅ CONFIRMADO - Status: ${confirm.status}`);
          console.log('Respuesta:', formatResult(confirm.data).substring(0, 300) + '...');
        } catch (err) {
          console.log(`❌ FALLO EN CONFIRMACIÓN - Status: ${err.response?.status}`);
          if (err.response?.data) {
            console.log('Error:', formatResult(err.response.data));
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ ERROR - Status: ${error.response?.status}`);
      if (error.response?.data) {
        console.log('Error:', formatResult(error.response.data));
      } else {
        console.log('Mensaje de error:', error.message);
      }
    }
  }
}

// Iniciar pruebas
console.log(`Iniciando pruebas específicas para el wrapper ATTOM en ${ATTOM_WRAPPER_URL}...\n`);

testSpecificFormat().catch(err => {
  console.error('Error general en pruebas:', err.message);
});