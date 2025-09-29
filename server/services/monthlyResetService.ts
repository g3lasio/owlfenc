/**
 * MONTHLY RESET SERVICE
 * Handles monthly usage resets and cleanup for production system
 * Designed to run via Cloud Scheduler or cron job
 */

import { productionUsageService } from './productionUsageService.js';
import { db, admin } from '../lib/firebase-admin.js';

export interface ResetResult {
  success: boolean;
  month: string;
  usersProcessed: number;
  usersReset: number;
  cleanupCount: number;
  errors: string[];
}

export class MonthlyResetService {
  
  /**
   * Main monthly reset function
   * Called by Cloud Scheduler on the 1st of each month
   */
  async performMonthlyReset(): Promise<ResetResult> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const startTime = Date.now();
    
    console.log(`🔄 [MONTHLY-RESET] Starting monthly reset for ${currentMonth}`);
    
    const result: ResetResult = {
      success: false,
      month: currentMonth,
      usersProcessed: 0,
      usersReset: 0,
      cleanupCount: 0,
      errors: []
    };
    
    try {
      // 1. Get all active users with entitlements
      const entitlementsSnapshot = await db.collection('entitlements').get();
      result.usersProcessed = entitlementsSnapshot.size;
      
      console.log(`📊 [MONTHLY-RESET] Processing ${result.usersProcessed} users`);
      
      // 2. Process users in batches to avoid timeout
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < entitlementsSnapshot.docs.length; i += batchSize) {
        const batch = entitlementsSnapshot.docs.slice(i, i + batchSize);
        batches.push(batch);
      }
      
      // 3. Process each batch
      for (const batch of batches) {
        await this.processBatch(batch, currentMonth, result);
      }
      
      // 4. Clean up old data
      await this.cleanupOldData(result);
      
      // 5. Create monthly analytics snapshot
      await this.createMonthlySnapshot(currentMonth);
      
      // 6. Send admin notification
      await this.sendAdminNotification(result);
      
      const duration = (Date.now() - startTime) / 1000;
      console.log(`✅ [MONTHLY-RESET] Completed in ${duration}s: ${result.usersReset}/${result.usersProcessed} users reset`);
      
      result.success = result.errors.length === 0;
      return result;
      
    } catch (error) {
      console.error('❌ [MONTHLY-RESET] Fatal error during reset:', error);
      result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
      return result;
    }
  }
  
  /**
   * Process a batch of users for monthly reset
   */
  private async processBatch(
    batch: any[], 
    currentMonth: string, 
    result: ResetResult
  ): Promise<void> {
    try {
      const writeBatch = db.batch();
      
      for (const entitlementsDoc of batch) {
        const uid = entitlementsDoc.id;
        const entitlements = entitlementsDoc.data();
        
        try {
          // Check if user already has current month usage
          const currentUsageDoc = await db.collection('usage').doc(`${uid}_${currentMonth}`).get();
          
          if (!currentUsageDoc.exists()) {
            // Create new month usage document
            const newUsage = {
              uid,
              monthKey: currentMonth,
              planId: entitlements.planId,
              planName: entitlements.planName,
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
              limits: entitlements.limits || {},
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            const newUsageRef = db.collection('usage').doc(`${uid}_${currentMonth}`);
            writeBatch.set(newUsageRef, newUsage);
            result.usersReset++;
          }
          
        } catch (userError) {
          console.error(`❌ [MONTHLY-RESET] Error processing user ${uid}:`, userError);
          result.errors.push(`User ${uid}: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
        }
      }
      
      // Commit batch
      await writeBatch.commit();
      
    } catch (batchError) {
      console.error('❌ [MONTHLY-RESET] Error processing batch:', batchError);
      result.errors.push(`Batch error: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Clean up old data (keep 3 months)
   */
  private async cleanupOldData(result: ResetResult): Promise<void> {
    try {
      console.log('🧹 [MONTHLY-RESET] Cleaning up old data...');
      
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const cutoffMonth = threeMonthsAgo.toISOString().slice(0, 7);
      
      // Clean old usage data
      const oldUsageQuery = db.collection('usage')
        .where('monthKey', '<', cutoffMonth)
        .limit(500);
      
      const usageSnapshot = await oldUsageQuery.get();
      
      if (!usageSnapshot.empty) {
        const deleteBatch = db.batch();
        usageSnapshot.docs.forEach(doc => {
          deleteBatch.delete(doc.ref);
        });
        
        await deleteBatch.commit();
        result.cleanupCount = usageSnapshot.docs.length;
        
        console.log(`🧹 [MONTHLY-RESET] Cleaned up ${result.cleanupCount} old usage documents`);
      }
      
      // Clean old audit logs (keep 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const oldAuditQuery = db.collection('audit_logs')
        .where('timestamp', '<', admin.firestore.Timestamp.fromDate(sixMonthsAgo))
        .limit(1000);
      
      const auditSnapshot = await oldAuditQuery.get();
      
      if (!auditSnapshot.empty) {
        const auditBatch = db.batch();
        auditSnapshot.docs.forEach(doc => {
          auditBatch.delete(doc.ref);
        });
        
        await auditBatch.commit();
        console.log(`🧹 [MONTHLY-RESET] Cleaned up ${auditSnapshot.docs.length} old audit logs`);
      }
      
    } catch (cleanupError) {
      console.error('❌ [MONTHLY-RESET] Error during cleanup:', cleanupError);
      result.errors.push(`Cleanup error: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Create monthly analytics snapshot
   */
  private async createMonthlySnapshot(currentMonth: string): Promise<void> {
    try {
      console.log(`📊 [MONTHLY-RESET] Creating analytics snapshot for ${currentMonth}`);
      
      const analytics = await productionUsageService.getUsageAnalytics(currentMonth);
      
      const snapshot = {
        month: currentMonth,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ...analytics
      };
      
      await db.collection('admin_analytics').doc(`monthly_${currentMonth}`).set(snapshot);
      
      console.log(`✅ [MONTHLY-RESET] Analytics snapshot created for ${currentMonth}`);
      
    } catch (snapshotError) {
      console.error('❌ [MONTHLY-RESET] Error creating analytics snapshot:', snapshotError);
    }
  }
  
  /**
   * Send admin notification about reset results
   */
  private async sendAdminNotification(result: ResetResult): Promise<void> {
    try {
      const notification = {
        type: 'monthly_reset_completed',
        month: result.month,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        summary: {
          success: result.success,
          usersProcessed: result.usersProcessed,
          usersReset: result.usersReset,
          cleanupCount: result.cleanupCount,
          errorCount: result.errors.length
        },
        errors: result.errors.slice(0, 10) // First 10 errors only
      };
      
      await db.collection('admin_notifications').add(notification);
      
      console.log(`📧 [MONTHLY-RESET] Admin notification sent`);
      
    } catch (notificationError) {
      console.error('❌ [MONTHLY-RESET] Error sending admin notification:', notificationError);
    }
  }
  
  /**
   * Manual reset trigger (for testing or emergency)
   */
  async manualReset(targetMonth?: string): Promise<ResetResult> {
    const month = targetMonth || new Date().toISOString().slice(0, 7);
    
    console.log(`🔧 [MONTHLY-RESET] Manual reset triggered for ${month}`);
    
    return await this.performMonthlyReset();
  }
  
  /**
   * Check if reset is needed (for cron validation)
   */
  async isResetNeeded(): Promise<boolean> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      // Check if any users don't have current month usage
      const entitlementsSnapshot = await db.collection('entitlements').limit(10).get();
      
      for (const doc of entitlementsSnapshot.docs) {
        const uid = doc.id;
        const usageDoc = await db.collection('usage').doc(`${uid}_${currentMonth}`).get();
        
        if (!usageDoc.exists()) {
          return true; // Reset needed
        }
      }
      
      return false; // Reset not needed
      
    } catch (error) {
      console.error('❌ [MONTHLY-RESET] Error checking reset status:', error);
      return true; // Assume reset needed on error
    }
  }
}

export const monthlyResetService = new MonthlyResetService();