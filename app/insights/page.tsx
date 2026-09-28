'use client'

import React, { useState, useEffect, Suspense } from 'react'
import {
  Target,
  Info,
  Brain,
  BarChart2,
  Shield,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import {
  DashboardShell,
  EmptyState,
  ThinkingPatternCard,
  SkillMasteryRow,
} from '@/components/dashboard'
import { BrainDashboardData } from '../brain/page'

function InsightsContent() {
  const [data, setData] = useState<BrainDashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    async function load() {
      try {
        const playerId = typeof window !== 'undefined' ? localStorage.getItem('dr_wolf_player_id') : null
        const url = playerId ? `/api/brain?player_id=${playerId}` : '/api/brain'
        const res = await fetch(url)
        if (res.ok) {
          const brainData = await res.json()
          setData(brainData)
        }
      } catch (e) {
        console.error('Failed to load insights data:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const hasEpisodes = Boolean(data && data.summary && data.summary.episodes_analyzed > 0)

  return (
    <DashboardShell username={data?.player?.chesscom_username || 'Learner'}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#2d170e]">
              Insights
            </h1>
            <p className="font-serif text-base text-[#6d503b] mt-1">
              Patterns derived from your games and Think First sessions.
            </p>
          </div>
        </div>

        {!hasEpisodes ? (
          <EmptyState
            icon={Target}
            title="No Tactical Themes Calibrated Yet"
            message="Dr. Wolf discovers recurring thinking patterns and tactical blindspots during Dream Cycle consolidation after you play games with Think First enabled."
            hint="Play games in the Train or Play tab to generate your first tactical evidence."
            action={
              <Link
                href="/play"
                className="inline-flex items-center gap-2 rounded-xl bg-[#361f14] px-5 py-2.5 font-serif text-xs font-bold text-[#fbf1dc] hover:bg-[#23120b] transition-all"
              >
                <span>Start Live Session</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            {/* Grid of Real Observed Patterns */}
            <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                  <Brain className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                  <div>
                    <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                      Calibrated Cognitive Hypotheses
                    </h2>
                    <p className="text-[11px] text-[#8c745f]">
                      Based on {data?.summary?.episodes_analyzed} graded episodes and Stockfish truth evaluations.
                    </p>
                  </div>
                </div>
                <Info className="h-4 w-4 text-[#9b8370]" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                {data?.hypotheses?.map((hyp) => (
                  <ThinkingPatternCard
                    key={hyp.concept}
                    concept={hyp.concept}
                    label={hyp.label}
                    consumerState={hyp.consumer_state}
                    description={hyp.description}
                    observedLabel={
                      hyp.observed_count > 0
                        ? `Observed in ${hyp.observed_count} recent moment${hyp.observed_count > 1 ? 's' : ''}`
                        : 'No observations yet'
                    }
                  />
                ))}
              </div>
            </div>

            {/* Skill Mastery Breakdown */}
            <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                  <BarChart2 className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                  <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                    Skill Calibration
                  </h2>
                </div>
                <span className="text-xs font-serif text-[#8c745f]">
                  Consolidated via Dream Cycle
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {data?.skills?.map((sk) => (
                  <SkillMasteryRow
                    key={sk.concept}
                    concept={sk.concept}
                    label={sk.label}
                    masteryScore={sk.mastery_score}
                  />
                ))}
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
