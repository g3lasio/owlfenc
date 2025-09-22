import { db } from '../db';
import { eq, desc, sql } from 'drizzle-orm';
import { users, userSubscriptions, subscriptionPlans } from '../../shared/schema';

/**
 * SERVICIO DE MAPEO DE USUARIOS FIREBASE ↔ POSTGRESQL
 * Conecta Firebase UID con user_id interno para preservar datos del usuario
 */

interface UserMapping {
  firebaseUid: string;
  internalUserId: number;
  email: string;
  isActive: boolean;
}

export class UserMappingService {
  
  /**
   * Obtener user_id interno desde Firebase UID
   */
  async getInternalUserId(firebaseUid: string): Promise<number | null> {
    try {
      console.log(`🔍 [USER-MAPPING] Buscando user_id para Firebase UID: ${firebaseUid}`);
      
      // Buscar en tabla users usando firebase_uid
      const userResult = await db!
        .select({ id: users.id })
        .from(users)
        .where(eq(users.firebaseUid, firebaseUid))
        .limit(1);
      
      if (userResult.length > 0) {
        const userId = userResult[0].id;
        console.log(`✅ [USER-MAPPING] Firebase UID ${firebaseUid} -> user_id ${userId}`);
        return userId;
      }
      
      console.log(`❌ [USER-MAPPING] No encontrado mapeo para Firebase UID: ${firebaseUid}`);
      return null;
      
    } catch (error) {
      console.error('❌ [USER-MAPPING] Error getting internal user ID:', error);
      return null;
    }
  }

  /**
   * Crear mapeo para usuario existente
   */
  async createMapping(firebaseUid: string, email: string): Promise<number | null> {
    try {
      console.log(`🔄 [USER-MAPPING] Creando mapeo para ${email} (${firebaseUid})`);
      
      // Primero intentar encontrar usuario por email
      const existingUserResult = await db!
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (existingUserResult.length > 0) {
        const existingUser = existingUserResult[0];
        
        // Actualizar el Firebase UID del usuario existente
        await db!
          .update(users)
          .set({ firebaseUid })
          .where(eq(users.id, existingUser.id));
        
        console.log(`✅ [USER-MAPPING] Mapeo creado: ${email} -> user_id ${existingUser.id}`);
        return existingUser.id;
      }
      
      // Si no existe, crear nuevo usuario con campos obligatorios
      const newUserResult = await db!
        .insert(users)
        .values({
          username: email.split('@')[0],
          password: '', // Empty password for Firebase users
          email,
          firebaseUid,
          company: '',
          ownerName: email.split('@')[0],
          role: 'contractor',
        })
        .returning({ id: users.id });
      
      if (newUserResult.length > 0) {
        const newUserId = newUserResult[0].id;
        console.log(`✅ [USER-MAPPING] Usuario creado: ${email} -> user_id ${newUserId}`);
        return newUserId;
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ [USER-MAPPING] Error creating mapping:', error);
      return null;
    }
  }

  /**
   * Obtener suscripción del usuario usando Firebase UID
   */
  async getUserSubscriptionByFirebaseUid(firebaseUid: string) {
    try {
      console.log(`🔍 [USER-MAPPING] Obteniendo suscripción para Firebase UID: ${firebaseUid}`);
      
      // Primero obtener el user_id interno
      const internalUserId = await this.getInternalUserId(firebaseUid);
      
      if (!internalUserId) {
        console.log(`❌ [USER-MAPPING] No se encontró mapeo para Firebase UID: ${firebaseUid}`);
        return null;
      }
      
      // Obtener suscripción usando user_id interno - PRIORIZAR ACTIVAS/TRIALING
      const result = await db!
        .select({
          subscription: userSubscriptions,
          plan: subscriptionPlans
        })
        .from(userSubscriptions)
        .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(eq(userSubscriptions.userId, internalUserId))
        .orderBy(desc(userSubscriptions.createdAt)) // Orden por fecha más reciente
        .limit(1);
      
      if (result.length === 0) {
        console.log(`❌ [USER-MAPPING] No subscription found for user_id: ${internalUserId}`);
        return null;
      }
      
      const { subscription, plan } = result[0];
      
      console.log(`✅ [USER-MAPPING] Suscripción encontrada: ${plan?.name} para user_id ${internalUserId}`);
      
      return {
        subscription,
        plan,
        internalUserId
      };
      
    } catch (error) {
      console.error('❌ [USER-MAPPING] Error getting subscription:', error);
      return null;
    }
  }

  /**
   * Crear suscripción trial para Firebase UID
   */
  async createTrialSubscriptionForFirebaseUid(firebaseUid: string, email: string) {
    try {
      console.log(`🆓 [USER-MAPPING] Creando trial para ${email} (${firebaseUid})`);
      
      // Obtener o crear mapeo de usuario
      let internalUserId = await this.getInternalUserId(firebaseUid);
      
      if (!internalUserId) {
        internalUserId = await this.createMapping(firebaseUid, email);
      }
      
      if (!internalUserId) {
        throw new Error('No se pudo crear o encontrar usuario interno');
      }
      
      // Verificar si ya tiene suscripción
      const existingSubscription = await db!
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, internalUserId))
        .limit(1);
      
      if (existingSubscription.length > 0) {
        console.log(`⚠️ [USER-MAPPING] Usuario ${internalUserId} ya tiene suscripción`);
        return existingSubscription[0];
      }
      
      // Obtener plan Free Trial
      const trialPlan = await db!
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, 'Free Trial'))
        .limit(1);
      
      if (trialPlan.length === 0) {
        throw new Error('Free Trial plan not found');
      }
      
      // Crear suscripción trial de 21 días
      const trialStart = new Date();
      const trialEnd = new Date(Date.now() + (21 * 24 * 60 * 60 * 1000)); // 21 días
      
      const newSubscription = await db!
        .insert(userSubscriptions)
        .values({
          userId: internalUserId,
          planId: trialPlan[0].id,
          status: 'trialing',
          currentPeriodStart: trialStart,
          currentPeriodEnd: trialEnd,
          billingCycle: 'monthly'
        })
        .returning();
      
      console.log(`✅ [USER-MAPPING] Trial creado para user_id ${internalUserId}`);
      return newSubscription[0];
      
    } catch (error) {
      console.error('❌ [USER-MAPPING] Error creating trial:', error);
      throw error;
    }
  }

  /**
   * Verificar si el usuario puede usar una feature específica
   * CORREGIDO: Ahora usa el sistema robusto de PostgreSQL
   */
  async canUseFeature(firebaseUid: string, feature: string): Promise<{
    canUse: boolean;
    used: number;
    limit: number;
    planName?: string;
  }> {
    try {
      // Obtener user_id interno
      const internalUserId = await this.getInternalUserId(firebaseUid);
      if (!internalUserId) {
        return { canUse: false, used: 0, limit: 0 };
      }

      // Usar sistema robusto de PostgreSQL
      const { subscriptionControlService } = await import('./subscriptionControlService');
      const usageStatus = await subscriptionControlService.canUseFeature(internalUserId.toString(), feature);
      
      // Obtener nombre del plan
      const subscriptionData = await this.getUserSubscriptionByFirebaseUid(firebaseUid);
      const planName = subscriptionData?.plan?.name;
      
      return {
        canUse: usageStatus.canUse,
        used: usageStatus.used,
        limit: usageStatus.limit,
        planName
      };
      
    } catch (error) {
      console.error('❌ [USER-MAPPING] Error checking feature:', error);
      return { canUse: false, used: 0, limit: 0 };
    }
  }

  /**
   * Incrementar uso de una feature específica
   * NUEVO: Método para incrementar conteo real
   */
  async incrementFeatureUsage(firebaseUid: string, feature: string, count: number = 1): Promise<boolean> {
    try {
      const internalUserId = await this.getInternalUserId(firebaseUid);
      if (!internalUserId) {
        console.error('❌ [USER-MAPPING] No internal user ID found for incrementing usage');
        return false;
      }

      // Usar sistema robusto de PostgreSQL
      const { subscriptionControlService } = await import('./subscriptionControlService');
      const success = await subscriptionControlService.incrementUsage(internalUserId.toString(), feature, count);
      
      if (success) {
        console.log(`✅ [USER-MAPPING] Incremented ${feature} usage by ${count} for Firebase UID: ${firebaseUid}`);
      } else {
        console.warn(`⚠️ [USER-MAPPING] Failed to increment ${feature} usage - limit exceeded for Firebase UID: ${firebaseUid}`);
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ [USER-MAPPING] Error incrementing feature usage:', error);
      return false;
    }
  }
}

// Create singleton instance
export const userMappingService = new UserMappingService();

// Compatibility wrapper for uppercase file methods  
export class UserMappingServiceSingleton {
  static getInstance(): UserMappingService {
    return userMappingService;
  }
}