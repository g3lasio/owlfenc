/**
 * SUBSCRIPTION PLANS - EMBEDDED CATALOG
 * 
 * Alternativa 1: Build-time embedded catalog
 * Los planes se definen aquí con los datos exactos de la base de datos.
 * Esto permite carga instantánea en el frontend sin llamadas asíncronas.
 * 
 * IMPORTANTE: Estos datos deben sincronizarse con:
 * 1. Base de datos PostgreSQL (tabla subscription_plans)
 * 2. Productos en Stripe
 * 
 * Última sincronización: 2025-11-08
 */

export interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  description: string;
  motto: string;
  price: number;        // Precio mensual en centavos (ej: 4999 = $49.99)
  yearlyPrice: number;  // Precio anual en centavos (ej: 49999 = $499.99)
  features: string[];
  isActive: boolean;
  interval: 'monthly' | 'yearly';
}

/**
 * CATÁLOGO DE PLANES
 * Datos sincronizados desde PostgreSQL el 2025-11-08
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 4,
    name: "Free Trial",
    code: "FREE_TRIAL",
    description: "7 días gratis - límites básicos",
    motto: "Prueba antes de comprar",
    price: 0,
    yearlyPrice: 0,
    features: [
      "Acceso completo por 7 días",
      "Todas las funciones premium",
      "Sin compromiso de pago",
      "Cancela en cualquier momento"
    ],
    isActive: true,
    interval: 'monthly',
  },
  {
    id: 5,
    name: "Primo Chambeador",
    code: "PRIMO_CHAMBEADOR",
    description: "Plan profesional para contratistas activos",
    motto: "Todo lo que necesitas para crecer",
    price: 0,
    yearlyPrice: 0,
    features: [
      "5 estimados básicos/mes (con marca de agua)",
      "1 estimado con IA/mes (con marca de agua)",
      "5 proyectos/mes",
      "Funcionalidades básicas"
    ],
    isActive: true,
    interval: 'monthly',
  },
  {
    id: 9,
    name: "Mero Patrón",
    code: "mero_patron",
    description: "Plan profesional con límites generosos para contratistas establecidos",
    motto: "Para contratistas profesionales",
    price: 4999,        // $49.99/mes
    yearlyPrice: 50988, // $509.88/año (15% de descuento: $49.99 * 12 * 0.85)
    features: [
      "Estimados ilimitados",
      "50 contratos/mes",
      "Verificación de propiedades",
      "Mervin AI 7.0 incluido",
      "Sin marcas de agua",
      "Soporte prioritario"
    ],
    isActive: true,
    interval: 'monthly',
  },
  {
    id: 6,
    name: "Master Contractor",
    code: "MASTER_CONTRACTOR",
    description: "Plan premium con acceso ilimitado",
    motto: "Sin límites para profesionales",
    price: 9999,         // $99.99/mes
    yearlyPrice: 101989, // $1,019.89/año (15% de descuento: $99.99 * 12 * 0.85)
    features: [
      "Todo ilimitado",
      "Soporte prioritario 24/7",
      "Sin marcas de agua",
      "Integración QuickBooks",
      "Análisis predictivo",
      "Gestión completa de proyectos",
      "Recordatorios automatizados"
    ],
    isActive: true,
    interval: 'monthly',
  }
];

/**
 * HELPERS - Funciones de utilidad para trabajar con planes
 */

/**
 * Obtener todos los planes activos
 */
export function getActivePlans(): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter(plan => plan.isActive);
}

/**
 * Obtener un plan por ID
 */
export function getPlanById(id: number): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === id);
}

/**
 * Obtener un plan por código
 */
export function getPlanByCode(code: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(plan => plan.code === code);
}

/**
 * Verificar si un plan es gratuito
 */
export function isFreePlan(planId: number): boolean {
  const plan = getPlanById(planId);
  return plan ? plan.price === 0 : false;
}

/**
 * Verificar si un plan es de pago
 */
export function isPaidPlan(planId: number): boolean {
  return !isFreePlan(planId);
}

/**
 * Obtener planes de pago únicamente
 */
export function getPaidPlans(): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter(plan => plan.isActive && plan.price > 0);
}

/**
 * Obtener planes gratuitos únicamente
 */
export function getFreePlans(): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter(plan => plan.isActive && plan.price === 0);
}

/**
 * Formatear precio para display (centavos a dólares)
 */
export function formatPrice(priceInCents: number): string {
  return `$${(priceInCents / 100).toFixed(2)}`;
}

/**
 * Calcular ahorro anual
 */
export function calculateYearlySavings(planId: number): { amount: number; percentage: number } {
  const plan = getPlanById(planId);
  if (!plan || plan.price === 0) {
    return { amount: 0, percentage: 0 };
  }
  
  const monthlyTotal = plan.price * 12;
  const yearlyPrice = plan.yearlyPrice;
  const savings = monthlyTotal - yearlyPrice;
  const percentage = (savings / monthlyTotal) * 100;
  
  return {
    amount: savings,
    percentage: Math.round(percentage)
  };
}

/**
 * VERSION INFO - Para tracking de sincronización
 */
export const PLANS_VERSION = {
  lastSync: '2025-11-08T04:00:00Z',
  source: 'PostgreSQL',
  totalPlans: SUBSCRIPTION_PLANS.length,
  activePlans: getActivePlans().length,
};
