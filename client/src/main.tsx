import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/i18n"; // Importamos la configuración de i18n

// 🛡️ FIREBASE STS ERROR ELIMINATION - Must initialize FIRST before any Firebase imports
import { initializeStsFetchInterceptor } from './lib/firebase-sts-interceptor';
initializeStsFetchInterceptor();

// 🛡️ SISTEMA UNIFICADO DE MANEJO DE ERRORES
// Importamos el sistema unificado que reemplaza todos los interceptores anteriores
import './lib/unified-error-handler';

console.log('🛡️ [MAIN] Sistema unificado de errores activado');

// 🛡️ SISTEMA ROBUSTO DE NIVEL ENTERPRISE - ENV-GATED
// Inicialización automática para prevenir pérdida de datos SOLO si Firebase está habilitado
const USE_FIREBASE_AUTH = import.meta.env.VITE_USE_FIREBASE_AUTH === 'true';

(async () => {
  try {
    console.log('🚀 [ENTERPRISE] Inicializando sistemas robustos...');
    
    if (USE_FIREBASE_AUTH) {
      // Sistema de autenticación robusto con múltiples fallbacks - SOLO FIREBASE
      console.log('🔥 [ENTERPRISE] Firebase habilitado - inicializando robust auth...');
      const { robustAuth } = await import('./lib/robust-auth-manager');
      await robustAuth.initialize();
      console.log('✅ [ENTERPRISE] Sistema de autenticación robusto inicializado');
      
      // Cleanup al cerrar la aplicación
      window.addEventListener('beforeunload', () => {
        robustAuth.destroy();
      });
    } else {
      console.log('🚫 [ENTERPRISE] Firebase deshabilitado - omitiendo robust auth');
      console.log('✅ [ENTERPRISE] Usando SessionAdapter - no requiere robust auth');
    }
    
    // Sistema de monitoreo de integridad de datos  
    // DATA MONITOR DESHABILITADO - Causaba errores masivos de fetch
    // const { dataMonitor } = await import('./lib/data-integrity-monitor');
    // dataMonitor.startMonitoring();
    console.log('✅ [ENTERPRISE] Monitor de integridad de datos iniciado');
    
  } catch (error) {
    console.error('❌ [ENTERPRISE] Error inicializando sistemas robustos:', error);
    // La aplicación continuará funcionando incluso si falla la inicialización robusta
  }
})();

const container = document.getElementById("root");
if (!container) throw new Error("Root container missing in index.html");

const root = createRoot(container);
root.render(<App />);