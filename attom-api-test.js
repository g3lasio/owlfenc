// Utilidad para pruebas de la API de ATTOM con diagnóstico detallado
// Ejecutar con: node attom-api-test.js
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

// Dirección de prueba - una dirección conocida para pruebas
const testAddress = '123 Main St, Anytown, US 12345';
const addressParts = testAddress.split(',');
const address1 = addressParts[0].trim();
const address2 = addressParts.slice(1).join(',').trim();

console.log('====================== DIAGNÓSTICO API ATTOM ======================');
console.log('Fecha y hora de la prueba:', new Date().toLocaleString());
console.log('Dirección de prueba:', testAddress);
console.log(`Parámetros: address1=${address1}, address2=${address2}`);
console.log(`API Key disponible (longitud: ${apiKey.length}, primeros 5 caracteres: ${apiKey.substring(0, 5)})`);
console.log('===================================================================');

// Crear agente HTTPS con Keep-Alive habilitado para reutilizar conexiones
const agent = new https.Agent({ 
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 10
});

// Diferentes formatos de headers para probar
const headerVariants = [
  { 'apikey': apiKey },              // Minúscula (estándar común)
  { 'APIKey': apiKey },              // CamelCase (documentación original ATTOM)
  { 'api_key': apiKey },             // Snake case
  { 'api-key': apiKey },             // Kebab case
  { 'X-API-Key': apiKey },           // Prefijo X común
  { 'Authorization': `Bearer ${apiKey}` } // Formato Bearer común
];

// Endpoints a probar
const endpoints = [
  '/property/detailowner',           // Detalles + propietario
  '/property/detail',                // Solo detalles de propiedad
  '/property/basicprofile'           // Perfil básico de propiedad
];

// Función para probar un header y endpoint específicos
async function testAttomAPI(header, endpoint) {
  console.log(`\n> Probando con header: ${Object.keys(header)[0]}`);
  console.log(`> Endpoint: ${endpoint}`);
  
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
    console.log(`  Response Headers:`, JSON.stringify(response.headers, null, 2));
    
    // Verificar si hay datos de propiedad
    if (response.data && response.data.property && response.data.property.length > 0) {
      console.log(`  Propiedad encontrada: ${response.data.property.length} resultados`);
      console.log(`  Campos disponibles en respuesta:`, Object.keys(response.data.property[0]).join(', '));
      
      // Verificar datos de propietario si usamos el endpoint correcto
      if (endpoint === '/property/detailowner') {
        const propertyData = response.data.property[0];
        if (propertyData.owner && propertyData.owner.length > 0) {
          const ownerData = propertyData.owner[0];
          console.log('  ✅ DATOS DE PROPIETARIO ENCONTRADOS:');
          console.log(`     Nombre: ${ownerData.name || 'No disponible'}`);
          
          // Para diagnóstico, mostrar todos los campos disponibles
          console.log('     Campos de propietario disponibles:', Object.keys(ownerData).join(', '));
        } else {
          console.log('  ⚠️ No se encontraron datos de propietario en la respuesta');
        }
      }
      
      return true;
    } else {
      console.log('  ⚠️ No se encontraron propiedades en la respuesta');
      console.log('  Estructura de la respuesta:', Object.keys(response.data || {}).join(', '));
      return false;
    }
  } catch (error) {
    // Registrar detalles del error para diagnóstico
    console.error('  ❌ ERROR:', error.message);
    
    // Mostrar información detallada del error para diagnóstico
    if (error.response) {
      // Error con respuesta del servidor
      console.error('  Status:', error.response.status);
      console.error('  Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // Error sin respuesta (timeout, problema de red)
      console.error('  No se recibió respuesta del servidor');
      console.error('  Request:', error.request._currentUrl || error.request.path);
    } else {
      // Error durante la configuración de la solicitud
      console.error('  Error en la configuración de la solicitud');
    }
    
    return false;
  }
}

// Función principal
async function runTests() {
  console.log('Iniciando pruebas de API ATTOM con diagnóstico completo...\n');
  
  let successEndpoint = null;
  let successHeader = null;
  
  // 1. Probar todos los headers con el endpoint de propietario primero
  console.log('=== FASE 1: PRUEBA DE ACCESO A DATOS DE PROPIETARIO ===');
  for (const header of headerVariants) {
    const success = await testAttomAPI(header, '/property/detailowner');
    if (success) {
      successEndpoint = '/property/detailowner';
      successHeader = header;
      console.log('\n✅ ¡ÉXITO! Combinación funcional encontrada para datos de propietario');
      console.log(`  Header: ${Object.keys(header)[0]}`);
      console.log('  Endpoint: /property/detailowner');
      break;
    }
  }
  
  // 2. Si no funciona, probar los endpoints más básicos
  if (!successEndpoint) {
    console.log('\n=== FASE 2: PRUEBA DE ENDPOINTS BÁSICOS ===');
    for (const header of headerVariants) {
      for (const endpoint of ['/property/basicprofile', '/property/detail']) {
        const success = await testAttomAPI(header, endpoint);
        if (success) {
          successEndpoint = endpoint;
          successHeader = header;
          console.log(`\n✅ API funcional con Header: ${Object.keys(header)[0]}, Endpoint: ${endpoint}`);
          break;
        }
      }
      if (successEndpoint) break;
    }
  }
  
  // 3. Resumen de resultados
  console.log('\n=== RESUMEN DE DIAGNÓSTICO ===');
  if (successEndpoint) {
    console.log(`✅ La API de ATTOM funciona con:`);
    console.log(`  - Header: ${Object.keys(successHeader)[0]}`);
    console.log(`  - Endpoint: ${successEndpoint}`);
    console.log(`  - Formato de dirección: address1="${address1}", address2="${address2}"`);
  } else {
    console.log('❌ No se pudo conectar con la API de ATTOM con ninguna combinación.');
    console.log('  Posibles problemas:');
    console.log('  1. La API key puede no ser válida o estar expirada');
    console.log('  2. Puede haber restricciones de IP o límites de uso');
    console.log('  3. El formato de dirección puede no ser aceptable');
    console.log('  4. El servicio ATTOM puede estar experimentando interrupciones');
  }
}

// Ejecutar pruebas
runTests();