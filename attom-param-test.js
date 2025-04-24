/**
 * Script para probar los parámetros correctos para el wrapper de ATTOM
 */
import axios from 'axios';

const ATTOM_WRAPPER_URL = 'https://attom-wrapper.replit.app';
const ENDPOINT = '/api/property/details';

async function testParams(params) {
  try {
    console.log(`Consultando con parámetros:`, params);
    const response = await axios.get(`${ATTOM_WRAPPER_URL}${ENDPOINT}`, { params });
    console.log('Status:', response.status);
    console.log('Respuesta:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log(`Error (${error.message}):`);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Respuesta:', typeof error.response.data === 'object' 
        ? JSON.stringify(error.response.data, null, 2)
        : error.response.data);
    }
    return false;
  }
}

async function main() {
  // Probar diferentes combinaciones de parámetros
  const paramTests = [
    { address1: "123 Main St" },
    { address1: "123 Main St", city: "San Francisco", state: "CA" },
    { address1: "123 Main St", address2: "", city: "San Francisco", state: "CA", zip: "94105" },
    { street: "123 Main St", city: "San Francisco", state: "CA" },
    { streetAddress: "123 Main St", city: "San Francisco", state: "CA" },
    { street_address: "123 Main St", city: "San Francisco", state: "CA" },
    { full_address: "123 Main St, San Francisco, CA 94105" },
    { fullAddress: "123 Main St, San Francisco, CA 94105" },
    { query: "123 Main St, San Francisco, CA 94105" }
  ];
  
  console.log('=== PROBANDO DIFERENTES PARÁMETROS ===');
  console.log(`Endpoint: ${ATTOM_WRAPPER_URL}${ENDPOINT}`);
  
  let successCount = 0;
  for (const params of paramTests) {
    console.log('\n-----------------------------------');
    const success = await testParams(params);
    if (success) {
      successCount++;
      console.log('✅ ÉXITO');
    } else {
      console.log('❌ FALLÓ');
    }
  }
  
  console.log('\n===================================');
  console.log(`Resultados: ${successCount} de ${paramTests.length} pruebas tuvieron éxito`);
}

main()
  .catch(error => console.error('Error general:', error));