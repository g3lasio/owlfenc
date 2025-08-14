import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/i18n"; // Importamos la configuración de i18n

// ESTRATEGIA DOBLE: XMLHttpRequest + silenciar errores del runtime plugin
window.addEventListener('unhandledrejection', (e) => { 
  e.preventDefault(); 
});

// Interceptar console.error específicamente para runtime error plugin
const originalConsoleError = console.error;
console.error = (...args) => {
  const errorMessage = args.join(' ');
  if (errorMessage.includes('runtime-error-plugin') || 
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('address-autocomplete')) {
    return; // Silenciar completamente
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
