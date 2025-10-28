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
  const [tempStageIndex, setTempStageIndex] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get current stage index
  const currentStageIndex = timelineStages.findIndex(stage => stage.key === currentProgress);
  const validCurrentIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

  // Calculate position percentage
  const progressPercentage = (validCurrentIndex / (timelineStages.length - 1)) * 100;

  useEffect(() => {
    setDragPosition(progressPercentage);
    setTempStageIndex(validCurrentIndex);
    console.log(`📊 [TIMELINE] Project ${projectId} progress: ${currentProgress} (${validCurrentIndex}/${timelineStages.length - 1})`);
  }, [progressPercentage, validCurrentIndex, projectId, currentProgress]);

  const getPointerPosition = (clientX: number) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(100, (x / rect.width) * 100));
  };

  const calculateStageFromPercentage = (percentage: number) => {
    return Math.round((percentage / 100) * (timelineStages.length - 1));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isUpdating) return;
    setIsDragging(true);
    const percentage = getPointerPosition(e.clientX);
    setDragPosition(percentage);
    setTempStageIndex(calculateStageFromPercentage(percentage));
    e.preventDefault();
    console.log(`🎯 [TIMELINE] Started dragging at ${percentage.toFixed(1)}%`);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isUpdating) return;
    setIsDragging(true);
    const touch = e.touches[0];
    const percentage = getPointerPosition(touch.clientX);
    setDragPosition(percentage);
    setTempStageIndex(calculateStageFromPercentage(percentage));
    e.preventDefault();
    console.log(`📱 [TIMELINE] Started touch dragging at ${percentage.toFixed(1)}%`);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;
    const percentage = getPointerPosition(e.clientX);
    const stageIndex = calculateStageFromPercentage(percentage);
    setDragPosition(percentage);
    setTempStageIndex(stageIndex);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !timelineRef.current) return;
    const touch = e.touches[0];
    const percentage = getPointerPosition(touch.clientX);
    const stageIndex = calculateStageFromPercentage(percentage);
    setDragPosition(percentage);
    setTempStageIndex(stageIndex);
    e.preventDefault();
  };

  const handleEnd = async () => {
    if (!isDragging) return;
    setIsDragging(false);

    const finalStageIndex = calculateStageFromPercentage(dragPosition);
    const newStage = timelineStages[finalStageIndex];

    console.log(`🏁 [TIMELINE] Drag ended at stage ${finalStageIndex}: ${newStage?.key}`);

    if (newStage && newStage.key !== currentProgress) {
      try {
        setIsUpdating(true);
        console.log(`🔄 [TIMELINE] Updating project ${projectId} from "${currentProgress}" to "${newStage.key}"`);
        
        await updateProjectProgress(projectId, newStage.key);
        onProgressUpdate(newStage.key);
        
        toast({
          title: "🎯 Timeline Updated",
          description: `Project moved to: ${newStage.label}`,
          duration: 3000,
        });
        
        console.log(`✅ [TIMELINE] Successfully updated to: ${newStage.key}`);
      } catch (error) {
        console.error(`❌ [TIMELINE] Error updating progress:`, error);
        toast({
          variant: "destructive",
          title: "⚠️ Update Failed",
          description: "Failed to update project progress. Please try again.",
          duration: 5000,
        });
        // Reset to original position on error
        setDragPosition(progressPercentage);
        setTempStageIndex(validCurrentIndex);
      } finally {
        setIsUpdating(false);
      }
    } else {
      // Reset to current position if no change
      console.log(`🔄 [TIMELINE] No change detected, resetting position`);
      setDragPosition(progressPercentage);
      setTempStageIndex(validCurrentIndex);
    }
  };

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove_ = (e: MouseEvent) => handleMouseMove(e);
      const handleTouchMove_ = (e: TouchEvent) => handleTouchMove(e);
      const handleMouseUp = () => handleEnd();
      const handleTouchEnd = () => handleEnd();

      document.addEventListener('mousemove', handleMouseMove_);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove_, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove_);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove_);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragPosition, currentProgress, projectId]);

  return (
    <div className="w-full max-w-4xl mx-auto px-2 md:px-4 py-2 md:py-3">
      {/* Header - Centered */}
      <div className="text-center mb-3 md:mb-4">
        <h3 className="text-lg md:text-xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text mb-1">
          Project Timeline
        </h3>
        <div className="w-16 md:w-24 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent mx-auto"></div>
        
        {/* Live Stage Feedback During Drag */}
        {isDragging && (
          <div className="mt-2 px-3 py-1 bg-cyan-400/10 border border-cyan-400/30 rounded-lg backdrop-blur-sm">
            <span className="text-sm font-medium text-cyan-200">
              Moving to: <span className="text-cyan-100 font-bold">{timelineStages[tempStageIndex]?.label}</span>
            </span>
          </div>
        )}
        
        {/* Update Status Feedback */}
        {isUpdating && (
          <div className="mt-2 px-3 py-1 bg-yellow-400/10 border border-yellow-400/30 rounded-lg backdrop-blur-sm">
            <span className="text-sm font-medium text-yellow-200">
              <i className="ri-loader-2-line animate-spin mr-2"></i>
              Updating project status...
            </span>
          </div>
        )}
      </div>

      {/* Compact Timeline Container */}
      <div className="relative bg-gray-900/50 rounded-xl border border-cyan-400/20 p-3 md:p-4 backdrop-blur-sm overflow-hidden">
        {/* Stage Icons Row - Flexbox Layout */}
        <div className="flex items-center justify-between gap-1 md:gap-2 mb-3 px-2">
          {timelineStages.map((stage, index) => {
            // Use temp stage index during dragging for immediate visual feedback
            const activeIndex = isDragging ? tempStageIndex : validCurrentIndex;
            const isActive = index <= activeIndex;
            const isCurrent = index === activeIndex;
            
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
                
                {/* Stage Label - Single responsive version */}
                <span className={`text-[10px] sm:text-xs md:text-sm font-medium mt-1 transition-all duration-300 text-center leading-tight ${
                  isActive ? 'text-cyan-100' : 'text-gray-400'
                }`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Connection Lines */}
        <div className="flex items-center justify-between px-6 md:px-8 mb-4">
          {timelineStages.slice(0, -1).map((stage, index) => {
            // Use temp stage index during dragging for immediate visual feedback
            const activeIndex = isDragging ? tempStageIndex : validCurrentIndex;
            const isActive = index < activeIndex;
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

        {/* Interactive Progress Bar - FUTURISTIC NEURAL INTERFACE */}
        <div className="relative px-2">
          {/* Holographic Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.05)_0%,_transparent_70%)] rounded-lg animate-pulse"></div>
          
          {/* Energy Wave Effect */}
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent animate-pulse"></div>
            <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent animate-pulse delay-150"></div>
            <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-400/20 to-transparent animate-pulse delay-300"></div>
          </div>
          
          <div 
            ref={timelineRef}
            className="relative h-3 bg-gray-900/80 rounded-full border border-cyan-400/30 cursor-pointer shadow-inner backdrop-blur-sm"
            style={{ userSelect: 'none' }}
          >
            {/* Neural Background Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,_transparent_0%,_rgba(6,182,212,0.1)_25%,_transparent_50%,_rgba(6,182,212,0.1)_75%,_transparent_100%)] rounded-full animate-pulse"></div>
            
            {/* Progress Fill - ADVANCED NEURAL STREAM */}
            <div 
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out overflow-hidden"
              style={{ 
                width: `${isDragging ? dragPosition : progressPercentage}%`,
                background: 'linear-gradient(90deg, #06b6d4 0%, #3b82f6 30%, #8b5cf6 60%, #06b6d4 100%)',
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 0 30px rgba(59, 130, 246, 0.4)',
                filter: 'brightness(1.2) contrast(1.1)'
              }}
            >
              {/* Flowing Energy Particles */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-300/60 to-blue-400/60 rounded-full animate-pulse"></div>
              
              {/* Neural Network Scanning Effect */}
              <div className="absolute top-0 right-0 w-4 h-full bg-gradient-to-l from-white/80 via-cyan-200/60 to-transparent rounded-full animate-pulse shadow-lg"></div>
              
              {/* Electromagnetic Wave */}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,_transparent_0%,_rgba(255,255,255,0.4)_10%,_transparent_20%,_rgba(255,255,255,0.2)_30%,_transparent_40%)] rounded-full animate-pulse"></div>
              
              {/* Energy Stream Animation */}
              <div className="absolute top-0 left-0 w-full h-full rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse transform skew-x-12"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent animate-pulse delay-200 transform -skew-x-12"></div>
              </div>
            </div>

            {/* Holographic Progress Indicators */}
            <div className="absolute inset-0 flex items-center justify-evenly">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-0.5 h-0.5 rounded-full transition-all duration-300 ${
                    (i / 6) * 100 <= (isDragging ? dragPosition : progressPercentage)
                      ? 'bg-cyan-300 shadow-lg shadow-cyan-400/50 animate-pulse'
                      : 'bg-gray-600/50'
                  }`}
                  style={{
                    filter: (i / 6) * 100 <= (isDragging ? dragPosition : progressPercentage) 
                      ? 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.8))' 
                      : 'none'
                  }}
                />
              ))}
            </div>

            {/* NEURAL CONTROL HANDLE */}
            <div 
              className={`absolute top-1/2 transform -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full select-none transition-all duration-300 ${
                isUpdating 
                  ? 'opacity-50 cursor-not-allowed' 
                  : isDragging 
                    ? 'cursor-grabbing scale-150 z-50' 
                    : 'cursor-grab hover:scale-125'
              }`}
              style={{ 
                left: `calc(${isDragging ? dragPosition : progressPercentage}% - 12px)`,
                background: isUpdating 
                  ? 'radial-gradient(circle, #6b7280 0%, #374151 40%, #1f2937 80%, #0f172a 100%)'
                  : 'radial-gradient(circle, #22d3ee 0%, #0891b2 40%, #164e63 80%, #0f172a 100%)',
                boxShadow: isUpdating
                  ? '0 0 10px rgba(107, 114, 128, 0.5)'
                  : isDragging 
                    ? '0 0 25px rgba(34, 211, 238, 1), 0 0 50px rgba(34, 211, 238, 0.6), 0 0 75px rgba(34, 211, 238, 0.3)' 
                    : '0 0 15px rgba(34, 211, 238, 0.8), 0 4px 12px rgba(34, 211, 238, 0.4)',
                border: '2px solid rgba(255, 255, 255, 0.5)',
                filter: isDragging ? 'brightness(1.4) contrast(1.2)' : 'brightness(1.1)',
                touchAction: 'none'
              }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* Inner Neural Core */}
              <div className="w-full h-full rounded-full border border-white/20 flex items-center justify-center relative overflow-hidden">
                <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-white shadow-sm animate-pulse"></div>
                
                {/* Rotating Energy Ring */}
                <div className="absolute inset-0 rounded-full border border-cyan-300/60 animate-spin" style={{ animationDuration: '3s' }}></div>
                
                {/* Pulsing Core */}
                <div className="absolute inset-1 rounded-full bg-gradient-to-r from-cyan-400/30 to-blue-500/30 animate-pulse"></div>
                
                {/* Energy Particles */}
                {isDragging && (
                  <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/2 w-1 h-1 bg-cyan-300 rounded-full animate-ping"></div>
                    <div className="absolute bottom-0 right-1/2 w-1 h-1 bg-blue-300 rounded-full animate-ping delay-150"></div>
                    <div className="absolute left-0 top-1/2 w-1 h-1 bg-purple-300 rounded-full animate-ping delay-300"></div>
                    <div className="absolute right-0 bottom-1/2 w-1 h-1 bg-cyan-300 rounded-full animate-ping delay-450"></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Electromagnetic Field Effect */}
            {isDragging && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-0 w-full h-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-pulse transform -translate-y-1/2"></div>
                <div className="absolute top-1/2 left-0 w-full h-8 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent animate-pulse transform -translate-y-1/2 delay-150"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
