import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/i18n"; // Importamos la configuración de i18n

// ESTRATEGIA SIMPLE: Solo silenciar unhandled rejections
window.addEventListener('unhandledrejection', (e) => { 
  e.preventDefault(); 
});

createRoot(document.getElementById("root")!).render(<App />);
