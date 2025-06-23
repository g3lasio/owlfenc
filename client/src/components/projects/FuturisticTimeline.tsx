import { useState, useRef, useEffect } from 'react';
import { updateProjectProgress } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface FuturisticTimelineProps {
  projectId: string;
  currentProgress: string;
  onProgressUpdate: (newProgress: string) => void;
}

// Timeline stages with new mapping
const timelineStages = [
  { key: "estimate_created", label: "Estimate", icon: "ri-file-list-line", color: "#64748b" },
  { key: "estimate_rejected", label: "Rejected", icon: "ri-close-circle-line", color: "#ef4444" },
  { key: "client_approved", label: "In Contract", icon: "ri-file-text-line", color: "#8b5cf6" },
  { key: "scheduled", label: "Scheduled", icon: "ri-calendar-check-line", color: "#f59e0b" },
  { key: "in_progress", label: "Project", icon: "ri-tools-line", color: "#06b6d4" },
  { key: "payment_received", label: "Paid", icon: "ri-money-dollar-circle-line", color: "#10b981" },
  { key: "completed", label: "Completed", icon: "ri-checkbox-circle-line", color: "#22c55e" },
];

export default function FuturisticTimeline({ projectId, currentProgress, onProgressUpdate }: FuturisticTimelineProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get current stage index
  const currentStageIndex = timelineStages.findIndex(stage => stage.key === currentProgress);
  const validCurrentIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

  // Calculate position percentage
  const progressPercentage = (validCurrentIndex / (timelineStages.length - 1)) * 100;

  useEffect(() => {
    setDragPosition(progressPercentage);
  }, [progressPercentage]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setDragPosition(percentage);
  };

  const handleMouseUp = async () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Calculate closest stage
    const stageIndex = Math.round((dragPosition / 100) * (timelineStages.length - 1));
    const newStage = timelineStages[stageIndex];

    if (newStage && newStage.key !== currentProgress) {
      try {
        setIsUpdating(true);
        await updateProjectProgress(projectId, newStage.key);
        onProgressUpdate(newStage.key);
        toast({
          title: "Progress Updated",
          description: `Project moved to: ${newStage.label}`,
        });
      } catch (error) {
        console.error("Error updating progress:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update project progress",
        });
        // Reset position on error
        setDragPosition(progressPercentage);
      } finally {
        setIsUpdating(false);
      }
    } else {
      // Reset to current position if no change
      setDragPosition(progressPercentage);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragPosition, currentProgress]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text mb-2">
          Project Timeline
        </h3>
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
      </div>

      {/* Timeline Container */}
      <div className="relative">
        {/* Main Timeline Track */}
        <div 
          ref={timelineRef}
          className="relative h-4 bg-gray-800/60 rounded-full border border-cyan-400/30 overflow-hidden cursor-pointer"
          style={{ userSelect: 'none' }}
        >
          {/* Progress Fill */}
          <div 
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${isDragging ? dragPosition : progressPercentage}%` }}
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-300/30 to-blue-400/30 animate-pulse"></div>
          </div>

          {/* Draggable Handle */}
          <div 
            className={`absolute top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full cursor-grab transition-all duration-200 ${
              isDragging ? 'cursor-grabbing scale-110' : 'hover:scale-105'
            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ 
              left: `calc(${isDragging ? dragPosition : progressPercentage}% - 16px)`,
              background: 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%)',
              boxShadow: isDragging 
                ? '0 0 20px rgba(34, 211, 238, 0.6), 0 0 40px rgba(34, 211, 238, 0.3)' 
                : '0 4px 12px rgba(34, 211, 238, 0.4)',
            }}
            onMouseDown={handleMouseDown}
          >
            <div className="w-full h-full rounded-full border-2 border-white/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-white/80"></div>
            </div>
          </div>
        </div>

        {/* Stage Flags */}
        <div className="relative mt-8">
          {timelineStages.map((stage, index) => {
            const position = (index / (timelineStages.length - 1)) * 100;
            const isActive = index <= validCurrentIndex;
            const isCurrent = index === validCurrentIndex;
            
            return (
              <div 
                key={stage.key}
                className="absolute transform -translate-x-1/2"
                style={{ left: `${position}%` }}
              >
                {/* Flag Pole */}
                <div className={`w-px h-12 mx-auto transition-all duration-300 ${
                  isActive ? 'bg-gradient-to-b from-cyan-400 to-cyan-600' : 'bg-gray-600'
                }`}></div>
                
                {/* Flag */}
                <div className={`relative mt-2 transition-all duration-300 ${
                  isCurrent ? 'scale-110' : isActive ? 'scale-100' : 'scale-90'
                }`}>
                  <div 
                    className={`px-3 py-2 rounded-lg border backdrop-blur-sm transition-all duration-300 ${
                      isActive 
                        ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-cyan-400/50 text-cyan-100' 
                        : 'bg-gray-800/40 border-gray-600/30 text-gray-400'
                    } ${isCurrent ? 'shadow-lg shadow-cyan-400/20' : ''}`}
                    style={{
                      background: isActive 
                        ? `linear-gradient(135deg, ${stage.color}20, ${stage.color}10)` 
                        : undefined
                    }}
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <i className={`${stage.icon} text-lg ${
                        isActive ? 'text-cyan-300' : 'text-gray-500'
                      }`}></i>
                      <span className={`text-xs font-medium whitespace-nowrap ${
                        isActive ? 'text-cyan-100' : 'text-gray-400'
                      }`}>
                        {stage.label}
                      </span>
                    </div>
                  </div>
                  
                  {/* Flag Triangle */}
                  <div className={`absolute top-0 -right-2 w-0 h-0 border-l-[8px] border-t-[16px] border-b-[16px] transition-all duration-300 ${
                    isActive 
                      ? 'border-l-cyan-500/30 border-t-transparent border-b-transparent' 
                      : 'border-l-gray-700/30 border-t-transparent border-b-transparent'
                  }`}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>


    </div>
  );
}