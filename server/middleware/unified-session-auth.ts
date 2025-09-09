/**
 * UNIFIED SESSION AUTHENTICATION MIDDLEWARE
 * 
 * Architecture Step 2: Middleware único de auth
 * - Verifica primero la cookie __session con admin.auth().verifySessionCookie
 * - Fallback: si no hay cookie, acepta Authorization: Bearer … (para móviles/CLI)
 * - Ata req.user = { uid, claims… }
 * - Chequeo de plan en el servidor integrado
 */

import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../firebase-admin';
import { UserMappingService } from '../services/UserMappingService';
import { storage } from '../storage';

// Extended Request interface with user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        name?: string;
        claims?: any;
        internalUserId?: number;
        subscription?: {
          planName: string;
          status: string;
          canUse: (feature: string) => Promise<boolean>;
        };
      };
      firebaseUser?: {
        uid: string;
        email?: string;
        name?: string;
      };
    }
  }
}

interface AuthOptions {
  requireAuth?: boolean;
  requiredPlan?: string[];
  feature?: string;
}

/**
 * Main unified authentication middleware
 */
export const unifiedSessionAuth = (options: AuthOptions = { requireAuth: true }) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🔐 [UNIFIED-AUTH] Iniciando verificación de autenticación...');

      let decodedClaims: any = null;
      let authMethod = '';

      // STEP 1: Try session cookie first (preferred method)
      const sessionCookie = req.cookies?.__session;
      
      if (sessionCookie) {
        try {
          decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
          authMethod = 'session-cookie';
          console.log(`✅ [UNIFIED-AUTH] Autenticado via session cookie: ${decodedClaims.uid}`);
        } catch (sessionError: any) {
          console.warn('⚠️ [UNIFIED-AUTH] Session cookie inválida, intentando fallback:', sessionError.code);
          
          // Clear invalid session cookie
          res.clearCookie('__session', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'none',
            path: '/'
          });
        }
      }

      // STEP 2: Fallback to Authorization header (for mobile/CLI/testing)
      if (!decodedClaims) {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          
          try {
            decodedClaims = await adminAuth.verifyIdToken(token);
            authMethod = 'authorization-header';
            console.log(`✅ [UNIFIED-AUTH] Autenticado via Authorization header: ${decodedClaims.uid}`);
          } catch (tokenError: any) {
            console.warn('⚠️ [UNIFIED-AUTH] Authorization header inválido:', tokenError.code);
          }
        }
      }

      // STEP 3: Handle authentication requirement
      if (!decodedClaims) {
        if (options.requireAuth !== false) {
          console.log('❌ [UNIFIED-AUTH] Autenticación requerida - acceso denegado');
          return res.status(401).json({
            success: false,
            error: 'Autenticación requerida',
            code: 'AUTH_REQUIRED',
            hint: 'Use /api/sessionLogin to create session cookie or include Authorization header'
          });
        } else {
          // Optional auth - continue without user data
          console.log('ℹ️ [UNIFIED-AUTH] Autenticación opcional - continuando sin usuario');
          return next();
        }
      }

      // STEP 4: Get or create internal user mapping
      let internalUserId: number | null = null;
      try {
        const userMappingService = UserMappingService.getInstance(storage);
        internalUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(
          decodedClaims.uid,
          decodedClaims.email || ''
        );
      } catch (mappingError) {
        console.error('❌ [UNIFIED-AUTH] User mapping failed:', mappingError);
        if (options.requireAuth !== false) {
          return res.status(500).json({
            success: false,
            error: 'Error en mapeo de usuario',
            code: 'USER_MAPPING_FAILED'
          });
        }
      }

      // STEP 5: Load subscription data and plan validation
      let subscriptionInfo: any = null;
      try {
        const { userMappingService: userSubService } = await import('../services/userMappingService');
        subscriptionInfo = await userSubService.getUserSubscriptionByFirebaseUid(decodedClaims.uid);
        
        // Check plan requirements if specified
        if (options.requiredPlan && options.requiredPlan.length > 0) {
          const userPlan = subscriptionInfo?.plan?.name;
          const hasValidPlan = options.requiredPlan.includes(userPlan) || 
                              (subscriptionInfo?.subscription?.status === 'trialing');
          
          if (!hasValidPlan) {
            console.log(`🔒 [UNIFIED-AUTH] Plan insuficiente: ${userPlan}, requerido: ${options.requiredPlan}`);
            return res.status(403).json({
              success: false,
              error: 'Plan de suscripción insuficiente',
              code: 'PLAN_INSUFFICIENT',
              required: options.requiredPlan,
              current: userPlan,
              hint: 'Actualiza tu plan para acceder a esta funcionalidad'
            });
          }
        }

        // Check feature usage limits if specified
        if (options.feature) {
          const canUse = await userSubService.canUseFeature(decodedClaims.uid, options.feature);
          
          if (!canUse.canUse) {
            console.log(`🔒 [UNIFIED-AUTH] Límite de feature alcanzado: ${options.feature} (${canUse.used}/${canUse.limit})`);
            return res.status(403).json({
              success: false,
              error: 'Límite de uso alcanzado',
              code: 'FEATURE_LIMIT_EXCEEDED',
              feature: options.feature,
              usage: {
                used: canUse.used,
                limit: canUse.limit,
                planName: canUse.planName
              },
              hint: 'Actualiza tu plan para obtener más acceso'
            });
          }
        }

      } catch (subscriptionError) {
        console.warn('⚠️ [UNIFIED-AUTH] Subscription data unavailable:', subscriptionError);
      }

      // STEP 6: Attach user data to request
      req.user = {
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        name: decodedClaims.name,
        claims: decodedClaims,
        internalUserId,
        subscription: subscriptionInfo ? {
          planName: subscriptionInfo.plan?.name,
          status: subscriptionInfo.subscription?.status,
          canUse: async (feature: string) => {
            const { userMappingService: userSubService } = await import('../services/userMappingService');
            const result = await userSubService.canUseFeature(decodedClaims.uid, feature);
            return result.canUse;
          }
        } : undefined
      };

      // Legacy compatibility - also set firebaseUser
      req.firebaseUser = {
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        name: decodedClaims.name
      };

      console.log(`✅ [UNIFIED-AUTH] Usuario completamente autenticado: ${decodedClaims.uid} (${authMethod})`);
      console.log(`   📋 Plan: ${subscriptionInfo?.plan?.name || 'ninguno'} | Usuario interno: ${internalUserId}`);

      next();

    } catch (error: any) {
      console.error('❌ [UNIFIED-AUTH] Error crítico en middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno de autenticación',
        code: 'AUTH_INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Convenience middleware for common authentication scenarios
 */

// Standard authentication (requires login)
export const requireAuth = unifiedSessionAuth({ requireAuth: true });

// Optional authentication (works with or without login)
export const optionalAuth = unifiedSessionAuth({ requireAuth: false });

// Premium features only (requires Pro/Premium plans)
export const requirePremium = unifiedSessionAuth({ 
  requireAuth: true, 
  requiredPlan: ['Pro', 'Premium', 'Enterprise']
});

// Professional features (Pro plans and above)
export const requireProfessional = unifiedSessionAuth({
  requireAuth: true,
  requiredPlan: ['Professional', 'Pro', 'Premium', 'Enterprise'] 
});

// Feature-specific middleware generators
export const requireFeatureAccess = (feature: string) => unifiedSessionAuth({
  requireAuth: true,
  feature
});

export const requirePlanAndFeature = (plans: string[], feature: string) => unifiedSessionAuth({
  requireAuth: true,
  requiredPlan: plans,
  feature
});

/**
 * Helper function to get authenticated user from request
 */
export function getAuthenticatedUser(req: Request): NonNullable<Request['user']> | null {
  return req.user || null;
}

/**
 * Helper function to require authenticated user (throws if not authenticated)
 */
export function requireAuthenticatedUser(req: Request): NonNullable<Request['user']> {
  const user = req.user;
  
  if (!user) {
    throw new Error("Authentication required - user not found in request");
  }

  return user;
}