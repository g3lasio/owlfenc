import React, { createContext, useState, useContext, useEffect } from 'react';
import i18n from '../i18n/i18n';

interface LanguageContextType {
  language: string;
  changeLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState(i18n.language || 'es');

  useEffect(() => {
    // Inicializar el idioma desde localStorage o usar el del navegador
    const savedLanguage = localStorage.getItem('language');
    let initialLanguage = 'es'; // Por defecto, español
    
    if (savedLanguage) {
      initialLanguage = savedLanguage;
    } else {
      // Si no hay idioma guardado, intentar detectar del navegador
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'en' || browserLang === 'es') {
        initialLanguage = browserLang;
      }
      // Guardar para la próxima vez
      localStorage.setItem('language', initialLanguage);
    }
    
    i18n.changeLanguage(initialLanguage);
    setLanguage(initialLanguage);
    
    // Establecer el atributo lang en el documento HTML para accesibilidad
    document.documentElement.lang = initialLanguage;
  }, []);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
    localStorage.setItem('language', lang);
    
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

export default LanguageContext;