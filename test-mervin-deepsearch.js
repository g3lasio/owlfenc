/**
 * Script de prueba para la función Mervin DeepSearch
 * 
 * Este script realiza pruebas unitarias de los servicios de búsqueda 
 * y recuperación de información sobre permisos de construcción.
 */

import { searchService } from './server/services/searchService.js';
import { permitService } from './server/services/permitService.js';
import dotenv from 'dotenv';

dotenv.config();

async function testMervinDeepsearch() {
  try {
    console.log('=== PRUEBA DEL SERVICIO MERVIN DEEPSEARCH ===');
    
    // Verificar la configuración de OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error('ERROR: No se encontró OPENAI_API_KEY en las variables de entorno.');
      console.log('Por favor configura esta variable antes de ejecutar la prueba.');
      return;
    } else {
      console.log('✅ OPENAI_API_KEY configurada correctamente.');
    }
    
    // Test 1: Probar el servicio de búsqueda web
    console.log('\n1. Probando búsqueda web...');
    const query = 'fence permit requirements in Seattle, WA';
    const searchResults = await searchService.webSearch(query);
    
    console.log(`Resultados de búsqueda (${searchResults.length} URLs):`);
    searchResults.forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    
    // Test 2: Probar la extracción de contenido de una URL
    if (searchResults.length > 0) {
      console.log('\n2. Probando extracción de contenido...');
      const testUrl = searchResults[0];
      console.log(`Obteniendo contenido de: ${testUrl}`);
      
      const content = await searchService.fetchPage(testUrl);
      const previewLength = Math.min(content.length, 300);
      console.log(`Contenido extraído (primeros ${previewLength} caracteres):`);
      console.log(content.substring(0, previewLength) + '...');
      
      // Test 3: Probar el servicio completo de verificación de permisos
      console.log('\n3. Probando servicio completo de verificación de permisos...');
      const address = '123 Main St, Seattle, WA 98101';
      const projectType = 'fence';
      
      console.log(`Consultando permisos para proyecto de ${projectType} en ${address}`);
      const permitData = await permitService.checkPermits(address, projectType);
      
      console.log('Resultado de la verificación de permisos:');
      console.log(JSON.stringify(permitData, null, 2));
      
      // Verificaciones finales
      if (permitData && permitData.requiredPermits) {
        console.log(`\n✅ Prueba exitosa. Se encontraron ${permitData.requiredPermits.length} permisos requeridos.`);
      } else {
        console.log('\n❌ Prueba incompleta. La respuesta no tiene el formato esperado.');
      }
    } else {
      console.error('\n❌ No se obtuvieron resultados de búsqueda. No se pueden completar las pruebas restantes.');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA PRUEBA:');
    console.error(error);
  }
}

// Ejecutar la prueba
testMervinDeepsearch();