import admin from 'firebase-admin';

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'owlfence-f4570',
  });
}

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
      
      const subscriptionRef = admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('subscription')
        .doc('info');

      const dataToSave = {
        ...subscriptionData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(subscriptionData.id ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() })
      };

      await subscriptionRef.set(dataToSave, { merge: true });
      
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
      
      const subscriptionRef = admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('subscription')
        .doc('info');

      const doc = await subscriptionRef.get();
      
      if (!doc.exists) {
        console.log(`📭 [FIREBASE-SUBSCRIPTION] No se encontró suscripción para usuario: ${userId}`);
        return null;
      }

      const data = doc.data() as SubscriptionData;
      console.log(`✅ [FIREBASE-SUBSCRIPTION] Suscripción encontrada:`, data.status);
      
      return data;
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
}

export const firebaseSubscriptionService = new FirebaseSubscriptionService();