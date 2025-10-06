import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  updateProfile,
  getRedirectResult,
} from "firebase/auth";
import {
  auth,
  loginUser,
  registerUser,
  logoutUser,
  sendEmailLink,
  resetPassword,
  devMode,
} from "../lib/firebase";
import { safeFirebaseError, getErrorMessage } from "../lib/firebase-error-fix";
import { isDevelopmentMode, devLog } from "../lib/dev-session-config";
import { apiRequest } from "../lib/queryClient";

type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
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

// 🔐 ROBUST AUTHENTICATION HELPER: Handles token failures with automatic reauthentication
export const getValidToken = async (currentUser: User | null, retryCount = 0): Promise<string> => {
  const maxRetries = 2;
  
  try {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    console.log(`🔐 [TOKEN-MANAGER] Attempting to get token (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    // Try to get token (force refresh if this is a retry)
    const forceRefresh = retryCount > 0;
    const token = await currentUser.getIdToken(forceRefresh);
    
    console.log(`✅ [TOKEN-MANAGER] Token obtained successfully (forceRefresh: ${forceRefresh})`);
    return token;
    
  } catch (tokenError: any) {
    console.error(`❌ [TOKEN-MANAGER] Token error (attempt ${retryCount + 1}):`, tokenError);
    
    // If we haven't exhausted retries and this looks like an auth issue
    if (retryCount < maxRetries && (
      tokenError?.code === 'auth/user-token-expired' ||
      tokenError?.code === 'auth/id-token-expired' ||
      tokenError?.message?.includes('token') ||
      tokenError?.message?.includes('expired') ||
      tokenError?.message?.includes('auth')
    )) {
      console.log(`🔄 [TOKEN-MANAGER] Attempting recovery (retry ${retryCount + 1})`);
      
      // Exponential backoff delay
      const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      console.log(`🔄 [TOKEN-MANAGER] Waiting ${backoffDelay}ms before retry...`);
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      try {
        const { auth } = await import('../lib/firebase');
        
        // Try to reload current user and refresh token
        if (auth.currentUser) {
          console.log('🔄 [TOKEN-MANAGER] Attempting user reload and token refresh...');
          await auth.currentUser.reload();
          
          // Recursive call with incremented retry count
          return await getValidToken(currentUser, retryCount + 1);
        } else {
          console.log('❌ [TOKEN-MANAGER] No Firebase current user found');
          throw new Error('Firebase user not found - reauthentication required');
        }
        
      } catch (reauthError) {
        console.error('❌ [TOKEN-MANAGER] Recovery attempt failed:', reauthError);
        
        // If this is the last attempt, prompt for complete reauthentication
        if (retryCount >= maxRetries - 1) {
          throw new Error('Session expired - reauthentication required');
        }
        
        throw reauthError;
      }
    }
    
    // If we've exhausted retries or this isn't an auth error, throw the original error
    throw tokenError;
  }
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

  // 🍪 Helper function: Create session cookie from Firebase user - SEGURO Y QUIRURGICO
  const createSessionCookie = async (firebaseUser: any) => {
    try {
      console.log('🔐 [SESSION-COOKIE] Creando session cookie para usuario:', firebaseUser.uid);
      
      // 🔄 TOKEN RESILIENTE: Obtener token con retry y backoff para manejar errores de red
      let idToken;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Intentar obtener token - empezar sin force refresh
          const forceRefresh = retryCount > 0; // Solo force refresh en reintentos
          idToken = await firebaseUser.getIdToken(forceRefresh);
          console.log(`✅ [TOKEN-RESILIENT] Token obtenido exitosamente (attempt ${retryCount + 1}, forceRefresh: ${forceRefresh})`);
          break;
        } catch (tokenError: any) {
          retryCount++;
          console.warn(`⚠️ [TOKEN-RESILIENT] Error obteniendo token (attempt ${retryCount}/${maxRetries}):`, tokenError.code || tokenError.message);
          
          if (retryCount >= maxRetries) {
            console.error('❌ [TOKEN-RESILIENT] Agotados reintentos para token');
            throw new Error(`Token obtainment failed after ${maxRetries} attempts: ${tokenError.message}`);
          }
          
          // Backoff exponencial: 1s, 2s, 4s
          const backoffDelay = Math.pow(2, retryCount - 1) * 1000;
          console.log(`🔄 [TOKEN-RESILIENT] Esperando ${backoffDelay}ms antes del reintento...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
      
      // 🍪 SESSION COOKIE RESILIENTE: Crear session cookie con manejo de errores
      try {
        const response = await fetch('/api/sessionLogin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ idToken })
        });

        if (!response.ok) {
          throw new Error(`Session login failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ [SESSION-COOKIE] Session cookie creada exitosamente:', result.user?.uid);
        return result;
        
      } catch (fetchError: any) {
        console.error('❌ [SESSION-COOKIE] Error en llamada de session login:', fetchError.message);
        
        // 🚑 NO BYPASS INSEGURO: Lanzar error para manejo apropiado
        // La autenticación frontend puede continuar, pero server-side estará limitado
        throw new Error(`Session cookie creation failed: ${fetchError.message}`);
      }
      
    } catch (error: any) {
      console.error('❌ [SESSION-COOKIE] Error general en createSessionCookie:', error.message);
      throw error; // 🔒 SEGURO: No bypass, manejar error apropiadamente
    }
  };

  useEffect(() => {
    // Ya no verificamos la persistencia local al inicio
    // Dejamos que Firebase Auth maneje toda la persistencia con su propio sistema
    // Esto evita conflictos entre la persistencia local y Firebase
    console.log('🔐 [AUTH-INIT] Iniciando AuthProvider - Firebase manejará la persistencia');

    // Primero verificamos si hay algún resultado de redirección pendiente
    const checkRedirectResult = async () => {
      try {
        console.log("Verificando resultado de redirección...");
        const result = await Promise.race([
          getRedirectResult(auth),
          new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), 15000); // 15 segundos timeout
          })
        ]);

        if (result && result.user) {
          console.log(
            "Resultado de redirección procesado exitosamente:",
            result.user,
          );
          // ✅ FIXED: Enhanced persistence handles cleanup
          setNetworkRetryCount(0); // Reset retry count en éxito
          setError(null);
        }
      } catch (error: any) {
        await handleFirebaseError(error, "Redirect result error");
      }
    };

    // Ejecutamos después de un breve delay para permitir que persisted auth cargue
    setTimeout(checkRedirectResult, 100);

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

    // Escuchar cambios en la autenticación con manejo de errores mejorado
    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        try {
          if (user) {
            console.log("Usuario autenticado detectado:", user.uid);
            // Reset retry count en conexión exitosa
            setNetworkRetryCount(0);
            setError(null);
            
            // ✅ FIXED: Enhanced persistence handles cleanup
            
            // Convertir al tipo User para usar en nuestra aplicación con manejo de errores en getIdToken
            const appUser: User = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              phoneNumber: user.phoneNumber,
              emailVerified: user.emailVerified,
              getIdToken: async (forceRefresh?: boolean) => {
                try {
                  // ✅ ROBUST: Usar token real de Firebase con soporte para forceRefresh
                  return await user.getIdToken(forceRefresh);
                } catch (error) {
                  const errorMsg = error instanceof Error ? error.message : 'Unknown error obtaining Firebase token';
                  console.error("❌ Error obteniendo token Firebase:", errorMsg, error);
                  
                  // ✅ ROBUST: Retry con force refresh automático si no se especificó
                  if (!forceRefresh) {
                    try {
                      console.log("🔄 Intentando refresh forzado del token...");
                      return await user.getIdToken(true); // Force refresh
                    } catch (retryError) {
                      const retryMsg = retryError instanceof Error ? retryError.message : 'Unknown retry error';
                      console.error("❌ Error en retry del token Firebase:", retryMsg, retryError);
                      // ✅ ROBUST: Throw informative error instead of empty object
                      throw new Error(`Failed to obtain Firebase authentication token: ${retryMsg}`);
                    }
                  } else {
                    // Si ya era force refresh y falló, throw con información
                    throw new Error(`Failed to refresh Firebase authentication token: ${errorMsg}`);
                  }
                }
              },
            };
            setCurrentUser(appUser);
            setLastValidUser(appUser); // Guardar último usuario válido
            setIsInitializing(false); // ✅ FIXED: Auth successfully initialized

            // 🍪 CREAR SESSION COOKIE: Convertir ID token a session cookie - MANEJO SEGURO
            createSessionCookie(user).then(result => {
              console.log('✅ [SESSION-COOKIE] Session cookie creada exitosamente');
            }).catch(error => {
              console.warn('⚠️ [SESSION-COOKIE] Error creando session cookie - funcionalidad limitada en servidor:', error.message);
              // 🔒 SEGURO: La autenticación frontend continúa, pero server-side estará limitado
              // No es una condición crítica - el usuario puede usar la app, pero con limitaciones
            });
          } else {
            console.log("🔓 Usuario no autenticado - Firebase signOut detectado");
            console.log("🔐 [AUTH-SECURITY] USER_SIGNED_OUT:", {
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent
            });
            
            // Limpiar la persistencia local cuando Firebase indica que no hay usuario (sin bloquear)
            try {
              const { enhancedPersistenceService } = require('../lib/enhanced-persistence');
              enhancedPersistenceService.clearPersistentSession();
              console.log('🧹 [AUTH-CLEANUP] Sesión persistente limpiada al cerrar sesión de Firebase');
            } catch (e) {
              // Enhanced persistence not available, continue
            }
            
            setCurrentUser(null);
          }
          setLoading(false);
          if (!isInitializing) setIsInitializing(false); // ✅ FIXED: Ensure initialization completes
        } catch (error) {
          handleFirebaseError(error, "Auth state change error");
          setLoading(false);
          setIsInitializing(false); // ✅ FIXED: Even on error, mark as initialized
        }
      },
      (error) => {
        handleFirebaseError(error, "Auth state listener error");
        setLoading(false);
      }
    );

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
            try {
              // ✅ FIXED: Para usuarios OTP, usar token JWT real de Firebase
              const firebaseUser = auth.currentUser;
              if (firebaseUser) {
                return await firebaseUser.getIdToken();
              }
              throw new Error('No authenticated Firebase user found');
            } catch (error) {
              console.error("❌ Error obteniendo token OTP:", error);
              throw error;
            }
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
      
      const user = await loginUser(email, password, rememberMe);

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
        getIdToken: async (forceRefresh?: boolean) => {
          try {
            // ✅ FIXED: Usar token JWT real de Firebase
            const firebaseUser = auth.currentUser;
            if (firebaseUser) {
              return await firebaseUser.getIdToken(forceRefresh);
            }
            throw new Error('No authenticated Firebase user found');
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error obtaining Firebase token';
            console.error("❌ Error obteniendo token Firebase:", errorMsg, error);
            // ✅ ROBUST: Throw informative error instead of empty object
            throw new Error(`Failed to obtain Firebase authentication token: ${errorMsg}`);
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
      const user = await registerUser(email, password);

      // Para Firebase, actualizamos el displayName después del registro
      if (user && displayName) {
        await updateProfile(auth.currentUser!, {
          displayName: displayName,
        });
      }

      const appUser: User = {
        uid: user.uid,
        email: user.email,
        displayName: displayName, // Usamos el displayName proporcionado
        photoURL: user.photoURL || null,
        phoneNumber: user.phoneNumber || null,
        emailVerified: user.emailVerified || false,
        getIdToken: async (forceRefresh?: boolean) => {
          try {
            // ✅ FIXED: Usar token JWT real de Firebase
            const firebaseUser = auth.currentUser;
            if (firebaseUser) {
              return await firebaseUser.getIdToken(forceRefresh);
            }
            throw new Error('No authenticated Firebase user found');
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error obtaining Firebase token';
            console.error("❌ Error obteniendo token Firebase:", errorMsg, error);
            // ✅ ROBUST: Throw informative error instead of empty object
            throw new Error(`Failed to obtain Firebase authentication token: ${errorMsg}`);
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
      
      // Ejecutar logout de Firebase
      await logoutUser();
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
      await resetPassword(email);
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
      await sendEmailLink(email);
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
