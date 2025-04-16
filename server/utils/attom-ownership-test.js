// Utilidad para probar el acceso a datos de propietario de ATTOM
// Ejecutar con: node server/utils/attom-ownership-test.js

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

// Dirección de prueba - esta es una dirección conocida para probar
const testAddress = '1234 Main St, San Francisco, CA 94111';
const address1 = testAddress.split(',')[0].trim();
const address2 = testAddress.slice(testAddress.indexOf(',') + 1).trim();

console.log('================ PRUEBA DE API ATTOM - DATOS DE PROPIEDAD ================');
console.log('Dirección de prueba:', testAddress);
console.log(`Parámetros: address1=${address1}, address2=${address2}`);
console.log(`Clave API disponible (longitud: ${apiKey.length}, primeros 5 caracteres: ${apiKey.substring(0, 5)})`);
console.log('====================================================================');

// Crear agente HTTPS con keepAlive
const agent = new https.Agent({ 
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 10
});

// Headers a probar
const headerVariants = [
  { 'apikey': apiKey },         // Minúsculas (estándar común)
  { 'APIKey': apiKey },         // CamelCase (según documentación)
  { 'api_key': apiKey },        // Snake case
  { 'api-key': apiKey },        // Kebab case
  { 'X-API-Key': apiKey },      // Prefijo X común
  { 'Authorization': `Bearer ${apiKey}` }, // Bearer token (común en APIs)
  // También probar combinaciones múltiples
  { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` } // Doble autenticación
];

// Endpoints a probar, incluido el de propietario
const endpoints = [
  '/property/basicprofile',
  '/property/detail',
  '/property/detailowner'
];

// Función para probar un header y endpoint específicos
async function testAttomAPI(header, endpoint) {
  console.log(`\nProbando con header: ${Object.keys(header)[0]}`);
  console.log(`Endpoint: ${endpoint}`);
  
  try {
    const client = axios.create({
      baseURL: 'https://api.gateway.attomdata.com/propertyapi/v1.0.0',
      headers: {
        ...header,
        'Accept': 'application/json'
      },
      httpsAgent: agent,
      timeout: 15000
    });
    
    const startTime = Date.now();
    const response = await client.get(endpoint, {
      params: { address1, address2 }
    });
    const endTime = Date.now();
    
    console.log(`✅ ÉXITO (${endTime - startTime}ms) - Status: ${response.status}`);
    
    // Verificar si hay datos de propiedad
    if (response.data && response.data.property && response.data.property.length > 0) {
      console.log(`  Propiedad encontrada: ${response.data.property.length} resultados`);
      
      // Verificar datos de propietario si usamos el endpoint correcto
      if (endpoint === '/property/detailowner') {
        const propertyData = response.data.property[0];
        if (propertyData.owner && propertyData.owner.length > 0) {
          const ownerData = propertyData.owner[0];
          console.log('  ✅ DATOS DE PROPIETARIO ENCONTRADOS:');
          console.log(`     Nombre: ${ownerData.name || 'No disponible'}`);
          console.log(`     Dirección postal: ${ownerData.mailingAddress?.oneLine || 'No disponible'}`);
          
          // Extraer campos específicos importantes para verificar permisos completos
          console.log('\n  Campos disponibles del propietario:');
          for (const key in ownerData) {
            console.log(`     - ${key}: ${typeof ownerData[key] === 'object' ? 'Objeto' : 'Valor disponible'}`);
          }
          
          return true;
        } else {
          console.log('  ⚠️ ALERTA: No se encontraron datos de propietario');
        }
      } else {
        console.log('  ℹ️ INFO: Este endpoint no incluye datos de propietario');
      }
      
      return true;
    } else {
      console.log('  ⚠️ ALERTA: No se encontraron propiedades');
      return false;
    }
  } catch (error) {
    console.log(`❌ ERROR - ${error.message}`);
    
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Mensaje: ${JSON.stringify(error.response.data)}`);
    }
    
    return false;
  }
}

// Función principal
async function runTests() {
  console.log('Iniciando pruebas a la API ATTOM para verificar acceso a datos de propietario...\n');
  
  let ownerDataFound = false;
  
  // Primero probar el endpoint específico para propietario con todos los headers
  console.log('=== FASE 1: PROBAR ENDPOINT ESPECÍFICO DE PROPIETARIO ===');
  for (const header of headerVariants) {
    const success = await testAttomAPI(header, '/property/detailowner');
    if (success) {
      ownerDataFound = true;
      console.log('\n✅ ¡ÉXITO! Combinación funcional encontrada para datos de propietario');
      console.log(`Header: ${Object.keys(header)[0]}`);
      console.log('Endpoint: /property/detailowner');
      break;
    }
  }
  
  // Si no encontramos datos de propietario, probar otros endpoints
  if (!ownerDataFound) {
    console.log('\n=== FASE 2: PROBAR OTROS ENDPOINTS ===');
    console.log('No se encontraron datos de propietario con el endpoint principal.');
    console.log('Probando acceso general a la API con otros endpoints...\n');
    
    for (const header of headerVariants) {
      for (const endpoint of ['/property/basicprofile', '/property/detail']) {
        const success = await testAttomAPI(header, endpoint);
        if (success) {
          console.log(`\n✅ API funcional con Header: ${Object.keys(header)[0]}, Endpoint: ${endpoint}`);
          console.log('  ⚠️ Pero no se pudieron obtener datos de propietario');
          break;
        }
      }
    }
  }
  
  console.log('\n====================================================================');
  if (ownerDataFound) {
    console.log('✅ CONCLUSIÓN: Se encontraron datos de propietario correctamente');
    console.log('La API ATTOM está funcionando con los permisos necesarios para datos de propietario');
  } else {
    console.log('⚠️ CONCLUSIÓN: No se pudieron obtener datos de propietario');
    console.log('Posibles causas:');
    console.log('1. La clave API no tiene permisos para datos de propietario');
    console.log('2. El formato de dirección no es compatible');
    console.log('3. Problemas de conectividad con la API');
  }
  console.log('====================================================================');
}

// Ejecutar las pruebas
runTests();