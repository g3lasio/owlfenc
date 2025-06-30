import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, updateProfile, getRedirectResult } from 'firebase/auth';
import { 
  auth,
  loginUser, 
  registerUser, 
  logoutUser,
  loginWithGoogle,
  loginWithApple,
  sendEmailLink,
  resetPassword,
  devMode
} from '../lib/firebase';

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
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, displayName: string) => Promise<User>;
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
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
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

  useEffect(() => {
    // Primero verificamos si hay algún resultado de redirección pendiente
    const checkRedirectResult = async () => {
      try {
        console.log("Verificando resultado de redirección...");
        const result = await getRedirectResult(auth);
        
        if (result && result.user) {
          console.log("Resultado de redirección procesado exitosamente:", result.user);
          // No necesitamos hacer nada más, onAuthStateChanged capturará este login
        }
      } catch (error) {
        console.error("Error procesando resultado de redirección:", error);
        // No seteamos el error aquí, para evitar confusión al usuario
      }
    };
    
    // Ejecutamos inmediatamente
    checkRedirectResult();
    
    // Escuchar cambios en la autenticación
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Usuario autenticado detectado:", user.uid);
        // Convertir al tipo User para usar en nuestra aplicación
        const appUser: User = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified,
          getIdToken: () => user.getIdToken()
        };
        setCurrentUser(appUser);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    
    // Escuchamos el evento personalizado para el modo de desarrollo
    const handleDevAuthChange = (event: any) => {
      const { user } = event.detail;
      console.log("Evento de auth detectado en modo de desarrollo:", user);
      if (user) {
        // Convertir al tipo User para usar en nuestra aplicación
        const appUser: User = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified,
          getIdToken: () => user.getIdToken()
        };
        setCurrentUser(appUser);
      }
      setLoading(false);
    };
    
    // Registrar el evento personalizado
    window.addEventListener('dev-auth-change', handleDevAuthChange);

    // Limpiar las suscripciones al desmontar
    return () => {
      unsubscribe();
      window.removeEventListener('dev-auth-change', handleDevAuthChange);
    };
  }, []);

  // Iniciar sesión con email y contraseña
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const user = await loginUser(email, password);

      if (!user) {
        throw new Error('No se pudo iniciar sesión');
      }

      const appUser: User = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        getIdToken: () => user.getIdToken()
      };

      return appUser;
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Registrar nuevo usuario
  const register = async (email: string, password: string, displayName: string) => {
    try {
      setLoading(true);
      setError(null);
      const user = await registerUser(email, password);

      // Para Firebase, actualizamos el displayName después del registro
      if (user && displayName) {
        await updateProfile(auth.currentUser!, {
          displayName: displayName
        });
      }

      const appUser: User = {
        uid: user.uid,
        email: user.email,
        displayName: displayName, // Usamos el displayName proporcionado
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        getIdToken: () => user.getIdToken()
      };

      // Enviar correo de bienvenida
      try {
        // Importamos de forma dinámica para evitar problemas de dependencia circular
        const emailService = await import('../services/emailService');
        
        // Enviamos el correo de bienvenida en segundo plano
        emailService.sendWelcomeEmail(
          email,
          displayName || ''
        ).then(success => {
          if (success) {
            console.log('Correo de bienvenida enviado con éxito');
          } else {
            console.error('No se pudo enviar el correo de bienvenida');
          }
        }).catch(error => {
          console.error('Error al enviar correo de bienvenida:', error);
        });
      } catch (emailError) {
        // No bloqueamos el registro si falla el envío del correo
        console.error('Error al cargar servicio de correo:', emailError);
      }

      return appUser;
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Cerrar sesión
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("AuthContext: Iniciando proceso de signOut");
      await logoutUser();
      console.log("AuthContext: signOut completado exitosamente");
      return true;
    } catch (error: any) {
      console.error("AuthContext: Error detallado en logout:", error);
      console.log("AuthContext: Tipo de error:", error.name);
      console.log("AuthContext: Mensaje de error:", error.message);
      console.log("AuthContext: Stack trace:", error.stack);
      setError(error.message || 'Error al cerrar sesión');
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
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified
      };

      return appUser;
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google');
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
      setError(err.message || 'Error al iniciar sesión con Apple');
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
      setError(err.message || 'Error al enviar email de recuperación');
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
      setError(err.message || 'Error al enviar enlace de inicio de sesión');
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
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}