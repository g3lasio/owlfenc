/**
 * PHASE 4 OPTIMIZATION ROUTES - ENDPOINTS FASE 4
 * 
 * Endpoints para todos los servicios de optimización de la Fase 4:
 * - Performance Optimization
 * - Advanced Security  
 * - Observability & SLOs
 * - Backup & Disaster Recovery
 */

import express from 'express';
import { performanceOptimizationService } from '../services/performanceOptimizationService';
import { advancedSecurityService } from '../services/advancedSecurityService';
import { observabilityService } from '../services/observabilityService';
import { backupDisasterRecoveryService } from '../services/backupDisasterRecoveryService';
import { verifyAdminAuth } from '../middleware/firebase-auth-middleware';

const router = express.Router();

// ================================
// PERFORMANCE OPTIMIZATION ENDPOINTS
// ================================

/**
 * Get performance statistics and cache metrics
 */
router.get('/performance/stats', async (req, res) => {
  try {
    const stats = performanceOptimizationService.getPerformanceStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-PERF] Error getting performance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance statistics'
    });
  }
});

/**
 * Check cost guardrails and resource usage
 */
router.get('/performance/cost-guardrails', verifyAdminAuth, async (req, res) => {
  try {
    const guardrails = await performanceOptimizationService.checkCostGuardrails();
    res.json({
      success: true,
      data: guardrails,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-PERF] Error checking cost guardrails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check cost guardrails'
    });
  }
});

/**
 * Check Performance SLOs
 */
router.get('/performance/slos', verifyAdminAuth, async (req, res) => {
  try {
    const slos = await performanceOptimizationService.checkPerformanceSLOs();
    res.json({
      success: true,
      data: slos,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-PERF] Error checking SLOs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check performance SLOs'
    });
  }
});

/**
 * Get Cloud Functions configuration
 */
router.get('/performance/functions-config', verifyAdminAuth, async (req, res) => {
  try {
    const config = performanceOptimizationService.getCloudFunctionsConfig();
    res.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-PERF] Error getting functions config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get functions configuration'
    });
  }
});

/**
 * Get Firestore indexes configuration
 */
router.get('/performance/firestore-indexes', verifyAdminAuth, async (req, res) => {
  try {
    const indexes = performanceOptimizationService.getFirestoreIndexes();
    res.json({
      success: true,
      data: indexes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-PERF] Error getting firestore indexes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Firestore indexes'
    });
  }
});

// ================================
// ADVANCED SECURITY ENDPOINTS
// ================================

/**
 * Get security statistics
 */
router.get('/security/stats', verifyAdminAuth, async (req, res) => {
  try {
    const stats = advancedSecurityService.getSecurityStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-SEC] Error getting security stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security statistics'
    });
  }
});

/**
 * Audit Firestore security rules
 */
router.post('/security/audit-rules', verifyAdminAuth, async (req, res) => {
  try {
    const audit = await advancedSecurityService.auditFirestoreRules();
    res.json({
      success: true,
      data: audit,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-SEC] Error auditing rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to audit Firestore rules'
    });
  }
});

/**
 * Revoke refresh tokens for user (admin only)
 */
router.post('/security/revoke-tokens', verifyAdminAuth, async (req, res) => {
  try {
    const { uid, reason } = req.body;
    
    if (!uid || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: uid, reason'
      });
    }

    await advancedSecurityService.revokeRefreshTokens(uid, reason);
    
    res.json({
      success: true,
      message: `Tokens revoked for user ${uid}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-SEC] Error revoking tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke tokens'
    });
  }
});

/**
 * Get CORS configuration
 */
router.get('/security/cors-config', verifyAdminAuth, async (req, res) => {
  try {
    const corsConfig = advancedSecurityService.getCorsConfig();
    res.json({
      success: true,
      data: corsConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-SEC] Error getting CORS config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get CORS configuration'
    });
  }
});

// ================================
// OBSERVABILITY & SLOs ENDPOINTS  
// ================================

/**
 * Get dashboard data with metrics
 */
router.get('/observability/dashboard', async (req, res) => {
  try {
    const timeRange = req.query.timeRange ? parseInt(req.query.timeRange as string) : undefined;
    const dashboard = await observabilityService.getDashboardData(timeRange);
    
    res.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-OBS] Error getting dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data'
    });
  }
});

/**
 * Get SLO status
 */
router.get('/observability/slos', async (req, res) => {
  try {
    const slos = await observabilityService.getSLOStatus();
    res.json({
      success: true,
      data: slos,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-OBS] Error getting SLOs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get SLO status'
    });
  }
});

/**
 * Get active alerts
 */
router.get('/observability/alerts', async (req, res) => {
  try {
    const onlyActive = req.query.active !== 'false';
    const alerts = await observabilityService.getAlerts(onlyActive);
    
    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-OBS] Error getting alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts'
    });
  }
});

/**
 * Resolve an alert (admin only)
 */
router.post('/observability/alerts/:alertId/resolve', verifyAdminAuth, async (req, res) => {
  try {
    const { alertId } = req.params;
    const resolved = await observabilityService.resolveAlert(alertId);
    
    if (resolved) {
      res.json({
        success: true,
        message: `Alert ${alertId} resolved`,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
  } catch (error) {
    console.error('[PHASE4-OBS] Error resolving alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert'
    });
  }
});

/**
 * Get observability service statistics
 */
router.get('/observability/stats', async (req, res) => {
  try {
    const stats = observabilityService.getServiceStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-OBS] Error getting service stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service statistics'
    });
  }
});

// ================================
// BACKUP & DISASTER RECOVERY ENDPOINTS
// ================================

/**
 * Get backup jobs history
 */
router.get('/backup/jobs', verifyAdminAuth, async (req, res) => {
  try {
    const jobs = await backupDisasterRecoveryService.getBackupJobs();
    res.json({
      success: true,
      data: jobs,
      count: jobs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-BACKUP] Error getting backup jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup jobs'
    });
  }
});

/**
 * Get restore jobs history
 */
router.get('/backup/restore-jobs', verifyAdminAuth, async (req, res) => {
  try {
    const jobs = await backupDisasterRecoveryService.getRestoreJobs();
    res.json({
      success: true,
      data: jobs,
      count: jobs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-BACKUP] Error getting restore jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get restore jobs'
    });
  }
});

/**
 * Get DR metrics and status
 */
router.get('/backup/dr-metrics', verifyAdminAuth, async (req, res) => {
  try {
    const metrics = await backupDisasterRecoveryService.getDRMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-BACKUP] Error getting DR metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get DR metrics'
    });
  }
});

/**
 * Get backup configuration
 */
router.get('/backup/config', verifyAdminAuth, async (req, res) => {
  try {
    const config = await backupDisasterRecoveryService.getBackupConfig();
    res.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-BACKUP] Error getting backup config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup configuration'
    });
  }
});

/**
 * Trigger manual backup (admin only)
 */
router.post('/backup/trigger', verifyAdminAuth, async (req, res) => {
  try {
    console.log('📦 [PHASE4-BACKUP] Manual backup triggered by admin');
    const job = await backupDisasterRecoveryService.triggerManualBackup();
    
    res.json({
      success: true,
      data: job,
      message: 'Manual backup started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-BACKUP] Error triggering backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger manual backup'
    });
  }
});

/**
 * Trigger DR test (admin only)
 */
router.post('/backup/dr-test', verifyAdminAuth, async (req, res) => {
  try {
    console.log('🧪 [PHASE4-BACKUP] DR test triggered by admin');
    const result = await backupDisasterRecoveryService.triggerDRTest();
    
    res.json({
      success: true,
      data: result,
      message: 'DR test completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-BACKUP] Error triggering DR test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger DR test'
    });
  }
});

/**
 * Trigger retention cleanup (admin only)
 */
router.post('/backup/retention-cleanup', verifyAdminAuth, async (req, res) => {
  try {
    console.log('🗑️ [PHASE4-BACKUP] Retention cleanup triggered by admin');
    const result = await backupDisasterRecoveryService.triggerRetentionCleanup();
    
    res.json({
      success: true,
      data: result,
      message: 'Retention cleanup completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PHASE4-BACKUP] Error triggering retention cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger retention cleanup'
    });
  }
});

// ================================
// HEALTH & STATUS ENDPOINTS
// ================================

/**
 * Overall Phase 4 health check
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      performance: performanceOptimizationService.getPerformanceStats(),
      security: advancedSecurityService.getSecurityStats(),
      observability: observabilityService.getServiceStats(),
      backup: await backupDisasterRecoveryService.getDRMetrics(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      status: 'healthy',
      data: health,
      phase: 'Phase 4 - Optimization & Performance'
    });
  } catch (error) {
    console.error('[PHASE4] Error getting health status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get health status'
    });
  }
});

/**
 * Phase 4 comprehensive status
 */
router.get('/status', async (req, res) => {
  try {
    const slos = await observabilityService.checkSLOs();
    const costGuardrails = await performanceOptimizationService.checkCostGuardrails();
    const drMetrics = await backupDisasterRecoveryService.getDRMetrics();

    const status = {
      phase: 'Phase 4 - Optimization & Performance',
      services: {
        performance: {
          status: costGuardrails.status,
          slos: slos.filter(s => s.name.includes('Latency') || s.name.includes('Performance'))
        },
        security: {
          status: 'operational',
          secrets: advancedSecurityService.getSecurityStats().secrets
        },
        observability: {
          status: slos.every(s => s.status === 'met') ? 'all_slos_met' : 'some_violations',
          slos: slos
        },
        backup: {
          status: drMetrics.backupSuccess && drMetrics.drTestPassed ? 'healthy' : 'attention_needed',
          metrics: drMetrics
        }
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[PHASE4] Error getting comprehensive status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comprehensive status'
    });
  }
});

export default router;