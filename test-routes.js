// Script para verificar la ruta de la API de propiedades

const axios = require('axios');

// Función para probar la ruta de detalles de propiedad
async function testPropertyDetails() {
  console.log('=== TEST DE RUTA DE API DE PROPIEDADES ===');
  
  try {
    // Dirección de prueba
    const testAddress = '123 Main St, Los Angeles, CA 90001';
    
    console.log('Realizando petición a /api/property/details con dirección:', testAddress);
    
    const response = await axios.get('http://localhost:3000/api/property/details', {
      params: { address: testAddress }
    });
    
    console.log('Código de estado:', response.status);
    console.log('Respuesta de la API:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Verificar que los datos de respuesta tienen la estructura esperada
    if (response.data) {
      const isValidFormat = 'address' in response.data && 
                           'owner' in response.data && 
                           'verified' in response.data;
                           
      console.log('\nFormato de respuesta válido:', isValidFormat ? 'SÍ' : 'NO');
      
      if (response.data.verified === false) {
        console.log('\nRespuesta correcta cuando la API externa no está disponible');
        console.log('Se devuelve un objeto con verified = false en lugar de datos ficticios');
      } else if (response.data.verified === true) {
        console.log('\nRespuesta correcta con datos reales verificados de CoreLogic');
      }
    } else {
      console.log('\nRespuesta vacía o inválida');
    }
    
  } catch (error) {
    console.error('\nERROR AL REALIZAR LA PETICIÓN:', error.message);
    
    if (error.response) {
      console.error('Detalles del error:');
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Datos: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Ejecutar el test
testPropertyDetails();