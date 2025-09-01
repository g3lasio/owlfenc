/**
 * HOOK DE AUTENTICACIÓN UNIFICADO
 * Reemplaza AuthContext con sistema simple que usa Circuit Breaker
 */

import { useState, useEffect } from 'react';
import { unifiedAuthManager } from '@/lib/unified-auth-manager';
import { circuitBreaker } from '@/lib/circuit-breaker';

interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  getIdToken: () => Promise<string>;
}

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
}

export function useUnifiedAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isInitialized: false
  });

  useEffect(() => {
    console.log('🔗 [USE-UNIFIED-AUTH] Conectando al manager unificado');
    
    // Suscribirse al manager unificado (UN SOLO listener en toda la app)
    const unsubscribe = unifiedAuthManager.subscribe((state) => {
      setAuthState(state);
    });

    return unsubscribe;
  }, []);

  // Métodos simplificados que usan circuit breaker
  const getCurrentToken = async (forceRefresh = false): Promise<string | null> => {
    if (!circuitBreaker.canMakeAutomaticRequest() && !forceRefresh) {
      console.log('🚫 [USE-UNIFIED-AUTH] Token request bloqueado por circuit breaker');
      return null;
    }

    try {
      return await unifiedAuthManager.getCurrentToken();
    } catch (error: any) {
      console.error('❌ [USE-UNIFIED-AUTH] Error obteniendo token:', error);
      return null;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await unifiedAuthManager.signOut();
    } catch (error: any) {
      console.error('❌ [USE-UNIFIED-AUTH] Error en signOut:', error);
      throw error;
    }
  };

  const clearCache = () => {
    circuitBreaker.clearCache();
  };

  const getDebugInfo = () => {
    return {
      authState,
      managerDebug: unifiedAuthManager.getDebugInfo()
    };
  };

  return {
    // Estado de autenticación
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isInitialized: authState.isInitialized,
    
    // Métodos
    getCurrentToken,
    signOut,
    clearCache,
    getDebugInfo,
    
    // Estado del circuit breaker
    canMakeAutomaticRequest: circuitBreaker.canMakeAutomaticRequest(),
    circuitStatus: circuitBreaker.getStatus()
  };
}

export default useUnifiedAuth;