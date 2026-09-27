'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Calendar,
  ChevronDown,
  Target,
  Info,
  Lightbulb,
  Crown,
  Check,
  ShieldAlert,
  AlertCircle,
  BarChart2,
  ChevronRight,
  Settings,
  BookOpen,
} from 'lucide-react'
import Link from 'next/link'
import {
  DashboardShell,
  DemoBanner,
  EmptyState,
} from '@/components/dashboard'
import { ChessboardView } from '@/components/Chessboard'
import { fenToBoardGrid } from '@/lib/landingExamples'

function InsightsContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === '1'

  const thumb1 = 'r2q1rk1/pp1b1ppp/2n1pn2/2bp4/2P5/2N2NP1/PP2PPBP/R1BQ1RK1 w - - 0 9'
  const thumb2 = 'r1bqk2r/ppp2ppp/2n5/3np3/1bB5/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6'
  const thumb3 = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5'

  return (
    <DashboardShell username={isDemo ? 'Alex' : 'Learner'}>
      <div className="space-y-6">
        {/* Explicit Demo Banner */}
        {isDemo && <DemoBanner exitHref="/insights" />}

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#2d170e]">
              Insights
            </h1>
            <p className="font-serif text-base text-[#6d503b] mt-1">
              Patterns from your games and Think First sessions.
            </p>
          </div>

          {/* Date Filter */}
          {isDemo && (
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-[#e5d8c5] bg-[#fffdfa] px-3.5 py-2 text-xs font-serif font-semibold text-[#6d503b] shadow-xs hover:border-[#b3782b] transition-all"
            >
              <Calendar className="h-4 w-4 text-[#8c745f]" />
              <span>Based on your last 12 episodes</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#8c745f]" />
            </button>
          )}
        </div>

        {!isDemo ? (
          <EmptyState
            icon={Target}
            title="No Tactical Themes Calibrated Yet"
            message="Dr. Wolf discovers recurring thinking patterns and tactical blindspots during Dream Cycle consolidation after you play games with Think First enabled."
            hint="Play games in the Train or Play tab to generate your first tactical evidence."
            action={
              <Link
                href="/train"
                className="inline-flex items-center gap-2 rounded-xl bg-[#361f14] px-5 py-2.5 font-serif text-xs font-bold text-[#fbf1dc] hover:bg-[#23120b] transition-all"
              >
                Start Think First Training
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            {/* 4-Quadrant Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card 1: Recurring Themes */}
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <Target className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <div>
                  <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                    Recurring Themes
                  </h2>
                  <p className="text-[11px] text-[#8c745f]">
                    Patterns that show up repeatedly in your games and Think First sessions.
                  </p>
                </div>
              </div>
              <Info className="h-4 w-4 text-[#9b8370]" />
            </div>

            <div className="space-y-3">
              {/* Item 1 */}
              <div className="flex items-center gap-3.5 rounded-xl border border-[#f0e6d8] bg-[#faf5ec] p-3 transition-all hover:bg-[#f5ecdc]">
                <div className="h-12 w-12 shrink-0 rounded overflow-hidden border border-[#dec8af]">
                  <ChessboardView position={fenToBoardGrid(thumb1)} showCoords={false} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xs font-bold text-[#2d170e]">Opponent Threat Detection</h3>
                    <span className="rounded-full bg-[#ede0ca] px-2 py-0.5 text-[10px] text-[#6d503b] font-serif">Seen in 4 episodes &gt;</span>
                  </div>
                  <p className="font-serif text-[11.5px] text-[#735843] line-clamp-1 mt-0.5">
                    You often miss your opponent&apos;s counterplay after spotting your own attacking idea.
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-center gap-3.5 rounded-xl border border-[#f0e6d8] bg-[#faf5ec] p-3 transition-all hover:bg-[#f5ecdc]">
                <div className="h-12 w-12 shrink-0 rounded overflow-hidden border border-[#dec8af]">
                  <ChessboardView position={fenToBoardGrid(thumb2)} showCoords={false} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xs font-bold text-[#2d170e]">Tunnel Vision</h3>
                    <span className="rounded-full bg-[#ede0ca] px-2 py-0.5 text-[10px] text-[#6d503b] font-serif">Seen in 3 episodes &gt;</span>
                  </div>
                  <p className="font-serif text-[11.5px] text-[#735843] line-clamp-1 mt-0.5">
                    You focus on one plan and overlook stronger alternatives.
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-center gap-3.5 rounded-xl border border-[#f0e6d8] bg-[#faf5ec] p-3 transition-all hover:bg-[#f5ecdc]">
                <div className="h-12 w-12 shrink-0 rounded overflow-hidden border border-[#dec8af]">
                  <ChessboardView position={fenToBoardGrid(thumb3)} showCoords={false} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xs font-bold text-[#2d170e]">Missed Defensive Resources</h3>
                    <span className="rounded-full bg-[#ede0ca] px-2 py-0.5 text-[10px] text-[#6d503b] font-serif">Seen in 2 episodes &gt;</span>
                  </div>
                  <p className="font-serif text-[11.5px] text-[#735843] line-clamp-1 mt-0.5">
                    You sometimes miss simple defensive moves that neutralize the opponent&apos;s idea.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Top Missed Ideas */}
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <Lightbulb className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <div>
                  <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                    Top Missed Ideas
                  </h2>
                  <p className="text-[11px] text-[#8c745f]">
                    Types of ideas you identified but missed, most often.
                  </p>
                </div>
              </div>
              <Info className="h-4 w-4 text-[#9b8370]" />
            </div>

            <div className="space-y-3">
              {/* Item 1 */}
              <div className="flex items-center gap-3.5 rounded-xl border border-[#f0e6d8] bg-[#faf5ec] p-3 transition-all hover:bg-[#f5ecdc]">
                <div className="h-12 w-12 shrink-0 rounded overflow-hidden border border-[#dec8af]">
                  <ChessboardView position={fenToBoardGrid(thumb1)} showCoords={false} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xs font-bold text-[#2d170e]">Defensive Resource</h3>
                    <span className="rounded-full bg-[#ede0ca] px-2 py-0.5 text-[10px] text-[#6d503b] font-serif">Seen in 4 episodes &gt;</span>
                  </div>
                  <p className="font-serif text-[11.5px] text-[#735843] line-clamp-1 mt-0.5">
                    Missed moves that stop the opponent&apos;s plan or create counterplay.
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-center gap-3.5 rounded-xl border border-[#f0e6d8] bg-[#faf5ec] p-3 transition-all hover:bg-[#f5ecdc]">
                <div className="h-12 w-12 shrink-0 rounded overflow-hidden border border-[#dec8af]">
                  <ChessboardView position={fenToBoardGrid(thumb2)} showCoords={false} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xs font-bold text-[#2d170e]">Tactical Shot</h3>
                    <span className="rounded-full bg-[#ede0ca] px-2 py-0.5 text-[10px] text-[#6d503b] font-serif">Seen in 3 episodes &gt;</span>
                  </div>
                  <p className="font-serif text-[11.5px] text-[#735843] line-clamp-1 mt-0.5">
                    Missed tactics such as forks, pins, or discovered attacks.
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-center gap-3.5 rounded-xl border border-[#f0e6d8] bg-[#faf5ec] p-3 transition-all hover:bg-[#f5ecdc]">
                <div className="h-12 w-12 shrink-0 rounded overflow-hidden border border-[#dec8af]">
                  <ChessboardView position={fenToBoardGrid(thumb3)} showCoords={false} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xs font-bold text-[#2d170e]">Quiet Move</h3>
                    <span className="rounded-full bg-[#ede0ca] px-2 py-0.5 text-[10px] text-[#6d503b] font-serif">Seen in 2 episodes &gt;</span>
                  </div>
                  <p className="font-serif text-[11.5px] text-[#735843] line-clamp-1 mt-0.5">
                    Underestimated strong positional moves that improve your position.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Strengths */}
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <Crown className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <div>
                  <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                    Strengths
                  </h2>
                  <p className="text-[11px] text-[#8c745f]">
                    Areas where you show consistent strength.
                  </p>
                </div>
              </div>
              <Info className="h-4 w-4 text-[#9b8370]" />
            </div>

            <div className="space-y-3">
              {/* Strength 1 */}
              <div className="flex items-center gap-3.5 rounded-xl border border-[#c0dec7] bg-[#f5fbf6] p-3">
                <div className="h-12 w-12 shrink-0 rounded overflow-hidden border border-[#c0dec7]">
                  <ChessboardView position={fenToBoardGrid(thumb1)} showCoords={false} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xs font-bold text-[#2d170e]">Calculation Depth</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f1e9] px-2 py-0.5 text-[10px] font-medium text-[#3b6348]">
                      <Check className="h-3 w-3" /> Seen in 6 episodes
                    </span>
                  </div>
                  <p className="font-serif text-[11.5px] text-[#735843] line-clamp-1 mt-0.5">
                    You often find deep moves and consider multiple variations.
                  </p>
                </div>
              </div>

              {/* Strength 2 */}
              <div className="flex items-center gap-3.5 rounded-xl border border-[#c0dec7] bg-[#f5fbf6] p-3">
                <div className="h-12 w-12 shrink-0 rounded overflow-hidden border border-[#c0dec7]">
                  <ChessboardView position={fenToBoardGrid(thumb2)} showCoords={false} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xs font-bold text-[#2d170e]">King Safety Awareness</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f1e9] px-2 py-0.5 text-[10px] font-medium text-[#3b6348]">
                      <Check className="h-3 w-3" /> Seen in 5 episodes
                    </span>
                  </div>
                  <p className="font-serif text-[11.5px] text-[#735843] line-clamp-1 mt-0.5">
                    You are generally attentive to king safety in both your own and your opponent&apos;s positions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Needs Attention */}
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <div>
                  <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                    Needs Attention
                  </h2>
                  <p className="text-[11px] text-[#8c745f]">
                    Areas that are holding you back.
                  </p>
                </div>
              </div>
              <Info className="h-4 w-4 text-[#9b8370]" />
            </div>

            <div className="space-y-3">
              {/* Alert 1 */}
              <div className="flex items-center gap-3.5 rounded-xl border border-[#f5c2bd] bg-[#fffbfb] p-3">
                <div className="h-12 w-12 shrink-0 rounded overflow-hidden border border-[#f5c2bd]">
                  <ChessboardView position={fenToBoardGrid(thumb1)} showCoords={false} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xs font-bold text-[#2d170e]">Opponent Threat Detection</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fceeed] px-2 py-0.5 text-[10px] font-bold text-[#9c2f24]">
                      <AlertCircle className="h-3 w-3" /> Seen in 4 episodes
                    </span>
                  </div>
                  <p className="font-serif text-[11.5px] text-[#735843] line-clamp-1 mt-0.5">
                    You frequently miss the opponent&apos;s counterplay after focusing on your own plan.
                  </p>
                </div>
              </div>

              {/* Alert 2 */}
              <div className="flex items-center gap-3.5 rounded-xl border border-[#f5c2bd] bg-[#fffbfb] p-3">
                <div className="h-12 w-12 shrink-0 rounded overflow-hidden border border-[#f5c2bd]">
                  <ChessboardView position={fenToBoardGrid(thumb2)} showCoords={false} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xs font-bold text-[#2d170e]">Tunnel Vision</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fceeed] px-2 py-0.5 text-[10px] font-bold text-[#9c2f24]">
                      <AlertCircle className="h-3 w-3" /> Seen in 3 episodes
                    </span>
                  </div>
                  <p className="font-serif text-[11.5px] text-[#735843] line-clamp-1 mt-0.5">
                    You sometimes focus on a single idea and overlook better alternatives.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Recommendations Row */}
        <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BarChart2 className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
              <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                Recommendations <span className="font-normal text-xs text-[#8c745f] ml-2">Personalized next steps based on your patterns.</span>
              </h2>
            </div>
            <Info className="h-4 w-4 text-[#9b8370]" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Rec 1 */}
            <div className="flex flex-col justify-between rounded-xl border border-[#dec8af] bg-[#faf5ec] p-4 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#845722]" />
                  <h3 className="font-serif text-xs font-bold text-[#2d170e]">Train Opponent Threat Detection</h3>
                </div>
                <p className="font-serif text-[11.5px] text-[#735843]">
                  Practice identifying your opponent&apos;s resources before moving.
                </p>
              </div>
              <button className="flex items-center justify-between rounded-lg bg-[#ede0ca] px-3 py-1.5 text-xs font-semibold text-[#2d170e] hover:bg-[#e4d4b9]">
                <span>→ Recommended</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Rec 2 */}
            <div className="flex flex-col justify-between rounded-xl border border-[#dec8af] bg-[#faf5ec] p-4 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-[#845722]" />
                  <h3 className="font-serif text-xs font-bold text-[#2d170e]">Work on Defensive Calculations</h3>
                </div>
                <p className="font-serif text-[11.5px] text-[#735843]">
                  Do more Think First positions with a defensive focus.
                </p>
              </div>
              <button className="flex items-center justify-between rounded-lg bg-[#faf2e4] border border-[#dec8af] px-3 py-1.5 text-xs font-medium text-[#6d503b] hover:bg-[#f3e7d3]">
                <span>⚡ High impact</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Rec 3 */}
            <div className="flex flex-col justify-between rounded-xl border border-[#dec8af] bg-[#faf5ec] p-4 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#845722]" />
                  <h3 className="font-serif text-xs font-bold text-[#2d170e]">Explore Alternative Plans</h3>
                </div>
                <p className="font-serif text-[11.5px] text-[#735843]">
                  Pause and ask &ldquo;What else could I do?&rdquo; before committing to a move.
                </p>
              </div>
              <button className="flex items-center justify-between rounded-lg bg-[#faf2e4] border border-[#dec8af] px-3 py-1.5 text-xs font-medium text-[#6d503b] hover:bg-[#f3e7d3]">
                <span>→ Good next step</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        </div>
        )}
      </div>
    </DashboardShell>
  )
}

export default function InsightsPage() {
  return (
    <Suspense fallback={null}>
      <InsightsContent />
    </Suspense>
  )
}
