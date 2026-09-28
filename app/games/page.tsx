'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import {
  DashboardShell,
  EmptyState,
} from '@/components/dashboard'
import {
  Clock,
  FileText,
  Users,
  BarChart2,
  Star,
  Upload,
  User,
  ArrowRight,
  Shield,
  BookOpen,
} from 'lucide-react'

function GamesContent() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#2d170e]">
              Your Games
            </h1>
            <p className="font-serif text-base text-[#6d503b] mt-1">
              Import, explore, and learn from your chess games.
            </p>
          </div>

          {/* Top Actions: Connect Chess.com + Upload PGN (Honest coming-next indicators) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-[#e5d8c5]/80 bg-[#faf6ee] px-4 py-2.5 opacity-80 cursor-not-allowed">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#efe4d1] text-[#8c745f]">
                <User className="h-4 w-4" />
              </div>
              <div className="text-xs font-serif">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#4a3224] block">Connect Chess.com</span>
                  <span className="text-[10px] uppercase font-sans font-semibold bg-[#e8ded0] text-[#785c49] px-1.5 py-0.2 rounded">Coming Next</span>
                </div>
                <span className="text-[11px] text-[#8c745f]">Import your games automatically</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[#e5d8c5]/80 bg-[#faf6ee] px-4 py-2.5 opacity-80 cursor-not-allowed">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#efe4d1] text-[#8c745f]">
                <Upload className="h-4 w-4" />
              </div>
              <div className="text-xs font-serif">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#4a3224] block">Upload PGN</span>
                  <span className="text-[10px] uppercase font-sans font-semibold bg-[#e8ded0] text-[#785c49] px-1.5 py-0.2 rounded">Coming Next</span>
                </div>
                <span className="text-[11px] text-[#8c745f]">Upload a PGN file from any platform</span>
              </div>
            </div>
          </div>
        </div>

        {/* Honest Empty State */}
        <EmptyState
          icon={BookOpen}
          title="No Imported Games Yet"
          message="Connect your Chess.com account or upload PGN files to analyze historical games with Stockfish and seed initial hypotheses."
          hint="Imported games observe WHAT was played. To record WHY you played each move and build active cognitive evidence, start a Think First session."
          action={
            <Link
              href="/play"
              className="inline-flex items-center gap-2 rounded-xl bg-[#361f14] px-5 py-2.5 font-serif text-xs font-bold text-[#fbf1dc] hover:bg-[#23120b] transition-all"
            >
              <span>Play Live Think First Session</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />

        {/* Epistemic Architecture Explanation Card */}
        <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-3 font-serif">
          <div className="flex items-center gap-2 text-sm font-bold text-[#2d170e]">
            <Shield className="h-4 w-4 text-[#845722]" />
            <h3>How Dr. Wolf Evaluates Imported Games</h3>
          </div>
          <p className="text-xs text-[#6d503b] leading-relaxed">
            Per the Dr. Wolf Brain product contract, imported PGN games reveal what happened on the board (accuracy, blunder points, and critical positions), but cannot directly observe your reasoning. Therefore, imported games can only <strong>seed</strong> hypotheses — never confirm or refute them without interactive Think First evidence.
          </p>
        </div>
      </div>
    </DashboardShell>
  )
}

export default function YourGamesPage() {
  return (
    <Suspense fallback={null}>
      <GamesContent />
    </Suspense>
  )
}
