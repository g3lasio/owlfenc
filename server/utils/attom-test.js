// Utilidad para pruebas de la API de ATTOM 
// Ejecutar con: node server/utils/attom-test.js
import axios from 'axios';
import https from 'https';
import fs from 'fs';

// Obtener la API key del entorno
const apiKey = process.env.ATTOM_API_KEY;

if (!apiKey) {
  console.error('Error: No se encontró ATTOM_API_KEY en las variables de entorno');
  process.exit(1);
}

// Dirección de prueba
const testAddress = '1234 Main St, San Francisco, CA 94111';
const addressParts = testAddress.split(',');
const address1 = addressParts[0].trim();
const address2 = addressParts.slice(1).join(',').trim();

console.log('Probando API de ATTOM con:');
console.log(`Dirección: ${testAddress}`);
console.log(`address1=${address1}`);
console.log(`address2=${address2}`);
console.log(`API Key length: ${apiKey.length} chars, primeros 5 caracteres: ${apiKey.substring(0, 5)}`);

// Crear un agente HTTPS con keep-alive
const agent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 10
});

// Lista de formatos de headers a probar
const headerFormats = [
  { name: 'apikey', value: { 'apikey': apiKey } },
  { name: 'APIKey', value: { 'APIKey': apiKey } },
  { name: 'api_key', value: { 'api_key': apiKey } },
  { name: 'api-key', value: { 'api-key': apiKey } },
  { name: 'X-API-Key', value: { 'X-API-Key': apiKey } },
  // Un requisito común en APIs es incluir un token en la autorización
  { name: 'Authorization Bearer', value: { 'Authorization': `Bearer ${apiKey}` } },
  // Algunos servicios de ATTOM tienen campos de login/password separados
  { name: 'Login fields', value: { 'APILogin': 'demo@attomdata.com', 'APIPassword': apiKey } }
];

// Lista de endpoints a probar
const endpoints = [
  '/property/basicprofile',
  '/property/detail',
  '/property/detailowner'
];

// Función para probar todas las combinaciones
async function testAllCombinations() {
  const baseURL = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';
  
  for (const headerFormat of headerFormats) {
    for (const endpoint of endpoints) {
      try {
        console.log(`\n-- Probando ${endpoint} con header ${headerFormat.name} --`);
        
        // Configurar cliente temporal para esta prueba
        const httpClient = axios.create({
          baseURL,
          headers: {
            ...headerFormat.value,
            'Accept': 'application/json'
          },
          httpsAgent: agent,
          timeout: 10000
        });
        
        // Realizar petición con parámetros adecuados
        const response = await httpClient.get(endpoint, {
          params: {
            address1,
            address2
          }
        });
        
        console.log(`✅ ÉXITO con ${headerFormat.name} en ${endpoint}!`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Data: ${JSON.stringify(response.data).substring(0, 150)}...`);
        
        // Si encontramos una combinación que funciona, podemos guardarla para referencia
        fs.writeFileSync(
          'attom-success-config.json', 
          JSON.stringify({ 
            headerFormat: headerFormat.name, 
            endpoint 
          }, null, 2)
        );
        
      } catch (error) {
        console.log(`❌ ERROR con ${headerFormat.name} en ${endpoint}:`);
        console.log(`   ${error.message}`);
        
        if (error.response) {
          console.log(`   Status: ${error.response.status}`);
          console.log(`   Respuesta: ${JSON.stringify(error.response.data || {}).substring(0, 150)}...`);
          console.log(`   Headers: ${JSON.stringify(error.response.headers || {}).substring(0, 150)}...`);
        }
      }
    }
  }
}

// Ejecutar las pruebas
console.log('Iniciando pruebas a la API de ATTOM...');
testAllCombinations()
  .then(() => {
    console.log('\nPruebas completadas.');
  })
  .catch(err => {
    console.error('Error general durante las pruebas:', err);
  });