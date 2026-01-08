#!/bin/bash

echo "========================================="
echo "TESTING FASE 3 Y 4 - MERVIN JARVIS"
echo "========================================="
echo ""

echo "1. Verificando archivos creados..."
echo ""

FILES=(
  "server/mervin-v3/context/EcosystemKnowledgeBase.ts"
  "server/mervin-v3/agent/ConversationManager.ts"
  "server/mervin-v3/prompts/JarvisPrompts.ts"
  "server/mervin-v3/learning/PlanStorage.ts"
  "server/mervin-v3/learning/UserPersonalization.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    echo "✅ $file ($lines líneas)"
  else
    echo "❌ $file NO EXISTE"
  fi
done

echo ""
echo "2. Verificando tools agregados..."
echo ""

TOOLS=(
  "list_available_templates"
  "search_entity"
  "update_entity"
)

for tool in "${TOOLS[@]}"; do
  if grep -q "name: '$tool'" server/assistants/tools-registry.ts; then
    echo "✅ Tool '$tool' registrado"
  else
    echo "❌ Tool '$tool' NO encontrado"
  fi
done

echo ""
echo "3. Verificando captura de URLs..."
echo ""

if grep -q "contractorSignUrl: contract.contractorSignUrl" server/assistants/tools-registry.ts; then
  echo "✅ executeCreateContract captura contractorSignUrl"
else
  echo "❌ executeCreateContract NO captura contractorSignUrl"
fi

if grep -q "clientSignUrl: contract.clientSignUrl" server/assistants/tools-registry.ts; then
  echo "✅ executeCreateContract captura clientSignUrl"
else
  echo "❌ executeCreateContract NO captura clientSignUrl"
fi

if grep -q "shareUrl: result.urls?.shareUrl" server/assistants/tools-registry.ts; then
  echo "✅ executeCreateEstimate captura shareUrl"
else
  echo "❌ executeCreateEstimate NO captura shareUrl"
fi

echo ""
echo "4. Verificando prompts actualizados..."
echo ""

if grep -q "CÓMO MOSTRAR URLs COMPARTIBLES" server/mervin-v3/prompts/JarvisPrompts.ts; then
  echo "✅ Prompts incluyen guía de URLs"
else
  echo "❌ Prompts NO incluyen guía de URLs"
fi

echo ""
echo "5. Verificando integración de aprendizaje..."
echo ""

if grep -q "planStorage.storePlan" server/mervin-v3/agent/AgentCore.ts; then
  echo "✅ AgentCore integrado con PlanStorage"
else
  echo "❌ AgentCore NO integrado con PlanStorage"
fi

if grep -q "userPersonalization.getUserPreferences" server/mervin-v3/agent/AgentCore.ts; then
  echo "✅ AgentCore integrado con UserPersonalization"
else
  echo "❌ AgentCore NO integrado con UserPersonalization"
fi

echo ""
echo "========================================="
echo "RESUMEN DE TESTING"
echo "========================================="
echo ""

# Contar éxitos
total_files=${#FILES[@]}
total_tools=${#TOOLS[@]}
total_checks=11

echo "Total de checks: $total_checks"
echo ""
echo "Si todos los checks son ✅, Fase 3 y 4 están completas."
echo ""
