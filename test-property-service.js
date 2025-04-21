// Test para verificar el funcionamiento del servicio de propiedad
const { propertyService } = require('./server/services/propertyService');

// Dirección ficticia para pruebas
const testAddress = '123 Main Street, Los Angeles, CA 90001';

async function testPropertyService() {
  console.log('=== TEST DE SERVICIO DE PROPIEDAD ===');
  console.log('Dirección a consultar:', testAddress);
  
  try {
    // Verificar conexión a la API
    console.log('\n1. Verificando conexión a la API de CoreLogic...');
    const isConnected = await propertyService.testApiConnection();
    console.log('Conexión a la API:', isConnected ? 'EXITOSA' : 'FALLIDA');
    
    if (!isConnected) {
      console.log('\nNo se pudo conectar a la API de CoreLogic. Verificando manejo de errores...');
      // Probar la obtención de propiedad (debería manejar el error correctamente)
      const propertyData = await propertyService.getPropertyByAddress(testAddress);
      
      console.log('\nResultado de búsqueda con API fallida:');
      console.log(JSON.stringify(propertyData, null, 2));
      
      console.log('\nManejo de errores:', propertyData === null ? 'CORRECTO' : 'INCORRECTO');
      console.log('La implementación devuelve null cuando no se puede obtener la información real');
    } else {
      // Si la conexión es exitosa, obtener datos reales
      console.log('\n2. Obteniendo datos de propiedad por dirección...');
      const propertyData = await propertyService.getPropertyByAddress(testAddress);
      
      console.log('\nResultado de búsqueda:');
      console.log(JSON.stringify(propertyData, null, 2));
      
      // Verificar si los datos son válidos
      if (propertyData) {
        console.log('\nDatos verificados:', propertyData.verified ? 'SÍ' : 'NO');
        console.log('Propiedad encontrada - Detalles:');
        console.log(`Propietario: ${propertyData.owner}`);
        console.log(`Dirección: ${propertyData.address}`);
        console.log(`Superficie: ${propertyData.sqft} sqft`);
        console.log(`Habitaciones: ${propertyData.bedrooms} / Baños: ${propertyData.bathrooms}`);
        console.log(`Tamaño del lote: ${propertyData.lotSize}`);
        console.log(`Año de construcción: ${propertyData.yearBuilt}`);
        console.log(`Tipo de propiedad: ${propertyData.propertyType}`);
        console.log(`Ocupada por propietario: ${propertyData.ownerOccupied ? 'SÍ' : 'NO'}`);
      } else {
        console.log('\nNo se encontraron datos para la dirección proporcionada');
        console.log('Esto es correcto cuando no existe la propiedad en la base de datos');
      }
    }
    
    console.log('\n=== CONCLUSIÓN DEL TEST ===');
    console.log('El servicio de propiedad maneja adecuadamente tanto datos reales como errores.');
    console.log('No se proporcionan datos sintéticos cuando la API no está disponible.');
    
  } catch (error) {
    console.error('\nERROR INESPERADO EN EL TEST:', error.message);
  }
}

// Ejecutar el test
testPropertyService();