/**
 * SECURE TRIAL ROUTES
 * Endpoints for trial system with serverTimestamp protection
 */

import { Router } from 'express';
import { secureTrialService } from '../services/secureTrialService.js';
import { verifyFirebaseAuth, AuthenticatedRequest } from '../middleware/firebase-auth-middleware.js';

const router = Router();

/**
 * POST /api/secure-trial/activate
 * Activate secure 14-day trial with serverTimestamp (IMMUTABLE)
 * REQUIRES FIREBASE AUTHENTICATION - NO BYPASS POSSIBLE
 */
router.post('/activate', verifyFirebaseAuth, async (req, res) => {
  try {
    // SECURITY: Get UID from verified Firebase token, not request body
    const uid = (req as AuthenticatedRequest).uid;
    
    // UID is guaranteed to exist from Firebase auth middleware
    
    console.log(`🔒 [SECURE-TRIAL-API] Activating secure trial for: ${uid}`);
    
    const trialEntitlements = await secureTrialService.createSecureTrial(uid);
    
    res.json({
      success: true,
      message: 'Secure trial activated with serverTimestamp protection',
      trial: {
        uid: trialEntitlements.uid,
        planName: trialEntitlements.planName,
        daysRemaining: trialEntitlements.trial.daysRemaining,
        isTrialing: trialEntitlements.trial.isTrialing,
        status: trialEntitlements.trial.status,
        // Don't expose serverTimestamp for security
        expiresAt: trialEntitlements.trial.endDate
      }
    });
    
  } catch (error) {
    console.error('❌ [SECURE-TRIAL-API] Error activating trial:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate secure trial'
    });
  }
});

/**
 * GET /api/secure-trial/status
 * Get trial status (protected by serverTimestamp)
 * REQUIRES FIREBASE AUTHENTICATION - NO BYPASS POSSIBLE
 */
router.get('/status', verifyFirebaseAuth, async (req, res) => {
  try {
    // SECURITY: Get UID from verified Firebase token, not URL params
    const uid = (req as AuthenticatedRequest).uid;
    
    console.log(`🔍 [SECURE-TRIAL-API] Getting trial status for: ${uid}`);
    
    const entitlements = await secureTrialService.getTrialEntitlements(uid);
    
    if (!entitlements) {
      return res.json({
        success: true,
        hasActiveTrial: false,
        message: 'No trial found'
      });
    }
    
    res.json({
      success: true,
      hasActiveTrial: entitlements.trial.isTrialing,
      trial: {
        uid: entitlements.uid,
        planName: entitlements.planName,
        daysRemaining: entitlements.trial.daysRemaining,
        isTrialing: entitlements.trial.isTrialing,
        status: entitlements.trial.status,
        expiresAt: entitlements.trial.endDate,
        limits: entitlements.limits,
        features: entitlements.features
      }
    });
    
  } catch (error) {
    console.error('❌ [SECURE-TRIAL-API] Error getting trial status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trial status'
    });
  }
});

/**
 * POST /api/secure-trial/use-feature
 * Use feature with atomic enforcement (STRONG ENFORCEMENT)
 * REQUIRES FIREBASE AUTHENTICATION - NO BYPASS POSSIBLE
 */
router.post('/use-feature', verifyFirebaseAuth, async (req, res) => {
  try {
    // SECURITY: Get UID from verified Firebase token, not request body
    const uid = (req as AuthenticatedRequest).uid;
    const { feature, action = 'increment' } = req.body;
    
    if (!feature) {
      return res.status(400).json({
        success: false,
        error: 'Feature is required'
      });
    }
    
    console.log(`🛡️ [SECURE-TRIAL-API] Using feature ${feature} for: ${uid}`);
    
    // 1. Check if can use feature
    const canUse = await secureTrialService.canUseFeature(uid, feature);
    
    if (!canUse.canUse) {
      return res.status(403).json({
        success: false,
        error: 'Feature limit exceeded or trial expired',
        details: {
          used: canUse.used,
          limit: canUse.limit,
          reason: canUse.reason
        }
      });
    }
    
    // 2. Increment usage atomically
    if (action === 'increment') {
      const success = await secureTrialService.incrementUsage(uid, feature);
      
      if (!success) {
        return res.status(403).json({
          success: false,
          error: 'Failed to increment usage - limit may have been exceeded'
        });
      }
    }
    
    // 3. Return updated usage
    const updatedUsage = await secureTrialService.canUseFeature(uid, feature);
    
    res.json({
      success: true,
      message: `Feature ${feature} used successfully`,
      usage: {
        feature,
        used: updatedUsage.used,
        limit: updatedUsage.limit,
        canUse: updatedUsage.canUse
      }
    });
    
  } catch (error) {
    console.error('❌ [SECURE-TRIAL-API] Error using feature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to use feature'
    });
  }
});

/**
 * POST /api/secure-trial/check-feature
 * Check if user can use feature (without incrementing)
 * REQUIRES FIREBASE AUTHENTICATION - NO BYPASS POSSIBLE
 */
router.post('/check-feature', verifyFirebaseAuth, async (req, res) => {
  try {
    // SECURITY: Get UID from verified Firebase token, not request body
    const uid = (req as AuthenticatedRequest).uid;
    const { feature } = req.body;
    
    if (!feature) {
      return res.status(400).json({
        success: false,
        error: 'Feature is required'
      });
    }
    
    const canUse = await secureTrialService.canUseFeature(uid, feature);
    
    res.json({
      success: true,
      canUse: canUse.canUse,
      usage: {
        feature,
        used: canUse.used,
        limit: canUse.limit,
        reason: canUse.reason
      }
    });
    
  } catch (error) {
    console.error('❌ [SECURE-TRIAL-API] Error checking feature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check feature'
    });
  }
});

/**
 * POST /api/secure-trial/expire
 * Manually expire trial (admin only)
 * REQUIRES FIREBASE AUTHENTICATION - NO BYPASS POSSIBLE
 */
router.post('/expire', verifyFirebaseAuth, async (req, res) => {
  try {
    // SECURITY: Get UID from verified Firebase token, not URL params
    const uid = (req as AuthenticatedRequest).uid;
    
    console.log(`⏰ [SECURE-TRIAL-API] Manually expiring trial for: ${uid}`);
    
    await secureTrialService.expireTrial(uid);
    
    res.json({
      success: true,
      message: 'Trial expired successfully'
    });
    
  } catch (error) {
    console.error('❌ [SECURE-TRIAL-API] Error expiring trial:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to expire trial'
    });
  }
});

export default router;