/**
 * Prueba unitaria específica para el autocompletado de Mapbox
 * 
 * Este script realiza pruebas directas de la API de Mapbox para verificar
 * que el token funcione correctamente y que las peticiones se estén realizando
 * de manera apropiada.
 */

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZzNsNGRpYXRvciIsImEiOiJjbTN6NGRqb3AwZnlvMnNxeTlzZjc4NXFjIn0.cSJOjr5rlOoKKIGYjCdEvw';

async function testMapboxAPI() {
  console.log("🧪 [Test] Iniciando pruebas de Mapbox API...");
  console.log("🔑 [Test] Token:", `${MAPBOX_TOKEN.substring(0, 20)}...`);
  
  const testCases = [
    "2901 Owens",
    "123 Main Street",
    "New York",
    "Los Angeles",
    "Mexico City"
  ];
  
  for (const testCase of testCases) {
    await testSingleQuery(testCase);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa para evitar rate limiting
  }
}

async function testSingleQuery(query) {
  console.log(`\n🔍 [Test] Probando consulta: "${query}"`);
  
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&types=address&language=es&country=mx,us,es&limit=5`;
    
    console.log("📡 [Test] URL de consulta:", url.replace(MAPBOX_TOKEN, 'TOKEN_OCULTO'));
    
    const startTime = Date.now();
    const response = await fetch(url);
    const responseTime = Date.now() - startTime;
    
    console.log("⏱️ [Test] Tiempo de respuesta:", `${responseTime}ms`);
    console.log("📊 [Test] Status:", response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [Test] Error en respuesta:", errorText);
      return;
    }
    
    const data = await response.json();
    console.log("📈 [Test] Resultados encontrados:", data.features?.length || 0);
    
    if (data.features && data.features.length > 0) {
      console.log("✅ [Test] Ejemplos de resultados:");
      data.features.slice(0, 3).forEach((feature, index) => {
        console.log(`  ${index + 1}. ${feature.place_name}`);
        console.log(`     Coordenadas: [${feature.center[1]}, ${feature.center[0]}]`);
      });
    } else {
      console.warn("⚠️ [Test] No se encontraron resultados para esta consulta");
    }
    
    // Verificar estructura de la respuesta
    console.log("🏗️ [Test] Estructura de respuesta:");
    console.log("  - Attribution:", data.attribution ? "✅" : "❌");
    console.log("  - Features array:", Array.isArray(data.features) ? "✅" : "❌");
    console.log("  - Query:", data.query ? "✅" : "❌");
    
  } catch (error) {
    console.error("💥 [Test] Error en petición:", error.message);
    console.error("🔧 [Test] Detalles del error:", error);
  }
}

async function testTokenValidity() {
  console.log("\n🔐 [Test] Verificando validez del token...");
  
  try {
    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/test.json?access_token=${MAPBOX_TOKEN}&limit=1`);
    
    if (response.status === 401) {
      console.error("❌ [Test] Token inválido o expirado");
      return false;
    } else if (response.status === 200) {
      console.log("✅ [Test] Token válido");
      return true;
    } else {
      console.warn("⚠️ [Test] Respuesta inesperada:", response.status);
      return false;
    }
  } catch (error) {
    console.error("💥 [Test] Error verificando token:", error);
    return false;
  }
}

async function testRateLimits() {
  console.log("\n⏱️ [Test] Verificando límites de velocidad...");
  
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/test${i}.json?access_token=${MAPBOX_TOKEN}&limit=1`));
  }
  
  try {
    const responses = await Promise.all(promises);
    const statuses = responses.map(r => r.status);
    
    console.log("📊 [Test] Status codes de peticiones concurrentes:", statuses);
    
    if (statuses.some(status => status === 429)) {
      console.warn("⚠️ [Test] Rate limit detectado");
    } else {
      console.log("✅ [Test] Sin problemas de rate limiting");
    }
  } catch (error) {
    console.error("💥 [Test] Error en prueba de rate limits:", error);
  }
}

async function runAllTests() {
  console.log("🚀 [Test] Iniciando suite completa de pruebas de Mapbox...");
  console.log("=" * 60);
  
  // Verificar token
  const tokenValid = await testTokenValidity();
  if (!tokenValid) {
    console.error("🛑 [Test] Token inválido, deteniendo pruebas");
    return;
  }
  
  // Verificar rate limits
  await testRateLimits();
  
  // Probar API completa
  await testMapboxAPI();
  
  console.log("\n" + "=" * 60);
  console.log("✅ [Test] Suite de pruebas completada");
}

// Ejecutar pruebas si el script se ejecuta directamente
if (typeof window === 'undefined') {
  // Entorno Node.js
  const fetch = require('node-fetch');
  runAllTests();
} else {
  // Entorno del navegador
  console.log("🌐 [Test] Ejecutando en navegador...");
  window.testMapboxAutocomplete = runAllTests;
  runAllTests();
}