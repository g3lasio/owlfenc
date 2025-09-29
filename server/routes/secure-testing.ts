/**
 * SECURE TESTING ROUTES
 * API endpoints to run security tests on the trial system
 */

import { Router } from 'express';
import { runSecurityTests } from '../tests/secure-trial-testing.js';
import { verifyAdminAuth } from '../middleware/firebase-auth-middleware.js';

const router = Router();

/**
 * GET /api/secure-testing/run-all
 * Run all security tests and return comprehensive report
 * ADMIN ONLY - RESTRICTED ACCESS
 */
router.get('/run-all', verifyAdminAuth, async (req, res) => {
  try {
    console.log('🔒 [SECURE-TESTING] Running comprehensive security tests...');
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const report = await runSecurityTests(baseUrl);
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(report);
    
  } catch (error) {
    console.error('❌ [SECURE-TESTING] Error running tests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run security tests',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/secure-testing/status
 * Get testing system status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    testingSystem: 'active',
    availableTests: [
      'Trial Creation Security',
      'ServerTimestamp Protection', 
      'Enforcement Bypass Attempts',
      'Concurrent Usage Limits',
      'Device Reset Protection',
      'Malicious Payload Handling'
    ],
    endpoint: '/api/secure-testing/run-all',
    message: 'Comprehensive security testing system ready'
  });
});

export default router;