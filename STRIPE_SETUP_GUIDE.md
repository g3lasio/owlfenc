# 🔐 Guía Completa: Configuración Segura de Stripe Connect

## 📋 Tabla de Contenidos
1. [Identificación del Problema](#problema)
2. [Obtener Credenciales de Owl Fence Company](#credenciales)
3. [Actualizar Secrets en Replit](#replit-secrets)
4. [Verificar Configuración](#verificar)
5. [Mejores Prácticas de Seguridad](#seguridad)
6. [Troubleshooting](#troubleshooting)

---

## 🚨 Identificación del Problema {#problema}

**Problema Actual:**
- Estás usando credenciales de **Chyrris Technologies** (sin Stripe Connect)
- Necesitas usar credenciales de **Owl Fence Company** (con Connect habilitado)

**Cómo Identificar la Cuenta Correcta:**
```
❌ Chyrris Technologies:
   - NO tiene Stripe Connect habilitado
   - NO es una compañía registrada en California
   - NO puede crear cuentas conectadas

✅ Owl Fence Company:
   - SÍ tiene Stripe Connect habilitado
   - SÍ es una compañía verificada en California
   - PUEDE crear cuentas conectadas para contratistas
```

---

## 🔑 Paso 1: Obtener Credenciales de Owl Fence Company {#credenciales}

### A. Acceder al Dashboard Correcto

1. Ve a: https://dashboard.stripe.com
2. **IMPORTANTE**: Asegúrate de estar en la cuenta de **Owl Fence Company**
3. Verifica en la esquina superior izquierda que dice "Owl Fence Company"

### B. Obtener Secret Key (API Key)

1. Click en **Developers** (esquina superior derecha)
2. Click en **API keys**
3. Selecciona el modo correcto:
   - **Test mode** (para desarrollo): Key empieza con `sk_test_`
   - **Live mode** (para producción): Key empieza con `sk_live_`

4. Copia la **Secret key**:
   ```
   Formato: sk_live_51XXXXXXXXXX... (para producción)
   Formato: sk_test_51XXXXXXXXXX... (para desarrollo)
   ```

⚠️ **NUNCA compartas esta key públicamente o la subas a GitHub**

### C. Obtener Publishable Key

1. En la misma página **API keys**
2. Copia la **Publishable key**:
   ```
   Formato: pk_live_51XXXXXXXXXX... (para producción)
   Formato: pk_test_51XXXXXXXXXX... (para desarrollo)
   ```

### D. Configurar Webhook Secret (Recomendado)

1. Ve a **Developers** → **Webhooks**
2. Click en **Add endpoint**
3. Configuración:
   ```
   Endpoint URL: https://TU-DOMINIO.replit.dev/api/webhooks/stripe
   
   Events to send:
   ✓ checkout.session.completed
   ✓ payment_intent.succeeded
   ✓ payment_intent.payment_failed
   ✓ account.updated
   ✓ account.application.authorized
   ✓ account.application.deauthorized
   ```

4. Copia el **Signing secret**:
   ```
   Formato: whsec_XXXXXXXXXX...
   ```

---

## 🔒 Paso 2: Actualizar Secrets en Replit {#replit-secrets}

### Acceder a Replit Secrets

1. En tu Replit, busca el ícono de **🔒 candado** en la barra lateral izquierda
2. O ve a **Tools** → **Secrets**

### Credenciales que DEBES Configurar

```bash
# 1. STRIPE_SECRET_KEY (OBLIGATORIO)
Key: STRIPE_SECRET_KEY
Value: sk_live_51XXXXXXXXXX  # De Owl Fence Company
Description: Secret key de Stripe con Connect habilitado

# 2. STRIPE_PUBLISHABLE_KEY (OBLIGATORIO)
Key: STRIPE_PUBLISHABLE_KEY
Value: pk_live_51XXXXXXXXXX  # De Owl Fence Company
Description: Publishable key para el frontend

# 3. STRIPE_WEBHOOK_SECRET (RECOMENDADO)
Key: STRIPE_WEBHOOK_SECRET
Value: whsec_XXXXXXXXXX
Description: Secret para validar webhooks de Stripe

# 4. STRIPE_CONNECT_CLIENT_ID (Opcional - solo si usas OAuth)
Key: STRIPE_CONNECT_CLIENT_ID
Value: ca_XXXXXXXXXX
Description: Client ID para Stripe Connect OAuth flow
```

### ⚠️ IMPORTANTE: Reemplazar vs Crear Nueva

**Si ya existe `STRIPE_SECRET_KEY`:**
1. Click en el ícono de **editar** (lápiz) ✏️
2. Pega la nueva key de **Owl Fence Company**
3. Click en **Update**

**Si no existe:**
1. Click en **New Secret**
2. Ingresa el nombre y valor
3. Click en **Add**

---

## ✅ Paso 3: Verificar Configuración {#verificar}

### Usando el Botón de Diagnóstico

1. Ve a tu app: **Settings** → **Payment Settings**
2. Click en el botón **"Verify Config"** (amarillo con ícono de escudo)
3. Revisa el mensaje que aparece:

**✅ Configuración Correcta:**
```
Stripe Connect: ✅ ENABLED
Account: owl@owlfence.com (o similar)
Environment: LIVE
Key Prefix: sk_live_51RE...
✓ Ready to accept payments
```

**❌ Configuración Incorrecta:**
```
Stripe Connect: ❌ NOT ENABLED
⚠ Activate Connect in Stripe Dashboard
```

### Verificación Manual en Terminal

También puedes verificar manualmente:

```bash
# En la terminal de Replit
curl -u YOUR_SECRET_KEY: https://api.stripe.com/v1/accounts
```

Si Connect está habilitado, verás una lista de cuentas (puede estar vacía al inicio).
Si NO está habilitado, verás un error: "signed up for Connect"

---

## 🛡️ Mejores Prácticas de Seguridad {#seguridad}

### ✅ DO (Hacer):

1. **Usar Replit Secrets** para todas las API keys
   - Nunca hardcodear keys en el código
   - Nunca usar archivos `.env` en producción

2. **Rotar Keys Regularmente**
   - Cada 3-6 meses
   - Inmediatamente si sospechas compromiso

3. **Usar Test Mode en Desarrollo**
   - Keys de test (`sk_test_`) para desarrollo
   - Keys de live (`sk_live_`) solo en producción

4. **Habilitar 2FA en Stripe**
   - Settings → Team & security
   - Activar autenticación de dos factores

5. **Monitorear Activity**
   - Revisar regularmente logs en Stripe Dashboard
   - Configurar alertas para actividad sospechosa

### ❌ DON'T (No Hacer):

1. **NUNCA** subir keys a GitHub o repositorios públicos
2. **NUNCA** compartir secret keys por email o Slack
3. **NUNCA** usar la misma key en múltiples proyectos
4. **NUNCA** exponer secret keys en el frontend
5. **NUNCA** loggear keys completas en consola

### 🔐 Estructura de Keys Segura

```javascript
// ✅ CORRECTO: Usar environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ❌ INCORRECTO: Hardcodear la key
const stripe = new Stripe('sk_live_51XXXXXXXXXX');

// ✅ CORRECTO: Usar publishable key en frontend
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ❌ INCORRECTO: Usar secret key en frontend
const stripePromise = loadStripe(process.env.STRIPE_SECRET_KEY); // PELIGROSO!
```

---

## 🔧 Troubleshooting {#troubleshooting}

### Error: "You can only create new accounts if you've signed up for Connect"

**Causa:** Usando credenciales de cuenta sin Connect habilitado

**Solución:**
1. Verificar que estás usando keys de **Owl Fence Company**
2. En Stripe Dashboard de Owl Fence, ir a **Settings → Connect**
3. Si no ves la opción, contactar Stripe Support

### Error: "Invalid API Key provided"

**Causa:** Key incorrecta o malformada

**Solución:**
1. Verificar que copiaste la key completa (sin espacios)
2. Verificar que la key es de la cuenta correcta
3. Regenerar la key en Stripe Dashboard si es necesario

### Error: "No such account"

**Causa:** Intentando acceder a cuenta que no existe

**Solución:**
1. Verificar que el `stripeConnectAccountId` en la base de datos es válido
2. Verificar que la cuenta no fue eliminada en Stripe

### El botón "Verify Config" muestra "NOT ENABLED"

**Causas Posibles:**
1. Usando keys de Chyrris Technologies (cuenta incorrecta)
2. Connect no activado en Stripe Dashboard
3. Keys de test/live no coinciden con el ambiente

**Solución:**
1. Seguir **Paso 1** de esta guía para obtener keys correctas
2. Activar Connect en Dashboard de Owl Fence Company
3. Usar keys de test en desarrollo, live en producción

---

## 📱 Contacto y Soporte

### Stripe Support
- Dashboard: https://dashboard.stripe.com/support
- Documentación: https://stripe.com/docs/connect

### Connect Específico
- Guía: https://stripe.com/docs/connect/enable-payment-acceptance-guide
- FAQ: https://stripe.com/docs/connect/faq

---

## 🎯 Checklist Final

Antes de ir a producción, verifica:

- [ ] Keys de **Owl Fence Company** configuradas en Replit Secrets
- [ ] Stripe Connect **habilitado** en dashboard de Owl Fence
- [ ] Botón "Verify Config" muestra **✅ ENABLED**
- [ ] Webhooks configurados correctamente
- [ ] 2FA activado en cuenta de Stripe
- [ ] Test mode funcionando correctamente
- [ ] Live mode keys guardadas de forma segura
- [ ] Team tiene acceso apropiado a Stripe Dashboard

---

## 🚀 Próximos Pasos

Una vez configurado correctamente:

1. **Testing:**
   - Crear una cuenta de test usando test keys
   - Probar flujo completo de onboarding
   - Verificar que payment links funcionan

2. **Producción:**
   - Cambiar a live keys en Replit Secrets
   - Probar con transacción real pequeña
   - Monitorear logs y webhooks

3. **Escalabilidad:**
   - Configurar alertas de Stripe
   - Implementar logging robusto
   - Documentar flujos para el equipo
