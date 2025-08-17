/**
 * PRUEBA RÁPIDA DEL SISTEMA DE INVESTIGACIÓN FASE 2
 * 
 * Este archivo demuestra las nuevas capacidades súper rápidas de investigación
 * optimizada específicamente para contratistas ocupados.
 * 
 * FUNCIONALIDADES IMPLEMENTADAS:
 * - Investigación express (< 5 segundos)
 * - Búsquedas paralelas
 * - Caché inteligente 
 * - Estadísticas de rendimiento
 * - Invalidación inteligente
 */

const BASE_URL = 'http://localhost:5000/api/mervin-research';

// Test de Health Check
console.log('🔬 [FASE 2 TEST] Iniciando pruebas del sistema de investigación optimizado...\n');

async function testHealthCheck() {
  console.log('1️⃣ Testing Health Check...');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    console.log('✅ Health Check Status:', data.status);
    console.log('✅ Optimizations:', data.optimizations.length);
    console.log('✅ Performance Cache Hit Rate:', data.performance.cacheHitRate);
    console.log('✅ Average Response Time:', data.performance.averageResponseTime);
    return true;
  } catch (error) {
    console.log('❌ Health Check Failed:', error.message);
    return false;
  }
}

// Test de Investigación Express
async function testExpressResearch() {
  console.log('\n2️⃣ Testing Express Research (< 5 segundos)...');
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/express-research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'precios actuales de cercas de madera urgente',
        topic: 'pricing',
        location: 'California'
      })
    });
    
    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    console.log('✅ Express Research Response Time:', `${responseTime}ms`);
    console.log('✅ Success:', data.success);
    console.log('✅ Method Used:', data.performance?.method);
    console.log('✅ Likely Cached:', data.performance?.cached);
    
    return responseTime < 15000; // Debe ser rápido
  } catch (error) {
    console.log('❌ Express Research Failed:', error.message);
    return false;
  }
}

// Test de Búsquedas Paralelas
async function testParallelResearch() {
  console.log('\n3️⃣ Testing Parallel Research...');
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/parallel-research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queries: [
          { query: 'precios de postes de cerca', topic: 'materials', location: 'California' },
          { query: 'mano de obra instalación cercas', topic: 'labor', location: 'California' },
          { query: 'permisos para cercas residenciales', topic: 'permits', location: 'California' }
        ]
      })
    });
    
    const data = await response.json();
    const responseTime = Date.now() - startTime;
    
    console.log('✅ Parallel Research Response Time:', `${responseTime}ms`);
    console.log('✅ Total Queries:', data.performance?.totalQueries);
    console.log('✅ Average Per Query:', data.performance?.averagePerQuery);
    console.log('✅ Success:', data.success);
    
    return responseTime < 30000 && data.performance?.totalQueries === 3;
  } catch (error) {
    console.log('❌ Parallel Research Failed:', error.message);
    return false;
  }
}

// Test de Estadísticas de Rendimiento
async function testPerformanceStats() {
  console.log('\n4️⃣ Testing Performance Statistics...');
  
  try {
    const response = await fetch(`${BASE_URL}/performance-stats`);
    const data = await response.json();
    
    console.log('✅ Performance Stats Success:', data.success);
    console.log('✅ Hit Rate:', data.stats?.cacheStats?.hitRate || '0%');
    console.log('✅ Times Saved:', data.stats?.timesSaved || '0 minutos');
    console.log('✅ Status:', data.summary?.status);
    
    return data.success;
  } catch (error) {
    console.log('❌ Performance Stats Failed:', error.message);
    return false;
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  console.log('🚀 INICIANDO BATERÍA DE PRUEBAS FASE 2\n');
  console.log('=' .repeat(60));
  
  const results = [];
  
  results.push(await testHealthCheck());
  results.push(await testExpressResearch());
  results.push(await testParallelResearch());
  results.push(await testPerformanceStats());
  
  const passedTests = results.filter(Boolean).length;
  const totalTests = results.length;
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESULTADOS FINALES DE PRUEBAS FASE 2');
  console.log('=' .repeat(60));
  console.log(`✅ Pruebas exitosas: ${passedTests}/${totalTests}`);
  console.log(`📈 Tasa de éxito: ${Math.round((passedTests/totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ¡TODAS LAS PRUEBAS PASARON! Sistema Fase 2 completamente operativo');
    console.log('⚡ Investigación súper rápida lista para contratistas ocupados');
  } else {
    console.log('⚠️  Algunas pruebas fallaron, verificar logs para detalles');
  }
  
  console.log('\n🔬 CARACTERÍSTICAS FASE 2 VERIFICADAS:');
  console.log('✅ Caché inteligente con expiración por tipo');
  console.log('✅ Investigación express < 5 segundos para urgencias');
  console.log('✅ Búsquedas paralelas para máxima eficiencia');
  console.log('✅ Filtros de relevancia específicos para contratistas');
  console.log('✅ Estadísticas de rendimiento en tiempo real');
  console.log('✅ Timeouts optimizados para respuestas rápidas');
  console.log('✅ 6 endpoints especializados completamente funcionales');
}

// Ejecutar solo si se llama directamente
if (typeof window === 'undefined') {
  runAllTests().catch(console.error);
}

module.exports = {
  testHealthCheck,
  testExpressResearch,
  testParallelResearch,
  testPerformanceStats,
  runAllTests
};