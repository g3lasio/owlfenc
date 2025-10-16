/**
 * Middleware de autorización basado en suscripciones
 * Valida que el usuario tenga una suscripción activa y permisos para acceder a funciones específicas
 */

import { Request, Response, NextFunction } from 'express';
import { firebaseSubscriptionService } from '../services/firebaseSubscriptionService';

// Tipos de funciones que requieren diferentes niveles de suscripción
export enum PermissionLevel {
  FREE = 'free',              // primo_chambeador - Plan gratuito
  BASIC = 'basic',           // mero_patron - Plan básico pagado
  PREMIUM = 'premium',       // master_contractor - Plan premium
  TRIAL = 'trial'            // Acceso durante trial válido
}

// Mapeo de planes a niveles de permisos
const PLAN_PERMISSIONS: Record<number, PermissionLevel[]> = {
  1: [PermissionLevel.FREE],                                    // primo_chambeador
  2: [PermissionLevel.FREE, PermissionLevel.BASIC],            // mero_patron
  3: [PermissionLevel.FREE, PermissionLevel.BASIC, PermissionLevel.PREMIUM], // master_contractor
  4: [PermissionLevel.FREE, PermissionLevel.BASIC, PermissionLevel.PREMIUM, PermissionLevel.TRIAL] // trial (acceso completo)
};

// 🔐 ENTERPRISE-GRADE PLAN LIMITS
// Updated: 2025-10-14 - Security Hardening for Legal Defense
const PLAN_LIMITS = {
  1: { // primo_chambeador - FREE (NO Legal Defense Access)
    estimatesBasic: 10,
    estimatesAI: 3,
    contracts: 0, // ❌ NO ACCESO a Legal Defense
    propertyVerification: 5,
    permitAdvisor: 5,
    hasWatermark: true,
    hasInvoices: false,
    hasPaymentTracker: false,
    hasOwlFunding: false,
    hasOwlAcademy: false,
    hasAIProjectManager: false,
    hasLegalDefense: false, // ❌ Bloquear completamente Legal Defense
    supportLevel: 'community'
  },
  2: { // mero_patron - BASIC ($49.99/month - 50 contracts)
    estimatesBasic: -1, // ilimitado
    estimatesAI: 50,
    contracts: 50, // ✅ 50 contratos/mes
    propertyVerification: 50,
    permitAdvisor: 50,
    hasWatermark: false,
    hasInvoices: true,
    hasPaymentTracker: true,
    hasOwlFunding: true,
    hasOwlAcademy: true,
    hasAIProjectManager: true,
    hasLegalDefense: true, // ✅ Acceso completo a Legal Defense
    supportLevel: 'priority'
  },
  3: { // master_contractor - PREMIUM ($99/month - unlimited)
    estimatesBasic: -1, // ilimitado
    estimatesAI: -1, // ilimitado
    contracts: -1, // ✅ Contratos ILIMITADOS
    propertyVerification: -1, // ilimitado
    permitAdvisor: -1, // ilimitado
    hasWatermark: false,
    hasInvoices: true,
    hasPaymentTracker: true,
    hasOwlFunding: true,
    hasOwlAcademy: true,
    hasAIProjectManager: true,
    hasLegalDefense: true, // ✅ Acceso completo a Legal Defense
    supportLevel: 'vip'
  },
  4: { // trial - FREE TRIAL (14 días - acceso completo temporal)
    estimatesBasic: -1, // ilimitado durante trial
    estimatesAI: -1, // ilimitado durante trial
    contracts: -1, // ✅ Contratos ILIMITADOS durante trial (14 días)
    propertyVerification: -1, // ilimitado durante trial
    permitAdvisor: -1, // ilimitado durante trial
    hasWatermark: false,
    hasInvoices: true,
    hasPaymentTracker: true,
    hasOwlFunding: true,
    hasOwlAcademy: true,
    hasAIProjectManager: true,
    hasLegalDefense: true, // ✅ Acceso completo a Legal Defense
    supportLevel: 'premium',
    trialDurationDays: 14 // 14 días de trial
  }
};

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
      return { planId: 1, status: 'expired' }; // Plan gratuito
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
        // Sin suscripción = plan gratuito por defecto
        userSubscription = { planId: 1, status: 'free' };
      }

      const userPermissions = PLAN_PERMISSIONS[userSubscription.planId as keyof typeof PLAN_PERMISSIONS] || [PermissionLevel.FREE];
      
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
        limits: PLAN_LIMITS[userSubscription.planId as keyof typeof PLAN_LIMITS]
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
 * 🔐 ENTERPRISE SECURITY: Legal Defense Access Validator
 * Validates that user has explicit access to Legal Defense features
 * Blocks Primo Chambeador (FREE) users completely
 */
export const requireLegalDefenseAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Verificar autenticación
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

    // 2. Determinar plan del usuario
    let userSubscription = subscription;
    if (!userSubscription) {
      userSubscription = { planId: 1, status: 'free' }; // Default: Primo Chambeador
    }

    const planId = userSubscription.planId;
    const limits = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS];

    // 3. Validar acceso a Legal Defense
    if (!limits || !limits.hasLegalDefense) {
      console.warn(`🚨 [LEGAL-DEFENSE-SECURITY] User ${userId} (Plan ${planId}) blocked - NO Legal Defense access`);
      
      return res.status(403).json({
        success: false,
        error: 'Legal Defense requiere suscripción de paga',
        code: 'LEGAL_DEFENSE_PREMIUM_REQUIRED',
        userPlan: planId,
        requiredPlans: [2, 3, 4], // Mero Patrón, Master Contractor, Free Trial
        upgradeUrl: '/subscription',
        message: planId === 1 
          ? 'Usuarios de Primo Chambeador no tienen acceso a Legal Defense. Actualiza a Mero Patrón ($49.99/mes) para desbloquear 50 contratos mensuales.'
          : 'Tu suscripción no incluye acceso a Legal Defense. Por favor actualiza tu plan.'
      });
    }

    // 4. Añadir información al request
    req.userSubscription = {
      planId: planId,
      level: PLAN_PERMISSIONS[planId as keyof typeof PLAN_PERMISSIONS] || [PermissionLevel.FREE],
      limits: limits
    };

    console.log(`✅ [LEGAL-DEFENSE-SECURITY] User ${userId} (Plan ${planId}) authorized for Legal Defense`);
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