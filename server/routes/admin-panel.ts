/**
 * ADMIN PANEL ROUTES
 * Business controls, metrics, and admin management for production system
 */

import { Router } from 'express';
import { verifyAdminAuth } from '../middleware/firebase-auth-middleware.js';
import { productionUsageService } from '../services/productionUsageService.js';
import { db } from '../lib/firebase-admin.js';

const router = Router();

/**
 * GET /api/admin/dashboard
 * Main admin dashboard with key metrics
 */
router.get('/dashboard', verifyAdminAuth, async (req, res) => {
  try {
    console.log('📊 [ADMIN-PANEL] Loading dashboard metrics...');
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get usage analytics
    const analytics = await productionUsageService.getUsageAnalytics(currentMonth);
    
    // Get user distribution by plan
    const entitlementsSnapshot = await db.collection('entitlements').get();
    const planDistribution: { [planName: string]: number } = {};
    const trialUsers = { active: 0, expired: 0 };
    
    entitlementsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const planName = data.planName || 'unknown';
      planDistribution[planName] = (planDistribution[planName] || 0) + 1;
      
      if (data.trial?.isTrialing) {
        trialUsers.active++;
      } else if (data.trial?.status === 'expired') {
        trialUsers.expired++;
      }
    });
    
    // Get recent audit events
    const recentAuditSnapshot = await db.collection('audit_logs')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    
    const recentEvents = recentAuditSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get system health metrics
    const systemHealth = {
      totalUsers: entitlementsSnapshot.size,
      activeThisMonth: analytics.activeUsers,
      trialUsers,
      planDistribution,
      quotaExceededEvents: analytics.quotaExceededEvents,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    };
    
    res.json({
      success: true,
      dashboard: {
        analytics,
        systemHealth,
        recentEvents: recentEvents.slice(0, 10)
      },
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [ADMIN-PANEL] Error loading dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Dashboard loading failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/users
 * User management with filtering and pagination
 */
router.get('/users', verifyAdminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      plan, 
      status, 
      search 
    } = req.query;
    
    console.log(`📊 [ADMIN-PANEL] Loading users page ${page}, limit ${limit}`);
    
    let query = db.collection('entitlements');
    
    // Apply filters
    if (plan) {
      query = query.where('planName', '==', plan);
    }
    
    if (status === 'trial') {
      query = query.where('trial.isTrialing', '==', true);
    } else if (status === 'expired') {
      query = query.where('trial.status', '==', 'expired');
    }
    
    const snapshot = await query.get();
    
    // Manual pagination (Firestore limitation)
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    
    let users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
    
    // Apply search filter if provided
    if (search) {
      const searchTerm = String(search).toLowerCase();
      users = users.filter(user => 
        user.uid.toLowerCase().includes(searchTerm) ||
        user.planName?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm)
      );
    }
    
    const totalUsers = users.length;
    const paginatedUsers = users.slice(startIndex, endIndex);
    
    // Get usage data for each user in current page
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usersWithUsage = await Promise.all(
      paginatedUsers.map(async (user) => {
        const usage = await productionUsageService.getUsageSummary(user.uid);
        return {
          ...user,
          currentUsage: usage
        };
      })
    );
    
    res.json({
      success: true,
      users: usersWithUsage,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalUsers,
        pages: Math.ceil(totalUsers / Number(limit))
      },
      filters: { plan, status, search }
    });
    
  } catch (error) {
    console.error('❌ [ADMIN-PANEL] Error loading users:', error);
    res.status(500).json({
      success: false,
      error: 'Users loading failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/admin/users/:uid/plan
 * Update user's plan (admin action)
 */
router.put('/users/:uid/plan', verifyAdminAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { planId, planName, limits, reason } = req.body;
    
    if (!planId || !planName || !limits) {
      return res.status(400).json({
        success: false,
        error: 'planId, planName, and limits are required'
      });
    }
    
    console.log(`🔧 [ADMIN-PANEL] Updating plan for user ${uid}: ${planName}`);
    
    // Get current entitlements
    const entitlementsDoc = await db.collection('entitlements').doc(uid).get();
    if (!entitlementsDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const currentEntitlements = entitlementsDoc.data();
    
    // Update entitlements
    const updatedEntitlements = {
      ...currentEntitlements,
      planId: Number(planId),
      planName,
      limits,
      adminModified: {
        modifiedAt: new Date().toISOString(),
        reason: reason || 'Admin manual update',
        previousPlan: {
          planId: currentEntitlements.planId,
          planName: currentEntitlements.planName
        }
      }
    };
    
    await db.collection('entitlements').doc(uid).update(updatedEntitlements);
    
    // Log admin action
    await db.collection('audit_logs').add({
      uid,
      action: 'admin_plan_update',
      feature: 'admin_panel',
      planId: Number(planId),
      usedBefore: 0,
      usedAfter: 0,
      limit: null,
      success: true,
      quotaExceeded: false,
      timestamp: new Date(),
      metadata: {
        previousPlan: currentEntitlements.planName,
        newPlan: planName,
        reason: reason || 'Admin manual update'
      }
    });
    
    res.json({
      success: true,
      message: 'User plan updated successfully',
      uid,
      planUpdate: {
        from: currentEntitlements.planName,
        to: planName,
        reason: reason || 'Admin manual update'
      }
    });
    
  } catch (error) {
    console.error('❌ [ADMIN-PANEL] Error updating user plan:', error);
    res.status(500).json({
      success: false,
      error: 'Plan update failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/users/:uid/reset-usage
 * Reset user's monthly usage (emergency action)
 */
router.post('/users/:uid/reset-usage', verifyAdminAuth, async (req, res) => {
  try {
    const { uid } = req.params;
    const { reason } = req.body;
    
    console.log(`🔧 [ADMIN-PANEL] Resetting usage for user ${uid}`);
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usageDocId = `${uid}_${currentMonth}`;
    
    // Get current usage
    const usageDoc = await db.collection('usage').doc(usageDocId).get();
    if (!usageDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: 'Usage document not found for current month'
      });
    }
    
    const currentUsage = usageDoc.data();
    const backupUsage = { ...currentUsage };
    
    // Reset all usage counters to 0
    const resetUsage = {
      ...currentUsage,
      used: {
        basicEstimates: 0,
        aiEstimates: 0,
        contracts: 0,
        propertyVerifications: 0,
        permitAdvisor: 0,
        projects: 0,
        invoices: 0,
        paymentTracking: 0,
        deepsearch: 0
      },
      adminReset: {
        resetAt: new Date().toISOString(),
        reason: reason || 'Admin emergency reset',
        backupUsage
      },
      updatedAt: new Date()
    };
    
    await db.collection('usage').doc(usageDocId).update(resetUsage);
    
    // Log admin action
    await db.collection('audit_logs').add({
      uid,
      action: 'admin_usage_reset',
      feature: 'admin_panel',
      planId: currentUsage.planId,
      usedBefore: Object.values(backupUsage.used).reduce((a: any, b: any) => a + b, 0),
      usedAfter: 0,
      limit: null,
      success: true,
      quotaExceeded: false,
      timestamp: new Date(),
      metadata: {
        reason: reason || 'Admin emergency reset',
        backupUsage
      }
    });
    
    res.json({
      success: true,
      message: 'User usage reset successfully',
      uid,
      reset: {
        month: currentMonth,
        reason: reason || 'Admin emergency reset',
        previousUsage: backupUsage.used
      }
    });
    
  } catch (error) {
    console.error('❌ [ADMIN-PANEL] Error resetting usage:', error);
    res.status(500).json({
      success: false,
      error: 'Usage reset failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/analytics/:month
 * Detailed analytics for specific month
 */
router.get('/analytics/:month', verifyAdminAuth, async (req, res) => {
  try {
    const { month } = req.params;
    
    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month format. Use YYYY-MM'
      });
    }
    
    console.log(`📊 [ADMIN-PANEL] Loading analytics for ${month}`);
    
    const analytics = await productionUsageService.getUsageAnalytics(month);
    
    // Get additional insights
    const usageSnapshot = await db.collection('usage')
      .where('monthKey', '==', month)
      .get();
    
    // Calculate feature adoption rates
    const featureAdoption: { [feature: string]: { users: number, totalUsage: number } } = {};
    const planPerformance: { [planId: string]: { users: number, totalUsage: number } } = {};
    
    usageSnapshot.docs.forEach(doc => {
      const usage = doc.data();
      const planKey = `plan_${usage.planId}`;
      
      if (!planPerformance[planKey]) {
        planPerformance[planKey] = { users: 0, totalUsage: 0 };
      }
      planPerformance[planKey].users++;
      
      Object.entries(usage.used).forEach(([feature, count]) => {
        if (!featureAdoption[feature]) {
          featureAdoption[feature] = { users: 0, totalUsage: 0 };
        }
        
        if (count > 0) {
          featureAdoption[feature].users++;
        }
        featureAdoption[feature].totalUsage += count;
        planPerformance[planKey].totalUsage += count;
      });
    });
    
    res.json({
      success: true,
      analytics: {
        ...analytics,
        featureAdoption,
        planPerformance,
        month
      }
    });
    
  } catch (error) {
    console.error('❌ [ADMIN-PANEL] Error loading analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Analytics loading failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/audit-logs
 * Audit trail with filtering
 */
router.get('/audit-logs', verifyAdminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      uid,
      action,
      feature,
      success
    } = req.query;
    
    console.log(`📊 [ADMIN-PANEL] Loading audit logs page ${page}`);
    
    let query = db.collection('audit_logs').orderBy('timestamp', 'desc');
    
    // Apply filters
    if (uid) {
      query = query.where('uid', '==', uid);
    }
    if (action) {
      query = query.where('action', '==', action);
    }
    if (feature) {
      query = query.where('feature', '==', feature);
    }
    if (success !== undefined) {
      query = query.where('success', '==', success === 'true');
    }
    
    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    if (offset > 0) {
      // For simplicity, we'll limit without actual offset since Firestore doesn't support it easily
      query = query.limit(Number(limit) * Number(page));
    } else {
      query = query.limit(Number(limit));
    }
    
    const snapshot = await query.get();
    let logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Manual pagination for offset
    if (offset > 0) {
      logs = logs.slice(offset, offset + Number(limit));
    }
    
    res.json({
      success: true,
      auditLogs: logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: snapshot.size
      },
      filters: { uid, action, feature, success }
    });
    
  } catch (error) {
    console.error('❌ [ADMIN-PANEL] Error loading audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Audit logs loading failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/system-status
 * System health and status
 */
router.get('/system-status', verifyAdminAuth, async (req, res) => {
  try {
    const systemStatus = {
      timestamp: new Date().toISOString(),
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      database: {
        status: 'connected', // TODO: Add actual DB health check
        collections: {
          entitlements: 0,
          usage: 0,
          auditLogs: 0,
          notifications: 0
        }
      },
      services: {
        productionUsage: 'healthy',
        trialNotifications: 'healthy',
        monthlyReset: 'healthy'
      }
    };
    
    // Get collection counts
    try {
      const [entitlementsCount, usageCount, auditLogsCount, notificationsCount] = await Promise.all([
        db.collection('entitlements').count().get(),
        db.collection('usage').count().get(),
        db.collection('audit_logs').count().get(),
        db.collection('notifications').count().get()
      ]);
      
      systemStatus.database.collections = {
        entitlements: entitlementsCount.data().count,
        usage: usageCount.data().count,
        auditLogs: auditLogsCount.data().count,
        notifications: notificationsCount.data().count
      };
    } catch (countError) {
      console.warn('⚠️ [ADMIN-PANEL] Could not get collection counts:', countError);
    }
    
    res.json({
      success: true,
      systemStatus
    });
    
  } catch (error) {
    console.error('❌ [ADMIN-PANEL] Error getting system status:', error);
    res.status(500).json({
      success: false,
      error: 'System status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;