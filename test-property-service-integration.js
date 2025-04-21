// Este script de prueba invoca los endpoints del servidor para probar
// la funcionalidad del PropertyService con CoreLogic usando la integración existente

import axios from 'axios';

const SERVER_PORT = 5000; // Puerto donde se ejecuta el servidor Express en Replit
const TEST_ADDRESS = '123 Main St, Boston, MA 02101'; // Dirección de prueba

async function testPropertyAPI() {
  try {
    console.log('=== PRUEBA DE INTEGRACIÓN DE PROPERTYSERVICE ===');
    console.log(`Utilizando dirección de prueba: ${TEST_ADDRESS}`);
    
    // Paso 1: Verificar si el servidor está en ejecución
    try {
      const healthCheck = await axios.get(`http://localhost:${SERVER_PORT}/`);
      console.log('✅ Servidor activo y respondiendo');
    } catch (error) {
      console.error(`❌ Error: No se pudo conectar con el servidor en puerto ${SERVER_PORT}`);
      console.log('Asegúrate de que el servidor Express esté en ejecución (npm run dev)');
      return;
    }
    
    // Paso 2: Probar el endpoint de detalles de propiedad
    console.log('Probando endpoint de detalles de propiedad...');
    
    try {
      const response = await axios.get(`http://localhost:${SERVER_PORT}/api/property/details`, {
        params: { address: TEST_ADDRESS }
      });
      
      if (response.data) {
        console.log('✅ Respuesta recibida del endpoint de propiedad');
        console.log('Datos recibidos:');
        console.log(JSON.stringify(response.data, null, 2));
        
        // Verificar si los datos son reales o están simulados
        if (response.data.verified === true) {
          console.log('✅ Los datos son REALES y verificados');
        } else if (response.data === null) {
          console.log('ℹ️ No se encontraron datos para la dirección proporcionada');
        } else {
          console.log('⚠️ Los datos podrían estar simulados o no verificados');
        }
      } else {
        console.log('❓ El endpoint respondió pero no devolvió datos');
      }
    } catch (error) {
      console.error('❌ Error al llamar al endpoint de detalles de propiedad:', error.message);
      if (error.response) {
        console.error('Respuesta del servidor:', error.response.status, error.response.data);
      }
    }
    
    console.log('=== FIN DE LA PRUEBA ===');
  } catch (error) {
    console.error('Error general durante la prueba:', error);
  }
}

// Ejecutar prueba
console.log('Iniciando prueba de integración...');
testPropertyAPI();