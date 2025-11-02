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
import { getStripeSecretKey } from '../config/stripe.js';

// Get Stripe key from centralized config (supports both naming conventions)
const stripeKey = getStripeSecretKey();

const stripe = new Stripe(stripeKey, {
  apiVersion: "2023-10-16",
});

export interface WebhookResult {
  success: boolean;
  eventType: string;
  eventId: string;
  userId?: string;
  action?: string;
  error?: string;
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
          break;
          
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event, result);
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
  
  /**
   * Handle payment failure - downgrade user immediately
   */
  private async handlePaymentFailed(event: Stripe.Event, result: WebhookResult): Promise<void> {
    try {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      
      console.log(`💳 [STRIPE-WEBHOOK] Payment failed for customer: ${customerId}`);
      
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
      
      // Don't downgrade if already on free plan
      if (currentPlan === 'primo') {
        console.log(`ℹ️ [STRIPE-WEBHOOK] User ${uid} already on free plan`);
        result.success = true;
        result.action = 'no_downgrade_needed';
        return;
      }
      
      // Downgrade to free plan
      await this.downgradeUserToFreePlan(uid, currentEntitlements, 'payment_failed');
      
      // Execute security operations for payment failure downgrade
      await securityOptimizationService.handlePlanChangeSecurityOperations(
        uid,
        currentPlan,
        'primo',
        'payment_failed',
        undefined, // IP not available in webhook
        undefined  // User agent not available in webhook
      );
      
      result.success = true;
      result.action = 'downgraded_to_free';
      
      console.log(`✅ [STRIPE-WEBHOOK] User ${uid} downgraded due to payment failure`);
      
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
      const oldPlan = currentEntitlements?.planName || 'primo';
      
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
            'primo',
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
      
      console.log(`❌ [STRIPE-WEBHOOK] Subscription canceled for customer: ${customerId}`);
      
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
        const oldPlan = currentEntitlements?.planName || 'primo';
        
        await this.downgradeUserToFreePlan(uid, currentEntitlements, 'subscription_canceled');
        result.action = 'downgraded_subscription_canceled';
        
        // Execute security operations for subscription cancellation
        await securityOptimizationService.handlePlanChangeSecurityOperations(
          uid,
          oldPlan,
          'primo',
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
    try {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      console.log(`🆕 [STRIPE-WEBHOOK] Subscription created for customer: ${customerId}`);
      
      const user = await this.findUserByStripeCustomerId(customerId);
      
      if (!user) {
        console.warn(`⚠️ [STRIPE-WEBHOOK] User not found for new subscription: ${customerId}`);
        result.success = true;
        return;
      }
      
      const uid = user.uid;
      result.userId = uid;
      
      // Get current entitlements to determine old plan
      const entitlementsDoc = await db.collection('entitlements').doc(uid).get();
      const oldPlan = entitlementsDoc.exists() ? entitlementsDoc.data()?.planName || 'primo' : 'primo';
      
      // Set up entitlements based on subscription
      if (subscription.status === 'active') {
        const planInfo = this.determinePlanFromSubscription(subscription);
        await this.upgradeUserFromSubscription(uid, subscription);
        result.action = 'entitlements_created';
        
        // Execute security operations for new subscription (upgrade from free)
        await securityOptimizationService.handlePlanChangeSecurityOperations(
          uid,
          oldPlan,
          planInfo.planName,
          'subscription_created',
          undefined, // IP not available in webhook
          undefined  // User agent not available in webhook
        );
      }
      
      result.success = true;
      
    } catch (error) {
      console.error('❌ [STRIPE-WEBHOOK] Error handling subscription creation:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }
  
  /**
   * Find user by Stripe customer ID
   */
  private async findUserByStripeCustomerId(customerId: string): Promise<{ uid: string; email?: string } | null> {
    try {
      // In a real implementation, you'd store the stripe customer ID in your user records
      // For now, we'll simulate this lookup
      
      // Check if we have a mapping in Firestore
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
      
      return null;
      
    } catch (error) {
      console.error('❌ [STRIPE-WEBHOOK] Error finding user by customer ID:', error);
      return null;
    }
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
      console.log(`⬇️ [STRIPE-WEBHOOK] Downgrading user ${uid} to free plan (reason: ${reason})`);
      
      // Update entitlements to free plan
      const updatedEntitlements = {
        ...currentEntitlements,
        planId: 1,
        planName: 'primo',
        limits: {
          basicEstimates: 5,
          aiEstimates: 2,
          contracts: 2,
          propertyVerifications: 3,
          permitAdvisor: 3,
          projects: 5,
          invoices: 10,
          paymentTracking: 20,
          deepsearch: 5
        },
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
    // This is where you'd map your Stripe price IDs to your internal plans
    // For now, we'll use a simple default mapping
    
    // You can check subscription.items.data[0].price.id to determine the plan
    // const priceId = subscription.items.data[0]?.price?.id;
    
    // Default to 'mero' plan for paid subscriptions
    return {
      planId: 2,
      planName: 'mero',
      limits: {
        basicEstimates: 50,
        aiEstimates: 25,
        contracts: 25,
        propertyVerifications: 20,
        permitAdvisor: 30,
        projects: null, // unlimited
        invoices: null, // unlimited
        paymentTracking: null, // unlimited
        deepsearch: 20
      }
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
            planId: 1,
            planName: 'primo'
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
}

export const stripeWebhookService = new StripeWebhookService();