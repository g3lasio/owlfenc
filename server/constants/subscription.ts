/**
 * SUBSCRIPTION CONSTANTS
 * Centralized constants for subscription plans
 * 🛡️ IMPORTANTE: TRIAL_PLAN_ID debe coincidir con el ID real en la tabla subscription_plans
 */

export const SUBSCRIPTION_PLAN_IDS = {
  PRIMO_CHAMBEADOR: 1,
  MERO_PATRON: 2,
  MASTER_CONTRACTOR: 3,
  TRIAL_MASTER: 4,
} as const;

export const TRIAL_PLAN_ID = SUBSCRIPTION_PLAN_IDS.TRIAL_MASTER;

export const PLAN_NAMES = {
  [SUBSCRIPTION_PLAN_IDS.PRIMO_CHAMBEADOR]: 'Primo Chambeador',
  [SUBSCRIPTION_PLAN_IDS.MERO_PATRON]: 'Mero Patrón',
  [SUBSCRIPTION_PLAN_IDS.MASTER_CONTRACTOR]: 'Master Contractor',
  [SUBSCRIPTION_PLAN_IDS.TRIAL_MASTER]: 'Trial Master',
} as const;

// 💰 PLAN PRICING (in cents for Stripe compatibility)
export const PLAN_PRICES = {
  [SUBSCRIPTION_PLAN_IDS.PRIMO_CHAMBEADOR]: 0,      // Free
  [SUBSCRIPTION_PLAN_IDS.MERO_PATRON]: 10000,        // $100.00 USD/month
  [SUBSCRIPTION_PLAN_IDS.MASTER_CONTRACTOR]: 10000,  // $100.00 USD/month
  [SUBSCRIPTION_PLAN_IDS.TRIAL_MASTER]: 0,           // Free trial
} as const;

// Plan features and limits
export const PLAN_FEATURES = {
  [SUBSCRIPTION_PLAN_IDS.PRIMO_CHAMBEADOR]: {
    basicEstimates: 10,
    aiEstimates: 3,
    contracts: 3,
    hasWatermark: true,
    hasInvoices: false,
    hasPaymentTracker: false,
  },
  [SUBSCRIPTION_PLAN_IDS.MERO_PATRON]: {
    basicEstimates: -1, // Unlimited
    aiEstimates: 50,
    contracts: -1,      // Unlimited
    hasWatermark: false,
    hasInvoices: true,
    hasPaymentTracker: true,
  },
  [SUBSCRIPTION_PLAN_IDS.MASTER_CONTRACTOR]: {
    basicEstimates: -1, // Unlimited
    aiEstimates: -1,    // Unlimited
    contracts: -1,      // Unlimited
    hasWatermark: false,
    hasInvoices: true,
    hasPaymentTracker: true,
    hasVIPSupport: true,
  },
  [SUBSCRIPTION_PLAN_IDS.TRIAL_MASTER]: {
    basicEstimates: -1, // Unlimited during trial
    aiEstimates: -1,
    contracts: -1,
    hasWatermark: false,
    hasInvoices: true,
    hasPaymentTracker: true,
  },
} as const;
