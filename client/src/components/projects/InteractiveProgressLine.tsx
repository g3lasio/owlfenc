import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateProject } from "@/lib/firebase";

interface ProgressStep {
  id: string;
  name: string;
  icon: string;
  position: number; // 0-100 percentage
  completed: boolean;
}

interface InteractiveProgressLineProps {
  projectId: string;
  currentProgress: string;
  onProgressUpdate: (newProgress: string) => void;
}

const PROGRESS_STEPS: ProgressStep[] = [
  { id: "estimate_created", name: "Estimado", icon: "ri-calculator-line", position: 0, completed: false },
  { id: "declined", name: "Declinado", icon: "ri-thumb-down-line", position: 16.67, completed: false },
  { id: "approved", name: "Aprobado", icon: "ri-check-line", position: 33.33, completed: false },
  { id: "contract_signed", name: "Contrato", icon: "ri-file-text-line", position: 50, completed: false },
  { id: "work_started", name: "Iniciado", icon: "ri-hammer-line", position: 66.67, completed: false },
  { id: "payment_received", name: "Pagado", icon: "ri-money-dollar-circle-line", position: 83.33, completed: false },
  { id: "work_completed", name: "Finalizado", icon: "ri-flag-line", position: 100, completed: false }
];

export default function InteractiveProgressLine({ projectId, currentProgress, onProgressUpdate }: InteractiveProgressLineProps) {
  const [steps, setSteps] = useState<ProgressStep[]>(PROGRESS_STEPS);
  const [draggedStep, setDraggedStep] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const progressLineRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Actualizar estados completados basado en progreso actual
  useEffect(() => {
    const currentStepIndex = PROGRESS_STEPS.findIndex(step => step.id === currentProgress);
    const updatedSteps = PROGRESS_STEPS.map((step, index) => ({
      ...step,
      completed: index <= currentStepIndex
    }));
    setSteps(updatedSteps);
  }, [currentProgress]);

  // Calcular porcentaje de progreso actual
  const getCurrentProgressPercentage = () => {
    const currentStep = steps.find(step => step.id === currentProgress);
    return currentStep ? currentStep.position : 0;
  };

  // Manejar click en una banderita
  const handleStepClick = async (stepId: string) => {
    if (isDragging) return;
    
    try {
      await updateProject(projectId, { projectProgress: stepId });
      onProgressUpdate(stepId);
      
      const stepName = steps.find(s => s.id === stepId)?.name || '';
      toast({
        title: "Progreso actualizado",
        description: `Proyecto avanzado a: ${stepName}`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el progreso"
      });
    }
  };

  // Manejar arrastre del botón deslizador
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDraggedStep(currentProgress);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !progressLineRef.current) return;
    
    const rect = progressLineRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    
    // Encontrar el paso más cercano
    const closestStep = PROGRESS_STEPS.reduce((closest, step) => 
      Math.abs(step.position - percentage) < Math.abs(closest.position - percentage) ? step : closest
    );
    
    setDraggedStep(closestStep.id);
  };

  const handleMouseUp = async () => {
    if (!isDragging || !draggedStep) return;
    
    setIsDragging(false);
    
    if (draggedStep !== currentProgress) {
      await handleStepClick(draggedStep);
    }
    
    setDraggedStep(null);
  };

  // Manejar arrastre de banderitas individuales
  const handleFlagMouseDown = (stepId: string) => {
    setDraggedStep(stepId);
    setIsDragging(true);
  };

  return (
    <div className="w-full py-6 px-4">
      {/* Línea de progreso principal */}
      <div 
        ref={progressLineRef}
        className="relative h-2 bg-gray-700/50 rounded-full cursor-pointer overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Gradiente de fondo futurista */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-full"></div>
        
        {/* Barra de progreso completado */}
        <div 
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out shadow-lg ${
            draggedStep === 'declined' || currentProgress === 'declined' 
              ? 'bg-gradient-to-r from-red-500 via-red-600 to-red-700' 
              : 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600'
          }`}
          style={{ width: `${draggedStep ? PROGRESS_STEPS.find(s => s.id === draggedStep)?.position || 0 : getCurrentProgressPercentage()}%` }}
        >
          {/* Efecto de brillo animado */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse rounded-full"></div>
        </div>

        {/* Botón deslizador arrastrable */}
        <div 
          className="absolute top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing z-10 transition-all duration-300"
          style={{ left: `${draggedStep ? PROGRESS_STEPS.find(s => s.id === draggedStep)?.position || 0 : getCurrentProgressPercentage()}%` }}
          onMouseDown={handleSliderMouseDown}
        >
          <div className={`
            w-6 h-6 rounded-full border-2 bg-white shadow-lg transition-all duration-300 flex items-center justify-center
            ${isDragging ? 'scale-125 border-yellow-400 shadow-yellow-400/50' : 'border-cyan-400 hover:border-yellow-400 hover:scale-110'}
            ${draggedStep === 'declined' || currentProgress === 'declined' ? 'border-red-500 bg-red-100' : ''}
          `}>
            <div className={`
              w-2 h-2 rounded-full transition-colors duration-300
              ${isDragging ? 'bg-yellow-400' : 'bg-cyan-400'}
              ${draggedStep === 'declined' || currentProgress === 'declined' ? 'bg-red-500' : ''}
            `}></div>
          </div>
        </div>

        {/* Efectos de luz en los extremos */}
        <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-cyan-400 rounded-full blur-sm opacity-60"></div>
        <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-purple-600 rounded-full blur-sm opacity-60"></div>
      </div>

      {/* Banderitas de progreso */}
      <div className="relative mt-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="absolute transform -translate-x-1/2 cursor-pointer group"
            style={{ left: `${step.position}%` }}
            onMouseDown={() => handleFlagMouseDown(step.id)}
            onClick={() => handleStepClick(step.id)}
          >
            {/* Banderita */}
            <div className={`
              relative transition-all duration-300 transform hover:scale-110
              ${step.completed ? 'text-cyan-400' : 'text-gray-500'}
              ${draggedStep === step.id ? 'scale-125 z-10' : ''}
              ${currentProgress === step.id ? 'text-yellow-400 animate-pulse' : ''}
            `}>
              {/* Asta de la bandera */}
              <div className={`
                w-0.5 h-8 mx-auto mb-1 transition-colors duration-300
                ${step.id === 'declined' && (step.completed || currentProgress === 'declined' || draggedStep === 'declined') 
                  ? 'bg-red-500' 
                  : step.completed ? 'bg-cyan-400' : 'bg-gray-600'}
                ${currentProgress === step.id && step.id !== 'declined' ? 'bg-yellow-400' : ''}
              `}></div>
              
              {/* Bandera con icono */}
              <div className={`
                relative w-8 h-6 rounded-sm transition-all duration-300 flex items-center justify-center text-xs
                ${step.id === 'declined' && (step.completed || currentProgress === 'declined' || draggedStep === 'declined') 
                  ? 'bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg shadow-red-400/30' 
                  : step.completed ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-400/30' : 'bg-gray-700 text-gray-400'}
                ${currentProgress === step.id && step.id !== 'declined' ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg shadow-yellow-400/30' : ''}
                ${draggedStep === step.id && step.id !== 'declined' ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white' : ''}
              `}>
                <i className={step.icon}></i>
                
                {/* Efecto de ondas para paso actual */}
                {currentProgress === step.id && (
                  <div className="absolute inset-0 rounded-sm">
                    <div className="absolute inset-0 bg-yellow-400/20 rounded-sm animate-ping"></div>
                    <div className="absolute inset-0 bg-yellow-400/10 rounded-sm animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Tooltip futurista */}
            <div className={`
              absolute top-full mt-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20
              bg-gray-900/95 border border-cyan-400/50 rounded px-2 py-1 text-xs text-cyan-300 whitespace-nowrap
              shadow-lg shadow-cyan-400/20 backdrop-blur-sm
            `}>
              {step.name}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-cyan-400/50"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicador de progreso numérico */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-2 bg-gray-800/50 border border-cyan-400/30 rounded-full px-4 py-2">
          <i className="ri-route-line text-cyan-400"></i>
          <span className="text-cyan-300 text-sm font-medium">
            Progreso: {Math.round(getCurrentProgressPercentage())}%
          </span>
          <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-600 transition-all duration-500"
              style={{ width: `${getCurrentProgressPercentage()}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Instrucciones sutiles */}
      <div className="mt-3 text-center text-xs text-gray-500">
        Arrastra el botón deslizador o haz clic en las banderitas para actualizar el progreso
      </div>
    </div>
  );
}