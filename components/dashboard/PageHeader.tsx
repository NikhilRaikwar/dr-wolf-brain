import React from 'react'
import Image from 'next/image'
import { Play, FileText, Calendar, BarChart2 } from 'lucide-react'

interface PageHeaderProps {
  title?: string
  subtitle?: string
  username?: string
  userRating?: string
  memberSince?: string
  sessionsCount?: number
  episodesCount?: number
  lastUpdatedLabel?: string
  learningStage?: string
  showUserBadge?: boolean
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title = 'Your Chess Brain',
  subtitle = 'A coach that learns how you think.',
  username = 'Learner',
  userRating,
  memberSince,
  sessionsCount = 0,
  episodesCount = 0,
  learningStage,
  showUserBadge = true,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-6 pb-2 pt-1 xl:flex-row xl:items-center xl:justify-between ${className}`}
    >
      {/* Title & Profile Info */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#2d170e]">
            {title}
          </h1>
          {subtitle && (
            <p className="font-serif text-base text-[#6d503b] leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {showUserBadge && (
          <div className="flex items-center gap-3 rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] px-3.5 py-2 shadow-[0_1px_4px_rgba(60,35,18,0.03)]">
            <div className="relative h-11 w-11 overflow-hidden rounded-full border border-[#dec8af] shadow-xs">
              <Image
                src="/dr_wolf_portrait.jpg"
                alt={username}
                fill
                className="object-cover"
              />
            </div>
            <div className="text-left font-serif">
              <h3 className="text-sm font-bold text-[#2d170e] leading-tight">
                {username}
              </h3>
              {userRating && (
                <p className="text-[11px] text-[#8c745f] leading-tight">
                  {userRating}
                </p>
              )}
              {memberSince && (
                <p className="text-[10px] text-[#9b8370] leading-tight mt-0.5">
                  {memberSince}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Top 3 Summary Cards matching reference image */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {/* Card 1: Sessions */}
        <div className="flex items-center gap-3.5 rounded-xl border border-[#e5d8c5] bg-[#fffdfa] px-4 py-3 shadow-[0_1px_4px_rgba(60,35,18,0.03)] min-w-[125px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4e8d3] text-[#6d503b]">
            <Play className="h-4 w-4 fill-current ml-0.5" />
          </div>
          <div>
            <span className="block text-[11px] font-medium text-[#8c745f] leading-tight">
              Sessions
            </span>
            <span className="font-serif text-xl font-bold text-[#2d170e]">
              {sessionsCount}
            </span>
            <span className="block text-[10px] text-[#9b8370]">last 7 days</span>
          </div>
        </div>

        {/* Card 2: Episodes */}
        <div className="flex items-center gap-3.5 rounded-xl border border-[#e5d8c5] bg-[#fffdfa] px-4 py-3 shadow-[0_1px_4px_rgba(60,35,18,0.03)] min-w-[125px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4e8d3] text-[#6d503b]">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-[11px] font-medium text-[#8c745f] leading-tight">
              Episodes
            </span>
            <span className="font-serif text-xl font-bold text-[#2d170e]">
              {episodesCount}
            </span>
            <span className="block text-[10px] text-[#9b8370]">analyzed</span>
          </div>
        </div>

        {/* Card 3: Learning stage */}
        <div className="flex items-center gap-3.5 rounded-xl border border-[#e5d8c5] bg-[#fffdfa] px-4 py-3 shadow-[0_1px_4px_rgba(60,35,18,0.03)] min-w-[135px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4e8d3] text-[#6d503b]">
            <BarChart2 className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-[11px] font-medium text-[#8c745f] leading-tight">
              Learning stage
            </span>
            <span className="font-serif text-sm font-bold text-[#2d170e]">
              {learningStage || 'Calibrating'}
            </span>
            <span className="block text-[10px] text-[#9b8370]">
              {learningStage ? 'Step 2 of 5' : 'Collecting data'}
            </span>
          </div>
        </div>

        {actions}
      </div>
    </div>
  )
}
