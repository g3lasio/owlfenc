/**
 * OAUTH CALLBACK HANDLER
 * Procesa los tokens devueltos por OAuth providers
 */

import { signInWithCustomToken, getAuth } from 'firebase/auth';

/**
 * Procesar callback de OAuth
 */
export async function handleOAuthCallback(): Promise<{ success: boolean; error?: string }> {
  console.log('🔍 [OAUTH-HANDLER] Verificando callback de OAuth...');
  
  // Obtener parámetros de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const provider = urlParams.get('provider');
  const error = urlParams.get('error');
  
  // Si hay error, manejarlo
  if (error) {
    console.error('❌ [OAUTH-HANDLER] Error de OAuth:', error);
    
    if (error === 'google_auth_failed') {
      return { 
        success: false, 
        error: 'Error al autenticar con Google. Por favor intenta de nuevo.' 
      };
    }
    if (error === 'apple_auth_failed') {
      return { 
        success: false, 
        error: 'Error al autenticar con Apple. Por favor intenta de nuevo.' 
      };
    }
    
    return { 
      success: false, 
      error: 'Error en la autenticación. Por favor intenta de nuevo.' 
    };
  }
  
  // Si no hay token, no es un callback
  if (!token) {
    console.log('ℹ️ [OAUTH-HANDLER] No es un callback de OAuth');
    return { success: false };
  }
  
  console.log('✅ [OAUTH-HANDLER] Token recibido de:', provider);
  
  try {
    // Autenticar con el custom token de Firebase
    const auth = getAuth();
    const userCredential = await signInWithCustomToken(auth, token);
    
    console.log('✅ [OAUTH-HANDLER] Usuario autenticado:', userCredential.user.email);
    
    // Limpiar la URL
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ [OAUTH-HANDLER] Error procesando token:', error);
    
    // Si el token es inválido o expirado
    if (error?.code === 'auth/invalid-custom-token') {
      return { 
        success: false, 
        error: 'Token de autenticación inválido. Por favor intenta de nuevo.' 
      };
    }
    
    return { 
      success: false, 
      error: 'Error al procesar la autenticación. Por favor intenta de nuevo.' 
    };
  }
}

/**
 * Verificar si la URL actual es un callback de OAuth
 */
export function isOAuthCallback(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('token') || urlParams.has('error');
}