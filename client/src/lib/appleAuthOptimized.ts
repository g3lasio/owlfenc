import { getAuth, signInWithRedirect, OAuthProvider } from "firebase/auth";

/**
 * Sistema optimizado de autenticación con Apple que incluye:
 * - Detección de conectividad
 * - Reintentos automáticos
 * - Timeouts ajustables
 * - Fallbacks inteligentes
 */
export class AppleAuthOptimizer {
  private auth = getAuth();
  private maxRetries = 2;
  private timeoutMs = 8000; // 8 segundos timeout
  
  private createProvider(): OAuthProvider {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    return provider;
  }

  private async checkConnectivity(): Promise<boolean> {
    try {
      // Verificar conectividad básica
      if (!navigator.onLine) return false;
      
      // Ping rápido a Firebase
      const response = await fetch('https://identitytoolkit.googleapis.com/v1/projects', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      return true;
    } catch {
      return false;
    }
  }

  private async attemptRedirect(provider: OAuthProvider, attempt: number): Promise<void> {
    console.log(`Intento ${attempt + 1}/${this.maxRetries + 1} de redirección a Apple`);
    
    const redirectPromise = signInWithRedirect(this.auth, provider);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('REDIRECT_TIMEOUT'));
      }, this.timeoutMs);
    });

    await Promise.race([redirectPromise, timeoutPromise]);
  }

  async initiateAppleAuth(): Promise<null> {
    // Verificar conectividad antes de intentar
    const isConnected = await this.checkConnectivity();
    if (!isConnected) {
      throw new Error('CONNECTIVITY_ERROR');
    }

    const provider = this.createProvider();
    
    // Guardar estado de intento
    sessionStorage.setItem('apple_auth_attempt', JSON.stringify({
      timestamp: Date.now(),
      attempts: 0,
      maxRetries: this.maxRetries
    }));

    let lastError: Error | null = null;

    // Intentar con reintentos automáticos
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await this.attemptRedirect(provider, attempt);
        
        // Si llegamos aquí, la redirección fue exitosa
        console.log(`Redirección a Apple exitosa en intento ${attempt + 1}`);
        return null;
        
      } catch (error: any) {
        lastError = error;
        console.log(`Intento ${attempt + 1} falló:`, error.message);
        
        // Si es el último intento, no esperar
        if (attempt === this.maxRetries) break;
        
        // Esperar antes del siguiente intento (con backoff exponencial)
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 3000);
        console.log(`Esperando ${waitTime}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    throw lastError || new Error('UNKNOWN_ERROR');
  }
}

/**
 * Función principal optimizada para usar desde firebase.ts
 */
export const initiateOptimizedAppleAuth = async (): Promise<null> => {
  const optimizer = new AppleAuthOptimizer();
  
  try {
    return await optimizer.initiateAppleAuth();
  } catch (error: any) {
    console.error('Error en autenticación optimizada con Apple:', error);
    
    // Mapear errores específicos
    if (error.message === 'CONNECTIVITY_ERROR') {
      throw new Error('Problema de conectividad. Verifica tu conexión a internet.');
    } else if (error.message === 'REDIRECT_TIMEOUT') {
      throw new Error('APPLE_SLOW_RESPONSE');
    }
    
    throw error;
  }
};