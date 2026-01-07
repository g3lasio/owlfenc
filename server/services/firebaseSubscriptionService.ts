import { db } from '../db';
import { userSubscriptions, subscriptionPlans, users } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { userMappingService } from './userMappingService';
import { TRIAL_PLAN_ID, SUBSCRIPTION_PLANS } from '../constants/subscription';
import { PLAN_IDS } from '@shared/permissions-config';

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
  isPlatformOwner?: boolean; // Platform owner flag for unlimited access
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
      planId: PLAN_IDS.MASTER_CONTRACTOR, // Master Contractor (ID: 6)
      stripeSubscriptionId: 'owner_unlimited_access',
      stripeCustomerId: 'owner_customer',
      currentPeriodStart: currentDate,
      currentPeriodEnd: futureDate,
      cancelAtPeriodEnd: false,
      billingCycle: 'yearly',
      createdAt: currentDate,
      updatedAt: currentDate,
      isPlatformOwner: true // ✅ Flag to bypass all limits in middleware
    };
  }
  
  /**
   * 🛡️ DEPRECATED: Usar createOrUpdateSubscriptionFromWebhook para planes pagos
   * Solo debe usarse para planes gratuitos y trials (planId 5 o 4)
   */
  async createOrUpdateSubscription(userId: string, subscriptionData: Partial<SubscriptionData>): Promise<void> {
    try {
      console.log(`📧 [FIREBASE-SUBSCRIPTION] Creando/actualizando suscripción para usuario: ${userId}`);
      
      // 🛡️ SECURITY: Block paid plan updates through this method
      if (subscriptionData.planId && subscriptionData.planId !== PLAN_IDS.PRIMO_CHAMBEADOR && subscriptionData.planId !== TRIAL_PLAN_ID) {
        console.error(`🚨 [SECURITY] Attempted to create paid plan (${subscriptionData.planId}) without webhook verification for user: ${userId}`);
        throw new Error('Paid plans must be created through Stripe webhook verification');
      }
      
      // Obtener el user_id interno desde Firebase UID
      const internalUserId = await userMappingService.getInternalUserId(userId);
      if (!internalUserId) {
        throw new Error(`No internal user ID found for Firebase UID: ${userId}`);
      }
      
      // 🛡️ CRITICAL SECURITY: Si es un trial, verificar hasUsedTrial
      if (subscriptionData.planId === TRIAL_PLAN_ID) {
        const userRecord = await db!
          .select()
          .from(users)
          .where(eq(users.id, internalUserId))
          .limit(1);
        
        if (userRecord.length > 0 && userRecord[0].hasUsedTrial === true) {
          console.error(`🚨 [SECURITY] User ${userId} attempted to create another trial but hasUsedTrial=true`);
          throw new Error('User has already used their one-time trial. Trials cannot be reset or renewed.');
        }
      }
      
      // Verificar si ya existe una suscripción
      const existing = await db!
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, internalUserId))
        .limit(1);
      
      if (existing.length > 0) {
        // 🛡️ SECURITY: Prevent upgrading to paid plans without webhook
        const newPlanId = subscriptionData.planId || existing[0].planId;
        if (newPlanId !== PLAN_IDS.PRIMO_CHAMBEADOR && newPlanId !== TRIAL_PLAN_ID && existing[0].planId !== newPlanId) {
          console.error(`🚨 [SECURITY] Attempted to upgrade to paid plan (${newPlanId}) without webhook for user: ${userId}`);
          throw new Error('Plan upgrades must be processed through Stripe');
        }
        
        // 🛡️ CRITICAL: Si están actualizando a trial, establecer hasUsedTrial
        if (newPlanId === TRIAL_PLAN_ID && existing[0].planId !== TRIAL_PLAN_ID) {
          await db!.transaction(async (tx) => {
            // Marcar hasUsedTrial como true PERMANENTEMENTE
            const updateResult = await tx
              .update(users)
              .set({ hasUsedTrial: true })
              .where(eq(users.id, internalUserId));
            
            if (!updateResult.rowCount || updateResult.rowCount === 0) {
              throw new Error('User not found in database - cannot update to trial');
            }
            
            // Actualizar suscripción a trial solo después de marcar hasUsedTrial
            await tx
              .update(userSubscriptions)
              .set({
                planId: subscriptionData.planId || existing[0].planId,
                status: subscriptionData.status || 'trialing',
                stripeSubscriptionId: subscriptionData.stripeSubscriptionId || existing[0].stripeSubscriptionId,
                stripeCustomerId: subscriptionData.stripeCustomerId || existing[0].stripeCustomerId,
                currentPeriodStart: subscriptionData.currentPeriodStart || existing[0].currentPeriodStart,
                currentPeriodEnd: subscriptionData.currentPeriodEnd || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd ?? existing[0].cancelAtPeriodEnd,
                billingCycle: subscriptionData.billingCycle || existing[0].billingCycle,
                updatedAt: new Date()
              })
              .where(eq(userSubscriptions.userId, internalUserId));
            
            console.log(`✅ [SECURITY] Subscription updated to trial with hasUsedTrial=true for user ${userId}`);
          });
        } else {
          // Actualizar suscripción normal (no trial)
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
        }
      } else {
        // 🛡️ CRITICAL: Si es un trial, marcar hasUsedTrial ANTES de crear suscripción
        if (subscriptionData.planId === TRIAL_PLAN_ID) {
          await db!.transaction(async (tx) => {
            // Marcar hasUsedTrial como true PERMANENTEMENTE
            const updateResult = await tx
              .update(users)
              .set({ hasUsedTrial: true })
              .where(eq(users.id, internalUserId));
            
            if (!updateResult.rowCount || updateResult.rowCount === 0) {
              throw new Error('User not found in database - cannot create trial');
            }
            
            // Crear suscripción trial solo después de marcar hasUsedTrial
            await tx
              .insert(userSubscriptions)
              .values({
                userId: internalUserId,
                planId: subscriptionData.planId || TRIAL_PLAN_ID, // Garantizar planId para TypeScript
                status: subscriptionData.status || 'trialing',
                stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
                stripeCustomerId: subscriptionData.stripeCustomerId,
                currentPeriodStart: subscriptionData.currentPeriodStart || new Date(),
                currentPeriodEnd: subscriptionData.currentPeriodEnd || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días
                cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false,
                billingCycle: subscriptionData.billingCycle || 'monthly',
                createdAt: new Date(),
                updatedAt: new Date()
              });
            
            console.log(`✅ [SECURITY] Trial created with hasUsedTrial=true for user ${userId}`);
          });
        } else {
          // Crear suscripción gratuita (no trial)
          await db!
            .insert(userSubscriptions)
            .values({
              userId: internalUserId,
              planId: subscriptionData.planId || PLAN_IDS.PRIMO_CHAMBEADOR,
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
   * 🛡️ SECURE: Actualizar suscripción desde webhook de Stripe verificado
   * Este es el ÚNICO método que puede actualizar planes pagos (planId 2 o 3)
   */
  async updateSubscriptionFromStripe(
    userId: string, 
    stripeSubscriptionId: string, 
    stripeData: any
  ): Promise<void> {
    try {
      console.log(`🔒 [SECURE-WEBHOOK] Actualizando desde Stripe webhook VERIFICADO para usuario: ${userId}`);
      console.log(`🔒 [SECURE-WEBHOOK] Stripe subscription ID: ${stripeSubscriptionId}`);
      
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
          'primo_chambeador': PLAN_IDS.PRIMO_CHAMBEADOR,  // 5
          'mero_patron': PLAN_IDS.MERO_PATRON,           // 9
          'master_contractor': PLAN_IDS.MASTER_CONTRACTOR, // 6
        };
        
        const planId = planMapping[planCode] || PLAN_IDS.PRIMO_CHAMBEADOR;
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

  // 🚨 REMOVED FOR SECURITY: createCurrentSubscription method was allowing payment bypass
  // All subscription creations must go through:
  // 1. Stripe checkout for paid plans (planId 2 or 3) → updateSubscriptionFromStripe()
  // 2. secureTrialService.activateTrial() for trial plans (planId 4)  
  // 3. Webhook-verified updates only for premium subscriptions
  // Never create subscriptions directly without payment verification!

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
          planId: PLAN_IDS.PRIMO_CHAMBEADOR,
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
        planId: PLAN_IDS.PRIMO_CHAMBEADOR, // Plan gratuito ID: 5
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
        planId: PLAN_IDS.PRIMO_CHAMBEADOR, // Plan gratuito ID: 5
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
  /**
   * Asigna el plan gratuito por defecto (Primo Chambeador) a un nuevo usuario.
   * Esta función se llama solo durante el registro.
   * @param firebaseUid - El Firebase UID del nuevo usuario.
   */
  async assignDefaultFreePlan(firebaseUid: string): Promise<void> {
    try {
      console.log(`🚀 [SUBSCRIPTION] Asignando plan gratuito por defecto a nuevo usuario: ${firebaseUid}`);
      
      const planId = PLAN_IDS.PRIMO_CHAMBEADOR;

      // El plan gratuito es "anual" para no molestar al usuario, pero es gratis.
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      const subscriptionData: Partial<SubscriptionData> = {
        planId: planId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: oneYearFromNow,
        billingCycle: 'yearly',
        cancelAtPeriodEnd: false,
      };

      // Usar el método existente que ya tiene las validaciones de seguridad
      await this.createOrUpdateSubscription(firebaseUid, subscriptionData);

      console.log(`✅ [SUBSCRIPTION] Plan 'Primo Chambeador' asignado exitosamente a ${firebaseUid}`);

    } catch (error) {
      console.error(`❌ [SUBSCRIPTION] Error asignando plan gratuito por defecto a ${firebaseUid}:`, error);
      // No relanzar el error para no interrumpir el flujo de login, pero sí loggearlo.
      // El usuario podrá elegir un plan manualmente si esto falla.
    }
  }

}

export const firebaseSubscriptionService = new FirebaseSubscriptionService();