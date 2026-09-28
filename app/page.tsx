'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Play,
  ArrowRight,
  Target,
  Brain,
  FileText,
  Music2,
  Lightbulb,
  MessageSquare,
  Repeat,
  Star,
  Layers,
  Database,
  EyeOff,
  Sparkles,
  GitFork,
  TrendingUp,
  Gamepad2,
  Settings2,
  BookOpen,
  Code2,
  Menu,
  X,
  Check,
  Moon,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import { ChessboardView } from '@/components/Chessboard'
import {
  heroExample,
  thinkFirstExample,
  reviewExample,
  fenToBoardGrid,
} from '@/lib/landingExamples'

import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [ratingInput, setRatingInput] = useState('1200')
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'review' | 'evidence' | 'engineLines'>('review')
  const [activeStage, setActiveStage] = useState<number>(0)
  const [isPipelinePaused, setIsPipelinePaused] = useState<boolean>(false)

  const handleConnectSubmit = async (e?: React.FormEvent, customUsername?: string, customRating?: string) => {
    if (e) e.preventDefault()
    setIsConnecting(true)
    setConnectionError(null)

    const uname = (customUsername !== undefined ? customUsername : usernameInput).trim()
    const rting = parseInt((customRating !== undefined ? customRating : ratingInput) || '800', 10)

    try {
      const res = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chesscom_username: uname || null,
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

      setAuthModalOpen(false)
      router.push('/overview')
    } catch (err: any) {
      setConnectionError(err.message || 'Could not connect to backend server')
    } finally {
      setIsConnecting(false)
    }
  }

  useEffect(() => {
    if (isPipelinePaused) return
    const timer = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % 7)
    }, 2800)
    return () => clearInterval(timer)
  }, [isPipelinePaused])

  const heroGrid = fenToBoardGrid(heroExample.fen, heroExample.highlightSquare)
  const thinkFirstGrid = fenToBoardGrid(thinkFirstExample.fen)
  const reviewGrid = fenToBoardGrid(reviewExample.fen, reviewExample.highlightSquare)

  const stages = [
    { title: '1. Games / PGN', copy: 'Import Chess.com games or upload PGN.', icon: Gamepad2 },
    { title: '2. Stockfish Analysis', copy: 'Find critical positions and validate chess truth.', icon: Settings2 },
    { title: '3. Episode Memory', copy: 'Store what the learner saw, said, and played.', icon: Database },
    { title: '4. Learner Model', copy: 'Update skills and evidence-backed hypotheses.', icon: Brain },
    { title: '5. LLM Pedagogy', copy: 'Turn grounded facts into Socratic wording and explanations.', icon: MessageSquare },
    { title: '6. Dream Cycle', copy: 'Consolidate the session and choose the next focus.', icon: Moon },
    { title: '7. Personalized Coaching', copy: 'Adapt future questions, reviews, and practice.', icon: Target },
  ]

  const buildLinks = [
    {
      title: 'Public Build Log',
      copy: 'Track product decisions, trade-offs, experiments, and day-by-day implementation progress.',
      cta: 'Read BUILD_LOG.md',
      icon: FileText,
      href: 'https://github.com/NikhilRaikwar/dr-wolf-brain/blob/main/BUILD_LOG.md',
    },
    {
      title: 'Canonical PRD',
      copy: 'The frozen product source of truth: what Dr. Wolf Brain should do, why it exists, and what v1 deliberately does not attempt.',
      cta: 'Read the PRD',
      icon: BookOpen,
      href: 'https://github.com/NikhilRaikwar/dr-wolf-brain/blob/main/PRD.md',
    },
    {
      title: 'Engineering Build Spec',
      copy: 'The implementation contract: database rules, trigger engine, grader, belief updates, API contracts, and test matrix.',
      cta: 'Read the Build Spec',
      icon: Code2,
      href: 'https://github.com/NikhilRaikwar/dr-wolf-brain/blob/main/BUILD_SPEC.md',
    },
    {
      title: 'Architecture & Decisions',
      copy: 'See the memory pipeline, deterministic boundaries, evidence model, and engineering choices behind the demo.',
      cta: 'View Architecture',
      icon: Layers,
      href: 'https://github.com/NikhilRaikwar/dr-wolf-brain/blob/main/docs/ARCHITECTURE.md',
    },
  ]

  return (
    <main className="min-h-screen text-[#361d14]">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-50 bg-[#f6eedb]/95 backdrop-blur-md border-b border-[#d8c09a]/80 shadow-[0_2px_8px_rgba(80,50,20,0.04)]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          {/* Brand Logo */}
          <a href="#home" className="flex items-center gap-3 group">
            <span className="text-2xl sm:text-3xl leading-none select-none drop-shadow-sm transition-transform group-hover:scale-105">
              ♞
            </span>
            <span className="font-serif-custom text-2xl sm:text-[26px] font-bold tracking-tight text-[#2d170e]">
              Dr. Wolf Brain
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 lg:gap-9 font-serif-custom text-[16px] font-medium text-[#4f3222]">
            <a href="#home" className="hover:text-[#b3782b] transition-colors">
              Home
            </a>
            <a href="#how-it-works" className="hover:text-[#b3782b] transition-colors">
              How It Works
            </a>
            <a href="#think-first" className="hover:text-[#b3782b] transition-colors">
              Interactive Training
            </a>
            <a href="#learn" className="hover:text-[#b3782b] transition-colors">
              Architecture
            </a>
            <a href="#open" className="hover:text-[#b3782b] transition-colors">
              Built in the Open
            </a>
          </nav>

          {/* Right Action Button */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#361f14] hover:bg-[#23120b] text-[#fbf1dc] px-5 py-2.5 rounded-[6px] font-serif-custom text-[15px] font-semibold shadow-[0_3px_0_#1f1008] transition-all hover:translate-y-[-1px] active:translate-y-[1px]"
            >
              <span>Connect & Play</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#361f14]"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#f8f0de] border-b border-[#d8c09a] px-6 py-5 flex flex-col gap-4 font-serif-custom text-lg shadow-lg">
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#b3782b]"
            >
              Home
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#b3782b]"
            >
              How It Works
            </a>
            <a
              href="#think-first"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#b3782b]"
            >
              Interactive Training
            </a>
            <a
              href="#learn"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#b3782b]"
            >
              Architecture
            </a>
            <a
              href="#open"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#b3782b]"
            >
              Built in the Open
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                setAuthModalOpen(true)
              }}
              className="inline-flex items-center justify-center gap-2 text-center bg-[#361f14] text-[#fbf1dc] px-5 py-2.5 rounded-[6px] font-semibold mt-2"
            >
              <span>Connect & Play</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </header>

      {/* Connect & Sign In Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-md rounded-2xl border border-[#dec8af] bg-[#fffdfa] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8c745f] hover:bg-[#faf2e4] hover:text-[#2d170e] transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f4e8d3] text-2xl shadow-xs">
                ♞
              </div>
              <h2 className="font-serif-custom text-2xl font-bold text-[#2d170e]">
                Player Setup
              </h2>
              <p className="font-serif-custom text-xs text-[#735843]">
                Enter your Chess.com or player username, or start directly with a fresh learner profile.
              </p>
            </div>

            {/* Error Message */}
            {connectionError && (
              <div className="rounded-xl border border-[#f5c2bd] bg-[#fdf2f1] p-3 text-xs text-[#9c2f24]">
                {connectionError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleConnectSubmit} className="space-y-4 font-serif-custom text-xs">
              <div>
                <label className="block text-[#4f3222] font-semibold mb-1.5 text-xs">
                  Username (optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. GothamChess, Magnus, or your name"
                    className="w-full rounded-xl border border-[#dec8af] bg-[#faf5ec] px-3.5 py-2.5 text-sm font-medium text-[#2d170e] placeholder-[#9b8370] focus:border-[#b3782b] focus:bg-white focus:outline-none shadow-xs"
                  />
                </div>
              </div>

              {/* Rating level presets */}
              <div>
                <label className="block text-[#4f3222] font-semibold mb-1.5 text-xs">
                  Estimated Rating Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['800', '1200', '1500', '1800'].map((rt) => (
                    <button
                      key={rt}
                      type="button"
                      onClick={() => setRatingInput(rt)}
                      className={`py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        ratingInput === rt
                          ? 'border-[#b3782b] bg-[#faf2e4] text-[#845722] ring-1 ring-[#b3782b]/30'
                          : 'border-[#e5d8c5] bg-[#fffdfa] text-[#6d503b] hover:bg-[#faf5ec]'
                      }`}
                    >
                      {rt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isConnecting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#361f14] py-3 text-sm font-bold text-[#fbf1dc] hover:bg-[#23120b] shadow-sm transition-all disabled:opacity-50"
              >
                <span>{isConnecting ? 'Initializing Player...' : 'Launch Dashboard'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Quick Anonymous Learner Launch */}
            <div className="pt-2 border-t border-[#f0e6d8]">
              <button
                type="button"
                onClick={() => handleConnectSubmit(undefined, '', '800')}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-[#dec8af] bg-[#faf6ee] hover:bg-[#f4ebe0] transition-colors font-serif-custom text-xs font-bold text-[#2d170e]"
              >
                <span>Continue as Learner (Fresh Model)</span>
                <ArrowRight size={14} className="text-[#845722]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Hero Section */}
      <section id="home" className="relative pt-10 sm:pt-14 pb-16 sm:pb-20 overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-6 flex flex-col">
              {/* Eyebrow */}
              <p className="font-sans-custom uppercase tracking-[0.25em] text-[12px] sm:text-[13px] font-semibold text-[#8b5c36] mb-3 sm:mb-4">
                A PERSONALIZED AI CHESS COACH
              </p>

              {/* H1 Main Heading */}
              <h1 className="font-serif-custom text-[52px] sm:text-[68px] lg:text-[76px] font-bold text-[#2d170e] leading-[0.95] tracking-tight mb-3">
                Dr. Wolf Brain
              </h1>

              {/* Subheading */}
              <h2 className="font-serif-custom text-[28px] sm:text-[34px] lg:text-[38px] font-semibold text-[#3b2116] leading-[1.1] mb-5">
                An AI chess coach that learns how you think.
              </h2>

              {/* Body Description */}
              <p className="font-serif-custom text-[18px] sm:text-[20px] text-[#5c3e2d] leading-[1.45] max-w-[530px] mb-4">
                Play, think, and learn with a coach that remembers how you reason, notices
                recurring patterns, and adapts its questions over time.
              </p>

              <p className="font-serif-custom text-[14px] sm:text-[15px] text-[#826652] leading-relaxed max-w-[500px] mb-8">
                Chess claims are checked against Stockfish. Learner insights are grounded in the
                episodes you actually create.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4 mb-9">
                <a
                  href="/play"
                  className="inline-flex items-center gap-2.5 bg-[#381f14] hover:bg-[#25130b] text-[#fcf1dc] px-7 py-3.5 rounded-[6px] font-serif-custom text-[17px] font-bold shadow-[0_3px_0_#200f07] transition-all hover:translate-y-[-2px] active:translate-y-[0px]"
                >
                  <Play size={16} className="fill-[#fcf1dc]" />
                  <span>Play vs Dr. Wolf</span>
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2.5 bg-[#faebd4]/80 hover:bg-[#faebd4] text-[#3d2315] border border-[#b89163] px-6 py-3.5 rounded-[6px] font-serif-custom text-[17px] font-bold transition-all hover:translate-y-[-2px] shadow-sm"
                >
                  <span>See How It Works</span>
                  <ArrowRight size={17} />
                </a>
              </div>

              {/* Bottom Feature Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2 border-t border-[#d8c09a]/60">
                <div className="flex items-center gap-2.5 text-[#543827]">
                  <Target size={22} className="text-[#361f14] flex-shrink-0" />
                  <span className="font-serif-custom text-[14px] leading-tight font-medium">
                    Personalized coaching
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-[#543827]">
                  <Brain size={22} className="text-[#361f14] flex-shrink-0" />
                  <span className="font-serif-custom text-[14px] leading-tight font-medium">
                    Learns from games + Think First
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-[#543827]">
                  <FileText size={22} className="text-[#361f14] flex-shrink-0" />
                  <span className="font-serif-custom text-[14px] leading-tight font-medium">
                    Evidence-backed explanations
                  </span>
                </div>
              </div>
            </div>

            {/* Right Hero Interactive Mockup */}
            <div className="lg:col-span-6">
              <div className="parchment-window p-3 sm:p-4 bg-[#ecd4ab] border border-[#bfa075] rounded-[10px] shadow-[0_18px_38px_rgba(65,36,18,0.22)]">
                {/* Window Header */}
                <div className="flex items-center justify-between pb-3 px-1 border-b border-[#cca97f]">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#af7f53]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#af7f53]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#af7f53]" />
                    </div>
                    <span className="font-serif-custom text-[13px] font-bold text-[#5c3e27] ml-2">
                      Dr. Wolf Brain
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#835a39]">
                    <span className="text-[11px] font-sans-custom uppercase tracking-wider font-semibold opacity-75">
                      Illustrative prototype
                    </span>
                    <Music2 size={15} />
                  </div>
                </div>

                {/* Inner Window Content */}
                <div className="pt-3">
                  {/* Top Coach Dialogue Card */}
                  <div className="bg-[#fbf4e6] border border-[#d8be96] rounded-[7px] p-3 sm:p-3.5 mb-3.5 flex items-start gap-3.5 shadow-sm">
                    <div className="w-12 h-12 rounded-[5px] overflow-hidden border border-[#c49e6f] flex-shrink-0 relative shadow-sm">
                      <Image
                        src="/dr_wolf_portrait.jpg"
                        alt="Dr. Wolf prototype portrait"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-serif-custom font-bold text-[15px] text-[#2d170e] leading-none mb-1">
                        Dr. Wolf
                      </p>
                      <p className="font-serif-custom text-[14px] sm:text-[15px] text-[#4d3222] leading-snug">
                        &ldquo;This is an interesting position. What is your opponent&apos;s
                        strongest reply?&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Main Board & Plan Panel Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
                    {/* Chess Board Area */}
                    <div className="sm:col-span-7 flex flex-col items-center">
                      <ChessboardView position={heroGrid} showCoords={true} />
                      <span className="text-[11px] font-sans-custom text-[#77553b] mt-2 italic">
                        Example opening position
                      </span>
                    </div>

                    {/* Right Side "Your Plan" Column */}
                    <div className="sm:col-span-5 flex flex-col gap-3">
                      <div className="bg-[#fbf4e6] border border-[#d8be96] rounded-[7px] p-3.5 shadow-sm">
                        <h3 className="font-serif-custom font-bold text-[18px] text-[#2d170e] mb-3 pb-2 border-b border-[#dfc7a4]">
                          Your Plan
                        </h3>
                        <ul className="space-y-2.5">
                          {[
                            'Find better plans',
                            'Avoid early traps',
                            'Improve piece coordination',
                            'Learn from your mistakes',
                            'Build long-term habits',
                          ].map((item) => (
                            <li
                              key={item}
                              className="flex items-center gap-2 text-[13px] font-serif-custom text-[#3d2417]"
                            >
                              <div className="w-4 h-4 rounded-full bg-[#528236] flex items-center justify-center flex-shrink-0">
                                <Check size={11} className="text-white stroke-[3]" />
                              </div>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Bottom Adaptation Note */}
                      <div className="bg-[#fbf4e6]/90 border border-[#d8be96] rounded-[7px] p-3 shadow-sm">
                        <p className="font-serif-custom italic text-[12px] sm:text-[13px] text-[#634533] leading-snug">
                          &ldquo;I&apos;ll adapt to your games and focus on the ideas that matter
                          most for your progress.&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ornate Divider */}
      <div className="vintage-ornament py-4">
        <span className="text-lg text-[#b89163]">❧</span>
      </div>

      {/* 3. Section: "A Coach Built Around You" */}
      <section id="learn" className="py-14 sm:py-20">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          {/* Section Heading */}
          <div className="text-center max-w-[760px] mx-auto mb-12">
            <h2 className="font-serif-custom text-[38px] sm:text-[46px] font-bold text-[#2d170e] leading-tight mb-3">
              A Coach Built Around You
            </h2>
            <p className="font-serif-custom text-[18px] sm:text-[20px] text-[#604230] leading-relaxed">
              Dr. Wolf Brain combines deliberate practice, learner memory, and evidence-backed
              personalization to help you build better thinking habits — not just find better moves.
            </p>
          </div>

          {/* 3 Large Feature Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7 items-stretch">
            {/* Card 1: Think First */}
            <div className="parchment-card p-5 sm:p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14]">
                  <Lightbulb size={22} />
                </div>
                <h3 className="font-serif-custom text-[24px] font-bold text-[#2d170e]">
                  Think First
                </h3>
              </div>
              <p className="font-serif-custom text-[15px] text-[#5e412f] leading-snug mb-4">
                Get in-game guidance that helps you think through positions before seeing any
                engine answer.
              </p>

              {/* Inset Board Preview with Coach Dialogue */}
              <div className="mt-auto relative rounded-[7px] overflow-hidden border border-[#d8be96] bg-[#deb887] p-2">
                <div className="flex justify-center">
                  <ChessboardView position={thinkFirstGrid} showCoords={false} />
                </div>

                {/* Speech Overlay */}
                <div className="absolute top-[30%] right-2 left-[36%] bg-[#fcf5e8] border border-[#cfb088] rounded-[6px] p-2.5 shadow-md">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-serif-custom font-bold text-[11px] text-[#2d170e]">
                      Dr. Wolf
                    </span>
                  </div>
                  <p className="font-serif-custom text-[11px] text-[#4d3222] leading-tight">
                    Before you move — what is your opponent threatening?
                  </p>
                </div>

                {/* Think button */}
                <div className="absolute bottom-3 right-3">
                  <a
                    href="#think-first"
                    className="inline-flex items-center gap-1.5 bg-[#361f14] hover:bg-[#201008] text-[#fbf1dc] text-[11px] font-serif-custom font-semibold px-2.5 py-1.5 rounded shadow"
                  >
                    <span>See a session review →</span>
                  </a>
                </div>
              </div>
              <small className="font-sans-custom text-[11px] text-[#826652] block mt-3 text-center">
                No engine verdict until the session summary.
              </small>
            </div>

            {/* Card 2: Your Chess Brain */}
            <div className="parchment-card p-5 sm:p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14]">
                  <Brain size={22} />
                </div>
                <h3 className="font-serif-custom text-[24px] font-bold text-[#2d170e]">
                  Your Chess Brain
                </h3>
              </div>
              <p className="font-serif-custom text-[15px] text-[#5e412f] leading-snug mb-4">
                A learner model that remembers patterns in your games and Think First sessions —
                and updates only when evidence warrants.
              </p>

              {/* Inset Profile Card */}
              <div className="mt-auto parchment-inset rounded-[7px] p-4 border border-[#d8be96]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#dfc7a4]">
                  <h4 className="font-serif-custom font-bold text-[16px] text-[#2d170e]">
                    Learner State Model
                  </h4>
                  <span className="text-[10px] font-sans-custom uppercase tracking-wider font-semibold text-[#8b6343]">
                    Illustrative
                  </span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between bg-[#fbf5e8] px-3 py-2 rounded border border-[#e2cca8]">
                    <strong className="font-serif-custom font-bold text-[13px] text-[#2d170e]">
                      Opponent threat detection
                    </strong>
                    <span className="text-[11px] font-sans-custom font-semibold text-[#528236]">
                      Developing
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[#fbf5e8] px-3 py-2 rounded border border-[#e2cca8]">
                    <strong className="font-serif-custom font-bold text-[13px] text-[#2d170e]">
                      King safety
                    </strong>
                    <span className="text-[11px] font-sans-custom font-semibold text-[#8b6343]">
                      Not enough evidence
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[#fbf5e8] px-3 py-2 rounded border border-[#e2cca8]">
                    <strong className="font-serif-custom font-bold text-[13px] text-[#2d170e]">
                      Calculation depth
                    </strong>
                    <span className="text-[11px] font-sans-custom font-semibold text-[#528236]">
                      Developing
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[#fbf5e8] px-3 py-2 rounded border border-[#e2cca8]">
                    <strong className="font-serif-custom font-bold text-[13px] text-[#2d170e]">
                      Thinking-pattern hypothesis
                    </strong>
                    <span className="text-[11px] font-sans-custom font-semibold text-[#b3782b]">
                      Needs evidence
                    </span>
                  </div>
                </div>
              </div>
              <small className="font-sans-custom text-[11px] text-[#826652] block mt-3 text-center">
                Updates belief status only when episodes confirm it.
              </small>
            </div>

            {/* Card 3: Why Did You Ask Me That? */}
            <div className="parchment-card p-5 sm:p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14]">
                  <HelpCircle size={22} />
                </div>
                <h3 className="font-serif-custom text-[24px] font-bold text-[#2d170e]">
                  Why Did You Ask Me That?
                </h3>
              </div>
              <p className="font-serif-custom text-[15px] text-[#5e412f] leading-snug mb-4">
                Every personalized question can show the evidence behind it. No ungrounded claims.
              </p>

              {/* Inset Coach Explanation Card */}
              <div className="mt-auto parchment-inset rounded-[7px] p-4 border border-[#d8be96] flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-[5px] overflow-hidden border border-[#c49e6f] flex-shrink-0 relative">
                    <Image
                      src="/dr_wolf_portrait.jpg"
                      alt="Dr. Wolf"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <strong className="block font-serif-custom font-bold text-[14px] text-[#2d170e]">
                      Dr. Wolf
                    </strong>
                    <p className="font-serif-custom text-[12px] sm:text-[13px] text-[#4d3222] leading-snug mt-0.5">
                      &ldquo;I asked because this position matched an opponent-threat coaching
                      trigger. I’d only turn this into a belief about you after Think First sessions
                      give me enough evidence.&rdquo;
                    </p>
                  </div>
                </div>

                {/* Example Evidence Model */}
                <div className="pt-2.5 border-t border-[#dfc7a4]">
                  <span className="block font-sans-custom font-bold text-[11px] uppercase tracking-wider text-[#604230] mb-1.5">
                    Example evidence model
                  </span>
                  <ul className="text-[12px] font-serif-custom text-[#4d3222] space-y-1">
                    <li>• Current position → engine-backed trigger</li>
                    <li>• Think First episodes → learner evidence</li>
                    <li>• Imported positions → may seed a pattern, cannot confirm intent</li>
                  </ul>
                </div>
              </div>
              <small className="font-sans-custom text-[11px] text-[#826652] block mt-3 text-center">
                Chess claims come from Stockfish. Learner claims come from stored evidence.
              </small>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section: "Understand the Why Behind Every Move" */}
      <section id="think-first" className="py-14 sm:py-20 bg-[#edd7b2]/40 border-y border-[#d8c09a]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          {/* Section Heading */}
          <div className="text-center max-w-[800px] mx-auto mb-12">
            <h2 className="font-serif-custom text-[38px] sm:text-[46px] font-bold text-[#2d170e] leading-tight mb-3">
              Understand the Why Behind Every Move
            </h2>
            <p className="font-serif-custom text-[18px] sm:text-[20px] text-[#604230] leading-relaxed">
              Review what you were thinking, what you played, and what the position actually
              required — after the game, not while you are still solving it.
            </p>
          </div>

          {/* Large Interactive Review Card */}
          <div className="parchment-window max-w-[1020px] mx-auto p-4 sm:p-6 bg-[#ecd4ab] border border-[#bfa075] rounded-[10px] shadow-[0_20px_45px_rgba(65,36,18,0.2)]">
            {/* Window Dots & Label */}
            <div className="flex items-center justify-between pb-4 border-b border-[#cca97f] mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#af7f53]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#af7f53]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#af7f53]" />
                <span className="font-serif-custom text-[13px] font-bold text-[#5c3e27] ml-2">
                  Session Review Interface
                </span>
              </div>
              <span className="text-[11px] font-sans-custom uppercase tracking-wider font-semibold text-[#7c5537]">
                Illustrative review example
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Chessboard Side */}
              <div className="md:col-span-6 flex flex-col items-center justify-center">
                <div className="w-full max-w-[420px] flex justify-center">
                  <ChessboardView
                    position={reviewGrid}
                    arrow={{
                      from: reviewExample.illustratedMove!.from,
                      to: reviewExample.illustratedMove!.to,
                    }}
                    showCoords={true}
                  />
                </div>
                <span className="text-[11px] font-sans-custom text-[#77553b] mt-2 italic">
                  Move illustrated: Nb1-c3 (legal development)
                </span>
              </div>

              {/* Analysis & Tabs Side */}
              <div className="md:col-span-6 flex flex-col bg-[#fbf4e6] border border-[#d8be96] rounded-[8px] p-4 sm:p-5 shadow-sm">
                {/* Tabs */}
                <div className="flex items-center gap-6 border-b border-[#dfc7a4] pb-3 mb-4">
                  <button
                    onClick={() => setActiveTab('review')}
                    className={`font-serif-custom text-[16px] font-bold pb-1 transition-all ${
                      activeTab === 'review'
                        ? 'text-[#2d170e] border-b-2 border-[#361f14]'
                        : 'text-[#8b6a52] hover:text-[#2d170e]'
                    }`}
                  >
                    Review
                  </button>
                  <button
                    onClick={() => setActiveTab('evidence')}
                    className={`font-serif-custom text-[16px] font-bold pb-1 transition-all ${
                      activeTab === 'evidence'
                        ? 'text-[#2d170e] border-b-2 border-[#361f14]'
                        : 'text-[#8b6a52] hover:text-[#2d170e]'
                    }`}
                  >
                    Evidence
                  </button>
                  <button
                    onClick={() => setActiveTab('engineLines')}
                    className={`font-serif-custom text-[16px] font-bold pb-1 transition-all ${
                      activeTab === 'engineLines'
                        ? 'text-[#2d170e] border-b-2 border-[#361f14]'
                        : 'text-[#8b6a52] hover:text-[#2d170e]'
                    }`}
                  >
                    Engine Lines
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'review' && (
                  <div className="space-y-3.5">
                    {/* Coach quote card */}
                    <div className="flex items-start gap-3 bg-[#f7eedb] border border-[#dfc7a4] p-3 rounded-[6px]">
                      <div className="w-12 h-12 rounded-[5px] overflow-hidden border border-[#c49e6f] flex-shrink-0 relative">
                        <Image
                          src="/dr_wolf_portrait.jpg"
                          alt="Dr. Wolf"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <strong className="block font-serif-custom font-bold text-[14px] text-[#2d170e]">
                          Dr. Wolf
                        </strong>
                        <p className="font-serif-custom text-[13px] text-[#4d3222] leading-snug mt-0.5">
                          Nc3 develops the queenside knight and adds control over central squares.
                        </p>
                      </div>
                    </div>

                    {/* Socratic Rationale Blocks */}
                    <div className="p-3 bg-[#f7eedb]/70 border border-[#dfc7a4] rounded-[6px] space-y-2 text-[13px] font-serif-custom">
                      <div>
                        <span className="font-sans-custom uppercase text-[10px] font-bold text-[#805e42] tracking-wider block">
                          Your thinking
                        </span>
                        <p className="text-[#3b2416] italic mt-0.5">
                          &ldquo;I wanted to develop a piece and improve my control of the
                          center.&rdquo;
                        </p>
                      </div>
                      <div className="pt-2 border-t border-[#dfc7a4]/60">
                        <span className="font-sans-custom uppercase text-[10px] font-bold text-[#805e42] tracking-wider block">
                          Your move
                        </span>
                        <p className="text-[#2d170e] font-bold text-[15px] mt-0.5">Nc3</p>
                      </div>
                      <div className="pt-2 border-t border-[#dfc7a4]/60">
                        <span className="font-sans-custom uppercase text-[10px] font-bold text-[#805e42] tracking-wider block">
                          Key idea
                        </span>
                        <p className="text-[#3b2416] mt-0.5">
                          Develop the knight, improve central control, then reassess the
                          opponent&apos;s forcing replies.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'evidence' && (
                  <div className="space-y-3 py-1 font-serif-custom text-[13px] text-[#4d3222]">
                    <div className="p-3 bg-[#f7eedb] border border-[#dfc7a4] rounded">
                      <strong className="block font-bold text-[14px] text-[#2d170e] mb-1">
                        Product Truth Model
                      </strong>
                      <p className="leading-relaxed">
                        Chess facts in this example are intended to be engine-backed in the working
                        product. Learner claims are created only from stored Think First evidence.
                      </p>
                    </div>
                    <div className="p-3 bg-[#f7eedb] border border-[#dfc7a4] rounded">
                      <strong className="block font-bold text-[14px] text-[#2d170e] mb-1">
                        Episode Grounding
                      </strong>
                      <p className="leading-relaxed">
                        Stored episodes record what you saw and thought during critical moments,
                        ensuring future advice directly addresses your demonstrated reasoning habits.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'engineLines' && (
                  <div className="space-y-3 py-2 font-serif-custom text-[13px] text-[#4d3222]">
                    <div className="p-3.5 bg-[#f7eedb] border border-[#dfc7a4] rounded text-center">
                      <span className="font-sans-custom uppercase text-[11px] font-bold text-[#805e42] tracking-wider block mb-1">
                        Example Interface
                      </span>
                      <p className="italic text-[#6b4e37]">
                        Live engine data is not connected on the static landing page.
                      </p>
                      <p className="mt-2 text-[#3b2416]">
                        Engine lines appear here after server-side Stockfish verification.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section: "A coach that remembers the right things" */}
      <section id="about" className="py-14 sm:py-20">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          {/* Section Heading */}
          <div className="text-center max-w-[760px] mx-auto mb-12">
            <h2 className="font-serif-custom text-[38px] sm:text-[46px] font-bold text-[#2d170e] leading-tight mb-3">
              A coach that remembers the right things
            </h2>
            <p className="font-serif-custom text-[18px] sm:text-[20px] text-[#604230] leading-relaxed">
              Dr. Wolf Brain does not try to remember everything. It stores structured learning
              evidence and uses it to decide what deserves to become a belief about the learner.
            </p>
          </div>

          {/* 6 Feature Cards (2 Rows of 3) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="parchment-card p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] flex-shrink-0">
                <Database size={22} />
              </div>
              <div>
                <h3 className="font-serif-custom font-bold text-[20px] text-[#2d170e] mb-1">
                  Evidence-backed memory
                </h3>
                <p className="font-serif-custom text-[14px] text-[#5e412f] leading-snug">
                  Stores key positions, learner responses, moves, and outcomes as structured
                  episodes — not endless chat history.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="parchment-card p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] flex-shrink-0">
                <EyeOff size={22} />
              </div>
              <div>
                <h3 className="font-serif-custom font-bold text-[20px] text-[#2d170e] mb-1">
                  Delayed reveal
                </h3>
                <p className="font-serif-custom text-[14px] text-[#5e412f] leading-snug">
                  You think first. The engine verdict is withheld until the post-game summary so the
                  learning moment stays yours.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="parchment-card p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] flex-shrink-0">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="font-serif-custom font-bold text-[20px] text-[#2d170e] mb-1">
                  Skill tracking
                </h3>
                <p className="font-serif-custom text-[14px] text-[#5e412f] leading-snug">
                  Shows mastery only after enough evidence exists. Otherwise it states: &ldquo;Not
                  enough evidence yet.&rdquo;
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="parchment-card p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] flex-shrink-0">
                <Target size={22} />
              </div>
              <div>
                <h3 className="font-serif-custom font-bold text-[20px] text-[#2d170e] mb-1">
                  Thinking-pattern hypotheses
                </h3>
                <p className="font-serif-custom text-[14px] text-[#5e412f] leading-snug">
                  Forms revisable hypotheses only when Think First episodes actually test them
                  across multiple games.
                </p>
              </div>
            </div>

            {/* Card 5 */}
            <div className="parchment-card p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] flex-shrink-0">
                <GitFork size={22} />
              </div>
              <div>
                <h3 className="font-serif-custom font-bold text-[20px] text-[#2d170e] mb-1">
                  Transfer practice
                </h3>
                <p className="font-serif-custom text-[14px] text-[#5e412f] leading-snug">
                  Uses new positions to test whether the learner recognizes the same tactical idea
                  in a different context.
                </p>
              </div>
            </div>

            {/* Card 6 */}
            <div className="parchment-card p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] flex-shrink-0">
                <Moon size={22} />
              </div>
              <div>
                <h3 className="font-serif-custom font-bold text-[20px] text-[#2d170e] mb-1">
                  Dream Cycle
                </h3>
                <p className="font-serif-custom text-[14px] text-[#5e412f] leading-snug">
                  At session end, deterministic code consolidates evidence, updates learner state,
                  and selects the next focus.
                </p>
                <small className="font-sans-custom text-[11px] text-[#805e42] block mt-1">
                  The LLM phrases the lesson. It does not own the score.
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section: "FROM GAMES TO PERSONALIZED COACHING" (7-Step Interactive Animated Pipeline) */}
      <section id="how-it-works" className="py-14 sm:py-20 bg-[#edd7b2]/30 border-y border-[#d8c09a]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          {/* Section Heading */}
          <div className="text-center max-w-[820px] mx-auto mb-12">
            <p className="font-sans-custom uppercase tracking-[0.2em] text-[12px] font-bold text-[#8b5c36] mb-2">
              HOW THE SYSTEM LEARNS
            </p>
            <h2 className="font-serif-custom text-[28px] sm:text-[34px] font-bold text-[#2d170e] tracking-wide uppercase mb-3">
              FROM GAMES TO PERSONALIZED COACHING
            </h2>
            <p className="font-serif-custom text-[17px] sm:text-[19px] text-[#604230] leading-relaxed">
              A continuous evidence pipeline turns real games and Think First sessions into adaptive
              coaching.
            </p>
          </div>

          {/* 7-Step Process Pipeline with Smooth Interactive Highlights */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3.5 relative"
            onMouseEnter={() => setIsPipelinePaused(true)}
            onMouseLeave={() => setIsPipelinePaused(false)}
          >
            {stages.map((st, i) => {
              const Icon = st.icon
              const isActive = activeStage === i

              return (
                <div
                  key={st.title}
                  onClick={() => setActiveStage(i)}
                  onMouseEnter={() => setActiveStage(i)}
                  className={`cursor-pointer parchment-card p-3.5 sm:p-4 flex flex-col items-center text-center relative transition-all duration-300 ${
                    isActive
                      ? 'bg-[#fffdf7] border-[#b3782b] -translate-y-2 shadow-[0_14px_30px_rgba(179,120,43,0.22)] ring-1 ring-[#b3782b]/40'
                      : 'hover:-translate-y-1 hover:border-[#c49a62]'
                  }`}
                >
                  {/* Top Step Number Badge */}
                  <span
                    className={`text-[10px] font-sans-custom uppercase tracking-wider font-bold mb-1.5 px-2 py-0.5 rounded-full transition-colors ${
                      isActive
                        ? 'bg-[#361f14] text-[#fbf1dc]'
                        : 'bg-[#ebd8b6] text-[#6e4e39]'
                    }`}
                  >
                    Step 0{i + 1}
                  </span>

                  {/* Icon Container with Pulse Effect */}
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center mb-2.5 transition-all duration-300 ${
                      isActive
                        ? 'bg-[#361f14] text-[#fbf1dc] scale-110 shadow-md ring-4 ring-[#b3782b]/25'
                        : 'bg-[#faebd4] border border-[#d4bc96] text-[#361f14]'
                    }`}
                  >
                    <Icon size={20} className={isActive ? 'animate-pulse' : ''} />
                  </div>

                  <h3
                    className={`font-serif-custom font-bold text-[15px] mb-1 transition-colors ${
                      isActive ? 'text-[#b3782b]' : 'text-[#2d170e]'
                    }`}
                  >
                    {st.title.replace(/^\d+\.\s*/, '')}
                  </h3>
                  <p className="font-serif-custom text-[12px] text-[#5e412f] leading-snug">
                    {st.copy}
                  </p>

                  {/* Connecting Arrow */}
                  {i < stages.length - 1 && (
                    <div
                      className={`hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 transition-all duration-300 ${
                        isActive
                          ? 'text-[#361f14] scale-125 translate-x-0.5'
                          : 'text-[#b3782b]'
                      }`}
                    >
                      <ArrowRight size={15} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Interactive Pipeline Step Details Banner */}
          <div className="mt-6 p-4 bg-[#fbf5e8] border border-[#d8be96] rounded-[8px] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left transition-all">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b3782b] animate-ping flex-shrink-0" />
              <p className="font-serif-custom text-[14px] sm:text-[15px] text-[#3b2416]">
                <strong className="text-[#2d170e] font-bold">
                  {stages[activeStage].title}:
                </strong>{' '}
                {stages[activeStage].copy}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {stages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStage(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={`w-2 h-2 rounded-full transition-all ${
                    activeStage === i
                      ? 'w-5 bg-[#361f14]'
                      : 'bg-[#cbb08a] hover:bg-[#8b6343]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Core Principle Footer */}
          <p className="font-serif-custom text-center text-[15px] text-[#6e4e39] mt-8 pt-4 border-t border-[#d8c09a]/60">
            <strong className="text-[#2d170e]">Stockfish owns chess truth</strong> ·{' '}
            <strong className="text-[#2d170e]">Evidence owns learner claims</strong> ·{' '}
            <strong className="text-[#2d170e]">Deterministic code owns scores</strong> ·{' '}
            <strong className="text-[#2d170e]">The LLM owns language</strong>
          </p>
        </div>
      </section>

      {/* 7. Section: "Built in the Open" */}
      {/* NOTE: Keep repository public or update repository visibility before public launch */}
      <section id="open" className="py-14 sm:py-20">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          {/* Section Heading */}
          <div className="text-center max-w-[760px] mx-auto mb-12">
            <h2 className="font-serif-custom text-[38px] sm:text-[46px] font-bold text-[#2d170e] leading-tight mb-3">
              Built in the Open
            </h2>
            <p className="font-serif-custom text-[18px] sm:text-[20px] text-[#604230] leading-relaxed">
              No invented ratings. No fake testimonials. The proof is the product, the
              architecture, the build history, and the decisions behind it.
            </p>
          </div>

          {/* 4 Cards Grid with Accessible Real Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {buildLinks.map((card) => {
              const Icon = card.icon
              return (
                <a
                  key={card.title}
                  href={card.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="parchment-card p-5 flex flex-col justify-between group hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-[#361f14]"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] mb-3 group-hover:bg-[#f3dfbd] transition-colors">
                      <Icon size={20} />
                    </div>
                    <h3 className="font-serif-custom font-bold text-[18px] text-[#2d170e] mb-2 flex items-center justify-between">
                      <span>{card.title}</span>
                      <ExternalLink size={14} className="text-[#8c6748] opacity-60 group-hover:opacity-100" />
                    </h3>
                    <p className="font-serif-custom text-[13px] text-[#5e412f] leading-snug mb-4">
                      {card.copy}
                    </p>
                  </div>
                  <span className="font-serif-custom text-[13px] font-bold text-[#361f14] group-hover:text-[#b3782b] flex items-center gap-1.5 transition-colors">
                    <span>{card.cta}</span>
                    <ArrowRight size={13} />
                  </span>
                </a>
              )
            })}
          </div>
        </div>
      </section>

      {/* 8. Bottom CTA Banner with Dr. Wolf Library Scene */}
      <section className="relative overflow-hidden bg-[#24140b] text-[#f7eed9] border-t border-[#442819]">
        {/* Background Image Container */}
        <div className="relative max-w-[1400px] mx-auto min-h-[420px] flex items-center">
          {/* Background image */}
          <div className="absolute inset-0 z-0 opacity-40 md:opacity-50">
            <Image
              src="/dr_wolf_footer_banner.jpg"
              alt="Dr. Wolf prototype study scene"
              fill
              className="object-cover object-left md:object-center"
            />
            {/* Gradient overlay to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#1c0e07] via-[#1c0e07]/80 to-[#1c0e07]/90 md:from-[#1c0e07]/60 md:via-[#1c0e07]/75 md:to-[#1c0e07]" />
          </div>

          {/* Banner Content */}
          <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 py-16 w-full flex flex-col md:items-center text-center">
            <p className="font-sans-custom uppercase tracking-[0.2em] text-[12px] font-bold text-[#d4ad7b] mb-2">
              A GOOD AI COACH SHOULD SHOW ITS WORK
            </p>
            <h2 className="font-serif-custom text-[36px] sm:text-[48px] font-bold text-[#fcf3e1] leading-tight mb-3">
              Teach the coach.
              <br />
              Improve your chess.
            </h2>
            <p className="font-serif-custom text-[18px] sm:text-[20px] text-[#d6be9a] max-w-[640px] leading-relaxed mb-8">
              Play a Think First session and help Dr. Wolf Brain learn one defensible thing about
              how you think.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="#think-first"
                className="inline-flex items-center gap-2.5 bg-[#f5edd9] hover:bg-[#fff7e6] text-[#361f14] px-7 py-3.5 rounded-[6px] font-serif-custom text-[17px] font-bold shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-all hover:translate-y-[-2px]"
              >
                <Play size={16} className="fill-[#361f14]" />
                <span>Preview Think First</span>
              </a>
              <a
                href="https://github.com/NikhilRaikwar/dr-wolf-brain/blob/main/docs/ARCHITECTURE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#2d180f]/70 hover:bg-[#2d180f] text-[#f7eed9] border border-[#a37c54] px-6 py-3.5 rounded-[6px] font-serif-custom text-[17px] font-bold transition-all hover:translate-y-[-2px]"
              >
                <span>Read the Architecture</span>
                <ExternalLink size={15} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Site Footer (Compact & Balanced) */}
      <footer className="border-t border-[#dfcca8] bg-[#f4ead6] py-4 sm:py-5 text-[#5e412f] text-[13px] font-serif-custom">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          {/* Brand & Slogan */}
          <div className="flex items-center gap-2">
            <span className="text-lg">♞</span>
            <span className="font-bold text-[#2d170e]">Dr. Wolf Brain</span>
            <span className="text-[#8b6343] text-[12px] hidden sm:inline">
              — Learn Chess. Think Deeper.
            </span>
          </div>

          {/* Quick Links */}
          <div className="flex items-center gap-5 text-[13px] text-[#5e412f]">
            <a href="#learn" className="hover:text-[#b3782b] transition-colors">
              Product
            </a>
            <a href="#think-first" className="hover:text-[#b3782b] transition-colors">
              Demo
            </a>
            <a
              href="https://github.com/NikhilRaikwar/dr-wolf-brain/blob/main/docs/ARCHITECTURE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#b3782b] transition-colors"
            >
              Architecture
            </a>
            <a
              href="https://github.com/NikhilRaikwar/dr-wolf-brain/blob/main/BUILD_LOG.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#b3782b] transition-colors"
            >
              Build Log
            </a>
            <a
              href="https://github.com/NikhilRaikwar/dr-wolf-brain/blob/main/PRD.md"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#b3782b] transition-colors"
            >
              PRD
            </a>
          </div>

          {/* Clean Independent Disclaimer */}
          <p className="text-[11.5px] text-[#826652] leading-tight md:text-right">
            Independent product prototype.
            <br className="hidden sm:inline" /> Not an official Chess.com product.
          </p>
        </div>
      </footer>
    </main>
  )
}
