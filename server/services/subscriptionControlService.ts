import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { 
  userSubscriptions, 
  userUsageLimits, 
  subscriptionPlans, 
  usageAuditLog 
} from '@shared/schema';

export interface SubscriptionStatus {
  isActive: boolean;
  planName: string;
  planId: number;
  daysRemaining: number;
  isTrialing: boolean;
  trialDaysUsed: number;
  currentPeriodEnd: Date;
}

export interface UsageStatus {
  feature: string;
  used: number;
  limit: number;
  canUse: boolean;
  isUnlimited: boolean;
}

export class SubscriptionControlService {
  
  /**
   * Obtener estado real de suscripción desde PostgreSQL
   */
  async getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null> {
    try {
      const result = await db!
        .select({
          userSub: userSubscriptions,
          plan: subscriptionPlans
        })
        .from(userSubscriptions)
        .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(eq(userSubscriptions.userId, parseInt(userId)))
        .limit(1);

      if (!result.length) {
        console.log(`📭 [SUBSCRIPTION-CONTROL] No subscription found for user: ${userId}`);
        return null;
      }

      const { userSub, plan } = result[0];
      const now = new Date();
      const periodEnd = new Date(userSub.currentPeriodEnd || new Date());
      const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        isActive: userSub.status === 'active' || userSub.status === 'trialing',
        planName: plan?.name || 'Unknown',
        planId: userSub.planId,
        daysRemaining,
        isTrialing: userSub.status === 'trialing',
        trialDaysUsed: 0, // Simplificado por ahora
        currentPeriodEnd: periodEnd
      };
    } catch (error) {
      console.error('❌ [SUBSCRIPTION-CONTROL] Error getting subscription status:', error);
      throw error;
    }
  }

  /**
   * Verificar si usuario puede usar una funcionalidad específica
   */
  async canUseFeature(userId: string, feature: string): Promise<UsageStatus> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // "2025-08"
      
      if (!db) {
        throw new Error('Database connection not available');
      }

      const usageResult = await db
        .select()
        .from(userUsageLimits)
        .where(and(
          eq(userUsageLimits.userId, userId),
          eq(userUsageLimits.month, currentMonth)
        ))
        .limit(1);

      if (!usageResult.length) {
        // Crear límites para el mes actual si no existen
        await this.initializeMonthlyLimits(userId);
        return this.canUseFeature(userId, feature); // Reintento recursivo
      }

      const usage = usageResult[0];
      const limitField = `${feature}Limit` as keyof typeof usage;
      const usedField = `${feature}Used` as keyof typeof usage;
      
      const limit = usage[limitField] as number || 0;
      const used = usage[usedField] as number || 0;
      
      // -1 significa ilimitado
      const isUnlimited = limit === -1;
      const canUse = isUnlimited || used < limit;

      return {
        feature,
        used,
        limit: isUnlimited ? -1 : limit,
        canUse,
        isUnlimited
      };
    } catch (error) {
      console.error(`❌ [SUBSCRIPTION-CONTROL] Error checking feature ${feature}:`, error);
      throw error;
    }
  }

  /**
   * Incrementar uso de una funcionalidad (CON CONTROL REAL)
   */
  async incrementUsage(userId: string, feature: string, count: number = 1): Promise<boolean> {
    try {
      // Verificar límites ANTES de incrementar
      const usageStatus = await this.canUseFeature(userId, feature);
      
      if (!usageStatus.canUse) {
        console.warn(`⚠️ [SUBSCRIPTION-CONTROL] Usage limit exceeded for ${feature} by user ${userId}`);
        
        // Registrar intento de exceder límite
        await this.logUsage(userId, feature, 'limit_exceeded', {
          attempted: count,
          currentUsage: usageStatus.used,
          limit: usageStatus.limit
        });
        
        return false; // BLOQUEADO
      }

      // Incrementar uso
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usedField = `${feature}Used`;
      
      if (!db) {
        throw new Error('Database connection not available');
      }

      await db
        .update(userUsageLimits)
        .set({
          [usedField]: usageStatus.used + count,
          updatedAt: new Date()
        })
        .where(and(
          eq(userUsageLimits.userId, userId),
          eq(userUsageLimits.month, currentMonth)
        ));

      // Registrar uso exitoso
      await this.logUsage(userId, feature, 'used', {
        count,
        newTotal: usageStatus.used + count,
        limit: usageStatus.limit
      });

      console.log(`✅ [SUBSCRIPTION-CONTROL] ${feature} incremented by ${count} for user ${userId}`);
      return true; // PERMITIDO
    } catch (error) {
      console.error(`❌ [SUBSCRIPTION-CONTROL] Error incrementing ${feature}:`, error);
      throw error;
    }
  }

  /**
   * Inicializar límites mensuales basados en el plan del usuario
   */
  private async initializeMonthlyLimits(userId: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscriptionStatus(userId);
      if (!subscription) {
        throw new Error('User has no subscription');
      }

      if (!db) {
        throw new Error('Database connection not available');
      }

      // Obtener límites del plan
      const planResult = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, subscription.planId))
        .limit(1);

      if (!planResult.length) {
        throw new Error(`Plan ${subscription.planId} not found`);
      }

      const plan = planResult[0];
      const features = plan.features as any;
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Crear límites para el mes actual
      await db.insert(userUsageLimits).values({
        userId,
        month: currentMonth,
        planId: subscription.planId,
        basicEstimatesLimit: features.basicEstimates || 0,
        aiEstimatesLimit: features.aiEstimates || 0,
        contractsLimit: features.contracts || 0,
        propertyVerificationsLimit: features.propertyVerifications || 0,
        permitAdvisorLimit: features.permitAdvisor || 0,
        projectsLimit: features.projects || 0,
      });

      console.log(`✅ [SUBSCRIPTION-CONTROL] Monthly limits initialized for user ${userId} with plan ${plan.name}`);
    } catch (error) {
      console.error('❌ [SUBSCRIPTION-CONTROL] Error initializing monthly limits:', error);
      throw error;
    }
  }

  /**
   * Registrar actividad de uso para auditoría
   */
  private async logUsage(userId: string, feature: string, action: string, details: any): Promise<void> {
    try {
      if (!db) {
        console.warn('Database connection not available for logging');
        return;
      }

      await db.insert(usageAuditLog).values({
        userId,
        feature,
        action,
        details
      });
    } catch (error) {
      console.error('❌ [SUBSCRIPTION-CONTROL] Error logging usage:', error);
      // No lanzar error para no interrumpir flujo principal
    }
  }

  /**
   * Crear suscripción de trial para nuevo usuario
   */
  async createTrialSubscription(userId: string): Promise<void> {
    try {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7); // 7 días de trial

      await db.insert(userSubscriptions).values({
        userId,
        planId: 1, // Asumir que plan 1 es "Free Trial"
        status: 'trialing',
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEnd,
        trialDaysUsed: 0
      });

      console.log(`✅ [SUBSCRIPTION-CONTROL] Trial subscription created for user ${userId}`);
    } catch (error) {
      console.error('❌ [SUBSCRIPTION-CONTROL] Error creating trial:', error);
      throw error;
    }
  }
}

export const subscriptionControlService = new SubscriptionControlService();