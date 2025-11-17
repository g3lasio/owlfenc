/**
 * SCRIPT DE DIAGNÓSTICO - ASSISTANTS API
 * 
 * Este script llama directamente al endpoint /api/assistant/message
 * para diagnosticar qué está devolviendo el backend
 */

import { openai, getMervinAssistant } from './server/assistants/config';

async function testAssistantAPI() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔬 INICIANDO DIAGNÓSTICO DE ASSISTANTS API');
    console.log('='.repeat(70) + '\n');

    // 1. Crear thread
    console.log('1️⃣ Creando thread...');
    const thread = await openai.beta.threads.create();
    console.log(`✅ Thread creado: ${thread.id}\n`);

    // 2. Agregar mensaje
    const testMessage = 'Hola Mervin, ¿cómo estás?';
    console.log(`2️⃣ Agregando mensaje: "${testMessage}"`);
    
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: testMessage
    });
    console.log('✅ Mensaje agregado\n');

    // 3. Crear run
    const assistantId = await getMervinAssistant();
    console.log(`3️⃣ Creando run con assistant: ${assistantId}`);
    
    let run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    });
    console.log(`✅ Run creado: ${run.id}`);
    console.log(`   Status inicial: ${run.status}\n`);

    // 4. Polling
    console.log('4️⃣ Esperando respuesta...');
    let attempts = 0;
    const maxAttempts = 60;

    while (run.status === 'in_progress' || run.status === 'queued') {
      attempts++;
      console.log(`   ⏳ Intento ${attempts}/${maxAttempts} - Status: ${run.status}`);
      
      if (attempts > maxAttempts) {
        throw new Error('Timeout waiting for response');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    console.log(`✅ Run completado con status: ${run.status}\n`);

    // 5. Obtener mensajes
    console.log('5️⃣ Obteniendo mensajes...');
    const messages = await openai.beta.threads.messages.list(thread.id);
    
    console.log(`✅ Total de mensajes: ${messages.data.length}\n`);

    // 6. Analizar último mensaje
    console.log('6️⃣ ANALIZANDO ÚLTIMO MENSAJE (RESPUESTA DE MERVIN):');
    console.log('='.repeat(70));
    
    const lastMessage = messages.data[0]; // El más reciente
    
    console.log('📋 ESTRUCTURA COMPLETA DEL MENSAJE:');
    console.log(JSON.stringify(lastMessage, null, 2));
    
    console.log('\n📝 CONTENIDO:');
    if (lastMessage.content && lastMessage.content.length > 0) {
      lastMessage.content.forEach((item, index) => {
        console.log(`\n   Item ${index}:`);
        console.log(`   Type: ${item.type}`);
        
        if (item.type === 'text') {
          const textItem = item as any;
          console.log(`   Text object type: ${typeof textItem.text}`);
          console.log(`   Text object keys: ${Object.keys(textItem.text || {}).join(', ')}`);
          
          if (typeof textItem.text === 'string') {
            console.log(`   ✅ Es string directo`);
            console.log(`   Length: ${textItem.text.length} caracteres`);
            console.log(`   Preview: "${textItem.text.substring(0, 200)}..."`);
          } else if (textItem.text && typeof textItem.text === 'object') {
            console.log(`   ⚠️ Es objeto, no string`);
            console.log(`   Estructura:`, JSON.stringify(textItem.text, null, 2));
            
            if (textItem.text.value) {
              console.log(`   ✅ Tiene propiedad 'value'`);
              console.log(`   Length: ${textItem.text.value.length} caracteres`);
              console.log(`   Preview: "${textItem.text.value.substring(0, 200)}..."`);
            }
          }
        }
      });
    } else {
      console.log('   ❌ NO HAY CONTENIDO');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ DIAGNÓSTICO COMPLETADO');
    console.log('='.repeat(70) + '\n');

  } catch (error: any) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ ERROR EN DIAGNÓSTICO:');
    console.error('='.repeat(70));
    console.error(error);
    console.error('\n');
  }
}

// Ejecutar
testAssistantAPI().then(() => {
  console.log('🏁 Script finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
