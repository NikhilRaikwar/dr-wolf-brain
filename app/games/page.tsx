'use client'

import React, { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  DashboardShell,
  DemoBanner,
  EmptyState,
} from '@/components/dashboard'
import {
  Clock,
  FileText,
  Users,
  BarChart2,
  Star,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Target,
  Settings,
  BookOpen,
  HelpCircle,
  Upload,
  User,
} from 'lucide-react'
import { ChessboardView } from '@/components/Chessboard'
import { fenToBoardGrid } from '@/lib/landingExamples'

interface GameItem {
  id: string
  date: string
  opponent: string
  rating: number
  result: 'won' | 'lost' | 'draw'
  score: string
  opening: string
  reviewed: boolean
  moves: number
  timeControl: string
  source: string
  fen: string
  arrow?: { from: [number, number]; to: [number, number] }
}

const SAMPLE_GAMES: GameItem[] = [
  {
    id: 'g-1',
    date: 'Apr 17, 2024',
    opponent: 'ChessMaster77',
    rating: 1842,
    result: 'won',
    score: '1 - 0',
    opening: 'Sicilian Defense Najdorf Variation',
    reviewed: false,
    moves: 32,
    timeControl: '10+0 Rapid',
    source: 'Chess.com',
    fen: 'r2q1rk1/pp1b1ppp/2n1pn2/2bp4/2P5/2N2NP1/PP2PPBP/R1BQ1RK1 w - - 0 9',
    arrow: { from: [5, 3], to: [3, 5] },
  },
  {
    id: 'g-2',
    date: 'Apr 16, 2024',
    opponent: 'LichessPlayer',
    rating: 1761,
    result: 'lost',
    score: '0 - 1',
    opening: "Queen's Gambit Declined",
    reviewed: true,
    moves: 41,
    timeControl: '15+10 Rapid',
    source: 'Chess.com',
    fen: 'r1bqk2r/ppp2ppp/2n5/3np3/1bB5/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6',
  },
  {
    id: 'g-3',
    date: 'Apr 15, 2024',
    opponent: 'KnightRookie',
    rating: 1920,
    result: 'won',
    score: '1 - 0',
    opening: 'Ruy Lopez Exchange Variation',
    reviewed: false,
    moves: 28,
    timeControl: '10+0 Rapid',
    source: 'Chess.com',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
  },
  {
    id: 'g-4',
    date: 'Apr 14, 2024',
    opponent: 'TacticalTom',
    rating: 1684,
    result: 'draw',
    score: '½ - ½',
    opening: 'Caro-Kann Advance Variation',
    reviewed: true,
    moves: 54,
    timeControl: '10+0 Rapid',
    source: 'Chess.com',
    fen: 'r2q1rk1/pp1b1ppp/2n1pn2/2bp4/2P5/2N2NP1/PP2PPBP/R1BQ1RK1 w - - 0 9',
  },
  {
    id: 'g-5',
    date: 'Apr 12, 2024',
    opponent: 'QueenBee',
    rating: 1810,
    result: 'won',
    score: '1 - 0',
    opening: 'English Opening Symmetrical',
    reviewed: false,
    moves: 36,
    timeControl: '10+0 Rapid',
    source: 'Chess.com',
    fen: 'r1bqk2r/ppp2ppp/2n5/3np3/1bB5/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6',
  },
  {
    id: 'g-6',
    date: 'Apr 10, 2024',
    opponent: 'ChessNomad',
    rating: 1703,
    result: 'lost',
    score: '0 - 1',
    opening: 'French Defense Tarrasch',
    reviewed: true,
    moves: 45,
    timeControl: '10+0 Rapid',
    source: 'Chess.com',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
  },
  {
    id: 'g-7',
    date: 'Apr 9, 2024',
    opponent: 'Strategist42',
    rating: 1888,
    result: 'won',
    score: '1 - 0',
    opening: "King's Indian Defense Classical",
    reviewed: false,
    moves: 39,
    timeControl: '15+10 Rapid',
    source: 'Chess.com',
    fen: 'r2q1rk1/pp1b1ppp/2n1pn2/2bp4/2P5/2N2NP1/PP2PPBP/R1BQ1RK1 w - - 0 9',
  },
  {
    id: 'g-8',
    date: 'Apr 7, 2024',
    opponent: 'BoardExplorer',
    rating: 1650,
    result: 'draw',
    score: '½ - ½',
    opening: 'Italian Game Giuoco Piano',
    reviewed: true,
    moves: 48,
    timeControl: '10+0 Rapid',
    source: 'Chess.com',
    fen: 'r1bqk2r/ppp2ppp/2n5/3np3/1bB5/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6',
  },
]

function GamesContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === '1'

  const [selectedGame, setSelectedGame] = useState<GameItem>(SAMPLE_GAMES[0])
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <DashboardShell username={isDemo ? 'Alex' : 'Learner'}>
      <div className="space-y-6">
        {/* Explicit Demo Banner */}
        {isDemo && <DemoBanner exitHref="/games" />}

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

          {/* Top Actions: Connect Chess.com + Upload PGN */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-3 rounded-xl border border-[#e5d8c5] bg-[#fffdfa] px-4 py-2.5 shadow-xs hover:border-[#b3782b] transition-all text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#faf2e4] text-[#845722]">
                <User className="h-4 w-4" />
              </div>
              <div className="text-xs font-serif">
                <span className="font-bold text-[#2d170e] block">Connect Chess.com</span>
                <span className="text-[11px] text-[#8c745f]">Import your games automatically</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#9b8370] ml-1" />
            </button>

            <button
              type="button"
              className="flex items-center gap-3 rounded-xl border border-[#e5d8c5] bg-[#fffdfa] px-4 py-2.5 shadow-xs hover:border-[#b3782b] transition-all text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#faf2e4] text-[#845722]">
                <Upload className="h-4 w-4" />
              </div>
              <div className="text-xs font-serif">
                <span className="font-bold text-[#2d170e] block">Upload PGN</span>
                <span className="text-[11px] text-[#8c745f]">Upload a PGN file from any platform</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#9b8370] ml-1" />
            </button>
          </div>
        </div>

        {/* Section 1: Recent Import Banner */}
        <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-4 sm:p-5 shadow-[0_2px_12px_rgba(60,35,18,0.03)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#faf2e4] text-[#845722] mt-0.5">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-[#2d170e]">
                  Recent Import
                </h3>
                <p className="font-serif text-xs text-[#6d503b]">
                  Successfully imported 12 games from Chess.com
                </p>
                <span className="text-[11px] text-[#9b8370]">
                  Apr 17, 2024 at 2:14 PM
                </span>
              </div>
            </div>

            {/* 4 Stats Chips */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#f0e6d8]">
              <div className="flex items-center gap-2 font-serif text-xs">
                <FileText className="h-4 w-4 text-[#8c745f]" />
                <div>
                  <span className="font-bold text-[#2d170e]">12</span>
                  <span className="text-[#8c745f] ml-1">games imported</span>
                </div>
              </div>

              <div className="flex items-center gap-2 font-serif text-xs">
                <Users className="h-4 w-4 text-[#8c745f]" />
                <div>
                  <span className="font-bold text-[#2d170e]">8</span>
                  <span className="text-[#8c745f] ml-1">new opponents</span>
                </div>
              </div>

              <div className="flex items-center gap-2 font-serif text-xs">
                <BarChart2 className="h-4 w-4 text-[#8c745f]" />
                <div>
                  <span className="font-bold text-[#2d170e]">7</span>
                  <span className="text-[#8c745f] ml-1">rated games</span>
                </div>
              </div>

              <div className="flex items-center gap-2 font-serif text-xs">
                <Star className="h-4 w-4 text-[#8c745f]" />
                <div>
                  <span className="font-bold text-[#2d170e]">3</span>
                  <span className="text-[#8c745f] ml-1">games already analyzed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 & 3: Main Split Grid (Games Table + Game Detail) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Games Table (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-5 shadow-[0_2px_12px_rgba(60,35,18,0.03)]">
              {/* Header & Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f0e6d8]">
                <div className="flex items-center gap-2 font-serif text-lg font-bold text-[#2d170e]">
                  <Clock className="h-5 w-5 stroke-[1.8]" />
                  <h2>Your Games</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button className="flex items-center gap-1 rounded-lg border border-[#d8c7b0] bg-[#faf5ec] px-2.5 py-1 text-xs font-serif text-[#6d503b]">
                    <span>All Games</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button className="flex items-center gap-1 rounded-lg border border-[#d8c7b0] bg-[#faf5ec] px-2.5 py-1 text-xs font-serif text-[#6d503b]">
                    <span>All Results</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button className="flex items-center gap-1 rounded-lg border border-[#d8c7b0] bg-[#faf5ec] px-2.5 py-1 text-xs font-serif text-[#6d503b]">
                    <span>All Openings</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#9b8370]" />
                    <input
                      type="text"
                      placeholder="Search games..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-32 rounded-lg border border-[#d8c7b0] bg-[#faf5ec] pl-7 pr-2.5 py-1 text-xs font-serif text-[#2d170e] placeholder-[#9b8370] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-[#f4ede3] pt-1">
                {SAMPLE_GAMES.map((game) => {
                  const isSelected = selectedGame.id === game.id

                  return (
                    <div
                      key={game.id}
                      onClick={() => setSelectedGame(game)}
                      className={`flex items-center justify-between py-3 px-2 rounded-xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#f4ebd9] ring-1 ring-[#dec8af]'
                          : 'hover:bg-[#faf5ec]'
                      }`}
                    >
                      {/* Left: Date + Opponent */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="h-7 w-7 shrink-0 rounded bg-[#faf2e4] border border-[#d8c7b0] p-1 grid grid-cols-2 grid-rows-2 gap-0.5">
                          <div className="bg-[#ba8d5d] rounded-[1px]" />
                          <div className="bg-[#f4deb8] rounded-[1px]" />
                          <div className="bg-[#f4deb8] rounded-[1px]" />
                          <div className="bg-[#ba8d5d] rounded-[1px]" />
                        </div>
                        <div>
                          <span className="text-[11px] text-[#8c745f] block">
                            {game.date}
                          </span>
                          <span className="font-serif text-xs font-bold text-[#2d170e]">
                            {game.opponent} <span className="text-[#8c745f] font-normal">({game.rating})</span>
                          </span>
                        </div>
                      </div>

                      {/* Result */}
                      <div className="w-16">
                        {game.result === 'won' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#3b6348]">
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#3b6348] text-[#ffffff] text-[9px]">+</span>
                            Won <span className="text-[10px] text-[#8c745f]">{game.score}</span>
                          </span>
                        )}
                        {game.result === 'lost' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9c2f24]">
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#9c2f24] text-[#ffffff] text-[9px]">×</span>
                            Lost <span className="text-[10px] text-[#8c745f]">{game.score}</span>
                          </span>
                        )}
                        {game.result === 'draw' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#6d503b]">
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#8c745f] text-[#ffffff] text-[9px]">=</span>
                            Draw <span className="text-[10px] text-[#8c745f]">{game.score}</span>
                          </span>
                        )}
                      </div>

                      {/* Opening */}
                      <div className="hidden sm:block flex-1 px-3 text-xs font-serif text-[#6d503b] truncate">
                        {game.opening}
                      </div>

                      {/* Review State Badge */}
                      <div className="flex items-center gap-2">
                        {game.reviewed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f1e9] px-2 py-0.5 text-[11px] font-medium text-[#3b6348]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#4f8034]" />
                            Reviewed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf3e7] px-2 py-0.5 text-[11px] font-medium text-[#9b581e]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#d69818]" />
                            Not reviewed
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-[#9b8370]" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right: Selected Game Detail (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-5 sm:p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-[#faf2e4] border border-[#d8c7b0] p-1 grid grid-cols-2 grid-rows-2 gap-0.5">
                    <div className="bg-[#ba8d5d] rounded-[1px]" />
                    <div className="bg-[#f4deb8] rounded-[1px]" />
                    <div className="bg-[#f4deb8] rounded-[1px]" />
                    <div className="bg-[#ba8d5d] rounded-[1px]" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#2d170e]">
                      vs. {selectedGame.opponent}
                    </h3>
                    <p className="text-xs text-[#8c745f]">
                      {selectedGame.date} • {selectedGame.timeControl} • {selectedGame.score}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[#8c745f]">
                  <button className="p-1 hover:text-[#2d170e]"><ChevronLeft className="h-4 w-4" /></button>
                  <button className="p-1 hover:text-[#2d170e]"><ChevronRight className="h-4 w-4" /></button>
                  <button className="p-1 hover:text-[#2d170e]"><MoreHorizontal className="h-4 w-4" /></button>
                </div>
              </div>

              {/* Board Preview */}
              <div className="flex justify-center">
                <div className="w-full max-w-[260px] aspect-square rounded-[6px] overflow-hidden">
                  <ChessboardView
                    position={fenToBoardGrid(selectedGame.fen)}
                    arrow={selectedGame.arrow}
                    showCoords={false}
                    className="w-full h-full"
                  />
                </div>
              </div>

              {/* Game Metadata List */}
              <div className="space-y-2 border-t border-b border-[#f0e6d8] py-3 text-xs font-serif">
                <div className="flex items-center justify-between text-[#6d503b]">
                  <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Opening</span>
                  <span className="font-bold text-[#2d170e]">{selectedGame.opening}</span>
                </div>
                <div className="flex items-center justify-between text-[#6d503b]">
                  <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> Result</span>
                  <span className="font-bold text-[#3b6348]">Won ({selectedGame.score})</span>
                </div>
                <div className="flex items-center justify-between text-[#6d503b]">
                  <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Moves</span>
                  <span className="font-bold text-[#2d170e]">{selectedGame.moves}</span>
                </div>
                <div className="flex items-center justify-between text-[#6d503b]">
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Time control</span>
                  <span className="font-bold text-[#2d170e]">{selectedGame.timeControl}</span>
                </div>
                <div className="flex items-center justify-between text-[#6d503b]">
                  <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Source</span>
                  <span className="font-bold text-[#2d170e]">{selectedGame.source}</span>
                </div>
              </div>

              {/* Key Learning Moments */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-xs font-bold text-[#2d170e] flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-[#845722]" />
                    Key Learning Moments
                  </h4>
                  <span className="text-[11px] text-[#9b8370]">(i)</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-[#f5c2bd] bg-[#fffbfb] p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-[#b84a39]" />
                      <div>
                        <span className="font-bold text-[#2d170e] block">Missed threat</span>
                        <span className="text-[11px] text-[#735843]">You overlooked a tactical threat on move 14.</span>
                      </div>
                    </div>
                    <span className="rounded bg-[#fceeed] px-2 py-0.5 text-[10px] font-bold text-[#9c2f24]">
                      Move 14 &gt;
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[#ebdcc8] bg-[#faf6ee] p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-[#845722]" />
                      <div>
                        <span className="font-bold text-[#2d170e] block">Counterplay</span>
                        <span className="text-[11px] text-[#735843]">Your counterplay idea was strong here.</span>
                      </div>
                    </div>
                    <span className="rounded bg-[#fdf3e7] px-2 py-0.5 text-[10px] font-bold text-[#9b581e]">
                      Move 21 &gt;
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-[#c0dec7] bg-[#f5fbf6] p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-[#4f8034]" />
                      <div>
                        <span className="font-bold text-[#2d170e] block">Strong move</span>
                        <span className="text-[11px] text-[#735843]">Excellent positional understanding.</span>
                      </div>
                    </div>
                    <span className="rounded bg-[#e8f1e9] px-2 py-0.5 text-[10px] font-bold text-[#3b6348]">
                      Move 26 &gt;
                    </span>
                  </div>
                </div>
              </div>

              {/* Review with Dr. Wolf CTA */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#361f14] py-3 text-xs font-semibold text-[#fbf1dc] shadow-sm hover:bg-[#23120b] transition-all"
              >
                <BarChart2 className="h-4 w-4 text-[#d69818]" />
                <span>Review with Dr. Wolf</span>
                <ChevronRight className="h-4 w-4 text-[#d69818]" />
              </button>
            </div>
          </div>
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
