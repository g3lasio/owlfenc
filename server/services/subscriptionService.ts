import Stripe from 'stripe';
import { db } from '../db.js';
import { 
  userSubscriptions, 
  subscriptionPlans, 
  paymentHistory,
  users,
  type UserSubscription, 
  type InsertUserSubscription,
  type SubscriptionPlan,
  type PaymentHistory,
  type InsertPaymentHistory
} from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class SubscriptionService {
  static async initializeDefaultPlans(): Promise<void> {
    try {
      const existingPlans = await db.select().from(subscriptionPlans).limit(1);
      
      if (existingPlans.length === 0) {
        const defaultPlans = [
          {
            name: 'Primo Chambeador',
            code: 'primo_chambeador',
            price: 2900, // $29/month
            yearlyPrice: 29000, // $290/year (2 months free)
            description: 'Perfecto para contratistas que empiezan',
            features: ['10 estimados por mes', 'Templates básicos', 'Soporte por email'],
            motto: 'El que chambea, prospera',
            isActive: true
          },
          {
            name: 'Mero Patrón',
            code: 'mero_patron',
            price: 5900, // $59/month
            yearlyPrice: 59000, // $590/year
            description: 'Para contratistas establecidos',
            features: ['50 estimados por mes', 'Templates premium', 'Integración con Stripe', 'Soporte prioritario'],
            motto: 'El jefe siempre tiene razón',
            isActive: true
          },
          {
            name: 'Chingón Mayor',
            code: 'chingon_mayor',
            price: 9900, // $99/month
            yearlyPrice: 99000, // $990/year
            description: 'Para empresas y equipos grandes',
            features: ['Estimados ilimitados', 'AI avanzado', 'Multi-usuario', 'API access', 'Soporte 24/7'],
            motto: 'El que puede, puede',
            isActive: true
          }
        ];

        await db.insert(subscriptionPlans).values(defaultPlans);
      }
    } catch (error) {
      console.error('Error initializing default plans:', error);
    }
  }

  static async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      return await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true));
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      throw new Error('Failed to fetch subscription plans');
    }
  }

  static async getUserSubscription(userId: number): Promise<UserSubscription | null> {
    try {
      const result = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      throw new Error('Failed to fetch user subscription');
    }
  }

  static async createStripeCustomer(userId: number, email: string, name?: string): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          userId: userId.toString()
        }
      });
      
      return customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create Stripe customer');
    }
  }

  static async createSubscription(
    userId: number, 
    planId: number, 
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ): Promise<{ subscription: UserSubscription; checkoutUrl: string }> {
    try {
      // Get user info
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user[0]) {
        throw new Error('User not found');
      }

      // Get plan info
      const plan = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
      if (!plan[0]) {
        throw new Error('Plan not found');
      }

      // Create or get Stripe customer
      let stripeCustomerId = '';
      const existingSubscription = await this.getUserSubscription(userId);
      
      if (existingSubscription?.stripeCustomerId) {
        stripeCustomerId = existingSubscription.stripeCustomerId;
      } else {
        stripeCustomerId = await this.createStripeCustomer(
          userId, 
          user[0].email || '', 
          user[0].ownerName || user[0].username
        );
      }

      // Create Stripe price if not exists
      const priceAmount = billingCycle === 'yearly' ? plan[0].yearlyPrice : plan[0].price;
      const stripePrice = await stripe.prices.create({
        unit_amount: priceAmount,
        currency: 'usd',
        recurring: {
          interval: billingCycle === 'yearly' ? 'year' : 'month'
        },
        product_data: {
          name: plan[0].name,
          description: plan[0].description || undefined
        }
      });

      // Create Stripe checkout session
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{
          price: stripePrice.id,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: `${process.env.CLIENT_URL}/settings?success=true`,
        cancel_url: `${process.env.CLIENT_URL}/settings?canceled=true`,
        metadata: {
          userId: userId.toString(),
          planId: planId.toString(),
          billingCycle
        }
      });

      // Create or update subscription record
      const subscriptionData: InsertUserSubscription = {
        userId,
        planId,
        stripeCustomerId,
        stripeSubscriptionId: '', // Will be updated via webhook
        status: 'active',
        billingCycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false
      };

      let subscription: UserSubscription;
      if (existingSubscription) {
        const updated = await db
          .update(userSubscriptions)
          .set(subscriptionData)
          .where(eq(userSubscriptions.userId, userId))
          .returning();
        subscription = updated[0];
      } else {
        const created = await db
          .insert(userSubscriptions)
          .values(subscriptionData)
          .returning();
        subscription = created[0];
      }

      return {
        subscription,
        checkoutUrl: checkoutSession.url!
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  static async cancelSubscription(userId: number): Promise<UserSubscription> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No subscription found');
      }

      // Cancel in Stripe
      if (subscription.stripeSubscriptionId) {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      }

      // Update in database
      const updated = await db
        .update(userSubscriptions)
        .set({ 
          cancelAtPeriodEnd: true,
          updatedAt: new Date()
        })
        .where(eq(userSubscriptions.userId, userId))
        .returning();

      return updated[0];
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  static async reactivateSubscription(userId: number): Promise<UserSubscription> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No subscription found');
      }

      // Reactivate in Stripe
      if (subscription.stripeSubscriptionId) {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: false
        });
      }

      // Update in database
      const updated = await db
        .update(userSubscriptions)
        .set({ 
          cancelAtPeriodEnd: false,
          updatedAt: new Date()
        })
        .where(eq(userSubscriptions.userId, userId))
        .returning();

      return updated[0];
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw new Error('Failed to reactivate subscription');
    }
  }

  static async getPaymentHistory(userId: number): Promise<PaymentHistory[]> {
    try {
      return await db
        .select()
        .from(paymentHistory)
        .where(eq(paymentHistory.userId, userId))
        .orderBy(paymentHistory.createdAt);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw new Error('Failed to fetch payment history');
    }
  }

  static async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  private static async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const userId = parseInt(subscription.metadata?.userId || '0');
    if (!userId) return;

    await db
      .update(userSubscriptions)
      .set({
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.userId, userId));
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = parseInt(subscription.metadata?.userId || '0');
    if (!userId) return;

    await db
      .update(userSubscriptions)
      .set({
        status: 'canceled',
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.userId, userId));
  }

  private static async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.customer || !invoice.subscription) return;

    const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
    const userId = parseInt(customer.metadata?.userId || '0');
    if (!userId) return;

    const subscription = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.stripeSubscriptionId, invoice.subscription as string))
      .limit(1);

    const paymentRecord: InsertPaymentHistory = {
      userId,
      subscriptionId: subscription[0]?.id,
      stripePaymentIntentId: invoice.payment_intent as string,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid,
      status: 'succeeded',
      paymentMethod: 'card',
      receiptUrl: invoice.hosted_invoice_url
    };

    await db.insert(paymentHistory).values(paymentRecord);
  }

  private static async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.customer || !invoice.subscription) return;

    const customer = await stripe.customers.retrieve(invoice.customer as string) as Stripe.Customer;
    const userId = parseInt(customer.metadata?.userId || '0');
    if (!userId) return;

    const subscription = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.stripeSubscriptionId, invoice.subscription as string))
      .limit(1);

    const paymentRecord: InsertPaymentHistory = {
      userId,
      subscriptionId: subscription[0]?.id,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_due,
      status: 'failed',
      paymentMethod: 'card'
    };

    await db.insert(paymentHistory).values(paymentRecord);
  }
}