import { db } from '../db';
import { userSubscriptions, subscriptionPlans, users } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { userMappingService } from './userMappingService';
import { TRIAL_PLAN_ID } from '../constants/subscription';

// IMPORTANT: Using PostgreSQL database for persistent storage across devices

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
  
  // OWNER PRIVILEGES: Platform owner gets unlimited Master Contractor access
  // SISTEMA UNIFICADO: Owner identificado por Firebase UID, no email-based ID
  private readonly OWNER_EMAILS = ['truthbackpack@gmail.com'];
  
  private isOwnerUser(userId: string, email?: string): boolean {
    // Verificar si el usuario es owner por email si está disponible
    if (email && this.OWNER_EMAILS.includes(email.toLowerCase())) {
      return true;
    }
    // No legacy IDs - only real owner
    return false;
  }
  private readonly OWNER_FIREBASE_UID = 'qztot1YEy3UWz605gIH2iwwWhW53'; // Real Firebase UID
  
  /**
   * Check if user is the platform owner (supports both legacy email-based ID and Firebase UID)
   */
  private isOwner(userId: string): boolean {
    return this.isOwnerUser(userId) || userId === this.OWNER_FIREBASE_UID;
  }
  
  /**
   * Create Master Contractor subscription for owner
   */
  private createOwnerSubscription(): SubscriptionData {
    const currentDate = new Date();
    const futureDate = new Date();
    futureDate.setFullYear(currentDate.getFullYear() + 10); // 10 years validity
    
    return {
      id: 'owner_unlimited',
      status: 'active',
      planId: 3, // Master Contractor
      stripeSubscriptionId: 'owner_unlimited_access',
      stripeCustomerId: 'owner_customer',
      currentPeriodStart: currentDate,
      currentPeriodEnd: futureDate,
      cancelAtPeriodEnd: false,
      billingCycle: 'yearly',
      createdAt: currentDate,
      updatedAt: currentDate
    };
  }
  
  /**
   * Crear o actualizar suscripción del usuario
   */
  async createOrUpdateSubscription(userId: string, subscriptionData: Partial<SubscriptionData>): Promise<void> {
    try {
      console.log(`📧 [FIREBASE-SUBSCRIPTION] Creando/actualizando suscripción para usuario: ${userId}`);
      
      // Obtener el user_id interno desde Firebase UID
      const internalUserId = await userMappingService.getInternalUserId(userId);
      if (!internalUserId) {
        throw new Error(`No internal user ID found for Firebase UID: ${userId}`);
      }
      
      // Verificar si ya existe una suscripción
      const existing = await db!
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, internalUserId))
        .limit(1);
      
      if (existing.length > 0) {
        // Actualizar suscripción existente
        await db!
          .update(userSubscriptions)
          .set({
            planId: subscriptionData.planId || existing[0].planId,
            status: subscriptionData.status || existing[0].status,
            stripeSubscriptionId: subscriptionData.stripeSubscriptionId || existing[0].stripeSubscriptionId,
            stripeCustomerId: subscriptionData.stripeCustomerId || existing[0].stripeCustomerId,
            currentPeriodStart: subscriptionData.currentPeriodStart || existing[0].currentPeriodStart,
            currentPeriodEnd: subscriptionData.currentPeriodEnd || existing[0].currentPeriodEnd,
            cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd ?? existing[0].cancelAtPeriodEnd,
            billingCycle: subscriptionData.billingCycle || existing[0].billingCycle,
            updatedAt: new Date()
          })
          .where(eq(userSubscriptions.userId, internalUserId));
      } else {
        // Crear nueva suscripción
        await db!
          .insert(userSubscriptions)
          .values({
            userId: internalUserId,
            planId: subscriptionData.planId || 1,
            status: subscriptionData.status || 'active',
            stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
            stripeCustomerId: subscriptionData.stripeCustomerId,
            currentPeriodStart: subscriptionData.currentPeriodStart || new Date(),
            currentPeriodEnd: subscriptionData.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false,
            billingCycle: subscriptionData.billingCycle || 'monthly',
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
      
      console.log(`✅ [FIREBASE-SUBSCRIPTION] Suscripción guardada exitosamente en PostgreSQL`);
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
      
      // OWNER PRIVILEGES: Always return Master Contractor for platform owner
      if (this.isOwner(userId)) {
        console.log(`👑 [FIREBASE-SUBSCRIPTION] Platform owner detected - granting unlimited Master Contractor access`);
        return this.createOwnerSubscription();
      }
      
      // Obtener el user_id interno desde Firebase UID
      const internalUserId = await userMappingService.getInternalUserId(userId);
      if (!internalUserId) {
        console.log(`📭 [FIREBASE-SUBSCRIPTION] No internal user ID found for Firebase UID: ${userId}`);
        return null;
      }
      
      // Buscar en la base de datos real
      const result = await db!
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, internalUserId))
        .orderBy(desc(userSubscriptions.createdAt))
        .limit(1);
      
      if (result.length === 0) {
        console.log(`📭 [FIREBASE-SUBSCRIPTION] No se encontró suscripción para usuario: ${userId}`);
        return null;
      }
      
      const subscription = result[0];
      console.log(`✅ [FIREBASE-SUBSCRIPTION] Suscripción encontrada:`, subscription.status);
      
      // Convertir al formato esperado
      return {
        id: subscription.stripeSubscriptionId || `sub_${subscription.id}`,
        status: subscription.status as 'active' | 'inactive' | 'canceled' | 'trialing',
        planId: subscription.planId,
        stripeSubscriptionId: subscription.stripeSubscriptionId || undefined,
        stripeCustomerId: subscription.stripeCustomerId || undefined,
        currentPeriodStart: subscription.currentPeriodStart || new Date(),
        currentPeriodEnd: subscription.currentPeriodEnd || new Date(),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
        billingCycle: subscription.billingCycle as 'monthly' | 'yearly',
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt
      };
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
      // OWNER PRIVILEGES: Always active for platform owner
      if (this.isOwner(userId)) {
        console.log(`👑 [FIREBASE-SUBSCRIPTION] Platform owner - subscription always active`);
        return true;
      }
      
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
   * Create 14-day Trial Master subscription for new users
   */
  async createTrialMasterSubscription(userId: string): Promise<void> {
    try {
      console.log(`🧪 [FIREBASE-SUBSCRIPTION] Creating 14-day Trial Master for user: ${userId}`);
      
      // Obtener el user_id interno desde Firebase UID
      const internalUserId = await userMappingService.getInternalUserId(userId);
      if (!internalUserId) {
        // Si no existe, crear el mapeo primero
        const userEmail = await this.getUserEmailFromFirebase(userId);
        await userMappingService.createMapping(userId, userEmail || '');
        const newInternalUserId = await userMappingService.getInternalUserId(userId);
        if (!newInternalUserId) {
          throw new Error(`Cannot create internal user ID for Firebase UID: ${userId}`);
        }
      }
      
      // 🛡️ PROTECCIÓN PERMANENTE ANTI-DUPLICADOS: Verificar flag hasUsedTrial que NUNCA se resetea
      await db!.transaction(async (tx) => {
        // 1. LOCK the user row FOR UPDATE to prevent concurrent race conditions
        const userRecord = await tx
          .select({ hasUsedTrial: users.hasUsedTrial })
          .from(users)
          .where(eq(users.id, internalUserId!))
          .for('update') // 🔒 ROW-LEVEL LOCK prevents concurrent access
          .limit(1);
        
        if (userRecord.length === 0) {
          throw new Error(`User with ID ${internalUserId} not found`);
        }
        
        if (userRecord[0].hasUsedTrial) {
          console.log(`🚫 [FIREBASE-SUBSCRIPTION] User ${internalUserId} has PERMANENT flag hasUsedTrial=true - NO RENEWAL EVER`);
          return; // El usuario ya usó su trial - incluso si hizo upgrade después
        }
        
        // 2. Verificar también si existe trial en la tabla de subscripciones (protección adicional)
        const anyExistingTrial = await tx
          .select()
          .from(userSubscriptions)
          .where(and(
            eq(userSubscriptions.userId, internalUserId!),
            eq(userSubscriptions.planId, TRIAL_PLAN_ID) // Trial plan
          ))
          .limit(1);
        
        if (anyExistingTrial.length > 0) {
          const existingTrial = anyExistingTrial[0];
          const isActive = existingTrial.currentPeriodEnd && new Date(existingTrial.currentPeriodEnd) > new Date();
          
          console.log(`⚠️ [FIREBASE-SUBSCRIPTION] Found trial in DB (active: ${isActive}) - marking flag for safety`);
          
          // Marcar el flag si no estaba marcado (reparar inconsistencias)
          await tx
            .update(users)
            .set({ hasUsedTrial: true })
            .where(eq(users.id, internalUserId!));
          
          return; // NO crear nuevo trial
        }
        
        // ✅ SOLO CREAR SI NUNCA HA TENIDO TRIAL (dentro de transacción atómica)
        const currentDate = new Date();
        const trialEndDate = new Date(currentDate);
        trialEndDate.setDate(currentDate.getDate() + 14); // 14 days trial
        
        // 3. Crear suscripción trial
        await tx
          .insert(userSubscriptions)
          .values({
            userId: internalUserId!,
            planId: TRIAL_PLAN_ID, // Trial Master plan
            status: 'trialing',
            stripeSubscriptionId: `trial_prod_${Date.now()}`,
            stripeCustomerId: `cus_trial_${Date.now()}`,
            currentPeriodStart: currentDate,
            currentPeriodEnd: trialEndDate,
            cancelAtPeriodEnd: true, // Automatically cancel after trial
            billingCycle: 'monthly',
            createdAt: currentDate,
            updatedAt: currentDate
          })
          .onConflictDoNothing(); // Si hay conflicto, no hacer nada (previene duplicados)
        
        // 4. Marcar PERMANENTEMENTE que el usuario ya usó su trial
        await tx
          .update(users)
          .set({ hasUsedTrial: true })
          .where(eq(users.id, internalUserId!));
        
        console.log(`✅ [FIREBASE-SUBSCRIPTION] Trial created atomically + hasUsedTrial flag SET PERMANENTLY - expires: ${trialEndDate.toISOString()}`);
      });
    } catch (error) {
      console.error('❌ [FIREBASE-SUBSCRIPTION] Error creating trial subscription:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to get user email from Firebase
   */
  private async getUserEmailFromFirebase(userId: string): Promise<string | null> {
    try {
      // This would normally use Firebase Admin SDK
      // For now, return null and let the caller handle it
      return null;
    } catch (error) {
      console.error('❌ [FIREBASE-SUBSCRIPTION] Error getting user email:', error);
      return null;
    }
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
        status: 'active' as const,
        planId: planId,
        stripeSubscriptionId: `sub_prod_${Date.now()}`,
        stripeCustomerId: `cus_prod_${Date.now()}`,
        currentPeriodStart: currentDate,
        currentPeriodEnd: nextMonth,
        cancelAtPeriodEnd: false,
        billingCycle: 'monthly' as const
      };

      await this.createOrUpdateSubscription(userId, subscriptionData);
      
      console.log(`✅ [FIREBASE-SUBSCRIPTION] Current subscription created in PostgreSQL - expires: ${nextMonth.toISOString()}`);
    } catch (error) {
      console.error('❌ [FIREBASE-SUBSCRIPTION] Error creating current subscription:', error);
      throw error;
    }
  }

  /**
   * Check if trial has expired and downgrade to free plan
   */
  async checkAndExpireTrial(userId: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription || subscription.planId !== 4) {
        return; // Not a trial user
      }

      const now = new Date();
      const isExpired = subscription.currentPeriodEnd <= now;
      
      if (isExpired && subscription.status === 'trialing') {
        console.log(`⏰ [FIREBASE-SUBSCRIPTION] Trial expired for user: ${userId}, downgrading to free plan`);
        
        // Downgrade to Primo Chambeador (free plan)
        await this.createOrUpdateSubscription(userId, {
          status: 'canceled',
          planId: 1, // Primo Chambeador
          cancelAtPeriodEnd: true
        });
        
        console.log(`✅ [FIREBASE-SUBSCRIPTION] User downgraded to free plan after trial expiration`);
      }
    } catch (error) {
      console.error('❌ [FIREBASE-SUBSCRIPTION] Error checking trial expiration:', error);
    }
  }

  /**
   * Get remaining trial days for Trial Master users
   */
  async getTrialDaysRemaining(userId: string): Promise<number> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription || subscription.planId !== 4 || subscription.status !== 'trialing') {
        return 0; // Not a trial user
      }

      const now = new Date();
      const endDate = new Date(subscription.currentPeriodEnd);
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return Math.max(0, diffDays); // Never return negative days
    } catch (error) {
      console.error('❌ [FIREBASE-SUBSCRIPTION] Error getting trial days remaining:', error);
      return 0;
    }
  }

  /**
   * Degradar usuario a plan gratuito cuando expira su suscripción
   */
  async degradeToFreePlan(userId: string): Promise<void> {
    try {
      console.log(`⬇️ [FIREBASE-SUBSCRIPTION] Degradando usuario ${userId} a plan gratuito`);
      
      const freePlanData = {
        status: 'active' as const,
        planId: 1, // primo_chambeador (plan gratuito)
        stripeSubscriptionId: `free_prod_${Date.now()}`,
        stripeCustomerId: `cus_free_${Date.now()}`,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año de validez
        cancelAtPeriodEnd: false,
        billingCycle: 'monthly' as const
      };

      await this.createOrUpdateSubscription(userId, freePlanData);
      console.log(`✅ [FIREBASE-SUBSCRIPTION] Usuario degradado a plan gratuito exitosamente en PostgreSQL`);
    } catch (error) {
      console.error('❌ [FIREBASE-SUBSCRIPTION] Error degradando a plan gratuito:', error);
      throw error;
    }
  }

  /**
   * Crear plan gratuito por defecto para nuevos usuarios
   */
  async createFreePlanSubscription(userId: string): Promise<void> {
    try {
      console.log(`🆓 [FIREBASE-SUBSCRIPTION] Creando plan gratuito por defecto para usuario: ${userId}`);
      
      const freePlanData = {
        status: 'active' as const,
        planId: 1, // primo_chambeador (plan gratuito)
        stripeSubscriptionId: `free_prod_${Date.now()}`,
        stripeCustomerId: `cus_free_${Date.now()}`,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año de validez
        cancelAtPeriodEnd: false,
        billingCycle: 'monthly' as const
      };

      await this.createOrUpdateSubscription(userId, freePlanData);
      console.log(`✅ [FIREBASE-SUBSCRIPTION] Plan gratuito creado exitosamente en PostgreSQL`);
    } catch (error) {
      console.error('❌ [FIREBASE-SUBSCRIPTION] Error creando plan gratuito:', error);
      throw error;
    }
  }
}

export const firebaseSubscriptionService = new FirebaseSubscriptionService();