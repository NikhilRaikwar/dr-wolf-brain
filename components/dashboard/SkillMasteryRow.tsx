import React from 'react'
import {
  Crosshair,
  Shield,
  Crown,
  GitFork,
  Castle,
  HelpCircle,
} from 'lucide-react'

interface SkillMasteryRowProps {
  concept: string
  label: string
  masteryScore: number | null
  className?: string
}

const SKILL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  tactical_awareness: Crosshair,
  opponent_threat_detection: Shield,
  king_safety: Crown,
  calculation_depth: GitFork,
  endgame_technique: Castle,
}

export function SkillMasteryRow({
  concept,
  label,
  masteryScore,
  className = '',
}: SkillMasteryRowProps) {
  const Icon = SKILL_ICONS[concept] || HelpCircle
  const hasScore = masteryScore !== null && masteryScore !== undefined

  // Color mapping matching image: green for high mastery, amber for developing
  const isGreen = hasScore && masteryScore >= 65
  const barColor = isGreen ? 'bg-[#709873]' : 'bg-[#c29653]'

  return (
    <div
      className={`flex items-center justify-between gap-4 py-2 text-xs font-serif ${className}`}
    >
      {/* Icon & Label */}
      <div className="flex items-center gap-3 w-48 sm:w-56 shrink-0">
        <Icon className="h-4 w-4 stroke-[1.8] text-[#4f3222] shrink-0" />
        <span className="font-serif text-[13.5px] font-semibold text-[#2d170e] truncate">
          {label}
        </span>
      </div>

      {/* Bar and Score */}
      <div className="flex flex-1 items-center gap-4">
        {hasScore ? (
          <>
            <div className="h-2 w-full flex-1 overflow-hidden rounded-full bg-[#ebdcc8]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(100, Math.max(0, Math.round(masteryScore)))}%` }}
                role="progressbar"
                aria-valuenow={Math.round(masteryScore)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${label} mastery`}
              />
            </div>
            <span className="w-8 text-right font-serif text-sm font-bold text-[#2d170e]">
              {Math.round(masteryScore)}
            </span>
          </>
        ) : (
          <div className="flex w-full items-center justify-between">
            <div className="h-2 w-24 rounded-full bg-[#ebdcc8]/60" />
            <span className="text-[11.5px] italic text-[#9b8370]">
              Not enough evidence yet
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
