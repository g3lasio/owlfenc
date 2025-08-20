/**
 * AUTENTICACIÓN DIRECTA SIN FIREBASE SDK
 * Bypass completo del bug de split() usando Firebase REST API
 */

const FIREBASE_API_KEY = "AIzaSyBkiNyJNG-uGBO3-w4g-q5SbqDxvTdCRSk";
const FIREBASE_AUTH_URL = "https://identitytoolkit.googleapis.com/v1";

interface FirebaseAuthResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  registered?: boolean;
}

interface FirebaseError {
  error: {
    code: number;
    message: string;
    errors?: Array<{
      message: string;
      domain: string;
      reason: string;
    }>;
  };
}

/**
 * Login directo usando REST API de Firebase
 * Evita completamente el SDK y su bug de split()
 */
export async function directFirebaseLogin(
  email: string, 
  password: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  console.log('🚀 [DIRECT-AUTH] Iniciando login directo con REST API');
  
  // Validación básica
  if (!email || !password) {
    return { 
      success: false, 
      error: 'Email y contraseña son requeridos' 
    };
  }
  
  try {
    // Llamada directa a Firebase REST API
    const response = await fetch(
      `${FIREBASE_AUTH_URL}/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          returnSecureToken: true
        })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ [DIRECT-AUTH] Error de Firebase:', data);
      
      // Mapear errores específicos
      const firebaseError = data as FirebaseError;
      const errorMessage = firebaseError.error?.message || 'Error desconocido';
      
      if (errorMessage.includes('EMAIL_NOT_FOUND')) {
        return { 
          success: false, 
          error: 'No existe una cuenta con este email. Por favor regístrate primero.' 
        };
      }
      if (errorMessage.includes('INVALID_PASSWORD') || errorMessage.includes('INVALID_LOGIN_CREDENTIALS')) {
        return { 
          success: false, 
          error: 'Contraseña incorrecta. Por favor verifica e intenta de nuevo.' 
        };
      }
      if (errorMessage.includes('USER_DISABLED')) {
        return { 
          success: false, 
          error: 'Esta cuenta ha sido deshabilitada. Contacta soporte.' 
        };
      }
      if (errorMessage.includes('TOO_MANY_ATTEMPTS')) {
        return { 
          success: false, 
          error: 'Demasiados intentos fallidos. Por favor espera unos minutos.' 
        };
      }
      if (errorMessage.includes('INVALID_EMAIL')) {
        return { 
          success: false, 
          error: 'El formato del email es inválido.' 
        };
      }
      
      return { 
        success: false, 
        error: `Error: ${errorMessage}` 
      };
    }
    
    // Login exitoso
    const authData = data as FirebaseAuthResponse;
    console.log('✅ [DIRECT-AUTH] Login exitoso:', authData.email);
    
    // Guardar token para uso posterior
    localStorage.setItem('firebase_id_token', authData.idToken);
    localStorage.setItem('firebase_refresh_token', authData.refreshToken);
    localStorage.setItem('firebase_user_id', authData.localId);
    localStorage.setItem('firebase_user_email', authData.email);
    
    return {
      success: true,
      user: {
        uid: authData.localId,
        email: authData.email,
        idToken: authData.idToken,
        refreshToken: authData.refreshToken
      }
    };
    
  } catch (error: any) {
    console.error('❌ [DIRECT-AUTH] Error de red:', error);
    
    // Error de red real (no el bug de Firebase)
    if (!navigator.onLine) {
      return { 
        success: false, 
        error: 'Sin conexión a Internet. Verifica tu conexión.' 
      };
    }
    
    return { 
      success: false, 
      error: 'Error de conexión. Por favor intenta de nuevo.' 
    };
  }
}

/**
 * Verificar estado de autenticación usando REST API
 */
export async function checkAuthStatus(): Promise<{ authenticated: boolean; user?: any }> {
  const idToken = localStorage.getItem('firebase_id_token');
  
  if (!idToken) {
    return { authenticated: false };
  }
  
  try {
    const response = await fetch(
      `${FIREBASE_AUTH_URL}/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken
        })
      }
    );
    
    if (!response.ok) {
      // Token inválido o expirado
      localStorage.removeItem('firebase_id_token');
      localStorage.removeItem('firebase_refresh_token');
      localStorage.removeItem('firebase_user_id');
      localStorage.removeItem('firebase_user_email');
      return { authenticated: false };
    }
    
    const data = await response.json();
    return {
      authenticated: true,
      user: {
        uid: localStorage.getItem('firebase_user_id'),
        email: localStorage.getItem('firebase_user_email'),
        ...data.users?.[0]
      }
    };
    
  } catch (error) {
    console.error('❌ [DIRECT-AUTH] Error verificando auth:', error);
    return { authenticated: false };
  }
}

/**
 * Logout directo
 */
export function directFirebaseLogout() {
  localStorage.removeItem('firebase_id_token');
  localStorage.removeItem('firebase_refresh_token');
  localStorage.removeItem('firebase_user_id');
  localStorage.removeItem('firebase_user_email');
  console.log('✅ [DIRECT-AUTH] Sesión cerrada');
}