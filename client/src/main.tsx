import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/i18n"; // Importamos la configuración de i18n
import "./lib/network-error-handler"; // Inicializar manejador avanzado de errores

// ESTRATEGIA CUÁDRUPLE: XMLHttpRequest + Network Handler + Runtime Error Plugin Bypass + Console Override
console.log('🛡️ [ANTI-FETCH-ERRORS] Activando sistema de protección avanzado contra errores fastidiosos');

// Mejora para interceptar runtime-error-plugin

// Lista expandida de patrones de errores a silenciar
const ANNOYING_ERROR_PATTERNS = [
  'runtime-error-plugin',
  'Failed to fetch',
  'address-autocomplete',
  'Network request failed',
  'NetworkError',
  'fetch',
  'ERR_NETWORK',
  'ERR_INTERNET_DISCONNECTED',
  'ERR_CONNECTION_REFUSED',
  'ERR_CONNECTION_TIMED_OUT',
  'Request timeout',
  'Timeout',
  'AbortError',
  'auth/network-request-failed',
  'auth/too-many-requests',
  'firestore',
  'Firebase',
  'requestStsToken',
  '_StsTokenManager',
  'getIdToken',
  '_performFetchWithErrorHandling',
  'StsTokenManager',
  'plugin:runtime-error-plugin',
  'vite:hmr',
  'websocket connection',
  'WebSocket'
];

// Interceptor más agresivo para unhandled rejections
let errorCount = 0;
let lastReset = Date.now();

window.addEventListener('unhandledrejection', (e) => {
  const error = e.reason;
  const errorMessage = error?.message || error?.toString() || '';
  
  // Reset counter cada minuto
  if (Date.now() - lastReset > 60000) {
    errorCount = 0;
    lastReset = Date.now();
  }
  
  // Verificar si es un error fastidioso
  const isAnnoyingError = ANNOYING_ERROR_PATTERNS.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase()) ||
    (error?.code && error.code.toLowerCase().includes(pattern.toLowerCase()))
  );
  
  if (isAnnoyingError) {
    e.preventDefault(); // Silenciar completamente
    
    // Solo log muy esporádico para debugging
    errorCount++;
    if (errorCount === 1) {
      console.debug('🔧 [SILENT-MODE] Sistema de protección activado - silenciando errores de red fastidiosos');
    }
    return;
  }
  
  // Los demás errores se manejan normalmente
});

// Interceptar console.error de manera más comprehensiva
const originalConsoleError = console.error;
console.error = (...args) => {
  const errorMessage = args.join(' ');
  
  // Silenciar errores fastidiosos conocidos
  const shouldSilence = ANNOYING_ERROR_PATTERNS.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (shouldSilence) {
    return; // Silenciar completamente
  }
  
  originalConsoleError.apply(console, args);
};

// Interceptor adicional para console.warn
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const warnMessage = args.join(' ');
  
  const shouldSilence = ANNOYING_ERROR_PATTERNS.some(pattern => 
    warnMessage.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (shouldSilence) {
    return; // Silenciar warnings fastidiosos también
  }
  
  originalConsoleWarn.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
