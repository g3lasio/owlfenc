/**
 * Script para probar qué modelos de Claude están disponibles
 * con la API key actual
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const modelsToTest = [
  'claude-3-5-sonnet-latest',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-sonnet-20240229',
  'claude-3-opus-20240229',
  'claude-3-haiku-20240307',
  'claude-2.1',
  'claude-2.0',
  'claude-instant-1.2'
];

console.log('🧪 Probando modelos de Claude...\n');

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
    
    console.log(`✅ ${model} - FUNCIONA\n`);
  } catch (error) {
    if (error.status === 404) {
      console.log(`❌ ${model} - NO DISPONIBLE (404)\n`);
    } else {
      console.log(`❌ ${model} - ERROR: ${error.message}\n`);
    }
  }
}

console.log('✅ Prueba completada');
