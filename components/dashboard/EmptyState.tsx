import React from 'react'
import { LucideIcon, Compass } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  message: string
  hint?: string
  icon?: LucideIcon
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  message,
  hint,
  icon: Icon = Compass,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[#d8c7b0] bg-[#faf4ea]/60 p-8 text-center sm:p-10 ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f2e4d0] text-[#845722] shadow-inner">
        <Icon className="h-6 w-6 stroke-[1.75]" />
      </div>
      {title && (
        <h3 className="mt-3.5 font-serif text-base font-semibold text-[#2a150c] sm:text-lg">
          {title}
        </h3>
      )}
      <p className="mt-1.5 max-w-md text-sm text-[#735843] leading-relaxed">
        {message}
      </p>
      {hint && (
        <p className="mt-1 max-w-sm text-xs text-[#9b8370] italic">
          {hint}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
