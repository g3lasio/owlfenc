/**
 * STRIPE HEALTH CHECK ROUTES
 * Provides health check and mode detection endpoints
 */

import { Router, Request, Response } from 'express';
import { stripeHealthService } from '../services/stripeHealthService.js';

const router = Router();

/**
 * GET /api/stripe-health
 * Get comprehensive Stripe health status
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const health = await stripeHealthService.getHealthStatus(forceRefresh);

    res.json({
      success: true,
      ...health,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [STRIPE-HEALTH-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check Stripe health',
      message: error.message,
    });
  }
});

/**
 * GET /api/stripe-health/mode
 * Get current Stripe mode (test/live)
 */
router.get('/mode', (req: Request, res: Response) => {
  try {
    const mode = stripeHealthService.detectMode();
    
    res.json({
      success: true,
      mode,
      isTestMode: mode === 'test',
      isLiveMode: mode === 'live',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [STRIPE-HEALTH-API] Error detecting mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect Stripe mode',
      message: error.message,
    });
  }
});

/**
 * POST /api/stripe-health/clear-cache
 * Clear health check cache (force refresh)
 */
router.post('/clear-cache', (req: Request, res: Response) => {
  try {
    stripeHealthService.clearCache();
    
    res.json({
      success: true,
      message: 'Health check cache cleared',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [STRIPE-HEALTH-API] Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message,
    });
  }
});

/**
 * GET /api/stripe-health/can-process
 * Simple boolean check: can we process payments?
 */
router.get('/can-process', async (req: Request, res: Response) => {
  try {
    const canProcess = await stripeHealthService.canProcessPayments();
    const health = await stripeHealthService.getHealthStatus();
    
    res.json({
      success: true,
      canProcessPayments: canProcess,
      mode: health.mode,
      issues: health.issues,
      recommendations: health.recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [STRIPE-HEALTH-API] Error checking capability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check payment capability',
      message: error.message,
    });
  }
});

export default router;
