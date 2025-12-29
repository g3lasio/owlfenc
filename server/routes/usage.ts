import { Request, Response } from 'express';
import { z } from 'zod';
import admin from 'firebase-admin';
import { 
  userMonthlyUsage, 
  userTrials,
  insertUserMonthlyUsageSchema,
  insertUserTrialSchema,
  getCurrentMonth,
  generateUsageId,
  generateTrialId,
  type UserMonthlyUsage,
  type UserTrial 
} from '@shared/usage-schema';

// Para este ejemplo usaremos storage en memoria
// En un entorno real usarías una base de datos
let usageStorage = new Map<string, UserMonthlyUsage>();
let trialStorage = new Map<string, UserTrial>();

export function registerUsageRoutes(app: any) {
  
  // Obtener uso mensual del usuario
  app.get('/api/usage/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const month = (req.query.month as string) || getCurrentMonth();
      
      console.log(`📊 [USAGE] Getting usage for user: ${userId}, month: ${month}`);
      
      const usageId = generateUsageId(userId, month);
      const usage = usageStorage.get(usageId);
      
      if (!usage) {
        // Crear uso vacío para el mes actual
        const newUsage: UserMonthlyUsage = {
          id: usageId,
          userId,
          month,
          basicEstimates: 0,
          aiEstimates: 0,
          contracts: 0,
          propertyVerifications: 0,
          permitAdvisor: 0,
          projects: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        usageStorage.set(usageId, newUsage);
        return res.json(newUsage);
      }
      
      res.json(usage);
    } catch (error) {
      console.error('❌ [USAGE] Error getting usage:', error);
      res.status(500).json({ error: 'Error getting usage data' });
    }
  });

  // Incrementar uso de una funcionalidad (PROTEGIDO POR AUTENTICACIÓN)
  app.post('/api/usage/increment', async (req: Request, res: Response) => {
    try {
      // Verificar autenticación Firebase ANTES de incrementar uso
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: "Autenticación requerida para incrementar uso",
          code: "NO_AUTH_TOKEN" 
        });
      }

      const token = authHeader.split(' ')[1];
      
      // Para desarrollo, usar modo simulado
      const isDevelopment = process.env.NODE_ENV === 'development';
      let authenticatedUserId: string;
      
      if (isDevelopment) {
        // En desarrollo, requerir autenticación real también
        try {
          const decodedToken = await admin.auth().verifyIdToken(token);
          authenticatedUserId = decodedToken.uid;
          console.log('🔧 [USAGE] Modo desarrollo: usando autenticación real');
        } catch (tokenError) {
          console.error("Error verificando token en desarrollo:", tokenError);
          return res.status(401).json({ 
            error: "Token requerido incluso en desarrollo",
            code: "INVALID_TOKEN" 
          });
        }
      } else {
        // Verificar el token con Firebase Admin en producción
        let decodedToken;
        try {
          decodedToken = await admin.auth().verifyIdToken(token);
          authenticatedUserId = decodedToken.uid;
        } catch (tokenError) {
          console.error("Error verificando token Firebase:", tokenError);
          return res.status(401).json({ 
            error: "Token inválido",
            code: "INVALID_TOKEN" 
          });
        }
      }

      const { userId, feature, count = 1, month } = req.body;
      
      // CRÍTICO: Verificar que el userId del body coincida con el token autenticado
      if (userId && userId !== authenticatedUserId) {
        console.error(`🚨 [SECURITY] Intento de modificar uso de otro usuario! Token: ${authenticatedUserId}, Body: ${userId}`);
        return res.status(403).json({ 
          error: "No puedes modificar el uso de otro usuario",
          code: "FORBIDDEN_USER_MISMATCH" 
        });
      }

      // Usar el userId autenticado si no se proporciona en el body
      const targetUserId = userId || authenticatedUserId;
      
      if (!targetUserId || !feature) {
        return res.status(400).json({ error: 'feature is required' });
      }

      console.log(`📊 [USAGE-SECURED] Incrementando ${feature} por ${count} para usuario autenticado: ${authenticatedUserId}`);
      
      const currentMonth = month || getCurrentMonth();
      const usageId = generateUsageId(targetUserId, currentMonth);
      
      console.log(`📈 [USAGE] Incrementing ${feature} by ${count} for user: ${targetUserId}`);
      
      let usage = usageStorage.get(usageId);
      
      if (!usage) {
        // Crear nuevo registro de uso
        usage = {
          id: usageId,
          userId: targetUserId,
          month: currentMonth,
          basicEstimates: 0,
          aiEstimates: 0,
          contracts: 0,
          propertyVerifications: 0,
          permitAdvisor: 0,
          projects: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      // Incrementar el contador específico
      if (usage.hasOwnProperty(feature)) {
        (usage as any)[feature] += count;
        usage.updatedAt = new Date();
        
        usageStorage.set(usageId, usage);
        
        console.log(`✅ [USAGE] ${feature} incremented. New value: ${(usage as any)[feature]}`);
        res.json(usage);
      } else {
        res.status(400).json({ error: `Invalid feature: ${feature}` });
      }
      
    } catch (error) {
      console.error('❌ [USAGE] Error incrementing usage:', error);
      res.status(500).json({ error: 'Error incrementing usage' });
    }
  });
  
  // 📊 PROPERTY VERIFICATIONS: Endpoint específico para verificaciones de propiedad
  app.post('/api/usage/increment/propertyVerifications', async (req: Request, res: Response) => {
    try {
      // Re-usar la lógica del endpoint general
      req.body.feature = 'propertyVerifications';
      req.body.count = 1;
      
      // Delegar al endpoint principal de incremento
      const originalUrl = req.url;
      req.url = '/api/usage/increment';
      
      console.log('📍 [PROPERTY-VERIFIER] Incrementando uso de Property Verifications via endpoint específico');
      
      // Reusar el handler principal
      return app._router.handle(req, res, () => {});
      
    } catch (error) {
      console.error('❌ [PROPERTY-VERIFIER] Error incrementing property verification usage:', error);
      res.status(500).json({ error: 'Error incrementing property verification usage' });
    }
  });

  // Resetear uso mensual (para testing o nuevo mes)
  app.post('/api/usage/reset/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const month = getCurrentMonth();
      
      const usageId = generateUsageId(userId, month);
      
      const resetUsage: UserMonthlyUsage = {
        id: usageId,
        userId,
        month,
        basicEstimates: 0,
        aiEstimates: 0,
        contracts: 0,
        propertyVerifications: 0,
        permitAdvisor: 0,
        projects: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      usageStorage.set(usageId, resetUsage);
      
      console.log(`🔄 [USAGE] Reset usage for user: ${userId}, month: ${month}`);
      res.json(resetUsage);
      
    } catch (error) {
      console.error('❌ [USAGE] Error resetting usage:', error);
      res.status(500).json({ error: 'Error resetting usage' });
    }
  });

  // Crear trial para usuario
  app.post('/api/usage/create-trial', async (req: Request, res: Response) => {
    try {
      const { userId, planId = 4, durationDays = 21 } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      
      // Verificar si ya tiene un trial activo
      const existingTrial = Array.from(trialStorage.values())
        .find(trial => trial.userId === userId && trial.status === 'active');
      
      if (existingTrial) {
        return res.status(400).json({ 
          error: 'User already has an active trial',
          trial: existingTrial 
        });
      }
      
      const now = new Date();
      const endDate = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000));
      
      const trial: UserTrial = {
        id: generateTrialId(userId),
        userId,
        planId,
        startDate: now,
        endDate,
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      
      trialStorage.set(trial.id, trial);
      
      console.log(`🎯 [USAGE] Created trial for user: ${userId}, expires: ${endDate}`);
      res.json(trial);
      
    } catch (error) {
      console.error('❌ [USAGE] Error creating trial:', error);
      res.status(500).json({ error: 'Error creating trial' });
    }
  });

  // Obtener trial del usuario
  app.get('/api/usage/trial/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const trial = Array.from(trialStorage.values())
        .find(trial => trial.userId === userId);
      
      if (!trial) {
        return res.status(404).json({ error: 'No trial found for user' });
      }
      
      // Verificar si ha expirado
      const now = new Date();
      if (trial.endDate < now && trial.status === 'active') {
        trial.status = 'expired';
        trial.updatedAt = now;
        trialStorage.set(trial.id, trial);
      }
      
      res.json(trial);
      
    } catch (error) {
      console.error('❌ [USAGE] Error getting trial:', error);
      res.status(500).json({ error: 'Error getting trial data' });
    }
  });

  // Obtener estadísticas de uso para dashboard
  app.get('/api/usage/stats/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const month = getCurrentMonth();
      
      const usageId = generateUsageId(userId, month);
      const usage = usageStorage.get(usageId);
      
      if (!usage) {
        return res.json({
          month,
          totalUsage: 0,
          breakdown: {
            basicEstimates: 0,
            aiEstimates: 0,
            contracts: 0,
            propertyVerifications: 0,
            permitAdvisor: 0,
            projects: 0
          }
        });
      }
      
      const totalUsage = Object.values(usage)
        .filter(val => typeof val === 'number')
        .reduce((sum: number, val) => sum + (val as number), 0);
      
      res.json({
        month,
        totalUsage,
        breakdown: {
          basicEstimates: usage.basicEstimates,
          aiEstimates: usage.aiEstimates,
          contracts: usage.contracts,
          propertyVerifications: usage.propertyVerifications,
          permitAdvisor: usage.permitAdvisor,
          projects: usage.projects
        }
      });
      
    } catch (error) {
      console.error('❌ [USAGE] Error getting stats:', error);
      res.status(500).json({ error: 'Error getting usage stats' });
    }
  });

  console.log('📊 [USAGE] Usage API routes registered successfully');
}
  // Obtener resumen de uso actual del usuario autenticado (usa productionUsageService)
  app.get('/api/usage/current', async (req: Request, res: Response) => {
    try {
      // Verificar autenticación
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: "Autenticación requerida",
          code: "NO_AUTH_TOKEN" 
        });
      }

      const token = authHeader.split(' ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const uid = decodedToken.uid;

      // Importar productionUsageService dinámicamente
      const { productionUsageService } = await import('../services/productionUsageService.js');
      
      // Obtener resumen de uso
      const usageSummary = await productionUsageService.getUsageSummary(uid);
      
      if (!usageSummary) {
        // Si no hay datos, devolver uso vacío
        return res.json({
          uid,
          planName: 'primo',
          planId: 1,
          used: {
            basicEstimates: 0,
            aiEstimates: 0,
            contracts: 0,
            propertyVerifications: 0,
            permitAdvisor: 0,
            projects: 0,
            invoices: 0,
            paymentTracking: 0,
            deepsearch: 0
          },
          limits: {
            basicEstimates: 5,
            aiEstimates: 2,
            contracts: 0,
            propertyVerifications: 0,
            permitAdvisor: 0,
            projects: 5,
            invoices: 0,
            paymentTracking: 0,
            deepsearch: 3
          }
        });
      }

      res.json(usageSummary);
    } catch (error) {
      console.error('❌ [USAGE] Error getting current usage:', error);
      res.status(500).json({ error: 'Error getting usage data' });
    }
  });
