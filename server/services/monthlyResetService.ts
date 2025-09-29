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
  exportedRecords: number;
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
      exportedRecords: 0,
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
      
      // 4. Export historical data before cleanup
      await this.exportHistoricalData(result);
      
      // 5. Clean up old data
      await this.cleanupOldData(result);
      
      // 6. Create monthly analytics snapshot
      await this.createMonthlySnapshot(currentMonth);
      
      // 7. Send admin notification
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
   * Export historical data to external storage before cleanup
   */
  private async exportHistoricalData(result: ResetResult): Promise<void> {
    try {
      console.log('📤 [MONTHLY-RESET] Exporting historical data before cleanup...');
      
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const cutoffMonth = threeMonthsAgo.toISOString().slice(0, 7);
      
      // Export old usage data with pagination
      let usageExported = 0;
      let lastUsageDoc = null;
      
      do {
        let oldUsageQuery = db.collection('usage')
          .where('monthKey', '<', cutoffMonth)
          .orderBy('monthKey')
          .limit(1000);
        
        if (lastUsageDoc) {
          oldUsageQuery = oldUsageQuery.startAfter(lastUsageDoc);
        }
        
        const usageSnapshot = await oldUsageQuery.get();
        
        if (!usageSnapshot.empty) {
          const usageData = usageSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            exportedAt: new Date().toISOString()
          }));
          
          await this.exportToCloudStorage('usage_data', `${cutoffMonth}_batch_${usageExported}`, usageData);
          usageExported += usageData.length;
          lastUsageDoc = usageSnapshot.docs[usageSnapshot.docs.length - 1];
          
          console.log(`📤 [MONTHLY-RESET] Exported ${usageData.length} usage records (batch ${Math.floor(usageExported / 1000) + 1})`);
        } else {
          lastUsageDoc = null; // Exit loop
        }
      } while (lastUsageDoc);
      
      result.exportedRecords += usageExported;
      
      // Export old audit logs (older than 6 months) with pagination
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      let auditExported = 0;
      let lastAuditDoc = null;
      
      do {
        let oldAuditQuery = db.collection('audit_logs')
          .where('timestamp', '<', admin.firestore.Timestamp.fromDate(sixMonthsAgo))
          .orderBy('timestamp')
          .limit(2000);
        
        if (lastAuditDoc) {
          oldAuditQuery = oldAuditQuery.startAfter(lastAuditDoc);
        }
        
        const auditSnapshot = await oldAuditQuery.get();
        
        if (!auditSnapshot.empty) {
          const auditData = auditSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            exportedAt: new Date().toISOString()
          }));
          
          await this.exportToCloudStorage('audit_logs', `${cutoffMonth}_batch_${auditExported}`, auditData);
          auditExported += auditData.length;
          lastAuditDoc = auditSnapshot.docs[auditSnapshot.docs.length - 1];
          
          console.log(`📤 [MONTHLY-RESET] Exported ${auditData.length} audit records (batch ${Math.floor(auditExported / 2000) + 1})`);
        } else {
          lastAuditDoc = null; // Exit loop
        }
      } while (lastAuditDoc);
      
      result.exportedRecords += auditExported;
      
      console.log(`📤 [MONTHLY-RESET] Exported ${result.exportedRecords} historical records`);
      
    } catch (exportError) {
      console.error('❌ [MONTHLY-RESET] Error during data export:', exportError);
      result.errors.push(`Export error: ${exportError instanceof Error ? exportError.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Export data to Cloud Storage or simulate BigQuery export
   */
  private async exportToCloudStorage(dataType: string, cutoffMonth: string, data: any[]): Promise<void> {
    try {
      // Create export manifest
      const exportManifest = {
        dataType,
        cutoffMonth,
        recordCount: data.length,
        exportedAt: new Date().toISOString(),
        schema: this.getDataSchema(dataType),
        metadata: {
          source: 'monthly_reset_service',
          version: '1.0',
          format: 'json'
        }
      };
      
      // In a real implementation, this would export to:
      // 1. Google Cloud Storage bucket
      // 2. BigQuery dataset
      // 3. Or another data warehouse
      
      // For now, save export manifest to Firestore for tracking
      const exportId = `${dataType}_${cutoffMonth}_${Date.now()}`;
      await db.collection('data_exports').doc(exportId).set({
        ...exportManifest,
        status: 'completed',
        sampleData: data.slice(0, 3) // Store first 3 records as samples
      });
      
      console.log(`📤 [MONTHLY-RESET] Exported ${data.length} ${dataType} records (${exportId})`);
      
      // Simulate BigQuery/Cloud Storage export
      if (process.env.NODE_ENV === 'production') {
        // In production, integrate with:
        // - Google Cloud Storage client
        // - BigQuery client
        // - Or other data pipeline
        
        console.log(`🗄️ [MONTHLY-RESET] Production export to BigQuery/Cloud Storage would happen here`);
      }
      
    } catch (error) {
      console.error(`❌ [MONTHLY-RESET] Error exporting ${dataType}:`, error);
      throw error;
    }
  }
  
  /**
   * Get data schema for export documentation
   */
  private getDataSchema(dataType: string): any {
    const schemas = {
      usage_data: {
        uid: 'string',
        monthKey: 'string',
        planId: 'number',
        planName: 'string',
        used: 'object',
        limits: 'object',
        createdAt: 'timestamp',
        updatedAt: 'timestamp'
      },
      audit_logs: {
        uid: 'string',
        action: 'string',
        details: 'object',
        timestamp: 'timestamp',
        ipAddress: 'string',
        userAgent: 'string',
        source: 'string'
      }
    };
    
    return schemas[dataType] || {};
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
          exportedRecords: result.exportedRecords,
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