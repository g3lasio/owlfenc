// Utilidad para probar diferentes formatos de direcciones con ATTOM API
// Ejecutar con: node attom-format-test.js
import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Obtener la API key del entorno
const apiKey = process.env.ATTOM_API_KEY;

if (!apiKey) {
  console.error('Error: No se encontró ATTOM_API_KEY en las variables de entorno');
  process.exit(1);
}

// Definir formatos de dirección a probar
const addressFormats = [
  // Dirección simple de prueba
  '1234 Main St, Los Angeles, CA 90001',
  
  // Formatos alternativos de la misma dirección
  '1234 Main Street, Los Angeles, CA 90001',
  '1234 Main St., Los Angeles, California 90001',
  '1234 Main Street Los Angeles CA 90001',
  
  // Dirección real de prueba (ejemplo conocido)
  '1600 Amphitheatre Parkway, Mountain View, CA 94043',
  
  // Variantes de formato para la dirección real
  '1600 Amphitheatre Pkwy, Mountain View, CA 94043',
  '1600 Amphitheatre Parkway Mountain View California 94043',
];

console.log('============== PRUEBA DE FORMATOS DE DIRECCIÓN API ATTOM ==============');
console.log('Fecha y hora de la prueba:', new Date().toLocaleString());
console.log(`API Key disponible (longitud: ${apiKey.length}, primeros 5 caracteres: ${apiKey.substring(0, 5)})`);
console.log('======================================================================');

// Crear agente HTTPS con Keep-Alive habilitado
const agent = new https.Agent({ 
  keepAlive: true,
  maxSockets: 5
});

// Función para probar una dirección
async function testAddress(fullAddress) {
  console.log(`\n> Probando dirección: "${fullAddress}"`);
  
  // Parsear la dirección en diferentes formatos
  const formats = getAddressFormats(fullAddress);
  
  // Probar cada formato
  for (const format of formats) {
    console.log(`\n  Formato: address1="${format.address1}", address2="${format.address2}"`);
    
    try {
      const client = axios.create({
        baseURL: 'https://api.gateway.attomdata.com/propertyapi/v1.0.0',
        headers: {
          'apikey': apiKey,
          'Accept': 'application/json'
        },
        httpsAgent: agent,
        timeout: 15000
      });
      
      const startTime = Date.now();
      const response = await client.get('/property/basicprofile', {
        params: { 
          address1: format.address1, 
          address2: format.address2 
        }
      });
      const endTime = Date.now();
      
      console.log(`  ✅ ÉXITO (${endTime - startTime}ms) - Status: ${response.status}`);
      
      // Verificar si hay datos de propiedad
      if (response.data && response.data.property && response.data.property.length > 0) {
        console.log(`  Propiedad encontrada: ${response.data.property.length} resultados`);
        
        // Extraer algunos datos básicos para confirmar
        const property = response.data.property[0];
        if (property.address) {
          console.log(`  Dirección confirmada: ${property.address.oneLine || 'No disponible'}`);
        }
        
        return true;
      } else {
        console.log('  ⚠️ No se encontraron propiedades en la respuesta');
      }
    } catch (error) {
      console.error('  ❌ ERROR:', error.message);
      
      // Mostrar detalles del error
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        if (error.response.data && error.response.data.status && error.response.data.status.msg) {
          console.error(`  Mensaje de error: ${error.response.data.status.msg}`);
        }
      }
    }
  }
  
  return false;
}

// Función para generar diferentes variantes de parseo de dirección
function getAddressFormats(fullAddress) {
  const formats = [];
  
  // Formato original: dividir por la primera coma
  const parts = fullAddress.split(',');
  formats.push({
    address1: parts[0].trim(),
    address2: parts.slice(1).join(',').trim()
  });
  
  // Formato alternativo 1: dirección completa en address1
  formats.push({
    address1: fullAddress,
    address2: ''
  });
  
  // Formato alternativo 2: probar extracción específica de componentes
  const addressParts = fullAddress.split(/,|\s+/);
  
  if (addressParts.length >= 4) {
    // address1 = número + calle
    const streetNum = addressParts[0];
    const streetName = addressParts.slice(1, 3).join(' ');
    
    formats.push({
      address1: `${streetNum} ${streetName}`,
      address2: addressParts.slice(3).join(' ')
    });
  }
  
  return formats;
}

// Función principal
async function runTests() {
  console.log('Iniciando pruebas de formato de dirección para ATTOM API...\n');
  
  for (const address of addressFormats) {
    await testAddress(address);
  }
  
  console.log('\n=== RESUMEN DE PRUEBAS DE FORMATO ===');
  console.log('Pruebas completadas para todos los formatos de dirección.');
  console.log('Revisa los resultados anteriores para identificar qué formatos funcionaron.');
}

// Ejecutar pruebas
runTests();