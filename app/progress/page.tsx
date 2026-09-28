'use client'

import React, { useState, useEffect, Suspense } from 'react'
import {
  GraduationCap,
  BarChart2,
  Target,
  Info,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import {
  DashboardShell,
  EmptyState,
  RecentSessionCard,
  BeliefUpdateRow,
} from '@/components/dashboard'
import { BrainDashboardData } from '../brain/page'

function ProgressContent() {
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
        console.error('Failed to load progress data:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const hasSessions = Boolean(data && data.summary && data.summary.sessions_played > 0)

  return (
    <DashboardShell username={data?.player?.chesscom_username || 'Learner'}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between pt-1">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#2d170e]">
              Progress
            </h1>
            <p className="font-serif text-base text-[#6d503b] mt-1">
              Real recorded sessions and validated belief transitions.
            </p>
          </div>

          {hasSessions && (
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3.5 rounded-xl border border-[#e5d8c5] bg-[#fffdfa] px-4 py-3 shadow-[0_1px_4px_rgba(60,35,18,0.03)] min-w-[140px]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4e8d3] text-[#6d503b]">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-[#8c745f]">Sessions completed</span>
                  <span className="font-serif text-xl font-bold text-[#2d170e]">{data?.summary?.sessions_played || 0}</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-xl border border-[#e5d8c5] bg-[#fffdfa] px-4 py-3 shadow-[0_1px_4px_rgba(60,35,18,0.03)] min-w-[140px]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4e8d3] text-[#6d503b]">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[11px] font-medium text-[#8c745f]">Episodes Analyzed</span>
                  <span className="font-serif text-xl font-bold text-[#2d170e]">{data?.summary?.episodes_analyzed || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {!hasSessions ? (
          <EmptyState
            icon={TrendingUp}
            title="No Recorded Progress History Yet"
            message="Your sessions, graded Think First accuracy, and Dream Cycle belief transitions will be tracked here after you complete your first session."
            hint="Play games in the Train or Play tab to generate your initial cognitive history."
            action={
              <Link
                href="/play"
                className="inline-flex items-center gap-2 rounded-xl bg-[#361f14] px-5 py-2.5 font-serif text-xs font-bold text-[#fbf1dc] hover:bg-[#23120b] transition-all"
              >
                <span>Play Live Think First Game</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            {/* Recent Sessions */}
            <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                  <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                    Recorded Sessions
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-1">
                {data?.recent_sessions?.map((sess, idx) => (
                  <RecentSessionCard
                    key={sess.id || idx}
                    sessionNumber={sess.session_number || idx + 1}
                    dateLabel={sess.date_label || 'Recent Game'}
                    reasoningCounts={sess.reasoning_counts}
                  />
                ))}
              </div>
            </div>

            {/* Belief Updates */}
            <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                  <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                    Dream Cycle Belief Updates
                  </h2>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {data?.recent_belief_updates && data.recent_belief_updates.length > 0 ? (
                  data.recent_belief_updates.map((update) => (
                    <BeliefUpdateRow
                      key={update.id}
                      claimType={update.claim_type}
                      conceptLabel={update.concept_label}
                      oldValue={update.old_value}
                      newValue={update.new_value}
                      dateLabel={update.date_label}
                    />
                  ))
                ) : (
                  <p className="font-serif text-xs text-[#8c745f] italic py-2">
                    No belief transitions triggered yet. Keep playing to reach confidence thresholds.
                  </p>
                )}
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
