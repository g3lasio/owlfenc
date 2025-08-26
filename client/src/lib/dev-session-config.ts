/**
 * Configuración específica para desarrollo - mantiene sesiones estables
 */

// Detectar entorno de desarrollo
export const isDevelopmentMode = () => {
  return window.location.hostname.includes('replit') || 
         window.location.hostname === 'localhost' ||
         window.location.hostname.includes('127.0.0.1') ||
         process.env.NODE_ENV === 'development';
};

// Configuración de timeouts para desarrollo vs producción
export const getTimeoutConfig = () => {
  const isDev = isDevelopmentMode();
  
  return {
    authTimeout: isDev ? 30000 : 15000,        // 30s en dev, 15s en prod
    tokenRefresh: isDev ? 60000 : 30000,       // 1min en dev, 30s en prod
    networkRetry: isDev ? 10 : 3,              // 10 reintentos en dev, 3 en prod
    sessionGrace: isDev ? 10000 : 3000,        // 10s en dev, 3s en prod
    stripeTimeout: isDev ? 15000 : 5000        // 15s en dev, 5s en prod
  };
};

// Helper para logs de desarrollo
export const devLog = (message: string, data?: any) => {
  if (isDevelopmentMode()) {
    console.log(`🛠️ [DEV-SESSION] ${message}`, data || '');
  }
};

// Configurar persistencia estable para desarrollo
export const setupDevPersistence = () => {
  if (isDevelopmentMode()) {
    // Aumentar tiempo de expiración de localStorage
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    
    // Interceptar eliminaciones accidentales en desarrollo
    localStorage.removeItem = function(key: string) {
      if (key.includes('persistent_session') || key.includes('otp-auth') || key.includes('firebase')) {
        devLog(`Previniendo eliminación de ${key} en desarrollo`);
        return; // No eliminar en desarrollo
      }
      return originalRemoveItem.call(this, key);
    };
    
    devLog('Configuración de desarrollo activada - sesiones protegidas');
  }
};

// Auto-inicializar configuración de desarrollo
if (typeof window !== 'undefined') {
  setupDevPersistence();
}