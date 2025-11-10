# Stripe Connect Setup Guide - Producción

## ✅ Correcciones Implementadas

He mejorado completamente el sistema de Stripe Connect con:

### 1. **Manejo de Errores Robusto**
- ✅ Logging detallado en cada paso del proceso
- ✅ Mensajes de error específicos para debugging
- ✅ Try-catch granular para identificar exactamente dónde falla
- ✅ Validación de environment variables antes de proceder
- ✅ Manejo separado de errores de Stripe API

### 2. **Validaciones Implementadas**
- ✅ Verifica que STRIPE_SECRET_KEY esté configurado
- ✅ Verifica que el usuario existe en Firebase
- ✅ Verifica que el usuario existe en la base de datos PostgreSQL
- ✅ Maneja correctamente cuentas existentes
- ✅ Reintenta creación si cuenta anterior no existe

### 3. **Logging Mejorado**
Ahora verás logs detallados como:
```
🔐 [STRIPE-CONNECT-EXPRESS] Iniciando configuración de pagos
📧 [STRIPE-CONNECT-EXPRESS] User: owl@chyrris.com
✅ [STRIPE-CONNECT-EXPRESS] Database user ID: 1
✅ [STRIPE-CONNECT-EXPRESS] User found: owl@chyrris.com
🔗 [STRIPE-CONNECT-EXPRESS] Base URL: https://your-app.replit.app
🆕 [STRIPE-CONNECT] Creating new Stripe Express account
✅ [STRIPE-CONNECT] Account created: acct_xxxxx
✅ [STRIPE-CONNECT] Onboarding link created
```

---

## 🔧 Configuración Requerida

### 1. **Verifica REPLIT_DOMAINS en Producción**

En tu deployment de Replit, asegúrate de que la variable de entorno `REPLIT_DOMAINS` esté correctamente configurada:

```bash
# En producción debería ser algo como:
REPLIT_DOMAINS=your-app-name.replit.app

# O si tienes custom domain:
REPLIT_DOMAINS=app.owlfenc.com
```

**Cómo verificar:**
- Ve a **Deployments** → **Settings** → **Environment Variables**
- Busca `REPLIT_DOMAINS`
- Debería contener tu dominio de producción

### 2. **Configura las Redirect URLs en Stripe Dashboard**

⚠️ **IMPORTANTE:** Stripe requiere que las URLs de redirect estén autorizadas en tu dashboard.

**Pasos:**

1. **Ve a tu Stripe Dashboard:**
   - https://dashboard.stripe.com
   - Cambia a LIVE mode (toggle en la esquina superior derecha)

2. **Navega a Connect Settings:**
   - **Settings** → **Connect** → **Integration**

3. **Agrega tus URLs de redirect:**
   - En la sección "Redirect URIs", agrega:
     ```
     https://your-app-name.replit.app/project-payments?tab=settings&connected=true
     https://your-app-name.replit.app/project-payments?tab=settings&refresh=true
     ```
   - Si usas custom domain:
     ```
     https://app.owlfenc.com/project-payments?tab=settings&connected=true
     https://app.owlfenc.com/project-payments?tab=settings&refresh=true
     ```

4. **Guarda los cambios**

### 3. **Habilita Stripe Connect**

Si aún no lo has hecho, debes activar Stripe Connect en tu cuenta:

1. **Ve a:** https://dashboard.stripe.com/settings/connect
2. **Click en "Get Started"** o "Enable Connect"
3. **Completa el onboarding** de Stripe Connect
4. **Acepta los términos** de servicio

---

## 🧪 Cómo Probar

### 1. **Test con el Diagnostic Button**

En la interfaz:
1. Ve a **Project Payments** → **Settings**
2. Click en **"Run Diagnostic"** (botón amarillo con escudo)
3. Deberías ver:
   ```
   Stripe Connect: ✅ ENABLED
   Account: your-account@email.com
   Environment: LIVE MODE
   ✓ Ready to accept payments
   ```

### 2. **Intentar Conectar Cuenta**

1. Click en **"Connect Stripe Account"** (botón azul grande)
2. Observa los logs en la consola del servidor
3. Si hay un error, los logs te dirán exactamente qué falló:

**Errores Comunes y Soluciones:**

| Error | Causa | Solución |
|-------|-------|----------|
| `STRIPE_SECRET_KEY not configured` | Falta la clave de Stripe | Agregar STRIPE_SECRET_KEY en Secrets |
| `Failed to map user account` | Error en user mapping | Verifica que el usuario tenga session activa |
| `User profile not found` | Usuario no existe en DB | Verifica integración Firebase → PostgreSQL |
| `Failed to create Stripe account` | Error de Stripe API | Revisa los logs para mensaje específico |
| `Failed to create onboarding link` | URLs no autorizadas | Agrega las URLs en Stripe Dashboard |

### 3. **Ver Logs Detallados**

Busca en los logs del servidor líneas que empiecen con:
- `❌ [STRIPE-CONNECT]` = Error crítico
- `⚠️ [STRIPE-CONNECT-EXPRESS]` = Warning
- `✅ [STRIPE-CONNECT]` = Éxito

---

## 📊 Flujo Completo

```
Usuario click "Connect Stripe Account"
    ↓
Frontend envía POST /api/contractor-payments/stripe/connect
    ↓
Backend verifica:
    ✓ Usuario autenticado (Firebase)
    ✓ STRIPE_SECRET_KEY configurado
    ✓ Usuario existe en DB PostgreSQL
    ↓
¿Usuario tiene cuenta de Stripe?
    SÍ → Crear login link → Redirect a Stripe Dashboard
    NO → Continuar abajo
    ↓
Crear nueva cuenta Stripe Express
    ↓
Guardar account.id en PostgreSQL
    ↓
Crear accountLink para onboarding
    ↓
Devolver URL al frontend
    ↓
Frontend redirect a Stripe onboarding
    ↓
Usuario completa setup en Stripe
    ↓
Stripe redirect a: /project-payments?tab=settings&connected=true
    ↓
✅ Cuenta conectada!
```

---

## 🔍 Debugging en Producción

Si sigues teniendo problemas HTTP, ejecuta estos comandos en la consola del servidor:

```javascript
// 1. Verificar environment variables
console.log('REPLIT_DOMAINS:', process.env.REPLIT_DOMAINS);
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');

// 2. Test Stripe connection
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
stripe.accounts.list({ limit: 1 })
  .then(() => console.log('✅ Stripe API works'))
  .catch(err => console.error('❌ Stripe error:', err.message));
```

---

## 🆘 Contacto de Soporte

Si después de seguir estos pasos aún tienes problemas:

1. **Copia los logs completos** del servidor cuando intentas conectar
2. **Toma screenshot** del error en el navegador
3. **Verifica** que estés en LIVE mode en Stripe
4. **Confirma** que las redirect URLs están en el dashboard de Stripe

Los logs ahora son mucho más detallados y te dirán exactamente dónde está fallando el proceso.

---

## ✨ Mejoras Incluidas

- 🔍 **Logging detallado en cada paso**
- 🛡️ **Validación robusta de configuración**
- 🔄 **Manejo inteligente de cuentas existentes**
- 📊 **Mensajes de error específicos**
- 🚨 **Alertas tempranas de configuración incorrecta**
- ✅ **Confirmación visual de cada paso exitoso**
