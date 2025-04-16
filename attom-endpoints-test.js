// Utilidad para probar todos los endpoints disponibles de ATTOM API
// Ejecutar con: node attom-endpoints-test.js
import axios from 'axios';
import https from 'https';
import fs from 'fs';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Obtener la API key del entorno
const apiKey = process.env.ATTOM_API_KEY;

if (!apiKey) {
  console.error('Error: No se encontró ATTOM_API_KEY en las variables de entorno');
  process.exit(1);
}

// Dirección de prueba conocida
const testAddress = '1234 Main St, Los Angeles, CA 90001';
const address1 = testAddress.split(',')[0].trim();
const address2 = testAddress.slice(testAddress.indexOf(',') + 1).trim();

// Crear un archivo de log para el diagnóstico completo
const logFilename = `attom-api-diagnosis-${new Date().toISOString().replace(/:/g, '-')}.log`;
const logStream = fs.createWriteStream(logFilename);

// Función para escribir en consola y en archivo de log
function log(message) {
  console.log(message);
  logStream.write(message + '\n');
}

log('============== DIAGNÓSTICO COMPLETO API ATTOM ==============');
log('Fecha y hora de la prueba: ' + new Date().toLocaleString());
log(`API Key: ${apiKey.substring(0, 5)}... (${apiKey.length} caracteres)`);
log(`Dirección de prueba: ${testAddress}`);
log(`address1="${address1}", address2="${address2}"`);
log('==========================================================');

// Crear agente HTTPS con Keep-Alive habilitado
const agent = new https.Agent({ 
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 10
});

// Lista completa de endpoints documentados de ATTOM API
const endpoints = [
  // Endpoints de Property API
  '/property/basicprofile',
  '/property/expandedprofile',
  '/property/detailwithschool',
  '/property/detailmortgage',
  '/property/detailowner',
  '/property/detailmortgageowner',
  '/property/schooldetail',
  '/property/alldetail',
  '/property/detail',
  
  // Endpoints de Sale API
  '/sale/snapshot',
  '/sale/detail',
  '/sale/history',
  '/sale/propertyhistory',
  
  // Endpoints de Valuation API
  '/valuation/avm',
  
  // Endpoints de School API 
  '/school/snapshot',
  '/school/detail',
  
  // Endpoints de Community API
  '/community/snapshot',
  '/community/detail',
  
  // Otros endpoints conocidos
  '/property/address',
  '/property/id',
  '/property/geocode',
  '/property/parcels',
  '/property/sales',
  '/property/assessments',
  '/property/deeds',
  '/property/forclosures'
];

// Formatos de header a probar
const headerVariants = [
  { 'apikey': apiKey },
  { 'APIKey': apiKey },
  { 'Authorization': `Bearer ${apiKey}` },
  { 'X-API-Key': apiKey }
];

// Función para probar un endpoint específico con todos los headers
async function testEndpoint(endpoint) {
  log(`\n> Probando endpoint: ${endpoint}`);
  
  let endpointWorks = false;
  let successfulHeader = null;
  
  for (const header of headerVariants) {
    const headerName = Object.keys(header)[0];
    log(`  Con header: ${headerName}`);
    
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
      
      // Parámetros para usar según el tipo de endpoint
      const params = endpoint.startsWith('/property') ? 
        { address1, address2 } : 
        { sourceName: 'Basic' }; // Parámetro genérico para otros endpoints
      
      const response = await client.get(endpoint, { params });
      const endTime = Date.now();
      
      log(`  ✅ ÉXITO (${endTime - startTime}ms) - Status: ${response.status}`);
      
      // Verificar estructura básica de respuesta
      const hasData = response.data && Object.keys(response.data).length > 0;
      log(`  Respuesta contiene datos: ${hasData ? 'SÍ' : 'NO'}`);
      
      if (hasData) {
        log(`  Estructura básica de respuesta: ${Object.keys(response.data).join(', ')}`);
      }
      
      endpointWorks = true;
      successfulHeader = headerName;
      break; // Si funciona con un header, no probar los demás
    } catch (error) {
      // Log detallado del error
      log(`  ❌ ERROR: ${error.message}`);
      
      if (error.response) {
        log(`  Status: ${error.response.status}`);
        
        // Extraer mensaje de error específico de ATTOM si está disponible
        if (error.response.data && error.response.data.status) {
          log(`  Mensaje API: ${JSON.stringify(error.response.data.status)}`);
        }
      } else if (error.request) {
        log(`  No se recibió respuesta`);
      }
    }
  }
  
  if (endpointWorks) {
    log(`  ✅ Endpoint ${endpoint} funciona con header: ${successfulHeader}`);
    return { endpoint, works: true, header: successfulHeader };
  } else {
    log(`  ❌ Endpoint ${endpoint} no funciona con ningún header`);
    return { endpoint, works: false };
  }
}

// Función principal
async function runDiagnostic() {
  log('Iniciando diagnóstico completo de API ATTOM...\n');
  
  const results = [];
  
  // Probar cada endpoint
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
  }
  
  // Generar resumen
  log('\n=============== RESUMEN DE DIAGNÓSTICO ===============');
  const workingEndpoints = results.filter(r => r.works);
  
  if (workingEndpoints.length > 0) {
    log(`\n✅ ${workingEndpoints.length} de ${endpoints.length} endpoints funcionan:`);
    workingEndpoints.forEach(r => {
      log(`  - ${r.endpoint} (con header: ${r.header})`);
    });
    
    // Recomendar configuración
    const recommendedHeader = workingEndpoints[0].header;
    log(`\n📋 CONFIGURACIÓN RECOMENDADA:`);
    log(`  - Header: ${recommendedHeader}`);
    log(`  - Endpoint preferido: ${workingEndpoints[0].endpoint}`);
  } else {
    log('\n❌ Ningún endpoint funciona con esta API key.');
    log('Posibles problemas:');
    log('  1. La API key puede no ser válida');
    log('  2. La API key puede estar expirada');
    log('  3. Puede haber restricciones de IP');
    log('  4. El servicio puede estar experimentando problemas');
  }
  
  log('\n📄 Reporte completo guardado en: ' + logFilename);
  log('===================================================');
  
  // Cerrar el archivo de log
  logStream.end();
}

// Ejecutar el diagnóstico
runDiagnostic();