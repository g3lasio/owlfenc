/**
 * Endpoints para gestión de límites de uso y validación de suscripciones
 */

import { Router, Request, Response } from 'express';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { usageTracker } from '../middleware/usage-tracking';
import { firebaseSubscriptionService } from '../services/firebaseSubscriptionService';

const router = Router();

// Obtener límites actuales y uso del usuario
router.get('/current', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    if (!req.firebaseUser?.uid) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const userId = `user_${req.firebaseUser.email?.replace(/[@.]/g, '_')}`;
    const subscription = await firebaseSubscriptionService.getUserSubscription(userId);
    
    if (!subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    // Obtener límites del plan
    const planLimits = {
      1: {
        estimatesBasic: 10,
        estimatesAI: 3,
        contracts: 3,
        propertyVerification: 5,
        permitAdvisor: 5,
      },
      2: {
        estimatesBasic: -1,
        estimatesAI: 50,
        contracts: -1,
        propertyVerification: 50,
        permitAdvisor: 50,
      },
      3: {
        estimatesBasic: -1,
        estimatesAI: -1,
        contracts: -1,
        propertyVerification: -1,
        permitAdvisor: -1,
      },
      4: {
        estimatesBasic: -1,
        estimatesAI: -1,
        contracts: -1,
        propertyVerification: -1,
        permitAdvisor: -1,
      }
    };

    const limits = planLimits[subscription.planId as keyof typeof planLimits] || planLimits[1];
    
    // Obtener uso actual
    const currentUsage = {
      estimatesBasic: usageTracker.getUsage(userId, 'basic-estimates'),
      estimatesAI: usageTracker.getUsage(userId, 'ai-estimates'),
      contracts: usageTracker.getUsage(userId, 'contracts'),
      propertyVerification: usageTracker.getUsage(userId, 'property-verification'),
      permitAdvisor: usageTracker.getUsage(userId, 'permit-advisor'),
    };

    res.json({
      planId: subscription.planId,
      planName: subscription.planId === 1 ? 'Primo Chambeador' : 
                subscription.planId === 2 ? 'Mero Patrón' :
                subscription.planId === 3 ? 'Master Contractor' : 'Trial Master',
      limits,
      currentUsage,
      remaining: {
        estimatesBasic: limits.estimatesBasic === -1 ? -1 : Math.max(0, limits.estimatesBasic - currentUsage.estimatesBasic),
        estimatesAI: limits.estimatesAI === -1 ? -1 : Math.max(0, limits.estimatesAI - currentUsage.estimatesAI),
        contracts: limits.contracts === -1 ? -1 : Math.max(0, limits.contracts - currentUsage.contracts),
        propertyVerification: limits.propertyVerification === -1 ? -1 : Math.max(0, limits.propertyVerification - currentUsage.propertyVerification),
        permitAdvisor: limits.permitAdvisor === -1 ? -1 : Math.max(0, limits.permitAdvisor - currentUsage.permitAdvisor),
      }
    });
  } catch (error) {
    console.error('Error obteniendo límites de uso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Resetear contadores de uso (solo para testing o administradores)
router.post('/reset', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    if (!req.firebaseUser?.uid) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const userId = `user_${req.firebaseUser.email?.replace(/[@.]/g, '_')}`;
    
    // Solo permitir reseteo para administradores o en modo desarrollo
    const isAdmin = req.firebaseUser.email?.includes('shkwahab60') || req.firebaseUser.email?.includes('marcos@ruiz.com');
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Solo administradores pueden resetear contadores' });
    }

    usageTracker.resetMonthlyUsage(userId);
    
    res.json({
      success: true,
      message: 'Contadores de uso reseteados exitosamente'
    });
  } catch (error) {
    console.error('Error reseteando contadores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;