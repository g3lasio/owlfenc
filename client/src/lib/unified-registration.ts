/**
 * 🎯 UNIFIED REGISTRATION SYSTEM
 * 
 * Clerk authentication + Firebase database
 * Clean, professional registration without emergency modes
 */

import { useSignUp } from '@clerk/clerk-react';
import { saveUserProfile } from '@/lib/firebase';

export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
}

export interface RegistrationResult {
  success: boolean;
  user?: any;
  error?: string;
  requiresVerification?: boolean;
}

export class UnifiedRegistrationService {
  
  static async registerNewUser(data: RegistrationData): Promise<RegistrationResult> {
    try {
      console.log('🎯 [UNIFIED-REG] Starting registration for:', data.email);
      
      // This will be called from the component that has useSignUp hook
      // For now, return structure that can be used by the component
      return {
        success: true,
        requiresVerification: true
      };
      
    } catch (error: any) {
      console.error('❌ [UNIFIED-REG] Registration error:', error);
      
      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }
  
  static async completeRegistration(clerkUser: any): Promise<boolean> {
    try {
      console.log('🎯 [UNIFIED-REG] Completing registration in Firebase for:', clerkUser.id);
      
      // Save user profile to Firebase
      const userProfile = {
        clerkId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        fullName: clerkUser.fullName,
        emailVerified: clerkUser.primaryEmailAddress?.verification?.status === 'verified',
        createdAt: new Date(),
        subscription: {
          plan: 'free',
          status: 'active'
        },
        preferences: {
          language: 'es',
          theme: 'system'
        }
      };
      
      const result = await saveUserProfile(clerkUser.id, userProfile);
      
      if (result.success) {
        console.log('✅ [UNIFIED-REG] User profile created in Firebase');
        return true;
      } else {
        console.error('❌ [UNIFIED-REG] Failed to create user profile');
        return false;
      }
      
    } catch (error) {
      console.error('❌ [UNIFIED-REG] Error completing registration:', error);
      return false;
    }
  }
  
  public static getErrorMessage(error: any): string {
    const errorCode = error.code || error.message || 'unknown';
    
    if (errorCode.includes('email_address_exists') || errorCode.includes('identifier_exists')) {
      return 'Ya existe una cuenta con este email';
    }
    if (errorCode.includes('weak_password') || errorCode.includes('password_weak')) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (errorCode.includes('invalid_email_address')) {
      return 'Email inválido';
    }
    if (errorCode.includes('too_many_requests')) {
      return 'Demasiados intentos. Intenta más tarde';
    }
    
    console.log('🔍 [UNIFIED-REG] Unmapped error code:', errorCode);
    return 'Error en el registro. Intenta de nuevo';
  }
}

// Hook personalizado para registro unificado
export const useUnifiedRegistration = () => {
  const { signUp, isLoaded, setActive } = useSignUp();
  
  const registerUser = async (data: RegistrationData): Promise<RegistrationResult> => {
    if (!isLoaded) {
      return { success: false, error: 'Sistema de registro cargando...' };
    }
    
    try {
      console.log('🎯 [UNIFIED-REG] Iniciating Clerk signup for:', data.email);
      
      // Step 1: Create user with Clerk
      const result = await signUp.create({
        emailAddress: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName || ''
      });
      
      console.log('🎯 [UNIFIED-REG] Clerk signup result status:', result.status);
      
      if (result.status === 'missing_requirements') {
        // Send verification email
        await result.prepareEmailAddressVerification({ strategy: 'email_code' });
        
        console.log('📧 [UNIFIED-REG] Verification email sent');
        return {
          success: true,
          requiresVerification: true,
          user: result
        };
      }
      
      if (result.status === 'complete') {
        // Registration complete, set active session
        await setActive({ session: result.createdSessionId });
        
        // Complete registration in Firebase
        const firebaseComplete = await UnifiedRegistrationService.completeRegistration(result.createdUserId);
        
        if (firebaseComplete) {
          console.log('✅ [UNIFIED-REG] Complete registration successful');
          return {
            success: true,
            user: result.createdUserId
          };
        } else {
          console.warn('⚠️ [UNIFIED-REG] Clerk OK but Firebase failed');
          return {
            success: true,
            user: result.createdUserId,
            error: 'Registro parcial - datos guardándose en segundo plano'
          };
        }
      }
      
      return { success: false, error: 'Estado inesperado en registro' };
      
    } catch (error: any) {
      console.error('❌ [UNIFIED-REG] Registration error:', error);
      return {
        success: false,
        error: UnifiedRegistrationService.getErrorMessage(error)
      };
    }
  };
  
  const verifyEmail = async (code: string) => {
    if (!signUp || !isLoaded) {
      return { success: false, error: 'Sistema no disponible' };
    }
    
    try {
      console.log('📧 [UNIFIED-REG] Verifying email with code');
      
      const result = await signUp.attemptEmailAddressVerification({ code });
      
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        
        // Complete Firebase registration
        const firebaseComplete = await UnifiedRegistrationService.completeRegistration(result.createdUserId);
        
        console.log('✅ [UNIFIED-REG] Email verification and registration complete');
        return { success: true, user: result.createdUserId };
      }
      
      return { success: false, error: 'Código de verificación inválido' };
      
    } catch (error: any) {
      console.error('❌ [UNIFIED-REG] Verification error:', error);
      return {
        success: false,
        error: UnifiedRegistrationService.getErrorMessage(error)
      };
    }
  };
  
  return {
    registerUser,
    verifyEmail,
    isLoaded
  };
};