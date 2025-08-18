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
}