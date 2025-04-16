/**
 * Verificador de API Key ATTOM
 * 
 * Este script realiza pruebas básicas para verificar el funcionamiento
 * de una API key de ATTOM con diferentes formatos de autenticación.
 * 
 * Uso:
 * 1. Guarde este archivo como verificador-attom.js
 * 2. Ejecute: node verificador-attom.js SU_API_KEY_AQUÍ
 * 
 * Ejemplo:
 * node verificador-attom.js abc123def456
 * 
 * Recomendado para diagnóstico con soporte técnico de ATTOM.
 */

import axios from 'axios';
import https from 'https';

// Obtener la API key de los argumentos de línea de comandos
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('\nError: Debe proporcionar una API key como argumento.\n');
  console.error('Uso: node verificador-attom.js SU_API_KEY_AQUÍ\n');
  process.exit(1);
}

// Dirección de prueba
const testAddress = "123 Main St, Anytown, USA 12345";
const address1 = testAddress.split(',')[0].trim();
const address2 = testAddress.slice(testAddress.indexOf(',') + 1).trim();

console.log('====== VERIFICADOR DE API KEY ATTOM ======');
console.log('Fecha de prueba:', new Date().toLocaleString());
console.log(`API Key: ${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}`);
console.log(`Longitud de API Key: ${apiKey.length} caracteres`);
console.log('Dirección de prueba:', testAddress);
console.log('==================================\n');

// Configurar cliente HTTPS con keepAlive
const agent = new https.Agent({ 
  keepAlive: true,
  maxSockets: 5 
});

// Formatos de header a probar
const headerVariants = [
  { name: 'apikey', headers: { 'apikey': apiKey, 'Accept': 'application/json' } },
  { name: 'APIKey', headers: { 'APIKey': apiKey, 'Accept': 'application/json' } },
  { name: 'X-API-Key', headers: { 'X-API-Key': apiKey, 'Accept': 'application/json' } },
  { name: 'Bearer Token', headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' } }
];

// Puntos finales básicos para probar
const endpoints = [
  '/property/basicprofile',
  '/property/detail',
  '/property/detailowner'
];

// Función para probar un endpoint con un formato de header
async function testCombination(headerVariant, endpoint) {
  try {
    console.log(`> Probando con header "${headerVariant.name}" y endpoint "${endpoint}"...`);
    
    const client = axios.create({
      baseURL: 'https://api.gateway.attomdata.com/propertyapi/v1.0.0',
      headers: headerVariant.headers,
      httpsAgent: agent,
      timeout: 10000
    });
    
    const response = await client.get(endpoint, {
      params: { address1, address2 }
    });
    
    console.log(`  ✅ ÉXITO (status ${response.status})`);
    
    // Verificar si hay propiedades en la respuesta
    if (response.data && response.data.property && response.data.property.length > 0) {
      console.log(`  Propiedades encontradas: ${response.data.property.length}`);
      return true;
    } else {
      console.log('  ⚠️ Respuesta recibida pero sin propiedades en los datos');
      return false;
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    
    if (error.response) {
      console.log(`  Código de estado: ${error.response.status}`);
      
      if (error.response.data && error.response.data.status) {
        console.log(`  Mensaje del servidor: ${JSON.stringify(error.response.data.status)}`);
      }
    }
    
    return false;
  }
}

// Función principal
async function main() {
  let successful = false;
  
  // Probar cada combinación de header y endpoint
  for (const headerVariant of headerVariants) {
    for (const endpoint of endpoints) {
      const result = await testCombination(headerVariant, endpoint);
      
      if (result) {
        successful = true;
        console.log(`\n✅ ¡COMBINACIÓN EXITOSA ENCONTRADA!`);
        console.log(`  Header: ${headerVariant.name}`);
        console.log(`  Endpoint: ${endpoint}\n`);
        break;
      }
    }
    
    if (successful) break;
  }
  
  // Mostrar resumen de resultados
  console.log('\n====== RESUMEN DE VERIFICACIÓN ======');
  
  if (successful) {
    console.log('✅ API Key verificada y funcional');
    console.log('Se encontró al menos una combinación de autenticación que funciona correctamente.');
  } else {
    console.log('❌ No se pudo verificar la API Key');
    console.log('Todas las combinaciones de autenticación probadas fallaron.');
    console.log('\nPosibles causas:');
    console.log('1. La API key no es válida o ha expirado');
    console.log('2. La cuenta no tiene una suscripción activa para estos servicios');
    console.log('3. Existen restricciones de IP para el uso de esta API key');
    console.log('4. El formato de autenticación requerido es diferente a los probados');
  }
  
  console.log('\nComparta estos resultados con el soporte técnico de ATTOM');
  console.log('====================================');
}

main();