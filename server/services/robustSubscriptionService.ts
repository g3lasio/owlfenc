import { db } from '../db';
import { userMappingService } from './userMappingService';
import { eq, and } from 'drizzle-orm';
import { userSubscriptions, subscriptionPlans, userUsageLimits, users } from '@shared/schema';

/**
 * SERVICIO ROBUSTO DE SUSCRIPCIONES
 * Reemplaza firebaseSubscriptionService que usa Maps en memoria
 * Fuente única de verdad: PostgreSQL
 */

export interface RobustSubscriptionData {
  planId: string;
  planName: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  isActive: boolean;
  features: Record<string, number>;
  daysRemaining?: number;
  isTrialing: boolean;
}

export class RobustSubscriptionService {
  
  /**
   * Obtener suscripción REAL desde PostgreSQL (NO Maps)
   */
  async getUserSubscription(userId: string): Promise<RobustSubscriptionData | null> {
    try {
      console.log(`🔍 [ROBUST-SUBSCRIPTION] Getting REAL subscription for: ${userId}`);
      
      if (!db) {
        throw new Error('Database connection not available');
      }
      
      // 🔐 SECURITY FIX: Usar user_id real del usuario actual (NO compartir límites)
      const dbUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(userId);
      console.log(`🔐 [SECURITY] Using REAL user_id: ${dbUserId} for Firebase UID: ${userId}`);
      
      const result = await db
        .select({
          subscription: userSubscriptions,
          plan: subscriptionPlans
        })
        .from(userSubscriptions)
        .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(eq(userSubscriptions.userId, dbUserId))
        .limit(1);

      if (!result.length) {
        // 🚨 SECURITY: NO crear trial automático - prevenir bypass
        console.warn(`⚠️ [SECURITY] No subscription found for ${userId} - returning null (no auto-trial)`);
        return null; // Retornar null en lugar de crear trial automático
      }

      const { subscription, plan } = result[0];
      
      if (!plan) {
        console.error(`❌ [ROBUST-SUBSCRIPTION] Plan not found for subscription: ${subscription.planId}`);
        return null;
      }

      const now = new Date();
      const endDate = new Date(subscription.currentPeriodEnd || subscription.currentPeriodStart || now);
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      const subscriptionData: RobustSubscriptionData = {
        planId: plan.id.toString(),
        planName: plan.name,
        status: subscription.status as any,
        isActive: subscription.status === 'active' || subscription.status === 'trialing',
        features: plan.features as Record<string, number>,
        daysRemaining,
        isTrialing: subscription.status === 'trialing'
      };

      console.log(`✅ [ROBUST-SUBSCRIPTION] Found subscription:`, subscriptionData);
      return subscriptionData;
      
    } catch (error) {
      console.error('❌ [ROBUST-SUBSCRIPTION] Error getting subscription:', error);
      throw error;
    }
  }

  /**
   * Verificar si puede usar feature (CON LÍMITES REALES)
   */
  async canUseFeature(userId: string, feature: string): Promise<{ canUse: boolean; used: number; limit: number }> {
    try {
      // 🔐 SECURITY FIX: Usar user_id real del usuario (NO compartir límites)
      const dbUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(userId);
      console.log(`🔐 [SECURITY] Checking limits for REAL user_id: ${dbUserId}`);
      
      const subscription = await this.getUserSubscription(userId);
      if (!subscription || !subscription.isActive) {
        return { canUse: false, used: 0, limit: 0 };
      }

      const limit = subscription.features[feature] || 0;
      
      // -1 significa ilimitado
      if (limit === -1) {
        return { canUse: true, used: 0, limit: -1 };
      }

      // Obtener uso actual del mes
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      if (!db) {
        throw new Error('Database connection not available');
      }
      
      const usageResult = await db
        .select()
        .from(userUsageLimits)
        .where(and(
          eq(userUsageLimits.userId, dbUserId.toString()),
          eq(userUsageLimits.month, currentMonth)
        ))
        .limit(1);

      const used = usageResult.length ? (usageResult[0] as any)[`${feature}Used`] || 0 : 0;
      const canUse = used < limit;

      console.log(`🔍 [ROBUST-SUBSCRIPTION] Feature ${feature}: used=${used}, limit=${limit}, canUse=${canUse}`);
      
      return { canUse, used, limit };
    } catch (error) {
      console.error(`❌ [ROBUST-SUBSCRIPTION] Error checking feature ${feature}:`, error);
      return { canUse: false, used: 0, limit: 0 };
    }
  }

  /**
   * Incrementar uso (CON CONTROL REAL)
   */
  async incrementUsage(userId: string, feature: string, count: number = 1): Promise<boolean> {
    try {
      // 🔐 SECURITY FIX: Usar user_id real del usuario (NO compartir límites)
      const dbUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(userId);
      console.log(`🔐 [SECURITY] Incrementing usage for REAL user_id: ${dbUserId}`);
      
      const check = await this.canUseFeature(userId, feature);
      
      if (!check.canUse && check.limit !== -1) {
        console.warn(`⚠️ [ROBUST-SUBSCRIPTION] Feature ${feature} limit exceeded for ${userId}`);
        return false;
      }

      // Actualizar uso en PostgreSQL
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      // Verificar si existe el registro de uso
      if (!db) {
        throw new Error('Database connection not available');
      }
      
      const usageResult = await db
        .select()
        .from(userUsageLimits)
        .where(and(
          eq(userUsageLimits.userId, dbUserId.toString()),
          eq(userUsageLimits.month, currentMonth)
        ))
        .limit(1);

      if (!usageResult.length) {
        // Crear registro de uso si no existe
        await this.initializeMonthlyUsage(userId);
      }

      // Incrementar uso
      const usedField = `${feature}Used` as keyof typeof userUsageLimits;
      const updateData = {
        [usedField]: check.used + count,
        updatedAt: new Date()
      };

      await db
        .update(userUsageLimits)
        .set(updateData)
        .where(and(
          eq(userUsageLimits.userId, dbUserId.toString()),
          eq(userUsageLimits.month, currentMonth)
        ));

      console.log(`✅ [ROBUST-SUBSCRIPTION] ${feature} incremented by ${count} for ${userId}`);
      return true;
    } catch (error) {
      console.error(`❌ [ROBUST-SUBSCRIPTION] Error incrementing ${feature}:`, error);
      return false;
    }
  }

  /**
   * Activar plan elegido por el usuario (Free Trial, Primo, Mero, Master)
   * Este método crea la suscripción inicial cuando el usuario elige su plan
   * 
   * @param internalUserId - user_id numérico interno (NO Firebase UID)
   * @param planId - ID del plan (4=Free Trial, 5=Primo, 9=Mero, 6=Master)
   */
  async activateUserPlan(internalUserId: number, planId: number): Promise<RobustSubscriptionData> {
    try {
      console.log(`🎯 [ROBUST-SUBSCRIPTION] Activating plan ${planId} for internal user ID ${internalUserId}`);
      
      if (!db) {
        throw new Error('Database connection not available');
      }

      // Verificar que el plan existe
      const planResult = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, planId))
        .limit(1);

      if (planResult.length === 0) {
        throw new Error(`Plan ID ${planId} no encontrado`);
      }

      const plan = planResult[0];

      // Calcular fechas de suscripción
      const now = new Date();
      let currentPeriodEnd = new Date(now);
      
      // Si es Free Trial (ID 4), dar 14 días
      if (planId === 4) {
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 14);
      } else {
        // Planes de pago: 1 mes
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      }

      // Crear suscripción usando internalUserId directamente
      await db.insert(userSubscriptions).values({
        userId: internalUserId,
        planId,
        status: planId === 4 ? 'trialing' : 'active',
        currentPeriodStart: now,
        currentPeriodEnd,
        createdAt: now,
        updatedAt: now
      });

      console.log(`✅ [ROBUST-SUBSCRIPTION] Plan ${plan.name} activado para usuario interno ${internalUserId}`);
      
      // Obtener Firebase UID para getUserSubscription
      const userResult = await db
        .select({ firebaseUid: users.firebaseUid })
        .from(users)
        .where(eq(users.id, internalUserId))
        .limit(1);

      if (userResult.length === 0 || !userResult[0].firebaseUid) {
        throw new Error('Error: Usuario sin Firebase UID');
      }

      // Retornar datos de la suscripción usando Firebase UID
      const subscription = await this.getUserSubscription(userResult[0].firebaseUid);
      if (!subscription) {
        throw new Error('Error al obtener suscripción recién creada');
      }

      return subscription;

    } catch (error) {
      console.error('❌ [ROBUST-SUBSCRIPTION] Error activating plan:', error);
      throw error;
    }
  }

  /**
   * 🚨 DEPRECATED - SECURITY VULNERABILITY
   * Este método NO verifica hasUsedTrial y permite bypass de trials
   * Usar secureTrialService.activateTrial() que tiene verificación completa
   */
  private async createTrialSubscription(userId: string): Promise<void> {
    // 🛡️ SECURITY: Bloquear este método vulnerable
    console.error(`🚨 [SECURITY-BLOCKED] Attempted to use vulnerable createTrialSubscription in robustSubscriptionService for user: ${userId}`);
    throw new Error('createTrialSubscription is vulnerable. Use secureTrialService.activateTrial() with hasUsedTrial verification');
  }

  /**
   * Inicializar límites mensuales
   */
  private async initializeMonthlyUsage(userId: string): Promise<void> {
    try {
      // 🔐 SECURITY FIX: Usar user_id real del usuario (NO compartir límites)
      const dbUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(userId);
      console.log(`🔐 [SECURITY] Initializing usage for REAL user_id: ${dbUserId}`);
      
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) return;

      const currentMonth = new Date().toISOString().slice(0, 7);
      const features = subscription.features;

      if (!db) {
        throw new Error('Database connection not available');
      }
      
      await db.insert(userUsageLimits).values({
        userId: dbUserId.toString(),
        month: currentMonth,
        planId: parseInt(subscription.planId),
        basicEstimatesLimit: features.basicEstimates || 0,
        aiEstimatesLimit: features.aiEstimates || 0,
        contractsLimit: features.contracts || 0,
        propertyVerificationsLimit: features.propertyVerifications || 0,
        permitAdvisorLimit: features.permitAdvisor || 0,
        projectsLimit: features.projects || 0,
        basicEstimatesUsed: 0,
        aiEstimatesUsed: 0,
        contractsUsed: 0,
        propertyVerificationsUsed: 0,
        permitAdvisorUsed: 0,
        projectsUsed: 0
      });

      console.log(`✅ [ROBUST-SUBSCRIPTION] Monthly usage initialized for ${userId}`);
    } catch (error) {
      console.error('❌ [ROBUST-SUBSCRIPTION] Error initializing usage:', error);
    }
  }
}

export const robustSubscriptionService = new RobustSubscriptionService();