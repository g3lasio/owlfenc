/**
 * Script para probar el wrapper de ATTOM directamente
 */
import axios from 'axios';

// La URL exacta proporcionada
const ATTOM_WRAPPER_URL = 'https://attom-wrapper.replit.app';

async function test() {
  // Intentar diferentes variaciones de endpoints
  const tests = [
    { url: `${ATTOM_WRAPPER_URL}/api/property/details`, params: { address: '123 Main St' } },
    { url: `${ATTOM_WRAPPER_URL}/property/details`, params: { address: '123 Main St' } },
    { url: `${ATTOM_WRAPPER_URL}/details`, params: { address: '123 Main St' } },
    { url: `${ATTOM_WRAPPER_URL}/verify`, params: { address: '123 Main St' } },
    { url: `${ATTOM_WRAPPER_URL}/search`, params: { address: '123 Main St' } },
    
    // Intentar sin parámetros
    { url: `${ATTOM_WRAPPER_URL}/api` },
    
    // Intentar con formato de ruta diferente
    { url: `${ATTOM_WRAPPER_URL}/123+Main+St` }
  ];
  
  console.log('=== PROBANDO WRAPPER DE ATTOM ===');
  for (const test of tests) {
    try {
      console.log(`\nConsultando: ${test.url}`);
      if (test.params) {
        console.log('Parámetros:', test.params);
      }
      
      const response = await axios.get(test.url, test.params ? { params: test.params } : undefined);
      console.log('Status:', response.status);
      console.log('Tipo de respuesta:', typeof response.data);
      console.log('Respuesta:', typeof response.data === 'string' 
        ? response.data.substring(0, 200) 
        : JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
      
      console.log('\n¡ÉXITO! Endpoint encontrado');
    } catch (error) {
      console.log('Error:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Respuesta:', typeof error.response.data === 'string' 
          ? error.response.data.substring(0, 100) 
          : JSON.stringify(error.response.data, null, 2).substring(0, 100) + '...');
      }
    }
  }
}

test()
  .catch(error => console.error('Error general:', error));