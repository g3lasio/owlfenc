#!/bin/bash

echo "🔍 Verificando archivos creados..."
echo ""

files=(
  "server/mervin-v3/context/EcosystemKnowledgeBase.ts"
  "server/mervin-v3/agent/ConversationManager.ts"
  "server/mervin-v3/prompts/JarvisPrompts.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    size=$(wc -l < "$file")
    echo "✅ $file ($size líneas)"
  else
    echo "❌ $file NO EXISTE"
  fi
done

echo ""
echo "🔍 Verificando tools en tools-registry.ts..."
grep -c "list_available_templates" server/assistants/tools-registry.ts && echo "✅ list_available_templates encontrado" || echo "❌ list_available_templates NO encontrado"
grep -c "search_entity" server/assistants/tools-registry.ts && echo "✅ search_entity encontrado" || echo "❌ search_entity NO encontrado"
grep -c "update_entity" server/assistants/tools-registry.ts && echo "✅ update_entity encontrado" || echo "❌ update_entity NO encontrado"

echo ""
echo "🔍 Verificando integración en TaskPlanner.ts..."
grep -c "JARVIS_SYSTEM_PROMPT" server/mervin-v3/agent/TaskPlanner.ts && echo "✅ JARVIS_SYSTEM_PROMPT encontrado" || echo "❌ JARVIS_SYSTEM_PROMPT NO encontrado"
grep -c "buildJarvisPrompt" server/mervin-v3/agent/TaskPlanner.ts && echo "✅ buildJarvisPrompt encontrado" || echo "❌ buildJarvisPrompt NO encontrado"
grep -c "conversationManager" server/mervin-v3/agent/TaskPlanner.ts && echo "✅ conversationManager encontrado" || echo "❌ conversationManager NO encontrado"

echo ""
echo "✅ Verificación completada"
