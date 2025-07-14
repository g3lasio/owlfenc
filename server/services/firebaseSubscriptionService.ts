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
      console.log(`🔄 [FIREBASE-SUBSCRIPTION] Stripe data:`, JSON.stringify(stripeData, null, 2));
      
      const subscriptionData: Partial<SubscriptionData> = {
        id: stripeSubscriptionId,
        stripeSubscriptionId: stripeSubscriptionId,
        stripeCustomerId: stripeData.customer,
        status: this.mapStripeStatus(stripeData.status),
        planId: this.mapStripePlanToPlanId(stripeData.items.data[0].price.id, stripeData),
        currentPeriodStart: new Date(stripeData.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeData.current_period_end * 1000),
        cancelAtPeriodEnd: stripeData.cancel_at_period_end,
        billingCycle: stripeData.items.data[0].price.recurring.interval === 'year' ? 'yearly' : 'monthly'
      };

      console.log(`🔄 [FIREBASE-SUBSCRIPTION] Subscription data to save:`, JSON.stringify(subscriptionData, null, 2));
      
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
   * Mapear precio de Stripe a ID de plan usando metadata
   */
  private mapStripePlanToPlanId(priceId: string, stripeData?: any): number {
    console.log(`🔄 [FIREBASE-SUBSCRIPTION] Mapping price ID: ${priceId}`);
    
    // Si tenemos datos de Stripe, usar los items para obtener metadata
    if (stripeData && stripeData.items && stripeData.items.data && stripeData.items.data.length > 0) {
      const priceItem = stripeData.items.data[0];
      console.log(`🔄 [FIREBASE-SUBSCRIPTION] Price item:`, JSON.stringify(priceItem, null, 2));
      
      if (priceItem.price && priceItem.price.metadata) {
        const planCode = priceItem.price.metadata.plan_code;
        console.log(`🔄 [FIREBASE-SUBSCRIPTION] Plan code from metadata: ${planCode}`);
        
        // Mapear usando plan_code del metadata
        const planMapping: { [key: string]: number } = {
          'primo_chambeador': 1,
          'mero_patron': 2,
          'master_contractor': 3,
        };
        
        const planId = planMapping[planCode] || 1;
        console.log(`🔄 [FIREBASE-SUBSCRIPTION] Mapped to plan ID: ${planId}`);
        return planId;
      }
    }
    
    // Fallback: mapear usando nombres conocidos en el price ID
    if (priceId.includes('patron')) {
      return 2; // Mero Patrón
    } else if (priceId.includes('master') || priceId.includes('contractor')) {
      return 3; // Master Contractor
    }
    
    console.log(`🔄 [FIREBASE-SUBSCRIPTION] Using default plan ID: 1`);
    return 1; // Default to free plan
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