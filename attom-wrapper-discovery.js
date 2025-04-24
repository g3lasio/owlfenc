/**
 * Script para descubrir la estructura correcta de parámetros del wrapper de ATTOM API
 * 
 * Este script realiza peticiones sistemáticas al wrapper ATTOM con diferentes
 * combinaciones de parámetros y formatos para determinar el formato correcto.
 */

const axios = require('axios');

// URL del wrapper ATTOM
const ATTOM_WRAPPER_URL = 'https://attom-wrapper.replit.app';

// Colores para la consola
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Formatear respuesta para facilitar la lectura en la consola
 */
function formatResponse(data) {
  try {
    if (typeof data === 'string') {
      return data;
    }
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return 'Error al formatear respuesta: ' + e.message;
  }
}

/**
 * Prueba todos los endpoints conocidos del wrapper con diferentes formatos de parámetros
 */
async function discoverEndpoints() {
  const endpoints = [
    '/api/property/details',
    '/api/property',
    '/api/v1/property',
    '/api/properties'
  ];

  const paramFormats = [
    // Formato 1: address1, city, state, zip
    { address1: '123 Main St', city: 'San Francisco', state: 'CA', zip: '94105' },
    
    // Formato 2: address
    { address: '123 Main St, San Francisco, CA 94105' },
    
    // Formato 3: street, city, state, zip
    { street: '123 Main St', city: 'San Francisco', state: 'CA', zip: '94105' },
    
    // Formato 4: fullAddress
    { fullAddress: '123 Main St, San Francisco, CA 94105' },
    
    // Formato 5: query
    { query: '123 Main St, San Francisco, CA 94105' },
    
    // Formato 6: propietario
    { owner: 'John Doe' },
    
    // Formato 7: propiedad por ID
    { id: '12345' },
    
    // Formato 8: latitude/longitude
    { latitude: '37.7749', longitude: '-122.4194' },
    
    // Formato 9: combinación más completa
    { 
      address1: '123 Main St', 
      address2: '', 
      city: 'San Francisco', 
      state: 'CA', 
      zip: '94105',
      country: 'US'
    }
  ];

  let successfulEndpoints = [];

  console.log(`${COLORS.magenta}=== DESCUBRIENDO ENDPOINTS Y FORMATOS DE PARÁMETROS ===${COLORS.reset}`);
  
  for (const endpoint of endpoints) {
    console.log(`\n${COLORS.blue}>> Probando endpoint: ${endpoint}${COLORS.reset}`);
    
    for (const [index, params] of paramFormats.entries()) {
      console.log(`\n${COLORS.yellow}> Formato ${index + 1}: ${JSON.stringify(params)}${COLORS.reset}`);
      
      try {
        const response = await axios.get(`${ATTOM_WRAPPER_URL}${endpoint}`, { params });
        
        console.log(`${COLORS.green}✓ ÉXITO - Status: ${response.status}${COLORS.reset}`);
        console.log(`${COLORS.cyan}Respuesta: ${formatResponse(response.data).substring(0, 300)}...${COLORS.reset}`);
        
        successfulEndpoints.push({
          endpoint,
          params,
          status: response.status
        });
      } catch (error) {
        console.log(`${COLORS.red}✗ ERROR - Status: ${error.response?.status || 'No status'}${COLORS.reset}`);
        console.log(`Mensaje: ${error.message}`);
        
        if (error.response?.data) {
          console.log(`Detalles: ${formatResponse(error.response.data)}`);
        }
      }
    }
  }

  console.log(`\n${COLORS.magenta}=== RESUMEN DE RESULTADOS ===${COLORS.reset}`);
  
  if (successfulEndpoints.length > 0) {
    console.log(`${COLORS.green}Se encontraron ${successfulEndpoints.length} combinaciones exitosas:${COLORS.reset}`);
    
    successfulEndpoints.forEach((result, index) => {
      console.log(`\n${COLORS.cyan}${index + 1}. Endpoint: ${result.endpoint}${COLORS.reset}`);
      console.log(`${COLORS.yellow}   Parámetros: ${JSON.stringify(result.params)}${COLORS.reset}`);
      console.log(`${COLORS.green}   Status: ${result.status}${COLORS.reset}`);
    });
  } else {
    console.log(`${COLORS.red}No se encontraron combinaciones exitosas.${COLORS.reset}`);
    console.log(`${COLORS.yellow}Sugerencias:${COLORS.reset}`);
    console.log(`1. Verificar que el servicio wrapper esté funcionando correctamente`);
    console.log(`2. Revisar la documentación original del wrapper`);
    console.log(`3. Contactar al desarrollador del wrapper para obtener los parámetros correctos`);
  }
}

// Iniciar el proceso de descubrimiento
console.log(`${COLORS.cyan}Iniciando descubrimiento de formato de parámetros para ATTOM wrapper...${COLORS.reset}`);
console.log(`URL base: ${ATTOM_WRAPPER_URL}\n`);

discoverEndpoints().catch(error => {
  console.error(`${COLORS.red}Error general:${COLORS.reset}`, error.message);
});