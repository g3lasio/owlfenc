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
    <div className="w-full max-w-4xl mx-auto px-2 md:px-4 py-2 md:py-3">
      {/* Header - Centered */}
      <div className="text-center mb-3 md:mb-4">
        <h3 className="text-lg md:text-xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text mb-1">
          Project Timeline
        </h3>
        <div className="w-16 md:w-24 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent mx-auto"></div>
      </div>

      {/* Compact Timeline Container */}
      <div className="relative bg-gray-900/50 rounded-xl border border-cyan-400/20 p-3 md:p-4 backdrop-blur-sm overflow-hidden">
        {/* Stage Icons Row - Flexbox Layout */}
        <div className="flex items-center justify-between gap-1 md:gap-2 mb-3 px-2">
          {timelineStages.map((stage, index) => {
            const isActive = index <= validCurrentIndex;
            const isCurrent = index === validCurrentIndex;
            
            return (
              <div key={stage.key} className="flex flex-col items-center flex-1 min-w-0">
                {/* Stage Icon */}
                <div 
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                    isActive 
                      ? 'bg-gradient-to-br from-cyan-400/20 to-blue-600/20 border-2 border-cyan-400/60 shadow-lg' 
                      : 'bg-gray-800/50 border-2 border-gray-600/30'
                  } ${isCurrent ? 'ring-2 ring-cyan-400/50 ring-offset-2 ring-offset-gray-900 scale-110' : ''}`}
                  style={{
                    backgroundColor: isActive ? `${stage.color}20` : undefined,
                    borderColor: isActive ? `${stage.color}60` : undefined,
                  }}
                >
                  <i className={`${stage.icon} text-sm md:text-lg transition-all duration-300 ${
                    isActive ? 'text-cyan-200' : 'text-gray-500'
                  }`}></i>
                  
                  {/* Current Stage Pulse */}
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full animate-ping bg-cyan-400/20"></div>
                  )}
                </div>
                
                {/* Stage Label */}
                <span className={`text-xs md:text-sm font-medium mt-1 transition-all duration-300 text-center leading-tight ${
                  isActive ? 'text-cyan-100' : 'text-gray-400'
                } hidden sm:block`}>
                  {stage.label}
                </span>
                
                {/* Mobile: Abbreviated Label */}
                <span className={`text-[10px] font-medium mt-1 transition-all duration-300 text-center leading-tight ${
                  isActive ? 'text-cyan-100' : 'text-gray-400'
                } block sm:hidden`}>
                  {stage.label.substring(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Connection Lines */}
        <div className="flex items-center justify-between px-6 md:px-8 mb-4">
          {timelineStages.slice(0, -1).map((stage, index) => {
            const isActive = index < validCurrentIndex;
            return (
              <div 
                key={`line-${stage.key}`}
                className={`flex-1 h-0.5 transition-all duration-500 ${
                  isActive 
                    ? 'bg-gradient-to-r from-cyan-400/60 to-blue-500/60' 
                    : 'bg-gray-700/50'
                }`}
                style={{
                  background: isActive 
                    ? `linear-gradient(90deg, ${stage.color}60, ${timelineStages[index + 1].color}60)` 
                    : undefined
                }}
              />
            );
          })}
        </div>

        {/* Interactive Progress Bar */}
        <div className="relative px-2">
          <div 
            ref={timelineRef}
            className="relative h-2 bg-gray-700/50 rounded-full border border-cyan-400/20 cursor-pointer shadow-inner"
            style={{ userSelect: 'none' }}
          >
            {/* Progress Fill */}
            <div 
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${isDragging ? dragPosition : progressPercentage}%`,
                background: 'linear-gradient(90deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
                boxShadow: '0 0 10px rgba(6, 182, 212, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              {/* Animated Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-300/40 to-blue-400/40 rounded-full animate-pulse"></div>
              {/* Scanning Light Effect */}
              <div className="absolute top-0 right-0 w-2 h-full bg-white/60 rounded-full animate-pulse"></div>
            </div>

            {/* Draggable Handle */}
            <div 
              className={`absolute top-1/2 transform -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 rounded-full cursor-grab transition-all duration-200 ${
                isDragging ? 'cursor-grabbing scale-125' : 'hover:scale-110'
              } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ 
                left: `calc(${isDragging ? dragPosition : progressPercentage}% - 10px)`,
                background: 'radial-gradient(circle, #22d3ee 0%, #0891b2 70%, #164e63 100%)',
                boxShadow: isDragging 
                  ? '0 0 15px rgba(34, 211, 238, 0.8), 0 0 25px rgba(34, 211, 238, 0.4)' 
                  : '0 2px 8px rgba(34, 211, 238, 0.6)',
                border: '2px solid rgba(255, 255, 255, 0.3)'
              }}
              onMouseDown={handleMouseDown}
            >
              <div className="w-full h-full rounded-full border border-white/10 flex items-center justify-center">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}