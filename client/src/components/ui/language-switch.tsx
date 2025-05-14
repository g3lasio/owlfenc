import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface LanguageSwitchProps {
  className?: string;
}

export function LanguageSwitch({ className }: LanguageSwitchProps) {
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleLanguage = () => {
    setIsAnimating(true);
    setTimeout(() => {
      const newLanguage = language === 'es' ? 'en' : 'es';
      changeLanguage(newLanguage);
    }, 300); // Tiempo para la animación antes de cambiar el idioma
  };

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 600); // Tiempo total de la animación
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  return (
    <div className={cn("flex items-center", className)}>
      <button
        onClick={toggleLanguage}
        className={cn(
          "relative flex items-center justify-between w-14 h-8 px-1 rounded-full transition-all duration-300",
          "bg-gradient-to-r from-slate-900 to-zinc-900 shadow-lg",
          "overflow-hidden",
          "border border-yellow-600/40",
        )}
        aria-label="Toggle language"
        title={t('general.language')}
      >
        {/* Fondo con efecto futurista */}
        <div className="absolute inset-0 bg-grid-white/5 bg-grid-2"></div>
        
        {/* Efecto de luz de neón en los bordes - estilo Transformers */}
        <div className="absolute inset-0 rounded-full opacity-20 blur-sm bg-gradient-to-r from-yellow-500 to-orange-600"></div>
        
        {/* Indicador que se mueve */}
        <div 
          className={cn(
            "absolute top-1 w-6 h-6 rounded-full bg-zinc-800 shadow-md transform transition-transform duration-300 ease-out flex items-center justify-center",
            "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-yellow-500 before:to-orange-600 before:opacity-80",
            "after:absolute after:inset-1 after:rounded-full after:bg-gradient-to-b after:from-slate-800 after:to-zinc-900",
            isAnimating && "animate-pulse",
            language === 'es' ? "left-1" : "left-9"
          )}
        ></div>
        
        {/* Textos de los idiomas */}
        <span className={cn(
          "text-xs font-bold z-10 transition-all duration-300",
          language === 'es' ? "text-white" : "text-white/40"
        )}>ES</span>
        <span className={cn(
          "text-xs font-bold z-10 transition-all duration-300",
          language === 'en' ? "text-white" : "text-white/40"
        )}>EN</span>
        
        {/* Destellos decorativos estilo Transformers */}
        <div className={cn(
          "absolute w-10 h-1 bg-yellow-500 rotate-45 opacity-0 transition-opacity",
          isAnimating && "animate-flash"
        )}></div>
        <div className={cn(
          "absolute w-8 h-1 bg-orange-500 -rotate-45 opacity-0 transition-opacity",
          isAnimating && "animate-flash delay-75"
        )}></div>
      </button>
    </div>
  );
}

export default LanguageSwitch;