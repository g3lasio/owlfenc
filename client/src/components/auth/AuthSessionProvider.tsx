/**
 * AuthSessionProvider - Sistema de autenticación unificado basado en cookies de sesión
 * 
 * Este componente reemplaza los sistemas problemáticos anteriores y proporciona
 * autenticación confiable basada en cookies HTTP-only del servidor.
 * 
 * Flujo:
 * 1. Usuario hace login con Firebase
 * 2. Se obtiene el ID token de Firebase
 * 3. Se envía al backend que crea una cookie de sesión HTTP-only
 * 4. Todas las peticiones usan la cookie automáticamente
 * 5. El token se refresca automáticamente antes de expirar
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  currentUser: FirebaseUser | null; // Alias para compatibilidad con código legacy
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>; // Alias para compatibilidad con código legacy
  refreshSession: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthSessionProvider');
  }
  return context;
}

interface AuthSessionProviderProps {
  children: ReactNode;
}

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionEstablished, setSessionEstablished] = useState(false);

  /**
   * Convierte el token de Firebase en una cookie de sesión del servidor
   */
  const establishServerSession = async (firebaseUser: FirebaseUser): Promise<boolean> => {
    try {
      console.log('🔐 [AUTH-SESSION] Estableciendo sesión en el servidor...');
      
      const idToken = await firebaseUser.getIdToken();
      
      const response = await fetch('/api/sessionLogin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // CRÍTICO: incluir cookies
        body: JSON.stringify({ idToken })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [AUTH-SESSION] Error creando sesión:', errorData);
        return false;
      }

      const data = await response.json();
      console.log('✅ [AUTH-SESSION] Sesión establecida correctamente:', data.user.email);
      console.log('📅 [AUTH-SESSION] Expira en:', new Date(data.user.sessionExpiry).toLocaleString());
      
      return true;
    } catch (error) {
      console.error('❌ [AUTH-SESSION] Error estableciendo sesión:', error);
      return false;
    }
  };

  /**
   * Refresca la sesión del servidor antes de que expire
   */
  const refreshSession = async (): Promise<void> => {
    try {
      if (!user) {
        console.warn('⚠️ [AUTH-SESSION] No hay usuario para refrescar sesión');
        return;
      }

      console.log('🔄 [AUTH-SESSION] Refrescando sesión...');
      await establishServerSession(user);
    } catch (error) {
      console.error('❌ [AUTH-SESSION] Error refrescando sesión:', error);
    }
  };

  /**
   * Verifica el estado de la sesión actual
   */
  const checkSessionStatus = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/sessionStatus', {
        credentials: 'include'
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.authenticated === true;
    } catch (error) {
      console.error('❌ [AUTH-SESSION] Error verificando sesión:', error);
      return false;
    }
  };

  /**
   * Maneja el login con email y password
   */
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setError(null);
      setLoading(true);

      console.log('🔐 [AUTH-SESSION] Iniciando login para:', email);

      // 1. Autenticar con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ [AUTH-SESSION] Autenticado con Firebase:', userCredential.user.uid);

      // 2. Establecer sesión en el servidor
      const sessionCreated = await establishServerSession(userCredential.user);
      
      if (!sessionCreated) {
        throw new Error('No se pudo establecer la sesión en el servidor');
      }

      setSessionEstablished(true);
      setUser(userCredential.user);
      
      console.log('✅ [AUTH-SESSION] Login completado exitosamente');
    } catch (err: any) {
      console.error('❌ [AUTH-SESSION] Error en login:', err);
      setError(err.message || 'Error al iniciar sesión');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el registro de nuevo usuario
   */
  const register = async (email: string, password: string, name: string): Promise<void> => {
    try {
      setError(null);
      setLoading(true);

      console.log('📝 [AUTH-SESSION] Iniciando registro para:', email);

      // 1. Crear usuario en Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ [AUTH-SESSION] Usuario creado en Firebase:', userCredential.user.uid);

      // 2. Actualizar perfil con el nombre
      await updateProfile(userCredential.user, { displayName: name });
      console.log('✅ [AUTH-SESSION] Perfil actualizado con nombre:', name);

      // 3. Establecer sesión en el servidor
      const sessionCreated = await establishServerSession(userCredential.user);
      
      if (!sessionCreated) {
        throw new Error('No se pudo establecer la sesión en el servidor');
      }

      setSessionEstablished(true);
      setUser(userCredential.user);
      
      console.log('✅ [AUTH-SESSION] Registro completado exitosamente');
    } catch (err: any) {
      console.error('❌ [AUTH-SESSION] Error en registro:', err);
      setError(err.message || 'Error al registrar usuario');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Limpia el error actual
   */
  const clearError = (): void => {
    setError(null);
  };

  /**
   * Maneja el logout
   */
  const signOut = async (): Promise<void> => {
    try {
      console.log('🔓 [AUTH-SESSION] Cerrando sesión...');

      // 1. Limpiar sesión del servidor
      await fetch('/api/sessionLogout', {
        method: 'POST',
        credentials: 'include'
      });

      // 2. Cerrar sesión en Firebase
      await firebaseSignOut(auth);

      setUser(null);
      setSessionEstablished(false);
      
      console.log('✅ [AUTH-SESSION] Sesión cerrada correctamente');
    } catch (err: any) {
      console.error('❌ [AUTH-SESSION] Error cerrando sesión:', err);
      setError(err.message || 'Error al cerrar sesión');
    }
  };

  // Listener de cambios en el estado de autenticación de Firebase
  useEffect(() => {
    console.log('🔄 [AUTH-SESSION] Inicializando listener de autenticación...');

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('✅ [AUTH-SESSION] Usuario Firebase detectado:', firebaseUser.email);
        
        // Verificar si ya existe una sesión válida en el servidor
        const hasValidSession = await checkSessionStatus();
        
        if (!hasValidSession && !sessionEstablished) {
          console.log('⚠️ [AUTH-SESSION] No hay sesión válida, estableciendo...');
          await establishServerSession(firebaseUser);
          setSessionEstablished(true);
        }
        
        setUser(firebaseUser);
      } else {
        console.log('❌ [AUTH-SESSION] No hay usuario autenticado');
        setUser(null);
        setSessionEstablished(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sessionEstablished]);

  // Listener para refrescar el token antes de que expire
  useEffect(() => {
    if (!user) return;

    console.log('🔄 [AUTH-SESSION] Configurando refresco automático de token...');

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('🔄 [AUTH-SESSION] Token de Firebase actualizado, refrescando sesión...');
        await establishServerSession(firebaseUser);
      }
    });

    // También refrescar cada 50 minutos (las cookies duran 5 días pero refrescamos antes)
    const refreshInterval = setInterval(() => {
      console.log('⏰ [AUTH-SESSION] Refresco programado de sesión...');
      refreshSession();
    }, 50 * 60 * 1000); // 50 minutos

    return () => {
      unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [user]);

  const value: AuthContextType = {
    user,
    currentUser: user, // Alias para compatibilidad
    loading,
    error,
    signIn,
    signOut,
    logout: signOut, // Alias para compatibilidad con código legacy
    refreshSession,
    register,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
