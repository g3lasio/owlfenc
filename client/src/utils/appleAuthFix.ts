import { OAuthProvider, signInWithRedirect, getAuth } from "firebase/auth";

/**
 * Configuración optimizada para Apple Sign-In en entornos Replit
 * Esta función maneja específicamente los problemas de dominio con Apple ID
 */
export const initiateAppleSignIn = async () => {
  const auth = getAuth();
  
  // Crear proveedor con configuración específica para Replit
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  
  // Configuración específica para evitar errores de redirect_uri
  provider.setCustomParameters({
    // Usar locale en inglés para compatibilidad
    'locale': 'en_US'
  });
  
  // Guardar estado antes de la redirección
  sessionStorage.setItem('apple_auth_state', JSON.stringify({
    timestamp: Date.now(),
    initiatedFrom: window.location.href,
    domain: window.location.hostname
  }));
  
  try {
    // Usar redirección directa que es más confiable que popup
    await signInWithRedirect(auth, provider);
  } catch (error: any) {
    console.error('Error en Apple Sign-In:', error);
    
    // Proporcionar información detallada del error
    if (error.code === 'auth/invalid-oauth-provider') {
      throw new Error('Apple Sign-In no está configurado correctamente en Firebase Console');
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error('El dominio actual no está autorizado en Firebase Console');
    } else {
      throw new Error(`Error de autenticación con Apple: ${error.message}`);
    }
  }
};

/**
 * Verificar si Apple Sign-In está disponible y configurado
 */
export const checkAppleSignInAvailability = () => {
  const auth = getAuth();
  const currentDomain = window.location.hostname;
  
  // Verificar configuración básica
  const hasApiKey = !!auth.app.options.apiKey;
  const hasAuthDomain = !!auth.app.options.authDomain;
  const hasProjectId = !!auth.app.options.projectId;
  
  return {
    isConfigured: hasApiKey && hasAuthDomain && hasProjectId,
    currentDomain,
    authDomain: auth.app.options.authDomain,
    projectId: auth.app.options.projectId,
    recommendations: [
      'Verificar que el dominio actual esté en Firebase Console > Authentication > Settings > Authorized domains',
      'Confirmar que Apple Sign-In esté habilitado en Firebase Console > Authentication > Sign-in method',
      'Verificar configuración en Apple Developer Console > Services IDs'
    ]
  };
};