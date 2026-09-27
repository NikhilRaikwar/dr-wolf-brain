'use client'

import React, { useState, Suspense } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import {
  DashboardShell,
  DemoBanner,
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
} from 'lucide-react'
import { ChessboardView } from '@/components/Chessboard'
import { fenToBoardGrid } from '@/lib/landingExamples'

interface TrainingEpisode {
  episodeNumber: number
  fen: string
  highlightSquare?: [number, number]
  questionTitle: string
  questionSubtitle: string
  options: Array<{ id: string; label: string; isBest?: boolean }>
  quoteText: string
  focusConcept: string
  focusSubtext: string
}

const EPISODES: TrainingEpisode[] = [
  {
    episodeNumber: 1,
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
    highlightSquare: [3, 2], // c4
    questionTitle: 'Why is the black knight on e4 vulnerable?',
    questionSubtitle: 'Look at piece coordination and king safety.',
    options: [
      { id: 'opt-1', label: 'It can be trapped with d3 and Qe2', isBest: true },
      { id: 'opt-2', label: 'Black has no pawn cover on the d-file' },
      { id: 'opt-3', label: 'It has undefended backward pawn weakness' },
      { id: 'opt-4', label: 'There is no immediate tactical threat' },
    ],
    quoteText:
      'Notice loose pieces before deciding on your attacking continuation.',
    focusConcept: 'Tactical Awareness',
    focusSubtext: 'Spot loose and overloaded pieces quickly.',
  },
  {
    episodeNumber: 2,
    fen: 'r2q2k1/pp1bpppp/5n2/8/3Nr3/2B5/PP3PPP/R2Q1RK1 w - - 0 14',
    highlightSquare: [6, 4], // e2
    questionTitle: 'What is your opponent threatening?',
    questionSubtitle: 'Look at the position and choose the best answer.',
    options: [
      { id: 'opt-1', label: 'To win a pawn with Rxd4', isBest: true },
      { id: 'opt-2', label: 'To fork my king and queen' },
      { id: 'opt-3', label: 'To play ...Re1+ and win the queen' },
      { id: 'opt-4', label: 'There is no immediate threat' },
    ],
    quoteText:
      "Before you move, slow down and look for your opponent's ideas. Most mistakes happen because we miss what they're threatening.",
    focusConcept: 'Opponent Threat Detection',
    focusSubtext: "Spot your opponent's ideas before you move.",
  },
  {
    episodeNumber: 3,
    fen: 'r1b2rk1/pp1nbppp/2p1pn2/q5B1/2BP4/2N1PN2/PP3PPP/R2Q1RK1 w - - 0 10',
    highlightSquare: [4, 6], // g5
    questionTitle: 'How should White solidify the center advantage?',
    questionSubtitle: 'Consider piece activity and pawn structure.',
    options: [
      { id: 'opt-1', label: 'Play a3 to restrict Black queen mobility', isBest: true },
      { id: 'opt-2', label: 'Sacrifice bishop on f7 immediately' },
      { id: 'opt-3', label: 'Trade queens on d8' },
      { id: 'opt-4', label: 'Push e4 ignoring queen position' },
    ],
    quoteText:
      'Candidate moves must withstand the most forcing defensive replies.',
    focusConcept: 'Calculation Depth',
    focusSubtext: 'Calculate 2-3 plies ahead on critical forcing lines.',
  },
  {
    episodeNumber: 4,
    fen: '2r2rk1/1pqbbppp/p1n1pn2/3p4/2PN4/1PN1P1P1/PB2QPBP/2RR2K1 w - - 0 15',
    highlightSquare: [4, 3], // d4
    questionTitle: 'What is the key defensive resource in this center tension?',
    questionSubtitle: 'Evaluate liquidation vs tension retention.',
    options: [
      { id: 'opt-1', label: 'Maintain tension with cxd5', isBest: true },
      { id: 'opt-2', label: 'Retreat knight to b3 immediately' },
      { id: 'opt-3', label: 'Push d5 opening the dark bishop' },
      { id: 'opt-4', label: 'Play f4 weakening e4 square' },
    ],
    quoteText:
      'Good defense is active; look for moves that defend and coordinate simultaneously.',
    focusConcept: 'Opponent Threat Detection',
    focusSubtext: 'Recognize counterplay before launching attacks.',
  },
  {
    episodeNumber: 5,
    fen: 'r4rk1/1pp1qppp/p1np1n2/4p1B1/2B1P1b1/2NP1N2/PPP1QPPP/R4RK1 w - - 0 10',
    highlightSquare: [3, 2], // c4
    questionTitle: 'How should White counter the pin on f3?',
    questionSubtitle: 'Evaluate Nd5 candidate move vs h3 push.',
    options: [
      { id: 'opt-1', label: 'Play Nd5 to exploit the pinned knight', isBest: true },
      { id: 'opt-2', label: 'Play h3 and allow Bxf3 Bxf3' },
      { id: 'opt-3', label: 'Play Kh1 immediately' },
      { id: 'opt-4', label: 'Trade bishops on f6' },
    ],
    quoteText:
      'Turn defensive pressure into initiative by finding counter-threats.',
    focusConcept: 'King Safety Awareness',
    focusSubtext: 'Keep piece balance and protect kingside squares.',
  },
]

function TrainContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === '1'

  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(1) // default to Episode 2 (index 1)
  const [selectedOption, setSelectedOption] = useState<string>('opt-1')
  const [reasoningText, setReasoningText] = useState<string>('')
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)

  const episode = EPISODES[currentEpisodeIndex]

  const handlePrev = () => {
    if (currentEpisodeIndex > 0) {
      setCurrentEpisodeIndex(currentEpisodeIndex - 1)
      setSelectedOption('opt-1')
      setReasoningText('')
      setIsSubmitted(false)
    }
  }

  const handleNext = () => {
    if (currentEpisodeIndex < EPISODES.length - 1) {
      setCurrentEpisodeIndex(currentEpisodeIndex + 1)
      setSelectedOption('opt-1')
      setReasoningText('')
      setIsSubmitted(false)
    }
  }

  return (
    <DashboardShell username={isDemo ? 'Alex' : 'Learner'}>
      <div className="space-y-6">
        {/* Explicit Demo Banner */}
        {isDemo && <DemoBanner exitHref="/train" />}

        {/* Top Header + Dr. Wolf Coach Card */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center pt-1">
          {/* Left Title (7 cols) */}
          <div className="lg:col-span-7">
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#2d170e]">
              Think First Training
            </h1>
            <p className="font-serif text-base text-[#6d503b] mt-1">
              Build the habit of asking better questions.
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
                  &ldquo;{episode.quoteText}&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Left Big Board + Right Think First Socratic Panel */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left: Interactive / Tactical Board (7 cols) */}
          <div className="lg:col-span-7 flex justify-center">
            <div className="w-full max-w-[540px] aspect-square rounded-[8px] overflow-hidden shadow-sm">
              <ChessboardView
                position={fenToBoardGrid(episode.fen, episode.highlightSquare)}
                showCoords={true}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Right: Think First Question Card (5 cols) */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-5 sm:p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
              {/* Header: Think First + Episode X of 5 + < > */}
              <div className="flex items-center justify-between pb-2 border-b border-[#f0e6d8]">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-[#2d170e]" />
                  <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                    Think First
                  </h2>
                </div>

                <div className="flex items-center gap-2 text-xs font-serif text-[#8c745f]">
                  <span>Episode {episode.episodeNumber} of {EPISODES.length}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrev}
                      disabled={currentEpisodeIndex === 0}
                      className="p-1 rounded hover:bg-[#faf2e4] text-[#6d503b] disabled:opacity-30 disabled:hover:bg-transparent"
                      aria-label="Previous episode"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={currentEpisodeIndex === EPISODES.length - 1}
                      className="p-1 rounded hover:bg-[#faf2e4] text-[#6d503b] disabled:opacity-30 disabled:hover:bg-transparent"
                      aria-label="Next episode"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Question Headline */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4e8d3] text-[#4f3222] mt-0.5">
                  <HelpCircle className="h-4 w-4 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="font-serif text-sm sm:text-base font-bold text-[#2d170e]">
                    {episode.questionTitle}
                  </h3>
                  <p className="font-serif text-xs text-[#8c745f]">
                    {episode.questionSubtitle}
                  </p>
                </div>
              </div>

              {/* Radio Options List */}
              <div className="space-y-2 pt-1 font-serif text-xs">
                {episode.options.map((opt) => {
                  const isSelected = selectedOption === opt.id

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedOption(opt.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#b3782b] bg-[#faf2e4] ring-1 ring-[#b3782b]/30'
                          : 'border-[#ede2d2] bg-[#fffdfa] hover:bg-[#faf6ee]'
                      }`}
                    >
                      <div
                        className={`h-4 w-4 shrink-0 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-[#b3782b] bg-[#b3782b]'
                            : 'border-[#c4a984] bg-white'
                        }`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <span className={`text-xs ${isSelected ? 'font-bold text-[#2d170e]' : 'text-[#5e402e]'}`}>
                        {opt.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Optional Reasoning Input */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center gap-1.5 text-xs font-serif font-semibold text-[#6d503b]">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Optional: why do you think so?</span>
                </div>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={reasoningText}
                    onChange={(e) => setReasoningText(e.target.value.slice(0, 300))}
                    placeholder="Share your reasoning (optional)..."
                    className="w-full rounded-xl border border-[#d8c7b0] bg-[#fffdfa] p-3 text-xs font-serif text-[#2d170e] placeholder-[#9b8370] focus:outline-none focus:border-[#b3782b] resize-none shadow-xs"
                  />
                  <span className="absolute right-3 bottom-2 text-[10px] text-[#9b8370]">
                    {reasoningText.length}/300
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOption(episode.options[episode.options.length - 1].id)}
                  className="flex-1 rounded-xl border border-[#d8c7b0] bg-[#fffdfa] py-2.5 text-xs font-serif font-semibold text-[#6d503b] hover:bg-[#faf4ea] transition-all text-center"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(true)}
                  className="flex-1 rounded-xl bg-[#361f14] py-2.5 text-xs font-serif font-semibold text-[#fbf1dc] hover:bg-[#23120b] shadow-sm transition-all text-center"
                >
                  Submit answer
                </button>
              </div>

              {isSubmitted && (
                <div className="flex items-center gap-2 rounded-xl border border-[#c0dec7] bg-[#f5fbf6] p-3 text-xs font-serif text-[#3b6348]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4f8034]" />
                  <span>Thinking recorded. Now execute your move on the board to commit your action.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Split: Session Summary + Training Goal */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Session Summary (8 cols) */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-4">
              <div className="flex items-center gap-2.5 pb-1">
                <ListOrdered className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                  Session Summary
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 font-serif text-xs">
                {/* Interruptions remaining */}
                <div className="flex items-start gap-3 rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#faf2e4] text-[#845722]">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#8c745f] block">Interruptions remaining</span>
                    <span className="font-serif text-base font-bold text-[#2d170e]">2 / 3</span>
                    <p className="text-[10.5px] text-[#735843] mt-0.5 leading-tight">
                      Use them if you get stuck. They&apos;ll give you a hint.
                    </p>
                  </div>
                </div>

                {/* Current focus */}
                <div className="flex items-start gap-3 rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#faf2e4] text-[#845722]">
                    <Target className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#8c745f] block">Current focus</span>
                    <span className="font-serif text-xs font-bold text-[#2d170e] block">
                      {episode.focusConcept}
                    </span>
                    <p className="text-[10.5px] text-[#735843] mt-0.5 leading-tight">
                      {episode.focusSubtext}
                    </p>
                  </div>
                </div>

                {/* Episode progress */}
                <div className="flex items-start gap-3 rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#faf2e4] text-[#845722]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#8c745f] block">Episode progress</span>
                    <span className="font-serif text-base font-bold text-[#2d170e]">
                      {episode.episodeNumber} / {EPISODES.length}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {EPISODES.map((ep, idx) => {
                        const isDoneOrActive = idx < episode.episodeNumber
                        return (
                          <span
                            key={ep.episodeNumber}
                            className={`h-2.5 w-2.5 rounded-full ${
                              isDoneOrActive
                                ? 'bg-[#b3782b]'
                                : 'border border-[#c4a984] bg-white'
                            }`}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Training Goal (4 cols) */}
          <div className="lg:col-span-4">
            <div className="h-full rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-3">
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <h2 className="font-serif text-lg font-bold text-[#2d170e]">
                  Training goal
                </h2>
              </div>
              <p className="font-serif text-xs text-[#6d503b] leading-relaxed">
                Strengthen your ability to notice opposing threats and candidate moves. Take your time and think like a coach.
              </p>
            </div>
          </div>
        </div>
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
