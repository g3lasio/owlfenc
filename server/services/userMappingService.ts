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

// ⚡ IN-MEMORY CACHE — Eliminates redundant DB queries for Firebase UID → user_id mapping
// Each entry cached for 5 minutes (TTL). Invalidated on user updates.
const UID_TO_USERID_CACHE = new Map<string, { userId: number; expiresAt: number }>();
const UID_TO_SUBSCRIPTION_CACHE = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedUserId(firebaseUid: string): number | null {
  const entry = UID_TO_USERID_CACHE.get(firebaseUid);
  if (entry && entry.expiresAt > Date.now()) return entry.userId;
  UID_TO_USERID_CACHE.delete(firebaseUid);
  return null;
}

function setCachedUserId(firebaseUid: string, userId: number): void {
  UID_TO_USERID_CACHE.set(firebaseUid, { userId, expiresAt: Date.now() + CACHE_TTL_MS });
}

function getCachedSubscription(firebaseUid: string): any | null {
  const entry = UID_TO_SUBSCRIPTION_CACHE.get(firebaseUid);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  UID_TO_SUBSCRIPTION_CACHE.delete(firebaseUid);
  return null;
}

function setCachedSubscription(firebaseUid: string, data: any): void {
  UID_TO_SUBSCRIPTION_CACHE.set(firebaseUid, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateUserCache(firebaseUid: string): void {
  UID_TO_USERID_CACHE.delete(firebaseUid);
  UID_TO_SUBSCRIPTION_CACHE.delete(firebaseUid);
}

export class UserMappingService {
  
  /**
   * Obtener user_id interno desde Firebase UID
   */
  async getInternalUserId(firebaseUid: string): Promise<number | null> {
    try {
      // ⚡ CACHE HIT: Return immediately without DB query
      const cached = getCachedUserId(firebaseUid);
      if (cached !== null) {
        return cached;
      }

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
        setCachedUserId(firebaseUid, userId); // ⚡ Cache for 5 min
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
   * CORREGIDO: Ahora retorna {id, wasCreated} para detectar usuarios nuevos vs existentes
   */
  async createMapping(firebaseUid: string, email: string): Promise<{id: number, wasCreated: boolean} | null> {
    try {
      // NORMALIZACIÓN DE EMAIL: Eliminar espacios y convertir a lowercase
      const normalizedEmail = email.trim().toLowerCase();
      console.log(`🔄 [USER-MAPPING] Creando mapeo para ${normalizedEmail} (${firebaseUid})`);
      
      // 🔧 CRITICAL FIX: Búsqueda CASE-INSENSITIVE para prevenir duplicados
      // Usar sql`LOWER(email)` para comparar sin importar mayúsculas/minúsculas
      const existingUserResult = await db!
        .select({ id: users.id, email: users.email, firebaseUid: users.firebaseUid })
        .from(users)
        .where(sql`LOWER(${users.email}) = ${normalizedEmail}`)
        .limit(1);
      
      if (existingUserResult.length > 0) {
        const existingUser = existingUserResult[0];
        
        // 🛡️ PROTECCIÓN: Verificar si ya tiene Firebase UID diferente
        if (existingUser.firebaseUid && existingUser.firebaseUid !== firebaseUid) {
          console.warn(`⚠️ [USER-MAPPING-CONFLICT] Usuario ${existingUser.id} (${normalizedEmail}) ya tiene Firebase UID diferente: ${existingUser.firebaseUid} vs ${firebaseUid}`);
          console.warn(`⚠️ [USER-MAPPING-CONFLICT] Esto puede indicar múltiples cuentas Firebase para el mismo email`);
        }
        
        // Solo actualizar si no tiene Firebase UID o es diferente
        if (!existingUser.firebaseUid || existingUser.firebaseUid !== firebaseUid) {
          await db!
            .update(users)
            .set({ firebaseUid })
            .where(eq(users.id, existingUser.id));
          
          console.log(`✅ [USER-MAPPING] Firebase UID actualizado: ${normalizedEmail} -> user_id ${existingUser.id}`);
        } else {
          console.log(`✅ [USER-MAPPING] Usuario ya mapeado correctamente: ${normalizedEmail} -> user_id ${existingUser.id}`);
        }
        
        return { id: existingUser.id, wasCreated: false }; // Usuario existente, no crear trial
      }
      
      // Si no existe, crear nuevo usuario con campos obligatorios Y EMAIL NORMALIZADO
      // CRITICAL FIX: username must be unique — use email+uid suffix to avoid collisions
      const baseUsername = normalizedEmail.split('@')[0];
      const uniqueUsername = `${baseUsername}_${firebaseUid.slice(-6)}`;
      
      try {
        const newUserResult = await db!
          .insert(users)
          .values({
            username: uniqueUsername,
            password: '', // Empty password for Firebase users
            email: normalizedEmail, // USAR EMAIL NORMALIZADO
            firebaseUid,
            company: '',
            ownerName: baseUsername,
            role: 'contractor',
          })
          .returning({ id: users.id });
        
        if (newUserResult.length > 0) {
          const newUserId = newUserResult[0].id;
          console.log(`✅ [USER-MAPPING] Usuario NUEVO creado: ${normalizedEmail} -> user_id ${newUserId}`);
          return { id: newUserId, wasCreated: true }; // Usuario verdaderamente nuevo, crear trial
        }
      } catch (insertError: any) {
        // Handle duplicate key race condition — another concurrent request may have created the user
        if (insertError?.code === '23505') {
          console.warn(`⚠️ [USER-MAPPING] Race condition on insert for ${normalizedEmail} — looking up existing record`);
          // Re-query to get the user that was just created by the concurrent request
          const raceResult = await db!
            .select({ id: users.id })
            .from(users)
            .where(sql`LOWER(${users.email}) = ${normalizedEmail}`)
            .limit(1);
          if (raceResult.length > 0) {
            // Update firebase_uid if not set
            await db!.update(users).set({ firebaseUid }).where(eq(users.id, raceResult[0].id));
            console.log(`✅ [USER-MAPPING] Race condition resolved: ${normalizedEmail} -> user_id ${raceResult[0].id}`);
            return { id: raceResult[0].id, wasCreated: false };
          }
        }
        throw insertError;
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
      // ⚡ CACHE HIT: Return subscription without DB query
      const cachedSub = getCachedSubscription(firebaseUid);
      if (cachedSub !== null) {
        return cachedSub;
      }

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
      
      const subResult = { subscription, plan, internalUserId };
      setCachedSubscription(firebaseUid, subResult); // ⚡ Cache for 5 min
      return subResult;
      
    } catch (error) {
      console.error('❌ [USER-MAPPING] Error getting subscription:', error);
      return null;
    }
  }

  /**
   * Crear suscripción trial para Firebase UID - IDEMPOTENTE
   * CORREGIDO: Solo crear trial para usuarios VERDADERAMENTE NUEVOS
   */
  async createTrialSubscriptionForFirebaseUid(firebaseUid: string, email: string, forceCreateForNewUser: boolean = false) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      console.log(`🆓 [USER-MAPPING] Creando trial para ${normalizedEmail} (${firebaseUid})`);
      
      // Obtener o crear mapeo de usuario
      let internalUserId = await this.getInternalUserId(firebaseUid);
      let wasUserCreated = false;
      
      if (!internalUserId) {
        const mappingResult = await this.createMapping(firebaseUid, normalizedEmail);
        if (!mappingResult) {
          throw new Error('No se pudo crear o encontrar usuario interno');
        }
        internalUserId = mappingResult.id;
        wasUserCreated = mappingResult.wasCreated;
      }
      
      // 🛡️ PROTECCIÓN PERMANENTE ANTI-DUPLICADOS usando flag hasUsedTrial
      return await db!.transaction(async (tx) => {
        // 1. LOCK the user row FOR UPDATE to prevent concurrent race conditions
        const userRecord = await tx
          .select({ hasUsedTrial: users.hasUsedTrial })
          .from(users)
          .where(eq(users.id, internalUserId))
          .for('update') // 🔒 ROW-LEVEL LOCK prevents concurrent access
          .limit(1);
        
        if (userRecord.length === 0) {
          throw new Error(`User with ID ${internalUserId} not found`);
        }
        
        // 2. Verificar el flag PERMANENTE hasUsedTrial
        if (userRecord[0].hasUsedTrial) {
          console.log(`🚫 [TRIAL-PROTECTION] Usuario ${internalUserId} has PERMANENT flag hasUsedTrial=true - NO RENEWAL EVER`);
          return null; // Usuario ya usó su trial - incluso si hizo upgrade después
        }
        
        // 3. Verificar también si existe suscripción histórica (doble check)
        const anyExistingSubscription = await tx
          .select()
          .from(userSubscriptions)
          .where(eq(userSubscriptions.userId, internalUserId))
          .limit(1);
        
        if (anyExistingSubscription.length > 0) {
          console.log(`⚠️ [TRIAL-PROTECTION] Found subscription in DB - marking flag for safety`);
          
          // Marcar el flag si no estaba marcado (reparar inconsistencias)
          await tx
            .update(users)
            .set({ hasUsedTrial: true })
            .where(eq(users.id, internalUserId));
          
          return anyExistingSubscription[0];
        }

        // 4. SOLO CREAR TRIAL si es usuario verdaderamente nuevo O se fuerza explícitamente
        if (!wasUserCreated && !forceCreateForNewUser) {
          console.log(`🚫 [TRIAL-PROTECTION] Usuario ${internalUserId} es existente por email - NO crear trial automático`);
          return null;
        }

        // 5. Obtener plan Free Trial
        const trialPlan = await tx
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.name, 'Free Trial'))
          .limit(1);
        
        if (trialPlan.length === 0) {
          throw new Error('Free Trial plan not found');
        }
        
        // 6. Crear suscripción trial de 14 días
        const trialStart = new Date();
        const trialEnd = new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)); // 14 días
        
        const newSubscription = await tx
          .insert(userSubscriptions)
          .values({
            userId: internalUserId,
            planId: trialPlan[0].id,
            status: 'trialing',
            currentPeriodStart: trialStart,
            currentPeriodEnd: trialEnd,
            billingCycle: 'monthly'
          })
          .onConflictDoNothing() // Prevenir duplicados en caso de race condition
          .returning();
        
        // 7. Marcar PERMANENTEMENTE que el usuario ya usó su trial
        await tx
          .update(users)
          .set({ hasUsedTrial: true })
          .where(eq(users.id, internalUserId));
        
        console.log(`✅ [USER-MAPPING] Trial creado de forma ATÓMICA + hasUsedTrial flag SET PERMANENTLY para user_id ${internalUserId}`);
        return newSubscription[0];
      });
      
      
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

  /**
   * Verificar si el usuario ya usó su Free Trial
   */
  async hasUserUsedTrial(firebaseUid: string): Promise<boolean> {
    try {
      const internalUserId = await this.getInternalUserId(firebaseUid);
      if (!internalUserId) {
        return false; // Usuario no existe, no ha usado trial
      }

      const userResult = await db!
        .select({ hasUsedTrial: users.hasUsedTrial })
        .from(users)
        .where(eq(users.id, internalUserId))
        .limit(1);

      if (userResult.length === 0) {
        return false;
      }

      return userResult[0].hasUsedTrial || false;

    } catch (error) {
      console.error('❌ [USER-MAPPING] Error checking hasUsedTrial:', error);
      return false;
    }
  }

  /**
   * Marcar que el usuario ya usó su Free Trial
   * IMPORTANTE: Este flag es permanente - nunca se resetea
   */
  async markTrialAsUsed(firebaseUid: string): Promise<boolean> {
    try {
      const internalUserId = await this.getInternalUserId(firebaseUid);
      if (!internalUserId) {
        console.error(`❌ [USER-MAPPING] No user found for Firebase UID: ${firebaseUid}`);
        return false;
      }

      // Marcar hasUsedTrial = true y registrar fecha de inicio
      await db!.update(users)
        .set({ 
          hasUsedTrial: true,
          trialStartDate: new Date()
        })
        .where(eq(users.id, internalUserId));

      console.log(`✅ [USER-MAPPING] Trial marcado como usado para usuario ${internalUserId} (Firebase UID: ${firebaseUid})`);
      return true;

    } catch (error) {
      console.error('❌ [USER-MAPPING] Error marking trial as used:', error);
      return false;
    }
  }

  /**
   * Obtener o crear user_id para Firebase UID
   * FUNCIÓN REQUERIDA: Combina getInternalUserId y createMapping
   */
  async getOrCreateUserIdForFirebaseUid(firebaseUid: string, email?: string): Promise<number> {
    try {
      console.log(`🔍 [USER-MAPPING] getOrCreateUserIdForFirebaseUid para: ${firebaseUid}`);
      
      // Primero intentar obtener el user_id existente
      let userId = await this.getInternalUserId(firebaseUid);
      
      if (userId) {
        console.log(`✅ [USER-MAPPING] Usuario existente encontrado: ${userId}`);
        return userId;
      }
      
      // Si no existe y tenemos email, crear el mapeo
      if (email) {
        const normalizedEmail = email.trim().toLowerCase();
        const mappingResult = await this.createMapping(firebaseUid, normalizedEmail);
        
        if (mappingResult) {
          console.log(`✅ [USER-MAPPING] Usuario creado/mapeado: ${mappingResult.id}`);
          return mappingResult.id;
        }
      }
      
      // Si llegamos aquí sin email, lanzar error
      throw new Error(`No se pudo obtener o crear user_id para Firebase UID ${firebaseUid}. Email requerido para crear nuevo usuario.`);
      
    } catch (error) {
      console.error('❌ [USER-MAPPING] Error en getOrCreateUserIdForFirebaseUid:', error);
      throw error;
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