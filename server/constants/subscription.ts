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
