/**
 * MONTHLY RESET ROUTES
 * API endpoints for monthly usage resets (Cloud Scheduler compatible)
 */

import { Router } from 'express';
import { monthlyResetService } from '../services/monthlyResetService.js';
import { verifyAdminAuth } from '../middleware/firebase-auth-middleware.js';

const router = Router();

/**
 * POST /api/monthly-reset/execute
 * Execute monthly reset (Cloud Scheduler endpoint)
 */
router.post('/execute', async (req, res) => {
  try {
    console.log('🔄 [MONTHLY-RESET-API] Starting monthly reset...');
    
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
        const result = await monthlyResetService.performMonthlyReset();
        res.json({
          success: result.success,
          message: 'Monthly reset completed',
          result
        });
      });
    }
    
    // Execute reset
    const result = await monthlyResetService.performMonthlyReset();
    
    res.json({
      success: result.success,
      message: 'Monthly reset completed',
      result
    });
    
  } catch (error) {
    console.error('❌ [MONTHLY-RESET-API] Error executing reset:', error);
    res.status(500).json({
      success: false,
      error: 'Monthly reset failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/monthly-reset/manual
 * Manual reset trigger (admin only)
 */
router.post('/manual', verifyAdminAuth, async (req, res) => {
  try {
    const { targetMonth } = req.body;
    
    console.log(`🔧 [MONTHLY-RESET-API] Manual reset requested for: ${targetMonth || 'current month'}`);
    
    const result = await monthlyResetService.manualReset(targetMonth);
    
    res.json({
      success: result.success,
      message: 'Manual reset completed',
      result
    });
    
  } catch (error) {
    console.error('❌ [MONTHLY-RESET-API] Error in manual reset:', error);
    res.status(500).json({
      success: false,
      error: 'Manual reset failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/monthly-reset/status
 * Check if reset is needed (admin only)
 */
router.get('/status', verifyAdminAuth, async (req, res) => {
  try {
    const isNeeded = await monthlyResetService.isResetNeeded();
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    res.json({
      success: true,
      currentMonth,
      resetNeeded: isNeeded,
      message: isNeeded ? 'Reset is needed' : 'Reset not needed - all users have current month data'
    });
    
  } catch (error) {
    console.error('❌ [MONTHLY-RESET-API] Error checking status:', error);
    res.status(500).json({
      success: false,
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/monthly-reset/health
 * Health check for Cloud Scheduler
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'monthly-reset',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;