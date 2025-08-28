/**
 * 🧠 OPTIMIZED PERMISSIONS HOOK - FASE 2 & 3 INTEGRATION  
 * Advanced permission management with caching, analytics and batch operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { smartPermissionLoader } from '@/services/smartPermissionLoader';
import { devModeManager, debugLog } from '@/utils/devModeUtils';

interface PermissionMetrics {
  cacheHits: number;
  cacheMisses: number;
  avgLoadTime: number;
  lastRefresh: number;
  batchUpdates: number;
}

export function useOptimizedPermissions() {
  const { currentUser } = useAuth();
  const permissionsContext = usePermissions();
  const [metrics, setMetrics] = useState<PermissionMetrics>({
    cacheHits: 0,
    cacheMisses: 0,
    avgLoadTime: 0,
    lastRefresh: 0,
    batchUpdates: 0
  });
  
  const loadTimesRef = useRef<number[]>([]);
  const batchQueueRef = useRef<any[]>([]);
  
  // ✅ FASE 2: Smart permission loading with caching
  const loadPermissionsWithCache = useCallback(async (options: {
    force?: boolean;
    background?: boolean;
    priority?: 'high' | 'normal' | 'low';
  } = {}) => {
    if (!currentUser?.uid) return null;
    
    const startTime = performance.now();
    devModeManager.markStart('permission-load-optimized');
    
    try {
      const permissions = await smartPermissionLoader.loadPermissions(
        currentUser.uid,
        {
          useCache: !options.force,
          background: options.background,
          priority: options.priority || 'normal'
        }
      );
      
      const loadTime = performance.now() - startTime;
      loadTimesRef.current.push(loadTime);
      
      // Keep only last 10 load times for average calculation
      if (loadTimesRef.current.length > 10) {
        loadTimesRef.current.shift();
      }
      
      const avgTime = loadTimesRef.current.reduce((a, b) => a + b, 0) / loadTimesRef.current.length;
      
      setMetrics(prev => ({
        ...prev,
        avgLoadTime: Math.round(avgTime),
        lastRefresh: Date.now(),
        cacheHits: prev.cacheHits + (loadTime < 100 ? 1 : 0), // Fast loads are likely cache hits
        cacheMisses: prev.cacheMisses + (loadTime >= 100 ? 1 : 0)
      }));
      
      devModeManager.markEnd('permission-load-optimized');
      debugLog('PERMISSIONS', `Loaded in ${loadTime.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms)`);
      
      return permissions;
    } catch (error) {
      debugLog('PERMISSIONS', 'Load failed', error);
      throw error;
    }
  }, [currentUser?.uid]);
  
  // ✅ FASE 3: Batch usage updates for efficiency
  const trackUsage = useCallback((feature: string, amount: number = 1) => {
    if (!currentUser?.uid) return;
    
    const usage = {
      userId: currentUser.uid,
      feature,
      amount,
      timestamp: Date.now()
    };
    
    batchQueueRef.current.push(usage);
    
    // Queue for batch processing
    smartPermissionLoader.queueUsageUpdate(currentUser.uid, {
      [feature]: amount,
      timestamp: Date.now()
    });
    
    setMetrics(prev => ({
      ...prev,
      batchUpdates: prev.batchUpdates + 1
    }));
    
    debugLog('USAGE-TRACKING', `Queued ${feature} usage: ${amount}`);
  }, [currentUser?.uid]);
  
  // ✅ FASE 3: Background refresh for always-fresh permissions
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    // Background refresh every 5 minutes
    const backgroundRefreshInterval = setInterval(() => {
      loadPermissionsWithCache({
        force: false,
        background: true,
        priority: 'low'
      });
    }, 5 * 60 * 1000);
    
    return () => clearInterval(backgroundRefreshInterval);
  }, [currentUser?.uid, loadPermissionsWithCache]);
  
  // ✅ FASE 3: Intelligent cache management
  const getCacheStats = useCallback(() => {
    return {
      ...smartPermissionLoader.getCacheStats(),
      metrics
    };
  }, [metrics]);
  
  const clearCache = useCallback(() => {
    smartPermissionLoader.clearCache(currentUser?.uid);
    setMetrics({
      cacheHits: 0,
      cacheMisses: 0,
      avgLoadTime: 0,
      lastRefresh: 0,
      batchUpdates: 0
    });
    debugLog('CACHE', 'Permission cache cleared');
  }, [currentUser?.uid]);
  
  // Enhanced permission checks with analytics
  const hasAccessOptimized = useCallback((feature: string): boolean => {
    devModeManager.markStart(`permission-check-${feature}`);
    const hasAccess = permissionsContext.hasAccess(feature);
    const checkTime = devModeManager.markEnd(`permission-check-${feature}`);
    
    if (checkTime && checkTime > 10) { // Slow permission check
      debugLog('PERFORMANCE', `Slow permission check for ${feature}: ${checkTime.toFixed(2)}ms`);
    }
    
    return hasAccess;
  }, [permissionsContext]);
  
  const canUseFeatureOptimized = useCallback((feature: string): {
    canUse: boolean;
    remaining: number;
    reason?: string;
  } => {
    const result = permissionsContext.canUseFeature(feature);
    
    // Track feature usage attempts for analytics
    if (!result.canUse) {
      debugLog('FEATURE-LIMIT', `Feature ${feature} blocked: ${result.reason}`);
    }
    
    return result;
  }, [permissionsContext]);
  
  return {
    // Original permissions context
    ...permissionsContext,
    
    // Enhanced operations
    loadPermissions: loadPermissionsWithCache,
    hasAccess: hasAccessOptimized,
    canUseFeature: canUseFeatureOptimized,
    trackUsage,
    
    // Cache management
    getCacheStats,
    clearCache,
    
    // Metrics
    metrics,
    
    // Health indicators
    isHealthy: metrics.avgLoadTime < 1000 && metrics.cacheMisses < metrics.cacheHits * 2
  };
}