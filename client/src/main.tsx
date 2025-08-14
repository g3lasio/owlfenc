import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/i18n"; // Importamos la configuración de i18n

// ESTRATEGIA QUIRÚRGICA: Silenciar solo errores específicos de fetch
window.addEventListener('unhandledrejection', (e) => { 
  // Solo prevenir unhandled rejections relacionadas con fetch
  if (e.reason && e.reason.message && e.reason.message.includes('fetch')) {
    e.preventDefault(); 
  }
});

createRoot(document.getElementById("root")!).render(<App />);
