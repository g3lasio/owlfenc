/**
 * Test de Funcionalidad - Fase 1 y 2
 * Verificar que los componentes nuevos funcionan correctamente
 */

console.log('🧪 Testing Fase 1 y 2 - Mervin Jarvis\n');

// Test 1: Verificar que EcosystemKnowledgeBase existe
console.log('📋 Test 1: EcosystemKnowledgeBase');
try {
  const { ecosystemKnowledge } = require('./server/mervin-v3/context/EcosystemKnowledgeBase.ts');
  console.log('✅ EcosystemKnowledgeBase importado correctamente');
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 2: Verificar que ConversationManager existe
console.log('\n📋 Test 2: ConversationManager');
try {
  const { conversationManager } = require('./server/mervin-v3/agent/ConversationManager.ts');
  console.log('✅ ConversationManager importado correctamente');
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 3: Verificar que JarvisPrompts existe
console.log('\n📋 Test 3: JarvisPrompts');
try {
  const prompts = require('./server/mervin-v3/prompts/JarvisPrompts.ts');
  console.log('✅ JarvisPrompts importado correctamente');
  console.log('   - JARVIS_SYSTEM_PROMPT:', prompts.JARVIS_SYSTEM_PROMPT ? 'Existe' : 'No existe');
  console.log('   - buildJarvisPrompt:', typeof prompts.buildJarvisPrompt === 'function' ? 'Función' : 'No es función');
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 4: Verificar que los 3 nuevos tools están en el registry
console.log('\n📋 Test 4: Nuevos Tools en Registry');
try {
  const { TOOL_DEFINITIONS, TOOL_REGISTRY } = require('./server/assistants/tools-registry.ts');
  
  const newTools = ['list_available_templates', 'search_entity', 'update_entity'];
  
  newTools.forEach(toolName => {
    if (TOOL_REGISTRY[toolName]) {
      console.log(`✅ ${toolName} está registrado`);
      console.log(`   - Tiene executor: ${TOOL_REGISTRY[toolName].executor ? 'Sí' : 'No'}`);
      console.log(`   - Tiene definition: ${TOOL_REGISTRY[toolName].definition ? 'Sí' : 'No'}`);
    } else {
      console.log(`❌ ${toolName} NO está registrado`);
    }
  });
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 5: Verificar que TaskPlanner usa los nuevos prompts
console.log('\n📋 Test 5: TaskPlanner Integration');
try {
  const fs = require('fs');
  const taskPlannerCode = fs.readFileSync('./server/mervin-v3/agent/TaskPlanner.ts', 'utf8');
  
  if (taskPlannerCode.includes('JARVIS_SYSTEM_PROMPT')) {
    console.log('✅ TaskPlanner usa JARVIS_SYSTEM_PROMPT');
  } else {
    console.log('❌ TaskPlanner NO usa JARVIS_SYSTEM_PROMPT');
  }
  
  if (taskPlannerCode.includes('buildJarvisPrompt')) {
    console.log('✅ TaskPlanner usa buildJarvisPrompt');
  } else {
    console.log('❌ TaskPlanner NO usa buildJarvisPrompt');
  }
  
  if (taskPlannerCode.includes('conversationManager')) {
    console.log('✅ TaskPlanner importa conversationManager');
  } else {
    console.log('❌ TaskPlanner NO importa conversationManager');
  }
} catch (error) {
  console.log('❌ Error:', error.message);
}

console.log('\n✅ Tests completados\n');
