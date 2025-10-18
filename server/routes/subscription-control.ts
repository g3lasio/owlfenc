import { Request, Response } from 'express';
import { subscriptionControlService } from '../services/subscriptionControlService';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { userMappingService } from '../services/userMappingService';
import { DatabaseStorage } from '../DatabaseStorage';

// Inicializar UserMappingService
const databaseStorage = new DatabaseStorage();
// Using singleton userMappingService from import

/**
 * NUEVAS RUTAS PARA CONTROL ROBUSTO DE SUSCRIPCIONES
 * Reemplazan el sistema fragmentado de Maps en memoria
 */

export function registerSubscriptionControlRoutes(app: any) {
  
  // Obtener estado real de suscripción (REEMPLAZA /user/subscription)
  app.get('/api/subscription/status', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      // 🔐 SECURITY FIX: Obtener userId del usuario autenticado
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Usuario no autenticado', success: false });
      }
      let userId = await userMappingService.getInternalUserId(firebaseUid);
      if (!userId) {
        userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      }
      if (!userId) {
        return res.status(500).json({ error: 'Error creando mapeo de usuario', success: false });
      }
      console.log(`📊 [SECURITY] Getting subscription status for REAL user_id: ${userId}`);
      
      const status = await subscriptionControlService.getUserSubscriptionStatus(userId.toString());
      
      if (!status) {
        // 🚨 SECURITY: NO crear trial automático - usuarios deben activarlo explícitamente
        // Prevenir bypass donde usuarios pueden obtener trials infinitos
        console.warn(`⚠️ [SECURITY] New user ${userId} has no subscription - returning free plan status`);
        
        return res.json({
          success: true,
          status: {
            planId: 1, // Primo Chambeador (free)
            planName: 'Primo Chambeador',
            status: 'active',
            limits: {
              estimatesPerMonth: 5,
              contractsPerMonth: 0,
              advancedFeatures: false
            },
            message: 'Free plan - upgrade to access premium features'
          }
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
  app.get('/api/subscription/can-use/:feature', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const { feature } = req.params;
      
      // 🔐 SECURITY FIX: Obtener userId del usuario autenticado
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Usuario no autenticado', success: false });
      }
      let userId = await userMappingService.getInternalUserId(firebaseUid);
      if (!userId) {
        userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      }
      if (!userId) {
        return res.status(500).json({ error: 'Error creando mapeo de usuario', success: false });
      }
      console.log(`🔐 [SECURITY] Checking feature access for REAL user_id: ${userId}`);
      
      console.log(`🔍 [SUBSCRIPTION-CONTROL] Checking if ${userId} can use ${feature}`);
      
      const usageStatus = await subscriptionControlService.canUseFeature(userId.toString(), feature);
      
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
  app.post('/api/subscription/use-feature', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const { feature, count = 1 } = req.body;
      
      // 🔐 SECURITY FIX: Obtener userId del usuario autenticado
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Usuario no autenticado', success: false });
      }
      let userId = await userMappingService.getInternalUserId(firebaseUid);
      if (!userId) {
        userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      }
      if (!userId) {
        return res.status(500).json({ error: 'Error creando mapeo de usuario', success: false });
      }
      console.log(`🔐 [SECURITY] Incrementing feature usage for REAL user_id: ${userId}`);
      
      console.log(`📊 [SUBSCRIPTION-CONTROL] Using feature ${feature} for ${userId}`);
      
      const allowed = await subscriptionControlService.incrementUsage(userId.toString(), feature, count);
      
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
  app.get('/api/subscription/usage-summary', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      // 🔐 SECURITY FIX: Obtener userId del usuario autenticado
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Usuario no autenticado', success: false });
      }
      let userId = await userMappingService.getInternalUserId(firebaseUid);
      if (!userId) {
        userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
      }
      if (!userId) {
        return res.status(500).json({ error: 'Error creando mapeo de usuario', success: false });
      }
      console.log(`🔐 [SECURITY] Getting usage summary for REAL user_id: ${userId}`);
      
      const features = ['basicEstimates', 'aiEstimates', 'contracts', 'propertyVerifications', 'permitAdvisor', 'projects'];
      const summary = [];
      
      for (const feature of features) {
        const status = await subscriptionControlService.canUseFeature(userId.toString(), feature);
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