/**
 * 🔐 CONFIGURACIÓN CENTRALIZADA DE PERMISOS - OWL FENCE
 * 
 * ⚠️ IMPORTANTE: Este es el ÚNICO archivo que debe modificarse para cambiar permisos
 * 
 * FUENTE DE VERDAD: PostgreSQL database (tabla subscription_plans)
 * Los IDs aquí DEBEN coincidir exactamente con los IDs en PostgreSQL
 * 
 * SINCRONIZACIÓN:
 * - PostgreSQL: Fuente de verdad permanente
 * - Este archivo: Configuración de lógica de negocio
 * - Frontend/Backend: Ambos usan este archivo
 * 
 * Fecha última actualización: 2025-10-26
 */

// ============================================================================
// PLAN IDS - SINCRONIZADOS CON POSTGRESQL
// ============================================================================

/**
 * IDs de planes - DEBEN coincidir con tabla subscription_plans en PostgreSQL
 * 
 * VERIFICAR EN DATABASE:
 * SELECT id, name, code FROM subscription_plans WHERE is_active = true;
 */
export const PLAN_IDS = {
  /** Plan gratuito permanente */
  PRIMO_CHAMBEADOR: 5,
  
  /** Plan pagado básico $49.99/mes */
  MERO_PATRON: 9,
  
  /** Plan premium $99/mes */
  MASTER_CONTRACTOR: 6,
  
  /** Trial gratuito 14 días */
  FREE_TRIAL: 4,
} as const;

/**
 * Alias para compatibilidad con código existente
 */
export const SUBSCRIPTION_PLAN_IDS = PLAN_IDS;
export const TRIAL_PLAN_ID = PLAN_IDS.FREE_TRIAL;

// ============================================================================
// NOMBRES DE PLANES
// ============================================================================

export const PLAN_NAMES = {
  [PLAN_IDS.PRIMO_CHAMBEADOR]: 'Primo Chambeador',
  [PLAN_IDS.MERO_PATRON]: 'Mero Patrón',
  [PLAN_IDS.MASTER_CONTRACTOR]: 'Master Contractor',
  [PLAN_IDS.FREE_TRIAL]: 'Free Trial',
} as const;

export const PLAN_CODES = {
  [PLAN_IDS.PRIMO_CHAMBEADOR]: 'PRIMO_CHAMBEADOR',
  [PLAN_IDS.MERO_PATRON]: 'mero_patron',
  [PLAN_IDS.MASTER_CONTRACTOR]: 'MASTER_CONTRACTOR',
  [PLAN_IDS.FREE_TRIAL]: 'FREE_TRIAL',
} as const;

export const PLAN_MOTTOS = {
  [PLAN_IDS.PRIMO_CHAMBEADOR]: 'Ningún trabajo es pequeño cuando tu espíritu es grande',
  [PLAN_IDS.MERO_PATRON]: 'Para contratistas profesionales',
  [PLAN_IDS.MASTER_CONTRACTOR]: 'Sin límites para profesionales',
  [PLAN_IDS.FREE_TRIAL]: 'Prueba antes de comprar',
} as const;

// ============================================================================
// PRECIOS (en centavos para compatibilidad con Stripe)
// ============================================================================

export const PLAN_PRICES = {
  [PLAN_IDS.PRIMO_CHAMBEADOR]: 0,        // Gratis
  [PLAN_IDS.MERO_PATRON]: 4999,          // $49.99 USD/mes
  [PLAN_IDS.MASTER_CONTRACTOR]: 9900,    // $99.00 USD/mes
  [PLAN_IDS.FREE_TRIAL]: 0,              // Gratis (14 días)
} as const;

export const PLAN_YEARLY_PRICES = {
  [PLAN_IDS.PRIMO_CHAMBEADOR]: 0,        // Gratis
  [PLAN_IDS.MERO_PATRON]: 49990,         // $499.90 USD/año (10 meses)
  [PLAN_IDS.MASTER_CONTRACTOR]: 99000,   // $990.00 USD/año (10 meses)
  [PLAN_IDS.FREE_TRIAL]: 0,              // Gratis
} as const;

// ============================================================================
// LÍMITES DE FUNCIONALIDADES POR PLAN
// ============================================================================

/**
 * Feature: Nombre de la funcionalidad
 * Limit: Número de usos permitidos por mes
 *   -1 = Ilimitado
 *    0 = Sin acceso / Bloqueado
 *   >0 = Cantidad específica permitida
 */
export const PLAN_LIMITS = {
  // =========================================
  // PRIMO CHAMBEADOR (FREE) - Plan ID: 5
  // =========================================
  [PLAN_IDS.PRIMO_CHAMBEADOR]: {
    // Estimados (conteo mensual)
    estimatesBasic: 5,           // 5 estimados básicos/mes con marca de agua
    estimatesAI: 1,              // 1 estimado con IA/mes con marca de agua
    basicEstimates: 5,           // Alias para compatibilidad frontend
    aiEstimates: 1,              // Alias para compatibilidad frontend
    
    // Contratos - BLOQUEADO
    contracts: 0,                // ❌ NO acceso a Legal Defense
    
    // Herramientas de verificación
    propertyVerifications: 0,    // ❌ Bloqueado
    propertyVerification: 0,     // Alias para compatibilidad
    permitAdvisor: 0,            // ❌ Bloqueado
    
    // Gestión de proyectos
    projects: 5,                 // 5 proyectos básicos
    
    // Funciones financieras
    invoices: 0,                 // ❌ Sin acceso
    paymentTracking: 0,          // ❌ Sin acceso (0=disabled, 1=basic, 2=pro)
    
    // Investigación avanzada - LÍMITE BAJO PARA PRIMO
    deepsearch: 3,               // ✅ 3 búsquedas DeepSearch/mes (puede agregar materiales manualmente ilimitado)
    
    // ===== FEATURE FLAGS BOOLEANAS =====
    hasWatermark: true,          // ✅ SIEMPRE marca de agua
    hasLegalDefense: false,      // ❌ NO acceso a Legal Defense
    hasInvoices: false,          // ❌ NO acceso a facturación
    hasPaymentTracker: false,    // ❌ NO acceso a tracking de pagos
    hasOwlFunding: false,        // ❌ NO acceso a financiamiento
    hasOwlAcademy: false,        // ❌ NO acceso a academia
    hasAIProjectManager: false,  // ❌ NO acceso a gestión AI de proyectos
    hasQuickBooksIntegration: false, // ❌ NO integración QuickBooks
    
    // Configuración
    supportLevel: 'community',   // Soporte comunitario
  },

  // =========================================
  // MERO PATRÓN (BASIC) - Plan ID: 9
  // =========================================
  [PLAN_IDS.MERO_PATRON]: {
    // Estimados (conteo mensual)
    estimatesBasic: 50,          // 50 estimados básicos/mes sin marca de agua
    estimatesAI: 20,             // 20 estimados con IA/mes sin marca de agua
    basicEstimates: 50,          // Alias para compatibilidad frontend
    aiEstimates: 20,             // Alias para compatibilidad frontend
    
    // Contratos
    contracts: 50,               // ✅ 50 contratos/mes
    
    // Herramientas de verificación
    propertyVerifications: 15,   // 15 verificaciones/mes
    propertyVerification: 15,    // Alias para compatibilidad
    permitAdvisor: 10,           // 10 consultas/mes
    
    // Gestión de proyectos
    projects: 30,                // 30 proyectos AI/mes
    
    // Funciones financieras
    invoices: -1,                // ✅ Ilimitado
    paymentTracking: 1,          // ✅ Básico
    
    // Investigación avanzada
    deepsearch: 50,              // 50 búsquedas/mes
    
    // ===== FEATURE FLAGS BOOLEANAS =====
    hasWatermark: false,         // ✅ SIN marca de agua
    hasLegalDefense: true,       // ✅ Acceso a Legal Defense
    hasInvoices: true,           // ✅ Acceso a facturación
    hasPaymentTracker: true,     // ✅ Acceso a tracking de pagos
    hasOwlFunding: true,         // ✅ Acceso a financiamiento
    hasOwlAcademy: true,         // ✅ Acceso a academia
    hasAIProjectManager: true,   // ✅ Acceso a gestión AI de proyectos
    hasQuickBooksIntegration: false, // ❌ NO integración QuickBooks (solo Premium)
    
    // Configuración
    supportLevel: 'priority',    // Soporte prioritario
  },

  // =========================================
  // MASTER CONTRACTOR (PREMIUM) - Plan ID: 6
  // =========================================
  [PLAN_IDS.MASTER_CONTRACTOR]: {
    // Estimados (conteo mensual)
    estimatesBasic: -1,          // ✅ ILIMITADO
    estimatesAI: -1,             // ✅ ILIMITADO
    basicEstimates: -1,          // Alias para compatibilidad frontend
    aiEstimates: -1,             // Alias para compatibilidad frontend
    
    // Contratos
    contracts: -1,               // ✅ ILIMITADO
    
    // Herramientas de verificación
    propertyVerifications: -1,   // ✅ ILIMITADO
    propertyVerification: -1,    // Alias para compatibilidad
    permitAdvisor: -1,           // ✅ ILIMITADO
    
    // Gestión de proyectos
    projects: -1,                // ✅ ILIMITADO
    
    // Funciones financieras
    invoices: -1,                // ✅ ILIMITADO
    paymentTracking: 2,          // ✅ PRO (integración QuickBooks)
    
    // Investigación avanzada
    deepsearch: -1,              // ✅ ILIMITADO
    
    // ===== FEATURE FLAGS BOOLEANAS =====
    hasWatermark: false,         // ✅ SIN marca de agua
    hasLegalDefense: true,       // ✅ Acceso a Legal Defense
    hasInvoices: true,           // ✅ Acceso a facturación
    hasPaymentTracker: true,     // ✅ Acceso a tracking de pagos
    hasOwlFunding: true,         // ✅ Acceso a financiamiento
    hasOwlAcademy: true,         // ✅ Acceso a academia
    hasAIProjectManager: true,   // ✅ Acceso a gestión AI de proyectos
    hasQuickBooksIntegration: true, // ✅ Integración QuickBooks
    
    // Configuración
    supportLevel: 'vip',         // Soporte VIP 24/7
  },

  // =========================================
  // FREE TRIAL - Plan ID: 4
  // =========================================
  [PLAN_IDS.FREE_TRIAL]: {
    // Durante trial: TODO ILIMITADO por 14 días
    estimatesBasic: -1,          // ✅ ILIMITADO durante trial (14 días)
    estimatesAI: -1,             // ✅ ILIMITADO durante trial
    basicEstimates: -1,          // Alias para compatibilidad frontend
    aiEstimates: -1,             // Alias para compatibilidad frontend
    contracts: -1,               // ✅ ILIMITADO durante trial
    propertyVerifications: -1,   // ✅ ILIMITADO durante trial
    propertyVerification: -1,    // Alias para compatibilidad
    permitAdvisor: -1,           // ✅ ILIMITADO durante trial
    projects: -1,                // ✅ ILIMITADO durante trial
    invoices: -1,                // ✅ ILIMITADO durante trial
    paymentTracking: 2,          // ✅ PRO durante trial
    deepsearch: -1,              // ✅ ILIMITADO durante trial (14 días gratis)
    
    // ===== FEATURE FLAGS BOOLEANAS =====
    hasWatermark: false,         // ✅ SIN marca de agua durante trial
    hasLegalDefense: true,       // ✅ Acceso durante trial
    hasInvoices: true,           // ✅ Acceso durante trial
    hasPaymentTracker: true,     // ✅ Acceso durante trial
    hasOwlFunding: true,         // ✅ Acceso durante trial
    hasOwlAcademy: true,         // ✅ Acceso durante trial
    hasAIProjectManager: true,   // ✅ Acceso durante trial
    hasQuickBooksIntegration: true, // ✅ Acceso durante trial
    
    // Configuración
    supportLevel: 'premium',     // Soporte premium durante trial
    trialDurationDays: 14,       // 14 días de trial gratis
  },
} as const;

// ============================================================================
// FEATURES DESCRIPTIVAS (para UI)
// ============================================================================

export const PLAN_FEATURES = {
  [PLAN_IDS.PRIMO_CHAMBEADOR]: [
    "5 estimados básicos/mes (con marca de agua)",
    "1 estimado con IA/mes (con marca de agua)",
    "0 contratos (Demo Mode - upgrade para generar)",
    "0 Property Verification (upgrade requerido)",
    "5 proyectos/mes"
  ],
  
  [PLAN_IDS.MERO_PATRON]: [
    "50 estimados básicos/mes (sin marca de agua)",
    "20 estimados con IA/mes (sin marca de agua)",
    "50 contratos/mes (sin marca de agua)",
    "15 Property Verification/mes",
    "10 Permit Advisor/mes",
    "30 proyectos AI/mes",
    "Sistema de facturación completo"
  ],
  
  [PLAN_IDS.MASTER_CONTRACTOR]: [
    "TODO ILIMITADO",
    "Sin marcas de agua",
    "Integración QuickBooks",
    "Soporte VIP 24/7",
    "Análisis predictivo avanzado"
  ],
  
  [PLAN_IDS.FREE_TRIAL]: [
    "14 días gratis - TODO ILIMITADO",
    "DeepSearch ilimitado durante trial",
    "Estimados ilimitados sin marca de agua",
    "Contratos ilimitados sin marca de agua",
    "Acceso completo a todas las funciones premium"
  ],
} as const;

// ============================================================================
// NIVELES DE PERMISOS (para middleware)
// ============================================================================

export enum PermissionLevel {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  TRIAL = 'trial'
}

/**
 * Mapeo de planes a niveles de permisos
 * Cada plan "hereda" los permisos de niveles inferiores
 */
export const PLAN_PERMISSION_LEVELS: Record<number, PermissionLevel[]> = {
  [PLAN_IDS.PRIMO_CHAMBEADOR]: [PermissionLevel.FREE],
  [PLAN_IDS.MERO_PATRON]: [PermissionLevel.FREE, PermissionLevel.BASIC],
  [PLAN_IDS.MASTER_CONTRACTOR]: [PermissionLevel.FREE, PermissionLevel.BASIC, PermissionLevel.PREMIUM],
  [PLAN_IDS.FREE_TRIAL]: [PermissionLevel.FREE, PermissionLevel.BASIC, PermissionLevel.PREMIUM, PermissionLevel.TRIAL],
};

// ============================================================================
// FUNCIONES PREMIUM - CONSOLIDADO EN PLAN_LIMITS
// ============================================================================

/**
 * ⚠️ DEPRECATED: Usar PLAN_LIMITS en su lugar
 * Todas las feature flags están ahora consolidadas en PLAN_LIMITS
 * Esta constante se mantiene solo para compatibilidad temporal
 */
export const PREMIUM_FEATURES = PLAN_LIMITS;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Obtener nombre del plan por ID
 */
export function getPlanName(planId: number): string {
  return PLAN_NAMES[planId as keyof typeof PLAN_NAMES] || 'Unknown Plan';
}

/**
 * Obtener límites del plan
 */
export function getPlanLimits(planId: number) {
  return PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS] || PLAN_LIMITS[PLAN_IDS.PRIMO_CHAMBEADOR];
}

/**
 * Obtener features premium del plan
 * NOTA: Ahora retorna los mismos límites de PLAN_LIMITS ya que están consolidados
 */
export function getPlanPremiumFeatures(planId: number) {
  return getPlanLimits(planId);
}

/**
 * Verificar si un plan tiene acceso a un nivel específico
 */
export function planHasPermissionLevel(planId: number, level: PermissionLevel): boolean {
  const permissions = PLAN_PERMISSION_LEVELS[planId] || [];
  return permissions.includes(level);
}

/**
 * Verificar si un límite es ilimitado
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Verificar si un feature está bloqueado
 */
export function isBlocked(limit: number): boolean {
  return limit === 0;
}

/**
 * Obtener mensaje de upgrade personalizado por feature
 */
export function getUpgradeMessage(feature: string, currentPlanId: number): string {
  const messages: Record<string, string> = {
    'basicEstimates': 'Crea estimados básicos ilimitados sin marca de agua',
    'aiEstimates': 'Genera estimados con IA avanzada sin límites',
    'contracts': 'Crea contratos profesionales ilimitados con Legal Defense',
    'propertyVerifications': 'Verifica propiedades sin restricciones',
    'permitAdvisor': 'Consulta permisos sin límites mensuales',
    'projects': 'Gestiona proyectos con IA avanzada',
    'invoices': 'Sistema completo de facturación profesional',
    'paymentTracking': 'Seguimiento avanzado de pagos e integración QuickBooks',
    'deepsearch': '¡Búsquedas súper potentes para estimados perfectos!',
  };
  
  return messages[feature] || `Accede a ${feature} sin restricciones`;
}

/**
 * Convertir nombre de plan a ID
 * Útil para mapeo desde APIs externas
 */
export function planNameToId(planName: string): number {
  const normalizedName = planName.toLowerCase().trim();
  
  if (normalizedName.includes('primo') || normalizedName.includes('chambeador') || normalizedName === 'free') {
    return PLAN_IDS.PRIMO_CHAMBEADOR;
  }
  if (normalizedName.includes('mero') || normalizedName.includes('patron')) {
    return PLAN_IDS.MERO_PATRON;
  }
  if (normalizedName.includes('master') || normalizedName.includes('contractor')) {
    return PLAN_IDS.MASTER_CONTRACTOR;
  }
  if (normalizedName.includes('trial')) {
    return PLAN_IDS.FREE_TRIAL;
  }
  
  // Default: plan gratuito
  return PLAN_IDS.PRIMO_CHAMBEADOR;
}

/**
 * Obtener todos los IDs de planes válidos
 */
export function getAllPlanIds(): number[] {
  return [
    PLAN_IDS.PRIMO_CHAMBEADOR,
    PLAN_IDS.MERO_PATRON,
    PLAN_IDS.MASTER_CONTRACTOR,
    PLAN_IDS.FREE_TRIAL,
  ];
}

/**
 * Verificar si un plan ID es válido
 */
export function isValidPlanId(planId: number): boolean {
  return getAllPlanIds().includes(planId);
}

// ============================================================================
// TIPOS TYPESCRIPT
// ============================================================================

export type PlanId = typeof PLAN_IDS[keyof typeof PLAN_IDS];
export type PlanLimits = typeof PLAN_LIMITS[PlanId];
export type PremiumFeatures = PlanLimits; // Ahora es alias de PlanLimits

// ============================================================================
// EXPORT DEFAULT (para importación simplificada)
// ============================================================================

export default {
  PLAN_IDS,
  PLAN_NAMES,
  PLAN_CODES,
  PLAN_MOTTOS,
  PLAN_PRICES,
  PLAN_YEARLY_PRICES,
  PLAN_LIMITS,
  PLAN_FEATURES,
  PREMIUM_FEATURES,
  PLAN_PERMISSION_LEVELS,
  PermissionLevel,
  
  // Helper functions
  getPlanName,
  getPlanLimits,
  getPlanPremiumFeatures,
  planHasPermissionLevel,
  isUnlimited,
  isBlocked,
  getUpgradeMessage,
  planNameToId,
  getAllPlanIds,
  isValidPlanId,
};
