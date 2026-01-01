/**
 * SmartLoadingEffect Component
 * 
 * Muestra efectos visuales inteligentes basados en los metadatos del backend.
 * Detecta automáticamente el tipo de operación y muestra el efecto apropiado.
 */

import { useState, useEffect } from 'react';
import { AnalysisEffect } from '../effects/AnalysisEffect';
import { MervinWorkingEffect } from '../ui/mervin-working-effect';
import { Loader2 } from 'lucide-react';

interface SmartLoadingEffectProps {
  isVisible: boolean;
  metadata?: Record<string, any>;
  onComplete?: () => void;
}

export function SmartLoadingEffect({ isVisible, metadata, onComplete }: SmartLoadingEffectProps) {
  const [effectType, setEffectType] = useState<'analysis' | 'working' | 'generic'>('generic');
  const [currentTool, setCurrentTool] = useState<string>('');

  useEffect(() => {
    if (!isVisible || !metadata) {
      setEffectType('generic');
      return;
    }

    // Detectar el tipo de operación basado en metadata
    if (metadata.workflowStep === 'analysis' || metadata.operation === 'analyze') {
      setEffectType('analysis');
    } else if (metadata.currentTool || metadata.toolName) {
      setEffectType('working');
      setCurrentTool(metadata.currentTool || metadata.toolName || '');
    } else {
      setEffectType('generic');
    }
  }, [isVisible, metadata]);

  if (!isVisible) {
    return null;
  }

  // Renderizar el efecto apropiado según el tipo
  switch (effectType) {
    case 'analysis':
      return <AnalysisEffect isVisible={isVisible} onComplete={onComplete} />;
    
    case 'working':
      return <MervinWorkingEffect isVisible={isVisible} onComplete={onComplete} />;
    
    case 'generic':
    default:
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="relative mx-4 max-w-md rounded-2xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 p-8 shadow-2xl border border-cyan-400/40">
            <div className="text-center">
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-cyan-400 animate-spin" />
              <h3 className="text-xl font-bold text-cyan-400 mb-2">Mervin AI</h3>
              <p className="text-sm text-cyan-100">
                {currentTool ? `Ejecutando: ${currentTool}...` : 'Procesando...'}
              </p>
            </div>
          </div>
        </div>
      );
  }
}
