#!/bin/bash

# 🧪 SUBSCRIPTION ENDPOINT TESTING SUITE
# Tests subscription enforcement with real Firebase tokens

BASE_URL="http://localhost:5000"

echo "🧪 PRUEBAS DE SUSCRIPCIÓN ENTERPRISE"
echo "===================================================================="
echo ""
echo "⚠️  NOTA: Para testing completo necesitas:"
echo "   1. Usuarios reales con Firebase UIDs"
echo "   2. Tokens de Firebase válidos (obtener desde frontend)"
echo "   3. Suscripciones configuradas en Firestore"
echo ""
echo "===================================================================="
echo ""

# Test 1: Verificar endpoint de permisos (sin auth)
echo "📋 TEST 1: Verificar endpoint de permisos sin autenticación"
echo "   Endpoint: GET /api/auth/can-access/:uid/contracts"
echo "   Esperado: Información de permisos o error"

response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/auth/can-access/test-uid/contracts")
status_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

echo "   Status: $status_code"
echo "   Response: $body"
echo ""

# Test 2: Health check con permisos
echo "📋 TEST 2: Verificar servicio de suscripción"
echo "   Endpoint: GET /api/robust-subscription/health"

sub_health=$(curl -s "$BASE_URL/api/robust-subscription/health" 2>/dev/null || echo '{"status":"endpoint not found"}')
echo "   Response: $sub_health"
echo ""

# Test 3: Verificar estructura de usuario de prueba
echo "📋 TEST 3: Estructura esperada para testing"
echo ""
echo "   Para probar cada plan necesitas:"
echo ""
echo "   🆓 PRIMO CHAMBEADOR (Free Plan):"
echo "      • hasLegalDefense: false"
echo "      • contractsLimit: 0"
echo "      • Esperado: 403 Forbidden en /api/legal-defense/*"
echo ""
echo "   🎁 FREE TRIAL:"
echo "      • hasLegalDefense: true"
echo "      • contractsLimit: -1 (unlimited)"
echo "      • trialEndsAt: fecha futura"
echo "      • Esperado: 200 OK por 14 días"
echo ""
echo "   💰 MERO PATRÓN (\$49.99/mo):"
echo "      • hasLegalDefense: true"
echo "      • contractsLimit: 50"
echo "      • contractsUsed: 0 → 50"
echo "      • Esperado: 200 OK hasta 50, luego 403"
echo ""
echo "   👑 MASTER CONTRACTOR (\$99/mo):"
echo "      • hasLegalDefense: true"
echo "      • contractsLimit: -1 (unlimited)"
echo "      • Esperado: 200 OK siempre"
echo ""

# Test 4: Manual testing instructions
echo "===================================================================="
echo "🔬 INSTRUCCIONES PARA TESTING MANUAL"
echo "===================================================================="
echo ""
echo "1️⃣  OBTENER TOKEN DE FIREBASE:"
echo "    • Abre el frontend en el navegador"
echo "    • Inicia sesión con un usuario de prueba"
echo "    • Abre DevTools → Console"
echo "    • Ejecuta: firebase.auth().currentUser.getIdToken(true).then(t => console.log(t))"
echo "    • Copia el token JWT generado"
echo ""
echo "2️⃣  PROBAR ENDPOINT PROTEGIDO:"
echo "    TOKEN=\"<tu-token-aqui>\""
echo "    curl -X POST $BASE_URL/api/legal-defense/generate-contract \\"
echo "      -H \"Authorization: Bearer \$TOKEN\" \\"
echo "      -H \"Content-Type: application/json\" \\"
echo "      -d '{\"contractData\":{\"clientInfo\":{\"name\":\"Test\"},\"projectDetails\":{\"type\":\"Fencing\"},\"financials\":{\"total\":5000}}}'"
echo ""
echo "3️⃣  VERIFICAR RESPUESTA:"
echo "    • Primo Chambeador → 403 + mensaje \"Upgrade to Mero Patrón\""
echo "    • Free Trial → 200 + contrato generado"
echo "    • Mero Patrón → 200 hasta 50, luego 403"
echo "    • Master → 200 siempre"
echo ""
echo "===================================================================="
echo "✅ TESTING AUTOMATIZADO CON USUARIO REAL"
echo "===================================================================="
echo ""
echo "Si tienes un usuario real configurado, proporciona:"
echo "   • Firebase UID del usuario"
echo "   • Token de Firebase válido"
echo ""
echo "Luego ejecuta:"
echo "   export TEST_UID=\"<firebase-uid>\""
echo "   export TEST_TOKEN=\"<firebase-token>\""
echo "   curl -X POST $BASE_URL/api/legal-defense/generate-contract \\"
echo "     -H \"Authorization: Bearer \$TEST_TOKEN\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"contractData\":{\"clientInfo\":{\"name\":\"Test Client\"},\"projectDetails\":{\"type\":\"Fencing\",\"description\":\"Test\",\"location\":\"123 Test St\"},\"financials\":{\"total\":5000}}}'"
echo ""
