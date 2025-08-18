/**
 * FIREBASE ERROR FIX
 * Soluciona el problema de "TypeError: undefined is not an object (evaluating 'errorMessage.split')"
 */

import { FirebaseError } from 'firebase/app';

interface SafeFirebaseError {
  code: string;
  message: string;
  customData?: any;
  details?: string;
}

/**
 * Wrapper robusto para errores de Firebase
 * Previene crashes por undefined.split() y otros problemas
 */
export function safeFirebaseError(error: any): SafeFirebaseError {
  try {
    // Si es un FirebaseError normal
    if (error && typeof error === 'object' && error.code && error.message) {
      return {
        code: String(error.code || 'unknown-error'),
        message: String(error.message || 'Unknown Firebase error'),
        customData: error.customData || null,
        details: error.details ? String(error.details) : undefined
      };
    }

    // Si es un error genérico
    if (error instanceof Error) {
      return {
        code: 'generic-error',
        message: error.message,
        details: error.stack
      };
    }

    // Si es solo un string
    if (typeof error === 'string') {
      return {
        code: 'string-error',
        message: error
      };
    }

    // Error desconocido
    return {
      code: 'unknown-error',
      message: 'An unknown error occurred during authentication'
    };

  } catch (wrapperError) {
    // Si incluso nuestro wrapper falla
    console.error('❌ [FIREBASE-ERROR-FIX] Wrapper failed:', wrapperError);
    return {
      code: 'wrapper-error',
      message: 'Error handling failed'
    };
  }
}

/**
 * Extrae mensaje de error de manera segura
 * Previene el problema específico de errorMessage.split()
 */
export function getErrorMessage(error: any): string {
  try {
    const safeError = safeFirebaseError(error);
    
    // Mapeo de códigos de error comunes a mensajes amigables
    const errorMessages: Record<string, string> = {
      'auth/user-not-found': 'No account exists with this email address',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-email': 'Please enter a valid email address',
      'auth/email-already-in-use': 'An account already exists with this email',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later',
      'auth/network-request-failed': 'Network error. Please check your connection',
      'auth/invalid-credential': 'Invalid login credentials',
      'auth/account-exists-with-different-credential': 'Account exists with different sign-in method',
      'auth/popup-closed-by-user': 'Sign-in was cancelled',
      'auth/popup-blocked': 'Sign-in popup was blocked by browser',
      'auth/cancelled-popup-request': 'Sign-in was cancelled',
      'auth/internal-error': 'An internal error occurred. Please try again',
    };

    // Retornar mensaje personalizado o el mensaje original
    return errorMessages[safeError.code] || safeError.message;

  } catch (extractError) {
    console.error('❌ [FIREBASE-ERROR-FIX] Message extraction failed:', extractError);
    return 'Authentication error occurred';
  }
}

/**
 * Wrapper para operaciones de Firebase que pueden fallar
 */
export async function safeFirebaseOperation<T>(
  operation: () => Promise<T>,
  fallbackValue?: T
): Promise<{ success: boolean; data?: T; error?: SafeFirebaseError }> {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    const safeError = safeFirebaseError(error);
    console.error('🔥 [FIREBASE-SAFE-OP] Operation failed:', safeError);
    
    return {
      success: false,
      error: safeError,
      data: fallbackValue
    };
  }
}

/**
 * Hook para manejar estado de errores de Firebase de manera robusta
 */
export function useFirebaseErrorHandler() {
  const handleError = (error: any) => {
    const safeError = safeFirebaseError(error);
    const userMessage = getErrorMessage(error);
    
    console.error('🔥 [FIREBASE-ERROR]', {
      code: safeError.code,
      message: safeError.message,
      userMessage,
      timestamp: new Date().toISOString()
    });

    return {
      code: safeError.code,
      message: userMessage,
      technical: safeError.message
    };
  };

  return { handleError };
}