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
 * Última sincronización: 2026-01-07
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
 * Datos sincronizados desde PostgreSQL el 2026-01-07
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 4,
    name: "Free Trial",
    code: "FREE_TRIAL",
    description: "14 días gratis - acceso completo",
    motto: "Prueba antes de comprar",
    price: 0,
    yearlyPrice: 0,
    features: [
      "Acceso completo por 14 días",
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
    description: "Ningún trabajo es pequeño cuando tu espíritu es grande",
    motto: "Perfect for getting started",
    price: 0,
    yearlyPrice: 0,
    features: [
      "Unlimited basic estimates (With watermark)",
      "5 AI estimates per month (With watermark)",
      "5 property verifications per month",
      "5 permit advisor queries per month",
      "Legal contracts: Demo mode (14-day trial available)",
      "Community support"
    ],
    isActive: true,
    interval: 'monthly',
  },
  {
    id: 9,
    name: "Mero Patrón",
    code: "mero_patron",
    description: "Para contratistas profesionales",
    motto: "Most popular for growing contractors",
    price: 4999,        // $49.99/mes
    yearlyPrice: 49990, // $499.90/año (2 meses gratis)
    features: [
      "50 basic estimates per month (No watermark)",
      "50 AI estimates per month (No watermark)",
      "50 legal contracts per month",
      "50 property verifications per month",
      "50 permit advisor queries per month",
      "50 invoices per month",
      "Unlimited projects",
      "Basic payment tracking",
      "Access to networking/training events",
      "30% discount on LeadPrime CRM",
      "Priority support"
    ],
    isActive: true,
    interval: 'monthly',
  },
  {
    id: 6,
    name: "Master Contractor",
    code: "MASTER_CONTRACTOR",
    description: "Sin límites para profesionales",
    motto: "Unlimited everything for professionals",
    price: 9999,         // $99.99/mes
    yearlyPrice: 99990,  // $999.90/año (2 meses gratis)
    features: [
      "Unlimited basic estimates (No watermark)",
      "Unlimited AI estimates (No watermark)",
      "Unlimited legal contracts",
      "Unlimited property verifications",
      "Unlimited permit advisor",
      "Unlimited invoices",
      "Unlimited projects",
      "Pro payment tracking",
      "Access to networking/training events",
      "30% discount on LeadPrime CRM",
      "VIP support 24/7"
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
  lastSync: '2026-01-07T00:00:00Z',
  source: 'PostgreSQL',
  totalPlans: SUBSCRIPTION_PLANS.length,
  activePlans: getActivePlans().length,
};
