/**
 * 🔐 OAUTH SIMPLIFICADO - SOLUCIÓN ROBUSTA
 * Sistema OAuth directo sin verificaciones complejas
 * Después de 3 días de debugging, enfoque minimalista
 */

// SOLUCIÓN 1: OAuth directo sin verificaciones
export const simpleGoogleLogin = async () => {
  console.log("🔵 [SIMPLE-GOOGLE] Iniciando OAuth directo...");
  
  const currentUrl = window.location.origin;
  const oauthUrl = `${currentUrl}/api/oauth-direct/google?state=login`;
  
  console.log("🔵 [SIMPLE-GOOGLE] Redirigiendo:", oauthUrl);
  window.location.href = oauthUrl;
};

export const simpleAppleLogin = async () => {
  console.log("🍎 [SIMPLE-APPLE] Iniciando OAuth directo...");
  
  const currentUrl = window.location.origin;
  const oauthUrl = `${currentUrl}/api/oauth-direct/apple?state=login`;
  
  console.log("🍎 [SIMPLE-APPLE] Redirigiendo:", oauthUrl);
  window.location.href = oauthUrl;
};

// SOLUCIÓN 2: Verificar servidor antes de redirección
export const verifiedGoogleLogin = async () => {
  try {
    console.log("🔵 [VERIFIED-GOOGLE] Verificando endpoint...");
    
    // Test directo del endpoint sin configuración compleja
    const response = await fetch('/api/oauth-direct/google?test=true', { 
      method: 'HEAD',
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      console.log("✅ [VERIFIED-GOOGLE] Endpoint disponible");
      await simpleGoogleLogin();
    } else {
      throw new Error("Google OAuth no disponible");
    }
  } catch (error) {
    console.error("❌ [VERIFIED-GOOGLE] Error:", error);
    throw new Error("Google Sign-In no está disponible en este momento");
  }
};

export const verifiedAppleLogin = async () => {
  try {
    console.log("🍎 [VERIFIED-APPLE] Verificando endpoint...");
    
    // Test directo del endpoint sin configuración compleja
    const response = await fetch('/api/oauth-direct/apple?test=true', { 
      method: 'HEAD',
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      console.log("✅ [VERIFIED-APPLE] Endpoint disponible");
      await simpleAppleLogin();
    } else {
      throw new Error("Apple OAuth no disponible");
    }
  } catch (error) {
    console.error("❌ [VERIFIED-APPLE] Error:", error);
    throw new Error("Apple Sign-In no está disponible en este momento");
  }
};

// SOLUCIÓN 3: Fallback para botones
export const robustOAuthHandler = async (provider: 'google' | 'apple') => {
  try {
    if (provider === 'google') {
      await verifiedGoogleLogin();
    } else {
      await verifiedAppleLogin();
    }
  } catch (error) {
    console.error(`❌ [ROBUST-OAUTH] ${provider} falló:`, error);
    
    // Mostrar mensaje amigable sin errores técnicos
    throw new Error(
      provider === 'google' 
        ? "Google Sign-In no está disponible. Usa código OTP o email/contraseña."
        : "Apple Sign-In no está disponible. Usa código OTP o email/contraseña."
    );
  }
};