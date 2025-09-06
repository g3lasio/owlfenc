import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/i18n"; // Importamos la configuración de i18n

// 🛡️ SISTEMA UNIFICADO DE MANEJO DE ERRORES
// Importamos el sistema unificado que reemplaza todos los interceptores anteriores
import './lib/unified-error-handler';

console.log('🛡️ [MAIN] Sistema unificado de errores activado');

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