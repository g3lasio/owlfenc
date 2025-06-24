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
          "relative flex items-center justify-between w-16 h-8 px-1.5 rounded-full transition-all duration-300",
          "bg-gradient-to-r from-slate-950 to-zinc-950 shadow-lg",
          "",
          "border border-yellow-600/40",
          "animate-transformer-glow", // Aplicamos la nueva animación de brillo
          "hover:scale-110 hover:border-yellow-500/70" // Efecto al pasar el mouse
        )}
        aria-label="Toggle language"
        title={t('general.language')}
      >
        {/* Fondo con efecto futurista */}
        <div className="absolute inset-0 bg-grid-white/5 bg-grid-2"></div>
        
        {/* Efecto de luz de neón en los bordes - estilo Transformers */}
        <div className="absolute inset-0 rounded-full opacity-30 blur-sm bg-gradient-to-r from-yellow-500 to-orange-600"></div>
        
        {/* Partículas brillantes para efecto Transformers */}
        <div className="absolute inset-0  rounded-full">
          <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-yellow-300 rounded-full opacity-70"></div>
          <div className="absolute top-1/3 right-1/4 w-0.5 h-0.5 bg-orange-400 rounded-full opacity-90"></div>
          <div className="absolute bottom-1/4 left-1/3 w-0.5 h-0.5 bg-yellow-400 rounded-full opacity-80"></div>
        </div>
        
        {/* Indicador que se mueve */}
        <div 
          className={cn(
            "absolute top-1 w-6 h-6 rounded-full bg-zinc-900 shadow-md transform transition-transform duration-300 ease-out flex items-center justify-center",
            "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-yellow-500 before:to-orange-600 before:opacity-90",
            "after:absolute after:inset-1 after:rounded-full after:bg-gradient-to-b after:from-slate-900 after:to-zinc-950",
            isAnimating ? "animate-pulse" : "",
            language === 'es' ? "left-1" : "left-9"
          )}
        >
          {/* Pequeño destello central en el indicador */}
          <div className="absolute inset-1/4 rounded-full bg-yellow-600/20"></div>
        </div>
        
        {/* Textos de los idiomas */}
        <span className={cn(
          "text-xs font-bold z-10 transition-all duration-300",
          language === 'es' ? "text-yellow-500" : "text-yellow-700/50"
        )}>ES</span>
        <span className={cn(
          "text-xs font-bold z-10 transition-all duration-300",
          language === 'en' ? "text-yellow-500" : "text-yellow-700/50"
        )}>EN</span>
        
        {/* Destellos decorativos estilo Transformers */}
        <div className={cn(
          "absolute w-12 h-1 bg-yellow-500 rotate-45 opacity-0 transition-opacity",
          isAnimating && "animate-flash"
        )}></div>
        <div className={cn(
          "absolute w-10 h-1 bg-orange-500 -rotate-45 opacity-0 transition-opacity",
          isAnimating && "animate-flash delay-75"
        )}></div>
      </button>
    </div>
  );
}

export default LanguageSwitch;