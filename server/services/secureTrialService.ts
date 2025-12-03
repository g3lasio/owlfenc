/**
 * SECURE TRIAL SERVICE
 * Firebase-native trial system with serverTimestamp protection
 * Prevents trial resets across devices
 * 🛡️ PROTEGIDO CON FLAG PERMANENTE hasUsedTrial de PostgreSQL
 * 🔄 SINCRONIZA con PostgreSQL user_subscriptions para consistencia
 */

import { db as pgDb } from '../db';
import { users, userSubscriptions, subscriptionPlans } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { db, admin } from '../lib/firebase-admin.js';

export interface SecureTrialData {
  uid: string;
  planId: number;
  planName: string;
  startDate: any; // Firebase Timestamp
  endDate: any; // Firebase Timestamp  
  status: 'active' | 'expired' | 'converted';
  daysRemaining: number;
  isTrialing: boolean;
  originalPlan?: number; // Plan to return to after trial
  createdAt: any; // Firebase Timestamp
}

export interface TrialEntitlements {
  uid: string;
  planId: number;
  planName: string;
  planCode: string;
  trial: {
    isTrialing: boolean;
    startDate: any; // serverTimestamp - IMMUTABLE
    endDate: any; // calculated from startDate + 14 days
    daysRemaining: number;
    originalPlan: number;
    status: 'active' | 'expired' | 'converted';
  };
  limits: {
    basicEstimates: number;
    aiEstimates: number;
    contracts: number;
    propertyVerifications: number;
    permitAdvisor: number;
    projects: number;
    invoices: number;
    paymentTracking: number;
    deepsearch: number;
  };
  features: {
    hasWatermark: boolean;
    hasInvoices: boolean;
    hasPaymentTracker: boolean;
    hasOwlFunding: boolean;
    hasOwlAcademy: boolean;
    hasAIProjectManager: boolean;
    hasVIPSupport: boolean;
  };
  subscription: {
    status: 'trialing';
    currentPeriodStart: any;
    currentPeriodEnd: any;
    cancelAtPeriodEnd: boolean;
    billingCycle: 'monthly';
  };
  createdAt: any;
  updatedAt: any;
}

export class SecureTrialService {
  
  /**
   * Create secure 14-day trial using serverTimestamp (IMMUTABLE)
   * 🛡️ PROTEGIDO: Verifica flag PERMANENTE hasUsedTrial de PostgreSQL
   */
  async createSecureTrial(uid: string): Promise<TrialEntitlements> {
    try {
      console.log(`🔒 [SECURE-TRIAL] Creating secure 14-day trial for: ${uid}`);
      
      // 🛡️ VERIFICACIÓN CRÍTICA: Consultar flag PERMANENTE hasUsedTrial en PostgreSQL
      if (pgDb) {
        const userRecord = await pgDb
          .select({ hasUsedTrial: users.hasUsedTrial })
          .from(users)
          .where(eq(users.firebaseUid, uid))
          .limit(1);
        
        if (userRecord.length > 0 && userRecord[0].hasUsedTrial) {
          console.log(`🚫 [SECURE-TRIAL] User ${uid} has PERMANENT flag hasUsedTrial=true in PostgreSQL - BLOCKED`);
          throw new Error('Trial period already used. Upgrade to a premium plan to continue.');
        }
      }
      
      // Check if trial already exists in Firebase
      const existingTrialDoc = await db.collection('entitlements').doc(uid).get();
      
      if (existingTrialDoc.exists()) {
        const data = existingTrialDoc.data();
        if (data?.trial?.isTrialing) {
          console.log(`⚠️ [SECURE-TRIAL] User ${uid} already has active trial in Firebase`);
          return this.getTrialEntitlements(uid);
        }
      }
      
      // Calculate end date (14 days from server time)
      const now = new Date();
      const endDate = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
      
      const trialEntitlements: TrialEntitlements = {
        uid,
        planId: 4,
        planName: "Trial Master",
        planCode: "trial_master",
        trial: {
          isTrialing: true,
          startDate: admin.firestore.FieldValue.serverTimestamp(), // IMMUTABLE - cannot be reset
          endDate: admin.firestore.Timestamp.fromDate(endDate),
          daysRemaining: 14,
          originalPlan: 1, // Return to Primo Chambeador after trial
          status: 'active'
        },
        limits: {
          basicEstimates: -1, // Unlimited during trial
          aiEstimates: -1,
          contracts: -1,
          propertyVerifications: -1,
          permitAdvisor: -1,
          projects: -1,
          invoices: -1,
          paymentTracking: 2,
          deepsearch: -1
        },
        features: {
          hasWatermark: false, // No watermark during trial
          hasInvoices: true,
          hasPaymentTracker: true,
          hasOwlFunding: true,
          hasOwlAcademy: true,
          hasAIProjectManager: true,
          hasVIPSupport: true // VIP support during trial
        },
        subscription: {
          status: 'trialing',
          currentPeriodStart: admin.firestore.FieldValue.serverTimestamp(),
          currentPeriodEnd: admin.firestore.Timestamp.fromDate(endDate),
          cancelAtPeriodEnd: true,
          billingCycle: 'monthly'
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // 🛡️ CRITICAL: Marcar hasUsedTrial ANTES de crear trial en Firebase
      // Si el UPDATE falla (user no existe en PostgreSQL), abortar completamente
      if (pgDb) {
        const updateResult = await pgDb
          .update(users)
          .set({ hasUsedTrial: true })
          .where(eq(users.firebaseUid, uid));
        
        // VERIFICACIÓN CRÍTICA: Si el UPDATE afectó 0 filas, el usuario no existe en PostgreSQL
        // Esto viola la garantía de atomicidad - ABORT trial creation
        if (updateResult.rowCount === 0) {
          console.error(`🚨 [SECURE-TRIAL] CRITICAL: User ${uid} not found in PostgreSQL - ABORTING trial creation`);
          throw new Error('User not found in database. Please contact support to complete account setup.');
        }
        
        console.log(`✅ [SECURE-TRIAL] hasUsedTrial flag PERMANENTLY set in PostgreSQL for ${uid} (rowCount: ${updateResult.rowCount})`);
        
        // 🔄 SINCRONIZAR: Crear suscripción en PostgreSQL user_subscriptions
        // Esto es CRÍTICO para que el sistema de permisos funcione correctamente
        const userRecord = await pgDb
          .select({ id: users.id })
          .from(users)
          .where(eq(users.firebaseUid, uid))
          .limit(1);
        
        if (userRecord.length > 0) {
          const userId = userRecord[0].id;
          
          // Verificar si ya existe una suscripción activa (prevenir duplicados)
          const existingSub = await pgDb
            .select()
            .from(userSubscriptions)
            .where(and(
              eq(userSubscriptions.userId, userId),
              eq(userSubscriptions.status, 'trialing')
            ))
            .limit(1);
          
          if (existingSub.length === 0) {
            // Crear suscripción trial en PostgreSQL
            await pgDb.insert(userSubscriptions).values({
              userId: userId,
              planId: 4, // FREE_TRIAL plan ID
              status: 'trialing',
              currentPeriodStart: now,
              currentPeriodEnd: endDate,
              billingCycle: 'monthly'
            });
            console.log(`✅ [SECURE-TRIAL] PostgreSQL subscription created for user ${userId} (Free Trial)`);
          } else {
            console.log(`⚠️ [SECURE-TRIAL] PostgreSQL subscription already exists for user ${userId}`);
          }
        }
      } else {
        // Si PostgreSQL no está disponible, NO crear trial - seguridad primero
        console.error(`🚨 [SECURE-TRIAL] CRITICAL: PostgreSQL unavailable - ABORTING trial creation for ${uid}`);
        throw new Error('Database temporarily unavailable. Please try again later.');
      }
      
      // Store in Firestore entitlements collection (DESPUÉS de verificar PostgreSQL)
      await db.collection('entitlements').doc(uid).set(trialEntitlements);
      
      // Initialize usage for current month
      await this.initializeTrialUsage(uid);
      
      console.log(`✅ [SECURE-TRIAL] Secure trial created with serverTimestamp for ${uid}`);
      return trialEntitlements;
      
    } catch (error) {
      console.error('❌ [SECURE-TRIAL] Error creating secure trial:', error);
      throw error;
    }
  }
  
  /**
   * Get trial entitlements (NEVER expires due to device reset)
   */
  async getTrialEntitlements(uid: string): Promise<TrialEntitlements | null> {
    try {
      const entitlementsDoc = await db.collection('entitlements').doc(uid).get();
      
      if (!entitlementsDoc.exists()) {
        return null;
      }
      
      const data = entitlementsDoc.data() as TrialEntitlements;
      
      // Calculate days remaining (using server timestamp)
      if (data.trial?.isTrialing) {
        const now = admin.firestore.Timestamp.now();
        const endDate = data.trial.endDate;
        
        if (endDate && endDate.toDate) {
          const daysRemaining = Math.max(0, Math.ceil((endDate.toDate().getTime() - now.toDate().getTime()) / (1000 * 60 * 60 * 24)));
          data.trial.daysRemaining = daysRemaining;
          
          // Check if trial expired
          if (daysRemaining === 0 && data.trial.status === 'active') {
            await this.expireTrial(uid);
            data.trial.status = 'expired';
            data.trial.isTrialing = false;
          }
        }
      }
      
      return data;
      
    } catch (error) {
      console.error('❌ [SECURE-TRIAL] Error getting trial entitlements:', error);
      return null;
    }
  }
  
  /**
   * Check if user can use feature (with trial protection)
   */
  async canUseFeature(uid: string, feature: string): Promise<{
    canUse: boolean;
    used: number;
    limit: number;
    reason?: string;
  }> {
    try {
      const entitlements = await this.getTrialEntitlements(uid);
      
      if (!entitlements) {
        return { canUse: false, used: 0, limit: 0, reason: 'No entitlements found' };
      }
      
      // Check if trial is active
      if (entitlements.trial.isTrialing && entitlements.trial.status !== 'active') {
        return { canUse: false, used: 0, limit: 0, reason: 'Trial expired' };
      }
      
      const limit = (entitlements.limits as any)[feature];
      
      if (limit === undefined) {
        return { canUse: false, used: 0, limit: 0, reason: 'Feature not found' };
      }
      
      // -1 means unlimited
      if (limit === -1) {
        return { canUse: true, used: 0, limit: -1 };
      }
      
      // Get current usage
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const usageDoc = await db.collection('usage').doc(`${uid}_${currentMonth}`).get();
      
      const used = usageDoc.exists() ? (usageDoc.data() as any)?.used?.[feature] || 0 : 0;
      const canUse = used < limit;
      
      return { canUse, used, limit };
      
    } catch (error) {
      console.error(`❌ [SECURE-TRIAL] Error checking feature ${feature}:`, error);
      return { canUse: false, used: 0, limit: 0, reason: 'Error checking feature' };
    }
  }
  
  /**
   * Increment feature usage (atomic transaction)
   */
  async incrementUsage(uid: string, feature: string, count: number = 1): Promise<boolean> {
    try {
      const check = await this.canUseFeature(uid, feature);
      
      if (!check.canUse && check.limit !== -1) {
        console.warn(`⚠️ [SECURE-TRIAL] Feature ${feature} limit exceeded for ${uid}`);
        return false;
      }
      
      // Use transaction for atomic increment
      return await db.runTransaction(async (transaction: any) => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const usageDocRef = db.collection('usage').doc(`${uid}_${currentMonth}`);
        const usageDoc = await transaction.get(usageDocRef);
        
        let usageData;
        if (!usageDoc.exists()) {
          // Initialize usage document
          const entitlements = await this.getTrialEntitlements(uid);
          usageData = {
            uid,
            month: currentMonth,
            used: { [feature]: count },
            limits: entitlements?.limits || {},
            planId: entitlements?.planId || 4,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
        } else {
          usageData = usageDoc.data();
          usageData.used = usageData.used || {};
          usageData.used[feature] = (usageData.used[feature] || 0) + count;
          usageData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        }
        
        transaction.set(usageDocRef, usageData);
        
        console.log(`✅ [SECURE-TRIAL] ${feature} incremented by ${count} for ${uid}`);
        return true;
      });
      
    } catch (error) {
      console.error(`❌ [SECURE-TRIAL] Error incrementing ${feature}:`, error);
      return false;
    }
  }
  
  /**
   * Expire trial and revert to original plan
   */
  async expireTrial(uid: string): Promise<void> {
    try {
      const entitlementsDoc = await db.collection('entitlements').doc(uid).get();
      
      if (!entitlementsDoc.exists()) {
        return;
      }
      
      const data = entitlementsDoc.data() as TrialEntitlements;
      const originalPlan = data.trial.originalPlan || 1;
      
      // Get original plan limits
      const originalPlanLimits = this.getPlanLimits(originalPlan);
      const originalPlanFeatures = this.getPlanFeatures(originalPlan);
      
      // Update to original plan
      await db.collection('entitlements').doc(uid).update({
        planId: originalPlan,
        planName: this.getPlanName(originalPlan),
        planCode: this.getPlanCode(originalPlan),
        'trial.isTrialing': false,
        'trial.status': 'expired',
        limits: originalPlanLimits,
        features: originalPlanFeatures,
        'subscription.status': 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ [SECURE-TRIAL] Trial expired for ${uid}, reverted to plan ${originalPlan}`);
      
    } catch (error) {
      console.error('❌ [SECURE-TRIAL] Error expiring trial:', error);
    }
  }
  
  /**
   * Initialize usage document for trial user
   */
  private async initializeTrialUsage(uid: string): Promise<void> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usageDoc = {
        uid,
        month: currentMonth,
        used: {
          basicEstimates: 0,
          aiEstimates: 0,
          contracts: 0,
          propertyVerifications: 0,
          permitAdvisor: 0,
          projects: 0,
          deepsearch: 0
        },
        limits: {
          basicEstimates: -1,
          aiEstimates: -1,
          contracts: -1,
          propertyVerifications: -1,
          permitAdvisor: -1,
          projects: -1,
          deepsearch: -1
        },
        planId: 4,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('usage').doc(`${uid}_${currentMonth}`).set(usageDoc);
      
    } catch (error) {
      console.error('❌ [SECURE-TRIAL] Error initializing usage:', error);
    }
  }
  
  /**
   * Helper methods for plan data
   */
  private getPlanLimits(planId: number) {
    const limits: { [key: number]: any } = {
      1: { // Primo Chambeador
        basicEstimates: 5,
        aiEstimates: 1,
        contracts: 2,
        propertyVerifications: 2,
        permitAdvisor: 0,
        projects: 5,
        invoices: 0,
        paymentTracking: 0,
        deepsearch: 0
      },
      2: { // Mero Patrón
        basicEstimates: 50,
        aiEstimates: 20,
        contracts: 25,
        propertyVerifications: 15,
        permitAdvisor: 10,
        projects: 30,
        invoices: -1,
        paymentTracking: 1,
        deepsearch: 50
      },
      3: { // Master Contractor
        basicEstimates: -1,
        aiEstimates: -1,
        contracts: -1,
        propertyVerifications: -1,
        permitAdvisor: -1,
        projects: -1,
        invoices: -1,
        paymentTracking: 2,
        deepsearch: -1
      }
    };
    
    return limits[planId] || limits[1];
  }
  
  private getPlanFeatures(planId: number) {
    const features: { [key: number]: any } = {
      1: { // Primo Chambeador
        hasWatermark: true,
        hasInvoices: false,
        hasPaymentTracker: false,
        hasOwlFunding: false,
        hasOwlAcademy: false,
        hasAIProjectManager: false,
        hasVIPSupport: false
      },
      2: { // Mero Patrón
        hasWatermark: false,
        hasInvoices: true,
        hasPaymentTracker: true,
        hasOwlFunding: true,
        hasOwlAcademy: true,
        hasAIProjectManager: true,
        hasVIPSupport: false
      },
      3: { // Master Contractor
        hasWatermark: false,
        hasInvoices: true,
        hasPaymentTracker: true,
        hasOwlFunding: true,
        hasOwlAcademy: true,
        hasAIProjectManager: true,
        hasVIPSupport: true
      }
    };
    
    return features[planId] || features[1];
  }
  
  private getPlanName(planId: number): string {
    const names: { [key: number]: string } = {
      1: 'Primo Chambeador',
      2: 'Mero Patrón', 
      3: 'Master Contractor',
      4: 'Trial Master'
    };
    
    return names[planId] || 'Primo Chambeador';
  }
  
  private getPlanCode(planId: number): string {
    const codes: { [key: number]: string } = {
      1: 'primo_chambeador',
      2: 'mero_patron',
      3: 'master_contractor',
      4: 'trial_master'
    };
    
    return codes[planId] || 'primo_chambeador';
  }
}

export const secureTrialService = new SecureTrialService();