/**
 * Endpoints para gestión de límites de uso y validación de suscripciones
 * Actualizado para usar productionUsageService (Firebase) en lugar de usageTracker (en memoria)
 */

import { Router, Request, Response } from 'express';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { firebaseSubscriptionService } from '../services/firebaseSubscriptionService';
import { productionUsageService } from '../services/productionUsageService';
import { PLAN_LIMITS } from '../../shared/permissions-config';

const router = Router();

// Obtener límites actuales y uso del usuario
router.get('/current', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    if (!req.firebaseUser?.uid) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const userId = req.firebaseUser.uid;
    console.log(`📊 [USAGE-LIMITS] Obteniendo límites para usuario: ${userId}`);
    
    const subscription = await firebaseSubscriptionService.getUserSubscription(userId);
    
    if (!subscription) {
      console.log(`❌ [USAGE-LIMITS] Suscripción no encontrada para usuario: ${userId}`);
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    console.log(`✅ [USAGE-LIMITS] Suscripción encontrada: Plan ${subscription.planId} (${subscription.planName})`);

    // Obtener límites del plan desde permissions-config
    const planPermissions = PLAN_LIMITS[subscription.planId] || PLAN_LIMITS[5]; // Default to Free
    
    // Obtener uso actual desde Firebase
    const usageSummary = await productionUsageService.getUsageSummary(userId);
    
    const deepsearchUsage = usageSummary?.used.deepsearch || 0;
    const deepsearchFullCostsUsage = 0; // No existe en el nuevo sistema
    const propertyVerificationUsage = usageSummary?.used.propertyVerifications || 0;
    const contractsUsage = usageSummary?.used.contracts || 0;
    const estimatesUsage = usageSummary?.used.aiEstimates || 0;
    const permitAdvisorUsage = usageSummary?.used.permitAdvisor || 0;

    console.log(`📊 [USAGE-LIMITS] Uso actual:`, {
      deepsearch: deepsearchUsage,
      deepsearchFullCosts: deepsearchFullCostsUsage,
      propertyVerification: propertyVerificationUsage
    });

    // Calcular remaining
    const calculateRemaining = (limit: number, used: number) => {
      if (limit === -1) return -1; // Unlimited
      return Math.max(0, limit - used);
    };

    const limits = {
      deepsearch: planPermissions.deepsearch || 0,
      deepsearchFullCosts: planPermissions.deepsearchFullCosts || 0,
      propertyVerification: planPermissions.propertyVerification || 0,
      contracts: planPermissions.contracts || 0,
      aiEstimates: planPermissions.aiEstimates || 0,
      permitAdvisor: planPermissions.permitAdvisor || 0
    };

    const currentUsage = {
      deepsearch: deepsearchUsage,
      deepsearchFullCosts: deepsearchFullCostsUsage,
      propertyVerification: propertyVerificationUsage,
      contracts: contractsUsage,
      aiEstimates: estimatesUsage,
      permitAdvisor: permitAdvisorUsage
    };

    const remaining = {
      deepsearch: calculateRemaining(limits.deepsearch, currentUsage.deepsearch),
      deepsearchFullCosts: calculateRemaining(limits.deepsearchFullCosts, currentUsage.deepsearchFullCosts),
      propertyVerification: calculateRemaining(limits.propertyVerification, currentUsage.propertyVerification),
      contracts: calculateRemaining(limits.contracts, currentUsage.contracts),
      aiEstimates: calculateRemaining(limits.aiEstimates, currentUsage.aiEstimates),
      permitAdvisor: calculateRemaining(limits.permitAdvisor, currentUsage.permitAdvisor)
    };

    console.log(`✅ [USAGE-LIMITS] Límites calculados correctamente`);

    res.json({
      planId: subscription.planId,
      planName: subscription.planName,
      isPlatformOwner: subscription.isPlatformOwner || false,
      limits,
      currentUsage,
      remaining
    });
  } catch (error) {
    console.error('❌ [USAGE-LIMITS] Error obteniendo límites de uso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para obtener uso detallado de una feature específica
router.get('/feature/:featureName', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    if (!req.firebaseUser?.uid) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const userId = req.firebaseUser.uid;
    const featureName = req.params.featureName;

    console.log(`📊 [USAGE-LIMITS] Obteniendo uso de feature '${featureName}' para usuario: ${userId}`);

    const subscription = await firebaseSubscriptionService.getUserSubscription(userId);
    
    if (!subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    const planPermissions = PLAN_LIMITS[subscription.planId] || PLAN_LIMITS[5];
    const limit = planPermissions[featureName as keyof typeof planPermissions] as number || 0;
    const usageSummary = await productionUsageService.getUsageSummary(userId);
    const featureKey = featureName as keyof typeof usageSummary.used;
    const used = usageSummary?.used[featureKey] || 0;
    const remaining = limit === -1 ? -1 : Math.max(0, limit - used);

    res.json({
      featureName,
      limit,
      used,
      remaining,
      isUnlimited: limit === -1
    });
  } catch (error) {
    console.error(`❌ [USAGE-LIMITS] Error obteniendo uso de feature:`, error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
