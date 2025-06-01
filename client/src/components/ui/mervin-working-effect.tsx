import { useState, useEffect } from 'react';
import { Bot, Brain, Zap } from 'lucide-react';

interface MervinWorkingEffectProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const MERVIN_PHRASES = [
  "Mervin leyendo y pensando: 'Esto seguro fue escrito con los ojos cerrados.'",
  "Mervin tratando de entender tus palabras como si fueran letras de doctor.",
  "Mervin, ya con dolor de cabeza, preguntándose si es broma o realmente escribes así."
];

export function MervinWorkingEffect({ isVisible, onComplete }: MervinWorkingEffectProps) {
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isVisible) return;

    // Seleccionar una frase aleatoria al iniciar
    const randomPhrase = MERVIN_PHRASES[Math.floor(Math.random() * MERVIN_PHRASES.length)];
    setCurrentPhrase(randomPhrase);

    // Animación de puntos
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    // Auto completar después de 3-4 segundos
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 3500);

    return () => {
      clearInterval(dotsInterval);
      clearTimeout(completeTimer);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="relative mx-4 max-w-md rounded-lg bg-gradient-to-br from-purple-900/90 to-blue-900/90 p-6 shadow-2xl border border-cyan-400/30">
        {/* Efectos de fondo */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-400/10 to-purple-400/10 animate-pulse" />
        
        {/* Esquinas cyberpunk */}
        <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-400" />
        <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-400" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-400" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-400" />
        
        <div className="relative z-10 text-center">
          {/* Icono animado de Mervin */}
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <Bot className="h-12 w-12 text-cyan-400 animate-bounce" />
              <div className="absolute -top-2 -right-2">
                <Brain className="h-6 w-6 text-purple-400 animate-pulse" />
              </div>
              <div className="absolute -bottom-1 -left-1">
                <Zap className="h-4 w-4 text-yellow-400 animate-ping" />
              </div>
            </div>
          </div>
          
          {/* Frase humorística */}
          <div className="mb-4">
            <p className="text-sm text-cyan-100 italic leading-relaxed">
              {currentPhrase}
            </p>
          </div>
          
          {/* Indicador de progreso */}
          <div className="mb-2">
            <p className="text-xs text-purple-300 font-medium">
              Mejorando texto{dots}
            </p>
          </div>
          
          {/* Barra de progreso animada */}
          <div className="w-full bg-gray-700/50 rounded-full h-2">
            <div className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 rounded-full animate-pulse" 
                 style={{ width: '75%', animation: 'progress 3.5s ease-in-out' }} />
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}