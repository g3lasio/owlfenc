import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateProjectProgress } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface ProjectProgressProps {
  projectId: string;
  currentProgress: string;
  onProgressUpdate: (newProgress: string) => void;
}

// Project progress stages
const progressStages = [
  { key: "estimate_created", label: "Presupuesto Creado", color: "bg-slate-500", icon: "ri-file-list-line" },
  { key: "estimate_sent", label: "Presupuesto Enviado", color: "bg-blue-500", icon: "ri-mail-send-line" },
  { key: "client_approved", label: "Cliente Aprobó", color: "bg-green-500", icon: "ri-check-double-line" },
  { key: "contract_sent", label: "Contrato Enviado", color: "bg-yellow-500", icon: "ri-file-paper-line" },
  { key: "contract_signed", label: "Contrato Firmado", color: "bg-purple-500", icon: "ri-file-text-line" },
  { key: "scheduled", label: "Instalación Programada", color: "bg-orange-500", icon: "ri-calendar-check-line" },
  { key: "in_progress", label: "En Progreso", color: "bg-amber-500", icon: "ri-tools-line" },
  { key: "completed", label: "Completado", color: "bg-emerald-500", icon: "ri-checkbox-circle-line" },
  { key: "cancelled", label: "Cancelado", color: "bg-red-500", icon: "ri-close-circle-line" },
];

export default function ProjectProgress({ projectId, currentProgress, onProgressUpdate }: ProjectProgressProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Get current stage index
  const currentStageIndex = progressStages.findIndex(stage => stage.key === currentProgress);
  
  // Function to update progress
  const handleProgressUpdate = async (newProgress: string) => {
    if (newProgress === currentProgress) return;
    
    try {
      setIsUpdating(true);
      await updateProjectProgress(projectId, newProgress);
      onProgressUpdate(newProgress);
      toast({
        title: "Progreso actualizado",
        description: `El proyecto ha sido actualizado a "${progressStages.find(stage => stage.key === newProgress)?.label}"`,
      });
    } catch (error) {
      console.error("Error updating project progress:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el progreso del proyecto",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-gray-800/60 border border-cyan-400/30 rounded-lg overflow-hidden">
      <div className="p-4">
        <h3 className="font-medium text-lg mb-4 text-white">Progreso del Proyecto</h3>
        
        {/* Progress Track */}
        <div className="relative mb-6">
          <div className="h-2 bg-gray-600 rounded-full">
            <div 
              className="h-2 bg-cyan-400 rounded-full transition-all duration-300" 
              style={{ 
                width: `${currentStageIndex >= 0 ? (currentStageIndex / (progressStages.length - 1)) * 100 : 0}%` 
              }}
            ></div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-400">Inicio</span>
            <span className="text-xs text-gray-400">Completado</span>
          </div>
        </div>
        
        {/* Current Stage */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <span className="font-medium mr-2 text-gray-300">Estado actual:</span>
            {currentProgress && (
              <Badge className={`${progressStages.find(stage => stage.key === currentProgress)?.color} text-white bg-opacity-80`}>
                <i className={`${progressStages.find(stage => stage.key === currentProgress)?.icon} mr-1`}></i>
                {progressStages.find(stage => stage.key === currentProgress)?.label}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Progress Timeline */}
        <div className="space-y-3 overflow-visible pr-2">
          {progressStages.map((stage, index) => (
            <div key={stage.key} className="flex items-center justify-between py-2">
              <div className="flex items-center flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                  index <= currentStageIndex ? stage.color : 'bg-slate-200'
                } text-white`}>
                  <i className={stage.icon}></i>
                </div>
                <span className={`${index <= currentStageIndex ? 'font-medium' : 'text-slate-500'} truncate`}>
                  {stage.label}
                </span>
              </div>
              
              {index !== currentStageIndex && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={isUpdating}
                  onClick={() => handleProgressUpdate(stage.key)}
                  className="ml-2 flex-shrink-0"
                >
                  {index < currentStageIndex ? 'Retroceder' : 'Avanzar'}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}