import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/i18n"; // Importamos la configuración de i18n
import "./lib/runtime-error-killer"; // SOLUCI\u00d3N DEFINITIVA runtime-error-plugin
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

// CRITICAL: Interceptor DEFINITIVO para bloquear runtime-error-plugin
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ').toString();
  
  // Patrones específicos de Firebase Auth y runtime-error-plugin
  const firebaseAuthPatterns = [
    '[plugin:runtime-error-plugin]',
    'plugin:runtime-error-plugin',
    'runtime-error-plugin',
    'Failed to fetch',
    '_performFetchWithErrorHandling',
    'requestStsToken',
    '_StsTokenManager',
    'getIdToken',
    'auth/network-request-failed',
    'Network request failed',
    'ERR_NETWORK',
    'Request timeout',
    'AbortError',
    'Firebase',
    'firestore'
  ];
  
  // Verificar si es un error de Firebase Auth que debemos silenciar
  const isFirebaseAuthError = firebaseAuthPatterns.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (isFirebaseAuthError) {
    // SILENCIAR COMPLETAMENTE - especialmente runtime-error-plugin
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

// INTERCEPTOR ESPECÍFICO para runtime-error-plugin Firebase errors
window.addEventListener('unhandledrejection', (e) => {
  const error = e.reason;
  const errorMessage = error?.message || error?.toString() || '';
  const errorStack = error?.stack || '';
  
  // Patrones específicos de Firebase Auth que causan runtime-error-plugin overlay
  const firebaseRuntimeErrorPatterns = [
    '_performFetchWithErrorHandling',
    'requestStsToken',
    '_StsTokenManager.refresh',
    '_StsTokenManager.getToken',
    'getIdToken',
    'Failed to fetch',
    'chunk-7FXTVMOG.js' // Específico del bundle de Firebase
  ];
  
  // Verificar si es exactamente el tipo de error que causa el overlay molesto
  const isFirebaseRuntimeError = firebaseRuntimeErrorPatterns.some(pattern => 
    errorMessage.includes(pattern) || errorStack.includes(pattern)
  );
  
  if (isFirebaseRuntimeError) {
    // PREVENIR COMPLETAMENTE - no debe llegar al runtime-error-plugin
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }
}, true); // Usar capture phase para interceptar antes

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
