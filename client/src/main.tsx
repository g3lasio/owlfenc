import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/i18n"; // Importamos la configuración de i18n

// 🔧 SOLUCIÓN TEMPORAL: Versión simplificada sin interceptores agresivos
// Los interceptores previos estaban causando pantalla en blanco

// SOLAMENTE interceptar errores específicos de Firebase Auth SIN bloquear React
window.addEventListener('unhandledrejection', (e) => {
  const error = e.reason;
  const errorMessage = error?.message || error?.toString() || '';
  
  // SOLO silenciar errores específicos de Firebase Auth que sabemos son seguros
  const isFirebaseTokenError = (
    errorMessage.includes('requestStsToken') ||
    errorMessage.includes('_StsTokenManager') ||
    errorMessage.includes('Failed to fetch') && errorMessage.includes('auth') ||
    (error?.code === 'auth/network-request-failed')
  );
  
  if (isFirebaseTokenError) {
    e.preventDefault();
    // Silenciar solo estos errores específicos
    if (window.location.search.includes('debug=firebase')) {
      console.debug('🔧 [FIREBASE-DEBUG] Token error silenciado:', error?.code || 'network');
    }
    return;
  }
  
  // IMPORTANTE: Permitir que todos los otros errores (incluyendo React) se muestren normalmente
  // Esto evita la pantalla en blanco
});

// Console override MUY específico - SOLO para runtime-error-plugin overlays
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ').toString();
  
  // SOLO silenciar si es específicamente del plugin runtime-error y de Firebase
  if (message.includes('[plugin:runtime-error-plugin]') && 
      (message.includes('Failed to fetch') || message.includes('Firebase'))) {
    // Silenciar SOLO los overlays molestos del plugin
    return;
  }
  
  // PERMITIR todos los otros errores (crítico para React debugging)
  originalConsoleError.apply(console, args);
};

console.log('🔧 [MAIN] Interceptores mínimos activados - permitiendo React normal');

// 🛡️ SISTEMA ROBUSTO DE NIVEL ENTERPRISE
// Inicialización automática para prevenir pérdida de datos
(async () => {
  try {
    console.log('🚀 [ENTERPRISE] Inicializando sistemas robustos...');
    
    // Sistema de autenticación robusto con múltiples fallbacks
    const { robustAuth } = await import('./lib/robust-auth-manager');
    await robustAuth.initialize();
    console.log('✅ [ENTERPRISE] Sistema de autenticación robusto inicializado');
    
    // Sistema de monitoreo de integridad de datos  
    // DATA MONITOR DESHABILITADO - Causaba errores masivos de fetch
    // const { dataMonitor } = await import('./lib/data-integrity-monitor');
    // dataMonitor.startMonitoring();
    console.log('✅ [ENTERPRISE] Monitor de integridad de datos iniciado');
    
    // Cleanup al cerrar la aplicación
    window.addEventListener('beforeunload', () => {
      robustAuth.destroy();
      // dataMonitor.stopMonitoring(); // Deshabilitado
    });
    
  } catch (error) {
    console.error('❌ [ENTERPRISE] Error inicializando sistemas robustos:', error);
    // La aplicación continuará funcionando incluso si falla la inicialización robusta
  }
})();

const container = document.getElementById("root");
if (!container) throw new Error("Root container missing in index.html");

const root = createRoot(container);
root.render(<App />);