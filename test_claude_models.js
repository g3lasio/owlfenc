/**
 * Script para probar qué modelos de Claude están disponibles
 * con la API key actual - ACTUALIZADO con nombres correctos
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const modelsToTest = [
  // Claude 4 (más recientes)
  'claude-sonnet-4-5',                    // Sonnet 4.5 (más reciente)
  'claude-opus-4-1',                      // Opus 4.1
  'claude-haiku-4-5-20251001',           // Haiku 4.5
  
  // Claude 3.5 (debería funcionar)
  'claude-3-5-sonnet-20241022',          // Sonnet 3.5 (octubre 2024)
  'claude-3-5-sonnet-20240620',          // Sonnet 3.5 (junio 2024)
  'claude-3-5-haiku-20241022',           // Haiku 3.5
  
  // Claude 3 (ya probados)
  'claude-3-opus-20240229',              // Opus 3 (funcionó en prueba anterior)
  'claude-3-haiku-20240307',             // Haiku 3 (funcionó en prueba anterior)
  'claude-3-sonnet-20240229',            // Sonnet 3
  
  // Modelos legacy
  'claude-2.1',
  'claude-2.0',
  'claude-instant-1.2'
];

console.log('🧪 Probando modelos de Claude con nombres actualizados...\n');
console.log('📊 Total de modelos a probar:', modelsToTest.length);
console.log('='.repeat(60));
console.log('');

const workingModels = [];
const notAvailableModels = [];

for (const model of modelsToTest) {
  try {
    console.log(`⏳ Probando: ${model}`);
    
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: 'Hi'
      }]
    });
    
    console.log(`✅ ${model} - FUNCIONA ✨`);
    workingModels.push(model);
    console.log('');
  } catch (error) {
    if (error.status === 404) {
      console.log(`❌ ${model} - NO DISPONIBLE (404)`);
      notAvailableModels.push(model);
    } else if (error.message && error.message.includes('deprecated')) {
      console.log(`⚠️  ${model} - DEPRECADO`);
      notAvailableModels.push(model);
    } else {
      console.log(`❌ ${model} - ERROR: ${error.message}`);
      notAvailableModels.push(model);
    }
    console.log('');
  }
}

console.log('='.repeat(60));
console.log('');
console.log('📊 RESUMEN DE RESULTADOS:');
console.log('');
console.log(`✅ Modelos que FUNCIONAN (${workingModels.length}):`);
if (workingModels.length > 0) {
  workingModels.forEach(model => console.log(`   - ${model}`));
} else {
  console.log('   (ninguno)');
}
console.log('');
console.log(`❌ Modelos NO disponibles (${notAvailableModels.length}):`);
if (notAvailableModels.length > 0) {
  notAvailableModels.forEach(model => console.log(`   - ${model}`));
} else {
  console.log('   (ninguno)');
}
console.log('');
console.log('='.repeat(60));
console.log('');

if (workingModels.length > 0) {
  console.log('🎯 RECOMENDACIÓN:');
  console.log('');
  console.log(`   Usar: ${workingModels[0]}`);
  console.log('');
  console.log('   Este es el modelo más reciente y potente disponible.');
} else {
  console.log('⚠️  ADVERTENCIA: No se encontraron modelos disponibles.');
  console.log('   Verifica tu API key de Anthropic.');
}

console.log('');
console.log('✅ Prueba completada');
