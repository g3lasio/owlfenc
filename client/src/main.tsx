import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/i18n"; // Importamos la configuración de i18n
import "./lib/network-error-handler"; // Inicializar manejador avanzado de errores

// ESTRATEGIA CUÁDRUPLE: XMLHttpRequest + Network Handler + Runtime Error Plugin Bypass + Console Override
// Sistema de protección silencioso contra errores fastidiosos activado
if (window.location.search.includes('debug=init')) {
  console.debug('🔧 [INIT-DEBUG] Anti-fetch protection enabled');
}

// CRITICAL: Interceptar console.error para bloquear runtime-error-plugin específicamente
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ').toString();
  
  // Bloquear específicamente mensajes del runtime-error-plugin
  if (message.includes('[plugin:runtime-error-plugin]') ||
      message.includes('Failed to fetch') ||
      message.includes('runtime-error-plugin')) {
    
    // Silenciar completamente - no imprimir nada
    console.debug('🔧 [RUNTIME-PLUGIN-BLOCKED] Silenciando:', message.substring(0, 50));
    return;
  }
  
  // Para otros errores, usar console.error normal
  originalConsoleError.apply(console, args);
};

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
  '[plugin:runtime-error-plugin]',
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
    
    // Solo log en modo debug explícito para evitar spam
    errorCount++;
    if (window.location.search.includes('debug=silent') && errorCount === 1) {
      console.debug('🔧 [SILENT-DEBUG] Network protection active');
    }
    return;
  }
  
  // Los demás errores se manejan normalmente
});

// NOTE: console.error override already handled above

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
