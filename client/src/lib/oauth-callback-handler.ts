/**
 * OAUTH CALLBACK HANDLER
 * Procesa los tokens devueltos por OAuth providers
 */

import { signInWithCustomToken, getAuth } from 'firebase/auth';

/**
 * Procesar callback de OAuth
 */
export async function handleOAuthCallback(): Promise<{ success: boolean; error?: string; isNewUser?: boolean; provider?: string }> {
  console.log('🔍 [OAUTH-HANDLER] Verificando callback de OAuth...');
  
  // Obtener parámetros de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const provider = urlParams.get('provider');
  const error = urlParams.get('error');
  const newUser = urlParams.get('new_user') === 'true';
  
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
  
  console.log(`✅ [OAUTH-HANDLER] Token recibido de ${provider}, usuario nuevo: ${newUser}`);
  
  try {
    // Autenticar con el custom token de Firebase
    const auth = getAuth();
    const userCredential = await signInWithCustomToken(auth, token);
    
    console.log('✅ [OAUTH-HANDLER] Usuario autenticado:', userCredential.user.email);
    
    // Disparar evento para notificar el resultado con información adicional
    const oauthResultEvent = new CustomEvent('oauth-login-result', {
      detail: {
        success: true,
        provider,
        isNewUser: newUser,
        user: {
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL
        }
      }
    });
    window.dispatchEvent(oauthResultEvent);
    
    // Limpiar la URL
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
    
    return { success: true, isNewUser: newUser, provider: provider || undefined };
    
  } catch (error: any) {
    console.error('❌ [OAUTH-HANDLER] Error procesando token:', error);
    
    // Disparar evento para notificar el error
    const oauthErrorEvent = new CustomEvent('oauth-login-result', {
      detail: {
        success: false,
        provider,
        error: error.message
      }
    });
    window.dispatchEvent(oauthErrorEvent);
    
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