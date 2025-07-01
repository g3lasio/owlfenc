import { useState, useEffect } from 'react';

interface DeepSearchEffectProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const FUTURISTIC_PHRASES = [
  "Mervin AI iniciando protocolo de meta-análisis cuántico sobre el proyecto.",
  "Desplegando rutina de inspección multinivel: arquitectura, lógica y contexto operativo en proceso.",
  "Activando secuencia de escaneo espectral y correlación algorítmica avanzada con Mervin AI.",
  "Mervin AI ejecutando auditoría integral bajo protocolo de inferencia contextual y trazabilidad dinámica.",
  "Enganchando subsistema de detección de anomalías mediante redes neuronales profundas.",
  "Lanzando análisis holístico a través del framework de interpretación heurística Mervin AI.",
  "Sincronizando módulos de visión computacional y procesamiento semántico para revisión estructural.",
  "Activando heurística de reconstrucción y mapeo ontológico de proyecto bajo ambiente aislado.",
  "Mervin AI implementando pipeline de evaluación con verificación cruzada y aprendizaje autónomo.",
  "Ejecutando barrido en tiempo real usando protocolos de análisis hiperparamétrico y correlación contextual."
];

// Logo de Mervin AI como componente SVG
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
  </div>
);

export function DeepSearchEffect({ isVisible, onComplete }: DeepSearchEffectProps) {
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isVisible) return;

    // Seleccionar una frase aleatoria al iniciar
    const randomPhrase = FUTURISTIC_PHRASES[Math.floor(Math.random() * FUTURISTIC_PHRASES.length)];
    setCurrentPhrase(randomPhrase);

    // Animación de puntos
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    // Cambiar frase cada 4 segundos
    const phraseInterval = setInterval(() => {
      const newPhrase = FUTURISTIC_PHRASES[Math.floor(Math.random() * FUTURISTIC_PHRASES.length)];
      setCurrentPhrase(newPhrase);
    }, 4000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(phraseInterval);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative flex flex-col items-center justify-center space-y-3 max-w-md mx-4">
        {/* Logo Mervin compacto con efecto futurista */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
          <div className="relative bg-gradient-to-r from-cyan-400/20 to-blue-500/20 border border-cyan-400/40 rounded-full p-3">
            <div className="animate-spin" style={{ animationDuration: '3s' }}>
              <MervinLogo className="h-12 w-12 text-cyan-400" />
            </div>
          </div>
          {/* Anillo giratorio minimalista */}
          <div className="absolute inset-0 border border-cyan-400/20 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
        </div>

        {/* Texto futurista compacto */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            MERVIN AI
          </h2>
          <p className="text-base text-cyan-300/80 animate-pulse">
            DeepSearch análisis
          </p>
          
          {/* Frase técnica compacta */}
          <div className="bg-slate-900/40 border border-cyan-400/20 rounded-md p-3 backdrop-blur-sm max-w-xs">
            <p className="text-xs text-cyan-100/90 leading-relaxed font-mono">
              {currentPhrase.split('.')[0]}...{dots}
            </p>
          </div>
          
          {/* Indicador de progreso minimalista */}
          <div className="flex items-center justify-center space-x-1 mt-3">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></div>
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
          </div>
        </div>

        {/* Partículas sutiles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-cyan-400/30 rounded-full animate-pulse"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1.5 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
        
        {/* Línea de escaneo única */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-3/4 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent left-1/2 transform -translate-x-1/2 animate-pulse" 
               style={{ top: '50%', animationDuration: '2s' }}></div>
        </div>
      </div>
    </div>
  );
}