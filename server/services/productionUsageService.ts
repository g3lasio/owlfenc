/**
 * PRODUCTION USAGE SERVICE
 * Sistema robusto de consumo real por feature con transacciones atómicas
 * Manejo de límites por plan, resets mensuales y audit logs
 */

import { db, admin } from '../lib/firebase-admin.js';

export interface UsageRecord {
  uid: string;
  monthKey: string; // YYYY-MM format
  planId: number;
  planName: string;
  used: {
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
  limits: {
    basicEstimates: number | null; // null = unlimited
    aiEstimates: number | null;
    contracts: number | null;
    propertyVerifications: number | null;
    permitAdvisor: number | null;
    projects: number | null;
    invoices: number | null;
    paymentTracking: number | null;
    deepsearch: number | null;
  };
  createdAt: any;
  updatedAt: any;
}

export interface AuditLog {
  uid: string;
  action: string;
  feature: string;
  planId: number;
  usedBefore: number;
  usedAfter: number;
  limit: number | null;
  success: boolean;
  quotaExceeded: boolean;
  timestamp: any;
  metadata?: any;
}

export interface FeatureConsumptionResult {
  success: boolean;
  quotaExceeded: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
  message: string;
  auditLogId?: string;
}

export class ProductionUsageService {
  
  /**
   * Consume feature with atomic transaction and audit logging
   * CORE BUSINESS LOGIC - Controls all feature consumption
   */
  async consumeFeature(
    uid: string, 
    feature: string, 
    metadata?: any
  ): Promise<FeatureConsumptionResult> {
    try {
      console.log(`🔥 [PRODUCTION-USAGE] Consuming ${feature} for user ${uid}`);
      
      // Get current month key
      const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      // Run atomic transaction
      return await db.runTransaction(async (transaction: any) => {
        // 1. Get user entitlements
        const entitlementsRef = db.collection('entitlements').doc(uid);
        const entitlementsDoc = await transaction.get(entitlementsRef);
        
        if (!entitlementsDoc.exists()) {
          throw new Error('User entitlements not found');
        }
        
        const entitlements = entitlementsDoc.data();
        const planId = entitlements.planId;
        const planName = entitlements.planName;
        const isTrialing = entitlements.trial?.isTrialing || false;
        const trialExpired = isTrialing && entitlements.trial?.status === 'expired';
        
        // 2. Get current usage
        const usageRef = db.collection('usage').doc(`${uid}_${monthKey}`);
        const usageDoc = await transaction.get(usageRef);
        
        let usageData: UsageRecord;
        if (!usageDoc.exists()) {
          // Initialize usage for new month
          usageData = await this.initializeMonthlyUsage(uid, monthKey, planId, planName, entitlements.limits);
        } else {
          usageData = usageDoc.data() as UsageRecord;
        }
        
        // 3. Get feature limit
        const limit = usageData.limits[feature as keyof typeof usageData.limits];
        const currentUsed = usageData.used[feature as keyof typeof usageData.used] || 0;
        
        // 4. Check if consumption is allowed
        let quotaExceeded = false;
        let success = true;
        let message = 'Feature consumed successfully';
        
        // For trialing users with unlimited access
        if (isTrialing && !trialExpired) {
          // Trialing users have unlimited access but we still track usage
          message = 'Feature consumed (trial unlimited access)';
        }
        // For users with unlimited plans (limit = null)
        else if (limit === null || limit === -1) {
          message = 'Feature consumed (unlimited plan)';
        }
        // For users with limited plans
        else if (limit !== null && currentUsed >= limit) {
          quotaExceeded = true;
          success = false;
          message = `Quota exceeded: ${currentUsed}/${limit} used this month`;
        }
        
        // 5. If allowed, increment usage
        let newUsed = currentUsed;
        if (success) {
          newUsed = currentUsed + 1;
          usageData.used[feature as keyof typeof usageData.used] = newUsed;
          usageData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
          
          // Update usage document
          transaction.set(usageRef, usageData);
        }
        
        // 6. Calculate remaining
        const remaining = limit === null || limit === -1 
          ? null 
          : Math.max(0, limit - newUsed);
        
        // 7. Create audit log
        const auditLog: AuditLog = {
          uid,
          action: 'consume_feature',
          feature,
          planId,
          usedBefore: currentUsed,
          usedAfter: newUsed,
          limit,
          success,
          quotaExceeded,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          metadata: metadata || {}
        };
        
        const auditRef = db.collection('audit_logs').doc();
        transaction.set(auditRef, auditLog);
        
        console.log(
          `📊 [PRODUCTION-USAGE] ${feature}: ${currentUsed} → ${newUsed}/${limit === null ? 'unlimited' : limit} (${success ? 'SUCCESS' : 'QUOTA_EXCEEDED'})`
        );
        
        return {
          success,
          quotaExceeded,
          used: newUsed,
          limit,
          remaining,
          message,
          auditLogId: auditRef.id
        };
      });
      
    } catch (error) {
      console.error(`❌ [PRODUCTION-USAGE] Error consuming ${feature}:`, error);
      throw error;
    }
  }
  
  /**
   * Get current usage summary for user
   */
  async getUsageSummary(uid: string): Promise<UsageRecord | null> {
    try {
      const monthKey = new Date().toISOString().slice(0, 7);
      const usageDoc = await db.collection('usage').doc(`${uid}_${monthKey}`).get();
      
      if (!usageDoc.exists()) {
        return null;
      }
      
      return usageDoc.data() as UsageRecord;
      
    } catch (error) {
      console.error(`❌ [PRODUCTION-USAGE] Error getting usage summary:`, error);
      return null;
    }
  }
  
  /**
   * Check if user can consume feature (without consuming)
   */
  async canConsumeFeature(uid: string, feature: string): Promise<{
    canConsume: boolean;
    used: number;
    limit: number | null;
    remaining: number | null;
    reason?: string;
  }> {
    try {
      const monthKey = new Date().toISOString().slice(0, 7);
      
      // Get entitlements
      const entitlementsDoc = await db.collection('entitlements').doc(uid).get();
      if (!entitlementsDoc.exists()) {
        return {
          canConsume: false,
          used: 0,
          limit: 0,
          remaining: 0,
          reason: 'User entitlements not found'
        };
      }
      
      const entitlements = entitlementsDoc.data();
      const isTrialing = entitlements.trial?.isTrialing || false;
      const trialExpired = isTrialing && entitlements.trial?.status === 'expired';
      
      // Get usage
      const usageDoc = await db.collection('usage').doc(`${uid}_${monthKey}`).get();
      let used = 0;
      let limit: number | null = 0;
      
      if (usageDoc.exists()) {
        const usageData = usageDoc.data() as UsageRecord;
        used = usageData.used[feature as keyof typeof usageData.used] || 0;
        limit = usageData.limits[feature as keyof typeof usageData.limits];
      } else {
        // Use entitlements limits if no usage doc
        limit = entitlements.limits[feature];
      }
      
      // Check consumption rules
      let canConsume = true;
      let reason: string | undefined;
      
      if (isTrialing && !trialExpired) {
        canConsume = true; // Trialing users have unlimited access
      } else if (limit === null || limit === -1) {
        canConsume = true; // Unlimited plan
      } else if (limit !== null && used >= limit) {
        canConsume = false;
        reason = `Monthly limit reached: ${used}/${limit}`;
      }
      
      const remaining = limit === null || limit === -1 
        ? null 
        : Math.max(0, limit - used);
      
      return {
        canConsume,
        used,
        limit,
        remaining,
        reason
      };
      
    } catch (error) {
      console.error(`❌ [PRODUCTION-USAGE] Error checking feature consumption:`, error);
      return {
        canConsume: false,
        used: 0,
        limit: 0,
        remaining: 0,
        reason: 'Error checking feature consumption'
      };
    }
  }
  
  /**
   * Reset monthly usage (called by Cloud Scheduler)
   */
  async resetMonthlyUsage(): Promise<void> {
    try {
      console.log('🔄 [PRODUCTION-USAGE] Starting monthly usage reset...');
      
      const currentMonth = new Date().toISOString().slice(0, 7);
      const previousMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);
      
      // Get all active users
      const entitlementsSnapshot = await db.collection('entitlements').get();
      let resetCount = 0;
      
      // Process in batches to avoid timeout
      const batch = db.batch();
      
      for (const entitlementsDoc of entitlementsSnapshot.docs) {
        const uid = entitlementsDoc.id;
        const entitlements = entitlementsDoc.data();
        
        // Check if user already has current month usage
        const currentUsageDoc = await db.collection('usage').doc(`${uid}_${currentMonth}`).get();
        
        if (!currentUsageDoc.exists()) {
          // Create new month usage document
          const newUsage = await this.initializeMonthlyUsage(
            uid, 
            currentMonth, 
            entitlements.planId, 
            entitlements.planName, 
            entitlements.limits
          );
          
          const newUsageRef = db.collection('usage').doc(`${uid}_${currentMonth}`);
          batch.set(newUsageRef, newUsage);
          resetCount++;
        }
      }
      
      await batch.commit();
      
      console.log(`✅ [PRODUCTION-USAGE] Monthly reset completed: ${resetCount} users processed`);
      
      // Clean up old usage data (keep 3 months)
      await this.cleanupOldUsageData();
      
    } catch (error) {
      console.error('❌ [PRODUCTION-USAGE] Error in monthly reset:', error);
      throw error;
    }
  }
  
  /**
   * Initialize monthly usage for a user
   */
  private async initializeMonthlyUsage(
    uid: string, 
    monthKey: string, 
    planId: number, 
    planName: string, 
    limits: any
  ): Promise<UsageRecord> {
    return {
      uid,
      monthKey,
      planId,
      planName,
      used: {
        basicEstimates: 0,
        aiEstimates: 0,
        contracts: 0,
        propertyVerifications: 0,
        permitAdvisor: 0,
        projects: 0,
        invoices: 0,
        paymentTracking: 0,
        deepsearch: 0
      },
      limits: {
        basicEstimates: limits.basicEstimates,
        aiEstimates: limits.aiEstimates,
        contracts: limits.contracts,
        propertyVerifications: limits.propertyVerifications,
        permitAdvisor: limits.permitAdvisor,
        projects: limits.projects,
        invoices: limits.invoices,
        paymentTracking: limits.paymentTracking,
        deepsearch: limits.deepsearch
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
  }
  
  /**
   * Clean up old usage data (keep 3 months)
   */
  private async cleanupOldUsageData(): Promise<void> {
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const cutoffMonth = threeMonthsAgo.toISOString().slice(0, 7);
      
      console.log(`🧹 [PRODUCTION-USAGE] Cleaning up usage data older than ${cutoffMonth}`);
      
      // Query old usage documents
      const oldUsageQuery = db.collection('usage')
        .where('monthKey', '<', cutoffMonth)
        .limit(500); // Process in batches
      
      const snapshot = await oldUsageQuery.get();
      
      if (snapshot.empty) {
        console.log('🧹 [PRODUCTION-USAGE] No old usage data to clean up');
        return;
      }
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      console.log(`✅ [PRODUCTION-USAGE] Cleaned up ${snapshot.docs.length} old usage documents`);
      
    } catch (error) {
      console.error('❌ [PRODUCTION-USAGE] Error cleaning up old usage data:', error);
    }
  }
  
  /**
   * Get usage analytics for admin dashboard
   */
  async getUsageAnalytics(monthKey?: string): Promise<{
    totalUsers: number;
    activeUsers: number;
    usageByFeature: { [feature: string]: number };
    usageByPlan: { [planId: string]: number };
    quotaExceededEvents: number;
  }> {
    try {
      const targetMonth = monthKey || new Date().toISOString().slice(0, 7);
      
      console.log(`📊 [PRODUCTION-USAGE] Generating analytics for ${targetMonth}`);
      
      // Get all usage for the month
      const usageSnapshot = await db.collection('usage')
        .where('monthKey', '==', targetMonth)
        .get();
      
      const analytics = {
        totalUsers: usageSnapshot.size,
        activeUsers: 0,
        usageByFeature: {} as { [feature: string]: number },
        usageByPlan: {} as { [planId: string]: number },
        quotaExceededEvents: 0
      };
      
      // Initialize feature counters
      const features = ['basicEstimates', 'aiEstimates', 'contracts', 'propertyVerifications', 'permitAdvisor', 'projects', 'deepsearch'];
      features.forEach(feature => {
        analytics.usageByFeature[feature] = 0;
      });
      
      usageSnapshot.docs.forEach(doc => {
        const usage = doc.data() as UsageRecord;
        
        // Check if user is active (has any usage)
        const totalUsage = Object.values(usage.used).reduce((sum, count) => sum + count, 0);
        if (totalUsage > 0) {
          analytics.activeUsers++;
        }
        
        // Aggregate usage by feature
        Object.entries(usage.used).forEach(([feature, count]) => {
          analytics.usageByFeature[feature] = (analytics.usageByFeature[feature] || 0) + count;
        });
        
        // Aggregate usage by plan
        const planKey = `plan_${usage.planId}`;
        analytics.usageByPlan[planKey] = (analytics.usageByPlan[planKey] || 0) + 1;
      });
      
      // Get quota exceeded events from audit logs
      const auditSnapshot = await db.collection('audit_logs')
        .where('quotaExceeded', '==', true)
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(new Date(`${targetMonth}-01`)))
        .where('timestamp', '<', admin.firestore.Timestamp.fromDate(new Date(`${targetMonth}-31`)))
        .get();
      
      analytics.quotaExceededEvents = auditSnapshot.size;
      
      return analytics;
      
    } catch (error) {
      console.error('❌ [PRODUCTION-USAGE] Error generating analytics:', error);
      throw error;
    }
  }
}

export const productionUsageService = new ProductionUsageService();