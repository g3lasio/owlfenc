/**
 * Middleware de autorización basado en suscripciones
 * Valida que el usuario tenga una suscripción activa y permisos para acceder a funciones específicas
 * 
 * ✅ MIGRADO: Ahora usa configuración centralizada desde shared/permissions-config.ts
 * Fecha migración: 2025-10-26
 */

import { Request, Response, NextFunction } from 'express';
import { firebaseSubscriptionService } from '../services/firebaseSubscriptionService';
import { 
  PermissionLevel,
  PLAN_PERMISSION_LEVELS,
  getPlanLimits,
  PLAN_IDS,
} from '@shared/permissions-config';

// Re-export para compatibilidad con código existente
export { PermissionLevel };

/**
 * Obtiene la suscripción actual del usuario y valida que esté activa
 */
async function getUserActiveSubscription(userId: string) {
  try {
    const subscription = await firebaseSubscriptionService.getUserSubscription(userId);
    
    if (!subscription) {
      return null;
    }

    // Verificar que la suscripción esté activa
    const isActive = await firebaseSubscriptionService.isSubscriptionActive(userId);
    
    if (!isActive) {
      // Si la suscripción expiró, degradar a plan gratuito
      console.log(`⚠️ [AUTH] Suscripción expirada para usuario ${userId}, degradando a plan gratuito`);
      await firebaseSubscriptionService.degradeToFreePlan(userId);
      return { planId: PLAN_IDS.PRIMO_CHAMBEADOR, status: 'expired' }; // Plan gratuito ID: 5
    }

    return subscription;
  } catch (error) {
    console.error('❌ [AUTH] Error obteniendo suscripción:', error);
    return null;
  }
}

/**
 * Middleware que requiere un nivel específico de suscripción
 */
export const requireSubscriptionLevel = (requiredLevel: PermissionLevel) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verificar que el usuario esté autenticado
      if (!req.firebaseUser?.uid) {
        return res.status(401).json({
          error: 'Autenticación requerida',
          code: 'AUTH_REQUIRED'
        });
      }

      const userId = req.firebaseUser.uid; // USAR Firebase UID directamente
      const subscription = await getUserActiveSubscription(userId);

      let userSubscription = subscription;
      if (!userSubscription) {
        // Sin suscripción = plan gratuito por defecto (PRIMO_CHAMBEADOR = 5)
        userSubscription = { planId: PLAN_IDS.PRIMO_CHAMBEADOR, status: 'free' };
      }

      const userPermissions = PLAN_PERMISSION_LEVELS[userSubscription.planId as keyof typeof PLAN_PERMISSION_LEVELS] || [PermissionLevel.FREE];
      
      // Verificar si el usuario tiene el nivel requerido
      if (!userPermissions.includes(requiredLevel)) {
        return res.status(403).json({
          error: 'Suscripción insuficiente para acceder a esta función',
          code: 'SUBSCRIPTION_REQUIRED',
          required: requiredLevel,
          current: userPermissions,
          upgradeUrl: '/subscription'
        });
      }

      // Añadir información de la suscripción al request para uso posterior
      req.userSubscription = {
        planId: userSubscription.planId,
        level: userPermissions,
        limits: getPlanLimits(userSubscription.planId)
      };

      next();
    } catch (error) {
      console.error('❌ [AUTH] Error en validación de suscripción:', error);
      return res.status(500).json({
        error: 'Error interno de autorización',
        code: 'AUTH_INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Middleware que valida límites de uso para funciones específicas
 */
export const validateUsageLimit = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userSubscription) {
        return res.status(403).json({
          error: 'Información de suscripción no disponible',
          code: 'SUBSCRIPTION_INFO_MISSING'
        });
      }

      const limits = req.userSubscription.limits;
      const featureLimit = limits[feature as keyof typeof limits];

      // Si es -1, significa ilimitado
      if (featureLimit === -1) {
        next();
        return;
      }

      // 🔐 SECURITY FIX: Implementar contador de uso REAL
      const firebaseUid = req.firebaseUser.uid;
      
      try {
        // Importar robustSubscriptionService dinámicamente
        const { robustSubscriptionService } = await import('../services/robustSubscriptionService');
        
        // Verificar uso real desde la base de datos
        const usageCheck = await robustSubscriptionService.canUseFeature(firebaseUid, feature);
        
        if (!usageCheck.canUse) {
          return res.status(403).json({
            error: 'Límite de uso alcanzado para esta función',
            code: 'USAGE_LIMIT_EXCEEDED',
            feature,
            used: usageCheck.used,
            limit: usageCheck.limit,
            upgradeUrl: '/subscription'
          });
        }
        
        console.log(`✅ [USAGE-CHECK] Feature ${feature}: ${usageCheck.used}/${usageCheck.limit}`);
        next();
        return;
        
      } catch (error) {
        console.error(`❌ [USAGE-CHECK] Error checking real usage for ${feature}:`, error);
        // Fallback a verificación básica si falla la verificación real
        if (typeof featureLimit === 'number' && featureLimit > 0) {
          next();
          return;
        }
      }

      return res.status(403).json({
        error: 'Límite de uso alcanzado para esta función',
        code: 'USAGE_LIMIT_EXCEEDED',
        feature,
        limit: featureLimit,
        upgradeUrl: '/subscription'
      });
    } catch (error) {
      console.error('❌ [AUTH] Error validando límite de uso:', error);
      return res.status(500).json({
        error: 'Error interno validando límites',
        code: 'USAGE_VALIDATION_ERROR'
      });
    }
  };
};

/**
 * Middleware que incrementa automáticamente el uso después de una operación exitosa
 * 🔧 FIXED: Wrapper setup moved BEFORE next() to catch synchronous responses
 */
export const incrementUsageOnSuccess = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 🔧 FIX: Interceptar la respuesta ANTES de next() para capturar respuestas síncronas
      const originalSend = res.send;
      res.send = function(data) {
        // Solo incrementar si la respuesta es exitosa (status 200-299)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          (async () => {
            try {
              const firebaseUid = req.firebaseUser?.uid;
              if (firebaseUid) {
                const { robustSubscriptionService } = await import('../services/robustSubscriptionService');
                await robustSubscriptionService.incrementUsage(firebaseUid, feature);
                console.log(`📊 [USAGE-INCREMENT] ${feature} usage incremented for ${firebaseUid}`);
              }
            } catch (error) {
              console.error(`❌ [USAGE-INCREMENT] Error incrementing ${feature}:`, error);
            }
          })();
        }
        
        return originalSend.call(this, data);
      };
      
      // Continuar con la operación normal (ahora con el wrapper ya instalado)
      next();
      
    } catch (error) {
      console.error('❌ [USAGE-INCREMENT] Error setting up usage increment:', error);
      next(error);
    }
  };
};

/**
 * Middleware que valida acceso a funciones premium
 */
export const requirePremiumFeature = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userSubscription) {
        return res.status(403).json({
          error: 'Información de suscripción no disponible',
          code: 'SUBSCRIPTION_INFO_MISSING'
        });
      }

      const limits = req.userSubscription.limits;
      const hasAccess = limits[`has${feature}` as keyof typeof limits];

      if (!hasAccess) {
        return res.status(403).json({
          error: `Acceso a ${feature} requiere suscripción premium`,
          code: 'PREMIUM_FEATURE_REQUIRED',
          feature,
          upgradeUrl: '/subscription'
        });
      }

      next();
    } catch (error) {
      console.error('❌ [AUTH] Error validando función premium:', error);
      return res.status(500).json({
        error: 'Error interno validando función premium',
        code: 'PREMIUM_VALIDATION_ERROR'
      });
    }
  };
};

/**
 * ✅ PAYG MIGRATION: Legal Defense Access Validator
 * Pure Pay-As-You-Go model: ANY authenticated user can access Legal Defense
 * Access is controlled by requireCredits({ featureName: 'contract' }) — not by plan
 * 
 * This middleware now ONLY validates authentication and populates req.userSubscription
 * for downstream middleware (validateUsageLimit, incrementUsageOnSuccess) to use.
 * 
 * Previously blocked Primo Chambeador (plan 5) — REMOVED per PAYG migration decision.
 * Any user with sufficient credits (12 credits = $1.20) can generate a legal contract.
 */
export const requireLegalDefenseAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Verificar autenticación — ONLY gate remaining
    if (!req.firebaseUser?.uid) {
      console.warn('🚨 [LEGAL-DEFENSE-SECURITY] Unauthenticated access attempt blocked');
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida para acceder a Legal Defense',
        code: 'AUTH_REQUIRED',
        message: 'Por favor inicia sesión para continuar'
      });
    }

    const userId = req.firebaseUser.uid;
    const subscription = await getUserActiveSubscription(userId);

    // 2. Determinar plan del usuario (for downstream usage tracking only)
    let userSubscription = subscription;
    if (!userSubscription) {
      userSubscription = { planId: PLAN_IDS.PRIMO_CHAMBEADOR, status: 'free' };
    }

    const planId = userSubscription.planId;
    const limits = getPlanLimits(planId);

    // 3. ✅ PAYG: Plan-based gate REMOVED — all authenticated users can access Legal Defense
    // Credit check is handled by requireCredits({ featureName: 'contract' }) middleware
    // which runs AFTER this middleware in the chain
    console.log(`✅ [LEGAL-DEFENSE-PAYG] User ${userId} (Plan ${planId}) — plan gate bypassed, credit check will follow`);

    // 4. Populate req.userSubscription for downstream middleware
    req.userSubscription = {
      planId: planId,
      level: PLAN_PERMISSION_LEVELS[planId as keyof typeof PLAN_PERMISSION_LEVELS] || [PermissionLevel.FREE],
      limits: limits || {}
    };

    next();

  } catch (error) {
    console.error('❌ [LEGAL-DEFENSE-SECURITY] Validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno validando acceso a Legal Defense',
      code: 'LEGAL_DEFENSE_VALIDATION_ERROR'
    });
  }
};

// Extender el tipo Request para incluir información de suscripción
declare global {
  namespace Express {
    interface Request {
      userSubscription?: {
        planId: number;
        level: PermissionLevel[];
        limits: any;
      };
    }
  }
}