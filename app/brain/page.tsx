'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import {
  DashboardShell,
  PageHeader,
  SkillMasteryRow,
  ThinkingPatternCard,
  WhyAskedCard,
  RecentSessionCard,
  BeliefUpdateRow,
  CurrentFocusCard,
  EmptyState,
} from '@/components/dashboard'
import {
  BarChart2,
  Brain,
  Clock,
  Info,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Target,
} from 'lucide-react'

export interface BrainDashboardData {
  player: {
    id: string
    chesscom_username: string | null
    estimated_rating: number | null
    created_at: string
  }
  summary: {
    sessions_played: number
    episodes_analyzed: number
  }
  skills: Array<{
    concept: string
    label: string
    mastery_score: number | null
    evidence_count: number
    trend: string
    last_updated?: string | null
  }>
  hypotheses: Array<{
    concept: string
    label: string
    description?: string
    state: string
    consumer_state: string
    observed_count: number
    evidence_count: number
    observed_label?: string
  }>
  current_focus: {
    concept: string | null
    label: string
    rationale: string
    stage: string
    stage_number?: number | null
    board_preview?: {
      fen: string
      source_label?: string
      episode_id?: string
      caption?: string
      arrow?: { from: [number, number]; to: [number, number] }
    } | null
  }
  why_asked: {
    narrative?: string | null
    evidence_list?: string[]
    evidence_citations?: Array<{
      episode_id: string
      move_number: number
      fen: string
      trigger_type: string
      concept: string
      concept_label: string
      reasoning_outcome: string
      move_outcome: string
      created_at?: string | null
    }>
  }
  recent_sessions: Array<{
    id: string
    session_number: number
    date_label: string
    reasoning_counts: {
      recognized: number
      partial: number
      missed: number
    }
  }>
  recent_belief_updates: Array<{
    id: string
    claim_type: string
    concept_label: string
    old_value: any
    new_value: any
    date_label?: string
  }>
}

function BrainDashboardContent() {
  const [data, setData] = useState<BrainDashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState<boolean>(false)
  const [isCreatingPlayer, setIsCreatingPlayer] = useState<boolean>(false)
  const [setupUsername, setSetupUsername] = useState<string>('')
  const [setupRating, setSetupRating] = useState<string>('800')

  const handleExplicitSetup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsCreatingPlayer(true)
    setError(null)
    try {
      const rting = parseInt(setupRating || '800', 10)
      const res = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chesscom_username: setupUsername.trim() || null,
          estimated_rating: isNaN(rting) ? 800 : rting,
        }),
      })

      if (!res.ok) {
        throw new Error(`Failed to create player profile (HTTP ${res.status})`)
      }

      const player = await res.json()
      if (typeof window !== 'undefined') {
        localStorage.setItem('dr_wolf_player_id', player.id)
        localStorage.setItem('dr_wolf_username', player.chesscom_username || 'Learner')
        localStorage.setItem('dr_wolf_rating', String(player.estimated_rating || 800))
      }

      setNeedsSetup(false)
      await fetchBrainDataForId(player.id)
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize player')
    } finally {
      setIsCreatingPlayer(false)
    }
  }

  const fetchBrainDataForId = async (playerId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/brain?player_id=${playerId}`)
      if (res.ok) {
        const liveData: BrainDashboardData = await res.json()
        setData(liveData)
      } else {
        setError(`Backend returned HTTP ${res.status}: ${res.statusText}`)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to backend server at /api/brain')
    } finally {
      setLoading(false)
    }
  }

  const checkAndFetchBrainData = async () => {
    const playerId = typeof window !== 'undefined' ? localStorage.getItem('dr_wolf_player_id') : null
    if (!playerId) {
      setNeedsSetup(true)
      setLoading(false)
      return
    }

    setNeedsSetup(false)
    await fetchBrainDataForId(playerId)
  }

  useEffect(() => {
    checkAndFetchBrainData()
  }, [])

  // Onboarding / Setup Required State (No silent player creation)
  if (needsSetup) {
    return (
      <DashboardShell>
        <div className="max-w-md mx-auto py-12 px-4">
          <div className="rounded-2xl border border-[#dec8af] bg-[#fffdfa] p-8 shadow-xl text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4e8d3] text-3xl shadow-xs">
              ♟
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-bold text-[#2d170e]">
                Setup Your Learner Profile
              </h2>
              <p className="font-serif text-xs text-[#735843] leading-relaxed">
                Connect your Chess.com identity or continue as an anonymous learner to begin tracking your reasoning evidence.
              </p>
            </div>

            <form onSubmit={handleExplicitSetup} className="space-y-4 text-left font-serif">
              <div>
                <label className="block text-xs font-bold text-[#452718] mb-1">
                  Chess.com Username (Optional)
                </label>
                <input
                  type="text"
                  value={setupUsername}
                  onChange={(e) => setSetupUsername(e.target.value)}
                  placeholder="e.g. magnuscarlsen"
                  className="w-full rounded-xl border border-[#d8be96] bg-[#fdfaf3] px-3.5 py-2.5 text-xs text-[#2d170e] focus:outline-none focus:ring-2 focus:ring-[#b3782b]/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#452718] mb-1">
                  Estimated Rating
                </label>
                <input
                  type="number"
                  value={setupRating}
                  onChange={(e) => setSetupRating(e.target.value)}
                  min="400"
                  max="2800"
                  className="w-full rounded-xl border border-[#d8be96] bg-[#fdfaf3] px-3.5 py-2.5 text-xs text-[#2d170e] focus:outline-none focus:ring-2 focus:ring-[#b3782b]/40"
                />
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isCreatingPlayer}
                  className="w-full rounded-xl bg-[#361f14] hover:bg-[#23120b] py-3 text-xs font-bold text-[#fbf1dc] shadow-sm transition-all disabled:opacity-50"
                >
                  {isCreatingPlayer ? 'Initializing...' : 'Continue as Learner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DashboardShell>
    )
  }

  // Loading State
  if (loading && !data) {
    return (
      <DashboardShell>
        <div className="flex min-h-[450px] flex-col items-center justify-center space-y-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#faf2e4] text-[#845722]">
            <RefreshCw className="h-6 w-6 animate-spin text-[#b3782b]" />
          </div>
          <p className="font-serif text-lg font-bold text-[#2d170e]">
            Loading Learner Model...
          </p>
        </div>
      </DashboardShell>
    )
  }

  // Production API Failure State
  if (error) {
    return (
      <DashboardShell>
        <div className="space-y-6">
          <PageHeader
            title="Your Chess Brain"
            subtitle="A coach that learns how you think."
          />

          <div className="rounded-2xl border border-[#f5c2bd] bg-[#fffdfa] p-8 shadow-sm">
            <div className="flex flex-col items-center text-center max-w-lg mx-auto space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fceeed] text-[#b84a39]">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h2 className="font-serif text-xl font-bold text-[#2d170e]">
                Backend Connection Offline
              </h2>
              <p className="font-serif text-xs text-[#735843] leading-relaxed">
                {error}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={checkAndFetchBrainData}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#382014] px-5 py-2.5 text-xs font-semibold text-[#f6eedb] transition-all hover:bg-[#22110a]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Connection</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (!data) return null

  const isBrandNew = data.summary.sessions_played === 0 && data.summary.episodes_analyzed === 0

  return (
    <DashboardShell username={data.player.chesscom_username || 'Learner'}>
      <div className="space-y-6">
        {/* Top Header matching reference image */}
        <PageHeader
          title="Your Chess Brain"
          subtitle="A coach that learns how you think."
          username={data.player.chesscom_username || 'Learner'}
          userRating={data.player.estimated_rating ? `${data.player.estimated_rating} Rating` : 'Unrated'}
          memberSince={data.player.created_at ? `Member since ${new Date(data.player.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : 'Member'}
          sessionsCount={data.summary.sessions_played}
          episodesCount={data.summary.episodes_analyzed}
          learningStage={data.current_focus.stage ? data.current_focus.stage.charAt(0).toUpperCase() + data.current_focus.stage.slice(1) : 'Baseline'}
          showUserBadge={Boolean(data.player.chesscom_username)}
        />

        {/* Row 1: Current Focus + Skill Mastery */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Current Focus */}
          <div className="lg:col-span-7">
            <CurrentFocusCard
              concept={data.current_focus.concept}
              label={data.current_focus.label}
              rationale={data.current_focus.rationale}
              stage={data.current_focus.stage}
              stageNumber={data.current_focus.stage_number || 2}
              boardPreview={data.current_focus.board_preview}
              className="h-full"
            />
          </div>

          {/* Right: Skill Mastery */}
          <div className="lg:col-span-5">
            <div className="h-full rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4">
                  <div className="flex items-center gap-2.5">
                    <BarChart2 className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                    <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                      Skill Mastery
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#8c745f]">
                    <span>Higher is better</span>
                    <Info className="h-3.5 w-3.5 text-[#9b8370]" />
                  </div>
                </div>

                {/* Skill Mastery Rows */}
                <div className="space-y-1.5 pt-1">
                  {data.skills.map((skill) => (
                    <SkillMasteryRow
                      key={skill.concept}
                      concept={skill.concept}
                      label={skill.label}
                      masteryScore={skill.mastery_score}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Observed Thinking Patterns + Why did you ask me that? */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Observed Thinking Patterns */}
          <div className="lg:col-span-7">
            <div className="h-full rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4">
                  <div className="flex items-center gap-2.5">
                    <Brain className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                    <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                      Observed Thinking Patterns
                    </h2>
                  </div>
                  <Info className="h-4 w-4 text-[#9b8370]" />
                </div>

                {/* 3 Cards Row */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-1">
                  {data.hypotheses.map((hyp) => (
                    <ThinkingPatternCard
                      key={hyp.concept}
                      concept={hyp.concept}
                      label={hyp.label}
                      consumerState={hyp.consumer_state}
                      description={hyp.description}
                      observedLabel={hyp.observed_label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Why did you ask me that? */}
          <div className="lg:col-span-5">
            <WhyAskedCard
              narrative={data.why_asked.narrative}
              evidenceList={
                data.why_asked.evidence_list ||
                data.why_asked.evidence_citations?.map((c) => `Episode #${c.move_number}`) ||
                []
              }
              sourceLabel={
                data.why_asked.evidence_citations?.[0]
                  ? `From Episode #${data.why_asked.evidence_citations[0].move_number}`
                  : null
              }
              thumbnailFen={data.why_asked.evidence_citations?.[0]?.fen || null}
              className="h-full"
            />
          </div>
        </div>

        {/* Row 3: Recent Sessions + Recent belief updates */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Recent Sessions */}
          <div className="lg:col-span-8">
            <div className="h-full rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)]">
              {/* Header */}
              <div className="flex items-center justify-between pb-4">
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

              {/* 3 Session Cards Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-1">
                {data.recent_sessions && data.recent_sessions.length > 0 ? (
                  data.recent_sessions.map((sess, idx) => (
                    <RecentSessionCard
                      key={sess.id || idx}
                      sessionNumber={sess.session_number || idx + 1}
                      dateLabel={sess.date_label || 'Apr 12, 2024'}
                      reasoningCounts={sess.reasoning_counts}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No Sessions Recorded"
                    message="Play a Think First session to start building your history."
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right: Recent belief updates */}
          <div className="lg:col-span-4">
            <div className="h-full rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)]">
              {/* Header */}
              <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-2.5">
                  <BarChart2 className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                  <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                    Recent belief updates
                  </h2>
                </div>
                <Info className="h-4 w-4 text-[#9b8370]" />
              </div>

              {/* Rows */}
              <div className="space-y-3 pt-1">
                {data.recent_belief_updates &&
                data.recent_belief_updates.length > 0 ? (
                  data.recent_belief_updates.map((update, idx) => (
                    <BeliefUpdateRow
                      key={update.id}
                      claimType={update.claim_type}
                      conceptLabel={update.concept_label}
                      oldValue={update.old_value}
                      newValue={update.new_value}
                      dateLabel={idx === 0 ? 'Apr 17' : 'Apr 14'}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No Updates"
                    message="No belief updates recorded yet."
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}

export default function BrainDashboardPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="flex min-h-[450px] items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-[#b3782b]" />
          </div>
        </DashboardShell>
      }
    >
      <BrainDashboardContent />
    </Suspense>
  )
}
