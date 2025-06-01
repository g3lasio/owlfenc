import { useState, useEffect } from 'react';

interface MervinWorkingEffectProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const MERVIN_PHRASES = [
  "Mervin leyendo y pensando: 'Esto seguro fue escrito con los ojos cerrados.'",
  "Mervin tratando de entender tus palabras como si fueran letras de doctor.",
  "Mervin, ya con dolor de cabeza, preguntándose si es broma o realmente escribes así."
];

// Logo de Mervin AI como componente SVG optimizado
const MervinLogo = ({ className = "h-16 w-16" }: { className?: string }) => (
  <div className={`${className} relative`}>
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {/* Círculo exterior con engranaje */}
      <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400" />
      
      {/* Dientes del engranaje */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30) * (Math.PI / 180);
        const x1 = 100 + Math.cos(angle) * 85;
        const y1 = 100 + Math.sin(angle) * 85;
        const x2 = 100 + Math.cos(angle) * 95;
        const y2 = 100 + Math.sin(angle) * 95;
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="3" className="text-cyan-400" />
        );
      })}
      
      {/* Triángulos centrales */}
      <polygon points="100,60 120,90 80,90" fill="currentColor" className="text-cyan-400" />
      <polygon points="100,70 115,95 85,95" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-300" />
      <polygon points="100,80 110,100 90,100" fill="currentColor" className="text-cyan-200" />
      
      {/* Círculo central */}
      <circle cx="100" cy="100" r="25" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400" />
      
      {/* Líneas de conexión (circuitos) */}
      <path d="M 60 100 Q 50 80 70 60 T 100 50" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan-300" />
      <path d="M 140 100 Q 150 80 130 60 T 100 50" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan-300" />
      <path d="M 100 140 Q 80 150 60 130 T 50 100" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan-300" />
      <path d="M 100 140 Q 120 150 140 130 T 150 100" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan-300" />
      
      {/* Puntos de conexión */}
      <circle cx="70" cy="60" r="3" fill="currentColor" className="text-cyan-400" />
      <circle cx="130" cy="60" r="3" fill="currentColor" className="text-cyan-400" />
      <circle cx="60" cy="130" r="3" fill="currentColor" className="text-cyan-400" />
      <circle cx="140" cy="130" r="3" fill="currentColor" className="text-cyan-400" />
    </svg>
    
    {/* Efectos de brillo animados */}
    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-purple-400/20 animate-pulse" />
    <div className="absolute inset-2 rounded-full bg-gradient-to-r from-cyan-400/10 to-purple-400/10 animate-ping" style={{ animationDuration: '3s' }} />
  </div>
);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative mx-4 max-w-lg rounded-2xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 p-8 shadow-2xl border border-cyan-400/40">
        {/* Efectos de fondo futuristas */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/5 to-purple-400/5 animate-pulse" />
        <div className="absolute inset-0 rounded-2xl" style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(34, 211, 238, 0.1) 0%, transparent 50%)',
          animation: 'pulse 2s infinite'
        }} />
        
        {/* Esquinas cyberpunk mejoradas */}
        <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-cyan-400 rounded-tl-sm" />
        <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-cyan-400 rounded-tr-sm" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-cyan-400 rounded-bl-sm" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-cyan-400 rounded-br-sm" />
        
        {/* Líneas de conexión en las esquinas */}
        <div className="absolute top-2 left-8 w-4 h-0.5 bg-cyan-400/60" />
        <div className="absolute top-8 left-2 w-0.5 h-4 bg-cyan-400/60" />
        <div className="absolute top-2 right-8 w-4 h-0.5 bg-cyan-400/60" />
        <div className="absolute top-8 right-2 w-0.5 h-4 bg-cyan-400/60" />
        
        <div className="relative z-10 text-center">
          {/* Logo animado de Mervin */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="animate-spin" style={{ animationDuration: '4s' }}>
                <MervinLogo className="h-20 w-20 text-cyan-400" />
              </div>
              
              {/* Partículas flotantes */}
              <div className="absolute -top-2 -right-2 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
              <div className="absolute -bottom-2 -left-2 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1s' }} />
              <div className="absolute top-0 -left-3 w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '2s' }} />
            </div>
          </div>
          
          {/* Título futurista */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-cyan-400 mb-2 tracking-wider">MERVIN AI</h3>
            <div className="text-xs text-cyan-300 font-mono tracking-wide mb-3">
              ⟨ ENHANCING TEXT ⟩
            </div>
          </div>
          
          {/* Frase humorística */}
          <div className="mb-6">
            <p className="text-sm text-cyan-100 italic leading-relaxed px-2">
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