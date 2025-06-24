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
    <div className="w-full max-w-5xl mx-auto px-2 md:px-4 py-2 md:py-3">
      {/* Header - Centered */}
      <div className="text-center mb-3 md:mb-6">
        <h3 className="text-lg md:text-xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text mb-1">
          Project Timeline
        </h3>
        <div className="w-16 md:w-24 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent mx-auto"></div>
      </div>

      {/* Compact Timeline Container */}
      <div className="relative bg-gray-900/50 rounded-xl border border-cyan-400/20 p-2 md:p-4 backdrop-blur-sm">
        {/* Sleek Main Timeline Track */}
        <div 
          ref={timelineRef}
          className="relative h-2 bg-gray-700/50 rounded-full border border-cyan-400/20  cursor-pointer shadow-inner"
          style={{ userSelect: 'none' }}
        >
          {/* Futuristic Progress Fill */}
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

          {/* Responsive Draggable Handle */}
          <div 
            className={`absolute top-1/2 transform -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 rounded-full cursor-grab transition-all duration-200 ${
              isDragging ? 'cursor-grabbing scale-125' : 'hover:scale-110'
            } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ 
              left: `calc(${isDragging ? dragPosition : progressPercentage}% - ${window.innerWidth < 768 ? '10px' : '12px'})`,
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

        {/* Mobile-Responsive Stage Flags */}
        <div className="relative mt-2 md:mt-4 min-h-[60px] md:min-h-[70px]">
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
                {/* Responsive Flag Pole */}
                <div className={`w-px h-3 md:h-6 mx-auto transition-all duration-300 ${
                  isActive ? 'bg-gradient-to-b from-cyan-400/80 to-cyan-600/40' : 'bg-gray-500/30'
                }`}></div>
                
                {/* Mobile-Optimized Flag */}
                <div className={`relative mt-0.5 md:mt-1 transition-all duration-300 ${
                  isCurrent ? 'scale-105' : 'scale-100'
                }`}>
                  <div 
                    className={`px-1 md:px-2 py-0.5 md:py-1 rounded text-center transition-all duration-300 border backdrop-blur-sm ${
                      isActive 
                        ? 'bg-gradient-to-t from-cyan-500/15 to-blue-600/10 border-cyan-400/40 text-cyan-200 shadow-sm' 
                        : 'bg-gray-800/30 border-gray-600/20 text-gray-500'
                    } ${isCurrent ? 'shadow-md shadow-cyan-400/25 ring-1 ring-cyan-400/30' : ''}`}
                    style={{
                      minWidth: window.innerWidth < 768 ? '40px' : '60px',
                      background: isActive 
                        ? `linear-gradient(135deg, ${stage.color}15, ${stage.color}05)` 
                        : undefined
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <i className={`${stage.icon} text-xs md:text-sm mb-0 md:mb-0.5 ${
                        isActive ? 'text-cyan-300' : 'text-gray-500'
                      }`}></i>
                      <span className={`text-[10px] md:text-xs font-medium leading-tight ${
                        isActive ? 'text-cyan-100' : 'text-gray-400'
                      } hidden sm:block`}>
                        {stage.label}
                      </span>
                      {/* Mobile: Show only first 3 characters */}
                      <span className={`text-[9px] font-medium leading-tight ${
                        isActive ? 'text-cyan-100' : 'text-gray-400'
                      } block sm:hidden`}>
                        {stage.label.substring(0, 3)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Responsive Flag Arrow */}
                  {isActive && (
                    <div className="absolute top-0 -right-0.5 md:-right-1 w-0 h-0 border-l-[3px] md:border-l-[4px] border-t-[6px] md:border-t-[8px] border-b-[6px] md:border-b-[8px] border-l-cyan-500/20 border-t-transparent border-b-transparent"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}