/**
 * 🔥 FIREBASE AUTH CONTEXT - RESTORED ORIGINAL
 * Sistema de autenticación original con Firebase Auth completamente funcional
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  emailVerified?: boolean;
  getIdToken: () => Promise<string>;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  register: (email: string, password: string, displayName: string) => Promise<AuthUser>;
  logout: () => Promise<boolean>;
  sendPasswordResetEmail: (email: string) => Promise<boolean>;
  sendEmailLoginLink: (email: string) => Promise<boolean>;
  registerBiometricCredential?: () => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert Firebase User to AuthUser
  const convertFirebaseUser = (firebaseUser: User): AuthUser => ({
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    phoneNumber: firebaseUser.phoneNumber,
    emailVerified: firebaseUser.emailVerified,
    getIdToken: () => firebaseUser.getIdToken()
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log('✅ [FIREBASE-AUTH] Usuario autenticado:', firebaseUser.uid);
          setCurrentUser(convertFirebaseUser(firebaseUser));
        } else {
          console.log('🔒 [FIREBASE-AUTH] Usuario no autenticado');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('❌ [FIREBASE-AUTH] Error en estado de auth:', error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const clearError = () => {
    setError(null);
  };

  const login = async (email: string, password: string, rememberMe?: boolean): Promise<AuthUser> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔐 [FIREBASE-AUTH] Iniciando login para:', email);
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      const authUser = convertFirebaseUser(result.user);
      
      if (rememberMe) {
        // Store user preference for remember me
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('lastLoginEmail', email);
      }
      
      console.log('✅ [FIREBASE-AUTH] Login exitoso');
      return authUser;
    } catch (error: any) {
      const errorMessage = getFirebaseErrorMessage(error.code);
      setError(errorMessage);
      console.error('❌ [FIREBASE-AUTH] Error en login:', error);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string): Promise<AuthUser> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📝 [FIREBASE-AUTH] Iniciando registro para:', email);
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      await updateProfile(result.user, {
        displayName: displayName
      });
      
      const authUser = convertFirebaseUser(result.user);
      
      console.log('✅ [FIREBASE-AUTH] Registro exitoso');
      return authUser;
    } catch (error: any) {
      const errorMessage = getFirebaseErrorMessage(error.code);
      setError(errorMessage);
      console.error('❌ [FIREBASE-AUTH] Error en registro:', error);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('🚪 [FIREBASE-AUTH] Cerrando sesión');
      
      await signOut(auth);
      
      // Clear remember me data
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('lastLoginEmail');
      
      console.log('✅ [FIREBASE-AUTH] Logout exitoso');
      return true;
    } catch (error: any) {
      const errorMessage = getFirebaseErrorMessage(error.code);
      setError(errorMessage);
      console.error('❌ [FIREBASE-AUTH] Error en logout:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordResetEmailFunc = async (email: string): Promise<boolean> => {
    try {
      setError(null);
      console.log('📧 [FIREBASE-AUTH] Enviando email de reset para:', email);
      
      await sendPasswordResetEmail(auth, email);
      
      console.log('✅ [FIREBASE-AUTH] Email de reset enviado');
      return true;
    } catch (error: any) {
      const errorMessage = getFirebaseErrorMessage(error.code);
      setError(errorMessage);
      console.error('❌ [FIREBASE-AUTH] Error enviando reset email:', error);
      return false;
    }
  };

  const sendEmailLoginLink = async (email: string): Promise<boolean> => {
    try {
      setError(null);
      console.log('🔗 [FIREBASE-AUTH] Enviando link de login para:', email);
      
      const actionCodeSettings = {
        url: `${window.location.origin}/login/email-link-callback`,
        handleCodeInApp: true,
      };
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Store email for verification
      localStorage.setItem('emailForSignIn', email);
      
      console.log('✅ [FIREBASE-AUTH] Link de login enviado');
      return true;
    } catch (error: any) {
      const errorMessage = getFirebaseErrorMessage(error.code);
      setError(errorMessage);
      console.error('❌ [FIREBASE-AUTH] Error enviando login link:', error);
      return false;
    }
  };

  const registerBiometricCredential = async (): Promise<boolean> => {
    console.warn('🔧 [FIREBASE-AUTH] Biometric auth not implemented yet');
    return false;
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    sendPasswordResetEmail: sendPasswordResetEmailFunc,
    sendEmailLoginLink,
    registerBiometricCredential,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Helper function to get user-friendly error messages
const getFirebaseErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No existe una cuenta con este email';
    case 'auth/wrong-password':
      return 'Contraseña incorrecta';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con este email';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres';
    case 'auth/invalid-email':
      return 'Email inválido';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Intenta más tarde';
    case 'auth/network-request-failed':
      return 'Error de conexión. Verifica tu internet';
    case 'auth/user-disabled':
      return 'Esta cuenta ha sido deshabilitada';
    case 'auth/invalid-credential':
      return 'Credenciales inválidas';
    default:
      return 'Error de autenticación. Intenta nuevamente';
  }
};

export default AuthContext;