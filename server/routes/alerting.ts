/**
 * ALERTING ROUTES
 * API endpoints for managing and viewing alerts
 */

import { Router } from 'express';
import { verifyAdminAuth } from '../middleware/firebase-auth-middleware.js';
import { alertingService } from '../services/alertingService.js';

const router = Router();

/**
 * GET /api/alerts/recent
 * Get recent alerts (admin only)
 */
router.get('/recent', verifyAdminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const alerts = await alertingService.getRecentAlerts(limit);
    
    res.json({
      success: true,
      alerts,
      count: alerts.length
    });
    
  } catch (error) {
    console.error('❌ [ALERTS-API] Error getting recent alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/alerts/resolve/:alertId
 * Mark alert as resolved (admin only)
 */
router.post('/resolve/:alertId', verifyAdminAuth, async (req, res) => {
  try {
    const { alertId } = req.params;
    
    const resolved = await alertingService.resolveAlert(alertId);
    
    if (resolved) {
      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to resolve alert'
      });
    }
    
  } catch (error) {
    console.error('❌ [ALERTS-API] Error resolving alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/alerts/config
 * Get alerting configuration (admin only)
 */
router.get('/config', verifyAdminAuth, async (req, res) => {
  try {
    const config = alertingService.getConfig();
    
    // Don't expose sensitive data like webhook URLs
    const safeConfig = {
      slack: {
        channel: config.slack?.channel,
        enabled: config.slack?.enabled,
        configured: !!config.slack?.webhookUrl
      },
      discord: {
        enabled: config.discord?.enabled,
        configured: !!config.discord?.webhookUrl
      },
      email: {
        enabled: config.email?.enabled,
        adminEmailCount: config.email?.adminEmails?.length || 0
      },
      thresholds: config.thresholds
    };
    
    res.json({
      success: true,
      config: safeConfig
    });
    
  } catch (error) {
    console.error('❌ [ALERTS-API] Error getting config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get config',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/alerts/test
 * Send test alert (admin only, development/staging only)
 */
router.post('/test', verifyAdminAuth, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Test alerts not available in production'
      });
    }
    
    const { type = 'business', priority = 'low', title, message } = req.body;
    
    const testAlert = {
      type: type as any,
      priority: priority as any,
      title: title || 'Test Alert',
      message: message || 'This is a test alert to verify the alerting system is working correctly.',
      details: {
        testAlert: true,
        timestamp: new Date().toISOString()
      },
      source: 'manual_test'
    };
    
    const sent = await alertingService.sendAlert(testAlert);
    
    res.json({
      success: true,
      sent,
      message: sent ? 'Test alert sent successfully' : 'Test alert failed to send'
    });
    
  } catch (error) {
    console.error('❌ [ALERTS-API] Error sending test alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/alerts/stats
 * Get alerting statistics (admin only)
 */
router.get('/stats', verifyAdminAuth, async (req, res) => {
  try {
    const alerts = await alertingService.getRecentAlerts(1000); // Get more for stats
    
    const stats = {
      total: alerts.length,
      byType: {} as any,
      byPriority: {} as any,
      resolved: alerts.filter(a => a.resolved).length,
      unresolved: alerts.filter(a => !a.resolved).length,
      last24Hours: alerts.filter(a => {
        const alertTime = new Date(a.timestamp?.toDate?.() || a.timestamp);
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        return alertTime > twentyFourHoursAgo;
      }).length
    };
    
    // Count by type
    alerts.forEach(alert => {
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
      stats.byPriority[alert.priority] = (stats.byPriority[alert.priority] || 0) + 1;
    });
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ [ALERTS-API] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/alerts/health
 * Health check for alerting system
 */
router.get('/health', (req, res) => {
  const config = alertingService.getConfig();
  
  res.json({
    success: true,
    service: 'alerting',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    channels: {
      slack: config.slack?.enabled ? 'enabled' : 'disabled',
      discord: config.discord?.enabled ? 'enabled' : 'disabled',
      email: config.email?.enabled ? 'enabled' : 'disabled'
    }
  });
});

export default router;