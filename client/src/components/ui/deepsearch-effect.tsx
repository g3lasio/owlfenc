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
      <div className="relative flex flex-col items-center justify-center space-y-4 max-w-sm mx-4">
        {/* Logo Mervin estático con pulsación */}
        <div className="relative">
          <div className="animate-pulse" style={{ animationDuration: '2s' }}>
            <MervinLogo className="h-16 w-16 text-cyan-400" />
          </div>
        </div>

        {/* Texto y estado */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            MERVIN AI
          </h2>
          <p className="text-base text-cyan-300/90">
            Analizando proyecto{dots}
          </p>
          
          {/* Indicador de progreso de trabajo */}
          <div className="flex items-center justify-center space-x-2 mt-4">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
          
          <p className="text-xs text-cyan-200/70 mt-2">
            Procesando datos con IA
          </p>
        </div>
      </div>
    </div>
  );
}