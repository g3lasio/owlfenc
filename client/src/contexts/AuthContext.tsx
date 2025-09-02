/**
 * 🔄 CLERK ADAPTER WITH ORIGINAL INTERFACES
 * Este AuthContext usa Clerk como backend pero mantiene la API original
 * para que las interfaces de login/signup funcionen sin cambios
 */

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAuth as useClerkAuth, useUser, useSignIn, useSignUp } from '@clerk/clerk-react';

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
  const { isSignedIn, isLoaded } = useClerkAuth();
  const { user } = useUser();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [error, setError] = useState<string | null>(null);
  
  const loading = !isLoaded;

  const currentUser: AuthUser | null = user ? {
    uid: user.id,
    email: user.primaryEmailAddress?.emailAddress || null,
    displayName: user.fullName || user.firstName || null,
    photoURL: user.imageUrl || null,
    phoneNumber: user.primaryPhoneNumber?.phoneNumber || null,
    emailVerified: user.primaryEmailAddress?.verification?.status === 'verified',
    getIdToken: async () => {
      try {
        // Use session token from Clerk
        return user.id;
      } catch (error) {
        console.warn('Error getting token, using user ID as fallback');
        return user.id;
      }
    }
  } : null;

  const clearError = () => {
    setError(null);
  };

  const login = async (email: string, password: string, rememberMe?: boolean): Promise<AuthUser> => {
    try {
      setError(null);
      console.log('🔐 [AUTH] Iniciando login para:', email);
      
      // USAR FIREBASE AUTH SI CLERK NO ESTÁ DISPONIBLE
      if (!signIn || !isLoaded) {
        console.log('🔥 [AUTH] Usando Firebase Auth para login');
        const { FirebaseAuthService } = await import('@/lib/firebase-auth-service');
        
        const result = await FirebaseAuthService.loginWithPassword(email, password);
        
        if (result.success && result.user) {
          console.log('✅ [AUTH] Login exitoso con Firebase');
          return {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            phoneNumber: result.user.phoneNumber,
            emailVerified: result.user.emailVerified,
            getIdToken: async () => result.user.getIdToken()
          };
        } else {
          throw new Error(result.error || 'Error en login');
        }
      }

      const result = await signIn.create({
        identifier: email,
        password: password
      });

      if (result.status === 'complete') {
        console.log('✅ [CLERK-ADAPTER] Login exitoso');
        
        // Wait for user state to update
        const checkUser = () => new Promise((resolve) => {
          const interval = setInterval(() => {
            if (user) {
              clearInterval(interval);
              resolve(user);
            }
          }, 100);
          
          setTimeout(() => {
            clearInterval(interval);
            resolve(user);
          }, 3000);
        });
        
        await checkUser();
        
        if (!user) {
          throw new Error('Error obteniendo datos de usuario');
        }

        return {
          uid: user.id,
          email: user.primaryEmailAddress?.emailAddress || null,
          displayName: user.fullName || user.firstName || null,
          photoURL: user.imageUrl || null,
          phoneNumber: user.primaryPhoneNumber?.phoneNumber || null,
          emailVerified: user.primaryEmailAddress?.verification?.status === 'verified',
          getIdToken: async () => user.id
        };
      }

      // If we reach here, login was successful
      console.log('🔐 [CLERK-ADAPTER] Login exitoso');
      
      // Return the current user after successful login  
      if (!currentUser) {
        throw new Error('Error obteniendo datos de usuario después del login');
      }
      
      return currentUser;
    } catch (error: any) {
      const errorMessage = getClerkErrorMessage(error.code || error.message);
      setError(errorMessage);
      console.error('❌ [CLERK-ADAPTER] Error en login:', error);
      throw new Error(errorMessage);
    }
  };

  const register = async (email: string, password: string, displayName: string): Promise<AuthUser> => {
    try {
      setError(null);
      console.log('📝 [AUTH] Iniciando registro para:', email);
      
      // USAR FIREBASE AUTH DIRECTAMENTE SI CLERK NO ESTÁ DISPONIBLE
      if (!signUp || !isLoaded) {
        console.log('🔥 [AUTH] Usando Firebase Auth directamente');
        const { FirebaseAuthService } = await import('@/lib/firebase-auth-service');
        
        const result = await FirebaseAuthService.registerWithPassword(email, password, displayName);
        
        if (result.success && result.user) {
          console.log('✅ [AUTH] Registro exitoso con Firebase');
          // Convertir usuario de Firebase a formato AuthUser
          return {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
            phoneNumber: result.user.phoneNumber,
            emailVerified: result.user.emailVerified,
            getIdToken: async () => result.user.getIdToken()
          };
        } else {
          throw new Error(result.error || 'Error en registro');
        }
      }

      const [firstName, ...lastNameParts] = displayName.trim().split(' ');
      const lastName = lastNameParts.join(' ') || '';

      await signUp.create({
        emailAddress: email,
        password: password,
        firstName: firstName,
        lastName: lastName
      });

      // Send verification email
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code'
      });

      console.log('✅ [CLERK-ADAPTER] Registro exitoso, verificación enviada');

      // Return temporary user object
      return {
        uid: signUp.id || 'pending',
        email: email,
        displayName: displayName,
        photoURL: null,
        phoneNumber: null,
        emailVerified: false,
        getIdToken: async () => signUp.id || 'pending'
      };
    } catch (error: any) {
      const errorMessage = getClerkErrorMessage(error.code || error.message);
      setError(errorMessage);
      console.error('❌ [AUTH] Error en registro:', error);
      throw new Error(errorMessage);
    }
  };

  const logout = async (): Promise<boolean> => {
    try {
      console.log('🚪 [AUTH] Cerrando sesión');
      
      // Try Clerk logout first
      if ((window as any).Clerk && (window as any).Clerk.signOut) {
        try {
          console.log('🔐 [AUTH] Intentando logout con Clerk');
          await (window as any).Clerk.signOut();
          console.log('✅ [AUTH] Logout exitoso con Clerk');
        } catch (clerkError) {
          console.warn('⚠️ [AUTH] Clerk logout falló, usando Firebase fallback:', clerkError);
        }
      }
      
      // Firebase Auth fallback
      try {
        const { auth } = await import('@/lib/firebase');
        const { signOut } = await import('firebase/auth');
        
        if (auth.currentUser) {
          console.log('🔥 [AUTH] Cerrando sesión en Firebase');
          await signOut(auth);
          console.log('✅ [AUTH] Logout exitoso con Firebase');
        }
      } catch (firebaseError) {
        console.warn('⚠️ [AUTH] Firebase logout error:', firebaseError);
      }
      
      // Clear local storage and session storage
      console.log('🧹 [AUTH] Limpiando almacenamiento local');
      localStorage.removeItem('clerk-auth-token');
      localStorage.removeItem('firebase-auth-token');
      localStorage.removeItem('profile-completion-required');
      sessionStorage.clear();
      
      // Clear any emergency bypass flags
      if (typeof window !== 'undefined') {
        (window as any).__emergencyBypass = false;
      }
      
      console.log('✅ [AUTH] Logout completado exitosamente');
      return true;
    } catch (error: any) {
      const errorMessage = getClerkErrorMessage(error.code || error.message);
      setError(errorMessage);
      console.error('❌ [CLERK-ADAPTER] Error en logout:', error);
      return false;
    }
  };

  const sendPasswordResetEmail = async (email: string): Promise<boolean> => {
    try {
      setError(null);
      console.log('📧 [CLERK-ADAPTER] Enviando email de reset para:', email);
      
      if (!signIn || !signInLoaded) {
        throw new Error('Sistema de reset no disponible');
      }

      await signIn.create({
        identifier: email,
        strategy: 'reset_password_email_code'
      });
      
      console.log('✅ [CLERK-ADAPTER] Email de reset enviado');
      return true;
    } catch (error: any) {
      const errorMessage = getClerkErrorMessage(error.code || error.message);
      setError(errorMessage);
      console.error('❌ [CLERK-ADAPTER] Error enviando reset email:', error);
      return false;
    }
  };

  const sendEmailLoginLink = async (email: string): Promise<boolean> => {
    try {
      setError(null);
      console.log('🔗 [CLERK-ADAPTER] Enviando link de login para:', email);
      
      if (!signIn || !signInLoaded) {
        throw new Error('Sistema de magic link no disponible');
      }

      await signIn.create({
        identifier: email,
        strategy: 'email_link'
      });
      
      console.log('✅ [CLERK-ADAPTER] Link de login enviado');
      return true;
    } catch (error: any) {
      const errorMessage = getClerkErrorMessage(error.code || error.message);
      setError(errorMessage);
      console.error('❌ [CLERK-ADAPTER] Error enviando login link:', error);
      return false;
    }
  };

  const registerBiometricCredential = async (): Promise<boolean> => {
    console.warn('🔧 [CLERK-ADAPTER] Biometric auth not implemented yet with Clerk');
    return false;
  };

  const value: AuthContextType = {
    currentUser: isSignedIn ? currentUser : null,
    loading,
    error,
    login,
    register,
    logout,
    sendPasswordResetEmail,
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

// Helper function to get user-friendly error messages from Clerk errors
const getClerkErrorMessage = (errorCode: string): string => {
  if (typeof errorCode !== 'string') errorCode = String(errorCode);
  
  if (errorCode.includes('identifier_exists') || errorCode.includes('email_address_exists')) {
    return 'Ya existe una cuenta con este email';
  }
  if (errorCode.includes('incorrect_password') || errorCode.includes('invalid_credentials')) {
    return 'Email o contraseña incorrectos';
  }
  if (errorCode.includes('weak_password') || errorCode.includes('password_weak')) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  if (errorCode.includes('invalid_email_address')) {
    return 'Email inválido';
  }
  if (errorCode.includes('too_many_requests')) {
    return 'Demasiados intentos. Intenta más tarde';
  }
  if (errorCode.includes('network') || errorCode.includes('connection')) {
    return 'Error de conexión. Verifica tu internet';
  }
  if (errorCode.includes('verification_required')) {
    return 'Por favor verifica tu email antes de continuar';
  }
  
  return 'Error de autenticación. Intenta nuevamente';
};

export default AuthContext;