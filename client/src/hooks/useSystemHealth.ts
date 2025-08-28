/**
 * 🏥 SYSTEM HEALTH MONITOR - FASE 3 INTEGRATION
 * Comprehensive system monitoring for production-ready scalability
 */

import { useState, useEffect } from 'react';
import { useOptimizedAuth } from './useOptimizedAuth';
import { useOptimizedPermissions } from './useOptimizedPermissions';

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  auth: {
    status: 'healthy' | 'degraded' | 'critical';
    responseTime: number;
    errorRate: number;
    circuitBreakerActive: boolean;
  };
  permissions: {
    status: 'healthy' | 'degraded' | 'critical';
    cacheHitRate: number;
    avgLoadTime: number;
  };
  network: {
    status: 'healthy' | 'degraded' | 'critical';
    connectivity: boolean;
    latency: number;
  };
  recommendations: string[];
}

export function useSystemHealth() {
  const optimizedAuth = useOptimizedAuth();
  const optimizedPermissions = useOptimizedPermissions();
  
  const [health, setHealth] = useState<SystemHealth>({
    overall: 'healthy',
    auth: {
      status: 'healthy',
      responseTime: 0,
      errorRate: 0,
      circuitBreakerActive: false
    },
    permissions: {
      status: 'healthy',
      cacheHitRate: 100,
      avgLoadTime: 0
    },
    network: {
      status: 'healthy',
      connectivity: true,
      latency: 0
    },
    recommendations: []
  });
  
  // ✅ FASE 3: Comprehensive health monitoring
  useEffect(() => {
    const checkSystemHealth = () => {
      const authMetrics = optimizedAuth.getAuthMetrics();
      const permissionMetrics = optimizedPermissions.metrics;
      const recommendations: string[] = [];
      
      // Auth health assessment
      const authErrorRate = authMetrics.failureRate;
      const authAvgTime = authMetrics.averageTransitionTime;
      const circuitBreakerActive = optimizedAuth.optimizations.circuitBreakerActive;
      
      let authStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (circuitBreakerActive) {
        authStatus = 'critical';
        recommendations.push('Authentication failures too high - circuit breaker active');
      } else if (authErrorRate > 0.1) {
        authStatus = 'degraded';
        recommendations.push('High authentication error rate detected');
      } else if (authAvgTime > 3000) {
        authStatus = 'degraded';
        recommendations.push('Slow authentication response times');
      }
      
      // Permissions health assessment
      const totalRequests = permissionMetrics.cacheHits + permissionMetrics.cacheMisses;
      const cacheHitRate = totalRequests > 0 ? (permissionMetrics.cacheHits / totalRequests) * 100 : 100;
      
      let permissionStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (permissionMetrics.avgLoadTime > 2000) {
        permissionStatus = 'critical';
        recommendations.push('Permission loading too slow - check network/API');
      } else if (cacheHitRate < 50) {
        permissionStatus = 'degraded';
        recommendations.push('Low cache hit rate - consider extending cache TTL');
      } else if (permissionMetrics.avgLoadTime > 1000) {
        permissionStatus = 'degraded';
        recommendations.push('Permission loading slower than optimal');
      }
      
      // Network health assessment (basic connectivity check)
      let networkStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      const hasConnectivityIssues = optimizedAuth.optimizations.hasConnectivityIssues;
      
      if (hasConnectivityIssues) {
        networkStatus = 'degraded';
        recommendations.push('Network connectivity issues detected');
      }
      
      // Overall health
      let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (authStatus === 'critical' || permissionStatus === 'critical' || networkStatus === 'critical') {
        overall = 'critical';
      } else if (authStatus === 'degraded' || permissionStatus === 'degraded' || networkStatus === 'degraded') {
        overall = 'degraded';
      }
      
      // Performance recommendations
      if (recommendations.length === 0) {
        if (cacheHitRate > 90 && permissionMetrics.avgLoadTime < 500) {
          recommendations.push('System performing optimally');
        } else {
          recommendations.push('System healthy - minor optimizations possible');
        }
      }
      
      setHealth({
        overall,
        auth: {
          status: authStatus,
          responseTime: authAvgTime,
          errorRate: authErrorRate,
          circuitBreakerActive
        },
        permissions: {
          status: permissionStatus,
          cacheHitRate: Math.round(cacheHitRate),
          avgLoadTime: permissionMetrics.avgLoadTime
        },
        network: {
          status: networkStatus,
          connectivity: !hasConnectivityIssues,
          latency: 0 // Could be enhanced with actual latency checks
        },
        recommendations
      });
    };
    
    // Check health every 30 seconds
    checkSystemHealth(); // Initial check
    const interval = setInterval(checkSystemHealth, 30000);
    
    return () => clearInterval(interval);
  }, [optimizedAuth, optimizedPermissions]);
  
  // ✅ FASE 3: System diagnostics
  const runDiagnostics = async () => {
    console.log('🏥 [SYSTEM-HEALTH] Running comprehensive diagnostics...');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      auth: {
        metrics: optimizedAuth.getAuthMetrics(),
        optimizations: optimizedAuth.optimizations,
        isHealthy: optimizedAuth.isHealthy
      },
      permissions: {
        metrics: optimizedPermissions.metrics,
        cacheStats: optimizedPermissions.getCacheStats(),
        isHealthy: optimizedPermissions.isHealthy
      },
      performance: {
        memory: (performance as any).memory ? {
          usedJSMemory: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
          totalJSMemory: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
          memoryLimit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
        } : null
      },
      health
    };
    
    console.log('📊 [DIAGNOSTICS] Complete system report:', diagnostics);
    return diagnostics;
  };
  
  // ✅ FASE 3: Emergency recovery procedures
  const emergencyRecovery = async () => {
    console.warn('🚨 [EMERGENCY-RECOVERY] Initiating system recovery procedures...');
    
    try {
      // Clear all caches
      optimizedPermissions.clearCache();
      
      // Reset auth state monitor
      // authStateMonitor.reset(); // Would need to add this method
      
      // Clear localStorage of problematic data (dev-safe)
      const keysToKeep = ['enhanced_auth_session', 'dev_config', 'dev_user_plan_simulation'];
      Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.some(keepKey => key.includes(keepKey))) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ [EMERGENCY-RECOVERY] Recovery procedures completed');
      return true;
    } catch (error) {
      console.error('❌ [EMERGENCY-RECOVERY] Recovery failed:', error);
      return false;
    }
  };
  
  return {
    health,
    runDiagnostics,
    emergencyRecovery,
    isHealthy: health.overall === 'healthy',
    needsAttention: health.overall === 'critical'
  };
}