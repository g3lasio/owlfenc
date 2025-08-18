import { Request, Response } from 'express';
import { robustSubscriptionService } from '../services/robustSubscriptionService';

/**
 * ENDPOINT QUE REEMPLAZA /user/subscription
 * Elimina el sistema de firebaseSubscriptionService que usa Maps en memoria
 * Implementa control REAL de suscripciones desde PostgreSQL
 */

export function registerRobustUserSubscriptionRoutes(app: any) {
  
  // NUEVO: Reemplaza completamente /user/subscription  
  app.get('/api/user/subscription-robust/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      console.log(`🔍 [ROBUST-USER-SUBSCRIPTION] Getting REAL subscription for: ${userId}`);
      
      const subscription = await robustSubscriptionService.getUserSubscription(userId);
      
      if (!subscription) {
        return res.status(404).json({
          active: false,
          error: 'No subscription found',
          message: 'Usuario no tiene suscripción activa'
        });
      }

      // Formato compatible con frontend existente
      const response = {
        active: subscription.isActive,
        subscription: {
          id: `robust_${subscription.planId}`,
          userId,
          planId: subscription.planId,
          status: subscription.status,
          planName: subscription.planName,
          features: subscription.features,
          daysRemaining: subscription.daysRemaining,
          isTrialing: subscription.isTrialing,
          currentPeriodEnd: new Date().toISOString(), // Placeholder
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        plan: {
          id: subscription.planId,
          name: subscription.planName,
          features: subscription.features
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

  // Verificar límites REALES para una feature específica
  app.get('/api/user/can-use/:userId/:feature', async (req: Request, res: Response) => {
    try {
      const { userId, feature } = req.params;
      
      console.log(`🔍 [ROBUST-USER-SUBSCRIPTION] Checking if ${userId} can use ${feature}`);
      
      const check = await robustSubscriptionService.canUseFeature(userId, feature);
      
      res.json({
        success: true,
        canUse: check.canUse,
        used: check.used,
        limit: check.limit,
        isUnlimited: check.limit === -1,
        feature
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

  // Usar feature CON CONTROL REAL (BLOQUEA si excede límites)
  app.post('/api/user/use-feature', async (req: Request, res: Response) => {
    try {
      const { userId, feature, count = 1 } = req.body;
      
      console.log(`📊 [ROBUST-USER-SUBSCRIPTION] ${userId} attempting to use ${feature} (${count}x)`);
      
      const allowed = await robustSubscriptionService.incrementUsage(userId, feature, count);
      
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: 'LIMIT_EXCEEDED',
          message: `Has alcanzado el límite para ${feature}`,
          code: 'SUBSCRIPTION_LIMIT_EXCEEDED'
        });
      }
      
      res.json({
        success: true,
        message: `${feature} usage incremented successfully`,
        feature,
        count
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