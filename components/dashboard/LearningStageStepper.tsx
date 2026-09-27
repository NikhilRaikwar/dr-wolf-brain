import React from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

export const LEARNING_STAGES = [
  { key: 'understand', label: 'Understand' },
  { key: 'recognize', label: 'Recognize' },
  { key: 'apply', label: 'Apply' },
  { key: 'transfer', label: 'Transfer' },
  { key: 'verify', label: 'Verify' },
] as const

export type LearningStageKey = (typeof LEARNING_STAGES)[number]['key']

interface LearningStageStepperProps {
  currentStage?: LearningStageKey | string | null
  className?: string
}

export function LearningStageStepper({
  currentStage,
  className = '',
}: LearningStageStepperProps) {
  // Canonical index resolution; if not set or thin, renders neutrally or at initial stage
  const currentIndex = currentStage
    ? LEARNING_STAGES.findIndex((s) => s.key === currentStage.toLowerCase())
    : -1

  return (
    <div className={`w-full py-2 ${className}`}>
      <div className="relative flex items-center justify-between">
        {/* Connecting progress track line */}
        <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-[#ebdcc8]" />
        {currentIndex >= 0 && (
          <div
            className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#b3782b] transition-all duration-300"
            style={{
              width: `${(currentIndex / (LEARNING_STAGES.length - 1)) * 100}%`,
            }}
          />
        )}

        {/* Stage steps */}
        {LEARNING_STAGES.map((stage, idx) => {
          const isCompleted = currentIndex > idx
          const isCurrent = currentIndex === idx
          const isPending = currentIndex < idx

          return (
            <div
              key={stage.key}
              className="relative z-10 flex flex-col items-center group cursor-default"
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                  isCompleted
                    ? 'border-[#4f8034] bg-[#edf5ef] text-[#4f8034]'
                    : isCurrent
                    ? 'border-[#b3782b] bg-[#faf2e4] text-[#845722] ring-4 ring-[#b3782b]/15 shadow-sm'
                    : 'border-[#d8c7b0] bg-[#fffdfa] text-[#a89382]'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={`mt-1.5 text-[11px] font-medium tracking-tight sm:text-xs ${
                  isCurrent
                    ? 'font-bold text-[#2a150c]'
                    : isCompleted
                    ? 'text-[#4f8034]'
                    : 'text-[#8c745f]'
                }`}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
