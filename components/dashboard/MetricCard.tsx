import React from 'react'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: LucideIcon
  className?: string
}

export function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  className = '',
}: MetricCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[#e5d8c5] bg-[#fffdfa] p-4 shadow-[0_2px_8px_rgba(60,35,18,0.04)] transition-all hover:border-[#cfb698] hover:shadow-[0_4px_12px_rgba(60,35,18,0.08)] ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8c745f]">
            {label}
          </p>
          <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#2a150c]">
            {value}
          </p>
          {subtext && (
            <p className="mt-0.5 text-xs text-[#735843]">{subtext}</p>
          )}
        </div>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4e8d3] text-[#845722]">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  )
}
