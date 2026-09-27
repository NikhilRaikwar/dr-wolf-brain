import React from 'react'
import { Target, Settings, Shield, HelpCircle } from 'lucide-react'

interface ThinkingPatternCardProps {
  concept: string
  label: string
  consumerState: string
  description?: string
  observedLabel?: string
  className?: string
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  tunnel_vision_after_attack: Target,
  stops_calculating_early: Settings,
  misses_defensive_resources: Shield,
}

export function ThinkingPatternCard({
  concept,
  label,
  consumerState,
  description,
  observedLabel,
  className = '',
}: ThinkingPatternCardProps) {
  const Icon = ICONS[concept] || HelpCircle

  const isWellSupported = consumerState.toLowerCase().includes('well')
  const isDeveloping = consumerState.toLowerCase().includes('developing')
  const isNeedsEvidence = consumerState.toLowerCase().includes('needs')

  return (
    <div
      className={`flex flex-col justify-between rounded-xl border border-[#ede2d2] bg-[#fffdfa] p-4 sm:p-5 shadow-[0_1px_3px_rgba(60,35,18,0.02)] ${className}`}
    >
      <div className="space-y-3">
        {/* Icon & Title */}
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4e8d3] text-[#4f3222]">
            <Icon className="h-4 w-4 stroke-[1.8]" />
          </div>
          <h3 className="font-serif text-[13.5px] font-bold text-[#2d170e] leading-snug">
            {label}
          </h3>
        </div>

        {/* State Pill Badge */}
        <div>
          {isWellSupported && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f1e9] px-2.5 py-0.5 text-xs font-medium text-[#3b6348]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4f8034]" />
              Well-supported
            </span>
          )}
          {isDeveloping && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf3e7] px-2.5 py-0.5 text-xs font-medium text-[#9b581e]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d69818]" />
              Developing
            </span>
          )}
          {isNeedsEvidence && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2ede4] px-2.5 py-0.5 text-xs font-medium text-[#7a6453]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9b8370]" />
              Needs evidence
            </span>
          )}
        </div>

        {/* Narrative Description */}
        {description && (
          <p className="font-serif text-xs text-[#6d503b] leading-relaxed pt-1">
            {description}
          </p>
        )}
      </div>

      {/* Observed episode count */}
      {observedLabel && (
        <p className="mt-4 font-serif text-[11px] text-[#8c745f]">
          {observedLabel}
        </p>
      )}
    </div>
  )
}
