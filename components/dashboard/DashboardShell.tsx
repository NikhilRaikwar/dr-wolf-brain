'use client'

import React, { useState, Suspense } from 'react'
import { DashboardTopNav } from './DashboardTopNav'
import { DashboardSidebar } from './DashboardSidebar'

interface DashboardShellProps {
  children: React.ReactNode
  userRating?: number
  username?: string
}

export function DashboardShell({
  children,
  username = 'Learner',
}: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f8f3e7] text-[#2d170e] flex flex-col font-serif-custom selection:bg-[#ede0ca] selection:text-[#2d170e]">
      {/* 1. Top Navigation */}
      <Suspense fallback={<div className="h-[68px] w-full border-b border-[#e5d8c5] bg-[#f8f3e7]" />}>
        <DashboardTopNav
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
          username={username}
        />
      </Suspense>

      {/* 2. Body: Left Sidebar + Main Content */}
      <div className="flex flex-1 w-full relative">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:w-56 lg:shrink-0">
          <div className="sticky top-[68px] h-[calc(100vh-68px)]">
            <Suspense fallback={<div className="w-56 h-full bg-[#f8f3e7]" />}>
              <DashboardSidebar />
            </Suspense>
          </div>
        </div>

        {/* Mobile Sidebar Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="relative flex w-64 max-w-xs flex-1 flex-col bg-[#f8f3e7] shadow-2xl">
              <Suspense fallback={<div className="w-64 h-full bg-[#f8f3e7]" />}>
                <DashboardSidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
              </Suspense>
            </div>
          </div>
        )}

        {/* 3. Main Dashboard Content Container */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 max-w-[1240px]" id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
