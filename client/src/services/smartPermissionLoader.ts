/**
 * 🧠 SMART PERMISSION LOADER SERVICE
 * Non-blocking permission loading with intelligent caching
 * and fallback strategies for scale optimization
 */

interface CachedPermission {
  data: any;
  timestamp: number;
  userId: string;
  ttl: number; // Time to live in ms
}

interface LoadingState {
  isLoading: boolean;
  lastLoad: number;
  retryCount: number;
}

class SmartPermissionLoader {
  private cache = new Map<string, CachedPermission>();
  private loadingStates = new Map<string, LoadingState>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxRetries = 3;
  
  // ✅ FASE 2: Smart permission loading (no-bloqueante)
  async loadPermissions(userId: string, options: {
    useCache?: boolean;
    background?: boolean;
    priority?: 'high' | 'normal' | 'low';
  } = {}): Promise<any> {
    const cacheKey = `permissions_${userId}`;
    const { useCache = true, background = false, priority = 'normal' } = options;
    
    // Check cache first
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      const isExpired = Date.now() - cached.timestamp > cached.ttl;
      
      if (!isExpired) {
        console.log('⚡ [SMART-PERMISSIONS] Cache hit for user:', userId);
        
        // Background refresh if cache is getting old (50% of TTL)
        if (Date.now() - cached.timestamp > cached.ttl * 0.5) {
          this.loadPermissions(userId, { useCache: false, background: true });
        }
        
        return cached.data;
      }
    }
    
    // Check if already loading
    const loadingState = this.loadingStates.get(cacheKey);
    if (loadingState?.isLoading && !background) {
      console.log('⏳ [SMART-PERMISSIONS] Already loading, using cached data');
      const cached = this.cache.get(cacheKey);
      if (cached) return cached.data; // Return stale data while loading
    }
    
    // Set loading state
    this.loadingStates.set(cacheKey, {
      isLoading: true,
      lastLoad: Date.now(),
      retryCount: loadingState?.retryCount || 0
    });
    
    try {
      const permissions = await this.fetchPermissions(userId, priority);
      
      // Cache successful result
      this.cache.set(cacheKey, {
        data: permissions,
        timestamp: Date.now(),
        userId,
        ttl: this.defaultTTL
      });
      
      // Clear loading state
      this.loadingStates.delete(cacheKey);
      
      console.log('✅ [SMART-PERMISSIONS] Loaded and cached for user:', userId);
      return permissions;
      
    } catch (error) {
      console.error('❌ [SMART-PERMISSIONS] Load failed:', error);
      
      // Update retry count
      const currentState = this.loadingStates.get(cacheKey);
      if (currentState) {
        currentState.isLoading = false;
        currentState.retryCount += 1;
      }
      
      // Return cached data if available, even if stale
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('🔄 [SMART-PERMISSIONS] Using stale cache due to error');
        return cached.data;
      }
      
      // Return default permissions as final fallback
      return this.getDefaultPermissions();
    }
  }
  
  private async fetchPermissions(userId: string, priority: string): Promise<any> {
    // ✅ FASE 2: Exponential backoff for network retries
    const loadingState = this.loadingStates.get(`permissions_${userId}`);
    const retryCount = loadingState?.retryCount || 0;
    
    if (retryCount > 0) {
      const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000); // Max 10s
      console.log(`⏱️ [EXPONENTIAL-BACKOFF] Waiting ${backoffDelay}ms before retry ${retryCount}`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    try {
      const response = await fetch('/api/auth/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: userId,
          priority,
          requestId: `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('API returned error: ' + (data.error || 'Unknown error'));
      }
      
      return data.subscription || this.getDefaultPermissions();
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  // ✅ FASE 3: Intelligent cache management
  private getDefaultPermissions() {
    return {
      planName: 'Primo Chambeador',
      id: 1,
      limits: {
        estimates: 10,
        contracts: 10,
        permitAdvisor: 10,
        projects: 10,
        invoices: 10
      },
      features: ['Basic features only'],
      isTrialing: false,
      daysRemaining: 0
    };
  }
  
  // ✅ FASE 3: Batch operations for usage updates
  private batchUpdateQueue: Array<{ userId: string; usage: any; timestamp: number }> = [];
  private batchFlushTimer: NodeJS.Timeout | null = null;
  
  queueUsageUpdate(userId: string, usage: any) {
    this.batchUpdateQueue.push({
      userId,
      usage,
      timestamp: Date.now()
    });
    
    // Flush batch every 5 seconds or when it reaches 10 items
    if (this.batchUpdateQueue.length >= 10 || !this.batchFlushTimer) {
      this.scheduleBatchFlush();
    }
  }
  
  private scheduleBatchFlush() {
    if (this.batchFlushTimer) {
      clearTimeout(this.batchFlushTimer);
    }
    
    this.batchFlushTimer = setTimeout(async () => {
      if (this.batchUpdateQueue.length === 0) return;
      
      const batch = [...this.batchUpdateQueue];
      this.batchUpdateQueue = [];
      
      try {
        await fetch('/api/usage/batch-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: batch })
        });
        
        console.log(`📊 [BATCH-UPDATE] Flushed ${batch.length} usage updates`);
      } catch (error) {
        console.error('❌ [BATCH-UPDATE] Failed:', error);
        // Re-queue failed items (with limit to prevent infinite loops)
        if (batch.length < 50) {
          this.batchUpdateQueue.unshift(...batch.slice(-10)); // Only retry last 10
        }
      }
      
      this.batchFlushTimer = null;
    }, 5000);
  }
  
  // Cache management
  clearCache(userId?: string) {
    if (userId) {
      this.cache.delete(`permissions_${userId}`);
    } else {
      this.cache.clear();
    }
  }
  
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        userId: value.userId,
        age: Date.now() - value.timestamp,
        ttl: value.ttl
      }))
    };
  }
}

export const smartPermissionLoader = new SmartPermissionLoader();