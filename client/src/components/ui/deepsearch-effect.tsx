import React, { useState, useEffect } from 'react';
import { MapPin, Search, Brain, Calculator, CheckCircle2, AlertTriangle, Zap, Eye, Target } from 'lucide-react';

interface DeepSearchEffectProps {
  isVisible: boolean;
  onComplete?: () => void;
  projectDescription?: string;
  location?: string;
}

// Fases del General Contractor Intelligence System
const ANALYSIS_PHASES = [
  {
    id: 'location',
    icon: MapPin,
    title: 'Verificación Geográfica',
    description: 'Validando dirección del cliente',
    details: 'Analizando ubicación, mercado local y factores climáticos',
    duration: 3000,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  {
    id: 'magnitude',
    icon: Search,
    title: 'Análisis de Magnitud',
    description: 'Evaluando complejidad del proyecto',
    details: 'Determinando escala, dificultad y requerimientos estructurales',
    duration: 4000,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30'
  },
  {
    id: 'procedures',
    icon: Target,
    title: 'Diseño de Procedimientos',
    description: 'Planificando ejecución paso a paso',
    details: 'Creando secuencia de trabajo como contractor experimentado',
    duration: 5000,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30'
  },
  {
    id: 'materials',
    icon: Calculator,
    title: 'Cálculo Inteligente',
    description: 'Calculando materiales y cantidades',
    details: 'Estimando materiales basado en procedimientos reales',
    duration: 4000,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30'
  },
  {
    id: 'labor',
    icon: Brain,
    title: 'Análisis de Mercado Local',
    description: 'Estimando costos de labor locales',
    details: 'Aplicando conocimiento de rates por área geográfica',
    duration: 4500,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30'
  },
  {
    id: 'validation',
    icon: Eye,
    title: 'Validación de Realidad',
    description: 'Verificando coherencia de resultados',
    details: 'Aplicando sanity checks contra experiencia de contractor',
    duration: 3000,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30'
  }
];

// Logo avanzado del General Contractor Intelligence
const AdvancedLogo = ({ className = "h-20 w-20", isActive = false, currentPhase = 'location' }: { className?: string; isActive?: boolean; currentPhase?: string }) => (
  <div className={`${className} relative`}>
    {/* Círculos concéntricos con pulsación */}
    <div className="absolute inset-0 animate-ping opacity-20">
      <div className="w-full h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"></div>
    </div>
    <div className="absolute inset-2 animate-pulse opacity-30" style={{ animationDelay: '0.5s' }}>
      <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-500"></div>
    </div>
    
    {/* Logo principal */}
    <svg viewBox="0 0 200 200" className="w-full h-full relative z-10">
      {/* Anillos exteriores rotativos */}
      <g className={`transform-gpu ${isActive ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }}>
        <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400 opacity-60" />
        <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="1" className="text-blue-400 opacity-40" strokeDasharray="5,5" />
      </g>
      
      {/* Anillo medio con indicators */}
      <g className={`transform-gpu ${isActive ? 'animate-spin' : ''}`} style={{ animationDuration: '12s', animationDirection: 'reverse' }}>
        {ANALYSIS_PHASES.map((phase, i) => {
          const angle = (i * 60) * (Math.PI / 180);
          const x = 100 + Math.cos(angle) * 70;
          const y = 100 + Math.sin(angle) * 70;
          const isCurrentPhase = phase.id === currentPhase;
          return (
            <circle 
              key={i} 
              cx={x} 
              cy={y} 
              r={isCurrentPhase ? "4" : "2"} 
              fill="currentColor" 
              className={isCurrentPhase ? "text-cyan-300" : "text-blue-500 opacity-60"}
            />
          );
        })}
      </g>
      
      {/* Centro con icono dinámico */}
      <circle cx="100" cy="100" r="35" fill="currentColor" className="text-slate-900/80" />
      <circle cx="100" cy="100" r="33" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400" />
      
      {/* Circuitos conectores animados */}
      <path d="M 60 100 L 140 100" stroke="currentColor" strokeWidth="1" className="text-cyan-300 opacity-50" strokeDasharray="3,3">
        <animate attributeName="stroke-dashoffset" values="0;6" dur="1s" repeatCount="indefinite"/>
      </path>
      <path d="M 100 60 L 100 140" stroke="currentColor" strokeWidth="1" className="text-cyan-300 opacity-50" strokeDasharray="3,3">
        <animate attributeName="stroke-dashoffset" values="0;6" dur="1s" repeatCount="indefinite"/>
      </path>
      
      {/* Texto central */}
      <text x="100" y="106" textAnchor="middle" className="text-xs fill-cyan-300 font-mono font-bold">GC.AI</text>
    </svg>
  </div>
);

// Componente de datos técnicos en tiempo real
const TechnicalReadout = ({ phase, progress, projectDescription, location }: { 
  phase: typeof ANALYSIS_PHASES[0]; 
  progress: number;
  projectDescription?: string;
  location?: string;
}) => (
  <div className="space-y-2 font-mono text-xs">
    <div className="grid grid-cols-2 gap-2 text-cyan-300/70">
      <div>PROJECT_ID: {Math.random().toString(36).substr(2, 8).toUpperCase()}</div>
      <div>THREAD_ID: {Math.random().toString(36).substr(2, 6)}</div>
      <div>PHASE: {phase.id.toUpperCase()}</div>
      <div>PROGRESS: {progress.toFixed(1)}%</div>
    </div>
    
    {projectDescription && (
      <div className="text-cyan-400/60">
        DESC: {projectDescription.substring(0, 40)}...
      </div>
    )}
    
    {location && (
      <div className="text-blue-400/60">
        LOC: {location.toUpperCase()}
      </div>
    )}
    
    <div className="text-green-400/60">
      STATUS: {phase.title.toUpperCase()} • {phase.description.toUpperCase()}
    </div>
  </div>
);

export function DeepSearchEffect({ isVisible, onComplete, projectDescription, location }: DeepSearchEffectProps) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);
  const [subProcess, setSubProcess] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const currentPhase = ANALYSIS_PHASES[currentPhaseIndex];

  useEffect(() => {
    if (!isVisible) return;

    let phaseTimer: NodeJS.Timeout;
    let progressTimer: NodeJS.Timeout;
    let subProcessTimer: NodeJS.Timeout;

    const startPhase = (index: number) => {
      if (index >= ANALYSIS_PHASES.length) {
        setIsCompleting(true);
        setTimeout(() => {
          onComplete?.();
        }, 2000);
        return;
      }

      const phase = ANALYSIS_PHASES[index];
      setCurrentPhaseIndex(index);
      setPhaseProgress(0);
      
      // Subprocess messages para hacer más realista
      const subProcesses = [
        'Inicializando módulos de análisis...',
        'Conectando con base de datos...',
        'Aplicando algoritmos de ML...',
        'Validando resultados preliminares...',
        'Optimizando cálculos...',
        'Finalizando análisis...'
      ];

      let subIndex = 0;
      subProcessTimer = setInterval(() => {
        setSubProcess(subProcesses[subIndex % subProcesses.length]);
        subIndex++;
      }, 800);

      // Progress animation
      progressTimer = setInterval(() => {
        setPhaseProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressTimer);
            return 100;
          }
          return prev + (Math.random() * 8 + 2); // Variable speed
        });
      }, 100);

      // Phase completion
      phaseTimer = setTimeout(() => {
        clearInterval(progressTimer);
        clearInterval(subProcessTimer);
        setPhaseProgress(100);
        setTotalProgress((index + 1) / ANALYSIS_PHASES.length * 100);
        setTimeout(() => startPhase(index + 1), 500);
      }, phase.duration);
    };

    startPhase(0);

    return () => {
      clearTimeout(phaseTimer);
      clearInterval(progressTimer);
      clearInterval(subProcessTimer);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="relative max-w-lg w-full mx-4">
        {/* Fondo con efecto de circuitos */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          <div className="absolute top-20 right-20 w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-20 left-20 w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-10 right-10 w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
        </div>

        {/* Contenedor principal */}
        <div className={`relative p-8 rounded-2xl border-2 transition-all duration-500 ${currentPhase?.bgColor} ${currentPhase?.borderColor} backdrop-blur-sm`}>
          
          {/* Header con logo */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <AdvancedLogo 
                className="h-16 w-16" 
                isActive={!isCompleting} 
                currentPhase={currentPhase?.id}
              />
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent font-mono">
                  GENERAL CONTRACTOR AI
                </h2>
                <div className="text-xs text-cyan-300/70 font-mono">
                  v2.0.1 • QUANTUM ANALYSIS ENGINE
                </div>
              </div>
            </div>
            
            {/* Status indicator */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${currentPhase?.bgColor} ${currentPhase?.borderColor} border`}>
              {React.createElement(currentPhase?.icon || Brain, { className: `h-4 w-4 ${currentPhase?.color} animate-pulse` })}
              <span className={`text-xs font-mono ${currentPhase?.color}`}>ACTIVE</span>
            </div>
          </div>

          {/* Current Phase Info */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-2">
              {React.createElement(currentPhase?.icon || Brain, { className: `h-5 w-5 ${currentPhase?.color}` })}
              <h3 className={`text-lg font-semibold ${currentPhase?.color}`}>
                {currentPhase?.title}
              </h3>
            </div>
            <p className="text-gray-300 text-sm mb-1">{currentPhase?.description}</p>
            <p className="text-gray-400 text-xs">{currentPhase?.details}</p>
            
            {/* Subprocess */}
            <div className="mt-2 text-xs text-cyan-300/80 font-mono">
              {'>'} {subProcess}
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-3 mb-6">
            {/* Phase Progress */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-400 font-mono">CURRENT PHASE</span>
                <span className="text-xs text-cyan-400 font-mono">{phaseProgress.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ${phaseProgress > 0 ? 'animate-pulse' : ''}`}
                  style={{ width: `${phaseProgress}%` }}
                />
              </div>
            </div>

            {/* Total Progress */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-400 font-mono">TOTAL ANALYSIS</span>
                <span className="text-xs text-green-400 font-mono">{totalProgress.toFixed(0)}%</span>
              </div>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Technical Readout */}
          <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/20">
            <TechnicalReadout 
              phase={currentPhase}
              progress={phaseProgress}
              projectDescription={projectDescription}
              location={location}
            />
          </div>

          {/* Completion State */}
          {isCompleting && (
            <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <div className="text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto animate-pulse" />
                <h3 className="text-xl font-bold text-green-400">ANÁLISIS COMPLETADO</h3>
                <p className="text-gray-300 text-sm">Preparando resultados inteligentes...</p>
              </div>
            </div>
          )}
        </div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60 animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${2 + i * 0.5}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}