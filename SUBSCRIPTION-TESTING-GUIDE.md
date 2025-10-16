# 🧪 GUÍA DE TESTING DE SUSCRIPCIONES

## Resumen del Sistema

El sistema tiene **protección triple-capa enterprise-grade** para Legal Defense:

### 🛡️ Capa 1: Backend Middleware
- **verifyFirebaseAuth**: Solo acepta JWT válidos de Firebase
- **requireLegalDefenseAccess**: Bloquea usuarios sin Legal Defense
- **validateUsageLimit**: Verifica límites antes de permitir acción
- **incrementUsageOnSuccess**: Cuenta uso solo en respuestas 2xx

### 🎯 Capa 2: Configuración de Planes

| Plan | Precio | Contracts | Legal Defense | Comportamiento |
|------|--------|-----------|---------------|----------------|
| **Primo Chambeador** | FREE | 0 | ❌ No | 403 Forbidden |
| **Free Trial** | FREE (14 días) | ∞ | ✅ Sí | 200 OK ilimitado |
| **Mero Patrón** | $49.99/mo | 50 | ✅ Sí | 200 OK hasta 50, luego 403 |
| **Master Contractor** | $99/mo | ∞ | ✅ Sí | 200 OK siempre |

### 💻 Capa 3: Frontend Demo Mode
- Primo Chambeador ve preview local con watermark "DEMO MODE"
- Sin llamadas al backend para generación real
- CTAs claros de upgrade

---

## 🔬 TESTING PASO A PASO

### Paso 1: Obtener Token de Firebase

1. **Abre el frontend**: `http://localhost:5000`
2. **Inicia sesión** con un usuario de prueba
3. **Abre DevTools** → Console
4. **Ejecuta**:
   ```javascript
   firebase.auth().currentUser.getIdToken(true).then(token => {
     console.log('🔑 Firebase Token:', token);
     // También copiarlo al clipboard
     copy(token);
   });
   ```
5. **Copia** el token JWT generado

### Paso 2: Verificar Plan del Usuario

```bash
# Reemplaza <FIREBASE_UID> con el UID del usuario
curl -s "http://localhost:5000/api/auth/can-access/<FIREBASE_UID>/contracts"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "firebaseUid": "...",
  "feature": "contracts",
  "canAccess": true/false,
  "usage": {
    "used": 0,
    "limit": -1/0/50,
    "isUnlimited": true/false
  },
  "planName": "Primo Chambeador|Free Trial|Mero Patrón|Master Contractor"
}
```

### Paso 3: Probar Endpoint Protegido

```bash
# Reemplaza <TOKEN> con el token obtenido en Paso 1
export TOKEN="<tu-firebase-token-aqui>"

curl -X POST http://localhost:5000/api/legal-defense/generate-contract \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contractData": {
      "clientInfo": {
        "name": "Test Client",
        "email": "client@test.com",
        "phone": "555-0000"
      },
      "projectDetails": {
        "type": "Fencing",
        "description": "Test contract",
        "location": "123 Test St"
      },
      "financials": {
        "total": 5000
      }
    },
    "protectionLevel": "standard"
  }'
```

### Paso 4: Verificar Respuestas Esperadas

#### ✅ Primo Chambeador (FREE)
**Esperado**: `403 Forbidden`
```json
{
  "error": "Legal Defense requiere plan Mero Patrón o superior",
  "currentPlan": "Primo Chambeador",
  "requiredPlan": "Mero Patrón ($49.99/mo)",
  "upgradeUrl": "/subscription"
}
```

#### ✅ Free Trial (14 días)
**Esperado**: `200 OK`
```json
{
  "success": true,
  "html": "...",
  "metadata": {
    "generationTime": 1234,
    "protectionLevel": "standard"
  }
}
```

#### ✅ Mero Patrón ($49.99)
**Primeros 50 contratos**: `200 OK`
**Contrato 51**: `403 Forbidden`
```json
{
  "error": "Límite de 50 contratos alcanzado",
  "currentPlan": "Mero Patrón",
  "usage": "50/50",
  "upgradeUrl": "/subscription"
}
```

#### ✅ Master Contractor ($99)
**Siempre**: `200 OK` (ilimitado)

---

## 🤖 TESTING AUTOMATIZADO

### Script de Testing Completo

Guarda este script como `test-all-plans.sh`:

```bash
#!/bin/bash

# 🧪 Complete subscription testing suite
# Usage: ./test-all-plans.sh <firebase-token> <firebase-uid>

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <firebase-token> <firebase-uid>"
  exit 1
fi

TOKEN=$1
UID=$2
BASE_URL="http://localhost:5000"

echo "🧪 TESTING SUBSCRIPTION PLAN"
echo "================================"
echo ""

# Step 1: Get user plan
echo "📋 Step 1: Verificando plan del usuario..."
PLAN_INFO=$(curl -s "$BASE_URL/api/auth/can-access/$UID/contracts")
echo "$PLAN_INFO"
echo ""

# Extract plan name (requires jq)
PLAN_NAME=$(echo "$PLAN_INFO" | grep -o '"planName":"[^"]*"' | cut -d'"' -f4)
echo "Plan detectado: $PLAN_NAME"
echo ""

# Step 2: Test contract generation
echo "📋 Step 2: Probando generación de contrato..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/legal-defense/generate-contract" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contractData": {
      "clientInfo": {"name": "Test Client", "email": "test@test.com"},
      "projectDetails": {"type": "Fencing", "description": "Test"},
      "financials": {"total": 5000}
    }
  }')

STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "Status Code: $STATUS"
echo "Response: $BODY"
echo ""

# Step 3: Verify expected behavior
echo "📋 Step 3: Verificando comportamiento esperado..."
case "$PLAN_NAME" in
  "Primo Chambeador")
    if [ "$STATUS" = "403" ]; then
      echo "✅ PASS: Primo Chambeador bloqueado correctamente (403)"
    else
      echo "❌ FAIL: Esperado 403, recibido $STATUS"
    fi
    ;;
  "Free Trial")
    if [ "$STATUS" = "200" ]; then
      echo "✅ PASS: Free Trial tiene acceso (200)"
    else
      echo "❌ FAIL: Esperado 200, recibido $STATUS"
    fi
    ;;
  "Mero Patrón")
    if [ "$STATUS" = "200" ]; then
      echo "✅ PASS: Mero Patrón tiene acceso (200)"
      echo "ℹ️  Nota: Verifica límite de 50 contratos manualmente"
    else
      echo "❌ FAIL: Esperado 200, recibido $STATUS"
    fi
    ;;
  "Master Contractor")
    if [ "$STATUS" = "200" ]; then
      echo "✅ PASS: Master Contractor tiene acceso ilimitado (200)"
    else
      echo "❌ FAIL: Esperado 200, recibido $STATUS"
    fi
    ;;
  *)
    echo "⚠️  Plan desconocido: $PLAN_NAME"
    ;;
esac

echo ""
echo "================================"
echo "✅ Testing completado"
```

### Uso del Script

```bash
# 1. Obtén token desde el frontend
# 2. Ejecuta:
chmod +x test-all-plans.sh
./test-all-plans.sh "eyJhbGciOi..." "qztot1YEy3UWz605gIH2iwwWhW53"
```

---

## 📊 USUARIOS DE PRUEBA DISPONIBLES

Según la base de datos actual:

| Email | Firebase UID | Plan Actual |
|-------|--------------|-------------|
| truthbackpack@gmail.com | qztot1YEy3UWz605gIH2iwwWhW53 | Master Contractor |
| primo@example.com | test-primo-user | Primo Chambeador* |
| contractor@owlfence.com | test-firebase-uid | Sin plan (bloqueado) |

*Nota: primo@example.com tiene configuración inconsistente en Firestore pero será bloqueado por middleware.

---

## 🔐 SEGURIDAD VERIFICADA

### Tests Automatizados Ejecutados ✅

```
✅ /api/dual-signature/initiate → 401 (sin auth)
✅ /api/legal-defense/extract-pdf → 401 (sin auth)
✅ /api/legal-defense/generate-contract → 401 (sin auth)
✅ /api/legal-defense-legacy/create-project → 401 (sin auth)
✅ /api/health → 200 (público)
```

### Arquitecto Approval ✅

> "Enterprise Contract Security System now enforces strict Firebase JWT authentication 
> and all legal-defense endpoints are correctly gated behind the hardened middleware chain. 
> No residual architectural gaps observed."

---

## ⚠️ LIMITACIONES ACTUALES

1. **No puedo generar tokens JWT válidos** sin el SDK del cliente de Firebase
2. **Testing requiere usuario real loggeado** en el frontend
3. **Firestore puede tener configuraciones inconsistentes** pero middleware las sobrescribe

---

## 🎯 PRÓXIMOS PASOS

1. **Login con usuario real** en el frontend
2. **Obtener token JWT** usando DevTools
3. **Ejecutar script de testing** con token + UID
4. **Verificar respuestas** según plan del usuario
5. **Crear usuarios de prueba** para cada plan si es necesario

---

## 🆘 TROUBLESHOOTING

### Error: "Token de autenticación inválido" (401)
- Verifica que el token sea JWT válido de Firebase
- Asegúrate de usar `Authorization: Bearer <token>`
- Token puede haber expirado (válido ~1 hora)

### Error: "Legal Defense requiere plan superior" (403)
- Usuario tiene plan Primo Chambeador (FREE)
- Necesita upgrade a Mero Patrón ($49.99) o superior

### Error: "Límite alcanzado" (403)
- Usuario Mero Patrón llegó a 50 contratos
- Necesita upgrade a Master Contractor ($99) o esperar reset mensual

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Usuario puede login en frontend
- [ ] Token JWT se genera correctamente
- [ ] Primo Chambeador recibe 403 (bloqueado)
- [ ] Free Trial recibe 200 (acceso completo)
- [ ] Mero Patrón recibe 200 hasta 50 contratos
- [ ] Mero Patrón recibe 403 después de 50
- [ ] Master Contractor recibe 200 siempre
- [ ] Contador de uso se actualiza correctamente
- [ ] Demo Mode funciona en frontend para Primo
