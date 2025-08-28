/**
 * 🚀 OPTIMIZED AUTH HOOK - FASE 2 & 3 INTEGRATION
 * Combines all advanced auth optimizations into a single hook
 * for better performance and monitoring at scale
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authStateMonitor } from '@/services/authStateMonitor';
import { devModeManager, debugLog } from '@/utils/devModeUtils';

interface AuthOptimizations {
  isInitializing: boolean;
  hasConnectivityIssues: boolean;
  retryCount: number;
  lastTransition: string;
  circuitBreakerActive: boolean;
}

export function useOptimizedAuth() {
  const authContext = useAuth();
  const [optimizations, setOptimizations] = useState<AuthOptimizations>({
    isInitializing: true,
    hasConnectivityIssues: false,
    retryCount: 0,
    lastTransition: 'unknown',
    circuitBreakerActive: false
  });
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateRef = useRef<string>('unknown');
  
  // ✅ FASE 2: Auth state transition monitoring
  useEffect(() => {
    if (!authContext.currentUser) {
      if (lastStateRef.current !== 'logged_out') {
        authStateMonitor.recordTransition('logged_out', 'auth_context_change');
        lastStateRef.current = 'logged_out';
        setOptimizations(prev => ({ ...prev, lastTransition: 'logged_out' }));
      }
    } else {
      if (lastStateRef.current !== 'logged_in') {
        authStateMonitor.recordTransition('logged_in', 'auth_context_change', {
          uid: authContext.currentUser.uid,
          email: authContext.currentUser.email
        });
        lastStateRef.current = 'logged_in';
        setOptimizations(prev => ({ 
          ...prev, 
          lastTransition: 'logged_in',
          isInitializing: false,
          retryCount: 0 // Reset on successful auth
        }));
      }
    }
  }, [authContext.currentUser]);
  
  // ✅ FASE 2: Loading state monitoring
  useEffect(() => {
    if (authContext.loading) {
      authStateMonitor.recordTransition('loading', 'auth_loading_start');
      setOptimizations(prev => ({ ...prev, lastTransition: 'loading' }));
    } else {
      if (lastStateRef.current === 'loading') {
        authStateMonitor.recordTransition('loaded', 'auth_loading_complete');
      }
    }
  }, [authContext.loading]);
  
  // ✅ FASE 3: Circuit breaker monitoring
  useEffect(() => {
    const checkCircuitBreaker = () => {
      const shouldBlock = authStateMonitor.shouldBlockAuthentication();
      setOptimizations(prev => ({ ...prev, circuitBreakerActive: shouldBlock }));
      
      if (shouldBlock) {
        debugLog('CIRCUIT-BREAKER', 'Authentication temporarily blocked due to failures');
      }
    };
    
    // Check every 30 seconds
    const interval = setInterval(checkCircuitBreaker, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // ✅ FASE 2: Exponential backoff retry mechanism
  const retryAuth = async (operation: () => Promise<any>, maxRetries = 3) => {
    let attempt = 0;
    
    const executeWithBackoff = async (): Promise<any> => {
      try {
        devModeManager.markStart(`auth-retry-${attempt}`);
        const result = await operation();
        
        // Reset retry count on success
        setOptimizations(prev => ({ ...prev, retryCount: 0 }));
        devModeManager.markEnd(`auth-retry-${attempt}`);
        
        return result;
      } catch (error) {
        attempt++;
        
        if (attempt >= maxRetries) {
          authStateMonitor.recordTransition('retry_failed', 'max_retries_exceeded', {
            attempts: attempt,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        
        debugLog('EXPONENTIAL-BACKOFF', `Attempt ${attempt} failed, retrying in ${backoffDelay}ms`);
        
        setOptimizations(prev => ({ 
          ...prev, 
          retryCount: attempt,
          hasConnectivityIssues: true 
        }));
        
        authStateMonitor.recordTransition('retrying', 'auth_operation_retry', {
          attempt,
          backoffDelay,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return executeWithBackoff();
      }
    };
    
    return executeWithBackoff();
  };
  
  // Enhanced auth operations with retry logic
  const optimizedLogin = async (email: string, password: string, rememberMe?: boolean) => {
    if (optimizations.circuitBreakerActive) {
      throw new Error('Authentication temporarily unavailable due to repeated failures');
    }
    
    return retryAuth(() => authContext.login(email, password, rememberMe));
  };
  
  const optimizedRegister = async (email: string, password: string, displayName: string) => {
    if (optimizations.circuitBreakerActive) {
      throw new Error('Registration temporarily unavailable due to repeated failures');
    }
    
    return retryAuth(() => authContext.register(email, password, displayName));
  };
  
  const optimizedLogout = async () => {
    return retryAuth(() => authContext.logout());
  };
  
  // ✅ FASE 3: Auth analytics
  const getAuthMetrics = () => {
    return authStateMonitor.getMetrics();
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    // Original auth context
    ...authContext,
    
    // Enhanced operations
    login: optimizedLogin,
    register: optimizedRegister,
    logout: optimizedLogout,
    
    // Optimization metrics
    optimizations,
    
    // Analytics
    getAuthMetrics,
    
    // Utilities
    isHealthy: !optimizations.circuitBreakerActive && optimizations.retryCount < 2
  };
}