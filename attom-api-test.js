/**
 * Script para probar y diagnosticar la conexión con el wrapper de ATTOM API
 */
import axios from 'axios';

const ATTOM_WRAPPER_URL = 'https://attom-wrapper.replit.app';

async function testWrapperEndpoints() {
  console.log('=== INICIO DE PRUEBA DE WRAPPER ATTOM ===');
  console.log(`URL del wrapper: ${ATTOM_WRAPPER_URL}`);
  
  try {
    // Intentar obtener la página principal para ver qué información nos proporciona
    console.log('Consultando página principal del wrapper...');
    const response = await axios.get(ATTOM_WRAPPER_URL);
    console.log('Status:', response.status);
    console.log('Contenido de la respuesta:', response.data);
  } catch (error) {
    console.error('Error al consultar la página principal:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Datos de error:', error.response.data);
    }
  }
  
  // Intentar diferentes endpoints posibles
  const possibleEndpoints = [
    '/api/property',
    '/api/property-details',
    '/api/properties',
    '/api/attom',
    '/api/search',
    '/api/lookup',
    '/api/address',
    '/property'
  ];
  
  console.log('\nProbando posibles endpoints:');
  for (const endpoint of possibleEndpoints) {
    try {
      console.log(`\nConsultando ${ATTOM_WRAPPER_URL}${endpoint}...`);
      const response = await axios.get(`${ATTOM_WRAPPER_URL}${endpoint}`, {
        params: { address: '123 Main St' }
      });
      console.log('Status:', response.status);
      console.log('Tipo de respuesta:', typeof response.data);
      console.log('Datos:', JSON.stringify(response.data).substring(0, 100) + '...');
      
      // Si llegamos aquí, encontramos un endpoint que funciona
      console.log('\n¡ÉXITO! Endpoint encontrado:', endpoint);
      return endpoint;
    } catch (error) {
      console.log(`Endpoint ${endpoint} - Error:`, error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        if (error.response.data) {
          console.log('Respuesta:', typeof error.response.data === 'string' 
            ? error.response.data.substring(0, 100) 
            : JSON.stringify(error.response.data).substring(0, 100));
        }
      }
    }
  }
  
  console.log('\nNo se encontró ningún endpoint funcional');
  return null;
}

// Ejecutar prueba
testWrapperEndpoints()
  .then(endpoint => {
    if (endpoint) {
      console.log(`\nUSAR ESTE ENDPOINT: ${endpoint}`);
    } else {
      console.log('\nRevisa la implementación del wrapper. No se encontró ningún endpoint funcional.');
    }
  })
  .catch(error => {
    console.error('Error general:', error);
  });