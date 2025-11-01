import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n/i18n"; // Importamos la configuración de i18n

// 🚫 REVERTIDO: Sistema STS bypass agresivo que rompía Firebase

// 🛡️ SISTEMA UNIFICADO DE MANEJO DE ERRORES
// Importamos el sistema unificado que reemplaza todos los interceptores anteriores
import './lib/unified-error-handler';

console.log('🛡️ [MAIN] Sistema unificado de errores activado');

// 🛡️ SISTEMA DE AUTENTICACIÓN BASADO EN COOKIES DE SESIÓN
// El nuevo AuthSessionProvider maneja la autenticación de forma confiable
console.log('✅ [ENTERPRISE] Sistema de autenticación basado en cookies inicializado');

const container = document.getElementById("root");
if (!container) throw new Error("Root container missing in index.html");

const root = createRoot(container);
root.render(<App />);