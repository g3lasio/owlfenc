// Simple in-memory storage for development
// In production, this would use Firebase Admin SDK with proper credentials
const subscriptionStorage = new Map<string, any>();

// Default subscription storage - will be updated via API

export interface SubscriptionData {
  id: string;
  status: 'active' | 'inactive' | 'canceled' | 'trialing';
  planId: number;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  billingCycle: 'monthly' | 'yearly';
  createdAt: Date;
  updatedAt: Date;
}

export class FirebaseSubscriptionService {
  
  /**
   * Crear o actualizar suscripción del usuario
   */
  async createOrUpdateSubscription(userId: string, subscriptionData: Partial<SubscriptionData>): Promise<void> {
    try {
      console.log(`📧 [FIREBASE-SUBSCRIPTION] Creando/actualizando suscripción para usuario: ${userId}`);
      
      const existing = subscriptionStorage.get(userId) || {};
      const dataToSave = {
        ...existing,
        ...subscriptionData,
        updatedAt: new Date(),
        ...(subscriptionData.id ? {} : { createdAt: new Date() })
      };

      subscriptionStorage.set(userId, dataToSave);
      
      console.log(`✅ [FIREBASE-SUBSCRIPTION] Suscripción guardada exitosamente`);
    } catch (error) {
      console.error('❌ [FIREBASE-SUBSCRIPTION] Error creando/actualizando suscripción:', error);
      throw error;
    }
  }

  /**
   * Obtener suscripción del usuario
   */
  async getUserSubscription(userId: string): Promise<SubscriptionData | null> {
    try {
      console.log(`📧 [FIREBASE-SUBSCRIPTION] Obteniendo suscripción para usuario: ${userId}`);
      
      const data = subscriptionStorage.get(userId);
      
      if (!data) {
        console.log(`📭 [FIREBASE-SUBSCRIPTION] No se encontró suscripción para usuario: ${userId}`);
        return null;
      }

      console.log(`✅ [FIREBASE-SUBSCRIPTION] Suscripción encontrada:`, data.status);
      
      return data as SubscriptionData;
    } catch (error) {
      console.error('❌ [FIREBASE-SUBSCRIPTION] Error obteniendo suscripción:', error);
      throw error;
    }
  }

  /**
   * Actualizar suscripción desde webhook de Stripe
   */
  async updateSubscriptionFromStripe(
    userId: string, 
    stripeSubscriptionId: string, 
    stripeData: any
  ): Promise<void> {
    try {
      console.log(`🔄 [FIREBASE-SUBSCRIPTION] Actualizando desde Stripe webhook para usuario: ${userId}`);
      
      const subscriptionData: Partial<SubscriptionData> = {
        id: stripeSubscriptionId,
        stripeSubscriptionId: stripeSubscriptionId,
        stripeCustomerId: stripeData.customer,
        status: this.mapStripeStatus(stripeData.status),
        planId: this.mapStripePlanToPlanId(stripeData.items.data[0].price.id),
        currentPeriodStart: new Date(stripeData.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeData.current_period_end * 1000),
        cancelAtPeriodEnd: stripeData.cancel_at_period_end,
        billingCycle: stripeData.items.data[0].price.recurring.interval === 'year' ? 'yearly' : 'monthly'
      };

      await this.createOrUpdateSubscription(userId, subscriptionData);
      
      console.log(`✅ [FIREBASE-SUBSCRIPTION] Suscripción actualizada desde Stripe`);
    } catch (error) {
      console.error('❌ [FIREBASE-SUBSCRIPTION] Error actualizando desde Stripe:', error);
      throw error;
    }
  }

  /**
   * Cancelar suscripción
   */
  async cancelSubscription(userId: string): Promise<void> {
    try {
      console.log(`❌ [FIREBASE-SUBSCRIPTION] Cancelando suscripción para usuario: ${userId}`);
      
      await this.createOrUpdateSubscription(userId, {
        status: 'canceled',
        cancelAtPeriodEnd: true
      });
      
      console.log(`✅ [FIREBASE-SUBSCRIPTION] Suscripción cancelada`);
    } catch (error) {
      console.error('❌ [FIREBASE-SUBSCRIPTION] Error cancelando suscripción:', error);
      throw error;
    }
  }

  /**
   * Verificar si la suscripción está activa
   */
  async isSubscriptionActive(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) {
        return false;
      }

      const now = new Date();
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';
      const notExpired = subscription.currentPeriodEnd > now;
      
      return isActive && notExpired;
    } catch (error) {
      console.error('❌ [FIREBASE-SUBSCRIPTION] Error verificando estado activo:', error);
      return false;
    }
  }

  /**
   * Mapear estado de Stripe a nuestro sistema
   */
  private mapStripeStatus(stripeStatus: string): 'active' | 'inactive' | 'canceled' | 'trialing' {
    switch (stripeStatus) {
      case 'active':
        return 'active';
      case 'trialing':
        return 'trialing';
      case 'canceled':
      case 'unpaid':
        return 'canceled';
      default:
        return 'inactive';
    }
  }

  /**
   * Mapear precio de Stripe a ID de plan
   */
  private mapStripePlanToPlanId(priceId: string): number {
    // Mapear los price IDs de Stripe a nuestros plan IDs
    // Estos deben coincidir con los configurados en Stripe
    const planMapping: { [key: string]: number } = {
      'price_1234567890': 1, // Primo Chambeador
      'price_mero_patron_monthly': 2, // Mero Patrón Monthly
      'price_mero_patron_yearly': 2, // Mero Patrón Yearly
      'price_master_contractor_monthly': 3, // Master Contractor Monthly
      'price_master_contractor_yearly': 3, // Master Contractor Yearly
    };

    return planMapping[priceId] || 1; // Default to free plan
  }

  /**
   * Create subscription with current date - API method
   */
  async createCurrentSubscription(userId: string, planId: number): Promise<void> {
    try {
      console.log(`📧 [FIREBASE-SUBSCRIPTION] Creating current subscription for user: ${userId}, plan: ${planId}`);
      
      const currentDate = new Date();
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(currentDate.getMonth() + 1); // Same day next month
      
      const subscriptionData = {
        id: `sub_${Date.now()}`,
        status: 'active' as const,
        planId: planId,
        stripeSubscriptionId: `sub_test_${Date.now()}`,
        stripeCustomerId: `cus_test_${Date.now()}`,
        currentPeriodStart: currentDate,
        currentPeriodEnd: nextMonth,
        cancelAtPeriodEnd: false,
        billingCycle: 'monthly' as const,
        createdAt: currentDate,
        updatedAt: currentDate
      };

      subscriptionStorage.set(userId, subscriptionData);
      
      console.log(`✅ [FIREBASE-SUBSCRIPTION] Current subscription created - expires: ${nextMonth.toISOString()}`);
    } catch (error) {
      console.error('❌ [FIREBASE-SUBSCRIPTION] Error creating current subscription:', error);
      throw error;
    }
  }
}

export const firebaseSubscriptionService = new FirebaseSubscriptionService();