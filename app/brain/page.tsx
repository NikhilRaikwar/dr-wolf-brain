'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  DashboardShell,
  DemoBanner,
  PageHeader,
  SkillMasteryRow,
  ThinkingPatternCard,
  WhyAskedCard,
  RecentSessionCard,
  BeliefUpdateRow,
  CurrentFocusCard,
  EmptyState,
} from '@/components/dashboard'
import { DEMO_BRAIN_DATA, BrainDashboardData } from '@/lib/brainDemoData'
import {
  BarChart2,
  Brain,
  Clock,
  Info,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'

function BrainDashboardContent() {
  const searchParams = useSearchParams()
  const isDemoExplicit = searchParams.get('demo') === '1'

  const [data, setData] = useState<BrainDashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBrainData = async () => {
    setLoading(true)
    setError(null)

    if (isDemoExplicit) {
      // Explicit opt-in demo mode
      setData(DEMO_BRAIN_DATA)
      setLoading(false)
      return
    }

    // Live API fetch (strict truth boundary: no silent fallback to demo data)
    try {
      const res = await fetch('/api/brain')
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

  useEffect(() => {
    fetchBrainData()
  }, [isDemoExplicit])

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
  if (error && !isDemoExplicit) {
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
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={fetchBrainData}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#382014] px-4 py-2 text-xs font-semibold text-[#f6eedb] transition-all hover:bg-[#22110a]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Connection</span>
                </button>
                <Link
                  href="/brain?demo=1"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d8c7b0] bg-[#fffdfa] px-4 py-2 text-xs font-semibold text-[#5e402e] transition-all hover:bg-[#faf4ea]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#b3782b]" />
                  <span>View Demo Data (?demo=1)</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (!data) return null

  return (
    <DashboardShell username={data.player.chesscom_username || (isDemoExplicit ? 'Alex' : 'Learner')}>
      <div className="space-y-6">
        {/* Explicit Demo Mode Warning Banner */}
        {isDemoExplicit && <DemoBanner exitHref="/brain" />}

        {/* Top Header matching reference image */}
        <PageHeader
          title="Your Chess Brain"
          subtitle="A coach that learns how you think."
          username={data.player.chesscom_username || (isDemoExplicit ? 'Alex' : 'Learner')}
          userRating={data.player.estimated_rating ? `${data.player.estimated_rating} Rating` : (isDemoExplicit ? '1600 Rapid • Developing' : 'Unrated')}
          memberSince={data.player.created_at ? `Member since ${new Date(data.player.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : 'Member'}
          sessionsCount={data.summary.sessions_played}
          episodesCount={data.summary.episodes_analyzed}
          learningStage={data.current_focus.stage ? data.current_focus.stage.charAt(0).toUpperCase() + data.current_focus.stage.slice(1) : (isDemoExplicit ? 'Developing' : 'Baseline')}
          showUserBadge={Boolean(data.player.chesscom_username || isDemoExplicit)}
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
