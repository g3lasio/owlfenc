/**
 * Firebase Error Handling Compatibility
 * Provides error handling for Firebase-related errors during Clerk migration
 */

export function safeFirebaseError(error: any) {
  console.warn('🔄 [FIREBASE-ERROR-FIX] Error processing for Clerk migration:', error?.message || error);
  return error;
}

export function getErrorMessage(error: any): string {
  // Common Firebase error codes mapped to user-friendly messages
  const errorMessages: { [key: string]: string } = {
    'auth/invalid-email': 'El formato del email no es válido',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'auth/user-not-found': 'No se encontró una cuenta con este email',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/email-already-in-use': 'Ya existe una cuenta con este email',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
    'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
    'auth/operation-not-allowed': 'Operación no permitida',
  };

  const code = error?.code;
  if (code && errorMessages[code]) {
    return errorMessages[code];
  }

  // Default error message
  return error?.message || 'Ha ocurrido un error inesperado';
}