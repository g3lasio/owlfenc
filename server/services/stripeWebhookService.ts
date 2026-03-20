/**
 * STRIPE WEBHOOK SERVICE
 * Handles Stripe webhook events for automatic plan management
 * Integrates with trial notification service for downgrades
 */

import Stripe from 'stripe';
import { db, admin } from '../lib/firebase-admin.js';
import { trialNotificationService } from './trialNotificationService.js';
import { productionUsageService } from './productionUsageService.js';
import { securityOptimizationService } from './securityOptimizationService.js';
import { createStripeClient } from '../config/stripe.js';
import { getPlanIdFromPriceId } from '../config/stripePriceRegistry.js';
import { db as pgDb } from '../db.js';
import { users, userSubscriptions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { walletService } from './walletService.js';
import { PLAN_IDS, PLAN_LIMITS, PLAN_NAMES } from '@shared/permissions-config';
import { resendService } from './resendService.js';
import { subscriptionEmailService } from './subscriptionEmailService';

// Initialize Stripe with centralized configuration
const stripe = createStripeClient();

export interface WebhookResult {
  success: boolean;
  eventType: string;
  eventId: string;
  userId?: string;
  action?: string;
  error?: string;
}

/**
 * TESTABLE HELPER: Mark trial usage for subscription
 * Exported for integration testing
 * @param uid Firebase UID of user
 * @param subscription Stripe subscription object
 */
export async function markTrialUsageForSubscription(
  uid: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const hasTrial = subscription.status === 'trialing' || 
                  (subscription.trial_end && subscription.trial_end > Math.floor(Date.now() / 1000));
  
  if (hasTrial) {
    console.log(`🎁 [TRIAL-HELPER] Marking hasUsedTrial=true for user: ${uid}`);
    
    if (!pgDb) {
      console.error(`🚨 [TRIAL-HELPER] CRITICAL: PostgreSQL unavailable`);
      throw new Error('PostgreSQL unavailable - cannot persist trial flag');
    }
    
    const updateResult = await pgDb
      .update(users)
      .set({ 
        hasUsedTrial: true,
        trialStartDate: new Date()
      })
      .where(eq(users.firebaseUid, uid));
    
    // ✅ FAIL-FAST: If no rows updated, user doesn't exist in PostgreSQL
    if (!updateResult.rowCount || updateResult.rowCount === 0) {
      console.error(`🚨 [TRIAL-HELPER] CRITICAL: User ${uid} not found in PostgreSQL`);
      throw new Error(`User ${uid} not found in PostgreSQL`);
    }
    
    console.log(`✅ [TRIAL-HELPER] Successfully marked hasUsedTrial=true for user: ${uid}`);
  }
}

export class StripeWebhookService {
  
  /**
   * Process Stripe webhook event
   */
  async processWebhookEvent(
    body: Buffer, 
    signature: string, 
    endpointSecret: string
  ): Promise<WebhookResult> {
    try {
      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
      
      console.log(`🔗 [STRIPE-WEBHOOK] Processing event: ${event.type} (${event.id})`);
      
      const result: WebhookResult = {
        success: false,
        eventType: event.type,
        eventId: event.id
      };
      
      // Route to appropriate handler based on event type
      switch (event.type) {
        // Subscription events
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event, result);
          break;
          
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event, result);
          break;
          
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCanceled(event, result);
          break;
          
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event, result);
          // WALLET: Grant monthly credits after successful subscription payment
          await this.handleWalletSubscriptionGrant(event, result);
          break;
          
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event, result);
          break;
        
        // Payment Tracker events (Checkout Sessions for contractor payments)
        // WALLET: Top-Up checkout sessions are handled here too (type: 'credit_topup')
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event, result);
          break;
          
        // WALLET: Fraud / chargeback — auto-lock wallet
        case 'charge.dispute.created':
          await this.handleChargeDisputeCreated(event, result);
          break;
          
        case 'checkout.session.expired':
          await this.handleCheckoutSessionExpired(event, result);
          break;
          
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event, result);
          break;
          
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event, result);
          break;
          
        case 'account.updated':
          await this.handleAccountUpdated(event, result);
          break;
          
        default:
          console.log(`ℹ️ [STRIPE-WEBHOOK] Unhandled event type: ${event.type}`);
          result.success = true; // Don't fail for unhandled events
          break;
      }
      
      // Log webhook event for audit
      await this.logWebhookEvent(event, result);
      
      return result;
      
    } catch (error) {
      console.error('❌ [STRIPE-WEBHOOK] Error processing webhook:', error);
      
      return {
        success: false,
        eventType: 'unknown',
        eventId: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // ================================
  // WALLET HANDLERS — PAY AS YOU GROW
  // ================================

  /**
   * WALLET: Grant monthly credits when subscription invoice is paid.
   * Idempotent — uses invoiceId as idempotency key.
   */
  private async handleWalletSubscriptionGrant(event: Stripe.Event, result: WebhookResult): Promise<void> {
    try {
      const invoice = event.data.object as Stripe.Invoice;
      
      // Solo procesar invoices de suscripción (no one-time)
      if (!invoice.subscription) return;
      
      const customerId = invoice.customer as string;
      const user = await this.findUserByStripeCustomerId(customerId);
      
      if (!user?.uid) {
        console.warn(`⚠️  [WALLET-WEBHOOK] User not found for customer ${customerId} — skipping grant`);
        return;
      }
      
      // Obtener el plan del usuario
      const subResult = await pgDb?.execute(sql`
        SELECT us.plan_id, sp.monthly_credits_grant, sp.name
        FROM user_subscriptions us
        JOIN subscription_plans sp ON sp.id = us.plan_id
        JOIN users u ON u.id = us.user_id
        WHERE u.firebase_uid = ${user.uid}
          AND us.status IN ('active', 'trialing')
        ORDER BY us.updated_at DESC
        LIMIT 1
      `);
      
      if (!subResult?.rows.length) {
        console.warn(`⚠️  [WALLET-WEBHOOK] No active subscription found for ${user.uid}`);
        return;
      }
      
      const planId = subResult.rows[0].plan_id as number;
      const creditsGrant = subResult.rows[0].monthly_credits_grant as number;
      
      if (!creditsGrant || creditsGrant === 0) {
        console.log(`ℹ️  [WALLET-WEBHOOK] Plan ${planId} has 0 credits grant — skipping`);
        return;
      }
      
      // Asegurar que la wallet existe
      await walletService.getOrCreateWallet(user.uid);
      
      // Calcular expiración: 60 días tras fin del período
      const periodEnd = invoice.period_end 
        ? new Date(invoice.period_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      await walletService.grantMonthlySubscriptionCredits(
        user.uid,
        planId,
        periodEnd,
        invoice.id || 'unknown',
        invoice.subscription as string
      );
      
      console.log(`🎁 [WALLET-WEBHOOK] Granted ${creditsGrant} monthly credits to ${user.uid}`);
      
    } catch (error) {
      // No fallar el webhook por errores de wallet
      console.error('❌ [WALLET-WEBHOOK] Error granting subscription credits (non-fatal):', error);
    }
  }

  /**
   * WALLET: Handle charge dispute (fraud/chargeback) — auto-lock wallet.
   */
  private async handleChargeDisputeCreated(event: Stripe.Event, result: WebhookResult): Promise<void> {
    try {
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
      
      if (!chargeId) {
        result.success = true;
        return;
      }
      
      // Obtener el PaymentIntent para encontrar el usuario
      const stripe = createStripeClient();
      const charge = await stripe.charges.retrieve(chargeId);
      const customerId = charge.customer as string;
      
      if (!customerId) {
        result.success = true;
        return;
      }
      
      const user = await this.findUserByStripeCustomerId(customerId);
      
      if (user?.uid) {
        await walletService.lockWallet(
          user.uid,
          `Chargeback dispute created: ${dispute.id} (${dispute.reason})`
        );
        console.log(`🔒 [WALLET-WEBHOOK] Auto-locked wallet for ${user.uid} due to chargeback`);
      }
      
      result.success = true;
      result.action = 'wallet_locked_chargeback';
      
    } catch (error) {
      console.error('❌ [WALLET-WEBHOOK] Error handling dispute (non-fatal):', error);
      result.success = true; // No fallar el webhook
    }
  }

  /**
   * Handle payment failure - log and notify, Stripe Smart Retries will handle attempts
   * Downgrade only happens on subscription.deleted after 3 failed attempts
   */
  private async handlePaymentFailed(event: Stripe.Event, result: WebhookResult): Promise<void> {
    try {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const attemptCount = invoice.attempt_count || 1;
      
      console.log(`💳 [STRIPE-WEBHOOK] Payment failed for customer: ${customerId} (Attempt ${attemptCount}/3)`);
      
      // Find user by Stripe customer ID
      const user = await this.findUserByStripeCustomerId(customerId);
      
      if (!user) {
        console.warn(`⚠️ [STRIPE-WEBHOOK] User not found for Stripe customer: ${customerId}`);
        result.success = true; // Don't fail webhook if user not found
        return;
      }
      
      const uid = user.uid;
      result.userId = uid;
      
      // Get current entitlements
      const entitlementsDoc = await db.collection('entitlements').doc(uid).get();
      
      if (!entitlementsDoc.exists()) {
        console.warn(`⚠️ [STRIPE-WEBHOOK] Entitlements not found for user: ${uid}`);
        result.success = true;
        return;
      }
      
      const currentEntitlements = entitlementsDoc.data();
      const currentPlan = currentEntitlements?.planName;
      const freePlanName = PLAN_NAMES[PLAN_IDS.PRIMO_CHAMBEADOR];
      
      // Don't process if already on free plan
      if (currentPlan === freePlanName) {
        console.log(`ℹ️ [STRIPE-WEBHOOK] User ${uid} already on free plan (${freePlanName})`);
        result.success = true;
        result.action = 'already_on_free_plan';
        return;
      }
      
      // ✅ NEW LOGIC: Only log payment failure, don't downgrade yet
      // Stripe Smart Retries will attempt 3 times before canceling subscription
      console.log(`⚠️ [STRIPE-WEBHOOK] Payment failed (attempt ${attemptCount}/3) for user ${uid}`);
      console.log(`📧 [STRIPE-WEBHOOK] Stripe will retry payment automatically`);
      
      // Send notification email to user about failed payment
      try {
        await subscriptionEmailService.sendPaymentFailedEmail(
          user.email || '',
          user.displayName || 'User',
          attemptCount,
          currentPlan
        );
        console.log(`📧 [STRIPE-WEBHOOK] Sent payment failure notification to ${user.email}`);
      } catch (emailError) {
        console.error(`❌ [STRIPE-WEBHOOK] Failed to send payment failure email:`, emailError);
        // Don't fail webhook if email fails
      }
      
      result.success = true;
      result.action = `payment_failed_attempt_${attemptCount}`;
      
      console.log(`✅ [STRIPE-WEBHOOK] Logged payment failure for user ${uid}, waiting for Stripe retries`);
      
    } catch (error) {
      console.error('❌ [STRIPE-WEBHOOK] Error handling payment failure:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }
  
  /**
   * Handle subscription update - update entitlements accordingly
   */
  private async handleSubscriptionUpdated(event: Stripe.Event, result: WebhookResult): Promise<void> {
    try {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      console.log(`🔄 [STRIPE-WEBHOOK] Subscription updated for customer: ${customerId}`);
      
      const user = await this.findUserByStripeCustomerId(customerId);
      
      if (!user) {
        console.warn(`⚠️ [STRIPE-WEBHOOK] User not found for subscription update: ${customerId}`);
        result.success = true;
        return;
      }
      
      const uid = user.uid;
      result.userId = uid;
      
      // Get current entitlements for security operations
      const entitlementsDoc = await db.collection('entitlements').doc(uid).get();
      const currentEntitlements = entitlementsDoc.exists() ? entitlementsDoc.data() : null;
      const oldPlan = currentEntitlements?.planName || PLAN_NAMES[PLAN_IDS.PRIMO_CHAMBEADOR];
      
      // Update user entitlements based on subscription status
      if (subscription.status === 'active') {
        const planInfo = this.determinePlanFromSubscription(subscription);
        await this.upgradeUserFromSubscription(uid, subscription);
        result.action = 'upgraded_from_subscription';
        
        // Execute security operations for plan upgrade
        await securityOptimizationService.handlePlanChangeSecurityOperations(
          uid,
          oldPlan,
          planInfo.planName,
          'stripe_upgrade',
          undefined, // IP not available in webhook
          undefined  // User agent not available in webhook
        );
        
      } else if (['past_due', 'canceled', 'unpaid'].includes(subscription.status)) {
        if (entitlementsDoc.exists()) {
          await this.downgradeUserToFreePlan(uid, entitlementsDoc.data(), 'subscription_inactive');
          result.action = 'downgraded_subscription_inactive';
          
          // Execute security operations for plan downgrade
          await securityOptimizationService.handlePlanChangeSecurityOperations(
            uid,
            oldPlan,
            PLAN_NAMES[PLAN_IDS.PRIMO_CHAMBEADOR],
            'stripe_downgrade',
            undefined, // IP not available in webhook
            undefined  // User agent not available in webhook
          );
        }
      }
      
      result.success = true;
      
    } catch (error) {
      console.error('❌ [STRIPE-WEBHOOK] Error handling subscription update:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }
  
  /**
   * Handle subscription cancellation - immediate downgrade
   */
  private async handleSubscriptionCanceled(event: Stripe.Event, result: WebhookResult): Promise<void> {
    try {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // ✅ FIX: Respect cancel_at_period_end.
      // When a user cancels, Stripe first fires customer.subscription.updated with
      // cancel_at_period_end=true (subscription still active). The actual
      // customer.subscription.deleted event fires only when the period ends.
      // We must NOT downgrade the user on the .updated event if cancel_at_period_end=true.
      // This handler only fires for the .deleted event, so the subscription is truly ended.
      // However, we double-check the status to be safe.
      if (subscription.status === 'canceled' && subscription.cancel_at_period_end) {
        // This should not happen (cancel_at_period_end is cleared when subscription ends),
        // but guard against it just in case.
        console.log(`ℹ️  [STRIPE-WEBHOOK] Subscription ${subscription.id} has cancel_at_period_end=true but status=canceled — downgrading now (period ended)`);
      }

      console.log(`❌ [STRIPE-WEBHOOK] Subscription truly ended for customer: ${customerId} (status: ${subscription.status})`);
      
      const user = await this.findUserByStripeCustomerId(customerId);
      
      if (!user) {
        console.warn(`⚠️ [STRIPE-WEBHOOK] User not found for subscription cancellation: ${customerId}`);
        result.success = true;
        return;
      }
      
      const uid = user.uid;
      result.userId = uid;
      
      // Get current entitlements and downgrade
      const entitlementsDoc = await db.collection('entitlements').doc(uid).get();
      
      if (entitlementsDoc.exists()) {
        const currentEntitlements = entitlementsDoc.data();
        const oldPlan = currentEntitlements?.planName || PLAN_NAMES[PLAN_IDS.PRIMO_CHAMBEADOR];
        
        await this.downgradeUserToFreePlan(uid, currentEntitlements, 'subscription_canceled');
        result.action = 'downgraded_subscription_canceled';
        
        // Execute security operations for subscription cancellation
        await securityOptimizationService.handlePlanChangeSecurityOperations(
          uid,
          oldPlan,
          PLAN_NAMES[PLAN_IDS.PRIMO_CHAMBEADOR],
          'subscription_canceled',
          undefined, // IP not available in webhook
          undefined  // User agent not available in webhook
        );
      }
      
      result.success = true;
      
    } catch (error) {
      console.error('❌ [STRIPE-WEBHOOK] Error handling subscription cancellation:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }
  
  /**
   * Handle successful payment - ensure user has correct entitlements
   */
  private async handlePaymentSucceeded(event: Stripe.Event, result: WebhookResult): Promise<void> {
    try {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      
      console.log(`✅ [STRIPE-WEBHOOK] Payment succeeded for customer: ${customerId}`);
      
      const user = await this.findUserByStripeCustomerId(customerId);
      
      if (!user) {
        console.warn(`⚠️ [STRIPE-WEBHOOK] User not found for payment success: ${customerId}`);
        result.success = true;
        return;
      }
      
      const uid = user.uid;
      result.userId = uid;
      
      // If there's a subscription, ensure user has correct entitlements
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        await this.upgradeUserFromSubscription(uid, subscription);
        result.action = 'entitlements_verified';
      }
      
      result.success = true;
      
    } catch (error) {
      console.error('❌ [STRIPE-WEBHOOK] Error handling payment success:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }
  
  /**
   * Handle subscription creation - set up entitlements
   */
  private async handleSubscriptionCreated(event: Stripe.Event, result: WebhookResult): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    
    console.log(`🆕 [STRIPE-WEBHOOK] Subscription created for customer: ${customerId}`);
    
    // Detect trial BEFORE user lookup to determine fail-fast behavior
    const hasTrial = subscription.status === 'trialing' || 
                    (subscription.trial_end && subscription.trial_end > Math.floor(Date.now() / 1000));
    
    const user = await this.findUserByStripeCustomerId(customerId);
    
    if (!user) {
      if (hasTrial) {
        // 🚨 CRITICAL: Trial subscription with no resolvable UID → MUST fail webhook
        // This surfaces missing-mapping bugs early and ensures Stripe retries
        console.error(`🚨 [STRIPE-WEBHOOK] CRITICAL: Trial subscription for unknown customer ${customerId} - failing webhook`);
        throw new Error(`Cannot resolve user for trialing subscription ${subscription.id}. Missing customer mapping.`);
      } else {
        // Non-trial subscription - safe to skip (user might not be in our system)
        console.warn(`⚠️ [STRIPE-WEBHOOK] User not found for non-trial subscription: ${customerId}`);
        result.success = true;
        return;
      }
    }
    
    const uid = user.uid;
    result.userId = uid;

    // 🎁 CRITICAL SECTION: Trial tracking - ANY error here fails webhook
    // Stripe will retry until PostgreSQL persists the flag successfully
    
    if (hasTrial) {
      console.log(`🎁 [STRIPE-WEBHOOK] Subscription has FREE TRIAL for user: ${uid}`);
      console.log(`🎁 [STRIPE-WEBHOOK] Trial status: ${subscription.status}, Trial end: ${subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : 'N/A'}`);
      
      // Use testable helper - ANY error will throw and fail webhook
      await markTrialUsageForSubscription(uid, subscription);
      
      console.log(`✅ [STRIPE-WEBHOOK] hasUsedTrial flag PERMANENTLY set for ${uid}`);
      result.action = 'trial_started_flag_set';
    } else {
      console.log(`ℹ️ [STRIPE-WEBHOOK] Subscription created without trial for user: ${uid}`);
    }
    
    // 🔹 NON-CRITICAL SECTION: Entitlements - errors here don't fail webhook
    // We use try-catch to allow graceful degradation for Firebase operations
    try {
      const entitlementsDoc = await db.collection('entitlements').doc(uid).get();
      const freePlanName = PLAN_NAMES[PLAN_IDS.PRIMO_CHAMBEADOR];
      const oldPlan = entitlementsDoc.exists() ? entitlementsDoc.data()?.planName || freePlanName : freePlanName;
      
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        const planInfo = this.determinePlanFromSubscription(subscription);
        await this.upgradeUserFromSubscription(uid, subscription);
        
        if (!result.action) {
          result.action = 'entitlements_created';
        }
        
        await securityOptimizationService.handlePlanChangeSecurityOperations(
          uid,
          oldPlan,
          planInfo.planName,
          'subscription_created',
          undefined,
          undefined
        );
        
        // 🎉 Send subscription confirmation email with Owl Fenc branding
        try {
          console.log('🎉 [STRIPE-WEBHOOK] Sending subscription confirmation email...');
          
          // Get user name from Firebase
          let userName = 'Compa';
          try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists && userDoc.data()?.name) {
              userName = userDoc.data()!.name;
            }
          } catch (nameError) {
            console.warn('⚠️ [STRIPE-WEBHOOK] Could not fetch user name, using default');
          }
          
          // Check if this is an upgrade from a previous plan
          const isUpgrade = oldPlan !== PLAN_NAMES[PLAN_IDS.PRIMO_CHAMBEADOR] && 
                           oldPlan !== 'Free Trial' && 
                           oldPlan !== 'Trial Master';
          
          // Calculate next billing date
          const nextBillingDate = subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          
          // Get plan price in cents
          const planPrice = subscription.items?.data?.[0]?.price?.unit_amount || 0;
          
          // Determine billing cycle
          const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
          const billingCycle: 'monthly' | 'yearly' = interval === 'year' ? 'yearly' : 'monthly';
          
          await subscriptionEmailService.sendSubscriptionConfirmedEmail({
            email: user.email || '',
            userName,
            planName: planInfo.planName,
            planPrice,
            billingCycle,
            nextBillingDate,
            isUpgrade
          });
          
          console.log(`✅ [STRIPE-WEBHOOK] ${isUpgrade ? 'Upgrade' : 'Subscription'} confirmation email sent successfully`);
        } catch (emailError) {
          console.error('⚠️ [STRIPE-WEBHOOK] Non-critical: Failed to send confirmation email:', emailError);
          // Don't fail webhook for email errors
        }
      }
    } catch (entitlementsError) {
      console.error('⚠️ [STRIPE-WEBHOOK] Non-critical error updating entitlements:', entitlementsError);
      // Don't fail webhook - trial flag already persisted successfully
    }
    
    result.success = true;
  }
  
  /**
   * Find user by Stripe customer ID
   * CRITICAL: Does NOT catch errors - database failures propagate to caller
   * This ensures webhook fails when Firebase/PostgreSQL is down
   */
  private async findUserByStripeCustomerId(customerId: string): Promise<{ uid: string; email?: string } | null> {
    // Check if we have a mapping in Firestore
    // Any Firebase error will throw and fail the webhook
    const customerMappingSnapshot = await db.collection('stripe_customers')
      .where('customerId', '==', customerId)
      .limit(1)
      .get();
    
    if (!customerMappingSnapshot.empty) {
      const mapping = customerMappingSnapshot.docs[0].data();
      return {
        uid: mapping.uid,
        email: mapping.email
      };
    }
    
    // If no mapping found, try to get customer details from Stripe
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    
    if (customer.email) {
      // Try to find user by email in Firebase Auth or users collection
      // Any Firebase error will throw and fail the webhook
      const userSnapshot = await db.collection('users')
        .where('email', '==', customer.email)
        .limit(1)
        .get();
      
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        const uid = userSnapshot.docs[0].id;
        
        // Create mapping for future lookups
        await db.collection('stripe_customers').doc(customerId).set({
          customerId,
          uid,
          email: customer.email,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return { uid, email: customer.email };
      }
    }
    
    // User genuinely not found (not an error - just doesn't exist)
    return null;
  }
  
  /**
   * Downgrade user to free plan (uses trial notification service)
   */
  private async downgradeUserToFreePlan(
    uid: string, 
    currentEntitlements: any, 
    reason: string
  ): Promise<void> {
    try {
      console.log(`⬇️ [STRIPE-WEBHOOK] Downgrading user ${uid} to Primo Chambeador (reason: ${reason})`);
      
      // Get correct plan limits from centralized config
      const freePlanLimits = PLAN_LIMITS[PLAN_IDS.PRIMO_CHAMBEADOR];
      
      // Update entitlements to Primo Chambeador (free plan)
      const updatedEntitlements = {
        ...currentEntitlements,
        planId: PLAN_IDS.PRIMO_CHAMBEADOR,  // 5
        planName: PLAN_NAMES[PLAN_IDS.PRIMO_CHAMBEADOR],  // 'Primo Chambeador'
        limits: freePlanLimits,
        downgradedAt: admin.firestore.FieldValue.serverTimestamp(),
        downgradedReason: reason,
        previousPlan: {
          planId: currentEntitlements.planId,
          planName: currentEntitlements.planName,
          downgradedFrom: new Date().toISOString(),
          reason
        }
      };
      
      await db.collection('entitlements').doc(uid).update(updatedEntitlements);
      
      // Send downgrade notification email
      await trialNotificationService.sendDowngradeNotificationEmail(uid, currentEntitlements.planName);
      
      // Create audit log
      await this.createDowngradeAuditLog(uid, currentEntitlements, reason);
      
    } catch (error) {
      console.error(`❌ [STRIPE-WEBHOOK] Error downgrading user ${uid}:`, error);
      throw error;
    }
  }
  
  /**
   * Upgrade user based on Stripe subscription
   */
  private async upgradeUserFromSubscription(uid: string, subscription: Stripe.Subscription): Promise<void> {
    try {
      console.log(`⬆️ [STRIPE-WEBHOOK] Upgrading user ${uid} from subscription`);
      
      // Determine plan based on subscription (you'd implement this logic based on your price IDs)
      const planInfo = this.determinePlanFromSubscription(subscription);
      
      const updatedEntitlements = {
        planId: planInfo.planId,
        planName: planInfo.planName,
        limits: planInfo.limits,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
        subscriptionStatus: subscription.status
      };
      
      await db.collection('entitlements').doc(uid).update(updatedEntitlements);
      
      // Create audit log
      await this.createUpgradeAuditLog(uid, planInfo, subscription.id);
      
    } catch (error) {
      console.error(`❌ [STRIPE-WEBHOOK] Error upgrading user ${uid}:`, error);
      throw error;
    }
  }
  
  /**
   * Determine plan from Stripe subscription (customize based on your price IDs)
   */
  private determinePlanFromSubscription(subscription: Stripe.Subscription): any {
    // Extract the Stripe price ID from the subscription items
    const priceId = subscription.items?.data?.[0]?.price?.id;
    
    // Use the reverse-lookup from stripePriceRegistry to get the internal planId
    const planId = priceId ? getPlanIdFromPriceId(priceId) : null;
    
    if (planId) {
      const planName = PLAN_NAMES[planId as keyof typeof PLAN_NAMES] || 'unknown';
      const limits = PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS] || PLAN_LIMITS[PLAN_IDS.PRIMO_CHAMBEADOR];
      console.log(`🗺️  [STRIPE-WEBHOOK] Mapped price ${priceId} → planId=${planId} (${planName})`);
      return { planId, planName, limits };
    }
    
    // Fallback: if price ID not found in registry, default to Mero Patrón (9)
    console.warn(`⚠️  [STRIPE-WEBHOOK] Could not map price ID '${priceId}' to a plan — defaulting to Mero Patrón (9)`);
    return {
      planId: PLAN_IDS.MERO_PATRON,
      planName: PLAN_NAMES[PLAN_IDS.MERO_PATRON],
      limits: PLAN_LIMITS[PLAN_IDS.MERO_PATRON],
    };
  }
  
  /**
   * Create audit log for downgrade
   */
  private async createDowngradeAuditLog(
    uid: string, 
    previousEntitlements: any, 
    reason: string
  ): Promise<void> {
    try {
      await db.collection('audit_logs').add({
        uid,
        action: 'stripe_downgrade',
        details: {
          fromPlan: {
            planId: previousEntitlements.planId,
            planName: previousEntitlements.planName
          },
          toPlan: {
            planId: PLAN_IDS.PRIMO_CHAMBEADOR,  // 5
            planName: PLAN_NAMES[PLAN_IDS.PRIMO_CHAMBEADOR]  // 'Primo Chambeador'
          },
          reason,
          source: 'stripe_webhook',
          automated: true
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: 'stripe_webhook_service'
      });
      
    } catch (error) {
      console.error(`❌ [STRIPE-WEBHOOK] Error creating downgrade audit log:`, error);
    }
  }
  
  /**
   * Create audit log for upgrade
   */
  private async createUpgradeAuditLog(
    uid: string, 
    planInfo: any, 
    subscriptionId: string
  ): Promise<void> {
    try {
      await db.collection('audit_logs').add({
        uid,
        action: 'stripe_upgrade',
        details: {
          toPlan: {
            planId: planInfo.planId,
            planName: planInfo.planName
          },
          subscriptionId,
          source: 'stripe_webhook',
          automated: true
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: 'stripe_webhook_service'
      });
      
    } catch (error) {
      console.error(`❌ [STRIPE-WEBHOOK] Error creating upgrade audit log:`, error);
    }
  }
  
  /**
   * Log webhook event for tracking
   */
  private async logWebhookEvent(event: Stripe.Event, result: WebhookResult): Promise<void> {
    try {
      await db.collection('webhook_logs').add({
        eventId: event.id,
        eventType: event.type,
        userId: result.userId || null,
        action: result.action || null,
        success: result.success,
        error: result.error || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: 'stripe'
      });
      
    } catch (error) {
      console.error('❌ [STRIPE-WEBHOOK] Error logging webhook event:', error);
    }
  }

  // ==================== PAYMENT TRACKER WEBHOOK HANDLERS ====================

  /**
   * Handle successful checkout session completion (Payment Tracker)
   * Updates payment status in PostgreSQL and project status in Firebase
   */
  private async handleCheckoutSessionCompleted(event: Stripe.Event, result: WebhookResult): Promise<void> {
    try {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`💳 [PAYMENT-WEBHOOK] Processing checkout.session.completed: ${session.id}`);

      const paymentId = session.metadata?.paymentId;
      const firebaseProjectId = session.metadata?.firebaseProjectId;
      const paymentType = session.metadata?.type;

      // ================================
      // WALLET: Handle credit top-up checkout sessions
      // ================================
      if (paymentType === 'credit_topup') {
        const firebaseUid = session.metadata?.firebase_uid;
        const packageId = session.metadata?.package_id;
        
        if (!firebaseUid || !packageId) {
          console.error('❌ [WALLET-WEBHOOK] Missing firebase_uid or package_id in top-up session metadata');
          result.success = true;
          return;
        }
        
        const paymentIntentId = typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id || 'unknown';
        
        await walletService.processTopUpCompletion(
          session.id,
          paymentIntentId,
          firebaseUid,
          session.amount_total || 0,
          parseInt(packageId)
        );
        
        result.success = true;
        result.action = 'wallet_topup_completed';
        result.userId = firebaseUid;
        console.log(`🎉 [WALLET-WEBHOOK] Top-up completed for ${firebaseUid}`);
        return;
      }
      // ================================

      if (!paymentId) {
        console.error('❌ [PAYMENT-WEBHOOK] Missing paymentId in session metadata');
        result.success = true; // Don't fail webhook for missing metadata
        return;
      }

      // Import storage dynamically to avoid circular dependencies
      const { storage } = await import('../storage');

      // 1. Get payment record from PostgreSQL
      const payment = await storage.getProjectPayment(parseInt(paymentId));
      
      if (!payment) {
        console.error(`❌ [PAYMENT-WEBHOOK] Payment ${paymentId} not found in database`);
        result.success = true; // Don't fail webhook
        return;
      }

      // Check if already processed (idempotency)
      if (payment.status === 'succeeded') {
        console.log(`ℹ️ [PAYMENT-WEBHOOK] Payment ${paymentId} already marked as succeeded (idempotent)`);
        result.success = true;
        result.action = 'already_processed';
        return;
      }

      // 2. Update payment record in PostgreSQL
      await storage.updateProjectPayment(parseInt(paymentId), {
        status: 'succeeded',
        stripeCheckoutSessionId: session.id,
        paidDate: new Date(),
        paymentMethod: session.payment_method_types?.[0] || 'card',
      });

      console.log(`✅ [PAYMENT-WEBHOOK] Updated payment ${paymentId} status to succeeded`);

      // 3. Update Firebase project payment status
      // Wrapped in try-catch to prevent Firebase failures from failing the webhook
      if (firebaseProjectId) {
        try {
          await this.updateFirebaseProjectPaymentStatus(
            firebaseProjectId,
            paymentType as string,
            'succeeded'
          );
          console.log(`✅ [PAYMENT-WEBHOOK] Updated Firebase project ${firebaseProjectId} payment status`);
        } catch (firebaseError) {
          console.error('🔥 [PAYMENT-WEBHOOK] Failed to update Firebase project status (non-fatal):', firebaseError);
          // Don't fail the webhook if Firebase sync fails - payment was still recorded in PostgreSQL
          // This can be manually synced later if needed
        }
      }

      // 4. Send receipt email to client (optional)
      // Wrapped in try-catch to prevent email failures from failing the webhook
      if (session.customer_email && session.amount_total) {
        try {
          await this.sendPaymentReceiptEmail(
            session.customer_email,
            session.amount_total,
            session.id
          );
        } catch (emailError) {
          console.error('📧 [PAYMENT-WEBHOOK] Failed to send receipt email (non-fatal):', emailError);
          // Don't fail the webhook if email fails - payment was still processed
        }
      }

      result.success = true;
      result.action = 'payment_completed';
      result.userId = payment.userId.toString();

    } catch (error) {
      console.error('❌ [PAYMENT-WEBHOOK] Error processing checkout session:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  /**
   * Handle expired checkout session (Payment Tracker)
   */
  private async handleCheckoutSessionExpired(event: Stripe.Event, result: WebhookResult): Promise<void> {
    try {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`⏰ [PAYMENT-WEBHOOK] Processing checkout.session.expired: ${session.id}`);

      const paymentId = session.metadata?.paymentId;

      if (!paymentId) {
        console.error('❌ [PAYMENT-WEBHOOK] Missing paymentId in session metadata');
        result.success = true;
        return;
      }

      const { storage } = await import('../storage');
      const payment = await storage.getProjectPayment(parseInt(paymentId));
      
      if (!payment) {
        console.error(`❌ [PAYMENT-WEBHOOK] Payment ${paymentId} not found in database`);
        result.success = true;
        return;
      }

      // Only update if still pending
      if (payment.status === 'pending') {
        await storage.updateProjectPayment(parseInt(paymentId), {
          status: 'expired',
        });
        console.log(`✅ [PAYMENT-WEBHOOK] Updated payment ${paymentId} status to expired`);
      }

      result.success = true;
      result.action = 'payment_expired';
      result.userId = payment.userId.toString();

    } catch (error) {
      console.error('❌ [PAYMENT-WEBHOOK] Error processing expired session:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  /**
   * Handle successful payment intent (Payment Tracker backup handler)
   */
  private async handlePaymentIntentSucceeded(event: Stripe.Event, result: WebhookResult): Promise<void> {
    try {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`💰 [PAYMENT-WEBHOOK] Processing payment_intent.succeeded: ${paymentIntent.id}`);
      
      // This is a backup handler - checkout.session.completed is the primary event
      // Only process if we have metadata
      if (paymentIntent.metadata?.paymentId) {
        const paymentId = parseInt(paymentIntent.metadata.paymentId);
        
        const { storage } = await import('../storage');
        const payment = await storage.getProjectPayment(paymentId);
        
        if (payment && payment.status !== 'succeeded') {
          await storage.updateProjectPayment(paymentId, {
            status: 'succeeded',
            stripePaymentIntentId: paymentIntent.id,
            paidDate: new Date(),
          });
          console.log(`✅ [PAYMENT-WEBHOOK] Updated payment ${paymentId} via payment_intent.succeeded`);
          
          result.success = true;
          result.action = 'payment_intent_succeeded';
          result.userId = payment.userId.toString();
        } else {
          result.success = true;
          result.action = 'already_processed';
        }
      } else {
        result.success = true;
        result.action = 'no_metadata';
      }

    } catch (error) {
      console.error('❌ [PAYMENT-WEBHOOK] Error processing payment intent succeeded:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  /**
   * Handle failed payment intent (Payment Tracker)
   */
  private async handlePaymentIntentFailed(event: Stripe.Event, result: WebhookResult): Promise<void> {
    try {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`❌ [PAYMENT-WEBHOOK] Processing payment_intent.payment_failed: ${paymentIntent.id}`);
      
      if (paymentIntent.metadata?.paymentId) {
        const paymentId = parseInt(paymentIntent.metadata.paymentId);
        
        const { storage } = await import('../storage');
        await storage.updateProjectPayment(paymentId, {
          status: 'failed',
          stripePaymentIntentId: paymentIntent.id,
        });
        
        console.log(`✅ [PAYMENT-WEBHOOK] Updated payment ${paymentId} status to failed`);
        
        const payment = await storage.getProjectPayment(paymentId);
        result.success = true;
        result.action = 'payment_failed';
        result.userId = payment?.userId.toString();
      } else {
        result.success = true;
        result.action = 'no_metadata';
      }

    } catch (error) {
      console.error('❌ [PAYMENT-WEBHOOK] Error processing payment intent failed:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  /**
   * Handle Stripe Connect account updates (Payment Tracker)
   */
  private async handleAccountUpdated(event: Stripe.Event, result: WebhookResult): Promise<void> {
    try {
      const account = event.data.object as Stripe.Account;
      console.log(`🔄 [PAYMENT-WEBHOOK] Processing account.updated: ${account.id}`);
      
      // Find user by Stripe Connect account ID
      const usersSnapshot = await db.collection('users')
        .where('stripeConnectAccountId', '==', account.id)
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        console.log(`✅ [PAYMENT-WEBHOOK] Found user ${userDoc.id} for account ${account.id}`);
        console.log(`📊 [PAYMENT-WEBHOOK] Account charges_enabled: ${account.charges_enabled}, payouts_enabled: ${account.payouts_enabled}`);
        
        result.success = true;
        result.action = 'account_status_logged';
        result.userId = userDoc.id;
      } else {
        console.log(`ℹ️ [PAYMENT-WEBHOOK] No user found for account ${account.id}`);
        result.success = true;
        result.action = 'no_user_found';
      }

    } catch (error) {
      console.error('❌ [PAYMENT-WEBHOOK] Error processing account update:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  /**
   * Update Firebase project payment status based on payment type
   */
  private async updateFirebaseProjectPaymentStatus(
    firebaseProjectId: string,
    paymentType: string,
    status: string
  ): Promise<void> {
    try {
      const docRef = db.collection('estimates').doc(firebaseProjectId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        console.error(`❌ [PAYMENT-WEBHOOK] Firebase project ${firebaseProjectId} not found`);
        return;
      }

      const currentData = docSnap.data();
      const currentPaymentStatus = currentData?.paymentStatus || 'pending';

      // Determine new payment status based on payment type
      let newPaymentStatus = currentPaymentStatus;

      if (status === 'succeeded') {
        if (paymentType === 'deposit') {
          newPaymentStatus = 'deposit-paid';
        } else if (paymentType === 'final') {
          // Check if deposit was already paid
          if (currentPaymentStatus === 'deposit-paid') {
            newPaymentStatus = 'paid-in-full';
          } else {
            newPaymentStatus = 'final-paid';
          }
        } else if (paymentType === 'milestone' || paymentType === 'additional') {
          // For milestone/additional, mark as partial payment
          newPaymentStatus = 'partial-paid';
        }
      }

      // Update Firebase project
      await docRef.update({
        paymentStatus: newPaymentStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ [PAYMENT-WEBHOOK] Updated Firebase project ${firebaseProjectId} paymentStatus: ${currentPaymentStatus} → ${newPaymentStatus}`);
    } catch (error) {
      console.error('❌ [PAYMENT-WEBHOOK] Error updating Firebase project:', error);
      throw error;
    }
  }

  /**
   * Send payment receipt email to client
   */
  private async sendPaymentReceiptEmail(
    clientEmail: string,
    amountInCents: number,
    sessionId: string
  ): Promise<void> {
    try {
      const amountFormatted = (amountInCents / 100).toFixed(2);

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
          <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #1a1a1a; margin-bottom: 20px; border-bottom: 3px solid #22c55e; padding-bottom: 10px;">
              Payment Received ✓
            </h2>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Thank you for your payment!
            </p>
            
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #166534; font-size: 24px; font-weight: bold;">$${amountFormatted}</p>
              <p style="margin: 5px 0 0 0; color: #166534; font-size: 14px;">Payment Successful</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Your payment has been processed successfully. Transaction ID: ${sessionId}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              This is an automated receipt from Owl Fenc. Please save this for your records.
            </p>
          </div>
        </div>
      `;

      await resendService.sendEmail({
        from: 'Owl Fenc Payments <payments@owlfenc.com>',
        to: [clientEmail],
        subject: `Payment Receipt - $${amountFormatted}`,
        html: emailHtml,
      });

      console.log(`📧 [PAYMENT-WEBHOOK] Receipt sent to ${clientEmail}`);
    } catch (emailError) {
      console.error('📧 [PAYMENT-WEBHOOK] Error sending receipt email:', emailError);
      // Don't throw - email failure shouldn't fail the webhook
    }
  }
}

export const stripeWebhookService = new StripeWebhookService();