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
  loginWithGoogle,
  loginWithApple,
  sendEmailLink,
  resetPassword,
  devMode,
} from "../lib/firebase";
import { safeFirebaseError, getErrorMessage } from "../lib/firebase-error-fix";

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
  loginWithGoogle: () => Promise<User | null>; // Puede ser null en caso de redirección
  loginWithApple: () => Promise<User | null>; // Puede ser null en caso de redirección
  sendPasswordResetEmail: (email: string) => Promise<boolean>;
  sendEmailLoginLink: (email: string) => Promise<boolean>;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networkRetryCount, setNetworkRetryCount] = useState(0);

  useEffect(() => {
    // Verificar autenticación persistida de OTP primero
    const checkPersistedAuth = async () => {
      try {
        // Verificar sesión persistente mejorada (30 días)
        const { enhancedPersistenceService } = await import('../lib/enhanced-persistence');
        const sessionValidation = enhancedPersistenceService.validatePersistentSession();
        
        if (sessionValidation.valid && sessionValidation.session) {
          console.log('🔄 [PERSISTENCE] Sesión persistente válida encontrada:', sessionValidation.session.email);
          // Firebase onAuthStateChanged manejará la autenticación automática
          enhancedPersistenceService.initActivityMonitoring();
          return;
        } else if (sessionValidation.reason) {
          console.log('⚠️ [PERSISTENCE] Sesión inválida:', sessionValidation.reason);
        }
        
        // Verificar token custom exitoso (OTP legacy)
        const otpSuccess = localStorage.getItem('otp-auth-success');
        if (otpSuccess) {
          const authData = JSON.parse(otpSuccess);
          // Validar que no sea muy antiguo (24 horas)
          if (Date.now() - authData.timestamp < 24 * 60 * 60 * 1000) {
            console.log('🔄 Restoring OTP authentication from localStorage');
            return; // Firebase onAuthStateChanged manejará esto
          } else {
            localStorage.removeItem('otp-auth-success');
          }
        }
        
        // Verificar fallback auth
        const otpFallback = localStorage.getItem('otp-fallback-auth');
        if (otpFallback) {
          const fallbackData = JSON.parse(otpFallback);
          // Validar que no sea muy antiguo (24 horas)
          if (Date.now() - fallbackData.timestamp < 24 * 60 * 60 * 1000) {
            console.log('🔄 Restoring fallback OTP authentication');
            setCurrentUser(fallbackData.user);
            setLoading(false);
            return;
          } else {
            localStorage.removeItem('otp-fallback-auth');
          }
        }
      } catch (error) {
        console.error('Error checking persisted auth:', error);
      }
    };

    // Verificar autenticación persistida primero (async)
    checkPersistedAuth();

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
          // Limpiar autenticación fallback si Firebase funciona
          localStorage.removeItem('otp-fallback-auth');
          setNetworkRetryCount(0); // Reset retry count en éxito
          setError(null);
        }
      } catch (error: any) {
        await handleFirebaseError(error, "Redirect result error");
      }
    };

    // Ejecutamos después de un breve delay para permitir que persisted auth cargue
    setTimeout(checkRedirectResult, 100);

    // Función para manejar errores de Firebase con retry
    const handleFirebaseError = async (error: any, context: string) => {
      console.error(`❌ [AUTH-SECURITY] ${context}:`, {
        code: error?.code || 'unknown',
        message: error?.message || 'Unknown error',
        name: error?.name || 'Error'
      });

      // Detectar errores de red
      if (error?.code === 'auth/network-request-failed' || 
          error?.message?.includes('fetch') ||
          error?.message?.includes('network')) {
        
        setNetworkRetryCount(prev => prev + 1);
        
        // Si hay muchos reintentos, mostrar mensaje al usuario
        if (networkRetryCount > 3) {
          setError("Problemas de conectividad detectados. Verificando conexión...");
          
          // Intentar reconectar después de un delay
          setTimeout(() => {
            setError(null);
            setNetworkRetryCount(0);
          }, 5000);
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
            
            // Limpiar autenticación fallback si Firebase funciona
            localStorage.removeItem('otp-fallback-auth');
            
            // Convertir al tipo User para usar en nuestra aplicación con manejo de errores en getIdToken
            const appUser: User = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              phoneNumber: user.phoneNumber,
              emailVerified: user.emailVerified,
              getIdToken: async () => {
                try {
                  // Intentar obtener token con timeout
                  return await Promise.race([
                    user.getIdToken(),
                    new Promise<never>((_, reject) => {
                      setTimeout(() => reject(new Error('Token timeout')), 10000);
                    })
                  ]);
                } catch (tokenError: any) {
                  console.error("❌ [TOKEN] Error obteniendo token:", tokenError);
                  
                  // Intentar refresh forzado una vez
                  try {
                    return await user.getIdToken(true);
                  } catch (refreshError) {
                    console.error("❌ [TOKEN] Error en refresh forzado:", refreshError);
                    throw refreshError;
                  }
                }
              },
            };
            setCurrentUser(appUser);
          } else {
            // Solo limpiar usuario si no hay autenticación fallback válida
            const otpFallback = localStorage.getItem('otp-fallback-auth');
            if (!otpFallback || currentUser) {
              console.log("🔓 Usuario no autenticado - Firebase signOut detectado");
              setCurrentUser(null);
            }
          }
          setLoading(false);
        } catch (error) {
          handleFirebaseError(error, "Auth state change error");
          setLoading(false);
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
          getIdToken: () => user.getIdToken(),
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
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        getIdToken: () => user.getIdToken(),
      };

      // 🔧 CRÍTICO: Actualizar inmediatamente el estado del usuario 
      // Sin esperar a onAuthStateChanged para evitar redirección al login
      setCurrentUser(appUser);
      setLoading(false);

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
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        getIdToken: () => user.getIdToken(),
      };

      // 🔧 CRÍTICO: Actualizar inmediatamente el estado del usuario 
      // Sin esperar a onAuthStateChanged para evitar redirección al login
      setCurrentUser(appUser);
      setLoading(false);

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
      
      // Limpiar sesión persistente antes del logout
      try {
        const { enhancedPersistenceService } = await import('../lib/enhanced-persistence');
        enhancedPersistenceService.clearPersistentSession();
        console.log("🗑️ [AUTH-CONTEXT] Sesión persistente limpiada");
      } catch (persistenceError) {
        console.warn("⚠️ [AUTH-CONTEXT] Error limpiando persistencia:", persistenceError);
      }
      
      await logoutUser();
      console.log("✅ [AUTH-CONTEXT] SignOut completado exitosamente");
      return true;
    } catch (error: any) {
      console.error("❌ [AUTH-CONTEXT] Error detallado en logout:", error);
      console.log("AuthContext: Tipo de error:", error.name);
      console.log("AuthContext: Mensaje de error:", error.message);
      console.log("AuthContext: Stack trace:", error.stack);
      setError(error.message || "Error al cerrar sesión");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login con Google
  const googleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await loginWithGoogle();

      // Si el usuario es null (redirección), retornar null
      if (!user) {
        console.log("Redirección iniciada con Google");
        return null;
      }

      // User es un objeto Firebase User válido
      const appUser: User = {
        uid: user.uid || '',
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        phoneNumber: user.phoneNumber || '',
        emailVerified: user.emailVerified,
        getIdToken: () => user.getIdToken(),
      };

      return appUser;
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión con Google");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login con Apple
  const appleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      // loginWithApple siempre devuelve null porque usamos redirección directa
      await loginWithApple();

      console.log("Redirección a Apple iniciada, no hay usuario inmediato");
      // Siempre retornamos null porque redireccionamos
      return null;
    } catch (err: any) {
      console.error("Error detallado en appleLogin:", err);
      setError(err.message || "Error al iniciar sesión con Apple");
      throw err;
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
    loginWithGoogle: googleLogin,
    loginWithApple: appleLogin,
    sendPasswordResetEmail,
    sendEmailLoginLink,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
