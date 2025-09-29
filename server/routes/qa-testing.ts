/**
 * QA TESTING ROUTES
 * Production quality assurance testing endpoints
 */

import { Router } from 'express';
import { verifyAdminAuth } from '../middleware/firebase-auth-middleware.js';
import { productionQASuite } from '../tests/production-qa-suite.js';

const router = Router();

/**
 * POST /api/qa/run-full-suite
 * Run complete QA test suite (admin only)
 */
router.post('/run-full-suite', verifyAdminAuth, async (req, res) => {
  try {
    console.log('🧪 [QA-API] Starting full production QA suite...');
    
    const result = await productionQASuite.runAllTests();
    
    res.json({
      success: true,
      message: 'QA suite completed',
      testResults: result,
      detailedReport: productionQASuite.getDetailedReport()
    });
    
  } catch (error) {
    console.error('❌ [QA-API] Error running QA suite:', error);
    res.status(500).json({
      success: false,
      error: 'QA suite failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/qa/test-status
 * Get status of testing system
 */
router.get('/test-status', verifyAdminAuth, async (req, res) => {
  try {
    const status = {
      qaSystemStatus: 'healthy',
      timestamp: new Date().toISOString(),
      availableTests: [
        'trial_active_unlimited_consumption',
        'trial_expired_auto_downgrade',
        'primo_quota_exceeded',
        'mero_blocks_master_unlimited',
        'monthly_reset_preserves_history',
        'firestore_rules_prevent_client_writes',
        'rate_limiting_enforcement',
        'trial_notifications_trigger',
        'admin_panel_access_control'
      ],
      testCategories: [
        'trial_system',
        'usage_tracking',
        'quota_enforcement',
        'monthly_resets',
        'firestore_rules',
        'anti_abuse',
        'notification_system',
        'admin_panel'
      ]
    };
    
    res.json({
      success: true,
      status
    });
    
  } catch (error) {
    console.error('❌ [QA-API] Error getting test status:', error);
    res.status(500).json({
      success: false,
      error: 'Test status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/qa/health
 * Health check for QA system
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'qa-testing',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;