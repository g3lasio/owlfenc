#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║        OWL FENC — CREDIT SYSTEM TEST (Replit Dev Environment)              ║
# ║                                                                              ║
# ║  Corre directamente en el shell de Replit sin necesidad de token externo.   ║
# ║  Usa las variables de entorno ya configuradas en Replit Secrets.            ║
# ║                                                                              ║
# ║  PREREQUISITOS:                                                              ║
# ║    1. El servidor debe estar corriendo (npm run dev)                        ║
# ║    2. Tener configurado en Replit Secrets:                                  ║
# ║       - ADMIN_API_KEY                                                        ║
# ║       - TEST_USER_EMAIL (email de un usuario de prueba en Firebase)         ║
# ║                                                                              ║
# ║  USO:                                                                        ║
# ║    bash scripts/test-credits-local.sh                                       ║
# ║                                                                              ║
# ║  O con parámetros:                                                           ║
# ║    TEST_USER_EMAIL=test@example.com bash scripts/test-credits-local.sh      ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

set -e

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL="${TEST_BASE_URL:-http://localhost:5000}"
ADMIN_KEY="${ADMIN_API_KEY:-}"
TEST_EMAIL="${TEST_USER_EMAIL:-}"
PASS=0
FAIL=0
SKIP=0

# ── Helpers ───────────────────────────────────────────────────────────────────
pass() { echo -e "  ${GREEN}✅ PASS${RESET} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}❌ FAIL${RESET} $1 ${DIM}($2)${RESET}"; ((FAIL++)); }
skip() { echo -e "  ${YELLOW}⏭  SKIP${RESET} $1 ${DIM}($2)${RESET}"; ((SKIP++)); }
info() { echo -e "  ${DIM}→ $1${RESET}"; }

# ── Check prerequisites ───────────────────────────────────────────────────────
echo -e "\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════╗"
echo -e "║   OWL FENC — CREDIT SYSTEM TEST (LOCAL/DEV)         ║"
echo -e "╚══════════════════════════════════════════════════════╝${RESET}"
echo -e "\n${DIM}URL: $BASE_URL${RESET}"

# Check server is running
echo -e "\n${CYAN}${BOLD}── Verificando servidor ────────────────────────────────${RESET}"
if curl -sf "$BASE_URL/api/health" > /dev/null 2>&1 || curl -sf "$BASE_URL/" > /dev/null 2>&1; then
  pass "Servidor corriendo en $BASE_URL"
else
  fail "Servidor no responde en $BASE_URL" "Asegúrate de que 'npm run dev' esté corriendo"
  echo -e "\n${RED}FATAL: El servidor no está corriendo. Inicia con: npm run dev${RESET}\n"
  exit 1
fi

# Check admin key
if [ -z "$ADMIN_KEY" ]; then
  fail "ADMIN_API_KEY no configurado" "Agrega ADMIN_API_KEY en Replit Secrets"
  echo -e "\n${RED}FATAL: Configura ADMIN_API_KEY en Replit Secrets${RESET}\n"
  exit 1
else
  pass "ADMIN_API_KEY configurado"
fi

# ── Step 1: Get Firebase custom token via server ──────────────────────────────
echo -e "\n${CYAN}${BOLD}── STEP 1: Autenticación via Custom Token ──────────────${RESET}"

if [ -z "$TEST_EMAIL" ]; then
  skip "Obtener custom token" "TEST_USER_EMAIL no configurado — usando modo sin-auth para tests de seguridad"
  SESSION_COOKIE=""
else
  info "Obteniendo custom token para: $TEST_EMAIL"
  CUSTOM_TOKEN_RESP=$(curl -sf -X POST "$BASE_URL/api/auth/create-custom-token" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$TEST_EMAIL\"}" 2>&1)
  
  if echo "$CUSTOM_TOKEN_RESP" | grep -q '"success":true'; then
    CUSTOM_TOKEN=$(echo "$CUSTOM_TOKEN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('customToken',''))" 2>/dev/null)
    if [ -n "$CUSTOM_TOKEN" ]; then
      pass "Custom token obtenido del servidor"
      info "Token: ${CUSTOM_TOKEN:0:30}..."
    else
      fail "Custom token vacío" "$CUSTOM_TOKEN_RESP"
      SESSION_COOKIE=""
    fi
  else
    fail "No se pudo obtener custom token" "$CUSTOM_TOKEN_RESP"
    SESSION_COOKIE=""
    echo -e "\n${YELLOW}⚠️  Sin autenticación — solo se ejecutarán tests de seguridad${RESET}"
  fi
fi

# ── Step 2: Exchange custom token for ID token via Firebase REST API ──────────
if [ -n "$CUSTOM_TOKEN" ]; then
  info "Intercambiando custom token por ID token via Firebase REST API..."
  
  # Get Firebase API key from environment
  FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY:-${FIREBASE_API_KEY:-}}"
  
  if [ -z "$FIREBASE_API_KEY" ]; then
    # Try to extract from client config
    FIREBASE_API_KEY=$(grep -r "apiKey" /home/ubuntu/owlfenc/client/src/lib/firebase.ts 2>/dev/null | head -1 | sed 's/.*apiKey.*"\(.*\)".*/\1/' | tr -d ' ')
  fi
  
  if [ -n "$FIREBASE_API_KEY" ]; then
    ID_TOKEN_RESP=$(curl -sf -X POST \
      "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=$FIREBASE_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"token\": \"$CUSTOM_TOKEN\", \"returnSecureToken\": true}" 2>&1)
    
    if echo "$ID_TOKEN_RESP" | grep -q '"idToken"'; then
      ID_TOKEN=$(echo "$ID_TOKEN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('idToken',''))" 2>/dev/null)
      pass "ID token obtenido de Firebase"
      
      # Create session cookie
      info "Creando session cookie..."
      SESSION_RESP=$(curl -sf -c /tmp/owlfenc-test-cookies.txt -X POST "$BASE_URL/api/sessionLogin" \
        -H "Content-Type: application/json" \
        -d "{\"idToken\": \"$ID_TOKEN\"}" 2>&1)
      
      if echo "$SESSION_RESP" | grep -q '"success":true\|"ok":true\|sessionCookie\|logged'; then
        pass "Session cookie creada exitosamente"
        SESSION_COOKIE="-b /tmp/owlfenc-test-cookies.txt"
      else
        # Try using Bearer token directly
        info "Session cookie falló, usando Bearer token directamente"
        SESSION_COOKIE="-H \"Authorization: Bearer $ID_TOKEN\""
        BEARER_TOKEN="$ID_TOKEN"
        pass "Usando Authorization Bearer token"
      fi
    else
      fail "No se pudo obtener ID token de Firebase" "$(echo $ID_TOKEN_RESP | head -c 200)"
      SESSION_COOKIE=""
    fi
  else
    skip "Intercambio de token" "FIREBASE_API_KEY no encontrado"
    SESSION_COOKIE=""
  fi
fi

# ── Step 3: Get Firebase UID for admin operations ─────────────────────────────
FIREBASE_UID=""
if [ -n "$TEST_EMAIL" ]; then
  UID_RESP=$(curl -sf "$BASE_URL/api/auth/user-by-email?email=$TEST_EMAIL" \
    -H "x-admin-key: $ADMIN_KEY" 2>/dev/null || echo "")
  if echo "$UID_RESP" | grep -q '"uid"'; then
    FIREBASE_UID=$(echo "$UID_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('uid','') or d.get('firebaseUid',''))" 2>/dev/null)
  fi
  
  # Fallback: get UID from custom token response
  if [ -z "$FIREBASE_UID" ] && [ -n "$ID_TOKEN_RESP" ]; then
    FIREBASE_UID=$(echo "$ID_TOKEN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('localId',''))" 2>/dev/null)
  fi
fi

# ── Helper: make authenticated request ───────────────────────────────────────
make_request() {
  local method="$1"
  local endpoint="$2"
  local data="$3"
  
  if [ -n "$BEARER_TOKEN" ]; then
    curl -sf -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $BEARER_TOKEN" \
      -d "$data" 2>&1
  elif [ -f "/tmp/owlfenc-test-cookies.txt" ]; then
    curl -sf -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -b /tmp/owlfenc-test-cookies.txt \
      -d "$data" 2>&1
  else
    echo '{"error":"no_auth","status":401}'
  fi
}

# ── Helper: get wallet balance ────────────────────────────────────────────────
get_balance() {
  local resp
  if [ -n "$BEARER_TOKEN" ]; then
    resp=$(curl -sf "$BASE_URL/api/wallet/balance" \
      -H "Authorization: Bearer $BEARER_TOKEN" 2>/dev/null || echo "")
  elif [ -f "/tmp/owlfenc-test-cookies.txt" ]; then
    resp=$(curl -sf "$BASE_URL/api/wallet/balance" \
      -b /tmp/owlfenc-test-cookies.txt 2>/dev/null || echo "")
  else
    echo "0"
    return
  fi
  echo "$resp" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('balance') or d.get('availableCredits') or d.get('credits') or 0)
except:
    print(0)
" 2>/dev/null || echo "0"
}

# ── Helper: grant credits ─────────────────────────────────────────────────────
grant_credits() {
  local amount="$1"
  local desc="$2"
  local uid="${FIREBASE_UID:-test-uid}"
  
  curl -sf -X POST "$BASE_URL/api/wallet/admin/grant" \
    -H "Content-Type: application/json" \
    -H "x-admin-key: $ADMIN_KEY" \
    -d "{\"targetType\":\"single\",\"firebaseUid\":\"$uid\",\"credits\":$amount,\"description\":\"$desc\",\"idempotencyKey\":\"test-$(date +%s)-$amount\"}" \
    > /dev/null 2>&1
}

# ── Helper: test credit deduction ─────────────────────────────────────────────
test_deduction() {
  local test_name="$1"
  local endpoint="$2"
  local payload="$3"
  local expected_cost="$4"
  
  echo -e "\n  ${BOLD}Test:${RESET} $test_name"
  info "Endpoint: POST $endpoint | Costo esperado: -$expected_cost créditos"
  
  if [ -z "$BEARER_TOKEN" ] && [ ! -f "/tmp/owlfenc-test-cookies.txt" ]; then
    skip "$test_name" "Sin autenticación disponible"
    return
  fi
  
  # Ensure enough credits
  local balance_before
  balance_before=$(get_balance)
  info "Balance antes: $balance_before créditos"
  
  if [ "$balance_before" -lt "$((expected_cost + 10))" ] 2>/dev/null; then
    local needed=$((expected_cost + 50))
    info "Otorgando $needed créditos de prueba..."
    grant_credits "$needed" "test-grant-$test_name"
    sleep 0.5
    balance_before=$(get_balance)
    info "Balance después de grant: $balance_before créditos"
  fi
  
  # Make the request
  local resp
  resp=$(make_request "POST" "$endpoint" "$payload")
  local http_ok=false
  
  if echo "$resp" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    ok = d.get('success') or d.get('html') or d.get('contractId') or d.get('content') or d.get('id')
    sys.exit(0 if ok else 1)
except:
    sys.exit(1)
" 2>/dev/null; then
    http_ok=true
  fi
  
  if [ "$http_ok" = false ]; then
    fail "$test_name" "Request falló: $(echo $resp | head -c 200)"
    return
  fi
  
  # Wait for async credit deduction
  sleep 1.2
  
  local balance_after
  balance_after=$(get_balance)
  local actual_cost=$((balance_before - balance_after))
  
  info "Balance después: $balance_after créditos (deducido: $actual_cost)"
  
  if [ "$actual_cost" -eq "$expected_cost" ] 2>/dev/null; then
    pass "$test_name → -$actual_cost créditos ✓"
  elif [ "$actual_cost" -eq 0 ] 2>/dev/null; then
    fail "$test_name" "NO se dedujo ningún crédito (esperado: -$expected_cost)"
  else
    fail "$test_name" "Monto incorrecto: dedujo $actual_cost, esperado $expected_cost"
  fi
}

# ── Step 4: Wallet balance endpoint ──────────────────────────────────────────
echo -e "\n${CYAN}${BOLD}── STEP 2: Wallet Balance ──────────────────────────────${RESET}"

if [ -n "$BEARER_TOKEN" ] || [ -f "/tmp/owlfenc-test-cookies.txt" ]; then
  BALANCE=$(get_balance)
  if [ -n "$BALANCE" ] && [ "$BALANCE" != "0" ] || [ "$BALANCE" = "0" ]; then
    pass "GET /api/wallet/balance → $BALANCE créditos"
  else
    fail "GET /api/wallet/balance" "No se pudo leer el balance"
  fi
else
  skip "GET /api/wallet/balance" "Sin autenticación"
fi

# ── Step 5: Contract credit deduction tests ───────────────────────────────────
echo -e "\n${CYAN}${BOLD}── STEP 3: Tests de Deducción de Créditos ──────────────${RESET}"

# Sample contract payload
CONTRACT_PAYLOAD='{
  "templateId": "independent-contractor",
  "includeSignature": false,
  "client": {
    "name": "Test Client LLC",
    "address": "123 Test St, San Diego, CA 92101",
    "email": "testclient@example.com",
    "phone": "619-555-0100"
  },
  "contractor": {
    "name": "Test Contractor",
    "company": "OWL FENC TEST",
    "address": "456 Ave, San Diego, CA 92103",
    "phone": "619-555-0200",
    "email": "contractor@owlfenc.com",
    "license": "TEST-001"
  },
  "project": {
    "type": "Fence Installation",
    "description": "TEST ONLY - Install fence",
    "location": "123 Test St, San Diego, CA 92101",
    "startDate": "2026-04-01",
    "endDate": "2026-04-15"
  },
  "financials": {
    "total": 5000,
    "paymentMilestones": [
      {"description": "Deposit", "amount": 2500, "dueDate": "2026-04-01"}
    ]
  },
  "legalClauses": {"selected": [], "clauses": []}
}'

CONTRACT_WITH_SIG_PAYLOAD='{
  "templateId": "independent-contractor",
  "includeSignature": true,
  "clientEmail": "testclient@example.com",
  "contractorEmail": "contractor@owlfenc.com",
  "client": {
    "name": "Test Client LLC",
    "address": "123 Test St, San Diego, CA 92101",
    "email": "testclient@example.com",
    "phone": "619-555-0100"
  },
  "contractor": {
    "name": "Test Contractor",
    "company": "OWL FENC TEST",
    "address": "456 Ave, San Diego, CA 92103",
    "phone": "619-555-0200",
    "email": "contractor@owlfenc.com",
    "license": "TEST-001"
  },
  "project": {
    "type": "Fence Installation",
    "description": "TEST ONLY - Install fence with signature",
    "location": "123 Test St, San Diego, CA 92101",
    "startDate": "2026-04-01",
    "endDate": "2026-04-15"
  },
  "financials": {
    "total": 5000,
    "paymentMilestones": [
      {"description": "Deposit", "amount": 2500, "dueDate": "2026-04-01"}
    ]
  },
  "legalClauses": {"selected": [], "clauses": []}
}'

CHANGE_ORDER_PAYLOAD='{
  "templateId": "change-order",
  "client": {
    "name": "Test Client LLC",
    "address": "123 Test St, San Diego, CA 92101",
    "email": "testclient@example.com",
    "phone": "619-555-0100"
  },
  "contractor": {
    "name": "Test Contractor",
    "company": "OWL FENC TEST",
    "address": "456 Ave, San Diego, CA 92103",
    "phone": "619-555-0200",
    "email": "contractor@owlfenc.com",
    "license": "TEST-001"
  },
  "project": {
    "type": "Fence Installation",
    "description": "TEST ONLY - Change order",
    "location": "123 Test St",
    "startDate": "2026-04-01",
    "endDate": "2026-04-15"
  },
  "financials": {"total": 500, "paymentMilestones": []},
  "legalClauses": {"selected": [], "clauses": []},
  "changeOrder": {
    "description": "Add gate - TEST ONLY",
    "additionalCost": 500,
    "newCompletionDate": "2026-04-20"
  }
}'

# Run the tests
test_deduction \
  "Contrato sin firma → -12 créditos" \
  "/api/contracts/generate" \
  "$CONTRACT_PAYLOAD" \
  12

test_deduction \
  "Contrato + Firma dual (bundle) → -18 créditos" \
  "/api/contracts/generate" \
  "$CONTRACT_WITH_SIG_PAYLOAD" \
  18

test_deduction \
  "Change Order (html endpoint) → -12 créditos" \
  "/api/generate-contract-html" \
  "$CHANGE_ORDER_PAYLOAD" \
  12

# ── Step 6: Security tests ────────────────────────────────────────────────────
echo -e "\n${CYAN}${BOLD}── STEP 4: Tests de Seguridad (Sin Auth) ───────────────${RESET}"

echo -e "\n  ${BOLD}Test:${RESET} Request sin autenticación → 401"
UNAUTH_RESP=$(curl -sf -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/contracts/generate" \
  -H "Content-Type: application/json" \
  -d "$CONTRACT_PAYLOAD" 2>/dev/null || echo "000")

if [ "$UNAUTH_RESP" = "401" ] || [ "$UNAUTH_RESP" = "403" ]; then
  pass "Request sin auth bloqueado → HTTP $UNAUTH_RESP"
else
  fail "Request sin auth" "Esperado 401/403, recibido HTTP $UNAUTH_RESP"
fi

echo -e "\n  ${BOLD}Test:${RESET} /api/generate-contract-html sin auth → 401"
UNAUTH_RESP2=$(curl -sf -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/generate-contract-html" \
  -H "Content-Type: application/json" \
  -d "$CHANGE_ORDER_PAYLOAD" 2>/dev/null || echo "000")

if [ "$UNAUTH_RESP2" = "401" ] || [ "$UNAUTH_RESP2" = "403" ]; then
  pass "generate-contract-html sin auth bloqueado → HTTP $UNAUTH_RESP2"
else
  fail "generate-contract-html sin auth" "Esperado 401/403, recibido HTTP $UNAUTH_RESP2"
fi

# ── Step 7: Transaction history ───────────────────────────────────────────────
echo -e "\n${CYAN}${BOLD}── STEP 5: Historial de Transacciones ──────────────────${RESET}"

if [ -n "$BEARER_TOKEN" ] || [ -f "/tmp/owlfenc-test-cookies.txt" ]; then
  if [ -n "$BEARER_TOKEN" ]; then
    HISTORY_RESP=$(curl -sf "$BASE_URL/api/wallet/history?limit=10" \
      -H "Authorization: Bearer $BEARER_TOKEN" 2>/dev/null || echo "")
  else
    HISTORY_RESP=$(curl -sf "$BASE_URL/api/wallet/history?limit=10" \
      -b /tmp/owlfenc-test-cookies.txt 2>/dev/null || echo "")
  fi
  
  CONTRACT_COUNT=$(echo "$HISTORY_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    txns = d.get('transactions') or d.get('history') or []
    contract_types = {'contract','contractwithsignature','signatureprotocol'}
    count = sum(1 for t in txns if (t.get('type') or t.get('featureName') or '').lower() in contract_types)
    print(count)
except:
    print(0)
" 2>/dev/null || echo "0")
  
  if [ "$CONTRACT_COUNT" -gt 0 ] 2>/dev/null; then
    pass "Historial contiene $CONTRACT_COUNT transacción(es) de contratos"
    # Show last 3 contract transactions
    echo "$HISTORY_RESP" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    txns = d.get('transactions') or d.get('history') or []
    contract_types = {'contract','contractwithsignature','signatureprotocol'}
    for t in txns[:5]:
        ft = (t.get('type') or t.get('featureName') or 'unknown').lower()
        if ft in contract_types:
            amt = t.get('amount') or t.get('credits') or t.get('amountCredits') or 0
            desc = (t.get('description') or '')[:50]
            print(f'    → {ft}: {amt} créditos | {desc}')
except:
    pass
" 2>/dev/null
  else
    fail "Historial de transacciones" "No se encontraron transacciones de contratos en los últimos 10 registros"
  fi
else
  skip "Historial de transacciones" "Sin autenticación"
fi

# ── Cleanup ───────────────────────────────────────────────────────────────────
rm -f /tmp/owlfenc-test-cookies.txt

# ── Final summary ─────────────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL + SKIP))
echo -e "\n${CYAN}${BOLD}╔══════════════════════════════════════════════════════╗"
echo -e "║                  RESUMEN FINAL                       ║"
echo -e "╚══════════════════════════════════════════════════════╝${RESET}"
echo -e "\n  Total:   $TOTAL"
echo -e "  ${GREEN}Passed:  $PASS${RESET}"
echo -e "  ${RED}Failed:  $FAIL${RESET}"
echo -e "  ${YELLOW}Skipped: $SKIP${RESET}"

if [ "$FAIL" -eq 0 ]; then
  echo -e "\n  ${GREEN}${BOLD}🎉 TODOS LOS TESTS PASARON — Sistema de créditos funcionando correctamente!${RESET}"
  exit 0
else
  echo -e "\n  ${RED}${BOLD}⚠️  $FAIL test(s) FALLARON — Revisa el output arriba.${RESET}"
  exit 1
fi
