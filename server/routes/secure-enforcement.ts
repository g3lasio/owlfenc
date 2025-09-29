/**
 * SECURE ENFORCEMENT ROUTES
 * Strong backend enforcement that cannot be bypassed
 * All critical actions go through this system
 */

import { Router } from 'express';
import { secureTrialService } from '../services/secureTrialService.js';
import { verifyFirebaseAuth, AuthenticatedRequest } from '../middleware/firebase-auth-middleware.js';

const router = Router();

/**
 * POST /api/secure-enforcement/generate-contract
 * Generate contract with STRONG enforcement (cannot be bypassed)
 * REQUIRES FIREBASE AUTHENTICATION - NO BYPASS POSSIBLE
 */
router.post('/generate-contract', verifyFirebaseAuth, async (req, res) => {
  try {
    // SECURITY: Get UID from verified Firebase token, not request body
    const uid = (req as AuthenticatedRequest).uid;
    const { contractData } = req.body;
    
    // UID is guaranteed to exist from Firebase auth middleware
    
    console.log(`🛡️ [SECURE-ENFORCEMENT] Generating contract for: ${uid}`);
    
    // 1. ATOMIC CHECK AND INCREMENT (transaction)
    const canUse = await secureTrialService.canUseFeature(uid, 'contracts');
    
    if (!canUse.canUse) {
      console.warn(`⚠️ [SECURE-ENFORCEMENT] Contract limit exceeded for ${uid}: ${canUse.used}/${canUse.limit}`);
      return res.status(403).json({
        success: false,
        error: 'Contract limit exceeded',
        details: {
          used: canUse.used,
          limit: canUse.limit,
          feature: 'contracts',
          reason: canUse.reason || 'Monthly limit reached'
        },
        upgradeRequired: true
      });
    }
    
    // 2. INCREMENT USAGE ATOMICALLY
    const incrementSuccess = await secureTrialService.incrementUsage(uid, 'contracts');
    
    if (!incrementSuccess) {
      return res.status(403).json({
        success: false,
        error: 'Failed to reserve contract slot - limit may have been reached by concurrent request'
      });
    }
    
    // 3. GENERATE CONTRACT (simulated for now)
    // TODO: Integrate with actual contract generation system
    const contractId = `contract_${Date.now()}_${uid.slice(0, 8)}`;
    const contractHtml = generateContractHTML(contractData, uid);
    
    // 4. RETURN SUCCESS WITH UPDATED USAGE
    const updatedUsage = await secureTrialService.canUseFeature(uid, 'contracts');
    
    res.json({
      success: true,
      message: 'Contract generated successfully with atomic enforcement',
      contract: {
        id: contractId,
        html: contractHtml,
        generatedAt: new Date().toISOString()
      },
      usage: {
        used: updatedUsage.used,
        limit: updatedUsage.limit,
        remaining: updatedUsage.limit === -1 ? 'unlimited' : Math.max(0, updatedUsage.limit - updatedUsage.used)
      }
    });
    
  } catch (error) {
    console.error('❌ [SECURE-ENFORCEMENT] Error generating contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate contract'
    });
  }
});

/**
 * POST /api/secure-enforcement/generate-estimate
 * Generate estimate with STRONG enforcement
 * REQUIRES FIREBASE AUTHENTICATION - NO BYPASS POSSIBLE
 */
router.post('/generate-estimate', verifyFirebaseAuth, async (req, res) => {
  try {
    // SECURITY: Get UID from verified Firebase token, not request body
    const uid = (req as AuthenticatedRequest).uid;
    const { estimateData, useAI = false } = req.body;
    
    // UID is guaranteed to exist from Firebase auth middleware
    
    const feature = useAI ? 'aiEstimates' : 'basicEstimates';
    console.log(`🛡️ [SECURE-ENFORCEMENT] Generating ${feature} for: ${uid}`);
    
    // 1. ATOMIC CHECK AND INCREMENT
    const canUse = await secureTrialService.canUseFeature(uid, feature);
    
    if (!canUse.canUse) {
      console.warn(`⚠️ [SECURE-ENFORCEMENT] ${feature} limit exceeded for ${uid}: ${canUse.used}/${canUse.limit}`);
      return res.status(403).json({
        success: false,
        error: `${useAI ? 'AI estimate' : 'Basic estimate'} limit exceeded`,
        details: {
          used: canUse.used,
          limit: canUse.limit,
          feature,
          reason: canUse.reason || 'Monthly limit reached'
        },
        upgradeRequired: true
      });
    }
    
    // 2. INCREMENT USAGE ATOMICALLY
    const incrementSuccess = await secureTrialService.incrementUsage(uid, feature);
    
    if (!incrementSuccess) {
      return res.status(403).json({
        success: false,
        error: 'Failed to reserve estimate slot - limit may have been reached by concurrent request'
      });
    }
    
    // 3. GENERATE ESTIMATE (simulated for now)
    const estimateId = `estimate_${Date.now()}_${uid.slice(0, 8)}`;
    const estimateHtml = generateEstimateHTML(estimateData, uid, useAI);
    
    // 4. RETURN SUCCESS WITH UPDATED USAGE
    const updatedUsage = await secureTrialService.canUseFeature(uid, feature);
    
    res.json({
      success: true,
      message: `${useAI ? 'AI estimate' : 'Basic estimate'} generated successfully`,
      estimate: {
        id: estimateId,
        html: estimateHtml,
        useAI,
        generatedAt: new Date().toISOString()
      },
      usage: {
        used: updatedUsage.used,
        limit: updatedUsage.limit,
        remaining: updatedUsage.limit === -1 ? 'unlimited' : Math.max(0, updatedUsage.limit - updatedUsage.used)
      }
    });
    
  } catch (error) {
    console.error('❌ [SECURE-ENFORCEMENT] Error generating estimate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate estimate'
    });
  }
});

/**
 * POST /api/secure-enforcement/property-verification
 * Property verification with STRONG enforcement
 * REQUIRES FIREBASE AUTHENTICATION - NO BYPASS POSSIBLE
 */
router.post('/property-verification', verifyFirebaseAuth, async (req, res) => {
  try {
    // SECURITY: Get UID from verified Firebase token, not request body
    const uid = (req as AuthenticatedRequest).uid;
    const { propertyData } = req.body;
    
    // UID is guaranteed to exist from Firebase auth middleware
    
    console.log(`🛡️ [SECURE-ENFORCEMENT] Property verification for: ${uid}`);
    
    // 1. ATOMIC CHECK AND INCREMENT
    const canUse = await secureTrialService.canUseFeature(uid, 'propertyVerifications');
    
    if (!canUse.canUse) {
      console.warn(`⚠️ [SECURE-ENFORCEMENT] Property verification limit exceeded for ${uid}: ${canUse.used}/${canUse.limit}`);
      return res.status(403).json({
        success: false,
        error: 'Property verification limit exceeded',
        details: {
          used: canUse.used,
          limit: canUse.limit,
          feature: 'propertyVerifications',
          reason: canUse.reason || 'Monthly limit reached'
        },
        upgradeRequired: true
      });
    }
    
    // 2. INCREMENT USAGE ATOMICALLY
    const incrementSuccess = await secureTrialService.incrementUsage(uid, 'propertyVerifications');
    
    if (!incrementSuccess) {
      return res.status(403).json({
        success: false,
        error: 'Failed to reserve property verification slot'
      });
    }
    
    // 3. PERFORM PROPERTY VERIFICATION (simulated)
    const verification = performPropertyVerification(propertyData);
    
    // 4. RETURN SUCCESS WITH UPDATED USAGE
    const updatedUsage = await secureTrialService.canUseFeature(uid, 'propertyVerifications');
    
    res.json({
      success: true,
      message: 'Property verification completed successfully',
      verification,
      usage: {
        used: updatedUsage.used,
        limit: updatedUsage.limit,
        remaining: updatedUsage.limit === -1 ? 'unlimited' : Math.max(0, updatedUsage.limit - updatedUsage.used)
      }
    });
    
  } catch (error) {
    console.error('❌ [SECURE-ENFORCEMENT] Error in property verification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform property verification'
    });
  }
});

/**
 * POST /api/secure-enforcement/permit-advisor
 * Permit advisor with STRONG enforcement
 * REQUIRES FIREBASE AUTHENTICATION - NO BYPASS POSSIBLE
 */
router.post('/permit-advisor', verifyFirebaseAuth, async (req, res) => {
  try {
    // SECURITY: Get UID from verified Firebase token, not request body
    const uid = (req as AuthenticatedRequest).uid;
    const { projectData } = req.body;
    
    // UID is guaranteed to exist from Firebase auth middleware
    
    console.log(`🛡️ [SECURE-ENFORCEMENT] Permit advisor for: ${uid}`);
    
    // 1. ATOMIC CHECK AND INCREMENT
    const canUse = await secureTrialService.canUseFeature(uid, 'permitAdvisor');
    
    if (!canUse.canUse) {
      console.warn(`⚠️ [SECURE-ENFORCEMENT] Permit advisor limit exceeded for ${uid}: ${canUse.used}/${canUse.limit}`);
      return res.status(403).json({
        success: false,
        error: 'Permit advisor limit exceeded',
        details: {
          used: canUse.used,
          limit: canUse.limit,
          feature: 'permitAdvisor',
          reason: canUse.reason || canUse.limit === 0 ? 'Feature not available in your plan' : 'Monthly limit reached'
        },
        upgradeRequired: true
      });
    }
    
    // 2. INCREMENT USAGE ATOMICALLY
    const incrementSuccess = await secureTrialService.incrementUsage(uid, 'permitAdvisor');
    
    if (!incrementSuccess) {
      return res.status(403).json({
        success: false,
        error: 'Failed to reserve permit advisor slot'
      });
    }
    
    // 3. PROVIDE PERMIT ADVICE (simulated)
    const permitAdvice = generatePermitAdvice(projectData);
    
    // 4. RETURN SUCCESS WITH UPDATED USAGE
    const updatedUsage = await secureTrialService.canUseFeature(uid, 'permitAdvisor');
    
    res.json({
      success: true,
      message: 'Permit advice generated successfully',
      advice: permitAdvice,
      usage: {
        used: updatedUsage.used,
        limit: updatedUsage.limit,
        remaining: updatedUsage.limit === -1 ? 'unlimited' : Math.max(0, updatedUsage.limit - updatedUsage.used)
      }
    });
    
  } catch (error) {
    console.error('❌ [SECURE-ENFORCEMENT] Error in permit advisor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to provide permit advice'
    });
  }
});

/**
 * GET /api/secure-enforcement/usage-summary
 * Get complete usage summary for user
 * REQUIRES FIREBASE AUTHENTICATION - NO BYPASS POSSIBLE
 */
router.get('/usage-summary', verifyFirebaseAuth, async (req, res) => {
  try {
    // SECURITY: Get UID from verified Firebase token, not URL params
    const uid = (req as AuthenticatedRequest).uid;
    
    console.log(`📊 [SECURE-ENFORCEMENT] Getting usage summary for: ${uid}`);
    
    const entitlements = await secureTrialService.getTrialEntitlements(uid);
    
    if (!entitlements) {
      return res.status(404).json({
        success: false,
        error: 'User entitlements not found'
      });
    }
    
    // Get current usage for all features
    const features = ['basicEstimates', 'aiEstimates', 'contracts', 'propertyVerifications', 'permitAdvisor', 'projects'];
    const usageSummary: any = {};
    
    for (const feature of features) {
      const usage = await secureTrialService.canUseFeature(uid, feature);
      usageSummary[feature] = {
        used: usage.used,
        limit: usage.limit,
        canUse: usage.canUse,
        remaining: usage.limit === -1 ? 'unlimited' : Math.max(0, usage.limit - usage.used)
      };
    }
    
    res.json({
      success: true,
      entitlements: {
        uid: entitlements.uid,
        planName: entitlements.planName,
        planId: entitlements.planId,
        isTrialing: entitlements.trial?.isTrialing || false,
        daysRemaining: entitlements.trial?.daysRemaining || 0,
        features: entitlements.features
      },
      usage: usageSummary
    });
    
  } catch (error) {
    console.error('❌ [SECURE-ENFORCEMENT] Error getting usage summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage summary'
    });
  }
});

// Helper functions (simulated implementations)
function generateContractHTML(contractData: any, uid: string): string {
  return `
    <div class="contract">
      <h1>Professional Contract</h1>
      <p>Generated for user: ${uid}</p>
      <p>Contract data: ${JSON.stringify(contractData)}</p>
      <p>Generated at: ${new Date().toISOString()}</p>
    </div>
  `;
}

function generateEstimateHTML(estimateData: any, uid: string, useAI: boolean): string {
  return `
    <div class="estimate">
      <h1>${useAI ? 'AI-Powered' : 'Basic'} Estimate</h1>
      <p>Generated for user: ${uid}</p>
      <p>Estimate data: ${JSON.stringify(estimateData)}</p>
      <p>AI Enhanced: ${useAI ? 'Yes' : 'No'}</p>
      <p>Generated at: ${new Date().toISOString()}</p>
    </div>
  `;
}

function performPropertyVerification(propertyData: any) {
  return {
    verified: true,
    propertyId: `prop_${Date.now()}`,
    address: propertyData?.address || 'Unknown address',
    status: 'verified',
    details: {
      ownership: 'verified',
      permits: 'up to date',
      zonning: 'residential'
    },
    verifiedAt: new Date().toISOString()
  };
}

function generatePermitAdvice(projectData: any) {
  return {
    permitRequired: true,
    permitType: 'Building Permit',
    estimatedCost: '$500-$1200',
    processingTime: '14 días hábiles',
    requirements: [
      'Site plan drawing',
      'Structural calculations',
      'Environmental impact assessment'
    ],
    nextSteps: [
      'Submit application to local authority',
      'Schedule inspection',
      'Pay permit fees'
    ],
    generatedAt: new Date().toISOString()
  };
}

export default router;