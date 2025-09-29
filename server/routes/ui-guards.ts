/**
 * UI GUARDS ROUTES  
 * Frontend usage guards for visual feedback and limits display
 * Read-only endpoints for UI state management
 */

import { Router } from 'express';
import { verifyFirebaseAuth, AuthenticatedRequest } from '../middleware/firebase-auth-middleware.js';
import { productionUsageService } from '../services/productionUsageService.js';
import { rateLimiters } from '../middleware/rate-limit-middleware.js';
import { db } from '../lib/firebase-admin.js';

const router = Router();

/**
 * GET /api/ui-guards/usage-overview
 * Complete usage overview for UI guards
 */
router.get('/usage-overview', verifyFirebaseAuth, rateLimiters.readOnly, async (req, res) => {
  try {
    const uid = (req as AuthenticatedRequest).uid;
    
    console.log(`🎨 [UI-GUARDS] Getting usage overview for: ${uid}`);
    
    // Get current usage
    const usage = await productionUsageService.getUsageSummary(uid);
    
    // Get entitlements for plan info
    const entitlementsDoc = await db.collection('entitlements').doc(uid).get();
    const entitlements = entitlementsDoc.data();
    
    if (!entitlements) {
      return res.status(404).json({
        success: false,
        error: 'User entitlements not found'
      });
    }
    
    // Calculate UI state for each feature
    const featureGuards = await calculateFeatureGuards(uid, usage, entitlements);
    
    // Get trial info
    const trialInfo = calculateTrialInfo(entitlements);
    
    // Get upgrade recommendations
    const upgradeRecommendations = generateUpgradeRecommendations(usage, entitlements);
    
    res.json({
      success: true,
      overview: {
        user: {
          uid,
          planId: entitlements.planId,
          planName: entitlements.planName,
          trial: trialInfo
        },
        currentMonth: usage?.monthKey || new Date().toISOString().slice(0, 7),
        features: featureGuards,
        upgradeRecommendations,
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ [UI-GUARDS] Error getting usage overview:', error);
    res.status(500).json({
      success: false,
      error: 'Usage overview failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/ui-guards/check-feature
 * Check if specific feature can be used (without consuming)
 */
router.post('/check-feature', verifyFirebaseAuth, rateLimiters.readOnly, async (req, res) => {
  try {
    const uid = (req as AuthenticatedRequest).uid;
    const { feature } = req.body;
    
    if (!feature) {
      return res.status(400).json({
        success: false,
        error: 'Feature parameter is required'
      });
    }
    
    console.log(`🎨 [UI-GUARDS] Checking feature ${feature} for: ${uid}`);
    
    const canConsume = await productionUsageService.canConsumeFeature(uid, feature);
    
    // Get additional UI context
    const uiContext = generateFeatureUIContext(feature, canConsume);
    
    res.json({
      success: true,
      feature,
      canConsume: canConsume.canConsume,
      used: canConsume.used,
      limit: canConsume.limit,
      remaining: canConsume.remaining,
      reason: canConsume.reason,
      ui: uiContext
    });
    
  } catch (error) {
    console.error('❌ [UI-GUARDS] Error checking feature:', error);
    res.status(500).json({
      success: false,
      error: 'Feature check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/ui-guards/quota-warnings
 * Get quota warnings for proactive UI alerts
 */
router.get('/quota-warnings', verifyFirebaseAuth, rateLimiters.readOnly, async (req, res) => {
  try {
    const uid = (req as AuthenticatedRequest).uid;
    
    console.log(`⚠️ [UI-GUARDS] Getting quota warnings for: ${uid}`);
    
    const usage = await productionUsageService.getUsageSummary(uid);
    const warnings = generateQuotaWarnings(usage);
    
    res.json({
      success: true,
      warnings,
      warningCount: warnings.length,
      hasHighPriorityWarnings: warnings.some(w => w.priority === 'high')
    });
    
  } catch (error) {
    console.error('❌ [UI-GUARDS] Error getting quota warnings:', error);
    res.status(500).json({
      success: false,
      error: 'Quota warnings failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/ui-guards/plan-comparison
 * Get plan comparison data for upgrade flows
 */
router.get('/plan-comparison', verifyFirebaseAuth, rateLimiters.readOnly, async (req, res) => {
  try {
    const uid = (req as AuthenticatedRequest).uid;
    
    console.log(`📊 [UI-GUARDS] Getting plan comparison for: ${uid}`);
    
    // Get current user entitlements
    const entitlementsDoc = await db.collection('entitlements').doc(uid).get();
    const entitlements = entitlementsDoc.data();
    
    if (!entitlements) {
      return res.status(404).json({
        success: false,
        error: 'User entitlements not found'
      });
    }
    
    const currentPlan = entitlements.planName;
    const usage = await productionUsageService.getUsageSummary(uid);
    
    // Generate plan comparison
    const planComparison = generatePlanComparison(currentPlan, usage);
    
    res.json({
      success: true,
      currentPlan,
      comparison: planComparison,
      recommendations: generatePlanRecommendations(usage, entitlements)
    });
    
  } catch (error) {
    console.error('❌ [UI-GUARDS] Error getting plan comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Plan comparison failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper Functions

/**
 * Calculate feature guards for UI
 */
async function calculateFeatureGuards(uid: string, usage: any, entitlements: any): Promise<any> {
  const features = [
    'basicEstimates',
    'aiEstimates', 
    'contracts',
    'propertyVerifications',
    'permitAdvisor',
    'projects',
    'deepsearch'
  ];
  
  const guards: any = {};
  
  for (const feature of features) {
    const canConsume = await productionUsageService.canConsumeFeature(uid, feature);
    
    guards[feature] = {
      enabled: canConsume.canConsume,
      used: canConsume.used,
      limit: canConsume.limit,
      remaining: canConsume.remaining,
      percentage: canConsume.limit && canConsume.limit > 0 
        ? Math.round((canConsume.used / canConsume.limit) * 100) 
        : 0,
      status: getFeatureStatus(canConsume),
      message: generateFeatureMessage(feature, canConsume),
      ui: {
        showWarning: canConsume.limit && canConsume.remaining !== null && canConsume.remaining <= 2,
        showUpgrade: !canConsume.canConsume && canConsume.reason?.includes('limit'),
        buttonDisabled: !canConsume.canConsume,
        progressColor: getProgressColor(canConsume)
      }
    };
  }
  
  return guards;
}

/**
 * Calculate trial information
 */
function calculateTrialInfo(entitlements: any): any {
  const trial = entitlements.trial;
  
  if (!trial || !trial.isTrialing) {
    return {
      isTrialing: false,
      status: trial?.status || 'none',
      daysRemaining: 0
    };
  }
  
  const startDate = trial.startDate.toDate();
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 14 - daysSinceStart);
  
  return {
    isTrialing: true,
    status: 'active',
    daysInTrial: daysSinceStart,
    daysRemaining,
    startDate: startDate.toISOString(),
    progressPercentage: Math.round((daysSinceStart / 14) * 100)
  };
}

/**
 * Generate upgrade recommendations
 */
function generateUpgradeRecommendations(usage: any, entitlements: any): any[] {
  const recommendations = [];
  const currentPlan = entitlements.planName;
  
  if (currentPlan === 'primo') {
    // Check if user is hitting limits frequently
    if (usage?.features) {
      const hasHighUsage = Object.values(usage.features).some((feature: any) => 
        feature.percentage > 80
      );
      
      if (hasHighUsage) {
        recommendations.push({
          type: 'plan_upgrade',
          priority: 'high',
          title: 'Upgrade to Mero for 10x More Features',
          description: 'You\'re using most of your monthly limits. Upgrade for significantly more capacity.',
          action: 'upgrade_to_mero',
          savings: 'First month 20% off'
        });
      }
    }
  }
  
  if (entitlements.trial?.isTrialing) {
    const daysRemaining = calculateTrialInfo(entitlements).daysRemaining;
    
    if (daysRemaining <= 3) {
      recommendations.push({
        type: 'trial_ending',
        priority: 'urgent',
        title: 'Trial Ending Soon!',
        description: `Only ${daysRemaining} days left. Upgrade to keep using all features.`,
        action: 'upgrade_from_trial',
        savings: 'Special trial pricing available'
      });
    }
  }
  
  return recommendations;
}

/**
 * Generate quota warnings
 */
function generateQuotaWarnings(usage: any): any[] {
  const warnings = [];
  
  if (!usage?.features) return warnings;
  
  Object.entries(usage.features).forEach(([feature, data]: [string, any]) => {
    if (data.limit && data.remaining !== null) {
      if (data.remaining === 0) {
        warnings.push({
          feature,
          priority: 'high',
          type: 'quota_exceeded',
          title: `${getFeatureDisplayName(feature)} Limit Reached`,
          message: `You've used all ${data.limit} ${getFeatureDisplayName(feature).toLowerCase()} this month.`,
          action: 'upgrade_plan'
        });
      } else if (data.remaining <= 2) {
        warnings.push({
          feature,
          priority: 'medium',
          type: 'quota_warning',
          title: `Low on ${getFeatureDisplayName(feature)}`,
          message: `Only ${data.remaining} ${getFeatureDisplayName(feature).toLowerCase()} remaining this month.`,
          action: 'upgrade_plan'
        });
      }
    }
  });
  
  return warnings.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
  });
}

/**
 * Generate plan comparison
 */
function generatePlanComparison(currentPlan: string, usage: any): any {
  const plans = {
    primo: {
      name: 'Primo',
      price: 'Free',
      limits: {
        basicEstimates: 5,
        aiEstimates: 2,
        contracts: 2,
        propertyVerifications: 3,
        permitAdvisor: 3
      }
    },
    mero: {
      name: 'Mero',
      price: '$37/month',
      limits: {
        basicEstimates: 50,
        aiEstimates: 25,
        contracts: 25,
        propertyVerifications: 20,
        permitAdvisor: 30
      }
    },
    master: {
      name: 'Master',
      price: '$97/month',
      limits: {
        basicEstimates: null,
        aiEstimates: null,
        contracts: null,
        propertyVerifications: null,
        permitAdvisor: null
      }
    }
  };
  
  return Object.entries(plans).map(([planId, plan]) => ({
    planId,
    ...plan,
    isCurrent: planId === currentPlan,
    isRecommended: shouldRecommendPlan(planId, currentPlan, usage),
    savings: planId === 'mero' ? 'Most Popular - 20% off first month' : null
  }));
}

// Utility functions
function getFeatureStatus(canConsume: any): string {
  if (!canConsume.canConsume) return 'blocked';
  if (canConsume.limit && canConsume.remaining !== null && canConsume.remaining <= 2) return 'warning';
  return 'available';
}

function generateFeatureMessage(feature: string, canConsume: any): string {
  const displayName = getFeatureDisplayName(feature);
  
  if (!canConsume.canConsume) {
    return `Monthly limit reached for ${displayName.toLowerCase()}. Upgrade to continue.`;
  }
  
  if (canConsume.limit === null) {
    return `Unlimited ${displayName.toLowerCase()} available`;
  }
  
  return `${canConsume.remaining} of ${canConsume.limit} ${displayName.toLowerCase()} remaining this month`;
}

function getFeatureDisplayName(feature: string): string {
  const names: { [key: string]: string } = {
    basicEstimates: 'Basic Estimates',
    aiEstimates: 'AI Estimates',
    contracts: 'Contracts',
    propertyVerifications: 'Property Verifications',
    permitAdvisor: 'Permit Advisor',
    projects: 'Projects',
    deepsearch: 'Deep Search'
  };
  
  return names[feature] || feature;
}

function getProgressColor(canConsume: any): string {
  if (!canConsume.canConsume) return 'red';
  if (canConsume.limit && canConsume.remaining !== null && canConsume.remaining <= 2) return 'orange';
  return 'green';
}

function generateFeatureUIContext(feature: string, canConsume: any): any {
  return {
    displayName: getFeatureDisplayName(feature),
    icon: getFeatureIcon(feature),
    description: getFeatureDescription(feature),
    ctaText: canConsume.canConsume ? `Use ${getFeatureDisplayName(feature)}` : 'Upgrade to Use',
    upgradeText: `Get more ${getFeatureDisplayName(feature).toLowerCase()} with a paid plan`
  };
}

function getFeatureIcon(feature: string): string {
  const icons: { [key: string]: string } = {
    basicEstimates: '📊',
    aiEstimates: '🤖',
    contracts: '📝',
    propertyVerifications: '🏠',
    permitAdvisor: '📋',
    projects: '🏗️',
    deepsearch: '🔍'
  };
  
  return icons[feature] || '⚡';
}

function getFeatureDescription(feature: string): string {
  const descriptions: { [key: string]: string } = {
    basicEstimates: 'Generate professional project estimates',
    aiEstimates: 'AI-powered intelligent project estimates',
    contracts: 'Professional legal contract generation',
    propertyVerifications: 'Verify property details and ownership',
    permitAdvisor: 'Get permit requirements and guidance',
    projects: 'Manage and organize your projects',
    deepsearch: 'Advanced research and market analysis'
  };
  
  return descriptions[feature] || 'Premium feature';
}

function shouldRecommendPlan(planId: string, currentPlan: string, usage: any): boolean {
  if (planId === currentPlan) return false;
  
  // Recommend mero if user is on primo and hitting limits
  if (currentPlan === 'primo' && planId === 'mero') {
    return usage?.features && Object.values(usage.features).some((feature: any) => 
      feature.percentage > 70
    );
  }
  
  return false;
}

function generatePlanRecommendations(usage: any, entitlements: any): any[] {
  // Implementation for plan recommendations
  return [];
}

export default router;