/**
 * SECURITY OPTIMIZATION SERVICE
 * Advanced security features including refresh token revocation on plan changes
 * Ensures authentication states are properly invalidated during sensitive operations
 */

import { db, admin } from '../lib/firebase-admin.js';
import { alertingService } from './alertingService.js';

export interface TokenRevocationResult {
  success: boolean;
  uid: string;
  revokedTokens: number;
  sessionsCleaned: number;
  action: string;
  timestamp: string;
  errors: string[];
}

export interface SecurityEvent {
  uid: string;
  action: 'plan_change' | 'password_reset' | 'suspicious_activity' | 'manual_revocation';
  oldPlan?: string;
  newPlan?: string;
  ipAddress?: string;
  userAgent?: string;
  source: string;
  revokeTokens: boolean;
  clearSessions: boolean;
}

export class SecurityOptimizationService {
  
  /**
   * Handle plan change security operations
   */
  async handlePlanChangeSecurityOperations(
    uid: string, 
    oldPlan: string, 
    newPlan: string, 
    source: string = 'plan_change',
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenRevocationResult> {
    try {
      console.log(`🔐 [SECURITY-OPT] Processing plan change security for user ${uid}: ${oldPlan} → ${newPlan}`);
      
      const securityEvent: SecurityEvent = {
        uid,
        action: 'plan_change',
        oldPlan,
        newPlan,
        ipAddress,
        userAgent,
        source,
        revokeTokens: true,
        clearSessions: true
      };
      
      const result = await this.processSecurityEvent(securityEvent);
      
      // Create security audit log
      await this.createSecurityAuditLog({
        uid,
        action: 'plan_change_security',
        details: {
          oldPlan,
          newPlan,
          tokensRevoked: result.revokedTokens,
          sessionsCleared: result.sessionsCleaned,
          ipAddress,
          userAgent,
          source
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        source: 'security_optimization_service'
      });
      
      // Send alert if this is a high-value plan change
      if (this.isHighValuePlanChange(oldPlan, newPlan)) {
        await alertingService.sendSecurityAlert(
          'High-Value Plan Change',
          `User ${uid} changed from ${oldPlan} to ${newPlan}. Tokens revoked and sessions cleared.`,
          uid,
          ipAddress
        );
      }
      
      console.log(`✅ [SECURITY-OPT] Security operations completed for user ${uid}`);
      return result;
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error in plan change security operations:', error);
      
      return {
        success: false,
        uid,
        revokedTokens: 0,
        sessionsCleaned: 0,
        action: 'plan_change',
        timestamp: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
  
  /**
   * Process security event with token revocation and session cleanup
   */
  async processSecurityEvent(event: SecurityEvent): Promise<TokenRevocationResult> {
    const result: TokenRevocationResult = {
      success: false,
      uid: event.uid,
      revokedTokens: 0,
      sessionsCleaned: 0,
      action: event.action,
      timestamp: new Date().toISOString(),
      errors: []
    };
    
    try {
      // 1. Revoke refresh tokens if required
      if (event.revokeTokens) {
        const tokenRevocation = await this.revokeUserRefreshTokens(event.uid);
        result.revokedTokens = tokenRevocation.revokedCount;
        if (!tokenRevocation.success) {
          result.errors.push(...tokenRevocation.errors);
        }
      }
      
      // 2. Clear active sessions if required
      if (event.clearSessions) {
        const sessionCleanup = await this.clearUserSessions(event.uid);
        result.sessionsCleaned = sessionCleanup.clearedCount;
        if (!sessionCleanup.success) {
          result.errors.push(...sessionCleanup.errors);
        }
      }
      
      // 3. Force user re-authentication by updating security timestamp
      await this.updateUserSecurityTimestamp(event.uid, event.action);
      
      result.success = result.errors.length === 0;
      
      console.log(`🔐 [SECURITY-OPT] Security event processed: ${event.action} for user ${event.uid}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error processing security event:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }
  
  /**
   * Revoke all refresh tokens for a user
   */
  private async revokeUserRefreshTokens(uid: string): Promise<{
    success: boolean;
    revokedCount: number;
    errors: string[];
  }> {
    try {
      console.log(`🔐 [SECURITY-OPT] Revoking refresh tokens for user ${uid}`);
      
      // Revoke refresh tokens using Firebase Admin SDK
      await admin.auth().revokeRefreshTokens(uid);
      
      // Get the user record to verify revocation timestamp
      const userRecord = await admin.auth().getUser(uid);
      const revocationTime = new Date(userRecord.tokensValidAfterTime || 0);
      
      console.log(`✅ [SECURITY-OPT] Refresh tokens revoked for user ${uid} at ${revocationTime.toISOString()}`);
      
      // Store revocation record in database
      await db.collection('token_revocations').add({
        uid,
        action: 'refresh_token_revocation',
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        tokensValidAfter: admin.firestore.Timestamp.fromDate(revocationTime),
        source: 'security_optimization_service'
      });
      
      return {
        success: true,
        revokedCount: 1, // Firebase revokes all tokens in one operation
        errors: []
      };
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error revoking refresh tokens:', error);
      return {
        success: false,
        revokedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
  
  /**
   * Clear active sessions for a user
   */
  private async clearUserSessions(uid: string): Promise<{
    success: boolean;
    clearedCount: number;
    errors: string[];
  }> {
    try {
      console.log(`🔐 [SECURITY-OPT] Clearing active sessions for user ${uid}`);
      
      // Clear sessions from our session store (if using custom sessions)
      const sessionQuery = db.collection('user_sessions')
        .where('uid', '==', uid)
        .where('active', '==', true);
      
      const sessionSnapshot = await sessionQuery.get();
      const batch = db.batch();
      
      sessionSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          active: false,
          invalidatedAt: admin.firestore.FieldValue.serverTimestamp(),
          invalidationReason: 'security_operation'
        });
      });
      
      if (!sessionSnapshot.empty) {
        await batch.commit();
      }
      
      const clearedCount = sessionSnapshot.size;
      
      console.log(`✅ [SECURITY-OPT] Cleared ${clearedCount} active sessions for user ${uid}`);
      
      return {
        success: true,
        clearedCount,
        errors: []
      };
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error clearing user sessions:', error);
      return {
        success: false,
        clearedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
  
  /**
   * Update user security timestamp to force re-authentication
   */
  private async updateUserSecurityTimestamp(uid: string, action: string): Promise<void> {
    try {
      await db.collection('user_security').doc(uid).set({
        lastSecurityAction: action,
        securityTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        requireReauth: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log(`🔐 [SECURITY-OPT] Updated security timestamp for user ${uid}`);
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error updating security timestamp:', error);
      throw error;
    }
  }
  
  /**
   * Check if plan change is high-value (requires extra security attention)
   */
  private isHighValuePlanChange(oldPlan: string, newPlan: string): boolean {
    const planValues = { primo: 1, mero: 2, supreme: 3 };
    const oldValue = planValues[oldPlan] || 0;
    const newValue = planValues[newPlan] || 0;
    
    // High-value if upgrading to supreme or downgrading from premium plans
    return newValue === 3 || (oldValue >= 2 && newValue === 1);
  }
  
  /**
   * Create security audit log
   */
  private async createSecurityAuditLog(logData: any): Promise<void> {
    try {
      await db.collection('security_audit_logs').add({
        ...logData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error creating security audit log:', error);
    }
  }
  
  /**
   * Bulk revoke tokens for multiple users (admin operation)
   */
  async bulkRevokeTokens(uids: string[], reason: string): Promise<TokenRevocationResult[]> {
    try {
      console.log(`🔐 [SECURITY-OPT] Bulk revoking tokens for ${uids.length} users. Reason: ${reason}`);
      
      const results: TokenRevocationResult[] = [];
      const batchSize = 10; // Process in batches to avoid overwhelming Firebase
      
      for (let i = 0; i < uids.length; i += batchSize) {
        const batch = uids.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(uid => this.processSecurityEvent({
            uid,
            action: 'manual_revocation',
            source: 'bulk_revocation',
            revokeTokens: true,
            clearSessions: true
          }))
        );
        
        batchResults.forEach((result, index) => {
          const uid = batch[index];
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              success: false,
              uid,
              revokedTokens: 0,
              sessionsCleaned: 0,
              action: 'manual_revocation',
              timestamp: new Date().toISOString(),
              errors: [result.reason?.message || 'Unknown error']
            });
          }
        });
        
        // Rate limiting between batches
        if (i + batchSize < uids.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      }
      
      // Send bulk operation alert
      const successCount = results.filter(r => r.success).length;
      await alertingService.sendSecurityAlert(
        'Bulk Token Revocation',
        `Bulk revoked tokens for ${successCount}/${uids.length} users. Reason: ${reason}`
      );
      
      console.log(`✅ [SECURITY-OPT] Bulk token revocation completed: ${successCount}/${uids.length} successful`);
      
      return results;
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error in bulk token revocation:', error);
      throw error;
    }
  }
  
  /**
   * Check if user needs re-authentication
   */
  async checkUserReauthRequired(uid: string): Promise<{
    required: boolean;
    reason?: string;
    lastSecurityAction?: string;
    securityTimestamp?: Date;
  }> {
    try {
      const securityDoc = await db.collection('user_security').doc(uid).get();
      
      if (!securityDoc.exists()) {
        return { required: false };
      }
      
      const securityData = securityDoc.data();
      
      return {
        required: securityData?.requireReauth || false,
        reason: securityData?.lastSecurityAction,
        lastSecurityAction: securityData?.lastSecurityAction,
        securityTimestamp: securityData?.securityTimestamp?.toDate()
      };
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error checking reauth requirement:', error);
      return { required: false };
    }
  }
  
  /**
   * Clear reauth requirement after successful authentication
   */
  async clearReauthRequirement(uid: string): Promise<void> {
    try {
      await db.collection('user_security').doc(uid).update({
        requireReauth: false,
        reauthCompletedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ [SECURITY-OPT] Cleared reauth requirement for user ${uid}`);
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error clearing reauth requirement:', error);
    }
  }
  
  /**
   * Get security statistics for monitoring
   */
  async getSecurityStatistics(days: number = 7): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get token revocations
      const revocationsSnapshot = await db.collection('token_revocations')
        .where('revokedAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .get();
      
      // Get security audit logs
      const securityLogsSnapshot = await db.collection('security_audit_logs')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .get();
      
      const stats = {
        period: `${days} days`,
        tokenRevocations: revocationsSnapshot.size,
        securityActions: securityLogsSnapshot.size,
        actionBreakdown: {} as any,
        dailyBreakdown: {} as any
      };
      
      // Analyze security actions
      securityLogsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const action = data.action || 'unknown';
        stats.actionBreakdown[action] = (stats.actionBreakdown[action] || 0) + 1;
        
        const date = data.timestamp?.toDate()?.toISOString().slice(0, 10) || 'unknown';
        stats.dailyBreakdown[date] = (stats.dailyBreakdown[date] || 0) + 1;
      });
      
      return stats;
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error getting security statistics:', error);
      return null;
    }
  }
}

export const securityOptimizationService = new SecurityOptimizationService();