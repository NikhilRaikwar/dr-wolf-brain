'use client'

import React, { useState, Suspense } from 'react'
import {
  HelpCircle,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Target,
  Shield,
  Brain,
  Search,
  ExternalLink,
} from 'lucide-react'
import { DashboardShell } from '@/components/dashboard'

function HelpContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [searchQuery, setSearchQuery] = useState('')

  const faqs = [
    {
      q: 'What is Think First and how does it work?',
      a: 'Think First is a Socratic coaching protocol. At critical tactical and strategic moments during live chess play (move 8 and beyond), Dr. Wolf pauses the clock and asks you to articulate what you see before committing your move. Your reasoning is graded post-session by Stockfish truth, teaching the system how you actually think.',
    },
    {
      q: 'Why does Dr. Wolf separate Move Quality from Reasoning Quality?',
      a: 'A player can play the best move for the wrong reason (lucky blunder) or miss the best move despite sound calculation. Dr. Wolf tracks both dimensions independently to prevent false-positive mastery assumptions.',
    },
    {
      q: 'What is the Dream Cycle and when does it run?',
      a: 'The Dream Cycle runs after every completed game session. It processes committed and graded episodes, computes evidence updates, updates skill mastery scores, and transitions cognitive hypotheses (from "Needs evidence" to "Developing" to "Well-supported").',
    },
    {
      q: 'What engine powers the chess moves and analysis?',
      a: 'Stockfish is the sole engine authority. It validates move legality, evaluates engine counter-moves according to your estimated rating level, and performs objective post-game tactical grading.',
    },
    {
      q: 'How does the "Why did you ask me that?" card work?',
      a: 'Every coaching interruption has explicit provenance. When Dr. Wolf asks a question or highlights a pattern on your dashboard, it cites the exact past game episode, move number, and board position that triggered that observation.',
    },
  ]

  const filteredFaqs = faqs.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="pt-1">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#2d170e]">
            Help & Architecture Guide
          </h1>
          <p className="font-serif text-base text-[#6d503b] mt-1">
            Learn how Dr. Wolf Brain combines Stockfish truth with Socratic pedagogy.
          </p>
        </div>

        {/* Search Box */}
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#9b8370]" />
          <input
            type="text"
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#d8c7b0] bg-[#fffdfa] pl-11 pr-4 py-3 text-xs font-serif text-[#2d170e] placeholder-[#9b8370] shadow-xs focus:outline-none focus:border-[#b3782b]"
          />
        </div>

        {/* 3 Core Architecture Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-5 shadow-xs space-y-3 font-serif">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#faf2e4] text-[#845722]">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-[#2d170e]">1. Engine Authority</h3>
            <p className="text-xs text-[#6d503b] leading-relaxed">
              Stockfish provides ground truth. Legal moves, engine replies, and tactical accuracy are strictly server-authoritative.
            </p>
          </div>

          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-5 shadow-xs space-y-3 font-serif">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#faf2e4] text-[#845722]">
              <Brain className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-[#2d170e]">2. Socratic Think First</h3>
            <p className="text-xs text-[#6d503b] leading-relaxed">
              Deterministic triggers prompt the learner at critical moments. Graded answers capture cognitive patterns over time.
            </p>
          </div>

          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-5 shadow-xs space-y-3 font-serif">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#faf2e4] text-[#845722]">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-[#2d170e]">3. Dream Cycle Consolidation</h3>
            <p className="text-xs text-[#6d503b] leading-relaxed">
              Post-session batch processing updates skills and hypotheses in the database, shaping your personalized dashboard.
            </p>
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4 font-serif">
          <div className="flex items-center gap-2 pb-1">
            <HelpCircle className="h-5 w-5 text-[#2d170e]" />
            <h2 className="text-lg font-bold text-[#2d170e]">Frequently Asked Questions</h2>
          </div>

          <div className="divide-y divide-[#f0e6d8]">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <div key={idx} className="py-3.5">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between text-left font-bold text-xs sm:text-sm text-[#2d170e] hover:text-[#b3782b] transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-[#8c745f]" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[#8c745f]" />}
                  </button>
                  {isOpen && (
                    <p className="mt-2 text-xs text-[#6d503b] leading-relaxed">
                      {faq.a}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}

export default function HelpPage() {
  return (
    <Suspense fallback={null}>
      <HelpContent />
    </Suspense>
  )
}
