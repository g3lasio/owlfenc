import { Request, Response } from 'express';
import { subscriptionControlService } from '../services/subscriptionControlService';

/**
 * NUEVAS RUTAS PARA CONTROL ROBUSTO DE SUSCRIPCIONES
 * Reemplazan el sistema fragmentado de Maps en memoria
 */

export function registerSubscriptionControlRoutes(app: any) {
  
  // Obtener estado real de suscripción (REEMPLAZA /user/subscription)
  app.get('/api/subscription/status/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      console.log(`📊 [SUBSCRIPTION-CONTROL] Getting real subscription status for: ${userId}`);
      
      const status = await subscriptionControlService.getUserSubscriptionStatus(userId);
      
      if (!status) {
        // Usuario nuevo - crear trial automáticamente
        await subscriptionControlService.createTrialSubscription(userId);
        const newStatus = await subscriptionControlService.getUserSubscriptionStatus(userId);
        
        return res.json({
          success: true,
          status: newStatus,
          message: 'Trial created for new user'
        });
      }
      
      res.json({
        success: true,
        status
      });
    } catch (error) {
      console.error('❌ [SUBSCRIPTION-CONTROL] Error getting status:', error);
      res.status(500).json({ 
        error: 'Error getting subscription status',
        success: false 
      });
    }
  });

  // Verificar si puede usar feature específica
  app.get('/api/subscription/can-use/:userId/:feature', async (req: Request, res: Response) => {
    try {
      const { userId, feature } = req.params;
      
      console.log(`🔍 [SUBSCRIPTION-CONTROL] Checking if ${userId} can use ${feature}`);
      
      const usageStatus = await subscriptionControlService.canUseFeature(userId, feature);
      
      res.json({
        success: true,
        canUse: usageStatus.canUse,
        usage: usageStatus
      });
    } catch (error) {
      console.error(`❌ [SUBSCRIPTION-CONTROL] Error checking ${req.params.feature}:`, error);
      res.status(500).json({ 
        error: 'Error checking feature access',
        success: false 
      });
    }
  });

  // Incrementar uso (CON CONTROL REAL)
  app.post('/api/subscription/use-feature', async (req: Request, res: Response) => {
    try {
      const { userId, feature, count = 1 } = req.body;
      
      console.log(`📊 [SUBSCRIPTION-CONTROL] Using feature ${feature} for ${userId}`);
      
      const allowed = await subscriptionControlService.incrementUsage(userId, feature, count);
      
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: 'Feature usage limit exceeded',
          code: 'LIMIT_EXCEEDED'
        });
      }
      
      res.json({
        success: true,
        message: `${feature} usage incremented by ${count}`
      });
    } catch (error) {
      console.error('❌ [SUBSCRIPTION-CONTROL] Error using feature:', error);
      res.status(500).json({ 
        error: 'Error incrementing feature usage',
        success: false 
      });
    }
  });

  // Obtener límites y uso actual
  app.get('/api/subscription/usage-summary/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const features = ['basicEstimates', 'aiEstimates', 'contracts', 'propertyVerifications', 'permitAdvisor', 'projects'];
      const summary = [];
      
      for (const feature of features) {
        const status = await subscriptionControlService.canUseFeature(userId, feature);
        summary.push(status);
      }
      
      res.json({
        success: true,
        summary
      });
    } catch (error) {
      console.error('❌ [SUBSCRIPTION-CONTROL] Error getting usage summary:', error);
      res.status(500).json({ 
        error: 'Error getting usage summary',
        success: false 
      });
    }
  });
}