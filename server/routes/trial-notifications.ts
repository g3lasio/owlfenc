/**
 * TRIAL NOTIFICATION ROUTES
 * API endpoints for trial notification system (Cloud Scheduler compatible)
 */

import { Request, Response } from 'express';
import { trialNotificationService } from '../services/trialNotificationService.js';
import { verifyAdminAuth } from '../middleware/firebase-auth-middleware.js';

export function registerTrialNotificationRoutes(app: any) {
  /**
   * POST /api/trial-notifications/process
   * Process daily trial notifications (Cloud Scheduler endpoint)
   */
  app.post('/api/trial-notifications/process', async (req: Request, res: Response) => {
    try {
      console.log('📧 [TRIAL-NOTIFICATIONS-API] Processing daily notifications...');
      
      // Verify request is from Cloud Scheduler or has admin auth
      const isCloudScheduler = req.headers['user-agent']?.includes('Google-Cloud-Scheduler');
      const hasAuthHeader = req.headers.authorization;
      
      if (!isCloudScheduler && !hasAuthHeader) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - Cloud Scheduler or admin auth required'
        });
      }
      
      // If has auth header, verify admin
      if (hasAuthHeader) {
        return verifyAdminAuth(req, res, async () => {
          const result = await trialNotificationService.processTrialNotifications();
          res.json({
            success: result.success,
            message: 'Trial notifications processed',
            result
          });
        });
      }
      
      // Execute notification processing
      const result = await trialNotificationService.processTrialNotifications();
      
      res.json({
        success: result.success,
        message: 'Trial notifications processed',
        result
      });
      
    } catch (error) {
      console.error('❌ [TRIAL-NOTIFICATIONS-API] Error processing notifications:', error);
      res.status(500).json({
        success: false,
        error: 'Notification processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/trial-notifications/manual
   * Send manual notification (admin only)
   */
  app.post('/api/trial-notifications/manual', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      const { uid, notificationType } = req.body;
      
      if (!uid || !notificationType) {
        return res.status(400).json({
          success: false,
          error: 'uid and notificationType are required'
        });
      }
      
      if (!['day_7', 'day_12', 'day_14_expiry'].includes(notificationType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid notification type'
        });
      }
      
      console.log(`🔧 [TRIAL-NOTIFICATIONS-API] Manual notification: ${uid} - ${notificationType}`);
      
      const sent = await trialNotificationService.sendManualNotification(uid, notificationType);
      
      res.json({
        success: sent,
        message: sent ? 'Manual notification sent successfully' : 'Failed to send manual notification',
        uid,
        notificationType
      });
      
    } catch (error) {
      console.error('❌ [TRIAL-NOTIFICATIONS-API] Error in manual notification:', error);
      res.status(500).json({
        success: false,
        error: 'Manual notification failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/trial-notifications/health
   * Health check for Cloud Scheduler
   */
  app.get('/api/trial-notifications/health', (req: Request, res: Response) => {
    res.json({
      success: true,
      service: 'trial-notifications',
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * GET /api/trial-notifications/status
   * Get service status and statistics
   */
  app.get('/api/trial-notifications/status', verifyAdminAuth, async (req: Request, res: Response) => {
    try {
      const stats = await trialNotificationService.getNotificationStats();
      res.json({
        success: true,
        service: 'trial-notifications',
        status: 'operational',
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}