'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  Menu,
  X,
  User,
  Settings,
  BarChart2,
  HelpCircle,
  LogOut,
  Sparkles,
} from 'lucide-react'

interface DashboardTopNavProps {
  onMobileMenuToggle?: () => void
  isMobileMenuOpen?: boolean
  username?: string
}

export function DashboardTopNav({
  onMobileMenuToggle,
  isMobileMenuOpen = false,
  username = 'Learner',
}: DashboardTopNavProps) {
  const router = useRouter()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = () => {
    setIsDropdownOpen(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dr_wolf_session_id')
      localStorage.removeItem('dr_wolf_player_id')
      localStorage.removeItem('dr_wolf_username')
      localStorage.removeItem('dr_wolf_rating')
    }
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e5d8c5] bg-[#f8f3e7]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Toggle & Brand Wordmark */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5d8c5] text-[#5e402e] hover:bg-[#ede0ca] lg:hidden"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/overview" className="group flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl select-none leading-none drop-shadow-sm transition-transform group-hover:scale-105">
              ♞
            </span>
            <span className="font-serif text-xl sm:text-[22px] font-bold tracking-tight text-[#2d170e]">
              Dr. Wolf Brain
            </span>
          </Link>
        </div>

        {/* Right Nav Area: Interactive User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] px-3 py-1.5 shadow-[0_1px_4px_rgba(60,35,18,0.03)] transition-all hover:bg-[#faf5ec] hover:border-[#d8c7b0] focus:outline-none"
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <div className="relative h-9 w-9 overflow-hidden rounded-full border border-[#c4a984] shadow-xs">
              <Image
                src="/dr_wolf_portrait.jpg"
                alt={username}
                fill
                className="object-cover"
              />
            </div>
            <div className="hidden flex-col text-left sm:flex leading-tight">
              <span className="text-[11px] text-[#8c745f]">Good to see you,</span>
              <span className="font-serif text-sm font-bold text-[#2d170e]">
                {username}
              </span>
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 text-[#8c745f] transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180 text-[#2d170e]' : ''
              }`}
            />
          </button>

          {/* Animated Dropdown Menu Card */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-2 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header Info */}
              <div className="flex items-center gap-3 border-b border-[#f0e6d8] px-3 py-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#d8c7b0]">
                  <Image
                    src="/dr_wolf_portrait.jpg"
                    alt={username}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-serif text-sm font-bold text-[#2d170e]">
                    {username}
                  </span>
                  <span className="text-[11px] text-[#8c745f]">
                    Active Account
                  </span>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="py-1.5 font-serif text-xs">
                <Link
                  href="/overview"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[#4f3222] transition-colors hover:bg-[#faf2e4] hover:text-[#2d170e]"
                >
                  <Sparkles className="h-4 w-4 text-[#b3782b]" />
                  <span>Your Chess Brain</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[#4f3222] transition-colors hover:bg-[#faf2e4] hover:text-[#2d170e]"
                >
                  <User className="h-4 w-4 text-[#735843]" />
                  <span>Profile & Account</span>
                </Link>

                <Link
                  href="/insights"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[#4f3222] transition-colors hover:bg-[#faf2e4] hover:text-[#2d170e]"
                >
                  <BarChart2 className="h-4 w-4 text-[#735843]" />
                  <span>Insights & Mastery</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[#4f3222] transition-colors hover:bg-[#faf2e4] hover:text-[#2d170e]"
                >
                  <Settings className="h-4 w-4 text-[#735843]" />
                  <span>Coaching Preferences</span>
                </Link>

                <Link
                  href="/help"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[#4f3222] transition-colors hover:bg-[#faf2e4] hover:text-[#2d170e]"
                >
                  <HelpCircle className="h-4 w-4 text-[#735843]" />
                  <span>Help & Guide</span>
                </Link>
              </div>

              {/* Sign Out Action */}
              <div className="border-t border-[#f0e6d8] pt-1.5">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-serif text-xs font-semibold text-[#b84a39] transition-colors hover:bg-[#fceeed]"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
