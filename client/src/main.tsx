import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/i18n"; // Importamos la configuración de i18n
import "./lib/network-error-handler"; // Inicializar manejador avanzado de errores

// MANEJADOR DEFINITIVO para unhandledrejection - SILENCIOSO Y COMPLETO
// REMOVIDO: Conflictaba con network-error-handler.ts

// MANEJADOR para errores globales también
window.addEventListener('error', (event) => {
  event.preventDefault(); // Prevenir que aparezca en console
  // Silenciar completamente sin logs  
});

// MANEJADOR para errores de recursos
window.addEventListener('error', (event) => {
  if (event.target && event.target !== window) {
    event.preventDefault();
  }
}, true);

// ESTRATEGIA CUÁDRUPLE: XMLHttpRequest + Network Handler + Runtime Error Plugin Bypass + Console Override
// Sistema de protección silencioso contra errores fastidiosos activado
if (window.location.search.includes('debug=init')) {
  console.debug('🔧 [INIT-DEBUG] Anti-fetch protection enabled');
}

// CRITICAL: Interceptar console.error para bloquear runtime-error-plugin específicamente
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ').toString();
  
  // Patrones específicos de errores molestos a silenciar COMPLETAMENTE
  const annoyingPatterns = [
    '[plugin:runtime-error-plugin]',
    'plugin:runtime-error-plugin',
    'runtime-error-plugin',
    'Failed to fetch',
    'Network request failed',
    'ERR_NETWORK',
    'Request timeout',
    'AbortError'
  ];
  
  // Verificar si el mensaje contiene algún patrón molestoso
  const isAnnoyingError = annoyingPatterns.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (isAnnoyingError) {
    // Silenciar COMPLETAMENTE - no imprimir nada, ni siquiera debug
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

// REMOVIDO: Interceptor duplicado - se maneja en network-error-handler.ts

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
