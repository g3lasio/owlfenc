import { Request, Response } from 'express';
import { userMappingService } from '../services/userMappingService';
import { adminAuth } from '../firebase-admin';
import { subscriptionEmailService } from '../services/subscriptionEmailService';

/**
 * RUTAS ROBUSTAS DE AUTENTICACIÓN FIREBASE
 * Conecta Firebase authentication con PostgreSQL subscription data
 */

// ⚡ IN-MEMORY CACHE for user-data responses (5 min TTL)
// Avoids repeated DB queries on every page navigation for existing users
const userDataCache = new Map<string, { data: any; expiresAt: number }>();
const USER_DATA_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function registerRobustFirebaseAuthRoutes(app: any) {

  // Obtener datos completos del usuario autenticado
  app.post('/api/auth/user-data', async (req: Request, res: Response) => {
    try {
      const { firebaseUid, email, idToken } = req.body;

      if (!firebaseUid || !email) {
        return res.status(400).json({
          error: 'Firebase UID and email are required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      // 🔐 CRITICAL FIX: Token validation only for new users or when token is provided
      let tokenVerified = false;
      if (idToken && idToken !== '') {
        try {
          const decodedToken = await adminAuth.verifyIdToken(idToken);
          
          // Verificar que el UID del token coincida con el enviado
          if (decodedToken.uid !== firebaseUid) {
            return res.status(401).json({
              error: 'Token UID mismatch',
              code: 'TOKEN_UID_MISMATCH'
            });
          }

          console.log(`🔐 [ROBUST-AUTH] Token verificado exitosamente para: ${decodedToken.email}`);
          tokenVerified = true;
          
        } catch (tokenError) {
          console.warn('⚠️ [ROBUST-AUTH] Token verification failed (will continue for existing users):', tokenError);
          // NO return error - permitir que usuarios existentes continúen sin token
        }
      } else {
        console.log(`📭 [ROBUST-AUTH] No token provided - checking existing user mapping`);
      }

      // ⚡ CACHE CHECK: Return cached response for existing users (avoids DB queries)
      const cacheKey = firebaseUid;
      const cached = userDataCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        console.log(`⚡ [ROBUST-AUTH] Cache hit for: ${email} (TTL: ${Math.round((cached.expiresAt - Date.now()) / 1000)}s remaining)`);
        return res.json(cached.data);
      }

      console.log(`🔐 [ROBUST-AUTH] Getting complete user data for: ${email} (${firebaseUid})`);

      // Verificar si es usuario completamente nuevo o existente
      let internalUserId = await userMappingService.getInternalUserId(firebaseUid);
      let isNewUser = false;
      
      if (!internalUserId) {
        console.log(`📝 [ROBUST-AUTH] Creating new user mapping for: ${email}`);
        const mappingResult = await userMappingService.createMapping(firebaseUid, email);
        
        if (!mappingResult) {
          return res.status(500).json({
            error: 'Could not create or find internal user',
            code: 'USER_MAPPING_FAILED'
          });
        }
        
        internalUserId = mappingResult.id;
        isNewUser = mappingResult.wasCreated; // CORREGIDO: Solo es nuevo si se CREÓ el registro
        
        console.log(`🔍 [ROBUST-AUTH] User mapping result: internalUserId=${internalUserId}, wasCreated=${mappingResult.wasCreated}`);
      }
      
      if (!internalUserId) {
        return res.status(500).json({
          error: 'Could not create or find internal user',
          code: 'USER_MAPPING_FAILED'
        });
      }

      // Obtener suscripción existente (incluyendo expiradas)
      const subscriptionData = await userMappingService.getUserSubscriptionByFirebaseUid(firebaseUid);
      
      // 🚫 NUEVO FLUJO: NO asignar plan automáticamente
      // El usuario debe elegir su plan manualmente en /subscription
      let subscription = subscriptionData;
      if (!subscription && isNewUser) {
        console.log(`📋 [ROBUST-AUTH] Nuevo usuario sin plan: ${email} - Debe elegir plan en /subscription`);
        // NO crear trial automáticamente - usuario debe elegir
        
        // 📧 Enviar email de bienvenida para usuario nuevo
        try {
          const userName = email.split('@')[0];
          await subscriptionEmailService.sendWelcomeEmail({ email, userName });
          console.log(`📧 [ROBUST-AUTH] Welcome email sent to: ${email}`);
        } catch (emailError) {
          console.error('⚠️ [ROBUST-AUTH] Welcome email failed (non-blocking):', emailError);
        }

        // 🎁 Welcome Bonus: 120 créditos de bienvenida (idempotente)
        // KEY: userId (not firebaseUid) so it's stable across Firebase UID changes
        try {
          const { walletService } = await import('../services/walletService');
          const bonusResult = await walletService.addCredits({
            firebaseUid,
            amountCredits: 120,
            type: 'bonus',
            description: '🎁 Welcome Bonus: 120 AI Credits — On us',
            idempotencyKey: `welcome_bonus_120:user:${internalUserId}`,
          });
          if (bonusResult.error === 'BONUS_CAP_REACHED') {
            console.log(`🚫 [WELCOME-BONUS] Bonus cap already reached for userId=${internalUserId} — skipping duplicate grant`);
          } else {
            console.log(`✅ [WELCOME-BONUS] 120 credits granted to new user: ${email} (userId=${internalUserId})`);
          }
        } catch (walletError) {
          console.error('⚠️  [WELCOME-BONUS] Failed to grant welcome credits (non-blocking):', walletError);
        }
      } else if (!subscription && !isNewUser) {
        console.log(`🔒 [ROBUST-AUTH] Usuario existente ${email} sin suscripción - Debe elegir plan`);
      }

      // LÓGICA CORREGIDA: Detectar trial basándose en plan y fecha, no solo status
      let isTrialing = false;
      let daysRemaining = 0;
      let active = false;
      
      if (subscription) {
        const now = new Date();
        const endDate = new Date(subscription.subscription.currentPeriodEnd || now);
        daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        
        // CORRECCIÓN: Un usuario está en trial si:
        // 1. Tiene un plan "Free Trial" o "Trial Master" Y
        // 2. No ha expirado (daysRemaining > 0)
        // INDEPENDIENTEMENTE del status en la DB
        const isTrialPlan = subscription.plan?.name === 'Free Trial' || subscription.plan?.name === 'Trial Master';
        isTrialing = isTrialPlan && daysRemaining > 0;
        
        // Está activo si está en trial O si el status es active/trialing
        active = isTrialing || subscription.subscription.status === 'active' || subscription.subscription.status === 'trialing';
        
        console.log(`🔍 [TRIAL-FIX] Plan: ${subscription.plan?.name}, Status: ${subscription.subscription.status}, Days: ${daysRemaining}, IsTrialing: ${isTrialing}`);
      }

      const response = {
        success: true,
        user: {
          firebaseUid,
          email,
          internalUserId,
          isAuthenticated: true
        },
        subscription: subscription ? {
          active,
          status: subscription.subscription.status,
          planName: subscription.plan?.name,
          features: subscription.plan?.features,
          daysRemaining,
          isTrialing
        } : {
          active: false,
          status: 'none',
          needsToChoosePlan: true, // NUEVO FLAG: Usuario debe ir a /subscription
          redirectTo: '/subscription'
        },
        systemInfo: {
          dataSource: 'PostgreSQL (persistent)',
          mappingService: 'userMappingService',
          subscriptionSystem: 'robustSubscriptionService'
        }
      };

      console.log(`✅ [ROBUST-AUTH] User data assembled for: ${email}`);
      
      // ⚡ CACHE WRITE: Store response for 5 minutes (only for existing users, not new ones)
      if (!isNewUser) {
        userDataCache.set(cacheKey, { data: response, expiresAt: Date.now() + USER_DATA_CACHE_TTL_MS });
      }
      
      res.json(response);

    } catch (error) {
      console.error('❌ [ROBUST-AUTH] Error getting user data:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Endpoint para verificar acceso a features específicas
  app.get('/api/auth/can-access/:firebaseUid/:feature', async (req: Request, res: Response) => {
    try {
      const { firebaseUid, feature } = req.params;

      const access = await userMappingService.canUseFeature(firebaseUid, feature);

      res.json({
        success: true,
        firebaseUid,
        feature,
        canAccess: access.canUse,
        usage: {
          used: access.used,
          limit: access.limit,
          isUnlimited: access.limit === -1
        },
        planName: access.planName
      });

    } catch (error) {
      console.error('❌ [ROBUST-AUTH] Error checking feature access:', error);
      res.status(500).json({
        error: 'Failed to check feature access',
        code: 'ACCESS_CHECK_FAILED'
      });
    }
  });

  console.log('🔐 [ROBUST-FIREBASE-AUTH] Routes registered successfully');
}