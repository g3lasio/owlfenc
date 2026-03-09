/**
 * Unified Subscription Protection Middleware
 * Orchestrates authentication, rate limiting, and usage tracking in a single pipeline
 * 
 * Features:
 * - Redis-backed rate limiting with sliding window
 * - Real-time usage tracking with monthly reset
 * - Subscription-based access control
 * - Graceful fallback when Redis unavailable
 * - Response hooks for usage increment
 * 
 * Usage:
 * ```typescript
 * app.post('/api/contracts', 
 *   subscriptionProtection({
 *     feature: 'contracts',
 *     rateLimit: { windowMs: 3600000, max: 100 },
 *     requirePlan: true
 *   }),
 *   async (req, res) => {
 *     // Your handler
 *     req.trackUsage(); // Call after successful operation
 *   }
 * );
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import { firebaseSubscriptionService } from '../services/firebaseSubscriptionService';
import { redisRateLimiter, RateLimitConfig } from '../services/redisRateLimiter';
import { productionUsageService } from '../services/productionUsageService';
import { isRedisAvailable } from '../lib/redis/client';
import { walletService } from '../services/walletService'; // 💳 PAYG dual-gate bypass
import { FEATURE_CREDIT_COSTS } from '../../shared/wallet-schema'; // 💳 Credit cost constants
import { 
  getPlanLimits,
  PLAN_IDS,
  PermissionLevel,
  PLAN_PERMISSION_LEVELS 
} from '@shared/permissions-config';

interface ProtectionConfig {
  feature: string;                    // Feature name (e.g., 'contracts', 'estimates')
  rateLimit?: RateLimitConfig;        // Rate limit configuration (optional)
  requirePlan?: boolean;               // Require active subscription (default: true)
  minimumLevel?: PermissionLevel;     // Minimum permission level required
  trackUsage?: boolean;                // Auto-track usage (default: true)
}

/**
 * Create unified subscription protection middleware
 */
export function subscriptionProtection(config: ProtectionConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    try {
      // 1. AUTHENTICATION CHECK (Support both firebaseUser and authUser)
      let userId: string | undefined;
      
      // Try firebaseUser first (from firebase-auth middleware)
      if (req.firebaseUser?.uid) {
        userId = req.firebaseUser.uid;
        console.log(`🔐 [PROTECTION] Auth via firebaseUser: ${userId}`);
      }
      // Fallback to authUser (from authMiddleware)
      else if (req.authUser?.uid) {
        userId = req.authUser.uid;
        console.log(`🔐 [PROTECTION] Auth via authUser: ${userId}`);
      }
      
      if (!userId) {
        console.log('❌ [PROTECTION] No authentication found - neither firebaseUser nor authUser');
        console.log('🔍 [PROTECTION-DEBUG] req.firebaseUser:', req.firebaseUser);
        console.log('🔍 [PROTECTION-DEBUG] req.authUser:', req.authUser);
        return res.status(401).json({
          success: false,
          error: 'Autenticación requerida',
          code: 'AUTH_REQUIRED'
        });
      }
      const route = `${req.method}:${req.path}`;

      // 2. RATE LIMITING (if configured)
      if (config.rateLimit) {
        const fingerprint = userId; // Use user ID as fingerprint for authenticated users
        const rateLimitResult = await redisRateLimiter.checkLimit(
          route,
          fingerprint,
          config.rateLimit
        );

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', rateLimitResult.limit);
        res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
        res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString());

        if (!rateLimitResult.allowed) {
          res.setHeader('Retry-After', rateLimitResult.retryAfter || 60);
          
          return res.status(429).json({
            success: false,
            error: config.rateLimit.message || 'Demasiadas solicitudes, inténtalo de nuevo más tarde',
            code: 'RATE_LIMIT_EXCEEDED',
            limit: rateLimitResult.limit,
            current: rateLimitResult.current,
            retryAfter: rateLimitResult.retryAfter,
            resetAt: rateLimitResult.resetAt
          });
        }
      }

      // 3. SUBSCRIPTION VALIDATION
      let subscription = await firebaseSubscriptionService.getUserSubscription(userId);
      let planId: number;
      let isPlatformOwner = false;
      
      // Check if user is Platform Owner (bypass all limits)
      if (subscription?.isPlatformOwner) {
        isPlatformOwner = true;
        planId = PLAN_IDS.MASTER_CONTRACTOR; // Grant Master Contractor access
        console.log(`👑 [PROTECTION] Platform Owner detected: ${userId} - bypassing all limits`);
        
        // Attach subscription info with unlimited access
        req.userSubscription = {
          planId,
          level: PLAN_PERMISSION_LEVELS[PLAN_IDS.MASTER_CONTRACTOR],
          limits: getPlanLimits(PLAN_IDS.MASTER_CONTRACTOR)
        };
        
        // Skip all usage validation for Platform Owner
        req.trackUsage = async () => {
          console.log(`👑 [PROTECTION] Platform Owner - usage not tracked for ${userId}:${config.feature}`);
        };
        
        const duration = Date.now() - startTime;
        console.log(`✅ [PROTECTION] ${route} authorized for Platform Owner ${userId} in ${duration}ms`);
        return next();
      }
      
      // Check if subscription is active
      const isActive = subscription 
        ? await firebaseSubscriptionService.isSubscriptionActive(userId)
        : false;

      if (subscription && !isActive) {
        // Degrade to free plan if expired
        console.log(`⚠️ [PROTECTION] Subscription expired for ${userId}, degrading to free plan`);
        await firebaseSubscriptionService.degradeToFreePlan(userId);
        planId = PLAN_IDS.PRIMO_CHAMBEADOR;
      } else if (subscription) {
        planId = subscription.planId;
      } else {
        // Default to free plan if no subscription
        planId = PLAN_IDS.PRIMO_CHAMBEADOR;
      }
      const planLimits = getPlanLimits(planId);
      const userPermissions = PLAN_PERMISSION_LEVELS[planId as keyof typeof PLAN_PERMISSION_LEVELS] || [PermissionLevel.FREE];

      // Check minimum permission level if required
      if (config.minimumLevel && !userPermissions.includes(config.minimumLevel)) {
        return res.status(403).json({
          success: false,
          error: 'Tu plan actual no tiene acceso a esta función',
          code: 'INSUFFICIENT_PLAN',
          required: config.minimumLevel,
          current: userPermissions,
          upgradeUrl: '/subscription'
        });
      }

      // Attach subscription info to request
      req.userSubscription = {
        planId,
        level: userPermissions,
        limits: planLimits
      };

      // 4. USAGE VALIDATION (if tracking enabled)
      const shouldTrackUsage = config.trackUsage !== false;
      
      if (shouldTrackUsage && config.feature) {
        // 💳 PAYG BYPASS: Map old feature names to wallet credit feature names
        const featureNameMap: Record<string, keyof typeof FEATURE_CREDIT_COSTS> = {
          contracts: 'contract',
          estimates: 'aiEstimate',
          aiEstimates: 'aiEstimate',
          basicEstimates: 'basicEstimate',
          invoices: 'invoice',
          permitAdvisor: 'permitReport',
          propertyVerifications: 'propertyVerification',
          deepsearch: 'deepSearchPartial',
          deepsearchFullCosts: 'deepSearchFull',
        };
        const creditFeatureName = featureNameMap[config.feature];
        let walletBypass = false;
        if (creditFeatureName) {
          try {
            const creditCost = FEATURE_CREDIT_COSTS[creditFeatureName];
            if (creditCost > 0) { // Only bypass if feature has a credit cost (not free features)
              const affordCheck = await walletService.canAfford(userId, creditCost);
              if (affordCheck.canAfford) {
                walletBypass = true;
                console.log(`💳 [PROTECTION] Wallet bypass: ${userId} has ${affordCheck.currentBalance} credits (needs ${creditCost}) for ${config.feature}`);
              }
            }
          } catch (walletErr) {
            // Non-blocking: if wallet check fails, fall back to plan limits
            console.warn(`⚠️ [PROTECTION] Wallet check failed, falling back to plan limits:`, walletErr);
          }
        }

        if (!walletBypass) {
          // Get feature limit from plan configuration
          const featureLimitKey = `${config.feature}` as keyof typeof planLimits;
          const featureLimit = planLimits[featureLimitKey];

          if (typeof featureLimit === 'number') {
            // Check current usage (using Firebase Firestore for persistence)
            const consumptionCheck = await productionUsageService.canConsumeFeature(userId, config.feature);

            if (!consumptionCheck.canConsume) {
              return res.status(403).json({
                success: false,
                error: `Límite mensual alcanzado para ${config.feature}. Compra créditos para continuar sin límites.`,
                code: 'USAGE_LIMIT_EXCEEDED',
                feature: config.feature,
                limit: consumptionCheck.limit,
                current: consumptionCheck.used,
                remaining: 0,
                resetDate: new Date().toISOString().slice(0, 7), // YYYY-MM
                upgradeUrl: '/wallet'
              });
            }

            // Attach usage tracking function to request (using Firebase for persistence)
            req.trackUsage = async () => {
              try {
                await productionUsageService.consumeFeature(userId, config.feature);
                console.log(`✅ [PROTECTION] Usage tracked for ${userId}:${config.feature}`);
              } catch (error) {
                console.error(`❌ [PROTECTION] Error tracking usage:`, error);
              }
            };
          }
        }
      }

      // 5. SUCCESS - Log performance
      const duration = Date.now() - startTime;
      console.log(`✅ [PROTECTION] ${route} authorized for ${userId} in ${duration}ms${!isRedisAvailable() ? ' [NO-REDIS]' : ''}`);

      // Add Redis status header for debugging
      if (!isRedisAvailable()) {
        res.setHeader('X-Redis-Status', 'unavailable');
      }

      next();

    } catch (error) {
      console.error('❌ [PROTECTION] Middleware error:', error);
      
      // On error, fail securely - don't allow access
      return res.status(500).json({
        success: false,
        error: 'Error interno de autorización',
        code: 'AUTH_INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Predefined protection configs for common features
 */
export const ProtectionPresets = {
  contracts: {
    feature: 'contracts',
    rateLimit: { windowMs: 3600000, max: 100, message: 'Límite de generación de contratos alcanzado' },
    requirePlan: true,
    trackUsage: true
  },
  
  estimates: {
    feature: 'basicEstimates',
    rateLimit: { windowMs: 3600000, max: 200, message: 'Límite de generación de estimados alcanzado' },
    requirePlan: true,
    trackUsage: true
  },

  aiEstimates: {
    feature: 'aiEstimates',
    rateLimit: { windowMs: 3600000, max: 50, message: 'Límite de estimados con IA alcanzado' },
    requirePlan: true,
    trackUsage: true,
    minimumLevel: PermissionLevel.FREE // Free users get 5 AI estimates/month
  },

  propertyVerification: {
    feature: 'propertyVerifications',
    rateLimit: { windowMs: 3600000, max: 150, message: 'Límite de verificaciones de propiedad alcanzado' },
    requirePlan: true,
    trackUsage: true,
    minimumLevel: PermissionLevel.FREE // Free users get 5/month
  },

  permitAdvisor: {
    feature: 'permitAdvisor',
    rateLimit: { windowMs: 3600000, max: 100, message: 'Límite de consultas de permisos alcanzado' },
    requirePlan: true,
    trackUsage: true,
    minimumLevel: PermissionLevel.FREE // Free users get 5/month
  },

  invoices: {
    feature: 'invoices',
    rateLimit: { windowMs: 3600000, max: 100, message: 'Límite de generación de facturas alcanzado' },
    requirePlan: true,
    trackUsage: true,
    minimumLevel: PermissionLevel.BASIC // Only paid plans have access
  },

  aiChat: {
    feature: 'aiEstimates', // Reuse AI estimate limits for chat
    rateLimit: { windowMs: 3600000, max: 300, message: 'Límite de mensajes AI alcanzado' },
    requirePlan: true,
    trackUsage: false // Don't track each message, track operations
  },

  deepsearch: {
    feature: 'deepsearch',
    rateLimit: { windowMs: 3600000, max: 200, message: 'Límite de búsquedas DeepSearch alcanzado por hora' },
    requirePlan: true,
    trackUsage: true,
    minimumLevel: PermissionLevel.FREE // Todos los planes tienen acceso pero con límites diferentes
  },

  // DeepSearch diferenciado por tipo
  deepsearchMaterials: {
    feature: 'deepsearch', // Materials y Labor comparten el mismo contador
    rateLimit: { windowMs: 3600000, max: 200, message: 'Límite de búsquedas de materiales alcanzado por hora' },
    requirePlan: true,
    trackUsage: true,
    minimumLevel: PermissionLevel.FREE
  },

  deepsearchLabor: {
    feature: 'deepsearch', // Materials y Labor comparten el mismo contador
    rateLimit: { windowMs: 3600000, max: 200, message: 'Límite de búsquedas de labor alcanzado por hora' },
    requirePlan: true,
    trackUsage: true,
    minimumLevel: PermissionLevel.FREE
  },

  deepsearchFullCosts: {
    feature: 'deepsearchFullCosts', // Full Costs tiene su propio contador (más valioso)
    rateLimit: { windowMs: 3600000, max: 100, message: 'Límite de análisis completos alcanzado por hora' },
    requirePlan: true,
    trackUsage: true,
    minimumLevel: PermissionLevel.FREE
  }
};

/**
 * Quick helpers for common use cases
 */
export const protectContracts = () => subscriptionProtection(ProtectionPresets.contracts);
export const protectEstimates = () => subscriptionProtection(ProtectionPresets.estimates);
export const protectAIEstimates = () => subscriptionProtection(ProtectionPresets.aiEstimates);
export const protectPropertyVerification = () => subscriptionProtection(ProtectionPresets.propertyVerification);
export const protectPermitAdvisor = () => subscriptionProtection(ProtectionPresets.permitAdvisor);
export const protectAIChat = () => subscriptionProtection(ProtectionPresets.aiChat);
export const protectDeepSearch = () => subscriptionProtection(ProtectionPresets.deepsearch);
export const protectDeepSearchMaterials = () => subscriptionProtection(ProtectionPresets.deepsearchMaterials);
export const protectDeepSearchLabor = () => subscriptionProtection(ProtectionPresets.deepsearchLabor);
export const protectDeepSearchFullCosts = () => subscriptionProtection(ProtectionPresets.deepsearchFullCosts);
export const protectInvoices = () => subscriptionProtection(ProtectionPresets.invoices);
