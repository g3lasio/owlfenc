/**
 * UNIFIED AUTH MANAGER - SOLUCIÓN DEFINITIVA
 * Reemplaza TODOS los sistemas de autenticación existentes
 * Usa Circuit Breaker para eliminar fetch requests continuos
 */

// 🚫 FIREBASE AUTH DISABLED - Using Clerk instead
// import { onAuthStateChanged, User as FirebaseUser, signOut } from "firebase/auth";
// import { auth } from "./firebase";
import { circuitBreaker } from "./circuit-breaker";

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

class UnifiedAuthManager {
  private authState: AuthState = {
    user: null,
    loading: false,
    error: null,
    isInitialized: false
  };

  private listeners = new Set<(state: AuthState) => void>();
  private tokenCache = new Map<string, { token: string; expires: number }>();
  private unsubscribe?: () => void;
  private pendingRequests = new Map<string, Promise<any>>();

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth() {
    console.log('🚫 [UNIFIED-AUTH] Sistema deshabilitado - usando Clerk');
    
    // 🚫 FIREBASE AUTH DISABLED - Using Clerk instead
    // this.unsubscribe = onAuthStateChanged(auth, ...);
    
    // Mark as initialized to prevent blocking
    this.updateState({ 
      isInitialized: true,
      loading: false,
      error: null
    });
  }

  private async handleAuthStateChange(firebaseUser: any | null) {
    try {
      if (firebaseUser) {
        console.log('✅ [UNIFIED-AUTH] Usuario detectado:', firebaseUser.uid);
        
        const appUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          phoneNumber: firebaseUser.phoneNumber,
          emailVerified: firebaseUser.emailVerified,
          getIdToken: () => this.getTokenSafely(firebaseUser)
        };

        this.updateState({ 
          user: appUser, 
          loading: false, 
          error: null,
          isInitialized: true 
        });

        // Limpiar tokens en cache del usuario anterior
        this.tokenCache.clear();

      } else {
        console.log('🔓 [UNIFIED-AUTH] Usuario no autenticado');
        this.updateState({ 
          user: null, 
          loading: false, 
          error: null,
          isInitialized: true 
        });
        this.tokenCache.clear();
      }
    } catch (error: any) {
      console.error('❌ [UNIFIED-AUTH] Error processing auth change:', error);
      this.updateState({ 
        error: 'Error procesando autenticación',
        loading: false,
        isInitialized: true 
      });
    }
  }

  private async getTokenSafely(firebaseUser: FirebaseUser): Promise<string> {
    const cacheKey = `token_${firebaseUser.uid}`;
    
    // Verificar cache primero
    const cached = this.tokenCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return cached.token;
    }

    // Usar circuit breaker para obtener token
    const result = await circuitBreaker.executeRequest(
      () => firebaseUser.getIdToken(false),
      'getIdToken',
      `token_${firebaseUser.uid}`,
      300000 // Cache por 5 minutos
    );

    if (result.success && result.data) {
      // Cachear token por 50 minutos (tokens Firebase duran 1 hora)
      this.tokenCache.set(cacheKey, {
        token: result.data,
        expires: Date.now() + 3000000
      });
      
      return result.data;
    }

    // Si falla obtener token, intentar desde cache expirado como fallback
    if (cached) {
      console.log('⚠️ [UNIFIED-AUTH] Usando token expirado como fallback');
      return cached.token;
    }

    throw new Error('No se pudo obtener token de autenticación');
  }

  /**
   * Deduplicación de requests - evita requests idénticos simultáneos
   */
  private async deduplicateRequest<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Si ya hay un request pendiente para esta key, esperar al resultado
    if (this.pendingRequests.has(key)) {
      console.log(`🔄 [UNIFIED-AUTH] Deduplicando request: ${key}`);
      return await this.pendingRequests.get(key);
    }

    // Crear nuevo request y guardarlo
    const promise = operation();
    this.pendingRequests.set(key, promise);

    try {
      const result = await promise;
      this.pendingRequests.delete(key);
      return result;
    } catch (error) {
      this.pendingRequests.delete(key);
      throw error;
    }
  }

  private updateState(updates: Partial<AuthState>) {
    this.authState = { ...this.authState, ...updates };
    
    // Notificar a todos los listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.authState);
      } catch (error) {
        console.error('❌ [UNIFIED-AUTH] Listener error:', error);
      }
    });
  }

  // API pública
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    
    // Enviar estado actual inmediatamente
    listener(this.authState);
    
    // Retornar función de cleanup
    return () => {
      this.listeners.delete(listener);
    };
  }

  getCurrentUser(): AppUser | null {
    return this.authState.user;
  }

  getCurrentToken(): Promise<string | null> {
    if (!this.authState.user) {
      return Promise.resolve(null);
    }

    return this.deduplicateRequest(
      `token_${this.authState.user.uid}`,
      () => this.authState.user!.getIdToken()
    );
  }

  async signOut(): Promise<void> {
    const result = await circuitBreaker.executeCriticalRequest(
      () => signOut(auth),
      'signOut'
    );

    if (!result.success) {
      console.error('❌ [UNIFIED-AUTH] SignOut failed:', result.error);
      throw new Error(result.error || 'Error al cerrar sesión');
    }

    this.tokenCache.clear();
    this.pendingRequests.clear();
    console.log('✅ [UNIFIED-AUTH] SignOut completado');
  }

  getAuthState(): AuthState {
    return { ...this.authState };
  }

  // Para debugging
  getDebugInfo() {
    return {
      authState: this.authState,
      tokenCacheSize: this.tokenCache.size,
      pendingRequestsSize: this.pendingRequests.size,
      circuitBreakerStatus: circuitBreaker.getStatus(),
      listenersCount: this.listeners.size
    };
  }

  // Cleanup para hot reloading en desarrollo
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.listeners.clear();
    this.tokenCache.clear();
    this.pendingRequests.clear();
    console.log('🗑️ [UNIFIED-AUTH] Sistema destruido');
  }
}

// Singleton instance
export const unifiedAuthManager = new UnifiedAuthManager();

// Hot reload cleanup en desarrollo
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unifiedAuthManager.destroy();
  });
}

export default unifiedAuthManager;