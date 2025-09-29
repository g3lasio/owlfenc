/**
 * SECURITY OPTIMIZATION ROUTES
 * Manual endpoints for security operations and monitoring
 * Provides API access to security optimization features
 */

import { Request, Response } from 'express';
import { securityOptimizationService } from '../services/securityOptimizationService.js';
import { verifyFirebaseAuth, verifyAdminAuth } from '../middleware/firebase-auth-middleware.js';
import { admin } from '../lib/firebase-admin.js';

export function registerSecurityOptimizationRoutes(app: any) {
  
  /**
   * POST /api/security/revoke-tokens/:uid
   * Manually revoke refresh tokens for a user
   */
  app.post('/api/security/revoke-tokens/:uid', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      const { uid } = req.params;
      const { reason = 'manual_revocation' } = req.body;
      
      // Admin permissions already verified by verifyAdminAuth middleware
      const requestingUser = (req as any).user;
      
      console.log(`🔐 [SECURITY-OPT] Admin token revocation requested for ${uid} by admin ${requestingUser?.uid}`);
      
      const result = await securityOptimizationService.processSecurityEvent({
        uid,
        action: 'manual_revocation',
        source: 'admin_api',
        revokeTokens: true,
        clearSessions: true
      });
      
      res.json({
        success: result.success,
        message: 'Token revocation completed',
        result: {
          tokensRevoked: result.revokedTokens,
          sessionsCleared: result.sessionsCleaned,
          timestamp: result.timestamp,
          errors: result.errors
        }
      });
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error in manual token revocation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke tokens',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/security/plan-change-security
   * Manually trigger security operations for plan changes
   */
  app.post('/api/security/plan-change-security', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      const { uid, oldPlan, newPlan, source = 'manual_api' } = req.body;
      const requestingUser = (req as any).user;
      
      if (!uid || !oldPlan || !newPlan) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: uid, oldPlan, newPlan'
        });
      }
      
      console.log(`🔐 [SECURITY-OPT] Admin plan change security for ${uid}: ${oldPlan} → ${newPlan}`);
      
      const result = await securityOptimizationService.handlePlanChangeSecurityOperations(
        uid,
        oldPlan,
        newPlan,
        source,
        req.ip,
        req.get('User-Agent')
      );
      
      res.json({
        success: result.success,
        message: 'Plan change security operations completed',
        result: {
          uid: result.uid,
          action: result.action,
          tokensRevoked: result.revokedTokens,
          sessionsCleared: result.sessionsCleaned,
          timestamp: result.timestamp,
          errors: result.errors
        }
      });
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error in plan change security:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process plan change security',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/security/bulk-revoke-tokens
   * Bulk revoke tokens for multiple users (admin operation)
   */
  app.post('/api/security/bulk-revoke-tokens', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      const { uids, reason = 'bulk_security_operation' } = req.body;
      const requestingUser = (req as any).user;
      
      if (!Array.isArray(uids) || uids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'uids must be a non-empty array'
        });
      }
      
      if (uids.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 100 users per bulk operation'
        });
      }
      
      console.log(`🔐 [SECURITY-OPT] Admin bulk token revocation for ${uids.length} users by admin ${requestingUser?.uid}`);
      
      const results = await securityOptimizationService.bulkRevokeTokens(uids, reason);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      res.json({
        success: failureCount === 0,
        message: `Bulk revocation completed: ${successCount} successful, ${failureCount} failed`,
        summary: {
          totalProcessed: results.length,
          successful: successCount,
          failed: failureCount
        },
        results
      });
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error in bulk token revocation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process bulk token revocation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * GET /api/security/check-reauth/:uid
   * Check if user needs re-authentication
   */
  app.get('/api/security/check-reauth/:uid', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const { uid } = req.params;
      const requestingUser = (req as any).user;
      
      // Users can check their own reauth status, or admins can check any user
      if (requestingUser?.uid !== uid && !requestingUser?.admin) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }
      
      const reauthCheck = await securityOptimizationService.checkUserReauthRequired(uid);
      
      res.json({
        success: true,
        uid,
        reauthRequired: reauthCheck.required,
        reason: reauthCheck.reason,
        lastSecurityAction: reauthCheck.lastSecurityAction,
        securityTimestamp: reauthCheck.securityTimestamp?.toISOString()
      });
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error checking reauth requirement:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check reauth requirement',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * POST /api/security/clear-reauth/:uid
   * Clear re-authentication requirement after successful auth
   */
  app.post('/api/security/clear-reauth/:uid', verifyFirebaseAuth, async (req: Request, res: Response) => {
    try {
      const { uid } = req.params;
      const requestingUser = (req as any).user;
      
      // Users can clear their own reauth requirement
      if (requestingUser?.uid !== uid) {
        return res.status(403).json({
          success: false,
          error: 'Can only clear your own reauth requirement'
        });
      }
      
      await securityOptimizationService.clearReauthRequirement(uid);
      
      res.json({
        success: true,
        message: 'Re-authentication requirement cleared',
        uid
      });
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error clearing reauth requirement:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear reauth requirement',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * GET /api/security/statistics
   * Get security statistics for monitoring
   */
  app.get('/api/security/statistics', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      const { days = 7 } = req.query;
      const requestingUser = (req as any).user;
      
      // Admin permissions already verified by verifyAdminAuth middleware
      
      const stats = await securityOptimizationService.getSecurityStatistics(Number(days));
      
      res.json({
        success: true,
        statistics: stats
      });
      
    } catch (error) {
      console.error('❌ [SECURITY-OPT] Error getting security statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get security statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * GET /api/security/health
   * Security service health check
   */
  app.get('/api/security/health', async (req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        service: 'security-optimization',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        features: {
          tokenRevocation: 'enabled',
          sessionCleanup: 'enabled',
          planChangeHooks: 'enabled',
          auditLogging: 'enabled',
          bulkOperations: 'enabled'
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        service: 'security-optimization',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}