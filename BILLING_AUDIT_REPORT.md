# BILLING AUDIT REPORT — OWL FENC APP
**Fecha:** 2026-03-16  
**Auditor:** Manus AI  
**Alcance:** Sistema de billing completo (Stripe, créditos/wallet, planes de suscripción)

---

## RESUMEN EJECUTIVO

Se identificaron **5 problemas críticos** y **3 problemas secundarios** en el sistema de billing. El problema principal (free trial mostrándose en Stripe checkout) está causado exclusivamente por código en el servidor — **NO por configuración de Stripe**. Los precios en Stripe están correctamente configurados sin `trial_period_days`.

---

## HALLAZGOS DE STRIPE (via MCP)

### Estado de Productos en Stripe

| Producto | ID | Estado |
|---|---|---|
| Mero Patrón | `prod_TOCBk9n84l9a7S` | ✅ Activo |
| Master Contractor | `prod_TOCLgisIwp0cbB` | ✅ Activo |
| Starter Pack (créditos) | `prod_U71WslYUvQZf8P` | ✅ Activo |
| Pro Pack (créditos) | `prod_U71WcjO5JgVPMs` | ✅ Activo |
| Power Pack (créditos) | `prod_U71W71N5F08KU8` | ✅ Activo |

### Estado de Precios en Stripe

| Price ID | Producto | Monto | Intervalo | trial_period_days |
|---|---|---|---|---|
| `price_1SRPnBBAAfD6dhk7gSFDh1qp` | Mero Patrón | $49.99 | monthly | **null** ✅ |
| `price_1SRPsvBAAfD6dhk7tZkyfdLL` | Mero Patrón | $509.88 | yearly | **null** ✅ |
| `price_1SRPx5BAAfD6dhk7MqMWnnDT` | Master Contractor | $99.99 | monthly | **null** ✅ |
| `price_1SRPzTBAAfD6dhk7mvgUJ8jy` | Master Contractor | $1,019.89 | yearly | **null** ✅ |

**Conclusión:** Los precios en Stripe NO tienen `trial_period_days` configurado. El free trial viene del **código del servidor**, no de Stripe.

---

## PROBLEMA #1 — CRÍTICO: Free Trial inyectado por código del servidor

**Archivo:** `server/services/stripeService.ts` líneas 292-317

**Causa raíz:** La función `createSubscriptionCheckout()` inyecta `trial_period_days: 14` en `subscription_data` cuando crea la Checkout Session de Stripe. Esto ocurre para TODOS los usuarios que nunca han usado el trial (`userHasUsedTrial === false`), que es el 100% de los usuarios nuevos.

```typescript
// CÓDIGO PROBLEMÁTICO (líneas 292-317):
if (isPaidPlan && !userHasUsedTrial) {
  sessionConfig.subscription_data = {
    trial_period_days: 14,  // ← ESTO ES LO QUE MUESTRA "14 days free"
    ...
  };
}
```

**Impacto:** Todo usuario que intente suscribirse a Mero Patrón o Master Contractor ve "14 days free" en el checkout de Stripe, aunque la decisión de negocio es NO ofrecer free trial.

**Fix requerido:** Eliminar completamente el bloque `if (isPaidPlan && !userHasUsedTrial)` que agrega `subscription_data.trial_period_days`.

---

## PROBLEMA #2 — CRÍTICO: Price IDs no configurados (PLACEHOLDER)

**Archivo:** `server/config/stripePriceRegistry.ts`

**Causa raíz:** Los Price IDs de los planes pagados usan variables de entorno que NO están configuradas en Replit Secrets. Si no están configuradas, el código usa valores `price_PLACEHOLDER_*` que causan error al intentar crear un checkout.

```typescript
// LIVE MODE (producción):
9: {
  monthly: process.env.STRIPE_PRICE_MERO_PATRON_MONTHLY || 'price_PLACEHOLDER_MERO_MONTHLY',
  yearly: process.env.STRIPE_PRICE_MERO_PATRON_YEARLY || 'price_PLACEHOLDER_MERO_YEARLY',
}
```

**Los Price IDs reales en Stripe son:**
- Mero Patrón monthly: `price_1SRPnBBAAfD6dhk7gSFDh1qp`
- Mero Patrón yearly: `price_1SRPsvBAAfD6dhk7tZkyfdLL`
- Master Contractor monthly: `price_1SRPx5BAAfD6dhk7MqMWnnDT`
- Master Contractor yearly: `price_1SRPzTBAAfD6dhk7mvgUJ8jy`

**Fix requerido:** Configurar estas variables en Replit Secrets O hardcodear los Price IDs directamente en `stripePriceRegistry.ts` como fallback seguro.

---

## PROBLEMA #3 — CRÍTICO: Dos webhooks duplicados para el mismo evento

**Archivos:** `server/routes.ts` y `server/routes/stripe-webhooks.ts`

**Causa raíz:** Existen DOS endpoints de webhook de Stripe:
1. `POST /api/subscription/webhook` (en `routes.ts` línea 6085) — usa `stripeService.handleWebhookEvent()`
2. `POST /api/webhooks/stripe` (en `stripe-webhooks.ts`) — usa `stripeWebhookService.processWebhookEvent()`

Solo UNO de estos puede estar registrado en el Stripe Dashboard. El otro nunca recibe eventos. El problema: `stripeWebhookService` es el que tiene la lógica de **grant de créditos** (`grantMonthlySubscriptionCredits`), pero si Stripe está apuntando al endpoint viejo (`/api/subscription/webhook`), los créditos NUNCA se otorgan cuando alguien paga.

**Impacto:** Usuarios que pagan su suscripción podrían no recibir sus créditos mensuales.

**Fix requerido:** Verificar cuál endpoint está registrado en el Stripe Dashboard y asegurarse de que sea `/api/webhooks/stripe`. Deprecar el endpoint viejo.

---

## PROBLEMA #4 — CRÍTICO: Precio anual incorrecto en código vs Stripe

**Inconsistencia detectada:**

| Fuente | Mero Patrón Yearly | Master Contractor Yearly |
|---|---|---|
| Stripe (real) | $509.88 | $1,019.89 |
| `stripeService.ts` línea 223 | $509.88 ✅ | $1,019.89 ✅ |
| `routes.ts` línea 5859 | $509.88 ✅ | $1,019.89 ✅ |
| `shared/subscription-plans.ts` línea 78 | $509.90 ⚠️ | $1,019.90 ⚠️ |
| `shared/permissions-config.ts` línea 85 | $509.90 ⚠️ | $1,019.90 ⚠️ |

**Diferencia:** $0.02 en Mero Patrón y $0.01 en Master Contractor entre el precio mostrado en UI y el precio real cobrado por Stripe. Aunque pequeña, es una inconsistencia que puede confundir a usuarios.

**Fix requerido:** Unificar los precios. El precio canónico debe ser el de Stripe: $509.88 y $1,019.89.

---

## PROBLEMA #5 — SECUNDARIO: Plan FREE_TRIAL (ID 4) aún activo en catálogo

**Archivo:** `shared/subscription-plans.ts`

El plan `FREE_TRIAL` (ID 4) sigue listado como `isActive: true` en el catálogo de planes. Aunque la UI lo filtra en algunos lugares, sigue siendo visible en el sistema y puede ser activado via `/api/secure-trial/activate`.

**Fix requerido:** Decidir si se elimina completamente el plan FREE_TRIAL del catálogo o se mantiene como opción de onboarding manual para casos especiales.

---

## PROBLEMA #6 — SECUNDARIO: `monthly_credits_grant` en PostgreSQL puede estar en 0

**Archivo:** `server/services/stripeWebhookService.ts` línea 193-215

El webhook que otorga créditos mensuales hace un JOIN con `subscription_plans.monthly_credits_grant`. Si esta columna está en 0 o NULL en la base de datos PostgreSQL para los planes 9 y 6, los usuarios NO recibirán créditos aunque paguen.

**Fix requerido:** Verificar con Neon que `subscription_plans` tiene los valores correctos:
- Plan 9 (Mero Patrón): `monthly_credits_grant = 500`
- Plan 6 (Master Contractor): `monthly_credits_grant = 1200`

---

## PROBLEMA #7 — SECUNDARIO: Descripción del producto en Stripe tiene typos

**Producto Mero Patrón en Stripe:**
- Descripción actual: `"Montly suscription for profeisonal contractors for mero patron montly. 50 dolars payments"`
- Descripción correcta: `"Monthly subscription for professional contractors. $49.99/month"`

Esto es visible en el checkout de Stripe que ven los usuarios.

---

## PLAN DE CORRECCIÓN (PRIORIZADO)

### Fix #1 — INMEDIATO: Eliminar free trial del código (30 min)
Eliminar el bloque `if (isPaidPlan && !userHasUsedTrial)` en `stripeService.ts` líneas 292-317.

### Fix #2 — INMEDIATO: Hardcodear Price IDs en registry (15 min)
Actualizar `stripePriceRegistry.ts` con los Price IDs reales de Stripe como valores por defecto.

### Fix #3 — URGENTE: Verificar webhook endpoint en Stripe Dashboard (10 min)
Confirmar que Stripe está enviando eventos a `/api/webhooks/stripe` (no al endpoint viejo).

### Fix #4 — URGENTE: Verificar monthly_credits_grant en PostgreSQL (10 min)
Ejecutar query en Neon para verificar y corregir los valores de créditos por plan.

### Fix #5 — NORMAL: Unificar precios en catálogo (15 min)
Actualizar `subscription-plans.ts` y `permissions-config.ts` con precios exactos de Stripe.

### Fix #6 — NORMAL: Corregir descripción de productos en Stripe (5 min)
Actualizar descripción de Mero Patrón en Stripe Dashboard.

---

## ARQUITECTURA DEL SISTEMA DE CRÉDITOS (VERIFICADA ✅)

El sistema de créditos está correctamente diseñado:

1. **Wallet Service** (`walletService.ts`): Gestiona balance, deducciones atómicas, top-ups
2. **Stripe Webhook Service** (`stripeWebhookService.ts`): Otorga créditos mensuales en `invoice.payment_succeeded`
3. **Credit Check Middleware** (`credit-check.ts`): Deduce créditos antes de ejecutar features
4. **Billing Mode Service** (`billingModeService.ts`): Determina si usuario paga por créditos o por plan

**Flujo correcto (cuando funciona):**
```
Usuario paga → Stripe webhook → stripeWebhookService → grantMonthlySubscriptionCredits → wallet
```

**El problema:** Si el webhook no está apuntando al endpoint correcto, este flujo se rompe.
