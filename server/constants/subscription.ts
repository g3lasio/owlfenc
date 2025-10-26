/**
 * SUBSCRIPTION CONSTANTS
 * 
 * ⚠️ MIGRADO A ARCHIVO CENTRALIZADO
 * Este archivo ahora re-exporta desde shared/permissions-config.ts
 * 
 * ANTES: Definía IDs incorrectos [1,2,3,4]
 * AHORA: Usa IDs correctos [5,9,6,4] desde archivo centralizado
 * 
 * Fecha migración: 2025-10-26
 */

// Re-export todo desde el archivo centralizado
export {
  PLAN_IDS as SUBSCRIPTION_PLAN_IDS,
  TRIAL_PLAN_ID,
  PLAN_NAMES,
  PLAN_PRICES,
  PLAN_FEATURES,
  PLAN_LIMITS,
  getPlanName,
  getPlanLimits,
  isValidPlanId,
  getAllPlanIds,
} from '@shared/permissions-config';

// Alias para compatibilidad con código existente que usa estos nombres
import { PLAN_IDS } from '@shared/permissions-config';

export const SUBSCRIPTION_PLANS = {
  PRIMO_CHAMBEADOR: PLAN_IDS.PRIMO_CHAMBEADOR,      // 5
  MERO_PATRON: PLAN_IDS.MERO_PATRON,                // 9
  MASTER_CONTRACTOR: PLAN_IDS.MASTER_CONTRACTOR,    // 6
  TRIAL_MASTER: PLAN_IDS.FREE_TRIAL,                // 4
};
