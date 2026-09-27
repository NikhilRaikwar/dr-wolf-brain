'use client'

import React, { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  BarChart2,
  Headphones,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Users,
  Check,
  ExternalLink,
  Search,
  Rocket,
  ChevronRight,
  LifeBuoy,
  BookOpen,
  Target,
  UploadCloud,
} from 'lucide-react'
import {
  DashboardShell,
  DemoBanner,
} from '@/components/dashboard'

function HelpContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === '1'
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const faqs = [
    {
      q: 'What is Think First and how does it work?',
      a: "Think First shows you a position and asks you to find your own move before seeing the engine's suggestion. This helps you build better thinking habits, improve pattern recognition, and develop deeper chess understanding over time.",
    },
    {
      q: 'How do I import my chess games?',
      a: 'You can connect your Chess.com account in Settings or upload any standard PGN file directly from the Your Games page.',
    },
    {
      q: 'What kind of insights will I see?',
      a: 'Dr. Wolf analyzes tactical triggers, opponent threat detection, calculation depth, and thinking patterns across all your games.',
    },
    {
      q: 'Is my data private and secure?',
      a: 'Yes, your games and learner model are stored securely and privately. You can change profile visibility at any time in Settings.',
    },
    {
      q: 'Can I use Dr. Wolf Brain on multiple devices?',
      a: 'Yes, your learner model is synced in real-time across desktop, tablet, and mobile browsers.',
    },
    {
      q: 'How do I cancel or change my subscription?',
      a: 'You can manage subscription preferences directly from the Settings > Account management tab.',
    },
  ]

  return (
    <DashboardShell username={isDemo ? 'Alex' : 'Learner'}>
      <div className="space-y-6">
        {/* Explicit Demo Banner */}
        {isDemo && <DemoBanner exitHref="/help" />}

        {/* Top Header + Search Bar + Onboarding Checklist */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start pt-1">
          {/* Left Title & Search (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#2d170e]">
                Help
              </h1>
              <p className="font-serif text-base text-[#6d503b] mt-1">
                Find answers, get support, and make the most of Dr. Wolf Brain.
              </p>
            </div>

            {/* Search Box */}
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#9b8370]" />
              <input
                type="text"
                placeholder="Search for help topics..."
                className="w-full rounded-xl border border-[#d8c7b0] bg-[#fffdfa] pl-11 pr-4 py-3 text-xs font-serif text-[#2d170e] placeholder-[#9b8370] shadow-xs focus:outline-none focus:border-[#b3782b]"
              />
            </div>

            {/* Search Tags */}
            <div className="flex flex-wrap items-center gap-2 font-serif text-xs text-[#8c745f] pt-1">
              <span>Try searching for:</span>
              <button className="rounded-lg bg-[#faf2e4] border border-[#dec8af] px-2.5 py-1 text-[#6d503b] hover:bg-[#f3e7d3]">
                import games
              </button>
              <button className="rounded-lg bg-[#faf2e4] border border-[#dec8af] px-2.5 py-1 text-[#6d503b] hover:bg-[#f3e7d3]">
                think first
              </button>
              <button className="rounded-lg bg-[#faf2e4] border border-[#dec8af] px-2.5 py-1 text-[#6d503b] hover:bg-[#f3e7d3]">
                insights
              </button>
              <button className="rounded-lg bg-[#faf2e4] border border-[#dec8af] px-2.5 py-1 text-[#6d503b] hover:bg-[#f3e7d3]">
                account
              </button>
              <button className="rounded-lg bg-[#faf2e4] border border-[#dec8af] px-2.5 py-1 text-[#6d503b] hover:bg-[#f3e7d3]">
                billing
              </button>
            </div>
          </div>

          {/* Right: Onboarding Checklist (5 cols) */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-5 sm:p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Rocket className="h-5 w-5 stroke-[1.8] text-[#845722]" />
                  <div>
                    <h2 className="font-serif text-base font-bold text-[#2d170e]">
                      Onboarding Checklist
                    </h2>
                    <p className="text-[11px] text-[#8c745f]">
                      Get up and running with Dr. Wolf Brain.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-[#8c745f]">2 of 5 complete</span>
                  <div className="h-1.5 w-16 rounded-full bg-[#ebdcc8] mt-1">
                    <div className="h-full rounded-full bg-[#709873] w-[40%]" />
                  </div>
                </div>
              </div>

              {/* Checklist Items */}
              <div className="space-y-2 font-serif text-xs">
                <div className="flex items-center justify-between text-[#8c745f] line-through py-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#709873] text-white text-[9px] font-bold">✓</span>
                    <span>Create your account</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[#8c745f] line-through py-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#709873] text-white text-[9px] font-bold">✓</span>
                    <span>Complete your first Think First session</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[#2d170e] font-medium py-1 hover:text-[#b3782b] cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border border-[#dec8af]" />
                    <span>Import a game for analysis</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#8c745f]" />
                </div>

                <div className="flex items-center justify-between text-[#2d170e] font-medium py-1 hover:text-[#b3782b] cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border border-[#dec8af]" />
                    <span>Explore your insights</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#8c745f]" />
                </div>

                <div className="flex items-center justify-between text-[#2d170e] font-medium py-1 hover:text-[#b3782b] cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border border-[#dec8af]" />
                    <span>Customize your training goals</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#8c745f]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section: Browse Help Topics */}
        <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
          <div className="flex items-center gap-2.5">
            <LifeBuoy className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
            <div>
              <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                Browse Help Topics
              </h2>
              <p className="text-[11px] text-[#8c745f]">
                Quick answers and step-by-step guides for everything in Dr. Wolf Brain.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 pt-1">
            {/* Topic 1 */}
            <div className="flex flex-col justify-between rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-4 space-y-3 hover:border-[#b3782b] transition-all cursor-pointer">
              <div className="space-y-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4e8d3] text-[#845722]">
                  <BookOpen className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-xs font-bold text-[#2d170e]">Getting Started</h3>
                <p className="font-serif text-[11px] text-[#735843]">
                  Learn the basics and set up your account for success.
                </p>
              </div>
              <span className="text-right text-[#b3782b] font-bold text-xs">→</span>
            </div>

            {/* Topic 2 */}
            <div className="flex flex-col justify-between rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-4 space-y-3 hover:border-[#b3782b] transition-all cursor-pointer">
              <div className="space-y-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4e8d3] text-[#845722]">
                  <Target className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-xs font-bold text-[#2d170e]">Think First Sessions</h3>
                <p className="font-serif text-[11px] text-[#735843]">
                  Understand how Think First works and get the most from your training.
                </p>
              </div>
              <span className="text-right text-[#b3782b] font-bold text-xs">→</span>
            </div>

            {/* Topic 3 */}
            <div className="flex flex-col justify-between rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-4 space-y-3 hover:border-[#b3782b] transition-all cursor-pointer">
              <div className="space-y-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4e8d3] text-[#845722]">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-xs font-bold text-[#2d170e]">Importing Games</h3>
                <p className="font-serif text-[11px] text-[#735843]">
                  Learn how to import, organize, and analyze your chess games.
                </p>
              </div>
              <span className="text-right text-[#b3782b] font-bold text-xs">→</span>
            </div>

            {/* Topic 4 */}
            <div className="flex flex-col justify-between rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-4 space-y-3 hover:border-[#b3782b] transition-all cursor-pointer">
              <div className="space-y-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4e8d3] text-[#845722]">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-xs font-bold text-[#2d170e]">Understanding Insights</h3>
                <p className="font-serif text-[11px] text-[#735843]">
                  See how your data reveals your thinking patterns and progress over time.
                </p>
              </div>
              <span className="text-right text-[#b3782b] font-bold text-xs">→</span>
            </div>

            {/* Topic 5 */}
            <div className="flex flex-col justify-between rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-4 space-y-3 hover:border-[#b3782b] transition-all cursor-pointer">
              <div className="space-y-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4e8d3] text-[#845722]">
                  <Headphones className="h-4 w-4" />
                </div>
                <h3 className="font-serif text-xs font-bold text-[#2d170e]">Contact Support</h3>
                <p className="font-serif text-[11px] text-[#735843]">
                  Get in touch with our team for personalized help.
                </p>
              </div>
              <span className="text-right text-[#b3782b] font-bold text-xs">→</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: FAQs + Community Card */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: FAQs (8 cols) */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                  <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                    Frequently Asked Questions
                  </h2>
                </div>
                <button className="font-serif text-xs font-semibold text-[#845722] hover:text-[#2d170e] flex items-center gap-1">
                  <span>View all FAQs</span>
                  <span>→</span>
                </button>
              </div>

              {/* Accordion list */}
              <div className="divide-y divide-[#f0e6d8] font-serif text-xs">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaq === idx
                  return (
                    <div key={idx} className="py-3">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="flex w-full items-center justify-between text-left font-bold text-[#2d170e] hover:text-[#b3782b]"
                      >
                        <span className="text-[13px]">{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-[#8c745f]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#8c745f]" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="mt-2.5 rounded-xl bg-[#faf5ec] p-3 text-[12px] text-[#6d503b] leading-relaxed">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right: Join Community (4 cols) */}
          <div className="lg:col-span-4">
            <div className="h-full rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <Users className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                  <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                    Join Our Community
                  </h2>
                </div>
                <p className="font-serif text-xs text-[#8c745f]">
                  Learn, share, and grow with fellow chess learners on the same journey.
                </p>

                {/* Community avatar illustration badge */}
                <div className="flex justify-center py-2">
                  <div className="flex items-center -space-x-3">
                    <div className="h-10 w-10 rounded-full bg-[#f4deb8] border-2 border-white flex items-center justify-center text-sm font-bold">♟</div>
                    <div className="h-10 w-10 rounded-full bg-[#ba8d5d] border-2 border-white flex items-center justify-center text-sm font-bold text-white">♞</div>
                    <div className="h-10 w-10 rounded-full bg-[#8c745f] border-2 border-white flex items-center justify-center text-sm font-bold text-white">♝</div>
                  </div>
                </div>

                {/* Bullets */}
                <div className="space-y-2 font-serif text-[11.5px] text-[#6d503b]">
                  <div className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-[#4f8034] shrink-0 mt-0.5" />
                    <span>Ask questions and get help from other users</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-[#4f8034] shrink-0 mt-0.5" />
                    <span>Share your progress and insights</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-[#4f8034] shrink-0 mt-0.5" />
                    <span>Discover training tips and study ideas</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-[#4f8034] shrink-0 mt-0.5" />
                    <span>Be part of a supportive, improvement-focused community</span>
                  </div>
                </div>
              </div>

              {/* Join Button */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ede0ca] py-3 text-xs font-serif font-bold text-[#2d170e] hover:bg-[#e4d4b9] shadow-xs transition-all"
              >
                <span>Join the Community</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
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
