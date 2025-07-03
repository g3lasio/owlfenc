import React, { createContext, useState, useContext, useEffect } from "react";
import i18n from "../i18n/i18n";

interface LanguageContextType {
  language: string;
  changeLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguage] = useState(i18n.language || "en");

  useEffect(() => {
    // Inicializar el idioma desde localStorage o usar inglés por defecto
    const savedLanguage = localStorage.getItem("language");
    let initialLanguage = "en"; // Por defecto, siempre inglés

    if (savedLanguage) {
      // Si hay un idioma guardado en localStorage, comprobamos que sea válido
      if (savedLanguage === "en" || savedLanguage === "es") {
        initialLanguage = savedLanguage;
      }
    }

    // Guardar para la próxima vez
    localStorage.setItem("language", initialLanguage);

    i18n.changeLanguage(initialLanguage);
    setLanguage(initialLanguage);

    // Establecer el atributo lang en el documento HTML para accesibilidad
    document.documentElement.lang = initialLanguage;
  }, []);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
    localStorage.setItem("language", lang);

    // Actualizar el atributo lang del HTML para accesibilidad
    document.documentElement.lang = lang;

    // Opcional: notificar el cambio de idioma para depuración
    console.log(`Idioma cambiado a: ${lang}`);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Exportamos el LanguageProvider como default para Fast Refresh compatibility
export default LanguageProvider;
