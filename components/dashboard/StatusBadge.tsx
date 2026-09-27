import React from 'react'

export type StatusVariant =
  | 'sage'
  | 'amber'
  | 'crimson'
  | 'neutral'
  | 'gold'
  | 'well_supported'
  | 'developing'
  | 'needs_evidence'
  | 'recognized'
  | 'partial'
  | 'missed'

interface StatusBadgeProps {
  status?: string
  variant?: StatusVariant
  className?: string
  children?: React.ReactNode
}

export function StatusBadge({
  status,
  variant,
  className = '',
  children,
}: StatusBadgeProps) {
  // Normalize variant from status string if not provided
  let resolvedVariant: StatusVariant = variant || 'neutral'
  const text = children || status || ''

  const lower = (status || '').toLowerCase().replace(/[\s-]/g, '_')
  if (!variant) {
    if (lower === 'well_supported' || lower === 'recognized' || lower === 'positive' || lower === 'completed') {
      resolvedVariant = 'sage'
    } else if (lower === 'developing' || lower === 'partial' || lower === 'suspected') {
      resolvedVariant = 'amber'
    } else if (lower === 'needs_evidence' || lower === 'missed' || lower === 'error' || lower === 'declining') {
      resolvedVariant = 'crimson'
    } else if (lower === 'gold' || lower === 'improving') {
      resolvedVariant = 'gold'
    } else {
      resolvedVariant = 'neutral'
    }
  }

  const variantStyles: Record<StatusVariant, string> = {
    sage: 'bg-[#edf5ef] text-[#3b6348] border-[#c0dec7]',
    well_supported: 'bg-[#edf5ef] text-[#3b6348] border-[#c0dec7]',
    recognized: 'bg-[#edf5ef] text-[#3b6348] border-[#c0dec7]',

    amber: 'bg-[#fdf4eb] text-[#9b581e] border-[#f3d3b6]',
    developing: 'bg-[#fdf4eb] text-[#9b581e] border-[#f3d3b6]',
    partial: 'bg-[#fdf4eb] text-[#9b581e] border-[#f3d3b6]',

    crimson: 'bg-[#fceeed] text-[#9c2f24] border-[#f5c2bd]',
    needs_evidence: 'bg-[#fceeed] text-[#9c2f24] border-[#f5c2bd]',
    missed: 'bg-[#fceeed] text-[#9c2f24] border-[#f5c2bd]',

    gold: 'bg-[#faf2e4] text-[#8c601d] border-[#ebd3aa]',

    neutral: 'bg-[#f4efe6] text-[#6d5747] border-[#e0d5c4]',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide transition-colors ${
        variantStyles[resolvedVariant] || variantStyles.neutral
      } ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          resolvedVariant === 'sage' || resolvedVariant === 'well_supported' || resolvedVariant === 'recognized'
            ? 'bg-[#4f8034]'
            : resolvedVariant === 'amber' || resolvedVariant === 'developing' || resolvedVariant === 'partial'
            ? 'bg-[#d69818]'
            : resolvedVariant === 'crimson' || resolvedVariant === 'needs_evidence' || resolvedVariant === 'missed'
            ? 'bg-[#b84a39]'
            : resolvedVariant === 'gold'
            ? 'bg-[#b3782b]'
            : 'bg-[#8c745f]'
        }`}
        aria-hidden="true"
      />
      {text}
    </span>
  )
}
