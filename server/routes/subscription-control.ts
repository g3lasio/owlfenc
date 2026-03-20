import { Request, Response } from 'express';
import { subscriptionControlService } from '../services/subscriptionControlService';
import { robustSubscriptionService } from '../services/robustSubscriptionService';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { userMappingService } from '../services/userMappingService';
import { DatabaseStorage } from '../DatabaseStorage';
import { createStripeClient } from '../config/stripe.js';
import { walletService } from '../services/walletService.js';
import { getPlanIdFromPriceId } from '../config/stripePriceRegistry.js';
import { PLAN_MONTHLY_CREDITS } from '@shared/wallet-schema';

// Inicializar UserMappingService
const databaseStorage = new DatabaseStorage();
// Using singleton userMappingService from import

/**
 * NUEVAS RUTAS PARA CONTROL ROBUSTO DE SUSCRIPCIONES
 * Reemplazan el sistema fragmentado de Maps en memoria
 */

// ⚡ In-memory cache for suspension status — avoids a Firestore read on every request
// TTL: 5 minutes. Cache is invalidated automatically when a webhook updates the user's status.
const suspensionCache = new Map<string, { data: object; expiresAt: number }>();
const SUSPENSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
        const mappingResult = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
        userId = mappingResult?.id || null;
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
        const mappingResult = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
        userId = mappingResult?.id || null;
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
        const mappingResult = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
        userId = mappingResult?.id || null;
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
        const mappingResult = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
        userId = mappingResult?.id || null;
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

  // Activar plan gratuito (Primo Chambeador) directamente
  app.post('/api/subscription/activate-free-plan', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const { planId } = req.body;
      
      // 🔐 SECURITY: Obtener userId del usuario autenticado
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Usuario no autenticado', success: false });
      }

      let userId = await userMappingService.getInternalUserId(firebaseUid);
      if (!userId) {
        const mappingResult = await userMappingService.createMapping(
          firebaseUid, 
          req.firebaseUser?.email || `${firebaseUid}@firebase.auth`
        );
        userId = mappingResult?.id || null;
      }

      if (!userId) {
        return res.status(500).json({ error: 'Error creando mapeo de usuario', success: false });
      }

      console.log(`🆓 [SUBSCRIPTION-CONTROL] Activating free plan ${planId} for user ${userId}`);

      // Verificar que el plan sea gratuito (ID 5 = Primo Chambeador)
      if (planId !== 5) {
        return res.status(400).json({ 
          error: 'Este endpoint solo puede activar el plan gratuito Primo Chambeador',
          success: false 
        });
      }

      // Activar el plan gratuito usando robustSubscriptionService
      const subscriptionData = await robustSubscriptionService.activateUserPlan(userId, planId);
      
      console.log(`✅ [SUBSCRIPTION-CONTROL] Plan gratuito activado exitosamente para usuario ${userId}`);
      
      res.json({
        success: true,
        message: 'Plan gratuito Primo Chambeador activado correctamente',
        planId: subscriptionData.planId,
        planName: subscriptionData.planName,
        status: subscriptionData.status,
        isActive: subscriptionData.isActive
      });

    } catch (error) {
      console.error('❌ [SUBSCRIPTION-CONTROL] Error activating free plan:', error);
      res.status(500).json({ 
        error: 'Error activating free plan',
        success: false 
      });
    }
  });

  // Verificar estado de suspensión por pago fallido
  app.get('/api/subscription/suspension-status', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Usuario no autenticado', success: false });
      }

      // ⚡ Cache hit: return cached result if still valid
      const cached = suspensionCache.get(firebaseUid);
      if (cached && Date.now() < cached.expiresAt) {
        return res.json(cached.data);
      }

      console.log(`🔍 [SUSPENSION-CHECK] Checking suspension status for user: ${firebaseUid}`);
      // Import Firebase Admin
      const { db: firebaseDb } = await import('../lib/firebase-admin.js');;
      
      // Check Firestore entitlements for downgrade reason
      const entitlementsDoc = await firebaseDb.collection('entitlements').doc(firebaseUid).get();
      
      if (!entitlementsDoc.exists) {
        console.log(`ℹ️ [SUSPENSION-CHECK] No entitlements found for user ${firebaseUid}`);
        const noSuspensionResult = {
          success: true,
          isSuspended: false,
          reason: null,
          message: 'No suspension found'
        };
        // ⚡ Cache the result for 5 minutes
        suspensionCache.set(firebaseUid, { data: noSuspensionResult, expiresAt: Date.now() + SUSPENSION_CACHE_TTL });
        return res.json(noSuspensionResult);
      }

      const entitlements = entitlementsDoc.data();
      const downgradedReason = entitlements?.downgradedReason;
      const downgradedAt = entitlements?.downgradedAt;
      const planId = entitlements?.planId;

      // Check if user was downgraded due to payment issues
      const isSuspended = downgradedReason && [
        'payment_failed',
        'subscription_inactive',
        'subscription_canceled'
      ].includes(downgradedReason);

      console.log(`📊 [SUSPENSION-CHECK] User ${firebaseUid} - Suspended: ${isSuspended}, Reason: ${downgradedReason}`);

      const suspensionResult = {
        success: true,
        isSuspended: !!isSuspended,
        reason: downgradedReason || null,
        downgradedAt: downgradedAt ? new Date(downgradedAt._seconds * 1000).toISOString() : null,
        currentPlanId: planId || 5, // Default to Primo Chambeador
        message: isSuspended ? 'Account suspended due to payment issues' : 'Account active'
      };
      // ⚡ Cache the result for 5 minutes (suspended users get shorter cache to re-check sooner)
      const cacheTTL = isSuspended ? 60 * 1000 : SUSPENSION_CACHE_TTL; // 1 min if suspended, 5 min if active
      suspensionCache.set(firebaseUid, { data: suspensionResult, expiresAt: Date.now() + cacheTTL });
      res.json(suspensionResult);

    } catch (error) {
      console.error('❌ [SUSPENSION-CHECK] Error checking suspension status:', error);
      res.status(500).json({ 
        error: 'Error checking suspension status',
        success: false 
      });
    }
  });

  // ================================================================
  // ⚡ POST /api/subscription/confirm
  // Instant credit grant when user returns from Stripe subscription checkout.
  // Verifies the Stripe Checkout Session, activates the plan, and grants
  // the first month's credits immediately — without waiting for the webhook.
  // Idempotent: safe to call multiple times for the same session.
  // ================================================================
  app.post('/api/subscription/confirm', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const firebaseUid = req.firebaseUser?.uid;
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Authentication required', success: false });
      }

      const { session_id: sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: 'session_id is required', success: false });
      }

      console.log(`⚡ [SUB-CONFIRM] Confirming subscription for ${firebaseUid}, session: ${sessionId}`);

      const stripe = createStripeClient();

      // 1. Retrieve the Checkout Session from Stripe
      let session: any;
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['subscription', 'subscription.items.data.price'],
        });
      } catch (stripeErr: any) {
        console.error('❌ [SUB-CONFIRM] Failed to retrieve Stripe session:', stripeErr.message);
        return res.status(400).json({ error: 'Invalid or expired session_id', success: false });
      }

      // 2. Verify payment was successful
      if (session.payment_status !== 'paid' && session.status !== 'complete') {
        return res.json({
          success: true,
          creditsGranted: false,
          message: 'Payment not yet completed',
          paymentStatus: session.payment_status,
        });
      }

      // 3. Determine the plan from the subscription's price ID
      const subscription = session.subscription as any;
      const priceId = subscription?.items?.data?.[0]?.price?.id;
      const planId = priceId ? getPlanIdFromPriceId(priceId) : null;
      const planCredits = (PLAN_MONTHLY_CREDITS as Record<number, number>);
      const monthlyCredits = planId ? (planCredits[planId] || 0) : 0;
      const planName = planId ? `Plan ${planId}` : 'Unknown';

      // 4. Ensure user exists in PostgreSQL and has a wallet
      try {
        const email = req.firebaseUser?.email || '';
        await userMappingService.getOrCreateUserIdForFirebaseUid(firebaseUid, email);
        await walletService.getOrCreateWallet(firebaseUid);
      } catch (userErr) {
        console.warn(`⚠️  [SUB-CONFIRM] Could not ensure PG user/wallet:`, userErr);
      }

      // 5. Grant first-month credits instantly (idempotent)
      let creditsGranted = false;
      let creditsAmount = 0;

      if (monthlyCredits > 0 && subscription?.id) {
        const invoiceId = session.invoice || `checkout:${sessionId}`;
        const idempotencyKey = `subscription_grant:${subscription.id}:${invoiceId}`;

        const grantResult = await walletService.addCredits({
          firebaseUid,
          amountCredits: monthlyCredits,
          type: 'subscription_grant',
          description: `First month credits — ${planName} (${monthlyCredits} credits)`,
          idempotencyKey,
          subscriptionPlanId: planId || undefined,
          metadata: {
            planId,
            planName,
            sessionId,
            subscriptionId: subscription.id,
            source: 'subscription_confirm_instant',
          },
        });

        if (grantResult.success) {
          creditsGranted = true;
          creditsAmount = grantResult.creditsAdded;
          console.log(`✅ [SUB-CONFIRM] Granted ${creditsAmount} credits to ${firebaseUid} for ${planName}`);
        }
      }

      // 6. Return result with current balance
      const currentBalance = await walletService.getBalance(firebaseUid);

      return res.json({
        success: true,
        creditsGranted,
        creditsAmount,
        planId,
        planName,
        currentBalance,
        subscriptionId: subscription?.id,
      });

    } catch (error) {
      console.error('❌ [SUB-CONFIRM] Error confirming subscription:', error);
      return res.status(500).json({ error: 'Failed to confirm subscription', success: false });
    }
  });
}