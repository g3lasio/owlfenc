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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative flex flex-col items-center justify-center space-y-6 max-w-2xl mx-4">
        {/* Logo Mervin con efecto futurista */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full blur-xl opacity-75 animate-pulse"></div>
          <div className="relative bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 p-1 rounded-full">
            <div className="bg-gray-900 rounded-full p-6">
              <div className="animate-spin" style={{ animationDuration: '4s' }}>
                <MervinLogo className="h-24 w-24 text-cyan-400" />
              </div>
            </div>
          </div>
          {/* Anillos giratorios */}
          <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-2 border-blue-500/30 rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
          <div className="absolute inset-4 border-2 border-purple-600/30 rounded-full animate-spin"></div>
        </div>

        {/* Texto futurista */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            MERVIN AI
          </h2>
          <p className="text-xl text-gray-300 animate-pulse">
            DeepSearch IA
          </p>
          
          {/* Frase técnica aleatoria */}
          <div className="bg-slate-900/60 border border-cyan-400/30 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm text-cyan-100 leading-relaxed max-w-lg mx-auto font-mono">
              {currentPhrase}{dots}
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-2 mt-4">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>

        {/* Efecto de partículas */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-20 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
        
        {/* Líneas de escaneo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" 
               style={{ top: '20%', animationDuration: '2s' }}></div>
          <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" 
               style={{ top: '50%', animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
          <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" 
               style={{ top: '80%', animationDuration: '3s', animationDelay: '1s' }}></div>
        </div>
      </div>
    </div>
  );
}