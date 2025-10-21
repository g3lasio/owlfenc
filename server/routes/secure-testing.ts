/**
 * SECURE TESTING ROUTES
 * API endpoints to run security tests on the trial system
 */

import { Router } from 'express';
import { runSecurityTests } from '../tests/secure-trial-testing.js';
import { verifyAdminAuth } from '../middleware/firebase-auth-middleware.js';
import { getAuth } from 'firebase-admin/auth';

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

/**
 * POST /api/secure-testing/generate-test-token
 * Generate Firebase custom token for security testing
 * Creates test users if they don't exist
 */
router.post('/generate-test-token', async (req, res) => {
  try {
    const { userId, email } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        message: 'userId and email are required'
      });
    }

    console.log(`🔐 [TEST-TOKEN] Generating token for user: ${userId} (${email})`);

    const auth = getAuth();
    
    // Try to get existing user, create if doesn't exist
    let userRecord;
    try {
      userRecord = await auth.getUser(userId);
      console.log(`✅ [TEST-TOKEN] Using existing user: ${userId}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new test user
        console.log(`🔐 [TEST-TOKEN] Creating new test user: ${userId}`);
        userRecord = await auth.createUser({
          uid: userId,
          email: email,
          displayName: `Test User ${userId}`,
          emailVerified: true
        });
        console.log(`✅ [TEST-TOKEN] Test user created: ${userId}`);
      } else {
        throw error;
      }
    }

    // Generate custom token
    const customToken = await auth.createCustomToken(userId);
    console.log(`✅ [TEST-TOKEN] Custom token generated for: ${userId}`);

    res.json({
      success: true,
      customToken,
      userId: userRecord.uid,
      email: userRecord.email,
      message: 'Test token generated successfully'
    });

  } catch (error) {
    console.error('❌ [TEST-TOKEN] Error generating test token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate test token',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;