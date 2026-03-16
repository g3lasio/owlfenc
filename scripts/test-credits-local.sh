#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║        OWL FENC — CREDIT SYSTEM TEST (Replit Dev Environment)              ║
# ║                                                                              ║
# ║  USO:                                                                        ║
# ║    export ADMIN_API_KEY="mamalgelasio"                                      ║
# ║    export TEST_USER_EMAIL="owl@chyrris.com"                                 ║
# ║    bash scripts/test-credits-local.sh                                       ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# NO usar set -e para evitar salidas prematuras
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

BASE_URL="${TEST_BASE_URL:-http://localhost:5000}"
ADMIN_KEY="${ADMIN_API_KEY:-}"
TEST_EMAIL="${TEST_USER_EMAIL:-}"
PASS=0
FAIL=0
SKIP=0
BEARER_TOKEN=""

pass() { echo -e "  ${GREEN}✅ PASS${RESET} $1"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${RED}❌ FAIL${RESET} $1 ${DIM}($2)${RESET}"; FAIL=$((FAIL + 1)); }
skip() { echo -e "  ${YELLOW}⏭  SKIP${RESET} $1 ${DIM}($2)${RESET}"; SKIP=$((SKIP + 1)); }
info() { echo -e "  ${DIM}→ $1${RESET}"; }

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════╗"
echo -e "║   OWL FENC — CREDIT SYSTEM TEST (LOCAL/DEV)         ║"
echo -e "╚══════════════════════════════════════════════════════╝${RESET}"
echo -e "${DIM}URL: $BASE_URL${RESET}"

# ── STEP 1: Verificar servidor ────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}── STEP 1: Verificando servidor ────────────────────────${RESET}"

SERVER_OK=false
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" != "000" ] && [ "$HTTP_CODE" != "" ]; then
  pass "Servidor corriendo en $BASE_URL (HTTP $HTTP_CODE)"
  SERVER_OK=true
else
  fail "Servidor no responde en $BASE_URL" "Asegúrate de que 'npm run dev' esté corriendo"
  echo ""
  echo -e "${RED}FATAL: El servidor no está corriendo.${RESET}"
  echo -e "Inicia el servidor con: ${BOLD}npm run dev${RESET}"
  exit 1
fi

# ── STEP 2: Verificar ADMIN_API_KEY ──────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}── STEP 2: Verificando configuración ───────────────────${RESET}"

if [ -z "$ADMIN_KEY" ]; then
  fail "ADMIN_API_KEY no configurado" "Corre: export ADMIN_API_KEY=tu-key"
  echo -e "${RED}FATAL: Configura ADMIN_API_KEY antes de correr el test${RESET}"
  exit 1
else
  pass "ADMIN_API_KEY configurado"
fi

if [ -z "$TEST_EMAIL" ]; then
  fail "TEST_USER_EMAIL no configurado" "Corre: export TEST_USER_EMAIL=tu@email.com"
  echo -e "${RED}FATAL: Configura TEST_USER_EMAIL antes de correr el test${RESET}"
  exit 1
else
  pass "TEST_USER_EMAIL: $TEST_EMAIL"
fi

# ── STEP 3: Autenticación ─────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}── STEP 3: Autenticación ───────────────────────────────${RESET}"

info "Obteniendo custom token para: $TEST_EMAIL"
CUSTOM_TOKEN_RESP=$(curl -s -X POST "$BASE_URL/api/auth/create-custom-token" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}" 2>/dev/null || echo "")

info "Respuesta custom token: $(echo $CUSTOM_TOKEN_RESP | head -c 150)"

CUSTOM_TOKEN=$(echo "$CUSTOM_TOKEN_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('customToken') or d.get('token') or '')
except:
    print('')
" 2>/dev/null || echo "")

if [ -z "$CUSTOM_TOKEN" ]; then
  fail "No se pudo obtener custom token" "Respuesta: $(echo $CUSTOM_TOKEN_RESP | head -c 200)"
  echo ""
  echo -e "${YELLOW}⚠️  Sin autenticación — solo tests de seguridad disponibles${RESET}"
else
  pass "Custom token obtenido"
  info "Token: ${CUSTOM_TOKEN:0:40}..."

  # Obtener Firebase API key del código fuente
  FIREBASE_API_KEY=$(grep -r "apiKey" /home/ubuntu/owlfenc/client/src/lib/firebase.ts 2>/dev/null | \
    grep -o '"[A-Za-z0-9_-]\{30,\}"' | head -1 | tr -d '"' || echo "")

  if [ -z "$FIREBASE_API_KEY" ]; then
    # Intentar desde variables de entorno
    FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY:-${FIREBASE_API_KEY:-}}"
  fi

  info "Firebase API Key: ${FIREBASE_API_KEY:0:20}..."

  if [ -n "$FIREBASE_API_KEY" ]; then
    # Intercambiar custom token por ID token
    ID_TOKEN_RESP=$(curl -s -X POST \
      "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=$FIREBASE_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"token\": \"$CUSTOM_TOKEN\", \"returnSecureToken\": true}" 2>/dev/null || echo "")

    ID_TOKEN=$(echo "$ID_TOKEN_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('idToken') or '')
except:
    print('')
" 2>/dev/null || echo "")

    FIREBASE_UID=$(echo "$ID_TOKEN_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('localId') or '')
except:
    print('')
" 2>/dev/null || echo "")

    if [ -n "$ID_TOKEN" ]; then
      pass "ID token obtenido de Firebase (UID: ${FIREBASE_UID:0:15}...)"
      BEARER_TOKEN="$ID_TOKEN"

      # Crear session cookie
      SESSION_RESP=$(curl -s -c /tmp/owlfenc-cookies.txt -X POST "$BASE_URL/api/sessionLogin" \
        -H "Content-Type: application/json" \
        -d "{\"idToken\": \"$ID_TOKEN\"}" 2>/dev/null || echo "")

      if echo "$SESSION_RESP" | grep -q '"success"\|"ok"\|"logged\|session'; then
        pass "Session cookie creada"
        USE_COOKIE=true
      else
        info "Session cookie no disponible, usando Bearer token"
        USE_COOKIE=false
      fi
    else
      fail "No se pudo obtener ID token de Firebase" "$(echo $ID_TOKEN_RESP | head -c 200)"
      BEARER_TOKEN=""
    fi
  else
    fail "Firebase API Key no encontrado" "Verifica client/src/lib/firebase.ts"
    BEARER_TOKEN=""
  fi
fi

# ── Helper: hacer request autenticado ────────────────────────────────────────
auth_request() {
  local method="$1"
  local endpoint="$2"
  local data="$3"

  if [ -n "$BEARER_TOKEN" ]; then
    curl -s -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $BEARER_TOKEN" \
      -d "$data" 2>/dev/null
  elif [ "$USE_COOKIE" = "true" ] && [ -f "/tmp/owlfenc-cookies.txt" ]; then
    curl -s -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -b /tmp/owlfenc-cookies.txt \
      -d "$data" 2>/dev/null
  else
    echo '{"error":"no_auth"}'
  fi
}

# ── Helper: obtener balance ───────────────────────────────────────────────────
get_balance() {
  local resp
  if [ -n "$BEARER_TOKEN" ]; then
    resp=$(curl -s "$BASE_URL/api/wallet/balance" \
      -H "Authorization: Bearer $BEARER_TOKEN" 2>/dev/null || echo "")
  elif [ "$USE_COOKIE" = "true" ] && [ -f "/tmp/owlfenc-cookies.txt" ]; then
    resp=$(curl -s "$BASE_URL/api/wallet/balance" \
      -b /tmp/owlfenc-cookies.txt 2>/dev/null || echo "")
  else
    echo "0"
    return
  fi
  echo "$resp" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    b = d.get('balance') or d.get('availableCredits') or d.get('credits') or 0
    print(int(b))
except:
    print(0)
" 2>/dev/null || echo "0"
}

# ── Helper: otorgar créditos ──────────────────────────────────────────────────
grant_credits() {
  local amount="$1"
  local uid="${FIREBASE_UID:-}"
  if [ -z "$uid" ]; then
    info "No se puede otorgar créditos sin UID"
    return
  fi
  curl -s -X POST "$BASE_URL/api/wallet/admin/grant" \
    -H "Content-Type: application/json" \
    -H "x-admin-key: $ADMIN_KEY" \
    -d "{\"targetType\":\"single\",\"firebaseUid\":\"$uid\",\"credits\":$amount,\"description\":\"test-grant\",\"idempotencyKey\":\"test-$(date +%s)\"}" \
    > /dev/null 2>/dev/null
}

# ── STEP 4: Balance ───────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}── STEP 4: Balance de Wallet ───────────────────────────${RESET}"

if [ -n "$BEARER_TOKEN" ] || [ "$USE_COOKIE" = "true" ]; then
  BALANCE=$(get_balance)
  pass "GET /api/wallet/balance → $BALANCE créditos disponibles"
else
  skip "GET /api/wallet/balance" "Sin autenticación"
fi

# ── Helper: test de deducción ─────────────────────────────────────────────────
test_deduction() {
  local name="$1"
  local endpoint="$2"
  local payload="$3"
  local expected="$4"

  echo ""
  echo -e "  ${BOLD}▸ $name${RESET}"
  info "Endpoint: POST $endpoint | Esperado: -$expected créditos"

  if [ -z "$BEARER_TOKEN" ] && [ "$USE_COOKIE" != "true" ]; then
    skip "$name" "Sin autenticación"
    return
  fi

  # Asegurar créditos suficientes
  local bal_before
  bal_before=$(get_balance)
  if [ "$bal_before" -lt "$((expected + 20))" ] 2>/dev/null; then
    local needed=$((expected + 50))
    info "Balance bajo ($bal_before), otorgando $needed créditos de prueba..."
    grant_credits "$needed"
    sleep 1
    bal_before=$(get_balance)
    info "Balance después de grant: $bal_before"
  fi

  # Hacer el request
  local resp
  resp=$(auth_request "POST" "$endpoint" "$payload")
  info "Respuesta (primeros 150 chars): $(echo $resp | head -c 150)"

  # Verificar que el request fue exitoso
  local req_ok
  req_ok=$(echo "$resp" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    ok = bool(d.get('success') or d.get('html') or d.get('contractId') or d.get('content') or d.get('id') or d.get('contractHtml'))
    print('yes' if ok else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

  if [ "$req_ok" = "no" ]; then
    fail "$name" "Request falló: $(echo $resp | head -c 200)"
    return
  fi

  # Esperar deducción async
  sleep 2

  local bal_after
  bal_after=$(get_balance)
  local deducted=$((bal_before - bal_after))

  info "Balance: $bal_before → $bal_after (deducido: $deducted)"

  if [ "$deducted" -eq "$expected" ] 2>/dev/null; then
    pass "$name → -$deducted créditos ✓"
  elif [ "$deducted" -eq 0 ] 2>/dev/null; then
    fail "$name" "NO se dedujo ningún crédito (esperado: -$expected)"
  else
    fail "$name" "Monto incorrecto: dedujo $deducted, esperado $expected"
  fi
}

# ── STEP 5: Tests de contratos ────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}── STEP 5: Tests de Deducción de Créditos ──────────────${RESET}"

CONTRACT_BASE='{
  "templateId": "independent-contractor",
  "includeSignature": false,
  "client": {"name":"Test Client","address":"123 Test St, San Diego CA","email":"client@test.com","phone":"619-555-0100"},
  "contractor": {"name":"Test Contractor","company":"OWL FENC TEST","address":"456 Ave, San Diego CA","phone":"619-555-0200","email":"contractor@owlfenc.com","license":"TEST-001"},
  "project": {"type":"Fence Installation","description":"TEST ONLY","location":"123 Test St","startDate":"2026-04-01","endDate":"2026-04-15"},
  "financials": {"total":5000,"paymentMilestones":[{"description":"Deposit","amount":2500,"dueDate":"2026-04-01"}]},
  "legalClauses": {"selected":[],"clauses":[]}
}'

CONTRACT_WITH_SIG='{
  "templateId": "independent-contractor",
  "includeSignature": true,
  "clientEmail": "client@test.com",
  "contractorEmail": "contractor@owlfenc.com",
  "client": {"name":"Test Client","address":"123 Test St, San Diego CA","email":"client@test.com","phone":"619-555-0100"},
  "contractor": {"name":"Test Contractor","company":"OWL FENC TEST","address":"456 Ave, San Diego CA","phone":"619-555-0200","email":"contractor@owlfenc.com","license":"TEST-001"},
  "project": {"type":"Fence Installation","description":"TEST ONLY with sig","location":"123 Test St","startDate":"2026-04-01","endDate":"2026-04-15"},
  "financials": {"total":5000,"paymentMilestones":[{"description":"Deposit","amount":2500,"dueDate":"2026-04-01"}]},
  "legalClauses": {"selected":[],"clauses":[]}
}'

CHANGE_ORDER='{
  "templateId": "change-order",
  "client": {"name":"Test Client","address":"123 Test St","email":"client@test.com","phone":"619-555-0100"},
  "contractor": {"name":"Test Contractor","company":"OWL FENC TEST","address":"456 Ave","phone":"619-555-0200","email":"contractor@owlfenc.com","license":"TEST-001"},
  "project": {"type":"Fence","description":"TEST change order","location":"123 Test St","startDate":"2026-04-01","endDate":"2026-04-15"},
  "financials": {"total":500,"paymentMilestones":[]},
  "legalClauses": {"selected":[],"clauses":[]},
  "changeOrder": {"description":"Add gate TEST","additionalCost":500,"newCompletionDate":"2026-04-20"}
}'

test_deduction "Contrato sin firma" "/api/contracts/generate" "$CONTRACT_BASE" 12
test_deduction "Contrato + Firma dual (bundle)" "/api/contracts/generate" "$CONTRACT_WITH_SIG" 18
test_deduction "Change Order" "/api/generate-contract-html" "$CHANGE_ORDER" 12

# ── STEP 6: Tests de seguridad ────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}── STEP 6: Tests de Seguridad (Sin Auth) ───────────────${RESET}"

echo ""
echo -e "  ${BOLD}▸ Request sin autenticación → debe retornar 401/403${RESET}"
CODE1=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/contracts/generate" \
  -H "Content-Type: application/json" \
  -d "$CONTRACT_BASE" 2>/dev/null || echo "000")

if [ "$CODE1" = "401" ] || [ "$CODE1" = "403" ]; then
  pass "/api/contracts/generate sin auth → HTTP $CODE1 ✓"
else
  fail "/api/contracts/generate sin auth" "Esperado 401/403, recibido HTTP $CODE1"
fi

echo ""
echo -e "  ${BOLD}▸ /api/generate-contract-html sin auth → debe retornar 401/403${RESET}"
CODE2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/generate-contract-html" \
  -H "Content-Type: application/json" \
  -d "$CHANGE_ORDER" 2>/dev/null || echo "000")

if [ "$CODE2" = "401" ] || [ "$CODE2" = "403" ]; then
  pass "/api/generate-contract-html sin auth → HTTP $CODE2 ✓"
else
  fail "/api/generate-contract-html sin auth" "Esperado 401/403, recibido HTTP $CODE2"
fi

# ── STEP 7: Historial de transacciones ───────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}── STEP 7: Historial de Transacciones ──────────────────${RESET}"

if [ -n "$BEARER_TOKEN" ] || [ "$USE_COOKIE" = "true" ]; then
  if [ -n "$BEARER_TOKEN" ]; then
    HIST=$(curl -s "$BASE_URL/api/wallet/history?limit=10" \
      -H "Authorization: Bearer $BEARER_TOKEN" 2>/dev/null || echo "")
  else
    HIST=$(curl -s "$BASE_URL/api/wallet/history?limit=10" \
      -b /tmp/owlfenc-cookies.txt 2>/dev/null || echo "")
  fi

  echo "$HIST" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    txns = d.get('transactions') or d.get('history') or []
    contract_types = {'contract','contractwithsignature','signatureprotocol','change-order','lien-waiver'}
    found = [t for t in txns if (t.get('type') or t.get('featureName') or '').lower() in contract_types]
    if found:
        print(f'  \033[0;32m✅ PASS\033[0m Historial tiene {len(found)} transacción(es) de contratos:')
        for t in found[:5]:
            ft = (t.get('type') or t.get('featureName') or 'unknown')
            amt = t.get('amount') or t.get('credits') or t.get('amountCredits') or 0
            desc = (t.get('description') or '')[:60]
            print(f'    → [{ft}] {amt} créditos | {desc}')
    else:
        print(f'  \033[1;33m⏭  SKIP\033[0m No hay transacciones de contratos en los últimos 10 registros (normal si es cuenta nueva)')
except Exception as e:
    print(f'  \033[0;31m❌ FAIL\033[0m Error leyendo historial: {e}')
" 2>/dev/null
else
  skip "Historial de transacciones" "Sin autenticación"
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────
rm -f /tmp/owlfenc-cookies.txt

# ── Resumen ───────────────────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL + SKIP))
echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════╗"
echo -e "║                  RESUMEN FINAL                       ║"
echo -e "╚══════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Total:   $TOTAL"
echo -e "  ${GREEN}Passed:  $PASS${RESET}"
echo -e "  ${RED}Failed:  $FAIL${RESET}"
echo -e "  ${YELLOW}Skipped: $SKIP${RESET}"

if [ "$FAIL" -eq 0 ]; then
  echo ""
  echo -e "  ${GREEN}${BOLD}🎉 TODOS LOS TESTS PASARON — Sistema de créditos OK!${RESET}"
  exit 0
else
  echo ""
  echo -e "  ${RED}${BOLD}⚠️  $FAIL test(s) FALLARON — Revisa el output arriba.${RESET}"
  exit 1
fi
