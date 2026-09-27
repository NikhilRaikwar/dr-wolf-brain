import React from 'react'

interface SectionCardProps {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  headerClassName?: string
  bodyClassName?: string
  badge?: React.ReactNode
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  badge,
}: SectionCardProps) {
  return (
    <section
      className={`rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] shadow-[0_2px_12px_rgba(60,35,18,0.04)] transition-all ${className}`}
    >
      {(title || subtitle || action || badge) && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e6d8] px-6 py-4 sm:px-7 ${headerClassName}`}
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              {title && (
                <h2 className="font-serif text-lg font-bold tracking-tight text-[#2a150c] sm:text-xl">
                  {title}
                </h2>
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-[#8c745f] sm:text-sm">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={`p-6 sm:p-7 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
