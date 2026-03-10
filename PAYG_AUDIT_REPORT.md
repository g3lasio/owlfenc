# Owl Fenc — PAYG Migration Audit Report
**Fecha:** 2026-03-09  
**Revisado por:** Manus AI  
**Rama:** `main`  

---

## Resumen Ejecutivo

Se realizó una auditoría completa del repositorio `g3lasio/owlfenc` para verificar el estado de la migración al modelo **Pure Pay-As-You-Go (PAYG)**. Se identificaron y corrigieron 3 deficiencias críticas, se confirmó 1 implementación correcta, y se documentaron las restricciones de plan activas restantes.

---

## PUNTO 1 — `application_fee_amount` 0.5% ✅ CONFIRMADO

**Archivo:** `server/services/contractorPaymentService.ts` línea 216

```typescript
application_fee_amount: Math.round(roundedAmount * 0.005), // 0.5% platform fee
```

El cálculo es **correcto**: `roundedAmount` está en centavos, y `* 0.005` produce el 0.5% también en centavos, que es exactamente lo que Stripe espera en `application_fee_amount`.

**Bug de log corregido:** La línea de log usaba `roundedAmount * 0.005 / 100` (división doble), lo que mostraba un valor 100× menor en los logs. Se corrigió a:

```typescript
const platformFeeCents = Math.round(roundedAmount * 0.005);
const platformFeeDisplay = (platformFeeCents / 100).toFixed(2); // dollars for log
```

**Ejemplo real:** Para un pago de $1,000 (= 100,000 centavos):
- `application_fee_amount` = `Math.round(100000 * 0.005)` = **500 centavos = $5.00** ✅
- Log anterior mostraba: `$0.05` ❌ (bug visual, no funcional)
- Log corregido muestra: `$5.00` ✅

---

## PUNTO 2A — `requireCredits` en Payment Link ✅ IMPLEMENTADO

**Archivo:** `server/routes/contractor-payment-routes.ts`

Se agregó `requireCredits({ featureName: 'paymentLink' })` a los 3 endpoints que generan Stripe Checkout Sessions:

| Endpoint | Antes | Después |
|---|---|---|
| `POST /create` | `requireSubscriptionLevel(BASIC)` | `requireCredits({ featureName: 'paymentLink' })` |
| `POST /payments` | `requireSubscriptionLevel(BASIC)` | `requireCredits({ featureName: 'paymentLink' })` |
| `POST /payments/quick-link` | `requireSubscriptionLevel(BASIC)` | `requireCredits({ featureName: 'paymentLink' })` |
| `POST /payments/manual` | `requireSubscriptionLevel(BASIC)` | ✅ FREE (solo registro, sin Stripe) |
| `POST /projects/:id/payment-structure` | `requireSubscriptionLevel(BASIC)` | ✅ FREE (estructura, sin Stripe) |
| `GET /payments` | `requireSubscriptionLevel(BASIC)` | ✅ FREE (solo lectura) |
| `GET /dashboard/summary` | `requireSubscriptionLevel(BASIC)` | ✅ FREE (solo lectura) |

**Costo por Payment Link:** `paymentLink: 3` créditos = **$0.30** (definido en `shared/wallet-schema.ts` línea 187)

---

## PUNTO 2B — Tip Opcional en Checkout (Propuesta)

**Estado:** No implementado. Requiere decisión de negocio.

**Propuesta técnica:** Stripe Checkout no soporta nativamente campos de "tip". Las opciones son:

**Opción A — Stripe Payment Links con `adjustable_quantity`** (más simple):
```typescript
// Agregar un line_item opcional de "tip"
line_items: [
  { price_data: { ... }, quantity: 1 }, // monto principal
  {
    price_data: {
      currency: 'usd',
      product_data: { name: 'Tip (Optional)' },
      unit_amount: tipAmount, // calculado en frontend
    },
    quantity: 1,
    adjustable_quantity: { enabled: true, minimum: 0, maximum: 1 }
  }
]
```

**Opción B — Custom Checkout Page** (más control): Crear una página `/pay/:paymentId` propia con React que use Stripe Elements, permitiendo que el cliente ingrese un tip antes de pagar.

**Recomendación:** Opción B es superior para UX y permite mostrar el desglose (monto + tip) claramente. Costo de implementación: ~4 horas.

---

## PUNTO 3 — Fee Pass-Through al Cliente (Propuesta)

**Estado:** No implementado. El 0.5% actualmente se deduce del pago al contratista.

**Propuesta técnica:** Para trasladar el fee al cliente, hay dos enfoques:

**Enfoque A — Incrementar el monto del line_item:**
```typescript
// Si el contratista quiere recibir exactamente $1,000:
// Cliente paga: $1,000 / (1 - 0.005) = $1,005.03
const grossAmount = Math.round(netAmount / 0.995);
const platformFee = Math.round(grossAmount * 0.005);
// application_fee_amount = platformFee
// unit_amount = grossAmount (cliente paga más)
```

**Enfoque B — Stripe `on_behalf_of` + `transfer_data`** (más transparente):
Mostrar en el checkout: "Monto del proyecto: $1,000 + Tarifa de plataforma: $5.00 = Total: $1,005.00"

**Recomendación:** Agregar un toggle en el UI del contratista: "¿Quién paga la tarifa de plataforma?" con opciones "Yo (contratista)" / "Mi cliente". Esto es una feature de valor diferenciador.

---

## PUNTO 4 — OWL Funding Gate ✅ CORREGIDO

**Archivo:** `client/src/pages/OwlFunding.tsx`

**Antes:** `const hasOwlFundingAccess = userPlan?.id !== 5;` — bloqueaba a usuarios Primo Chambeador (plan ID 5).

**Después:**
```typescript
// ✅ Pure PAYG: Owl Funding is open to ALL authenticated users
const hasOwlFundingAccess = true; // Removed plan gate per PAYG migration
```

OWL Funding es una página informativa/referral. No consume créditos ni genera costos operativos. Bloquearla a usuarios free era innecesario y reducía el potencial de conversión.

---

## PUNTO 5 — Auditoría Completa de Restricciones de Plan Activas

### Backend — Gates activos por plan

| Ruta | Middleware | Planes bloqueados |
|---|---|---|
| `POST /api/anthropic/generate-contract` | `requireLegalDefenseAccess` | Primo Chambeador (plan 5) |
| `POST /api/legal-defense/generate-contract` | `requireLegalDefenseAccess` | Primo Chambeador (plan 5) |
| `POST /api/dual-signature/initiate` | `requireLegalDefenseAccess` + `requireCredits(signatureProtocol)` | Primo Chambeador (plan 5) |
| `POST /api/contracts` (contracts-firebase) | `requireCredits(contract)` | Todos (PAYG puro) |
| `POST /api/invoices/generate-from-project` | `requireCredits(invoice)` | Todos (PAYG puro) |
| `POST /api/search/property` | `requireCredits(propertyVerification)` | Todos (PAYG puro) |
| `POST /api/search/permits` | `requireCredits(permitReport)` | Todos (PAYG puro) |
| `GET /api/property/details` | `requireCredits(propertyVerification)` | Todos (PAYG puro) |
| `POST /api/contractor-payments/create` | `requireCredits(paymentLink)` | Todos (PAYG puro) ✅ NUEVO |
| `POST /api/contractor-payments/payments` | `requireCredits(paymentLink)` | Todos (PAYG puro) ✅ NUEVO |
| `POST /api/contractor-payments/payments/quick-link` | `requireCredits(paymentLink)` | Todos (PAYG puro) ✅ NUEVO |

### Frontend — Gates activos por plan

| Página | Condición | Planes bloqueados |
|---|---|---|
| `CyberpunkContractGenerator` | `canUse('contracts')` | Según límite mensual del plan |
| `PropertyOwnershipVerifier` | `canUse('propertyVerifications')` | Según límite mensual del plan |
| `PermitAdvisor` | `canUse('permitAdvisor')` | Según límite mensual del plan |
| `Projects` (ver detalles) | `hasAccess('projects')` | Primo Chambeador (plan 5) |
| `Invoices` | `canUseInvoices` | Según límite mensual del plan |
| `OwlFunding` | ~~`userPlan?.id !== 5`~~ → `true` | ✅ ELIMINADO |
| `ProjectPayments` | ~~`hasAccess('paymentTracking')`~~ → `true` | ✅ ELIMINADO |

### Gates que DEBEN permanecer (justificados)

Los siguientes gates son **correctos y deben mantenerse**:

1. **`requireLegalDefenseAccess` en contratos** — Los contratos legales con IA son una feature premium que justifica el bloqueo a Primo Chambeador. El costo de Anthropic Claude es alto y el valor percibido es máximo.

2. **`validateUsageLimit('contracts')` en contratos** — Controla el límite mensual por plan (ej. Primo Chambeador: 5 contratos/mes).

3. **`canUse('propertyVerifications')` en frontend** — Refleja el límite mensual del plan (Primo Chambeador: 5/mes, Mero Patrón: 50/mes, Master: ilimitado).

---

## PUNTO 6 — Créditos para Payment Tracker

**Definición actual en `shared/wallet-schema.ts`:**
```typescript
paymentLink: 3, // $0.30 por Payment Link generado
```

**Análisis de costos:**
- Stripe cobra 0.25% + $0.25 por payout (para Express accounts)
- Nuestro `application_fee_amount` = 0.5% del monto
- Para un pago de $1,000: fee = $5.00, costo Stripe ≈ $2.75 → margen = $2.25
- El crédito de 3 ($0.30) es un costo adicional mínimo para el contratista

**Recomendación de pricing:**

| Acción | Créditos | Costo | Justificación |
|---|---|---|---|
| Crear Payment Link (Stripe) | 3 | $0.30 | Genera sesión Stripe, envía email |
| Quick Payment Link | 3 | $0.30 | Igual que arriba |
| Registrar pago manual | 0 | GRATIS | Solo registro en DB, sin Stripe |
| Ver dashboard/historial | 0 | GRATIS | Solo lectura |
| Reenviar link por email | 0 | GRATIS | Bajo costo, alta retención |

**Nota:** El `application_fee_amount` (0.5%) es la fuente principal de ingresos del Payment Tracker. Los 3 créditos son un ingreso secundario menor que cubre el costo operativo del servicio.

---

## Resumen de Cambios Implementados

| # | Archivo | Cambio | Estado |
|---|---|---|---|
| 1 | `server/services/contractorPaymentService.ts` | Fix bug en log de platform fee | ✅ Aplicado |
| 2 | `server/routes/contractor-payment-routes.ts` | Agregar import `requireCredits` | ✅ Aplicado |
| 3 | `server/routes/contractor-payment-routes.ts` | `POST /create` → `requireCredits(paymentLink)` | ✅ Aplicado |
| 4 | `server/routes/contractor-payment-routes.ts` | `POST /payments` → `requireCredits(paymentLink)` | ✅ Aplicado |
| 5 | `server/routes/contractor-payment-routes.ts` | `POST /payments/quick-link` → `requireCredits(paymentLink)` | ✅ Aplicado |
| 6 | `server/routes/contractor-payment-routes.ts` | `POST /payments/manual` → FREE (sin Stripe) | ✅ Aplicado |
| 7 | `server/routes/contractor-payment-routes.ts` | `GET /payments` y `/dashboard/summary` → FREE | ✅ Aplicado |
| 8 | `client/src/pages/OwlFunding.tsx` | Eliminar gate `userPlan?.id !== 5` | ✅ Aplicado |
| 9 | `client/src/pages/ProjectPayments.tsx` | Eliminar gate `hasAccess('paymentTracking')` | ✅ Aplicado |

---

## Próximos Pasos Recomendados

1. **Commit y push** de todos los cambios a `main`
2. **Implementar Tip Opcional** (Opción B — Custom Checkout Page) — Prioridad media
3. **Implementar Fee Pass-Through Toggle** — Prioridad baja (diferenciador de valor)
4. **Revisar `Projects` gate** — `hasAccess('projects')` aún bloquea a Primo Chambeador para ver detalles de proyecto. Evaluar si debe ser PAYG también.
5. **Agregar `requireCredits(paymentLink)` en el endpoint inline** de `server/index.ts` línea 498 (`/api/contractor-payments/create-payment-link`) si está activo.
