/**
 * VERIFY ANTHROPIC API KEY
 * 
 * Script para verificar que ANTHROPIC_API_KEY está configurada correctamente
 * y puede conectarse a la API de Anthropic.
 */

import Anthropic from '@anthropic-ai/sdk';

async function verifyAnthropicKey() {
  console.log('\n========================================');
  console.log('VERIFICACIÓN DE ANTHROPIC API KEY');
  console.log('========================================\n');
  
  // 1. Verificar que la variable de entorno existe
  console.log('1. Verificando variable de entorno...');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ERROR: ANTHROPIC_API_KEY no está configurada');
    console.error('\n📝 Para configurarla en Replit:');
    console.error('   1. Ve a "Secrets" en el panel izquierdo');
    console.error('   2. Agrega una nueva secret:');
    console.error('      Key: ANTHROPIC_API_KEY');
    console.error('      Value: sk-ant-api03-...');
    console.error('   3. Reinicia el servidor\n');
    process.exit(1);
  }
  
  console.log('✅ ANTHROPIC_API_KEY está configurada');
  console.log(`   Longitud: ${apiKey.length} caracteres`);
  console.log(`   Prefijo: ${apiKey.substring(0, 15)}...`);
  
  // 2. Verificar que el formato es correcto
  console.log('\n2. Verificando formato de la API key...');
  if (!apiKey.startsWith('sk-ant-')) {
    console.error('❌ ERROR: La API key no tiene el formato correcto');
    console.error('   Debe comenzar con "sk-ant-"');
    console.error('   Formato esperado: sk-ant-api03-...');
    process.exit(1);
  }
  
  console.log('✅ Formato de API key es correcto');
  
  // 3. Intentar conectar con la API de Anthropic
  console.log('\n3. Probando conexión con Anthropic API...');
  
  try {
    const anthropic = new Anthropic({ apiKey });
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: 'Responde solo con "OK" si puedes leer este mensaje.'
      }]
    });
    
    console.log('✅ Conexión exitosa con Anthropic API');
    console.log(`   Modelo: ${response.model}`);
    console.log(`   Tokens usados: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output`);
    
    // Extraer respuesta
    const content = response.content[0];
    if (content.type === 'text') {
      console.log(`   Respuesta: "${content.text}"`);
    }
    
  } catch (error: any) {
    console.error('❌ ERROR al conectar con Anthropic API:', error.message);
    
    if (error.status === 401) {
      console.error('\n📝 La API key es inválida o ha expirado.');
      console.error('   Verifica que copiaste la key completa desde:');
      console.error('   https://console.anthropic.com/settings/keys');
    } else if (error.status === 429) {
      console.error('\n📝 Rate limit excedido o cuota agotada.');
      console.error('   Verifica tu plan en: https://console.anthropic.com/settings/plans');
    } else {
      console.error('\n📝 Error inesperado:', error);
    }
    
    process.exit(1);
  }
  
  // 4. Verificar que ClaudeConversationalEngine puede inicializarse
  console.log('\n4. Verificando ClaudeConversationalEngine...');
  
  try {
    const { ClaudeConversationalEngine } = await import('./mervin-v2/ai/ClaudeConversationalEngine');
    const engine = new ClaudeConversationalEngine();
    console.log('✅ ClaudeConversationalEngine inicializado correctamente');
  } catch (error: any) {
    console.error('❌ ERROR al inicializar ClaudeConversationalEngine:', error.message);
    process.exit(1);
  }
  
  // 5. Todo OK
  console.log('\n========================================');
  console.log('✅ VERIFICACIÓN COMPLETA - TODO OK');
  console.log('========================================');
  console.log('\n🎉 Mervin AI Conversational está listo para usar!');
  console.log('   El sistema usará Claude 3.5 Sonnet para las conversaciones.\n');
}

// Ejecutar verificación
verifyAnthropicKey().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
