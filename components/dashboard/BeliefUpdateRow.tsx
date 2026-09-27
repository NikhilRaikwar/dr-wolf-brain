import React from 'react'
import { TrendingUp, Brain, ArrowRight } from 'lucide-react'

interface BeliefUpdateRowProps {
  claimType?: string
  conceptLabel: string
  oldValue: any
  newValue: any
  dateLabel?: string
  className?: string
}

export function BeliefUpdateRow({
  claimType,
  conceptLabel,
  oldValue,
  newValue,
  dateLabel,
  className = '',
}: BeliefUpdateRowProps) {
  const isHypothesis = claimType === 'hypothesis' || typeof oldValue === 'string'
  const Icon = isHypothesis ? Brain : TrendingUp

  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-[#ede2d2] bg-[#fffdfa] p-3.5 text-xs font-serif ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f4e8d3] text-[#4f3222]">
          <Icon className="h-3.5 w-3.5 stroke-[1.8]" />
        </div>
        <span className="font-serif text-[13.5px] font-semibold text-[#2d170e]">
          {conceptLabel}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[#8c745f]">{oldValue}</span>
          <ArrowRight className="h-3 w-3 text-[#b3782b]" />
          <span className="font-bold text-[#4f8034]">{newValue}</span>
        </div>
        {dateLabel && (
          <span className="text-[11px] text-[#8c745f] ml-1">{dateLabel}</span>
        )}
      </div>
    </div>
  )
}
