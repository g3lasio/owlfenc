/**
 * 🔐 USAGE TRACKING ROUTES - PERSISTENT VERSION
 * Reemplazo completo del sistema de Map en memoria
 * Usa PostgreSQL como storage principal
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import admin from 'firebase-admin';
import { postgresUsageService } from '../services/postgresUsageService';
import { getCurrentMonth } from '@shared/usage-schema';

export function registerUsageRoutes(app: any) {
  
  // ==========================================
  // GET USAGE - Obtener uso mensual del usuario
  // ==========================================
  app.get('/api/usage/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const month = (req.query.month as string) || getCurrentMonth();
      
      console.log(`📊 [USAGE-PERSISTENT] Getting usage for user: ${userId}, month: ${month}`);
      
      // Cargar desde PostgreSQL (persistente)
      const usage = await postgresUsageService.getUserUsage(userId);
      
      res.json({
        userId,
        month,
        ...usage
      });
    } catch (error) {
      console.error('❌ [USAGE-PERSISTENT] Error getting usage:', error);
      res.status(500).json({ error: 'Error getting usage data' });
    }
  });

  // ==========================================
  // INCREMENT USAGE - Incrementar uso de una funcionalidad
  // ==========================================
  app.post('/api/usage/increment', async (req: Request, res: Response) => {
    try {
      // ✅ AUTHENTICATION: Verificar autenticación Firebase ANTES de incrementar
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: "Autenticación requerida para incrementar uso",
          code: "NO_AUTH_TOKEN" 
        });
      }

      const token = authHeader.split(' ')[1];
      
      // Verificar el token con Firebase Admin
      let authenticatedUserId: string;
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        authenticatedUserId = decodedToken.uid;
      } catch (tokenError) {
        console.error("❌ [USAGE-PERSISTENT] Error verificando token:", tokenError);
        return res.status(401).json({ 
          error: "Token inválido",
          code: "INVALID_TOKEN" 
        });
      }

      const { userId, feature, count = 1 } = req.body;
      
      // ✅ SECURITY: Verificar que el userId del body coincida con el token autenticado
      if (userId && userId !== authenticatedUserId) {
        console.error(`🚨 [SECURITY] Intento de modificar uso de otro usuario! Token: ${authenticatedUserId}, Body: ${userId}`);
        return res.status(403).json({ 
          error: "No puedes modificar el uso de otro usuario",
          code: "FORBIDDEN_USER_MISMATCH" 
        });
      }

      // Usar el userId autenticado
      const targetUserId = userId || authenticatedUserId;
      
      if (!targetUserId || !feature) {
        return res.status(400).json({ error: 'userId and feature are required' });
      }

      console.log(`📈 [USAGE-PERSISTENT] Incrementando ${feature} por ${count} para usuario autenticado: ${authenticatedUserId}`);
      
      // ✅ PERSISTENT INCREMENT - Guardar en PostgreSQL
      const newValue = await postgresUsageService.incrementUsage(targetUserId, feature, count);
      
      // Retornar uso actualizado
      const usage = await postgresUsageService.getUserUsage(targetUserId);
      
      res.json({
        success: true,
        feature,
        newValue,
        usage
      });
      
    } catch (error) {
      console.error('❌ [USAGE-PERSISTENT] Error incrementing usage:', error);
      res.status(500).json({ error: 'Error incrementing usage' });
    }
  });
  
  // ==========================================
  // PROPERTY VERIFICATIONS - Endpoint específico
  // ==========================================
  app.post('/api/usage/increment/propertyVerifications', async (req: Request, res: Response) => {
    try {
      // Re-usar la lógica del endpoint general
      req.body.feature = 'propertyVerifications';
      req.body.count = 1;
      
      console.log('📍 [PROPERTY-VERIFIER] Incrementando uso de Property Verifications');
      
      // Redirigir al endpoint principal
      req.url = '/api/usage/increment';
      return app._router.handle(req, res, () => {});
      
    } catch (error) {
      console.error('❌ [PROPERTY-VERIFIER] Error incrementing:', error);
      res.status(500).json({ error: 'Error incrementing property verification usage' });
    }
  });

  // ==========================================
  // RESET USAGE - Resetear uso mensual
  // ==========================================
  app.post('/api/usage/reset/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { feature } = req.body;
      
      if (feature) {
        // Reset específico de una feature
        await postgresUsageService.resetFeatureUsage(userId, feature);
        console.log(`🔄 [USAGE-PERSISTENT] Reset ${feature} for user: ${userId}`);
      } else {
        // Reset completo (crear nuevo record para el mes)
        await postgresUsageService.getOrCreateUsageRecord(userId);
        console.log(`🔄 [USAGE-PERSISTENT] Created fresh record for user: ${userId}`);
      }
      
      const usage = await postgresUsageService.getUserUsage(userId);
      res.json({ success: true, usage });
      
    } catch (error) {
      console.error('❌ [USAGE-PERSISTENT] Error resetting usage:', error);
      res.status(500).json({ error: 'Error resetting usage' });
    }
  });

  // ==========================================
  // GET USAGE STATS - Estadísticas para dashboard
  // ==========================================
  app.get('/api/usage/stats/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const usage = await postgresUsageService.getUserUsage(userId);
      
      // Calcular total
      const totalUsage = Object.values(usage)
        .filter(val => typeof val === 'number')
        .reduce((sum: number, val) => sum + (val as number), 0);
      
      res.json({
        month: getCurrentMonth(),
        totalUsage,
        breakdown: usage
      });
      
    } catch (error) {
      console.error('❌ [USAGE-PERSISTENT] Error getting stats:', error);
      res.status(500).json({ error: 'Error getting usage stats' });
    }
  });

  // ==========================================
  // CAN USE FEATURE - Verificar si puede usar
  // ==========================================
  app.post('/api/usage/can-use', async (req: Request, res: Response) => {
    try {
      const { userId, feature, limit } = req.body;
      
      if (!userId || !feature || limit === undefined) {
        return res.status(400).json({ error: 'userId, feature, and limit are required' });
      }

      const canUse = await postgresUsageService.canUseFeature(userId, feature, limit);
      const details = await postgresUsageService.getUsageDetails(userId, feature, limit);
      
      res.json({
        canUse,
        ...details
      });
      
    } catch (error) {
      console.error('❌ [USAGE-PERSISTENT] Error checking can-use:', error);
      res.status(500).json({ error: 'Error checking feature availability' });
    }
  });

  console.log('✅ [USAGE-PERSISTENT] Persistent Usage API routes registered successfully');
  console.log('📊 [USAGE-PERSISTENT] Using PostgreSQL table: user_usage_limits');
}
