import { Request, Response } from 'express';
import { userMappingService } from '../services/userMappingService';

/**
 * RUTAS ROBUSTAS DE AUTENTICACIÓN FIREBASE
 * Conecta Firebase authentication con PostgreSQL subscription data
 */

export function registerRobustFirebaseAuthRoutes(app: any) {

  // Obtener datos completos del usuario autenticado
  app.post('/api/auth/user-data', async (req: Request, res: Response) => {
    try {
      const { firebaseUid, email } = req.body;

      if (!firebaseUid || !email) {
        return res.status(400).json({
          error: 'Firebase UID and email are required',
          code: 'MISSING_CREDENTIALS'
        });
      }

      console.log(`🔐 [ROBUST-AUTH] Getting complete user data for: ${email} (${firebaseUid})`);

      // Verificar si es usuario completamente nuevo o existente
      let internalUserId = await userMappingService.getInternalUserId(firebaseUid);
      let isNewUser = false;
      
      if (!internalUserId) {
        console.log(`📝 [ROBUST-AUTH] Creating new user mapping for: ${email}`);
        internalUserId = await userMappingService.createMapping(firebaseUid, email);
        isNewUser = true; // Usuario completamente nuevo
      }

      if (!internalUserId) {
        return res.status(500).json({
          error: 'Could not create or find internal user',
          code: 'USER_MAPPING_FAILED'
        });
      }

      // Obtener suscripción existente (incluyendo expiradas)
      const subscriptionData = await userMappingService.getUserSubscriptionByFirebaseUid(firebaseUid);
      
      // CRÍTICO: Solo crear trial para usuarios COMPLETAMENTE NUEVOS
      let subscription = subscriptionData;
      if (!subscription && isNewUser) {
        console.log(`🆓 [ROBUST-AUTH] Creating trial for brand new user: ${email}`);
        try {
          await userMappingService.createTrialSubscriptionForFirebaseUid(firebaseUid, email);
          subscription = await userMappingService.getUserSubscriptionByFirebaseUid(firebaseUid);
        } catch (error) {
          console.error('❌ [ROBUST-AUTH] Failed to create trial:', error);
        }
      } else if (!subscription && !isNewUser) {
        console.log(`🔒 [ROBUST-AUTH] Existing user ${email} without subscription - keeping as free user (no new trial)`);
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
          active: subscription.subscription.status === 'active' || subscription.subscription.status === 'trialing',
          status: subscription.subscription.status,
          planName: subscription.plan?.name,
          features: subscription.plan?.features,
          daysRemaining: Math.max(0, Math.ceil((new Date(subscription.subscription.currentPeriodEnd || new Date()).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))),
          isTrialing: subscription.subscription.status === 'trialing'
        } : {
          active: false,
          status: 'none',
          needsTrial: true
        },
        systemInfo: {
          dataSource: 'PostgreSQL (persistent)',
          mappingService: 'userMappingService',
          subscriptionSystem: 'robustSubscriptionService'
        }
      };

      console.log(`✅ [ROBUST-AUTH] User data assembled for: ${email}`);
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