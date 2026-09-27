import React from 'react'
import { MoreHorizontal, Check, Minus, X } from 'lucide-react'

interface RecentSessionProps {
  sessionNumber: number
  dateLabel: string
  reasoningCounts: {
    recognized: number
    partial: number
    missed: number
  }
  className?: string
}

export function RecentSessionCard({
  sessionNumber,
  dateLabel,
  reasoningCounts,
  className = '',
}: RecentSessionProps) {
  return (
    <div
      className={`flex flex-col justify-between rounded-xl border border-[#ede2d2] bg-[#fffdfa] p-4 shadow-[0_1px_3px_rgba(60,35,18,0.02)] ${className}`}
    >
      {/* Top: Icon, Title & Three-dots */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Mini board icon */}
          <div className="h-8 w-8 rounded-lg bg-[#faf2e4] border border-[#d8c7b0] p-1 grid grid-cols-2 grid-rows-2 gap-0.5">
            <div className="bg-[#ba8d5d] rounded-[1px]" />
            <div className="bg-[#f4deb8] rounded-[1px]" />
            <div className="bg-[#f4deb8] rounded-[1px]" />
            <div className="bg-[#ba8d5d] rounded-[1px]" />
          </div>

          <div>
            <h4 className="font-serif text-[13.5px] font-bold text-[#2d170e]">
              Session {sessionNumber}
            </h4>
            <span className="text-[11px] text-[#8c745f]">{dateLabel}</span>
          </div>
        </div>

        <button
          type="button"
          className="text-[#9b8370] hover:text-[#2d170e] transition-colors p-0.5"
          aria-label="Session options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom: Reasoning outcome pills */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-serif">
        {reasoningCounts.recognized > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f1e9] px-2.5 py-0.5 font-medium text-[#3b6348]">
            <Check className="h-3 w-3 stroke-[2.5]" />
            <span>{reasoningCounts.recognized} recognized</span>
          </span>
        )}
        {reasoningCounts.partial > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf3e7] px-2.5 py-0.5 font-medium text-[#9b581e]">
            <Minus className="h-3 w-3 stroke-[2.5]" />
            <span>{reasoningCounts.partial} partial</span>
          </span>
        )}
        {reasoningCounts.missed > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fceeed] px-2.5 py-0.5 font-medium text-[#9c2f24]">
            <X className="h-3 w-3 stroke-[2.5]" />
            <span>{reasoningCounts.missed} missed</span>
          </span>
        )}
      </div>
    </div>
  )
}
