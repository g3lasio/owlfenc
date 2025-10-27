import { Request, Response } from 'express';
import { robustSubscriptionService } from '../services/robustSubscriptionService';
import { userMappingService } from '../services/userMappingService';

/**
 * ENDPOINT QUE REEMPLAZA /user/subscription
 * Elimina el sistema de firebaseSubscriptionService que usa Maps en memoria
 * Implementa control REAL de suscripciones desde PostgreSQL
 */

export function registerRobustUserSubscriptionRoutes(app: any) {
  
  // NUEVO: Reemplaza completamente /user/subscription con Firebase UID mapping
  app.get('/api/user/subscription-robust/:firebaseUid', async (req: Request, res: Response) => {
    try {
      const { firebaseUid } = req.params;
      
      console.log(`🔍 [ROBUST-USER-SUBSCRIPTION] Getting REAL subscription for Firebase UID: ${firebaseUid}`);
      
      // Usar el servicio de mapeo para obtener suscripción por Firebase UID
      const subscriptionData = await userMappingService.getUserSubscriptionByFirebaseUid(firebaseUid);
      
      if (!subscriptionData) {
        // Si no tiene suscripción, ofrecer crear trial automático
        console.log(`📝 [ROBUST-USER-SUBSCRIPTION] No subscription found, offering trial for: ${firebaseUid}`);
        
        return res.status(404).json({
          active: false,
          error: 'No subscription found',
          message: 'Usuario no tiene suscripción activa',
          canCreateTrial: true,
          trialEndpoint: '/api/user/create-trial'
        });
      }
      
      const { subscription, plan } = subscriptionData;

      // Calcular días restantes
      const now = new Date();
      const endDate = new Date(subscription.currentPeriodEnd || now);
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Formato compatible con frontend existente
      const response = {
        active: subscription.status === 'active' || subscription.status === 'trialing',
        subscription: {
          id: `robust_${subscription.id}`,
          userId: firebaseUid, // Usar Firebase UID para compatibilidad con frontend
          planId: subscription.planId,
          status: subscription.status,
          planName: plan?.name,
          features: plan?.features,
          daysRemaining,
          isTrialing: subscription.status === 'trialing',
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
          createdAt: subscription.createdAt?.toISOString(),
          updatedAt: subscription.updatedAt?.toISOString()
        },
        plan: {
          id: subscription.planId,
          name: plan?.name,
          features: plan?.features
        }
      };

      console.log(`✅ [ROBUST-USER-SUBSCRIPTION] Returning REAL data:`, response);
      res.json(response);
      
    } catch (error) {
      console.error('❌ [ROBUST-USER-SUBSCRIPTION] Error:', error);
      res.status(500).json({
        active: false,
        error: 'Error getting subscription',
        message: 'Error interno del servidor'
      });
    }
  });

  // Verificar límites REALES para una feature específica usando Firebase UID
  app.get('/api/user/can-use/:firebaseUid/:feature', async (req: Request, res: Response) => {
    try {
      const { firebaseUid, feature } = req.params;
      
      console.log(`🔍 [ROBUST-USER-SUBSCRIPTION] Checking if ${firebaseUid} can use ${feature}`);
      
      const check = await userMappingService.canUseFeature(firebaseUid, feature);
      
      res.json({
        success: true,
        canUse: check.canUse,
        used: check.used,
        limit: check.limit,
        isUnlimited: check.limit === -1,
        feature,
        planName: check.planName
      });
      
    } catch (error) {
      console.error(`❌ [ROBUST-USER-SUBSCRIPTION] Error checking ${req.params.feature}:`, error);
      res.status(500).json({
        success: false,
        canUse: false,
        error: 'Error checking feature access'
      });
    }
  });

  // Crear suscripción trial para Firebase UID
  app.post('/api/user/create-trial', async (req: Request, res: Response) => {
    try {
      const { firebaseUid, email } = req.body;
      
      if (!firebaseUid || !email) {
        return res.status(400).json({
          success: false,
          error: 'Firebase UID and email are required'
        });
      }
      
      console.log(`🆓 [ROBUST-USER-SUBSCRIPTION] Creating trial for ${email} (${firebaseUid})`);
      
      const trial = await userMappingService.createTrialSubscriptionForFirebaseUid(firebaseUid, email);
      
      res.json({
        success: true,
        message: 'Trial subscription created successfully',
        subscription: trial
      });
      
    } catch (error) {
      console.error('❌ [ROBUST-USER-SUBSCRIPTION] Error using feature:', error);
      res.status(500).json({
        success: false,
        error: 'Error processing feature usage'
      });
    }
  });

  // Dashboard de límites y uso actual
  app.get('/api/user/usage-dashboard/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const subscription = await robustSubscriptionService.getUserSubscription(userId);
      if (!subscription) {
        return res.status(404).json({
          error: 'No subscription found'
        });
      }

      const features = Object.keys(subscription.features);
      const dashboard = [];
      
      for (const feature of features) {
        const check = await robustSubscriptionService.canUseFeature(userId, feature);
        dashboard.push({
          feature,
          used: check.used,
          limit: check.limit,
          canUse: check.canUse,
          isUnlimited: check.limit === -1,
          percentage: check.limit > 0 ? Math.round((check.used / check.limit) * 100) : 0
        });
      }
      
      res.json({
        success: true,
        userId,
        planName: subscription.planName,
        status: subscription.status,
        daysRemaining: subscription.daysRemaining,
        features: dashboard
      });
      
    } catch (error) {
      console.error('❌ [ROBUST-USER-SUBSCRIPTION] Error getting dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Error getting usage dashboard'
      });
    }
  });

  // 🎯 NUEVO: Activar plan elegido por el usuario (Free Trial, Primo, Mero, Master)
  app.post('/api/subscription/activate-plan', async (req: Request, res: Response) => {
    try {
      const { firebaseUid, planId, email } = req.body;
      
      if (!firebaseUid || !planId) {
        return res.status(400).json({
          success: false,
          error: 'Firebase UID and Plan ID are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      const normalizedPlanId = Number(planId);
      console.log(`🎯 [ACTIVATE-PLAN] Usuario ${firebaseUid} eligiendo plan ID: ${normalizedPlanId}`);
      
      // Verificar si ya tiene suscripción
      const existingSubscription = await userMappingService.getUserSubscriptionByFirebaseUid(firebaseUid);
      if (existingSubscription) {
        return res.status(400).json({
          success: false,
          error: 'Ya tienes un plan activo. Usa /change-plan para cambiar.',
          code: 'ALREADY_HAS_SUBSCRIPTION',
          currentPlan: existingSubscription.plan?.name
        });
      }

      // 🛡️ SECURITY: Si eligió Free Trial, verificar que nunca lo haya usado
      if (normalizedPlanId === 4) {
        const hasUsed = await userMappingService.hasUserUsedTrial(firebaseUid);
        if (hasUsed) {
          return res.status(403).json({
            success: false,
            error: 'Ya has usado tu Free Trial. Elige un plan de pago.',
            code: 'TRIAL_ALREADY_USED'
          });
        }
      }

      // Obtener user_id interno desde Firebase UID
      const internalUserId = await userMappingService.getInternalUserId(firebaseUid);
      if (!internalUserId) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // 🔧 FIX: Activar plan con internalUserId correcto
      const subscription = await robustSubscriptionService.activateUserPlan(internalUserId, normalizedPlanId);

      // Si eligió Free Trial (ID 4), marcar hasUsedTrial = true
      if (normalizedPlanId === 4) {
        await userMappingService.markTrialAsUsed(firebaseUid);
        console.log(`✅ [ACTIVATE-PLAN] Trial marcado como usado para: ${firebaseUid}`);
      }

      res.json({
        success: true,
        message: 'Plan activado exitosamente',
        subscription: {
          planId: normalizedPlanId,
          planName: subscription.planName,
          status: subscription.status,
          features: subscription.features
        }
      });

    } catch (error) {
      console.error('❌ [ACTIVATE-PLAN] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Error al activar plan',
        message: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  console.log('🛡️ [ROBUST-USER-SUBSCRIPTION] Routes registered successfully');
}