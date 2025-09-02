/**
 * 🔥 FIREBASE AUTH SERVICE - SISTEMA COMPLETO DE AUTENTICACIÓN
 * 
 * Implementación directa con Firebase Auth
 * Incluye: Email/Password, OTP, Magic Links
 */

import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, saveUserProfile } from '@/lib/firebase';

export class FirebaseAuthService {
  
  /**
   * REGISTRO CON EMAIL Y PASSWORD
   */
  static async registerWithPassword(email: string, password: string, displayName: string) {
    try {
      console.log('🔥 [FIREBASE-AUTH] Registering user:', email);
      
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Actualizar nombre de usuario
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      // Enviar email de verificación
      await sendEmailVerification(user);
      
      // Guardar perfil en Firestore
      await saveUserProfile(user.uid, {
        email: user.email,
        displayName: displayName,
        emailVerified: false,
        createdAt: new Date(),
        authProvider: 'email',
        subscription: {
          plan: 'free',
          status: 'active'
        },
        profileComplete: true // Email/password sí tiene nombre
      });
      
      console.log('✅ [FIREBASE-AUTH] User registered successfully');
      return { success: true, user, requiresVerification: true };
      
    } catch (error: any) {
      console.error('❌ [FIREBASE-AUTH] Registration error:', error);
      return { 
        success: false, 
        error: this.getErrorMessage(error.code) 
      };
    }
  }
  
  /**
   * LOGIN CON EMAIL Y PASSWORD
   */
  static async loginWithPassword(email: string, password: string) {
    try {
      console.log('🔥 [FIREBASE-AUTH] Logging in user:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Verificar si el email está verificado
      if (!user.emailVerified) {
        console.warn('⚠️ [FIREBASE-AUTH] Email not verified');
        // Opcionalmente reenviar email
        await sendEmailVerification(user);
      }
      
      console.log('✅ [FIREBASE-AUTH] Login successful');
      return { success: true, user };
      
    } catch (error: any) {
      console.error('❌ [FIREBASE-AUTH] Login error:', error);
      return { 
        success: false, 
        error: this.getErrorMessage(error.code) 
      };
    }
  }
  
  /**
   * MAGIC LINK / OTP VIA EMAIL
   */
  static async sendMagicLink(email: string) {
    try {
      console.log('🔗 [FIREBASE-AUTH] Sending magic link to:', email);
      
      const actionCodeSettings = {
        url: `${window.location.origin}/auth-callback`,
        handleCodeInApp: true
      };
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Guardar email para verificación posterior
      window.localStorage.setItem('emailForSignIn', email);
      
      console.log('✅ [FIREBASE-AUTH] Magic link sent');
      return { success: true, message: 'Link enviado a tu email' };
      
    } catch (error: any) {
      console.error('❌ [FIREBASE-AUTH] Magic link error:', error);
      return { 
        success: false, 
        error: this.getErrorMessage(error.code) 
      };
    }
  }
  
  /**
   * VERIFICAR MAGIC LINK
   */
  static async verifyMagicLink(email: string, link: string) {
    try {
      console.log('🔗 [FIREBASE-AUTH] Verifying magic link');
      
      const result = await signInWithEmailLink(auth, email, link);
      
      // Crear perfil si es nuevo usuario
      if (result.user) {
        await saveUserProfile(result.user.uid, {
          email: result.user.email,
          emailVerified: true,
          createdAt: new Date(),
          authProvider: 'magic-link',
          subscription: {
            plan: 'free',
            status: 'active'
          },
          // Marcamos que necesita completar perfil
          profileComplete: false
        });
      }
      
      console.log('✅ [FIREBASE-AUTH] Magic link verified');
      return { success: true, user: result.user };
      
    } catch (error: any) {
      console.error('❌ [FIREBASE-AUTH] Magic link verification error:', error);
      return { 
        success: false, 
        error: this.getErrorMessage(error.code) 
      };
    }
  }
  
  /**
   * RESET PASSWORD
   */
  static async resetPassword(email: string) {
    try {
      console.log('🔑 [FIREBASE-AUTH] Sending password reset to:', email);
      
      await sendPasswordResetEmail(auth, email);
      
      console.log('✅ [FIREBASE-AUTH] Password reset email sent');
      return { success: true, message: 'Email de recuperación enviado' };
      
    } catch (error: any) {
      console.error('❌ [FIREBASE-AUTH] Password reset error:', error);
      return { 
        success: false, 
        error: this.getErrorMessage(error.code) 
      };
    }
  }
  
  /**
   * LOGOUT
   */
  static async logout() {
    try {
      console.log('🚪 [FIREBASE-AUTH] Logging out');
      await signOut(auth);
      console.log('✅ [FIREBASE-AUTH] Logout successful');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [FIREBASE-AUTH] Logout error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * OBSERVER DE ESTADO
   */
  static onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
  
  /**
   * MENSAJES DE ERROR AMIGABLES
   */
  private static getErrorMessage(code: string): string {
    const errorMessages: { [key: string]: string } = {
      'auth/email-already-in-use': 'Este email ya está registrado',
      'auth/invalid-email': 'Email inválido',
      'auth/operation-not-allowed': 'Operación no permitida',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
      'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
      'auth/user-not-found': 'No existe una cuenta con este email',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/invalid-credential': 'Email o contraseña incorrectos',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
      'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
      'auth/popup-closed-by-user': 'Ventana cerrada antes de completar',
      'auth/unauthorized-domain': 'Dominio no autorizado para esta operación',
      'auth/invalid-action-code': 'El link ha expirado o es inválido'
    };
    
    return errorMessages[code] || 'Error en autenticación. Intenta de nuevo';
  }
}

/**
 * HOOK PERSONALIZADO PARA FIREBASE AUTH
 */
export const useFirebaseAuth = () => {
  const registerUser = async (email: string, password: string, name: string) => {
    return FirebaseAuthService.registerWithPassword(email, password, name);
  };
  
  const loginUser = async (email: string, password: string) => {
    return FirebaseAuthService.loginWithPassword(email, password);
  };
  
  const sendMagicLink = async (email: string) => {
    return FirebaseAuthService.sendMagicLink(email);
  };
  
  const verifyMagicLink = async (email: string, link: string) => {
    return FirebaseAuthService.verifyMagicLink(email, link);
  };
  
  const resetPassword = async (email: string) => {
    return FirebaseAuthService.resetPassword(email);
  };
  
  const logout = async () => {
    return FirebaseAuthService.logout();
  };
  
  return {
    registerUser,
    loginUser,
    sendMagicLink,
    verifyMagicLink,
    resetPassword,
    logout
  };
};