'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  DashboardShell,
  EmptyState,
} from '@/components/dashboard'
import {
  Lightbulb,
  Brain,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  MessageSquare,
  Target,
  Layers,
  BookOpen,
  ListOrdered,
  CheckCircle2,
  Play,
  Shield,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { ChessboardView } from '@/components/Chessboard'
import { fenToBoardGrid } from '@/lib/landingExamples'
import { BrainDashboardData } from '../brain/page'

function TrainContent() {
  const [brainData, setBrainData] = useState<BrainDashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedCitationIndex, setSelectedCitationIndex] = useState<number>(0)

  useEffect(() => {
    async function loadData() {
      try {
        const playerId = typeof window !== 'undefined' ? localStorage.getItem('dr_wolf_player_id') : null
        const url = playerId ? `/api/brain?player_id=${playerId}` : '/api/brain'
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setBrainData(data)
        }
      } catch (e) {
        console.error('Error loading training brain data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const currentFocus = brainData?.current_focus
  const citations = brainData?.why_asked?.evidence_citations || []
  const hasPastEpisodes = citations.length > 0
  const activeCitation = hasPastEpisodes ? citations[selectedCitationIndex] : null

  return (
    <DashboardShell username={brainData?.player?.chesscom_username || 'Learner'}>
      <div className="space-y-6">
        {/* Top Header + Dr. Wolf Coach Card */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center pt-1">
          {/* Left Title (7 cols) */}
          <div className="lg:col-span-7">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#2d170e]">
              Think First Training
            </h1>
            <p className="font-serif text-base text-[#6d503b] mt-1">
              Build the habit of asking better questions before making your move.
            </p>
          </div>

          {/* Right: Dr. Wolf Says Coach Card (5 cols) */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3.5 rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-4 shadow-[0_2px_12px_rgba(60,35,18,0.03)]">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#dec8af] shadow-xs">
                <Image
                  src="/dr_wolf_portrait.jpg"
                  alt="Dr. Wolf"
                  fill
                  className="object-cover"
                />
                <div className="absolute top-1 left-1 bg-[#fffdfa] rounded-full p-0.5 shadow-xs">
                  <Lightbulb className="h-2.5 w-2.5 text-[#845722]" />
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-serif text-xs font-bold text-[#2d170e] block">
                  Dr. Wolf says:
                </span>
                <p className="font-serif text-xs text-[#6d503b] leading-relaxed italic">
                  &ldquo;{currentFocus?.rationale || 'Before you move, pause and look for your opponent’s ideas. Most mistakes happen because we miss what they are threatening.'}&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Training Session Launcher Hero Card */}
        <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 sm:p-8 shadow-[0_2px_16px_rgba(60,35,18,0.04)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#f4e8d3] px-3 py-1 font-serif text-xs font-semibold text-[#845722]">
                <Target className="h-3.5 w-3.5" />
                <span>Current Focus: {currentFocus?.label || 'Tactical Awareness & Opponent Threats'}</span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#2d170e]">
                Ready to play a Think First session?
              </h2>

              <p className="font-serif text-sm text-[#6d503b] leading-relaxed max-w-xl">
                Play against Dr. Wolf powered by Stockfish. At critical pivot moves, Dr. Wolf pauses the clock to ask you what you see. Your committed answers shape your personal learner model.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/play"
                  className="inline-flex items-center gap-2.5 rounded-xl bg-[#361f14] px-6 py-3 font-serif text-sm font-bold text-[#fbf1dc] hover:bg-[#23120b] shadow-md transition-all hover:-translate-y-0.5"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Start Live Session</span>
                </Link>

                <div className="flex items-center gap-2 font-serif text-xs text-[#8c745f]">
                  <Shield className="h-4 w-4 text-[#4f8034]" />
                  <span>Server-authoritative • Stockfish Truth</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col items-center justify-center">
              <div className="w-full max-w-[220px] rounded-xl border border-[#dec8af] bg-[#faf6ee] p-4 text-center space-y-3 font-serif text-xs">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#f4e8d3] text-[#4f3222]">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-bold text-[#2d170e] block text-sm">
                    {brainData?.summary?.episodes_analyzed || 0} Graded Episodes
                  </span>
                  <span className="text-[#8c745f] text-[11px]">
                    {brainData?.summary?.sessions_played || 0} sessions completed
                  </span>
                </div>
                <div className="border-t border-[#ebdcc8] pt-2 text-[11px] text-[#735843]">
                  {brainData?.summary?.sessions_played === 0
                    ? 'Play 1 session to establish your baseline'
                    : 'Beliefs updated after each completed game'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real Episode Review Section */}
        {hasPastEpisodes && activeCitation ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-[#2d170e]" />
                <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                  Your Recent Graded Moments
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-serif text-[#8c745f]">
                <span>Moment {selectedCitationIndex + 1} of {citations.length}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCitationIndex(Math.max(0, selectedCitationIndex - 1))}
                    disabled={selectedCitationIndex === 0}
                    className="p-1 rounded hover:bg-[#faf2e4] text-[#6d503b] disabled:opacity-30"
                    aria-label="Previous moment"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCitationIndex(Math.min(citations.length - 1, selectedCitationIndex + 1))}
                    disabled={selectedCitationIndex === citations.length - 1}
                    className="p-1 rounded hover:bg-[#faf2e4] text-[#6d503b] disabled:opacity-30"
                    aria-label="Next moment"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              {/* Board */}
              <div className="lg:col-span-7 flex justify-center">
                <div className="w-full max-w-[480px] aspect-square rounded-[8px] overflow-hidden shadow-xs border border-[#dec8af]">
                  <ChessboardView
                    position={fenToBoardGrid(activeCitation.fen)}
                    showCoords={true}
                    className="w-full h-full"
                  />
                </div>
              </div>

              {/* Episode Details */}
              <div className="lg:col-span-5 rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4 font-serif">
                <div className="border-b border-[#f0e6d8] pb-3">
                  <span className="text-[11px] text-[#8c745f] uppercase tracking-wider font-semibold block">
                    Recorded in Game
                  </span>
                  <h3 className="text-base font-bold text-[#2d170e]">
                    Move {activeCitation.move_number} · {activeCitation.concept_label}
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[#8c745f] block font-semibold mb-1">Trigger Concept:</span>
                    <span className="inline-block rounded-lg bg-[#faf5ec] border border-[#dec8af] px-3 py-1.5 text-[#2d170e] font-medium">
                      {activeCitation.concept_label}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#8c745f] block font-semibold mb-1">Reasoning Outcome:</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold ${
                      activeCitation.reasoning_outcome === 'recognized'
                        ? 'bg-[#e8f1e9] text-[#3b6348]'
                        : activeCitation.reasoning_outcome === 'partial'
                        ? 'bg-[#fdf3e7] text-[#9b581e]'
                        : 'bg-[#fceeed] text-[#9c2f24]'
                    }`}>
                      {activeCitation.reasoning_outcome}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#8c745f] block font-semibold mb-1">Move Outcome:</span>
                    <span className="text-[#2d170e] font-medium">
                      {activeCitation.move_outcome || 'Committed move on board'}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/play"
                    className="w-full block text-center rounded-xl bg-[#361f14] py-2.5 text-xs font-bold text-[#fbf1dc] hover:bg-[#23120b] transition-all"
                  >
                    Play Another Session
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No Past Training Episodes Yet"
            message="Your past Think First questions and reasoning evaluations will appear here once you play your first live game."
            action={
              <Link
                href="/play"
                className="inline-flex items-center gap-2 rounded-xl bg-[#361f14] px-5 py-2.5 font-serif text-xs font-bold text-[#fbf1dc] hover:bg-[#23120b] transition-all"
              >
                <span>Play Live Session</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        )}
      </div>
    </DashboardShell>
  )
}

export default function TrainPage() {
  return (
    <Suspense fallback={null}>
      <TrainContent />
    </Suspense>
  )
}
