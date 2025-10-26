# 🔍 AUDITORÍA COMPLETA DEL SISTEMA DE PERMISOS - OWL FENCE

**Fecha:** 26 de Octubre, 2025  
**Estado:** AUDITORÍA COMPLETADA  
**Objetivo:** Identificar todas las verificaciones de permisos dispersas y problemas de consistencia

---

## 📊 RESUMEN EJECUTIVO

### Problemas Críticos Detectados

1. **❌ MÚLTIPLES FUENTES DE VERDAD** - Configuración de planes duplicada en 4 lugares diferentes
2. **❌ IDS INCONSISTENTES** - Frontend usa IDs 4,5,6,9 pero backend usa IDs 1,2,3,4
3. **❌ VERIFICACIONES DISPERSAS** - Lógica de permisos repetida en 20+ archivos
4. **❌ MAPEO MANUAL ERROR-PRONE** - Conversión manual de IDs entre sistemas
5. **❌ SIN CONTEO CENTRALIZADO** - Cada feature maneja su propio tracking

---

## 🗂️ INVENTARIO DE ARCHIVOS CON VERIFICACIONES DE PERMISOS

### Frontend (10 archivos)

#### 1. **client/src/contexts/PermissionContext.tsx** ⭐ CORE
**Líneas:** 565 líneas  
**Responsabilidad:** Context provider principal de permisos  
**Problemas:**
- Define PLANS con IDs [5, 9, 6, 4] (✅ Correcto - coincide con PostgreSQL)
- Lógica de mapeo manual de nombres a IDs (líneas 233-238)
- Mapeo hardcoded de dev simulation (líneas 258-264)
- `hasAccess()` permite acceso temporal durante carga (líneas 386-393) - posible bypass

**Configuración de Planes (líneas 65-165):**
```typescript
const PLANS: Plan[] = [
  { id: 5, name: "Primo Chambeador", price: 0 },      // ✅ Correcto
  { id: 9, name: "Mero Patrón", price: 4999 },        // ✅ Correcto
  { id: 6, name: "Master Contractor", price: 9900 },  // ✅ Correcto
  { id: 4, name: "Free Trial", price: 0 }             // ✅ Correcto
]
```

**Verificaciones Detectadas:**
- `hasAccess(feature)` - línea 384
- `canUse(feature, count)` - línea 399
- `getRemainingUsage(feature)` - línea 421
- `isLimitReached(feature)` - línea 433

---

#### 2. **client/src/hooks/usePermissions.ts**
**Líneas:** 73 líneas  
**Responsabilidad:** Hooks auxiliares para features específicos  
**Problemas:**
- `shouldShowWatermark()` usa `userPlan.id === 1` (❌ OBSOLETO - debe ser 5)
- Lógica de watermark duplicada

**Verificaciones Detectadas:**
- `canCreateBasicEstimate()` - línea 12
- `canCreateAIEstimate()` - línea 13
- `canCreateContract()` - línea 23
- `canUsePropertyVerifier()` - línea 27
- `canUsePermitAdvisor()` - línea 28
- `canUseAIProjectManager()` - línea 29
- `hasInvoiceAccess()` - línea 32
- `hasPaymentTrackingAccess()` - línea 33
- `shouldShowWatermark(feature)` - línea 48 ❌ BUG: usa plan ID 1

---

#### 3. **client/src/pages/AIProjectManager.tsx**
**Líneas:** ~150 líneas  
**Responsabilidad:** Página de gestión de proyectos AI  
**Verificaciones:**
```typescript
const hasAIProjectManagerAccess = hasAccess('projects') && userPlan?.id !== 5;
```
✅ **CORRECTO** - bloquea plan gratuito (ID 5)

---

#### 4. **client/src/pages/Mervin.tsx**
**Líneas:** ~800 líneas  
**Responsabilidad:** Chat de Mervin AI  
**Verificaciones detectadas (vía grep):**
```typescript
const isFreeUser = userPlan?.id === 5 || userPlan?.name === "Primo Chambeador";
```
✅ **CORRECTO** - detecta plan gratuito correctamente

---

#### 5. **client/src/pages/OwlFunding.tsx**
**Líneas:** ~400 líneas  
**Responsabilidad:** Página de financiamiento  
**Verificaciones:**
```typescript
const hasOwlFundingAccess = userPlan?.id !== 5;
```
✅ **CORRECTO** - bloquea plan gratuito

---

#### 6. **client/src/pages/Subscription.tsx**
**Líneas:** ~600 líneas  
**Responsabilidad:** Gestión de suscripciones  
**Verificaciones:**
```typescript
const activePlanId = getActivePlanId();
// Detecta plan activo actual
```
✅ **CORRECTO** - usa IDs correctos de PostgreSQL

---

#### 7. **client/src/pages/Billing.tsx**
**Líneas:** ~500 líneas  
**Responsabilidad:** Facturación  
**Verificaciones:**
- Usa `userPlan?.id` para mostrar plan actual
- ✅ Correcto

---

#### 8. **client/src/pages/ProjectPayments.tsx**
**Líneas:** ~700 líneas  
**Responsabilidad:** Pagos de proyectos  
**Verificaciones:**
```typescript
const hasPaymentTrackingAccess = hasAccess('paymentTracking');
```
✅ **CORRECTO** - usa hook centralizado

---

#### 9. **client/src/pages/Invoices.tsx**
**Líneas:** ~600 líneas  
**Responsabilidad:** Sistema de facturas  
**Verificaciones:**
```typescript
const { hasAccess, userPlan } = usePermissions();
```
✅ **CORRECTO** - usa sistema centralizado

---

#### 10. **client/src/pages/EstimatesWizard.tsx**
**Líneas:** ~400 líneas  
**Responsabilidad:** Wizard de estimados  
**Verificaciones:**
- Usa `usePermissions()` hook
- ✅ Correcto

---

### Backend (8 archivos principales)

#### 1. **server/middleware/subscription-auth.ts** ⭐ CORE
**Líneas:** 399 líneas  
**Responsabilidad:** Middleware de autorización basado en suscripciones  
**Problemas CRÍTICOS:**

**IDs INCORRECTOS (líneas 18-23):**
```typescript
const PLAN_PERMISSIONS: Record<number, PermissionLevel[]> = {
  1: [PermissionLevel.FREE],           // ❌ OBSOLETO - debe ser 5
  2: [PermissionLevel.BASIC],          // ❌ OBSOLETO - debe ser 9
  3: [PermissionLevel.PREMIUM],        // ❌ OBSOLETO - debe ser 6
  4: [PermissionLevel.TRIAL]           // ✅ CORRECTO
};
```

**PLAN_LIMITS INCORRECTOS (líneas 27-89):**
```typescript
const PLAN_LIMITS = {
  1: { ... },  // ❌ OBSOLETO - debe ser 5
  2: { ... },  // ❌ OBSOLETO - debe ser 9
  3: { ... },  // ❌ OBSOLETO - debe ser 6
  4: { ... }   // ✅ CORRECTO
};
```

**Funciones Exportadas:**
- `requireSubscriptionLevel(level)` - línea 122
- `validateUsageLimit(feature)` - línea 176
- `incrementUsageOnSuccess(feature)` - línea 250
- `requirePremiumFeature(feature)` - línea 288
- `requireLegalDefenseAccess` - línea 326 (✅ Actualizado correctamente a plan 5)

---

#### 2. **server/services/subscriptionControlService.ts** ⭐ CORE
**Líneas:** 258 líneas  
**Responsabilidad:** Control de suscripciones y uso con PostgreSQL  
**Estado:** ✅ **BIEN DISEÑADO** - usa database como fuente de verdad

**Funciones Principales:**
- `getUserSubscriptionStatus(userId)` - línea 33
- `canUseFeature(userId, feature)` - línea 73
- `incrementUsage(userId, feature, count)` - línea 123
- `initializeMonthlyLimits(userId)` - línea 178 ⚠️ **PROBLEMA:** lanza error si no hay subscription

**Problemas:**
```typescript
// Línea 182
if (!subscription) {
  throw new Error('User has no subscription'); // ❌ CAUSA ERRORES EN LOGS
}
```
Debería crear subscription por defecto en lugar de lanzar error.

---

#### 3. **server/constants/subscription.ts** ⭐ CRITICAL
**Líneas:** 67 líneas  
**Responsabilidad:** Constantes centralizadas  
**Problemas CRÍTICOS:**

**IDS COMPLETAMENTE INCORRECTOS (líneas 7-12):**
```typescript
export const SUBSCRIPTION_PLAN_IDS = {
  PRIMO_CHAMBEADOR: 1,        // ❌ DEBE SER 5
  MERO_PATRON: 2,             // ❌ DEBE SER 9
  MASTER_CONTRACTOR: 3,       // ❌ DEBE SER 6
  TRIAL_MASTER: 4,            // ✅ CORRECTO
};
```

**PLAN_FEATURES con IDs incorrectos (líneas 32-66)**
Todo el archivo usa IDs [1, 2, 3, 4] en lugar de [5, 9, 6, 4]

⚠️ **ALTO IMPACTO:** Este archivo se importa en múltiples lugares

---

#### 4. **server/routes/usage-limits.ts**
**Líneas:** ~300 líneas  
**Responsabilidad:** Endpoints de límites de uso  
**Verificaciones:**
```typescript
planName: subscription.planId === 5 ? 'Primo Chambeador' : 
          subscription.planId === 9 ? 'Mero Patrón' :
          subscription.planId === 6 ? 'Master Contractor' : 
          subscription.planId === 4 ? 'Free Trial' : 'Unknown'
```
✅ **CORRECTO** - usa IDs correctos

---

#### 5. **server/services/firebaseSubscriptionService.ts**
**Líneas:** ~500 líneas  
**Responsabilidad:** Servicio de suscripciones de Firebase  
**Verificaciones:**
```typescript
if (subscriptionData.planId && subscriptionData.planId !== 5 && ...)
```
✅ **CORRECTO** - actualizado a plan ID 5

---

#### 6. **server/services/robustSubscriptionService.ts**
**Líneas:** ~400 líneas  
**Responsabilidad:** Servicio robusto de suscripciones  
**Estado:** ✅ **BIEN** - usa database correctamente

---

#### 7. **server/services/userMappingService.ts**
**Líneas:** ~500 líneas  
**Responsabilidad:** Mapeo de usuarios Firebase ↔ PostgreSQL  
**Estado:** ✅ **BIEN** - maneja mapeo 1:1 correctamente

---

#### 8. **server/routes.ts**
**Líneas:** 8562 líneas (archivo masivo)  
**Responsabilidad:** Todas las rutas de la aplicación  
**Verificaciones múltiples:**
- Endpoint `/api/subscription/plans` - línea 4478 (✅ Actualizado a PostgreSQL)
- Endpoint `/api/subscription/user-subscription` - línea 4557
- Múltiples verificaciones de plan usando `planId`

---

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **Inconsistencia de IDs entre Frontend y Backend**

| Ubicación | Free Plan | Basic Plan | Premium Plan | Trial Plan |
|-----------|-----------|------------|--------------|------------|
| **PostgreSQL (VERDAD)** | 5 | 9 | 6 | 4 |
| **Frontend Context** ✅ | 5 | 9 | 6 | 4 |
| **Backend Middleware** ❌ | 1 | 2 | 3 | 4 |
| **Backend Constants** ❌ | 1 | 2 | 3 | 4 |

**Impacto:** Cualquier código que use `subscription.ts` o `subscription-auth.ts` tendrá IDs incorrectos.

---

### 2. **Múltiples Definiciones de Límites**

Existen **3 definiciones diferentes** de límites de planes:

**A. Frontend - PermissionContext.tsx (líneas 65-165)**
```typescript
{
  id: 5,
  limits: {
    basicEstimates: 5,
    aiEstimates: 1,
    contracts: 0,
    projects: 5
  }
}
```

**B. Backend - subscription-auth.ts (líneas 27-89)**
```typescript
1: { // ❌ ID INCORRECTO
  estimatesBasic: 10,  // ❌ Diferente al frontend (5)
  estimatesAI: 3,      // ❌ Diferente al frontend (1)
  contracts: 0,        // ✅ Coincide
}
```

**C. Backend - subscription.ts (líneas 32-66)**
```typescript
[SUBSCRIPTION_PLAN_IDS.PRIMO_CHAMBEADOR]: { // ❌ ID 1 incorrecto
  basicEstimates: 10,  // ❌ Diferente
  aiEstimates: 3,      // ❌ Diferente
  contracts: 3,        // ❌ Diferente (frontend: 0)
}
```

**Resultado:** Ninguna definición coincide completamente con las otras 🔥

---

### 3. **Verificaciones Dispersas**

**Patrones de verificación encontrados en el código:**

#### Pattern 1: Verificación directa de planId
```typescript
// Encontrado en 6 archivos
if (userPlan?.id === 5) { ... }
if (planId !== 5) { ... }
```

#### Pattern 2: Hook usePermissions
```typescript
// Encontrado en 10 archivos
const { hasAccess, canUse } = usePermissions();
if (hasAccess('contracts')) { ... }
```

#### Pattern 3: Middleware backend
```typescript
// Encontrado en 15 endpoints
app.post('/api/contracts', 
  requireAuth,
  requireSubscriptionLevel(PermissionLevel.BASIC),
  validateUsageLimit('contracts'),
  ...
)
```

#### Pattern 4: Llamadas directas a servicios
```typescript
// Encontrado en 8 archivos
const status = await subscriptionControlService.canUseFeature(userId, 'contracts');
```

---

### 4. **Mapeo Manual Error-Prone**

**Frontend - PermissionContext.tsx (líneas 233-238):**
```typescript
let planId = 5; // Default to Primo Chambeador
if (planName === 'Primo Chambeador') planId = 5;
else if (planName === 'Mero Patrón') planId = 9;
else if (planName === 'Master Contractor') planId = 6;
else if (planName === 'Free Trial' || planName === 'Trial Master') planId = 4;
else if (planName === 'Free') planId = 5; // Map legacy
```

**Problema:** Cualquier cambio de nombre requiere actualizar mapeo manual en múltiples lugares.

---

### 5. **Bug de Watermark**

**client/src/hooks/usePermissions.ts (línea 52):**
```typescript
// Plan gratuito siempre tiene marca de agua
if (userPlan.id === 1) return true; // ❌ BUG: debe ser 5
```

**Impacto:** Usuarios del plan gratuito (ID 5) NO ven marca de agua cuando deberían.

---

### 6. **Error Handling Problemático**

**server/services/subscriptionControlService.ts (línea 182):**
```typescript
if (!subscription) {
  throw new Error('User has no subscription'); // ❌ Causa errores en logs
}
```

**Visto en logs:**
```
❌ [SUBSCRIPTION-CONTROL] Error initializing monthly limits: Error: User has no subscription
```

**Debería:** Crear subscription por defecto en lugar de lanzar error.

---

## 📋 CONTEO DE VERIFICACIONES POR TIPO

| Tipo de Verificación | Cantidad de Archivos | Líneas de Código Aprox. |
|----------------------|---------------------|-------------------------|
| Verificación directa de `planId` | 10 archivos | ~50 líneas |
| Hook `usePermissions()` | 10 archivos | ~100 líneas |
| Middleware `requireSubscriptionLevel` | 15 endpoints | ~30 líneas |
| Servicio `subscriptionControlService` | 8 archivos | ~40 líneas |
| Definición de planes/límites | 3 archivos | ~300 líneas |
| **TOTAL** | **20+ archivos** | **~520 líneas** |

---

## 🎯 RECOMENDACIONES

### Prioridad CRÍTICA

1. **✅ COMPLETADO:** Migrar `/api/subscription/plans` a PostgreSQL
2. **⏳ PENDIENTE:** Actualizar `server/constants/subscription.ts` con IDs correctos
3. **⏳ PENDIENTE:** Actualizar `server/middleware/subscription-auth.ts` con IDs correctos
4. **⏳ PENDIENTE:** Crear archivo centralizado único de configuración
5. **⏳ PENDIENTE:** Corregir bug de watermark en `usePermissions.ts`

### Prioridad ALTA

6. **⏳ PENDIENTE:** Eliminar mapeo manual de nombres a IDs
7. **⏳ PENDIENTE:** Mejorar error handling en `subscriptionControlService`
8. **⏳ PENDIENTE:** Consolidar verificaciones dispersas
9. **⏳ PENDIENTE:** Implementar Redis para conteo de uso

### Prioridad MEDIA

10. **⏳ PENDIENTE:** Agregar tests de integración para permisos
11. **⏳ PENDIENTE:** Documentar sistema de permisos
12. **⏳ PENDIENTE:** Crear dashboard de auditoría de uso

---

## 📈 IMPACTO DE CENTRALIZACIÓN

### Antes (Sistema Actual)
```
❌ 3 definiciones diferentes de límites
❌ IDs inconsistentes entre frontend/backend
❌ 20+ archivos con verificaciones dispersas
❌ ~520 líneas de código duplicado
❌ Mapeo manual error-prone
❌ Sin fuente única de verdad
```

### Después (Sistema Centralizado Propuesto)
```
✅ 1 archivo centralizado de configuración
✅ IDs consistentes en toda la aplicación
✅ Middleware centralizado
✅ ~100 líneas de código (reducción 80%)
✅ Sincronización automática con PostgreSQL
✅ PostgreSQL como fuente única de verdad
```

---

## 🔧 ARCHIVOS A MODIFICAR

### Actualizar (IDs incorrectos)
1. `server/constants/subscription.ts` - Cambiar IDs [1,2,3,4] → [5,9,6,4]
2. `server/middleware/subscription-auth.ts` - Cambiar IDs [1,2,3,4] → [5,9,6,4]
3. `client/src/hooks/usePermissions.ts` - Cambiar watermark check de ID 1 → 5

### Refactorizar
4. `client/src/contexts/PermissionContext.tsx` - Eliminar mapeo manual
5. `server/services/subscriptionControlService.ts` - Mejorar error handling

### Crear (Nuevo)
6. `shared/permissions-config.ts` - Archivo centralizado de configuración
7. `server/middleware/centralized-permissions.ts` - Middleware único
8. `shared/permission-types.ts` - Tipos TypeScript compartidos

---

## ✅ PRÓXIMOS PASOS

1. **Crear archivo centralizado** de configuración (`shared/permissions-config.ts`)
2. **Actualizar archivos** con IDs incorrectos
3. **Migrar verificaciones** a sistema centralizado
4. **Implementar Redis** para conteo en tiempo real
5. **Tests de integración** para prevenir regresiones

---

**Fin del Reporte de Auditoría**
