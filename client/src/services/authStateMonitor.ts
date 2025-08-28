/**
 * 📊 AUTH STATE MONITORING SERVICE
 * Tracks authentication state transitions and provides analytics
 * for monitoring auth performance at scale
 */

interface AuthTransition {
  fromState: string;
  toState: string;
  timestamp: number;
  duration: number;
  userId?: string;
  trigger: string;
  metadata?: Record<string, any>;
}

interface AuthMetrics {
  totalTransitions: number;
  averageTransitionTime: number;
  failureRate: number;
  lastTransition: AuthTransition | null;
  commonFailures: Record<string, number>;
  performanceMetrics: {
    fastTransitions: number; // < 1s
    normalTransitions: number; // 1-3s  
    slowTransitions: number; // > 3s
  };
}

class AuthStateMonitor {
  private transitions: AuthTransition[] = [];
  private currentState: string = 'unknown';
  private stateStartTime: number = Date.now();
  private maxTransitionHistory = 100; // Keep last 100 transitions for analysis
  
  // ✅ FASE 2: Auth state transition monitoring
  recordTransition(toState: string, trigger: string, metadata?: Record<string, any>) {
    const now = Date.now();
    const duration = now - this.stateStartTime;
    
    const transition: AuthTransition = {
      fromState: this.currentState,
      toState,
      timestamp: now,
      duration,
      trigger,
      metadata
    };
    
    this.transitions.push(transition);
    
    // Keep only recent transitions for performance
    if (this.transitions.length > this.maxTransitionHistory) {
      this.transitions = this.transitions.slice(-this.maxTransitionHistory);
    }
    
    this.currentState = toState;
    this.stateStartTime = now;
    
    // Log important transitions
    if (duration > 3000) { // Slow transition
      console.warn('🐌 [AUTH-MONITOR] Slow transition detected:', {
        from: transition.fromState,
        to: toState,
        duration: `${duration}ms`,
        trigger
      });
    }
    
    // Store metrics for analytics
    this.updateMetricsCache();
  }
  
  // ✅ FASE 3: Auth state analytics
  getMetrics(): AuthMetrics {
    const transitions = this.transitions;
    const failures = transitions.filter(t => t.toState.includes('error') || t.toState.includes('failed'));
    
    const durations = transitions.map(t => t.duration);
    const averageTime = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0;
    
    const performanceMetrics = {
      fastTransitions: transitions.filter(t => t.duration < 1000).length,
      normalTransitions: transitions.filter(t => t.duration >= 1000 && t.duration <= 3000).length,
      slowTransitions: transitions.filter(t => t.duration > 3000).length
    };
    
    const commonFailures: Record<string, number> = {};
    failures.forEach(f => {
      const key = f.trigger;
      commonFailures[key] = (commonFailures[key] || 0) + 1;
    });
    
    return {
      totalTransitions: transitions.length,
      averageTransitionTime: Math.round(averageTime),
      failureRate: transitions.length > 0 ? failures.length / transitions.length : 0,
      lastTransition: transitions[transitions.length - 1] || null,
      commonFailures,
      performanceMetrics
    };
  }
  
  // ✅ FASE 3: Batch operations for analytics
  private updateMetricsCache() {
    // Batch update metrics every 10 transitions to reduce overhead
    if (this.transitions.length % 10 === 0) {
      const metrics = this.getMetrics();
      
      // Store in localStorage for persistence across sessions
      localStorage.setItem('auth_metrics_cache', JSON.stringify({
        metrics,
        lastUpdate: Date.now()
      }));
      
      // Send to backend analytics (optional)
      this.sendMetricsToBackend(metrics);
    }
  }
  
  private async sendMetricsToBackend(metrics: AuthMetrics) {
    try {
      // Only send if we have significant data
      if (metrics.totalTransitions > 5) {
        await fetch('/api/analytics/auth-metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
          })
        });
      }
    } catch (error) {
      console.debug('📊 [AUTH-MONITOR] Analytics upload failed (non-critical):', error);
    }
  }
  
  // ✅ FASE 3: Circuit breaker for auth failures
  shouldBlockAuthentication(): boolean {
    const recentTransitions = this.transitions.slice(-10); // Last 10 transitions
    const recentFailures = recentTransitions.filter(t => 
      t.toState.includes('error') || t.toState.includes('failed')
    );
    
    // Block if more than 70% of recent attempts failed
    if (recentTransitions.length >= 5 && recentFailures.length / recentTransitions.length > 0.7) {
      console.warn('🚫 [CIRCUIT-BREAKER] Too many auth failures, temporarily blocking');
      return true;
    }
    
    return false;
  }
  
  reset() {
    this.transitions = [];
    this.currentState = 'unknown';
    this.stateStartTime = Date.now();
  }
}

export const authStateMonitor = new AuthStateMonitor();