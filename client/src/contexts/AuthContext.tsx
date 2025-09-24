import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
// 🔥 FIREBASE IMPORTS REMOVED - Now dynamically loaded in FirebaseAdapter only
// Static imports cause "Failed to fetch" even when SessionAdapter is selected
import { safeFirebaseError, getErrorMessage } from "../lib/firebase-error-fix";
import { isDevelopmentMode, devLog } from "../lib/dev-session-config";
import { apiRequest } from "../lib/queryClient";

// 🏗️ AUTH ADAPTER ABSTRACTION - Two-phase migration strategy
interface AuthAdapter {
  init(): Promise<User | null>;
  getCurrentUser(): User | null;
  login(email: string, password: string, rememberMe?: boolean): Promise<User>;
  logout(): Promise<boolean>;
  register(email: string, password: string, displayName: string): Promise<User>;
  sendPasswordResetEmail(email: string): Promise<boolean>;
  sendEmailLoginLink(email: string): Promise<boolean>;
  getIdToken(): Promise<string>;
}

// 🏗️ SESSION ADAPTER IMPLEMENTATION - Firebase replacement for REST/cookie-based auth
class SessionAdapter implements AuthAdapter {
  private currentUser: User | null = null;

  async init(): Promise<User | null> {
    try {
      // Check for existing session via /api/me
      const response = await fetch('/api/me', {
        credentials: 'include' // Important for cookies
      });
      
      if (response.ok) {
        const userData = await response.json();
        this.currentUser = userData;
        return userData;
      }
      
      return null;
    } catch (error) {
      console.warn('🔧 [SESSION-ADAPTER] Session check failed, starting fresh');
      return null;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async login(email: string, password: string, rememberMe?: boolean): Promise<User> {
    // Import auth flow functions first
    const { markAuthFlowStart, markAuthFlowEnd } = await import('../lib/firebase-sts-interceptor');
    const flowId = `login_${Date.now()}`;
    
    try {
      // Mark start of auth flow to allow STS calls during login
      markAuthFlowStart(flowId);
      
      // 1. Authenticate with Firebase client SDK to get ID token
      const { signInWithEmailAndPassword, getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // 2. Send ID token to our server to create session cookie
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const user = await response.json();
      this.currentUser = user;
      return user;
    } catch (error: any) {
      console.error('🔥 [SESSION-ADAPTER] Login error:', error);
      throw new Error(error.message || 'Login failed');
    } finally {
      // Always mark end of auth flow, regardless of success or failure
      markAuthFlowEnd(flowId);
    }
  }

  async logout(): Promise<boolean> {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      this.currentUser = null;
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  async register(email: string, password: string, displayName: string): Promise<User> {
    // Import auth flow functions first  
    const { markAuthFlowStart, markAuthFlowEnd } = await import('../lib/firebase-sts-interceptor');
    const flowId = `register_${Date.now()}`;
    
    try {
      // Mark start of auth flow to allow STS calls during registration
      markAuthFlowStart(flowId);
      
      // 1. Create Firebase user account
      const { createUserWithEmailAndPassword, getAuth, updateProfile } = await import('firebase/auth');
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Update display name
      await updateProfile(userCredential.user, { displayName });
      
      // 3. Get ID token and send to server to create session
      const idToken = await userCredential.user.getIdToken();

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const user = await response.json();
      this.currentUser = user;
      return user;
    } catch (error: any) {
      console.error('🔥 [SESSION-ADAPTER] Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    } finally {
      // Always mark end of auth flow, regardless of success or failure
      markAuthFlowEnd(flowId);
    }
  }

  async sendPasswordResetEmail(email: string): Promise<boolean> {
    const response = await fetch('/api/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email })
    });

    return response.ok;
  }

  async sendEmailLoginLink(email: string): Promise<boolean> {
    const response = await fetch('/api/email-login-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email })
    });

    return response.ok;
  }

  async getIdToken(): Promise<string> {
    // Return empty string for cookie-based auth (no tokens needed)
    return '';
  }
}

// 🔥 FIREBASE ADAPTER - Legacy Firebase implementation with guards
class FirebaseAdapter implements AuthAdapter {
  private currentUser: User | null = null;
  
  async init(): Promise<User | null> {
    // Firebase initialization logic (will be guarded by environment flag)
    return null;
  }
  
  getCurrentUser(): User | null {
    return this.currentUser;
  }
  
  async login(email: string, password: string, rememberMe?: boolean): Promise<User> {
    throw new Error('FirebaseAdapter: Use environment flag USE_FIREBASE_AUTH to enable');
  }
  
  async logout(): Promise<boolean> {
    throw new Error('FirebaseAdapter: Use environment flag USE_FIREBASE_AUTH to enable');
  }
  
  async register(email: string, password: string, displayName: string): Promise<User> {
    throw new Error('FirebaseAdapter: Use environment flag USE_FIREBASE_AUTH to enable');
  }
  
  async sendPasswordResetEmail(email: string): Promise<boolean> {
    throw new Error('FirebaseAdapter: Use environment flag USE_FIREBASE_AUTH to enable');
  }
  
  async sendEmailLoginLink(email: string): Promise<boolean> {
    throw new Error('FirebaseAdapter: Use environment flag USE_FIREBASE_AUTH to enable');
  }
  
  async getIdToken(): Promise<string> {
    throw new Error('FirebaseAdapter: Use environment flag USE_FIREBASE_AUTH to enable');
  }
}

// 🛡️ COMPREHENSIVE TRIPLE-LAYER FETCH ERROR ELIMINATION FOR AUTHCONTEXT
async function getTokenWithTripleLayerProtection(user: any): Promise<string> {
  // LAYER 1: Aggressive timeout with retry (increased timeout for production)
  try {
    const token = await Promise.race([
      user.getIdToken(false),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Token timeout')), 6000) // Increased from 3000
      )
    ]);
    
    if (token && !token.startsWith('local_') && !token.startsWith('mock_')) {
      return token;
    }
  } catch (error) {
    // Silent - continue to Layer 2
  }

  // LAYER 2: Force refresh with longer timeout (increased for production)
  try {
    const refreshedToken = await Promise.race([
      user.getIdToken(true),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Refresh timeout')), 4000) // Increased from 2000
      )
    ]);
    
    if (refreshedToken && !refreshedToken.startsWith('local_') && !refreshedToken.startsWith('mock_')) {
      return refreshedToken;
    }
  } catch (error) {
    // Silent - continue to Layer 3
  }

  // LAYER 3: Mock token only in development mode (SECURITY FIX)
  if (isDevelopmentMode()) {
    const mockToken = `mock_token_${user.uid}_${Date.now()}`;
    console.debug('🔧 [AUTH-CONTEXT-FALLBACK] Usando token mock para continuidad (solo desarrollo)');
    return mockToken;
  }

  // Production: Throw error instead of using mock token
  throw new Error('Failed to obtain valid Firebase ID token after multiple attempts');
}

type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  getIdToken: () => Promise<string>;
};

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<User>;
  logout: () => Promise<boolean>;
  sendPasswordResetEmail: (email: string) => Promise<boolean>;
  sendEmailLoginLink: (email: string) => Promise<boolean>;
  registerBiometricCredential: () => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Usamos una función constante en lugar de una función nombrada para evitar el error de invalidación
const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};

// Exportamos useAuth como una constante
export { useAuth };

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false); // ✅ FIXED: Start with false for better UX
  const [error, setError] = useState<string | null>(null);
  const [networkRetryCount, setNetworkRetryCount] = useState(0);
  const [lastValidUser, setLastValidUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // 🏗️ ADAPTER SELECTION - SessionAdapter by default, FirebaseAdapter as dev fallback
  const authAdapter = useState(() => {
    const useFirebase = import.meta.env.VITE_USE_FIREBASE_AUTH === 'true';
    
    if (useFirebase) {
      console.log('🔥 [AUTH-ADAPTER] Using FirebaseAdapter (development mode)');
      return new FirebaseAdapter();
    } else {
      console.log('🏗️ [AUTH-ADAPTER] Using SessionAdapter (production mode)');
      return new SessionAdapter();
    }
  })[0];

  // 🍪 Helper function: Create session cookie from Firebase user
  const createSessionCookie = async (firebaseUser: any) => {
    try {
      console.log('🔐 [SESSION-COOKIE] Creando session cookie para usuario:', firebaseUser.uid);
      
      // Obtener ID token fresco de Firebase
      const idToken = await firebaseUser.getIdToken(true); // true = force refresh
      
      // Llamar al endpoint sessionLogin para crear session cookie
      const response = await fetch('/api/sessionLogin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // 🍪 Importante para recibir la cookie
        body: JSON.stringify({ idToken })
      });

      if (!response.ok) {
        throw new Error(`Session login failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ [SESSION-COOKIE] Session cookie creada exitosamente:', result.user?.uid);
      
      return result;
    } catch (error) {
      console.error('❌ [SESSION-COOKIE] Error creando session cookie:', error);
      throw error;
    }
  };

  // 🏗️ ADAPTER-DRIVEN LIFECYCLE - Replace Firebase useEffect with adapter delegation
  useEffect(() => {
    console.log('🏗️ [AUTH-LIFECYCLE] Starting adapter-driven authentication...');
    
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Use selected adapter (SessionAdapter or FirebaseAdapter)
        const user = await authAdapter.init();
        
        if (user) {
          console.log('✅ [ADAPTER-AUTH] User authenticated via adapter:', user.uid || user.email);
          setCurrentUser(user);
          setLastValidUser(user);
        } else {
          console.log('ℹ️ [ADAPTER-AUTH] No authenticated user found');
          setCurrentUser(null);
        }
        
        setError(null);
        setNetworkRetryCount(0);
        
      } catch (error: any) {
        console.error('❌ [ADAPTER-AUTH] Authentication initialization failed:', error);
        setError(error.message || 'Authentication failed');
        setCurrentUser(null);
      } finally {
        setLoading(false);
        setIsInitializing(false);
      }
    };

    initializeAuth();

    // Función para manejar errores de Firebase con retry (DEV-FRIENDLY)
    const handleFirebaseError = async (error: any, context: string) => {
      console.error(`❌ [AUTH-SECURITY] ${context}:`, {
        code: error?.code || 'unknown',
        message: error?.message || 'Unknown error',
        name: error?.name || 'Error'
      });

      // 🔧 DEV-FRIENDLY: Verificar si estamos en desarrollo
      const isDevelopment = isDevelopmentMode();

      // Detectar errores de red
      if (error?.code === 'auth/network-request-failed' || 
          error?.message?.includes('fetch') ||
          error?.message?.includes('network')) {
        
        setNetworkRetryCount(prev => prev + 1);
        
        // 🔧 DEV-FRIENDLY: En desarrollo, ser más tolerante con errores de red
        const maxRetries = isDevelopment ? 10 : 3; // Más reintentos en dev
        const retryDelay = isDevelopment ? 3000 : 5000; // Delay más corto en dev
        
        // Si hay muchos reintentos, mostrar mensaje al usuario
        if (networkRetryCount > maxRetries) {
          const message = isDevelopment 
            ? "Conectividad en desarrollo - continuando..." 
            : "Problemas de conectividad detectados. Verificando conexión...";
          
          setError(message);
          
          // Intentar reconectar después de un delay
          setTimeout(() => {
            setError(null);
            setNetworkRetryCount(0);
          }, retryDelay);
        } else if (isDevelopment) {
          console.log(`🛠️ [DEV-MODE] Reintento ${networkRetryCount}/${maxRetries} - continuando en desarrollo`);
        }
      }
    };

    // 🔥 FIREBASE LISTENER DISABLED - Adapter-driven auth replaces onAuthStateChanged
    const unsubscribe = (() => {
      console.log('🏗️ [ADAPTER-MODE] Firebase listener disabled - using SessionAdapter');
      return () => {}; // No-op cleanup function
    })();
    
    // 🔥 FIREBASE LOGIC COMPLETELY REMOVED - Adapter-driven auth only

    // Escuchamos el evento personalizado para OTP fallback
    const handleDevAuthChange = (event: any) => {
      const { user } = event.detail;
      console.log("Evento de auth detectado - método fallback OTP:", user);
      if (user) {
        // Convertir al tipo User para usar en nuestra aplicación
        const appUser: User = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified,
          getIdToken: async () => {
            // 🏗️ DEV-ONLY TOKEN STUB - Firebase adapter will handle real tokens
            console.log('🛠️ [DEV-AUTH] Using dev-only token stub for OTP user');
            return 'dev-otp-token-stub';
          },
        };
        setCurrentUser(appUser);
        
        // Persistir para evitar pérdida en recargas
        localStorage.setItem('otp-fallback-auth', JSON.stringify({
          user: appUser,
          timestamp: Date.now(),
          method: 'otp-fallback'
        }));
      }
      setLoading(false);
    };

    // Registrar el evento personalizado
    window.addEventListener("dev-auth-change", handleDevAuthChange);

    // Limpiar las suscripciones al desmontar
    return () => {
      unsubscribe();
      window.removeEventListener("dev-auth-change", handleDevAuthChange);
    };
  }, []);

  // Iniciar sesión con email y contraseña con opción de "recordarme"
  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔐 [AUTH-CONTEXT] Login iniciado para: ${email}, recordarme: ${rememberMe}`);
      
      const user = await authAdapter.login(email, password, rememberMe);

      if (!user) {
        throw new Error("No se pudo iniciar sesión");
      }

      const appUser: User = {
        uid: user.uid,
        email: user.email,
        displayName: (user as any).displayName || null,
        photoURL: (user as any).photoURL || null,
        phoneNumber: (user as any).phoneNumber || null,
        emailVerified: (user as any).emailVerified || false,
        getIdToken: async () => {
          try {
            // ✅ ADAPTER-BASED: Use adapter's getIdToken method
            return await authAdapter.getIdToken();
          } catch (error) {
            console.error("❌ Error obteniendo token del adapter:", error);
            throw error; // Re-throw para manejo apropiado upstream
          }
        },
      };

      // 🔧 CRÍTICO: Actualizar inmediatamente el estado del usuario 
      // Sin esperar a onAuthStateChanged para evitar redirección al login
      setCurrentUser(appUser);
      setLoading(false);
      setIsInitializing(false); // ✅ FIXED: Login completes initialization

      // Inicializar monitoreo de actividad si "recordarme" está activado
      if (rememberMe) {
        // Importar dinámicamente para evitar circular dependencies
        const { enhancedPersistenceService } = await import('../lib/enhanced-persistence');
        enhancedPersistenceService.initActivityMonitoring();
      }

      console.log(`✅ [AUTH-CONTEXT] Login exitoso para: ${email} - Estado actualizado inmediatamente`);
      return appUser;
    } catch (err: any) {
      console.error(`❌ [AUTH-CONTEXT] Error en login para: ${email}`, err);
      
      // USAR SAFE ERROR HANDLING
      const safeError = safeFirebaseError(err);
      const userMessage = getErrorMessage(err);
      
      console.error("🔧 [AUTH-CONTEXT] Safe error:", safeError);
      setError(userMessage);
      throw new Error(userMessage);
    } finally {
      setLoading(false);
    }
  };

  // Registrar nuevo usuario
  const register = async (
    email: string,
    password: string,
    displayName: string,
  ) => {
    try {
      setLoading(true);
      setError(null);
      const user = await authAdapter.register(email, password, displayName);

      // SessionAdapter handles displayName in register call

      const appUser: User = {
        uid: user.uid,
        email: user.email,
        displayName: displayName, // Usamos el displayName proporcionado
        photoURL: user.photoURL || null,
        phoneNumber: user.phoneNumber || null,
        emailVerified: user.emailVerified || false,
        getIdToken: async () => {
          try {
            // ✅ ADAPTER-BASED: Use adapter's getIdToken method
            return await authAdapter.getIdToken();
          } catch (error) {
            console.error("❌ Error obteniendo token del adapter:", error);
            throw error; // Re-throw para manejo apropiado upstream
          }
        },
      };

      // 🔧 CRÍTICO: Actualizar inmediatamente el estado del usuario 
      // Sin esperar a onAuthStateChanged para evitar redirección al login
      setCurrentUser(appUser);
      setLoading(false);
      setIsInitializing(false); // ✅ FIXED: Registration completes initialization

      // Note: Welcome email functionality would be implemented here
      // Currently not available in the email service
      console.log("Usuario registrado exitosamente:", email, "- Estado actualizado inmediatamente");

      return appUser;
    } catch (err: any) {
      // USAR SAFE ERROR HANDLING PARA REGISTRO
      const safeError = safeFirebaseError(err);
      const userMessage = getErrorMessage(err);
      
      console.error("🔧 [AUTH-CONTEXT] Safe register error:", safeError);
      setError(userMessage);
      throw new Error(userMessage);
    } finally {
      setLoading(false);
    }
  };

  // Cerrar sesión con limpieza de persistencia
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔓 [AUTH-CONTEXT] Iniciando proceso de signOut");
      
      // Permitir logout en desarrollo
      if (typeof window !== 'undefined' && (window as any).__allowDevLogout) {
        (window as any).__allowDevLogout();
      }
      
      // Limpiar sesión persistente antes del logout
      try {
        const { enhancedPersistenceService } = await import('../lib/enhanced-persistence');
        enhancedPersistenceService.clearPersistentSession();
        console.log("🗑️ [AUTH-CONTEXT] Sesión persistente limpiada");
      } catch (persistenceError) {
        console.warn("⚠️ [AUTH-CONTEXT] Error limpiando persistencia:", persistenceError);
      }
      
      // Limpiar el estado del usuario inmediatamente
      setCurrentUser(null);
      setLastValidUser(null);
      
      // Ejecutar logout usando adapter
      await authAdapter.logout();
      console.log("✅ [AUTH-CONTEXT] SignOut completado exitosamente");
      
      // Limpiar cualquier dato de sesión adicional
      if (typeof window !== 'undefined') {
        // Limpiar tokens almacenados
        localStorage.removeItem('authToken');
        sessionStorage.clear();
        
        // Forzar actualización del estado de autenticación
        setTimeout(() => {
          setCurrentUser(null);
        }, 100);
      }
      
      return true;
    } catch (error: any) {
      console.error("❌ [AUTH-CONTEXT] Error detallado en logout:", error);
      console.log("AuthContext: Tipo de error:", error.name);
      console.log("AuthContext: Mensaje de error:", error.message);
      console.log("AuthContext: Stack trace:", error.stack);
      
      // Aún así intentar limpiar el estado local en caso de error
      setCurrentUser(null);
      setLastValidUser(null);
      
      setError(error.message || "Error al cerrar sesión");
      throw error;
    } finally {
      setLoading(false);
    }
  };



  // Método de Microsoft eliminado intencionalmente

  // Enviar correo para resetear contraseña
  const sendPasswordResetEmail = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      await authAdapter.sendPasswordResetEmail(email);
      return true;
    } catch (err: any) {
      setError(err.message || "Error al enviar email de recuperación");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Enviar enlace de inicio de sesión por email
  const sendEmailLoginLink = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      await authAdapter.sendEmailLoginLink(email);
      return true;
    } catch (err: any) {
      setError(err.message || "Error al enviar enlace de inicio de sesión");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Registrar credenciales biométricas para el usuario actual
  const registerBiometricCredential = async () => {
    try {
      if (!currentUser || !currentUser.email) {
        throw new Error('Debe estar autenticado para registrar credenciales biométricas');
      }

      setLoading(true);
      setError(null);

      // Importar dinámicamente el servicio WebAuthn
      const { webauthnService } = await import('../lib/webauthn-service');
      
      console.log('🔐 [CONTEXT-BIOMETRIC] Registrando credencial para:', currentUser.email);
      
      const credential = await webauthnService.registerCredential(currentUser.email);
      
      if (credential) {
        console.log('✅ [CONTEXT-BIOMETRIC] Credencial biométrica registrada exitosamente');
        return true;
      } else {
        throw new Error('No se pudo registrar la credencial biométrica');
      }
    } catch (err: any) {
      console.error('❌ [CONTEXT-BIOMETRIC] Error registrando credencial:', err);
      setError(err.message || 'Error al registrar credencial biométrica');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    sendPasswordResetEmail,
    sendEmailLoginLink,
    registerBiometricCredential,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
