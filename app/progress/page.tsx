'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  GraduationCap,
  BarChart2,
  Target,
  Info,
  Check,
  Trophy,
  TrendingUp,
  Lightbulb,
  Star,
  Clock,
  ArrowRight,
  X,
  ChevronRight,
  Minus,
  Brain,
} from 'lucide-react'
import Link from 'next/link'
import {
  DashboardShell,
  DemoBanner,
  EmptyState,
} from '@/components/dashboard'

function ProgressContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === '1'

  const steps = [
    { num: 1, label: 'Understand', status: 'Completed', completed: true },
    { num: 2, label: 'Recognize', status: 'In Progress', active: true },
    { num: 3, label: 'Apply', status: 'Not started' },
    { num: 4, label: 'Transfer', status: 'Not started' },
    { num: 5, label: 'Verify', status: 'Not started' },
  ]

  return (
    <DashboardShell username={isDemo ? 'Alex' : 'Learner'}>
      <div className="space-y-6">
        {/* Explicit Demo Banner */}
        {isDemo && <DemoBanner exitHref="/progress" />}

        {/* Page Header + Top 3 Summary Cards */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between pt-1">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#2d170e]">
              Progress
            </h1>
            <p className="font-serif text-base text-[#6d503b] mt-1">
              Steady steps to a stronger chess brain.
            </p>
          </div>

          {isDemo && (
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Metric 1 */}
              <div className="flex items-center gap-3.5 rounded-xl border border-[#e5d8c5] bg-[#fffdfa] px-4 py-3 shadow-[0_1px_4px_rgba(60,35,18,0.03)] min-w-[140px]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4e8d3] text-[#6d503b]">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-[#8c745f]">Sessions completed</span>
                  <span className="font-serif text-xl font-bold text-[#2d170e]">3</span>
                  <span className="block text-[10px] text-[#9b8370]">Keep going!</span>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="flex items-center gap-3.5 rounded-xl border border-[#e5d8c5] bg-[#fffdfa] px-4 py-3 shadow-[0_1px_4px_rgba(60,35,18,0.03)] min-w-[140px]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4e8d3] text-[#6d503b]">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-[#8c745f]">Skills improving</span>
                  <span className="font-serif text-xl font-bold text-[#2d170e]">2</span>
                  <span className="block text-[10px] text-[#9b8370]">Threat detection, Tunnel vision</span>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="flex items-center gap-3.5 rounded-xl border border-[#e5d8c5] bg-[#fffdfa] px-4 py-3 shadow-[0_1px_4px_rgba(60,35,18,0.03)] min-w-[140px]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4e8d3] text-[#6d503b]">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-[#8c745f]">Current streak</span>
                  <span className="font-serif text-xl font-bold text-[#2d170e]">3 days</span>
                  <span className="block text-[10px] text-[#9b8370]">Nice consistency!</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isDemo ? (
          <EmptyState
            icon={TrendingUp}
            title="Progress Tracking Calibrating"
            message="14-day skill trends, mastery sparklines, and learning path milestones will automatically calibrate as you complete Think First episodes."
            hint="Start a Think First session to begin tracking your mastery progression."
            action={
              <Link
                href="/train"
                className="inline-flex items-center gap-2 rounded-xl bg-[#361f14] px-5 py-2.5 font-serif text-xs font-bold text-[#fbf1dc] hover:bg-[#23120b] transition-all"
              >
                Start Training Session
              </Link>
            }
          />
        ) : (
          /* Demo Grid Container */
          <div className="space-y-6">

        {/* Row 1: Learning Path Progress + Key Milestones */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Learning Path Progress (7 cols) */}
          <div className="lg:col-span-7">
            <div className="h-full rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Target className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                  <div>
                    <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                      Learning Path Progress
                    </h2>
                    <p className="text-xs text-[#8c745f]">
                      Your journey from awareness to automatic, reliable thinking.
                    </p>
                  </div>
                </div>
                <Info className="h-4 w-4 text-[#9b8370]" />
              </div>

              {/* Stepper with Badges */}
              <div className="pt-2 pb-2">
                <div className="relative flex items-center justify-between">
                  <div className="absolute left-6 right-6 top-3.5 h-[1.5px] bg-[#e5d8c5] -translate-y-1/2 z-0" />

                  {steps.map((step) => (
                    <div key={step.num} className="relative z-10 flex flex-col items-center">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          step.completed
                            ? 'bg-[#4f8034] text-[#ffffff]'
                            : step.active
                            ? 'bg-[#b3782b] text-[#ffffff] ring-4 ring-[#b3782b]/20'
                            : 'bg-[#faf2e4] text-[#8c745f] border border-[#dec8af]'
                        }`}
                      >
                        {step.completed ? <Check className="h-4 w-4" /> : step.num}
                      </div>

                      <span className={`mt-2 font-serif text-xs ${step.active ? 'font-bold text-[#2d170e]' : 'text-[#6d503b]'}`}>
                        {step.label}
                      </span>

                      <span className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-serif ${
                        step.completed
                          ? 'bg-[#e8f1e9] text-[#3b6348]'
                          : step.active
                          ? 'bg-[#fdf3e7] text-[#9b581e] font-semibold'
                          : 'bg-[#f2ede4] text-[#8c745f]'
                      }`}>
                        {step.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Key Milestones (5 cols) */}
          <div className="lg:col-span-5">
            <div className="h-full rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                  <Trophy className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                  <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                    Key Milestones
                  </h2>
                </div>
                <Info className="h-4 w-4 text-[#9b8370]" />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3 rounded-xl border border-[#c0dec7] bg-[#f5fbf6] p-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8f1e9] text-[#3b6348]">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-serif text-xs font-bold text-[#2d170e] block">3 sessions completed</span>
                    <span className="text-[11px] text-[#735843]">You&apos;re building momentum.</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[#f0e6d8] bg-[#faf5ec] p-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#faf2e4] text-[#845722]">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-serif text-xs font-bold text-[#2d170e] block">Threat detection improving</span>
                    <span className="text-[11px] text-[#735843]">+13 points since your first session.</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[#f0e6d8] bg-[#faf5ec] p-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#faf2e4] text-[#845722]">
                    <Lightbulb className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-serif text-xs font-bold text-[#2d170e] block">More patterns noticed</span>
                    <span className="text-[11px] text-[#735843]">You&apos;re spotting ideas earlier.</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[#f0e6d8] bg-[#faf5ec] p-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#faf2e4] text-[#845722]">
                    <Star className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-serif text-xs font-bold text-[#2d170e] block">Consistent practice</span>
                    <span className="text-[11px] text-[#735843]">3 days in a row. Great work!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Skill Mastery Trends (4 sparklines) */}
        <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BarChart2 className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
              <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                Skill Mastery Trends
              </h2>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#8c745f]">
              <span>Higher is better</span>
              <Info className="h-3.5 w-3.5 text-[#9b8370]" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Sparkline 1 */}
            <div className="rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2d170e]">
                <Target className="h-4 w-4 text-[#845722]" />
                <span>Tactical Awareness</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-2xl font-bold text-[#2d170e]">74</span>
                <span className="text-xs font-semibold text-[#4f8034]">↑ +9</span>
              </div>
              {/* SVG Curve */}
              <div className="h-10 w-full pt-1">
                <svg className="w-full h-full" viewBox="0 0 100 40">
                  <path d="M 0 35 Q 25 30 50 18 T 100 8" fill="none" stroke="#4f8034" strokeWidth="2.5" />
                  <circle cx="100" cy="8" r="3" fill="#4f8034" />
                </svg>
              </div>
            </div>

            {/* Sparkline 2 */}
            <div className="rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2d170e]">
                <Target className="h-4 w-4 text-[#845722]" />
                <span>Opponent Threat Detection</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-2xl font-bold text-[#2d170e]">61</span>
                <span className="text-xs font-semibold text-[#b3782b]">↑ +13</span>
              </div>
              <div className="h-10 w-full pt-1">
                <svg className="w-full h-full" viewBox="0 0 100 40">
                  <path d="M 0 36 Q 30 32 60 22 T 100 12" fill="none" stroke="#b3782b" strokeWidth="2.5" />
                  <circle cx="100" cy="12" r="3" fill="#b3782b" />
                </svg>
              </div>
            </div>

            {/* Sparkline 3 */}
            <div className="rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2d170e]">
                <Target className="h-4 w-4 text-[#845722]" />
                <span>King Safety Awareness</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-2xl font-bold text-[#2d170e]">68</span>
                <span className="text-xs font-semibold text-[#4f8034]">↑ +6</span>
              </div>
              <div className="h-10 w-full pt-1">
                <svg className="w-full h-full" viewBox="0 0 100 40">
                  <path d="M 0 30 Q 35 25 70 15 T 100 10" fill="none" stroke="#4f8034" strokeWidth="2.5" />
                  <circle cx="100" cy="10" r="3" fill="#4f8034" />
                </svg>
              </div>
            </div>

            {/* Sparkline 4 */}
            <div className="rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2d170e]">
                <Target className="h-4 w-4 text-[#845722]" />
                <span>Calculation Depth</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-2xl font-bold text-[#2d170e]">57</span>
                <span className="text-xs font-semibold text-[#b3782b]">↑ +8</span>
              </div>
              <div className="h-10 w-full pt-1">
                <svg className="w-full h-full" viewBox="0 0 100 40">
                  <path d="M 0 34 Q 30 28 65 20 T 100 14" fill="none" stroke="#b3782b" strokeWidth="2.5" />
                  <circle cx="100" cy="14" r="3" fill="#b3782b" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Timeline Recent Sessions + Recent belief updates */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Timeline Recent Sessions (8 cols) */}
          <div className="lg:col-span-8">
            <div className="h-full rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                  <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                    Recent Sessions
                  </h2>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1 font-serif text-xs font-semibold text-[#845722] hover:text-[#2d170e] transition-colors"
                >
                  <span>View all sessions</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Timeline List */}
              <div className="space-y-4 relative pl-4 border-l-2 border-[#dec8af] ml-2">
                {/* Session 3 */}
                <div className="relative flex items-center justify-between rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-3.5">
                  <div className="absolute -left-[23px] h-3.5 w-3.5 rounded-full bg-[#382014] ring-4 ring-[#fffdfa]" />
                  <div className="flex items-center gap-4">
                    <div className="text-xs">
                      <span className="font-bold text-[#2d170e] block">Apr 17, 2024</span>
                      <span className="text-[10px] text-[#8c745f]">Today</span>
                    </div>
                    <div className="h-7 w-7 rounded bg-[#faf2e4] border border-[#d8c7b0] p-1 grid grid-cols-2 grid-rows-2 gap-0.5">
                      <div className="bg-[#ba8d5d]" />
                      <div className="bg-[#f4deb8]" />
                      <div className="bg-[#f4deb8]" />
                      <div className="bg-[#ba8d5d]" />
                    </div>
                    <div>
                      <span className="font-serif text-xs font-bold text-[#2d170e] block">Session 3</span>
                      <span className="text-[11px] text-[#8c745f]">Opponent Threat Detection</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-serif">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f1e9] px-2 py-0.5 text-[#3b6348]">
                      <Check className="h-3 w-3" /> 4 recognized
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fceeed] px-2 py-0.5 text-[#9c2f24]">
                      <X className="h-3 w-3" /> 1 missed
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#8c745f]" />
                  </div>
                </div>

                {/* Session 2 */}
                <div className="relative flex items-center justify-between rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-3.5">
                  <div className="absolute -left-[23px] h-3.5 w-3.5 rounded-full bg-[#b3782b] ring-4 ring-[#fffdfa]" />
                  <div className="flex items-center gap-4">
                    <div className="text-xs">
                      <span className="font-bold text-[#2d170e] block">Apr 14, 2024</span>
                    </div>
                    <div className="h-7 w-7 rounded bg-[#faf2e4] border border-[#d8c7b0] p-1 grid grid-cols-2 grid-rows-2 gap-0.5">
                      <div className="bg-[#ba8d5d]" />
                      <div className="bg-[#f4deb8]" />
                      <div className="bg-[#f4deb8]" />
                      <div className="bg-[#ba8d5d]" />
                    </div>
                    <div>
                      <span className="font-serif text-xs font-bold text-[#2d170e] block">Session 2</span>
                      <span className="text-[11px] text-[#8c745f]">Tunnel Vision</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-serif">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f1e9] px-2 py-0.5 text-[#3b6348]">
                      <Check className="h-3 w-3" /> 3 recognized
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf3e7] px-2 py-0.5 text-[#9b581e]">
                      <Minus className="h-3 w-3" /> 1 partial
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#8c745f]" />
                  </div>
                </div>

                {/* Session 1 */}
                <div className="relative flex items-center justify-between rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-3.5">
                  <div className="absolute -left-[23px] h-3.5 w-3.5 rounded-full bg-[#b3782b] ring-4 ring-[#fffdfa]" />
                  <div className="flex items-center gap-4">
                    <div className="text-xs">
                      <span className="font-bold text-[#2d170e] block">Apr 12, 2024</span>
                    </div>
                    <div className="h-7 w-7 rounded bg-[#faf2e4] border border-[#d8c7b0] p-1 grid grid-cols-2 grid-rows-2 gap-0.5">
                      <div className="bg-[#ba8d5d]" />
                      <div className="bg-[#f4deb8]" />
                      <div className="bg-[#f4deb8]" />
                      <div className="bg-[#ba8d5d]" />
                    </div>
                    <div>
                      <span className="font-serif text-xs font-bold text-[#2d170e] block">Session 1</span>
                      <span className="text-[11px] text-[#8c745f]">Opening Awareness</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-serif">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f1e9] px-2 py-0.5 text-[#3b6348]">
                      <Check className="h-3 w-3" /> 2 recognized
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fceeed] px-2 py-0.5 text-[#9c2f24]">
                      <X className="h-3 w-3" /> 1 missed
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#8c745f]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Recent belief updates (4 cols) */}
          <div className="lg:col-span-4">
            <div className="h-full rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <BarChart2 className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                  <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                    Recent belief updates
                  </h2>
                </div>
                <Info className="h-4 w-4 text-[#9b8370]" />
              </div>

              <div className="space-y-3 pt-1">
                {/* Update 1 */}
                <div className="rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-serif">
                    <div className="flex items-center gap-2 font-bold text-[#2d170e]">
                      <TrendingUp className="h-4 w-4 text-[#4f8034]" />
                      <span>Threat detection</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold">
                      <span className="text-[#8c745f]">54</span>
                      <ArrowRight className="h-3 w-3 text-[#b3782b]" />
                      <span className="text-[#4f8034]">61</span>
                    </div>
                  </div>
                  <p className="font-serif text-[11px] text-[#735843]">
                    You&apos;re spotting opponent threats more often before moving.
                  </p>
                </div>

                {/* Update 2 */}
                <div className="rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-serif">
                    <div className="flex items-center gap-2 font-bold text-[#2d170e]">
                      <Brain className="h-4 w-4 text-[#845722]" />
                      <span>Tunnel vision</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold">
                      <span className="text-[#8c745f]">Developing</span>
                      <ArrowRight className="h-3 w-3 text-[#b3782b]" />
                      <span className="text-[#4f8034]">Well-supported</span>
                    </div>
                  </div>
                  <p className="font-serif text-[11px] text-[#735843]">
                    You&apos;re less likely to miss counterplay. Keep practicing this pattern.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
        )}
      </div>
    </DashboardShell>
  )
}

export default function ProgressPage() {
  return (
    <Suspense fallback={null}>
      <ProgressContent />
    </Suspense>
  )
}
