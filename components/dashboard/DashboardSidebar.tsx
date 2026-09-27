'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { isDemoMode, getNavHref } from '@/lib/demo/demoUtils'
import {
  Home,
  Brain,
  Target,
  User,
  BarChart2,
  TrendingUp,
  Settings,
  HelpCircle,
} from 'lucide-react'

interface DashboardSidebarProps {
  className?: string
  onCloseMobile?: () => void
}

export function DashboardSidebar({
  className = '',
  onCloseMobile,
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isDemo = isDemoMode(searchParams)

  const mainNavItems = [
    {
      label: 'Overview',
      href: '/overview',
      icon: Home,
      active: pathname === '/overview' || pathname === '/brain',
    },
    {
      label: 'Train',
      href: '/train',
      icon: Target,
      active: pathname === '/train' || pathname === '/play',
    },
    {
      label: 'Your Games',
      href: '/games',
      icon: User,
      active: pathname === '/games',
    },
    {
      label: 'Insights',
      href: '/insights',
      icon: BarChart2,
      active: pathname === '/insights',
    },
    {
      label: 'Progress',
      href: '/progress',
      icon: TrendingUp,
      active: pathname === '/progress',
    },
  ]

  const bottomNavItems = [
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      active: pathname === '/settings',
    },
    {
      label: 'Help',
      href: '/help',
      icon: HelpCircle,
      active: pathname === '/help',
    },
  ]

  return (
    <aside
      className={`flex h-full w-56 flex-col justify-between border-r border-[#e5d8c5] bg-[#f8f3e7] p-4 ${className}`}
    >
      {/* Top Group */}
      <div className="space-y-1">
        <nav className="space-y-1.5" aria-label="Sidebar Main Navigation">
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const isActive = item.active

            return (
              <Link
                key={item.label}
                href={getNavHref(item.href, isDemo)}
                onClick={onCloseMobile}
                className={`flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 font-serif text-[15px] transition-all ${
                  isActive
                    ? 'bg-[#ede0ca] font-bold text-[#2d170e] shadow-[inset_0_1px_1px_rgba(60,35,18,0.06)]'
                    : 'font-medium text-[#5e402e] hover:bg-[#f3e7d3] hover:text-[#2d170e]'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 stroke-[1.8] ${
                    isActive ? 'text-[#2d170e]' : 'text-[#6d503b]'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Group */}
      <div className="space-y-1 pt-6">
        <nav className="space-y-1" aria-label="Sidebar Secondary Navigation">
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = item.active

            return (
              <Link
                key={item.label}
                href={getNavHref(item.href, isDemo)}
                onClick={onCloseMobile}
                className={`flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 font-serif text-[15px] transition-all ${
                  isActive
                    ? 'bg-[#ede0ca] font-bold text-[#2d170e] shadow-[inset_0_1px_1px_rgba(60,35,18,0.06)]'
                    : 'font-medium text-[#735843] opacity-85 hover:bg-[#f3e7d3] hover:text-[#2d170e]'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 stroke-[1.8] ${
                    isActive ? 'text-[#2d170e]' : 'text-[#6d503b]'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
