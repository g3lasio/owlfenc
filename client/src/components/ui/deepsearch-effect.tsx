import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface DeepSearchEffectProps {
  isVisible: boolean;
  onComplete?: () => void;
  projectDescription?: string;
  location?: string;
}

const STEPS = [
  { label: 'Analyzing project scope & requirements', duration: 2800 },
  { label: 'Identifying materials & quantities', duration: 4200 },
  { label: 'Calculating local labor rates', duration: 3800 },
  { label: 'Applying current market pricing', duration: 3000 },
  { label: 'Validating estimate accuracy', duration: 2200 },
];

export function DeepSearchEffect({ isVisible, onComplete, projectDescription, location }: DeepSearchEffectProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepProgress, setStepProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isVisible) return;
    setCurrentStep(0);
    setCompletedSteps([]);
    setStepProgress(0);
    setIsDone(false);

    let stepIndex = 0;

    const runStep = (index: number) => {
      if (index >= STEPS.length) {
        setIsDone(true);
        timerRef.current = setTimeout(() => {
          onComplete?.();
        }, 900);
        return;
      }

      setCurrentStep(index);
      setStepProgress(0);

      const duration = STEPS[index].duration;
      const tickInterval = 50;
      const ticks = duration / tickInterval;
      let tick = 0;

      intervalRef.current = setInterval(() => {
        tick++;
        // Ease-in-out progress curve
        const raw = tick / ticks;
        const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
        const progress = Math.min(eased * 100, 100);
        setStepProgress(progress);

        if (tick >= ticks) {
          clearInterval(intervalRef.current!);
          setCompletedSteps((prev) => [...prev, index]);
          stepIndex = index + 1;
          timerRef.current = setTimeout(() => runStep(stepIndex), 100);
        }
      }, tickInterval);
    };

    runStep(0);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const totalProgress =
    completedSteps.length === STEPS.length
      ? 100
      : Math.round(((completedSteps.length + stepProgress / 100) / STEPS.length) * 100);

  const subtitle = [
    projectDescription ? projectDescription.substring(0, 50) : null,
    location || null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 bg-gray-950 border border-gray-800 rounded-2xl p-7 shadow-2xl">

        {/* Header */}
        <div className="flex items-start gap-4 mb-7">
          <div className="flex-shrink-0 mt-0.5">
            {isDone ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            ) : (
              <Loader2 className="h-7 w-7 text-cyan-400 animate-spin" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-semibold text-base leading-snug">
              {isDone ? 'Estimate ready' : 'Building your estimate…'}
            </h2>
            {subtitle && (
              <p className="text-gray-500 text-xs mt-1 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Steps list */}
        <div className="space-y-4 mb-7">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(index);
            const isActive = currentStep === index && !isDone;

            return (
              <div key={index}>
                <div className="flex items-center gap-3 mb-1">
                  {/* Dot */}
                  <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : isActive ? (
                      <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-gray-700" />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-sm flex-1 ${
                      isCompleted
                        ? 'text-gray-600 line-through'
                        : isActive
                        ? 'text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    {step.label}
                  </span>

                  {/* Right badge */}
                  {isActive && (
                    <span className="text-xs text-cyan-500 font-mono tabular-nums">
                      {stepProgress.toFixed(0)}%
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-xs text-emerald-700">done</span>
                  )}
                </div>

                {/* Step progress bar (only active step) */}
                {isActive && (
                  <div className="ml-7 h-0.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-75"
                      style={{ width: `${stepProgress}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall progress */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-600 uppercase tracking-widest">Progress</span>
            <span className="text-xs text-gray-400 font-mono tabular-nums">{totalProgress}%</span>
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isDone ? 'bg-emerald-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        {isDone && (
          <p className="text-center text-xs text-emerald-500 mt-5">
            Applying results to your estimate…
          </p>
        )}
      </div>
    </div>
  );
}
