/**
 * WorkflowProgressIndicator Component
 * 
 * Muestra el progreso de un workflow en tiempo real usando los metadatos del backend.
 * Renderiza los pasos completados y el paso actual con una barra de progreso.
 */

import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface WorkflowStep {
  name: string;
  status: 'completed' | 'current' | 'pending';
}

interface WorkflowProgressIndicatorProps {
  metadata?: Record<string, any>;
  isVisible: boolean;
}

export function WorkflowProgressIndicator({ metadata, isVisible }: WorkflowProgressIndicatorProps) {
  if (!isVisible || !metadata?.workflowId) {
    return null;
  }

  const currentStep = metadata.currentStep || 0;
  const totalSteps = metadata.totalSteps || 0;
  const stepName = metadata.stepName || 'Procesando...';
  const progress = metadata.progress || 0;

  // Generar lista de pasos si está disponible
  const steps: WorkflowStep[] = [];
  if (metadata.steps && Array.isArray(metadata.steps)) {
    metadata.steps.forEach((step: string, index: number) => {
      steps.push({
        name: step,
        status: index < currentStep ? 'completed' : index === currentStep ? 'current' : 'pending'
      });
    });
  }

  return (
    <div className="my-4 p-4 rounded-lg border border-cyan-400/30 bg-gradient-to-br from-slate-900/50 to-slate-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          <h4 className="text-sm font-semibold text-cyan-400">
            Workflow en Progreso
          </h4>
        </div>
        <span className="text-xs text-cyan-300 font-mono">
          {currentStep}/{totalSteps}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-cyan-100">{stepName}</p>
          <span className="text-sm font-medium text-cyan-400">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Lista de pasos (si está disponible) */}
      {steps.length > 0 && (
        <div className="space-y-2 mt-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 text-sm ${
                step.status === 'completed'
                  ? 'text-green-400'
                  : step.status === 'current'
                  ? 'text-cyan-400'
                  : 'text-gray-500'
              }`}
            >
              {step.status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : step.status === 'current' ? (
                <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
              ) : (
                <Circle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className={step.status === 'current' ? 'font-medium' : ''}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
