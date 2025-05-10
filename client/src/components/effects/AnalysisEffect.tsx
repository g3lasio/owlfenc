import React, { useState, useEffect } from 'react';

interface AnalysisEffectProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export const AnalysisEffect: React.FC<AnalysisEffectProps> = ({ 
  isVisible, 
  onComplete
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [completed, setCompleted] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  const analysisSteps = [
    "Iniciando OCR avanzado...",
    "Escaneando documento...",
    "Identificando patrones...",
    "Extrayendo datos del cliente...",
    "Analizando especificaciones del proyecto...",
    "Recopilando detalles de precios...",
    "Verificando información...",
    "Preparando resultados...",
    "Análisis completado."
  ];

  useEffect(() => {
    if (isVisible && !completed) {
      setShowParticles(true);
      let currentIndex = 0;
      const intervalId = setInterval(() => {
        if (currentIndex < analysisSteps.length) {
          setCurrentStep(analysisSteps[currentIndex]);
          setProgress(Math.min(100, (currentIndex / (analysisSteps.length - 1)) * 100));
          currentIndex++;
        } else {
          clearInterval(intervalId);
          setCompleted(true);
          setTimeout(() => {
            setShowParticles(false);
            if (onComplete) onComplete();
          }, 1000);
        }
      }, 800);

      return () => clearInterval(intervalId);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md p-6 mx-auto text-center">
        {showParticles && (
          <div className="analysis-particles">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="particle"></div>
            ))}
          </div>
        )}
        
        <div className="mb-6">
          <div className="w-32 h-32 mx-auto mb-4 relative">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-opacity-50 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-t-4 border-blue-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="ri-file-search-line text-4xl text-blue-500"></i>
            </div>
            <svg className="absolute inset-0" viewBox="0 0 100 100">
              <circle 
                cx="50" 
                cy="50" 
                r="46" 
                fill="none" 
                stroke="rgba(59, 130, 246, 0.2)" 
                strokeWidth="8" 
              />
              <circle 
                cx="50" 
                cy="50" 
                r="46" 
                fill="none" 
                stroke="rgba(59, 130, 246, 0.8)" 
                strokeWidth="8" 
                strokeDasharray={`${progress * 2.89}, 289`}
                transform="rotate(-90 50 50)" 
                className="transition-all duration-300 ease-in-out" 
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold mb-2 text-blue-500">
            Mervin AI
          </h2>
          <div className="h-16">
            <p className="text-white typewriter-text">{currentStep}</p>
          </div>
        </div>
      
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-6">
          <div 
            className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};