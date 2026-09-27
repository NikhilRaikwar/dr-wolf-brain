'use client'

import React from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

interface DemoBannerProps {
  exitHref?: string
  className?: string
}

export function DemoBanner({ exitHref = '/overview', className = '' }: DemoBannerProps) {
  return (
    <div
      role="status"
      aria-label="Demo mode indicator"
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border-2 border-dashed border-[#b3782b] bg-[#faf2e4] px-4 py-3 text-xs text-[#845722] shadow-xs ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#b3782b] text-[#fffdfa]">
          <AlertTriangle className="h-3.5 w-3.5" />
        </div>
        <div>
          <strong className="font-bold text-[#2d170e]">DEMO DATA ACTIVE (?demo=1):</strong>
          <span className="text-[11.5px] text-[#735843] ml-1.5">
            Displaying simulated learner state for demonstration and testing.
          </span>
        </div>
      </div>
      <Link
        href={exitHref}
        className="shrink-0 rounded-lg bg-[#382014] px-3 py-1.5 text-[11px] font-semibold text-[#f6eedb] hover:bg-[#22110a] transition-colors"
      >
        Exit Demo Mode
      </Link>
    </div>
  )
}
