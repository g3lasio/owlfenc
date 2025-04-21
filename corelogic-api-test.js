// Utilidad para probar la integración con la API de CoreLogic
// Ejecutar con: node corelogic-api-test.js
import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Obtener las credenciales del entorno
const consumerKey = process.env.CORELOGIC_CONSUMER_KEY;
const consumerSecret = process.env.CORELOGIC_CONSUMER_SECRET;

if (!consumerKey || !consumerSecret) {
  console.error('Error: No se encontraron las credenciales de CoreLogic en las variables de entorno');
  console.error('Asegúrese de configurar CORELOGIC_CONSUMER_KEY y CORELOGIC_CONSUMER_SECRET');
  process.exit(1);
}

// Dirección de prueba
const testAddress = '123 Main St, Los Angeles, CA 90001';

console.log('====================== DIAGNÓSTICO API CORELOGIC ======================');
console.log('Fecha y hora de la prueba:', new Date().toLocaleString());
console.log('Dirección de prueba:', testAddress);
console.log(`Consumer Key disponible (longitud: ${consumerKey.length}, primeros 5 caracteres: ${consumerKey.substring(0, 5)})`);
console.log(`Consumer Secret disponible (longitud: ${consumerSecret.length}, primeros 5 caracteres: ${consumerSecret.substring(0, 5)})`);
console.log('=======================================================================');

// Crear agente HTTPS con Keep-Alive habilitado
const agent = new https.Agent({ 
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 10
});

// Base URL de la API de CoreLogic
const baseUrl = 'https://api.corelogic.com';

// Paso 1: Obtener token de acceso
async function getAccessToken() {
  try {
    console.log('\n=== PASO 1: OBTENIENDO TOKEN DE ACCESO ===');
    
    const startTime = Date.now();
    const response = await axios.post(`${baseUrl}/access/oauth/token`, 
      'grant_type=client_credentials', 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`
        },
        httpsAgent: agent,
        timeout: 10000
      }
    );
    const endTime = Date.now();
    
    console.log(`✅ ÉXITO (${endTime - startTime}ms) - Status: ${response.status}`);
    
    if (response.data && response.data.access_token) {
      console.log('Token de acceso obtenido correctamente');
      console.log(`Tipo: ${response.data.token_type}`);
      console.log(`Expira en: ${response.data.expires_in} segundos`);
      return response.data.access_token;
    } else {
      console.error('❌ Error: No se pudo obtener el token de acceso - Respuesta inesperada');
      console.log('Respuesta:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error obteniendo token de acceso:', error.message);
    if (error.response) {
      console.error('Detalles del error:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Paso 2: Buscar propiedad por dirección
async function findPropertyByAddress(token, address) {
  try {
    console.log('\n=== PASO 2: BUSCANDO PROPIEDAD POR DIRECCIÓN ===');
    console.log('Dirección de búsqueda:', address);
    
    const startTime = Date.now();
    const response = await axios.get(`${baseUrl}/property/v2/properties/search`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      params: {
        address: address
      },
      httpsAgent: agent,
      timeout: 15000
    });
    const endTime = Date.now();
    
    console.log(`✅ ÉXITO (${endTime - startTime}ms) - Status: ${response.status}`);
    
    if (response.data && response.data.properties && response.data.properties.length > 0) {
      console.log(`Propiedades encontradas: ${response.data.properties.length}`);
      
      const property = response.data.properties[0];
      console.log('Primera propiedad encontrada:');
      console.log(`  ID: ${property.propertyId}`);
      console.log(`  Dirección: ${property.address?.oneLine || 'No disponible'}`);
      
      return property.propertyId;
    } else {
      console.log('⚠️ No se encontraron propiedades para la dirección proporcionada');
      console.log('Respuesta:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error buscando propiedad:', error.message);
    if (error.response) {
      console.error('Detalles del error:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Paso 3: Obtener detalles de la propiedad
async function getPropertyDetails(token, propertyId) {
  try {
    console.log('\n=== PASO 3: OBTENIENDO DETALLES DE LA PROPIEDAD ===');
    console.log('Property ID:', propertyId);
    
    const startTime = Date.now();
    const response = await axios.get(`${baseUrl}/property/v2/properties/${propertyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      httpsAgent: agent,
      timeout: 15000
    });
    const endTime = Date.now();
    
    console.log(`✅ ÉXITO (${endTime - startTime}ms) - Status: ${response.status}`);
    
    if (response.data) {
      console.log('Detalles de propiedad recibidos:');
      
      // Verificar si hay datos del propietario
      if (response.data.owner) {
        console.log('✅ DATOS DE PROPIETARIO ENCONTRADOS');
        console.log(`  Nombre: ${response.data.owner.name || 'No disponible'}`);
        if (response.data.owner.mailingAddress) {
          console.log(`  Dirección postal: ${response.data.owner.mailingAddress.oneLine || 'No disponible'}`);
        }
      } else {
        console.log('⚠️ No se encontraron datos de propietario');
      }
      
      // Verificar detalles de la propiedad
      if (response.data.building) {
        console.log('✅ DETALLES DE CONSTRUCCIÓN ENCONTRADOS');
        const building = response.data.building;
        console.log(`  Año de construcción: ${building.yearBuilt || 'No disponible'}`);
        if (building.size) {
          console.log(`  Superficie: ${building.size.universalSize || building.size.sqft || 'No disponible'} sqft`);
        }
        if (building.rooms) {
          console.log(`  Habitaciones: ${building.rooms.bedrooms || 'No disponible'} dormitorios, ${building.rooms.bathrooms || 'No disponible'} baños`);
        }
      } else {
        console.log('⚠️ No se encontraron detalles de construcción');
      }
      
      // Verificar tamaño del lote
      if (response.data.lot && response.data.lot.size) {
        console.log('✅ DATOS DE LOTE ENCONTRADOS');
        console.log(`  Tamaño: ${response.data.lot.size.acres || 'No disponible'} acres`);
      }
      
      return response.data;
    } else {
      console.log('⚠️ Respuesta vacía o inválida');
      return null;
    }
  } catch (error) {
    console.error('❌ Error obteniendo detalles de propiedad:', error.message);
    if (error.response) {
      console.error('Detalles del error:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Función principal
async function runTest() {
  console.log('Iniciando prueba de integración con CoreLogic...\n');
  
  try {
    // Paso 1: Obtener token
    const token = await getAccessToken();
    if (!token) {
      console.error('\n❌ ERROR: No se pudo obtener el token de acceso. No se puede continuar.');
      return;
    }
    
    // Paso 2: Buscar propiedad
    const propertyId = await findPropertyByAddress(token, testAddress);
    if (!propertyId) {
      console.error('\n❌ ERROR: No se pudo encontrar una propiedad. No se puede continuar.');
      return;
    }
    
    // Paso 3: Obtener detalles
    const propertyDetails = await getPropertyDetails(token, propertyId);
    if (!propertyDetails) {
      console.error('\n❌ ERROR: No se pudieron obtener los detalles de la propiedad.');
      return;
    }
    
    // Resumen final
    console.log('\n=== RESUMEN DE LA PRUEBA ===');
    console.log('✅ Autenticación: Exitosa');
    console.log('✅ Búsqueda de propiedad: Exitosa');
    console.log('✅ Obtención de detalles: Exitosa');
    console.log('\n✅ INTEGRACIÓN CON CORELOGIC FUNCIONAL');
    
  } catch (error) {
    console.error('\n❌ ERROR GENERAL:', error.message);
  }
}

// Ejecutar la prueba
runTest();