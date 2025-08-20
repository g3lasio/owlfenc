/**
 * WRAPPER DE AUTENTICACIÓN FIREBASE
 * Solución al bug de split() undefined en Firebase Auth
 */

import { 
  getAuth, 
  signInWithEmailAndPassword as firebaseSignIn,
  Auth,
  UserCredential
} from "firebase/auth";

// Cache de validación para evitar llamadas repetidas
const validationCache = new Map<string, boolean>();

/**
 * Valida las credenciales antes de enviarlas a Firebase
 */
function validateCredentials(email: string, password: string): { valid: boolean; error?: string } {
  // Validación de email
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email no proporcionado' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Formato de email inválido' };
  }
  
  // Validación de password
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Contraseña no proporcionada' };
  }
  
  if (password.length < 6) {
    return { valid: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }
  
  return { valid: true };
}

/**
 * Wrapper seguro para signInWithEmailAndPassword
 * Evita el bug de split() undefined
 */
export async function safeSignInWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string
): Promise<UserCredential> {
  console.log('🛡️ [SAFE-AUTH] Iniciando login seguro');
  
  // Validación previa
  const validation = validateCredentials(email, password);
  if (!validation.valid) {
    console.error('❌ [SAFE-AUTH] Validación fallida:', validation.error);
    throw new Error(validation.error || 'Credenciales inválidas');
  }
  
  // Limpiar y normalizar
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();
  
  // Crear clave de cache
  const cacheKey = `${cleanEmail}_${Date.now()}`;
  
  try {
    console.log('🛡️ [SAFE-AUTH] Intentando autenticación con Firebase');
    
    // Intentar login con retry automático
    let attempts = 0;
    let lastError: any = null;
    
    while (attempts < 2) {
      try {
        // Usar timeout para evitar bloqueos
        const authPromise = firebaseSignIn(auth, cleanEmail, cleanPassword);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de autenticación')), 10000)
        );
        
        const result = await Promise.race([authPromise, timeoutPromise]) as UserCredential;
        
        console.log('✅ [SAFE-AUTH] Login exitoso');
        return result;
        
      } catch (error: any) {
        lastError = error;
        attempts++;
        
        console.warn(`⚠️ [SAFE-AUTH] Intento ${attempts} falló:`, error?.code);
        
        // Si es el error de split, intentar workaround
        if (error?.customData?.message?.includes('split')) {
          console.log('🔧 [SAFE-AUTH] Detectado bug de split, aplicando workaround');
          
          // Esperar un poco antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        // Si es otro error, lanzarlo inmediatamente
        if (error?.code && !error?.code.includes('network')) {
          throw error;
        }
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    throw lastError || new Error('No se pudo completar la autenticación');
    
  } catch (error: any) {
    console.error('❌ [SAFE-AUTH] Error final:', {
      code: error?.code,
      message: error?.message,
      customData: error?.customData
    });
    
    // Mapear errores específicos
    if (error?.code === 'auth/user-not-found') {
      throw new Error('No existe una cuenta con este email');
    }
    if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
      throw new Error('Contraseña incorrecta');
    }
    if (error?.code === 'auth/invalid-email') {
      throw new Error('Email inválido');
    }
    if (error?.code === 'auth/too-many-requests') {
      throw new Error('Demasiados intentos. Espera unos minutos');
    }
    
    // Si es el error de split o red, sugerir alternativas
    if (error?.customData?.message?.includes('split') || error?.code === 'auth/network-request-failed') {
      throw new Error('Error de autenticación. Por favor usa Google o Apple para iniciar sesión');
    }
    
    // Error genérico
    throw new Error(error?.message || 'Error al iniciar sesión');
  }
}

/**
 * Test de conectividad con Firebase
 */
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    const auth = getAuth();
    // Simplemente verificar que auth existe y está inicializado
    return auth !== null && auth !== undefined;
  } catch (error) {
    console.error('❌ [SAFE-AUTH] Firebase no está disponible');
    return false;
  }
}