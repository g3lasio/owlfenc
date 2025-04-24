/**
 * Script para probar el formato correcto de dirección para ATTOM wrapper
 */
import axios from 'axios';

const ATTOM_WRAPPER_URL = 'https://attom-wrapper.replit.app';
const ENDPOINT = '/api/property/details';

async function testAddress(address) {
  try {
    console.log(`Consultando dirección: "${address}"`);
    const response = await axios.get(`${ATTOM_WRAPPER_URL}${ENDPOINT}`, {
      params: { address }
    });
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
  // Probar diferentes formatos de dirección
  const addresses = [
    "123 Main St",
    "123 Main St, San Francisco, CA",
    "123 Main St, San Francisco, CA 94105",
    "123 Main Street",
    "123 Main Street, San Francisco, California",
    "1600 Amphitheatre Parkway, Mountain View, CA",
    "1600 Amphitheatre Parkway, Mountain View, CA 94043",
    "One Microsoft Way, Redmond, WA 98052",
    "One Apple Park Way, Cupertino, CA 95014"
  ];
  
  console.log('=== PROBANDO DIFERENTES FORMATOS DE DIRECCIÓN ===');
  console.log(`Endpoint: ${ATTOM_WRAPPER_URL}${ENDPOINT}`);
  
  let successCount = 0;
  for (const address of addresses) {
    console.log('\n-----------------------------------');
    const success = await testAddress(address);
    if (success) {
      successCount++;
      console.log('✅ ÉXITO');
    } else {
      console.log('❌ FALLÓ');
    }
  }
  
  console.log('\n===================================');
  console.log(`Resultados: ${successCount} de ${addresses.length} direcciones tuvieron éxito`);
}

main()
  .catch(error => console.error('Error general:', error));