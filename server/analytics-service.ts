/**
 * 📊 ANALYTICS SERVICE - FASE 3 BACKEND IMPLEMENTATION
 * Handles auth metrics, performance analytics, and system monitoring at scale
 */

import { Router } from 'express';
import { AuthMiddleware } from './middleware/authMiddleware';

const router = Router();

// In-memory storage for analytics (in production, use Redis/Database)
const analyticsStore = {
  authMetrics: new Map<string, any>(),
  performanceMetrics: new Map<string, any>(),
  systemAlerts: [] as any[]
};

/**
 * ✅ FASE 3: Auth metrics collection endpoint
 */
router.post('/auth-metrics', AuthMiddleware, async (req, res) => {
  try {
    const { metrics, timestamp, userAgent, url } = req.body;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Store metrics with user context
    const metricsEntry = {
      userId,
      metrics,
      timestamp,
      userAgent,
      url,
      receivedAt: Date.now()
    };
    
    analyticsStore.authMetrics.set(`${userId}_${Date.now()}`, metricsEntry);
    
    // Keep only last 100 entries per user for memory management
    const userEntries = Array.from(analyticsStore.authMetrics.entries())
      .filter(([key]) => key.startsWith(userId))
      .sort((a, b) => b[1].receivedAt - a[1].receivedAt)
      .slice(0, 100);
      
    // Clean old entries
    analyticsStore.authMetrics.forEach((value, key) => {
      if (key.startsWith(userId) && !userEntries.find(([k]) => k === key)) {
        analyticsStore.authMetrics.delete(key);
      }
    });
    
    // Alert on critical metrics
    if (metrics.failureRate > 0.5) {
      analyticsStore.systemAlerts.push({
        type: 'AUTH_HIGH_FAILURE_RATE',
        userId,
        details: metrics,
        timestamp: Date.now()
      });
      
      console.warn(`🚨 [AUTH-ANALYTICS] High failure rate for user ${userId}: ${metrics.failureRate}`);
    }
    
    if (metrics.averageTransitionTime > 5000) {
      analyticsStore.systemAlerts.push({
        type: 'AUTH_SLOW_RESPONSE',
        userId,
        details: metrics,
        timestamp: Date.now()
      });
      
      console.warn(`🐌 [AUTH-ANALYTICS] Slow auth transitions for user ${userId}: ${metrics.averageTransitionTime}ms`);
    }
    
    console.log(`📊 [AUTH-ANALYTICS] Stored metrics for user ${userId}:`, {
      totalTransitions: metrics.totalTransitions,
      failureRate: metrics.failureRate,
      avgTime: metrics.averageTransitionTime
    });
    
    res.json({ 
      success: true, 
      message: 'Metrics stored successfully',
      alertsGenerated: analyticsStore.systemAlerts.length
    });
    
  } catch (error) {
    console.error('❌ [AUTH-ANALYTICS] Error storing metrics:', error);
    res.status(500).json({ error: 'Failed to store metrics' });
  }
});

/**
 * ✅ FASE 3: System health dashboard endpoint
 */
router.get('/system-health', AuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Aggregate metrics for system health overview
    const allMetrics = Array.from(analyticsStore.authMetrics.values());
    const recentMetrics = allMetrics.filter(entry => 
      Date.now() - entry.receivedAt < 60 * 60 * 1000 // Last hour
    );
    
    const healthSummary = {
      timestamp: Date.now(),
      totalUsers: new Set(allMetrics.map(m => m.userId)).size,
      recentActivity: recentMetrics.length,
      systemHealth: {
        overall: 'healthy',
        auth: {
          avgResponseTime: 0,
          errorRate: 0,
          activeCircuitBreakers: 0
        },
        alerts: analyticsStore.systemAlerts.slice(-10) // Last 10 alerts
      },
      recommendations: [] as string[]
    };
    
    if (recentMetrics.length > 0) {
      const avgResponseTime = recentMetrics.reduce((sum, m) => 
        sum + (m.metrics.averageTransitionTime || 0), 0
      ) / recentMetrics.length;
      
      const totalErrors = recentMetrics.reduce((sum, m) => 
        sum + (m.metrics.totalTransitions * m.metrics.failureRate), 0
      );
      
      const totalTransitions = recentMetrics.reduce((sum, m) => 
        sum + m.metrics.totalTransitions, 0
      );
      
      healthSummary.systemHealth.auth.avgResponseTime = Math.round(avgResponseTime);
      healthSummary.systemHealth.auth.errorRate = totalTransitions > 0 
        ? totalErrors / totalTransitions 
        : 0;
    }
    
    // Health assessment
    if (healthSummary.systemHealth.auth.errorRate > 0.1) {
      healthSummary.systemHealth.overall = 'degraded';
      healthSummary.recommendations.push('High authentication error rate detected');
    }
    
    if (healthSummary.systemHealth.auth.avgResponseTime > 3000) {
      healthSummary.systemHealth.overall = 'degraded';
      healthSummary.recommendations.push('Slow authentication response times');
    }
    
    if (healthSummary.recommendations.length === 0) {
      healthSummary.recommendations.push('System operating normally');
    }
    
    res.json({
      success: true,
      health: healthSummary
    });
    
  } catch (error) {
    console.error('❌ [SYSTEM-HEALTH] Error generating health report:', error);
    res.status(500).json({ error: 'Failed to generate health report' });
  }
});

/**
 * ✅ FASE 3: Batch usage updates endpoint  
 */
router.post('/batch-usage-update', AuthMiddleware, async (req, res) => {
  try {
    const { updates } = req.body;
    const userId = req.userId;
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }
    
    // Process batch updates efficiently
    const processedUpdates = updates.map(update => ({
      ...update,
      processedAt: Date.now(),
      userId: userId || update.userId
    }));
    
    // Store for analytics (in production, batch insert to database)
    const batchKey = `batch_${userId}_${Date.now()}`;
    analyticsStore.performanceMetrics.set(batchKey, {
      userId,
      updates: processedUpdates,
      count: processedUpdates.length,
      timestamp: Date.now()
    });
    
    console.log(`📊 [BATCH-UPDATE] Processed ${processedUpdates.length} usage updates for user ${userId}`);
    
    res.json({
      success: true,
      processed: processedUpdates.length,
      message: 'Batch updates processed successfully'
    });
    
  } catch (error) {
    console.error('❌ [BATCH-UPDATE] Error processing batch updates:', error);
    res.status(500).json({ error: 'Failed to process batch updates' });
  }
});

/**
 * ✅ FASE 3: Performance metrics endpoint
 */
router.get('/performance-summary', AuthMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const userMetrics = Array.from(analyticsStore.authMetrics.values())
      .filter(entry => entry.userId === userId)
      .slice(-10); // Last 10 entries
    
    const userBatches = Array.from(analyticsStore.performanceMetrics.values())
      .filter(entry => entry.userId === userId)
      .slice(-5); // Last 5 batches
    
    const summary = {
      authPerformance: {
        recentSessions: userMetrics.length,
        avgResponseTime: userMetrics.length > 0 
          ? Math.round(userMetrics.reduce((sum, m) => sum + m.metrics.averageTransitionTime, 0) / userMetrics.length)
          : 0,
        successRate: userMetrics.length > 0
          ? Math.round((1 - userMetrics.reduce((sum, m) => sum + m.metrics.failureRate, 0) / userMetrics.length) * 100)
          : 100
      },
      usageAnalytics: {
        batchOperations: userBatches.reduce((sum, batch) => sum + batch.count, 0),
        lastActivity: userBatches.length > 0 ? userBatches[userBatches.length - 1].timestamp : 0
      }
    };
    
    res.json({
      success: true,
      performance: summary
    });
    
  } catch (error) {
    console.error('❌ [PERFORMANCE-SUMMARY] Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate performance summary' });
  }
});

export { router as analyticsRouter };