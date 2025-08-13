/**
 * 🔀 MANEJADOR DE TOKENS OAUTH
 * Procesa custom tokens de OAuth directo
 */

import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase';

/**
 * Procesa tokens OAuth desde URL parameters
 */
export const processOAuthToken = async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const provider = urlParams.get('provider');
    const error = urlParams.get('error');
    
    if (error) {
      console.error('❌ [OAUTH-TOKEN] Error en OAuth:', error);
      throw new Error(getErrorMessage(error));
    }
    
    if (token && provider) {
      console.log(`✅ [OAUTH-TOKEN] Procesando token de ${provider}...`);
      
      // Usar custom token para autenticar en Firebase
      const userCredential = await signInWithCustomToken(auth, token);
      const user = userCredential.user;
      
      console.log(`✅ [OAUTH-TOKEN] Usuario autenticado via ${provider}:`, user.email);
      
      // Limpiar URL parameters
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      
      return user;
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ [OAUTH-TOKEN] Error procesando token:', error);
    throw error;
  }
};

/**
 * Convierte códigos de error a mensajes amigables
 */
function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'google_auth_failed':
      return 'Error al autenticar con Google. Intenta nuevamente.';
    case 'apple_auth_failed':
      return 'Error al autenticar con Apple. Intenta nuevamente.';
    default:
      return 'Error de autenticación. Intenta nuevamente.';
  }
}

/**
 * Verifica si hay un token OAuth en la URL al cargar la página
 */
export const checkForOAuthToken = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('token') || urlParams.has('error');
};