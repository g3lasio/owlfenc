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

  useEffect(() => {
    // 🚫 DESHABILITADO: Sistema AuthContext.tsx original 
    // Este useEffect causaba múltiples onAuthStateChanged listeners
    // y fetch requests continuos. Ahora usa unifiedAuthManager.
    
    console.log('⚠️ [OLD-AUTH-CONTEXT] Sistema deshabilitado - usando unifiedAuthManager');
    
    // Marcar como inicializado inmediatamente para no bloquear la UI
    setIsInitializing(false);
    setLoading(false);
    
    // Cleanup function que no hace nada
    return () => {};
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
        getIdToken: () => user.getIdToken(),
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
        getIdToken: () => user.getIdToken(),
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
