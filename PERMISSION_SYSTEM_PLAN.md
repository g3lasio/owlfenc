# 🔐 SISTEMA DE PERMISOS - PLAN DE IMPLEMENTACIÓN

## 📊 ESTRATEGIA ACTUALIZADA: "SOFT PAYWALL" 

En lugar de bloquear completamente el acceso, implementaremos un sistema de **"Soft Paywall"**:
- ✅ **Páginas siempre visibles** - El usuario puede navegar y explorar
- 🚫 **Elementos deshabilitados** - Botones/campos no funcionales para usuarios gratuitos  
- 🎯 **Pop-ups motivacionales** - Mensajes atractivos para upgrade cuando intenten usar features premium

## 🏗️ PLANES DE SUSCRIPCIÓN

### 1. **Primo Chambeador** (Gratuito - $0)
```typescript
{
  id: 1,
  name: "Primo Chambeador",
  motto: "Ningún trabajo es pequeño cuando tu espíritu es grande",
  limits: {
    basicEstimates: 10,        // con marca de agua
    aiEstimates: 3,            // con marca de agua  
    contracts: 3,              // con marca de agua
    propertyVerifications: 5,
    permitAdvisor: 5,
    projects: 0,               // Solo vista de demo
    invoices: 0,               // Pop-up upgrade
    paymentTracking: 0         // Pop-up upgrade
  },
  features: [
    "🔢 10 estimados básicos/mes (con marca de agua)",
    "🤖 3 estimados con IA/mes (con marca de agua)",
    "📄 3 contratos/mes (con marca de agua)", 
    "🏠 5 Property Verification/mes",
    "📋 5 Permit Advisor/mes",
    "💡 Mervin AI 2.0 (conversaciones básicas)",
    "👀 VISTA DE DEMO: Invoices, Payment Tracker, Owl Funding",
    "🚫 Pop-ups de upgrade en funciones premium"
  ]
}
```

### 2. **Mero Patrón** ($49.99/mes)
```typescript
{
  id: 2, 
  name: "Mero Patrón",
  motto: "No eres solo un patrón, eres el estratega que transforma el reto en victoria",
  limits: {
    basicEstimates: -1,        // ilimitado, sin marca de agua
    aiEstimates: 50,           // sin marca de agua
    contracts: -1,             // ilimitado, sin marca de agua
    propertyVerifications: 50,
    permitAdvisor: 50,
    projects: 5,               // AI Project Manager básico
    invoices: -1,              // acceso completo
    paymentTracking: 1         // básico
  }
}
```

### 3. **Master Contractor** ($99.99/mes)
```typescript
{
  id: 3,
  name: "Master Contractor", 
  motto: "Tu voluntad es acero, tu obra es ley. Lidera como un verdadero campeón",
  limits: {
    // TODO ILIMITADO (-1)
    basicEstimates: -1,
    aiEstimates: -1,
    contracts: -1,
    propertyVerifications: -1,
    permitAdvisor: -1,
    projects: -1,
    invoices: -1,
    paymentTracking: 2         // pro con QuickBooks
  }
}
```

### 4. **Trial Master** (21 días gratuito)
```typescript
{
  id: 4,
  name: "Trial Master",
  motto: "Prueba el poder total por 21 días",
  trialDays: 21,
  limits: {
    // TODO ILIMITADO durante el trial
    ...masterContractorLimits
  },
  features: [
    "🔓 ACCESO TOTAL a todas las funciones",
    "⏰ 21 días de prueba gratuita",
    "🚫 Sin marcas de agua",  
    "🏆 Todas las integraciones premium",
    "🎯 Conversión automática al plan elegido"
  ]
}
```

## 🎯 SISTEMA DE PERMISOS CATEGORIZADO

### 🟢 PÁGINAS SIEMPRE ACCESIBLES
- **Home** - Dashboard principal
- **Profile** - Configuración personal  
- **Settings** - Configuraciones generales
- **Security** - Configuración de seguridad

### 🟡 PÁGINAS CON LÍMITES DE USO
- **Estimates** - Límites mensuales + marcas de agua
- **Contracts** - Límites mensuales + marcas de agua
- **Property Verifier** - Límites mensuales
- **Permit Advisor** - Límites mensuales  
- **Mervin AI** - Diferentes versiones según plan

### 🔴 PÁGINAS CON "SOFT PAYWALL"
- **Invoices** - Vista demo + pop-up upgrade
- **Project Payments** - Vista demo + pop-up upgrade
- **AI Project Manager** - Limitado/demo según plan
- **Owl Funding** - Vista promocional + pop-up

## 🏗️ ARQUITECTURA DEL SISTEMA

### FASE 1: SISTEMA BASE ⚙️

#### Contexto de Permisos
```typescript
// contexts/PermissionContext.tsx
interface PermissionContextValue {
  userPlan: Plan;
  userLimits: UserLimits;
  hasAccess: (feature: string) => boolean;
  canUse: (feature: string, count?: number) => boolean;
  showUpgradeModal: (feature: string) => void;
  getUsageStatus: (feature: string) => UsageStatus;
}
```

#### Hook de Permisos  
```typescript
// hooks/usePermissions.ts
export const usePermissions = () => {
  const context = useContext(PermissionContext);
  
  return {
    hasAccess,
    canUse,
    showUpgradeModal,
    isLimitReached,
    getRemainingUsage
  };
};
```

#### Componentes de Protección
```typescript
// components/PermissionGate.tsx
<PermissionGate feature="invoices" fallback={<UpgradePrompt />}>
  <InvoiceContent />
</PermissionGate>

// components/FeatureButton.tsx  
<FeatureButton 
  feature="aiEstimates"
  disabled={!canUse('aiEstimates')}
  onClick={handleClick}
  upgradeMessage="¡Desbloquea estimados con IA ilimitados!"
>
  Generar Estimado IA
</FeatureButton>
```

### FASE 2: IMPLEMENTACIÓN POR MÓDULOS 📦

#### Módulo 1: Estimados y Contratos
- Contadores de uso mensual
- Marcas de agua condicionales
- Bloqueo suave al exceder límites

#### Módulo 2: Herramientas Premium  
- Property Verifier con límites
- Permit Advisor con límites
- Mervin AI con versiones diferentes

#### Módulo 3: Sistema Financiero
- Invoices con vista demo
- Payment Tracker con funcionalidad limitada
- Pop-ups de upgrade contextuales

### FASE 3: UX DE CONVERSIÓN 🎯

#### Pop-ups Motivacionales
```typescript
const upgradeMessages = {
  invoices: {
    title: "¡Gestiona tus pagos como un profesional!",
    message: "Crea facturas, rastrea pagos y automatiza recordatorios.",
    cta: "Upgrade a Mero Patrón",
    benefits: ["Facturas ilimitadas", "Recordatorios automáticos", "Reportes avanzados"]
  },
  aiEstimates: {
    title: "¡Alcanzaste tu límite de estimados IA!",  
    message: "Genera estimados ilimitados con IA avanzada.",
    cta: "Upgrade ahora",
    benefits: ["Estimados IA ilimitados", "Sin marcas de agua", "Precisión premium"]
  }
};
```

#### Elementos Visuales de Estado
- 🟢 **Disponible** - Funcionalidad completa
- 🟡 **Limitado** - Contador de uso visible  
- 🔴 **Agotado** - Elemento deshabilitado + badge "Upgrade"
- 💎 **Premium** - Badge "Pro" en funcionalidades avanzadas

## 📋 PLAN DE IMPLEMENTACIÓN

### Semana 1: Sistema Base
- [x] Documentación del plan
- [ ] Contexto de permisos
- [ ] Hook usePermissions  
- [ ] Componentes base (PermissionGate, FeatureButton)
- [ ] Utilidades de permisos

### Semana 2: Módulo Estimados
- [ ] Límites en estimados básicos
- [ ] Límites en estimados IA
- [ ] Sistema de marcas de agua
- [ ] Pop-ups de upgrade

### Semana 3: Módulo Contratos
- [ ] Límites en contratos
- [ ] Marcas de agua en PDFs
- [ ] Integración con generación de contratos

### Semana 4: Herramientas Premium
- [ ] Property Verifier con límites
- [ ] Permit Advisor con límites  
- [ ] Mervin AI por versiones
- [ ] AI Project Manager con restricciones

### Semana 5: Sistema Financiero
- [ ] Invoices con soft paywall
- [ ] Payment Tracker limitado
- [ ] Integración QuickBooks premium

### Semana 6: Pulimiento UX
- [ ] Pop-ups atractivos
- [ ] Animaciones y transiciones
- [ ] Testing de conversión
- [ ] Optimización mobile

## 🔧 CONFIGURACIÓN TÉCNICA

### Base de Datos
```sql
-- Tabla de uso mensual
CREATE TABLE user_monthly_usage (
  user_id VARCHAR PRIMARY KEY,
  month DATE,
  basic_estimates INT DEFAULT 0,
  ai_estimates INT DEFAULT 0,
  contracts INT DEFAULT 0,
  property_verifications INT DEFAULT 0,
  permit_advisor_uses INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX idx_user_month ON user_monthly_usage(user_id, month);
```

### Variables de Entorno
```env
# Configuración de planes
VITE_ENABLE_TRIAL_PLAN=true
VITE_TRIAL_DURATION_DAYS=21

# Límites por defecto
VITE_FREE_BASIC_ESTIMATES=10
VITE_FREE_AI_ESTIMATES=3  
VITE_FREE_CONTRACTS=3
VITE_FREE_PROPERTY_VERIFICATIONS=5
```

## 🎯 MÉTRICAS DE ÉXITO

### KPIs de Conversión
- **Tasa de upgrade** desde plan gratuito
- **Tiempo promedio** hasta primera conversión
- **Features más solicitadas** en pop-ups
- **Abandono** por soft paywall vs páginas bloqueadas

### Métricas de UX  
- **Satisfacción** con vista demo vs bloqueo total
- **Engagement** con funcionalidades limitadas
- **Clicks en botones** de upgrade por feature

---

## 📝 NOTAS DE IMPLEMENTACIÓN

- **Prioridad alta**: Sistema base de permisos
- **Enfoque**: UX suave que motive conversión sin frustrar  
- **Testing**: A/B testing entre soft paywall vs bloqueo total
- **Mobile**: Diseño responsive en todos los pop-ups
- **Performance**: Caché de permisos para velocidad óptima

---

*Actualizado: 2025-08-07*
*Estado: En desarrollo - Fase 1*