import Stripe from 'stripe';
import { SubscriptionPlan, UserSubscription, PaymentHistory } from '@shared/schema';
import { storage } from '../storage';

// Verificar que la clave secreta de Stripe esté configurada
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('¡ADVERTENCIA! La clave secreta de Stripe no está configurada. Las funciones de pago no funcionarán correctamente.');
}

// Inicializar Stripe con la clave secreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16', // Usar una versión compatible
});

interface SubscriptionCheckoutOptions {
  planId: number;
  userId: number;
  email: string;
  name: string;
  billingCycle: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

interface ManageSubscriptionOptions {
  subscriptionId: number;
  userId: number;
  successUrl: string;
  cancelUrl: string;
}

class StripeService {
  /**
   * Crea un producto en Stripe para un plan de suscripción
   */
  async createOrUpdateStripePlan(plan: SubscriptionPlan): Promise<string> {
    // Verificar si ya existe un producto con este código
    let stripeProductId = '';
    
    try {
      // Buscar si existe un producto con el mismo código en los metadatos
      const products = await stripe.products.list({
        active: true,
        limit: 100
      });
      
      const existingProduct = products.data.find(
        p => p.metadata.plan_code === plan.code
      );
      
      if (existingProduct) {
        // Actualizar el producto existente
        const updatedProduct = await stripe.products.update(existingProduct.id, {
          name: plan.name,
          description: plan.description || '',
          metadata: {
            plan_code: plan.code,
            plan_id: plan.id.toString()
          }
        });
        stripeProductId = updatedProduct.id;
        
        // Actualizar precios existentes o crear nuevos si es necesario
        // Aquí podríamos manejar cambios de precio, pero por ahora lo mantenemos simple
      } else {
        // Crear un nuevo producto
        const product = await stripe.products.create({
          name: plan.name,
          description: plan.description || '',
          metadata: {
            plan_code: plan.code,
            plan_id: plan.id.toString()
          }
        });
        stripeProductId = product.id;
        
        // Crear precios para el producto (mensual y anual)
        await stripe.prices.create({
          product: product.id,
          unit_amount: plan.price,
          currency: 'usd',
          recurring: { interval: 'month' },
          metadata: {
            plan_code: plan.code,
            billing_cycle: 'monthly'
          }
        });
        
        await stripe.prices.create({
          product: product.id,
          unit_amount: plan.yearlyPrice,
          currency: 'usd',
          recurring: { interval: 'year' },
          metadata: {
            plan_code: plan.code,
            billing_cycle: 'yearly'
          }
        });
      }
      
      return stripeProductId;
    } catch (error) {
      console.error('Error al crear/actualizar el producto en Stripe:', error);
      throw error;
    }
  }
  
  /**
   * Crea una sesión de checkout para suscripción
   */
  async createSubscriptionCheckout(options: SubscriptionCheckoutOptions): Promise<string> {
    try {
      const plan = await storage.getSubscriptionPlan(options.planId);
      if (!plan) {
        throw new Error(`Plan con ID ${options.planId} no encontrado`);
      }
      
      // Asegurarse de que el plan existe en Stripe
      await this.createOrUpdateStripePlan(plan);
      
      // Obtener el precio correspondiente al plan y ciclo de facturación
      const prices = await stripe.prices.list({
        active: true,
        limit: 100
      });
      
      const price = prices.data.find(p => 
        p.metadata.plan_code === plan.code && 
        p.metadata.billing_cycle === options.billingCycle
      );
      
      if (!price) {
        throw new Error(`Precio no encontrado para el plan ${plan.name} con ciclo ${options.billingCycle}`);
      }
      
      // Crear sesión de checkout
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        customer_email: options.email,
        client_reference_id: options.userId.toString(),
        metadata: {
          userId: options.userId.toString(),
          planId: options.planId.toString(),
          billingCycle: options.billingCycle
        }
      });
      
      return session.url || '';
    } catch (error) {
      console.error('Error al crear sesión de checkout:', error);
      throw error;
    }
  }
  
  /**
   * Crea un portal de cliente para gestionar la suscripción
   */
  async createCustomerPortalSession(options: ManageSubscriptionOptions): Promise<string> {
    try {
      const subscription = await storage.getUserSubscription(options.subscriptionId);
      if (!subscription || subscription.userId !== options.userId) {
        throw new Error('Suscripción no encontrada o no pertenece al usuario');
      }
      
      if (!subscription.stripeCustomerId) {
        throw new Error('No hay un cliente de Stripe asociado a esta suscripción');
      }
      
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: options.successUrl
      });
      
      return session.url;
    } catch (error) {
      console.error('Error al crear portal de cliente:', error);
      throw error;
    }
  }
  
  /**
   * Maneja un evento de webhook de Stripe
   */
  async handleWebhookEvent(event: any): Promise<void> {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        default:
          console.log(`Evento de Stripe no manejado: ${event.type}`);
      }
    } catch (error) {
      console.error('Error al manejar evento de webhook:', error);
      throw error;
    }
  }
  
  /**
   * Maneja un evento de checkout completado
   */
  private async handleCheckoutCompleted(session: any): Promise<void> {
    try {
      const userId = parseInt(session.metadata.userId);
      const planId = parseInt(session.metadata.planId);
      const billingCycle = session.metadata.billingCycle;
      
      // Obtener detalles de la suscripción de Stripe
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Convertir los timestamp de Unix a objetos Date
      const currentPeriodStart = new Date(subscription.current_period_start * 1000);
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      
      // Crear o actualizar la suscripción en nuestra base de datos
      const existingSubscription = await storage.getUserSubscriptionByUserId(userId);
      
      if (existingSubscription) {
        // Actualizar la suscripción existente
        await storage.updateUserSubscription(existingSubscription.id, {
          planId,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          status: subscription.status,
          currentPeriodStart: currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          billingCycle,
          updatedAt: new Date()
        });
      } else {
        // Crear una nueva suscripción
        await storage.createUserSubscription({
          userId,
          planId,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          status: subscription.status,
          currentPeriodStart: currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          billingCycle
        });
      }
    } catch (error) {
      console.error('Error al manejar checkout completado:', error);
      throw error;
    }
  }
  
  /**
   * Maneja un evento de suscripción creada
   */
  private async handleSubscriptionCreated(subscription: any): Promise<void> {
    // Este evento ya es manejado por checkout.session.completed
    // Pero podríamos agregar lógica adicional aquí si es necesario
  }
  
  /**
   * Maneja un evento de suscripción actualizada
   */
  private async handleSubscriptionUpdated(stripeSubscription: any): Promise<void> {
    try {
      // Encontrar la suscripción en nuestra base de datos
      const subscriptions = await this.findSubscriptionsByStripeId(stripeSubscription.id);
      
      if (subscriptions && subscriptions.length > 0) {
        const subscription = subscriptions[0];
        
        // Convertir los timestamp de Unix a objetos Date
        const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
        const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
        
        // Actualizar la suscripción con la información más reciente
        await storage.updateUserSubscription(subscription.id, {
          status: stripeSubscription.status,
          currentPeriodStart: currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error al manejar actualización de suscripción:', error);
      throw error;
    }
  }
  
  /**
   * Maneja un evento de suscripción eliminada
   */
  private async handleSubscriptionDeleted(stripeSubscription: any): Promise<void> {
    try {
      // Encontrar la suscripción en nuestra base de datos
      const subscriptions = await this.findSubscriptionsByStripeId(stripeSubscription.id);
      
      if (subscriptions && subscriptions.length > 0) {
        const subscription = subscriptions[0];
        
        // Marcar la suscripción como cancelada
        await storage.updateUserSubscription(subscription.id, {
          status: 'canceled',
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error al manejar eliminación de suscripción:', error);
      throw error;
    }
  }
  
  /**
   * Maneja un evento de pago exitoso
   */
  private async handlePaymentSucceeded(invoice: any): Promise<void> {
    try {
      if (!invoice.subscription) {
        return; // No es un pago de suscripción
      }
      
      // Encontrar la suscripción en nuestra base de datos
      const subscriptions = await this.findSubscriptionsByStripeId(invoice.subscription);
      
      if (subscriptions && subscriptions.length > 0) {
        const subscription = subscriptions[0];
        
        // Registrar el pago exitoso
        await storage.createPaymentHistory({
          userId: subscription.userId,
          subscriptionId: subscription.id,
          stripePaymentIntentId: invoice.payment_intent,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_paid,
          status: 'succeeded',
          paymentMethod: invoice.payment_method_details?.type || 'unknown',
          receiptUrl: invoice.hosted_invoice_url
        });
        
        // Actualizar la suscripción si es necesario
        if (subscription.status !== 'active') {
          await storage.updateUserSubscription(subscription.id, {
            status: 'active',
            updatedAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error al manejar pago exitoso:', error);
      throw error;
    }
  }
  
  /**
   * Maneja un evento de pago fallido
   */
  private async handlePaymentFailed(invoice: any): Promise<void> {
    try {
      if (!invoice.subscription) {
        return; // No es un pago de suscripción
      }
      
      // Encontrar la suscripción en nuestra base de datos
      const subscriptions = await this.findSubscriptionsByStripeId(invoice.subscription);
      
      if (subscriptions && subscriptions.length > 0) {
        const subscription = subscriptions[0];
        
        // Registrar el pago fallido
        await storage.createPaymentHistory({
          userId: subscription.userId,
          subscriptionId: subscription.id,
          stripePaymentIntentId: invoice.payment_intent,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_due,
          status: 'failed',
          paymentMethod: invoice.payment_method_details?.type || 'unknown',
          receiptUrl: invoice.hosted_invoice_url
        });
        
        // Actualizar el estado de la suscripción
        await storage.updateUserSubscription(subscription.id, {
          status: 'past_due',
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error al manejar pago fallido:', error);
      throw error;
    }
  }
  
  /**
   * Busca suscripciones por ID de suscripción de Stripe
   */
  private async findSubscriptionsByStripeId(stripeSubscriptionId: string): Promise<UserSubscription[]> {
    try {
      // Aquí normalmente haríamos una consulta a la base de datos
      // Pero como estamos usando un almacenamiento en memoria, tenemos que cargar todas las suscripciones
      // y filtrar manualmente
      const allSubscriptions = await Promise.all(
        Array.from(Array(1000).keys()).map(id => storage.getUserSubscription(id))
      );
      
      return allSubscriptions
        .filter(Boolean)
        .filter(sub => sub?.stripeSubscriptionId === stripeSubscriptionId) as UserSubscription[];
    } catch (error) {
      console.error('Error al buscar suscripciones por ID de Stripe:', error);
      throw error;
    }
  }
  
  /**
   * Sincroniza todos los planes de suscripción con Stripe
   */
  async syncPlansWithStripe(): Promise<void> {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      
      for (const plan of plans) {
        await this.createOrUpdateStripePlan(plan);
      }
      
      console.log(`Sincronizados ${plans.length} planes con Stripe`);
    } catch (error) {
      console.error('Error al sincronizar planes con Stripe:', error);
      throw error;
    }
  }
}

export const stripeService = new StripeService();