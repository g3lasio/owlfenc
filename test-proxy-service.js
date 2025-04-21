import * as dotenv from 'dotenv';
import axios from 'axios';
import { URLSearchParams } from 'url';

dotenv.config();

/**
 * Script para probar la conexión con CoreLogic API mediante el servicio proxy
 * 
 * Este script intenta obtener un token de acceso y realizar una búsqueda de propiedad básica.
 */

// Configuración
const CONSUMER_KEY = process.env.CORELOGIC_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CORELOGIC_CONSUMER_SECRET;
const BASE_URL = 'https://api-sandbox.corelogic.com';

async function getAccessToken() {
  try {
    console.log('Intentando obtener token de acceso...');
    
    // Construir parámetros de la solicitud
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', CONSUMER_KEY);
    params.append('client_secret', CONSUMER_SECRET);
    
    // Realizar solicitud de token
    const response = await axios.post(`${BASE_URL}/access/oauth/token`, 
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.access_token) {
      console.log('✅ Token de acceso obtenido correctamente');
      return response.data.access_token;
    } else {
      console.error('❌ Error: No se recibió un token de acceso válido');
      return null;
    }
  } catch (error) {
    console.error('❌ Error al obtener token de acceso:', error.message);
    if (error.response) {
      console.error('Detalles del error de respuesta:', error.response.data);
    }
    return null;
  }
}

async function searchProperty(token, address) {
  try {
    console.log(`Buscando propiedad con dirección: ${address}`);
    
    // Realizar búsqueda de propiedad
    const response = await axios.get(`${BASE_URL}/property/v2/properties/search`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      params: {
        address: address,
        includeDetails: true
      }
    });
    
    console.log('✅ Búsqueda de propiedad exitosa');
    
    if (response.data && response.data.properties && response.data.properties.length > 0) {
      const property = response.data.properties[0];
      console.log(`ID de propiedad: ${property.propertyId}`);
      console.log(`Dirección: ${property.address?.oneLine || 'No disponible'}`);
      return property.propertyId;
    } else {
      console.log('❓ No se encontraron propiedades que coincidan con la dirección');
      return null;
    }
  } catch (error) {
    console.error('❌ Error al buscar propiedad:', error.message);
    if (error.response) {
      console.error('Detalles del error de respuesta:', error.response.data);
    }
    return null;
  }
}

async function getPropertyDetails(token, propertyId) {
  try {
    console.log(`Obteniendo detalles de propiedad con ID: ${propertyId}`);
    
    // Obtener detalles de la propiedad
    const response = await axios.get(`${BASE_URL}/property/v2/properties/${propertyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('✅ Detalles de propiedad obtenidos correctamente');
    
    // Imprimir algunos detalles de ejemplo
    const property = response.data;
    console.log('Detalles básicos:');
    console.log(`- Tipo de propiedad: ${property.propertyType || 'No disponible'}`);
    
    if (property.building) {
      console.log(`- Habitaciones: ${property.building?.rooms?.bedrooms || 'N/A'}`);
      console.log(`- Baños: ${property.building?.rooms?.bathrooms || 'N/A'}`);
      console.log(`- Superficie: ${property.building?.size?.sqft || 'N/A'} sq ft`);
      console.log(`- Año de construcción: ${property.building?.yearBuilt || 'N/A'}`);
    }
    
    if (property.owner) {
      console.log(`- Propietario: ${property.owner?.name || 'No disponible'}`);
    }
    
    return property;
  } catch (error) {
    console.error('❌ Error al obtener detalles de propiedad:', error.message);
    if (error.response) {
      console.error('Detalles del error de respuesta:', error.response.data);
    }
    return null;
  }
}

async function runTest() {
  console.log('=== PRUEBA DE CONEXIÓN CON CORELOGIC API ===');
  
  // Verificar credenciales
  if (!CONSUMER_KEY || !CONSUMER_SECRET) {
    console.error('❌ Error: Credenciales de CoreLogic no configuradas');
    console.log('Por favor configura las variables de entorno CORELOGIC_CONSUMER_KEY y CORELOGIC_CONSUMER_SECRET');
    return;
  }
  
  console.log('Credenciales encontradas en variables de entorno');
  
  // Obtener token de acceso
  const token = await getAccessToken();
  if (!token) {
    console.error('❌ No se pudo completar la prueba: Falló la autenticación');
    return;
  }
  
  // Dirección de prueba
  const testAddress = '123 Main St, Boston, MA 02101';
  
  // Buscar propiedad por dirección
  const propertyId = await searchProperty(token, testAddress);
  if (!propertyId) {
    console.log('⚠️ No se pudo completar la prueba completa: No se encontró una propiedad para la dirección de prueba');
    return;
  }
  
  // Obtener detalles de la propiedad
  await getPropertyDetails(token, propertyId);
  
  console.log('=== PRUEBA COMPLETADA ===');
}

// Ejecutar la prueba
runTest().catch(error => {
  console.error('Error inesperado durante la prueba:', error);
});